import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "src/prisma/prisma.service";
import { LoanEmailRemindarService } from "src/features/loans/services/loan.email.remindar.service";
import { CcReminderService } from "src/features/ccReminder/cc-reminder.service";
import { PartnerDashboardService } from "src/app/partner/dashboard/partner.dashboard.service";
import { CronGuardService } from "src/common/guards/cron-guard.service";

@Injectable()
export class EmailReminderCronService {
  private readonly logger = new Logger(EmailReminderCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly loanEmailReminderService: LoanEmailRemindarService,
    private readonly ccReminderService: CcReminderService,
    private readonly partnerDashboardService: PartnerDashboardService,
    private readonly cronGuardService: CronGuardService,
  ) {}

  @Cron("0 6 * * *", {
    name: "email-reminder-daily-6am",
    timeZone: "Asia/Kolkata",
  })
  async handleEmailReminders6Hourly() {
    // Guard: Only run on cron worker
    if (!this.cronGuardService.isCronEnabled()) {
      return;
    }

    this.logger.log("🕒 Starting 6-hourly email reminder cron job");

    try {
      const brands = await this.prisma.brand.findMany({
        where: {
          onPartner: true,
          brandConfig: { isUserReminderEmail: true },
        },
        select: {
          id: true,
          name: true,
          onPartner: true,
          brandConfig: {
            select: { isUserReminderEmail: true },
          },
        },
      });

      this.logger.log(
        `✅ Found ${brands.length} active brands for email reminders`
      );

      let totalProcessed = 0;
      let totalSuccessful = 0;
      let totalFailed = 0;

      for (const brand of brands) {
        this.logger.log(
          `📬 Processing email reminders for brand: ${brand.name} (${brand.id})`
        );

        try {
          const result = await this.loanEmailReminderService.processLoanEmails(
            brand.id,
            undefined,
            {
              ipAddress: "cron-job",
              userAgent: "email-reminder-cron",
              triggerType: "automated-cron",
            }
          );

          totalProcessed += result.processed || 0;
          totalSuccessful += result.successful || 0;
          totalFailed += result.failed || 0;

          this.logger.log(
            `✅ Brand ${brand.name}: Processed=${result.processed}, Success=${result.successful}, Failed=${result.failed}`
          );
        } catch (error) {
          this.logger.error(
            `❌ Error processing emails for brand ${brand.name}:`,
            error
          );
        }
      }

      this.logger.log(
        `🎉 6-hourly email reminder cron completed - Total: Processed=${totalProcessed}, Success=${totalSuccessful}, Failed=${totalFailed}`
      );
    } catch (error) {
      this.logger.error("❌ Error in 6-hourly email reminder cron job:", error);
    }
  }

  @Cron("0 8 * * *", {
    name: "cc-reminder-daily-9am",
    timeZone: "Asia/Kolkata",
  })
  async handleCcReminderDaily() {
    // Guard: Only run on cron worker
    if (!this.cronGuardService.isCronEnabled()) {
      return;
    }

    this.logger.log("🔐 Starting CC reminder daily cron job (9 AM)");

    try {
      const brandConfigs = await this.prisma.brandConfig.findMany({
        where: {
          isCCReminderEmail: true,
        },
        select: {
          brandId: true,
          ccReminderEmail: true,
          isTestReminderEmail: true,
        },
      });

      this.logger.log(
        `✅ Found ${brandConfigs.length} brand configs for CC reminders`
      );

      const allResults = [];

      for (const config of brandConfigs) {
        let recipients: string[] = [];

        if (config.ccReminderEmail) {
          if (config.isTestReminderEmail) {
            this.logger.log("🧪 Test config detected. Using test email...");
            recipients.push("sameer@8byte.ai");
          } else {
            recipients.push(
              ...config.ccReminderEmail.split(",").map((email) => email.trim())
            );
          }
        }

        if (recipients.length === 0) {
          this.logger.warn(
            `⚠️ No recipients found for brand ${config.brandId}, skipping.`
          );
          continue;
        }

        this.logger.log(
          `📬 Sending CC reminder reports to ${recipients.length} recipients for brand ${config.brandId}`
        );

        try {
          // Send Disbursed Loan report
          this.logger.log(
            `📤 Sending Disbursed Loan report for brand ${config.brandId}...`
          );
          const disbursedLoanResult =
            await this.ccReminderService.sendYesterdayDisbursedLoanEmail(
              recipients,
              config.brandId
            );

          // Send Dashboard report
          this.logger.log(
            `📤 Sending Dashboard report for brand ${config.brandId}...`
          );
          const dashboardResult =
            await this.partnerDashboardService.sendYesterdayDashboardReport(
              recipients,
              config.brandId
            );

          // Send Login report
          this.logger.log(
            `📤 Sending Login report for brand ${config.brandId}...`
          );
          const loginResult =
            await this.ccReminderService.sendYesterdayCcReminderEmail(
              recipients,
              config.brandId
            );

          // Send Loan Due report
          this.logger.log(
            `📤 Sending Loan Due report for brand ${config.brandId}...`
          );
          const loanResult = await this.ccReminderService.sendLoanDueEmail(
            recipients,
            {
              dueDateFilter: "all",
              brandId: config.brandId,
            }
          );

          // Send Payment report
          this.logger.log(
            `📤 Sending Payment report for brand ${config.brandId}...`
          );
          const paymentResult =
            await this.ccReminderService.sendYesterdayPaymentEmail(
              recipients,
              config.brandId
            );

          const allSuccess =
            disbursedLoanResult.success &&
            dashboardResult.success &&
            loginResult.success &&
            loanResult.success &&
            paymentResult.success;

          allResults.push({
            brandId: config.brandId,
            recipients,
            disbursedLoanResult,
            dashboardResult,
            loginResult,
            loanResult,
            paymentResult,
            success: allSuccess,
          });

          if (allSuccess) {
            this.logger.log(
              `✅ All CC reminder reports sent successfully for brand ${config.brandId}`
            );
          } else {
            this.logger.error(
              `❌ Some CC reminder reports failed for brand ${config.brandId}`
            );
          }
        } catch (error) {
          this.logger.error(
            `❌ Error sending CC reminder reports for brand ${config.brandId}:`,
            error
          );
          allResults.push({
            brandId: config.brandId,
            recipients,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      this.logger.log(
        `🎉 CC reminder cron completed - Processed ${allResults.length} brands`
      );
      return { success: true, results: allResults };
    } catch (error) {
      this.logger.error("❌ Error in CC reminder cron job:", error);
      throw error;
    }
  }

  /**
   * Manual trigger for testing - can be called via API or manually
   * Includes loan reminders, CC dashboard, and CC reminder emails
   */
  async triggerManualEmailReminders(brandId?: string) {
    this.logger.log("🔧 Manual email reminder trigger started");

    try {
      if (brandId) {
        // Process for specific brand
        const results: any = {
          brandId,
          loanReminders: null,
          ccReminders: null,
        };

        // 1. Process loan reminders
        this.logger.log(`📬 Processing loan reminders for brand ${brandId}...`);
        results.loanReminders =
          await this.loanEmailReminderService.processLoanEmails(
            brandId,
            undefined,
            {
              ipAddress: "manual-trigger",
              userAgent: "manual-trigger",
              triggerType: "manual",
            }
          );

        // 2. Process CC dashboard email
        // const brandConfig = await this.prisma.brandConfig.findUnique({
        //   where: { brandId },
        //   select: {
        //     isCCReminderEmail: true,
        //     ccReminderEmail: true,
        //     isTestReminderEmail: true,
        //   },
        // });

        // if (brandConfig?.isCCReminderEmail && brandConfig?.ccReminderEmail) {
        //   let recipients: string[] = [];
        //   if (brandConfig.isTestReminderEmail) {
        //     recipients.push('sameer@8byte.ai');
        //   } else {
        //     recipients.push(...brandConfig.ccReminderEmail.split(',').map((email) => email.trim()));
        //   }

        //   // Send CC Reminder reports (Disbursed Loan, Dashboard, Login, Loan Due, Payment)
        //   this.logger.log(`� Sending CC reminder reports for brand ${brandId}...`);
        //   const disbursedLoanResult = await this.ccReminderService.sendYesterdayDisbursedLoanEmail(
        //     recipients,
        //     brandId
        //   );
        //   const dashboardResult = await this.partnerDashboardService.sendYesterdayDashboardReport(
        //     brandId,
        //     recipients
        //   );
        //   const loginResult = await this.ccReminderService.sendYesterdayCcReminderEmail(
        //     recipients,
        //     brandId
        //   );
        //   const loanResult = await this.ccReminderService.sendLoanDueEmail(recipients, {
        //     dueDateFilter: 'all',
        //     brandId,
        //   });
        //   const paymentResult = await this.ccReminderService.sendYesterdayPaymentEmail(
        //     recipients,
        //     brandId
        //   );

        //   results.ccReminders = {
        //     disbursedLoanResult,
        //     dashboardResult,
        //     loginResult,
        //     loanResult,
        //     paymentResult,
        //     allSuccess:
        //       disbursedLoanResult.success &&
        //       dashboardResult.success &&
        //       loginResult.success &&
        //       loanResult.success &&
        //       paymentResult.success,
        //   };
        // } else {
        //   this.logger.log(`⚠️ CC reminder emails not enabled for brand ${brandId}, skipping CC reports`);
        // }

        this.logger.log(`✅ Manual trigger completed for brand ${brandId}`);
        return results;
      } else {
        // Process for all brands
        const brands = await this.prisma.brand.findMany({
          where: {
            onPartner: true,
            brandConfig: { isUserReminderEmail: true },
          },
          select: {
            id: true,
            name: true,
          },
        });

        let totalProcessed = 0;
        let totalSuccessful = 0;
        let totalFailed = 0;
        const allResults = [];

        for (const brand of brands) {
          this.logger.log(
            `📬 Processing all emails for brand ${brand.name} (${brand.id})...`
          );

          const brandResults: any = {
            brandId: brand.id,
            brandName: brand.name,
            loanReminders: null,
            ccReminders: null,
          };

          // 1. Process loan reminders
          try {
            const result =
              await this.loanEmailReminderService.processLoanEmails(
                brand.id,
                undefined,
                {
                  ipAddress: "manual-trigger",
                  userAgent: "manual-trigger",
                  triggerType: "manual",
                }
              );

            totalProcessed += result.processed || 0;
            totalSuccessful += result.successful || 0;
            totalFailed += result.failed || 0;
            brandResults.loanReminders = result;
          } catch (error) {
            this.logger.error(
              `❌ Error processing loan reminders for brand ${brand.name}:`,
              error
            );
            brandResults.loanReminders = {
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }

          // 2. Process CC emails
          // try {
          //   const brandConfig = await this.prisma.brandConfig.findUnique({
          //     where: { brandId: brand.id },
          //     select: {
          //       isCCReminderEmail: true,
          //       ccReminderEmail: true,
          //       isTestReminderEmail: true,
          //     },
          //   });

          //   if (brandConfig?.isCCReminderEmail && brandConfig?.ccReminderEmail) {
          //     let recipients: string[] = [];
          //     if (brandConfig.isTestReminderEmail) {
          //       recipients.push('sameer@8byte.ai');
          //     } else {
          //       recipients.push(...brandConfig.ccReminderEmail.split(',').map((email) => email.trim()));
          //     }

          //     // Send CC Reminder reports (Disbursed Loan, Dashboard, Login, Loan Due, Payment)
          //     const disbursedLoanResult = await this.ccReminderService.sendYesterdayDisbursedLoanEmail(
          //       recipients,
          //       brand.id
          //     );
          //     const dashboardResult = await this.partnerDashboardService.sendYesterdayDashboardReport(
          //       brand.id,
          //       recipients
          //     );
          //     const loginResult = await this.ccReminderService.sendYesterdayCcReminderEmail(
          //       recipients,
          //       brand.id
          //     );
          //     const loanResult = await this.ccReminderService.sendLoanDueEmail(recipients, {
          //       dueDateFilter: 'all',
          //       brandId: brand.id,
          //     });
          //     const paymentResult = await this.ccReminderService.sendYesterdayPaymentEmail(
          //       recipients,
          //       brand.id
          //     );

          //     brandResults.ccReminders = {
          //       disbursedLoanResult,
          //       dashboardResult,
          //       loginResult,
          //       loanResult,
          //       paymentResult,
          //       allSuccess:
          //         disbursedLoanResult.success &&
          //         dashboardResult.success &&
          //         loginResult.success &&
          //         loanResult.success &&
          //         paymentResult.success,
          //     };
          //   }
          // } catch (error) {
          //   this.logger.error(`❌ Error processing CC emails for brand ${brand.name}:`, error);
          //   brandResults.ccReminders = { error: error instanceof Error ? error.message : 'Unknown error' };
          // }

          allResults.push(brandResults);
        }

        this.logger.log(
          `✅ Manual trigger completed for all brands: Processed=${totalProcessed}, Success=${totalSuccessful}, Failed=${totalFailed}`
        );
        return {
          processed: totalProcessed,
          successful: totalSuccessful,
          failed: totalFailed,
          details: allResults,
        };
      }
    } catch (error) {
      this.logger.error("❌ Error in manual email reminder trigger:", error);
      throw error;
    }
  }
}
