import { Injectable, Logger } from "@nestjs/common";

export interface ExtractedCartData {
  regularSalaryCredits: {
    hasRegularCredits: boolean;
    frequency: number;
    monthlyPattern: Record<string, number>;
  };
  accountBounceHistory: {
    hasBounces: boolean;
    bounceCount: number;
    totalBounceAmount: number;
  };
  salaryCreditsConsistency: {
    isConsistent: boolean;
    consistencyScore: number;
    monthlyVariance: number;
  };
  companyName: {
    companyName: string;
  };
  monthlySalaryThreshold: {
    averageSalary: number;
    lastThreeMonthsAverage: number;
    currentMonthSalary: number;
  };
  lastThreeMonthSalary: {
    totalAmount: number;
    monthlyBreakdown: Record<string, number>;
  };
  bankAddressMatch: {
    address: string;
  };
  payDayLoans: {
    hasPayDayLoans: boolean;
    loanCount: number;
    totalAmount: number;
  };
  emailId: {
    extractedEmail: string;
    isValid: boolean;
  };
  employmentType: {
    type: string;
    confidence: number;
  };
}

@Injectable()
export class CartDataExtractorService {
  private readonly logger = new Logger(CartDataExtractorService.name);

  async extractFinancialData(jsonData: any): Promise<ExtractedCartData> {
    try {
      // this.logger.log("Starting financial data extraction from bank statement");
      const statementData = jsonData;
      const extractedData = await this.extractCartData(statementData);
      return extractedData;
    } catch (error) {
      this.logger.error(
        "Error extracting financial data from bank statement JSON",
        error
      );
      throw error;
    }
  }
  /**
   * Transforms the raw bank statement analysis data into the specified ExtractedCartData format.
   * Dynamically extracts month names based on the available data.
   * @param {any} rawData The raw JSON data provided.
   * @returns {Promise<ExtractedCartData>} The extracted data object.
   */
  async extractCartData(rawData: any): Promise<ExtractedCartData> {
    if (!rawData || !rawData.data || rawData.data.length === 0) {
      return {
        regularSalaryCredits: {
          hasRegularCredits: false,
          frequency: 0,
          monthlyPattern: {}
        },
        accountBounceHistory: {
          hasBounces: false,
          bounceCount: 0,
          totalBounceAmount: 0
        },
        salaryCreditsConsistency: {
          isConsistent: false,
          consistencyScore: 0,
          monthlyVariance: 0
        },
        companyName: {
          companyName: 'UNKNOWN'
        },
        monthlySalaryThreshold: {
          averageSalary: 0,
          lastThreeMonthsAverage: 0,
          currentMonthSalary: 0
        },
        lastThreeMonthSalary: {
          totalAmount: 0,
          monthlyBreakdown: {}
        },
        bankAddressMatch: {
          address: 'UNKNOWN'
        },
        payDayLoans: {
          hasPayDayLoans: false,
          loanCount: 0,
          totalAmount: 0
        },
        emailId: {
          extractedEmail: 'UNKNOWN',
          isValid: false
        },
        employmentType: {
          type: 'UNKNOWN',
          confidence: 0
        }
      };
    }

    const data = rawData.data[0]; // Access the first data element
    const camAnalysisData = data.camAnalysisData;

    // Filter out the 'Grand Total' entry from analysisData
    const monthlyAnalysisData = data.analysisData?.filter(
      (m: any) => m.month !== "Grand Total"
    ) || [];
    const monthlyNames = monthlyAnalysisData.map((m: any) => m.month);

    const lastThreeMonthsAnalysis = monthlyAnalysisData.slice(-3);

    // --- Salary Calculations from analysisData ---
    const salaryAmounts = monthlyAnalysisData
      .map((m: any) => m.salaryAmount || 0)
      .filter((salary: number) => salary > 0);

    const averageSalary =
      salaryAmounts.length > 0
        ? parseFloat((salaryAmounts.reduce((a: number, b: number) => a + b, 0) / salaryAmounts.length).toFixed(2))
        : 0.0;

    // Find salary for the very last month evaluated
    const currentMonthSalary =
      monthlyAnalysisData.find(
        (m: any) => m.month === monthlyNames[monthlyNames.length - 1]
      )?.salaryAmount || 0.0;

    // Calculate 3-month average from last three months
    const lastThreeMonthsSalaries = lastThreeMonthsAnalysis.map((m: any) => m.salaryAmount || 0);
    const lastThreeMonthsAverageSalary =
      lastThreeMonthsSalaries.length > 0
        ? parseFloat(
            (lastThreeMonthsSalaries.reduce((a: number, b: number) => a + b, 0) / lastThreeMonthsSalaries.length).toFixed(2)
          )
        : 0.0;

    // Extract company name from account name or transactions
    let companyName = 'UNKNOWN';
    if (data.accountName) {
      companyName = data.accountName;
    } else if (data.transactions && data.transactions.length > 0) {
      // Look for salary-like transactions
      const salaryTransaction = data.transactions.find((t: any) => 
        t.type === 'Cr' && t.amount >= 25000 && t.paymentCategory === 'Fund Transfer'
      );
      if (salaryTransaction && salaryTransaction.name) {
        companyName = salaryTransaction.name;
      }
    }

    // Dynamically build monthly pattern
    const monthlyPattern: Record<string, number> = {};
    monthlyNames.forEach((month: string) => {
      const salaryInMonth = monthlyAnalysisData.find((m: any) => m.month === month)?.salaryAmount || 0;
      monthlyPattern[month] = salaryInMonth > 0 ? 1 : 0;
    });

    const hasRegularCredits = Object.values(monthlyPattern).some(
      (count) => (count as number) > 0
    );

    // Calculate variance based on the actual salary amounts
    const minSalary = salaryAmounts.length > 0 ? Math.min(...salaryAmounts) : 0;
    const maxSalary = salaryAmounts.length > 0 ? Math.max(...salaryAmounts) : 0;
    const monthlyVariance = maxSalary - minSalary;
    const isConsistent = monthlyVariance < (averageSalary * 0.1); // 10% variance threshold
    const consistencyScore =
      averageSalary > 0
        ? parseFloat((1 - (monthlyVariance / averageSalary)).toFixed(4))
        : 0;

    // --- Last Three Month Salary Breakdown ---
    const lastThreeMonthSalaryBreakdown: Record<string, number> = {};
    lastThreeMonthsAnalysis.forEach((monthData: any) => {
      lastThreeMonthSalaryBreakdown[monthData.month] = monthData.salaryAmount || 0.0;
    });

    const lastThreeMonthSalaryTotalAmount = Object.values(
      lastThreeMonthSalaryBreakdown
    ).reduce((sum, amount) => (sum as number) + (amount as number), 0);

    // --- Calculate frequency (number of months with salary) ---
    const salaryFrequency = Object.values(monthlyPattern).filter(count => count > 0).length;

    // --- Output Mapping ---
    return {
      regularSalaryCredits: {
        hasRegularCredits: hasRegularCredits,
        frequency: salaryFrequency,
        monthlyPattern: monthlyPattern,
      },
      accountBounceHistory: {
        hasBounces: (camAnalysisData?.inwardReturnCount || 0) > 0,
        bounceCount: camAnalysisData?.inwardReturnCount || 0,
        totalBounceAmount: camAnalysisData?.inwardReturnAmount || 0,
      },
      salaryCreditsConsistency: {
        isConsistent: isConsistent,
        consistencyScore: consistencyScore,
        monthlyVariance: monthlyVariance,
      },
      companyName: {
        companyName: companyName,
      },
      monthlySalaryThreshold: {
        averageSalary: averageSalary,
        lastThreeMonthsAverage: lastThreeMonthsAverageSalary,
        currentMonthSalary: currentMonthSalary,
      },
      lastThreeMonthSalary: {
        totalAmount: lastThreeMonthSalaryTotalAmount as number,
        monthlyBreakdown: lastThreeMonthSalaryBreakdown,
      },
      bankAddressMatch: {
        address: data.address || 'UNKNOWN',
      },
      payDayLoans: {
        hasPayDayLoans: (camAnalysisData?.loanDisbursal || 0) > 0,
        loanCount: camAnalysisData?.loanDisbursal || 0,
        totalAmount: camAnalysisData?.loanDisbursal || 0,
      },
      emailId: {
        extractedEmail: data.email || 'UNKNOWN',
        isValid: !!(data.email && data.email.includes('@')),
      },
      employmentType: {
        type: hasRegularCredits ? "SALARIED" : "UNKNOWN",
        confidence: hasRegularCredits ? (consistencyScore > 0.8 ? 1.0 : 0.8) : 0.0,
      },
    };
  }
}
