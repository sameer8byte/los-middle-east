export enum ProviderMessageIdEnum {
  ONBOARDING_JOURNEY = "onboarding_journey",
  IN_PROCESS_DAILY_REMINDER = "in_process_daily_reminder",
  LOAN_REJECTION = "loan_rejection",
  APPLICATION_INCOMPLETE = "application_incomplete",
  APPLICATION_SUBMISSION = "application_submission",
}

export const PROVIDER_MESSAGE_ID_OPTIONS = [
  { value: ProviderMessageIdEnum.ONBOARDING_JOURNEY, label: "Onboarding Journey" },
  { value: ProviderMessageIdEnum.IN_PROCESS_DAILY_REMINDER, label: "In Process Daily Reminder" },
  { value: ProviderMessageIdEnum.LOAN_REJECTION, label: "Loan Rejection" },
  { value: ProviderMessageIdEnum.APPLICATION_INCOMPLETE, label: "Application Incomplete" },
  { value: ProviderMessageIdEnum.APPLICATION_SUBMISSION, label: "Application Submission" },
];
