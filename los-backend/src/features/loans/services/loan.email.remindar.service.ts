// email-service.ts
import { PrismaService } from "src/prisma/prisma.service";
import { LoansService } from "./loans.services";
import { BadRequestException, Injectable } from "@nestjs/common";
import { formatDate } from "src/utils";
import * as path from "path";
import * as ejs from "ejs";
import * as dayjs from "dayjs";
import { EmailType } from "../enums/email-type.enum";

// Access the default function from the namespace import
const _dayjs = dayjs.default;
import { EmailService } from "src/core/communication/services/email.service";
import { LoanRemindarEmailLogService } from "./loan.remindar-email.log.service";
import { EmailReminderConfigService } from "./email.reminder.config.service";
import { loan_status_enum } from "@prisma/client";

@Injectable()
export class LoanEmailRemindarService {
  private readonly isDev: boolean = process.env.NODE_ENV !== "production";

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly loansService: LoansService,
    private readonly logService: LoanRemindarEmailLogService,
    private readonly emailReminderConfigService: EmailReminderConfigService
  ) {}

  async processLoanEmails(
    brandId: string,
    loanId?: string,
    context?: {
      ipAddress: string;
      userAgent: string;
      triggerType: string;
      campaignId?: string;
    }
  ) {
    if (!brandId) {
      throw new BadRequestException("Brand ID is required");
    }

    // Get dynamic email rules from database configuration
    const emailRules =
      await this.emailReminderConfigService.getDynamicEmailRules(brandId);

    if (emailRules.length === 0) {
      return {
        message: "No email reminder configurations found for this brand",
        processed: 0,
        successful: 0,
        failed: 0,
      };
    }

    let processed = 0;
    let successful = 0;
    let failed = 0;

    // Get all eligible loan statuses from configurations
    const eligibleStatuses = [
      ...new Set(emailRules.flatMap((rule) => rule.statuses)),
    ];
    console.log(
      `Fetching loans for brand ${brandId} with statuses: ${eligibleStatuses.join(", ")}`
    );
    const loans = await this.prisma.loan.findMany({
      where: {
        status: { in: eligibleStatuses as any },
        id: loanId, // TEMPORARY OVERRIDE FOR TESTING
        brandId: brandId,
        is_email_reminder: true,
      },
      include: {
        user: { include: { userDetails: true, brandSubDomain: true } },
        brand: {
          include: {
            brandDetails: true,
            brandConfig: true,
            brand_sub_domains: {
              where: { isPrimary: true },
            },
          },
        },
        emailLogs: true,
        loanDetails: true,
      },
    });
    console.log(`\nFetched ${loans.length} loans for processing.`);
    for (const loan of loans) {
      console.log(`\nProcessing loan: ${loan.id} - ${loan.formattedLoanId}`);

      if (!loan.loanDetails?.dueDate) {
        console.log(`⛔ Skipping loan ${loan.id}: Missing due date`);
        continue;
      }

      if (loan.brand?.brandConfig?.isUserReminderEmail === false) {
        console.log(
          `⛔ Skipping loan ${loan.id}: User reminder emails disabled by brand config`
        );
        continue;
      }

      // Check if any email has already been sent today
      const emailSentToday = loan.emailLogs.some((log) => {
        const sentAt = _dayjs(log.sentAt);
        const today = _dayjs();
        return sentAt.isSame(today, "day");
      });

      if (emailSentToday) {
        console.log(`⏩ Skipping loan ${loan.id}: Email already sent today`);
        continue;
      }

      // Begin checking rules
      for (const rule of emailRules) {
        console.log(
          `🔍 Evaluating rule: ${rule.emailType} for loan ${loan.id}`
        );

        if (!rule.statuses.includes(loan.status)) {
          console.log(
            `🚫 Rule skipped: Loan status '${loan.status}' not in rule statuses`
          );
          continue;
        }

        if (!rule.condition(loan.loanDetails.dueDate)) {
          console.log(
            `🚫 Rule skipped: Condition failed for due date ${loan.loanDetails.dueDate}`
          );
          continue;
        }

        const emailSent = loan.emailLogs.some((log) => {
          if (log.emailType !== rule.emailType) return false;
          if (rule.frequency === "once") return true;
          if (_dayjs(log.sentAt).isSame(_dayjs(), "day")) return true;
          if (
            _dayjs().format("YYYY-MM-DD") ===
            _dayjs(log.sentAt).format("YYYY-MM-DD")
          )
            return true;
          return false;
        });
        console.log(
          `Checking if email of type ${rule.emailType} already sent: ${emailSent}`
        );
        if (emailSent) {
          console.log(
            `📨 Email for type ${rule.emailType} already sent to loan ${loan.id}, skipping.`
          );
          continue;
        }

        console.log(`✅ Rule matched. Preparing email for loan ${loan.id}`);

        // CRITICAL: Re-check logs in database to prevent race conditions
        const existingLog = await this.prisma.loanEmailLog.findFirst({
          where: {
            loanId: loan.id,
            emailType: rule.emailType,
            sentAt: {
              gte: _dayjs().startOf("day").toDate(),
              lte: _dayjs().endOf("day").toDate(),
            },
          },
        });

        if (existingLog) {
          console.log(
            `⚠️ Log already exists in DB for loan ${loan.id} and type ${rule.emailType}, skipping to prevent duplicate.`
          );
          continue;
        }

        processed++;

        try {
          let amountDue;
          if (loan.status === loan_status_enum.ACTIVE) {
            console.log(`🔢 Fetching current repayment for ACTIVE loan`);
            const currentRepayment = await this.loansService.currentRepayment(
              loan.user.id,
              loan.id,
              _dayjs()
            );
            amountDue = currentRepayment?.totalRepayment || 0;
          } else if (loan.status === loan_status_enum.PARTIALLY_PAID) {
            console.log(
              `🔢 Fetching partial collection for PARTIALLY_PAID loan`
            );
            const partialCollection = await this.loansService.partialCollection(
              loan.userId,
              loanId,
              0,
              _dayjs()
            );
            amountDue = partialCollection?.amount || 0;
          }

          const domain =
            loan.user.brandSubDomain?.subdomain ||
            loan.brand?.brand_sub_domains?.[0]?.subdomain;
          const fullName =
            `${loan.user.userDetails?.firstName || ""} ${loan.user.userDetails?.lastName || ""}`.trim();

          const emailData = {
            customerName: fullName,
            amountDue: amountDue || 0,
            dueDate: loan.loanDetails.dueDate,
            loanId: loan.formattedLoanId,
            paymentLink: `https://${domain}`,
            supportEmail: loan.brand?.brandDetails?.contactEmail,
            brandName: loan.brand?.name,
          };

          const subject = rule.getSubject({
            ...loan,
            ...emailData,
            formattedLoanId: loan.formattedLoanId,
          });

          const body = rule.getBody({
            ...loan,
            ...emailData,
            formattedLoanId: loan.formattedLoanId,
          });

          const templateData = {
            ...emailData,
            dueDate: formatDate(loan.loanDetails.dueDate),
            companyName: loan.brand?.name,
            year: _dayjs().year(),
            isAfterDueDate: _dayjs().isAfter(_dayjs(loan.loanDetails.dueDate)),
          };

          let htmlContent;
          try {
            console.log(`🛠 Attempting to render EJS template...`);
            const templateName = "reminder-email";
            const basePath = path.join(
              process.cwd(),
              "src",
              "templates",
              "web",
              "ejs"
            );
            const templatePath = path.join(basePath, `${templateName}.ejs`);
            htmlContent = await ejs.renderFile(templatePath, templateData);
            console.log(`✅ EJS template rendered successfully.`);
          } catch (templateError) {
            console.error("⚠️ EJS template rendering failed:", templateError);
            htmlContent = body.replace(/\n/g, "<br>");
          }

          let emailResult = null;
          if (!loan.brand?.brandConfig?.isTestReminderEmail) {
            console.log(`📤 Sending reminder email to ${loan.user.email}`);
            emailResult = await this.emailService.sendEmail({
              to: loan.user.email,
              name: fullName,
              subject: subject,
              html: htmlContent,
            });

            const ccEmail = loan.brand?.brandConfig?.ccReminderEmail;
            if (ccEmail) {
              const ccEmails = ccEmail.split(",");
              for (const email of ccEmails) {
                try {
                  console.log(`📤 Sending CC email to ${email.trim()}`);
                  await this.emailService.sendEmail({
                    to: email.trim(),
                    name: "CC Recipient",
                    subject: subject,
                    html: htmlContent,
                  });
                } catch (ccError) {
                  console.error(
                    `❌ Failed to send CC email to ${email.trim()}:`,
                    ccError
                  );
                }
              }
            }
          } else {
            console.log(`🧪 Test mode enabled: Skipping actual email send`);
          }

          const emailSuccess =
            loan.brand?.brandConfig?.isTestReminderEmail || !!emailResult;

          if (emailSuccess) {
            successful++;
            console.log(
              `✅ Email sent successfully for loan ${loan.formattedLoanId}`
            );
          } else {
            failed++;
            console.error(`❌ Email failed for loan ${loan.id}`);
          }

          await this.logService.logEmail({
            loanId: loan.id,
            emailType: rule.emailType,
            success: emailSuccess,
            error: emailSuccess
              ? undefined
              : "Email service returned null/false",
            recipient: loan.user.email,
          });

          console.log(`📝 Email log saved for loan ${loan.id}`);

          // Stop after one successful email per loan per day
          break;
        } catch (error) {
          failed++;
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          console.error(
            `🔥 Exception while sending email for loan ${loan.id}:`,
            error
          );

          await this.logService.logEmail({
            loanId: loan.id,
            emailType: rule.emailType,
            success: false,
            error: errorMessage,
            recipient: loan.user.email,
          });

          console.log(`📝 Error log saved for loan ${loan.id}`);
          break;
        }
      }
    }

    return {
      message: "Loan emails processed successfully",
      total: loans.length,
      processed,
      successful,
      failed,
    };
  }

  // Methods to get logs and stats
  async getEmailLogs(
    brandId: string,
    filters?: {
      loanId?: string;
      success?: boolean;
      limit?: number;
      page?: number;
      dateFrom?: Date;
      dateTo?: Date;
      all?: boolean;
      search?: string;
    }
  ) {
    return this.logService.getLogs(brandId, filters);
  }

  async getEmailStats(brandId: string) {
    return this.logService.getStats(brandId);
  }

  // Send test email for a specific loan to any recipient
  async sendTestEmail(
    brandId: string,
    testData: {
      loanId: string;
      email: string;
      emailType: EmailType;
    }
  ) {
    if (
      !brandId ||
      !testData.loanId ||
      !testData.email ||
      !testData.emailType
    ) {
      throw new BadRequestException(
        "Brand ID, loan ID, email, and email type are required"
      );
    }

    // Get the loan details
    const loan = await this.prisma.loan.findFirst({
      where: {
        formattedLoanId: testData.loanId,
        brandId: brandId,
      },
      include: {
        user: { include: { userDetails: true, brandSubDomain: true } },
        brand: {
          include: {
            brandDetails: true,
            brandConfig: true,
            brand_sub_domains: { where: { isPrimary: true } },
          },
        },
        loanDetails: true,
      },
    });

    if (!loan) {
      throw new BadRequestException(
        `Loan with ID ${testData.loanId} not found`
      );
    }

    if (!loan.loanDetails?.dueDate) {
      throw new BadRequestException(
        `Loan ${testData.loanId} does not have a due date`
      );
    }

    try {
      // Get dynamic email rules for the email type
      const emailRules =
        await this.emailReminderConfigService.getDynamicEmailRules(brandId);
      const rule = emailRules.find((r) => r.emailType === testData.emailType);

      if (!rule) {
        throw new BadRequestException(
          `Email type ${testData.emailType} not configured for this brand`
        );
      }

      // Calculate amount due exactly like in normal flow
      let amountDue = 0;
      if (loan.status === loan_status_enum.ACTIVE) {
        const currentRepayment = await this.loansService.currentRepayment(
          loan.user.id,
          loan.id,
          _dayjs()
        );
        amountDue = Number(currentRepayment?.totalRepayment) || 0;
      } else if (loan.status === loan_status_enum.PARTIALLY_PAID) {
        const partialCollection = await this.loansService.partialCollection(
          loan.userId,
          loan.id,
          0,
          _dayjs()
        );
        amountDue = Number(partialCollection?.amount) || 0;
      } else {
        // For other statuses, default to 0 or try current repayment as fallback
        try {
          const currentRepayment = await this.loansService.currentRepayment(
            loan.user.id,
            loan.id,
            _dayjs()
          );
          amountDue = Number(currentRepayment?.totalRepayment) || 0;
        } catch (repaymentError) {
          console.warn(
            `Could not calculate repayment for loan ${loan.formattedLoanId} with status ${loan.status}:`,
            repaymentError
          );
          amountDue = 0;
        }
      }
      const domain =
        loan.user.brandSubDomain?.subdomain ||
        loan.brand?.brand_sub_domains?.[0]?.subdomain;
      const fullName =
        `${loan.user.userDetails?.firstName || ""} ${loan.user.userDetails?.lastName || ""}`.trim();

      const emailData = {
        customerName: fullName,
        amountDue: amountDue || 0,
        dueDate: loan.loanDetails.dueDate,
        loanId: loan.formattedLoanId,
        paymentLink: `https://${domain}`,
        supportEmail:
          loan.brand?.brandDetails?.contactEmail || "",
        brandName: loan.brand?.name || "",
      };

      const subject = rule.getSubject({
        ...loan,
        ...emailData,
        formattedLoanId: loan.formattedLoanId,
      });

      const body = rule.getBody({
        ...loan,
        ...emailData,
        formattedLoanId: loan.formattedLoanId,
      });

      // Prepare template data for EJS (exactly like normal flow)
      const templateData = {
        ...emailData,
        dueDate: formatDate(loan.loanDetails.dueDate),
        companyName: loan.brand?.name || "",
        year: _dayjs().year(),
        isAfterDueDate: _dayjs().isAfter(_dayjs(loan.loanDetails.dueDate)),
      };

      // Try to use EJS template first, fallback to plain body (exactly like normal flow)
      let htmlContent;
      try {
        const templateName = "reminder-email";
        const basePath = path.join(
          process.cwd(),
          "src",
          "templates",
          "web",
          "ejs"
        );
        const templatePath = path.join(basePath, `${templateName}.ejs`);
        htmlContent = await ejs.renderFile(templatePath, templateData);
      } catch (templateError) {
        // If template doesn't exist, use the body from configuration as HTML
        console.error("EJS template rendering failed:", templateError);
        htmlContent = body.replace(/\n/g, "<br>");
      }

      // Add test email header to distinguish it
      const testHeader = `
        <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; margin-bottom: 20px; border-radius: 4px;">
          <strong>🧪 TEST EMAIL</strong> - This is a test email sent to: ${testData.email}
          <br>Original recipient would be: ${loan.user.email}
          <br>Email Type: ${testData.emailType}
        </div>
      `;
      htmlContent = testHeader + htmlContent;

      // Send test email
      const emailResult = await this.emailService.sendEmail({
        to: testData.email,
        name: fullName,
        subject: `[TEST] ${subject}`,
        html: htmlContent,
      });

      const emailSuccess = !!emailResult;

      // Ensure emailType is never null or undefined
      const logEmailType = testData.emailType || "UNKNOWN_TYPE";

      // Log test email attempt (with special marker)
      await this.logService.logEmail({
        loanId: loan.id,
        emailType: `TEST_${logEmailType}` as EmailType,
        success: emailSuccess,
        error: emailSuccess ? undefined : "Email service returned null/false",
        recipient: testData.email,
      });

      return {
        success: emailSuccess,
        message: emailSuccess
          ? `Test email sent successfully to ${testData.email}`
          : "Failed to send test email",
        loanId: loan.formattedLoanId,
        recipient: testData.email,
        emailType: logEmailType,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        `Failed to send test email for loan ${testData.loanId}:`,
        error
      );

      // Ensure emailType is never null or undefined for error logging
      const logEmailType = testData.emailType || "UNKNOWN_TYPE";

      // Log failed test attempt
      await this.logService.logEmail({
        loanId: loan.id,
        emailType: `TEST_${logEmailType}` as EmailType,
        success: false,
        error: errorMessage,
        recipient: testData.email,
      });

      throw new BadRequestException(
        `Failed to send test email: ${errorMessage}`
      );
    }
  }
}
