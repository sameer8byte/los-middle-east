import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "src/prisma/prisma.service";
import { CronGuardService } from "src/common/guards/cron-guard.service";

type OnboardingStep = 0 | 1 | 2 | 3 | 5 | 6 | 7 | 8 | 9;
type TemplateCode =
  | "PhoneVerification"
  | "EmailVerification"
  | "LoanApplication"
  | "LoanApplicationKyc"
  | "LoanApplicationBankDetails"
  | "LoanApplicationPersonalInfo"
  | "LoanApplicationEmploymentInfo"
  | "LoanApplicationSelfie";

type Channel = "WHATSAPP" | "EMAIL";

/**
 * Reminder Creator Service
 * ==================================================
 * Creates reminders for users based on their onboarding step
 * Runs every 15 minutes to identify users who need reminders
 */
@Injectable()
export class ReminderCreatorService {
  private readonly logger = new Logger(ReminderCreatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cronGuardService: CronGuardService,
  ) {}

  /**
   * Creates reminders for eligible users every 15 minutes
   * Eligible users:
   * - Active users in specific onboarding steps
   * - Updated today (IST)
   * - Last updated more than 30 minutes ago
   * - No existing pending reminders
   */
  @Cron("*/15 * * * *") // Every 15 minutes
  async createScheduledReminders(): Promise<void> {
    // Guard: Only run on cron worker
    if (!this.cronGuardService.isCronEnabled()) {
      return;
    }

    try {
      this.logger.debug("🔄 Starting reminder creation process...");
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
          "User reminders are disabled in brand configuration.",
        );
        return;
      }
      // Fetch eligible users using raw SQL query
      const eligibleUsers = await this.prisma.$queryRaw<
        Array<{
          id: string;
          onboardingStep: number;
        }>
      >`
    SELECT u.id, u."onboardingStep"
        FROM "users" u 

        WHERE u."isActive" = true
          AND u."status_id" NOT IN (4, 5)
          AND u."onboardingStep" IN (0, 1, 2, 3, 5, 6, 7, 8, 9)
          
          -- Updated today (IST)
          AND (u."updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
              = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
          
          -- Last update was MORE than 30 minutes ago (IST)
          AND (u."updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')
              <= (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' - INTERVAL '30 minutes')
          
          -- No existing reminders for this user with the same template code
          AND NOT EXISTS (
            SELECT 1
            FROM "user_reminders" ur
            WHERE ur.user_id = u.id
              AND ur.template_code = CASE
                WHEN u."onboardingStep" IN (0, 1) THEN 'PhoneVerification'
                WHEN u."onboardingStep" = 2 THEN 'EmailVerification'
                WHEN u."onboardingStep" = 3 THEN 'LoanApplication'
                WHEN u."onboardingStep" = 5 THEN 'LoanApplicationKyc'
                WHEN u."onboardingStep" = 6 THEN 'LoanApplicationBankDetails'
                WHEN u."onboardingStep" = 7 THEN 'LoanApplicationPersonalInfo'
                WHEN u."onboardingStep" = 8 THEN 'LoanApplicationEmploymentInfo'
                WHEN u."onboardingStep" = 9 THEN 'LoanApplicationSelfie'
                ELSE 'LoanApplication'
              END
          )
      `;

      if (eligibleUsers.length === 0) {
        this.logger.debug("No eligible users for reminder creation");
        return;
      }

      this.logger.debug(`Found ${eligibleUsers.length} eligible users`);

      // Determine the channel based on current IST time
      const channel = this.getChannelByTime();

      // Create reminders for all eligible users
      const reminders = eligibleUsers.map((user) => ({
        user_id: user.id,
        template_code: this.mapOnboardingStepToTemplate(user.onboardingStep),
        channel,
        scheduled_at: new Date(),
        status: "PENDING",
        provider_message_id: "onboarding_journey",
        created_at: new Date(),
        updated_at: new Date(),
      }));

      // Create reminders individually to capture IDs for audit logging
      let createdCount = 0;
      for (const reminder of reminders) {
        try {
          const createdReminder = await this.prisma.user_reminders.create({
            data: reminder,
          });
          
          // Log to audit table
          await this.prisma.user_reminder_audit_logs.create({
            data: {
              user_reminder_id: createdReminder.id,
              event: "REMINDER_CREATED",
              metadata: {
                channel,
                timestamp: new Date().toISOString(),
              },
            },
          });
          createdCount++;
        } catch (reminderError) {
          // Skip duplicates or other errors and continue
          this.logger.debug(`Failed to create reminder for user ${reminder.user_id}:`, reminderError);
        }
      }

      this.logger.log(
        `✅ Created ${createdCount} reminders (Channel: ${channel})`,
      );
    } catch (error) {
      this.logger.error("Error in reminder creation process:", error);
    }
  }

  /**
   * Determine the channel based on current IST time
   * WhatsApp: 10:00 - 20:00 IST
   * Email: Outside of WhatsApp hours
   */
  private getChannelByTime(): Channel {
    // Get current time in IST
    const now = new Date();
    const istTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
    );
    const hour = istTime.getHours();

    // WhatsApp during 10:00 - 20:00 IST
    if (hour >= 10 && hour < 20) {
      return "WHATSAPP";
    }

    return "EMAIL";
  }

  /**
   * Map onboarding step to template code
   */
  private mapOnboardingStepToTemplate(step: number): TemplateCode {
    const stepToTemplate: Record<OnboardingStep, TemplateCode> = {
      0: "PhoneVerification",
      1: "PhoneVerification",
      2: "EmailVerification",
      3: "LoanApplication",
      5: "LoanApplicationKyc",
      6: "LoanApplicationBankDetails",
      7: "LoanApplicationPersonalInfo",
      8: "LoanApplicationEmploymentInfo",
      9: "LoanApplicationSelfie",
    };

    return stepToTemplate[step as OnboardingStep] || "LoanApplication";
  }

  /**
   * Get creation statistics
   */
  async getCreationStats(): Promise<{
    createdToday: number;
    createdThisHour: number;
    eligibleUsers: number;
  }> {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const hourStart = new Date(now.getTime() - 60 * 60 * 1000);

    const [createdToday, createdThisHour, eligibleUsers] = await Promise.all([
      this.prisma.user_reminders.count({
        where: {
          created_at: {
            gte: todayStart,
          },
        },
      }),
      this.prisma.user_reminders.count({
        where: {
          created_at: {
            gte: hourStart,
          },
        },
      }),
      this.prisma.user.count({
        where: {
          isActive: true,
          onboardingStep: {
            in: [0, 1, 2, 3, 5, 6, 7, 8, 9],
          },
        },
      }),
    ]);

    return {
      createdToday,
      createdThisHour,
      eligibleUsers,
    };
  }
}
