import {
  HiDevicePhoneMobile,
  HiEnvelope,
  HiDocumentText,
  HiClock,
  HiIdentification,
  HiUser,
  HiBriefcase,
  HiBuildingLibrary,
  HiCamera,
  HiHome,
  HiEye,
  HiPaperAirplane,
} from "react-icons/hi2";

export enum ApplicationPage {
  Home = "Home",
  PhoneVerification = "PhoneVerification",
  EmailVerification = "EmailVerification",
  LoanApplication = "LoanApplication",
  CurrentStatus = "CurrentStatus",
  LoanApplicationKyc = "LoanApplicationKyc",
  LoanApplicationPersonalInfo = "LoanApplicationPersonalInfo",
  LoanApplicationBankDetails = "LoanApplicationBankDetails",
  LoanApplicationEmploymentInfo = "LoanApplicationEmploymentInfo",
  LoanApplicationSelfie = "LoanApplicationSelfie",
  LoanApplicationAddressVerification = "LoanApplicationAddressVerification",
  LoanApplicationReview = "LoanApplicationReview",
  LoanApplicationSubmit = "LoanApplicationSubmit",
}
export type ApplicationPageType = keyof typeof ApplicationPage;

// Explicit numeric ID to ApplicationPage mapping
export const PageIdToPageMap: Record<number, string> = {
  0: "/phone-verification",
  1: "/phone-verification",
  2: "/email-verification",
  3: "/loan-application",
  4: "/loan-application/current-status",
  5: "/loan-application/kyc",
  6: "/loan-application/personal-info",
  7: "/loan-application/bank-details",
  8: "/loan-application/employment-info",
  9: "/loan-application/selfie",
  10: "/loan-application/address-verification",
  11: "/loan-application/review",
  12: "/loans",
};

// Assign numeric IDs to ApplicationPage enums based on declaration order
export const ApplicationPageId: Record<ApplicationPage, number> = Object.keys(
  ApplicationPage
).reduce((acc, key, index) => {
  acc[key as ApplicationPage] = index;
  return acc;
}, {} as Record<ApplicationPage, number>);

// Map ApplicationPage to route paths
export const PageRouteMap: Record<ApplicationPage, string> = {
  [ApplicationPage.Home]: "/",
  [ApplicationPage.PhoneVerification]: "/phone-verification",
  [ApplicationPage.EmailVerification]: "/email-verification",
  [ApplicationPage.LoanApplication]: "/loan-application",
  [ApplicationPage.CurrentStatus]: "/loan-application/current-status",
  [ApplicationPage.LoanApplicationKyc]: "/loan-application/kyc",
  [ApplicationPage.LoanApplicationPersonalInfo]:
    "/loan-application/personal-info",
  [ApplicationPage.LoanApplicationBankDetails]:
    "/loan-application/bank-details",
  [ApplicationPage.LoanApplicationEmploymentInfo]:
    "/loan-application/employment-info",
  [ApplicationPage.LoanApplicationSelfie]: "/loan-application/selfie",
  [ApplicationPage.LoanApplicationAddressVerification]:
    "/loan-application/address-verification",
  [ApplicationPage.LoanApplicationReview]: "/loan-application/review",
  [ApplicationPage.LoanApplicationSubmit]: "/loans",
};

// Map ApplicationPage to readable name (redundant, but sometimes useful for labels)
export const PageNameMap: Record<ApplicationPage, string> = {
  ...Object.values(ApplicationPage).reduce((acc, page) => {
    acc[page] = page;
    return acc;
  }, {} as Record<ApplicationPage, string>),
};

// Reverse map from string name to ApplicationPage enum
export const PageIdMap: Record<string, ApplicationPage> = {
  ...Object.values(ApplicationPage).reduce((acc, page) => {
    acc[page] = page;
    return acc;
  }, {} as Record<string, ApplicationPage>),
};

export function getPageFromId(id: number): ApplicationPage {
  const pages = Object.values(ApplicationPage);
  return pages[id];
}

export function getIdFromPage(page: ApplicationPage): number {
  return ApplicationPageId[page];
}

export const PageIdToPageNameMap: Record<number, string> = {
  0: "Phone Verification",
  1: "Phone Verification",
  2: "Email Verification",
  3: "Loan Application",
  4: "Current Status",
  5: "KYC",
  6: "Personal Info",
  7: "Bank Details",
  8: "Employment Info",
  9: "Selfie",
  10: "Address Verification",
  11: "Review",
  12: "Loans",
};

export const JOURNEY_STEPS = [
  {
    id: 1,
    key: ApplicationPage.PhoneVerification,
    title: "Phone Verification",
    description: "Verify phone number with OTP",
    icon: HiDevicePhoneMobile,
  },
  {
    id: 2,
    key: ApplicationPage.EmailVerification,
    title: "Email Verification",
    description: "Verify email address",
    icon: HiEnvelope,
  },
  {
    id: 3,
    key: ApplicationPage.LoanApplication,
    title: "Loan Application",
    description: "Start loan application form",
    icon: HiDocumentText,
  },
  {
    id: 4,
    key: ApplicationPage.CurrentStatus,
    title: "Current Status",
    description: "Check application status",
    icon: HiClock,
  },
  {
    id: 5,
    key: ApplicationPage.LoanApplicationKyc,
    title: "KYC Documents",
    description: "Upload identity verification documents",
    icon: HiIdentification,
  },
  {
    id: 6,
    key: ApplicationPage.LoanApplicationPersonalInfo,
    title: "Personal Information",
    description: "Provide personal details",
    icon: HiUser,
  },
    {
    id:7,
    key: ApplicationPage.LoanApplicationBankDetails,
    title: "Bank Details",
    description: "Add bank account information",
    icon: HiBuildingLibrary,
  },
  {
    id: 8,
    key: ApplicationPage.LoanApplicationEmploymentInfo,
    title: "Employment Details",
    description: "Share employment information",
    icon: HiBriefcase,
  },

  {
    id: 9,
    key: ApplicationPage.LoanApplicationSelfie,
    title: "Selfie Verification",
    description: "Take a selfie for verification",
    icon: HiCamera,
  },
  {
    id: 10,
    key: ApplicationPage.LoanApplicationAddressVerification,
    title: "Address Verification",
    description: "Verify your address details",
    icon: HiHome,
  },
  {
    id: 11,
    key: ApplicationPage.LoanApplicationReview,
    title: "Review Application",
    description: "Review all provided information",
    icon: HiEye,
  },
  {
    id: 12,
    key: ApplicationPage.LoanApplicationSubmit,
    title: "Submit Application",
    description: "Final submission and processing",
    icon: HiPaperAirplane,
  },
];
