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
  ApplicationPage,
).reduce(
  (acc, key, index) => {
    acc[key as ApplicationPage] = index;
    return acc;
  },
  {} as Record<ApplicationPage, number>,
);

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
  ...Object.values(ApplicationPage).reduce(
    (acc, page) => {
      acc[page] = page;
      return acc;
    },
    {} as Record<ApplicationPage, string>,
  ),
};

// Reverse map from string name to ApplicationPage enum
export const PageIdMap: Record<string, ApplicationPage> = {
  ...Object.values(ApplicationPage).reduce(
    (acc, page) => {
      acc[page] = page;
      return acc;
    },
    {} as Record<string, ApplicationPage>,
  ),
};

export function getPageFromId(id: number): ApplicationPage {
  const pages = Object.values(ApplicationPage);
  return pages[id];
}

export function getIdFromPage(page: ApplicationPage): number {
  return ApplicationPageId[page];
}
