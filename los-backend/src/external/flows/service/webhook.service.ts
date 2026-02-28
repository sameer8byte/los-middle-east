import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { AwsPublicS3Service } from "../../../core/aws/s3/aws-public-s3.service";
import { DigiLocker20Service } from "../../digiLocker2.0/digiLocker2.0.service";
import { LoanApplicationService } from "./loan-application.service";
import { WhatsAppTemplateService } from "./whatsapp-template.service";
import { GeoCodingService } from "../../geocoding/geocoding.service";
import { AwsAuditLogsSqsService } from "../../../core/aws/sqs/aws-audit-logs-sqs.service";
import axios from "axios";

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly awsS3Service: AwsPublicS3Service,
    private readonly digiLockerService: DigiLocker20Service,
    private readonly loanApplicationService: LoanApplicationService,
    private readonly whatsappTemplateService: WhatsAppTemplateService,
    private readonly geoCodingService: GeoCodingService,
    private readonly awsAuditLogsSqsService: AwsAuditLogsSqsService,
  ) {}

  async processWebhook(body: any): Promise<void> {
    try {
      const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

      if (message?.type === "text") {
        await this.handleTextMessage(message.from, message.text.body);
      }

      if (message?.type === "image") {
        await this.handleImageMessage(message.from, message.image);
      }

      if (
        message?.type === "button" &&
        message.button?.payload === "AADHAAR_DONE"
      ) {
        await this.handleAadhaarDoneButton(message.from);
      }

      if (
        message?.type === "button" &&
        message.button?.payload === "AA_CONSENT_DONE"
      ) {
        await this.handleAAConsentDoneButton(message.from);
      }

      if (message?.type === "document") {
        await this.handleDocumentMessage(message.from, message.document);
      }

      if (message?.type === "location") {
        await this.handleLocationMessage(message.from, message.location);
      }
    } catch (error) {
      this.logger.error("Error processing webhook:", error);
    }
  }

  private async handleImageMessage(
    whatsappNumber: string,
    imageData: any,
  ): Promise<void> {
    try {
      const phoneNumber = whatsappNumber.startsWith("+")
        ? whatsappNumber
        : `+${whatsappNumber}`;

      const user = await this.prisma.user.findFirst({
        where: { phoneNumber, isPhoneVerified: true },
        orderBy: { phoneVerifiedAt: "desc" },
      });

      if (!user) return;

      const response = await axios.get(imageData.url, {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        },
        responseType: "arraybuffer",
        timeout: 30000,
      });

      const file = {
        buffer: Buffer.from(response.data),
        originalname: `whatsapp_image_${Date.now()}.jpg`,
        mimetype: imageData.mime_type || "image/jpeg",
      } as Express.Multer.File;

      const s3Url = await this.awsS3Service.uploadPublicFile(
        file,
        user.brandId,
        user.id,
        "user_profile",
      );

      await this.prisma.userDetails.upsert({
        where: { userId: user.id },
        update: { profilePicUrl: s3Url },
        create: { userId: user.id, profilePicUrl: s3Url },
      });

      await this.prisma.user.update({
        where: { id: user.id },
        data: { onboardingStep: 7 },
      });

      // Track onboarding step 7
      try {
        await this.prisma.onboardingJourney.upsert({
          where: {
            userId_stepNumber: {
              userId: user.id,
              stepNumber: 7,
            },
          },
          update: { updatedAt: new Date() },
          create: {
            userId: user.id,
            stepNumber: 7,
            brandId: user.brandId,
            reason: 'Profile image uploaded via WhatsApp',
          },
        });
      } catch (error) {
        this.logger.warn(`Failed to track step 7: ${error.message}`);
      }

      if (this.awsAuditLogsSqsService) {
        await this.awsAuditLogsSqsService.sendToAuditLogsQueue({
          userId: user.id,
          brandId: user.brandId,
          message: "User uploaded profile image via WhatsApp",
          type: "ProfileImage",
          platformType: "WHATSAPP",
          context: { step: "IMAGE_UPLOAD" },
        });
      }

      const aadhaarLink = await this.generateAadhaarVerificationLink(
        user.id,
        user.brandId,
      );
      await this.whatsappTemplateService.sendAadhaarTemplate(
        phoneNumber,
        aadhaarLink,
      );
    } catch (error) {
      this.logger.error(`Error handling image: ${error.message}`);
    }
  }

  async generateAadhaarVerificationLink(
    userId: string,
    brandId: string,
  ): Promise<string> {
    const isSkipRedirection = true; // Set to true if you want to request callback after image upload

    const result = await this.digiLockerService.generateUrlWithFallback({
      userId,
      brandId,
      isSkipRedirection,
    });
    return result.url;
  }

  async getVerifiedUser(phoneNumber: string) {
    return this.prisma.user.findFirst({
      where: { phoneNumber, isPhoneVerified: true },
      orderBy: { phoneVerifiedAt: "desc" },
    });
  }

  private async handleTextMessage(
    whatsappNumber: string,
    text: string,
  ): Promise<void> {
    try {
      const phoneNumber = whatsappNumber.startsWith("+")
        ? whatsappNumber
        : `+${whatsappNumber}`;

      const user = await this.prisma.user.findFirst({
        where: { phoneNumber, isPhoneVerified: true },
        orderBy: { phoneVerifiedAt: "desc" },
      });

      if (!user) {
        this.logger.log(`Text message from unverified user: ${phoneNumber}`);
        return;
      }

      const step = user.onboardingStep || 1;

      if (step <= 4) {
        const flowToken = `INITIAL_${Date.now()}`;
        await this.whatsappTemplateService.sendLoanJourneyTemplate(
          phoneNumber,
          flowToken,
        );
      } else if (step === 5) {
        await this.whatsappTemplateService.sendBankAccountTemplate(phoneNumber);
      } else if (step === 6) {
        await this.requestUserLocation(phoneNumber);
      } else if (step === 7) {
        await this.whatsappTemplateService.sendImageTemplate(phoneNumber);
      } else if (step === 8) {
        const aadhaarLink = await this.generateAadhaarVerificationLink(
          user.id,
          user.brandId,
        );
        await this.whatsappTemplateService.sendAadhaarTemplate(
          phoneNumber,
          aadhaarLink,
        );
      } else if (step === 9) {
        const flowToken = `LOAN_APP_${Date.now()}`;
        await this.whatsappTemplateService.sendLoanApplicationTemplate(
          phoneNumber,
          flowToken,
        );
      } else if (step === 12) {
        const flowToken = `LOAN_APP_${Date.now()}`;
        await this.whatsappTemplateService.sendLoanApplicationTemplate(
          phoneNumber,
          flowToken,
        );
      }
    } catch (error) {
      this.logger.error(`Error handling text message: ${error.message}`);
    }
  }

  private async handleAadhaarDoneButton(whatsappNumber: string): Promise<void> {
    try {
      const phoneNumber = whatsappNumber.startsWith("+")
        ? whatsappNumber
        : `+${whatsappNumber}`;

      const user = await this.prisma.user.findFirst({
        where: { phoneNumber, isPhoneVerified: true },
        orderBy: { phoneVerifiedAt: "desc" },
      });

      if (!user) return;

      // Try manual sync to fetch latest Aadhaar status
      try {
        const syncResult = await this.digiLockerService.handleDigitapManualSync(
          user.id,
          user.brandId,
        );

        if (syncResult.success) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: { onboardingStep: 8 },
          });

          // Track onboarding step 8
          try {
            await this.prisma.onboardingJourney.upsert({
              where: {
                userId_stepNumber: {
                  userId: user.id,
                  stepNumber: 8,
                },
              },
              update: { updatedAt: new Date() },
              create: {
                userId: user.id,
                stepNumber: 8,
                brandId: user.brandId,
                reason: 'Aadhaar verified via WhatsApp',
              },
            });
          } catch (error) {
            this.logger.warn(`Failed to track step 8: ${error.message}`);
          }

          if (this.awsAuditLogsSqsService) {
            await this.awsAuditLogsSqsService.sendToAuditLogsQueue({
              userId: user.id,
              brandId: user.brandId,
              message: "User completed Aadhaar verification via WhatsApp",
              type: "AadhaarVerification",
              platformType: "WHATSAPP",
              context: { step: "AADHAAR_VERIFICATION" },
            });
          }

          const flowToken = `LOAN_APP_${Date.now()}`;
          await this.whatsappTemplateService.sendLoanApplicationTemplate(
            phoneNumber,
            flowToken,
          );
          return;
        }
      } catch (error) {
        this.logger.warn(`Manual sync failed: ${error.message}`);
      }

      // If manual sync fails, send link again
      await this.whatsappTemplateService.sendTextMessage(
        phoneNumber,
        "Unable to fetch Aadhaar details ❌📄.\n\nYou need to verify again 🔄🔐.",
      );
      const aadhaarLink = await this.generateAadhaarVerificationLink(
        user.id,
        user.brandId,
      );
      await this.whatsappTemplateService.sendAadhaarTemplate(
        phoneNumber,
        aadhaarLink,
      );
    } catch (error) {
      this.logger.error(`Error handling Aadhaar done button: ${error.message}`);
    }
  }

  private async handleDocumentMessage(
    whatsappNumber: string,
    documentData: any,
  ): Promise<void> {
    try {
      const phoneNumber = whatsappNumber.startsWith("+")
        ? whatsappNumber
        : `+${whatsappNumber}`;

      const user = await this.prisma.user.findFirst({
        where: { phoneNumber, isPhoneVerified: true },
        orderBy: { phoneVerifiedAt: "desc" },
      });

      if (!user) return;

      const response = await axios.get(documentData.url, {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        },
        responseType: "arraybuffer",
        timeout: 30000,
      });

      const file = {
        buffer: Buffer.from(response.data),
        originalname:
          documentData.filename || `bank_statement_${Date.now()}.pdf`,
        mimetype: documentData.mime_type || "application/pdf",
      } as Express.Multer.File;

      const uploadResult = await this.awsS3Service.uploadPrivateDocument(
        file,
        user.brandId,
        user.id,
        "bank-statement",
      );

      const bankAccount = await this.prisma.userBankAccount.findFirst({
        where: { userId: user.id },
      });

      if (bankAccount) {
        // Bank statement uploaded
        await this.prisma.bankAccountStatement.create({
          data: {
            userId: user.id,
            userBankAccountId: bankAccount.id,
            filePrivateKey: uploadResult.key,
          },
        });

        await this.prisma.user.update({
          where: { id: user.id },
          data: { onboardingStep: 5 },
        });

        // Track onboarding step 5 - Bank statement
        try {
          await this.prisma.onboardingJourney.upsert({
            where: {
              userId_stepNumber: {
                userId: user.id,
                stepNumber: 5,
              },
            },
            update: { updatedAt: new Date() },
            create: {
              userId: user.id,
              stepNumber: 5,
              brandId: user.brandId,
              reason: 'Bank statement uploaded via WhatsApp',
            },
          });
        } catch (error) {
          this.logger.warn(`Failed to track step 5: ${error.message}`);
        }

        if (this.awsAuditLogsSqsService) {
          await this.awsAuditLogsSqsService.sendToAuditLogsQueue({
            userId: user.id,
            brandId: user.brandId,
            message: "User uploaded bank statement via WhatsApp",
            type: "BankStatement",
            platformType: "WHATSAPP",
            context: { step: "BANK_STATEMENT" },
          });
        }

        await this.requestUserLocation(phoneNumber);
      }
    } catch (error) {
      this.logger.error(`Error handling document: ${error.message}`);
    }
  }

  async handleLoanApplicationSubmission(
    whatsappNumber: string,
    responseJson: string,
  ): Promise<void> {
    try {
      const phoneNumber = whatsappNumber.startsWith("+")
        ? whatsappNumber
        : `+${whatsappNumber}`;
      const data = JSON.parse(responseJson);

      await this.loanApplicationService.validateAndCreateLoan({
        phoneNumber,
        loanAmount: parseFloat(data.loan_amount),
        loanPurpose: data.loan_purpose,
        repaymentDate: data.repayment_date,
      });

      await this.whatsappTemplateService.sendConfirmationTemplate(phoneNumber);
    } catch (error) {
      this.logger.error(`Error processing loan application: ${error.message}`);
      const phoneNumber = whatsappNumber.startsWith("+")
        ? whatsappNumber
        : `+${whatsappNumber}`;
      await this.sendTextMessage(phoneNumber, `❌ ${error.message}`);
      // Resend loan application template with new token
      const flowToken = `LOAN_APP_${Date.now()}`;
      await this.whatsappTemplateService.sendLoanApplicationTemplate(
        phoneNumber,
        flowToken,
      );
    }
  }

  private async sendTextMessage(
    phoneNumber: string,
    text: string,
  ): Promise<void> {
    try {
      const phoneNumberId = process.env.PHONE_NUMBER_ID;
      const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

      if (!phoneNumberId || !accessToken) return;

      await axios.post(
        `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
        {
          messaging_product: "whatsapp",
          to: phoneNumber.replace("+", ""),
          type: "text",
          text: { body: text },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );
    } catch (error) {
      this.logger.error(`Error sending text message: ${error.message}`);
    }
  }

  private async handleAAConsentDoneButton(
    whatsappNumber: string,
  ): Promise<void> {
    try {
      const phoneNumber = whatsappNumber.startsWith("+")
        ? whatsappNumber
        : `+${whatsappNumber}`;

      const user = await this.prisma.user.findFirst({
        where: { phoneNumber, isPhoneVerified: true },
        orderBy: { phoneVerifiedAt: "desc" },
      });

      if (!user) return;

      // Check latest AA consent request status
      const consentRequest = await this.prisma.aa_consent_requests.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      });

      if (consentRequest && consentRequest.consentStatus === "ACTIVE") {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { onboardingStep: 5 },
        });

        // Track onboarding step 5 - AA consent
        try {
          await this.prisma.onboardingJourney.upsert({
            where: {
              userId_stepNumber: {
                userId: user.id,
                stepNumber: 5,
              },
            },
            update: { updatedAt: new Date() },
            create: {
              userId: user.id,
              stepNumber: 5,
              brandId: user.brandId,
              reason: 'AA consent completed via WhatsApp',
            },
          });
        } catch (error) {
          this.logger.warn(`Failed to track step 5: ${error.message}`);
        }

        // Consent is active - request location before sending image template
        await this.requestUserLocation(phoneNumber);
      } else {
        // Consent not active - send bank account template
        await this.whatsappTemplateService.sendBankAccountTemplate(phoneNumber);
      }
    } catch (error) {
      this.logger.error(
        `Error handling AA consent done button: ${error.message}`,
      );
    }
  }

  private async requestUserLocation(phoneNumber: string): Promise<void> {
    try {
      const message = `For security verification purposes 🔐, we request you to please share your current location 📍.\n\nKindly tap Attach 📎 → Location 📍 → Send your current location and share it here.`;
      await this.whatsappTemplateService.sendTextMessage(phoneNumber, message);
    } catch (error) {
      this.logger.error(`Error requesting location: ${error.message}`);
    }
  }

  private async handleLocationMessage(
    whatsappNumber: string,
    locationData: any,
  ): Promise<void> {
    try {
      const phoneNumber = whatsappNumber.startsWith("+")
        ? whatsappNumber
        : `+${whatsappNumber}`;

      const user = await this.prisma.user.findFirst({
        where: { phoneNumber, isPhoneVerified: true },
        orderBy: { phoneVerifiedAt: "desc" },
      });

      if (!user) return;

      const latitude = locationData.latitude;
      const longitude = locationData.longitude;

      let addressDetails = null;
      try {
        addressDetails = await this.geoCodingService.getFullAddressDetails(
          latitude,
          longitude,
        );
      } catch (error) {
        this.logger.warn(
          `Geocoding failed for ${latitude}, ${longitude}: ${error.message}`,
        );
        // Continue without address details
      }

      await this.prisma.userGeoTag.create({
        data: {
          userId: user.id,
          latitude,
          longitude,
          address:
            addressDetails?.formattedAddress || `${latitude}, ${longitude}`,
          postalCode: addressDetails?.postalCode,
          city: addressDetails?.city,
          district: addressDetails?.district,
          state: addressDetails?.state,
          country: addressDetails?.country,
          street: addressDetails?.street,
          sublocality: addressDetails?.sublocality,
          notes: "WhatsApp: Location shared during verification",
        },
      });

      await this.prisma.user.update({
        where: { id: user.id },
        data: { onboardingStep: 6 },
      });

      // Track onboarding step 6
      try {
        await this.prisma.onboardingJourney.upsert({
          where: {
            userId_stepNumber: {
              userId: user.id,
              stepNumber: 6,
            },
          },
          update: { updatedAt: new Date() },
          create: {
            userId: user.id,
            stepNumber: 6,
            brandId: user.brandId,
            reason: 'Location shared via WhatsApp',
          },
        });
      } catch (error) {
        this.logger.warn(`Failed to track step 6: ${error.message}`);
      }

      if (this.awsAuditLogsSqsService) {
        await this.awsAuditLogsSqsService.sendToAuditLogsQueue({
          userId: user.id,
          brandId: user.brandId,
          message: "User shared location via WhatsApp",
          type: "Location",
          platformType: "WHATSAPP",
          context: { step: "LOCATION" },
        });
      }

      await this.whatsappTemplateService.sendImageTemplate(phoneNumber);
    } catch (error) {
      this.logger.error(`Error handling location: ${error.message}`);
    }
  }
}
