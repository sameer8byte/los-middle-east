export interface BankStatementAnalysisResult {
  message: string;
  // (a) Cheque Bounce Details
  chequeBounce: {
    hasChequeBounce: boolean;
    inwardBounces: {
      count: number;
      totalAmount: number;
      details: Array<{
        date: string;
        amount: number;
        payee?: string;
        narration: string;
        category: string;
      }>;
    };
    outwardBounces: {
      count: number;
      totalAmount: number;
      details: Array<{
        date: string;
        amount: number;
        payee?: string;
        narration: string;
        category: string;
      }>;
    };
    summary: string;
  };

  // (b) EMI Details
  emiDetails: {
    hasEMI: boolean;
    totalEMIs: number;
    totalEMIAmount: number;
    emiBounces: {
      count: number;
      totalAmount: number;
    };
    emiList: Array<{
      bank: string;
      amount: number;
      date: string;
      transactionMode: string;
      reference: string;
      status: "SUCCESS" | "BOUNCE";
    }>;
  };

  // (c) FCU (Fraud Control Unit) Triggers
  fcuTriggers: {
    totalTriggers: number;
    triggers: Array<{
      name: string;
      description: string;
      count: number;
      amount?: number;
      details: string;
      riskLevel: "LOW" | "MEDIUM" | "HIGH";
    }>;
  };

  // (d) Salary Credits (Last 6 months)
  salaryCredits: {
    last6MonthsCount: number;
    last3MonthsCount: number;
    totalSalaryAmount: number;
    salaryDetails: Array<{
      month: string;
      amount: number;
      date: string;
      employer?: string;
    }>;
    avgMonthlySalary: number;
    hasSalaryCredits: boolean;
  };

  // (e) ECS Transactions
  ecsTransactions: {
    hasECS: boolean;
    totalCount: number;
    totalAmount: number;
    transactions: Array<{
      date: string;
      amount: number;
      type: "DEBIT" | "CREDIT";
      beneficiary: string;
      purpose: string;
      mode: string;
    }>;
  };

  // (f) Penal Charges
  penalCharges: {
    hasPenalCharges: boolean;
    totalPenalAmount: number;
    penalTypes: {
      minimumBalanceCharges: { count: number; amount: number };
      chequeReturnCharges: { count: number; amount: number };
      bankCharges: { count: number; amount: number };
      emiBounceCharges: { count: number; amount: number };
      other: { count: number; amount: number };
    };
    details: Array<{
      date: string;
      type: string;
      amount: number;
      description: string;
    }>;
  };

  // Additional Analysis
  accountSummary: {
    accountNumber: string;
    bankName: string;
    accountHolderName: string;
    periodStart: string;
    periodEnd: string;
    averageBalance: number;
    minimumBalance: number;
    maximumBalance: number;
    totalCredits: number;
    totalDebits: number;
    fraudScore: number;
  };
}

export class BankStatementAnalyzer {
  /**
   * Analyzes bank statement JSON data and extracts comprehensive details
   * @param statementData - The JSON data from bank statement analysis
   * @returns Comprehensive analysis result
   */
  static analyzeBankStatement(statementData: any): BankStatementAnalysisResult {
    const data = statementData.data?.[0] || statementData;

    if (!data) {
      throw new Error("Invalid bank statement data provided");
    }
    return {
      message: statementData.message || "",
      chequeBounce: this.analyzeChequeBounces(data),
      emiDetails: this.analyzeEMIDetails(data),
      fcuTriggers: this.analyzeFCUTriggers(data),
      salaryCredits: this.analyzeSalaryCredits(data),
      ecsTransactions: this.analyzeECSTransactions(data),
      penalCharges: this.analyzePenalCharges(data),
      accountSummary: this.generateAccountSummary(data),
    };
  }

  private static analyzeChequeBounces(data: any) {
    const camData = data.camAnalysisData || {};
    const transactions = data.transactions || [];

    const outwardBounces = transactions.filter(
      (t: any) => t.paymentCategory === "Cheque Outward Bounce",
    );

    const inwardBounces = transactions.filter(
      (t: any) => t.paymentCategory === "Cheque Inward Bounce",
    );

    const result = {
      hasChequeBounce:
        camData.outwardReturnCount > 0 || camData.inwardReturnCount > 0,
      inwardBounces: {
        count: camData.inwardReturnCount || 0,
        totalAmount: camData.inwardReturnAmount || 0,
        details: inwardBounces.map((t: any) => ({
          date: new Date(t.transactionDate).toLocaleDateString(),
          amount: t.amount,
          payee: t.name,
          narration: t.narration,
          category: t.paymentCategory,
        })),
      },
      outwardBounces: {
        count: camData.outwardReturnCount || 0,
        totalAmount: camData.outwardReturnAmount || 0,
        details: outwardBounces.map((t: any) => ({
          date: new Date(t.transactionDate).toLocaleDateString(),
          amount: t.amount,
          payee: t.name,
          narration: t.narration,
          category: t.paymentCategory,
        })),
      },
      summary: "",
    };

    // Generate summary
    if (result.hasChequeBounce) {
      const totalBounces =
        result.inwardBounces.count + result.outwardBounces.count;
      const totalAmount =
        result.inwardBounces.totalAmount + result.outwardBounces.totalAmount;
      result.summary = `${totalBounces} cheque bounce(s) detected totaling ₹${totalAmount.toLocaleString()}`;
    } else {
      result.summary = "No cheque bounces detected";
    }

    return result;
  }

  private static analyzeEMIDetails(data: any) {
    const analysisData = data.analysisData?.[0] || {};
    const transactions = data.transactions || [];
    const emiData = data.emi || [];

    const emiTransactions = transactions.filter(
      (t: any) =>
        t.paymentCategory === "EMI" ||
        t.narration.toLowerCase().includes("nach"),
    );

    return {
      hasEMI: analysisData.noOfEMI > 0,
      totalEMIs: analysisData.noOfEMI || 0,
      totalEMIAmount: analysisData.totalEMIAmount || 0,
      emiBounces: {
        count: analysisData.noOfEMIBounce || 0,
        totalAmount: analysisData.totalEMIBounceAmount || 0,
      },
      emiList: emiTransactions.map((t: any) => ({
        bank: this.extractBankFromNarration(t.narration),
        amount: t.amount,
        date: new Date(t.transactionDate).toLocaleDateString(),
        transactionMode: t.narration.includes("NACH") ? "NACH" : "Other",
        reference: t.cheque || "",
        status: t.paymentCategory.includes("Bounce") ? "BOUNCE" : "SUCCESS",
      })),
    };
  }

  private static analyzeFCUTriggers(data: any) {
    const fraudIndicators = data.fraudIndicators || [];

    const triggers = fraudIndicators
      .filter(
        (indicator: any) =>
          indicator.transactions?.length > 0 || indicator.name,
      )
      .map((indicator: any) => {
        const triggerCount = indicator.transactions?.length || 1;
        let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";

        // Determine risk level based on indicator type
        if (
          indicator.name.includes("Penny drop") ||
          indicator.name.includes("Rotation of Money")
        ) {
          riskLevel = "HIGH";
        } else if (
          indicator.name.includes("NEFT/RTGS") ||
          indicator.name.includes("Credit Interest")
        ) {
          riskLevel = "MEDIUM";
        }

        return {
          name: indicator.name,
          description: indicator.description,
          count: triggerCount,
          amount: this.calculateTriggerAmount(indicator.transactions),
          details: this.generateTriggerDetails(indicator),
          riskLevel,
        };
      });

    return {
      totalTriggers: triggers.length,
      triggers,
    };
  }

  private static analyzeSalaryCredits(data: any) {
    const camData = data.camAnalysisData || {};
    const transactions = data.transactions || [];

    // Look for salary-related transactions
    const salaryTransactions = transactions.filter(
      (t: any) =>
        t.type === "Cr" &&
        (t.narration.toLowerCase().includes("salary") ||
          t.paymentCategory === "Salary" ||
          t.name?.toLowerCase().includes("payroll")),
    );

    return {
      last6MonthsCount: camData.salaryCreditCountLastSixMonth || 0,
      last3MonthsCount: camData.salaryCreditCountLastThreeMonth || 0,
      totalSalaryAmount: salaryTransactions.reduce(
        (sum: number, t: any) => sum + t.amount,
        0,
      ),
      salaryDetails: salaryTransactions.map((t: any) => ({
        month: new Date(t.transactionDate).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
        }),
        amount: t.amount,
        date: new Date(t.transactionDate).toLocaleDateString(),
        employer: t.name || "Unknown",
      })),
      avgMonthlySalary:
        salaryTransactions.length > 0
          ? salaryTransactions.reduce(
              (sum: number, t: any) => sum + t.amount,
              0,
            ) / salaryTransactions.length
          : 0,
      hasSalaryCredits: salaryTransactions.length > 0,
    };
  }

  private static analyzeECSTransactions(data: any) {
    const analysisData = data.analysisData?.[0] || {};
    const transactions = data.transactions || [];

    const ecsTransactions = transactions.filter(
      (t: any) =>
        t.paymentCategory?.includes("ECS") ||
        t.narration.toLowerCase().includes("ecs") ||
        t.narration.toLowerCase().includes("nach"),
    );

    return {
      hasECS: analysisData.noOfEcsNachTransactions > 0,
      totalCount: analysisData.noOfEcsNachTransactions || 0,
      totalAmount: analysisData.totalEcsNachAmount || 0,
      transactions: ecsTransactions.map((t: any) => ({
        date: new Date(t.transactionDate).toLocaleDateString(),
        amount: t.amount,
        type: t.type === "Cr" ? "CREDIT" : "DEBIT",
        beneficiary: t.name || "Unknown",
        purpose: this.extractPurposeFromNarration(t.narration),
        mode: t.narration.includes("NACH") ? "NACH" : "ECS",
      })),
    };
  }

  private static analyzePenalCharges(data: any) {
    const analysisData = data.analysisData?.[0] || {};
    const transactions = data.transactions || [];

    const penalTransactions = transactions.filter(
      (t: any) =>
        t.paymentCategory?.toLowerCase().includes("charge") ||
        t.narration.toLowerCase().includes("charge") ||
        t.narration.toLowerCase().includes("penalty"),
    );

    const penalTypes = {
      minimumBalanceCharges: {
        count: analysisData.noOfMinimumBalanceCharges || 0,
        amount: 0,
      },
      chequeReturnCharges: {
        count: analysisData.noOfChequeReturnCharges || 0,
        amount: analysisData.totalChequeReturnCharges || 0,
      },
      bankCharges: {
        count: analysisData.noOfBankCharges || 0,
        amount: analysisData.totalBankChargesAmount || 0,
      },
      emiBounceCharges: {
        count: analysisData.noOfEMIBounceCharges || 0,
        amount: 0,
      },
      other: {
        count: 0,
        amount: 0,
      },
    };

    const totalPenalAmount = Object.values(penalTypes).reduce(
      (sum, type) => sum + type.amount,
      0,
    );

    return {
      hasPenalCharges: totalPenalAmount > 0 || penalTransactions.length > 0,
      totalPenalAmount,
      penalTypes,
      details: penalTransactions.map((t: any) => ({
        date: new Date(t.transactionDate).toLocaleDateString(),
        type: this.categorizePenalCharge(t.narration),
        amount: t.amount,
        description: t.narration,
      })),
    };
  }

  private static generateAccountSummary(data: any) {
    const camData = data.camAnalysisData || {};

    return {
      accountNumber: data.accountNumber || "",
      bankName: data.bankFullName || data.bankName || "",
      accountHolderName: data.accountName || "",
      periodStart: data.periodStart || "",
      periodEnd: data.periodEnd || "",
      averageBalance: camData.averageBalance || 0,
      minimumBalance: camData.camAnalysisMonthly?.[0]?.minBalance || 0,
      maximumBalance: camData.camAnalysisMonthly?.[0]?.maxBalance || 0,
      totalCredits: camData.totalNetCredits || 0,
      totalDebits: data.analysisData?.[0]?.debitTransactionsAmount || 0,
      fraudScore: data.fraudScore || 0,
    };
  }

  // Helper methods
  private static extractBankFromNarration(narration: string): string {
    const bankPatterns = [
      /AXIS BANK/i,
      /HDFC/i,
      /ICICI/i,
      /SBI/i,
      /KOTAK/i,
      /PAYTM/i,
    ];

    for (const pattern of bankPatterns) {
      const match = narration.match(pattern);
      if (match) {
        return match[0];
      }
    }
    return "Unknown Bank";
  }

  private static extractPurposeFromNarration(narration: string): string {
    if (narration.toLowerCase().includes("emi")) return "EMI Payment";
    if (narration.toLowerCase().includes("insurance"))
      return "Insurance Premium";
    if (narration.toLowerCase().includes("sip")) return "SIP Investment";
    if (narration.toLowerCase().includes("utility")) return "Utility Payment";
    return "Other";
  }

  private static categorizePenalCharge(narration: string): string {
    const lowerNarration = narration.toLowerCase();
    if (lowerNarration.includes("minimum balance"))
      return "Minimum Balance Charge";
    if (lowerNarration.includes("cheque return")) return "Cheque Return Charge";
    if (lowerNarration.includes("emi bounce")) return "EMI Bounce Charge";
    if (lowerNarration.includes("penalty")) return "Penalty Charge";
    return "Bank Charge";
  }

  private static calculateTriggerAmount(transactions: any[]): number {
    if (!transactions || transactions.length === 0) return 0;
    return transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  }

  private static generateTriggerDetails(indicator: any): string {
    if (indicator.transactions && indicator.transactions.length > 0) {
      return `${indicator.transactions.length} transactions flagged`;
    }
    return indicator.description || "No additional details";
  }

  /**
   * Generate a formatted report from the analysis
   */
  static generateReport(analysis: BankStatementAnalysisResult): string {
    let report = `
    # Bank Statement Analysis Report
    
    ## Account Summary
    - **Account Number**: ${analysis.accountSummary.accountNumber}
    - **Bank**: ${analysis.accountSummary.bankName}
    - **Account Holder**: ${analysis.accountSummary.accountHolderName}
    - **Period**: ${analysis.accountSummary.periodStart} to ${analysis.accountSummary.periodEnd}
    - **Average Balance**: ₹${analysis.accountSummary.averageBalance.toLocaleString()}
    
    ## Key Findings
    
    ### (a) Cheque Bounces
    ${
      analysis.chequeBounce.hasChequeBounce
        ? `⚠️ **${analysis.chequeBounce.summary}**`
        : "✅ No cheque bounces detected"
    }
    
    ### (b) EMI Details
    ${
      analysis.emiDetails.hasEMI
        ? `📊 **${analysis.emiDetails.totalEMIs} EMI(s) totaling ₹${analysis.emiDetails.totalEMIAmount.toLocaleString()}**`
        : "✅ No EMI transactions found"
    }
    
    ### (c) FCU Triggers
    ${
      analysis.fcuTriggers.totalTriggers > 0
        ? `🚨 **${analysis.fcuTriggers.totalTriggers} fraud triggers detected**`
        : "✅ No fraud triggers detected"
    }
    
    ### (d) Salary Credits
    ${
      analysis.salaryCredits.hasSalaryCredits
        ? `💰 **${analysis.salaryCredits.last6MonthsCount} salary credits in last 6 months totaling ₹${analysis.salaryCredits.totalSalaryAmount.toLocaleString()}**
        
        | Month       | Date       | Amount      | Employer             |
        |-------------|------------|-------------|-----------------------|
        ${analysis.salaryCredits.salaryDetails
          .map(
            (s) =>
              `| ${s.month} | ${s.date} | ₹${s.amount.toLocaleString()} | ${s.employer} |`,
          )
          .join("\n")}
        
        - **Average Monthly Salary**: ₹${analysis.salaryCredits.avgMonthlySalary.toFixed(2)}
        `
        : "❌ No salary credits found"
    }
    
    ### (e) ECS Transactions
    ${
      analysis.ecsTransactions.hasECS
        ? `🔄 **${analysis.ecsTransactions.totalCount} ECS transactions totaling ₹${analysis.ecsTransactions.totalAmount.toLocaleString()}**`
        : "✅ No ECS transactions found"
    }
    
    ### (f) Penal Charges
    ${
      analysis.penalCharges.hasPenalCharges
        ? `💸 **₹${analysis.penalCharges.totalPenalAmount.toLocaleString()} in penal charges**`
        : "✅ No penal charges detected"
    }
    
    ## Risk Assessment
    - **Fraud Score**: ${analysis.accountSummary.fraudScore}/100
    - **Overall Risk**: ${this.calculateRiskLevel(analysis)}
    `;

    return report;
  }

  private static calculateRiskLevel(
    analysis: BankStatementAnalysisResult,
  ): string {
    let riskScore = 0;

    if (analysis.chequeBounce.hasChequeBounce) riskScore += 30;
    if (analysis.emiDetails.emiBounces.count > 0) riskScore += 25;
    if (analysis.fcuTriggers.totalTriggers > 3) riskScore += 20;
    if (analysis.penalCharges.hasPenalCharges) riskScore += 15;
    if (!analysis.salaryCredits.hasSalaryCredits) riskScore += 10;

    if (riskScore >= 70) return "HIGH";
    if (riskScore >= 40) return "MEDIUM";
    return "LOW";
  }
}
