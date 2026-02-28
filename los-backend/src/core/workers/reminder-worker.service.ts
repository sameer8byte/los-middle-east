import { Injectable, Logger, OnModuleInit, Optional } from "@nestjs/common";
import {
  AwsReminderSqsService,
  ReminderTrackingPayload,
} from "../aws/sqs/aws-remindar-sqs.service";
import { PrismaService } from "src/prisma/prisma.service";
import {
  REMINDER_TEMPLATES_REGISTRY,
  formatMessage,
} from "./reminder-templates.constant";
import { EmailService } from "../communication/services/email.service";
import { SmsService } from "../communication/services/sms.service";
import { WhatsAppService } from "../communication/services/whatsapp.service";

@Injectable()
export class ReminderWorkerService implements OnModuleInit {
  private readonly logger = new Logger(ReminderWorkerService.name);
  private isPolling = true;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly awsReminderSqsService: AwsReminderSqsService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly whatsAppService: WhatsAppService,
  ) { }

  async onModuleInit() {
    this.startPolling();
  }

  private async startPolling() {
    this.logger.log("🚀 Reminder Worker started");

    while (this.isPolling) {
      try {
        await this.processPendingReminders();
        await this.sleep(10000);
      } catch (error) {
        this.logger.error("Worker error:", error);
        await this.sleep(30000);
      }
    }
  }

  private async processPendingReminders() {
    try {
      if (!this.awsReminderSqsService) {
        this.logger.warn(
          "⚠️ AwsReminderSqsService is not configured. SQS_REMINDER_QUEUE_URL environment variable is missing.",
        );
        return;
      }

      const messages = await this.awsReminderSqsService.pollReminderQueue(10);

      if (messages.length === 0) return;

      for (const message of messages) {
        await this.processReminderMessage(message);
      }
    } catch (error) {
      this.logger.error("Error processing messages:", error);
    }
  }

  private async processReminderMessage(message: {
    Body: string;
    ReceiptHandle: string;
  }) {
    let messageBody: ReminderTrackingPayload;
    try {
      messageBody =
        typeof message.Body === "string"
          ? JSON.parse(message.Body)
          : message.Body;
      // Process reminder
      await this.handleReminderByType(messageBody);

      // Update to SUCCESS
      await this.prisma.user_reminders.update({
        where: { id: messageBody.trackingId },
        data: {
          status: "SUCCESS",
          updated_at: new Date(),
        },
      });

      // Log success to audit table
      await this.prisma.user_reminder_audit_logs
        .create({
          data: {
            user_reminder_id: messageBody.trackingId,
            event: "PROCESSED_SUCCESS",
            metadata: {
              type: messageBody.templateCode,
              contactMethod: messageBody.channel,
            },
          },
        })
        .catch((err) => this.logger.error("Audit log error:", err));

      // Delete from queue
      await this.awsReminderSqsService?.deleteReminderMessage(
        message.ReceiptHandle,
      );

      this.logger.log(`✅ ${messageBody.trackingId}`);
    } catch (error) {
      this.logger.error(`❌ ${messageBody?.trackingId || "unknown"}`, error);

      // Update to FAILED
      if (messageBody?.trackingId) {
        await this.prisma.user_reminders
          .update({
            where: { id: messageBody.trackingId },
            data: {
              status: "FAILED",
              last_error: error instanceof Error ? error.message : "Unknown",
              updated_at: new Date(),
            },
          })
          .catch((err) => this.logger.error("DB error:", err));

        // Log failure to audit table
        await this.prisma.user_reminder_audit_logs
          .create({
            data: {
              user_reminder_id: messageBody.trackingId,
              event: "PROCESSED_FAILED",
              metadata: {
                type: messageBody.templateCode,
                errorMessage:
                  error instanceof Error ? error.message : "Unknown",
              },
            },
          })
          .catch((err) => this.logger.error("Audit log error:", err));
      }

      // Retry logic
      try {
        await this.awsReminderSqsService?.changeMessageVisibility(
          message.ReceiptHandle,
          60,
        );
      } catch {
        await this.awsReminderSqsService?.deleteReminderMessage(
          message.ReceiptHandle,
        );
      }
    }
  }

  private async handleReminderByType(messageBody: ReminderTrackingPayload) {
    const { templateCode } = messageBody;

    switch (templateCode) {
      case "PhoneVerification":
        await this.handlePhoneVerification(messageBody);
        break;
      case "EmailVerification":
        await this.handleEmailVerification(messageBody);
        break;
      case "LoanApplication":
        await this.handleLoanApplication(messageBody);
        break;
      case "CurrentStatus":
        await this.handleCurrentStatus(messageBody);
        break;
      case "LoanApplicationKyc":
        await this.handleLoanApplicationKyc(messageBody);
        break;
      case "LoanApplicationPersonalInfo":
        await this.handleLoanApplicationPersonalInfo(messageBody);
        break;
      case "LoanApplicationBankDetails":
        await this.handleLoanApplicationBankDetails(messageBody);
        break;
      case "LoanApplicationEmploymentInfo":
        await this.handleLoanApplicationEmploymentInfo(messageBody);
        break;
      case "LoanApplicationSelfie":
        await this.handleLoanApplicationSelfie(messageBody);
        break;
      case "LoanApplicationAddressVerification":
        await this.handleLoanApplicationAddressVerification(messageBody);
        break;
      case "LoanApplicationReview":
        await this.handleLoanApplicationReview(messageBody);
        break;
      case "LoanApplicationSubmit":
        await this.handleLoanApplicationSubmit(messageBody);
        break;
      default:
        this.logger.warn(`Unknown: ${templateCode}`);
    }
  }

  // Handlers
  private async handlePhoneVerification(messageBody: ReminderTrackingPayload) {
    // Get templates for OTP/Phone verification
    const templates = REMINDER_TEMPLATES_REGISTRY.PhoneVerification || [];

    // Get the next template based on sequence or use the first one
    const template = templates.find((t) => t.sequence === 1);

    if (template) {
      const variables = this.buildMessageVariables(messageBody);
      const message = formatMessage(template.message, variables);

      // Prioritize channel from messageBody or use template default
      const channel = messageBody.channel || template.channel;
      this.logger.log(
        `📱 Sending OTP reminder via ${channel}: ${messageBody.userId} (${messageBody.userPhoneNumber})`,
      );
      await this.sendCommunication(
        messageBody,
        channel,
        message,
        template.subject,
      );
    }
  }

  private async handleEmailVerification(messageBody: ReminderTrackingPayload) {
    // Get templates for Email verification
    const templates = REMINDER_TEMPLATES_REGISTRY.EmailVerification || [];
    const template = templates.find((t) => t.sequence === 1);

    if (template) {
      const variables = this.buildMessageVariables(messageBody);
      const message = formatMessage(template.message, variables);

      // Prioritize channel > contactMethod > template.channel
      const channel = messageBody.channel || template.channel;
      this.logger.log(
        `📧 Sending Email verification reminder via ${channel}: ${messageBody.userId}`,
      );
      await this.sendCommunication(
        messageBody,
        channel,
        message,
        template.subject,
      );
    }
  }

  private async handleLoanApplication(messageBody: ReminderTrackingPayload) {
    // Get templates for Loan Application
    const templates = REMINDER_TEMPLATES_REGISTRY.LoanApplication || [];
    const template = templates.find((t) => t.sequence === 1);

    if (template) {
      const variables = this.buildMessageVariables(messageBody);
      const message = formatMessage(template.message, variables);

      // Prioritize channel > contactMethod > template.channel
      const channel = messageBody.channel || template.channel;
      this.logger.log(
        `💼 Sending loan application reminder via ${channel}: ${messageBody.userId}`,
      );
      await this.sendCommunication(
        messageBody,
        channel,
        message,
        template.subject,
      );
    }
  }

  private async handleCurrentStatus(messageBody: ReminderTrackingPayload) {
    // Get templates for Application Status
    const templates = REMINDER_TEMPLATES_REGISTRY.CurrentStatus || [];
    const template = templates.find((t) => t.sequence === 1);

    if (template) {
      const variables = this.buildMessageVariables(messageBody);
      const message = formatMessage(template.message, variables);

      // Prioritize channel > contactMethod > template.channel
      const channel = messageBody.channel || template.channel;
      this.logger.log(
        `📊 Sending status update reminder via ${channel}: ${messageBody.userId}`,
      );
      await this.sendCommunication(
        messageBody,
        channel,
        message,
        template.subject,
      );
    }
  }

  private async handleLoanApplicationKyc(messageBody: ReminderTrackingPayload) {
    // Get templates for KYC
    const templates = REMINDER_TEMPLATES_REGISTRY.LoanApplicationKyc || [];
    const template = templates.find((t) => t.sequence === 1);

    if (template) {
      const variables = this.buildMessageVariables(messageBody);
      const message = formatMessage(template.message, variables);

      // Prioritize channel > contactMethod > template.channel
      const channel = messageBody.channel || template.channel;
      this.logger.log(
        `🆔 Sending KYC reminder via ${channel}: ${messageBody.userId}`,
      );
      await this.sendCommunication(
        messageBody,
        channel,
        message,
        template.subject,
      );
    }
  }

  private async handleLoanApplicationPersonalInfo(
    messageBody: ReminderTrackingPayload,
  ) {
    // Get templates for Personal Info
    const templates =
      REMINDER_TEMPLATES_REGISTRY.LoanApplicationPersonalInfo || [];
    const template = templates.find((t) => t.sequence === 1);

    if (template) {
      const variables = this.buildMessageVariables(messageBody);
      const message = formatMessage(template.message, variables);

      // Prioritize channel > contactMethod > template.channel
      const channel = messageBody.channel || template.channel;
      this.logger.log(
        `👤 Sending personal info reminder via ${channel}: ${messageBody.userId}`,
      );
      await this.sendCommunication(
        messageBody,
        channel,
        message,
        template.subject,
      );
    }
  }

  private async handleLoanApplicationBankDetails(
    messageBody: ReminderTrackingPayload,
  ) {
    // Get templates for Bank Details
    const templates =
      REMINDER_TEMPLATES_REGISTRY.LoanApplicationBankDetails || [];
    const template = templates.find((t) => t.sequence === 1);

    if (template) {
      const variables = this.buildMessageVariables(messageBody);
      const message = formatMessage(template.message, variables);

      // Prioritize channel > contactMethod > template.channel
      const channel = messageBody.channel || template.channel;
      this.logger.log(
        `🏦 Sending bank details reminder via ${channel}: ${messageBody.userId}`,
      );
      await this.sendCommunication(
        messageBody,
        channel,
        message,
        template.subject,
      );
    }
  }

  private async handleLoanApplicationEmploymentInfo(
    messageBody: ReminderTrackingPayload,
  ) {
    // Get templates for Employment Info
    const templates =
      REMINDER_TEMPLATES_REGISTRY.LoanApplicationEmploymentInfo || [];
    const template = templates.find((t) => t.sequence === 1);

    if (template) {
      const variables = this.buildMessageVariables(messageBody);
      const message = formatMessage(template.message, variables);

      // Prioritize channel > contactMethod > template.channel
      const channel = messageBody.channel || template.channel;
      this.logger.log(
        `💼 Sending employment info reminder via ${channel}: ${messageBody.userId}`,
      );
      await this.sendCommunication(
        messageBody,
        channel,
        message,
        template.subject,
      );
    }
  }

  private async handleLoanApplicationSelfie(
    messageBody: ReminderTrackingPayload,
  ) {
    // Get templates for Selfie/Video verification
    const templates = REMINDER_TEMPLATES_REGISTRY.LoanApplicationSelfie || [];
    const template = templates.find((t) => t.sequence === 1);

    if (template) {
      const variables = this.buildMessageVariables(messageBody);
      const message = formatMessage(template.message, variables);

      // Prioritize channel > contactMethod > template.channel
      const channel = messageBody.channel || template.channel;
      this.logger.log(
        `📸 Sending selfie reminder via ${channel}: ${messageBody.userId}`,
      );
      await this.sendCommunication(
        messageBody,
        channel,
        message,
        template.subject,
      );
    }
  }

  private async handleLoanApplicationAddressVerification(
    messageBody: ReminderTrackingPayload,
  ) {
    // Get templates for Address Verification
    const templates =
      REMINDER_TEMPLATES_REGISTRY.LoanApplicationAddressVerification || [];
    const template = templates.find((t) => t.sequence === 1);

    if (template) {
      const variables = this.buildMessageVariables(messageBody);
      const message = formatMessage(template.message, variables);

      // Prioritize channel > contactMethod > template.channel
      const channel = messageBody.channel || template.channel;
      this.logger.log(
        `📍 Sending address verification reminder via ${channel}: ${messageBody.userId}`,
      );
      await this.sendCommunication(
        messageBody,
        channel,
        message,
        template.subject,
      );
    }
  }

  private async handleLoanApplicationReview(
    messageBody: ReminderTrackingPayload,
  ) {
    // Get templates for Application Review
    const templates = REMINDER_TEMPLATES_REGISTRY.LoanApplicationReview || [];
    const template = templates.find((t) => t.sequence === 1);

    if (template) {
      const variables = this.buildMessageVariables(messageBody);
      const message = formatMessage(template.message, variables);

      // Prioritize channel > contactMethod > template.channel
      const channel = messageBody.channel || template.channel;
      this.logger.log(
        `👁️ Sending application review reminder via ${channel}: ${messageBody.userId}`,
      );
      await this.sendCommunication(
        messageBody,
        channel,
        message,
        template.subject,
      );
    }
  }

  private async handleLoanApplicationSubmit(
    messageBody: ReminderTrackingPayload,
  ) {
    // Get templates for Application Submission
    const templates = REMINDER_TEMPLATES_REGISTRY.LoanApplicationSubmit || [];
    const template = templates.find((t) => t.sequence === 1);

    if (template) {
      const variables = this.buildMessageVariables(messageBody);
      const message = formatMessage(template.message, variables);

      // Prioritize channel > contactMethod > template.channel
      const channel = messageBody.channel || template.channel;
      this.logger.log(
        `✅ Sending final submission reminder via ${channel}: ${messageBody.userId}`,
      );
      await this.sendCommunication(
        messageBody,
        channel,
        message,
        template.subject,
      );
    }
  }

  /**
   * Helper method to send communication via different channels
   * Uses CommunicationService module for multi-provider support
   * @param messageBody - Complete reminder tracking payload with user details
   * @param channel - Communication channel (SMS, Email, WhatsApp, IVR, IVR+SMS)
   * @param message - Message content
   * @param subject - Email subject (optional)
   */
  private async sendCommunication(
    messageBody: ReminderTrackingPayload,
    channel: string | undefined,
    message: string,
    subject?: string,
  ): Promise<void> {
    try {
      // Normalize channel name - handle different input formats
      const normalizedChannel = this.normalizeChannel(channel);

      // Use dynamic templateName if provided, otherwise fallback to 'reminder'
      const dynamicTemplateName = messageBody.provider_message_id || "reminder";

      switch (normalizedChannel) {
        case "SMS":
        case "sms":
          await this.smsService.sendSms({
            to: messageBody.userPhoneNumber,
            text: message,
            otp: "",
            name: messageBody.userName || "",
          });
          this.logger.log(
            `📱 SMS sent to ${messageBody.userPhoneNumber} with template: ${dynamicTemplateName}`,
          );
          break;

        case "WhatsApp":
        case "whatsapp": {
          await this.whatsAppService.sendWhatsAppMessage({
            to: messageBody.userPhoneNumber,
            templateName: dynamicTemplateName,
            message: message,
            params:
              this.buildWhatsAppParams(
                dynamicTemplateName,
                messageBody,
                message,
              )?.templateParams || {},
          });
          this.logger.log(
            `💬 WhatsApp sent to ${messageBody.userId} with template: ${dynamicTemplateName}`,
          );
          break;
        }

        case "Email":
        case "email": {
          // Use pre-rendered HTML from payload (generated in dispatcher)
          const emailPayload = messageBody.payload
          const htmlContent = emailPayload?.htmlBody || "";
          await this.emailService.sendEmail({
            to: messageBody.userEmail,
            subject: emailPayload?.subject || subject || "Loan Application Update",
            name: messageBody.userName || "User",
            text: emailPayload?.message || message,
            html: htmlContent,
          });
          this.logger.log(
            `📧 Email sent to ${messageBody.userEmail} with template: ${dynamicTemplateName}`,
          );
          break;
        }

        case "IVR":
        case "ivr":
          // IVR support might be added to communication module
          this.logger.warn(
            `IVR channel not yet implemented: ${messageBody.userId}`,
          );
          break;

        case "IVR+SMS":
        case "ivr+sms":
          // Send SMS (IVR can be added later)
          await this.smsService.sendSms({
            to: messageBody.userPhoneNumber,
            text: message,
            otp: "",
            name: messageBody.userName || "",
          });
          this.logger.log(
            `☎️ IVR+SMS sent to ${messageBody.userPhoneNumber} with template: ${dynamicTemplateName}`,
          );
          break;

        default:
          this.logger.warn(
            `Unknown channel: ${channel} (normalized: ${normalizedChannel})`,
          );
          throw new Error(`Unsupported communication channel: ${channel}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to send ${channel} to ${messageBody.userId}:`,
        error instanceof Error ? error.message : error,
      );
      throw error;
    }
  }

  /**
   * Normalize channel name to standard format
   * Handles variations like "sms", "SMS", "email", "Email", etc.
   */
  private normalizeChannel(channel: string | undefined): string {
    if (!channel) {
      return "SMS"; // Default to SMS if no channel specified
    }

    const normalizedMap: Record<string, string> = {
      sms: "SMS",
      email: "Email",
      whatsapp: "WhatsApp",
      whatsApp: "WhatsApp",
      ivr: "IVR",
      "ivr+sms": "IVR+SMS",
      ivr_sms: "IVR+SMS",
      push: "SMS", // Map push to SMS as fallback
    };

    const lowerChannel = channel.toLowerCase();
    return normalizedMap[lowerChannel] || channel;
  }

  /**
   * Build message variables from reminder payload and user details
   * Combines user data with application context for template formatting
   */
  private buildMessageVariables(
    messageBody: ReminderTrackingPayload,
  ): Record<string, string> {
    return {
      brand_name: messageBody.brandName || "our",
      link: messageBody.applicationLink || "#",
      Name: messageBody.userName || "User",
      email: messageBody.userEmail || "",
      phone: messageBody.userPhoneNumber || "",
      email_verified: messageBody.isEmailVerified ? "Yes" : "No",
      phone_verified: messageBody.isPhoneVerified ? "Yes" : "No",
      whatsapp_verified: messageBody.isWhatsappVerified ? "Yes" : "No",
    };
  }

  /**
   * Build WhatsApp template parameters based on template name
   * Different templates require different parameter structures
   * @param templateName - WhatsApp template name
   * @param messageBody - Reminder tracking payload
   * @param message - Message content
   */
  private buildWhatsAppParams(
    templateName: string,
    messageBody: ReminderTrackingPayload,
    message: string,
  ): Record<string, any> {
    // Handle specific templates that require specific parameter structures
    switch (templateName.toLowerCase()) {
      case "onboarding_journey": {
        return {
          templateParams: [
            messageBody.payload["1"] || " ",
            messageBody.payload["2"] || " ",
            messageBody.payload["3"] || " ",
            messageBody.payload["4"] || " ",
            messageBody.payload["5"] || " ",
            messageBody.payload["6"] || " ",
          ],
        };
      }

      case "in_process_daily_reminder": {
        return {
          templateParams: [
            messageBody.payload["1"] || " ",
            messageBody.payload["2"] || " ",
            messageBody.payload["3"] || " ",
            messageBody.payload["4"] || " ",
            messageBody.payload["5"] || " ",
            messageBody.payload["6"] || " ",
            messageBody.payload["7"] || " ",
          ],
        };
      }

      case "loan_rejection": {
        return {
          templateParams: [
            messageBody.payload["1"] || " ",
            messageBody.payload["2"] || " ",
            messageBody.payload["3"] || " ",
            messageBody.payload["4"] || " ",
            messageBody.payload["5"] || " ",
            messageBody.payload["6"] || " ",
            messageBody.payload["7"] || " ",
            messageBody.payload["8"] || " ",
          ],
        };
      }

      case "application_incomplete":
      case "application_submission": {
        return {
          templateParams: [
            messageBody.payload["1"] || " ",
            messageBody.payload["2"] || " ",
            messageBody.payload["3"] || " ",
            messageBody.payload["4"] || " ",
            messageBody.payload["5"] || " ",
          ],
        };
      }

      default:
        // Default params for all other templates
        return {
          message: message || " ",
          Name: messageBody.userName || "User",
        };
    }
  }

  stopPolling() {
    this.isPolling = false;
    this.logger.log("Worker stopped");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
