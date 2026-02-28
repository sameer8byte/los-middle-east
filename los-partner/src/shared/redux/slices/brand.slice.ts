// store/brandSlice.ts
import { createSlice } from "@reduxjs/toolkit";
import { BRAND_SLICE_LABEL } from "../storeLabels";
import {
  BrandCard,
  BrandConfig,
  BrandDetails,
  BrandPath,
  BrandPolicyLinks,
  BrandProvider,
  BrandTheme,
} from "../../types/brand";
import { LoanRule } from "../../types/loan";

export interface InitialBrandState {
  id: string;
  name: string;
  logoUrl: string;
  defaultLoanRiskCategory: string;
  createdAt: string;
  updatedAt: string;
  onPartner: boolean;
  domain: string;
  brand_themes: BrandTheme;
  brandDetails: BrandDetails;
  partner_version: string;
  force_refresh: boolean;
  webv1_version: string;
  brandPolicyLinks: BrandPolicyLinks;
  brandConfig: BrandConfig;
  brandCards: BrandCard[];
  brandProviders: BrandProvider[];
  brand_paths: BrandPath[];
  loanRules: LoanRule[];
}

export const initialBrandState: InitialBrandState = {
  id: "",
  name: "",
  logoUrl: "",
  domain: "",
  defaultLoanRiskCategory: "",
  webv1_version: "",
  partner_version: "",
  force_refresh: false,
  onPartner: false,
  createdAt: "",
  updatedAt: "",
  brand_themes: {
    id: "",
    brandId: "",
    primaryColor: "",
    secondaryColor: "",
    backgroundColor: "",
    surfaceColor: "",
    primaryTextColor: "",
    secondaryTextColor: "",
    successColor: "",
    warningColor: "",
    errorColor: "",
    fontFamily: "",
    baseFontSize: 0,
    roundedCorners: false,
    darkMode: false,
    primaryActiveColor: "",
    primaryHoverColor: "",
    primaryContrastColor: "",
    primaryFocusColor: "",
    primaryLightColor: "",
    secondaryActiveColor: "",
    secondaryHoverColor: "",
    secondaryContrastColor: "",
    secondaryFocusColor: "",
    secondaryLightColor: "",
    backgroundTextColor: "",
    surfaceTextColor: "",
  },
  brandDetails: {
    address: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    gstNumber: "",
    cinNumber: "",
    title: "",
    description: "",
  },
  brandPolicyLinks: {
    termsConditionUrl: "",
    privacyPolicyUrl: "",
    faqUrl: "",
  },
  brand_paths: [],
  brandConfig: {
    id: "",
    evaluationVersion: "V1",
    brandId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
    salaryThresholdAmount: 0,
    rejectionDuration: 0,
    bankStatementHistoryMonths: 0,
    esignFinalCopyRecipients: "",
    esignNotificationEmailList: "",
    esignDocketTitle: "",
    esignExpiryDayCount: 0,
    sectionManagerName: "",
    sectionManagerPhoneNumber: "",
    sectionManagerAddress: "",
    noDueCopyRecipients: "",
    isAA: false,
    isAlternateNumber: false,
    loanAgreementVersion: "",
    ccReminderEmail: "",
    isTestReminderEmail: false,
    loanAgreementFooter: "",
    loanAgreementHeader: "",
    isCCReminderEmail: false,
    isUserReminderEmail: false,
    minLoanAmountRequired: 0,
    forceEmployment: false,
    isAadharImageRequired: false,
    loanNoDueCertificateHeader: "",
    loanNoDueCertificateFooter: "",
    sectionManagerEmail: "",
    autoAllocationType: "LOGIN",
    signUpVersion: "",
    fmsBlockStatus: false,
    isAadhaarNumberRequired: false,
    forceSkipEmployment: false,
    requiresUserPhoto: false,
    requiresUserVideo: false,
    collection_auto_allocation: "",
    loan_auto_allocation: "",
    skip_user_onboarding_completed: false,
    user_auto_allocation: "",
    user_rejection_type: "",
    autoGenerateNOC: false,
    enable_multiple_salary: false,
    min_age: 0,
    max_age: 0,
    enable_central_dedup: false,
    loan_ops_version: "V1",
    loan_collection_version: "V1",
    skip_loan_evaluation_approval_days: 0,
    is_cam_calculation_required: false,
    is_loan_onboarding: false,
    field_visit: false,
    dashboard_version: "V1",
  },
  brandCards: [],
  brandProviders: [],
  loanRules: [],
  
};

export const BrandSlice = createSlice({
  name: BRAND_SLICE_LABEL,
  initialState: initialBrandState,
  reducers: {
    updateBrandData: (state, action) => ({
      ...state,
      ...action.payload,
    }),
    setBrandProviders: (state, action: { payload: BrandProvider[] }) => {
      state.brandProviders = action.payload;
    },
    setLoanRules: (state, action: { payload: LoanRule[] }) => {
      state.loanRules = action.payload;
    },
  },
});

export const { updateBrandData, setBrandProviders, setLoanRules } = BrandSlice.actions;
export default BrandSlice.reducer;

// ---------------------------
// Selectors
// ---------------------------
import { RootState } from "../store"; // adjust to your store path
import { BrandProviderType } from "../../../constant/enum";

/**
 * Select all providers of a specific type
 */
export const selectProvidersByType = (
  state: RootState,
  type: BrandProviderType,
): BrandProvider[] => {
  return state.brand.brandProviders.filter(
    (provider) =>
      provider.type === type && provider.isActive && !provider.isDisabled,
  );
};

/**
 * Select the primary provider of a specific type
 */
export const selectPrimaryProviderByType = (
  state: RootState,
  type: BrandProviderType,
): BrandProvider | undefined => {
  return state.brand.brandProviders.find(
    (provider) =>
      provider.type === type &&
      provider.isPrimary &&
      provider.isActive &&
      !provider.isDisabled,
  );
};

/**
 * Select all active providers
 */
export const selectActiveProviders = (state: RootState): BrandProvider[] => {
  return state.brand.brandProviders.filter(
    (provider) => provider.isActive && !provider.isDisabled,
  );
};

/** * Select primary providers for all types
 */
export const selectBrandConfig = (state: RootState): BrandConfig => {
  return state.brand.brandConfig;
};
//is_loan_onboarding
export const selectIsLoanOnboarding = (state: RootState): boolean => {
  return state.brand.brandConfig.is_loan_onboarding;
};

// is check brand - returns true if brand name matches the provided name, else if name is empty returns true if brand name exists
export const selectIsBrand = (state: RootState, name?: string): boolean => {
  if (name) {
    return (
      state.brand.name === name ||
      state.brand.name === name.toLowerCase() ||
      state.brand.name.toLowerCase() === name.toLowerCase()
    );
  }
  return state.brand.name !== "";
};

/**
 * Select all loan rules
 */
export const selectLoanRules = (state: RootState): LoanRule[] => {
  return state.brand.loanRules;
};

/**
 * Select loan rule by risk category
 */
export const selectLoanRuleByCategory = (
  state: RootState,
  riskCategory: string
): LoanRule | undefined => {
  return state.brand.loanRules.find((rule) => rule.ruleType === riskCategory);
};

/**
 * Select all active loan rules
 */
export const selectActiveLoanRules = (state: RootState): LoanRule[] => {
  return state.brand.loanRules.filter((rule) => rule.isActive);
};
