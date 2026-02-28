
import { Injectable, Logger } from '@nestjs/common';

export interface ExtractedAAData {
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
export class AADataExtractorService {
  private readonly logger = new Logger(AADataExtractorService.name);

  async extractFinancialData(jsonData1: any, jsonData2?: any): Promise<ExtractedAAData> {
    try {
      // Primary data source (main bank account)
      const custProfile = jsonData1?.custProfile || {};
      const finalOutput = jsonData1?.finalOutput?.overall || {};
      const entities = jsonData1?.entities?.[0] || {};

      // Secondary data source (additional bank account if available)
      const secondaryFinalOutput = jsonData2?.finalOutput?.overall || {};
      const secondaryEntities = jsonData2?.entities?.[0] || {};

      return {
        regularSalaryCredits: this.extractRegularSalaryCredits(finalOutput, entities, secondaryFinalOutput),
        accountBounceHistory: this.extractAccountBounceHistory(finalOutput, secondaryFinalOutput),
        salaryCreditsConsistency: this.extractSalaryCreditsConsistency(finalOutput, secondaryFinalOutput),
        companyName: this.extractCompanyName(finalOutput, custProfile, secondaryFinalOutput),
        monthlySalaryThreshold: this.extractMonthlySalaryThreshold(finalOutput, secondaryFinalOutput),
        lastThreeMonthSalary: this.extractLastThreeMonthSalary(finalOutput, secondaryFinalOutput),
        bankAddressMatch: this.extractBankAddressMatch(custProfile, entities, secondaryEntities),
        payDayLoans: this.extractPayDayLoans(finalOutput, secondaryFinalOutput),
        emailId: this.extractEmailId(custProfile),
        employmentType: this.extractEmploymentType(finalOutput, custProfile, secondaryFinalOutput),
      };
    } catch (error) {
      this.logger.error('Error extracting financial data from AA JSON', error);
      throw error;
    }
  }

  private extractRegularSalaryCredits(finalOutput: any, entities: any, secondaryFinalOutput?: any): ExtractedAAData['regularSalaryCredits'] {
    try {
      // VAR01A0324 contains salary credit data with month-wise breakdown
      const salaryCredits = finalOutput.VAR01A0324 || {};
      const monthlyCredits = finalOutput.VAR01A0321 || {};
      
      // Combine with secondary account data if available
      const secondaryMonthlyCredits = secondaryFinalOutput?.VAR01A0321 || {};
      
      // Merge monthly credits from both accounts
      const combinedMonthlyCredits = { ...monthlyCredits };
      Object.keys(secondaryMonthlyCredits).forEach(month => {
        if (combinedMonthlyCredits[month]) {
          combinedMonthlyCredits[month] += secondaryMonthlyCredits[month];
        } else {
          combinedMonthlyCredits[month] = secondaryMonthlyCredits[month];
        }
      });
      
      // Count monthly salary transactions
      const monthlyTransactionCount = Object.keys(combinedMonthlyCredits).filter(
        key => combinedMonthlyCredits[key] > 0
      ).length;
      
      const hasRegularCredits = monthlyTransactionCount >= 3; // At least 3 months with salary credits
      
      return {
        hasRegularCredits,
        frequency: monthlyTransactionCount,
        monthlyPattern: combinedMonthlyCredits,
      };
    } catch (error) {
      this.logger.error('Error extracting regular salary credits', error);
      return {
        hasRegularCredits: false,
        frequency: 0,
        monthlyPattern: {},
      };
    }
  }

  private extractAccountBounceHistory(finalOutput: any, secondaryFinalOutput?: any): ExtractedAAData['accountBounceHistory'] {
    try {
      // VAR01A4613 - Bounce count, VAR01A4623 - Total bounce amount
      const bounceCount = (finalOutput.VAR01A4613 || 0) + (secondaryFinalOutput?.VAR01A4613 || 0);
      const totalBounceAmount = (finalOutput.VAR01A4623 || 0) + (secondaryFinalOutput?.VAR01A4623 || 0);
      
      return {
        hasBounces: bounceCount > 0,
        bounceCount,
        totalBounceAmount,
      };
    } catch (error) {
      this.logger.error('Error extracting account bounce history', error);
      return {
        hasBounces: false,
        bounceCount: 0,
        totalBounceAmount: 0,
      };
    }
  }

  private extractSalaryCreditsConsistency(finalOutput: any, secondaryFinalOutput?: any): ExtractedAAData['salaryCreditsConsistency'] {
    try {
      // Using VAR01A0321 for monthly salary amounts
      const monthlyCredits = finalOutput.VAR01A0321 || {};
      const secondaryMonthlyCredits = secondaryFinalOutput?.VAR01A0321 || {};
      
      // Combine monthly credits from both accounts
      const combinedMonthlyCredits = { ...monthlyCredits };
      Object.keys(secondaryMonthlyCredits).forEach(month => {
        if (combinedMonthlyCredits[month]) {
          combinedMonthlyCredits[month] += secondaryMonthlyCredits[month];
        } else {
          combinedMonthlyCredits[month] = secondaryMonthlyCredits[month];
        }
      });
      
      const amounts = Object.values(combinedMonthlyCredits).filter((amount): amount is number => typeof amount === 'number' && amount > 0);
      
      if (amounts.length < 2) {
        return {
          isConsistent: false,
          consistencyScore: 0,
          monthlyVariance: 0,
        };
      }
      
      const average = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
      const variance = amounts.reduce((sum, amount) => sum + Math.pow(amount - average, 2), 0) / amounts.length;
      const stdDeviation = Math.sqrt(variance);
      const coefficientOfVariation = stdDeviation / average;
      
      // Consider consistent if coefficient of variation is less than 0.3 (30%)
      const isConsistent = coefficientOfVariation < 0.3;
      const consistencyScore = Math.max(0, 1 - coefficientOfVariation);
      
      return {
        isConsistent,
        consistencyScore,
        monthlyVariance: variance,
      };
    } catch (error) {
      this.logger.error('Error extracting salary credits consistency', error);
      return {
        isConsistent: false,
        consistencyScore: 0,
        monthlyVariance: 0,
      };
    }
  }

  private extractCompanyName(finalOutput: any, custProfile: any, secondaryFinalOutput?: any): ExtractedAAData['companyName'] {
    try {
      // Get company name from transaction clean text
      const cleanText = finalOutput.VAR04A7331?.CleanText || [];
      const secondaryCleanText = secondaryFinalOutput?.VAR04A7331?.CleanText || [];
      const allCleanText = [...cleanText, ...secondaryCleanText];
      
      // Get salary credit information
      const monthlyCredits = finalOutput.VAR01A0321 || {};
      const secondaryMonthlyCredits = secondaryFinalOutput?.VAR01A0321 || {};
      
      // Combine monthly credits from both accounts
      const combinedMonthlyCredits = { ...monthlyCredits };
      Object.keys(secondaryMonthlyCredits).forEach(month => {
        if (combinedMonthlyCredits[month]) {
          combinedMonthlyCredits[month] += secondaryMonthlyCredits[month];
        } else {
          combinedMonthlyCredits[month] = secondaryMonthlyCredits[month];
        }
      });
      
      // Calculate salary statistics
      const salaryAmounts = Object.values(combinedMonthlyCredits).filter((amount): amount is number => typeof amount === 'number' && amount > 0);
      const totalSalaryCredits = salaryAmounts.reduce((sum, amount) => sum + amount, 0);
      const averageSalary = salaryAmounts.length > 0 ? totalSalaryCredits / salaryAmounts.length : 0;
      const monthsWithSalary = salaryAmounts.length;
      
      // Format company name and salary information
      let companyInfo = '';
      
      if (allCleanText.length > 0) {
        companyInfo = allCleanText.join(', ');
      } else {
        companyInfo = 'UNKNOWN';
      }
      
      // Add salary credit information
      if (monthsWithSalary > 0) {
        companyInfo += ` | Salary Credits: ${monthsWithSalary} months, Avg: ₹${Math.round(averageSalary).toLocaleString('en-IN')}, Total: ₹${Math.round(totalSalaryCredits).toLocaleString('en-IN')}`;
      } else {
        companyInfo += ' | No Salary Credits Found';
      }
      
      return {
        companyName: companyInfo,
      };
    } catch (error) {
      this.logger.error('Error extracting company name', error);
      return {
        companyName: 'UNKNOWN',
      };
    }
  }

  private extractMonthlySalaryThreshold(finalOutput: any, secondaryFinalOutput?: any): ExtractedAAData['monthlySalaryThreshold'] {
    try {
      const monthlyCredits = finalOutput.VAR01A0321 || {};
      const secondaryMonthlyCredits = secondaryFinalOutput?.VAR01A0321 || {};
      
      // Combine monthly credits from both accounts
      const combinedMonthlyCredits = { ...monthlyCredits };
      Object.keys(secondaryMonthlyCredits).forEach(month => {
        if (combinedMonthlyCredits[month]) {
          combinedMonthlyCredits[month] += secondaryMonthlyCredits[month];
        } else {
          combinedMonthlyCredits[month] = secondaryMonthlyCredits[month];
        }
      });
      
      const amounts = Object.values(combinedMonthlyCredits).filter((amount): amount is number => typeof amount === 'number' && amount > 0);
      
      const averageSalary = amounts.length > 0 
        ? amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length 
        : 0;
      
      // Get last 3 months data
      const monthKeys = Object.keys(combinedMonthlyCredits).sort().slice(-3);
      const lastThreeMonthsAmounts = monthKeys.map(key => combinedMonthlyCredits[key]).filter((amount): amount is number => typeof amount === 'number' && amount > 0);
      const lastThreeMonthsAverage = lastThreeMonthsAmounts.length > 0
        ? lastThreeMonthsAmounts.reduce((sum, amount) => sum + amount, 0) / lastThreeMonthsAmounts.length
        : 0;
      
      // Current month salary (most recent)
      const sortedKeys = Object.keys(combinedMonthlyCredits).sort();
      const currentMonthSalary = sortedKeys.length > 0 ? combinedMonthlyCredits[sortedKeys[sortedKeys.length - 1]] || 0 : 0;
      
      return {
        averageSalary,
        lastThreeMonthsAverage,
        currentMonthSalary,
      };
    } catch (error) {
      this.logger.error('Error extracting monthly salary threshold', error);
      return {
        averageSalary: 0,
        lastThreeMonthsAverage: 0,
        currentMonthSalary: 0,
      };
    }
  }

  private extractLastThreeMonthSalary(finalOutput: any, secondaryFinalOutput?: any): ExtractedAAData['lastThreeMonthSalary'] {
    try {
      const monthlyCredits = finalOutput.VAR01A0321 || {};
      const secondaryMonthlyCredits = secondaryFinalOutput?.VAR01A0321 || {};
      
      // Combine monthly credits from both accounts
      const combinedMonthlyCredits = { ...monthlyCredits };
      Object.keys(secondaryMonthlyCredits).forEach(month => {
        if (combinedMonthlyCredits[month]) {
          combinedMonthlyCredits[month] += secondaryMonthlyCredits[month];
        } else {
          combinedMonthlyCredits[month] = secondaryMonthlyCredits[month];
        }
      });
      
      const sortedKeys = Object.keys(combinedMonthlyCredits).sort();
      const lastThreeKeys = sortedKeys.slice(-3);
      
      const monthlyBreakdown: Record<string, number> = {};
      let totalAmount = 0;
      
      lastThreeKeys.forEach(key => {
        const amount = combinedMonthlyCredits[key] || 0;
        monthlyBreakdown[key] = amount;
        totalAmount += amount;
      });
      
      return {
        totalAmount,
        monthlyBreakdown,
      };
    } catch (error) {
      this.logger.error('Error extracting last three month salary', error);
      return {
        totalAmount: 0,
        monthlyBreakdown: {},
      };
    }
  }

  private extractBankAddressMatch(custProfile: any, entities: any, secondaryEntities?: any): ExtractedAAData['bankAddressMatch'] {
    try {
      // Simply return the customer address from profile
      const customerAddress = custProfile.address || '';
      
      return {
        address: customerAddress || 'UNKNOWN',
      };
    } catch (error) {
      this.logger.error('Error extracting bank address', error);
      return {
        address: 'UNKNOWN',
      };
    }
  }

  private extractPayDayLoans(finalOutput: any, secondaryFinalOutput?: any): ExtractedAAData['payDayLoans'] {
    try {
      // Look for payday loan indicators in transaction data
      // VAR01J0013 - count of certain loan transactions, VAR01J0023 - total amount
      const loanTransactionCount = (finalOutput.VAR01J0013 || 0) + (secondaryFinalOutput?.VAR01J0013 || 0);
      const loanAmount = (finalOutput.VAR01J0023 || 0) + (secondaryFinalOutput?.VAR01J0023 || 0);
      
      // These variables might indicate payday loans or similar short-term credit
      const hasPayDayLoans = loanTransactionCount > 0 && loanAmount > 0;
      
      return {
        hasPayDayLoans,
        loanCount: loanTransactionCount,
        totalAmount: loanAmount,
      };
    } catch (error) {
      this.logger.error('Error extracting payday loans', error);
      return {
        hasPayDayLoans: false,
        loanCount: 0,
        totalAmount: 0,
      };
    }
  }

  private extractEmailId(custProfile: any): ExtractedAAData['emailId'] {
    try {
      const email = custProfile.email || '';
      const isValid = this.isValidEmail(email);
      
      return {
        extractedEmail: email || 'UNKNOWN',
        isValid,
      };
    } catch (error) {
      this.logger.error('Error extracting email id', error);
      return {
        extractedEmail: 'UNKNOWN',
        isValid: false,
      };
    }
  }

  private extractEmploymentType(finalOutput: any, custProfile: any, secondaryFinalOutput?: any): ExtractedAAData['employmentType'] {
    try {
      // Based on salary patterns and company information, determine employment type
      const monthlyCredits = finalOutput.VAR01A0321 || {};
      const secondaryMonthlyCredits = secondaryFinalOutput?.VAR01A0321 || {};
      
      // Combine monthly credits from both accounts
      const combinedMonthlyCredits = { ...monthlyCredits };
      Object.keys(secondaryMonthlyCredits).forEach(month => {
        if (combinedMonthlyCredits[month]) {
          combinedMonthlyCredits[month] += secondaryMonthlyCredits[month];
        } else {
          combinedMonthlyCredits[month] = secondaryMonthlyCredits[month];
        }
      });
      
      const regularSalaryCount = Object.values(combinedMonthlyCredits).filter((amount): amount is number => typeof amount === 'number' && amount > 0).length;
      
      let employmentType = 'UNKNOWN';
      let confidence = 0;
      
      if (regularSalaryCount >= 3) {
        employmentType = 'SALARIED';
        confidence = 0.9;
      } else if (regularSalaryCount > 0) {
        employmentType = 'IRREGULAR_INCOME';
        confidence = 0.6;
      } else {
        employmentType = 'SELF_EMPLOYED';
        confidence = 0.4;
      }
      
      return {
        type: employmentType,
        confidence,
      };
    } catch (error) {
      this.logger.error('Error extracting employment type', error);
      return {
        type: 'UNKNOWN',
        confidence: 0,
      };
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

}