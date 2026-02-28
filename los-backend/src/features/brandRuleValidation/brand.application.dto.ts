import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

// ── Enums ──────────────────────────────────────────────────────────────────────

export enum ProfessionType {
  SALARIED = 'SALARIED',
  SELF_EMPLOYED = 'SELF_EMPLOYED',
}

export enum SalaryThreshold {
  ABOVE = 'ABOVE',
  BELOW = 'BELOW',
}

export enum YesNo {
  YES = 'YES',
  NO = 'NO',
}

export enum PinCodeStatus {
  COMPLIANT = 'COMPLIANT',
  NON_COMPLIANT = 'NON_COMPLIANT',
}

export enum IfscStatus {
  VALID = 'VALID',
  INVALID = 'INVALID',
}

export enum BankStatementStatus {
  ORIGINAL = 'ORIGINAL',
  MODIFIED = 'MODIFIED',
}

export enum VideoStatus {
  NORMAL = 'NORMAL',
  INAPPROPRIATE = 'INAPPROPRIATE',
}

export enum AadharPanMatch {
  MATCH = 'MATCH',
  MISMATCH = 'MISMATCH',
}

export enum GenderMatch {
  MATCH = 'MATCH',
  MISMATCH = 'MISMATCH',
}

export enum NbfcStatus {
  DIFFERENT = 'DIFFERENT',
  SAME = 'SAME',
}

export enum CrifReportStatus {
  NON_DELINQUENT = 'NON_DELINQUENT',
  DELINQUENT = 'DELINQUENT',
}

export enum BrandLoanStatus {
  NON_DEFAULT = 'NON_DEFAULT',
  DEFAULT_OR_SETTLED = 'DEFAULT_OR_SETTLED',
}

// ── Param selector ─────────────────────────────────────────────────────────────

/**
 * All 19 parameter keys. Use these in the `params` array to run only
 * specific checks. Omit `params` entirely to run all 19.
 */
export enum ParamKey {
  PROFESSION           = 'profession',
  SALARY_THRESHOLD     = 'salaryThreshold',
  PHONE_NUMBER         = 'phoneNumber',
  PAN_CARD             = 'panCard',
  PAN_AADHAR_LINKED    = 'panAadharLinked',
  AADHAR_LAST4         = 'aadharLast4Received',
  AGE                  = 'age',
  PIN_CODE             = 'pinCodeStatus',
  IFSC                 = 'ifscStatus',
  NAME_MATCH_PAN_BANK  = 'nameMatchPanBank',
  BANK_STATEMENT       = 'bankStatementStatus',
  VIDEO                = 'videoStatus',
  AADHAR_PAN_DIGIT     = 'aadharPanDigitMatch',
  GENDER_MATCH         = 'genderMatch',
  NAME_MATCH_PAN_AADHAR= 'nameMatchPanAadhar',
  NBFC                 = 'nbfcStatus',
  CRIF_SCORE           = 'crifScore',
  CRIF_REPORT          = 'crifReportStatus',
  BRAND_LOAN           = 'brandLoanStatus',
}

/** Convenient alias — maps param numbers 1–19 to their ParamKey */
export const PARAM_NUMBER_MAP: Record<number, ParamKey> = {
  1:  ParamKey.PROFESSION,
  2:  ParamKey.SALARY_THRESHOLD,
  3:  ParamKey.PHONE_NUMBER,
  4:  ParamKey.PAN_CARD,
  5:  ParamKey.PAN_AADHAR_LINKED,
  6:  ParamKey.AADHAR_LAST4,
  7:  ParamKey.AGE,
  8:  ParamKey.PIN_CODE,
  9:  ParamKey.IFSC,
  10: ParamKey.NAME_MATCH_PAN_BANK,
  11: ParamKey.BANK_STATEMENT,
  12: ParamKey.VIDEO,
  13: ParamKey.AADHAR_PAN_DIGIT,
  14: ParamKey.GENDER_MATCH,
  15: ParamKey.NAME_MATCH_PAN_AADHAR,
  16: ParamKey.NBFC,
  17: ParamKey.CRIF_SCORE,
  18: ParamKey.CRIF_REPORT,
  19: ParamKey.BRAND_LOAN,
};

// ── Main DTO ──────────────────────────────────────────────────────────────────

export class LoanApplicationDto {
  @IsOptional()
  @IsArray()
  params?: Array<number | string>;

  // 1. Profession
  @IsOptional()
  @IsEnum(ProfessionType)
  profession?: ProfessionType;

  // 2. Monthly Salary / Turnover
  @IsOptional()
  @IsEnum(SalaryThreshold)
  salaryThreshold?: SalaryThreshold;

  // 3. Phone Number (exactly 10 digits)
  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/, { message: 'phoneNumber must be exactly 10 digits' })
  phoneNumber?: string;

  // 4. PAN Card  – format: XXXXP9999X (4th char must be 'P')
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{4}P\d{4}[A-Z]$/, {
    message: 'panCard must be a valid PAN format (10 chars, 4th character must be P)',
  })
  panCard?: string;

  // 5. PAN & Aadhar Linked
  @IsOptional()
  @IsEnum(YesNo)
  panAadharLinked?: YesNo;

  // 6. Last 4 digits of Aadhar received
  @IsOptional()
  @IsEnum(YesNo)
  aadharLast4Received?: YesNo;

  // 7. Age (21–55)
  @IsOptional()
  @IsNumber()
  @Min(21, { message: 'Applicant must be at least 21 years old' })
  @Max(55, { message: 'Applicant must not exceed 55 years old' })
  age?: number;

  // 8. Pin Code
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'pinCode must be exactly 6 digits' })
  pinCode?: string;

  // 8. Pin Code Status
  @IsOptional()
  @IsEnum(PinCodeStatus)
  pinCodeStatus?: PinCodeStatus;

  // 9. IFSC Code
  @IsOptional()
  @IsEnum(IfscStatus)
  ifscStatus?: IfscStatus;

  // 10. Name match PAN vs Bank Account (>75%)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  nameMatchPanBank?: number;

  // 11. Bank Statement upload
  @IsOptional()
  @IsEnum(BankStatementStatus)
  bankStatementStatus?: BankStatementStatus;

  // 12. Video upload
  @IsOptional()
  @IsEnum(VideoStatus)
  videoStatus?: VideoStatus;

  // 13. Aadhar last 4 digit vs PAN-linked Aadhar last 4 digit
  @IsOptional()
  @IsEnum(AadharPanMatch)
  aadharPanDigitMatch?: AadharPanMatch;

  // 14. Gender match (PAN vs records)
  @IsOptional()
  @IsEnum(GenderMatch)
  genderMatch?: GenderMatch;

  // 15. Name match PAN vs Aadhar (>75%)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  nameMatchPanAadhar?: number;

  // 16. NBFC
  @IsOptional()
  @IsEnum(NbfcStatus)
  nbfcStatus?: NbfcStatus;

  // 17. CRIF Score (>500)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(900)
  crifScore?: number;

  // 18. CRIF Report
  @IsOptional()
  @IsEnum(CrifReportStatus)
  crifReportStatus?: CrifReportStatus;

  // 19. Different Brand loan status
  @IsOptional()
  @IsEnum(BrandLoanStatus)
  brandLoanStatus?: BrandLoanStatus;
}