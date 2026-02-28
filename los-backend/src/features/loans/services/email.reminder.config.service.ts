import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import {
  CreateEmailReminderConfigDto,
  UpdateEmailReminderConfigDto,
} from "../controllers/email.reminder.config.controller";
import * as dayjs from "dayjs";
import { EmailType, loan_status_enum } from "@prisma/client";

const _dayjs = dayjs.default;
type EmailTemplateConfig = {
  subjectTemplate: string;
  bodyTemplate: string;
  daysBeforeDue: number;
  frequency: 'once' | 'daily';
  loanStatuses: loan_status_enum[];
};

@Injectable()
export class EmailReminderConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfigsByBrand(brandId: string) {
    const configs = await this.prisma.emailReminderConfig.findMany({
      where: { brandId },
      orderBy: { daysBeforeDue: "desc" }, // Sort by days before due (7, 3, 1, -1)
    });

    return {
      configs,
      total: configs.length,
      enabled: configs.filter((c) => c.isEnabled).length,
      disabled: configs.filter((c) => !c.isEnabled).length,
    };
  }

  async getConfigById(brandId: string, configId: string) {
    const config = await this.prisma.emailReminderConfig.findFirst({
      where: {
        id: configId,
        brandId,
      },
    });

    if (!config) {
      throw new NotFoundException("Email reminder configuration not found");
    }

    return config;
  }

  async createConfig(brandId: string, createDto: CreateEmailReminderConfigDto) {
    // Check if reminder type already exists for this brand
    const existing = await this.prisma.emailReminderConfig.findUnique({
      where: {
        brandId_reminderType: {
          brandId,
          reminderType: createDto.reminderType,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Email reminder configuration for ${createDto.reminderType} already exists`,
      );
    }

    return this.prisma.emailReminderConfig.create({
      data: {
        brandId,
        ...createDto,
      },
    });
  }

  async updateConfig(
    brandId: string,
    configId: string,
    updateDto: UpdateEmailReminderConfigDto,
  ) {
    const config = await this.getConfigById(brandId, configId);

    // If changing reminderType, check for duplicates
    if (
      updateDto.reminderType &&
      updateDto.reminderType !== config.reminderType
    ) {
      const existing = await this.prisma.emailReminderConfig.findUnique({
        where: {
          brandId_reminderType: {
            brandId,
            reminderType: updateDto.reminderType,
          },
        },
      });

      if (existing) {
        throw new BadRequestException(
          `Email reminder configuration for ${updateDto.reminderType} already exists`,
        );
      }
    }

    return this.prisma.emailReminderConfig.update({
      where: {
        id: configId,
        brandId,
      },
      data: {
        ...updateDto,
        updatedAt: new Date(),
      },
    });
  }

  async deleteConfig(brandId: string, configId: string) {
    await this.getConfigById(brandId, configId);

    await this.prisma.emailReminderConfig.delete({
      where: {
        id: configId,
        brandId,
      },
    });

    return { message: "Email reminder configuration deleted successfully" };
  }

  async toggleConfig(brandId: string, configId: string) {
    const config = await this.getConfigById(brandId, configId);

    return this.prisma.emailReminderConfig.update({
      where: {
        id: configId,
        brandId,
      },
      data: {
        isEnabled: !config.isEnabled,
        updatedAt: new Date(),
      },
    });
  }


  async getDefaultTemplates(): Promise<Partial<Record<EmailType, EmailTemplateConfig>>> {
    return {
      SEVEN_DAY_REMINDER: {
        subjectTemplate: 'Payment Due Soon - Loan {{loanId}}',
        bodyTemplate:
          `Dear {{customerName}},\n\n` +
          `Your payment for loan {{loanId}} is due in 7 days on {{dueDate}}. Amount due: ₹{{amountDue}}.\n\n` +
          `Please ensure timely payment to avoid penalties.\n\n` +
          `Payment Link: {{paymentLink}}\n\n` +
          `For support, contact: {{supportEmail}}\n\n` +
          `Regards,\nLoan Team`,
        daysBeforeDue: 7,
        frequency: 'once',
        loanStatuses: ['ACTIVE', 'POST_ACTIVE'],
      },
      THREE_DAY_REMINDER: {
        subjectTemplate: 'Payment Due Soon - Loan {{loanId}}',
        bodyTemplate:
          `Dear {{customerName}},\n\n` +
          `Your payment for loan {{loanId}} is due in 3 days on {{dueDate}}. Amount due: ₹{{amountDue}}.\n\n` +
          `Please ensure timely payment to avoid penalties.\n\n` +
          `Payment Link: {{paymentLink}}\n\n` +
          `For support, contact: {{supportEmail}}\n\n` +
          `Regards,\nLoan Team`,
        daysBeforeDue: 3,
        frequency: 'once',
        loanStatuses: ['ACTIVE', 'POST_ACTIVE'],
      },
      ONE_DAY_REMINDER: {
        subjectTemplate: 'Payment Due Tomorrow - Loan {{loanId}}',
        bodyTemplate:
          `Dear {{customerName}},\n\n` +
          `Your payment for loan {{loanId}} is due tomorrow on {{dueDate}}. Amount due: ₹{{amountDue}}.\n\n` +
          `Please ensure timely payment to avoid penalties.\n\n` +
          `Payment Link: {{paymentLink}}\n\n` +
          `For support, contact: {{supportEmail}}\n\n` +
          `Regards,\nLoan Team`,
        daysBeforeDue: 1,
        frequency: 'once',
        loanStatuses: ['ACTIVE', 'POST_ACTIVE'],
      },
      SAME_DAY_REMINDER: {
        subjectTemplate: 'Payment Due Today - Loan {{loanId}}',
        bodyTemplate:
          `Dear {{customerName}},\n\n` +
          `Your payment for loan {{loanId}} is due TODAY on {{dueDate}}. Amount due: ₹{{amountDue}}.\n\n` +
          `Please pay immediately to avoid late payment penalties.\n\n` +
          `Payment Link: {{paymentLink}}\n\n` +
          `For support, contact: {{supportEmail}}\n\n` +
          `Regards,\nLoan Team`,
        daysBeforeDue: 0,
        frequency: 'once',
        loanStatuses: ['ACTIVE', 'POST_ACTIVE'],
      },
      OVERDUE_REMINDER: {
        subjectTemplate: 'URGENT: Overdue Payment - Loan {{loanId}}',
        bodyTemplate:
          `Dear {{customerName}},\n\n` +
          `Your payment for loan {{loanId}} is overdue since {{dueDate}}. Amount due: ₹{{amountDue}}.\n\n` +
          `Please pay immediately to avoid additional penalties and charges.\n\n` +
          `Payment Link: {{paymentLink}}\n\n` +
          `For support, contact: {{supportEmail}}\n\n` +
          `Regards,\nLoan Team`,
        daysBeforeDue: -1,
        frequency: 'daily',
        loanStatuses: ['ACTIVE', 'POST_ACTIVE'],
      },
    };
  }


  async resetToDefaults(brandId: string) {
    // Delete existing configs for this brand
    await this.prisma.emailReminderConfig.deleteMany({
      where: { brandId },
    });

    const defaults = await this.getDefaultTemplates();

    // Create default configurations
    const configs = await Promise.all(
      Object.entries(defaults).map(([reminderType, template]) =>
        this.prisma.emailReminderConfig.create({
          data: {
            brandId,
            reminderType,
            emailType: reminderType as EmailType,
            isEnabled: true,
            ...template,
          },
        }),
      ),
    );

    return {
      message: "Email reminder configurations reset to defaults successfully",
      configs,
      total: configs.length,
    };
  }

  // Method to get dynamic email rules (used by email service)
  async getDynamicEmailRules(brandId: string) {
    const configs = await this.prisma.emailReminderConfig.findMany({
      where: {
        brandId,
        isEnabled: true,
      },
      orderBy: { daysBeforeDue: "desc" },
    });

    return configs.map((config) => ({
      statuses: config.loanStatuses,
      condition: (dueDate: Date) => {
        if (config.daysBeforeDue > 0) {
          // Before due date
          const targetDate = _dayjs().add(config.daysBeforeDue, "day").startOf("day");
          const dueDateDay = _dayjs(dueDate).startOf("day");
          return dueDateDay.isSame(targetDate, "day");
        } else {
          // Overdue
          return _dayjs().isAfter(_dayjs(dueDate), "day");
        }
      },
      frequency: config.frequency as "once" | "daily",
      emailType: config.emailType,
      getSubject: (loan: any) => this.processTemplate(config.subjectTemplate, loan),
      getBody: (loan: any) => this.processTemplate(config.bodyTemplate, loan),
    }));
  }

  private processTemplate(template: string, loan: any): string {    
    // Template variables that can be used
    const variables = {
      loanId: loan.formattedLoanId || loan.id,
      customerName: loan.customerName || "Customer",
      amountDue: loan.amountDue || 0,
      dueDate: loan.dueDate ? _dayjs(loan.dueDate).format("DD/MM/YYYY") : "N/A",
      paymentLink: loan.paymentLink || "",
      supportEmail: loan.supportEmail || "",
      brandName: loan.brandName || "",
    };

    // Replace template variables
    let processed = template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      processed = processed.replace(regex, String(value));
    });

    return processed;
  }
}
