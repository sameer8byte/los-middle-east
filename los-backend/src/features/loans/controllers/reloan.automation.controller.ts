import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Param,
} from "@nestjs/common";
import { ReloanAutomationService } from "../services/reloan.automation.service";
import { AuthType } from "src/common/decorators/auth.decorator";
import { PrismaService } from "src/prisma/prisma.service";
import { loan_status_enum } from "@prisma/client";

@Controller("brand/:brandId/user/:userId/loans/reloan-automation")
export class ReloanAutomationController {
  constructor(
    private readonly prisma: PrismaService,

    private readonly reloanAutomationService: ReloanAutomationService,
  ) {}

  /**
   * Evaluate reloan eligibility for a user
   * POST /loans/reloan-automation/evaluate
   */
  @AuthType("public")
  @Post("eligibility-check")
  @HttpCode(HttpStatus.OK)
  async evaluateReloanEligibility(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
    @Body("requestAmount") requestAmount: number,
    @Body("requestDueDate") requestDueDate: Date,
    @Body("loan_rule_max_term_days") loan_rule_max_term_days: number,
    @Body("loan_rule_min_term_days") loan_rule_min_term_days: number,
    @Body("loan_rule_type") loan_rule_type: string,
  ) {
    const isAAAvailable = !!(await this.prisma.aa_consent_requests.findFirst({
      where: {
        userId,
        brandId,
        consentStatus: "ACTIVE",
      },
      select: { id: true },
    }));
    const lastLoan = await this.prisma.loan.findFirst({
      where: {
        userId,
        brandId,
        status: {
          notIn: [loan_status_enum.CANCELLED],
        },
        disbursementDate: { not: null },
      },
      select: {
        id: true,
        disbursementDate: true,
        closureDate: true,
        closingType: true,
        status: true,
        amount: true,
        isMigratedloan: true,
        loanDetails: {
          select: {
            dueDate: true,
          },
        },
      },
      orderBy: {
        disbursementDate: "desc",
      },
    });
    if (!lastLoan) {
      return {
        eligible: false,
        reasons: ["No previous loan found for user"],
      };
    }
    const reloanEligibilityContext = {
      userId: userId,
      brandId: brandId,
      previousLoanId: lastLoan.id,
      previousDisbursementDate: lastLoan.disbursementDate,
      previousDueDate: lastLoan.loanDetails?.dueDate,
      previousClosureDate: lastLoan.closureDate,
      previousClosureStatus: lastLoan.closingType,
      previousLoanStatus: lastLoan.status,
      previousLoanAmount: lastLoan.amount,
      requestLoanAmount: requestAmount,
      requestDueDate: requestDueDate,
      aa_availability: !!isAAAvailable,
      is_migrated_loan: lastLoan.isMigratedloan || false,
      loan_rule_max_term_days,
      loan_rule_min_term_days,
      loan_rule_type,
    };
    return this.reloanAutomationService.evaluateReloanEligibility(
      reloanEligibilityContext,
    );
  }
}
