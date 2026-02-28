import {
  ApprovalStatusEnum,
  ChargeMode,
  FeeType,
  FeeValueType,
  LoanRiskCategory,
  LoanStatusEnum,
  LoanTypeEnum,
  PenaltyType,
  TaxType,
  TransactionStatusEnum,
  TransactionTypeEnum,
} from "../constant/enum";

// Loan Interface
export interface Loan {
  id: string;
  formattedLoanId: string;
  userId: string;
  brandId: string;
  amount: number;
  purpose: string;
  status: LoanStatusEnum;
  applicationDate: string;
  approvalDate: string | null;
  disbursementDate: string | null;
  agreement:{
  id: string;
    status: string  ;
  }
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
  paymentRequests: PaymentRequest[];
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
  penaltyDiscount: number; // assuming this is a percentage or fixed amount
  excessAmount: number;
  receipt: PaymentTransactionReceipt[]; // assuming this is optional
  roundOffDiscount: number;
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
}

export interface PaymentPartialCollectionTransaction {
  id: string;
  paymentRequestId: string;
  provider: string;
  status: TransactionStatusEnum;
  opsApprovalStatus: ApprovalStatusEnum;
  amount: number;
  totalFees: number;
  totalTaxes: number;
  totalPenalties: number;
  principalAmount: number;
  currency: string;
  externalRef: string;
  retryCount: number;
  failureReason: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  externalUrl: string;
  receiptId: string;
  method: string;
  note: string | null;
  penaltyDiscount: number;
  roundOffDiscount: number;
  excessAmount: number;
  receipt: PaymentTransactionReceipt[];
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
  type: TaxType;
  chargeValue: number;
  amount: number;
  isInclusive: boolean;
  deductionId: string;
  valueType: FeeValueType;
}

export interface LoanDetails {
  id: string;
  type: LoanTypeEnum;
  durationDays: number;
  dueDate: string;
  loanId: string;
}
export enum LoanDecisionType {
  HARD_STOP = "HARD_STOP",
  HIGH_DPD = "HIGH_DPD",
  AUTOMATED_FLOW = "AUTOMATED_FLOW",
  MANUAL_REVIEW_REQUIRED = "MANUAL_REVIEW_REQUIRED",
  AMOUNT_INCREASE = "AMOUNT_INCREASE",
}
// LESS_90_DAYS,MORE_90_DAYS
export type ReloanBucket = "LESS_90_DAYS" | "MORE_90_DAYS";

export enum ReloanBucketEnum {
  LESS_90_DAYS = "LESS_90_DAYS",
  MORE_90_DAYS = "MORE_90_DAYS",
}
export interface ReloanEligibilityContext {
  userId: string;
  brandId: string;
  previousLoanId: string;
  previousDisbursementDate: Date;
  previousDueDate: Date;
  previousClosureDate: Date;
  previousClosureStatus: "NORMAL" | "WRITE_OFF" | "SETTLEMENT"; // closingTypeEnum;
  previousLoanStatus: LoanStatusEnum;
  previousLoanAmount: number;
  currentLoanAmount: number;
  aa_availability: boolean;
  is_migrated_loan: boolean;
}

export interface ReloanEligibilityResult {
  eligible: boolean;
  reasons: string[];
  bucket: ReloanBucketEnum;
  flags: LoanDecisionType[];
  requiresManualReview: boolean;
  step: LoanStatusEnum;
}

export interface ReloanEvaluationDto {
  userId: string;
  previousLoanId: string;
  brandId: string;
  reason?: string;
}

// LoanRules Interface
export interface ILoanCredibility {
  id: string;
  ruleType: LoanRiskCategory;
  minAmount: number;
  maxAmount: number;
  suggestedAmount: number;
  suggestedDueDate: Date | null;
  tenures: {
    id: string;
    minTermDays: number;
    maxTermDays: number;
  };
  isAllowed: boolean;
  loan: Loan | null;
  workflowUrl: string | null;
  agreement: {
  id: string;
    status: string  ;
  };
  maxCompleteLoanCount: number;
  reloanAutomationResult: ReloanEligibilityResult | null;
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
