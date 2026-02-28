import {
  AgreementStatusEnum,
  LoanXlsxFileType,
  TransactionTypeEnum,
  TransactionStatusEnum,
  ApprovalStatusEnum,
  ClosingTypeEnum,
  LoanRiskCategory,
  PenaltyType,
  FeeValueType,
  TaxType,
  LoanTypeEnum,
  FeeType,
  ChargeMode,
  LoanStatusEnum,
  DocumentTypeEnum,
  TenureUnit,
  BrandProviderName,
  PlatformType,
} from "../../constant/enum";
import { AlternatePhoneNumber } from "./customers";
import { PartnerUser } from "./partnerUser";

export interface LoanAgreementReference {
  id: string;
  loanAgreementId: string;
  referenceId: string;
  referenceDocId: string;
  sentAt: string | null;
  signedAt: string | null;
  rejectedAt: string | null;
  expiredAt: string | null;
  createdAt: string;
  provider: BrandProviderName;
  unSignedFilePrivateKey?: string | null;
}

export interface LoanAgreement {
  signed: string | null;
  signedFilePrivateKey: string | null;
  id: string;
  signedAt: string | null;
  loanId: string;
  status: AgreementStatusEnum; // extend as needed
  signedByUser: boolean;
  createdAt: string;
  updatedAt: string;
  referenceDocId: string;
  referenceId: string;
  references?: LoanAgreementReference[];
  unsignedData?: string; // base64 encoded PDF data
  loan?: {
    userId: string;
    id: string;
    formattedLoanId: string;
    amount: number;
    status: LoanStatusEnum;
    createdAt: string;
    loanDetails?: {
      dueDate: string;
      durationDays: number;
    };
    disbursement?: {
      id: string;
      grossAmount: number;
      totalDeductions: number;
      netAmount: number;
      processing_fee: number | null;
      deductions?: {
        id: string;
        type: FeeType;
        calculationValueType: FeeValueType;
        calculationBaseAmount: number;
        calculationTaxAmount: number;
        chargeMode: ChargeMode;
        total: number;
        chargeValue: number;
        isRecurringDaily: boolean;
        taxes?: {
          id: string;
          type: TaxType;
          chargeValue: number;
          amount: number;
          isInclusive: boolean;
          valueType: FeeValueType;
        }[];
      }[];
    };
    repayment?: {
      id: string;
      totalObligation: number;
      totalFees: number;
      feeBreakdowns?: {
        id: string;
        type: FeeType;
        calculationValueType: FeeValueType;
        calculationBaseAmount: number;
        calculationTaxAmount: number;
        chargeMode: ChargeMode;
        total: number;
        chargeValue: number;
        isRecurringDaily: boolean;
        taxes?: {
          id: string;
          type: TaxType;
          chargeValue: number;
          amount: number;
          isInclusive: boolean;
          valueType: FeeValueType;
        }[];
      }[];
    };
  };
}

export interface LoansXlsx {
  id: string;
  brandId: string;
  loanId: string;
  fileName: string;
  filePrivateUrl: string;
  fileType: LoanXlsxFileType;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRequest {
  id: string;
  userId: string;
  brandId: string;
  loanId: string;
  type: TransactionTypeEnum; // assuming your enum
  currency: string;
  status: TransactionStatusEnum; // you can adjust as per your status enum
  description: string | null;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  partialCollectionTransactions: PaymentPartialCollectionTransaction[];
  collectionTransactions: PaymentCollectionTransaction[];
  disbursalTransactions: PaymentDisbursalTransaction[];
}

export interface PaymentTransactionReceipt {
  id: string;
  receiptKey: string;
  issuedAt: string;
  createdAt: string;
  updatedAt: string;
  transactionId: string | null;
  partialTransactionId: string | null;
}

export interface PaymentCollectionTransaction {
  id: string;
  paymentRequestId: string;
  provider: string;
  status: TransactionStatusEnum; // again, assuming possible status
  opsApprovalStatus: ApprovalStatusEnum;
  opsRemark: string | null;
  currency: string;
  externalRef: string;
  retryCount: number;
  failureReason: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  externalUrl: string;
  receiptId: string;
  method: string; // assuming this is a string, adjust if it's a different type
  note: string | null; // if you want to allow null notes
  paymentDetails: JSON;

  amount: number; // if you want, you can convert to number if you always store numeric strings

  totalFees: number;
  totalTaxes: number;
  totalPenalties: number;
  closingType: ClosingTypeEnum;
  penaltyDiscount: number;
  excessAmount: number;
  receipt: PaymentTransactionReceipt[];
  roundOffDiscount: number;
  createdByPartnerId: string | null;
  opsPartnerId: string | null;
  paymentLink: string | null;
  principalAmount: string | null;
  reloanRemark: string | null;
  isReloanApplicable: boolean | null;
  isPaymentComplete: boolean | null;
  platformType: PlatformType | null;
  createdByPartner?: {
    id: string;
    name: string;
    email: string;
  } | null;
  opsByPartner?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface PaymentDisbursalTransaction {
  id: string;
  paymentRequestId: string;
  provider: string;
  status: TransactionStatusEnum; // again, assuming possible status
  amount: string; // if you want, you can convert to number if you always store numeric strings
  currency: string;
  externalRef: string;
  retryCount: number;
  failureReason: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  externalUrl: string;
  receiptId: string;
  method: string; // assuming this is a string, adjust if it's a different type
  note: string | null; // if you want to allow null notes
  createdByPartnerId: string | null;
  opsPartnerId: string | null;
  // Partner details populated from backend
  createdByPartner?: {
    id: string;
    name: string;
    email: string;
  } | null;
  opsByPartner?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface PaymentPartialCollectionTransaction {
  id: string;
  paymentRequestId: string;
  provider: string;
  status: TransactionStatusEnum; // again, assuming possible status
  opsApprovalStatus: ApprovalStatusEnum;
  amount: number; // if you want, you can convert to number if you always store
  totalFees: number;
  totalTaxes: number;
  totalPenalties: number;
  principalAmount: number; // assuming this is a percentage or fixed amount
  currency: string;
  externalRef: string;
  retryCount: number;
  failureReason: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  externalUrl: string;
  receiptId: string;
  method: string; // assuming this is a string, adjust if it's a different type
  note: string | null; // if you want to allow null notes

  penaltyDiscount: number;
  roundOffDiscount: number;
  excessAmount: number;

  closingType: ClosingTypeEnum;
  receipt: PaymentTransactionReceipt[]; // assuming this is optional
  opsRemark: string | null;
  createdByPartnerId: string | null;

  paymentLink: string | null;
  platformType: PlatformType | null;

  opsPartnerId: string | null;
  // Partner details populated from backend
  createdByPartner?: {
    id: string;
    name: string;
    email: string;
  } | null;
  opsByPartner?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface LoanRule {
  id: string;
  brandId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  maxAmount: number;
  minAmount: number;
  ruleType: LoanRiskCategory;
  maxCompleteLoanCount: number; // assuming this is optional
  isVisible: boolean;
  isDisabled: boolean;
  loan_charge_config?: LoanChargeConfig[];
  tenures?: Tenure[];
}

export type LoanPenalty = {
  id: string;
  type: PenaltyType; // you can expand this based on your enum
  valueType: FeeValueType; // assuming these are the only two
  chargeValue: number;
  taxType: TaxType; // expand this as per your supported tax types
  taxChargeValue: number;
  isTaxInclusive: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  loanRuleId: string;
  tenureId: string;
  taxValueType: FeeValueType; // assuming only these two
};

export type Tenure = {
  id: string;
  loanRuleId: string;
  minTermDays: number;
  maxTermDays: number; // New field added
  minPostActiveTermDays: number;
  allowPrepayment: boolean;
  gracePeriod: number; // in days
  isActive: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  loan_type: LoanTypeEnum; // you can expand this list
};

export interface LoanChargeTax {
  id: string; // UUID
  loanChargeConfigId: string; // UUID, references the parent LoanChargeConfig
  type: TaxType; // Could be a union type if other tax types exist, e.g., 'GST' | 'VAT' | 'SALES_TAX'
  chargeValue: number; // The percentage value of the tax
  isInclusive: boolean;
  createdAt: string; // ISO 8601 Date string
  updatedAt: string; // ISO 8601 Date string
  valueType: FeeValueType; // Could be 'percentage' | 'fixed'
}

export interface LoanChargeConfig {
  id: string; // UUID
  loanRuleId: string; // UUID, likely references a specific loan rule
  tenureId: string; // UUID, likely references a specific loan tenure
  type: FeeType; // Union type for different charge types
  valueType: FeeValueType; // Could be 'percentage' | 'fixed'
  chargeValue: number; // The value of the charge (e.g., 15 for 15%, 0.75 for 0.75%)
  isActive: boolean;
  createdAt: string; // ISO 8601 Date string
  updatedAt: string; // ISO 8601 Date string
  isRecurringDaily: boolean; // Indicates if the charge is applied daily
  chargeMode: ChargeMode; // Defines how the charge is applied (e.g., inclusive of loan amount, exclusive of loan amount)
}

// Evaluation Interfaces
export interface EvaluationItem {
  id: string;
  evaluationId: string;
  parameter: string;
  requiredValue: string;
  actualValue: string;
  status: "ELIGIBLE" | "NOT_ELIGIBLE";
  source: string;
  createdAt: string;
  updatedAt: string;

  override: string; // for any additional data
  comments: string; // for any comments₹
}

export interface Evaluation {
  id: string;
  loanId: string;
  evaluatedAt: string;
  createdAt: string;
  updatedAt: string;
  evaluation_item: EvaluationItem[];
}

// Loan Interface
// Update your Loan interface to properly type razorpayAuthorization

export interface RazorpayAuthorization {
  id: string;
  userId: string;
  loanId: string;
  customerId: string;
  orderId: string;
  paymentId?: string | null;
  tokenId?: string | null;
  vpa?: string | null;
  authorizationAmount: number;
  maxAmount: number;
  expireAt: string;
  authType: string;
  status: string;
  mandateStatus:
  | "CREATED"
  | "ACTIVE"
  | "AUTHORIZED"
  | "EXPIRED"
  | "CANCELLED"
  | "DELETED"
  | "REVOKED";
  createdAt: string;
  updatedAt: string;
}

export interface Loan {
  id: string;
  formattedLoanId: string;
  userId: string;
  brandId: string;
  amount: number;
  purpose: string;
  loanType: string; // Added loan type field (LOAN-1, LOAN-2, etc.)
  is_repeat_loan: boolean;
  status: LoanStatusEnum;
  isMigratedloan: boolean;
  is_workflow_automated: boolean;
  applicationDate: string;
  ruleType: LoanRiskCategory;
  approvalDate: string | null;
  disbursementDate: string | null;
  closureDate: string | null;
  createdAt: string;
  updatedAt: string;
  xlsxCount?: number;
  noDuesCertificate?: string | null;
  repayment?: Repayment;
  costSummary?: CostSummary;
  earlyRepayment?: EarlyRepayment;
  penalties?: Penalties[];
  disbursement?: Disbursement;
  loanDetails?: LoanDetails;
  agreement: LoanAgreement;
  evaluations?: Evaluation[];
  paymentAuthorizationStatus:
  | "NOT_STARTED"
  | "ELIGIBLE"
  | "PENDING"
  | "AUTHORIZED"
  | "FAILED"
  | "EXPIRED";
  canAuthorizePayment: boolean;
  is_skip_evaluation_approval: boolean;
  is_cam_calculation_required: boolean;
  user: {
    id: string;
    email: string;
    phoneNumber: string;
    userDetails: {
      userBlockAlert: string | null;
      firstName: string;
      middleName: string;
      lastName: string;
    };
    employment: {
      salary: number;
    };
    alternatePhoneNumbers?: AlternatePhoneNumber[];
    userStatus: {
      accountStatus: string;
      user_status_brand_reasons?: {
        id: string;
        brand_status_reasons: {
          id: string;
          reason: string;
          status: "APPROVED" | "REJECTED";
        };
      }[];
    };
    documents: {
      type: DocumentTypeEnum;
      documentNumber: string;
    }[];
    bankAccounts?: {
      id: string;
      accountNumber: string;
      ifsc: string;
      bankName: string;
      isPrimary: boolean;
    }[];
    status_id: BigInt | null;
    occupation_type_id: BigInt | null;
    is_terms_accepted: boolean;
    user_status_brand_reasons?: {
      id: string;
      brand_status_reasons: {
        id: string;
        reason: string;
        status: "APPROVED" | "REJECTED";
      };
    }[];
  };
  oldLoanId: string | null;
  paymentRequests: PaymentRequest[];
  xlsxFiles: LoansXlsx[];
  loanStatusHistory: LoanStatusHistory[];
  allottedPartners: {
    id: string;
    loanId: string;
    partnerUserId: string;
    allottedAt: string;
    amount: number;
    partnerUser: {
      id: string;
      email: string;
      name: string;
      reportsToId: string | null;
    };
  }[];
  loan_collection_allocated_partner?: {
    id: string;
    loanId: string;
    partnerUserId: string;
    allocatedAt: string;
    deallocatedAt: string | null;
    isActive: boolean;
    remarks: string | null;
    partnerUser: {
      id: string;
      email: string;
      name: string;
      reportsToId: string | null;
    };
  }[];
  forceBsaReportByPass: boolean;
  forceCreditReportByPass: boolean;
  had_overdue_penalties?: boolean;
  totalPenalty?: number;

  // 🌟 UPDATED: Use camelCase and proper typing
  // Backend returns an array even though we use take: 1
  razorpayAuthorization?: RazorpayAuthorization[];

  razorpay_recurring_payment?: {
    id: string;
    authorizationId: string;
    orderId?: string;
    paymentId?: string;
    amount: number;
    dueDate: string;
    paymentAfter?: string;
    description?: string;
    status: string;
    failureReason?: string;
    attemptedAt?: string;
    capturedAt?: string;
    retryCount: number;
    createdAt: string;
    updatedAt: string;
  }[];
  fieldVisits?: {
    id: string;
    loanId: string;
    requireFieldVisit: boolean;
    createdAt: string;
    updatedAt: string;
  }[];
}

export interface LoanStatusHistory {
  id: string;
  loanId: string;
  status: LoanStatusEnum;
  message: string;
  createdAt: string;
  partnerUser: PartnerUser;
  loan_status_brand_reasons?: {
    id: string;
    brandStatusReason: {
      id: string;
      reason: string;
      status: "APPROVED" | "REJECTED";
    };
  }[];
}
export interface Penalties {
  id: string;
  chargeValue: number;
  taxChargeValue: number;
  isTaxInclusive: boolean;
  loanId: string;
  taxValueType: FeeValueType;
  valueType: FeeValueType;
  type: PenaltyType;
  taxType: string;
}

export interface Repayment {
  id: string;
  totalObligation: number;
  totalFees: number;
  loanId: string;
  feeBreakdowns: FeeBreakdown[];
}

export interface FeeBreakdown {
  id: string;
  type: FeeType;
  calculationValueType: FeeValueType;
  calculationBaseAmount: number;
  calculationTaxAmount: number;
  chargeMode: ChargeMode;
  total: number;
  repaymentId: string;
  chargeValue: number;
  isRecurringDaily: boolean;
  taxes: FeeTax[];
}

export interface FeeTax {
  id: string;
  type: FeeType; // e.g., "GST", "CESS", "CUSTOM"
  chargeValue: number;
  amount: number;
  isInclusive: boolean;
  feeBreakdownId: string;
  valueType: FeeValueType;
}

export interface CostSummary {
  id: string;
  totalTaxes: number;
  effectiveAPR: number;
  loanId: string;
}

export interface EarlyRepayment {
  id: string;
  totalAmount: number;
  loanId: string;
}

export interface Disbursement {
  id: string;
  grossAmount: number;
  totalDeductions: number;
  netAmount: number;
  loanId: string;
  deductions: Deduction[];
}

export interface Deduction {
  id: string;
  type: FeeType; // e.g., "interest", "documentation"
  calculationValueType: FeeValueType;
  calculationBaseAmount: number;
  calculationTaxAmount: number;
  chargeMode: ChargeMode;
  total: number;
  disbursementId: string;
  chargeValue: number;
  isRecurringDaily: boolean;
  taxes: DeductionTax[];
}

export interface DeductionTax {
  id: string;
  type: TaxType; // e.g., "CESS", "CUSTOM"
  chargeValue: number;
  amount: number;
  isInclusive: boolean;
  deductionId: string;
  valueType: FeeValueType;
}

export interface LoanDetails {
  id: string;
  type: LoanTypeEnum; // add other loan types as needed
  durationDays: number;
  dueDate: string;
  postActiveDate: string | null; // ISO date string, can be null
  loanId: string;
}

// LoanRules Interface
export interface LoanRules {
  id: string;
  ruleType: LoanRiskCategory;
  minAmount: number;
  maxAmount: number;
  tenures: {
    id: string;
    duration: number;
    unit: TenureUnit;
    description: string;
  };
  isAllowed: boolean;
  loan: Loan | null;
}

export interface LoanRepaymentCalculationResponse {
  loanId: string;
  userId: string;
  principalAmount: string;
  applicationDate: string; // ISO string
  dueDate: string; // ISO string
  repaymentDate: string; // ISO string
  totalDays: number;
  daysBeforeDue: number;
  daysAfterDue: number;
  isOverdue: boolean;
  feeBreakdowns: RepaymentFeeBreakdown[];
  penaltyBreakdown: PenaltyBreakdown[];
  totals: Totals;
  totalRepayment: string;
}

export interface RepaymentFeeBreakdown {
  type: string;
  chargeMode: "EXCLUSIVE" | "INCLUSIVE";
  valueType: "percentage" | "fixed";
  chargeValue: string;
  isRecurringDaily: boolean;
  calculatedFeeAmount: string;
  totalTaxes: string;
  totalAmount: string;
  taxes: RepaymentFeeTax[];
  calculation: FeeCalculation;
}

export interface RepaymentFeeTax {
  type: string; // e.g., GST, TDS
  chargeValue: number; // tax rate in percentage
  taxAmount: string;
  isInclusive: boolean;
  valueType: "percentage" | "fixed";
}

export interface PenaltyBreakdown {
  penaltyId: string;
  penaltyType: "SIMPLE" | "COMPOUND"; // assuming "SIMPLE" for now
  penaltyValueType: "percentage" | "fixed";
  penaltyRate: string;
  penaltyCalculation: PenaltyCalculation;
  tax: PenaltyTax;
  summary: PenaltySummary;
  breakdown: PenaltyBreakdownDetails;
}

export interface PenaltyCalculation {
  baseAmount: string;
  overdueDays: number;
  penaltyInterest: string;
  method: "SIMPLE_INTEREST" | "FIXED_DAILY";
  formula: string;
  calculation: string;
  stepByStep: string[];
}

export interface PenaltyTax {
  taxType: string;
  taxValueType: "percentage" | "fixed";
  taxRate: string;
  taxAmount: string;
  isTaxInclusive: boolean;
  taxCalculation: TaxCalculation;
}

export interface TaxCalculation {
  method: string;
  formula: string;
  calculation: string;
  stepByStep: string[];
}

export interface PenaltySummary {
  penaltyAmount: string;
  taxAmount: string;
  totalPenaltyAmount: string;
  description: string;
}

export interface PenaltyBreakdownDetails {
  isOverdue: boolean;
  daysOverdue: number;
  dailyPenaltyRate: string;
  penaltyMethod: string;
  taxMethod: string;
}

export interface Totals {
  principalAmount: string;
  totalFees: string;
  totalTaxes: string;
  totalPenalties: string;
}

export interface FeeCalculation {
  principalAmount: string;
  rateApplied: string;
  daysApplied: number;
  formula: string;
}
