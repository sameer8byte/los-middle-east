import { Injectable, Logger } from "@nestjs/common";
import * as dayjs from "dayjs";
import { closingTypeEnum, loan_status_enum } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";

const _dayjs = dayjs.default;
export enum LoanDecisionType {
  HARD_STOP = "HARD_STOP",
  HIGH_DPD = "HIGH_DPD",
  AUTOMATED_FLOW = "AUTOMATED_FLOW",
  MANUAL_REVIEW_REQUIRED = "MANUAL_REVIEW_REQUIRED",
  BANK_STATEMENT_REQUIRED = "BANK_STATEMENT_REQUIRED",
  AMOUNT_INCREASE = "AMOUNT_INCREASE",
}
// LESS_90_DAYS,MORE_90_DAYS
export type ReloanBucket = "LESS_90_DAYS" | "MORE_90_DAYS";

export enum ReloanBucketEnum {
  LESS_90_DAYS = "LESS_90_DAYS",
  MORE_90_DAYS = "MORE_90_DAYS",
}
export interface ReloanEligibilityContext {
  userId: string;
  brandId: string;
  loan_rule_type: string;
  loan_rule_min_term_days: number;
  loan_rule_max_term_days: number;
  previousLoanId: string;
  previousDisbursementDate: Date;
  previousDueDate: Date;
  previousClosureDate: Date;
  previousClosureStatus: closingTypeEnum;
  previousLoanStatus: loan_status_enum;
  previousLoanAmount: number;
  requestLoanAmount: number;
  requestDueDate: Date;
  aa_availability: boolean;
  is_migrated_loan: boolean;
}

export interface ReloanEligibilityResult {
  eligible: boolean;
  reasons: string[];
  bucket: ReloanBucketEnum;
  flags: LoanDecisionType[];
  requiresManualReview: boolean;
  step: loan_status_enum;
}

export interface ReloanEvaluationDto {
  userId: string;
  previousLoanId: string;
  brandId: string;
  reason?: string;
}

@Injectable()
export class ReloanAutomationService {
  private readonly logger = new Logger(ReloanAutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {} /**
   * Evaluate reloan eligibility based on business rules
   */
  async evaluateReloanEligibility(
    context: ReloanEligibilityContext,
  ): Promise<ReloanEligibilityResult> {
    const reasons: string[] = [];
    const flags: LoanDecisionType[] = [];
    let requiresManualReview = false;
    let step: loan_status_enum = loan_status_enum.REJECTED;
    if (
      !context.userId ||
      !context.brandId ||
      !context.previousLoanId ||
      !context.previousClosureDate ||
      !context.previousDueDate ||
      !context.previousDisbursementDate ||
      !context.previousClosureStatus ||
      !context.previousLoanStatus ||
      !context.previousLoanAmount ||
      !context.requestLoanAmount ||
      !context.requestDueDate ||
      !context.loan_rule_max_term_days ||
      !context.loan_rule_min_term_days ||
      !context.loan_rule_type ||
      // loan rule
      context.loan_rule_type === undefined ||
      context.loan_rule_min_term_days === undefined ||
      context.loan_rule_max_term_days === undefined ||
      context.previousLoanAmount === undefined ||
      context.requestLoanAmount === undefined ||
      context.requestDueDate === undefined ||
      context.aa_availability === undefined ||
      context.is_migrated_loan === undefined
    ) {
      return {
        eligible: true,
        reasons: ["Missing required date information"],
        bucket: ReloanBucketEnum.LESS_90_DAYS,
        flags: [LoanDecisionType.MANUAL_REVIEW_REQUIRED],
        requiresManualReview: true,
        step: loan_status_enum.PENDING,
      };
    }
    if (context.is_migrated_loan) {
      return {
        eligible: true,
        reasons: [
          "migrated loan - requires manual review due to potential data inconsistencies",
        ],
        bucket: ReloanBucketEnum.LESS_90_DAYS,
        flags: [LoanDecisionType.MANUAL_REVIEW_REQUIRED],
        requiresManualReview: true,
        step: loan_status_enum.PENDING,
      };
    }

    // Hard stops - disqualifying factors
    if (context.previousLoanStatus !== "COMPLETED") {
      return {
        eligible: false,
        reasons: ["Previous loan is not completed"],
        bucket: ReloanBucketEnum.LESS_90_DAYS,
        flags: [LoanDecisionType.HARD_STOP],
        requiresManualReview: false,
        step,
      };
    }

    // Hard stops - SETTLEMENT or NORMAL closure
    if (context.previousClosureStatus !== "NORMAL") {
      return {
        eligible: false,
        reasons: [
          `Previous loan closed with status: ${context.previousClosureStatus}`,
        ],
        bucket: ReloanBucketEnum.LESS_90_DAYS,
        flags: [LoanDecisionType.HARD_STOP],
        requiresManualReview: false,
        step,
      };
    }

    // Hard stops - DPD check (Days Past Due > 30)
    const daysPastDue = _dayjs(context.previousClosureDate).diff(
      _dayjs(context.previousDueDate),
      "day",
    );
    if (daysPastDue > 30) {
      return {
        eligible: false,
        reasons: [`Days past due (${daysPastDue}) exceeds 30 days`],
        bucket: ReloanBucketEnum.LESS_90_DAYS,
        flags: [LoanDecisionType.HIGH_DPD],
        requiresManualReview: false,
        step,
      };
    }
    // Time bucket calculation
    const daysElapsed = _dayjs().diff(
      _dayjs(context.previousDisbursementDate),
      "day",
    );
    const bucket =
      daysElapsed < 90
        ? ReloanBucketEnum.LESS_90_DAYS
        : ReloanBucketEnum.MORE_90_DAYS;

    // Time bucket routing - MORE_90_DAYS requires manual review
    if (bucket === "MORE_90_DAYS") {
      return {
        eligible: true,
        reasons: [
          "Reloan after 90+ days since previous disbursement - requires manual review",
        ],
        bucket: bucket as ReloanBucketEnum,
        flags: [LoanDecisionType.MANUAL_REVIEW_REQUIRED],
        requiresManualReview: true,
        step: loan_status_enum.PENDING,
      };
    }
    // diff between current due date and previous due date
    const referencesDueDate = await this.getNextDueDateWithMinGap(
      context.previousDueDate,
      context.loan_rule_min_term_days,
    );
    // if referencesDueDate and requestDueDate diff greater the 3
    const dueDateDiff = _dayjs(context.requestDueDate).diff(
      _dayjs(referencesDueDate),
      "day",
    );
    if (dueDateDiff > 3 || dueDateDiff < -3) {
      return {
        eligible: true,
        reasons: [
          `Requested due date (${context.requestDueDate}) is more than 3 days after the reference due date (${referencesDueDate}) - requires manual review`,
        ],
        bucket: bucket as ReloanBucketEnum,
        flags: [LoanDecisionType.MANUAL_REVIEW_REQUIRED],
        requiresManualReview: true,
        step: loan_status_enum.CREDIT_EXECUTIVE_APPROVED,
      };
    }
    if (context.aa_availability) {
      // Amount comparison - if more than previous, also requires manual review

      if (context.requestLoanAmount > context.previousLoanAmount) {
        reasons.push(
          `Current loan amount (${context.requestLoanAmount}) exceeds previous amount (${context.previousLoanAmount})`,
        );
        flags.push(LoanDecisionType.AMOUNT_INCREASE);
        step = loan_status_enum.CREDIT_EXECUTIVE_APPROVED;
      } else {
        reasons.push(
          `Current loan amount (${context.requestLoanAmount}) is less than or equal to previous amount (${context.previousLoanAmount}) - eligible for automated flow`,
        );
        flags.push(LoanDecisionType.AUTOMATED_FLOW);
        step = loan_status_enum.CREDIT_EXECUTIVE_APPROVED;
      }
    } else {
      reasons.push(
        "AA availability is false - requires two bank statements before applying",
      );
      flags.push(LoanDecisionType.BANK_STATEMENT_REQUIRED);
      step = loan_status_enum.CREDIT_EXECUTIVE_APPROVED;
    }
    return {
      eligible: true,
      reasons,
      bucket: bucket as ReloanBucketEnum,
      flags,
      requiresManualReview,
      step,
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
  /**
   * Log reloan automation evaluation to database
   */
  async logReloanAutomation(
    context: ReloanEligibilityContext,
    result: ReloanEligibilityResult,
  ): Promise<void> {
    try {
      await this.prisma.reloan_automation_log.create({
        data: {
          user_id: context.userId,
          brand_id: context.brandId,
          previous_loan_id: context.previousLoanId,
          request_amount: context.requestLoanAmount,
          previous_disbursement_date: context.previousDisbursementDate,
          previous_due_date: context.previousDueDate,
          previous_closure_date: context.previousClosureDate,
          previous_closure_status: context.previousClosureStatus,
          previous_loan_status: context.previousLoanStatus,
          previous_loan_amount: context.previousLoanAmount,
          is_migrated_loan: context.is_migrated_loan || false,
          aa_available: context.aa_availability,
          eligible: result.eligible,
          reasons: JSON.stringify(result.reasons || []),
          evaluation_rules: JSON.stringify({
            bucket: result.bucket,
            flags: result.flags,
            requiresManualReview: result.requiresManualReview,
            step: result.step,
          }),
        },
      });
    } catch (logError) {
      this.logger.error(
        `Failed to log reloan automation for user ${context.userId}:`,
        logError.message,
      );
      // Don't fail the evaluation if logging fails
    }
  }
}
