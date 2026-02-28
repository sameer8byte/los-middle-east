import {
  BankStatementAnalyzer,
  BankStatementAnalysisResult,
} from "./bankStatementAnalyzer";

/**
 * Example usage of the Bank Statement Analyzer utility
 */
export class BankStatementService {
  /**
   * Analyze bank statement and return structured data
   */
  static async analyzeBankStatementData(
    jsonData: any,
  ): Promise<BankStatementAnalysisResult> {
    try {
      const analysis = BankStatementAnalyzer.analyzeBankStatement(jsonData);
      return analysis;
    } catch (error) {
      throw new Error(`Bank statement analysis failed: ${error.message}`);
    }
  }

  /**
   * Get formatted report for display
   */
  static async getFormattedReport(jsonData: any): Promise<string> {
    const analysis = await this.analyzeBankStatementData(jsonData);
    return BankStatementAnalyzer.generateReport(analysis);
  }

  /**
   * Check specific criteria for loan approval
   */
  static async performLoanEligibilityCheck(jsonData: any): Promise<{
    eligible: boolean;
    reasons: string[];
    riskLevel: string;
    score: number;
  }> {
    const analysis = await this.analyzeBankStatementData(jsonData);

    const reasons: string[] = [];
    let score = 100;

    // Deduct points for negative indicators
    if (analysis.chequeBounce.hasChequeBounce) {
      reasons.push(`Cheque bounces detected: ${analysis.chequeBounce.summary}`);
      score -= 25;
    }

    if (analysis.emiDetails.emiBounces.count > 0) {
      reasons.push(
        `EMI bounces detected: ${analysis.emiDetails.emiBounces.count} bounces`,
      );
      score -= 20;
    }

    if (analysis.fcuTriggers.totalTriggers > 3) {
      reasons.push(
        `Multiple fraud triggers: ${analysis.fcuTriggers.totalTriggers} triggers`,
      );
      score -= 15;
    }

    if (!analysis.salaryCredits.hasSalaryCredits) {
      reasons.push("No salary credits found in the statement");
      score -= 10;
    }

    if (analysis.penalCharges.hasPenalCharges) {
      reasons.push(
        `Penal charges detected: ₹${analysis.penalCharges.totalPenalAmount}`,
      );
      score -= 10;
    }

    // Add points for positive indicators
    if (analysis.salaryCredits.last6MonthsCount >= 6) {
      score += 5;
    }

    if (analysis.accountSummary.averageBalance > 50000) {
      score += 5;
    }

    const eligible = score >= 60;
    const riskLevel = score >= 80 ? "LOW" : score >= 60 ? "MEDIUM" : "HIGH";

    return {
      eligible,
      reasons,
      riskLevel,
      score,
    };
  }

  /**
   * Extract specific details for each requested category
   */
  static async getDetailedBreakdown(jsonData: any) {
    const analysis = await this.analyzeBankStatementData(jsonData);

    return {
      // (a) Cheque Bounce
      chequeBounce: {
        status: analysis.chequeBounce.hasChequeBounce
          ? "DETECTED"
          : "NOT_FOUND",
        inwardCount: analysis.chequeBounce.inwardBounces.count,
        outwardCount: analysis.chequeBounce.outwardBounces.count,
        totalAmount:
          analysis.chequeBounce.inwardBounces.totalAmount +
          analysis.chequeBounce.outwardBounces.totalAmount,
        details: [
          ...analysis.chequeBounce.inwardBounces.details,
          ...analysis.chequeBounce.outwardBounces.details,
        ],
      },

      // (b) EMIs available
      emiDetails: {
        available: analysis.emiDetails.hasEMI,
        totalEMIs: analysis.emiDetails.totalEMIs,
        totalAmount: analysis.emiDetails.totalEMIAmount,
        bounceCount: analysis.emiDetails.emiBounces.count,
        bounceAmount: analysis.emiDetails.emiBounces.totalAmount,
        emiList: analysis.emiDetails.emiList,
      },

      // (c) FCU Triggers from Excel sheet
      fcuTriggers: {
        totalCount: analysis.fcuTriggers.totalTriggers,
        triggers: analysis.fcuTriggers.triggers.map((trigger) => ({
          name: trigger.name,
          count: trigger.count,
          riskLevel: trigger.riskLevel,
          amount: trigger.amount,
          description: trigger.details,
        })),
      },

      // (d) Last 6 months Salary credits
      salaryCredits: {
        last6MonthsCount: analysis.salaryCredits.last6MonthsCount,
        last3MonthsCount: analysis.salaryCredits.last3MonthsCount,
        hasSalaryCredits: analysis.salaryCredits.hasSalaryCredits,
        totalAmount: analysis.salaryCredits.totalSalaryAmount,
        avgMonthlySalary: analysis.salaryCredits.avgMonthlySalary,
        details: analysis.salaryCredits.salaryDetails,
      },

      // (e) ECS transactions
      ecsTransactions: {
        hasECS: analysis.ecsTransactions.hasECS,
        totalCount: analysis.ecsTransactions.totalCount,
        totalAmount: analysis.ecsTransactions.totalAmount,
        transactions: analysis.ecsTransactions.transactions,
      },

      // (f) Penal charges
      penalCharges: {
        hasPenalCharges: analysis.penalCharges.hasPenalCharges,
        totalAmount: analysis.penalCharges.totalPenalAmount,
        breakdown: {
          minimumBalance:
            analysis.penalCharges.penalTypes.minimumBalanceCharges,
          chequeReturn: analysis.penalCharges.penalTypes.chequeReturnCharges,
          bankCharges: analysis.penalCharges.penalTypes.bankCharges,
          emiBounce: analysis.penalCharges.penalTypes.emiBounceCharges,
          other: analysis.penalCharges.penalTypes.other,
        },
        details: analysis.penalCharges.details,
      },

      // Account Summary
      accountSummary: analysis.accountSummary,
    };
  }
}
