export type ValidationStatus = 'PASS' | 'FAIL' | 'SKIPPED';

export interface ParameterResult {
  paramNo: number;
  paramName: string;
  status: ValidationStatus;
  value: unknown;
  message: string;
  rejectionReasonId: string | null;
  successReasonId: string | null;
}

export interface ValidationSummary {
  applicationId: string;
  timestamp: string;
  overallStatus: 'APPROVED' | 'REJECTED';
  /** Total parameters actually checked (excludes SKIPPED) */
  totalChecks: number;
  brandId:string;
  brandName: string;
  passed: number;
  failed: number;
  skipped: number;
  results: ParameterResult[];
  failedParams: string[];
  skippedParams: string[];
}