import { createSlice } from "@reduxjs/toolkit";
import { INDEX_SLICE_LABEL } from "../storeLabels";
import {
  BrandCard,
  BrandConfig,
  BrandDetails,
  BrandPolicyLinks,
  BrandTheme,
} from "../../types/brand";

export interface IInitialIndexState {
  id: string;
  name: string;
  logoUrl: string;
  createdAt: string;
  updatedAt: string;
  domain: string;
  brand_themes: BrandTheme;
  brandDetails: BrandDetails;
  brandPolicyLinks: BrandPolicyLinks;
  brandConfig: BrandConfig;
  brandCards: BrandCard[];
}

export const initialIndexState: IInitialIndexState = {
  id: "",
  name: "",
  logoUrl: "",
  createdAt: "",
  updatedAt: "",
  domain: "",
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
    title:'',
    rbiRegistrationNo: '',
    description:'',
  },
  brandPolicyLinks: {
    termsConditionUrl: "",
    privacyPolicyUrl: "",
    faqUrl: "",
    brandloanDetailsPolicyUrl:"",
    htw: "",
    contactUs: "",
  },
  brandConfig: {
    id: "",
    brandId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
    salaryThresholdAmount: 0,
    rejectionDuration: 0,
    forceEmployment: false,
    isAadharImageRequired: true,
    bankStatementHistoryMonths: 0,
    isAA: false,
    isAlternateNumber: false,
    isAadhaarNumberRequired: false,
    signUpVersion:'V1',
    requiresUserPhoto: false,
    requiresUserVideo: false,
    is_automated_reloan: false,
  },
  brandCards: [],
};

export const IndexSlice = createSlice({
  name: INDEX_SLICE_LABEL,
  initialState: initialIndexState,
  reducers: {
    // ? Update user data
    updateIndexData: (state, action) => {
      return {
        ...state,
        ...action.payload,
      };
    },
  },
});

export const { updateIndexData } = IndexSlice.actions;
