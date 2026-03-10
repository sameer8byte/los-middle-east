import {
  MigrationStatus,
  ReloanStatus,
  GenderEnum,
  MaritalStatusEnum,
  RelationshipEnum,
  DocumentTypeEnum,
  OtherDocumentTypeEnum,
} from "../../constant/enum";
import { Loan } from "./loan";
export interface BrandStatusReason {
  id: string;
  brandId: string;
  reason: string;
  isDisabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  type: string;
  status: string;
}

export interface UserStatusBrandReason {
  id: string;
  userId: string;
  brandStatusReasonId: string;
  brand_status_reasons: BrandStatusReason;
}

export interface LeadMatchDetail {
  id: string;
  entityType: "USER" | "DOCUMENT";
  matchType: "EXACT" | "PARTIAL" | "FUZZY";
  matchField: "EMAIL" | "PHONE" | "PAN" | "FULL_NAME";
  confidence: number;
  hasUserId: boolean;
  hasDocumentId: boolean;
  leadFormName?: string;
  campaignName?: string;
  platform?: string;
  createdAt: Date;
}

export interface AllocatedPartner {
  id: string;
  name: string | null;
  email: string;
}

export interface Customer {
  profilePicUrl?: string;
  id: string;
  formattedUserId: string;
  email: string;
  name: string;
  dateOfBirth: Date | null;
  phoneNumber: string;
  Salary: number,
  alternate_phone_1: string | null;
  alternate_phone_2: string | null;
  createdAt: Date;
  googleId: string | null;
  onboardingStep: number;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isWhatsappVerified: boolean;
  migrationStatus: MigrationStatus;
  kycCompleted: boolean;
  lastLoginAt: Date | null;
  userBlockAlert: string | null;
  loanEligible: boolean;
  documents?: Document[];
  utmTracking?: UtmTracking[];
  brandSubDomain: {
    marketingSource: string | null;
    subdomain: string;
  };
  isActive: boolean;
  leadMatches: number;
  leadMatchesDetails?: LeadMatchDetail[];
  onboardingJourneys?: OnboardingJourney[];
  userDetails: UserDetails;
  userReloans: UserReloan[];
  allocatedPartnerUserId: string | null;
  allocatedPartner?: AllocatedPartner | null;
  loanCount: number;
  loans: Loan[];
  status_id: BigInt | null;
  is_terms_accepted: boolean;
  user_status_brand_reasons: UserStatusBrandReason[];
  occupation_type_id: string | null;
}
export interface UserReloan {
  id: string;
  userId: string;
  previousLoanId: string | null;
  status: ReloanStatus;
  reason: string | null;
  remarks: string | null;
  createdAt: Date;
  updatedAt: Date;
  isResolved: boolean;
  previousLoan: Loan;
}

export interface UserAllottedPartner {
  id: string;
  userId: string;
  partnerUserId: string;
  allottedAt: Date;
  partnerUser: {
    id: string;
    name: string | null;
    email: string;
    isActive: boolean;
    reportsToId: string | null;
  };
}

export interface OnboardingJourney {
  id: string;
  stepNumber: number;
  brandId: string;
  userId: string;
  createdAt: Date;
}

export interface UtmTracking {
  id: string;
  userId: string;
  brandId: string;
  sessionId: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  landingPageUrl: string | null;
  referrerUrl: string | null;
  capturedAt: Date;
  createdAt: Date;
}
export interface UserDetails {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  gender: GenderEnum;
  dateOfBirth: Date;
  profilePicUrl: string;
  address: string;
  profileVideoUrl: string;
  city: string;
  state: string;
  pincode: string;
  maritalStatus: MaritalStatusEnum;
  spouseName: string;
  fathersName: string;
  middleName: string;
  isCommunicationAddress: boolean;
}

export interface AlternateAddress {
  id?: string;
  userId: string;
  address: string;
  city: string;
  state: string;
  pincode: string;

  country: string;
}

export interface AlternatePhoneNumber {
  id: string;
  userId: string;
  phone: string;
  label: string;
  isVerified: boolean;
  verifiedAt: Date | null;
  name: string;
  relationship: RelationshipEnum;
}

export interface ProviderData {
  personalDetails?: {
    name?: string;
    dob?: string;
    gender?: string;
    careOf?: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    middleName?: string;
    aadhaarNumber?: string;
    pan?: {
      number?: string;
      type?: string;
    };
  };
  addressDetails?: {
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  verification?: {
    isXmlValid?: boolean;
    passCode?: string;
    uniqueId?: string;
  };
  documentLinks?: {
    imageBase64?: string;
  };
  result: any;
}

export interface Document {
  userId: string;
  fileUrl: string;
  fileType: string;
  verificationNotes: string;
  backDocumentUrl: string | null; // URL for the back side of the document, if applicable
  createdAt: string;
  documentNumber: string;
  frontDocumentUrl: string; // URL for the front side of the document
  id: string;
  panAadhaarVerification: string | null; // "PENDING" | "VERIFIED" | "FAILED"
  status: string;
  frontPassword: string | null; // Password for the front side of the document, if applicable
  backPassword: string | null; // Password for the back side of the document, if applicable
  type: DocumentTypeEnum;
  verifiedAt: Date | null;
  providerData: ProviderData | null; // Data from the verification provider, if applicable    dd
}
export interface OtherDocument {
  userId: string;
  fileUrl: string;
  fileType: string;
  verificationNotes: string;
  backDocumentUrl: string | null; // URL for the back side of the document, if applicable
  createdAt: string;
  documentNumber: string;
  frontDocumentUrl: string; // URL for the front side of the document
  id: string;
  status: string;
  type: OtherDocumentTypeEnum;
  verifiedAt: Date | null;
  frontPassword: string | null; // Password for the front side of the document, if applicable
  backPassword: string | null; // Password for the back side of the document, if
  providerData: ProviderData | null; // Data from the verification provider, if applicable    dd
}

export interface Payslip {
  id: string;
  createdAt: Date;
  filePrivateKey: string;
  filePassword: string | null;
  month: string;
  year: string;
}

export interface Employment {
  id: string;
  userId: string;
  companyName: string;
  designation: string | null;
  joiningDate: Date | null;
  officialEmail: string | null;
  salary: number | null;
  companyAddress: string | null;
  salaryExceedsBase: boolean;
  pinCode: string | null;
  uanNumber: string | null;
  expectedDateOfSalary: number | null;
  modeOfSalary: ModeOfSalary | null;
}

export interface SalarySlipEntry {
  id: boolean;
  userId: boolean;
  employmentId: boolean;
  month: boolean;
  year: boolean;
  filePrivateKey: boolean;
  filePassword: boolean;
  fileName: boolean;
  uploadedAt: boolean;
  createdAt: boolean;
  updatedAt: boolean;
}

export enum ModeOfSalary {
  BANK_TRANSFER = "BANK_TRANSFER",
  CASH = "CASH",
  CHEQUE = "CHEQUE",
  OTHER = "OTHER",
}

export interface UserBankAccount {
  id?: string;
  userId?: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  bankAddress: string;
  accountType: string;
  verificationMethod?: user_bank_verification_method;
  verificationStatus?: user_bank_verification_status;
  // isVerified?: boolean;
}

export enum user_bank_verification_method {
  MANUAL = "MANUAL",
  PENNY_DROP = "PENNY_DROP",
  API = "API",
}

export enum user_bank_verification_status {
  PENDING = "PENDING",
  VERIFIED = "VERIFIED",
  FAILED = "FAILED",
  RETRYING = "RETRYING",
}

export interface ISummary {
  id: string;
  email: string;
  name: string;
  dateOfBirth: string | null;
  phoneNumber: string;
  createdAt: Date;
  onboardingStep: number;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isWhatsappVerified: boolean;
  kycCompleted: boolean;
  accountStatus: string | null;
  // rejectionReason: string | null;
  loanEligible: boolean;

  userReloans: UserReloan[]; // Added user reloan data

  documents: {
    id: string;
    type: string;
    status: string;
    createdAt: Date;
    verifiedAt: Date | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    providerData: any;
  }[];

  employment: {
    id: string | null;
    companyName: string | null;
    designation: string | null;
    salary: number | null;
    joiningDate: Date | null;
    salaryExceedsBase: boolean;
    payslips: Payslip[];
  };

  bankAccount: {
    id: string | null;
    accountNumber: string | null;
    ifscCode: string | null;
    accountHolderName: string | null;
    bankName: string | null;
    verifiedAt: Date | null;
    statements?: BankStatement[];
  }[];
  // userRejections: UserRejection[];

  userGeoTags: {
    id: string;
    latitude: number;
    longitude: number;
    notes: string;
    address: string;
    city: string;
    country: string;
    district: string;
    postalCode: string;
    state: string;
    street: string;
    sublocality: string;
    createdAt: Date;
  }[];
}

export interface BankStatement {
  id: string;
  userId: string;
  userBankAccountId: string;
  filePrivateKey: string; // Path to the bank statement file in storage
  fromDate: string | null; // ISO date string or null
  toDate: string | null; // ISO date string or null
  createdAt: string;
  updatedAt: string;
  filePassword: string | null;
}

interface Recording {
  id: string;
  filePrivateUrl: string;
}

interface CallEvent {
  id: string;
  type: string;
  callCreatedReason: string;
  duration: number | null;
  callStatus: string;
  createdAt: string;
  updatedAt: string;
}

interface UserCall {
  id: string;
  recordings: Recording[];
  events: CallEvent[];
}

interface User {
  id: string;
  email: string;
  phoneNumber: string;
}

interface PartnerUser {
  id: string;
  email: string;
}

export interface RepaymentTimeline {
  id: string;
  loanId: string;
  userId: string;
  partnerUserId: string;
  fileUrl: string | null;
  message: string;
  createdAt: string;
  updatedAt: string;
  user: User;
  partnerUser: PartnerUser;
  userCall: UserCall;
  loan: Loan;
}

export interface EvaluationItem {
  id: string;
  evaluationId: string;
  parameter: string;
  requiredValue: string;
  actualValue: string;
  source: string;
  status: "ELIGIBLE" | "NOT_ELIGIBLE";
  override: boolean;
  comments: string | null;
}

export interface Evaluation {
  id: string;
  userId: string;
  loanId: string;
  createdAt: string;
  autoGeneratedFeedback: string | null;
  isBsaReportAvailable: boolean;
  isCreditReportAvailable: boolean;
  evaluation_item: EvaluationItem[];
}
// id
// loanId
// partnerUserId
// allottedAt
// amount

// loan_allotted_partner_user
export interface AllottedPartner {
  id: string;
  loanId: string;
  partnerUser: Customer;
  allottedAt: string;
  amount: number;
}

export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

export interface CirProv2SomeTable {
  id: string;
  userId: string;
  rawReportJson: Json;
  reportDocumentUrl: string;
  uploadedAt: Date | null;
  createdAt: Date;
  errorCode: string | null;
  errorMessage: string | null;
  formattedReport: string | null;
}
