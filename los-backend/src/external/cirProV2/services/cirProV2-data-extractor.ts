


import { Injectable, Logger } from '@nestjs/common';

export interface ExtractedCirProV2Data {
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
export class CirProV2DataExtractorService {
  private readonly logger = new Logger(CirProV2DataExtractorService.name);

  async extractFinancialData(jsonData: any): Promise<ExtractedCirProV2Data> {
    try {
      const reportData =
        jsonData?.['CIR-REPORT-FILE']?.['REPORT-DATA'] ||
        jsonData?.CCRResponse?.CIRReportDataLst?.[0]?.CIRReportData ||
        jsonData?.REPORT_DATA ||
        {};

      // canonical containers from the file you uploaded
      const inquiryHistory = reportData?.['INQUIRY-HISTORY'] || reportData?.INQUIRY_HISTORY || [];
      const accountsSummary = reportData?.['ACCOUNTS-SUMMARY'] || reportData?.ACCOUNTS_SUMMARY || {};
      const primarySummary = accountsSummary?.['PRIMARY-ACCOUNTS-SUMMARY'] || accountsSummary?.PRIMARY_ACCOUNTS_SUMMARY || {};
      const tradelines = reportData?.TRADELINES || reportData?.TradeLines || [];
      const standardData = reportData?.['STANDARD-DATA'] || reportData?.STANDARD_DATA || {};
      const demogs = standardData?.DEMOGS || standardData?.Demogs || {};

      // Extracted
      return {
        loanInquiryCount: this.extractLoanInquiryCount(inquiryHistory),
        previousLoanRepayment: this.extractPreviousLoanRepayment(primarySummary, tradelines),
        creditBureauScore: this.extractCreditBureauScore(standardData),
        ntc: this.extractNTCScore(demogs, reportData),
        activePayDayLoans: this.extractActivePayDayLoans(tradelines),
        pastDueAmount: this.extractPastDueAmount(primarySummary, tradelines),
        addressesMatch: this.extractAddressesMatch(demogs),
      };
    } catch (error) {
      this.logger.error('Error extracting financial data from CIR Pro V2 JSON', error);
      throw error;
    }
  }

  private extractLoanInquiryCount(inquiryHistory: any[]): ExtractedCirProV2Data['loanInquiryCount'] {
    const now = new Date();
    const total = Array.isArray(inquiryHistory) ? inquiryHistory.length : 0;

    let last30 = 0;
    let last90 = 0;

    if (Array.isArray(inquiryHistory)) {
      for (const inq of inquiryHistory) {
        const dtStr = inq['INQUIRY-DT'] || inq['INQUIRY_DT'] || inq['INQUIRY_DT'] || inq['INQUIRY-DATE'] || inq['INQUIRY_DATE'] || inq['INQUIRY_DT_STRING'] || inq['INQUIRY_DATE_STR'] || inq['INQUIRY_DT_RAW'] || inq['INQUIRY-DATE-RAW'] || inq['INQUIRY-DT'];
        const dt = this.parsePossiblyMalformedDate(dtStr);
        if (!dt) continue;
        const diffDays = (now.getTime() - dt.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays <= 30) last30++;
        if (diffDays <= 90) last90++;
      }
    }

    return { count: total, last30Days: last30, last90Days: last90 };
  }

  private extractPreviousLoanRepayment(primarySummary: any, tradelines: any[]): ExtractedCirProV2Data['previousLoanRepayment'] {
    // Overdue accounts from primary summary (fallback to 0)
    const overdueAccounts = parseInt(primarySummary?.['OVERDUE-ACCOUNTS'] || primarySummary?.OVERDUE_ACCOUNTS || primarySummary?.OVERDUE_ACCOUNTS || '0', 10) || 0;

    // total amount overdue from summary (keys vary in your file: TOTAL-AMT-OVERDUE or TOTAL-AMT-OVERDUE)
    const totalAmountOverdue =
      this.parseAmount(primarySummary?.['TOTAL-AMT-OVERDUE']) ||
      this.parseAmount(primarySummary?.TOTAL_AMT_OVERDUE) ||
      this.parseAmount(primarySummary?.['TOTAL-AMT-OVERDUE']) ||
      this.sumOverdueFromTradeLines(tradelines);

    // Determine whether any trade line shows 'OVERDUE-AMT' > 0 or history includes delinquency markers
    let hasDefault = false;
    for (const t of tradelines || []) {
      const overdue = this.parseAmount(
  t?.['OVERDUE-AMT'] ?? t?.OVERDUE_AMT ?? (t?.OVERDUE || t?.OVERDUE_AMT));

      if (overdue > 0) {
        hasDefault = true;
        break;
      }
      const acctStatus = (t?.['ACCOUNT-STATUS'] || t?.ACCOUNT_STATUS || t?.AccountStatus || '').toString().toLowerCase();
      if (acctStatus.includes('written off') || acctStatus.includes('willful') || acctStatus.includes('wilful') || acctStatus.includes('default') || acctStatus.includes('written-off')) {
        hasDefault = true;
        break;
      }
      // check history strings for 'XXX' or 'XXX/XXX' patterns - often indicates bad status in file
      const history = t?.HISTORY || t?.history || [];
      if (Array.isArray(history)) {
        for (const h of history) {
          const vals = (h?.VALUES || h?.Values || '').toString();
          if ((/XXX|WRITEOFF|W\/O|WOFF|000\/XXX|XXX\/XXX/i).test(vals)) {
            hasDefault = true;
            break;
          }
        }
      }
      if (hasDefault) break;
    }

    // default amount - prefer explicit write-off/overdue sum; fallback to totalAmountOverdue
    const defaultAmount = hasDefault ? totalAmountOverdue : 0;

    return {
      hasDefault,
      defaultAmount,
      overdueAccounts,
      totalAmountOverdue,
    };
  }

  private extractCreditBureauScore(standardData: any): ExtractedCirProV2Data['creditBureauScore'] {
    // file uses STANDARD-DATA -> SCORE: array with { NAME, VALUE }
    const scoreArr = standardData?.SCORE || standardData?.Score || [];
    if (Array.isArray(scoreArr) && scoreArr.length > 0) {
      const entry = scoreArr[0];
      const score = this.parseIntSafe(entry?.VALUE ?? entry?.Value ?? entry?.value);
      const scoreType = entry?.NAME || entry?.Name || entry?.name || 'BUREAU_SCORE';
      return { score, scoreType };
    }
    return { score: 0, scoreType: 'UNKNOWN' };
  }

  // ---------- NTC (Name-Transaction Consistency) ----------
  private extractNTCScore(demogs: any, reportData: any): ExtractedCirProV2Data['ntc'] {
    // We'll use NAME-VARIATIONS and UID-VARIATIONS to gauge consistency.
    // If many name variations or many UID variations -> lower consistency.
    const variations = demogs?.VARIATIONS || demogs?.variations || [];
    let nameVarCount = 0;
    let uidVarCount = 0;

    for (const v of variations) {
      const type = (v?.TYPE || v?.Type || '').toString().toUpperCase();
      if (type.includes('NAME')) {
        const arr = v?.VARIATION || v?.VARIATION || [];
        nameVarCount = Math.max(nameVarCount, Array.isArray(arr) ? arr.length : 0);
      } else if (type.includes('UID')) {
        const arr = v?.VARIATION || [];
        uidVarCount = Math.max(uidVarCount, Array.isArray(arr) ? arr.length : 0);
      } else if (type.includes('CKYC')) {
        // CKYC also indicates unique id stability
        const arr = v?.VARIATION || [];
        uidVarCount = Math.max(uidVarCount, Array.isArray(arr) ? arr.length : uidVarCount);
      }
    }

    // Heuristic: base 100, subtract penalty for name variations and uid variations
    // large number of name variations implies lower consistency
    const namePenalty = Math.min(60, (Math.max(0, nameVarCount - 1)) * 15); // each extra name -15, capped
    const uidPenalty = Math.min(30, (Math.max(0, uidVarCount - 1)) * 10); // each extra uid -10, capped
    let rawScore = 100 - (namePenalty + uidPenalty);
    rawScore = Math.max(0, Math.round(rawScore));

    const consistency = rawScore >= 80 ? 'HIGH' : rawScore >= 60 ? 'MEDIUM' : 'LOW';
    return { score: rawScore, consistency };
  }

  private extractActivePayDayLoans(tradelines: any[]): ExtractedCirProV2Data['activePayDayLoans'] {
    // In your file, ACCT-TYPE sometimes contains 'PERSONAL LOAN', 'CREDIT CARD', 'AUTO LOAN (PERSONAL)'.
    // We'll treat small unsecured personal loans (DISBURSED-AMT <= 50k) and ACCT-TYPE containing 'PERSONAL' as payday-like.
    const paydayCandidates = (tradelines || []).filter((t: any) => {
      const acctType = (t?.['ACCT-TYPE'] || t?.ACCT_TYPE || t?.acctType || t?.ACCT_TYPE || '').toString().toUpperCase();
      const status = (t?.['ACCOUNT-STATUS'] || t?.ACCOUNT_STATUS || '').toString().toUpperCase();
      const disbursed = this.parseAmount(
  t?.['DISBURSED-AMT'] ?? t?.DISBURSED_AMT ?? (t?.DISBURSED || t?.DISBURSED_AMOUNT)
);

      const unsecured = (t?.['SECURITY-STATUS'] || t?.SECURITY_STATUS || '').toString().toUpperCase() === '' || (t?.['SECURITY-STATUS'] || '').toString().toUpperCase().includes('UN-SEC') || (t?.['SECURITY-STATUS'] || '').toString().toUpperCase().includes('UNSEC');

      const isPersonal = acctType.includes('PERSONAL') || acctType.includes('CONSUMER') || acctType.includes('UNSECURED');
      const isSmall = disbursed > 0 ? disbursed <= 50000 : true; // if missing disbursed, consider candidate but prefer filtered
      const isActive = status.includes('ACTIVE') || status.includes('OPEN');

      return isActive && isPersonal && isSmall && unsecured;
    });

    const totalAmount = paydayCandidates.reduce((sum: number, a: any) => {
  return sum + this.parseAmount(
    a?.['DISBURSED-AMT'] ?? a?.DISBURSED_AMT ?? (a?.DISBURSED || a?.CURRENT_BAL || a?.CURRENT_BALANCE)
  );
}, 0);


    return {
      count: paydayCandidates.length,
      totalAmount,
      hasActiveLoans: paydayCandidates.length > 0,
    };
  }

  private extractPastDueAmount(primarySummary: any, tradelines: any[]): ExtractedCirProV2Data['pastDueAmount'] {
    // Prefer summary total first
    let totalAmountOverdue = this.parseAmount(primarySummary?.['TOTAL-AMT-OVERDUE'] ?? primarySummary?.TOTAL_AMT_OVERDUE ?? primarySummary?.['TOTAL-AMT-OVERDUE'] ?? primarySummary?.['TOTAL-AMT-OVERDUE']);
    if (!totalAmountOverdue) {
      totalAmountOverdue = this.sumOverdueFromTradeLines(tradelines);
    }

    const accountsWithPastDue = (tradelines || []).filter((t: any) => {
      const overdueAmt = this.parseAmount(
  t?.['OVERDUE-AMT'] ?? t?.OVERDUE_AMT ?? (t?.OVERDUE || t?.OVERDUE_AMT)
);

      return overdueAmt > 0;
    }).length || parseInt(primarySummary?.['OVERDUE-ACCOUNTS'] || primarySummary?.OVERDUE_ACCOUNTS || '0', 10) || 0;

    return {
      amount: totalAmountOverdue,
      accountsWithPastDue,
    };
  }

  private extractAddressesMatch(demogs: any): ExtractedCirProV2Data['addressesMatch'] {
    // Look for ADDRESS-VARIATIONS block
    const variations = demogs?.VARIATIONS || demogs?.variations || [];
    let addressVariations: any[] = [];
    for (const v of variations) {
      const t = (v?.TYPE || v?.Type || '').toString().toUpperCase();
      if (t.includes('ADDRESS')) {
        addressVariations = v?.VARIATION || v?.VARIATION || [];
        break;
      }
    }
    
    // If demogs contains ADDRESS-VARIATIONS differently:
    if (!addressVariations.length && demogs?.['ADDRESS-VARIATIONS']) {
      addressVariations = demogs['ADDRESS-VARIATIONS']?.VARIATION || demogs['ADDRESS-VARIATIONS'] || [];
    }

    const addresses = (addressVariations || []).map((a: any) => {
      const v = (a?.VALUE || a?.Value || a?.value || '').toString();
      // normalize common separators and whitespace, uppercase
      return v.replace(/\s+/g, ' ').replace(/[,]+/g, ',').trim().toUpperCase();
    }).filter(Boolean);

    // fallback: if none found in demogs try report-level address fields (not guaranteed)
    // but in your file addresses are under ADDRESS-VARIATIONS so this should be sufficient.

    // calculate match score
    const matchScore = this.calculateAddressMatchScore(addresses);
    return {
      isMatch: matchScore >= 70,
      matchScore,
      addresses,
    };
  }

  private parsePossiblyMalformedDate(dt: any): Date | null {
    if (!dt) return null;
    let s = dt.toString().trim();
    if (!s) return null;

    // Common formats in your file: "31-05-2024", "05-10-2025", maybe "30-09-25"
    // Normalize separators
    s = s.replace('/', '-').replace(/\./g, '-').trim();

    // If already ISO-ish
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }

    // Try dd-mm-yyyy or d-m-yyyy
    const dmy = s.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
    if (dmy) {
      let day = parseInt(dmy[1], 10);
      let month = parseInt(dmy[2], 10);
      let year = parseInt(dmy[3], 10);
      if (year < 100) {
        // assume 2000+ for two-digit years (safe for recent records)
        year += 2000;
      }
      // JS Date: month index starts at 0
      const candidate = new Date(year, month - 1, day);
      return isNaN(candidate.getTime()) ? null : candidate;
    }

    // Try other heuristics with Date.parse
    const parsed = Date.parse(s);
    if (!isNaN(parsed)) return new Date(parsed);

    return null;
  }

  private parseIntSafe(v: any): number {
    if (v === null || v === undefined) return 0;
    return parseInt(String(v).replace(/,/g, '').replace(/\s+/g, ''), 10) || 0;
  }

  private parseAmount(amount: any): number {
    if (amount === null || amount === undefined) return 0;
    if (typeof amount === 'number') return amount;
    const s = String(amount).replace(/,/g, '').replace(/[^\d.-]/g, '').trim();
    if (!s) return 0;
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  private sumOverdueFromTradeLines(tradelines: any[]): number {
    if (!Array.isArray(tradelines)) return 0;
    return tradelines.reduce((sum: number, t: any) => {
      const v = this.parseAmount(t?.['OVERDUE-AMT'] ?? t?.OVERDUE_AMT ?? (t?.OVERDUE || t?.OVERDUE_AMT));
      return sum + v;
    }, 0);
  }

  private calculateAddressMatchScore(addresses: string[]): number {
    if (!Array.isArray(addresses) || addresses.length === 0) return 0;
    if (addresses.length === 1) return 100;

    // group by city/state tokens: try to extract last state token (two-letter) or known city names
    const groups = new Map<string, number>();
    for (const addr of addresses) {
      const key = this.extractLocationFromAddress(addr) || addr;
      groups.set(key, (groups.get(key) || 0) + 1);
    }
    const groupCounts = Array.from(groups.values()).sort((a, b) => b - a);
    const largest = groupCounts[0] || 1;
    const dominance = largest / addresses.length;

    let score = 0;
    if (groups.size === 1) {
      score = 90 + Math.min(10, (addresses.length - 1) * 2);
    } else if (groups.size === 2) {
      score = dominance >= 0.7 ? 70 + Math.floor(dominance * 20) : 50;
    } else {
      score = Math.max(20, 60 - (groups.size - 2) * 12);
    }
    return Math.min(100, Math.round(score));
  }

  private extractLocationFromAddress(address: string): string {
    if (!address) return '';
    const parts = address.split(/[\s,]+/).map(p => p.trim()).filter(Boolean);
    if (!parts.length) return '';

    // look for 6-digit pincode
    const pincodeMatch = address.match(/\b\d{6}\b/);
    const pincode = pincodeMatch ? pincodeMatch[0] : null;

    // try find known state abbreviations from your file (AP, TS, MH, etc.)
    const stateCodes = ['AP', 'TS', 'MH', 'DL', 'KA', 'TN', 'GJ', 'RJ', 'MP', 'PB', 'HR', 'WB', 'KL', 'BR'];
    let state = '';
    let city = '';

    // scan backwards for a 2-3 letter token that is a state code
    for (let i = parts.length - 1; i >= 0; i--) {
      const token = parts[i].toUpperCase();
      if (stateCodes.includes(token)) {
        state = token;
        if (i - 1 >= 0) city = parts[i - 1].toUpperCase();
        break;
      }
    }

    // fallback: look for common city names
    if (!city) {
      const commonCities = ['DELHI', 'MUMBAI', 'BANGALORE', 'BENGALURU', 'CHENNAI', 'KOLKATA', 'HYDERABAD', 'PUNE', 'AHMEDABAD'];
      for (const c of commonCities) {
        if (address.includes(c)) {
          city = c;
          break;
        }
      }
    }

    // final fallback: use pincode or last token as location
    if (!city && pincode) city = pincode;
    if (!city) city = parts[parts.length - 1].toUpperCase();

    return `${city}-${state}`.replace(/-$/, '').toUpperCase();
  }
}