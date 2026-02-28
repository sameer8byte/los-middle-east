// src/brands/dto/update-brand-config.dto.ts

import { IsNumber, IsString, IsOptional, IsBoolean, IsIn } from "class-validator";
import { Type, Transform } from "class-transformer";

// Helper function to convert string to boolean
const stringToBoolean = (value: any): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  return Boolean(value);
};

export class UpdateBrandConfigDto {
  @IsNumber()
  @Type(() => Number)
  salaryThresholdAmount: number;

  @IsNumber()
  @Type(() => Number)
  rejectionDuration: number;

  @IsNumber()
  @Type(() => Number)
  bankStatementHistoryMonths: number;

  @IsNumber()
  @Type(() => Number)
  minLoanAmountRequired: number;

  @IsNumber()
  @Type(() => Number)
  loanAgreementVersion: number;

  @IsString()
  @IsOptional()
  esignFinalCopyRecipients?: string;

  @IsString()
  @IsOptional()
  esignNotificationEmailList?: string;

  @IsString()
  @IsOptional()
  esignDocketTitle?: string;

  @IsNumber()
  @Type(() => Number)
  esignExpiryDayCount: number;

  @IsString()
  @IsOptional()
  sectionManagerName?: string;

  @IsString()
  @IsOptional()
  sectionManagerPhoneNumber?: string;

  @IsString()
  @IsOptional()
  sectionManagerEmail?: string;

  @IsString()
  @IsOptional()
  sectionManagerAddress?: string;

  @IsString()
  @IsOptional()
  noDueCopyRecipients?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => stringToBoolean(value))
  isAA?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => stringToBoolean(value))
  isAlternateNumber?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => stringToBoolean(value))
  isCCReminderEmail?: boolean;

  @IsString()
  @IsOptional()
  ccReminderEmail?: string;

  @IsString()
  @IsOptional()
  loanAgreementHeader?: string;

  @IsString()
  @IsOptional()
  loanAgreementFooter?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => stringToBoolean(value))
  isTestReminderEmail?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => stringToBoolean(value))
  isUserReminderEmail?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => stringToBoolean(value))
  forceEmployment?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => stringToBoolean(value))
  isAadharImageRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => stringToBoolean(value))
  isAadhaarNumberRequired?: boolean;

  @IsString()
  @IsOptional()
  loanNoDueCertificateHeader?: string;

  @IsString()
  @IsOptional()
  loanNoDueCertificateFooter?: string;

  @IsString()
  @IsOptional()
  @IsIn(["LOGIN", "ATTENDANCE"], { message: "autoAllocationType must be either LOGIN or ATTENDANCE" })
  autoAllocationType?: string;

  @IsString()
  @IsOptional()
  @IsIn(["V1", "V2"], { message: "evaluationVersion must be either V1 or V2" })
  evaluationVersion?: string;

  @IsString()
  @IsOptional()
  @IsIn(["V1", "V2"], { message: "signUpVersion must be either V1 or V2" })
  signUpVersion?: string;

  @IsString()
  @IsOptional()
  @IsIn(["V1", "V2"], { message: "loan_ops_version must be either V1 or V2" })
  loan_ops_version?: string;

  @IsString()
  @IsOptional()
  @IsIn(["V1", "V2"], { message: "loan_collection_version must be either V1 or V2" })
  loan_collection_version?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => stringToBoolean(value))
  fmsBlockStatus?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => stringToBoolean(value))
  autoGenerateNOC?: boolean;
  enable_central_dedup?: boolean;
  sunday_off?: boolean;
  field_visit?: boolean;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  min_age?: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  max_age?: number;

}
