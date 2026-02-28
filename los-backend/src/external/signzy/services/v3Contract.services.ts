import { HttpService } from "@nestjs/axios";
import {
  Injectable,
  Inject,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { AxiosError } from "axios";
import { firstValueFrom } from "rxjs";
import { PrismaService } from "src/prisma/prisma.service";
import {
  Contract360Response,
  SignzyV3Config,
} from "../interface/v3Contract.interface";
import { signzy_some_table } from "@prisma/client";

@Injectable()
export class SignzyV3ContractService {
  private readonly logger = new Logger(SignzyV3ContractService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    @Inject("SIGNZY_V3_CONFIG") private readonly config: SignzyV3Config,
  ) {
    this.validateConfig();
  }

  private validateConfig(): void {
    if (!this.config?.apiKey || !this.config?.baseUrl) {
      this.logger.warn("Signzy configuration incomplete. Service will be unavailable until configured.");
    }
  }

  private getHeaders(extraHeaders?: Record<string, string>) {
    return {
      "Content-Type": "application/json",
      Authorization: `${this.config.apiKey}`,
      ...(extraHeaders || {}),
    };
  }

  private handleAxiosError(error: unknown, defaultMsg: string): never {
    if (error instanceof AxiosError) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        defaultMsg;
      const statusCode =
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException(errorMessage, statusCode);
    }
    throw new HttpException(defaultMsg, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  /**
   * E-sign request method following SignDesk pattern
   * @param userId - User ID
   * @param loanId - Loan ID
   * @param loanAgreementId - Loan Agreement ID
   * @param loanAgreementReferenceId - Loan Agreement Reference ID
   * @param referenceId - Reference ID
   * @param referenceDocId - Reference Document ID
   * @returns Promise<InitiateContractResponse>
   */
  async eSignRequest(
    userId: string,
    loanId: string,
    loanAgreementId: string,
    loanAgreementReferenceId: string,
    referenceId: string,
    referenceDocId: string,
  ): Promise<signzy_some_table> {
    if (!this.config?.apiKey || !this.config?.baseUrl) {
      throw new HttpException(
        "Signzy configuration is missing. Please configure SIGNZY_V3_API_KEY and SIGNZY_V3_BASE_URL environment variables.",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    try {
      this.logger.log(
        `[Signzy V3] Starting e-sign request for userId: ${userId}, loanId: ${loanId}`,
      );

      // Fetch user data
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          phoneNumber: true,
          brandId: true,
          documents: {
            where: {
              type: "AADHAAR",
              status: "APPROVED",
            },
            select: { documentNumber: true },
          },
          userDetails: {
            select: {
              firstName: true,
              middleName: true,
              dateOfBirth: true,
              lastName: true,
              gender: true,
              address: true,
              aAdharName: true,
              aAdharDOB: true,
              state: true,
              linkedAadhaarNumberByPanPlus: true,
              linkedAadhaarNumberByDigiLocker: true,
            },
          },
        },
      });

      if (!user)
        throw new HttpException("User not found", HttpStatus.NOT_FOUND);
      const userEmail = user.email;
      if (!userEmail)
        throw new HttpException("User email not found", HttpStatus.BAD_REQUEST);
      // Fetch loan

      const loan = await this.prisma.loan.findUnique({
        where: { id: loanId },
        select: {
          formattedLoanId: true,
          amount: true,
          user: { select: { brandSubDomain: true } },
          brand: { select: { brand_sub_domains: true } },
        },
      });

      if (!loan)
        throw new HttpException("Loan not found", HttpStatus.NOT_FOUND);

      // Get the latest unsigned data from unsigned_data_agreement table
      const latestUnsignedData =
        await this.prisma.unsigned_data_agreement.findFirst({
          where: {
            loan_aggreement_id: loanAgreementId,
          },
          orderBy: {
            created_at: "desc",
          },
          select: {
            unsigned_data: true,
          },
        });

      // Convert S3 URL to base64 using PdfService
      const unsignedDataBase64 = latestUnsignedData.unsigned_data;

      if (!unsignedDataBase64) {
        throw new HttpException(
          "Unsigned PDF data not found",
          HttpStatus.NOT_FOUND,
        );
      }

      // Get brand configuration
      const brandConfig = await this.prisma.brandConfig.findUnique({
        where: { brandId: user.brandId },
        select: {
          esignDocketTitle: true,
          esignExpiryDayCount: true,
          brand: {
            select: {
              name: true,
              brandDetails: {
                select: { lenderName: true, contactEmail: true },
              },
            },
          },
        },
      });

      const userName = user.userDetails.aAdharName
        ? user.userDetails.aAdharName
        : `${user.userDetails.firstName} ${user.userDetails.middleName || ""} ${user.userDetails.lastName}`.trim();

      const mobileNumber = user.phoneNumber.startsWith("+91")
        ? user.phoneNumber.substring(3)
        : user.phoneNumber;
      const domain =
        loan.user.brandSubDomain?.subdomain ||
        loan.brand?.brand_sub_domains?.[0]?.subdomain;
      const signerYearOfBirth = user.userDetails.aAdharDOB
        ? new Date(user.userDetails.aAdharDOB).getFullYear().toString()
        : user.userDetails.dateOfBirth
          ? new Date(user.userDetails.dateOfBirth).getFullYear().toString()
          : null;

      // Prepare contract payload
      const payload: {
        pdf: string;
        contractName: string;
        contractExecuterName: string;
        successRedirectUrl: string;
        failureRedirectUrl: string;
        contractTtl: number;
        eSignProvider: string;
        nameMatchThreshold: string;
        allowSignerGenderMatch: boolean;
        allowSignerYOBMatch: boolean;
        allowUidLastFourDigitsMatch: boolean;
        emudhraCustomization: {
          logoURL: string;
          headerColour: string;
          buttonColour: string;
          maskedAadhaarField: string;
          secondaryButtonColour: string;
          pageBackgroundColour: string;
          pageTextColour: string;
          footerBackgroundColour: string;
          footerTextColour: string;
          successTextColour: string;
          errorTextColour: string;
          errorBackgroundColour: string;
          linkTextColour: string;
          infoIconColour: string;
          textFieldBorderColour: string;
        };
        signerdetail: Array<{
          signerName: string;
          signerMobile: string;
          signerEmail: string;
          signerGender: string;
          uidLastFourDigits: string;
          signerYearOfBirth: string;
          signatureType: string;
          signatures: Array<{
            pageNo: string[];
            signaturePosition: string[];
          }>;
        }>;
        workflow: boolean;
        isParallel: boolean;
        redirectTime: number;
        locationCaptureMethod: string;
        initiationEmailSubject: string;
        customerMailList: string[];
        emailPdfCustomNameFormat: string;
        callbackUrl: string;
      } = {
        pdf: unsignedDataBase64,
        contractName:
          brandConfig?.esignDocketTitle ||
          `Loan Agreement - ${loan.formattedLoanId}`,
        contractExecuterName:
          brandConfig?.brand?.brandDetails?.lenderName || "Lender",
        successRedirectUrl: `https://${domain}/signzy-success?ref=${referenceId}`,
        failureRedirectUrl: `https://${domain}/signzy-failure?ref=${referenceId}`,
        contractTtl: (brandConfig?.esignExpiryDayCount || 7) * 24 * 60 * 60,
        eSignProvider: "nsdl",
        nameMatchThreshold: "0.50",
        allowSignerGenderMatch: true,
        allowSignerYOBMatch: true,
        allowUidLastFourDigitsMatch: true,
        emudhraCustomization: {
          logoURL: "",
          headerColour: "",
          buttonColour: "",
          maskedAadhaarField: "0",
          secondaryButtonColour: "",
          pageBackgroundColour: "",
          pageTextColour: "",
          footerBackgroundColour: "",
          footerTextColour: "",
          successTextColour: "",
          errorTextColour: "",
          errorBackgroundColour: "",
          linkTextColour: "",
          infoIconColour: "",
          textFieldBorderColour: "",
        },
        signerdetail: [
          {
            signerName: userName,
            signerMobile: mobileNumber,
            signerEmail: userEmail,
            signerGender: user.userDetails.gender,
            uidLastFourDigits:
              user.userDetails.linkedAadhaarNumberByDigiLocker?.slice(-4) ||
              user.userDetails.linkedAadhaarNumberByPanPlus?.slice(-4) ||
              user.documents?.[0]?.documentNumber?.slice(-4) ||
              "",
            signerYearOfBirth: signerYearOfBirth,
            signatureType: "AADHAARESIGN-OTP",
            signatures: [
              {
                pageNo: ["All"],
                signaturePosition: ["BottomLeft"],
              },
            ],
          },
        ],
        workflow: true,
        isParallel: false,
        redirectTime: 5,
        locationCaptureMethod: "ip",
        initiationEmailSubject:
          "Please sign the document received on your email",
        customerMailList: [userEmail],
        emailPdfCustomNameFormat: "SIGNERNAME",
        callbackUrl: `${process.env.WEBHOOK_URL}/api/v1/esign/v3/webhook`,
      };
      const url = `${this.config.baseUrl}/api/v3/contract/initiate`;

      const { data } = await firstValueFrom(
        this.httpService.post<Contract360Response>(url, payload, {
          headers: {
            ...this.getHeaders(),
            "x-uniqueReferenceId": loanAgreementReferenceId,
          },
          timeout: 30000,
        }),
      );
      if (!data?.contractId) {
        throw new HttpException(
          (
            data as {
              error?: { message: string };
            }
          ).error?.message ||
            (
              data as {
                message?: string;
              }
            ).message ||
            "Contract initiation failed",
          HttpStatus.BAD_REQUEST,
        );
      }
      // Store contract request in DB
      const signzySomeTable = await this.prisma.signzy_some_table.create({
        data: {
          userId,
          loanId,
          documentId: data.contractId,
          loanAgreementId,
          loanAgreementReferenceId,
          responseJson: JSON.parse(JSON.stringify(data)),
          workflowUrl: data?.signerdetail?.[0]?.workflowUrl || null,
        },
      });

      return signzySomeTable;
    } catch (error) {
      this.logger.error(
        `[Signzy V3] Error in e-sign request for user ${userId}:`,
        error,
      );
      throw this.handleAxiosError(error, "Failed to initiate e-sign request");
    }
  }

  /**
   * E-sign request method following SignDesk pattern
   * @param userId - User ID
   * @param loanId - Loan ID
   * @param loanAgreementId - Loan Agreement ID
   * @param loanAgreementReferenceId - Loan Agreement Reference ID
   * @param referenceId - Reference ID
   * @param referenceDocId - Reference Document ID
   * @returns Promise<InitiateContractResponse>
   */
  async getSignStatus(requestId: string): Promise<any> {
    try {
      this.logger.log(`[Signzy V3] Pulling data for request: ${requestId}`);

      const payload = {
        contractId: requestId,
      };

      const url = `${this.config.baseUrl}/api/v3/contract/pullData`;
      const { data } = await firstValueFrom(
        this.httpService.post<any>(url, payload, {
          headers: this.getHeaders(),
          timeout: 30000,
        }),
      );
      this.logger.log(
        `[Signzy V3] Data pull ${data.contractStatus === "SUCCESS" ? "successful" : "failed"} for request: ${requestId}`,
      );
      return data;
    } catch (error) {
      this.logger.error(
        `[Signzy V3] Error pulling data for request ${requestId}:`,
        error,
      );
      throw this.handleAxiosError(error, "Failed to pull contract data");
    }
  }
}
