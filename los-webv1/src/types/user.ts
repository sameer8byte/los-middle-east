export interface User {
  id: string;
  email: string;
  phoneNumber: string;
  onboardingStep: number;
  isEmailVerified: boolean;
  brandId: string;
  isPhoneVerified: boolean;
  googleId: string;
  employmentId: string;
  userDetailsId: string;
  userBankAccountId: string;
  signUpVersion: 'V1'|'V2'|null;
  occupation_type_id: string | null;
  status_id: string | null;
  is_terms_accepted: boolean;
}

export enum LoanRiskCategory {
  very_poor = "very_poor",
  poor = "poor",
  medium = "medium",
  high = "high",
  very_high = "very_high",
}

export interface BrandStatusReason {
    id: string;
    brandId: string;
    reason: string;
    isDisabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
    type: string;
    status: string;
}

export interface UserStatusBrandReason {
    id: string;
    userId: string;
    brandStatusReasonId: string;
    brand_status_reasons: BrandStatusReason; // Changed from brandStatusReason to match backend
}
