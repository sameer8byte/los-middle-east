import { Injectable, Logger, Optional } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "src/prisma/prisma.service";
import {
  AwsReminderSqsService,
  ReminderTrackingPayload,
  ReminderJobType,
} from "src/core/aws/sqs/aws-remindar-sqs.service";
import {
  Brand,
  BrandDetails,
  Loan,
  User,
  user_reminders,
  UserDetails,
} from "@prisma/client";
import { getPageFromId } from "src/constant/redirect";
import { getTemplatesForType } from "../workers/reminder-templates.constant";
import { CronGuardService } from "src/common/guards/cron-guard.service";
import * as ejs from "ejs";
import * as path from "node:path";
type Provider = "WHATSAPP" | "EMAIL" | "SMS" | "IVR";

// Configuration constants
const BATCH_SIZE = 500; // Maximum reminders to process per cron run
const MAX_RETRIES = 3; // Maximum number of retry attempts
const SQS_BATCH_SIZE = 10; // AWS SQS maximum batch size per request

// --- IGNORE --
/**
 * Queue Dispatcher Service
 * ==================================================
 */
@Injectable()
export class ReminderQueueDispatcherService {
  private readonly logger = new Logger(ReminderQueueDispatcherService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly awsReminderSqsService: AwsReminderSqsService,
    private readonly cronGuardService: CronGuardService,
  ) {}

  /**
   * Dispatcher runs every minute to fetch scheduled reminders from DB
   * and push them to SQS queue for processing
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async dispatchScheduledReminders(): Promise<void> {
    // Guard: Only run on cron worker
    if (!this.cronGuardService.isCronEnabled()) {
      return;
    }

    try {
      this.logger.debug("🔄 Starting reminder queue dispatch...");
      const brand = await this.prisma.brand.findFirst({
        include: {
          brandDetails: true,
        },
      });
      if (!brand) {
        this.logger.error("No brand found in the system.");
        return;
      }
      const brandConfig = await this.prisma.brandConfig.findFirst({
        where: {
          brandId: brand.id,
        },
        select: {
          is_user_remindar: true,
        },
      });
      if (!brandConfig) {
        this.logger.error("No brand configuration found in the system.");
        return;
      }

      if (!brandConfig.is_user_remindar) {
        this.logger.debug(
          "User reminders are disabled in brand configuration. Skipping dispatch.",
        );
        return;
      }

      // Fetch all pending reminders that are due to be sent
      const pendingReminders = await this.prisma.user_reminders.findMany({
        where: {
          status: "PENDING",
          scheduled_at: {
            lte: new Date(), // Only reminders scheduled for now or in the past
          },
          retry_count: {
            lt: MAX_RETRIES, // Max retries configuration
          },
        },
        take: BATCH_SIZE, // Process max BATCH_SIZE per run to avoid overload
        orderBy: {
          scheduled_at: "asc", // Process oldest reminders first
        },
      });

      if (pendingReminders.length === 0) {
        this.logger.debug("No pending reminders to dispatch");
        return;
      }

      // Fetch user details for all reminders
      const userIds = [...new Set(pendingReminders.map((r) => r.user_id))];
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        include: {
          userDetails: true,
        },
      });

      // Fetch all loans in one query
      const loanIds = pendingReminders
        .map((r) => {
          return r?.loan_id;
        })
        .filter((id): id is string => !!id);

      const loans = await this.prisma.loan.findMany({
        where: { id: { in: loanIds } },
      });
      const loanMap = new Map(loans.map((l) => [l.id, l]));

      const userMap = new Map(users.map((u) => [u.id, u]));

      // Group reminders by provider for batch processing
      const remindersByProvider: Record<Provider, user_reminders[]> = {
        WHATSAPP: [],
        EMAIL: [],
        SMS: [],
        IVR: [],
      };
      for (const reminder of pendingReminders) {
        if (!remindersByProvider[reminder.channel]) {
          remindersByProvider[reminder.channel] = [];
        }
        remindersByProvider[reminder.channel].push(reminder);
      }

      // Process each provider's reminders
      for (const [provider, reminders] of Object.entries(remindersByProvider)) {
        await this.processRemindersBatch(
          provider as Provider,
          reminders,
          userMap,
          brand,
          loanMap,
        );
      }
    } catch (error) {
      this.logger.error("Error in reminder queue dispatcher:", error);
    }
  }

  /**
   * Process a batch of reminders for a specific provider
   */
  private async processRemindersBatch(
    provider: Provider,
    reminders: user_reminders[],
    userMap: Map<string, User & { userDetails: UserDetails | null }>,
    brand: Brand & { brandDetails: BrandDetails },
    loanMap: Map<string, Loan>,
  ): Promise<void> {
    const trackingPayloads: ReminderTrackingPayload[] = [];

    for (const reminder of reminders) {
      try {
        const user = userMap.get(reminder.user_id);
        if (!user) {
          this.logger.warn(`User not found for reminder ${reminder.id}`);
          await this.updateReminderStatus(
            reminder.id,
            "FAILED",
            "User not found",
            reminder.retry_count,
          );
          continue;
        }

        // Get loan from the pre-fetched map
        const payloadData = (reminder.payload as Record<string, any>) || {};
        const loanId = payloadData?.loanId;
        const loan = loanId ? loanMap.get(loanId) : undefined;

        const trackingPayload = await this.buildTrackingPayload(
          reminder,
          provider,
          user,
          brand,
          loan,
        );
        trackingPayloads.push(trackingPayload);
      } catch (error) {
        this.logger.error(
          `Error building payload for reminder ${reminder.id}:`,
          error,
        );
        // Mark reminder as failed
        await this.updateReminderStatus(
          reminder.id,
          "FAILED",
          error.message,
          reminder.retry_count,
        );
      }
    }

    if (trackingPayloads.length === 0) {
      return;
    }

    // Guard: Check if AWS Reminder SQS Service is available
    if (!this.awsReminderSqsService) {
      this.logger.warn(
        "⚠️ AwsReminderSqsService is not configured. SQS_REMINDER_QUEUE_URL environment variable is missing.",
      );
      return;
    }

    // Send batch to SQS in chunks of SQS_BATCH_SIZE (max 10 per AWS SQS request)
    try {
      // Split tracking payloads into chunks of SQS_BATCH_SIZE
      for (let i = 0; i < trackingPayloads.length; i += SQS_BATCH_SIZE) {
        const chunk = trackingPayloads.slice(i, i + SQS_BATCH_SIZE);

        await this.awsReminderSqsService.sendBatchToReminderQueue(chunk);
      }

      // Update all reminders to IN_PROGRESS
      const reminderIds = reminders.map((r) => r.id);
      await this.prisma.user_reminders.updateMany({
        where: {
          id: { in: reminderIds },
        },
        data: {
          status: "IN_PROGRESS",
          updated_at: new Date(),
        },
      });

      // Log dispatch events to audit table
      await Promise.all(
        reminderIds.map((id) =>
          this.prisma.user_reminder_audit_logs.create({
            data: {
              user_reminder_id: id,
              event: "DISPATCHED_TO_SQS",
              metadata: {
                provider,
                count: trackingPayloads.length,
              },
            },
          }),
        ),
      );

      this.logger.log(
        `✅ Batch sent to SQS for provider: ${provider} (${trackingPayloads.length} reminders in ${Math.ceil(trackingPayloads.length / SQS_BATCH_SIZE)} requests)`,
      );
    } catch (error) {
      this.logger.error(
        `Error sending batch to SQS for provider ${provider}:`,
        error,
      );
      // Mark all reminders as failed
      for (const reminder of reminders) {
        await this.updateReminderStatus(
          reminder.id,
          "FAILED",
          error.message,
          reminder.retry_count,
        );
      }
    }
  }

  /**
   * Generate context-aware message based on current onboarding step
   */
  private getMessageForOnboardingStep(
    currentStepNumber: number,
    currentStep: string,
    brandName: string,
  ): string {
    const stepMessages: Record<number, string> = {
      0: `Welcome to ${brandName}! Let's verify your phone number to get started with your loan application.`,
      1: `Welcome to ${brandName}! Let's verify your phone number to get started with your loan application.`,
      2: `Great! Your phone is verified. Now, let's verify your email address to proceed.`,
      3: `Perfect! Now let's begin your loan application. Tell us about your current employment status.`,
      4: `Excellent! Now we need to verify your basic information and complete your KYC requirements.`,
      5: `Let's verify your identity with your PAN card details.`,
      6: `Next, we'll need your personal information including date of birth and address.`,
      7: `Please provide your bank account details for salary verification.`,
      8: `Help us understand your employment details to better serve you.`,
      9: `We need a clear selfie for identity verification.`,
      10: `Let's verify your address with your Aadhaar details.`,
      11: `Almost there! Please review your application details before submission.`,
      12: `Thank you for submitting your application! Your loan status will be updated shortly.`,
    };

    return (
      stepMessages[currentStepNumber] ||
      `Please proceed with the current step: ${currentStep}`
    );
  }

  /**
   * Build tracking payload for SQS from database reminder record
   */
  private async buildTrackingPayload(
    reminder: user_reminders,
    provider: Provider,
    user: User & { userDetails: UserDetails | null },
    brand: Brand & { brandDetails: BrandDetails },
    loan?: Loan,
  ): Promise<ReminderTrackingPayload> {
    const reminderType = this.mapProviderToReminderType(provider);

    // Construct full name from firstName and lastName
    const firstName = user.userDetails?.firstName || "";
    const lastName = user.userDetails?.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim() || "User";

    // Extract dynamic values from loan or reminder payload
    const formattedUserId = user.formattedUserId;
    const applicationLink = `https://${brand?.domain}`;
    const customerName = fullName;
    const creditManagerName =
      brand.brandDetails?.lenderName || "Credit Manager";
    const managerEmail =
      brand.brandDetails?.contactEmail || "manager@company.com";
    const statusNote = getPageFromId(user.onboardingStep);
    const trackingLink = applicationLink;
    const brandName = brand?.name || "Team Name";
    const timelineInfo = user.updatedAt.toDateString();
    const declineReason = "Reason for decline";
    const declineLink = trackingLink; // Use tracking link or application link for decline
    const nextStep = getPageFromId(user.onboardingStep + 1);
    const currentStep = getPageFromId(user.onboardingStep);
    const message = this.getMessageForOnboardingStep(
      user.onboardingStep,
      currentStep,
      brandName,
    );
    const supportPhone = brand.brandDetails?.contactPhone || "1-800-HELP-NOW";
    const supportTeam = "Application Support";
    const pendingDocuments = "pending documents";
    const supportPhone2 = brand.brandDetails?.contactPhone || "1-800-555-HELP";
    const customerSupport =
      brand.brandDetails?.contactPhone || "Customer Support";
    const whatsAppPaylod = {
      in_process_daily_reminder: {
        "1": customerName,
        "2": formattedUserId,
        "3": creditManagerName,
        "4": managerEmail,
        "5": statusNote,
        "6": trackingLink,
        "7": brandName,
        status: "In process",
      },
      application_submission: {
        "1": customerName,
        "2": formattedUserId,
        "3": trackingLink,
        "4": timelineInfo,
        "5": "Onboarding",
      },
      loan_rejection: {
        "1": customerName,
        "2": formattedUserId,
        "3": declineReason,
        "4": declineLink,
        "5": creditManagerName,
        "6": managerEmail,
        "7": supportPhone,
        "8": "Underwriting",
      },
      onboarding_journey: {
        "1": customerName,
        "2": formattedUserId,
        "3": nextStep,
        "4": message,
        "5": supportPhone,
        "6": supportTeam,
      },
      application_incomplete: {
        "1": customerName,
        "2": formattedUserId,
        "3": pendingDocuments,
        "4": supportPhone2,
        "5": customerSupport,
      },
    };
    const emailTeample = getTemplatesForType(reminder.template_code);

    // Helper function to format email with universal wrapper template
    const formatEmailTemplate = async (
      template: any,
    ): Promise<{ subject: string; message: string; htmlBody?: string }> => {
      // Process template subject - replace placeholders
      let processedSubject = template.subject
        ? template.subject
            .split("{{Name}}")
            .join(customerName)
            .split("{{brand_name}}")
            .join(brandName)
            .split("{{link}}")
            .join(trackingLink)
        : `${brandName} - Application Update`;

      // Process template message - replace placeholders
      let processedMessage = template.message
        .split("{{Name}}")
        .join(customerName)
        .split("{{brand_name}}")
        .join(brandName)
        .split("{{link}}")
        .join(trackingLink)
        .split("{{Go to Application button}}")
        .join(""); // Remove button placeholder since CTA button is in template

      // Convert line breaks to HTML paragraphs for better email formatting
      const htmlFormattedMessage = processedMessage
        .split("\n\n")
        .filter((p) => p.trim())
        .map(
          (p) =>
            `<p style="margin:0 0 16px; font-size:16px; line-height:1.6; color:#4b5563;">${p.trim()}</p>`,
        )
        .join("");

      const templateVars = {
        subject: processedSubject,
        brand_name: brandName,
        brand_logo: brand?.logoUrl || "",
        headline: `Hi ${customerName}`,
        body_content: htmlFormattedMessage,
        cta_text: "Continue Application",
        cta_link: trackingLink,
        year: new Date().getFullYear(),
      };
      const templatePath = path.join(
        process.cwd(),
        "src",
        "templates",
        "partner",
        "ejs",
        "universal-email-wrapper.ejs",
      );
      // Render HTML using universal email wrapper template
      const htmlBody = await ejs.renderFile(templatePath, templateVars);

      return {
        subject: processedSubject,
        message: template.message,
        htmlBody,
      };
    };
    // Build email payload from templates using universal wrapper
    let emailPayload: {
      subject: string;
      message: string;
      htmlBody?: string;
    } | null = null;

    const template = emailTeample.find((t) => t.channel === "Email");

    if (template) {
      const formattedEmail = await formatEmailTemplate(template);

      emailPayload = {
        subject: formattedEmail.subject,
        message: formattedEmail.message,
        htmlBody: formattedEmail.htmlBody,
      };
    }

    const payload: ReminderTrackingPayload = {
      trackingId: reminder.id,
      loanId: loan?.id || "",
      userId: user.id,
      channel:
        (reminder.channel as
          | "SMS"
          | "Email"
          | "WhatsApp"
          | "IVR"
          | "IVR+SMS") || "Email",
      timestamp: new Date().toISOString(),
      brandName: brand?.name || "",
      applicationLink: applicationLink,
      provider_message_id: reminder.provider_message_id || "",

      // User details from users table
      userEmail: user.email || "",
      userPhoneNumber: user.phoneNumber || "",
      userName: fullName,
      isEmailVerified: user.isEmailVerified || false,
      isPhoneVerified: user.isPhoneVerified || false,
      isWhatsappVerified: user.isWhatsappVerified || false,

      // Additional context
      templateCode: reminderType,
      payload:
        provider === "EMAIL"
          ? emailPayload
          : whatsAppPaylod[reminder.provider_message_id],
    };

    return payload;
  }

  /**
   * Map provider name to reminder type
   */
  private mapProviderToReminderType(provider: Provider): ReminderJobType {
    const providerMap: Record<string, ReminderJobType> = {
      PhoneVerification: "PhoneVerification",
      EmailVerification: "EmailVerification",
      LoanApplication: "LoanApplication",
      CurrentStatus: "CurrentStatus",
      LoanApplicationKyc: "LoanApplicationKyc",
      LoanApplicationPersonalInfo: "LoanApplicationPersonalInfo",
      LoanApplicationBankDetails: "LoanApplicationBankDetails",
      LoanApplicationEmploymentInfo: "LoanApplicationEmploymentInfo",
      LoanApplicationSelfie: "LoanApplicationSelfie",
      LoanApplicationAddressVerification: "LoanApplicationAddressVerification",
      LoanApplicationReview: "LoanApplicationReview",
      LoanApplicationSubmit: "LoanApplicationSubmit",
    };

    return providerMap[provider] || "LoanApplication";
  }

  /**
   * Update reminder status in database and log to audit table
   */
  private async updateReminderStatus(
    reminderId: string,
    status: string,
    errorMessage?: string,
    currentRetryCount: number = 0,
  ): Promise<void> {
    try {
      // Update reminder status
      await this.prisma.user_reminders.update({
        where: { id: reminderId },
        data: {
          status,
          last_error: errorMessage || null,
          retry_count:
            status === "FAILED" ? currentRetryCount + 1 : currentRetryCount,
          updated_at: new Date(),
        },
      });

      // Log to audit table
      await this.prisma.user_reminder_audit_logs.create({
        data: {
          user_reminder_id: reminderId,
          event: `DISPATCH_${status}`,
          metadata: {
            errorMessage,
            retryCount:
              status === "FAILED" ? currentRetryCount + 1 : currentRetryCount,
          },
        },
      });
    } catch (error) {
      this.logger.error(
        `Error updating reminder status for ${reminderId}:`,
        error,
      );
    }
  }

  /**
   * Manually trigger dispatch (for testing or manual runs)
   */
  async triggerDispatch(): Promise<{ success: boolean; count: number }> {
    try {
      const pendingCount = await this.prisma.user_reminders.count({
        where: {
          status: "PENDING",
          scheduled_at: {
            lte: new Date(),
          },
          retry_count: {
            lt: MAX_RETRIES,
          },
        },
      });

      await this.dispatchScheduledReminders();

      return {
        success: true,
        count: pendingCount,
      };
    } catch (error) {
      this.logger.error("Error in manual dispatch trigger:", error);
      return {
        success: false,
        count: 0,
      };
    }
  }

  /**
   * Get dispatcher statistics
   */
  async getDispatcherStats(): Promise<{
    pending: number;
    inProgress: number;
    success: number;
    failed: number;
    totalRetries: number;
  }> {
    const [pending, inProgress, success, failed] = await Promise.all([
      this.prisma.user_reminders.count({
        where: { status: "PENDING" },
      }),
      this.prisma.user_reminders.count({
        where: { status: "IN_PROGRESS" },
      }),
      this.prisma.user_reminders.count({
        where: { status: "SUCCESS" },
      }),
      this.prisma.user_reminders.count({
        where: { status: "FAILED" },
      }),
    ]);

    const retries = await this.prisma.user_reminders.aggregate({
      _sum: {
        retry_count: true,
      },
    });

    return {
      pending,
      inProgress,
      success,
      failed,
      totalRetries: retries._sum.retry_count || 0,
    };
  }
}
