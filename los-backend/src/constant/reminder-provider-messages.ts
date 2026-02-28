export enum ProviderMessageIdEnum {
  ONBOARDING_JOURNEY = "onboarding_journey",
  IN_PROCESS_DAILY_REMINDER = "in_process_daily_reminder",
  LOAN_REJECTION = "loan_rejection",
  APPLICATION_INCOMPLETE = "application_incomplete",
  APPLICATION_SUBMISSION = "application_submission",
}

export const PROVIDER_MESSAGE_ID_LABELS: Record<string, string> = {
  [ProviderMessageIdEnum.ONBOARDING_JOURNEY]: "Onboarding Journey",
  [ProviderMessageIdEnum.IN_PROCESS_DAILY_REMINDER]: "In Process Daily Reminder",
  [ProviderMessageIdEnum.LOAN_REJECTION]: "Loan Rejection",
  [ProviderMessageIdEnum.APPLICATION_INCOMPLETE]: "Application Incomplete",
  [ProviderMessageIdEnum.APPLICATION_SUBMISSION]: "Application Submission",
};

export const VALID_PROVIDER_MESSAGE_IDS: string[] = Object.values(ProviderMessageIdEnum);
