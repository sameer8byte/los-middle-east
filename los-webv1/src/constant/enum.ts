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
}
export type PaymentMethod = "PAYTERNING" | "RAZORPAY" |"CASHFREE"


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

export enum AccountStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  CLOSED = "CLOSED",
  PENDING = "PENDING",
  REJECTED = "REJECTED",
}

export enum GenderEnum {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
}

export enum CurrentStatusEnum {
  SALARIED = "SALARIED",
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
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  DISBURSED = "DISBURSED",
  ACTIVE = "ACTIVE",
  PARTIALLY_PAID = "PARTIALLY_PAID",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
  DEFAULTED = "DEFAULTED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
  COMPLETED = "COMPLETED",
  POST_ACTIVE = "POST_ACTIVE",
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
  CUSTOMER = "CUSTOMER",
  BRAND_SETTINGS = "BRAND_SETTINGS",
  LOANS = "LOANS",
  LOAN_OPS = "LOAN_OPS",
  COLLECTIONS = "COLLECTIONS",
  PARTNER_USER_MANAGEMENT = "PARTNER_USER_MANAGEMENT",
  VIEW_DASHBOARD = "VIEW_DASHBOARD",
  COMPLETED_LOANS = "COMPLETED_LOANS",
  REPORTS = "REPORTS",
  POST_COLLECTIONS = "POST_COLLECTIONS",
  SANCTION_MANAGER = "SANCTION_MANAGER",
  SANCTION_HEAD = "SANCTION_HEAD",
  CREDIT_EXECUTIVE = "CREDIT_EXECUTIVE",
}

export enum BrandBankAccountType {
  INDUSIND_BANK = "INDUSIND_BANK",
  BANDHAN_BANK = "BANDHAN_BANK",
  HDFC_BANK = "HDFC_BANK",
}

// Loans Types and Enums
export enum LoanRiskCategory {
  very_poor = "very_poor",
  poor = "poor",
  medium = "medium",
  high = "high",
  very_high = "very_high",
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
  PAYTRING = "PAYTRING",
  RAZORPAY = "RAZORPAY",
  CASHFREE = "CASHFREE",
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
  COLLECTIONS = "COLLECTIONS",
  PARTNER_USER_MANAGEMENT = "PARTNER_USER_MANAGEMENT",
  VIEW_DASHBOARD = "VIEW_DASHBOARD",
  COMPLETED_LOANS = "COMPLETED_LOANS",
  REPORT = "REPORT",
  POST_COLLECTIONS = "POST_COLLECTIONS",
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

export enum EmploymentTypeEnum {
  FULL_TIME = "FULL_TIME",
  PART_TIME = "PART_TIME",
  CONTRACT = "CONTRACT",
  TEMPORARY = "TEMPORARY",
  INTERN = "INTERN",
  FREELANCE = "FREELANCE",
  CASUAL = "CASUAL",
  GIG = "GIG",
  APPRENTICE = "APPRENTICE",
  COMMISSION_BASED = "COMMISSION_BASED",
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

// user status enum

/**
 * Get user status label from UserStatusEnum ID
 * @param statusId - The user status ID (1-5)
 * @returns The status label (e.g., "PENDING", "ACTIVE", etc.)
 */
export function getUserStatusLabel(statusId: number): string {
  const statusMap: Record<number, string> = {
    1: "PENDING",
    2: "ACTIVE",
    3: "ON_HOLD",
    4: "SUSPENDED",
    5: "BLOCKED",
  };
  return statusMap[statusId] || "UNKNOWN";
}

/**
 * Get user status display text (formatted for UI)
 * @param statusId - The user status ID (1-5)
 * @returns The formatted status text (e.g., "Pending", "Active", etc.)
 */
export function getUserStatusDisplay(statusId: number): string {
  const displayMap: Record<number, string> = {
    1: "Pending",
    2: "Active",
    3: "On Hold",
    4: "Suspended",
    5: "Blocked",
  };
  return displayMap[statusId] || "Unknown";
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
