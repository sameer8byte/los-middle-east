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
import {
  DigitapEsignConfig,
  DigitapGenerateEsignRequest,
  DigitapGenerateEsignResponse,
  DigitapEsignStatusResponse,
  DigitapGetEsignDocRequest,
} from "./interface/digitap.esign.interface";
import { PrismaService } from "src/prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { EmailService } from "src/core/communication/services/email.service";
import { PdfService } from "src/core/pdf/pdf.service"; // Add this import
import { digitap_esign_some_table } from "@prisma/client";

@Injectable()
export class DigitapEsignService {
  private readonly logger = new Logger(DigitapEsignService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    @Inject("DIGITAP_CONFIG") private readonly config: DigitapEsignConfig,
    private readonly pdfService: PdfService // Add this dependency
  ) {}

  private getHeaders() {
    if (!this.config.authKey) {
      throw new HttpException(
        "Digitap authorization key not configured.",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
    return {
      Authorization: this.config.authKey,
      "Content-Type": "application/json",
    };
  }

  private handleAxiosError(error: unknown, defaultMsg: string): never {
    if (error instanceof AxiosError) {
      const statusCode =
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      let errorMsg =
        error.response?.data?.Description ||
        error.response?.data?.error ||
        error.response?.data?.message ||
        JSON.stringify(error.response?.data) ||
        defaultMsg;

      switch (statusCode) {
        case HttpStatus.UNAUTHORIZED:
          errorMsg =
            "Authorization token not found or Invalid client id/secret.";
          break;
        case HttpStatus.BAD_REQUEST:
          errorMsg =
            "Required information is missing, request body is empty, or invalid signer details found.";
          break;
        case HttpStatus.INTERNAL_SERVER_ERROR:
          errorMsg = "Digitap internal server error.";
          break;
      }

      throw new HttpException(errorMsg, statusCode);
    }

    if (error instanceof HttpException) {
      throw error;
    }

    throw new HttpException(defaultMsg, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  async eSignRequest(
    userId: string,
    loanId: string,
    loanAgreementId: string,
    loanAgreementReferenceId: string,
    referenceId: string,
    referenceDocId: string
  ): Promise<digitap_esign_some_table> {
    try {
      // 1. Get user data
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
              city: true,
            },
          },
        },
      });

      if (!user) {
        throw new HttpException("User not found", HttpStatus.NOT_FOUND);
      }

      // 2. Get loan data (without agreement since we don't need it anymore)
      const loan = await this.prisma.loan.findUnique({
        where: { id: loanId },
        select: {
          formattedLoanId: true,
        },
      });

      if (!loan) {
        throw new HttpException("Loan not found", HttpStatus.NOT_FOUND);
      }

      // 3. Get the latest unsigned data from unsigned_data_agreement table
      const latestUnsignedData = await this.prisma.unsigned_data_agreement.findFirst({
        where: {
          loan_aggreement_id: loanAgreementId,
        },
        orderBy: {
          created_at: 'desc',
        },
        select: {
          unsigned_data: true,
        },
      });

      // 4. Get PDF buffer from S3 URL using PdfService
      const pdfData = latestUnsignedData.unsigned_data
      if(!pdfData){
        throw new HttpException("Unsigned PDF data not found", HttpStatus.NOT_FOUND);
      }
      const pdfBuffer = Buffer.from(pdfData, "base64");

      // 5. Prepare request payload for Digitap
      const signerName = `${user.userDetails.firstName} ${user.userDetails.lastName}`;
      const formattedMobile = user.phoneNumber
        .replace("+91", "")
        .replace(/\s+/g, "");

      const payload: DigitapGenerateEsignRequest = {
        uniqueId: referenceId,
        signers: [
          {
            mobile: formattedMobile,
            name: signerName,
            email: user.email,
          },
        ],
        reason: "Loan Agreement",
        templateId: "ESIG101590152",
        fileName: "sanction.pdf",
      };

      const url = `${this.config.baseUrl}/ent/v1/generate-esign`;

      // 6. Call Digitap API to get upload URL
      const { data } = await firstValueFrom(
        this.httpService.post<DigitapGenerateEsignResponse>(url, payload, {
          headers: this.getHeaders(),
        })
      );
      
      if (!data || data.code !== "200" || !data.model?.docId) {
        throw new HttpException(
          data?.error || "Failed to generate Digitap e-sign session",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      const docId = data.model.docId;
      const uploadUrl = data.model.url;
      
      if (!uploadUrl) {
        throw new HttpException(
          "No upload URL provided by Digitap",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      // 7. Upload PDF to Digitap
      try {
        await axios.put(uploadUrl, pdfBuffer, {
          headers: {
            "Content-Type": "application/pdf",
          },
          timeout: 30000,
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        });
      } catch (uploadError) {
        throw new HttpException(
          `Failed to upload document to Digitap: ${uploadError.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      
      if (!data) {
        throw new Error("No data in Digitap response");
      }
      
      const signingUrl = await this.getSigningUrl(docId, loanId);

      // 8. Store digitap record in database
   const digitap_esign_some_table =   await this.prisma.digitap_esign_some_table.create({
        data: {
          userId,
          loanId,
          loanAgreementId,
          loanAgreementReferenceId,
          documentId: docId,
          responseJson: JSON.parse(JSON.stringify(data)),
          workflowUrl: signingUrl,
        },
      });
      
      // 9. Send email notification
      await this.sendEsignEmail(user, signingUrl);
      
      return digitap_esign_some_table;
    } catch (error) {
      this.logger.error(`Error in Digitap eSignRequest for user ${userId}:`, error);
      throw this.handleAxiosError(error, "Error in Digitap eSignRequest");
    }
  }

  private async sendEsignEmail(
    user: {
      email: string;
      userDetails: {
        firstName: string;
        lastName: string;
      };
    },
    signingUrl: string
  ): Promise<void> {
    try {
      const emailContent = `
        <html>
          <body style="font-family: Arial, sans-serif; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #2c3e50;">Document Signing Required</h2>
              <p>Dear ${user.userDetails.firstName} ${user.userDetails.lastName},</p>
              <p>Your loan agreement document is ready for e-signature. Please click the button below to review and sign the document.</p>
              <div style="margin: 30px 0; text-align: center;">
                <a href="${signingUrl}" style="
                  display: inline-block;
                  background-color: #3498db;
                  color: white;
                  padding: 12px 30px;
                  text-decoration: none;
                  border-radius: 5px;
                  font-weight: bold;
                  font-size: 16px;
                ">Sign Document</a>
              </div>
              <p>If the button doesn't work, you can also copy and paste this link in your browser:</p>
              <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 3px;">
                ${signingUrl}
              </p>
              <p style="margin-top: 30px; font-size: 12px; color: #7f8c8d;">
                This link will expire in 10 minutes. Please complete the signing process before the link expires.
              </p>
            </div>
          </body>
        </html>
      `;

      await this.emailService.sendEmail({
        to: user.email,
        name: "Loan Agreement",
        subject: "Document Ready for E-Signature - Loan Agreement",
        html: emailContent,
      });
    } catch (error) {
      this.logger.error("Failed to prepare e-sign email", {
        error: error.message,
        email: user.email,
      });
    }
  }

  async getSigningUrl(docId: string, loanId: string): Promise<string> {
    try {
      if (!docId) {
        throw new HttpException(
          "Document ID is required",
          HttpStatus.BAD_REQUEST
        );
      }

      // Use Digitap's standalone URL format from documentation
      const baseUrl = "https://sdk.digitap.ai/e-sign/templateesignprocess.html";

      // Get callback URLs from config
      const frontendUrl =
        this.configService.get<string>("FRONTEND_URL") ||
        "http://localhost:3000";
      const redirectUrl = `${frontendUrl}/loan-application/esign-success`;
      const errorUrl = `${frontendUrl}/loan-application/esign-error`;

      // Build URL with proper encoding
      const signingUrl = `${baseUrl}?docId=${encodeURIComponent(docId)}&redirect_url=${encodeURIComponent(redirectUrl)}&error_url=${encodeURIComponent(errorUrl)}`;
      return signingUrl;
    } catch (error) {
      this.logger.error("Failed to generate Digitap signing URL", error);
      throw new HttpException(
        "Failed to generate Digitap signing URL",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getSignStatus(
    userId: string,
    loanId: string,
    loanAgreementsId: string,
    loanAgreementReferenceId: string
  ): Promise<DigitapEsignStatusResponse> {
    try {
      const digitapRecord =
        await this.prisma.digitap_esign_some_table.findFirst({
          where: {
            userId: userId,
            loanId: loanId,
            loanAgreementId: loanAgreementsId,
            loanAgreementReferenceId: loanAgreementReferenceId,
          },
          select: { documentId: true },
        });

      if (!digitapRecord?.documentId) {
        throw new HttpException(
          "Digitap record not found",
          HttpStatus.NOT_FOUND
        );
      }

      const docId = digitapRecord.documentId;

      const payload: DigitapGetEsignDocRequest = { docId };
      const url = `${this.config.baseUrl}/ent/v1/get-esign-doc`;
      const { data } = await firstValueFrom(
        this.httpService.post<DigitapEsignStatusResponse>(url, payload, {
          headers: this.getHeaders(),
        })
      );

      if (!data || data.code !== "200") {
        throw new HttpException(
          data?.error || "Failed to fetch document status",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      
      return data;
    } catch (error) {
      this.logger.error(`Error in fetching Digitap sign status for user ${userId}:`, error);
      throw this.handleAxiosError(
        error,
        "Error in fetching Digitap sign status"
      );
    }
  }
}