/**
 * Utility functions for safe credit score parsing and validation
 */

/**
 * Safely parses a credit score from various input types
 * @param score - The score value (string, number, or any)
 * @returns Parsed score as number or null if invalid
 */
export function parseCreditScore(score: any): number | null {
  // Handle null, undefined, or empty values
  if (score === null || score === undefined || score === '') {
    return null;
  }

  // If already a number, validate range
  if (typeof score === 'number') {
    return isValidCreditScore(score) ? Math.round(score) : null;
  }

  // If string, try to parse
  if (typeof score === 'string') {
    const trimmed = score.trim();
    if (trimmed === '') {
      return null;
    }

    const parsed = parseFloat(trimmed);
    if (isNaN(parsed)) {
      return null;
    }

    return isValidCreditScore(parsed) ? Math.round(parsed) : null;
  }

  // For any other type, try string conversion first
  try {
    const stringValue = String(score).trim();
    if (stringValue === '' || stringValue === 'null' || stringValue === 'undefined') {
      return null;
    }

    const parsed = parseFloat(stringValue);
    if (isNaN(parsed)) {
      return null;
    }

    return isValidCreditScore(parsed) ? Math.round(parsed) : null;
  } catch {
    return null;
  }
}

/**
 * Validates if a credit score is within acceptable range
 * @param score - The numeric score to validate
 * @returns true if score is valid, false otherwise
 */
export function isValidCreditScore(score: number): boolean {
  // Credit scores typically range from 300-900 in India
  // Allow some buffer for different scoring models
  return score >= 250 && score <= 950 && Number.isFinite(score);
}

/**
 * Safely extracts credit score from nested API response objects
 * Common patterns in CIBIL/Equifax responses
 */
export function extractCreditScore(data: any, scorePaths: string[]): number | null {
  for (const path of scorePaths) {
    try {
      const score = getNestedValue(data, path);
      const parsed = parseCreditScore(score);
      if (parsed !== null) {
        return parsed;
      }
    } catch {
      // Continue to next path
    }
  }
  return null;
}

/**
 * Helper function to get nested object values safely
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    if (current && typeof current === 'object') {
      // Handle array access with [0] notation
      if (key.endsWith('[0]')) {
        const arrayKey = key.slice(0, -3);
        const array = current[arrayKey];
        return Array.isArray(array) && array.length > 0 ? array[0] : undefined;
      }
      return current[key];
    }
    return undefined;
  }, obj);
}

/**
 * Common score extraction patterns for different credit bureaus
 */
export const SCORE_EXTRACTION_PATTERNS = {
  CIR_PRO_V2: [
    'standardData.SCORE[0].value',
    'standardData.SCORE.0.value',
    'CIR-REPORT-FILE.REPORT-DATA.STANDARD-DATA.SCORE[0].VALUE',
    'CIR-REPORT-FILE.REPORT-DATA.STANDARD-DATA.SCORE.0.VALUE'
  ] as string[],
  EQUIFAX: [
    'standardData.SCORE[0].value',
    'CCRResponse.CIRReportDataLst[0].CIRReportData.ScoreDetails[0].Value',
    'CCRResponse.CIRReportDataLst.0.CIRReportData.ScoreDetails.0.Value'
  ] as string[]
};
