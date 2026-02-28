export const FINDUIT_BASE_URL = process.env.FINDUIT_BASE_URL;

export const AA_ENV = {
  FIU_ID: process.env.FIU_ID!,
  REDIRECTION_KEY: process.env.FIU_REDIRECTION_KEY!,
  FIU_USER_ID: process.env.FIU_USER_ID!,
  USE_CASE_ID: process.env.FIU_USE_CASE_ID!,
  FINDUIT_AUTHENTICATION_BASE_URL: process.env.FINDUIT_AUTHENTICATION_BASE_URL!,
  TXN_ID: process.env.FIU_TXN_ID || "",
  SESSION_ID: process.env.FIU_SESSION_ID!,
  LOG_HTTP: (process.env.AA_LOG_HTTP ?? "false") === "true",
};
