export interface CirProV2Config {
  // baseUrl: process.env.CIR_PRO_V2_BASE_URL,
  // userId: process.env.CIR_PRO_V2_USER_ID,
  // password: process.env.CIR_PRO_V2_PASSWORD,
  // customerId: process.env.CIR_PRO_V2_CUSTOMER_ID,
  // customerName: process.env.CIR_PRO_V2_CUSTOMER_NAME || "Naman Finlease Private Limited",
  // contentType: process.env.CIR_PRO_V2_CONTENT_TYPE || "APPLICATION/JSON",

  baseUrl: string;
  userId: string;
  password: string;
  customerId: string;
  customerName: string; // Optional, can be used for logging or display purposes
  contentType: string; // Default is "APPLICATION/JSON"
}
