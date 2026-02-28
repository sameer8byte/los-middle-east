import { BrandProviderName, BrandProviderType } from "../../constant/enum";

export interface BrandTheme {
  id: string;
  brandId: string;
  // Color Settings
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  primaryTextColor: string;
  secondaryTextColor: string;
  successColor: string;
  warningColor: string;
  errorColor: string;
  // Typography
  fontFamily: string;
  baseFontSize: number;
  // Theme Features
  roundedCorners: boolean;
  darkMode: boolean;

  primaryActiveColor: string;
  primaryHoverColor: string;
  primaryContrastColor: string;
  primaryFocusColor: string;
  primaryLightColor: string;
  secondaryActiveColor: string;
  secondaryHoverColor: string;
  secondaryContrastColor: string;
  secondaryFocusColor: string;
  secondaryLightColor: string;
  backgroundTextColor: string;
  surfaceTextColor: string;
}

export interface BrandDetails {
  address: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  gstNumber: string;
  cinNumber: string;
  title: string;
  description: string;
}

export interface BrandPolicyLinks {
  termsConditionUrl: string;
  privacyPolicyUrl: string;
  faqUrl: string;
}

export interface BrandConfig {
  id: string;
  brandId: string;
  createdAt: Date;
  updatedAt: Date;
  salaryThresholdAmount: number;
  rejectionDuration: number;
  bankStatementHistoryMonths: number;
  esignFinalCopyRecipients: string;
  esignNotificationEmailList: string;
  esignDocketTitle: string;
  esignExpiryDayCount: number;
  sectionManagerName: string;
  sectionManagerPhoneNumber: string;
  sectionManagerAddress: string;
  noDueCopyRecipients: string;
  isAA: boolean;
  isAlternateNumber: boolean;
  loanAgreementVersion: string;
  ccReminderEmail: string;
  isTestReminderEmail: boolean;
  loanAgreementFooter: string;
  loanAgreementHeader: string;
  isCCReminderEmail: boolean;
  isUserReminderEmail: boolean;
  minLoanAmountRequired: number;
  forceEmployment: boolean;
  isAadharImageRequired: boolean;
  loanNoDueCertificateHeader: string;
  loanNoDueCertificateFooter: string;
  sectionManagerEmail: string;
  autoAllocationType: "LOGIN" | "ATTENDANCE";
  evaluationVersion: "V1" | "V2";
  loan_collection_version: "V1" | "V2";
  signUpVersion: string;
  fmsBlockStatus: boolean;
  isAadhaarNumberRequired: boolean;
  forceSkipEmployment: boolean;
  requiresUserPhoto: boolean;
  requiresUserVideo: boolean;
  collection_auto_allocation: string;
  loan_auto_allocation: string;
  skip_user_onboarding_completed: boolean;
  user_auto_allocation: string;
  user_rejection_type: string;
  autoGenerateNOC: boolean;
  enable_multiple_salary: boolean;
  min_age: number;
  max_age: number;
  enable_central_dedup: boolean;
  loan_ops_version: "V1" | "V2";
  skip_loan_evaluation_approval_days:number,
  is_cam_calculation_required: boolean;
  is_loan_onboarding: boolean;
  field_visit: boolean;
  dashboard_version: "V1" | "V2";

}

export interface BrandPath {
  id: string;
  path: string;
  label: string;
  icon?: string;
  isActive: boolean;
  isDisabled: boolean;
  brandId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandCard {
  id: string;
  brandId: string;
  imageUrl: string;
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandProvider {
  id: string;
  brandId: string;
  type: BrandProviderType;
  provider: BrandProviderName;
  isActive: boolean;
  isPrimary: boolean;
  isDisabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
