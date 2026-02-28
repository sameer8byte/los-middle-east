import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from "@nestjs/common";
import {
  agreement_status_enum,
  ChargeMode,
  closingTypeEnum,
  FeeType,
  FeeValueType,
  loan_charge_config,
  loan_charge_taxes,
  loan_status_enum,
  LoanRule,
  LoanTypeEnum,
  notification_priority_enum,
  OpsApprovalStatusEnum,
  PaymentMethodEnum,
  PenaltyType,
  platform_type,
  TaxType,
  Tenure,
  TransactionStatusEnum,
  TransactionTypeEnum,
} from "@prisma/client";
import * as dayjs from "dayjs";
const _dayjs = dayjs.default;
import Decimal from "decimal.js";
import { PrismaService } from "src/prisma/prisma.service";
import { NotificationService } from "src/features/notification/notification.service";
import { AutoAllocationLoanService } from "src/features/autoAllocation/services/loan.autoAllocation.service";
import { AwsAuditLogsSqsService } from "src/core/aws/sqs/aws-audit-logs-sqs.service";
import { generateReceiptId } from "src/utils";
import { v4 as uuid } from "uuid";
import { PermissionsEnum } from "src/constant/permissions";
import { LoanRepaymentTypeEnum, UserStatusEnum } from "src/constant/enum";
import {
  LoanDecisionType,
  ReloanAutomationService,
  ReloanEligibilityContext,
  ReloanEligibilityResult,
} from "./reloan.automation.service";

export interface LoanCalculationResponse {
  amount: number;
  loanDetails: LoanDetails;
  disbursement: Disbursement;
  repayment: Repayment;
  costSummary: CostSummary;
  earlyRepaymentDiscount: EarlyRepaymentDiscount;
  penalty: Penalty[];
}

export interface LoanDetails {
  principal: number;
  type: LoanTypeEnum;
  durationDays: number;
  dueDate: string;
  postActiveDate: Date;
  grossPeriod: number;
  minActiveTermDays: number;
  maxActiveTermDays: number;
  minActiveRepaymentDays: number;
  minPostActiveTermDays: number;
  allowPrepayment: boolean;
}

export interface Disbursement {
  grossAmount: number;
  totalDeductions: number;
  netAmount: number;
  processing_fee: number;
  deductions: Deduction[];
}

export interface Deduction {
  type: FeeType;
  calculation: ChargeCalculation;
  chargeMode: ChargeMode;
  isRecurringDaily: boolean;
  total: number;
  taxes: Tax[];
}

export interface ChargeCalculation {
  valueType: FeeValueType;
  chargeValue: number;
  baseAmount: number;
  taxAmount: number;
}

export interface Repayment {
  totalObligation: number;
  totalFees: number;
  feeBreakdown: FeeBreakdown[];
}

export interface FeeBreakdown {
  type: FeeType;
  calculation: ChargeCalculation;
  chargeMode: ChargeMode;
  isRecurringDaily: boolean;
  total: number;
  taxes: Tax[];
}

export interface Tax {
  type: TaxType;
  chargeValue: number;
  taxAmount: number;
  isInclusive: boolean;
  valueType: FeeValueType;
}

export interface CostSummary {
  totalTaxes: number;
  effectiveAPR: number;
}

export interface EarlyRepaymentDiscount {
  totalAmount: string; // or Decimal if you're parsing to Decimal
}

export interface Penalty {
  type: PenaltyType;
  valueType: FeeValueType;
  chargeValue: number;
  tax: {
    taxType: TaxType;
    taxChargeValue: number;
    taxValueType: FeeValueType; // allow empty string here as per sample
    isTaxInclusive: boolean;
  };
}

@Injectable()
export class LoansService {
  private dec(value: number | string): Decimal {
    return new Decimal(value);
  }
  private readonly logger = new Logger(LoansService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly autoAllocationLoanService: AutoAllocationLoanService,
    private readonly reloanAutomationService: ReloanAutomationService,
    @Optional() private readonly awsAuditLogsSqsService: AwsAuditLogsSqsService,
  ) {}

  async getUserLoansCredibility(userId: string) {
    if (!userId) {
      throw new UnauthorizedException("User ID is required");
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        brandId: true,
      },
    });
    const brand = await this.prisma.brand.findUnique({
      where: { id: user?.brandId || "" },
      select: {
        id: true,
        name: true,
        defaultLoanRiskCategory: true,
      },
    });
    const brandConfig = await this.prisma.brandConfig.findUnique({
      where: {
        brandId: user?.brandId || "",
      },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    if (!brand.defaultLoanRiskCategory) {
      throw new BadRequestException(
        "Your profile is under review. Try again later.",
      );
    }

    // Check if user already has a pending loan
    const pendingLoan = await this.prisma.loan.findFirst({
      where: {
        userId,
        isActive: true,
        status: {
          notIn: [loan_status_enum.CANCELLED],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        userId: true,
        ruleType: true,
        status: true,
        amount: true,
        closingType: true,
        closureDate: true,
        disbursementDate: true,
        agreement: {
          select: {
            id: true,
            status: true,
          },
        },
        isMigratedloan: true,
        loanDetails: {
          select: {
            dueDate: true,
          },
        },
      },
    });
    if (
      pendingLoan &&
      (
        [
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
        ] as readonly loan_status_enum[]
      ).includes(pendingLoan?.status)
    ) {
      let workflowUrl = null;
      const statusStr = String(pendingLoan.status);
      if (
        [
          String(loan_status_enum.SANCTION_MANAGER_APPROVED),
          String(loan_status_enum.APPROVED),
        ].includes(statusStr)
      ) {
        const loanAgreement = await this.prisma.loanAgreement.findFirst({
          where: {
            loanId: pendingLoan.id,
            status: agreement_status_enum.SENT,
          },
          select: {
            id: true,
          },
        });

        if (loanAgreement) {
          const loanAgreementReference =
            await this.prisma.loanAgreementReference.findFirst({
              where: {
                loanAgreementId: loanAgreement.id,
              },
              select: {
                id: true,
                provider: true,
              },
            });

          if (loanAgreementReference) {
            if (loanAgreementReference.provider === "SIGNZY") {
              const esignStatus =
                await this.prisma.signzy_some_table.findUnique({
                  where: {
                    loanAgreementReferenceId: loanAgreementReference.id,
                  },
                });
              workflowUrl = esignStatus?.workflowUrl || null;
            } else if (loanAgreementReference.provider === "DIGITAP") {
              const esignStatus =
                await this.prisma.digitap_esign_some_table.findUnique({
                  where: {
                    loanAgreementReferenceId: loanAgreementReference.id,
                  },
                });
              workflowUrl = esignStatus?.workflowUrl || null;
            }
          }
        }
      }

      return {
        id: null,
        ruleType: null,
        minAmount: null,
        maxAmount: null,
        tenures: [],
        isAllowed: false,
        loan: pendingLoan,
        workflowUrl,
      };
    }
    const loanRules = await this.prisma.loanRule.findUnique({
      where: {
        brandId_ruleType: {
          brandId: user.brandId,
          ruleType: pendingLoan?.ruleType || brand.defaultLoanRiskCategory,
        },
      },
      select: {
        id: true,
        ruleType: true,
        minAmount: true,
        maxAmount: true,
        maxCompleteLoanCount: true,
        tenures: {
          select: {
            id: true,
            maxTermDays: true,
            minTermDays: true,
          },
        },
      },
    });
    let reloanAutomationResult: ReloanEligibilityResult = null;
    let suggestedDueDate: Date = null;
    if (pendingLoan && brandConfig.is_automated_reloan) {
      const aaAvailability = await this.prisma.aa_consent_requests.findFirst({
        where: {
          userId,
          brandId: user.brandId,
          consentStatus: "ACTIVE",
        },
      });
      const previousDueDate = pendingLoan.loanDetails?.dueDate;
      suggestedDueDate = await this.getNextDueDateWithMinGap(
        previousDueDate,
        loanRules.tenures?.minTermDays,
      );
      reloanAutomationResult =
        await this.reloanAutomationService.evaluateReloanEligibility({
          userId,
          brandId: user.brandId,
          previousLoanId: pendingLoan.id,
          previousDisbursementDate: pendingLoan.disbursementDate,
          previousDueDate: pendingLoan.loanDetails?.dueDate,
          previousClosureDate: pendingLoan.closureDate,
          previousClosureStatus: pendingLoan.closingType,
          previousLoanStatus: pendingLoan.status,
          previousLoanAmount: pendingLoan.amount,
          requestLoanAmount: pendingLoan.amount,
          requestDueDate: suggestedDueDate,
          aa_availability: !!aaAvailability,
          is_migrated_loan: pendingLoan.isMigratedloan,
          loan_rule_max_term_days: loanRules.tenures.maxTermDays,
          loan_rule_min_term_days: loanRules.tenures.minTermDays,
          loan_rule_type: loanRules.ruleType,
        });
    }
    return {
      id: loanRules.id,
      ruleType: loanRules.ruleType,
      minAmount: loanRules.minAmount,
      maxAmount: loanRules.maxAmount,
      suggestedAmount: reloanAutomationResult?.eligible
        ? pendingLoan.amount
        : null, // You can implement logic to calculate suggested amount based on user's loan history and creditworthiness
      suggestedDueDate: reloanAutomationResult?.eligible
        ? suggestedDueDate
        : null,
      tenures: loanRules.tenures,
      isAllowed: reloanAutomationResult
        ? reloanAutomationResult.eligible
        : true,
      loan:
        reloanAutomationResult && !reloanAutomationResult.eligible
          ? pendingLoan
          : null,
      workflowUrl: null,
      maxCompleteLoanCount: loanRules.maxCompleteLoanCount || 0,
      reloanAutomationResult,
    };
  }
  async getNextDueDateWithMinGap(
    dueDateInput: string | Date,
    minDays: number = 15,
  ) {
    const today = _dayjs().startOf("day");
    const dueDate = _dayjs(dueDateInput).startOf("day");

    const minAllowedDate = today.add(minDays, "day");

    // Create next same calendar day in current month
    let next = today.date(dueDate.date());

    // If that date already passed this month → move to next month
    if (next.isSame(today) || next.isBefore(today)) {
      next = next.add(1, "month");
    }

    // Ensure minimum gap of 15 days
    if (next.isBefore(minAllowedDate)) {
      next = next.add(1, "month");
    }

    return next.toDate(); // return JS Date for Prisma
  }
  async getLoanRuleTenures(brandId: string) {
    if (!brandId) {
      throw new BadRequestException("Brand ID is required");
    }

    const loanRules = await this.prisma.loanRule.findMany({
      where: {
        brandId,
      },
      include: {
        tenures: {
          include: {
            loan_charge_config: {
              include: {
                loan_charge_taxes: true,
              },
            },
          },
        },
      },
    });

    if (!loanRules || loanRules.length === 0) {
      throw new NotFoundException("No loan rules found for this brand");
    }

    return loanRules;
  }

  async calculateRepayment({
    userId,
    requestAmount,
    tenureId,
    requestedDueDate = null,
    loanId = null,
  }: {
    userId: string;
    requestAmount: number;
    tenureId: string;
    requestedDueDate: string | null;
    loanId: string | null;
  }): Promise<LoanCalculationResponse> {
    if (!userId || !requestAmount || !tenureId) {
      throw new BadRequestException("All parameters are required");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employment: true },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const tanure = await this.prisma.tenure.findUnique({
      where: {
        id: tenureId,
      },
      include: {
        loanRule: true, // Assuming tenure has a relation to LoanRule
      },
    });

    if (!tanure?.loanRule?.ruleType) {
      throw new NotFoundException(
        `Loan rule not found for the user ${userId}-${tanure?.loanRule?.ruleType}`,
      );
    }

    // Get applicable loan rules
    const loanRule = await this.prisma.loanRule.findUnique({
      where: {
        brandId_ruleType: {
          brandId: user.brandId,
          ruleType: tanure.loanRule.ruleType,
        },
      },
      include: { tenures: { where: { id: tenureId } } },
    });
    if (!loanRule) {
      throw new NotFoundException(
        `Loan rule not found for the user ${userId}-${tanure.loanRule.ruleType}`,
      );
    }
    const decimalAmount = this.dec(requestAmount);
    const min = this.dec(loanRule.minAmount);
    const max = this.dec(loanRule.maxAmount);

    if (decimalAmount.lt(min) || decimalAmount.gt(max)) {
      throw new BadRequestException(
        // cuuurent am

        `Amount must be between ${min.toNumber()} and ${max.toNumber()}-current amount: ${decimalAmount.toNumber()}`,
      );
    }

    // Get selected tenure and validate
    const selectedTenure = loanRule.tenures;
    if (!selectedTenure) throw new NotFoundException("Tenure not found");
    // loan penalty
    const penalty = await this.prisma.loanPenalty.findMany({
      where: {
        loanRuleId: loanRule.id,
        tenureId: selectedTenure.id,
      },
    });

    const loan = loanId
      ? await this.prisma.loan.findUnique({
          where: { id: loanId },
        })
      : null;

    if (
      requestedDueDate &&
      loan?.id &&
      loan.status &&
      (
        [
          loan_status_enum.PENDING,
          loan_status_enum.CREDIT_EXECUTIVE_APPROVED,
        ] as loan_status_enum[]
      ).includes(loan.status)
    ) {
      const disbursementDate = _dayjs(loan.disbursementDate, "YYYY-MM-DD");
      const minPostActiveTermDays = loanRule.tenures.minTermDays || 0;
      const maxActiveTermDays = loanRule.tenures.maxTermDays || 0;
      const requestedDueDateObj = _dayjs(requestedDueDate, "YYYY-MM-DD");
      if (
        requestedDueDateObj.isBefore(
          disbursementDate.add(minPostActiveTermDays, "day"),
        ) ||
        requestedDueDateObj.isAfter(
          disbursementDate.add(maxActiveTermDays, "day"),
        )
      ) {
        throw new BadRequestException(
          `Requested due date must be between ${disbursementDate
            .add(minPostActiveTermDays, "day")
            .format("YYYY-MM-DD")} and ${disbursementDate
            .add(maxActiveTermDays, "day")
            .format("YYYY-MM-DD")}`,
        );
      }
    }

    // Calculate due date and days
    const { dueDate, daysUntilRepayment } = this.calculateDueDate(
      user?.employment?.expectedDateOfSalary || 7, // Default to 7 if not set
      loan?.disbursementDate || null, // Use disbursement date if available
      selectedTenure?.minTermDays || 25, // Default to 25 if not set
      selectedTenure?.maxTermDays || 40, // Default to 40 if not set
      requestedDueDate || null,
    );

    // Process fees and calculate financial components
    const {
      charges,
      totalInclusive,
      totalExclusive,
      totalTaxes,
      earlyRepaymentDiscount,
    } = await this.processFeesAndCharges(
      loanRule,
      selectedTenure,
      decimalAmount,
      daysUntilRepayment,
    );
    const netDisbursed = decimalAmount.sub(totalInclusive);
    const totalObligation = decimalAmount.add(totalExclusive);
    return {
      amount: decimalAmount.toNumber(),
      loanDetails: {
        principal: decimalAmount.toNumber(),
        type: selectedTenure.loan_type,
        durationDays: daysUntilRepayment,
        dueDate: dueDate.format("YYYY-MM-DD"),
        postActiveDate: _dayjs(dueDate)
          .add(selectedTenure.minPostActiveTermDays, "day")
          .toDate(),
        grossPeriod: selectedTenure.gracePeriod || 0, // Assuming gracePeriod is in days
        minActiveTermDays: selectedTenure.minTermDays,
        minActiveRepaymentDays: selectedTenure.minRepaymentDays || 0, // Optional field for minimum repayment days
        maxActiveTermDays: selectedTenure.maxTermDays, // New field added
        minPostActiveTermDays: selectedTenure.minPostActiveTermDays,
        allowPrepayment: selectedTenure.allowPrepayment,
      },
      disbursement: {
        grossAmount: decimalAmount.toNumber(),
        totalDeductions: totalInclusive.toNumber(),
        netAmount: netDisbursed.toNumber(),
        processing_fee: totalInclusive.toNumber(),
        deductions: charges
          .filter((c) => c.chargeMode === ChargeMode.INCLUSIVE)
          .map((c) => this.formatCharge(c)),
      },
      repayment: {
        totalObligation: totalObligation.toNumber(),
        totalFees: totalExclusive.toNumber(),
        feeBreakdown: charges
          .filter((c) => c.chargeMode === ChargeMode.EXCLUSIVE)
          .map((c) => this.formatCharge(c)),
      },
      costSummary: {
        // decimal values rounded to 2 decimal places
        totalTaxes: totalTaxes.toDecimalPlaces(2).toNumber(),
        effectiveAPR: this.calculateAPR(
          totalExclusive,
          decimalAmount,
          daysUntilRepayment,
          netDisbursed,
          totalInclusive,
          totalTaxes,
        ),
      },
      earlyRepaymentDiscount,
      penalty: penalty.map((p) => ({
        type: p.type,
        valueType: p.valueType,
        chargeValue: p.chargeValue,
        tax: {
          taxType: p.taxType,
          taxChargeValue: p.taxChargeValue,
          taxValueType: p.taxValueType,
          isTaxInclusive: p.isTaxInclusive,
        },
      })),
    };
  }
  private calculateDueDate(
    expectedDateOfSalary: number,
    disbursementDate: Date | null = null,
    minTermDays = 7,
    maxTermDays = 40,
    manualDueDate: string | null = null,
  ) {
    let finalExpectedDateOfSalary = expectedDateOfSalary;

    // Validate expected date in this month
    const isValidThisMonth =
      _dayjs().date(finalExpectedDateOfSalary).date() ===
      finalExpectedDateOfSalary;

    // Validate expected date in next month
    const isValidNextMonth =
      _dayjs().add(1, "month").date(finalExpectedDateOfSalary).date() ===
      finalExpectedDateOfSalary;

    if (!isValidThisMonth || !isValidNextMonth) {
      finalExpectedDateOfSalary = 28;
    }
    const today = disbursementDate
      ? _dayjs(disbursementDate).startOf("day")
      : _dayjs().startOf("day");
    let dueDate: dayjs.Dayjs;

    // Handle manual due date
    if (manualDueDate) {
      const manual = _dayjs(manualDueDate).startOf("day");
      if (!manual.isValid()) {
        throw new BadRequestException("Invalid manual due date");
      }
      const daysDiff = manual.diff(today, "day") + 1;
      if (daysDiff < minTermDays || daysDiff > maxTermDays) {
        throw new BadRequestException(
          `Please select a due date between ${minTermDays} and ${maxTermDays} days from today ` +
            `(${today
              .add(minTermDays - 1, "day")
              .format("YYYY-MM-DD")} to ${today
              .add(maxTermDays - 1, "day")
              .format("YYYY-MM-DD")}).`,
        );
      }
      dueDate = manual.endOf("day");
    } else {
      // Auto-calculate due date
      function getNextTargetDate(day: number): dayjs.Dayjs {
        // Try setting the date to this month
        let target = today.date(day);
        if (target.date() !== day) {
          // If dayjs rolled over, it's an invalid day (e.g., Feb 30)
          throw new BadRequestException(
            `Invalid finalExpectedDateOfSalary: ${day}`,
          );
        }

        if (today.date() < day && target.diff(today, "day") >= minTermDays) {
          return target;
        }

        // Try next month
        const nextMonthTarget = today.add(1, "month").date(day);
        if (nextMonthTarget.date() !== day) {
          throw new BadRequestException(
            `Invalid finalExpectedDateOfSalary in next month: ${day}`,
          );
        }

        return nextMonthTarget;
      }

      dueDate = getNextTargetDate(finalExpectedDateOfSalary).endOf("day");

      let daysUntil = dueDate.diff(today, "day") + 1;

      if (daysUntil > maxTermDays) {
        dueDate = today.add(maxTermDays - 1, "day").endOf("day");
      } else if (daysUntil < minTermDays) {
        dueDate = today.add(minTermDays - 1, "day").endOf("day");
      }
    }

    const daysUntilRepayment = dueDate.diff(today, "day") + 1;

    return {
      dueDate,
      daysUntilRepayment,
    };
  }

  private async processFeesAndCharges(
    loanRule: LoanRule,
    tenure: Tenure,
    principal: Decimal,
    durationDays: number,
  ) {
    const fees = await this.prisma.loan_charge_config.findMany({
      where: {
        loanRuleId: loanRule.id,
        tenureId: tenure.id,
        isActive: true,
      },
      include: { loan_charge_taxes: true },
    });

    let totalInclusive = new Decimal(0);
    let totalExclusive = new Decimal(0);
    const charges = [];
    const allTaxes = [];

    for (const fee of fees) {
      const { charge, taxes } = this.calculateFeeComponents(
        fee,
        principal,
        durationDays,
      );
      // Track totals
      if (fee.chargeMode === ChargeMode.INCLUSIVE) {
        totalInclusive = totalInclusive.add(charge.totalAmount);
      } else {
        totalExclusive = totalExclusive.add(charge.totalAmount);
      }

      allTaxes.push(...taxes);
      charges.push(charge);
    }

    const earlyRepaymentDiscount = {
      totalAmount: totalExclusive.div(durationDays).toString(),
    };
    return {
      charges,
      totalInclusive,
      totalExclusive,
      earlyRepaymentDiscount,
      totalTaxes: allTaxes.reduce(
        (acc, t) => acc.add(t.taxAmount),
        new Decimal(0),
      ),
    };
  }

  private calculateFeeComponents(
    fee: loan_charge_config & {
      loan_charge_taxes: loan_charge_taxes[];
    },
    principal: Decimal,
    durationDays: number,
  ) {
    let baseAmount = new Decimal(0);
    const feeAmount = this.dec(fee.chargeValue);

    // Calculate base fee amount only once
    if (fee.isRecurringDaily) {
      baseAmount =
        fee.valueType === "percentage"
          ? principal.mul(feeAmount.div(100)).mul(durationDays)
          : feeAmount.mul(durationDays);
    } else {
      baseAmount =
        fee.valueType === "percentage"
          ? principal.mul(feeAmount.div(100))
          : feeAmount;
    }

    // Now calculate taxes properly based on tax valueType
    const taxes = fee.loan_charge_taxes.map((t) => {
      let taxAmount = new Decimal(0);
      if (t.valueType === "percentage") {
        taxAmount = t.isInclusive
          ? baseAmount.mul(t.chargeValue).div(100 + t.chargeValue)
          : baseAmount.mul(t.chargeValue).div(100);
      } else {
        taxAmount = new Decimal(t.chargeValue);
      }

      return {
        type: t.type,
        chargeValue: t.chargeValue,
        taxAmount: taxAmount,
        isInclusive: t.isInclusive,
        valueType: t.valueType,
      };
    });
    return {
      charge: {
        ...fee,
        baseAmount: baseAmount.toNumber(),
        taxes: taxes.map((t) => ({
          type: t.type,
          chargeValue: t.chargeValue,
          taxAmount: t.taxAmount.toNumber(),
          isInclusive: t.isInclusive,
          valueType: t.valueType,
        })),
        totalAmount: baseAmount
          .add(
            taxes.reduce(
              (sum, tax) => (tax.isInclusive ? sum : sum.add(tax.taxAmount)),
              new Decimal(0),
            ),
          )
          .toNumber(),
      },
      taxes,
    };
  }

  private formatCharge(charge) {
    return {
      type: charge.type,
      calculation: {
        valueType: charge.valueType,
        chargeValue: charge.chargeValue,
        baseAmount: charge.baseAmount,
        taxAmount: charge.taxes.reduce((a, t) => a + t.taxAmount, 0),
      },
      chargeMode: charge.chargeMode,
      isRecurringDaily: charge.isRecurringDaily,
      total: charge.totalAmount,
      taxes: charge.taxes,
    };
  }

  private calculateAPR(
    fees: Decimal,
    principal: Decimal,
    days: number,
    disburseAmount: Decimal,
    processingFee: Decimal,
    totalTaxes: Decimal,
  ) {
    if (principal.equals(0)) return 0;
    const apr = processingFee
      .minus(totalTaxes)
      .plus(fees)
      .div(principal)
      .mul(365)
      .div(days)
      .mul(100)
      .toDecimalPlaces(2)
      .toNumber();
    // fix to 2 decimal places
    return apr;
  }

  async createLoan({
    purpose,
    userId,
    requestAmount,
    tenureId,
    dueDate = null,
  }: {
    purpose: string;
    userId: string;
    requestAmount: number;
    tenureId: string;
    dueDate?: string | null;
  }) {
    if (!userId || !requestAmount || !tenureId) {
      throw new BadRequestException("All parameters are required");
    }
    const [user, tenure] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
      }),
      this.prisma.tenure.findUnique({
        where: { id: tenureId },
        include: { loanRule: true },
      }),
    ]);
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const brandId = user?.brandId || "";
    if (!tenure) {
      throw new NotFoundException("Tenure not found");
    }
    if (!brandId) {
      throw new NotFoundException("Brand not found for the user");
    }
    const brandConfig = await this.prisma.brandConfig.findUnique({
      where: { brandId },
      select: {
        minLoanAmountRequired: true,
        autoAllocationType: true,
        is_cam_calculation_required: true,
        loan_auto_allocation: true,
        skip_loan_evaluation_approval_days: true,
        is_loan_onboarding: true,
        is_automated_reloan: true,
      },
    });
    if (!brandConfig) {
      throw new NotFoundException("Brand configuration not found");
    }
    const isCamRequired = brandConfig.is_cam_calculation_required || false;

    if (
      Number(user.status_id) === UserStatusEnum.BLOCKED
    ) {
      throw new BadRequestException(
        "Your profile is rejected for loan. Please contact support.",
      );
    }
    const [completedLoanCount, allLoansForUser] = await Promise.all([
      this.prisma.loan.count({
        where: {
          userId: userId,
          isActive: true,
          status: loan_status_enum.COMPLETED,
        },
      }),
      this.prisma.loan.findMany({
        where: {
          userId: userId,
          isActive: true,
          status: {
            notIn: [loan_status_enum.CANCELLED],
          },
        },
        select: {
          id: true,
          amount: true,
          createdAt: true,
          isActive: true,
          status: true,
          disbursementDate: true,
          isMigratedloan: true,
          closureDate: true,
          closingType: true,
          loanDetails: {
            select: {
              dueDate: true,
            },
          },
        },
      }),
    ]);
    if (
      // isLoanOnboarding &&
      allLoansForUser.length >= 1 &&
      allLoansForUser[0]?.status === loan_status_enum.ONBOARDING &&
      allLoansForUser[0]?.id
    ) {
      return await this.prisma.loan.update({
        where: {
          id: allLoansForUser[0].id,
        },
        data: {
          purpose: purpose ?? "I need food, and I need a drink.",
          amount: requestAmount,
          status: loan_status_enum.PENDING,
          loanDetails: {
            update: {
              dueDate: dueDate
                ? new Date(_dayjs(dueDate).endOf("day").toISOString())
                : undefined,
            },
          },
        },
      });
    }

    let is_skip_evaluation_approval = false;
    if (
      brandConfig?.skip_loan_evaluation_approval_days &&
      brandConfig?.skip_loan_evaluation_approval_days > 0
    ) {
      const lastCompletedLoan = allLoansForUser
        .filter((l) => l.status === loan_status_enum.COMPLETED)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      if (lastCompletedLoan?.createdAt) {
        const daysSinceLastCompletedLoan = _dayjs().diff(
          _dayjs(lastCompletedLoan.createdAt),
          "day",
        );
        if (
          daysSinceLastCompletedLoan <=
          brandConfig.skip_loan_evaluation_approval_days
        ) {
          is_skip_evaluation_approval = true;
        }
      }
    }

    if (completedLoanCount > tenure.loanRule.maxCompleteLoanCount) {
      throw new BadRequestException(
        `You have reached the maximum number of loans allowed (${completedLoanCount} of ${tenure.loanRule.maxCompleteLoanCount})`,
      );
    }
    if (
      brandConfig?.minLoanAmountRequired &&
      brandConfig.minLoanAmountRequired > 0 &&
      requestAmount < brandConfig.minLoanAmountRequired
    ) {
      throw new BadRequestException(
        `Loan amount must be at least ₹${brandConfig.minLoanAmountRequired.toLocaleString("en-IN")}`,
      );
    }
    if (
      requestAmount < tenure.loanRule.minAmount ||
      requestAmount > tenure.loanRule.maxAmount
    ) {
      throw new BadRequestException(
        `Loan amount must be between ₹${tenure.loanRule.minAmount.toLocaleString("en-IN")} and ₹${tenure.loanRule.maxAmount.toLocaleString("en-IN")}`,
      );
    }
    const repeatCount = allLoansForUser.filter(
      (l) =>
        l.isActive &&
        (l.status === loan_status_enum.COMPLETED ||
          l.status === loan_status_enum.ACTIVE ||
          l.status === loan_status_enum.DISBURSED ||
          l.status === loan_status_enum.POST_ACTIVE ||
          l.status === loan_status_enum.PARTIALLY_PAID ||
          l.status === loan_status_enum.OVERDUE ||
          l.status === loan_status_enum.PAID ||
          l.status === loan_status_enum.SETTLED ||
          l.status === loan_status_enum.WRITE_OFF ||
          l.status === loan_status_enum.DEFAULTED),
    ).length;

    let nextPartnerUser = null;
    if (brandConfig?.loan_auto_allocation) {
      nextPartnerUser =
        await this.autoAllocationLoanService.nextCreditExecutivePartnerUser(
          userId,
          user.brandId,
          repeatCount > 0,
          brandConfig?.autoAllocationType as "LOGIN" | "ATTENDANCE",
        );
    }
    let is_workflow_automated: boolean = false;
    let reloanAutomationResult: ReloanEligibilityResult | null = null;
    let reloanEligibilityContext: ReloanEligibilityContext | null = null;
    if (repeatCount > 0 && brandConfig?.is_automated_reloan) {
      const lastLoan = allLoansForUser.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      )[0];

      if (lastLoan) {
        const isAAAvailable =
          !!(await this.prisma.aa_consent_requests.findFirst({
            where: {
              userId,
              brandId: user.brandId,
              consentStatus: "ACTIVE",
            },
            select: { id: true },
          }));
        reloanEligibilityContext = {
          userId: userId,
          brandId: user.brandId,
          previousLoanId: lastLoan.id,
          previousDisbursementDate: lastLoan.disbursementDate,
          previousDueDate: lastLoan.loanDetails?.dueDate,
          previousClosureDate: lastLoan.closureDate,
          previousClosureStatus: lastLoan.closingType,
          previousLoanStatus: lastLoan.status,
          previousLoanAmount: lastLoan.amount,
          requestLoanAmount: requestAmount,
          requestDueDate: dueDate
            ? new Date(_dayjs(dueDate).endOf("day").toISOString())
            : null,
          aa_availability: !!isAAAvailable,
          is_migrated_loan: lastLoan.isMigratedloan,
          loan_rule_max_term_days: tenure.maxTermDays,
          loan_rule_min_term_days: tenure.minTermDays,
          loan_rule_type: tenure.loanRule.ruleType,
        };
        reloanAutomationResult =
          await this.reloanAutomationService.evaluateReloanEligibility(
            reloanEligibilityContext,
          );
        if (!reloanAutomationResult.eligible) {
          throw new BadRequestException(
            `You are not eligible for a new loan at this time. Reason: ${reloanAutomationResult.reasons.join(", ")}`,
          );
        }
        await this.reloanAutomationService.logReloanAutomation(
          reloanEligibilityContext,
          reloanAutomationResult,
        );
        is_workflow_automated = true;
      }
    }
    const loan = await this.prisma.loan.create({
      data: {
        userId: userId,
        is_cam_calculation_required: isCamRequired,
        brandId: user.brandId,
        is_skip_evaluation_approval: is_skip_evaluation_approval,
        amount: requestAmount,
        status: loan_status_enum.PENDING,
        ruleType: tenure.loanRule.ruleType,
        purpose: purpose || "I need food, and I need a drink.",
        // loan tenure in days
        loan_cx_assigned_partner_user_id: nextPartnerUser?.id || null,
        loan_due_date: _dayjs(dueDate).startOf("day").toDate(),
        loan_tenure_days:
          _dayjs(dueDate).diff(_dayjs().startOf("day"), "day") + 1,
        loan_repayment_type_id: LoanRepaymentTypeEnum.PAYDAY_LOAN,
        loan_applied_amount: requestAmount,
        loanDetails: {
          create: {
            type: "PAYDAY_LOAN",
            durationDays:
              _dayjs(dueDate).diff(_dayjs().startOf("day"), "day") + 1,
            dueDate: new Date(dueDate),
          },
        },
        allottedPartners: {
          create: [nextPartnerUser?.id, nextPartnerUser?.reportsToId]
            .filter(Boolean) // Removes null or undefined
            .map((partnerId) => ({
              partnerUserId: partnerId,
              allottedAt: new Date(),
              amount: requestAmount,
            })),
        },
      },
    });
    if (!loan) {
      throw new BadRequestException("Loan creation failed");
    }
    try {
      if (!reloanAutomationResult?.requiresManualReview) {
        if (
          reloanAutomationResult?.flags.includes(
            LoanDecisionType.AUTOMATED_FLOW,
          )
        ) {
          await this.updateLoanAmount(userId, requestAmount, loan.id, dueDate);
        }
        await this.prisma.loan.update({
          where: { id: loan.id },
          data: {
            status: reloanAutomationResult.step,
            is_workflow_automated: is_workflow_automated,
          },
        });
      }
    } catch (err) {
      console.error(
        `Error during automated workflow processing for loan ${loan.id}: ${err.message}`,
      );
      // Optionally, you could update the loan to indicate there was an error in automation
    }

    this.sendLoanCreationNotification(
      loan,
      userId,
      requestAmount,
      nextPartnerUser,
    ).catch((notificationError) => {
      console.error(
        `Failed to send loan creation notification for loan ${loan.id}: ${notificationError.message}`,
      );
    });
    return loan;
  }

  /**
   * HELPER: Send loan creation notification asynchronously (non-blocking)
   */
  private async sendLoanCreationNotification(
    loan: any,
    userId: string,
    requestAmount: number,
    nextPartnerUser: any,
  ) {
    try {
      const allocatedPartnerIds = [
        nextPartnerUser?.id,
        nextPartnerUser?.reportsToId,
      ].filter(Boolean);

      if (allocatedPartnerIds.length === 0) {
        return;
      }

      const userDetails = await this.prisma.user.findUnique({
        where: { id: userId },
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
      });

      const userName =
        userDetails?.userDetails?.firstName &&
        userDetails?.userDetails?.lastName
          ? `${userDetails.userDetails.firstName} ${userDetails.userDetails.lastName}`
          : userDetails?.formattedUserId || "Unknown User";

      const contactInfo =
        userDetails?.phoneNumber || userDetails?.email || "No contact";

      await this.notificationService.create({
        title: "New Loan Application",
        message: `New loan application of ₹${requestAmount.toLocaleString("en-IN")} from ${userName} (${contactInfo}) has been assigned to you. Loan ID: ${loan.formattedLoanId || loan.id}`,
        loanId: loan.id,
        userId: userId,
        priority: notification_priority_enum.MEDIUM,
        targets: allocatedPartnerIds.map((partnerId) => ({
          partnerUserId: partnerId,
          platform: platform_type.WEB,
        })),
      });
    } catch (err) {
      console.error(`Notification error:`, err.message);
      throw err;
    }
  }

  async updateLoanAmount(
    userId: string,
    requestAmount: number,
    loanId: string,
    requestedDueDate: string | null = null,
  ) {
    if (!userId || !requestAmount || !loanId) {
      throw new BadRequestException("All parameters are required");
    }

    // Get existing loan to verify ownership and get user details
    const existingLoan = await this.prisma.loan.findUnique({
      where: {
        id: loanId,
        status: {
          in: [
            loan_status_enum.PENDING,
            loan_status_enum.CREDIT_EXECUTIVE_APPROVED,
          ],
        },
      },
      include: { agreement: true, loanDetails: true },
    });

    if (!existingLoan) {
      throw new NotFoundException(
        `Loan not found or cannot be updated for loan ID: ${loanId}`,
      );
    }

    if (existingLoan.userId !== userId) {
      throw new UnauthorizedException(
        "You are not authorized to update this loan",
      );
    }

    if (existingLoan?.agreement?.status === agreement_status_enum.SIGNED) {
      throw new BadRequestException(
        "Cannot update loan amount after agreement has been signed",
      );
    }

    if (
      !(
        [
          loan_status_enum.PENDING,
          loan_status_enum.CREDIT_EXECUTIVE_APPROVED,
        ] as loan_status_enum[]
      ).includes(existingLoan.status)
    ) {
      throw new BadRequestException(
        `Only loans with status PENDING or CREDIT_EXECUTIVE_APPROVED can be updated. Current status: ${existingLoan.status}`,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        brandId: true,
      },
    });

    const loanRule = await this.prisma.loanRule.findUnique({
      where: {
        brandId_ruleType: {
          brandId: user.brandId,
          ruleType: existingLoan.ruleType,
        },
      },
      include: { tenures: true },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (!loanRule) {
      throw new NotFoundException(
        `Loan rule not found for the user ${userId}-${existingLoan.ruleType}`,
      );
    }

    if (!loanRule.tenures || !loanRule.tenures.id) {
      throw new NotFoundException("No tenures available for the loan rule");
    }

    let updatedLoan;
    if (existingLoan && loanId) {
      const updateLoanDto = await this.calculateRepayment({
        userId,
        requestAmount,
        tenureId: loanRule.tenures.id || "",
        requestedDueDate: requestedDueDate || null,
        loanId: existingLoan.id || null,
      });
      if(!loanId) {
        throw new BadRequestException("Loan ID is required for update");
      }

      updatedLoan = await this.prisma.$transaction(async (tx) => {
        await Promise.all([
          tx.disbursement.deleteMany({ where: { loanId } }),
          tx.repayment.deleteMany({ where: { loanId } }),
          tx.costSummary.deleteMany({ where: { loanId } }),
          tx.earlyRepaymentDiscount.deleteMany({ where: { loanId } }),
          tx.penalty.deleteMany({ where: { loanId } }),
          tx.loanDetails.deleteMany({ where: { loanId } }),
          tx.signDeskSomeTable.deleteMany({ where: { loanId } }),
          tx.digitap_esign_some_table.deleteMany({ where: { loanId } }),
          tx.signzy_some_table.deleteMany({ where: { loanId } }),
          tx.loanAgreement.deleteMany({ where: { loanId } }),
        ]);
        return tx.loan.update({
          where: { id: loanId },
          data: {
            amount: requestAmount,
            loanDetails: {
              create: {
                type: updateLoanDto.loanDetails.type,
                durationDays: updateLoanDto.loanDetails.durationDays,
                dueDate: new Date(updateLoanDto.loanDetails.dueDate),
                postActiveDate: updateLoanDto.loanDetails.postActiveDate,
                allowPrepayment: updateLoanDto.loanDetails.allowPrepayment,
                grossPeriod: updateLoanDto.loanDetails.grossPeriod,
                minActiveTermDays: updateLoanDto.loanDetails.minActiveTermDays,
                maxActiveTermDays: updateLoanDto.loanDetails.maxActiveTermDays,
                minPostActiveTermDays:
                  updateLoanDto.loanDetails.minPostActiveTermDays,
              },
            },
            disbursement: {
              create: {
                grossAmount: updateLoanDto.disbursement.grossAmount,
                totalDeductions: updateLoanDto.disbursement.totalDeductions,
                netAmount: updateLoanDto.disbursement.netAmount,
                processing_fee: updateLoanDto.disbursement.totalDeductions,
                deductions: {
                  create: updateLoanDto.disbursement.deductions.map((d) => ({
                    type: d.type,
                    calculationValueType: d.calculation.valueType,
                    calculationBaseAmount: d.calculation.baseAmount,
                    calculationTaxAmount: d.calculation.taxAmount,
                    chargeMode: d.chargeMode,
                    isRecurringDaily: d.isRecurringDaily,
                    total: d.total,
                    chargeValue: d.calculation.chargeValue,
                    taxes: {
                      create: d.taxes.map((t) => ({
                        type: t.type,
                        chargeValue: t.chargeValue,
                        amount: t.taxAmount,
                        valueType: t.valueType,
                        isInclusive: t.isInclusive,
                      })),
                    },
                  })),
                },
              },
            },
            repayment: {
              create: {
                totalObligation: updateLoanDto.repayment.totalObligation,
                totalFees: updateLoanDto.repayment.totalFees,
                feeBreakdowns: {
                  create: updateLoanDto.repayment.feeBreakdown.map((fb) => ({
                    type: fb.type,
                    chargeValue: fb.calculation.chargeValue,
                    calculationValueType: fb.calculation.valueType,
                    calculationBaseAmount: fb.calculation.baseAmount,
                    calculationTaxAmount: fb.calculation.taxAmount,
                    chargeMode: fb.chargeMode,
                    isRecurringDaily: fb.isRecurringDaily,
                    total: fb.total,
                    taxes: {
                      create: fb.taxes.map((t) => ({
                        type: t.type,
                        chargeValue: t.chargeValue,
                        amount: t.taxAmount,
                        valueType: t.valueType,
                        isInclusive: t.isInclusive,
                      })),
                    },
                  })),
                },
              },
            },
            costSummary: {
              create: {
                totalTaxes: Number(
                  updateLoanDto.costSummary.totalTaxes.toFixed(2),
                ),
                effectiveAPR: Number(
                  updateLoanDto.costSummary.effectiveAPR.toFixed(2),
                ),
              },
            },
            earlyRepayment: {
              create: {
                totalAmount: Number(
                  updateLoanDto.earlyRepaymentDiscount.totalAmount,
                ),
              },
            },
            penalties: {
              create: updateLoanDto.penalty.map((p) => ({
                type: p.type,
                valueType: p.valueType,
                chargeValue: p.chargeValue,
                taxType: p.tax.taxType,
                taxChargeValue: p.tax.taxChargeValue,
                taxValueType: p.tax.taxValueType,
                isTaxInclusive: p.tax.isTaxInclusive,
              })),
            },
            agreement: (
              [
                loan_status_enum.PENDING,
                loan_status_enum.CREDIT_EXECUTIVE_APPROVED,
              ] as loan_status_enum[]
            ).includes(existingLoan.status)
              ? {
                  create: {
                    status: agreement_status_enum.NOT_SENT,
                    updatedAt: new Date(),
                  },
                }
              : undefined,
          },
          include: {
            loanDetails: true,
            disbursement: {
              include: {
                deductions: {
                  include: {
                    taxes: true,
                  },
                },
              },
            },
            repayment: {
              include: {
                feeBreakdowns: {
                  include: {
                    taxes: true,
                  },
                },
              },
            },
            costSummary: true,
            earlyRepayment: true,
            penalties: true,
          },
        });
      });

      if (!updatedLoan) {
        throw new BadRequestException("Loan update failed");
      }
    }
    return updatedLoan;
  }

  async getLoan(loanId: string) {
    if (!loanId) {
      throw new BadRequestException("Loan ID is required");
    }

    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      select: {
        amount: true,
        status: true,
        applicationDate: true,
        formattedLoanId: true,
        userId: true,
        id: true,
        disbursementDate: true,
        purpose: true,
        loanDetails: {
          select: {
            dueDate: true,
            durationDays: true,
            loanId: true,
            maxActiveTermDays: true,
            minActiveRepaymentDays: true,
            minActiveTermDays: true,
            minPostActiveTermDays: true,
          },
        },
        agreement: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!loan) {
      throw new NotFoundException("Loan not found");
    }

    return loan;
  }

  // async forceupdateLoanAmount(
  //   userId: string,
  //   requestAmount: number,
  //   loanId: string,
  //   requestedDueDate: string | null = null
  // ) {
  //   if (!userId || !requestAmount || !loanId) {
  //     throw new BadRequestException("All parameters are required");
  //   }

  //   // Get existing loan to verify ownership and get user details
  //   const existingLoan = await this.prisma.loan.findUnique({
  //     where: { id: loanId },
  //     include: { agreement: true },
  //   });

  //   if (!existingLoan) {
  //     throw new NotFoundException("Loan not found");
  //   }

  //   if (existingLoan.userId !== userId) {
  //     throw new UnauthorizedException("Loan does not belong to this user");
  //   }

  //   const user = await this.prisma.user.findUnique({
  //     where: { id: userId },
  //     select: {
  //       id: true,
  //       brandId: true,
  //     },
  //   });

  //   const loanRule = await this.prisma.loanRule.findUnique({
  //     where: {
  //       brandId_ruleType: {
  //         brandId: user.brandId,
  //         ruleType: existingLoan.ruleType,
  //       },
  //     },
  //     include: { tenures: true },
  //   });

  //   if (!user) {
  //     throw new NotFoundException("User not found");
  //   }

  //   if (!loanRule) {
  //     throw new NotFoundException(
  //       `Loan rule not found for the user ${userId}-${existingLoan.ruleType}`
  //     );
  //   }

  //   if (!loanRule.tenures || !loanRule.tenures.id) {
  //     throw new NotFoundException("No tenures available for the loan rule");
  //   }

  //   const updateLoanDto = await this.calculateRepayment({
  //     userId,
  //     requestAmount,
  //     tenureId: loanRule.tenures.id || "",
  //     requestedDueDate: requestedDueDate || null,
  //     loanId: existingLoan.id || null,
  //   });
  //   const updatedLoan = await this.prisma.$transaction(async (prisma) => {
  //     // Delete nested relations first (assuming you want full replacement)
  //     await prisma.taxDeduction.deleteMany({
  //       where: { deduction: { disbursement: { loanId: loanId } } },
  //     });

  //     await prisma.deduction.deleteMany({
  //       where: { disbursement: { loanId: loanId } },
  //     });

  //     await prisma.disbursement.deleteMany({
  //       where: { loanId: loanId },
  //     });

  //     await prisma.taxFeeBreakdown.deleteMany({
  //       where: { feeBreakdown: { repayment: { loanId: loanId } } },
  //     });

  //     await prisma.feeBreakdown.deleteMany({
  //       where: { repayment: { loanId: loanId } },
  //     });

  //     await prisma.repayment.deleteMany({
  //       where: { loanId: loanId },
  //     });

  //     await prisma.costSummary.deleteMany({
  //       where: { loanId: loanId },
  //     });

  //     await prisma.earlyRepaymentDiscount.deleteMany({
  //       where: { loanId: loanId },
  //     });

  //     await prisma.penalty.deleteMany({
  //       where: { loanId: loanId },
  //     });

  //     await prisma.loanDetails.deleteMany({
  //       where: { loanId: loanId },
  //     });

  //     // if (
  //     //   (
  //     //     [
  //     //       loan_status_enum.PENDING,
  //     //       loan_status_enum.CREDIT_EXECUTIVE_APPROVED,
  //     //     ] as loan_status_enum[]
  //     //   ).includes(existingLoan.status)
  //     // ) {
  //     //   await prisma.signDeskSomeTable.deleteMany({
  //     //     where: { loanId: loanId },
  //     //   });
  //     //   await prisma.loanAgreement.deleteMany({
  //     //     where: { loanId: loanId },
  //     //   });
  //     // }
  //     // Finally update the main loan object
  //     return prisma.loan.update({
  //       where: { id: loanId },
  //       data: {
  //         amount: requestAmount,
  //         loanDetails: {
  //           create: {
  //             principal: updateLoanDto.loanDetails.principal,
  //             type: updateLoanDto.loanDetails.type,
  //             durationDays: updateLoanDto.loanDetails.durationDays,
  //             dueDate: new Date(updateLoanDto.loanDetails.dueDate),
  //             postActiveDate: updateLoanDto.loanDetails.postActiveDate,
  //             allowPrepayment: updateLoanDto.loanDetails.allowPrepayment,
  //             grossPeriod: updateLoanDto.loanDetails.grossPeriod,
  //             minActiveTermDays: updateLoanDto.loanDetails.minActiveTermDays,
  //             maxActiveTermDays: updateLoanDto.loanDetails.maxActiveTermDays,
  //             minPostActiveTermDays:
  //               updateLoanDto.loanDetails.minPostActiveTermDays,
  //           },
  //         },
  //         disbursement: {
  //           create: {
  //             grossAmount: updateLoanDto.disbursement.grossAmount,
  //             totalDeductions: updateLoanDto.disbursement.totalDeductions,
  //             netAmount: updateLoanDto.disbursement.netAmount,

  //             deductions: {
  //               create: updateLoanDto.disbursement.deductions.map((d) => ({
  //                 type: d.type,
  //                 calculationValueType: d.calculation.valueType,
  //                 calculationBaseAmount: d.calculation.baseAmount,
  //                 calculationTaxAmount: d.calculation.taxAmount,
  //                 chargeMode: d.chargeMode,
  //                 isRecurringDaily: d.isRecurringDaily,
  //                 total: d.total,
  //                 chargeValue: d.calculation.chargeValue,
  //                 taxes: {
  //                   create: d.taxes.map((t) => ({
  //                     type: t.type,
  //                     chargeValue: t.chargeValue,
  //                     amount: t.taxAmount,
  //                     valueType: t.valueType,
  //                     isInclusive: t.isInclusive,
  //                   })),
  //                 },
  //               })),
  //             },
  //           },
  //         },
  //         repayment: {
  //           create: {
  //             totalObligation: updateLoanDto.repayment.totalObligation,
  //             totalFees: updateLoanDto.repayment.totalFees,
  //             feeBreakdowns: {
  //               create: updateLoanDto.repayment.feeBreakdown.map((fb) => ({
  //                 type: fb.type,
  //                 chargeValue: fb.calculation.chargeValue,
  //                 calculationValueType: fb.calculation.valueType,
  //                 calculationBaseAmount: fb.calculation.baseAmount,
  //                 calculationTaxAmount: fb.calculation.taxAmount,
  //                 chargeMode: fb.chargeMode,
  //                 isRecurringDaily: fb.isRecurringDaily,
  //                 total: fb.total,
  //                 taxes: {
  //                   create: fb.taxes.map((t) => ({
  //                     type: t.type,
  //                     chargeValue: t.chargeValue,
  //                     amount: t.taxAmount,
  //                     valueType: t.valueType,
  //                     isInclusive: t.isInclusive,
  //                   })),
  //                 },
  //               })),
  //             },
  //           },
  //         },
  //         costSummary: {
  //           create: {
  //             totalTaxes: updateLoanDto.costSummary.totalTaxes,
  //             effectiveAPR: updateLoanDto.costSummary.effectiveAPR,
  //           },
  //         },
  //         earlyRepayment: {
  //           create: {
  //             totalAmount: Number(
  //               updateLoanDto.earlyRepaymentDiscount.totalAmount
  //             ),
  //           },
  //         },
  //         penalties: {
  //           create: updateLoanDto.penalty.map((p) => ({
  //             type: p.type,
  //             valueType: p.valueType,
  //             chargeValue: p.chargeValue,
  //             taxType: p.tax.taxType,
  //             taxChargeValue: p.tax.taxChargeValue,
  //             taxValueType: p.tax.taxValueType,
  //             isTaxInclusive: p.tax.isTaxInclusive,
  //           })),
  //         },
  //       },
  //       include: {
  //         loanDetails: true,
  //         disbursement: {
  //           include: {
  //             deductions: {
  //               include: {
  //                 taxes: true,
  //               },
  //             },
  //           },
  //         },
  //         repayment: {
  //           include: {
  //             feeBreakdowns: {
  //               include: {
  //                 taxes: true,
  //               },
  //             },
  //           },
  //         },
  //         costSummary: true,
  //         earlyRepayment: true,
  //         penalties: true,
  //       },
  //     });
  //   });

  //   if (!updatedLoan) {
  //     throw new BadRequestException("Loan update failed");
  //   }

  //   return updatedLoan;
  // }

  private async buildDeductionData(deductions: any[]) {
    return deductions.map((d) => ({
      type: d.type,
      calculationValueType: d.calculation.valueType,
      calculationBaseAmount: d.calculation.baseAmount,
      calculationTaxAmount: d.calculation.taxAmount,
      chargeMode: d.chargeMode,
      isRecurringDaily: d.isRecurringDaily,
      total: d.total,
      chargeValue: d.calculation.chargeValue,
      taxes: {
        create: d.taxes.map((t) => ({
          type: t.type,
          chargeValue: t.chargeValue,
          amount: t.taxAmount,
          valueType: t.valueType,
          isInclusive: t.isInclusive,
        })),
      },
    }));
  }

  private async buildFeeBreakdownData(feeBreakdowns: any[]) {
    return feeBreakdowns.map((fb) => ({
      type: fb.type,
      chargeValue: fb.calculation.chargeValue,
      calculationValueType: fb.calculation.valueType,
      calculationBaseAmount: fb.calculation.baseAmount,
      calculationTaxAmount: fb.calculation.taxAmount,
      chargeMode: fb.chargeMode,
      isRecurringDaily: fb.isRecurringDaily,
      total: fb.total,
      taxes: {
        create: fb.taxes.map((t) => ({
          type: t.type,
          chargeValue: t.chargeValue,
          amount: t.taxAmount,
          valueType: t.valueType,
          isInclusive: t.isInclusive,
        })),
      },
    }));
  }

  // async forceAllLoans() {
  //   const BATCH_SIZE = 50; // Number of loans to process in parallel per batch (reduced to avoid transaction pool exhaustion)
  //   const BATCH_DELAY_MS = 1000; // Delay between batches to allow transaction cleanup
  //   const LOAN_FETCH_SIZE = 1000; // Fetch loans in chunks to avoid memory issues
  //   let totalProcessed = 0;
  //   let totalFailed = 0;
  //   const allErrors = [];

  //   const startTime = Date.now();
  //   console.log(
  //     `[FORCE_LOANS] Starting force update at ${new Date().toISOString()}`
  //   );
  //   const loanRules = await this.prisma.loanRule.findMany({
  //     include: { tenures: true },
  //   });

  //   /** Count total loans first */
  //   const totalLoansCount = await this.prisma.loan.count({
  //     where: {
  //       amount: { gt: 0 },
  //       repayment: {
  //         isNot: null,
  //       },

  //       loanDetails: {
  //         isNot: null,
  //       },
  //     },
  //   });

  //   console.log(`[FORCE_LOANS] Total loans to process: ${totalLoansCount}`);

  //   /** Process loans in chunks to avoid memory overflow and bind variable limits */
  //   for (
  //     let loanOffset = 0;
  //     loanOffset < totalLoansCount;
  //     loanOffset += LOAN_FETCH_SIZE
  //   ) {
  //     console.time(
  //       `[FORCE_LOANS] Fetch loans chunk ${Math.floor(loanOffset / LOAN_FETCH_SIZE) + 1}`
  //     );

  //     const loansChunk = await this.prisma.loan.findMany({
  //       where: {
  //         amount: { gt: 0 },
  //         loanDetails: {
  //           isNot: null,
  //         },
  //       },
  //       include: {
  //         loanDetails: true,
  //       },
  //       skip: loanOffset,
  //       take: LOAN_FETCH_SIZE,
  //       orderBy: {
  //         createdAt: "asc",
  //       },
  //     });

  //     // Filter for loans with non-null dueDate
  //     const loansWithDueDate = loansChunk.filter(
  //       (loan) => loan.loanDetails?.dueDate !== null
  //     );

  //     console.timeEnd(
  //       `[FORCE_LOANS] Fetch loans chunk ${Math.floor(loanOffset / LOAN_FETCH_SIZE) + 1}`
  //     );
  //     console.log(
  //       `[FORCE_LOANS] Fetched ${loansChunk.length} loans, ${loansWithDueDate.length} with valid due dates`
  //     );

  //     if (loansWithDueDate.length === 0) {
  //       continue; // Skip to next chunk if no valid loans
  //     }

  //     /** Preload Users for this chunk */
  //     console.time("[FORCE_LOANS] Preload users");
  //     const userIds = [...new Set(loansWithDueDate.map((l) => l.userId))];
  //     const users = await this.prisma.user.findMany({
  //       where: { id: { in: userIds } },
  //       select: { id: true, brandId: true, employment: true },
  //     });
  //     const userMap = new Map(users.map((u) => [u.id, u]));
  //     console.timeEnd("[FORCE_LOANS] Preload users");

  //     /** Batch Process this chunk */
  //     let offset = 0;
  //     while (offset < loansWithDueDate.length) {
  //       const batchStart = Date.now();
  //       const batch = loansWithDueDate.slice(offset, offset + BATCH_SIZE);

  //       await Promise.all(
  //         batch.map(async (loan) => {
  //           const loanStart = Date.now();
  //           try {
  //             const user = userMap.get(loan.userId);
  //             if (!user) {
  //               throw new NotFoundException(
  //                 `User not found for loan ${loan.id}`
  //               );
  //             }

  //             const loanRule = loanRules.find(
  //               (lr) => lr.brandId === user.brandId && lr.ruleType === "high"
  //             );
  //             if (!loanRule?.tenures) {
  //               throw new NotFoundException(
  //                 `Loan rule not found for loan ${loan.id}`
  //               );
  //             }

  //             const requestedDueDate = _dayjs(loan.loanDetails?.dueDate).format(
  //               "YYYY-MM-DD"
  //             );
  //             console.log(
  //               `[FORCE_LOANS][LOAN:${loan.id}] Calculating repayment for amount ${loan.amount} and due date ${requestedDueDate}`
  //             );
  //             const updateLoanDto = await this.calculateRepayment({
  //               userId: loan.userId,
  //               requestAmount: loan.amount,
  //               tenureId: loanRule.tenures.id,
  //               requestedDueDate,
  //               loanId: loan.id,
  //             });

  //             const deductionData = await this.buildDeductionData(
  //               updateLoanDto.disbursement.deductions
  //             );
  //             const feeBreakdownData = await this.buildFeeBreakdownData(
  //               updateLoanDto.repayment.feeBreakdown
  //             );

  //             await this.prisma.$transaction(async (prisma) => {
  //               await Promise.all([
  //                 prisma.taxDeduction.deleteMany({
  //                   where: {
  //                     deduction: {
  //                       disbursement: { loanId: loan.id },
  //                     },
  //                   },
  //                 }),
  //                 prisma.taxFeeBreakdown.deleteMany({
  //                   where: {
  //                     feeBreakdown: {
  //                       repayment: { loanId: loan.id },
  //                     },
  //                   },
  //                 }),
  //               ]);

  //               await Promise.all([
  //                 prisma.deduction.deleteMany({
  //                   where: { disbursement: { loanId: loan.id } },
  //                 }),
  //                 prisma.feeBreakdown.deleteMany({
  //                   where: { repayment: { loanId: loan.id } },
  //                 }),
  //               ]);

  //               await Promise.all([
  //                 prisma.disbursement.deleteMany({
  //                   where: { loanId: loan.id },
  //                 }),
  //                 prisma.repayment.deleteMany({ where: { loanId: loan.id } }),
  //                 prisma.costSummary.deleteMany({ where: { loanId: loan.id } }),
  //                 prisma.earlyRepaymentDiscount.deleteMany({
  //                   where: { loanId: loan.id },
  //                 }),
  //                 prisma.penalty.deleteMany({ where: { loanId: loan.id } }),
  //                 prisma.loanDetails.deleteMany({ where: { loanId: loan.id } }),
  //               ]);

  //               await prisma.loan.update({
  //                 where: { id: loan.id },
  //                 data: {
  //                   amount: loan.amount,
  //                   loanDetails: {
  //                     create: {
  //                       principal: updateLoanDto.loanDetails.principal,
  //                       type: updateLoanDto.loanDetails.type,
  //                       durationDays: updateLoanDto.loanDetails.durationDays,
  //                       dueDate: new Date(updateLoanDto.loanDetails.dueDate),
  //                       postActiveDate:
  //                         updateLoanDto.loanDetails.postActiveDate,
  //                       allowPrepayment:
  //                         updateLoanDto.loanDetails.allowPrepayment,
  //                       grossPeriod: updateLoanDto.loanDetails.grossPeriod,
  //                       minActiveTermDays:
  //                         updateLoanDto.loanDetails.minActiveTermDays,
  //                       maxActiveTermDays:
  //                         updateLoanDto.loanDetails.maxActiveTermDays,
  //                       minPostActiveTermDays:
  //                         updateLoanDto.loanDetails.minPostActiveTermDays,
  //                     },
  //                   },
  //                   disbursement: {
  //                     create: {
  //                       grossAmount: updateLoanDto.disbursement.grossAmount,
  //                       totalDeductions:
  //                         updateLoanDto.disbursement.totalDeductions,
  //                       netAmount: updateLoanDto.disbursement.netAmount,
  //                       deductions: { create: deductionData },
  //                     },
  //                   },
  //                   repayment: {
  //                     create: {
  //                       totalObligation:
  //                         updateLoanDto.repayment.totalObligation,
  //                       totalFees: updateLoanDto.repayment.totalFees,
  //                       feeBreakdowns: { create: feeBreakdownData },
  //                     },
  //                   },
  //                   costSummary: {
  //                     create: {
  //                       totalTaxes: updateLoanDto.costSummary.totalTaxes,
  //                       effectiveAPR: updateLoanDto.costSummary.effectiveAPR,
  //                     },
  //                   },
  //                   earlyRepayment: {
  //                     create: {
  //                       totalAmount: Number(
  //                         updateLoanDto.earlyRepaymentDiscount.totalAmount
  //                       ),
  //                     },
  //                   },
  //                   penalties: {
  //                     create: updateLoanDto.penalty.map((p) => ({
  //                       type: p.type,
  //                       valueType: p.valueType,
  //                       chargeValue: p.chargeValue,
  //                       taxType: p.tax.taxType,
  //                       taxChargeValue: p.tax.taxChargeValue,
  //                       taxValueType: p.tax.taxValueType,
  //                       isTaxInclusive: p.tax.isTaxInclusive,
  //                     })),
  //                   },
  //                 },
  //               });
  //             });

  //             totalProcessed++;
  //             console.log(
  //               `[FORCE_LOANS][LOAN:${loan.id}] Success in ${
  //                 Date.now() - loanStart
  //               }ms`
  //             );
  //           } catch (error) {
  //             totalFailed++;
  //             allErrors.push({
  //               loanId: loan.id,
  //               userId: loan.userId,
  //               error: error.message,
  //             });
  //             console.error(
  //               `[FORCE_LOANS][LOAN:${loan.id}] FAILED: ${error.message}`
  //             );
  //           }
  //         })
  //       );

  //       console.log(
  //         `[FORCE_LOANS][BATCH] Completed in ${Date.now() - batchStart}ms`
  //       );
  //       offset += BATCH_SIZE;

  //       // Add delay between batches to allow transaction cleanup and prevent pool exhaustion
  //       if (offset < loansWithDueDate.length) {
  //         console.log(
  //           `[FORCE_LOANS] Waiting ${BATCH_DELAY_MS}ms before next batch...`
  //         );
  //         await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
  //       }
  //     }

  //     console.log(
  //       `[FORCE_LOANS] Chunk progress: ${totalProcessed + totalFailed}/${totalLoansCount}`
  //     );
  //   }

  //   console.log(
  //     `[FORCE_LOANS] Finished | Processed=${totalProcessed} | Failed=${totalFailed} | TotalTime=${
  //       Date.now() - startTime
  //     }ms`
  //   );

  //   return {
  //     total: totalLoansCount,
  //     processed: totalProcessed,
  //     failed: totalFailed,
  //     errors: allErrors.slice(0, 100),
  //   };
  // }

  async getAllLoanByBrand(brandId: string) {
    if (!brandId) {
      throw new BadRequestException("User ID is required");
    }

    const loans = await this.prisma.loan.findMany({
      where: {
        isActive: true,
        brandId: brandId,
        status: {
          not: loan_status_enum.ONBOARDING,
        },
      },
    });
    if (!loans || loans.length === 0) {
      return [];
    }
    return loans;
  }

  async getAllLoanByUser(userId: string) {
    if (!userId) {
      throw new BadRequestException("User ID is required");
    }

    const loans = await this.prisma.loan.findMany({
      where: { userId: userId, isActive: true },
      select: {
        id: true,
        formattedLoanId: true,
        amount: true,
        userId: true,
        brandId: true,
        status: true,
        is_skip_evaluation_approval: true,
        createdAt: true,
        forceBsaReportByPass: true,
        forceCreditReportByPass: true,
        user: {
          select: {
            id: true,
            email: true,
            phoneNumber: true,
            alternatePhoneNumbers: {
              select: {
                id: true,
                name: true,
                relationship: true,
                phone: true,
              },
            },
          },
        },
        is_repeat_loan: true,
        closureDate: true,
        applicationDate: true,
        loanDetails: {
          select: {
            dueDate: true,
            durationDays: true,
          },
        },
        disbursement: {
          select: {
            netAmount: true,
            grossAmount: true,
            totalDeductions: true,
            deductions: {
              select: {
                type: true,
                total: true,
                chargeValue: true,
                chargeMode: true,
              },
            },
          },
        },
        repayment: {
          select: {
            totalObligation: true,
            totalFees: true,
            feeBreakdowns: {
              select: {
                type: true,
                calculationValueType: true,
                calculationBaseAmount: true,
                calculationTaxAmount: true,
                chargeMode: true,
                total: true,
                chargeValue: true,
                isRecurringDaily: true,
              },
            },
          },
        },
      },
    });

    if (!loans || loans.length === 0) {
      return [];
    }

    return loans.map((loan) => {
      const isCompletedStatus =
        loan.status === loan_status_enum.COMPLETED ||
        loan.status === loan_status_enum.PAID ||
        loan.status === loan_status_enum.WRITE_OFF ||
        loan.status === loan_status_enum.SETTLED;

      if (isCompletedStatus) {
        return loan;
      }

      const { is_repeat_loan, closureDate, ...rest } = loan;
      return rest;
    });
  }

  async getLoanDetailsByLoanId(loanId: string) {
    if (!loanId) {
      throw new BadRequestException("Loan ID is required");
    }

    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        repayment: {
          include: {
            feeBreakdowns: {
              include: {
                taxes: true,
              },
            },
          },
        },
        costSummary: true,
        earlyRepayment: true,
        evaluations: {
          include: {
            evaluation_item: true,
          },
        },
        penalties: true,
        loanStatusHistory: {
          include: {
            partnerUser: {
              select: {
                name: true,
                isActive: true,
                email: true,
                reportsTo: true,
              },
            },
            loan_status_brand_reasons: {
              include: {
                brandStatusReason: {
                  select: {
                    id: true,
                    reason: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
        agreement: true,
        paymentRequests: {
          include: {
            partialCollectionTransactions: {
              include: {
                receipt: true,
              },
            },
            collectionTransactions: {
              include: {
                receipt: true,
              },
            },
            disbursalTransactions: true,
          },
        },
        disbursement: {
          include: {
            deductions: {
              include: {
                taxes: true,
              },
            },
          },
        },
        loanDetails: true,
        user: {
          select: {
            id: true,
            email: true,
            phoneNumber: true,
            alternatePhoneNumbers: {
              select: {
                id: true,
                name: true,
                relationship: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!loan) {
      throw new NotFoundException("Repayment not found");
    }

    return loan;
  }

  // loan statement
  async getLoanStatement(
    loanId: string,
    fromDate: string,
    toDate: string,
    userId: string,
  ) {
    if (!loanId) {
      throw new BadRequestException("Loan ID is required");
    }

    // validate and parse dates
    const parsedFromDate = fromDate ? _dayjs(fromDate) : null;
    const parsedToDate = toDate ? _dayjs(toDate) : null;

    if (fromDate && !parsedFromDate?.isValid()) {
      throw new BadRequestException("Invalid from date format");
    }

    if (toDate && !parsedToDate?.isValid()) {
      throw new BadRequestException("Invalid to date format");
    }

    if (
      parsedFromDate &&
      parsedToDate &&
      parsedFromDate.isAfter(parsedToDate)
    ) {
      throw new BadRequestException("From date cannot be after To date");
    }

    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        // user info
        user: {
          include: {
            userDetails: true,
          },
        },
        // brand info
        brand: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            brandDetails: {
              select: {
                contactEmail: true,
              },
            },
          },
        },
        loanDetails: true, // get loan details table
        disbursement: {
          include: {
            deductions: true,
          },
        },
        repayment: {
          include: {
            feeBreakdowns: true,
          },
        },
        penalties: true,
        costSummary: true,
        paymentRequests: {
          include: {
            disbursalTransactions: {
              where: {
                status: TransactionStatusEnum.SUCCESS,
                ...(parsedFromDate && parsedToDate
                  ? {
                      completedAt: {
                        gte: parsedFromDate.startOf("day").toDate(), // Greater than or equal to fromDate
                        lte: parsedToDate.endOf("day").toDate(), // Less than or equal to toDate
                      },
                    }
                  : {}), // If no dates, get all
              },
              orderBy: {
                completedAt: "asc",
              },
            },
            partialCollectionTransactions: {
              where: {
                status: TransactionStatusEnum.SUCCESS,
                opsApprovalStatus: OpsApprovalStatusEnum.APPROVED,
                ...(parsedFromDate && parsedToDate
                  ? {
                      completedAt: {
                        gte: parsedFromDate.startOf("day").toDate(), // Greater than or equal to fromDate
                        lte: parsedToDate.endOf("day").toDate(), // Less than or equal to toDate
                      },
                    }
                  : {}), // If no dates, get all
              },
              orderBy: {
                completedAt: "asc",
              },
            },
            collectionTransactions: {
              where: {
                status: TransactionStatusEnum.SUCCESS,
                opsApprovalStatus: OpsApprovalStatusEnum.APPROVED,
                ...(parsedFromDate && parsedToDate
                  ? {
                      completedAt: {
                        gte: parsedFromDate.startOf("day").toDate(), // Greater than or equal to fromDate
                        lte: parsedToDate.endOf("day").toDate(), // Less than or equal to toDate
                      },
                    }
                  : {}), // If no dates, get all
              },
              orderBy: {
                completedAt: "asc",
              },
            },
          },
        },
      },
    });

    if (!loan) {
      throw new NotFoundException("Loan not found");
    }

    if (userId && loan.userId !== userId) {
      throw new UnauthorizedException("You cannot access this loan statement");
    }

    const transactions = [];

    // disbursal transactions first
    loan.paymentRequests?.forEach((pr) => {
      pr.disbursalTransactions?.forEach((dt) => {
        transactions.push({
          date: dt.completedAt || dt.createdAt,
          transactionId: dt.externalRef || dt.id,
          remarks: "Loan Disbursal",
          amount: Number(dt.amount),
          type: "DEBIT",
        });
      });
    });

    // processing charges second
    loan.disbursement?.deductions?.forEach((deduction) => {
      if (deduction.type === "processing") {
        transactions.push({
          date: loan.disbursementDate || loan.createdAt,
          transactionId: deduction.id,
          remarks: "Processing Charges",
          amount: deduction.total,
          type: "DEBIT",
        });
      }
    });

    // Find actual payment date (earliest collection/partial collection)
    let actualPaymentDate = null;
    loan.paymentRequests?.forEach((pr) => {
      pr.collectionTransactions?.forEach((ct) => {
        const payDate = ct.completedAt || ct.createdAt;
        if (!actualPaymentDate || payDate < actualPaymentDate) {
          actualPaymentDate = payDate;
        }
      });
      pr.partialCollectionTransactions?.forEach((pct) => {
        const payDate = pct.completedAt || pct.createdAt;
        if (!actualPaymentDate || payDate < actualPaymentDate) {
          actualPaymentDate = payDate;
        }
      });
    });

    // interest charges - accumulated (single entry)
    const interestFee = loan.repayment?.feeBreakdowns?.find(
      (fb) => fb.type === "interest",
    );
    if (interestFee && interestFee.total > 0) {
      const today = _dayjs();
      const dueDate = loan.loanDetails?.dueDate ? _dayjs(loan.loanDetails.dueDate) : today;
      let interestDebitDate: dayjs.Dayjs;
      let interestAmount = interestFee.total;

      if (actualPaymentDate) {
        interestDebitDate = _dayjs(actualPaymentDate);
      } else if (loan.status === loan_status_enum.ACTIVE && today.isBefore(dueDate)) {
        const monthEnd = today.endOf("month");
        interestDebitDate = monthEnd.isBefore(dueDate) ? monthEnd : dueDate;
        
        if (interestFee.isRecurringDaily && loan.disbursementDate) {
          const startDate = _dayjs(loan.disbursementDate);
          const contractualDays = dueDate.diff(startDate, "day") + 1;
          const daysElapsed = today.diff(startDate, "day") + 1;
          interestAmount = (interestFee.total / contractualDays) * daysElapsed;
        }
      } else {
        interestDebitDate = dueDate;
      }

      transactions.push({
        date: interestDebitDate.toDate(),
        remarks: "Interest Charges",
        amount: Math.round(interestAmount * 100) / 100,
        type: "DEBIT",
      });
    }

    // penalties - accumulated by month
    if (
      (loan.status === loan_status_enum.ACTIVE ||
        loan.status === loan_status_enum.OVERDUE ||
        loan.status === loan_status_enum.DEFAULTED ||
        loan.status === loan_status_enum.PARTIALLY_PAID) &&
      loan.penalties?.length > 0 &&
      loan.loanDetails?.dueDate
    ) {
      const dueDate = _dayjs(loan.loanDetails.dueDate).startOf("day");
      const today = _dayjs().startOf("day");
      const overdueDays = today.isAfter(dueDate) ? today.diff(dueDate, "day") : 0;

      if (overdueDays > 0) {
        const principalAmount = loan?.amount || 0;
        const penaltyByMonth = new Map();
        
        for (const penalty of loan.penalties) {
          for (let day = 1; day <= overdueDays; day++) {
            const penaltyDate = dueDate.add(day, "day");
            const monthKey = penaltyDate.format("YYYY-MM");
            
            let dailyPenalty = 0;
            if (penalty.type === PenaltyType.SIMPLE) {
              dailyPenalty = penalty.valueType === FeeValueType.percentage
                ? (principalAmount * penalty.chargeValue) / 100
                : penalty.chargeValue;
            } else if (penalty.type === PenaltyType.COMPOUND) {
              const rate = penalty.chargeValue / 100;
              dailyPenalty = principalAmount * (Math.pow(1 + rate, day) - Math.pow(1 + rate, day - 1));
            }

            if (penalty.taxChargeValue && !penalty.isTaxInclusive) {
              dailyPenalty += penalty.taxValueType === FeeValueType.percentage
                ? (dailyPenalty * penalty.taxChargeValue) / 100
                : penalty.taxChargeValue;
            }

            if (!penaltyByMonth.has(monthKey)) {
              penaltyByMonth.set(monthKey, { amount: 0, endDate: penaltyDate });
            }
            const monthData = penaltyByMonth.get(monthKey);
            monthData.amount += dailyPenalty;
            monthData.endDate = penaltyDate;
          }
        }

        penaltyByMonth.forEach((data, monthKey) => {
          const monthEnd = _dayjs(monthKey + "-01").endOf("month");
          transactions.push({
            date: (data.endDate.isAfter(monthEnd) ? monthEnd : data.endDate).toDate(),
            remarks: `Late Fee (${monthKey})`,
            amount: Math.round(data.amount * 100) / 100,
            type: "DEBIT",
          });
        });
      }
    }

    loan.paymentRequests?.forEach((pr) => {
      pr.collectionTransactions?.forEach((ct) => {
        if (ct.totalPenalties && ct.totalPenalties > 0) {
          transactions.push({
            date: ct.completedAt || ct.createdAt,
            transactionId: `PEN-${ct.id}`,
            remarks: "Late Fee Applied",
            amount: ct.totalPenalties,
            type: "DEBIT",
          });
        }
        transactions.push({
          date: ct.completedAt || ct.createdAt,
          transactionId: ct.externalRef || ct.id,
          remarks: "Loan Repayment",
          amount: Number(ct.amount),
          type: "CREDIT",
        });
      });
      pr.partialCollectionTransactions?.forEach((pct) => {
        if (pct.totalPenalties && pct.totalPenalties > 0) {
          transactions.push({
            date: pct.completedAt || pct.createdAt,
            transactionId: `PEN-${pct.id}`,
            remarks: "Late Fee Applied",
            amount: pct.totalPenalties,
            type: "DEBIT",
          });
        }
        transactions.push({
          date: pct.completedAt || pct.createdAt,
          transactionId: pct.externalRef || pct.id,
          remarks: "Payment Received",
          amount: Number(pct.amount),
          type: "CREDIT",
        });
      });
    });

    // Don't sort - keep insertion order for same-day transactions
    // Only sort transactions that are on different days
    const grouped = new Map();
    transactions.forEach((tx) => {
      const dateKey = _dayjs(tx.date).format("YYYY-MM-DD");
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey).push(tx);
    });

    // Sort by date, but keep insertion order within same day
    const sortedDates = Array.from(grouped.keys()).sort();
    transactions.length = 0;
    sortedDates.forEach((dateKey) => {
      transactions.push(...grouped.get(dateKey));
    });

    // sanction
    transactions.unshift({
      date: loan.approvalDate || loan.createdAt,
      transactionId: loan.formattedLoanId,
      remarks: "Sanctioned Loan Amount",
      amount: loan.amount,
      balance: 0,
    });

    // Calculate opening balance from transactions before fromDate
    let openingBalance = 0;
    if (parsedFromDate) {
      transactions.forEach((tx, index) => {
        if (index === 0) return; // Skip sanction transaction
        const txDate = _dayjs(tx.date);
        if (txDate.isBefore(parsedFromDate, "day")) {
          if (tx.amount !== null) {
            openingBalance += tx.type === "CREDIT" ? -tx.amount : tx.amount;
          }
        }
      });
    }

    // Filter transactions by date range
    const filtered = transactions.filter((tx) => {
      const txDate = _dayjs(tx.date);
      if (parsedFromDate && txDate.isBefore(parsedFromDate, "day")) {
        return false;
      }
      if (parsedToDate && txDate.isAfter(parsedToDate, "day")) {
        return false;
      }
      return true;
    });

    // Calculate balance starting from opening balance
    let balance = openingBalance;
    filtered.forEach((tx, index) => {
      if (index === 0) {
        tx.balance = openingBalance;
        tx.balanceDisplay = Math.abs(openingBalance);
        tx.balanceType = openingBalance >= 0 ? "Dr" : "Cr";
        return;
      }
      if (tx.amount !== null) {
        // Add for DEBIT, subtract for CREDIT
        balance += tx.type === "CREDIT" ? -tx.amount : tx.amount;
      }
      tx.balance = Math.round(balance * 100) / 100;
      // Add display balance (show as positive with Cr/Dr indicator)
      tx.balanceDisplay = Math.abs(tx.balance);
      tx.balanceType = tx.balance >= 0 ? "Dr" : "Cr";
    });

    // Calculate final balance from filtered transactions
    let finalBalance =
      filtered.length > 0 ? filtered[filtered.length - 1].balance || 0 : 0;

    // For completed loans, set final balance to 0 (settlement/waiver)
    if (loan.status === "COMPLETED") {
      finalBalance = 0;
      // Also set last transaction balance to 0
      if (filtered.length > 0) {
        filtered[filtered.length - 1].balance = 0;
        filtered[filtered.length - 1].balanceDisplay = 0;
      }
    }

    let totalPrincipalPaid = 0;
    let totalInterestPaid = 0;
    let totalPenaltiesPaid = 0;
    let excessAmount = 0;

    loan.paymentRequests?.forEach((pr) => {
      pr.collectionTransactions?.forEach((ct) => {
        totalPrincipalPaid += Number(ct.principalAmount || 0);
        totalInterestPaid += Number(ct.totalFees || 0);
        totalPenaltiesPaid += Number(ct.totalPenalties || 0);
        excessAmount += Number(ct.excessAmount || 0);
      });

      pr.partialCollectionTransactions?.forEach((pct) => {
        totalPrincipalPaid += Number(pct.principalAmount || 0);
        totalInterestPaid += Number(pct.totalFees || 0);
        totalPenaltiesPaid += Number(pct.totalPenalties || 0);
        excessAmount += Number(pct.excessAmount || 0);
      });
    });

    // Calculate accrued penalties from transactions
    let accruedPenalties = 0;
    let actualInterestCharged = 0;
    transactions.forEach((tx) => {
      if (tx.remarks?.includes("Accrued Late Fee")) {
        accruedPenalties += tx.amount || 0;
      }
      if (tx.remarks?.includes("Interest Charge")) {
        actualInterestCharged += tx.amount || 0;
      }
    });

    // For completed loans, use actual interest charged from transactions
    // For active loans, use the obligation from repayment
    const totalInterestCharges =
      loan.status === "COMPLETED"
        ? actualInterestCharged
        : loan.repayment?.totalFees || 0;

    // Calculate daily interest rate
    const dailyInterestRate =
      loan.loanDetails?.durationDays && loan.amount
        ? ((loan.repayment?.totalFees || 0) /
            loan.amount /
            loan.loanDetails.durationDays) *
          100
        : 0;

    const loanSummary = {
      sanctionDate: loan.approvalDate,
      sanctionLoanAmount: loan.amount,
      disbursedAmount: loan.disbursement?.netAmount,
      loanType: loan.loanDetails?.type,

      currentInstallmentAmount: loan.repayment?.totalObligation,
      totalDeductions: loan.disbursement?.totalDeductions,
      processingFee: loan.disbursement?.totalDeductions,

      currentRateOfInterest: `${(Math.round(dailyInterestRate * 100) / 100).toFixed(2)}% per day`,
      totalInterestCharges: totalInterestCharges,
      totalTaxes: loan.costSummary?.totalTaxes,
      annualPercentageRate: loan.costSummary?.effectiveAPR || 0,

      balanceLoanTenureDays: _dayjs(loan.loanDetails?.dueDate).isAfter(_dayjs())
        ? _dayjs(loan.loanDetails?.dueDate).diff(_dayjs(), "day")
        : 0,
      sanctionLoanTenureDays: loan.loanDetails?.durationDays,
      dueDate: loan.loanDetails?.dueDate,

      loanStatus: loan.status,

      principalDue:
        loan.status === "COMPLETED"
          ? 0
          : Math.max(0, (loan.amount || 0) - totalPrincipalPaid),
      interestDue:
        loan.status === "COMPLETED"
          ? 0
          : Math.max(0, totalInterestCharges - totalInterestPaid),
      penaltyDue: loan.status === "COMPLETED" ? 0 : accruedPenalties,
      totalDue:
        loan.status === "COMPLETED"
          ? 0
          : Math.max(
              0,
              (loan.amount || 0) +
                totalInterestCharges +
                accruedPenalties -
                (totalPrincipalPaid + totalInterestPaid + totalPenaltiesPaid),
            ),
      excessAmount: excessAmount,
      totalPrincipalPaid: totalPrincipalPaid,
      totalInterestPaid: totalInterestPaid,
      totalPenaltiesPaid: totalPenaltiesPaid,
    };
    return {
      loanId: loan.id,
      formattedLoanId: loan.formattedLoanId,
      status: loan.status,
      brand: {
        name: loan.brand?.name,
        logoUrl: loan.brand?.logoUrl || null,
        contactEmail: loan.brand?.brandDetails?.contactEmail || null,
      },
      user: {
        name:
          `${loan.user?.userDetails?.firstName || ""} ${loan.user?.userDetails?.lastName || ""}`.trim() ||
          null,
        phoneNumber: loan.user?.phoneNumber || null,
        email: loan.user?.email || null,
        address: loan.user?.userDetails?.address || null,
        city: loan.user?.userDetails?.city || null,
        state: loan.user?.userDetails?.state || null,
        pincode: loan.user?.userDetails?.pincode || null,
      },
      loanDetails: {
        dueDate: loan.loanDetails?.dueDate,
        disbursementDate: loan.disbursementDate,
      },
      transactions: filtered,
      currentBalance: finalBalance,
      loanSummary: loanSummary,
    };
  }


  async currentRepayment(
    userId: string,
    loanId: string,
    repaymentDate: dayjs.Dayjs,
    transactionType: TransactionTypeEnum = TransactionTypeEnum.COLLECTION,
    partialAmount = 0,
    partialApplicationDate: string | null = null,
    partialDueDate: string | null = null,
  ) {
    if (!loanId) throw new BadRequestException("Loan ID is required");
    if (!userId) throw new BadRequestException("User ID is required");

    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        repayment: {
          include: {
            feeBreakdowns: {
              include: { taxes: true },
            },
          },
        },
        earlyRepayment: true,
        penalties: true,
        disbursement: {
          include: {
            deductions: {
              include: { taxes: true },
            },
          },
        },
        loanDetails: true,
      },
    });
    const loanRule = await this.prisma.loanRule.findUnique({
      where: {
        brandId_ruleType: {
          brandId: loan?.brandId || "",
          ruleType: loan?.ruleType,
        },
      },
      include: {
        tenures: true,
      },
    });
    if (!loanRule) {
      throw new NotFoundException("Loan rule not found for this loan");
    }

    if (
      loanRule.tenures.is_fee_always_principal ||
      loanRule.tenures.is_skip_disbursement_day_fee
    ) {
      const penaltyPrincipalAmount = new Decimal(loan?.amount || 0);

      // Store original principal - this is the actual loan principal that never changes
      const originalPrincipal = new Decimal(loan?.amount || 0);
      let principalForFeeCalculation = originalPrincipal;
      let principalForRepaymentCalculation = originalPrincipal;

      // Validate transaction type
      if (transactionType === TransactionTypeEnum.PARTIAL_COLLECTION) {
        if (partialApplicationDate) {
          const parsedDate = _dayjs(partialApplicationDate);
          if (!parsedDate.isValid()) {
            throw new BadRequestException(
              "Invalid partial application date format",
            );
          }
          // skip disbursement date based on is_skip_disbursement_day_fee flag
          if (loanRule?.tenures?.is_skip_disbursement_day_fee) {
            loan.disbursementDate = parsedDate.toDate();
            console.log(
              "Skipping disbursement day for fee calculation",
              loan.disbursementDate,
            );
          } else {
            loan.disbursementDate = parsedDate.add(1, "day").toDate();
          }
        }
        // if is_fee_always_principal is true, always calculate fees using original principal
        const isAlwaysPrincipal =
          (loanRule?.tenures as any)?.is_fee_always_principal || false;
        if (isAlwaysPrincipal) {
          // Always use original principal for fee calculations
          principalForFeeCalculation = originalPrincipal;
          // But use partial amount for repayment calculation (what's actually being repaid)
          principalForRepaymentCalculation = new Decimal(partialAmount);
        } else {
          // Use partial amount for both calculations
          principalForFeeCalculation = new Decimal(partialAmount);
          principalForRepaymentCalculation = new Decimal(partialAmount);
        }

        if (partialDueDate) {
          const dueDate = _dayjs(partialDueDate);
          if (!dueDate.isValid()) {
            throw new BadRequestException("Invalid partial due date format");
          }
          loan.loanDetails.dueDate = dueDate.toDate();
        }
      }

      if (!loan) throw new NotFoundException("Loan not found");
      // Verify loan belongs to user
      if (loan.userId !== userId) {
        throw new UnauthorizedException("Loan does not belong to this user");
      }

      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException("User not found");

      // Use the appropriate principal based on context
      // For partial collections: use principalForRepaymentCalculation (what's being repaid)
      // For regular collections: use the original principal from loan details
      const principalAmount = principalForRepaymentCalculation;

      if (!loan.approvalDate) {
        throw new BadRequestException("Loan approval date is required");
      }
      if (!loan.disbursementDate) {
        throw new BadRequestException("Loan disbursement date is required");
      }
      const applicationDate = loan.disbursementDate
        ? _dayjs(loan.disbursementDate).startOf("day")
        : loan.disbursementDate
          ? _dayjs(loan.disbursementDate).startOf("day")
          : _dayjs();

      const dueDate = loan.loanDetails?.dueDate
        ? _dayjs(loan.loanDetails.dueDate).startOf("day")
        : _dayjs();

      // Overdue days (inclusive of both due date and repayment date)
      const overdueDays = repaymentDate.isAfter(dueDate)
        ? repaymentDate.diff(dueDate, "day")
        : 0;

      // Days before due (inclusive of both application and due dates)
      let daysBeforeDue = dueDate.diff(applicationDate, "day");
      if (!loanRule?.tenures?.is_skip_disbursement_day_fee) {
        daysBeforeDue += 1;
      }
      // Total days (inclusive of both application and repayment dates)
      let totalDays = repaymentDate.diff(applicationDate, "day");
      if (!loanRule?.tenures?.is_skip_disbursement_day_fee) {
        totalDays += 1;
      }

      // Track total fees and taxes separately
      let totalFees = new Decimal(0);
      let totalTaxes = new Decimal(0);
      const feeBreakdownDetails = [];

      // Process fee breakdowns - these are EXCLUSIVE fees (added to principal)
      if (loan.repayment?.feeBreakdowns) {
        let repaymentDaysCount = _dayjs(repaymentDate).isAfter(dueDate)
          ? daysBeforeDue
          : totalDays;

        for (const fee of loan.repayment.feeBreakdowns) {
          const rate = new Decimal(fee.chargeValue || 0);
          let feeAmount = new Decimal(0);
          let totalTaxOnFee = new Decimal(0);

          // Calculate base fee amount using the appropriate principal for calculation
          if (fee.isRecurringDaily) {
            if (fee.calculationValueType === FeeValueType.percentage) {
              feeAmount = principalForFeeCalculation
                .mul(rate)
                .div(100)
                .mul(repaymentDaysCount);
            } else {
              feeAmount = rate.mul(repaymentDaysCount);
            }
          } else {
            if (fee.calculationValueType === FeeValueType.percentage) {
              feeAmount = principalForFeeCalculation.mul(rate).div(100);
            } else {
              feeAmount = rate;
            }
          }

          // Calculate taxes on the fee
          const taxDetails = [];
          if (fee.taxes && fee.taxes.length > 0) {
            for (const tax of fee.taxes) {
              const taxValue = new Decimal(tax.chargeValue ?? 0);
              let taxAmount = new Decimal(0);

              if (tax.valueType === FeeValueType.percentage) {
                taxAmount = feeAmount.mul(taxValue).div(100);
              } else {
                taxAmount = taxValue;
              }

              // For exclusive fees, all taxes are added to total
              // (inclusive taxes were already deducted during disbursement)
              if (!tax.isInclusive) {
                totalTaxOnFee = totalTaxOnFee.add(taxAmount);
              }

              taxDetails.push({
                type: tax.type,
                chargeValue: tax.chargeValue,
                taxAmount: taxAmount.toFixed(2),
                isInclusive: tax.isInclusive,
                valueType: tax.valueType,
              });
            }
          }

          // Add fee amount to total fees
          totalFees = totalFees.add(feeAmount);
          totalTaxes = totalTaxes.add(totalTaxOnFee);

          feeBreakdownDetails.push({
            type: fee.type,
            chargeMode: fee.chargeMode,
            valueType: fee.calculationValueType,
            chargeValue: rate.toFixed(4),
            isRecurringDaily: fee.isRecurringDaily,
            calculatedFeeAmount: feeAmount.toFixed(2),
            totalTaxes: totalTaxOnFee.toFixed(2),
            totalAmount: feeAmount.add(totalTaxOnFee).toFixed(2),
            taxes: taxDetails,
            calculation: {
              principalAmount: principalForFeeCalculation.toFixed(2),
              rateApplied: rate.toFixed(4),
              daysApplied: fee.isRecurringDaily ? repaymentDaysCount : 1,
              formula: fee.isRecurringDaily
                ? fee.calculationValueType === FeeValueType.percentage
                  ? `(${principalForFeeCalculation.toFixed(2)} × ${rate.toFixed(4)}% × ${repaymentDaysCount} days) / 100`
                  : `${rate.toFixed(4)} × ${repaymentDaysCount} days`
                : fee.calculationValueType === FeeValueType.percentage
                  ? `(${principalForFeeCalculation.toFixed(2)} × ${rate.toFixed(4)}%) / 100`
                  : `${rate.toFixed(4)} (fixed amount)`,
            },
          });
        }
      }

      // Enhanced penalty calculation with comprehensive breakdown
      let totalPenaltyAmount = new Decimal(0);
      const penaltyBreakdown = [];

      if (overdueDays > 0 && loan.penalties && loan.penalties.length > 0) {
        for (const penalty of loan.penalties) {
          const penaltyRate = new Decimal(penalty.chargeValue || 0);
          let penaltyInterest = new Decimal(0);
          let calculationDetails = {};

          // Calculate penalty based on type with detailed breakdown
          if (penalty.type === PenaltyType.SIMPLE) {
            if (penalty.valueType === FeeValueType.percentage) {
              // Simple Interest: Principal × Rate × Days / 100
              penaltyInterest = penaltyPrincipalAmount
                .mul(penaltyRate)
                .div(100)
                .mul(overdueDays);

              calculationDetails = {
                method: "SIMPLE_INTEREST",
                formula: `(Principal × Rate × Days) / 100`,
                calculation: `(${penaltyPrincipalAmount.toFixed(2)} × ${penaltyRate.toFixed(4)}% × ${overdueDays} days) / 100`,
                stepByStep: [
                  `Base Amount: ₹${penaltyPrincipalAmount.toFixed(2)}`,
                  `Penalty Rate: ${penaltyRate.toFixed(4)}% per day`,
                  `Overdue Days: ${overdueDays} days`,
                  `Penalty = (${penaltyPrincipalAmount.toFixed(2)} × ${penaltyRate.toFixed(4)} × ${overdueDays}) / 100`,
                  `Penalty = ₹${penaltyInterest.toFixed(2)}`,
                ],
              };
            } else {
              // Fixed amount per day
              penaltyInterest = penaltyRate.mul(overdueDays);

              calculationDetails = {
                method: "FIXED_DAILY",
                formula: `Fixed Rate × Days`,
                calculation: `₹${penaltyRate.toFixed(2)} × ${overdueDays} days`,
                stepByStep: [
                  `Fixed Penalty Rate: ₹${penaltyRate.toFixed(2)} per day`,
                  `Overdue Days: ${overdueDays} days`,
                  `Penalty = ${penaltyRate.toFixed(2)} × ${overdueDays}`,
                  `Penalty = ₹${penaltyInterest.toFixed(2)}`,
                ],
              };
            }
          } else if (penalty.type === PenaltyType.COMPOUND) {
            if (penalty.valueType === FeeValueType.percentage) {
              const dailyRate = penaltyRate.div(100);
              const compoundFactor = new Decimal(1).add(dailyRate);

              try {
                // Compound Interest: Principal × (1 + rate)^days - Principal
                const compoundAmount = penaltyPrincipalAmount.mul(
                  compoundFactor.pow(overdueDays),
                );
                penaltyInterest = compoundAmount.minus(penaltyPrincipalAmount);

                calculationDetails = {
                  method: "COMPOUND_INTEREST",
                  formula: `Principal × (1 + Rate)^Days - Principal`,
                  calculation: `${penaltyPrincipalAmount.toFixed(2)} × (1 + ${dailyRate.toFixed(6)})^${overdueDays} - ${penaltyPrincipalAmount.toFixed(2)}`,
                  stepByStep: [
                    `Base Amount: ₹${penaltyPrincipalAmount.toFixed(2)}`,
                    `Daily Rate: ${penaltyRate.toFixed(4)}% = ${dailyRate.toFixed(6)}`,
                    `Overdue Days: ${overdueDays} days`,
                    `Compound Factor: (1 + ${dailyRate.toFixed(6)})^${overdueDays} = ${compoundFactor.pow(overdueDays).toFixed(6)}`,
                    `Compound Amount: ${penaltyPrincipalAmount.toFixed(2)} × ${compoundFactor.pow(overdueDays).toFixed(6)} = ₹${compoundAmount.toFixed(2)}`,
                    `Penalty = ₹${compoundAmount.toFixed(2)} - ₹${penaltyPrincipalAmount.toFixed(2)} = ₹${penaltyInterest.toFixed(2)}`,
                  ],
                };
              } catch (error) {
                // Fallback to simple interest if compound calculation fails
                penaltyInterest = penaltyPrincipalAmount
                  .mul(penaltyRate)
                  .div(100)
                  .mul(overdueDays);

                calculationDetails = {
                  method: "COMPOUND_FALLBACK_TO_SIMPLE",
                  formula: `(Principal × Rate × Days) / 100 [Fallback]`,
                  calculation: `(${penaltyPrincipalAmount.toFixed(2)} × ${penaltyRate.toFixed(4)}% × ${overdueDays} days) / 100`,
                  stepByStep: [
                    `⚠️ Compound calculation failed, using simple interest`,
                    `Base Amount: ₹${penaltyPrincipalAmount.toFixed(2)}`,
                    `Penalty Rate: ${penaltyRate.toFixed(4)}% per day`,
                    `Overdue Days: ${overdueDays} days`,
                    `Penalty = (${penaltyPrincipalAmount.toFixed(2)} × ${penaltyRate.toFixed(4)} × ${overdueDays}) / 100`,
                    `Penalty = ₹${penaltyInterest.toFixed(2)}`,
                  ],
                  error: error.message,
                };
              }
            } else {
              // Fixed compound amount (unusual but possible)
              penaltyInterest = penaltyRate.mul(overdueDays);

              calculationDetails = {
                method: "FIXED_COMPOUND",
                formula: `Fixed Rate × Days`,
                calculation: `₹${penaltyRate.toFixed(2)} × ${overdueDays} days`,
                stepByStep: [
                  `Fixed Compound Rate: ₹${penaltyRate.toFixed(2)} per day`,
                  `Overdue Days: ${overdueDays} days`,
                  `Penalty = ${penaltyRate.toFixed(2)} × ${overdueDays}`,
                  `Penalty = ₹${penaltyInterest.toFixed(2)}`,
                ],
              };
            }
          }

          // Calculate tax on penalty with detailed breakdown
          const taxRate = new Decimal(penalty.taxChargeValue ?? 0);
          let taxOnPenalty = new Decimal(0);
          let taxCalculationDetails = {};

          if (taxRate.gt(0)) {
            if (penalty.taxValueType === FeeValueType.percentage) {
              taxOnPenalty = penaltyInterest.mul(taxRate).div(100);

              taxCalculationDetails = {
                method: "PERCENTAGE_TAX",
                formula: `(Penalty Amount × Tax Rate) / 100`,
                calculation: `(${penaltyInterest.toFixed(2)} × ${taxRate.toFixed(4)}%) / 100`,
                stepByStep: [
                  `Penalty Amount: ₹${penaltyInterest.toFixed(2)}`,
                  `Tax Rate: ${taxRate.toFixed(4)}%`,
                  `Tax = (${penaltyInterest.toFixed(2)} × ${taxRate.toFixed(4)}) / 100`,
                  `Tax = ₹${taxOnPenalty.toFixed(2)}`,
                ],
              };
            } else {
              taxOnPenalty = taxRate;

              taxCalculationDetails = {
                method: "FIXED_TAX",
                formula: `Fixed Tax Amount`,
                calculation: `₹${taxRate.toFixed(2)}`,
                stepByStep: [`Fixed Tax Amount: ₹${taxRate.toFixed(2)}`],
              };
            }
          } else {
            taxCalculationDetails = {
              method: "NO_TAX",
              formula: "No tax applicable",
              calculation: "₹0.00",
              stepByStep: ["No tax configured for this penalty"],
            };
          }

          // Calculate final penalty amount
          let penaltyTotal = penaltyInterest;

          // Add tax if it's not inclusive
          if (!penalty.isTaxInclusive && taxOnPenalty.gt(0)) {
            penaltyTotal = penaltyTotal.add(taxOnPenalty);
          }

          totalPenaltyAmount = totalPenaltyAmount.add(penaltyTotal);

          // Enhanced penalty breakdown with comprehensive details
          penaltyBreakdown.push({
            // Basic penalty info
            penaltyId: penalty.id || `penalty_${penaltyBreakdown.length + 1}`,
            penaltyType: penalty.type,
            penaltyValueType: penalty.valueType,
            penaltyRate: penaltyRate.toFixed(4),

            // Penalty calculation details
            penaltyCalculation: {
              baseAmount: penaltyPrincipalAmount.toFixed(2),
              overdueDays: overdueDays,
              penaltyInterest: penaltyInterest.toFixed(2),
              ...calculationDetails,
            },

            // Tax details
            tax: {
              taxType: penalty.taxType,
              taxValueType: penalty.taxValueType,
              taxRate: taxRate.toFixed(4),
              taxAmount: taxOnPenalty.toFixed(2),
              isTaxInclusive: penalty.isTaxInclusive,
              taxCalculation: taxCalculationDetails,
            },

            // Summary
            summary: {
              penaltyAmount: penaltyInterest.toFixed(2),
              taxAmount: taxOnPenalty.toFixed(2),
              totalPenaltyAmount: penaltyTotal.toFixed(2),
              description: penalty.isTaxInclusive
                ? `Penalty includes tax (₹${penaltyInterest.toFixed(2)} inclusive of ₹${taxOnPenalty.toFixed(2)} tax)`
                : `Penalty ₹${penaltyInterest.toFixed(2)} + Tax ₹${taxOnPenalty.toFixed(2)} = ₹${penaltyTotal.toFixed(2)}`,
            },

            // Detailed breakdown
            breakdown: {
              isOverdue: true,
              daysOverdue: overdueDays,
              dailyPenaltyRate:
                penalty.valueType === FeeValueType.percentage
                  ? `${penaltyRate.toFixed(4)}%`
                  : `₹${penaltyRate.toFixed(2)}`,
              penaltyMethod:
                penalty.type === PenaltyType.SIMPLE
                  ? "Simple Interest"
                  : "Compound Interest",
              taxMethod: penalty.isTaxInclusive
                ? "Tax Inclusive"
                : "Tax Exclusive",
            },
          });
        }
      } else if (overdueDays > 0) {
        // No penalties configured but loan is overdue
        penaltyBreakdown.push({
          penaltyId: "no_penalty_configured",
          penaltyType: null,
          summary: {
            penaltyAmount: "0.00",
            taxAmount: "0.00",
            totalPenaltyAmount: "0.00",
            description: `Loan is ${overdueDays} days overdue but no penalty is configured`,
          },
          breakdown: {
            isOverdue: true,
            daysOverdue: overdueDays,
            penaltyMethod: "No penalty configured",
            taxMethod: "N/A",
          },
        });
      }

      // Calculate final total repayment amount
      const totalRepayment = principalAmount
        .add(totalFees) // Add all fee amounts
        .add(totalTaxes) // Add all exclusive taxes
        .add(totalPenaltyAmount); // Add penalties (including penalty taxes)

      return {
        loanId: loan.id,
        userId: user.id,
        principalAmount: principalAmount.toFixed(2),
        applicationDate: applicationDate.format("YYYY-MM-DD"),
        dueDate: dueDate.format("YYYY-MM-DD"),
        repaymentDate: repaymentDate.format("YYYY-MM-DD"),
        totalDays,
        daysBeforeDue,
        daysAfterDue: overdueDays,
        isOverdue: overdueDays > 0,

        feeBreakdowns: feeBreakdownDetails,
        penaltyBreakdown: penaltyBreakdown,

        totals: {
          principalAmount: principalAmount.toFixed(2),
          totalFees: totalFees.toFixed(2),
          totalTaxes: totalTaxes.toFixed(2),
          totalPenalties: totalPenaltyAmount.toFixed(2),
        },

        totalRepayment: totalRepayment.toFixed(2),
      };
    } else {
      const penaltyPrincipalAmount = new Decimal(loan?.amount || 0);

      // Validate transaction type
      if (transactionType === TransactionTypeEnum.PARTIAL_COLLECTION) {
        if (partialApplicationDate) {
          const parsedDate = _dayjs(partialApplicationDate);
          if (!parsedDate.isValid()) {
            throw new BadRequestException(
              "Invalid partial application date format",
            );
          }
          // skip disbursement date as intrest is already calculated for that in last payment calculation from next day
          loan.disbursementDate = parsedDate.add(1, "day").toDate();
        }

        loan.amount = partialAmount;
        if (partialDueDate) {
          const dueDate = _dayjs(partialDueDate);
          if (!dueDate.isValid()) {
            throw new BadRequestException("Invalid partial due date format");
          }
          loan.loanDetails.dueDate = dueDate.toDate();
        }
      }

      if (!loan) throw new NotFoundException("Loan not found");

      // Verify loan belongs to user
      if (loan.userId !== userId) {
        throw new UnauthorizedException("Loan does not belong to this user");
      }

      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException("User not found");

      const principalAmount = new Decimal(loan?.amount ?? 0);
      // if (principalAmount.isZero())
      //   throw new BadRequestException("Loan principal amount is invalid");
      if (!loan.approvalDate) {
        throw new BadRequestException("Loan approval date is required");
      }
      if (!loan.disbursementDate) {
        throw new BadRequestException("Loan disbursement date is required");
      }

      const applicationDate = loan.disbursementDate
        ? _dayjs(loan.disbursementDate).startOf("day")
        : loan.disbursementDate
          ? _dayjs(loan.disbursementDate).startOf("day")
          : _dayjs();

      const dueDate = loan.loanDetails?.dueDate
        ? _dayjs(loan.loanDetails.dueDate).startOf("day")
        : _dayjs();

      // Overdue days (inclusive of both due date and repayment date)
      const overdueDays = repaymentDate.isAfter(dueDate)
        ? repaymentDate.diff(dueDate, "day")
        : 0;

      // Days before due (inclusive of both application and due dates)
      const daysBeforeDue = dueDate.diff(applicationDate, "day") + 1;

      // Total days (inclusive of both application and repayment dates)
      const totalDays = repaymentDate.diff(applicationDate, "day") + 1;

      // Track total fees and taxes separately
      let totalFees = new Decimal(0);
      let totalTaxes = new Decimal(0);
      const feeBreakdownDetails = [];

      // Process fee breakdowns - these are EXCLUSIVE fees (added to principal)
      if (loan.repayment?.feeBreakdowns) {
        const repaymentDaysCount = _dayjs(repaymentDate).isAfter(dueDate)
          ? daysBeforeDue
          : totalDays;

        for (const fee of loan.repayment.feeBreakdowns) {
          const rate = new Decimal(fee.chargeValue || 0);
          let feeAmount = new Decimal(0);
          let totalTaxOnFee = new Decimal(0);

          // Calculate base fee amount
          if (fee.isRecurringDaily) {
            if (fee.calculationValueType === FeeValueType.percentage) {
              feeAmount = principalAmount
                .mul(rate)
                .div(100)
                .mul(repaymentDaysCount);
            } else {
              feeAmount = rate.mul(repaymentDaysCount);
            }
          } else {
            if (fee.calculationValueType === FeeValueType.percentage) {
              feeAmount = principalAmount.mul(rate).div(100);
            } else {
              feeAmount = rate;
            }
          }

          // Calculate taxes on the fee
          const taxDetails = [];
          if (fee.taxes && fee.taxes.length > 0) {
            for (const tax of fee.taxes) {
              const taxValue = new Decimal(tax.chargeValue ?? 0);
              let taxAmount = new Decimal(0);

              if (tax.valueType === FeeValueType.percentage) {
                taxAmount = feeAmount.mul(taxValue).div(100);
              } else {
                taxAmount = taxValue;
              }

              // For exclusive fees, all taxes are added to total
              // (inclusive taxes were already deducted during disbursement)
              if (!tax.isInclusive) {
                totalTaxOnFee = totalTaxOnFee.add(taxAmount);
              }

              taxDetails.push({
                type: tax.type,
                chargeValue: tax.chargeValue,
                taxAmount: taxAmount.toFixed(2),
                isInclusive: tax.isInclusive,
                valueType: tax.valueType,
              });
            }
          }

          // Add fee amount to total fees
          totalFees = totalFees.add(feeAmount);
          totalTaxes = totalTaxes.add(totalTaxOnFee);

          feeBreakdownDetails.push({
            type: fee.type,
            chargeMode: fee.chargeMode,
            valueType: fee.calculationValueType,
            chargeValue: rate.toFixed(4),
            isRecurringDaily: fee.isRecurringDaily,
            calculatedFeeAmount: feeAmount.toFixed(2),
            totalTaxes: totalTaxOnFee.toFixed(2),
            totalAmount: feeAmount.add(totalTaxOnFee).toFixed(2),
            taxes: taxDetails,
            calculation: {
              principalAmount: principalAmount.toFixed(2),
              rateApplied: rate.toFixed(4),
              daysApplied: fee.isRecurringDaily ? repaymentDaysCount : 1,
              formula: fee.isRecurringDaily
                ? fee.calculationValueType === FeeValueType.percentage
                  ? `(${principalAmount.toFixed(2)} × ${rate.toFixed(4)}% × ${repaymentDaysCount} days) / 100`
                  : `${rate.toFixed(4)} × ${repaymentDaysCount} days`
                : fee.calculationValueType === FeeValueType.percentage
                  ? `(${principalAmount.toFixed(2)} × ${rate.toFixed(4)}%) / 100`
                  : `${rate.toFixed(4)} (fixed amount)`,
            },
          });
        }
      }

      // Enhanced penalty calculation with comprehensive breakdown
      let totalPenaltyAmount = new Decimal(0);
      const penaltyBreakdown = [];

      if (overdueDays > 0 && loan.penalties && loan.penalties.length > 0) {
        for (const penalty of loan.penalties) {
          const penaltyRate = new Decimal(penalty.chargeValue || 0);
          let penaltyInterest = new Decimal(0);
          let calculationDetails = {};

          // Calculate penalty based on type with detailed breakdown
          if (penalty.type === PenaltyType.SIMPLE) {
            if (penalty.valueType === FeeValueType.percentage) {
              // Simple Interest: Principal × Rate × Days / 100
              penaltyInterest = penaltyPrincipalAmount
                .mul(penaltyRate)
                .div(100)
                .mul(overdueDays);

              calculationDetails = {
                method: "SIMPLE_INTEREST",
                formula: `(Principal × Rate × Days) / 100`,
                calculation: `(${penaltyPrincipalAmount.toFixed(2)} × ${penaltyRate.toFixed(4)}% × ${overdueDays} days) / 100`,
                stepByStep: [
                  `Base Amount: ₹${penaltyPrincipalAmount.toFixed(2)}`,
                  `Penalty Rate: ${penaltyRate.toFixed(4)}% per day`,
                  `Overdue Days: ${overdueDays} days`,
                  `Penalty = (${penaltyPrincipalAmount.toFixed(2)} × ${penaltyRate.toFixed(4)} × ${overdueDays}) / 100`,
                  `Penalty = ₹${penaltyInterest.toFixed(2)}`,
                ],
              };
            } else {
              // Fixed amount per day
              penaltyInterest = penaltyRate.mul(overdueDays);

              calculationDetails = {
                method: "FIXED_DAILY",
                formula: `Fixed Rate × Days`,
                calculation: `₹${penaltyRate.toFixed(2)} × ${overdueDays} days`,
                stepByStep: [
                  `Fixed Penalty Rate: ₹${penaltyRate.toFixed(2)} per day`,
                  `Overdue Days: ${overdueDays} days`,
                  `Penalty = ${penaltyRate.toFixed(2)} × ${overdueDays}`,
                  `Penalty = ₹${penaltyInterest.toFixed(2)}`,
                ],
              };
            }
          } else if (penalty.type === PenaltyType.COMPOUND) {
            if (penalty.valueType === FeeValueType.percentage) {
              const dailyRate = penaltyRate.div(100);
              const compoundFactor = new Decimal(1).add(dailyRate);

              try {
                // Compound Interest: Principal × (1 + rate)^days - Principal
                const compoundAmount = penaltyPrincipalAmount.mul(
                  compoundFactor.pow(overdueDays),
                );
                penaltyInterest = compoundAmount.minus(penaltyPrincipalAmount);

                calculationDetails = {
                  method: "COMPOUND_INTEREST",
                  formula: `Principal × (1 + Rate)^Days - Principal`,
                  calculation: `${penaltyPrincipalAmount.toFixed(2)} × (1 + ${dailyRate.toFixed(6)})^${overdueDays} - ${penaltyPrincipalAmount.toFixed(2)}`,
                  stepByStep: [
                    `Base Amount: ₹${penaltyPrincipalAmount.toFixed(2)}`,
                    `Daily Rate: ${penaltyRate.toFixed(4)}% = ${dailyRate.toFixed(6)}`,
                    `Overdue Days: ${overdueDays} days`,
                    `Compound Factor: (1 + ${dailyRate.toFixed(6)})^${overdueDays} = ${compoundFactor.pow(overdueDays).toFixed(6)}`,
                    `Compound Amount: ${penaltyPrincipalAmount.toFixed(2)} × ${compoundFactor.pow(overdueDays).toFixed(6)} = ₹${compoundAmount.toFixed(2)}`,
                    `Penalty = ₹${compoundAmount.toFixed(2)} - ₹${penaltyPrincipalAmount.toFixed(2)} = ₹${penaltyInterest.toFixed(2)}`,
                  ],
                };
              } catch (error) {
                // Fallback to simple interest if compound calculation fails
                penaltyInterest = penaltyPrincipalAmount
                  .mul(penaltyRate)
                  .div(100)
                  .mul(overdueDays);

                calculationDetails = {
                  method: "COMPOUND_FALLBACK_TO_SIMPLE",
                  formula: `(Principal × Rate × Days) / 100 [Fallback]`,
                  calculation: `(${penaltyPrincipalAmount.toFixed(2)} × ${penaltyRate.toFixed(4)}% × ${overdueDays} days) / 100`,
                  stepByStep: [
                    `⚠️ Compound calculation failed, using simple interest`,
                    `Base Amount: ₹${penaltyPrincipalAmount.toFixed(2)}`,
                    `Penalty Rate: ${penaltyRate.toFixed(4)}% per day`,
                    `Overdue Days: ${overdueDays} days`,
                    `Penalty = (${penaltyPrincipalAmount.toFixed(2)} × ${penaltyRate.toFixed(4)} × ${overdueDays}) / 100`,
                    `Penalty = ₹${penaltyInterest.toFixed(2)}`,
                  ],
                  error: error.message,
                };
              }
            } else {
              // Fixed compound amount (unusual but possible)
              penaltyInterest = penaltyRate.mul(overdueDays);

              calculationDetails = {
                method: "FIXED_COMPOUND",
                formula: `Fixed Rate × Days`,
                calculation: `₹${penaltyRate.toFixed(2)} × ${overdueDays} days`,
                stepByStep: [
                  `Fixed Compound Rate: ₹${penaltyRate.toFixed(2)} per day`,
                  `Overdue Days: ${overdueDays} days`,
                  `Penalty = ${penaltyRate.toFixed(2)} × ${overdueDays}`,
                  `Penalty = ₹${penaltyInterest.toFixed(2)}`,
                ],
              };
            }
          }

          // Calculate tax on penalty with detailed breakdown
          const taxRate = new Decimal(penalty.taxChargeValue ?? 0);
          let taxOnPenalty = new Decimal(0);
          let taxCalculationDetails = {};

          if (taxRate.gt(0)) {
            if (penalty.taxValueType === FeeValueType.percentage) {
              taxOnPenalty = penaltyInterest.mul(taxRate).div(100);

              taxCalculationDetails = {
                method: "PERCENTAGE_TAX",
                formula: `(Penalty Amount × Tax Rate) / 100`,
                calculation: `(${penaltyInterest.toFixed(2)} × ${taxRate.toFixed(4)}%) / 100`,
                stepByStep: [
                  `Penalty Amount: ₹${penaltyInterest.toFixed(2)}`,
                  `Tax Rate: ${taxRate.toFixed(4)}%`,
                  `Tax = (${penaltyInterest.toFixed(2)} × ${taxRate.toFixed(4)}) / 100`,
                  `Tax = ₹${taxOnPenalty.toFixed(2)}`,
                ],
              };
            } else {
              taxOnPenalty = taxRate;

              taxCalculationDetails = {
                method: "FIXED_TAX",
                formula: `Fixed Tax Amount`,
                calculation: `₹${taxRate.toFixed(2)}`,
                stepByStep: [`Fixed Tax Amount: ₹${taxRate.toFixed(2)}`],
              };
            }
          } else {
            taxCalculationDetails = {
              method: "NO_TAX",
              formula: "No tax applicable",
              calculation: "₹0.00",
              stepByStep: ["No tax configured for this penalty"],
            };
          }

          // Calculate final penalty amount
          let penaltyTotal = penaltyInterest;

          // Add tax if it's not inclusive
          if (!penalty.isTaxInclusive && taxOnPenalty.gt(0)) {
            penaltyTotal = penaltyTotal.add(taxOnPenalty);
          }

          totalPenaltyAmount = totalPenaltyAmount.add(penaltyTotal);

          // Enhanced penalty breakdown with comprehensive details
          penaltyBreakdown.push({
            // Basic penalty info
            penaltyId: penalty.id || `penalty_${penaltyBreakdown.length + 1}`,
            penaltyType: penalty.type,
            penaltyValueType: penalty.valueType,
            penaltyRate: penaltyRate.toFixed(4),

            // Penalty calculation details
            penaltyCalculation: {
              baseAmount: penaltyPrincipalAmount.toFixed(2),
              overdueDays: overdueDays,
              penaltyInterest: penaltyInterest.toFixed(2),
              ...calculationDetails,
            },

            // Tax details
            tax: {
              taxType: penalty.taxType,
              taxValueType: penalty.taxValueType,
              taxRate: taxRate.toFixed(4),
              taxAmount: taxOnPenalty.toFixed(2),
              isTaxInclusive: penalty.isTaxInclusive,
              taxCalculation: taxCalculationDetails,
            },

            // Summary
            summary: {
              penaltyAmount: penaltyInterest.toFixed(2),
              taxAmount: taxOnPenalty.toFixed(2),
              totalPenaltyAmount: penaltyTotal.toFixed(2),
              description: penalty.isTaxInclusive
                ? `Penalty includes tax (₹${penaltyInterest.toFixed(2)} inclusive of ₹${taxOnPenalty.toFixed(2)} tax)`
                : `Penalty ₹${penaltyInterest.toFixed(2)} + Tax ₹${taxOnPenalty.toFixed(2)} = ₹${penaltyTotal.toFixed(2)}`,
            },

            // Detailed breakdown
            breakdown: {
              isOverdue: true,
              daysOverdue: overdueDays,
              dailyPenaltyRate:
                penalty.valueType === FeeValueType.percentage
                  ? `${penaltyRate.toFixed(4)}%`
                  : `₹${penaltyRate.toFixed(2)}`,
              penaltyMethod:
                penalty.type === PenaltyType.SIMPLE
                  ? "Simple Interest"
                  : "Compound Interest",
              taxMethod: penalty.isTaxInclusive
                ? "Tax Inclusive"
                : "Tax Exclusive",
            },
          });
        }
      } else if (overdueDays > 0) {
        // No penalties configured but loan is overdue
        penaltyBreakdown.push({
          penaltyId: "no_penalty_configured",
          penaltyType: null,
          summary: {
            penaltyAmount: "0.00",
            taxAmount: "0.00",
            totalPenaltyAmount: "0.00",
            description: `Loan is ${overdueDays} days overdue but no penalty is configured`,
          },
          breakdown: {
            isOverdue: true,
            daysOverdue: overdueDays,
            penaltyMethod: "No penalty configured",
            taxMethod: "N/A",
          },
        });
      }

      // Calculate final total repayment amount
      // Total = Principal + All Fees + All Taxes (exclusive) + Penalties
      const totalRepayment = principalAmount
        .add(totalFees) // Add all fee amounts
        .add(totalTaxes) // Add all exclusive taxes
        .add(totalPenaltyAmount); // Add penalties (including penalty taxes)

      return {
        loanId: loan.id,
        userId: user.id,
        principalAmount: principalAmount.toFixed(2),
        applicationDate: applicationDate.format("YYYY-MM-DD"),
        dueDate: dueDate.format("YYYY-MM-DD"),
        repaymentDate: repaymentDate.format("YYYY-MM-DD"),
        totalDays,
        daysBeforeDue,
        daysAfterDue: overdueDays,
        isOverdue: overdueDays > 0,

        feeBreakdowns: feeBreakdownDetails,
        penaltyBreakdown: penaltyBreakdown,

        totals: {
          principalAmount: principalAmount.toFixed(2),
          totalFees: totalFees.toFixed(2),
          totalTaxes: totalTaxes.toFixed(2),
          totalPenalties: totalPenaltyAmount.toFixed(2),
        },

        totalRepayment: totalRepayment.toFixed(2),
      };
    }
  }

  async partialCollection(
    userId: string,
    loanId: string,
    amount: number,
    repaymentDate: dayjs.Dayjs,
    isFinalPaymentPart: boolean = false,
  ) {
    const context = `partialCollection: userId=${userId}, loanId=${loanId}`;

    if (!userId || !loanId) {
      this.logger.warn(`${context} — Missing or invalid parameters`);
      throw new BadRequestException(
        "User ID, Loan ID and valid Amount are required",
      );
    }

    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: { loanDetails: true },
    });

    if (!loan) {
      this.logger.warn(`${context} — Loan not found`);
      throw new NotFoundException("Loan not found");
    }

    // Step 5: Upsert payment request
    const existingRequest = await this.prisma.paymentRequest.upsert({
      where: {
        loanId_type: {
          loanId,
          type: TransactionTypeEnum.PARTIAL_COLLECTION,
        },
      },
      update: {}, // no update needed if found
      create: {
        loanId,
        brandId: loan.brandId,
        userId,
        type: TransactionTypeEnum.PARTIAL_COLLECTION,
        status: TransactionStatusEnum.PENDING,
      },
    });
    if (!existingRequest) {
      this.logger.warn(`${context} — Failed to upsert payment request`);
      throw new BadRequestException(
        "Failed to create or retrieve payment request",
      );
    }
    const existingTransaction =
      await this.prisma.paymentPartialCollectionTransaction.findFirst({
        where: {
          paymentRequestId: existingRequest?.id,
          status: TransactionStatusEnum.SUCCESS,
          opsApprovalStatus: OpsApprovalStatusEnum.APPROVED,
        },
        orderBy: { createdAt: "desc" },
      });

    const decimalAmount = new Decimal(amount);
    // const decimalDiscount = new Decimal(discountAmount || 0);

    if (existingTransaction) {
      this.logger.log(
        `${context} — Existing successful partial transaction found (id=${existingTransaction.id})`,
      );

      const paymentDate = _dayjs(existingTransaction.completedAt || new Date());
      const dueDate = _dayjs(loan.loanDetails?.dueDate || new Date()).startOf(
        "day",
      );
      const isOverdue = paymentDate.isAfter(dueDate);
      let previousDetails: Record<string, any> = {};

      try {
        const rawDetails = existingTransaction.paymentDetails;

        if (typeof rawDetails === "string") {
          // Try parsing only if it's a string
          previousDetails = JSON.parse(rawDetails);
        } else if (typeof rawDetails === "object" && rawDetails !== null) {
          // Already a plain object
          previousDetails = rawDetails;
        }
        // else: leave as empty object
      } catch (error) {
        // Optional: log error or fallback silently
        console.warn("Failed to parse paymentDetails:", error);
        previousDetails = {};
      }

      const currentRepayment = await this.currentRepayment(
        userId,
        loanId,
        repaymentDate,
        TransactionTypeEnum.PARTIAL_COLLECTION,
        previousDetails?.paymentDetails?.principalDueAfterPayment || 0,
        isOverdue
          ? null
          : _dayjs(existingTransaction.completedAt).toISOString(),
        isOverdue
          ? _dayjs(existingTransaction.completedAt).toISOString()
          : null,
      );

      this.logger.log(
        `${context} — Recalculated repayment due to ${isOverdue ? "overdue" : "advance"} payment`,
      );

      const totals = this.calculateAllocation({
        repayment: currentRepayment,
        previousDetails,
        amount: decimalAmount,
        isOverdue,
        isFinalPaymentPart,
        // discountAmount: decimalDiscount,
      });

      this.logger.log(
        `${context} — Partial collection calculated successfully`,
      );
      return totals;
    }

    const currentRepayment = await this.currentRepayment(
      userId,
      loanId,
      repaymentDate,
      TransactionTypeEnum.COLLECTION,
    );
    const totals = this.calculateAllocation({
      repayment: currentRepayment,
      amount: decimalAmount,
      isFinalPaymentPart,
      // discountAmount: decimalDiscount,
    });

    this.logger.log(
      `${context} — New partial collection calculated successfully`,
    );
    return totals;
  }

  private calculateAllocation({
    repayment,
    previousDetails = null,
    amount,
    isOverdue = false,
    isFinalPaymentPart = false,
    // discountAmount = new Decimal(0),
  }: {
    repayment: any;
    previousDetails?: any;
    amount: Decimal;
    isOverdue?: boolean;
    isFinalPaymentPart?: boolean;
    // discountAmount: Decimal;
  }) {
    // Allocation logic
    let remainingRoundOffDiscount = new Decimal(0);
    // Ensure non-negative amount
    let remainingAmount = Decimal.max(new Decimal(0), amount);

    const penaltyBefore = new Decimal(repayment.totals?.totalPenalties || 0);
    const interestBefore = new Decimal(repayment.totals?.totalFees || 0);
    const principalBefore = new Decimal(repayment?.principalAmount || 0);

    const penaltyDue = penaltyBefore.plus(
      new Decimal(
        previousDetails?.penaltyDueAfterPayment ||
          previousDetails?.paymentDetails?.penaltyDueAfterPayment ||
          0,
      ),
    );

    const interestDue = isOverdue
      ? new Decimal(
          previousDetails?.interestDueAfterPayment ||
            previousDetails?.paymentDetails?.interestDueAfterPayment ||
            0,
        )
      : interestBefore.plus(
          new Decimal(
            previousDetails?.interestDueAfterPayment ||
              previousDetails?.paymentDetails?.interestDueAfterPayment ||
              0,
          ),
        );
    // minumun
    const principalDue = principalBefore;

    const autoRoundOffAmount = new Decimal(
      Math.min(1000, principalDue.plus(interestDue).toNumber()),
    );
    const totalDue = penaltyDue.plus(interestDue).plus(principalDue);

    let penaltyDiscount = new Decimal(0);
    let penaltyPaid = new Decimal(0);
    let interestPaid = new Decimal(0);
    let discountOnInterest = new Decimal(0);
    let discountOnPrincipal = new Decimal(0);
    let principalPaid = new Decimal(0);

    if (isFinalPaymentPart) {
      const expectedAmount = interestDue.plus(principalDue);
      if (amount.greaterThanOrEqualTo(expectedAmount)) {
        penaltyDiscount = totalDue.minus(amount);
      } else {
        penaltyDiscount = penaltyDue;
        const roundOffAmount = expectedAmount.minus(amount);
        const effectiveRoundOff = Decimal.max(new Decimal(0), roundOffAmount);
        if (effectiveRoundOff.lessThanOrEqualTo(autoRoundOffAmount)) {
          remainingRoundOffDiscount = effectiveRoundOff;
        } else {
          throw new BadRequestException(
            `Insufficient amount for final payment. Minimum required: ₹${expectedAmount.minus(autoRoundOffAmount).toFixed(2)} -- as you can give maximum discount of ₹${autoRoundOffAmount.toFixed(2)}.`,
          );
        }
      }
    }

    if (remainingAmount.greaterThan(0) && interestDue.greaterThan(0)) {
      const interestDiscount = Decimal.min(
        interestDue,
        remainingRoundOffDiscount,
      );
      discountOnInterest = discountOnInterest.plus(interestDiscount);
      remainingRoundOffDiscount =
        remainingRoundOffDiscount.minus(interestDiscount);

      const payableInterest = Decimal.max(
        new Decimal(0),
        interestDue.minus(interestDiscount),
      );
      interestPaid = Decimal.min(remainingAmount, payableInterest);

      remainingAmount = remainingAmount.minus(interestPaid);
    }

    if (remainingAmount.greaterThan(0) && principalDue.greaterThan(0)) {
      const principalDiscount = Decimal.min(
        principalDue,
        remainingRoundOffDiscount,
      );
      discountOnPrincipal = discountOnPrincipal.plus(principalDiscount);
      remainingRoundOffDiscount =
        remainingRoundOffDiscount.minus(principalDiscount);

      principalPaid = Decimal.min(
        remainingAmount,
        principalDue.minus(principalDiscount),
      );
      remainingAmount = remainingAmount.minus(principalPaid);
    }

    if (remainingAmount.greaterThan(0) && penaltyDue.greaterThan(0)) {
      penaltyPaid = Decimal.min(
        remainingAmount,
        penaltyDue.minus(penaltyDiscount),
      );
      remainingAmount = remainingAmount.minus(penaltyPaid);
    }

    return {
      amount: amount.toNumber(),
      totalFees: interestPaid.toNumber(),
      principalAmount: principalPaid.toNumber(),
      totalPenalties: penaltyPaid.toNumber(),
      discountSummary: {
        roundOffDiscount: {
          interest: discountOnInterest.toNumber(),
          principal: discountOnPrincipal.toNumber(),
          total: discountOnInterest.plus(discountOnPrincipal).toNumber(),
        },
        penalty: penaltyDiscount.toNumber(),
      },
      totalDays: repayment.totalDays,
      daysBeforeDue: repayment.daysBeforeDue,
      daysAfterDue: repayment.daysAfterDue,
      isOverdue: repayment.isOverdue,
      paymentDetails: {
        totalAmountDueAtPayment: totalDue.toNumber(),
        interestDueAtPayment: interestDue.toNumber(),
        principalDueAtPayment: principalDue.toNumber(),
        penaltyDueAtPayment: penaltyDue.toNumber(),
        penaltyDiscountApplied: penaltyDiscount.toNumber(),
        remainingDueAfterPayment: totalDue
          .minus(amount)
          .minus(penaltyDiscount)
          .minus(discountOnInterest)
          .minus(discountOnPrincipal)
          .toNumber(),
        interestDueAfterPayment: interestDue
          .minus(interestPaid)
          .minus(discountOnInterest)
          .toNumber(),
        principalDueAfterPayment: principalDue
          .minus(principalPaid)
          .minus(discountOnPrincipal)
          .toNumber(),
        penaltyDueAfterPayment: penaltyDue
          .minus(penaltyDiscount)
          .minus(penaltyPaid)
          .toNumber(),
      },
      isPrincipalAmountOverridden: principalPaid.lessThan(principalDue),
    };
  }

  async upsertClosingType(loanId: string) {
    if (!loanId) {
      throw new BadRequestException("Loan ID is required.");
    }

    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      select: {
        userId: true,
        brandId: true,
        status: true,
      },
    });

    if (!loan) {
      throw new NotFoundException("Loan not found.");
    }

    const validStatuses: loan_status_enum[] = [
      loan_status_enum.PAID,
      loan_status_enum.ACTIVE,
      loan_status_enum.PARTIALLY_PAID,
    ];

    if (!validStatuses.includes(loan.status)) {
      throw new BadRequestException(
        "Loan must be in PAID, ACTIVE, or PARTIALLY_PAID status to mark as write-off.",
      );
    }

    const isPartial = loan.status === loan_status_enum.PARTIALLY_PAID;
    const transactionType = isPartial
      ? TransactionTypeEnum.PARTIAL_COLLECTION
      : TransactionTypeEnum.COLLECTION;
    // closing type
    const closingType = isPartial
      ? closingTypeEnum.SETTLEMENT
      : closingTypeEnum.WRITE_OFF;
    const payment = await this.prisma.paymentRequest.upsert({
      where: {
        loanId_type: {
          loanId,
          type: transactionType,
        },
      },
      create: {
        loanId,
        brandId: loan.brandId,
        userId: loan.userId,
        type: transactionType,
        status: TransactionStatusEnum.PENDING,
      },
      update: {
        status: TransactionStatusEnum.PENDING,
      },
    });
    const note = isPartial ? "payment settlement" : "Full payment write-off";

    const transactionDataBase = {
      id: uuid(),
      paymentRequestId: payment.id,
      status: TransactionStatusEnum.SUCCESS,
      amount: new Decimal(0),
      currency: "INR",
      externalRef: null,
      retryCount: 0,
      failureReason: null,
      completedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      externalUrl: null,
      receiptId: generateReceiptId(),
      method: PaymentMethodEnum.MANUAL,
      note,
      paymentDetails: null,
      totalFees: 0,
      totalPenalties: 0,
      totalTaxes: 0,
      penaltyDiscount: 0,
      opsApprovalStatus: OpsApprovalStatusEnum.PENDING,
      principalAmount: 0,
      closingType,
      isPaymentComplete: false,
      isReloanApplicable: false,
      roundOffDiscount: 0,
      excessAmount: 0,
      reloanRemark: null,
    };

    // Final transaction object
    const transactionData = isPartial
      ? {
          ...transactionDataBase,
          isPrincipalAmountOverridden: false, // Only exists in the Partial model
        }
      : transactionDataBase;

    return isPartial
      ? this.prisma.paymentPartialCollectionTransaction.create({
          data: transactionData,
        })
      : this.prisma.paymentCollectionTransaction.create({
          data: transactionData,
        });
  }

  private async isPartnerUserAvailable(
    partnerUserId: string,
    brandId: string,
    autoAllocationType: string = "LOGIN",
    isReloan: boolean = false,
  ): Promise<boolean> {
    // First check if partner user is active
    const partnerUser = await this.prisma.partnerUser.findFirst({
      where: {
        id: partnerUserId,
        userPermissions: {
          some: {
            partnerPermission: {
              name: PermissionsEnum.ONBOARDING_COMPLETED,
            },
          },
        },
        brandRoles: {
          some: {
            brandId: brandId,
            role: {
              name: "CREDIT_EXECUTIVE",
            },
          },
        },
        isActive: true,
        ...(isReloan && { isReloanSupport: true }),
      },
    });

    if (!partnerUser) {
      return false;
    }

    // Check availability based on allocation type
    if (autoAllocationType === "LOGIN") {
      const [loginCheck] = await this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count
        FROM partner_user_login_logs pull
        WHERE pull."partnerUserId" = ${partnerUserId}
          AND pull.date = CURRENT_DATE
          AND pull."firstLogin" <= CURRENT_TIMESTAMP
          AND (
            pull."lastLogout" IS NULL 
            OR CURRENT_TIMESTAMP <= pull."lastLogout"
          )
      `;
      return Number(loginCheck?.count || 0) > 0;
    } else {
      // Check if partner is not marked as unavailable today
      const [unavailabilityCheck] = await this.prisma.$queryRaw<
        { count: bigint }[]
      >`
        SELECT COUNT(*) as count
        FROM partner_unavailability_dates pud
        WHERE pud."partnerUserId" = ${partnerUserId}
          AND pud.date = CURRENT_DATE
          AND pud."isActive" = true
      `;

      return Number(unavailabilityCheck?.count || 0) === 0; // Available if no unavailability record exists
    }
  }

  async findLoansForBulkAllocation(params: {
    brandId: string;
    dueDateFrom?: string;
    dueDateTo?: string;
    sourcePartnerUserIds?: string | string[];
    loanStatus?: string[];
    isAllTime?: boolean;
  }) {
    const {
      brandId,
      dueDateFrom,
      dueDateTo,
      sourcePartnerUserIds,
      loanStatus = ["PENDING"],
      isAllTime = false,
    } = params;

    const whereConditions: any = {
      brandId,
      isActive: true,
      status: {
        in: loanStatus,
      },
    };

    // Add date filter based on createdAt if not "all time"
    if (!isAllTime && dueDateFrom && dueDateTo) {
      whereConditions.createdAt = {
        gte: new Date(dueDateFrom),
        lte: new Date(dueDateTo),
      };
    }

    // Handle source partner filter
    let sourcePartnerArray: string[] = [];
    if (sourcePartnerUserIds) {
      if (typeof sourcePartnerUserIds === "string") {
        sourcePartnerArray = sourcePartnerUserIds
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
      } else {
        sourcePartnerArray = sourcePartnerUserIds;
      }
    }

    if (sourcePartnerArray.length > 0) {
      if (sourcePartnerArray.includes("unallocated")) {
        // Include loans with no allotted partners
        whereConditions.allottedPartners = {
          none: {},
        };
      } else {
        // Include loans currently allocated to specific partners
        whereConditions.allottedPartners = {
          some: {
            partnerUserId: {
              in: sourcePartnerArray,
            },
          },
        };
      }
    }

    const loans = await this.prisma.loan.findMany({
      where: whereConditions,
      select: {
        id: true,
        formattedLoanId: true,
        amount: true,
        status: true,
        createdAt: true,
        is_repeat_loan: true,
        user: {
          select: {
            id: true,
            userDetails: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        allottedPartners: {
          select: {
            partnerUserId: true,
            partnerUser: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return loans;
  }

  async getUnallocatedLoans(
    brandId: string,
    page: number = 1,
    limit: number = 20,
    search?: string,
  ) {
    if (!brandId) {
      throw new BadRequestException("Brand ID is required");
    }

    const skip = (page - 1) * limit;
    const whereCondition: any = {
      brandId,
      isActive: true,
      status: { not: loan_status_enum.ONBOARDING },
      allottedPartners: { none: {} },
    };

    if (search) {
      whereCondition.OR = [
        { formattedLoanId: { contains: search, mode: "insensitive" } },
        {
          user: {
            userDetails: {
              firstName: { contains: search, mode: "insensitive" },
            },
          },
        },
        {
          user: {
            userDetails: {
              lastName: { contains: search, mode: "insensitive" },
            },
          },
        },
      ];
    }

    const [loans, total] = await Promise.all([
      this.prisma.loan.findMany({
        where: whereCondition,
        select: {
          id: true,
          formattedLoanId: true,
          amount: true,
          status: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              formattedUserId: true,
              userDetails: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.loan.count({
        where: whereCondition,
      }),
    ]);
    return {
      loans,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async saveCAMCalculator(data: {
    loanId: string;
    userId: string;
    partnerUserId: string;
    brandId: string;
    salaryCreditDate1?: string;
    salaryCreditDate2?: string;
    salaryCreditDate3?: string;
    salaryAmount1?: number;
    salaryAmount2?: number;
    salaryAmount3?: number;
    nextPayDate?: string;
    salaryVariance?: number;
    actualSalary?: number;
    eligibleFoir?: number;
    loanApplied?: number;
    eligibleLoan?: number;
    loanRecommended?: number;
    disbursalDate?: string;
    repayDate?: string;
    tenure?: string;
    tenureId?: string;
    avgSalary?: number;
    foirAchieved?: number;
    roi?: number;
    obligations?: number;
    repaymentData?: any;
  }) {
    try {
      // Validate tenure and get rule type if tenureId provided
      let tenureRiskType: any = null;
      if (data.tenureId) {
        const tenure = await this.prisma.tenure.findUnique({
          where: { id: data.tenureId },
          select: {
            loanRule: {
              select: {
                ruleType: true,
              },
            },
          },
        });

        if (!tenure) {
          throw new BadRequestException("Invalid tenure ID provided");
        }

        tenureRiskType = tenure?.loanRule?.ruleType;
        if (!tenureRiskType) {
          throw new BadRequestException(
            "Tenure does not have a valid risk type",
          );
        }
      }
      const brandConfig = await this.prisma.brandConfig.findFirst({
        where: { brandId: data.brandId },
        select: {
          is_cam_pricing_update: true,
        },
      });
      if (!brandConfig) {
        throw new BadRequestException("Brand configuration not found");
      }
      if (!data.loanId) {
        throw new BadRequestException("Loan ID is required");
      }
      if (!data.userId) {
        throw new BadRequestException("User ID is required");
      }
      if (!data.partnerUserId) {
        throw new BadRequestException("Partner User ID is required");
      }
      if (!data.brandId) {
        throw new BadRequestException("Brand ID is required");
      }
      if (!data.loanRecommended) {
        throw new BadRequestException("Loan Recommended amount is required");
      }
      if (!data.repayDate) {
        throw new BadRequestException("Repay Date is required");
      }

      const loans = await this.prisma.loan.count({
        where: {
          id: data.loanId,
          status: {
            in: [
              loan_status_enum.PENDING,
              loan_status_enum.CREDIT_EXECUTIVE_APPROVED,
            ],
          },
        },
      });

      if (loans === 0) {
        throw new BadRequestException(
          "CAM Calculator can only be saved for loans in PENDING or CREDIT_EXECUTIVE_APPROVED status one its approved my the manager then CAM Calculator cannot be updated",
        );
      }

      // Calculate repayment details
      let repaymentDetails: any = null;
      try {
        // Parse repayDate to get the repayment date for calculation
        const repaymentDate = _dayjs(data.repayDate);

        // Call currentRepayment to get detailed repayment breakdown
        repaymentDetails = await this.currentRepayment(
          data.userId,
          data.loanId,
          repaymentDate,
          TransactionTypeEnum.COLLECTION,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to calculate repayment details for loan ${data.loanId}: ${error.message}`,
        );
        // Continue with saving CAM calculator even if repayment calculation fails
      }

      // Build common CAM calculator data to avoid duplication
      const camData = {
        salaryCreditDate1: data.salaryCreditDate1,
        salaryCreditDate2: data.salaryCreditDate2,
        salaryCreditDate3: data.salaryCreditDate3,
        salaryAmount1: data.salaryAmount1,
        salaryAmount2: data.salaryAmount2,
        salaryAmount3: data.salaryAmount3,
        nextPayDate: data.nextPayDate,
        salaryVariance: data.salaryVariance,
        actualSalary: data.actualSalary,
        eligibleFoir: data.eligibleFoir,
        loanApplied: data.loanApplied,
        eligibleLoan: data.eligibleLoan,
        loanRecommended: data.loanRecommended,
        disbursalDate: data.disbursalDate,
        repayDate: data.repayDate,
        tenure: data.tenure,
        tenureId: data.tenureId,
        avgSalary: data.avgSalary,
        foirAchieved: data.foirAchieved,
        roi: data.roi,
        obligations: data.obligations,
        repaymentData: data.repaymentData,
        repaymentDetails: repaymentDetails, // Include calculated repayment details
      };

      // Execute both operations in a transaction for consistency
      const camCalculator = await this.prisma.$transaction(async (tx) => {
        // Update loan rule type if tenure risk type is available
        if (tenureRiskType && loans > 0 && brandConfig?.is_cam_pricing_update) {
          // Build the update data conditionally
          const loanUpdateData: {
            amount: number;
            ruleType: any;
          } = {
            ruleType: tenureRiskType,
            amount: data.loanRecommended,
          };

          // Note: loanDetails.principal field has been removed from the schema
          // Principal amount is now stored only in loan.amount

          await tx.loan.update({
            where: { id: data.loanId },
            data: loanUpdateData,
          });
        }

        // Upsert CAM calculator
        return tx.cam_calculators.upsert({
          where: { loanId: data.loanId },
          update: {
            ...camData,
            updatedAt: new Date(),
          },
          create: {
            loanId: data.loanId,
            userId: data.userId,
            partnerUserId: data.partnerUserId,
            brandId: data.brandId,
            ...camData,
          },
        });
      });
      // if (
      //   brandConfig?.is_cam_pricing_update &&
      //   repaymentDetails?.loanDetails?.dueDate &&
      //   repaymentDetails?.loanDetails?.principal
      // ) {
      //   await this.updateLoanAmount(
      //     data.userId,
      //     repaymentDetails?.loanDetails?.principal,
      //     data.loanId,
      //     repaymentDetails?.loanDetails?.dueDate
      //   );
      // }
      return {
        success: true,
        message: "CAM Calculator data saved successfully",
        data: camCalculator,
      };
    } catch (error) {
      this.logger.error("Error saving CAM Calculator:", error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to save CAM Calculator data");
    }
  }

  async getCAMCalculator(loanId: string) {
    try {
      const camCalculator = await this.prisma.cam_calculators.findUnique({
        where: { loanId },
      });

      if (!camCalculator) {
        throw new NotFoundException(
          `CAM Calculator data not found for loan ${loanId}`,
        );
      }

      return {
        success: true,
        data: camCalculator,
      };
    } catch (error) {
      this.logger.error("Error fetching CAM Calculator:", error);
      throw new BadRequestException("Failed to fetch CAM Calculator data");
    }
  }

  async getCAMCalculatorByUserId(userId: string, brandId: string) {
    try {
      const camCalculators = await this.prisma.cam_calculators.findMany({
        where: {
          userId,
          brandId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return {
        success: true,
        data: camCalculators,
      };
    } catch (error) {
      this.logger.error("Error fetching CAM Calculators by user:", error);
      throw new BadRequestException("Failed to fetch CAM Calculator data");
    }
  }

  async deleteCAMCalculator(loanId: string) {
    try {
      await this.prisma.cam_calculators.delete({
        where: { loanId },
      });

      return {
        success: true,
        message: "CAM Calculator data deleted successfully",
      };
    } catch (error) {
      this.logger.error("Error deleting CAM Calculator:", error);
      throw new BadRequestException("Failed to delete CAM Calculator data");
    }
  }
}
