export enum LoanXlsxFileType {
  PAYOUT = "PAYOUT",
  BENEFICIARY = "BENEFICIARY",
}

export enum LoanRiskCategory {
  VERY_POOR = "very_poor",
  POOR = "poor",
  MEDIUM = "medium",
  HIGH = "high",
  VERY_HIGH = "very_high",
  LOW = "low",
  MODERATE = "moderate",
  GOOD = "good",
  EXCELLENT = "excellent",
  EXCEPTIONAL = "exceptional",

  SUBPRIME = "subprime",
  NEAR_PRIME = "near_prime",
  PRIME = "prime",
  SUPER_PRIME = "super_prime",
  ULTRA_PRIME = "ultra_prime",
  
  MIG_CAT_1 = "mig_cat_1",
  MIG_CAT_2 = "mig_cat_2",
  MIG_CAT_3 = "mig_cat_3",
  MIG_CAT_4 = "mig_cat_4",
  MIG_CAT_5 = "mig_cat_5",
  MIG_CAT_6 = "mig_cat_6",
  MIG_CAT_7 = "mig_cat_7",
  MIG_CAT_8 = "mig_cat_8",
  MIG_CAT_9 = "mig_cat_9",
  MIG_CAT_10 = "mig_cat_10",
  MIG_CAT_11 = "mig_cat_11",
  MIG_CAT_12 = "mig_cat_12",
  MIG_CAT_13 = "mig_cat_13",
  MIG_CAT_14 = "mig_cat_14",
  MIG_CAT_15 = "mig_cat_15",
  MIG_CAT_16 = "mig_cat_16",
  MIG_CAT_17 = "mig_cat_17",
  MIG_CAT_18 = "mig_cat_18",
  MIG_CAT_19 = "mig_cat_19",
  MIG_CAT_20 = "mig_cat_20",
  MIG_CAT_21 = "mig_cat_21",
  MIG_CAT_22 = "mig_cat_22",
  MIG_CAT_23 = "mig_cat_23",
  MIG_CAT_24 = "mig_cat_24",
  MIG_CAT_25 = "mig_cat_25",
  MIG_CAT_26 = "mig_cat_26",
  MIG_CAT_27 = "mig_cat_27",
  MIG_CAT_28 = "mig_cat_28",
  MIG_CAT_29 = "mig_cat_29",
  MIG_CAT_30 = "mig_cat_30",
  MIG_CAT_31 = "mig_cat_31",
  MIG_CAT_32 = "mig_cat_32",
  MIG_CAT_33 = "mig_cat_33",
  MIG_CAT_34 = "mig_cat_34",
  MIG_CAT_35 = "mig_cat_35",
  MIG_CAT_36 = "mig_cat_36",
  MIG_CAT_37 = "mig_cat_37",
  MIG_CAT_38 = "mig_cat_38",
  MIG_CAT_39 = "mig_cat_39",
  MIG_CAT_40 = "mig_cat_40",
  MIG_CAT_41 = "mig_cat_41",
  MIG_CAT_42 = "mig_cat_42",
  MIG_CAT_43 = "mig_cat_43",
  MIG_CAT_44 = "mig_cat_44",
  MIG_CAT_45 = "mig_cat_45",
  MIG_CAT_46 = "mig_cat_46",
  MIG_CAT_47 = "mig_cat_47",
  MIG_CAT_48 = "mig_cat_48",
  MIG_CAT_49 = "mig_cat_49",
  MIG_CAT_50 = "mig_cat_50",
}

export enum LoanTypeEnum {
  EMI = "EMI",
  PAYDAY_LOAN = "PAYDAY_LOAN",
}

export enum FeeType {
  PROCESSING = "processing",
  CONVENIENCE = "convenience",
  DOCUMENTATION = "documentation",
  INTEREST = "interest",
}

export enum FeeValueType {
  FIXED = "fixed",
  PERCENTAGE = "percentage",
}

export enum FeeApplicableType {
  REQUEST_AMOUNT = "request_amount",
  EACH_INSTALLMENT = "each_installment",
}

export enum ChargeMode {
  INCLUSIVE = "INCLUSIVE",
  EXCLUSIVE = "EXCLUSIVE",
}

export enum GenderEnum {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
}

export enum DocumentTypeEnum {
  AADHAAR = "AADHAAR",
  PAN = "PAN",
}

export enum OtherDocumentTypeEnum {
  VOTER_ID = "VOTER_ID",
  DRIVING_LICENSE = "DRIVING_LICENSE",
  PASSPORT = "PASSPORT",
  RATION_CARD = "RATION_CARD",
  BIRTH_CERTIFICATE = "BIRTH_CERTIFICATE",
  ELECTRICITY_BILL = "ELECTRICITY_BILL",
  WATER_BILL = "WATER_BILL",
  GAS_BILL = "GAS_BILL",
  RENT_AGREEMENT = "RENT_AGREEMENT",
  SALARY_SLIP = "SALARY_SLIP",
  FORM_16 = "FORM_16",
  ITR_V = "ITR_V",
  EMPLOYER_CERTIFICATE = "EMPLOYER_CERTIFICATE",
  COLLEGE_ID = "COLLEGE_ID",
  MARRIAGE_CERTIFICATE = "MARRIAGE_CERTIFICATE",
  PROPERTY_TAX_RECEIPT = "PROPERTY_TAX_RECEIPT",
  INSURANCE_POLICY = "INSURANCE_POLICY",
  OTHER = "OTHER",
}

export enum DocumentStatusEnum {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum MaritalStatusEnum {
  SINGLE = "SINGLE",
  MARRIED = "MARRIED",
  DIVORCED = "DIVORCED",
  WIDOWED = "WIDOWED",
}

export enum ModeOfSalary {
  BANK_TRANSFER = "BANK_TRANSFER",
  CASH = "CASH",
  CHEQUE = "CHEQUE",
  OTHER = "OTHER",
}

export enum UserBankVerificationMethod {
  MANUAL = "MANUAL",
  PENNY_DROP = "PENNY_DROP",
  API = "API",
}

export enum UserBankVerificationStatus {
  PENDING = "PENDING",
  VERIFIED = "VERIFIED",
  FAILED = "FAILED",
  RETRYING = "RETRYING",
}

export enum UserDataStatus {
  NOT_VERIFIED = "NOT_VERIFIED",
  VERIFIED_BY_USER = "VERIFIED_BY_USER",
  VERIFIED_BY_ADMIN = "VERIFIED_BY_ADMIN",
}

export enum PlatformType {
  WEB = "WEB",
  PARTNER = "PARTNER",
}

export enum TaxType {
  GST = "GST",
  TDS = "TDS",
  VAT = "VAT",
  CESS = "CESS",
  CUSTOM = "CUSTOM",
}

export enum PenaltyType {
  SIMPLE = "SIMPLE",
  COMPOUND = "COMPOUND",
}

export enum RejectionSource {
  ADMIN = "ADMIN",
  SYSTEM = "SYSTEM",
  AUTOMATED = "AUTOMATED",
  SUPPORT = "SUPPORT",
  OTHER = "OTHER",
}

export enum RejectionType {
  DOCUMENT_INSUFFICIENT = "DOCUMENT_INSUFFICIENT",
  CREDIT_SCORE_LOW = "CREDIT_SCORE_LOW",
  INVALID_INFORMATION = "INVALID_INFORMATION",
  KYC_FAILED = "KYC_FAILED",
  OTHER = "OTHER",
}

export enum ReligionEnum {
  HINDUISM = "HINDUISM",
  ISLAM = "ISLAM",
  CHRISTIANITY = "CHRISTIANITY",
  SIKHISM = "SIKHISM",
  BUDDHISM = "BUDDHISM",
  JAINISM = "JAINISM",
  JUDAISM = "JUDAISM",
  ZOROASTRIANISM = "ZOROASTRIANISM",
  BAHAI = "BAHAI",
  ANIMISM = "ANIMISM",
  ATHEIST = "ATHEIST",
  AGNOSTIC = "AGNOSTIC",
  OTHER = "OTHER",
  PREFER_NOT_TO_SAY = "PREFER_NOT_TO_SAY",
}

export enum ResidenceTypeEnum {
  RENTED = "RENTED",
  OWNED = "OWNED",
}

export enum AddressProofEnum {
  GAS_BILL = "GAS_BILL",
  WATER_BILL = "WATER_BILL",
  ELECTRICITY_BILL = "ELECTRICITY_BILL",
  WIFI_BILL = "WIFI_BILL",
  POSTPAID_BILL = "POSTPAID_BILL",
  CREDIT_CARD_STATEMENT = "CREDIT_CARD_STATEMENT",
  RENT_AGREEMENT = "RENT_AGREEMENT",
}

export enum RelationshipEnum {
  SPOUSE = "SPOUSE",
  BROTHER = "BROTHER",
  SISTER = "SISTER",
  FATHER = "FATHER",
  MOTHER = "MOTHER",
  OTHER = "OTHER",
  FRIEND = "FRIEND",
  COLLEAGUE = "COLLEAGUE",
}

export enum LoanStatusEnum {
  ONBOARDING = "ONBOARDING",
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  DISBURSED = "DISBURSED",
  ACTIVE = "ACTIVE",
  PARTIALLY_PAID = "PARTIALLY_PAID",
  PAID = "PAID",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
  COMPLETED = "COMPLETED",
  POST_ACTIVE = "POST_ACTIVE",
  WRITE_OFF = "WRITE_OFF",
  SETTLED = "SETTLED",
  CREDIT_EXECUTIVE_APPROVED = "CREDIT_EXECUTIVE_APPROVED",
  SANCTION_MANAGER_APPROVED = "SANCTION_MANAGER_APPROVED",
}

export enum EvaluationStatusEnum {
  PASSED = "PASSED",
  FAILED = "FAILED",
  PENDING = "PENDING",
}

export enum EligibilityStatusEnum {
  ELIGIBLE = "ELIGIBLE",
  NOT_ELIGIBLE = "NOT_ELIGIBLE",
}

export enum AgreementStatusEnum {
  NOT_SENT = "NOT_SENT",
  SENT = "SENT",
  SIGNED = "SIGNED",
  REJECTED = "REJECTED",
  EXPIRED = "EXPIRED",
}

export enum PaymentTypeEnum {
  DISBURSEMENT = "DISBURSEMENT",
  REPAYMENT = "REPAYMENT",
  REFUND = "REFUND",
  PENALTY = "PENALTY",
}

export enum PaymentStatusEnum {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export enum TransactionTypeEnum {
  DISBURSEMENT = "DISBURSEMENT",
  COLLECTION = "COLLECTION",
  PARTIAL_COLLECTION = "PARTIAL_COLLECTION",
}

export enum TransactionStatusEnum {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  RETRYING = "RETRYING",
  CANCELLED = "CANCELLED",
  TIMEOUT = "TIMEOUT",
}

export enum PartnerUserPermissionEnum {
  ALL = "ALL",

  // Core Modules
  CUSTOMER = "CUSTOMER",
  BRAND_SETTINGS = "BRAND_SETTINGS",
  LOANS = "LOANS",
  LOAN_OPS = "LOAN_OPS",
  COLLECTIONS = "COLLECTIONS",
  PRE_COLLECTIONS = "PRE_COLLECTIONS",
  POST_COLLECTIONS = "POST_COLLECTIONS",

  // User & Access
  PARTNER_USER_MANAGEMENT = "PARTNER_USER_MANAGEMENT",
  RELOCATE_USER = "RELOCATE_USER",

  // Dashboard & Search
  VIEW_DASHBOARD = "VIEW_DASHBOARD",
  GLOBAL_SEARCH = "GLOBAL_SEARCH",

  // Loan Lifecycle
  COMPLETED_LOANS = "COMPLETED_LOANS",
  LOAN_REACTIVATE = "LOAN_REACTIVATE",
  LOAN_FORCE_BYPASS = "LOAN_FORCE_BYPASS",

  // Roles
  CREDIT_EXECUTIVE = "CREDIT_EXECUTIVE",
  SANCTION_MANAGER = "SANCTION_MANAGER",
  SANCTION_HEAD = "SANCTION_HEAD",

  // Collection Ops
  COLLECTION_REALLOCATE_LOANS = "COLLECTION_REALLOCATE_LOANS",

  // Onboarding
  ONBOARDING_IN_PROGRESS = "ONBOARDING_IN_PROGRESS",
  ONBOARDING_COMPLETED = "ONBOARDING_COMPLETED",

  // Reports (Generic)
  REPORT = "REPORT",
  REPORTS = "REPORTS",
  MASTER_REPORTS = "MASTER_REPORTS",

  // Loan Reports
  DISBURSED_LOAN_REPORT = "DISBURSED_LOAN_REPORT",
  NON_DISBURSED_LOAN_REPORT = "NON_DISBURSED_LOAN_REPORT",
  COMPLETED_LOAN_WITH_NO_REPET_REPORT = "COMPLETED_LOAN_WITH_NO_REPET_REPORT",
  ACTIVE_LOANS_BY_DUE_DATE_REPORT = "ACTIVE_LOANS_BY_DUE_DATE_REPORT",

  // Collection Reports
  MASTER_COLLECTION_REPORT = "MASTER_COLLECTION_REPORT",
  COLLECTION_LOAN_REPORT = "COLLECTION_LOAN_REPORT",
  COLLECTION_DUE_REPORT = "COLLECTION_DUE_REPORT",
  COLLECTION_ALLOCATION_EXECUTIVE_REPORT = "COLLECTION_ALLOCATION_EXECUTIVE_REPORT",

  // Compliance / Ops Reports
  CIC_REPORT = "CIC_REPORT",
  MARKETING_REPORT = "MARKETING_REPORT",
  PROCESS_DISBURSEMENT_TRANSACTION_REPORT = "PROCESS_DISBURSEMENT_TRANSACTION_REPORT",
  FIELD_VISIT_REPORT = "FIELD_VISIT_REPORT",

  // Reminders
  USER_REMINDERS = "USER_REMINDERS",
}



export enum BrandBankAccountType {
  INDUSIND_BANK = "INDUSIND_BANK",
  BANDHAN_BANK = "BANDHAN_BANK",
  HDFC_BANK = "HDFC_BANK",
  ICICI_BANK = "ICICI_BANK",
  IDFC_BANK = "IDFC_BANK",
  EQUITAS_BANK = "EQUITAS_BANK",
}



// TenureUnit Enum
export enum TenureUnit {
  days = "days",
  weeks = "weeks",
  months = "months",
  years = "years",
}

export enum PaymentMethodEnum {
  MANUAL = "MANUAL",
  PAYTERNING = "PAYTERNING",
  RAZORPAY = "RAZORPAY",
  CASHFREE = "CASHFREE",
  RAZORPAY_AUTOPAY = "RAZORPAY_AUTOPAY",
  IDFC = "IDFC",
  ICICI = "ICICI"
}
// PartnerUserRoleEnumEnum
export enum PartnerUserRoleEnum {
  OTHER = "OTHER",
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  CUSTOMER = "CUSTOMER",
  BRAND_SETTINGS = "BRAND_SETTINGS",
  LOANS = "LOANS",
  LOAN_OPS = "LOAN_OPS",
  PARTNER_USER_MANAGEMENT = "PARTNER_USER_MANAGEMENT",
  VIEW_DASHBOARD = "VIEW_DASHBOARD",
  COMPLETED_LOANS = "COMPLETED_LOANS",
  REPORT = "REPORT",
  COLLECTION_EXECUTIVE = "COLLECTION_EXECUTIVE",
  COLLECTION_MANAGER = "COLLECTION_MANAGER",
  COLLECTION_HEAD = "COLLECTION_HEAD",
  SANCTION_MANAGER = "SANCTION_MANAGER",
  SANCTION_HEAD = "SANCTION_HEAD",
  CREDIT_EXECUTIVE = "CREDIT_EXECUTIVE",
}

export enum PartnerUserPermissionType {
  READ = "READ",
  WRITE = "WRITE",
  ALL = "ALL",
}
export enum ApprovalStatusEnum {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum ClosingTypeEnum {
  SETTLEMENT = "SETTLEMENT",
  WRITE_OFF = "WRITE_OFF",
  NORMAL = "NORMAL",
}

export enum ReloanStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum MigrationStatus {
  ONBOARDED_NEW = "ONBOARDED_NEW",
  MIGRATED = "MIGRATED",
  PARTIALLY_MIGRATED = "PARTIALLY_MIGRATED",
}

export enum ReminderType {
  SEVEN_DAY = "SEVEN_DAY",
  THREE_DAY = "THREE_DAY",
  ONE_DAY = "ONE_DAY",
  SAME_DAY = "SAME_DAY",
  OVERDUE = "OVERDUE",
  CUSTOM = "CUSTOM",
}

export enum VerificationType {
  OTP = "OTP",
  VOICE_CALL = "VOICE_CALL",
}

export enum BrandProviderType {
  PENNYDROP = "PENNYDROP",
  LOAN_AGREEMENT = "LOAN_AGREEMENT",
  BRE = "BRE",
  PAN_DETAILS_PLUS = "PAN_DETAILS_PLUS",
  PHONE_TO_UAN = "PHONE_TO_UAN",
  UAN_TO_EMPLOYMENT = "UAN_TO_EMPLOYMENT",
  PAN_FD = "PAN_FD",
  PINCODE_FD = "PINCODE_FD",
  MOBILE_TO_ADDRESS = "MOBILE_TO_ADDRESS",
  MOBILE_TO_ECOM_ADDRESS = "MOBILE_TO_ECOM_ADDRESS",
  MOBILE_TO_LPG_ADDRESS = "MOBILE_TO_LPG_ADDRESS",
  MOBILE_TO_DL_ADDRESS = "MOBILE_TO_DL_ADDRESS",
  UPI_AUTOPAY = "UPI_AUTOPAY",
  FULL_PAYMENT = "FULL_PAYMENT",
  PART_PAYMENT = "PART_PAYMENT",
  AADHAAR_DIGILOCKER = "AADHAAR_DIGILOCKER",
  DISBURSEMENT = "DISBURSEMENT",
  ACCOUNT_AGGREGATION = "ACCOUNT_AGGREGATION"
}

export enum BrandProviderName {
  DIGITAP = "DIGITAP",
  NEOKRED = "NEOKRED",
  SIGNDESK = "SIGNDESK",
  RAZORPAY = "RAZORPAY",
  RAZORPAY_AUTOPAY = "RAZORPAY_AUTOPAY",
  SIGNZY = "SIGNZY",
  FINBOX = "FINBOX",
  SCOREME = "SCOREME",
  CART = "CART",
  EQUIFAX = "EQUIFAX",
  CIRPRO = "CIRPRO",
  KYCKART = "KYCKART",
  CMS_FINTECHCLOUD = "CMS_FINTECHCLOUD",
  CASHFREE = "CASHFREE",
  PAYTRING = "PAYTRING",
  ICICI = "ICICI",
  IDFC = "IDFC",
  MANUAL = "MANUAL",
  FINDUIT = "FINDUIT"
}

// notification_priority_enum
export enum NotificationPriorityEnum {
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
}

export enum PartnerTabsEnum {
  COMPLETED_LOANS = "COMPLETED_LOANS",
  COLLECTIONS = "COLLECTIONS",
  PRE_COLLECTIONS = "PRE_COLLECTIONS",
  POST_COLLECTIONS = "POST_COLLECTIONS",
  LOAN_OPS = "LOAN_OPS",
  LOANS = "LOANS",
  CREDIT_EXECUTIVE = "CREDIT_EXECUTIVE",
  SANCTION_MANAGER = "SANCTION_MANAGER",
  SANCTION_HEAD = "SANCTION_HEAD",
}
// 1	1	Pending	PENDING		1	true	2026-02-18 03:43:57.361386+00	2026-02-18 03:43:57.361386+00
// 2	1	Active	ACTIVE		2	true	2026-02-18 03:43:57.361386+00	2026-02-18 03:43:57.361386+00
// 3	1	On Hold	ON_HOLD		3	true	2026-02-18 03:43:57.361386+00	2026-02-18 03:43:57.361386+00
// 4	1	Suspended	SUSPENDED		4	true	2026-02-18 03:43:57.361386+00	2026-02-18 03:43:57.361386+00
// 5	1	Blocked	BLOCKED		5	true	2026-02-18 03:43:57.361386+00	2026-02-18 03:43:57.361386+00
// 7	2	Salaried	SALARIED		1	true	2026-02-18 05:55:30.097291+00	2026-02-18 05:55:30.097291+00
// 8	2	Self Employed - Business	SELF_EMPLOYED_BUSINESS		2	true	2026-02-18 05:55:30.097291+00	2026-02-18 05:55:30.097291+00
// 9	2	Self Employed - Professional	SELF_EMPLOYED_PROFESSIONAL		3	true	2026-02-18 05:55:30.097291+00	2026-02-18 05:55:30.097291+00
// 10	2	Student	STUDENT		4	true	2026-02-18 05:55:30.097291+00	2026-02-18 05:55:30.097291+00
// 11	2	Homemaker	HOMEMAKER		5	true	2026-02-18 05:55:30.097291+00	2026-02-18 05:55:30.097291+00
// 12	2	Retired	RETIRED		6	true	2026-02-18 05:55:30.097291+00	2026-02-18 05:55:30.097291+00
// 13	2	Unemployed	UNEMPLOYED		7	true	2026-02-18 05:55:30.097291+00	2026-02-18 05:55:30.097291+00
// 14	2	Other	OTHER		8	true	2026-02-18 05:55:30.097291+00	2026-02-18 05:55:30.097291+00
export enum OccupationTypeEnum {
  SALARIED = 7,
  SELF_EMPLOYED_BUSINESS = 8,
  SELF_EMPLOYED_PROFESSIONAL = 9,
  STUDENT = 10,
  HOMEMAKER = 11,
  RETIRED = 12,
  UNEMPLOYED = 13,
  OTHER = 14,
}

export enum UserStatusEnum {
  PENDING = 1,
  ACTIVE = 2,
  ON_HOLD = 3,
  SUSPENDED = 4,
  BLOCKED = 5,
}

/**
 * Get user status display text (formatted for UI)
 * @param statusId - The user status ID (1-5)
 * @returns The formatted status text (e.g., "Pending", "Active", etc.)
 */
export function getUserStatusDisplay(statusId: BigInt | null): string {
  if (statusId === null) return "Unknown";

  const displayMap: Record<number, string> = {
    1: "Pending",
    2: "Active",
    3: "On Hold",
    4: "Suspended",
    5: "Blocked",
  };

  return displayMap[Number(statusId)] ?? "Unknown";
}

/**
 * Get user status color for UI (Tailwind classes)
 * @param statusId - The user status ID (1-5)
 * @returns Tailwind CSS classes for the status color
 */
export function getUserStatusColor(statusId: number): string {
  const colorMap: Record<number, string> = {
    1: "bg-yellow-100 text-yellow-800", // Pending - Yellow
    2: "bg-green-100 text-green-800", // Active - Green
    3: "bg-blue-100 text-blue-800", // On Hold - Blue
    4: "bg-orange-100 text-orange-800", // Suspended - Orange
    5: "bg-red-100 text-red-800", // Blocked - Red
  };
  return colorMap[statusId] || "bg-gray-100 text-gray-800";
}
