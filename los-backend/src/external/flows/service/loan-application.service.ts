import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { loan_status_enum } from '@prisma/client';
import { AwsAuditLogsSqsService } from '../../../core/aws/sqs/aws-audit-logs-sqs.service';
import * as dayjs from 'dayjs';
const _dayjs = dayjs.default;

@Injectable()
export class LoanApplicationService {
  private readonly logger = new Logger(LoanApplicationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly awsAuditLogsSqsService: AwsAuditLogsSqsService,
  ) {}

  async validateAndCreateLoan(data: {
    phoneNumber: string;
    loanAmount: number;
    loanPurpose: string;
    repaymentDate: string;
  }) {
    // Get user
    const user = await this.prisma.user.findFirst({
      where: { 
        phoneNumber: data.phoneNumber,
        isPhoneVerified: true 
      },
      include: { 
        brand: true
      },
      orderBy: { phoneVerifiedAt: 'desc' },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if user has pending loan
    const pendingLoan = await this.prisma.loan.findFirst({
      where: {
        userId: user.id,
        isActive: true,
        status: {
          in: [
            loan_status_enum.PENDING,
            loan_status_enum.APPROVED,
            loan_status_enum.CREDIT_EXECUTIVE_APPROVED,
            loan_status_enum.SANCTION_MANAGER_APPROVED,
            loan_status_enum.DISBURSED,
            loan_status_enum.ACTIVE,
            loan_status_enum.POST_ACTIVE,
            loan_status_enum.PARTIALLY_PAID,
            loan_status_enum.PAID,
            loan_status_enum.OVERDUE,
            loan_status_enum.DEFAULTED,
          ],
        },
      },
    });

    if (pendingLoan) {
      throw new BadRequestException('You already have an active loan application. Please complete or close it before applying for a new one.');
    }

    // Get brand config
    const brandConfig = await this.prisma.brandConfig.findUnique({
      where: { brandId: user.brandId },
    });

    if (!brandConfig) {
      throw new BadRequestException('Brand configuration not found');
    }

    // Check minimum loan amount
    if (brandConfig.minLoanAmountRequired && data.loanAmount < brandConfig.minLoanAmountRequired) {
      throw new BadRequestException(
        `Minimum loan amount is ₹${brandConfig.minLoanAmountRequired.toLocaleString('en-IN')}`
      );
    }

    // Get loan rule
    const loanRule = await this.prisma.loanRule.findUnique({
      where: {
        brandId_ruleType: {
          brandId: user.brandId,
          ruleType: user.brand.defaultLoanRiskCategory,
        },
      },
      include: { tenures: true },
    });

    if (!loanRule) {
      throw new BadRequestException('No loan rules found for your profile');
    }

    // Validate loan amount
    if (data.loanAmount < loanRule.minAmount || data.loanAmount > loanRule.maxAmount) {
      throw new BadRequestException(
        `Loan amount must be between ₹${loanRule.minAmount.toLocaleString('en-IN')} and ₹${loanRule.maxAmount.toLocaleString('en-IN')}`
      );
    }

    // Validate repayment date
    const repayDate = _dayjs(data.repaymentDate);
    const today = _dayjs().startOf('day');
    const minDate = today.add(loanRule.tenures.minTermDays, 'day');
    const maxDate = today.add(loanRule.tenures.maxTermDays, 'day');

    if (repayDate.isBefore(minDate) || repayDate.isAfter(maxDate)) {
      throw new BadRequestException(
        `Repayment date must be between ${minDate.format('DD MMM YYYY')} and ${maxDate.format('DD MMM YYYY')}`
      );
    }

    // Check completed loan count
    const completedLoanCount = await this.prisma.loan.count({
      where: {
        userId: user.id,
        isActive: true,
        status: loan_status_enum.COMPLETED,
      },
    });

    if (completedLoanCount >= loanRule.maxCompleteLoanCount) {
      throw new BadRequestException(
        `You have reached the maximum number of loans allowed (${completedLoanCount} of ${loanRule.maxCompleteLoanCount})`
      );
    }

    // Calculate loan details
    const tenureDays = repayDate.diff(today, 'day') + 1;

    // Create loan with loan details
    const loan = await this.prisma.loan.create({
      data: {
        userId: user.id,
        brandId: user.brandId,
        amount: data.loanAmount,
        purpose: data.loanPurpose,
        loan_due_date: repayDate.toDate(),
        loan_tenure_days: tenureDays,
        ruleType: loanRule.ruleType,
        status: loan_status_enum.PENDING,
        isActive: true,
        loanDetails: {
          create: {
            type: 'PAYDAY_LOAN',
            durationDays: tenureDays,
            dueDate: repayDate.toDate(),
          },
        },
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { onboardingStep: 12 },
    });

    // Track onboarding step 12
    try {
      await this.prisma.onboardingJourney.upsert({
        where: {
          userId_stepNumber: {
            userId: user.id,
            stepNumber: 12,
          },
        },
        update: { updatedAt: new Date() },
        create: {
          userId: user.id,
          stepNumber: 12,
          brandId: user.brandId,
          reason: 'Loan application submitted via WhatsApp',
        },
      });
    } catch (error) {
      this.logger.error(`Failed to track step 12: ${error.message}`);
    }

    if (this.awsAuditLogsSqsService) {
      await this.awsAuditLogsSqsService.sendToAuditLogsQueue({
        userId: user.id,
        brandId: user.brandId,
        message: 'User submitted loan application via WhatsApp',
        type: 'LoanApplication',
        platformType: 'WHATSAPP',
        loanId: loan.id,
        context: {
          step: 'LOAN_APPLICATION',
          loanAmount: data.loanAmount,
          loanPurpose: data.loanPurpose,
        },
      });
    }

    this.logger.log(`Loan created: ${loan.id} for user ${user.id}`);

    return {
      success: true,
      message: 'Loan application submitted successfully',
      loanId: loan.id,
    };
  }
}
