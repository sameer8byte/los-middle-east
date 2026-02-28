import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  agreement_status_enum,
  BrandProviderType,
  document_status_enum,
  DocumentTypeEnum,
  loan_status_enum,
  platform_type,
} from "@prisma/client";
import * as dayjs from "dayjs";

// Access the default function from the namespace import
const _dayjs = dayjs.default;
import { PdfService } from "src/core/pdf/pdf.service";
import { SignDeskService } from "src/external/signdesk/signdesk.service";
import { SignzyV3ContractService } from "src/external/signzy/services/v3Contract.services";
import { PrismaService } from "src/prisma/prisma.service";
import { NotificationService } from "src/features/notification/notification.service";
import { DigitapEsignService } from "src/external/digitapEsign/digitap.esign.service";
import { DigiLocker20Service } from "src/external/digiLocker2.0";

export interface SignerInfo {
  name: string;
  email: string;
  mobile: string;
  name_from_input_field: string;
  signer_name: string;
  gender: "M" | "F" | "O"; // Add other values if needed
  last_digits_of_aadhaar: string;
  name_as_per_aadhaar: string;
  postal_code: string;
  year_of_birth: string;
}

export interface DocumentSigningResponse {
  status: "success" | "failed"; // Extend as needed
  document_id: string;
  initiated_at: string; // ISO string
  signer_info: SignerInfo[];
  file_content: string; // Base64 encoded PDF content
  docket_id: string;
  completed_at: string; // ISO string
}

@Injectable()
export class EsignService {
  private readonly logger = new Logger(EsignService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly signDeskService: SignDeskService,
    private readonly signzyV3Service: SignzyV3ContractService,
    private readonly digitapService: DigitapEsignService,
    private readonly pdfService: PdfService, // Assuming you have a PdfService for PDF generation
    private readonly notificationService: NotificationService,
    //DigiLocker20Service
    private readonly digiLocker20Service: DigiLocker20Service,
  ) {}
  // Send document for signing
  async sendDocumentForSigning(
    userId: string,
    loanAgreementId: string = null,
    provider: "SIGNDESK" | "SIGNZY" | "DIGITAP" = null,
    loanId: string = null,
  ) {
    try {
      if (!userId) {
        throw new HttpException(
          "User ID and Loan Agreement ID are required",
          HttpStatus.BAD_REQUEST,
        );
      }
      if (provider && !["SIGNDESK", "SIGNZY", "DIGITAP"].includes(provider)) {
        throw new HttpException(
          "Invalid provider. Must be SIGNDESK or SIGNZY or DIGITAP",
          HttpStatus.BAD_REQUEST,
        );
      }
      if (!loanAgreementId && !loanId) {
        throw new Error("Either loanAgreementId or loanId must be provided");
      }

      const loanAgreement = loanAgreementId
        ? await this.prisma.loanAgreement.findUnique({
            where: { id: loanAgreementId },
          })
        : await this.prisma.loanAgreement.findFirst({
            where: { loanId },
          });

      if (!loanAgreement) {
        throw new Error("Loan agreement not found");
      }
      if (loanAgreement.status === agreement_status_enum.SIGNED) {
        throw new HttpException(
          "Loan agreement is already signed",
          HttpStatus.CONFLICT,
        );
      }

      const [user, loan] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: userId } }),
        this.prisma.loan.findUnique({
          where: {
            id: loanAgreement.loanId,
            status: {
              in: [
                loan_status_enum.APPROVED,
                loan_status_enum.SANCTION_MANAGER_APPROVED,
              ],
            },
          },
        }),
      ]);
      const brandId = loan?.brandId;

      if (!brandId) {
        throw new HttpException(
          "Brand ID not found for the loan",
          HttpStatus.NOT_FOUND,
        );
      }

      if (!user) {
        throw new HttpException("User not found", HttpStatus.NOT_FOUND);
      }
      if (!loan) {
        throw new HttpException("Loan not found", HttpStatus.NOT_FOUND);
      }

      if (!loanAgreement) {
        throw new HttpException(
          "Loan agreement not found",
          HttpStatus.NOT_FOUND,
        );
      }
      // Fetch provider + autopay IDs once
      const brandProviders = await this.prisma.brandProvider.findMany({
        where: { brandId, isActive: true, isDisabled: false },
      });
      const hasEsignProvider = brandProviders.filter(
        (bp) => bp.type === BrandProviderType.LOAN_AGREEMENT,
      );
      if (!hasEsignProvider) {
        throw new HttpException(
          "No active e-sign provider found for the brand",
          HttpStatus.NOT_FOUND,
        );
      }
      const selectedProvider =
        provider ||
        (hasEsignProvider[0]?.provider as "SIGNDESK" | "SIGNZY" | "DIGITAP");
      if (!selectedProvider) {
        throw new HttpException(
          "No e-sign provider available for the brand",
          HttpStatus.NOT_FOUND,
        );
      }

      const loanAgreementReference =
        await this.prisma.loanAgreementReference.create({
          data: {
            loanAgreementId: loanAgreement.id,
            loan_recommended_amount: loan.amount,
            provider: selectedProvider,
            expiredAt: _dayjs().add(1, "day").toISOString(), // expires 24h from now
            sentAt: _dayjs().toISOString(),
          },
        });

      const apiProviderIds = brandProviders
        .filter((bp) => bp.type === BrandProviderType.UPI_AUTOPAY)
        .map((bp) => bp.id);

      if (apiProviderIds.length > 0) {
        await this.prisma.paymentRequest.upsert({
          where: {
            loanId_type: {
              loanId: loan.id,
              type: "AUTOPAY_CONSENT",
            },
          },
          update: {
            loanId: loan.id,
            type: "AUTOPAY_CONSENT",
            updatedAt: new Date(),
          },
          create: {
            status: "PENDING",
            loanId: loan.id,
            userId: user.id,
            brandId: brandId,
            type: "AUTOPAY_CONSENT",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      if (
        !loanAgreementReference.referenceId ||
        !loanAgreementReference.referenceDocId
      ) {
        throw new HttpException(
          "Failed to generate reference ID or document ID",
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      let generateSignedDocument;
      let workflowUrl: string = null;
      if (loanAgreementReference.provider === "SIGNZY") {
        this.logger.log(
          `Using Signzy V3 provider for loan agreement: ${loanAgreement.id}`,
        );
        generateSignedDocument = await this.signzyV3Service.eSignRequest(
          userId,
          loan.id,
          loanAgreement.id,
          loanAgreementReference.id,
          loanAgreementReference.referenceId,
          loanAgreementReference.referenceDocId,
        );
        workflowUrl = generateSignedDocument?.workflowUrl || null;
      } else if (loanAgreementReference.provider === "DIGITAP") {
        this.logger.log(
          `Using Digitap provider for loan agreement: ${loanAgreement.id}`,
        );

        generateSignedDocument = await this.digitapService.eSignRequest(
          userId,
          loan.id,
          loanAgreement.id,
          loanAgreementReference.id,
          loanAgreementReference.referenceId,
          loanAgreementReference.referenceDocId,
        );
        workflowUrl = generateSignedDocument?.workflowUrl || null;
      } else {
        this.logger.log(
          `Using SignDesk provider for loan agreement: ${loanAgreement.id}`,
        );
        generateSignedDocument = await this.signDeskService.eSignRequest(
          userId,
          loan.id,
          loanAgreement.id,
          loanAgreementReference.id,
          loanAgreementReference.referenceId,
          loanAgreementReference.referenceDocId,
        );
      }

      if (!generateSignedDocument) {
        throw new HttpException(
          `Failed to generate signed document using ${loanAgreementReference.provider} provider`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      await this.prisma.$transaction([
        this.prisma.loanAgreement.update({
          where: { id: loanAgreement.id },
          data: { status: agreement_status_enum.SENT },
        }),
        this.prisma.loanAgreementReference.update({
          where: { id: loanAgreementReference.id },
          data: { sentAt: new Date() },
        }),
      ]);

      return {
        status: "SUCCESS",
        message: `Document sent successfully${
          workflowUrl
            ? " for signing. Please use the link below or check your email for more details."
            : ". Please check your email for more details."
        }`,
        workflowUrl: workflowUrl ?? null,
      };
    } catch (error) {
      // Re-throw HttpExceptions as-is, wrap others
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to send document for signing: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  //
  async generateAutoEsignDocument(userId: string, loanId: string) {
    try {
      if (!userId || !loanId) {
        throw new HttpException(
          "User ID and Loan ID are required",
          HttpStatus.BAD_REQUEST,
        );
      }
      await this.generateEsignDocument(userId, loanId);
      const sendDocumentForSigning = await this.sendDocumentForSigning(
        userId,
        null,
        null,
        loanId,
      );

      return sendDocumentForSigning;
    } catch (error) {
      this.logger.error("Error generating auto e-sign document", error);

      throw new HttpException(
        `Failed to generate auto e-sign document: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  // Generate unsigned document PDF
  async getAgreements(loanAgreementId: string) {
    try {
      const agreements = await this.prisma.loanAgreement.findUnique({
        where: {
          id: loanAgreementId,
        },
        select: {
          unsignedData: true,
          id: true,
          loanId: true,
          status: true,
          createdAt: true,
          references: {
            select: {
              id: true,
              referenceId: true,
              referenceDocId: true,
              provider: true,
              sentAt: true,
              signedAt: true,
              rejectedAt: true,
              expiredAt: true,
              createdAt: true,
            },
          },
          loan: {
            select: {
              userId: true,
              id: true,
              formattedLoanId: true,
              amount: true,
              status: true,
              createdAt: true,
              loanDetails: {
                select: {
                  dueDate: true,
                  durationDays: true,
                },
              },
              disbursement: {
                select: {
                  id: true,
                  grossAmount: true,
                  totalDeductions: true,
                  netAmount: true,
                  processing_fee: true,
                  deductions: {
                    select: {
                      id: true,
                      type: true,
                      calculationValueType: true,
                      calculationBaseAmount: true,
                      calculationTaxAmount: true,
                      chargeMode: true,
                      total: true,
                      chargeValue: true,
                      isRecurringDaily: true,
                      taxes: {
                        select: {
                          id: true,
                          type: true,
                          chargeValue: true,
                          amount: true,
                          isInclusive: true,
                          valueType: true,
                        },
                      },
                    },
                  },
                },
              },
              repayment: {
                select: {
                  id: true,
                  totalObligation: true,
                  totalFees: true,
                  feeBreakdowns: {
                    select: {
                      id: true,
                      type: true,
                      calculationValueType: true,
                      calculationBaseAmount: true,
                      calculationTaxAmount: true,
                      chargeMode: true,
                      total: true,
                      chargeValue: true,
                      isRecurringDaily: true,
                      taxes: {
                        select: {
                          id: true,
                          type: true,
                          chargeValue: true,
                          amount: true,
                          isInclusive: true,
                          valueType: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!agreements) {
        throw new NotFoundException(
          `Loan agreement with ID ${loanAgreementId} not found`,
        );
      }
      const getLoanPdf = await this.generateEsignDocument(
        agreements.loan.userId,
        agreements.loanId,
      );
      if (!getLoanPdf) {
        throw new InternalServerErrorException(
          `Failed to generate PDF for loan agreement with ID ${loanAgreementId}`,
        );
      }
      agreements.unsignedData = getLoanPdf;
      return {
        loanAgreement: agreements,
      };
    } catch (error) {
      // this.logger.error("Error fetching agreements", error);
      throw error;
    }
  }

  async getAgreementDetails(loanAgreementId: string) {
    try {
      if (!loanAgreementId) {
        throw new HttpException(
          "Loan Agreement ID is required",
          HttpStatus.BAD_REQUEST,
        );
      }

      const loanAgreement = await this.prisma.loanAgreement.findUnique({
        where: {
          id: loanAgreementId,
        },
        include: {
          references: {
            select: {
              id: true,
              referenceId: true,
              referenceDocId: true,
              provider: true,
              sentAt: true,
              signedAt: true,
              rejectedAt: true,
              expiredAt: true,
              createdAt: true,
            },
          },
          signzySomeTables: {
            select: {
              id: true,
              workflowUrl: true,
              createdAt: true,
            },
            take: 1,
            orderBy: {
              createdAt: "desc",
            },
          },

          digitap_esign_some_table: {
            select: {
              id: true,
              workflowUrl: true,
              createdAt: true,
            },
            take: 1,
            orderBy: {
              createdAt: "desc",
            },
          },
          loan: {
            select: {
              id: true,
              userId: true,
              formattedLoanId: true,
              amount: true,
              status: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  email: true,
                  phoneNumber: true,
                  userDetails: {
                    select: {
                      firstName: true,
                      middleName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!loanAgreement) {
        throw new NotFoundException(
          `Loan agreement with ID ${loanAgreementId} not found`,
        );
      }

      // Enrich with formatted data
      const enrichedAgreement = {
        ...loanAgreement,
        loanAgreementReferences: loanAgreement.references.map((ref) => ({
          ...ref,
          status: this.getAgreementStatus(ref),
        })),
        sentOn: this.getLatestTimestamp(loanAgreement.references, "sentAt"),
        signedOn: this.getLatestTimestamp(loanAgreement.references, "signedAt"),
        expiresOn: this.getLatestTimestamp(
          loanAgreement.references,
          "expiredAt",
        ),
        workflowUrl:
          loanAgreement.digitap_esign_some_table?.[0]?.workflowUrl ||
          loanAgreement.signzySomeTables?.[0]?.workflowUrl ||
          null,
      };

      // Remove old references key and digitap table, keep the enriched version
      delete enrichedAgreement.references;
      delete enrichedAgreement.digitap_esign_some_table;

      return enrichedAgreement;
    } catch (error) {
      this.logger.error("Error fetching agreement details", error);
      throw error;
    }
  }

  private getAgreementStatus(reference: any): string {
    if (reference.signedAt) return "SIGNED";
    if (reference.rejectedAt) return "REJECTED";
    if (reference.expiredAt) return "EXPIRED";
    if (reference.sentAt) return "SENT";
    return "NOT_SENT";
  }

  private getLatestTimestamp(references: any[], field: string): Date | null {
    const timestamps = references
      .map((ref) => ref[field])
      .filter((ts) => ts !== null);
    return timestamps.length > 0
      ? new Date(Math.max(...timestamps.map((ts) => new Date(ts).getTime())))
      : null;
  }
  // digitab webhook to receive signed document and update status
  async digitapWebhook(body: any) {
    
    try {
      return this.digiLocker20Service.handleDigitapWebhook(body);
    } catch (error) {
      this.logger.error("Error processing Digitap webhook", error);
      return false;
    }
  }

  async webhook(body: DocumentSigningResponse): Promise<boolean> {
    try {
      const signerInfo = await this.prisma.signDeskSomeTable.findFirst({
        where: {
          documentId: body.document_id,
        },
      });
      if (!signerInfo) {
        this.logger.warn("Signer info not found", {
          document_id: body.document_id,
          timestamp: new Date().toISOString(),
        });
        return false;
      }
      // Save callback response
      await this.prisma.signDeskSomeTable.update({
        where: { id: signerInfo.id },
        data: {
          callbackResponse: JSON.stringify(body),
        },
      });
      let isSuccess = body.status === "success";

      const pdf = await this.pdfService.decodeBase64ToPdf(
        body.file_content,
        signerInfo.loanAgreementsId,
        `${signerInfo.loanAgreementsId}-${Date.now()}.pdf`,
      );
      // Perform transactional update
      const completedAt = body.completed_at
        ? new Date(body.completed_at)
        : new Date();

      const signedAt = isSuccess ? completedAt : null;
      const rejectedAt = !isSuccess ? completedAt : null;

      // Convert base64 file_content to buffer for storage
      let pdfBuffer: Buffer | null = null;
      if (body.file_content && isSuccess) {
        try {
          pdfBuffer = Buffer.from(body.file_content, "base64");
          this.logger.log(
            `Successfully converted SignDesk PDF from base64 to buffer. Size: ${pdfBuffer.length} bytes`,
          );
        } catch (error) {
          this.logger.error(
            `Error converting SignDesk PDF base64 to buffer: ${error.message}`,
          );
        }
      }

      const [loanAgreementReference, loan] = await Promise.all([
        this.prisma.loanAgreementReference.findUnique({
          where: { id: signerInfo.loanAgreementReferenceId },
          select: {
            is_disabled: true,
            is_active: true,
            loan_recommended_amount: true,
          },
        }),
        this.prisma.loan.findUnique({
          where: { id: signerInfo.loanId },
          select: { status: true, amount: true },
        }),
      ]);

      if (!loanAgreementReference) {
        throw new NotFoundException(
          `Loan Agreement Reference with ID ${signerInfo.loanAgreementReferenceId} not found`,
        );
      }
      if (!loan) {
        throw new NotFoundException(
          `Loan with ID ${signerInfo.loanId} not found`,
        );
      }

      const isValidLoanAgreementReference =
        ((loanAgreementReference?.is_active &&
          !loanAgreementReference?.is_disabled) ||
          loan.amount === loanAgreementReference.loan_recommended_amount) &&
        (loan?.status === loan_status_enum.APPROVED ||
          loan?.status === loan_status_enum.SANCTION_MANAGER_APPROVED);
      const agreementStatus = isValidLoanAgreementReference
        ? isSuccess
          ? agreement_status_enum.SIGNED
          : agreement_status_enum.REJECTED
        : null;

      await this.prisma.$transaction([
        this.prisma.loanAgreementReference.update({
          where: { id: signerInfo.loanAgreementReferenceId },
          data: {
            signedAt: signedAt,
            rejectedAt: rejectedAt,
          },
        }),
        this.prisma.loanAgreement.update({
          where: { id: signerInfo.loanAgreementsId },
          data: {
            ...(agreementStatus && { status: agreementStatus }),
            signedFilePrivateKey: pdf.key,
            signedByUser: true,
            aadhaarSuffix: body.signer_info[0].last_digits_of_aadhaar
              ? `xxxxxxxx${body.signer_info[0].last_digits_of_aadhaar}`
              : null,
            signed: `Signed by ${body.signer_info[0].name} (${body.signer_info[0].signer_name}) [Aadhaar: ****${body.signer_info[0].last_digits_of_aadhaar}], Name as per Aadhaar: ${body.signer_info[0].name_as_per_aadhaar}, Gender: ${body.signer_info[0].gender}, DOB Year: ${body.signer_info[0].year_of_birth}, Mobile: ${body.signer_info[0].mobile}, Email: ${body.signer_info[0].email}, Postal Code: ${body.signer_info[0].postal_code} on ${_dayjs().format("DD-MM-YYYY")}`,
          },
        }),
        this.prisma.signDeskSomeTable.update({
          where: { id: signerInfo.id },
          data: {
            pdfBlob: pdfBuffer,
          },
        }),
      ]);

      // Send notification to allocated partners
      try {
        const loanAgreement = await this.prisma.loanAgreement.findUnique({
          where: { id: signerInfo.loanAgreementsId },
          include: {
            loan: {
              include: {
                allottedPartners: {
                  include: {
                    partnerUser: true,
                  },
                },
                user: {
                  select: {
                    id: true,
                    formattedUserId: true,
                    phoneNumber: true,
                    email: true,
                    userDetails: {
                      select: {
                        middleName: true,
                        aAdharName: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (loanAgreement?.loan) {
          const userDetails = loanAgreement.loan.user;
          const userName =
            loanAgreement.loan.user?.userDetails?.aAdharName?.trim() ||
            [
              loanAgreement.loan.user?.userDetails?.firstName,
              loanAgreement.loan.user?.userDetails?.middleName,
              loanAgreement.loan.user?.userDetails?.lastName,
            ]
              .filter(Boolean)
              .join(" ")
              .trim() ||
            "";

          const contactInfo =
            userDetails?.phoneNumber || userDetails?.email || "No contact";
          const loanId_display =
            loanAgreement.loan.formattedLoanId || loanAgreement.loan.id;

          const targetPartnerIds = loanAgreement.loan.allottedPartners
            .map((ap) => [ap.partnerUserId, ap.partnerUser.reportsToId])
            .flat()
            .filter(Boolean);

          if (targetPartnerIds.length > 0) {
            const notificationTitle = isSuccess
              ? "Agreement Signed"
              : "Agreement Rejected";
            const notificationMessage = isSuccess
              ? `Loan agreement for ${loanId_display} has been signed by customer ${userName} (${contactInfo}). Amount: Rs.${loanAgreement.loan.amount}`
              : `Loan agreement for ${loanId_display} has been rejected by customer ${userName} (${contactInfo}). Amount: Rs.${loanAgreement.loan.amount}`;

            await this.notificationService.create({
              title: notificationTitle,
              message: notificationMessage,
              priority: isSuccess ? ("HIGH" as any) : ("NORMAL" as any),
              loanId: loanAgreement.loan.id,
              userId: userDetails?.id,
              targets: targetPartnerIds.map((partnerId) => ({
                partnerUserId: partnerId,
                platform: "WEB" as any,
              })),
            });
          }
        }
      } catch (notificationError) {
        this.logger.error(
          `Failed to send agreement status notification: ${notificationError.message}`,
          notificationError.stack,
        );
        // Don't fail the webhook if notification fails
      }
      return true;
    } catch (error) {
      this.logger.error("Error in webhook processing", {
        body,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async signzyV3ContractWebhook(body: any): Promise<boolean> {
    try {
      // Extract contract ID from the webhook body
      const contractId = body.contractId;
      if (!contractId) {
        return false;
      }

      // Find the contract request using contractId
      const contractRequest =
        await this.findSignzyV3ContractRequest(contractId);
      if (!contractRequest) {
        return false;
      }

      // Store the webhook callback response
      await this.updateSignzyV3ContractRequest(contractRequest.id, body);

      // Update loan agreement status if contract is linked to loan agreement
      if (
        contractRequest.loanAgreementId &&
        contractRequest.loanAgreementReferenceId
      ) {
        await this.updateLoanAgreementFromSignzyV3Webhook(
          contractRequest,
          body,
        );

        // Send notification to allocated partners
        try {
          const loanAgreement = await this.prisma.loanAgreement.findUnique({
            where: { id: contractRequest.loanAgreementId },
            include: {
              loan: {
                include: {
                  allottedPartners: {
                    include: {
                      partnerUser: true,
                    },
                  },
                  user: {
                    select: {
                      id: true,
                      formattedUserId: true,
                      phoneNumber: true,
                      email: true,
                      userDetails: {
                        select: {
                          firstName: true,
                          lastName: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          });

          if (loanAgreement?.loan) {
            const userDetails = loanAgreement.loan.user;
            const userName =
              userDetails?.userDetails?.firstName &&
              userDetails?.userDetails?.lastName
                ? `${userDetails.userDetails.firstName} ${userDetails.userDetails.lastName}`
                : userDetails?.formattedUserId || "Unknown User";

            const contactInfo =
              userDetails?.phoneNumber || userDetails?.email || "No contact";
            const loanId_display =
              loanAgreement.loan.formattedLoanId || loanAgreement.loan.id;

            const targetPartnerIds = loanAgreement.loan.allottedPartners
              .map((ap) => [ap.partnerUserId, ap.partnerUser.reportsToId])
              .flat()
              .filter(Boolean);

            if (targetPartnerIds.length > 0) {
              const hasSuccessfulSigner = body.signerdetail?.some(
                (signer: any) => signer.status === "SUCCESS",
              );
              const hasFinalSignedContract = !!body.finalSignedContract;
              const isSuccess =
                body.contractStatus === "COMPLETED" ||
                (hasFinalSignedContract && hasSuccessfulSigner);
              const isRejected =
                body.contractStatus === "FAILED" ||
                body.contractStatus === "EXPIRED" ||
                body.contractStatus === "CANCELLED";

              // Extract aadhaar suffix for logging
              const successfulSigner = body.signerdetail?.find(
                (signer: any) => signer.status === "SUCCESS",
              );
              const aadhaarSuffixForLogging =
                successfulSigner?.uidLastFourDigits
                  ? `xxxxxxxx${successfulSigner.uidLastFourDigits}`
                  : null;

              let notificationTitle = "Agreement Status Updated";
              let notificationMessage = `Loan agreement for ${loanId_display} status updated via Signzy V3 Contract. Customer: ${userName} (${contactInfo}), Amount: Rs.${loanAgreement.loan.amount}`;

              if (isSuccess) {
                notificationTitle = "Agreement Signed";
                const aadhaarText = aadhaarSuffixForLogging
                  ? ` [Aadhaar: ****${aadhaarSuffixForLogging}]`
                  : "";
                notificationMessage = `Loan agreement for ${loanId_display} has been signed by customer ${userName} (${contactInfo})${aadhaarText}. Amount: Rs.${loanAgreement.loan.amount}`;
              } else if (isRejected) {
                notificationTitle = "Agreement Rejected";
                notificationMessage = `Loan agreement for ${loanId_display} has been rejected by customer ${userName} (${contactInfo}). Amount: Rs.${loanAgreement.loan.amount}`;
              }

              await this.notificationService.create({
                title: notificationTitle,
                message: notificationMessage,
                priority: isSuccess ? ("HIGH" as any) : ("NORMAL" as any),
                loanId: loanAgreement.loan.id,
                userId: userDetails?.id,
                targets: targetPartnerIds.map((partnerId) => ({
                  partnerUserId: partnerId,
                  platform: "WEB" as any,
                })),
              });
            }
          }
        } catch (notificationError) {
          this.logger.error(
            `Failed to send Signzy V3 Contract agreement notification: ${notificationError.message}`,
            notificationError.stack,
          );
        }
      }
      return true;
    } catch (error) {
      this.logger.error("Error in Signzy V3 Contract webhook processing", {
        body,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  private async findSignzyV3ContractRequest(contractId: string) {
    const contractRequest = await this.prisma.signzy_some_table.findFirst({
      where: {
        documentId: contractId,
      },
      include: {
        loanAgreement: true,
        loanAgreementReference: true,
      },
    });

    if (!contractRequest) {
      this.logger.warn("Signzy V3 contract request not found", {
        contractId,
        timestamp: new Date().toISOString(),
      });
    }

    return contractRequest;
  }

  private async updateSignzyV3ContractRequest(
    contractRequestId: string,
    webhookBody: any,
  ) {
    await this.prisma.signzy_some_table.update({
      where: { id: contractRequestId },
      data: {
        callbackResponse: JSON.parse(JSON.stringify(webhookBody)),
      },
    });
  }

  private getValidDateOrNull(dateInput: any): Date | null {
    const date = new Date(dateInput);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private determineContractStatus(body: any): {
    isSuccess: boolean;
    isRejected: boolean;
  } {
    const hasSuccessfulSigner = body.signerdetail?.some(
      (signer: any) => signer.status === "SUCCESS",
    );
    const hasFinalSignedContract = !!body.finalSignedContract;

    const isSuccess =
      body.contractStatus === "COMPLETED" ||
      (hasFinalSignedContract && hasSuccessfulSigner);

    const isRejected =
      body.contractStatus === "FAILED" ||
      body.contractStatus === "EXPIRED" ||
      body.contractStatus === "CANCELLED";

    return { isSuccess, isRejected };
  }

  private extractSignerData(body: any): {
    signerInfo: any;
    firstAttempt: any;
    uidLastFourDigits: string | null;
    aadhaarSuffix: string | null;
    signedTime: any;
  } {
    const signerInfo = body.signerdetail?.[0];
    const firstAttempt = signerInfo?.esignAttempts?.[0];
    const transactionData = firstAttempt?.transaction?.transactionData;
    const uidLastFourDigits =
      transactionData?.dscData?.uidLastFourDigits || null;
    const aadhaarSuffix = uidLastFourDigits
      ? `xxxxxxxx${uidLastFourDigits}`
      : null;

    const signedTime =
      firstAttempt?.signingCompleteTime ||
      signerInfo?.contractLastSignTime ||
      body.contractCompletionTime;

    return {
      signerInfo,
      firstAttempt,
      uidLastFourDigits,
      aadhaarSuffix,
      signedTime,
    };
  }

  private async fetchAndConvertPdfBuffer(
    pdfUrl: string,
  ): Promise<Buffer | null> {
    if (!pdfUrl) return null;

    try {
      const response = await fetch(pdfUrl);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const pdfBuffer = Buffer.from(arrayBuffer);
        this.logger.log(
          `Successfully converted V3 Contract PDF from URL to buffer. Size: ${pdfBuffer.length} bytes`,
        );
        return pdfBuffer;
      } else {
        this.logger.warn(
          `Failed to fetch V3 Contract PDF from URL: ${response.status} ${response.statusText}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error converting V3 Contract PDF URL to buffer: ${error.message}`,
      );
    }
    return null;
  }

  private async updateLoanAgreementFromSignzyV3Webhook(
    contractRequest: any,
    body: any,
  ) {
    const { isSuccess, isRejected } = this.determineContractStatus(body);
    const { signerInfo, uidLastFourDigits, aadhaarSuffix, signedTime } =
      this.extractSignerData(body);

    // Prepare update data for reference
    const updateData: {
      signedAt?: Date | null;
      rejectedAt?: Date | null;
    } = {};

    if (isSuccess) {
      const parsedDate = this.getValidDateOrNull(signedTime);
      updateData.signedAt = parsedDate ?? new Date();
      updateData.rejectedAt = null;
    } else if (isRejected) {
      const parsedDate = this.getValidDateOrNull(body.contractCompletionTime);
      updateData.signedAt = null;
      updateData.rejectedAt = parsedDate ?? new Date();
    }

    const loanAgreementReference =
      await this.prisma.loanAgreementReference.findUnique({
        where: { id: contractRequest.loanAgreementReferenceId },
        select: {
          is_disabled: true,
          is_active: true,
          loan_recommended_amount: true,
        },
      });
    const loan = await this.prisma.loan.findUnique({
      where: { id: contractRequest.loanId },
      select: { status: true, amount: true },
    });

    const isValidLoanAgreementReference =
      ((loanAgreementReference?.is_active &&
        !loanAgreementReference?.is_disabled) ||
        loan.amount === loanAgreementReference.loan_recommended_amount) &&
      (loan?.status === loan_status_enum.APPROVED ||
        loan?.status === loan_status_enum.SANCTION_MANAGER_APPROVED);

    // Determine agreement status
    let agreementStatus: agreement_status_enum = agreement_status_enum.SENT;
    if (isSuccess && isValidLoanAgreementReference) {
      agreementStatus = agreement_status_enum.SIGNED;
    } else if (isRejected) {
      agreementStatus = agreement_status_enum.REJECTED;
    }

    // Build signed text
    const aadhaarDisplayText = aadhaarSuffix
      ? ` [Aadhaar: ****${uidLastFourDigits}]`
      : "";
    const signedText =
      isSuccess && signerInfo
        ? `Signed by ${signerInfo.signerName} via Signzy V3 Contract (${body.eSignProvider || "eSign"})${aadhaarDisplayText} on ${_dayjs(signedTime || new Date()).format("DD-MM-YYYY")}`
        : null;

    // Fetch and convert PDF if successful
    const pdfBuffer = isSuccess
      ? await this.fetchAndConvertPdfBuffer(body.finalSignedContract)
      : null;

    await this.prisma.$transaction([
      this.prisma.loanAgreementReference.update({
        where: { id: contractRequest.loanAgreementReferenceId },
        data: updateData,
      }),
      this.prisma.loanAgreement.update({
        where: { id: contractRequest.loanAgreementId },
        data: {
          status: agreementStatus,
          signedByUser: isSuccess,
          signed: signedText,
          aadhaarSuffix: isSuccess ? aadhaarSuffix : null,
          ...(body.signedDocument?.fileKey && {
            signedFilePrivateKey: body.signedDocument.fileKey,
          }),
        },
      }),
      this.prisma.signzy_some_table.update({
        where: { id: contractRequest.id },
        data: {
          pdfBlob: pdfBuffer,
        },
      }),
    ]);
  }

  private async sendAgreementSignedNotification(loan: any, userId: string) {
    try {
      const userDetails = loan.user;
      const userName =
        userDetails?.userDetails?.firstName &&
        userDetails?.userDetails?.lastName
          ? `${userDetails.userDetails.firstName} ${userDetails.userDetails.lastName}`
          : userDetails?.formattedUserId || "Unknown User";

      const contactInfo =
        userDetails?.phoneNumber || userDetails?.email || "No contact";
      const loanId_display = loan.formattedLoanId || loan.id;

      const targetPartnerIds = loan.allottedPartners
        .map((ap) => [ap.partnerUserId, ap.partnerUser.reportsToId])
        .flat()
        .filter(Boolean);

      if (targetPartnerIds.length > 0) {
        await this.notificationService.create({
          title: "Agreement Signed (Sync)",
          message: `Loan agreement for ${loanId_display} has been signed by customer ${userName} (${contactInfo}) - detected during sync. Amount: Rs.${loan.amount}`,
          priority: "HIGH" as any,
          loanId: loan.id,
          userId: userDetails?.id,
          targets: targetPartnerIds.map((partnerId) => ({
            partnerUserId: partnerId,
            platform: "WEB" as any,
          })),
        });
      }
    } catch (notificationError) {
      this.logger.error(
        `[Sync] Failed to send agreement sync notification for loan ${loan.id}: ${notificationError.message}`,
        notificationError.stack,
      );
    }
  }

  async syncAgreementStatus(brandId: string) {
    try {
      const loans = await this.prisma.loan.findMany({
        where: {
          brandId,
          status: {
            in: [
              loan_status_enum.SANCTION_MANAGER_APPROVED,
              loan_status_enum.APPROVED,
            ],
          },
          agreement: {
            isNot: null,
          },
        },
        include: {
          agreement: {
            where: {
              status: agreement_status_enum.SENT,
            },
            include: {
              references: true,
            },
          },
          allottedPartners: {
            include: {
              partnerUser: true,
            },
          },
          user: {
            select: {
              id: true,
              formattedUserId: true,
              phoneNumber: true,
              email: true,
              userDetails: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      if (!loans.length) {
        const msg = `No approved loans with SENT agreements found for brand ID: ${brandId}`;
        this.logger.warn(`[Sync] ${msg}`);
        throw new NotFoundException(msg);
      }

      this.logger.log(
        `[Sync] Found ${loans.length} loan(s) for agreement status check`,
      );

      const processedLoans: string[] = [];
      const formattedLoanIds: string[] = [];

      for (const loan of loans) {
        const agreement = loan.agreement;
        if (!agreement) {
          this.logger.warn(
            `[Sync] Skipping loan ID ${loan.id} - No agreement found`,
          );
          continue;
        }

        const references = agreement.references || [];
        if (!references.length) {
          this.logger.warn(
            `[Sync] Skipping loan ID ${loan.id} - No references found`,
          );
          continue;
        }

        this.logger.log(`[Sync] Processing loan ID: ${loan.id}`);

        for (const reference of references) {
          try {
            if (reference.provider === "SIGNZY") {
              this.logger.log(
                `[Sync] Checking Signzy V3 status for reference ID ${reference.id}`,
              );

              const signzyRecord =
                await this.prisma.signzy_some_table.findFirst({
                  where: {
                    loanAgreementId: agreement.id,
                    loanAgreementReferenceId: reference.id,
                  },
                });

              if (signzyRecord?.responseJson) {
                const requestId = (signzyRecord.responseJson as any)
                  ?.contractId;

                if (requestId) {
                  const status =
                    await this.signzyV3Service.getSignStatus(requestId);

                  await this.prisma.signzy_some_table
                    .updateMany({
                      where: {
                        loanAgreementId: agreement.id,
                        loanAgreementReferenceId: reference.id,
                      },
                      data: {
                        manualSyncResponse: JSON.parse(JSON.stringify(status)),
                      },
                    })
                    .catch((dbError) => {
                      this.logger.error(
                        "[Sync] Failed to update Signzy contract request:",
                        dbError,
                      );
                    });

                  // Check if contract is completed OR if finalSignedContract exists with a successful signer
                  const hasSuccessfulSigner = status.signerdetail?.some(
                    (signer: any) => signer.status === "SUCCESS",
                  );
                  const hasFinalSignedContract = !!status.finalSignedContract;

                  const signed =
                    status.contractStatus === "COMPLETED" ||
                    (hasFinalSignedContract && hasSuccessfulSigner);
                  if (signed) {
                    const parsedDate = _dayjs(
                      status.contractCompletionTime ||
                        status.signerdetail?.find(
                          (signer: any) => signer.status === "SUCCESS",
                        )?.contractLastSignTime ||
                        new Date(),
                    );

                    if (!parsedDate.isValid()) {
                      this.logger.warn(
                        `[Sync] Invalid contractCompletionTime for reference ID ${reference.id}: ${status.contractCompletionTime}`,
                      );
                      continue;
                    }

                    // Extract aadhaar suffix from successful signer
                    const successfulSigner = status.signerdetail?.find(
                      (signer: any) => signer.status === "SUCCESS",
                    );
                    const aadhaarSuffix = successfulSigner?.uidLastFourDigits
                      ? `xxxxxxxx${successfulSigner.uidLastFourDigits}`
                      : null;

                    const isValidLoanAgreementReference =
                      ((reference?.is_active && !reference?.is_disabled) ||
                        loan.amount === reference.loan_recommended_amount) &&
                      (loan?.status === loan_status_enum.APPROVED ||
                        loan?.status ===
                          loan_status_enum.SANCTION_MANAGER_APPROVED);
                    const agreementStatus = isValidLoanAgreementReference
                      ? agreement_status_enum.SIGNED
                      : undefined;

                    await this.prisma.$transaction([
                      this.prisma.loanAgreementReference.update({
                        where: { id: reference.id },
                        data: {
                          signedAt: parsedDate.toDate(),
                          rejectedAt: null,
                        },
                      }),
                      this.prisma.loanAgreement.update({
                        where: { id: agreement.id },
                        data: {
                          status: agreementStatus
                            ? agreement_status_enum.SIGNED
                            : undefined,
                          signedAt: parsedDate.toDate(),
                          aadhaarSuffix: aadhaarSuffix,
                        },
                      }),
                    ]);

                    this.logger.log(
                      `[Sync] Agreement marked as SIGNED for loan ID ${loan.id}, reference ID ${reference.id}`,
                    );
                    processedLoans.push(loan.id);
                    formattedLoanIds.push(loan.formattedLoanId);

                    // Send notification to allocated partners
                    await this.sendAgreementSignedNotification(
                      loan,
                      loan.user?.id,
                    );
                  } else {
                    this.logger.log(
                      `[Sync] No signed status found in signer info for reference ID ${reference.id} (loan ID ${loan.id})`,
                    );
                  }
                } else {
                  this.logger.warn(
                    `[Sync] No requestId found in signzy record for reference ${reference.id}`,
                  );
                  continue;
                }
              } else {
                this.logger.warn(
                  `[Sync] No signzy record found for reference ${reference.id}`,
                );
                continue;
              }
            } else if (reference.provider === "DIGITAP") {
              const status = await this.digitapService.getSignStatus(
                loan.userId,
                loan.id,
                agreement.id,
                reference.id,
              );

              // Update Digitap record with manual sync response
              await this.prisma.digitap_esign_some_table
                .updateMany({
                  where: {
                    loanId: loan.id,
                    loanAgreementId: agreement.id,
                    loanAgreementReferenceId: reference.id,
                  },
                  data: {
                    manualSyncResponse: JSON.parse(JSON.stringify(status)),
                  },
                })
                .catch((dbError) => {
                  this.logger.error(
                    "[Sync] Failed to update Digitap esign record:",
                    dbError,
                  );
                });

              // Check if document is signed - look for any signer with state "signed"
              const signedSigner = status.model?.signers?.find(
                (signer: any) => signer.state === "signed",
              );

              if (signedSigner) {
                // Parse the signed date
                const parsedDate = _dayjs(signedSigner.signedOn);

                if (!parsedDate.isValid()) {
                  this.logger.warn(
                    `[Sync] Invalid signedOn date for reference ID ${reference.id}: ${signedSigner.signedOn}`,
                  );
                  continue;
                }

                // Fetch the signed PDF from the URL if available
                let pdfBuffer: Buffer | null = null;
                if (status.model?.url) {
                  try {
                    const pdfResponse = await fetch(status.model.url);
                    if (pdfResponse.ok) {
                      const arrayBuffer = await pdfResponse.arrayBuffer();
                      pdfBuffer = Buffer.from(arrayBuffer);
                      this.logger.log(
                        `[Sync] Successfully fetched Digitap signed PDF. Size: ${pdfBuffer.length} bytes`,
                      );
                    } else {
                      this.logger.warn(
                        `[Sync] Failed to fetch Digitap PDF from URL: ${pdfResponse.status} ${pdfResponse.statusText}`,
                      );
                    }
                  } catch (error) {
                    this.logger.error(
                      `[Sync] Error fetching Digitap PDF URL: ${error.message}`,
                    );
                  }
                }

                // Build signer information string for the agreement
                const signedText = `Signed by ${signedSigner.name} (${signedSigner.signerName}) via Digitap [Aadhaar: ****${signedSigner.aadhaarSuffix}], Gender: ${signedSigner.gender}, State: ${signedSigner.signerState}, Mobile: ${signedSigner.mobile}, Email: ${signedSigner.email}, Postal Code: ${signedSigner.postalCode} on ${_dayjs(signedSigner.signedOn).format("DD-MM-YYYY")}`;

                const isValidLoanAgreementReference =
                  ((reference?.is_active && !reference?.is_disabled) ||
                    loan.amount === reference.loan_recommended_amount) &&
                  (loan?.status === loan_status_enum.APPROVED ||
                    loan?.status ===
                      loan_status_enum.SANCTION_MANAGER_APPROVED);
                const agreementStatus = isValidLoanAgreementReference
                  ? agreement_status_enum.SIGNED
                  : undefined;
                await this.prisma.$transaction([
                  this.prisma.loanAgreementReference.update({
                    where: { id: reference.id },
                    data: {
                      signedAt: parsedDate.toDate(),
                      rejectedAt: null,
                    },
                  }),
                  this.prisma.loanAgreement.update({
                    where: { id: agreement.id },
                    data: {
                      status: agreementStatus
                        ? agreement_status_enum.SIGNED
                        : undefined,
                      signedByUser: true,
                      signed: signedText,
                      aadhaarSuffix: signedSigner.aadhaarSuffix,
                    },
                  }),
                  this.prisma.digitap_esign_some_table.updateMany({
                    where: {
                      loanAgreementId: agreement.id,
                      loanAgreementReferenceId: reference.id,
                    },
                    data: {
                      pdfBlob: pdfBuffer,
                    },
                  }),
                ]);

                this.logger.log(
                  `[Sync] Agreement marked as SIGNED for loan ID ${loan.id}, reference ID ${reference.id}`,
                );
                processedLoans.push(loan.id);
                formattedLoanIds.push(loan.formattedLoanId);

                // Send notification to allocated partners
                await this.sendAgreementSignedNotification(loan, loan.user?.id);
              } else {
                this.logger.log(
                  `[Sync] No signed status found in signer info for reference ID ${reference.id} (loan ID ${loan.id})`,
                );
              }
            } else {
              this.logger.log(
                `[Sync] Checking SignDesk status for reference ID ${reference.id}`,
              );

              const status = await this.signDeskService.getSignStatus(
                loan.userId,
                loan.id,
                agreement.id,
                reference.id,
                reference.referenceId,
                reference.referenceDocId,
              );

              await this.prisma.signDeskSomeTable.updateMany({
                where: {
                  loanAgreementsId: agreement.id,
                  loanAgreementReferenceId: reference.id,
                },
                data: {
                  manualSyncResponse: JSON.stringify(status),
                },
              });

              if (status.status !== "success") {
                this.logger.warn(
                  `[Sync] Reference ID ${reference.id} for loan ID ${loan.id} - API response status: ${status.status}`,
                );
                continue;
              }

              const signed = status.signer_info.find(
                (signer) => signer.status === "signed",
              );

              if (signed) {
                const parsedDate = _dayjs(signed.signed_at);

                if (!parsedDate.isValid()) {
                  this.logger.warn(
                    `[Sync] Invalid signed_at date for reference ID ${reference.id}: ${signed.signed_at}`,
                  );
                  continue;
                }

                // Extract aadhaar suffix from signer_info array
                const signerInfo = status.signer_info?.find(
                  (signer: any) => signer.status === "signed",
                );
                const aadhaarSuffix = (signerInfo as any)
                  ?.last_digits_of_aadhaar
                  ? `xxxxxxxx${(signerInfo as any).last_digits_of_aadhaar}`
                  : null;
                const isValidLoanAgreementReference =
                  ((reference?.is_active && !reference?.is_disabled) ||
                    loan.amount === reference.loan_recommended_amount) &&
                  (loan?.status === loan_status_enum.APPROVED ||
                    loan?.status ===
                      loan_status_enum.SANCTION_MANAGER_APPROVED);
                const agreementStatus = isValidLoanAgreementReference
                  ? agreement_status_enum.SIGNED
                  : undefined;

                await this.prisma.$transaction([
                  this.prisma.loanAgreementReference.update({
                    where: { id: reference.id },
                    data: {
                      signedAt: parsedDate.toDate(),
                      rejectedAt: null,
                    },
                  }),
                  this.prisma.loanAgreement.update({
                    where: { id: agreement.id },
                    data: {
                      status: agreementStatus
                        ? agreement_status_enum.SIGNED
                        : undefined,
                      signedAt: parsedDate.toDate(),
                      aadhaarSuffix: aadhaarSuffix,
                    },
                  }),
                ]);

                this.logger.log(
                  `[Sync] Agreement marked as SIGNED for loan ID ${loan.id}, reference ID ${reference.id}`,
                );
                processedLoans.push(loan.id);
                formattedLoanIds.push(loan.formattedLoanId);

                // Send notification to allocated partners
                await this.sendAgreementSignedNotification(loan, loan.user?.id);
              } else {
                this.logger.log(
                  `[Sync] No signed status found in signer info for reference ID ${reference.id} (loan ID ${loan.id})`,
                );
              }
            }
          } catch (err) {
            this.logger.error(
              `[Sync] Error checking signature for reference ID ${reference.id} (loan ID ${loan.id}): ${err.message}`,
              err,
            );
          }
        }
      }

      const resultMsg = `Agreement status sync complete. Total processed loans: ${processedLoans.length}`;
      this.logger.log(`[Sync] ${resultMsg}`);

      return {
        message: resultMsg,
        processedLoanIds: processedLoans,
        formattedLoanIds: formattedLoanIds,
      };
    } catch (error) {
      this.logger.error(
        `[Sync] Agreement status sync failed for brand: ${brandId}`,
        error,
      );
      throw new InternalServerErrorException(
        `Failed to synchronize agreements: ${error.message}`,
      );
    }
  }

  async generateEsignDocument(userId: string, loanId: string) {
    if (!userId || !loanId) {
      throw new HttpException(
        "User ID, Loan ID, Loan Agreement ID, and Loan Agreement Reference ID are required",
        HttpStatus.BAD_REQUEST,
      );
    }
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        agreement: true,
        repayment: {
          include: {
            feeBreakdowns: true,
          },
        },
        loanDetails: true,
        penalties: true,

        disbursement: {
          include: {
            deductions: {
              include: {
                taxes: true,
              },
            },
          },
        },
        costSummary: true,
      },
    });
    if (
      !loan ||
      (loan.status !== loan_status_enum.APPROVED &&
        loan.status !== loan_status_enum.SANCTION_MANAGER_APPROVED)
    ) {
      throw new HttpException(
        "Approved loan not found for the given Loan ID",
        HttpStatus.NOT_FOUND,
      );
    }
    if (loan.agreement.status === agreement_status_enum.SIGNED) {
      throw new HttpException(
        "Loan agreement is already signed for this loan",
        HttpStatus.BAD_REQUEST,
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        phoneNumber: true,
        brandId: true,
        userDetails: {
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
            address: true,
            aAdharName: true,
            aAdharDOB: true,
            state: true,
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
        status: document_status_enum.APPROVED,
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
        loanAgreementHeader: true,
        loanAgreementFooter: true,
        brand: {
          select: {
            id: true,
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
            brandConfig: {
              select: {
                sectionManagerName: true,
                sectionManagerPhoneNumber: true,
                sectionManagerAddress: true,
                sectionManagerEmail: true,
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

    const brandLoanAgreementConfigs =
      await this.prisma.brand_loan_agreement_configs.findFirst({
        where: { brandId: user.brandId },
      });
    const lenderName = brandLoanAgreementConfigs.lenderName || "Lender";
    const lenderAddress = brandLoanAgreementConfigs.lenderAddress || "";
    const nameOfDigitalLendingApplication =
      brandLoanAgreementConfigs.nameOfDigitalLendingApplication ||
      brandConfig?.brand?.name ||
      "Digital Lending Application";
    const nameOfLendingServiceProvider =
      brandLoanAgreementConfigs.nameOfLendingServiceProvider ||
      brandConfig?.brand?.name ||
      "";
    const nameOfLoanServiceProviderRecoveryAgent =
      brandLoanAgreementConfigs.nameOfLoanServiceProviderRecoveryAgent ||
      brandConfig?.brand?.name ||
      "";
    const grievanceOfficerName =
      brandLoanAgreementConfigs.grievanceOfficerName || "";
    const grievanceOfficerAddress =
      brandLoanAgreementConfigs.grievanceOfficerAddress || "";
    const grievanceOfficerEmail =
      brandLoanAgreementConfigs.grievanceOfficerEmail || "";
    const grievanceOfficerPhone =
      brandLoanAgreementConfigs.grievanceOfficerPhone || "";
    const nodalOfficerName =
      brandLoanAgreementConfigs.nodalOfficerName || "Nodal Officer";
    const nodalOfficerAddress =
      brandLoanAgreementConfigs.nodalOfficerAddress || "";
    const nodalOfficerEmail = brandLoanAgreementConfigs.nodalOfficerEmail || "";
    const nodalOfficerPhone = brandLoanAgreementConfigs.nodalOfficerPhone || "";

    const supportEmail = brandConfig?.brand?.brandDetails?.contactEmail || "";
    const privacyPolicyUrl =
      brandConfig?.brand?.brandPolicyLinks?.privacyPolicyUrl || "";

    function getUserName(user) {
      const userDetails = user?.userDetails;

      if (!userDetails) return "";

      let { aAdharName, firstName, middleName, lastName } = userDetails;

      // Ensure null or undefined fields become empty strings
      aAdharName = aAdharName ?? "";
      firstName = firstName ?? "";
      middleName = middleName ?? "";
      lastName = lastName ?? "";

      // Use aAdharName if it's not empty or just whitespace
      if (aAdharName.trim()) {
        return aAdharName.trim();
      }

      // Build full name safely
      return [firstName, middleName, lastName]
        .map((name) => name.trim())
        .filter(Boolean)
        .join(" ");
    }

    // Usage:
    const userName = getUserName(user);

    const disbursementDate = loan.disbursementDate
      ? _dayjs(loan.disbursementDate)
      : _dayjs();
    const durationInDays = loan.loanDetails.durationDays;

    let generatePdfBase64 = null;

    // Helper function to convert hundreds to words
    const convertHundreds = (num: number): string => {
      const ones = [
        "",
        "One",
        "Two",
        "Three",
        "Four",
        "Five",
        "Six",
        "Seven",
        "Eight",
        "Nine",
      ];
      const teens = [
        "Ten",
        "Eleven",
        "Twelve",
        "Thirteen",
        "Fourteen",
        "Fifteen",
        "Sixteen",
        "Seventeen",
        "Eighteen",
        "Nineteen",
      ];
      const tens = [
        "",
        "",
        "Twenty",
        "Thirty",
        "Forty",
        "Fifty",
        "Sixty",
        "Seventy",
        "Eighty",
        "Ninety",
      ];

      let result = "";
      if (num >= 100) {
        result += ones[Math.floor(num / 100)] + " Hundred ";
        num %= 100;
      }
      if (num >= 20) {
        result += tens[Math.floor(num / 10)];
        if (num % 10 > 0) {
          result += " " + ones[num % 10];
        }
      } else if (num >= 10) {
        result += teens[num - 10];
      } else if (num > 0) {
        result += ones[num];
      }
      return result.trim();
    };

    // Helper function to convert number to words including lakhs and crores
    const numberToWords = (num: number): string => {
      if (num === 0) return "Zero";

      let result = "";
      const crores = Math.floor(num / 10000000);
      const lakhs = Math.floor((num % 10000000) / 100000);
      const thousands = Math.floor((num % 100000) / 1000);
      const hundreds = num % 1000;

      if (crores > 0) {
        result += convertHundreds(crores) + " Crore ";
      }
      if (lakhs > 0) {
        result += convertHundreds(lakhs) + " Lakh ";
      }
      if (thousands > 0) {
        result += convertHundreds(thousands) + " Thousand ";
      }
      if (hundreds > 0) {
        result += convertHundreds(hundreds);
      }

      return result.trim();
    };
    if (brandConfig?.loanAgreementVersion === 1) {
      generatePdfBase64 = await this.pdfService.generatePdfBase64(
        {
          sectionManagerAddress:
            brandConfig?.sectionManagerAddress || "Company Address",
          brandName: brandConfig?.brand?.name || "Company Limited",
          domain:
            brandConfig?.brand?.brandDetails?.website || "www.company.com",
          fullname: userName,
          loanAmount: loan.amount,
          roi: loan.repayment?.feeBreakdowns[0]?.chargeValue || 0,
          totalInterest: loan.repayment.totalFees,
          processingFee: loan.disbursement.totalDeductions,
          disbursalAmount: loan.disbursement.netAmount,
          repaymentAmount: loan.repayment.totalObligation,
          annualPercentage: loan.costSummary.effectiveAPR,
          tenure: durationInDays,
          loanNo: loan.formattedLoanId,
          pan: pan.documentNumber,
          disbursalDate: disbursementDate.format("DD-MM-YYYY"),
          repaymentDate: _dayjs(loan.loanDetails.dueDate).format("DD-MM-YYYY"),
          brandFooterLogo: brandConfig?.brand?.logoUrl || "",
          brandHeaderLogo: brandConfig?.brand?.logoUrl || "",
          penalInterest: loan.penalties[0]?.chargeValue || 0,
          bouncedCharges: "1000", // Default value
          sanctionDate: _dayjs().format(),
          title: `Loan Agreement for ${userName}`,
          residenceAddress: user.userDetails.address,
          stateCountry: user.userDetails.state + ", " + "India",
          mobile: user.phoneNumber,
          contingentCharge: {
            lookupPeriod: "3",
            name: brandConfig?.sectionManagerName || "",
            mobileNumber: brandConfig?.sectionManagerPhoneNumber || "",
            address: brandConfig?.sectionManagerAddress || "",
          },
        },
        "loan-agreement",
        platform_type.PARTNER,
        user.brandId,
        userId,
      );
    } else if (brandConfig?.loanAgreementVersion === 2) {
      const totalTaxes = loan.costSummary?.totalTaxes || 0;

      const processingFeeAmountWithoutTaxes =
        (loan.disbursement?.totalDeductions || 0) - totalTaxes;
      const processingFeeAmountWithTaxes =
        loan.disbursement?.totalDeductions || 0;
      +totalTaxes;

      const tax = loan.disbursement?.deductions?.[0];

      generatePdfBase64 = await this.pdfService.generatePdfBase64(
        {
          documentTitle: "Loan Sanction Letter",
          headerImageUrl: brandConfig?.loanAgreementHeader || "",
          footerImageUrl: brandConfig?.loanAgreementFooter || "",
          brandHeaderLogo: brandConfig?.brand?.logoUrl || "",
          brandFooterLogo: brandConfig?.brand?.logoUrl || "",
          sanctionLetter: {
            title: "SANCTION LETTER",
            greeting: `Dear ${userName},`,
            subject: `Sub: Short Term Personal Loan from ${lenderName}.`,
            introParagraph: `With reference to your application dated ${disbursementDate.format("DD-MM-YYYY")} for a Short Term Personal Loan, we have the pleasure of sanctioning you an amount of Rs. ${loan.amount} (${numberToWords(loan.amount)} Rupees Only) subject to the following terms and conditions:`,
            loanDetails: [
              { label: "Loan Amount", value: `Rs. ${loan.amount}` },
              {
                label: "Interest Rate",
                value: `${loan.repayment?.feeBreakdowns[0]?.chargeValue || 0}% per day`,
              },
            ],
            chargesIntro:
              "As of effective date, the Schedule of interest and the charges are as follows:",
            chargesTable: {
              headers: { component: "Component", details: "Details" },
              rows: [
                {
                  component: "Interest on the Loan",
                  details: `${loan.repayment?.feeBreakdowns[0]?.chargeValue || 0}% per day from the date of disbursal until the date of repayment. In the event of failure to make payment on due date, a ${loan.penalties[0]?.chargeValue || 0}% per day shall be applicable from the due date until the date of payment.`,
                },
                {
                  component: "Processing Fee",
                  details: `The lender will charge a processing fee of INR ${
                    tax?.taxes[0]?.isInclusive
                      ? processingFeeAmountWithTaxes.toFixed(2)
                      : processingFeeAmountWithoutTaxes.toFixed(2)
                  } ( 
                  ${tax?.chargeValue || 0} ${
                    tax?.calculationValueType === "percentage" ? "%" : ""
                  }  ${tax?.taxes[0]?.isInclusive ? "inclusive" : "exclusive"} of ${tax?.taxes[0]?.type || ""}
                  ).`,
                },
                {
                  component: "Late Fee",
                  details: `In case of delay in payment of amount due, late fee charges shall be INR ${loan.penalties[0]?.chargeValue || 0}% of the loan amount, whichever is higher.`,
                },
                {
                  component: "Maximum interest rate",
                  details: `The Interest rate on the loan shall not exceed ${((loan.repayment?.feeBreakdowns[0]?.chargeValue || 0) * 30).toFixed(2)}% per month.`,
                },
              ],
            },
            waiverClause:
              "The Lender, may at its sole discretion, waive or reduce the charges as mentioned above, on a case to case basis.",
            contactInfo: `For any queries, you may write to us at <a href='mailto:${supportEmail}'>${supportEmail}</a>, <a href='mailto:${
              grievanceOfficerEmail
            }'>${grievanceOfficerEmail}</a>`,
            closing: [
              "Look forward to serving you.",
              "Kind Regards",
              "Authorized Signatory",
              `${nameOfDigitalLendingApplication} on behalf of ${nameOfLendingServiceProvider}`,
            ],
          },
          kfs: {
            title: "A. Details of the Loan",
            tableTitle: "Key Fact Statement (KFS)",
            headers: {
              sno: "S.No.",
              parameter: "Parameters",
              details: "Details",
            },
            details: [
              {
                sno: "(a)",
                parameter: "Name of the Lender",
                details: lenderName,
              },
              {
                sno: "(b)",
                parameter: "Name of the Borrower",
                details: userName,
              },
              {
                sno: "(c)",
                parameter: "Customer Address as per Aadhar card",
                details: user.userDetails.address,
              },
              {
                sno: "(d)",
                parameter: "Mobile Number",
                details: user.phoneNumber,
              },
              {
                sno: "(e)",
                parameter: "Pan Card No",
                details: pan.documentNumber,
              },
              {
                sno: "(f)",
                parameter: "Name of the Lending Service Provider (LSP)",
                details: nameOfLendingServiceProvider,
              },
              {
                sno: "(g)",
                parameter: "Name of the Digital Lending Application (DLA)",
                details: nameOfDigitalLendingApplication,
              },
              {
                sno: "(h)",
                parameter:
                  "Name of the Loan Service Provider acting as recovery agent and authorized to approach the Borrower",
                details: nameOfLoanServiceProviderRecoveryAgent,
              },
              {
                sno: "(i)",
                parameter: "Loan ID",
                details: loan.formattedLoanId,
              },
              {
                sno: "(j)",
                parameter: "Sanction Loan Amount",
                details: `Rs. ${loan.amount}`,
              },
              {
                sno: "(k)",
                parameter: "ROI (% per day)",
                details: `${loan?.repayment?.feeBreakdowns[0]?.chargeValue || 0}%`,
              },
              {
                sno: "(l)",
                parameter:
                  "Total Interest charge during the entire Tenure of the loan",
                details: `Rs. ${loan?.repayment?.totalFees}`,
              },
              {
                sno: "(m)",
                parameter: "Processing Fee",
                details: `Rs. ${processingFeeAmountWithoutTaxes.toFixed(2)}`,
              },
              {
                sno: "(n)",
                parameter: "GST",
                details: `Rs. ${totalTaxes.toFixed(2)}` || `Rs. 0`,
              },
              {
                sno: "(o)",
                parameter: "Total Fees (m + n)",
                details: `Rs. ${loan.disbursement.totalDeductions}` || `Rs. 0`,
              },
              {
                sno: "(p)",
                parameter: "Net Disbursed Amount",
                details: `Rs. ${loan.disbursement.netAmount}`,
              },
              {
                sno: "(q)",
                parameter: "Total Repayment Amount",
                details: `Rs. ${loan.repayment.totalObligation}`,
              },
              {
                sno: "(r)",
                parameter: "Repayment Date",
                details: _dayjs(loan.loanDetails.dueDate).format("DD-MM-YYYY"),
              },
            ],
            contingentCharges: [
              {
                sno: "(s)",
                parameter: "Tenure of the Loan (in Days)",
                details: `${durationInDays} Days`,
              },
              {
                sno: "(t)",
                parameter: "Repayment Frequency",
                details: "One Time Only",
              },
              {
                sno: "(u)",
                parameter: "Number of installments of Repayment",
                details: "1",
              },
              {
                sno: "(v)",
                parameter: "Annual Percentage Rate (APR)",
                details: `${loan.costSummary.effectiveAPR}%`,
              },
              {
                sno: "",
                parameter:
                  "<strong style='text-align:left;'>Details about Contingent Charges</strong>",
                details: "",
              },
              {
                sno: "(w)",
                parameter:
                  "Rate of annualized penal charges in case of delayed payments",
                details: "Double of (k)",
              },
              {
                sno: "(x)",
                parameter: "Taxes & Levies",
                details:
                  "The Loan and any other services rendered by the Lender and/ or payments made by the Borrower shall be subject to applicable taxes notified by the government from time to time. The Borrower shall pay all taxes present and future on any transactions undertaken with the Lender.",
              },
              {
                sno: "(y)",
                parameter: "Costs and charges",
                details:
                  "1. Cheque/electronic Instrument bounce /non-registration of NACH – NA<br />2. Payment gateway charges for repayment –NA<br />3. Stamp Duty -NA",
              },
            ],
          },
          coolingOffPeriod: {
            title: "*A cooling off period",
            description:
              "allows you / Borrower / end-user to cancel or withdraw from the loan until the Cooling-off Period. Upon expiry of the Cooling-off Period, the loan terms shall be deemed to be accepted by you. The Cooling-off Period on the loan commences / starts from the date of signing / accepting the loan terms / agreement and ends on the third (3) day from such acceptance. The Lender shall not levy any penalty or pre-payment charges for cancellation during the Cooling-off Period.",
          },
          grievance: {
            cancellationRequest: {
              paragraphs: [
                `To apply for cancellation of loan during the Cooling-off Period, a request must be submitted by the Borrower at <a href='mailto:${supportEmail}'>${supportEmail}</a>, <a href='mailto:${
                  grievanceOfficerEmail
                }'>${
                  grievanceOfficerEmail
                }</a>. After submission of such request, the Borrower must submit a copy of the bank account statement in which the said loan amount was disbursed along with an undertaking that such loan amount was not utilized by the Borrower during the Cooling-off Period.`,
                "The cancellation request will only be accepted, if (a) the loan has not been utilized; and (b) the Borrower repays the principal amount along with the Rate of Interest.",
              ],
            },
            title: "B. Grievance Redressal Mechanism",
            levels: [
              {
                level: "Level 1",
                officer: {
                  title: "Grievance Redressal Officer (GRO)",
                  policyInfo: `Borrowers can refer to Grievance Redressal Policy at <a href='${
                    privacyPolicyUrl
                  }'>${privacyPolicyUrl}</a>`,
                  details: {
                    title: "Grievance Redressal Officer (GRO)",
                    name: `${grievanceOfficerName}`,

                    address: `${grievanceOfficerAddress}`,
                    cityStateZip: ``,
                    contactLabel: "Contact No",
                    contactNo: `${grievanceOfficerPhone}`,
                    emailLabel: "Email",
                    email: `<a href='mailto:${supportEmail}'>${
                      supportEmail
                    }</a>`,
                  },
                },
                nodalOfficer: {
                  title: "Nodal Officer",
                  details: {
                    title: "Nodal Officer",
                    name: `${nodalOfficerName}`,
                    address: `${nodalOfficerAddress}`,
                    cityStateZip: ``,
                    contactLabel: "Contact No",
                    contactNo: `${nodalOfficerPhone}`,
                    emailLabel: "Email",
                    email: `<a href='mailto:${nodalOfficerEmail}'>${nodalOfficerEmail}</a>`,
                  },
                },
                lsp: {
                  title: "LSP",
                  description: `The GRO may be reached on the number provided above anytime between 9:00 AM to 6:00 PM from Monday to Friday except public holidays or write to the GRO. The GRO shall endeavor to resolve the grievance within a period of (14) fourteen days from the date of receipt of a grievance.<br /><br />If the Borrower does not receive a response from the GRO within 14 (fourteen) days of making a representation, or if the Borrower is not satisfied with the response received from the GRO, the Borrower may approach the Nodal Officer anytime between 9:00 AM to 6:00 PM from Monday to Friday except public holidays or write to the Nodal Officer.`,
                },
              },
            ],
          },
          recoveryMechanism: {
            title: "C. TERMS & CONDITIONS OF RECOVERY MECHANISM",
            intro:
              "The Lender undertakes the recovery practices considering the following terms.",
            methods: [
              "In-house/Outsource Recovery",
              "Telephone Recovery {Human / IVR / Robo Calls}",
              "Digital Recovery",
              "Reminder Communication",
              "Legal Notice",
              "Arbitration & Conciliation",
              "The Borrower authorizes us to inform Borrower’s employer of any default in repayment and agrees to do things necessary to fulfill Borrower’s obligations.",
              "In case of default in repayment of the Loan amount, Borrower authorizes us and our collection assistance specialist engaged, to contact Borrower over phone, office or visit Borrower’s residence or such other place where Borrower is located.",
            ],
            paragraphs: [
              "For the purpose of undertaking collection and recovery the Lender may, either on its own or through the service provider (including its agents etc.), undertake collection or recovery from the Borrower. The details of service provider and its agents etc.",
            ],
          },
          repaymentSchedule: {
            title: "D. REPAYMENT SCHEDULE",
            headers: [
              "S.No.",
              "Principal (INR)",
              "Interest (INR)",
              "Fees (INR)",
              "Due Date",
              "Repayable (INR)",
            ],
            rows: [
              {
                sno: "1",
                principal: `Rs. ${loan.amount}`,
                interest: `Rs. ${loan.repayment.totalFees}`,
                fees: `Rs. ${loan.disbursement.totalDeductions}`,
                dueDate: _dayjs(loan.loanDetails.dueDate).format("DD-MM-YYYY"),
                repayable: `Rs. ${loan.repayment.totalObligation}`,
              },
            ],
            contactInfo: `For any queries, you may write to us at <a href='mailto:${supportEmail}'>${supportEmail}</a>, <a href='mailto:${
              grievanceOfficerEmail
            }'>${grievanceOfficerEmail}</a>`,
            closing: [
              "Look forward to serving you.",
              "Kind Regards",
              "Authorized Signatory",
              `${nameOfDigitalLendingApplication} on behalf of ${nameOfLendingServiceProvider}`,
            ],
          },
          legalSections: [
            {
              title: "LOAN CUM COMMERCIAL TERMS",
              pageBreakBefore: false,
              introParagraphs: [
                'By clicking the "I AGREE" button, you acknowledge that you have read, understood, and accepted the terms and conditions set forth herein ("Terms"). You further agree to be bound by these Terms and will be fully responsible for complying with them. If you do not agree with any provision of these Terms, do not click the "I AGREE" button.',
                `Upon your acceptance of these Terms and the Key Fact Statement ("KFS"), you, the borrower ("Borrower")—which term shall include individual, legal heir(s), successor(s), and permitted assignee(s), unless repugnant to the context—confirm having requested a credit facility from ${
                  lenderName
                } having its registered office at ${
                  lenderAddress || "Company Address"
                } ("Lender"), under the conditions specified herein.`,
                "The Borrower hereby understands and acknowledges that these Terms are for two loan products, namely (a) Bullet Repayment; (b) EMI / Installment and that based on the nature / type of Loan availed by me / us through the Application Form and thereafter accepted in the KFS, only the respective Loan product Terms shall apply.",
              ],
              clauses: [
                {
                  title: "Definition:",
                  paragraphs: [
                    "In these Terms, the capitalized words shall have the following meanings. All terms capitalized but not defined below shall have such meaning as ascribed to them in the Commercial Terms:",
                  ],
                  list: [
                    {
                      term: "ANNUALISED PERCENTAGE RATE / APR",
                      definition:
                        "means the effective annualised rate payable by the Borrower based on an all-inclusive cost and margin including cost of funds, credit cost and operating cost, processing fee, verification charges, maintenance charges, etc., and / or such specific costs indicated in the KFS.",
                    },
                    {
                      term: "APPLICATION FORM",
                      definition:
                        "means, direct application made by the Borrower for the Loan through web portal / mobile application of the Lender.",
                    },
                    {
                      term: "BORROWER",
                      definition:
                        "means the individual availing the Loan from the Lender in under these Terms hereof and who has agreed to the terms and conditions contained in these Terms for the purpose of availing Loan.",
                    },
                    {
                      term: "BULLET REPAYMENT",
                      definition:
                        "shall mean such Loan product where the Borrower repays the full Outstanding Amount on one fixed Due Date;",
                    },
                    {
                      term: "COMMERCIAL TERMS",
                      definition:
                        "shall mean the terms applicable to the Loan as detailed in SCHEDULE I of these Terms.",
                    },
                    {
                      term: "DUE DATE",
                      definition:
                        "shall mean such date identified in the Commercial Terms and KFS on which the EMI shall be due and payable by the Borrower.",
                    },
                    {
                      term: "ECS OR NACH",
                      definition:
                        "means electronic clearing services / electronic payment services, consented to in writing by Borrower, for facilitating the payment of EMI, fees and other applicable charges to the Lender in connection with the Loan.",
                    },
                    {
                      term: "ESSENTIAL DATA",
                      definition:
                        "means such data which is statutorily required by the Lender to be retained for compliance with applicable laws.",
                    },
                    {
                      term: "EQUATED MONTHLY INSTALLMENT (EMI) / INSTALLMENT",
                      definition:
                        "shall mean such Loan product whereby the Borrower repays the Outstanding Amount at such frequency (monthly / quarterly) as indicated in the Commercial Terms on the respective Due Date during the Tenure of the Loan.",
                    },
                    {
                      term: "GRIEVANCE REDRESSAL OFFICER",
                      definition:
                        "shall mean the officer named in the Commercial Terms and KFS who shall address and resolve the complaints / queries of Borrowers.",
                    },
                    {
                      term: "LOAN",
                      definition:
                        "means the credit facility granted / agreed to be granted by the Lender to the Borrower.",
                    },
                    {
                      term: "KFS",
                      definition:
                        "shall mean the Key Fact Statement provided by the Lender before the execution of these Terms which lays down details such as Annual Percentage Rate, terms and conditions of recovery mechanism, details of Grievance Redressal Officer, and Cooling-off/ Look-up period.",
                    },
                    {
                      term: "OUTSTANDING AMOUNT",
                      definition:
                        "shall mean all amounts pertaining to the Loan whether by way of the principal amount together with any EMI, accrued interest, default interest, Prepayment charges, bounce charges and/or any other cost and charges indicated herein or the Commercial Terms or KFS.",
                    },
                    {
                      term: "PREPAYMENT",
                      definition:
                        "means premature repayment of the Loan in full, including principal amount, interest thereon, and all Outstanding Amount which is not yet due for payment by the Borrower under the Terms.",
                    },
                    {
                      term: "REPAYMENT SCHEDULE",
                      definition:
                        "shall mean the schedule shared by the Lender which indicates the Outstanding Amount and the Due Date on which the said Outstanding Amount is to be repaid by the Borrower.",
                    },
                    {
                      term: "REPAYMENT INSTRUMENT",
                      definition:
                        "shall mean an ECS / NACH / standing instructions / cheque / post-dated cheque (PDC) and / or such other negotiable instrument or mode of payment that may be notified by the RBI from time to time.",
                    },
                    {
                      term: "RBI",
                      definition: "shall mean the Reserve Bank of India.",
                    },
                    {
                      term: "TENURE",
                      definition:
                        "shall mean the months / years as indicated in the Commercial Terms and KFS.",
                    },
                  ],
                },
                {
                  title:
                    "Borrower's Representations, Warranties and Undertakings:",
                  paragraphs: [
                    "The Borrower hereby represents and warrants as follows:",
                  ],
                  list: [
                    "Is of sound mind, competent to contract, has attained the age of majority, and capable of fulfilling the obligations under these terms;",
                    "Is financially stable, not declared bankrupt or insolvent, and capable of repaying the Loan.",
                    "Will maintain sufficient funds in the designated account for repayment.",
                    "Shall maintain confidentiality and security over communications with the Lender.",
                    "Accepts the Lender's final discretion in case of any disputes regarding interpretation or materiality of any matter.",
                    "All information and documents provided are true, correct, complete, and not misleading.",
                    "Authorizes the Lender to access necessary data (location, CIBIL score, KYC, etc.) for loan processing and servicing.",
                    "Agrees to the storage of Essential Data for a duration of 5 to 8 years as per law.",
                    "Confirms that the Loan shall be used strictly for the declared purpose and agrees to provide end-use certification upon request.",
                  ],
                },
                {
                  title: "Loan Disbursement:",
                  paragraphs: [
                    'The Lender shall disburse the Loan into an account specified in Commercial Terms, below and/or such other account as indicated in the Loan disbursal request form ("DRF").',
                  ],
                },
                {
                  title: "Repayment:",
                  term: ["The Borrower hereby agrees and undertakes:"],
                  list: [
                    "to issue such Repayment Instruments for: (a) Bullet Repayment Loan; (b) EMI Loan, respectively based on the type of Loan product agreed to be availed by the Borrower. The Borrower shall repay the Loan for such amount and at such intervals as is specified in the Commercial Terms, KFS and / or Repayment Schedule shared by the Lender from time to time. The Borrower understands and acknowledges that Lender may collect repayment directly by itself or through third party agents, as appointed by the Lender. The Borrower further undertakes to extend all co-operation with such third-party agents to ensure that due fulfillment of Borrower's obligations under these Terms and to obtain a valid discharge against the Outstanding Amounts.",

                    "that should at any time during the Tenure of the Loan, if instructions for stop payment, cancellation of a Repayment Instrument and /or fail to confirm / register the ECS / NACH, the same shall be treated as dishonour / bounce of the Repayment Instrument, and the Loan shall be recalled at the discretion of the Lender.",
                    'that upon delay and / or non-payment of Outstanding Amounts on the respective Due Date, the Lender shall have the right to classify the Borrower and its accounts as Special Mention Account ("SMA") and / or Non-Performing Asset ("NPA"), as detailed below:',
                  ],
                  paragraphs: [
                    "If the Due Date is second (2nd) day of every month and the Borrower pays the Instalment amount on thirtieth (30th) of the month, the Lender shall levy Default Interest starting from third (3rd) until thirtieth (30th). In the second scenario, if the Borrower does not pay on the Due Date and the Outstanding Amount remain unpaid for a continuous period of thirty (30) days, the Lender shall have the right to: (a) levy Default Interest; and (b) report the Borrower as an SMA-0. If the Borrower further continues to default in repayment from a period of thirty (30) days up to sixty (60) days, the Lender shall report the Borrower as SMA-1 and levy Default Interest. If the Borrower further continues to default in repayment from a period of sixty (60) days up to ninety (90) day, the Lender shall report the Borrower as SMA-2 and levy Default Interest. Further, if the Borrower defaults in repayment beyond ninety (90) days, the Lender shall report the Borrower as NPA and levy Default Interest. The Lender shall additionally have the right to call and Event of Default in accordance with Clause 8, below, at any time upon an event of non-payment.",
                  ],
                },
                {
                  title: "Interest & Costs:",
                  paragraphs: [
                    "The Borrower shall pay interest on the Loan at the Rate of Interest specified in the Commercial Terms from the date when the Loan is disbursed. The Lender shall inform the Borrower regarding any change in Rate of Interest by way of publishing a notice that shall be displayed on the notice board in the branch of the Lender or on the Lender's website. The said notice of change of Rate of Interest shall be deemed to be sufficient notice of change to the Borrower. The Borrower shall pay on the Loan, processing fee, stamp duty, and such other fees and charges indicated in the KFS and/ or notified by the Lender. Further, the Borrower undertakes to pay such fees / charges/ costs that comprise the Annual Percentage Rate, as mentioned in the Commercial Terms and KFS. The Borrower understands that Loan is subject to applicable taxes and such other statutory levies as may be notified by the government from time to time. All such taxes and levies shall be payable by the Borrower.",
                  ],
                },
                {
                  title: "Prepayment:",
                  paragraphs: [
                    "In the event the Borrower wishes to prepay the Loan, the same shall be subject to Prepayment Fees as indicated in the Commercial Terms. Such Prepayment Fees shall be levied or become applicable after expiry of the Cooling-off and / or Look-up period indicated in the Commercial Terms and KFS.",
                  ],
                },
                {
                  title: "Default/ Penal Interest:",
                  paragraphs: [
                    "In the event the Borrower fails to comply with the Terms including failure to repay the Loan on a Due Date and/ or such other Events of Default listed in Clause 8 below, the Lender shall be entitled to levy Default/ Penal Interest set out in Commercial Terms and KFS on the Outstanding Amount from the date of default until full and final settlement.",
                  ],
                },
                {
                  title: "Events of Default and Remedies:",
                  paragraphs: [
                    'The following are the events of default under these Terms ("Event of Default"):',
                  ],
                  list: [
                    "failure by borrower is subjected to any insolvency or bankruptcy proceeding or a receiver is appointed for ihe Borrower to repay the Loan (whole or part) on the Due Date;",
                    "breach / non-performance of any representation, warranty, covenant, undertaking or obligations under these Terms (including non-submission of documents or execution thereof), or any change in the information furnished by the Borrower to the Lender, if deemed material by the Lender;",
                    "the Borrower is subjected to any insolvency or bankruptcy proceeding or a receiver is appointed for its assets;",
                    "if the Borrower commits default in relation to any other loan or credit facility and /or statutory taxes and dues owed, or enters into any compromise with its creditors, or admits any inability in payment of its other debts;",
                    "the performance of obligations under these Terms becomes void or illegal;",
                    "non-payment of any of dues and / or outstanding amounts to any other financial institutions; and / or",
                    "any event which, with the passage of time, is likely to become an Event of Default.",
                  ],
                },
                {
                  title: "Lender's Rights on Event of Default:",
                  paragraphs: [
                    "On the happening of any Event of Default, the Lender may at its sole discretion, without prejudice to other rights and claims under these Terms, exercise any or all of the following rights, i.e.,: (a) recall the Loan and / or declare the Loan to become immediately due and payable; (b) levy Default Interest on the Outstanding Amount from the date when the Event of Default occurs until the date when the Event of Default has ceased to exist; and / or (c) exercise any other rights or remedies available to the Lender under applicable law including initiating civil and criminal proceedings.",
                  ],
                },
                {
                  title: "Unconditional Cancellability:",
                  paragraphs: [
                    "The Lender reserves the unconditional right to cancel the Loan and / or any tranches advanced / to be advanced (either fully or partially) without giving any prior notice to the Borrower, on the occurrence of any one or more of the following (a) in case the Loan / part of the Loan are not utilised by the Borrower; (b) in case of 'Deterioration in the Creditworthiness' of the Borrower in any manner whatsoever; (c) in case of non-compliance of these Terms. For the purpose of this clause, Deterioration in the Creditworthiness shall mean and include without limitation, the following events: (a) downgrade of the rating of the Borrower by a credit rating agency; and / or (b) any other reason / event in the opinion of the Lender constituting or which may constitute Deterioration in the Creditworthiness.",
                  ],
                },
                {
                  title: "Disclaimer:",
                  paragraphs: [
                    "The Borrower agrees and acknowledges that the Lender shall not be liable or responsible for any defect in the consumer durable products / goods purchased by the Borrower, in the event of any complaints / queries with respect to a product purchased from a third party from the proceeds of the Loan. The Borrower shall directly address such complaints / queries with the seller / manufacturer/ retailer or any other third party associated with selling such product.",
                  ],
                },
                {
                  title: "Disclosure:",
                  paragraphs: [
                    "The Borrower authorizes the Lender to disclose any information in relation to the Loan with: (a) RBI; (b) credit information companies / bureaus and information utilities; (c) any governmental / regulatory / statutory authority; (d) other financial institutions and industry bodies; (e) affiliates and group companies of the Lender; and / or (f) third party engaged by the Lender for purpose of the Loan including but not limited to KYC collection, recovery of dues and repayment and / or such other services as deemed necessary by the Lender. The Borrower hereby acknowledges and agrees that the RBI and / or any credit bureau, information utilities, any governmental / regulatory / statutory authority may publicly publish such data, subject to applicable laws.",
                  ],
                },
                {
                  title: "Indemnity:",
                  paragraphs: [
                    "The Borrower shall indemnify and hold harmless the Lender and its directors, officers and agents, from and against any and all costs, expenses, direct or indirect claims, liabilities, demands and / or claims whatsoever, including any third-party claims for damages incurred as a consequence of occurrence of an Event of Default, breach of the terms and conditions of these Terms or acts of omission and commission on the part of the Borrower, or otherwise on account of the Loan.",
                  ],
                },
                {
                  title: "Evidence to Debt/ Electronic Evidence:",
                  paragraphs: [
                    "The Lender may generate physical copies of these Terms from its system or produce these Terms in any other form at its discretion and the same shall be fully binding on the Borrower and such computer generated certificate / statement from the Lender's system shall be conclusive evidence of the existence of the Outstanding Amounts of the Borrower. The Borrower hereby waives any right it may have under contract or applicable law to contest or raise an invalidity against such electronic records.",
                  ],
                },
                {
                  title: "Assignment:",
                  paragraphs: [
                    "The Lender may, without Borrower's consent or notice can assign its rights & obligations under these Terms to its affiliates or assignee but the Borrower is not entitled to directly or indirectly assign the benefit or obligation of these Terms to any third party.",
                  ],
                },
                {
                  title: "Dispute Resolution:",
                  paragraphs: [
                    "Any or all disputes, claims, differences arising out of or in connection with these Terms between the Lender and the Borrower shall be settled by arbitration to be referred to a sole arbitrator to be appointed by the Lender and the place of the arbitration shall be Maharashtra.",
                  ],
                },
                {
                  title: "Governing Law:",
                  paragraphs: [
                    "In the event of any dispute or controversy arising out of the arbitration clause, shall be governed by laws of India and the Courts at Maharashtra shall have sole and exclusive jurisdiction.",
                  ],
                },
                {
                  title: "Notices:",
                  paragraphs: [
                    "Any notice to be given to Borrower in respect of these Terms shall be deemed to have been validly given and received if provided by using telephonic call (recorded) or text message to the registered mobile number of the Borrower, email to registered email id and written notice by courier or registered post to registered address of Borrower.",
                  ],
                },
                {
                  title: "Joint and Several Liability:",
                  paragraphs: [
                    "The obligations of the Borrower(s) and Co-Borrowers (if any) under these Terms shall be joint and several.",
                  ],
                },
                {
                  title: "NACH Mandate:",
                  paragraphs: [
                    "The amount mentioned on NACH Mandate for approval from borrower is 250% of the existing sanctioned credit limit/ loan amount as it covers possible increase of credit limit in near future, processing fee, interest and other charges levied in the event of default. Lenders, may at their absolute discretion, waive or reduce the charges as mentioned above, on a case to case basis.",
                  ],
                },
                {
                  title: "In Witness Whereof:",
                  paragraphs: [
                    "The Borrower hereby accepts the terms and conditions this Agreement.",
                  ],
                },
                {
                  title: "Appropriation:",
                  paragraphs: [
                    "Any payments made by or recovered from the Borrower or otherwise shall be appropriated in a manner deemed fit by the Lender, as per its policies.",
                  ],
                },
                {
                  title: "Set-off:",
                  paragraphs: [
                    "The Lender shall be entitled to, without further notice, set-off any monies with the Lender or any monies payable by the Lender to the Borrower(s) against all Outstanding Amounts of the Borrower with the Lender.",
                  ],
                },
                {
                  title: "Contact Information",
                  paragraphs: [
                    `For any queries, you may write to us at ${supportEmail},${grievanceOfficerEmail}`,
                    "Look forward to serving you.",
                    "Kind Regards",
                    "Authorized Signatory",
                    `${nameOfDigitalLendingApplication} on behalf of ${nameOfLendingServiceProvider}`,
                  ],
                },
              ],
            },
            {
              title: "LOAN AGREEMENT",
              introParagraphs: [
                "THIS LOAN AGREEMENT is made at the date and place set out in Schedule A hereto",
                "BY AND BETWEEN:",
                'The entity listed in Schedule A (hereinafter referred to as the "Lender", which expression shall, unless it be repugnant to the subject or context thereof, be deemed to mean and include its successors and assigns).',
                "AND",
                'The Person(s) listed in Schedule A hereto, having his / her / its / their address as set out in Schedule A (hereinafter referred to as the "Borrower ", which expression shall, unless it be repugnant to the subject or context thereof, be deemed to mean and include his / her / its / their respective heirs, executors, administrators, legal representatives, successors, permitted assigns, partner(s) for the time being, including the legal representatives of the deceased partner(s), if any);',
              ],
              clauses: [
                {
                  title: "WHEREAS:",
                  list: [
                    "Lender is a non-banking finance company within the meaning of the Reserve Bank of India Act, 1934 and is registered with the Reserve Bank of India as a non-banking finance company. Lender is engaged in the business of providing financial services and financial products as required by customers from time to time",
                    "The Borrower(s) is an employed/salaried individual(s) as per details set out in Schedule A hereto and are in requirement of funds for the purpose more particularly described in the Sanction Letter and Key Fact Statement and has approached the Service Provider of the Lender to avail the Loan,",
                    "Whereas the Borrower is in need of money and at the request of the Borrower and after scrutinizing all the requisite documents and credibility of the Borrower, the Lender has agreed to grant Loan, to the Borrower in accordance with the terms and conditions hereinafter contained:",
                    "NOW, THEREFORE, in consideration of the representations, warranties, mutual agreements, and covenants set forth in this Agreement, the Lender and Borrower agree as follows:",
                  ],
                },
                {
                  title: "DEFINITIONS AND REFERENCE TERMS",
                  paragraphs: [
                    "The following capitalized words/expressions shall carry the meaning ascribed to them below, throughout this Agreement, unless otherwise stated or unless repugnant to the subject or context thereof:",
                  ],
                  list: [
                    {
                      term: "Agreement",
                      definition:
                        "means this Loan Agreement, including the Schedules hereto, each as amended, modified, supplemented and / or restated from time to time, and shall also include Sanction Letter cum Key Fact Statement in accordance with the terms hereof.",
                    },
                    {
                      term: "Application Form",
                      definition:
                        "means the application form as prescribed by the Lender (whether through its Service Provider) and filled in by the Borrower, prior to the date hereof, to avail the Loan.",
                    },
                    {
                      term: "Borrower",
                      definition:
                        "shall have the meaning ascribed to such term in the Recitals of this Agreement. For the avoidance of doubt, any reference in this Agreement to the term 'Borrower'.",
                    },
                    {
                      term: "Collection Account",
                      definition:
                        "means the bank account of the Lender, designated as such, to which all amounts due and payable by the Borrower pursuant to the Loan Documents, are to be remitted.",
                    },
                    {
                      term: "Contract Act",
                      definition: "means Indian Contract Act, 1872;",
                    },
                    {
                      term: "Approved Bank",
                      definition:
                        "means a designated bank approved by the Lender (whether directly or through the Service Provider) for the purposes related to the Loan.",
                    },
                    {
                      term: "Delayed Payment Charges",
                      definition:
                        "shall mean the additional amount payable by the Borrower to the Lender on account of any delay in payment of any Instalment and / or bullet payment(s), as more particularly set out in the Sanction Letter. Cum KFS",
                    },
                    {
                      term: "Demand Promissory Note",
                      definition:
                        "means the Demand Promissory Note in the format prescribed by the Lender, to be executed by the Borrower, to secure payment of the Loan given to the Borrower pursuant to the terms hereof and the Sanction Letter cum KFS.",
                    },
                    {
                      term: "Dishonor Charges",
                      definition:
                        "means the dishonor charges payable by the Borrower to the Lender in the event of dishonor / bouncing of any Repayment Instrument, pursuant to the provisions of the Loan Documents.",
                    },
                    {
                      term: "Eligibility Criteria",
                      definition:
                        "means the minimum eligibility criteria set forth by the Lender to judge the credit worthiness of the Borrower, which is subject to change from time to time, at the sole and absolute discretion of the Lender.",
                    },
                    {
                      term: "Event of Default",
                      definition:
                        "has the meaning ascribed to such term in Article 8.1 of this Agreement.",
                    },
                    {
                      term: "Fee",
                      definition:
                        "means the aggregate amount payable by the Borrower to the Lender / Service Provider, as per the details provided in the Sanction Letter cum Key Fact Statement",
                    },
                    {
                      term: "Repayment",
                      definition:
                        "This can be further defined and segregated in/as bellow:",
                    },
                    {
                      term: "Installments",
                      definition:
                        "means the equated monthly installment payable by the Borrower at monthly intervals, as detailed in the Sanction Letter cum KFS, during the tenor of the Loan, towards repayment of the principal amount of the Outstanding Balance.",
                    },
                    {
                      term: "Bullet Payment",
                      definition:
                        'means the one-time amount payable by the Borrower, as detailed in the Sanction Letter cum KFS, during the tenor of the Loan, towards repayment of the principal amount of the outstanding balance. "Lender" shall have the meaning ascribed to such term in the Recitals of this Agreement.',
                    },
                    {
                      term: "Loan",
                      definition:
                        "means any and all term loans sanctioned / disbursed by the Lender to the Borrower pursuant to the provisions of this Agreement and the other Loan Documents; and includes re-borrowing of the paid Loan; and disbursal of new Loan.",
                    },
                    {
                      term: "Loan Documents",
                      definition:
                        "means this Agreement, the Application Form (including all documents furnished by the Borrower with the Application Form), Demand Promissory Note, Sanction Letter cum KFS, Welcome Letter and all other documents, instruments, certificates, guarantees and agreements executed and/or delivered by the Borrower or any third party in connection with the Loan in favor of the Lender pursuant to the terms of this Agreement or the other Loan Documents.",
                    },
                    {
                      term: "Notice of Demand",
                      definition:
                        "means a notice of demand issued by or on behalf of the Lender.",
                    },
                    {
                      term: "Outstanding Balance",
                      definition:
                        "means the balance of the principal amount of the Loan outstanding along with all other amounts payable by the Borrower to the Lender, pursuant to the terms of the Loan Documents, including, without limitation, the Interest, Delayed Payment Charges, Fees, Installments and / or bullet payment(s), Prepayment Charges, Dishonor Charges, Taxes, Lender Swap Charges and other costs, charges, expenses.",
                    },
                    {
                      term: "Payment",
                      definition:
                        "means the payment towards Bullet payments, Installments, Interest, Delayed Payment Charges, Fees, Prepayment Charges, Dishonor Charges, Taxes, Lender Swap Charges and other costs, charges, expenses, payable pursuant to the terms of the Loan Documents, in respect of the Loan, through any mode as approved by the Lender.",
                    },
                    {
                      term: "Person",
                      definition:
                        "shall mean any individual, corporation, partnership, (including, without limitation, association), company incorporated under the provisions of the Companies Act, 1956 / Companies Act, 2013, trust, unincorporated organization, Hindu undivided family or any governmental authority or political subdivision thereof. The expression shall, unless repugnant to the context or meaning thereof, be deemed to mean and include: (i) in case of a company, its successors and permitted assigns; (ii) in case of a partnership firm, the partners for the time being and from time to time of the partnership firm, their survivor or survivors of them, their respective heirs, administrators, executors, legal representatives and successors of the partner(s); (iii) in case of a trust, the trustee or trustees of the trust for the time being and from time to time; (iv) in case of a Hindu undivided family, the Karta and the members for the time being and from time to time of the said Hindu undivided family and their respective heirs, executors, administrators and legal representatives; (v) in case of an individual proprietor, the proprietor's heirs, administrators, executors and legal representatives;",
                    },
                    {
                      term: "Pre-Payment",
                      definition:
                        "means the payment of the Outstanding Balance (or any part thereof) prior to the Scheduled Due Date for the same, according to the procedure prescribed in Article 6 of this Agreement, through any mode as approved by the Lender. The terms",
                    },
                    {
                      term: "Prepayment Charges",
                      definition:
                        "means the charges payable by the Borrower to the Lender in the event of Pre-Payment of the Outstanding Balance (or any part thereof), pursuant to the terms of the Loan Documents.",
                    },
                    {
                      term: "Rate of Interest or Interest",
                      definition:
                        "means the rate at which interest on the Loan is payable by the Borrower to the Lender, as stipulated in the Sanction Letter cum KFS, as amended from time to time with prior intimation to the Borrower.",
                    },
                    {
                      term: "Repayment Instruments",
                      definition:
                        'means Post Dated Cheques (“PDC”), Electronic Clearance Service (“ECS”), National Automated Clearing House Mandate ("NACH") and / or Standing Instructions (“SI”) (i.e., the debit clearing service notified by the Reserve Bank of India or the National Payments Corporation of India), for which the Borrower has agreed (in writing) to participate in, for facilitating payment of Instalments and/or Bullet payments.',
                    },
                    {
                      term: "Repayment Schedule",
                      pageBreakBefore: true,
                      definition:
                        "shall mean the repayment schedule of the Instalments and / or bullet payment(s) set out in the Sanction Letter cum Key Fact Statement, being the schedule for repayment of the Instalments and / or bullet payment(s) in relation to the Loan to the Lender.",
                    },
                    {
                      term: "Receipt",
                      definition:
                        "means the receipt issued by the Borrower in favor of the Lender, in the form prescribed by the Lender, for acknowledgment of disbursal of the Loan or a part thereof.",
                    },
                    {
                      term: "Sanction Letter cum Key Fact Statement",
                      definition:
                        "means the document that include the key terms of the Loan sanctioned by the Lender to the Borrower, in the way clearly understood by the Borrower, bearing reference number as set out in Schedule A and executed by the Borrower and the Lender on the date set out in Schedule A.",
                    },
                    {
                      term: "Security",
                      definition:
                        "shall have the meaning set out in the Sanction Letter cum KFS and / or the other Loan Documents.",
                    },
                    {
                      term: "Security Documents",
                      definition:
                        "shall mean and include without limitation any documents (including this Agreement) entered into or executed by the Borrower, or any other Person/s for creating and perfecting the Security (if any) to the satisfaction of the Lender.",
                    },
                    {
                      term: "Security Interest",
                      definition:
                        "shall mean any mortgage, pledge, hypothecation, assignment, deposit arrangement, encumbrance, lien (statutory or other), preference, priority or other security agreement of any kind or nature whatsoever including, without limitation: (i) any conditional sale or other title retention agreement, any financing or similar statement or notice filed under any recording or notice statute; and (ii) any designation of loss payees or beneficiaries or any similar arrangement under any insurance contract",
                    },
                    {
                      term: "Service Provider",

                      definition: `shall mean ${
                        lenderName
                      }, a company incorporated under the provisions of Companies Act, 2013 and having its registered address at ${
                        lenderAddress
                      }, which expression shall, unless it be repugnant to the subject or context thereof, include its successors and permitted assigns and/or any agents / sub-contractors appointed by the Lender. The Service Provider acts as the authorized agent and representative of the Lender and shall undertake all requisite activities/services as mentioned in the Service Agreement executed between the Service Provider and Lender.`,
                    },
                    {
                      term: "Scheduled Due Date",
                      definition:
                        "means each of the dates on which the Bullet payments, Instalments together with Interest, Delayed Payment Charges, Fees, Prepayment Charges, Dishonor Charges, Taxes, Lender Swap Charges and any other costs, charges, expenses if any, are due and payable by the Borrower to the Lender, pursuant to the terms of the Loan Documents.",
                    },
                    {
                      term: "Standing Instructions and/or SI",
                      definition:
                        'means the written instructions issued by the Borrower to the Approved Bank where the Borrower maintaining account, of an amount equal to the Instalments or bullet payment(s) in favor of the Lender for repayment of the Loan. It may include other/all applicable (re)payment modes, means Post Dated Cheques ("PDC"), Electronic Clearance Service ("ECS") National Automated Clearing House Mandate ("NACH") and / or Standing Instructions ("SI") (i.e. the debit clearing service notified by the Reserve Bank of India or the National Payments Corporation of India), for which the Borrower has agreed (in writing) to participate in, for facilitating payment of Instalment(s) and / or bullet payment(s)',
                    },
                    {
                      term: "Terms and Conditions or Terms",
                      definition:
                        "mean the terms and conditions as contained in this Agreement, including all covenants, representations, and Schedules herein / hereto.",
                    },
                  ],
                },
                {
                  title: "LOAN, RATE OF INTEREST, TAXES ETC.",
                  list: [
                    {
                      term: "Loan:",
                      sublist: [
                        "The Lender agrees to make available to the Borrower a Loan in the amount specified in the Sanction Letter cum Key Fact Statement (KFS), subject to and strictly in accordance with the terms and conditions set forth in this Agreement and the other Loan Documents executed by the Borrower. The Borrower hereby accepts and agrees to avail the Loan on the said terms.",
                        "The disbursement of the Loan shall be made by the Lender either in a single lump sum or in such instalments as the Lender may determine at its sole discretion.",
                        "The Borrower shall, upon request by the Lender, acknowledge the receipt of each disbursed amount by executing a receipt or any other document in a form acceptable to the Lender.",
                      ],
                    },
                    {
                      term: "Terms of Disbursement and drawdowns:",
                      sublist: [
                        "Subject to the terms and conditions set forth in this Agreement and the other Loan Documents, the Lender may extend to the Borrower a Loan up to an aggregate principal amount as specified in the Sanction Letter cum Key Fact Statement (KFS).",
                        "The Borrower agrees and undertakes to utilize the Loan solely for the purpose stated in the Sanction Letter cum KFS, and for no other purpose whatsoever. The Borrower acknowledges that the Lender shall not be under any obligation to monitor or verify the utilization of the Loan amount and shall not be liable in any manner for the Borrower's use or misuse thereof.",
                      ],
                    },
                    {
                      term: "Rate of Interest:",
                      definition:
                        "The Borrower agrees to pay interest and such other penal/additional interest payable on the Loan at such rates as mentioned in the Sanction Letter cum Key Fact Statement.",
                    },
                    {
                      term: "Direct and Indirect Taxes and Duties:",
                      definition:
                        'The Borrower hereby agrees that it shall be its sole liability to pay any and all taxes, duties or cesses including but not limited to service tax, GST, stamp duty, VAT, duties, and/or all other levies by whatever name called, payable in relation to the Loan provided by the Lender and/or the services provided pursuant hereto and/or any or all the Loan Documents (collectively referred to as "Taxes"). The Borrower shall reimburse to the Lender any such Taxes which may become payable and/ or has been paid by the Lender, as and when called upon to do so by the Lender and if the Borrower fails to pay/reimburse the same, such amounts paid by the Lender shall form part of the principal amount of the Loan Disbursed.',
                    },
                    {
                      term: "Cooling off Period:",
                      definition:
                        "The Borrower is allowed a Cooling Off period of 3 days during which the Borrower shall have the option to decide to either continue with Loan or repay the same by paying the entire outstanding Loan amount including interest, charges or any other charges as mentioned in the Sanction Letter cum KFS post which no request for the cancellation of loan shall be entertained by the Lender.",
                    },
                  ],
                },
                {
                  title: "PAYMENTS",
                  list: [
                    {
                      term: "Payment of Instalments and Bullet Payments",
                      sublist: [
                        'The Borrower shall pay to the Lender all Instalments and/or bullet payments (inclusive of Interest), strictly on a monthly basis, on the Scheduled Due Dates, beginning from the first due date and continuing through to the last due date as stipulated in the Sanction Letter cum Key Fact Statement ("Sanction Letter cum KFS"). Time shall be of the essence for such payments. All payments shall be made through Repayment Instruments issued by the Borrower in favor of the Lender.',
                        "The Borrower shall not instruct or request the Lender to withhold or delay the presentation of any Repayment Instrument. Any delay or failure by the Lender or its Service Provider in presenting a Repayment Instrument shall not affect or defer the Borrower's liability to make timely payments.",
                      ],
                    },
                    {
                      term: "Dishonor of Repayment Instruments",
                      definition:
                        "In the event of any Repayment Instrument being dishonored, the Borrower shall be liable to pay Dishonor Charges as specified in the Sanction Letter cum KFS. This shall be without prejudice to any other rights and remedies available to the Lender under law or the Loan Documents.",
                    },
                    {
                      term: "Return or Disposal of Repayment Instruments upon Foreclosure",
                      definition:
                        "In the event of foreclosure or closure of the Loan, the Lender shall return any unutilized Repayment Instruments held by it within 30 (thirty) days from the date on which the Lender receives a written request from the Borrower. If the Borrower fails to collect such Repayment Instruments within this period, the Lender shall be entitled, at its sole discretion, to destroy them. The Borrower shall not have any claim or right to demand the return of the Repayment Instruments after this period.",
                    },
                    {
                      term: "Right to Recall in Case of Misrepresentation",
                      definition:
                        "The Lender shall have the right to immediately recall the entire Outstanding Balance if it discovers that any information furnished by the Borrower—whether oral or written and whether provided in the Loan Documents, Application Form, or otherwise—relating to income, employment, personal details, or any other material fact, is false, misleading, or incorrect. Such right shall be without prejudice to any other rights or remedies available to the Lender under applicable law.",
                    },
                    {
                      term: "Repayment to Collection Account",
                      definition:
                        "The Borrower agrees that all Repayment Instruments shall be drawn in favor of the Collection Account, the details of which are set out in Schedule A to this Agreement. The Lender reserves the right to modify the Collection Account by providing the Borrower with not less than 5 (five) days' written notice. Upon such change, the Borrower shall ensure that all subsequent payments are made to the new Collection Account and shall issue fresh Repayment Instruments accordingly.",
                    },
                    {
                      term: "Corporate Borrower – Change in Authorized Signatories",
                      definition:
                        "Where the Borrower is a corporate entity, it shall not make any change to or revoke any authorization granted to its authorized signatories who have executed the Repayment Instruments, without prior written notice to the Lender. Upon appointing new authorized signatories, the Borrower shall ensure that such signatories deliver replacement Repayment Instruments to the Lender within 3 (three) calendar days of their appointment.",
                    },
                    {
                      term: "Appointment of Agent",
                      definition: `The Borrower acknowledges and agrees that ${
                        lenderName
                      } has been appointed by the Lender as its authorized agent (“Agent”) for purposes including, but not limited to, disbursement, collection, recovery, and all other incidental matters related to the Loan. The Agent shall act exclusively under the instructions of the Lender.`,
                    },
                  ],
                },
                {
                  title: "SECURITY & OTHER TERMS:",
                  list: [
                    "The Borrower shall execute, in favor of the Lender, a Demand Promissory Note and such other documents as may be required by the Lender, in a form approved by the Lender, covering the full amount of the Loan along with applicable interest.",
                    "Any security provided or created by the Borrower under this Agreement and/or any other Loan Documents shall constitute continuing security, remaining in full force and effect until the entire Outstanding Balance and all other dues payable under the Loan Documents are fully repaid and discharged to the satisfaction of the Lender",
                    "Each security interest created under this Agreement or any other Loan Document shall be in addition to, and not in substitution of, any other security, guarantee, lien, indemnity, undertaking, or right that the Lender presently holds or may hold in the future, whether under law or otherwise, in relation to the Outstanding Balance or any part thereof.",
                    "The security created under this Agreement or any other Loan Document shall not be merged with, and shall not exclude or be prejudiced by, any other security interest, right of recourse, or remedy (including the invalidity thereof) that the Lender presently holds or may acquire in the future in respect of the Borrower or any other person liable for repayment of the Outstanding Balance.",
                    "The security interest created or to be created in favor of the Lender shall be released only upon full repayment of the Outstanding Balance and settlement of all dues and obligations owed by the Borrower, whether under this Agreement or otherwise, including any obligations owed by the Borrower to affiliates or group companies of the Lender.",
                    "Upon occurrence of an Event of Default, and without prejudice to any other rights or remedies available to the Lender under applicable law or the Loan Documents, the Lender shall have the right to: e) Declare the entire Outstanding Balance, whether due or payable at such time or not, as immediately due and payable; f) Exercise any and all powers and rights available under the Loan Documents or under applicable law; g) Undertake any action permitted, expressly or impliedly, by the Loan Documents or applicable legal provisions.",
                    "The Borrower acknowledges that the powers granted to the Lender under this clause are for valuable consideration, are coupled with interest, and shall accordingly be irrevocable for as long as any portion of the Outstanding Balance remains unpaid.",
                    "The enforcement of any security interest by the Lender shall not affect the Borrower's continuing liability to the Lender for any shortfall or deficiency arising or continuing under this Agreement or any of the Loan Documents in respect of the Outstanding Balance.",
                  ],
                },
                {
                  title: "OTHER CONDITIONS",
                  paragraphs: [
                    "The Borrower agrees and undertakes to comply with the following obligations throughout the tenure of the Loan:",
                  ],
                  list: [
                    {
                      term: "Change in Contact and Banking Details ",
                      definition:
                        "Promptly notify the Lender of any change in the Borrower’s residential or office address, and/or any modifications to the bank account from which the Repayment Instruments have been issued and associated repayment instructions provided.",
                    },
                    {
                      term: "Salary Account Continuity ",
                      definition:
                        "Ensure continued credit of salary into the same bank account from which Repayment Instruments have been issued towards repayment of the Loan. The Borrower shall not modify, close, or redirect salary credits to any other account without obtaining the Lender’s prior written consent.",
                    },
                    {
                      term: "Change in Employment / Occupation ",
                      definition:
                        "Immediately inform the Lender of any change in employment status, including resignation, termination, job switch, or initiation of a new business or profession. Upon such change, the Borrower shall:",
                      sublist: [
                        "Provide the name and address of the new employer, business, and/or professional establishment;",
                        "Ensure that salary or business income continues to be credited to the designated repayment account, unless otherwise permitted in writing by the Lender. The Lender reserves the right to terminate this Agreement and the other Loan Documents at its sole discretion in the event of such change, if deemed necessary.",
                        {
                          term: "Prohibited Use of Loan ",
                          definition:
                            "Not utilize any part of the Loan amount for illegal activities, immoral purposes, gambling, betting, lottery, races, speculative trading, or any activity of a similar prohibited or unethical nature.",
                        },
                        {
                          term: "Regulatory Compliance ",
                          definition:
                            "Obtain and submit all requisite permissions, consents, and approvals to the Lender and/or its service providers, as may be required under applicable law or internal policy, prior to the disbursement of the Loan.",
                        },
                        {
                          term: "Acknowledgement of Terms ",
                          definition: `Acknowledge having read and understood all terms and conditions, privacy policy, and relevant documents made available on the websites of both ${
                            lenderName
                          } (hereinafter referred to as ${
                            lenderName
                          }) and the Lender.`,
                        },
                        {
                          term: "Acceptance of Online Terms ",
                          definition: `Unconditionally agree to comply with all the terms and conditions, privacy policy, and other legally binding content published on the websites of ${
                            lenderName
                          } (hereinafter referred to as ${
                            lenderName
                          } ) and the Lender, as may be updated from time to time.`,
                        },
                        {
                          term: "Accuracy of Information ",
                          definition:
                            "Confirm that all personal, financial, and employment-related information provided to Tejas Loan and the Lender is true, accurate, and complete in all respects. The Borrower undertakes to immediately inform the Lender of any change or inaccuracy discovered.",
                        },
                      ],
                    },
                  ],
                },
                {
                  title: "PRE-PAYMENT",
                  list: [
                    "The Borrower may, subject to the prior written approval of the Lender, prepay the entire Outstanding Balance or any part thereof (“Prepayment Amount”) by providing at least one (1) calendar day prior written notice to the Lender, expressing the intention to make such prepayment.",
                    "Upon receiving the Lender’s written approval in response to the Borrower’s notice under Clause 6.1, the Borrower shall remit the Prepayment Amount to the Lender within five (5) calendar days from the date of such approval. Failure to make payment within the specified time frame shall render the prepayment request null and void, unless otherwise agreed by the Lender in writing.",
                    "Prepayment of the Loan shall be subject to Prepayment Charges as specified in the Sanction Letter cum Key Fact Statement (KFS), as may be amended from time to time. The applicable Prepayment Charges shall be computed on the Prepayment Amount and shall be payable simultaneously with the Prepayment Amount.",
                    "The Lender shall have the sole and absolute discretion to apply the Prepayment Amount received from the Borrower in the following order of priority: a) First, towards any Prepayment Charges, Interest, Delayed Payment Charges, Fees, Dishonor Charges, Taxes, Lender Swap Charges, and all other costs, expenses, or charges payable under the Loan Documents. b) Thereafter, towards the Bullet Payment or Installments, as applicable, or in such other manner as the Lender may deem appropriate.",
                    "Upon full and final prepayment of the entire Outstanding Balance, and subject to clearance of all dues, the Lender shall return the Repayment Instruments to the Borrower in accordance with the provisions of relevant Clause of this Agreement.",
                  ],
                },
                {
                  title: "BORROWER’S REPRESENTATIONS AND WARRANTIES",
                  paragraphs: [
                    "The Borrower hereby makes the following representations and warranties to the Lender, which shall be deemed to be continuing and shall remain true and binding throughout the tenure of the Loan and until the discharge of all obligations under the Loan Documents:",
                  ],
                  list: [
                    {
                      term: "The Borrower hereby makes the following representations and warranties to the Lender, which shall be deemed to be continuing and shall remain true and binding throughout the tenure of the Loan and until the discharge of all obligations under the Loan Documents:",
                      sublist: [
                        "The Loan Documents executed and obligations undertaken by the Borrower are valid, binding, and enforceable in accordance with their terms and do not contravene any applicable laws, regulations, or existing contractual obligations of the Borrower.",
                        {
                          term: "The execution, delivery, and performance of the Loan Documents by the Borrower do not and will not:",
                          sublist: [
                            "violate any applicable law, regulation, or judicial or governmental order;",
                            "result in a breach or constitute a default under any agreement or instrument to which the Borrower is a party or by which the Borrower or its assets are bound;",
                            "cause the creation or imposition of any encumbrance on the Borrower’s assets, except as permitted under the Loan Documents;",
                            "Contravene any provision of the Borrower’s constitutional or governing documents (where applicable).",
                          ],
                        },
                        "There are no actions, suits, proceedings, or investigations pending or, to the Borrower’s knowledge, threatened against the Borrower before any court, tribunal, or governmental authority that could materially affect the Borrower’s financial position, the enforceability of the Loan Documents, or the Borrower’s ability to perform its obligations thereunder.",
                        "Notwithstanding the Repayment Schedule or Loan Tenure, the Lender shall be entitled to demand immediate repayment of the Loan and all Outstanding Balances at any time. Upon such demand, the Borrower shall make immediate payment, and the Lender may adjust any monies lying in any account of the Borrower with the Lender or its branches towards such outstanding dues.",
                        {
                          term: "Repayment Instruments and Mandates:",
                          sublist: [
                            "The Borrower has issued Repayment Instruments with full knowledge that dishonour of the same constitutes an offence under the Negotiable Instruments Act, 1881, and/or the Payment and Settlement Systems Act, 2007, as applicable.",
                            "No notice shall be required for the presentation of such instruments.",
                            "The Borrower may authorize payment via direct debit, NACH/ECS, or similar mandates from an Approved Bank account.",
                          ],
                        },
                        "Where the Borrower’s employer is registered for DAS, repayment shall be made through salary deduction. Upon cessation of employment, the Borrower shall promptly provide an alternate Repayment Instrument from an Approved Bank where the Borrower holds a new salary account.",
                        "The Borrower shall at all times comply with all applicable laws in India, including but not limited to the Prevention of Money Laundering Act, 2002.",
                        "The Borrower is competent to contract and has taken all necessary steps and obtained requisite authorizations to enter into and perform the Loan Documents.",
                        "All information, financial or otherwise, provided by the Borrower is true, complete, and not misleading in any material respect as of the date provided and remains valid unless updated or withdrawn in writing.",
                        "The Borrower is not insolvent, bankrupt, in receivership, or under liquidation and has not taken any steps toward such proceedings.",
                        "The Borrower confirms that they fully understand the English language and agrees that all communication from the Lender in English shall be binding.",
                        "The Borrower has obtained all applicable statutory approvals and consents necessary to execute the Loan Documents and perform obligations thereunder.",
                        "The Borrower confirms that he/she is gainfully employed at the time of execution of the Loan Documents, is not under notice or intending to resign. In case of resignation, termination, or change in employment, the Borrower shall promptly notify the Lender.",
                        "The Borrower has duly filed all required tax returns and paid all applicable taxes, including stamp duty on Loan Documents, except where disputes are pending in good faith and proper reserves have been made.",
                      ],
                    },
                    {
                      term: "Creditworthiness and Non-Default",
                      paragraphs: [
                        "The Borrower affirms that they:are not identified as a willful defaulter,are not listed on the Reserve Bank of India’s caution lists or defaulters' databases and are not involved in any activities or investigations concerning terrorism, anti-national behavior, or enforcement proceedings by any statutory authority.",
                      ],
                    },
                    {
                      term: "Undertaking on Lender Policies",
                      paragraphs: [
                        "The Borrower undertakes to keep themselves updated with the Lender's policies and terms from time to time and agrees to abide by the same.",
                      ],
                    },
                    {
                      term: "Regular Payments",
                      paragraphs: [
                        "The Borrower warrants timely and regular payments to the Lender as per the terms of the Loan Documents.",
                      ],
                    },
                    {
                      term: "Authority of Signatories (If Applicable)",
                      paragraphs: [
                        "Where the Borrower is an entity (proprietorship, partnership, LLP, or company), all signatories to the Loan Documents are duly authorized to execute the same on behalf of the Borrower.",
                      ],
                    },
                  ],
                },
                {
                  title: "EVENTS OF DEFAULT",
                  list: [
                    {
                      term: "An event of default (“Event of Default”) shall be deemed to have occurred under the Loan Documents, if:",
                      sublist: [
                        "The Borrower commits a breach or fails or neglects to perform, keep or observe any of the conditions set forth in any of the Loan Documents;",
                        "Any covenant, representation and/or warranty of the Borrower is found/ proved to be incomplete, false, or incorrect.",
                        "If the Borrower fails to deliver Repayment Instrument for the Instalments and / or bullet payment(s).",
                        "Any Repayment Instrument issued by the Borrower in favor of the Lender is dishonored by the Borrower’s bank.",
                        "The Borrower fail/s to pay the Instalments and / or bullet payment(s) or any other payment comprised in the Outstanding Balance on the Scheduled Due Dates.",
                        "Any information supplied by the Borrower in the Application Form, or any other Loan Document is found to be materially untrue, false, misleading, or incorrect.",
                        "The Borrower has admitted to any Person in writing that the Borrower is unable to pay his/her debts and / or that the Borrower is willing to be adjudged bankrupt.",
                        "If the Borrower commit any act of bankruptcy or makes assignment for the benefit of creditors or consents to the appointment of a trustee or receiver in respect of its properties / assets or insolvency proceedings, whether voluntary or otherwise, are instituted against the Borrower:",
                        "The receiver is appointed in respect of the assets or properties of the Borrower.",
                        "The Borrower, being an individual, has an insolvency notice served on him or is declared insane or is convicted of any offence.",
                        "Any of the Repayment Instrument delivered or to be delivered by the Borrower to the Lender in accordance hereof, are not encashed / acted upon or dishonored for any reason whatsoever, on presentation being made by the Lender.",
                        "Any instruction is given by the Borrower to stop payment on any of the Repayment Instrument.",
                        "If the Borrower fail/s to create Security Interest in accordance with Article 4.",
                        "If the Borrower commits a default under any other agreement executed with the Lender or any of its affiliates or group companies.",
                        "If any other event has occurred which in the opinion of the Lender jeopardizes its interest or would make it difficult for the Lender to recover the Loan or the Outstanding Balance if timely action is not taken.",
                        "The occurrence of any event which, in the opinion of the Lender, may jeopardize the Borrower’s ability to pay the Lender’s dues.",
                      ],
                    },
                  ],
                },
                {
                  title: "ARTICLE 9: ASSIGNMENT & DELEGATION",
                  list: [
                    "The Borrower shall not assign, transfer, or otherwise dispose of, whether in whole or in part, the Loan or any of its rights or obligations under the Loan Documents to any third party without the prior written consent of the Lender.",
                    "The Borrower expressly agrees and acknowledges that the Lender shall have the absolute and unfettered right, at its sole discretion, to sell, assign, transfer or otherwise dispose of, whether in whole or in part, its rights, title, and interest in the Loan, the Outstanding Balance, or any part thereof, to any third party, on such terms and in such manner as the Lender may deem fit, without the requirement of any notice to or consent of the Borrower.",
                    {
                      term: "The Borrower further acknowledges and agrees that, without prejudice to the Lender’s right to perform any obligations or functions under the Loan Documents directly, the Lender shall be entitled to appoint one or more third parties, including but not limited to service providers, agents, or collection agencies (collectively referred to as “Service Providers”), and to delegate to such parties any of the Lender’s functions, rights, or obligations under the Loan Documents, including without limitation:",
                      sublist: [
                        "Collection of all or any portion of the Instalments and/or Outstanding Balance;",
                        "Communication with the Borrower including issuance of demand notices or payment reminders;",
                        "Visiting the Borrower’s residence, office, or place of business, or otherwise contacting the Borrower for collection purposes;",
                        "Issuing valid receipts, acknowledgments, or discharges on behalf of the Lender in respect of any payments received from the Borrower;",
                        "Performing any other lawful acts or functions as may be delegated by the Lender in connection with the administration, monitoring, or enforcement of the Loan.",
                      ],
                    },
                    "The Borrower agrees that any such delegation by the Lender shall be binding upon the Borrower and that all acts done or performed by such Service Providers shall be deemed to have been done or performed by the Lender itself.",
                  ],
                },
                {
                  title: "COMPLIANCE WITH THE REGULATIONS",
                  list: [
                    "The Borrower and the Lender agree to comply jointly and severally with all applicable laws and regulations from time to time in force including any amendments, modification or change thereof which may be attracted and the Borrower shall indemnify the Lender in respect of any loss, claim or expense to the Lender as a result of non-compliance with any such laws and regulations by the Borrower",
                    "The amount of Instalments and / or bullet payment(s) shall be increased by incremental taxes, whether sales, excise, security tax or interest tax and other related taxes now levied on this transaction or hereafter to be levied.",
                  ],
                },
                {
                  title: "FURTHER ASSURANCES",
                  list: [
                    "The Borrower shall pay all costs and other expenses incurred by the Lender in enforcing the Loan Documents and/or for recovery of the Loan / Outstanding Balance",
                    "The Borrower undertake/s to indemnify and keep the Lender indemnified in respect of any cost, loss or liability incurred by the Lender as a result of: (a) the occurrence of any Event of Default; (b) Any information supplied by the Borrower in the Application Form or any other Loan Document is found to be materially untrue, false, misleading or incorrect; (c) failure by the Borrower to pay any amount due under the Loan Documents on its Scheduled Due Date; (d) the Borrower failing to comply with the provisions of any applicable laws; and / or (e) breach of any representation, warranty, covenant or undertaking of the Borrower under the terms of the this Agreement or any of the other Loan Documents.",
                    "In addition to the obligations and documents which the Lender expressly require the Borrower to execute, deliver and perform, the Borrower hereby agree to execute, deliver, and perform, such further acts or documents which the Lender may reasonably require, from time to time, to effectuate the purposes of these Terms and Conditions or any of the other Loan Documents.",
                  ],
                },
                {
                  title: "NOTICE / AUTHORISATION",
                  list: [
                    "Any notice / letter / other communication sent by the Lender to the Borrower shall be sent at the latest address of the Borrower available in the records of the Lender and in English language (which the Borrower acknowledges and accepts) and the same shall be deemed to have been delivered on expiry of 48 hours after it has been sent by registered post / courier / other modes of delivery. Any notice to be sent to the Lender by the Borrower shall be sent by pre-paid Registered A.D. at its registered office or at such other address as may be intimated by the Lender to the Borrower. The Borrower shall immediately intimate the Lender of any change in its office / residential address Borrower.",
                    "The Borrower hereby authorize the Lender to contact the Borrower in relation to provision of information about new products of the Lender, offers, promotions and also for the purpose of receiving feedback or conducting surveys and hereby expressly agree to exempt such actions for the purpose of ‘Do Not Call / Disturb’ guidelines issued by the Telecom Regulatory and Development Authority or any other authority.",
                  ],
                },
                {
                  title: "CONSENT TO DISCLOSURE",
                  list: [
                    {
                      term: "The Borrower understands and acknowledges that, as a pre-condition for the grant of the Loan by the Lender, the Lender requires the Borrower’s express consent for the disclosure and use of certain information and data pertaining to the Borrower. Accordingly, the Borrower hereby unconditionally consents and agrees to the disclosure and furnishing by the Lender, to such parties and in such manner as the Lender may deem fit or as may be authorized by the Reserve Bank of India (RBI), of the following:",
                      sublist: [
                        "any personal, financial, or credit-related information and data relating to the Borrower;",
                        "information or data relating to the Loan and/or any credit facility availed or to be availed by the Borrower from the Lender;",
                        "information regarding any obligations undertaken or to be undertaken by the Borrower in relation to such credit facilities;",
                        "Information regarding any default or non-compliance by the Borrower in the discharge of any of the aforesaid obligations.",
                      ],
                    },
                    "The Borrower declares and affirms that all information and data provided by the Borrower to the Lender, whether submitted in writing or communicated orally, is true, complete, accurate, and not misleading in any respect.",
                    {
                      term: "The Borrower further agrees and acknowledges that:",
                      sublist: [
                        "the Credit Information Bureau (India) Limited (CIBIL) and/or any other credit information company or agency authorized by the RBI may use and process the said information and data disclosed by the Lender in such manner as may be deemed appropriate by them;",
                        "CIBIL and/or such other authorized agency may furnish, for consideration, the processed information or any reports, scores, or products derived therefrom to banks, financial institutions, credit grantors, or other registered users, as permitted under applicable law and regulations;",
                        "Notwithstanding anything to the contrary contained in this Agreement, the Loan Documents, or any applicable law, the Borrower agrees that in the event of default in repayment of the Loan, any instalment thereof, or any part of the Outstanding Balance on the Scheduled Due Date(s), the Lender and/or the Reserve Bank of India shall have an unqualified right to disclose, report, or publish the name of the Borrower as a “defaulter” in such manner and through such media as they may, in their sole discretion, deem appropriate.",
                      ],
                    },
                  ],
                },
                {
                  title: "MISCELLANEOUS",
                  list: [
                    {
                      term: "Interpretation",
                      definition:
                        "Unless the subject or context otherwise requires or unless otherwise stated, in this Agreement: Unless the context otherwise requires or unless expressly stated to the contrary, in this Agreement:",
                      sublist: [
                        "References to “Articles”, “Sections”, or “Schedules” are to the Articles, Sections, and Schedules of this Agreement and shall be deemed to include all amendments and modifications thereto",
                        "References to any law, statute, regulation, or provision thereof shall include such law, statute, regulation, or provision as amended, re-enacted, substituted, or supplemented from time to time.",
                        "The headings and titles used in this Agreement are for reference and convenience only and shall not affect the construction or interpretation of any provision of this Agreement.",
                        "Words denoting the singular shall include the plural and vice versa, as the context may require.",
                        "References to any gender shall include all genders—male, female, and neuter—as the context may require.",
                        "The Sanction Letter cum Key Fact Statement (KFS), all Schedules, and the Recitals form an integral and binding part of this Agreement and shall be read in conjunction with the provisions hereof.",
                        "In the event any payment under this Agreement becomes due on a day which is not a Business Day, such payment shall be made on the next succeeding Business Day. Notwithstanding the actual date of payment, the calculation of interest and other charges shall be made with reference to the originally scheduled due date, unless otherwise agreed by the Lender and notified in writing to the Borrower.",
                      ],
                    },
                    {
                      term: "Effective Date of Terms",
                      definition:
                        "These Terms and Conditions shall become binding on the Borrower and the Lender on and from the date of execution hereof. These Terms and Conditions shall be in force till all the monies due and payable to the Lender under the Loan Documents as well as all other agreement(s), document(s) that may be subsisting / executed between the Borrower and the Lender are fully paid to the satisfaction of the Lender.",
                    },
                    {
                      term: "Representatives and Assigns",
                      definition:
                        "The Borrower, his/her/its/their heirs, legal representatives, executors, administrators, successors, permitted assigns, partner(s) for the time being, including the legal representatives of the deceased partner(s), if any) shall be bound by all the covenants of these Terms and Conditions.",
                    },
                    {
                      term: "Non-Waiver",
                      definition:
                        "Any omission or delay on the part of the Lender, in exercising any of rights, powers or remedy accruing to the Lender, upon failure by the Borrower in the due and punctual fulfilment of the obligations of the Borrower hereunder, shall not be deemed to constitute a waiver by the Lender of any of its rights to require such due and punctual performance by the Borrower.",
                    },
                    {
                      term: "Governing Law and Jurisdiction",
                      definition:
                        "These Terms and Conditions shall be construed and governed in all respects, including validity, interpretation, and effect in accordance with the laws of India. All disputes arising out of these Terms and Conditions shall be subject to the exclusive jurisdiction of the courts or tribunals at - Maharashtra, India.",
                    },
                    {
                      term: "Dispute Resolution",
                      definition:
                        "Any question, dispute or claim arising out of or in connection with these Terms and Conditions or the other Loan Documents including any question on its existence, validity or termination shall be referred to and finally adjudicated through arbitration by a sole arbitrator and in accordance with the Arbitration and Conciliation Act, 1996. The sole arbitrator will be appointed by the Lender. The venue for such arbitration shall be Maharashtra, India. The arbitration award given by the sole arbitrator appointed as aforesaid shall be final and binding on all the parties in connection with any question of facts or law arising in the course of arbitration or with respect to any award made. Further, the present clause shall survive the termination of these Terms and Conditions and the other Loan Documents. The Courts at Maharashtra, India shall have exclusive jurisdiction (subject to the arbitration proceedings which are to be also conducted in Maharashtra, India) over any or all disputes arising out of this Agreement and the other Loan Documents. The present clause along with the clause for payment of Interest and other Outstanding Balance by the Borrower shall survive the termination of this Agreement and the other Loan Documents.",
                    },
                    {
                      term: "Confidentiality",
                      definition:
                        "The Lender shall exercise reasonable care and diligence while handling any confidential information pertaining to the Borrower. However, the Borrower hereby acknowledges and agrees that the Lender shall be entitled to disclose, without any further notice or reference to the Borrower, any information or documentation relating to the Borrower, the Loan, or any of the transactions contemplated under the Loan Documents, in the following circumstances:",
                      sublist: [
                        "to the Lender’s affiliates, group companies, or subsidiaries;",
                        "to any actual or prospective transferees, assignees, or purchasers of any rights, obligations or interests in the Loan and/or the Outstanding Balance;",
                        "to any regulatory, governmental, judicial, statutory, or quasi-judicial authority, including but not limited to disclosures made in compliance with any law, rule, regulation, directive, order, notification or instruction issued by the Reserve Bank of India or any other governmental authority;",
                        "in connection with the exercise of the Lender’s rights, remedies, powers, or obligations under the Loan Documents;",
                        "to the Lender’s employees, directors, officers, advisors, agents, consultants, service providers and/or subcontractors, on a need-to-know basis, for the purpose of fulfilling the Lender’s obligations under the Loan Documents, or for evaluating or pursuing any business relationship with the Borrower;",
                        {
                          term: "to any credit information bureau, credit rating agency, data repository, or other service providers or agencies engaged by the Lender.In addition to the above, the Lender shall have the right to disclose, without prior notice to the Borrower, all or any information or documentation, including but not limited to:",
                          sublist: [
                            "personal and financial information and data relating to the Borrower;",
                            "details of any credit facility availed or proposed to be availed by the Borrower from the Lender;",
                            "any default or delay in repayment, or any other non-compliance with the terms of the Loan Documents;",
                          ],
                          paragraphs: [
                            "to any governmental, taxation, regulatory or judicial authority or agency, including but not limited to the Income Tax Department, Credit Rating Agencies, Credit Information Companies (CICs), or any other authority, body, or department, for the purpose of compliance, regulatory reporting, or protection of the Lender’s interests. The Borrower expressly waives any right to privacy, confidentiality, or non-disclosure with respect to the disclosures set out herein and further waives any right to initiate legal proceedings for defamation, breach of confidentiality, or any related claim in respect of such disclosures made in accordance with this Clause.",
                          ],
                        },
                      ],
                    },

                    {
                      term: "Costs and Expenses",
                      definition:
                        "The Borrower shall forthwith on demand being made, pay to the Lender, on a full indemnity basis, all costs and expenses (including legal costs) incurred and/or to be incurred by the Lender and / or Service Provider for the enforcement of these Terms and Conditions, the other Loan Documents and realization/recovery of the amount of the Outstanding Balance from the Borrower, if any.",
                    },
                    {
                      term: "Amendments",
                      definition:
                        "These Terms and Conditions may be amended by the Lender at any time. Any such amendment shall take effect only prospectively i.e., after the amendment of the Terms and Conditions. However, the Lender shall upon such variation or amendment being made, inform the Borrower in respect of any variation or amendment in the Terms and Conditions and/or other charges as are applicable to the Loan.",
                    },
                  ],
                },
              ],
            },
          ],
          scheduleA: {
            title: "SCHEDULE A",
            subtitle: "AGREEMENT PARTICULARS",
            headers: {
              sno: "S.NO.",
              particular: "PARTICULAR",
              details: "DETAILS",
            },
            rows: [
              {
                sno: "1.",
                particular: "Date of Execution",
                details: disbursementDate.format("DD-MM-YYYY"),
              },
              {
                sno: "2.",
                particular: "Place of Execution",
                details: user.userDetails.state || "India",
              },
              {
                sno: "3.",
                particular: "Name of the Lender",
                details: lenderName,
              },
              {
                sno: "4",
                particular: "Name of the Service Provider",
                details: nameOfLendingServiceProvider,
              },
              {
                sno: "5",
                particular: "Name of the DLA",
                details: nameOfDigitalLendingApplication,
              },
              {
                sno: "6",
                particular: "Name of the Borrower",
                details: userName,
              },
              {
                sno: "7",
                particular: "Address of the Borrower",
                details: user.userDetails.address,
              },
              {
                sno: "8",
                particular: "Reference number of Sanction Letter cum KFS",
                details: loan.formattedLoanId,
              },
              {
                sno: "9",
                particular: "Date of Execution of Sanction Letter cum KFS",
                details: disbursementDate.format("DD-MM-YYYY"),
              },
              {
                sno: "10",
                particular: "Bank Account Details",
                details: "As per registered bank account",
              },
              {
                sno: "11",
                particular: "Sanctioned Loan Amount",
                details: `INR ${loan.amount}`,
              },
            ],
          },
          finalCharges: {
            rows: [
              {
                sno: "12",
                particular: "Interest Rate",
                details: `Interest on the Loan: ${loan.repayment?.feeBreakdowns[0]?.chargeValue || 0}% from the date of disbursal until the date of repayment. In the event of failure to make payment on due date, a penal interest of ${loan.penalties[0]?.chargeValue || 0}% shall be applicable from the due date until the date of payment.`,
              },
              {
                sno: "13",
                particular: "Processing Fee",
                details: `The lender will charge a processing fee of INR ${
                  tax.taxes[0]?.isInclusive
                    ? processingFeeAmountWithTaxes.toFixed(2)
                    : processingFeeAmountWithoutTaxes.toFixed(2)
                } ( 
                  ${tax.chargeValue || 0} ${
                    tax.calculationValueType === "percentage" ? "%" : ""
                  }  ${tax.taxes[0]?.isInclusive ? "inclusive" : "exclusive"} of ${tax.taxes[0]?.type || ""}
                  ).`,
              },
              {
                sno: "14",
                particular: "Late Fee",
                details:
                  "In case of delay in payment of Amount Due, Lender shall charge late payment charges of double of Interest rates.",
              },
              {
                sno: "15",
                particular: "Maximum Interest Rate",
                details: `The Interest rate on the Loan shall not exceed ${((loan.repayment?.feeBreakdowns[0]?.chargeValue || 0) * 30).toFixed(2)}% per Month.`,
              },
              {
                sno: "16",
                particular: "Cooling Period",
                details: "3 days",
              },
            ],
          },
          finalAcceptance: {
            waiverClause:
              "The Lender, may at its sole discretion, waive or reduce the charges as mentioned above, on a case-to-case basis.",
            acceptanceStatementTitle: "IN WITNESS WHEREOF",
            acceptanceStatementBody:
              "the Borrower hereby accepts the terms and conditions this Agreement.<br />I/we, the Borrower acknowledge that I/we are well versed in and fully understand English language, a copy of the Loan Documents has been furnished to me/us in English language, as specially requested by me/us and that I/we have read and have understood the contents of the Loan Documents and hereby agree, accept, and undertake to abide by the same",
            signatureLine: "",
            signatureSymbol: "",
            signedByText: "",
          },
        },
        "loan-agreement_v2",
        platform_type.PARTNER,
        user.brandId,
        userId,
      );
    }

    const loanAgreement = await this.prisma.loanAgreement.findUnique({
      where: { loanId: loan.id },
      select: { id: true },
    });

    if (!loanAgreement) {
      throw new HttpException("Loan agreement not found", HttpStatus.NOT_FOUND);
    }
    await this.prisma.unsigned_data_agreement.create({
      data: {
        loan_aggreement_id: loanAgreement.id,
        unsigned_data: generatePdfBase64,
      },
    });

    return generatePdfBase64;
  }

  async resetAgreementStatus(loanAgreementId: string) {
    try {
      if (!loanAgreementId) {
        throw new Error("Loan Agreement ID is required");
      }

      const loanAgreement = await this.prisma.loanAgreement.findUnique({
        where: { id: loanAgreementId },
        include: {
          references: true,
          loan: {
            select: {
              id: true,
              formattedLoanId: true,
              status: true,
            },
          },
        },
      });

      if (!loanAgreement) {
        throw new NotFoundException(
          `Loan agreement with ID ${loanAgreementId} not found`,
        );
      }

      // Check if loan is in correct status for resetting agreement
      if (
        loanAgreement.loan.status !==
          loan_status_enum.SANCTION_MANAGER_APPROVED &&
        loanAgreement.loan.status !== loan_status_enum.APPROVED
      ) {
        throw new Error(
          "Agreement can only be reset for SANCTION_MANAGER_APPROVED or APPROVED loans",
        );
      }

      // Reset agreement status to NOT_SENT
      const transactions: any[] = [
        this.prisma.loanAgreement.update({
          where: { id: loanAgreementId },
          data: {
            status: agreement_status_enum.NOT_SENT,
            signedByUser: false,
            signedFilePrivateKey: null,
          },
        }),
      ];

      if (loanAgreementId) {
        transactions.push(
          this.prisma.loanAgreementReference.updateMany({
            where: { loanAgreementId },
            data: {
              is_active: false,
              is_disabled: true,
            },
          }),
        );
      }

      await this.prisma.$transaction(transactions);

      // this.logger.log(
      //   `Agreement status reset to NOT_SENT for loan agreement ID: ${loanAgreementId}`
      // );

      return {
        message: "Agreement status reset to NOT_SENT successfully",
        loanAgreementId,
        loanId: loanAgreement.loan.id,
        formattedLoanId: loanAgreement.loan.formattedLoanId,
      };
    } catch (error) {
      this.logger.error("Error resetting agreement status", error);
      throw error;
    }
  }
  // get esigned document
  async getESignedDocument(loanId: string) {
    const loanAgreement = await this.prisma.loanAgreement.findFirst({
      where: {
        loanId: loanId,
        status: agreement_status_enum.SIGNED,
      },
      include: {
        references: {
          where: {
            sentAt: { not: null },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    if (!loanAgreement) {
      throw new NotFoundException("Loan agreement not found");
    }

    if (!loanAgreement.references || loanAgreement.references.length === 0) {
      throw new NotFoundException("E-signature not completed yet");
    }

    const reference = loanAgreement.references[0];
    let signedDocument: Uint8Array | null = null;

    if (reference.provider === "SIGNDESK") {
      const signDeskEntry = await this.prisma.signDeskSomeTable.findFirst({
        where: {
          loanAgreementsId: loanAgreement.id,
          loanAgreementReferenceId: reference.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!signDeskEntry?.pdfBlob) {
        throw new NotFoundException("Signed document not found");
      }
      signedDocument = signDeskEntry.pdfBlob;
    } else if (reference.provider === "SIGNZY") {
      const signzyEntry = await this.prisma.signzy_some_table.findFirst({
        where: {
          loanAgreementId: loanAgreement.id,
          loanAgreementReferenceId: reference.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!signzyEntry?.pdfBlob) {
        throw new NotFoundException("Signed document not found");
      }
      signedDocument = signzyEntry.pdfBlob;
    } else if (reference.provider === "DIGITAP") {
      const digitapEntry = await this.prisma.digitap_esign_some_table.findFirst(
        {
          where: {
            loanAgreementId: loanAgreement.id,
            loanAgreementReferenceId: reference.id,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      );

      if (!digitapEntry?.pdfBlob) {
        throw new NotFoundException("Signed document not found");
      }
      signedDocument = digitapEntry.pdfBlob;
    } else {
      throw new NotFoundException(
        `Unsupported e-sign provider: ${reference.provider}`,
      );
    }

    return {
      loanAgreementId: loanAgreement.id,
      referenceId: reference.id,
      provider: reference.provider,
      signedAt: reference.signedAt,
      document: signedDocument,
    };
  }

  async sendDocumentForApprovedLoan(loanId: string, provider?: "SIGNZY") {
    try {
      const loan = await this.prisma.loan.findUnique({
        where: { id: loanId },
        include: {
          agreement: true,
          user: { select: { id: true } },
        },
      });

      if (!loan) {
        throw new NotFoundException("Loan not found");
      }

      if (
        loan.status !== loan_status_enum.APPROVED &&
        loan.status !== loan_status_enum.SANCTION_MANAGER_APPROVED
      ) {
        throw new HttpException(
          `Loan must be approved first. Current status: ${loan.status}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (loan.agreement.status === agreement_status_enum.SIGNED) {
        throw new HttpException("Document already signed", HttpStatus.CONFLICT);
      }

      await this.sendDocumentForSigning(
        loan.user.id,
        loan.agreement.id,
        provider || "SIGNZY",
      );

      // Fetch workflowUrl - don't throw error if query fails
      let workflowUrl = null;
      try {
        const signzyRecord = await this.prisma.signzy_some_table.findFirst({
          where: { loanAgreementId: loan.agreement.id },
          orderBy: { createdAt: "desc" },
          select: { workflowUrl: true },
        });
        workflowUrl = signzyRecord?.workflowUrl || null;
      } catch (dbError) {
        this.logger.error("Failed to fetch workflowUrl from database", dbError);
      }

      return {
        success: true,
        loanId: loan.id,
        loanStatus: loan.status,
        agreementStatus: "SENT",
        workflowUrl,
        message: "E-sign sent for signing successfully",
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to send document for signing: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
