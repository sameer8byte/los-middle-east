import { Injectable, Logger } from '@nestjs/common';
import { logger } from '@trigger.dev/sdk/v3';

export interface ExtractedEquifaxData {
  loanInquiryCount: {
    count: number;
    last30Days: number;
    last90Days: number;
  };
  previousLoanRepayment: {
    hasDefault: boolean;
    defaultAmount: number;
    overdueAccounts: number;
    totalAmountOverdue: number;
  };
  creditBureauScore: {
    score: number;
    scoreType: string;
  };
  ntc: {
    score: number;
    consistency: string;
  };
  activePayDayLoans: {
    count: number;
    totalAmount: number;
    hasActiveLoans: boolean;
  };
  pastDueAmount: {
    amount: number;
    accountsWithPastDue: number;
  };
  addressesMatch: {
    isMatch: boolean;
    matchScore: number;
    addresses: string[];
  };
}

@Injectable()
export class EquifaxDataExtractorService {
  private readonly logger = new Logger(EquifaxDataExtractorService.name);

  async extractFinancialData(jsonData: any): Promise<ExtractedEquifaxData> {
    try {
      // Detect and normalize structure
      const reportData =
        jsonData?.CCRResponse?.CIRReportDataLst?.[0]?.CIRReportData ||
        jsonData?.['CIR-REPORT-FILE']?.['REPORT-DATA'];

      if (!reportData) throw new Error('Invalid or unsupported Equifax JSON structure');

      const enquirySummary =
        reportData.EnquirySummary || reportData['ENQUIRY-SUMMARY'] || {};
      const retailAccountsSummary =
        reportData.RetailAccountsSummary ||
        reportData['ACCOUNTS-SUMMARY']?.['PRIMARY-ACCOUNTS-SUMMARY'] ||
        {};
      const retailAccounts =
        reportData.RetailAccountDetails ||
        reportData['ACCOUNT-DETAILS'] ||
        reportData['ACCOUNTS'] ||
        [];
      const score =
        reportData.ScoreDetails?.[0] ||
        reportData['STANDARD-DATA']?.['SCORE']?.[0] ||
        {};
      const personalInfo =
  reportData.IDAndContactInfo ||
  reportData['ID-AND-CONTACT-INFO'] ||
  reportData.PersonalInformation ||
  reportData['PERSONAL-INFORMATION'] ||
  {};

      return {
        loanInquiryCount: this.extractLoanInquiryCount(enquirySummary),
        previousLoanRepayment: this.extractPreviousLoanRepayment(
          retailAccountsSummary,
          retailAccounts,
        ),
        creditBureauScore: this.extractCreditBureauScore(score),
        ntc: this.extractNTCScore(retailAccounts),
        activePayDayLoans: this.extractActivePayDayLoans(retailAccounts),
        pastDueAmount: this.extractPastDueAmount(
          retailAccountsSummary,
          retailAccounts,
        ),
        addressesMatch: this.extractAddressesMatch(personalInfo),
      };
    } catch (error) {
      this.logger.error('❌ Error extracting Equifax data', error);
      throw error;
    }
  }

  private extractLoanInquiryCount(enquirySummary: any): ExtractedEquifaxData['loanInquiryCount'] {
    const total =
      parseInt(enquirySummary.Total || enquirySummary['TOTAL-INQUIRIES'] || '0') || 0;
    const last30 =
      parseInt(enquirySummary.Last30Days || enquirySummary['LAST-30-DAYS'] || '0') || 0;
    const last90 =
      parseInt(enquirySummary.Last90Days || enquirySummary['LAST-90-DAYS'] || '0') || 0;

    return { count: total, last30Days: last30, last90Days: last90 };
  }

  private extractPreviousLoanRepayment(
  summary: any,
  accounts: any[],
): ExtractedEquifaxData['previousLoanRepayment'] {
  const overdueAccounts = parseInt(summary.OverdueAccounts || summary['OVERDUE-ACCOUNTS'] || '0') || 0;
  const totalAmountOverdue = this.parseAmount(
    summary.TotalAmountOverdue || summary['TOTAL-AMT-OVERDUE'],
  );

  const hasRecentDefault = accounts.some(acc => {
    const status = (acc.AccountStatus || acc.ACCOUNT_STATUS || '').toUpperCase();
    const dpd = parseInt(acc.DPD || acc.DAYS_PAST_DUE || '0') || 0;
    const lastUpdated = new Date(acc.LastUpdatedDate || acc.DATE_REPORTED || acc.OPENED_DATE || '1970-01-01');
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Only count defaults within 6 months or active overdue > 0
    const isRecent = lastUpdated > sixMonthsAgo;
    const hasOverdue = this.parseAmount(acc.AmountOverdue || acc.AMOUNT_OVERDUE) > 0;

    return (
      ((['WRITTEN OFF', 'SETTLED', 'DEFAULT'].includes(status) && isRecent) ||
        (dpd > 90 && isRecent) ||
        hasOverdue)
    );
  });

  const defaultAmount = hasRecentDefault ? totalAmountOverdue : 0;

  return {
    hasDefault: hasRecentDefault,
    defaultAmount,
    overdueAccounts,
    totalAmountOverdue,
  };
}


  private extractCreditBureauScore(score: any): ExtractedEquifaxData['creditBureauScore'] {
    const scoreValue =
      parseInt(score?.Value || score?.VALUE || '0') || 0;
    const scoreType =
      score?.ScoreType || score?.SCORE_TYPE || 'EQUIFAX';

    return { score: scoreValue, scoreType };
  }

  private extractNTCScore(accounts: any[]): ExtractedEquifaxData['ntc'] {
    const total = accounts.length;
    const consistent = accounts.filter(acc => {
      const status = (acc.AccountStatus || acc.ACCOUNT_STATUS || '').toUpperCase();
      return ['ACTIVE', 'CURRENT', 'CLOSED'].includes(status);
    }).length;

    const ratio = total > 0 ? consistent / total : 0;
    const score = Math.round(ratio * 100);
    const consistency = score >= 80 ? 'HIGH' : score >= 60 ? 'MEDIUM' : 'LOW';

    return { score, consistency };
  }

  private extractActivePayDayLoans(accounts: any[]): ExtractedEquifaxData['activePayDayLoans'] {
    const paydayLenders = [
      'CASHE',
      'KREDITBEE',
      'NIRA',
      'MONEYVIEW',
      'EARLYSALARY',
      'INSTANT',
      'QUICK',
      'PAYDAY',
      'RING',
      'LAZYPAY',
      'FIBE',
    ];

    const activeLoans = accounts.filter(acc => {
      const name = (acc.SubscriberName || acc.SUBSCRIBER_NAME || '').toUpperCase();
      const status = (acc.AccountStatus || acc.ACCOUNT_STATUS || '').toUpperCase();
      const active = ['ACTIVE', 'CURRENT'].includes(status);
      const isPayday = paydayLenders.some(l => name.includes(l));
      return active && isPayday;
    });

    const totalAmount = activeLoans.reduce(
      (sum, acc) =>
        sum + this.parseAmount(acc.HighCredit || acc.HIGH_CREDIT || acc.CreditLimit),
      0,
    );

    return {
      count: activeLoans.length,
      totalAmount,
      hasActiveLoans: activeLoans.length > 0,
    };
  }

  private extractPastDueAmount(summary: any, accounts: any[]): ExtractedEquifaxData['pastDueAmount'] {
    const totalAmountOverdue = this.parseAmount(
      summary.TotalAmountOverdue || summary['TOTAL-AMT-OVERDUE'],
    );

    const accountsWithPastDue = accounts.filter(acc =>
      this.parseAmount(acc.AmountOverdue || acc.AMOUNT_OVERDUE || acc.PAST_DUE_AMOUNT) > 0,
    ).length;

    return {
      amount: totalAmountOverdue,
      accountsWithPastDue,
    };
  }

  private extractAddressesMatch(personalInfo: any): ExtractedEquifaxData['addressesMatch'] {
  // Extract addresses from the correct location in Equifax response
  const addresses = 
    personalInfo?.AddressInfo || 
    personalInfo?.ADDRESS_INFO || 
    personalInfo?.addresses || 
    [];

  if (!addresses || addresses.length === 0) {
    return {
      isMatch: false,
      matchScore: 0,
      addresses: [],
    };
  }

  // Convert addresses to normalized strings
  const addressStrings = addresses.map((addr: any) => {
    const addressLine = addr.Address || addr.ADDRESS || '';
    const state = addr.State || addr.STATE || '';
    const postal = addr.Postal || addr.POSTAL || '';
    
    return [addressLine, state, postal]
      .filter(Boolean)
      .join(' ')
      .toUpperCase()
      .trim();
  }).filter(addr => addr.length > 0); // Remove empty addresses
 
  
  // Calculate match score based on address similarity
  const matchScore = this.calculateAddressMatchScore(addressStrings);

  
  return {
    isMatch: matchScore >= 70,
    matchScore,
    addresses: addressStrings,
  };
}

private calculateAddressMatchScore(addresses: string[]): number {
  if (addresses.length === 0) return 0;
  if (addresses.length === 1) return 100;

  // Group addresses by location (city/state)
  const locationGroups = this.groupAddressesByLocation(addresses);
  
  // Calculate dominance of the most common location
  const largestGroupSize = Math.max(...locationGroups.map(group => group.addresses.length));
  const dominanceRatio = largestGroupSize / addresses.length;
  
  // Calculate score based on location consistency
  let score = 0;
  
  if (locationGroups.length === 1) {
    // All addresses in same location - high score
    score = 90 + Math.min(10, (addresses.length - 1) * 2);
  } else if (locationGroups.length === 2) {
    // Two locations - check if one dominates
    if (dominanceRatio >= 0.7) {
      // One location strongly dominates (70%+)
      score = 70 + Math.floor(dominanceRatio * 20);
    } else {
      // Roughly equal split between two locations
      score = 50;
    }
  } else {
    // Multiple locations - lower score
    score = Math.max(20, 60 - (locationGroups.length - 2) * 15);
  }
  
  return Math.min(100, score);
}

private groupAddressesByLocation(addresses: string[]): { location: string; addresses: string[] }[] {
  const locationMap = new Map<string, string[]>();
  
  addresses.forEach(address => {
    const location = this.extractLocationFromAddress(address);
    
    if (!locationMap.has(location)) {
      locationMap.set(location, []);
    }
    locationMap.get(location)!.push(address);
  });
  
  return Array.from(locationMap.entries()).map(([location, addresses]) => ({
    location,
    addresses
  }));
}

private extractLocationFromAddress(address: string): string {
  // Extract city and state from address
  const parts = address.split(' ');
  
  // Look for state codes (last 2-letter codes before postal code)
  let state = '';
  let city = '';
  
  // Common Indian state codes
  const stateCodes = ['UP', 'DL', 'MH', 'KA', 'TN', 'AP', 'TS', 'GJ', 'RJ', 'MP', 'PB', 'HR'];
  
  for (let i = 0; i < parts.length; i++) {
    if (stateCodes.includes(parts[i])) {
      state = parts[i];
      // City is typically before state
      if (i > 0) {
        city = parts[i - 1];
      }
      break;
    }
  }
  
  // If no state code found, try to extract from common city names
  if (!state) {
    const commonCities = ['DELHI', 'MUMBAI', 'BANGALORE', 'CHENNAI', 'KOLKATA', 'HYDERABAD', 'PUNE', 'AHMEDABAD'];
    for (const cityName of commonCities) {
      if (address.includes(cityName)) {
        city = cityName;
        // Map city to state
        const cityStateMap: { [key: string]: string } = {
          'DELHI': 'DL', 'MUMBAI': 'MH', 'BANGALORE': 'KA', 'CHENNAI': 'TN', 
          'KOLKATA': 'WB', 'HYDERABAD': 'TS', 'PUNE': 'MH', 'AHMEDABAD': 'GJ'
        };
        state = cityStateMap[city] || '';
        break;
      }
    }
  }
  
  return `${city}-${state}`.toUpperCase();
}
  private parseAmount(value: any): number {
    if (!value) return 0;
    const clean = value.toString().replace(/,/g, '');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  }
}