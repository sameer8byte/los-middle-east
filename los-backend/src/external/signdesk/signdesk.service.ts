import { HttpService } from "@nestjs/axios";
import { Injectable, Inject, HttpException, HttpStatus } from "@nestjs/common";
import axios, { AxiosError } from "axios";
import { firstValueFrom } from "rxjs";
import { SignDeskConfig } from "./interface/signDesk-config.interface";
import { PrismaService } from "src/prisma/prisma.service";
import * as dayjs from "dayjs";

// Access the default function from the namespace import
const _dayjs = dayjs.default;
import { PdfService } from "src/core/pdf/pdf.service";
import { DocumentTypeEnum } from "@prisma/client";

interface SignerInfo {
  signer_ref_id: string;
  signer_id: string;
  document_id: string;
  reference_doc_id: string;
}

interface DocketResponse {
  status: "success" | "failed";
  docket_id: string;
  document_id: string;
  response_time_stamp: string; // ISO timestamp format
  signer_info: SignerInfo[];
}

interface SignerResponse {
  status: "success" | "failed";
  signer_info: {
    signer_id: string;
    signature_sequence: string;
    signed_at: string; // ISO 8601 format datetime string
    status: "signed" | "pending" | "declined" | string; // extendable based on use-case
  }[];
}

@Injectable()
export class SignDeskService {
  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    @Inject("SIGNDESK_CONFIG") private readonly config: SignDeskConfig
  ) {}

  private getHeaders(extraHeaders?: Record<string, string>) {
    return {
      api_key: this.config.apiKey,
      ...(extraHeaders || {}),
    };
  }

  private handleAxiosError(error: unknown, defaultMsg: string): never {
    if (error instanceof AxiosError) {
      throw new HttpException(
        error.response?.data || defaultMsg,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
    throw new HttpException(defaultMsg, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  async eSignRequest(
    userId: string,
    loanId: string,
    loanAgreementsId: string,
    loanAgreementReferenceId: string,
    referenceId: string,
    referenceDocId: string
  ): Promise<DocketResponse> {
    try {
      if (
        !userId ||
        !loanId ||
        !loanAgreementsId ||
        !loanAgreementReferenceId ||
        !referenceId ||
        !referenceDocId
      ) {
        throw new HttpException(
          "User ID, Loan ID, Loan Agreement ID, and Loan Agreement Reference ID are required",
          HttpStatus.BAD_REQUEST
        );
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          phoneNumber: true,
          brandId: true,
          brand: {
            include: {
              brandConfig: {
                select: {
                  loanAgreementVersion: true,
                },
              },
            },
          },
          userDetails: {
            select: {
              firstName: true,
              middleName: true,
              lastName: true,
              address: true,
              state: true,
              aAdharName: true,
            },
          },
        },
      });

      if (!user) {
        throw new HttpException("User not found", HttpStatus.NOT_FOUND);
      }

      const pan = await this.prisma.document.findFirst({
        where: {
          userId: userId,
          type: DocumentTypeEnum.PAN,
        },
        select: {
          documentNumber: true,
        },
      });
      
      if (!pan) {
        throw new HttpException("PAN document not found", HttpStatus.NOT_FOUND);
      }

      const brandConfig = await this.prisma.brandConfig.findUnique({
        where: {
          brandId: user.brandId,
        },
        select: {
          esignFinalCopyRecipients: true,
          esignNotificationEmailList: true,
          esignDocketTitle: true,
          esignExpiryDayCount: true,
          loanAgreementVersion: true,
          sectionManagerName: true,
          sectionManagerPhoneNumber: true,
          sectionManagerAddress: true,
          brand: {
            select: {
              logoUrl: true,
              name: true,
              brandDetails: {
                select: {
                  lenderName: true,
                  contactEmail: true,
                  address: true,
                  contactPhone: true,
                  website: true,
                },
              },
              brandPolicyLinks: {
                select: {
                  privacyPolicyUrl: true,
                },
              },
            },
          },
        },
      });

      const loan = await this.prisma.loan.findUnique({
        where: { id: loanId },
        select: {
          formattedLoanId: true,
          repayment: {
            include: {
              feeBreakdowns: true,
            },
          },
          loanDetails: true,
          penalties: true,
          disbursement: true,
          costSummary: true,
        },
      });

      if (!loan) {
        throw new HttpException("Loan not found", HttpStatus.NOT_FOUND);
      }

      // Get the latest unsigned data from unsigned_data_agreement table
        const latestUnsignedData = await this.prisma.unsigned_data_agreement.findFirst({
        where: {
          loan_aggreement_id: loanAgreementsId,
        },
        orderBy: {
          created_at: 'desc',
        },
        select: {
          unsigned_data: true,
        },
      });



      // Convert S3 URL to base64 using PdfService
      const unsignedDataBase64 = latestUnsignedData.unsigned_data
      if(!unsignedDataBase64){
        throw new HttpException("Unsigned PDF data not found", HttpStatus.NOT_FOUND);
      }

      // Prepare payload

      const userName = user.userDetails.aAdharName
        ? user.userDetails.aAdharName
        : `${user.userDetails.firstName} ${user.userDetails.middleName} ${user.userDetails.lastName}`;
      const mobileNumber = user.phoneNumber.startsWith("+91")
        ? user.phoneNumber.substring(3)
        : user.phoneNumber;
      // Extract brand information for use throughout the function
      const lenderName =
        brandConfig?.brand?.brandDetails?.lenderName ||
        brandConfig?.brand?.name ||
        "Company Limited";
      const supportEmail =
        brandConfig?.brand?.brandDetails?.contactEmail || "support@company.com";

      const payload = {
        reference_id: referenceId,
        docket_title:
          brandConfig?.esignDocketTitle || `${lenderName} Loan Agreement`,
        remarks: "NA",
        enable_email_notification: true,
        docket_description: `Loan Agreement for ${userName} - ${loan.formattedLoanId}`,
        final_copy_recipients:
          brandConfig?.esignFinalCopyRecipients || supportEmail,
        notification_email_list:
          brandConfig?.esignNotificationEmailList || supportEmail,
        return_url: process.env.SIGNDESK_CALLBACK_URL,
        expiry_date: _dayjs()
          .add(brandConfig?.esignExpiryDayCount || 7, "day")
          .format("DD-MM-YYYY"),

        documents: [
          {
            reference_doc_id: referenceDocId,
            content_type: "pdf",
            content: unsignedDataBase64, // Use converted base64 from S3 URL
            signature_sequence: "parallel",
          },
        ],
        signers_info: [
          {
            document_to_be_signed: referenceDocId,
            signer_position: { appearance: "top-left" },
            signer_ref_id: userId,
            signer_email: user.email,
            signer_name: userName,
            sequence: "1",
            page_number: "all",
            esign_type: "otp",
            signer_mobile: mobileNumber,
            signer_remarks: `Loan Agreement for ${loan.formattedLoanId}`,
            authentication_mode: "mobile",
            signature_type: "aadhaar",
            signer_validation_inputs: {
              name_as_per_aadhaar: userName,
            },
            trigger_esign_request: true,
            captureSignerImage: true,
            trigger_esign_request_invitation: "email",
            whatsapp_invitation_mode: false,
          },
        ],
      };

      // check node
      const nodeEnvironment = process.env.NODE_ENV || "development";
      let url = `${this.config.baseUrl}/api/sandbox/signRequest`;
      if (nodeEnvironment === "production") {
        url = `${this.config.baseUrl}/api/live/signRequest`;
      } else if (nodeEnvironment === "development") {
        url = `${this.config.baseUrl}/api/sandbox/signRequest`;
      }
      // 4. Send request with payload
      const { data } = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: this.getHeaders({
            "x-parse-application-id": this.config.apiId,
            "x-parse-rest-api-key": this.config.apiKey,
          }),
        })
      );
      await this.prisma.signDeskSomeTable.create({
        data: {
          userId,
          loanId,
          loanAgreementsId,
          loanAgreementReferenceId,
          responseJson: JSON.stringify(data),
          documentId: data.document_id,
        },
      });
      if (!data || data.status !== "success") {
        throw new HttpException(
          "Failed to create eSign request",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      return data;
    } catch (error) {
      throw this.handleAxiosError(error, "Error in eSignRequest");
    }
  }

  async getSignStatus(
    userId: string,
    loanId: string,
    loanAgreementsId: string,
    loanAgreementReferenceId: string,
    referenceId: string,
    referenceDocId: string
  ): Promise<SignerResponse> {
    try {
      if (
        !userId ||
        !loanId ||
        !loanAgreementsId ||
        !loanAgreementReferenceId
      ) {
        throw new HttpException(
          "User ID, Loan ID, Loan Agreement ID, and Loan Agreement Reference ID are required",
          HttpStatus.BAD_REQUEST
        );
      }
      const nodeEnvironment = process.env.NODE_ENV || "development";
      let url = `${this.config.baseUrl}/api/sandbox/getSignatureStatus`;
      if (nodeEnvironment?.toLowerCase() === "production") {
        url = `${this.config.baseUrl}/api/live/getSignatureStatus`;
      } else {
        url = `${this.config.baseUrl}/api/sandbox/getSignatureStatus`;
      }

      const signerInfo = await this.prisma.signDeskSomeTable.findFirst({
        where: {
          userId,
          loanId,
          loanAgreementsId,
          loanAgreementReferenceId,
        },
      });
      if (!signerInfo) {
        throw new HttpException(
          "Signer information not found",
          HttpStatus.NOT_FOUND
        );
      }
      const documentId = signerInfo.documentId;
      if (!documentId) {
        throw new HttpException(
          "Document ID not found in signer information",
          HttpStatus.NOT_FOUND
        );
      }
      const { data } = await firstValueFrom(
        this.httpService.post(
          url,
          {
            document_id: documentId,
          },
          {
            headers: this.getHeaders({
              "x-parse-application-id": this.config.apiId,
              "x-parse-rest-api-key": this.config.apiKey,
            }),
          }
        )
      );
      return data;
    } catch (error) {
      throw this.handleAxiosError(error, "Error in getSignStatus");
    }
  }
}
