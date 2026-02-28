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
  rbiRegistrationNo: string;
}

export interface BrandPolicyLinks {
  termsConditionUrl: string;
  privacyPolicyUrl: string;
  faqUrl: string;
  brandloanDetailsPolicyUrl:string;
  htw: string;
  contactUs: string;
}

export interface BrandConfig {
  id: string;
  brandId: string;
  createdAt: Date;
  updatedAt: Date;
  salaryThresholdAmount: number;
  rejectionDuration: number;
  bankStatementHistoryMonths: number;
  forceEmployment: boolean; 
  isAadharImageRequired: boolean;
  isAA: boolean;
  isAadhaarNumberRequired: boolean;
  isAlternateNumber: boolean;
  signUpVersion:'V1' | 'V2';
  requiresUserPhoto: boolean;
  requiresUserVideo: boolean;
  is_automated_reloan: boolean;
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
