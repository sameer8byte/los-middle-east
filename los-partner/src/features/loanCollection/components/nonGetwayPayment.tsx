import { useEffect, useState, useRef } from "react";
import Dialog from "../../../common/dialog";
import dayjs from "dayjs";

import {
  BrandProviderName,
  BrandProviderType,
  LoanStatusEnum,
  PaymentMethodEnum,
} from "../../../constant/enum";
import { useNavigate, useParams } from "react-router-dom";

import { formatDate, formatDateWithTime } from "../../../lib/utils";
import { toast } from "react-toastify";
import { Button } from "../../../common/ui/button";
import { BiRepeat } from "react-icons/bi";
import { FaLock } from "react-icons/fa";
import {
  postCurrentPartialRepayment,
  getLoanDetails,
  postCurrentRepayment,
} from "../../../shared/services/api/loan.api";
import {
  manualPayment,
  manualPartialPayment,
  getPaymentRequestByLoanId,
  createRazorpayRecurringPayment,
} from "../../../shared/services/api/payment.api";
import { Loan, PaymentRequest } from "../../../shared/types/loan";
import { TodayCalculations } from "./todayCalculations";
import { PaymentTransactionsSummary } from "./PaymentTransactionsSummary";
import { useAppSelector } from "../../../shared/redux/store";
import { selectProvidersByType } from "../../../shared/redux/slices/brand.slice";
import { PartnerUserRoleEnum } from "../../../constant/enum";
import { getBrandBankAccounts } from "../../../shared/services/api/settings/brandBankAccount.setting.api";

export interface LoanRepaymentCalculationResponse {
  loanId: string;
  userId: string;
  principalAmount: string;
  applicationDate: string;
  dueDate: string;
  repaymentDate: string;
  totalDays: number;
  daysBeforeDue: number;
  daysAfterDue: number;
  isOverdue: boolean;
  feeBreakdowns: RepaymentFeeBreakdown[];
  penaltyBreakdown: PenaltyBreakdown[];
  totals: Totals;
  totalRepayment: string;
}

export interface PartialRepaymentCalculationResponse {
  amount: number;
  totalFees: number;
  principalAmount: number;
  totalPenalties: number;
  discountSummary: {
    roundOffDiscount: {
      interest: number;
      principal: number;
      total: number;
    };
    penalty: number;
  };
  totalDays: number;
  daysBeforeDue: number;
  daysAfterDue: number;
  isOverdue: boolean;
  paymentDetails: {
    totalAmountDueAtPayment: number;
    interestDueAtPayment: number;
    principalDueAtPayment: number;
    penaltyDueAtPayment: number;
    remainingDueAfterPayment: number;
    interestDueAfterPayment: number;
    principalDueAfterPayment: number;
    penaltyDueAfterPayment: number;
  };
  isPrincipalAmountOverridden: boolean;
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

interface FormData {
  method: PaymentMethodEnum | null;
  isReloanApplicable?: boolean; // Optional field for reloan
  reloanRemark?: string; // Optional field for reloan remark
  paymentReference: string;
  paymentNote: string;
  paymentDate?: string;
  selectedPaymentRequestId?: string;
  isPaymentCompleted?: boolean; // New field for partial payment completion status
  brandBankAccountId?: string; // Bank account for manual payments
  amount: {
    penalty: number;
    interest: number;
    principal: number;
    discount: number;
    penalty_discount: number;
    interest_discount: number;
    total: number;
  };
}

export enum TabType {
  PAYMENT = "payment",
  SUMMARY = "summary",
}
const max_intrest_discount = 1000;
export function NonGetwayPayment({
  refresh,
  setRefresh,
  nonGetwayPaymentLoanId,
  nonGetwayPaymentUserId,
  setNonGetwayPaymentLoanId,
  setNonGetwayPaymentUserId,
}: {
  refresh: boolean;
  setRefresh: (value: boolean) => void;
  nonGetwayPaymentLoanId: string | null;
  nonGetwayPaymentUserId: string | null;
  setNonGetwayPaymentLoanId: (value: string | null) => void;
  setNonGetwayPaymentUserId: (value: string | null) => void;
}) {
  const apiFullPaymentProviders = useAppSelector((state) =>
    selectProvidersByType(state, BrandProviderType.FULL_PAYMENT),
  );
  const apiPartPaymentProviders = useAppSelector((state) =>
    selectProvidersByType(state, BrandProviderType.PART_PAYMENT),
  );
  const userRole = useAppSelector((state) => state.auth.data.role);
  const [activeTab, setActiveTab] = useState<TabType>(TabType.PAYMENT);
  const navigate = useNavigate();

  const { brandId } = useParams<"brandId">();
  const [paymentType, setPaymentType] = useState<
    "FULL_PAYMENT" | "PARTIAL_PAYMENT" | null
  >("FULL_PAYMENT");
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [selectedPaymentRequest, setSelectedPaymentRequest] =
    useState<PaymentRequest | null>(null);
  const [formData, setFormData] = useState<FormData>({
    method: null,
    paymentReference: "",
    paymentNote: "",
    isReloanApplicable: false,
    paymentDate: dayjs().format("YYYY-MM-DD"),
    selectedPaymentRequestId: "",
    isPaymentCompleted: false, // Default to false
    amount: {
      penalty: 0,
      interest_discount: 0,
      penalty_discount: 0,
      interest: 0,
      principal: 0,
      discount: 0,
      total: 0,
    },
  });
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentRequestsLoading, setPaymentRequestsLoading] = useState(false);
  const [loanDetailsLoading, setLoanDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [paymentSummary, setPaymentSummary] =
    useState<LoanRepaymentCalculationResponse | null>(null);
  const [partialPaymentSummary, setPartialPaymentSummary] =
    useState<PartialRepaymentCalculationResponse | null>(null);
  const [initialPartialPaymentSummary, setInitialPartialPaymentSummary] =
    useState<PartialRepaymentCalculationResponse | null>(null);
  const [paymentSummaryLoading, setPaymentSummaryLoading] = useState(false);
  const [loanDetails, setLoanDetails] = useState<Loan | null>(null);
  const [partialPaymentAmount, setPartialPaymentAmount] = useState<number>(0);
  const [isAmountApplied, setIsAmountApplied] = useState(false);
  const [isPartialPaymentLocked, setIsPartialPaymentLocked] = useState(false);
  const [excessAmount, setExcessAmount] = useState<number>(0);
  const [isExcessAmountApplied, setIsExcessAmountApplied] = useState(false);
  const [excessAmountError, setExcessAmountError] = useState<string | null>(
    null,
  );
  const [isPaymentDropdownOpen, setIsPaymentDropdownOpen] = useState(false);
  const [brandBankAccounts, setBrandBankAccounts] = useState<any[]>([]);
  const [bankAccountsLoading, setBankAccountsLoading] = useState(false);
  const [paymentResponse, setPaymentResponse] = useState<any>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Add ref for dropdown click outside detection
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check if Razorpay Autopay is selected
  const isRazorpayAutopay =
    formData.method === PaymentMethodEnum.RAZORPAY_AUTOPAY;

  // Add useEffect to handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsPaymentDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleApplyExcessAmount = () => {
    if (excessAmount > 0) {
      setIsExcessAmountApplied(true);
      setExcessAmountError(null);
    } else {
      setExcessAmountError("Please enter a valid excess amount.");
    }
  };

  const handleCancelExcessAmount = () => {
    setIsExcessAmountApplied(false);
    setExcessAmount(0);
    setExcessAmountError(null);
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    // For Razorpay Autopay and other gateway payments, we don't need to validate the usual fields
    const isGatewayPayment =
      formData.method === PaymentMethodEnum.PAYTERNING ||
      formData.method === PaymentMethodEnum.RAZORPAY ||
      formData.method === PaymentMethodEnum.CASHFREE;

    // Validate payment method selection
    if (!formData.method) {
      errors.method = "Payment method is required";
    }

    if (!isRazorpayAutopay && !isGatewayPayment) {
      // Only validate these fields for MANUAL payments
      if (!formData.paymentReference.trim()) {
        errors.paymentReference = "Payment reference is required";
      }
    }

    if (!isRazorpayAutopay && formData.method && !formData.paymentNote.trim()) {
      errors.paymentNote = "Payment notes are required";
    }

    if (formData.amount.total <= 0) {
      errors.amount = "Total amount must be greater than 0";
    }

    // Validate brand bank account for manual payments
    if (
      formData.method === PaymentMethodEnum.MANUAL &&
      !formData.brandBankAccountId
    ) {
      errors.brandBankAccountId =
        "Brand Bank Account is required for manual payments";
    }

    // Validate reloan remark if reloan notification is enabled (applies to all payment types)
    if (formData.isReloanApplicable && !formData.reloanRemark?.trim()) {
      errors.reloanRemark =
        "Reloan remark is required when Add Reloan Notification is enabled";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;

    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }

    // Handle payment request selection
    if (name === "selectedPaymentRequestId") {
      const selectedRequest = paymentRequests.find((req) => req.id === value);
      setSelectedPaymentRequest(selectedRequest || null);
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAmountChange = (
    field: keyof FormData["amount"],
    value: string,
  ) => {
    const numValue = parseFloat(value) || 0;
    setFormData((prev) => {
      const newAmount = { ...prev.amount, [field]: numValue };

      // Validate discount field
      if (field === "discount") {
        // Only allow discount if there are penalties
        if (newAmount.penalty <= 0) {
          // Reset discount to 0 if no penalties
          newAmount.discount = 0;
          setFieldErrors((prevErrors) => ({
            ...prevErrors,
            discount: "Discount is only available when there are penalties",
          }));
        } else if (numValue > newAmount.penalty) {
          // Don't allow discount to exceed penalty amount
          newAmount.discount = newAmount.penalty;
          setFieldErrors((prevErrors) => ({
            ...prevErrors,
            discount: "Discount cannot exceed the penalty amount",
          }));
        } else {
          // Clear discount error if validation passes
          setFieldErrors((prevErrors) => {
            const { discount, ...rest } = prevErrors;
            return rest;
          });
        }
      }

      if (field === "penalty_discount") {
        // Only allow discount if there are penalties
        if (newAmount.penalty <= 0) {
          // Reset discount to 0 if no penalties
          newAmount.penalty_discount = 0;
          setFieldErrors((prevErrors) => ({
            ...prevErrors,
            penalty_discount:
              "Penalty Discount is only available when there are penalties",
          }));
        } else if (numValue > newAmount.penalty) {
          // Don't allow discount to exceed penalty amount
          newAmount.penalty_discount = newAmount.penalty;
          setFieldErrors((prevErrors) => ({
            ...prevErrors,
            penalty_discount:
              "Penalty Discount cannot exceed the penalty amount",
          }));
        } else {
          // Clear discount error if validation passes
          setFieldErrors((prevErrors) => {
            const { penalty_discount, ...rest } = prevErrors;
            return rest;
          });
        }
      }

      // intrest discount
      if (field === "interest_discount") {
        const maxDiscountAmount = Math.min(
          newAmount.interest,
          max_intrest_discount,
        );
        // Only allow discount if there are penalties
        if (maxDiscountAmount <= 0) {
          // Reset discount to 0 if no penalties
          newAmount.interest_discount = 0;

          setFieldErrors((prevErrors) => ({
            ...prevErrors,
            interest_discount:
              "Intrest Discount is only available when there are penalties",
          }));
        } else if (numValue > maxDiscountAmount) {
          // Don't allow discount to exceed penalty amount
          newAmount.interest_discount = maxDiscountAmount;
          setFieldErrors((prevErrors) => ({
            ...prevErrors,
            interest_discount: `Intrest Discount cannot exceed the penalty amount or ${
              max_intrest_discount
            } of interest`,
          }));
        } else {
          // Clear discount error if validation passes
          setFieldErrors((prevErrors) => {
            const { interest_discount, ...rest } = prevErrors;
            return rest;
          });
        }
      }

      // If penalty is being changed, validate existing discount
      if (field === "penalty") {
        if (newAmount.discount > numValue) {
          newAmount.discount = numValue; // Reduce discount to match penalty
          if (numValue <= 0) {
            newAmount.discount = 0;
          }
        }
        // Clear discount error when penalty changes
        setFieldErrors((prevErrors) => {
          const { discount, ...rest } = prevErrors;
          return rest;
        });
      }

      // Always auto-calculate total
      const total =
        newAmount.penalty +
        newAmount.interest +
        newAmount.principal -
        newAmount.discount -
        newAmount.interest_discount -
        newAmount.penalty_discount;
      newAmount.total = total;

      return { ...prev, amount: newAmount };
    });

    // Clear amount error when user changes values
    if (fieldErrors.amount) {
      setFieldErrors((prev) => ({ ...prev, amount: "" }));
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleFileValidation = (selectedFiles: File[]) => {
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const maxSize = 5 * 1024 * 1024; // 5MB

    const validFiles: File[] = [];
    for (const file of selectedFiles) {
      if (!allowedTypes.includes(file.type)) {
        setError(
          "Some files are invalid (only PDF, JPG, PNG, DOC, DOCX allowed)",
        );
        return;
      }
      if (file.size > maxSize) {
        setError("Each file must be less than 5MB");
        return;
      }
      validFiles.push(file);
    }

    setError(null);
    setFiles((prev) => [...prev, ...validFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileValidation(Array.from(e.dataTransfer.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nonGetwayPaymentLoanId || !nonGetwayPaymentUserId) {
      setError("Loan ID and User ID are required");
      return;
    }

    if (!validateForm()) {
      setError("Please correct the errors below");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isRazorpayAutopay) {
        // Handle Razorpay Autopay (existing code)
        const paymentData = {
          userId: nonGetwayPaymentUserId,
          loanId: nonGetwayPaymentLoanId,
          dueDate:
            loanDetails?.loanDetails?.dueDate || new Date().toISOString(),
          description: `Loan repayment for ${
            loanDetails?.formattedLoanId || nonGetwayPaymentLoanId
          }`,
        };

        const response = await createRazorpayRecurringPayment(paymentData);

        if (response) {
          setSuccess(true);
          setRefresh(!refresh);
          toast.success("Razorpay Autopay payment initiated successfully!");
        }
      } else {
        // Handle ALL payment methods (Manual, Paytring, Razorpay, Cashfree)
        // This is the existing logic - Cashfree will automatically work with it
        if (formData.method !== PaymentMethodEnum.MANUAL) {
          formData.paymentReference = "-";
        }

        const formDataToSend = new FormData();

        formDataToSend.append("loanId", nonGetwayPaymentLoanId);
        formDataToSend.append("method", formData.method?.toString() || "");
        formDataToSend.append("paymentReference", formData.paymentReference);
        if (formData.brandBankAccountId) {
          formDataToSend.append(
            "brandBankAccountId",
            formData.brandBankAccountId,
          );
        }
        formDataToSend.append(
          "isReloanApplicable",
          formData.isReloanApplicable ? "true" : "false",
        );
        formDataToSend.append("reloanRemark", formData.reloanRemark || "");
        formDataToSend.append(
          "isPaymentComplete",
          paymentType === "FULL_PAYMENT"
            ? "true"
            : String(formData.isPaymentCompleted),
        );

        formDataToSend.append(
          "amount",
          JSON.stringify({
            penalty:
              Number(formData.amount.penalty) -
              Number(formData.amount.penalty_discount),
            interest:
              Number(formData.amount.interest) -
              Number(formData.amount.interest_discount),
            principal: formData.amount.principal,
            discount: formData.amount.discount,
            penalty_discount: formData.amount.penalty_discount,
            interest_discount: formData.amount.interest_discount,
            total: formData.amount.total,
          }),
        );
        formDataToSend.append(
          "status",
          paymentType === "FULL_PAYMENT"
            ? LoanStatusEnum.PAID
            : LoanStatusEnum.PARTIALLY_PAID,
        );

        if (paymentType === "PARTIAL_PAYMENT") {
          formDataToSend.append(
            "paymentRequestStatus",
            formData.isPaymentCompleted ? "SUCCESS" : "PENDING",
          );
        } else {
          formDataToSend.append("paymentRequestStatus", "SUCCESS");
        }

        if (formData.paymentDate) {
          formDataToSend.append("paymentDate", formData.paymentDate);
        }

        if (formData.paymentNote) {
          formDataToSend.append("paymentNote", formData.paymentNote);
        }
        if (paymentType === "PARTIAL_PAYMENT") {
          if (
            isAmountApplied &&
            formData.isPaymentCompleted &&
            partialPaymentAmount ===
              initialPartialPaymentSummary?.paymentDetails
                ?.totalAmountDueAtPayment
          )
            formDataToSend.append("excessAmount", excessAmount.toString());
          else formDataToSend.append("excessAmount", "0");
        }

        if (paymentType === "FULL_PAYMENT") {
          if (formData.amount.total === Number(paymentSummary?.totalRepayment))
            formDataToSend.append("excessAmount", excessAmount.toString());
          else formDataToSend.append("excessAmount", "0");
        }

        files.forEach((file) => {
          formDataToSend.append("files", file);
        });

        const response =
          paymentType === "FULL_PAYMENT"
            ? await manualPayment(formDataToSend)
            : await manualPartialPayment(formDataToSend);

        if (response) {
          setSuccess(true);
          setPaymentResponse(response);
          setRefresh(!refresh);
          toast.success("Payment processed successfully!");
        }
      }
    } catch (error) {
      setError((error as Error)?.message || "Failed to process payment");
      toast.error((error as Error)?.message || "Failed to process payment");
    } finally {
      setLoading(false);
    }
  };
  const resetForm = () => {
    handleCancelExcessAmount();
    setFormData({
      method: null,
      paymentReference: "",
      paymentNote: "",
      paymentDate: dayjs().format("YYYY-MM-DD"),
      selectedPaymentRequestId: "",
      isPaymentCompleted: false, // Reset to false
      amount: {
        penalty: 0,
        interest: 0,
        penalty_discount: 0,
        interest_discount: 0,
        principal: 0,
        discount: 0,
        total: 0,
      },
    });
    setFiles([]);
    setFieldErrors({});
    setSelectedPaymentRequest(null);
    setPartialPaymentAmount(0);
    setIsAmountApplied(false);
    setIsPartialPaymentLocked(false);
    setPaymentResponse(null);
    setCopiedField(null);
  };

  const handleCopyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleClose = () => {
    setNonGetwayPaymentLoanId(null);
    setNonGetwayPaymentUserId(null);
    setError(null);
    handleCancelExcessAmount();
    setSuccess(false);
    resetForm();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      handleFileValidation(Array.from(selectedFiles));
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (files.length === 1) {
      setDragActive(false);
    }
  };

  const handleApplyAmount = async () => {
    if (
      !nonGetwayPaymentUserId ||
      !brandId ||
      !nonGetwayPaymentLoanId ||
      !formData.paymentDate ||
      partialPaymentAmount <= 0
    ) {
      return;
    }
    try {
      setPaymentSummaryLoading(true);
      const response = await postCurrentPartialRepayment(
        nonGetwayPaymentUserId,
        nonGetwayPaymentLoanId,
        partialPaymentAmount,
        formData.paymentDate || dayjs().format("YYYY-MM-DD"),
        formData?.isPaymentCompleted || false,
      );

      if (response) {
        if (response?.paymentDetails.remainingDueAfterPayment < 0) {
          setFieldErrors((prev) => ({
            ...prev,
            amount: `Partial payment amount and discount exceeds remaining due. Please adjust the amount. make sure the total amount is less than or equal to total due amount `,
          }));
          return;
        }
        setFieldErrors((prev) => ({
          ...prev,
          amount: "",
        }));

        setPartialPaymentSummary(response);
        setFormData((prev) => ({
          ...prev,
          amount: {
            penalty: response.totalPenalties,
            interest: response.totalFees,
            principal: response.principalAmount,
            discount: response.discountSummary?.penalty || 0,
            penalty_discount: response.discountSummary?.penalty || 0,
            interest_discount: response.roundOffDiscount?.total || 0,
            total: partialPaymentAmount,
          },
        }));
        setIsAmountApplied(true);
        setIsPartialPaymentLocked(true);
      }
    } catch (error) {
      setError(
        (error as Error)?.message || "Failed to calculate payment breakdown",
      );
      toast.error(
        (error as Error)?.message || "Failed to calculate payment breakdown",
      );
    } finally {
      setPaymentSummaryLoading(false);
    }
  };

  const handelWriteOffOpen = async () => {
    setPaymentType(null);

    const searchParams = new URLSearchParams(location.search);
    searchParams.delete("nonGetwayPaymentLoanId");
    searchParams.delete("nonGetwayPaymentUserId");
    searchParams.set("writeOffLoanId", nonGetwayPaymentLoanId || "");

    navigate(
      { pathname: location.pathname, search: searchParams.toString() },
      { replace: true },
    );
  };

  const handelSettlementOpen = async () => {
    setPaymentType(null);
    const searchParams = new URLSearchParams(location.search);
    searchParams.delete("nonGetwayPaymentLoanId");
    searchParams.delete("nonGetwayPaymentUserId");
    searchParams.set("settlementLoanId", nonGetwayPaymentLoanId || "");
    navigate(
      { pathname: location.pathname, search: searchParams.toString() },
      { replace: true },
    );
  };

  // API calls with proper loading states
  useEffect(() => {
    const fetchPaymentRequests = async () => {
      if (!nonGetwayPaymentLoanId) return;
      try {
        setPaymentRequestsLoading(true);
        setError(null);
        const response = await getPaymentRequestByLoanId(
          nonGetwayPaymentLoanId,
        );

        setPaymentRequests(response || []);
      } catch (error) {
        setError(
          (error as Error)?.message || "Failed to fetch payment requests",
        );
      } finally {
        setPaymentRequestsLoading(false);
      }
    };

    fetchPaymentRequests();
  }, [nonGetwayPaymentLoanId]);

  // check if loanId and brandId are available before fetching loan details
  useEffect(() => {
    const fetchLoanDetails = async () => {
      if (!nonGetwayPaymentLoanId || !brandId) return;

      try {
        setLoanDetailsLoading(true);
        const response = await getLoanDetails(brandId, nonGetwayPaymentLoanId);
        setPaymentType(
          response?.status === LoanStatusEnum.PAID
            ? "FULL_PAYMENT"
            : response?.status === LoanStatusEnum.PARTIALLY_PAID
              ? "PARTIAL_PAYMENT"
              : "FULL_PAYMENT",
        );
        setLoanDetails(response);
      } catch (error) {
        setError("Failed to fetch loan details");
      } finally {
        setLoanDetailsLoading(false);
      }
    };

    fetchLoanDetails();
  }, [nonGetwayPaymentLoanId, brandId]);

  // Fetch brand bank accounts for manual payments
  useEffect(() => {
    const fetchBrandBankAccounts = async () => {
      if (!brandId) return;

      try {
        setBankAccountsLoading(true);
        const response = await getBrandBankAccounts(brandId);

        setBrandBankAccounts(response || []);
      } catch (error) {
        console.error("Error fetching brand bank accounts:", error);
        // Don't set error as this is optional
      } finally {
        setBankAccountsLoading(false);
      }
    };

    fetchBrandBankAccounts();
  }, [brandId]);
  // Fetch payment summary for full payment
  useEffect(() => {
    if (paymentType === "FULL_PAYMENT") {
      const fetchPaymentSummary = async () => {
        if (
          !nonGetwayPaymentUserId ||
          !brandId ||
          !nonGetwayPaymentLoanId ||
          !formData.paymentDate
        ) {
          return;
        }

        try {
          setPaymentSummaryLoading(true);
          const response = await postCurrentRepayment(
            nonGetwayPaymentUserId,
            nonGetwayPaymentLoanId,
            formData.paymentDate || dayjs().format("YYYY-MM-DD"),
          );
          if (response) {
            if (paymentType === "FULL_PAYMENT") {
              setFormData((prev) => ({
                ...prev,
                amount: {
                  ...prev.amount,
                  penalty: response.totals.totalPenalties
                    ? parseFloat(response.totals.totalPenalties)
                    : 0,
                  interest: response.totals.totalFees
                    ? parseFloat(response.totals.totalFees)
                    : 0,
                  principal: response.totals.principalAmount
                    ? parseFloat(response.totals.principalAmount)
                    : 0,
                  discount: 0, // Assuming no discount for manual payments
                },
              }));
              handleAmountChange(
                "total",
                (
                  parseFloat(response.totals.totalFees) +
                  parseFloat(response.totals.principalAmount) +
                  parseFloat(response.totals.totalPenalties)
                ).toFixed(2),
              );
            }
            setPaymentSummary(response);
          }
        } catch (error) {
          console.error("Error fetching payment summary:", error);
          // Don't set error here as it's optional
        } finally {
          setPaymentSummaryLoading(false);
        }
      };

      fetchPaymentSummary();
    }
  }, [
    brandId,
    nonGetwayPaymentUserId,
    nonGetwayPaymentLoanId,
    formData.paymentDate,
  ]);

  // Fetch initial partial payment summary
  useEffect(() => {
    if (paymentType === "PARTIAL_PAYMENT") {
      const fetchInitialPartialPaymentSummary = async () => {
        if (
          !nonGetwayPaymentUserId ||
          !brandId ||
          !nonGetwayPaymentLoanId ||
          !formData.paymentDate
        ) {
          return;
        }

        try {
          setPaymentSummaryLoading(true);
          // Call with amount 0 to get initial details
          const response = await postCurrentPartialRepayment(
            nonGetwayPaymentUserId,
            nonGetwayPaymentLoanId,
            0,
            formData.paymentDate || dayjs().format("YYYY-MM-DD"),
          );
          if (response) {
            setInitialPartialPaymentSummary(response);
          }
        } catch (error) {
          setError(
            (error as Error)?.message ||
              "Failed to calculate payment breakdown",
          );
          toast.error(
            (error as Error)?.message ||
              "Failed to calculate payment breakdown",
          );
        } finally {
          setPaymentSummaryLoading(false);
        }
      };
      fetchInitialPartialPaymentSummary();
    }
  }, [
    brandId,
    nonGetwayPaymentUserId,
    nonGetwayPaymentLoanId,
    formData.paymentDate,
    paymentType,
  ]);

  return (
    <div>
      {!!nonGetwayPaymentLoanId && (
        <Dialog
          isOpen={!!nonGetwayPaymentLoanId}
          onClose={handleClose}
          title="Manual Payment Entry"
          size="xl"
        >
          <div>
            {/* Loading State */}
            {paymentRequestsLoading || loanDetailsLoading ? (
              <div className="flex items-center justify-center gap-2 text-sm text-[var(--color-on-surface)] opacity-70">
                <svg
                  className="w-4 h-4 animate-spin text-[#EA5E18]"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                <span>Loading payment information...</span>
              </div>
            ) : (
              <>
                {/* Success State */}
                {success ? (
                  <div className="py-4">
                    {/* Success Header - Compact */}
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[var(--color-muted)] border-opacity-20">
                      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-100">
                        <svg
                          className="h-5 w-5 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-[var(--color-on-background)]">
                          {isRazorpayAutopay
                            ? "Autopay Initiated"
                            : formData.method !== PaymentMethodEnum.MANUAL
                              ? "Payment Link Generated"
                              : "Payment Processed"}
                        </h3>
                        <p className="text-xs text-[var(--color-on-surface)] opacity-60">
                          {paymentResponse?.receiptId &&
                            `Receipt: ${paymentResponse.receiptId}`}
                        </p>
                      </div>
                      {paymentResponse?.status && (
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            paymentResponse.status === "COMPLETED" ||
                            paymentResponse.status === "SUCCESS"
                              ? "bg-green-100 text-green-700"
                              : paymentResponse.status === "PENDING"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {paymentResponse.status}
                        </span>
                      )}
                    </div>

                    {/* Payment Links - Prominent Section */}
                    {paymentResponse &&
                      (paymentResponse.paymentLink ||
                        paymentResponse.externalUrl) && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-xs font-semibold text-blue-800 mb-2 uppercase tracking-wide">
                            Payment Link
                          </p>
                          <div className="space-y-2">
                            {paymentResponse.paymentLink && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  readOnly
                                  value={paymentResponse.paymentLink}
                                  className="flex-1 text-xs bg-white border border-blue-200 rounded px-2 py-1.5 text-[var(--color-on-background)] truncate"
                                />
                                <button
                                  onClick={() =>
                                    handleCopyToClipboard(
                                      paymentResponse.paymentLink,
                                      "paymentLink",
                                    )
                                  }
                                  className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                                    copiedField === "paymentLink"
                                      ? "bg-green-600 text-white"
                                      : "bg-blue-600 text-white hover:bg-blue-700"
                                  }`}
                                >
                                  {copiedField === "paymentLink"
                                    ? "Copied!"
                                    : "Copy"}
                                </button>
                                <button
                                  onClick={() =>
                                    window.open(
                                      paymentResponse.paymentLink,
                                      "_blank",
                                    )
                                  }
                                  className="px-3 py-1.5 text-xs font-medium rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
                                >
                                  Open
                                </button>
                              </div>
                            )}
                            {paymentResponse.externalUrl &&
                              paymentResponse.externalUrl !==
                                paymentResponse.paymentLink && (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    readOnly
                                    value={paymentResponse.externalUrl}
                                    className="flex-1 text-xs bg-white border border-blue-200 rounded px-2 py-1.5 text-[var(--color-on-background)] truncate"
                                  />
                                  <button
                                    onClick={() =>
                                      handleCopyToClipboard(
                                        paymentResponse.externalUrl,
                                        "externalUrl",
                                      )
                                    }
                                    className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                                      copiedField === "externalUrl"
                                        ? "bg-green-600 text-white"
                                        : "bg-blue-600 text-white hover:bg-blue-700"
                                    }`}
                                  >
                                    {copiedField === "externalUrl"
                                      ? "Copied!"
                                      : "Copy"}
                                  </button>
                                  <button
                                    onClick={() =>
                                      window.open(
                                        paymentResponse.externalUrl,
                                        "_blank",
                                      )
                                    }
                                    className="px-3 py-1.5 text-xs font-medium rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
                                  >
                                    Open
                                  </button>
                                </div>
                              )}
                          </div>
                        </div>
                      )}

                    {/* Main Details Grid - Compact Layout */}
                    <div className="grid grid-cols-3 gap-3 text-sm mb-4">
                      {/* Amount - Highlighted */}
                      <div className="bg-[var(--color-primary)] bg-opacity-10 rounded-lg p-2 text-center">
                        <span className="text-xs text-[var(--color-on-primary)] opacity-60 block">
                          Amount
                        </span>
                        <span className="text-lg font-bold text-[var(--color-on-primary)]">
                          ₹{paymentResponse?.amount || formData.amount.total}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-[var(--color-on-surface)] opacity-60 block">
                          Method
                        </span>
                        <span className="font-medium text-[var(--color-on-background)]">
                          {paymentResponse?.method || formData.method || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-[var(--color-on-surface)] opacity-60 block">
                          Type
                        </span>
                        <span className="font-medium text-[var(--color-on-background)]">
                          {paymentType === "FULL_PAYMENT" ? "Full" : "Partial"}
                        </span>
                      </div>
                    </div>

                    {/* Secondary Details */}
                    <div className="grid grid-cols-3 gap-3 text-xs mb-4 p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="text-[var(--color-on-surface)] opacity-60 block">
                          Loan ID
                        </span>
                        <span className="font-medium">
                          {loanDetails?.formattedLoanId ||
                            nonGetwayPaymentLoanId}
                        </span>
                      </div>
                      {paymentResponse?.externalRef && (
                        <div>
                          <span className="text-[var(--color-on-surface)] opacity-60 block">
                            External Ref
                          </span>
                          <span className="font-medium truncate block">
                            {paymentResponse.externalRef}
                          </span>
                        </div>
                      )}
                      {paymentResponse?.closingType && (
                        <div>
                          <span className="text-[var(--color-on-surface)] opacity-60 block">
                            Closing Type
                          </span>
                          <span className="font-medium">
                            {paymentResponse.closingType}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Payment Breakdown - Compact */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <p className="text-xs font-semibold text-[var(--color-on-background)] opacity-70 mb-2 uppercase tracking-wide">
                        Breakdown
                      </p>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        {(paymentResponse?.principalAmount > 0 ||
                          formData.amount.principal > 0) && (
                          <div className="text-center">
                            <span className="text-[var(--color-on-surface)] opacity-60 block">
                              Principal
                            </span>
                            <span className="font-semibold">
                              ₹
                              {paymentResponse?.principalAmount ||
                                formData.amount.principal}
                            </span>
                          </div>
                        )}
                        {(paymentResponse?.totalFees > 0 ||
                          formData.amount.interest > 0) && (
                          <div className="text-center">
                            <span className="text-[var(--color-on-surface)] opacity-60 block">
                              Interest
                            </span>
                            <span className="font-semibold">
                              ₹
                              {paymentResponse?.totalFees ||
                                formData.amount.interest}
                            </span>
                          </div>
                        )}
                        {(paymentResponse?.totalPenalties > 0 ||
                          formData.amount.penalty > 0) && (
                          <div className="text-center">
                            <span className="text-[var(--color-on-surface)] opacity-60 block">
                              Penalty
                            </span>
                            <span className="font-semibold">
                              ₹
                              {paymentResponse?.totalPenalties ||
                                formData.amount.penalty}
                            </span>
                          </div>
                        )}
                        {(paymentResponse?.penaltyDiscount > 0 ||
                          formData.amount.penalty_discount > 0) && (
                          <div className="text-center">
                            <span className="text-[var(--color-on-surface)] opacity-60 block">
                              Discount
                            </span>
                            <span className="font-semibold text-green-600">
                              -₹
                              {paymentResponse?.penaltyDiscount ||
                                formData.amount.penalty_discount}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dates Row */}
                    {paymentResponse &&
                      (paymentResponse.createdAt ||
                        paymentResponse.completedAt) && (
                        <div className="grid grid-cols-3 gap-3 text-xs mb-4 p-2 bg-gray-50 rounded-lg">
                          {paymentResponse.createdAt && (
                            <div>
                              <span className="text-[var(--color-on-surface)] opacity-60 block">
                                Created
                              </span>
                              <span className="font-medium">
                                {formatDateWithTime(paymentResponse.createdAt)}
                              </span>
                            </div>
                          )}
                          {paymentResponse.completedAt && (
                            <div>
                              <span className="text-[var(--color-on-surface)] opacity-60 block">
                                Completed
                              </span>
                              <span className="font-medium">
                                {formatDateWithTime(
                                  paymentResponse.completedAt,
                                )}
                              </span>
                            </div>
                          )}
                          {paymentResponse.opsApprovalStatus && (
                            <div>
                              <span className="text-[var(--color-on-surface)] opacity-60 block">
                                Ops Approval
                              </span>
                              <span
                                className={`font-medium ${paymentResponse.opsApprovalStatus === "APPROVED" ? "text-green-600" : paymentResponse.opsApprovalStatus === "PENDING" ? "text-yellow-600" : ""}`}
                              >
                                {paymentResponse.opsApprovalStatus}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                    {/* Status Indicators */}
                    <div className="flex flex-wrap gap-3 text-xs mb-4">
                      {paymentResponse?.isReloanApplicable !== undefined && (
                        <div className="flex items-center gap-1">
                          <BiRepeat
                            className={
                              paymentResponse.isReloanApplicable
                                ? "text-green-500"
                                : "text-gray-400"
                            }
                            size={12}
                          />
                          <span className="text-[var(--color-on-surface)] opacity-70">
                            Reloan:{" "}
                            {paymentResponse.isReloanApplicable ? "Yes" : "No"}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Close Button */}
                    <div className="flex justify-center pt-3 border-t border-[var(--color-muted)] border-opacity-20">
                      <Button
                        onClick={() => {
                          resetForm();
                          handleClose();
                        }}
                        className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-opacity-90 transition-all text-sm"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div>
                      {" "}
                      {/* Added max-width for better layout control */}
                      <div className="flex gap-1 p-1 bg-surface-variant rounded-xl">
                        {Object.values(TabType).map((tab) => {
                          const isActive = activeTab === tab;

                          return (
                            <button
                              key={tab}
                              onClick={() => setActiveTab(tab)}
                              // Accessibility attributes
                              role="tab"
                              aria-selected={isActive}
                              aria-controls={`${tab}-panel`}
                              id={`${tab}-tab`}
                              tabIndex={isActive ? 0 : -1}
                              // Styling
                              className={`
            relative flex-1 px-4 py-2 rounded-lg font-semibold text-sm 
            transition-all duration-300 ease-out cursor-pointer
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
            ${
              isActive
                ? "bg-background text-on-background shadow-md translate-y-[-1px]"
                : "text-on-surface/60 hover:text-on-surface hover:bg-surface/50"
            }
          `}
                            >
                              {/* Label with capitalized formatting */}
                              <span className="relative z-10 capitalize">
                                {tab}
                              </span>

                              {/* Optional: Layout transition hint */}
                              {isActive && (
                                <div className="absolute inset-0 bg-background rounded-lg shadow-sm" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {activeTab === TabType.PAYMENT && (
                      <div className="space-y-5">
                        {/* Payment Type Selection */}
                        <div className="my-6">
                          {/* Payment Type Buttons + Action */}
                          <div className="flex flex-col md:flex-row md:justify-between gap-4 mb-4 items-start md:items-center">
                            <div className="relative" ref={dropdownRef}>
                              <button
                                type="button"
                                onClick={() =>
                                  setIsPaymentDropdownOpen(
                                    !isPaymentDropdownOpen,
                                  )
                                }
                                disabled={
                                  loanDetails?.status === LoanStatusEnum.PAID
                                }
                                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 min-w-[180px] cursor-pointer ${
                                  loanDetails?.status === LoanStatusEnum.PAID
                                    ? "opacity-50 cursor-not-allowed bg-gray-200 text-gray-500"
                                    : "bg-[#EA5E18] text-white shadow-md hover:bg-[#d54e14]"
                                }`}
                              >
                                <span className="flex-1 ">
                                  {paymentType === "FULL_PAYMENT"
                                    ? "FULL PAYMENT"
                                    : "PARTIAL PAYMENT"}
                                </span>
                                <svg
                                  className={`w-4 h-4 transition-transform duration-200 ${
                                    isPaymentDropdownOpen ? "rotate-180" : ""
                                  }`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </button>

                              {isPaymentDropdownOpen && (
                                <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-10">
                                  {loanDetails?.status ===
                                    LoanStatusEnum.ACTIVE && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPaymentType("FULL_PAYMENT");
                                        setIsPaymentDropdownOpen(false);
                                        setPaymentSummary(null);
                                        setFormData((prev) => ({
                                          ...prev,
                                          method: null,
                                          amount: {
                                            penalty: 0,
                                            interest: 0,
                                            penalty_discount: 0,
                                            interest_discount: 0,
                                            principal: 0,
                                            discount: 0,
                                            total: 0,
                                          },
                                          paymentDate: dayjs().format("YYYY-MM-DD"),
                                        }));
                                      }}
                                      className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors ${
                                        paymentType === "FULL_PAYMENT"
                                          ? "bg-orange-50 text-[#EA5E18] font-medium"
                                          : "text-gray-700"
                                      }`}
                                    >
                                      FULL PAYMENT
                                      {paymentType === "FULL_PAYMENT" && (
                                        <span className="float-right">✓</span>
                                      )}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPaymentType("PARTIAL_PAYMENT");
                                      setIsPaymentDropdownOpen(false);
                                      setPaymentSummary(null);
                                      setFormData((prev) => ({
                                        ...prev,
                                        method: null,
                                        amount: {
                                          penalty: 0,
                                          interest: 0,
                                          penalty_discount: 0,
                                          interest_discount: 0,
                                          principal: 0,
                                          discount: 0,
                                          total: 0,
                                        },
                                        paymentDate: dayjs().format("YYYY-MM-DD"),
                                      }));
                                    }}
                                    className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors ${
                                      paymentType === "PARTIAL_PAYMENT"
                                        ? "bg-orange-50 text-[#EA5E18] font-medium"
                                        : "text-gray-700"
                                    }`}
                                  >
                                    PARTIAL PAYMENT
                                    {paymentType === "PARTIAL_PAYMENT" && (
                                      <span className="float-right">✓</span>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={
                                      loanDetails?.status ===
                                      LoanStatusEnum.PARTIALLY_PAID
                                        ? handelSettlementOpen
                                        : handelWriteOffOpen
                                    }
                                    className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors text-gray-700"
                                  >
                                    {loanDetails?.status ===
                                    LoanStatusEnum.PARTIALLY_PAID
                                      ? "Settle Loan"
                                      : "Write Off Loan"}
                                  </button>
                                </div>
                              )}
                            </div>
                            {/* )} */}
                          </div>

                          {/* Status Info Message */}
                          {(loanDetails?.status === LoanStatusEnum.PAID ||
                            loanDetails?.status ===
                              LoanStatusEnum.PARTIALLY_PAID) && (
                            <div className="mt-3 flex items-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <svg
                                  className="w-4 h-4 text-blue-600"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-blue-800">
                                  {loanDetails?.status === LoanStatusEnum.PAID
                                    ? "Loan Fully Paid"
                                    : "Payment In Progress"}
                                </p>
                                <p className="text-xs text-blue-600 mt-0.5">
                                  {loanDetails?.status === LoanStatusEnum.PAID
                                    ? "This loan has been fully settled. No further payments are required."
                                    : "A partial payment has been recorded. Payment options are currently unavailable."}
                                </p>
                              </div>
                              <div className="flex-shrink-0">
                                {loanDetails?.status === LoanStatusEnum.PAID ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                    <svg
                                      className="w-3 h-3"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                    Completed
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                    <svg
                                      className="w-3 h-3"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                    Pending
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        {/* Expandable Content */}
                        <div>
                          {/* Basic Details */}
                          <div className="rounded-xl border border-[var(--color-muted)] border-opacity-20 bg-[var(--color-surface)] overflow-hidden">
                            {/* ───── Hero Section: Total Amount ───── */}
                            <div className="bg-[var(--color-surface-variant)] px-4 py-3 flex justify-between items-center border-b border-[var(--color-muted)] border-opacity-10">
                              <div className="flex flex-col">
                                <span className="text-[10px] uppercase tracking-wider opacity-60 font-semibold">
                                  applied loan amount
                                </span>
                                <span className="text-lg font-bold text-[var(--color-primary)]">
                                  ₹{loanDetails?.amount?.toLocaleString()}
                                </span>
                              </div>

                              <div className="flex flex-col items-end gap-3">
                                {loanDetails?.loanDetails?.dueDate && (
                                  <div className="text-right">
                                    <span className="text-[10px] opacity-60 block">
                                      Due Date
                                    </span>
                                    <span className="text-xs font-semibold text-[#EA5E18]">
                                      {formatDate(
                                        loanDetails.loanDetails.dueDate,
                                      )}
                                    </span>
                                  </div>
                                )}
                                {loanDetails?.loanType && (
                                  <div className="text-right">
                                    <span className="text-[10px] opacity-60 block">
                                      Loan Type
                                    </span>
                                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                                      {loanDetails.loanType}. --{" "}
                                      {loanDetails.is_repeat_loan
                                        ? "Repeat"
                                        : "Fresh"}
                                    </span>
                                  </div>
                                )}
                                {loanDetails?.isMigratedloan
                                  ? "-Migrated-"
                                  : ""}
                              </div>
                            </div>

                            {/* ───── Dense Meta Grid ───── */}
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 text-xs border-b border-[var(--color-muted)] border-opacity-10">
                              {/* Loan ID */}
                              <div className="flex justify-between">
                                <span className="opacity-60">Loan ID</span>
                                <span className="font-medium truncate max-w-[100px]">
                                  {loanDetails?.formattedLoanId}
                                </span>
                              </div>

                              {/* Disbursed Date */}
                              {loanDetails?.disbursementDate && (
                                <div className="flex justify-between">
                                  <span className="opacity-60">Disbursed</span>
                                  <span className="font-medium">
                                    {formatDate(loanDetails.disbursementDate)}
                                  </span>
                                </div>
                              )}

                              {/* Duration */}
                              {loanDetails?.loanDetails?.durationDays && (
                                <div className="flex justify-between">
                                  <span className="opacity-60">Duration</span>
                                  <span className="font-medium">
                                    {loanDetails.loanDetails.durationDays} days
                                  </span>
                                </div>
                              )}

                              {/* Obligation (Base) */}
                              {loanDetails?.repayment && (
                                <div className="flex justify-between">
                                  <span className="opacity-60">
                                    Total Obligation(
                                    {/* //due date 
                                      //  */}
                                    {loanDetails.loanDetails?.dueDate
                                      ? formatDate(
                                          loanDetails.loanDetails.dueDate,
                                        )
                                      : "N/A"}
                                    )
                                  </span>
                                  <span className="font-medium">
                                    ₹{loanDetails.repayment.totalObligation}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* ───── Compact Fee Breakdown ───── */}
                            {/* Only render if fees exist to save space */}
                            {loanDetails?.repayment && (
                              <div className="bg-[var(--color-surface)] bg-opacity-50 p-3 pt-2">
                                {/* Summary Header */}
                                <div className="flex justify-between text-xs mb-2">
                                  <span className="font-medium opacity-70">
                                    Fees & Charges
                                  </span>
                                  <span className="font-medium">
                                    ₹{loanDetails.repayment.totalFees}
                                  </span>
                                </div>

                                {/* Detailed List */}
                                {loanDetails.repayment.feeBreakdowns?.length >
                                  0 && (
                                  <div className="space-y-1.5 pl-2 border-l-2 border-[var(--color-muted)] border-opacity-20">
                                    {loanDetails.repayment.feeBreakdowns.map(
                                      (fee) => (
                                        <div
                                          key={fee.id}
                                          className="text-[11px] leading-tight"
                                        >
                                          {/* Fee Main Line */}
                                          <div className="flex justify-between text-opacity-80">
                                            <span className="opacity-60">
                                              {fee.type}
                                            </span>
                                            <span>₹{fee.total}</span>
                                          </div>

                                          {/* Tax Sub-lines (Ultra compact) */}
                                          {fee.taxes.length > 0 &&
                                            fee.taxes.map((tax) => (
                                              <div
                                                key={tax.id}
                                                className="flex justify-between opacity-40 pl-1 mt-0.5"
                                              >
                                                <span>
                                                  + {tax.type} (
                                                  {tax.chargeValue}%)
                                                </span>
                                                <span>₹{tax.amount}</span>
                                              </div>
                                            ))}
                                        </div>
                                      ),
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Full Payment */}
                          {nonGetwayPaymentLoanId &&
                            paymentType === "FULL_PAYMENT" && (
                              <div className="mt-6">
                                <TodayCalculations
                                  loanId={nonGetwayPaymentLoanId as string}
                                />
                              </div>
                            )}

                          {/* Partial Payment */}
                          {nonGetwayPaymentLoanId &&
                            paymentType === "PARTIAL_PAYMENT" && (
                              <div className="mt-6">
                                <TodayCalculations
                                  loanId={nonGetwayPaymentLoanId as string}
                                />
                              </div>
                            )}
                        </div>
                        {/* Payment Request Dropdown */}
                        {!(paymentRequests.length > 0) && (
                          <div className="mb-6">
                            <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-1">
                              Select Payment Request{" "}
                              <span className="text-[#EA5E18]">*</span>
                            </label>

                            <select
                              name="selectedPaymentRequestId"
                              value={formData.selectedPaymentRequestId}
                              onChange={handleInputChange}
                              className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 focus:border-transparent ${
                                fieldErrors.selectedPaymentRequestId
                                  ? "border-red-300 focus:ring-red-400"
                                  : "border-[var(--color-muted)] border-opacity-50 focus:ring-[#EA5E18]"
                              }`}
                            >
                              <option value="">Select a payment request</option>
                              {paymentRequests.map((request) => (
                                <option key={request.id} value={request.id}>
                                  {request.type} - {request.status} -{" "}
                                  {formatDate(request.createdAt)}
                                </option>
                              ))}
                            </select>

                            {fieldErrors.selectedPaymentRequestId && (
                              <p className="mt-1 text-xs text-[var(--color-on-error)]">
                                {fieldErrors.selectedPaymentRequestId}
                              </p>
                            )}
                          </div>
                        )}
                        {/* Selected Payment Request Details */}
                        {selectedPaymentRequest && (
                          <div className="mb-8 border border-[var(--color-muted)] border-opacity-30 rounded-lg overflow-hidden">
                            {/* Header */}
                            <div className="px-6 py-3 border-b border-[var(--color-muted)] border-opacity-30">
                              <h3 className="text-lg font-semibold text-[var(--color-on-surface)]">
                                Selected Payment Request Details
                              </h3>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-4 text-sm text-[var(--color-on-surface)]">
                              {/* Basic Info Grid */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="opacity-70">
                                    Payment Request ID:
                                  </span>
                                  <span className="ml-1 font-medium">
                                    #
                                    {selectedPaymentRequest.id
                                      .split("-")[0]
                                      .toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <span className="opacity-70">Type:</span>
                                  <span className="ml-1 font-medium">
                                    {selectedPaymentRequest.type}
                                  </span>
                                </div>
                                <div>
                                  <span className="opacity-70">
                                    Created At:
                                  </span>
                                  <span className="ml-1 font-medium">
                                    {formatDateWithTime(
                                      selectedPaymentRequest.createdAt,
                                    )}
                                  </span>
                                </div>
                                <div>
                                  <span className="opacity-70">Status:</span>
                                  <span className="ml-1 font-medium">
                                    {selectedPaymentRequest.status}
                                  </span>
                                </div>
                                {selectedPaymentRequest.description && (
                                  <div className="col-span-2">
                                    <span className="opacity-70">
                                      Description:
                                    </span>
                                    <span className="ml-1 font-medium">
                                      {selectedPaymentRequest.description}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Transactions */}
                              {(selectedPaymentRequest.collectionTransactions
                                ?.length > 0 ||
                                selectedPaymentRequest
                                  .partialCollectionTransactions?.length > 0 ||
                                selectedPaymentRequest.disbursalTransactions
                                  ?.length > 0) && (
                                <div className="space-y-4">
                                  {/* Collection / Partial / Disbursal Transactions */}
                                  {[
                                    {
                                      title: "Collection Transactions",
                                      items:
                                        selectedPaymentRequest.collectionTransactions,
                                    },
                                    {
                                      title: "Partial Collection Transactions",
                                      items:
                                        selectedPaymentRequest.partialCollectionTransactions,
                                    },
                                    {
                                      title: "Disbursal Transactions",
                                      items:
                                        selectedPaymentRequest.disbursalTransactions,
                                    },
                                  ].map(
                                    (txGroup) =>
                                      txGroup.items?.length > 0 && (
                                        <div key={txGroup.title}>
                                          <h4 className="text-sm font-semibold mb-2">
                                            {txGroup.title}
                                          </h4>
                                          <div className="space-y-2 text-sm">
                                            {txGroup.items.map((tx) => (
                                              <div
                                                key={tx.id}
                                                className="p-3 border border-[var(--color-muted)] border-opacity-30 rounded-md"
                                              >
                                                <div className="grid grid-cols-2 gap-3">
                                                  <div>
                                                    <span className="opacity-70">
                                                      Status:
                                                    </span>
                                                    <span className="ml-1 font-medium">
                                                      {tx.status}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="opacity-70">
                                                      Amount:
                                                    </span>
                                                    <span className="ml-1 font-semibold">
                                                      ₹
                                                      {tx.amount.toLocaleString()}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="opacity-70">
                                                      Method:
                                                    </span>
                                                    <span className="ml-1 font-medium">
                                                      {tx.method}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="opacity-70">
                                                      Receipt ID:
                                                    </span>
                                                    <span className="ml-1 font-medium">
                                                      {tx.receiptId}
                                                    </span>
                                                  </div>
                                                  {tx.failureReason && (
                                                    <div className="col-span-2">
                                                      <span className="opacity-70">
                                                        Failure Reason:
                                                      </span>
                                                      <span className="ml-1 font-medium text-[var(--color-on-error)]">
                                                        {tx.failureReason}
                                                      </span>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ),
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        <form
                          onSubmit={handleSubmit}
                          className="space-y-4 text-sm"
                        >
                          {/* Error Message */}
                          {error && (
                            <div className="bg-[var(--color-error)] bg-opacity-10 border border-[var(--color-error)] border-opacity-30 rounded-md p-3">
                              <div className="flex items-center">
                                <svg
                                  className="h-4 w-4 text-[var(--color-on-error)] mr-2"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                <p className="text-xs font-medium text-[var(--color-on-error)]">
                                  {error}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Top Row: Payment Method & Date (conditionally rendered) */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                            {/* Payment Method */}
                            <div>
                              <label className="block text-xs font-medium text-[var(--color-on-surface)] opacity-80 mb-1.5">
                                Payment Method{" "}
                                <span className="text-[#EA5E18]">*</span>
                              </label>
                              <select
                                name="method"
                                value={formData.method || ""}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2 text-sm border rounded-md bg-[var(--color-background)] text-[var(--color-on-surface)] focus:outline-none focus:ring-1 focus:border-transparent ${
                                  fieldErrors.method
                                    ? "border-red-300 focus:ring-red-400"
                                    : "border-[var(--color-muted)] border-opacity-50 focus:ring-[#EA5E18]"
                                }`}
                              >
                                <option value="">Select Method</option>
                                {paymentType === "PARTIAL_PAYMENT" && (
                                  <>
                                    {apiPartPaymentProviders.map((provider) => {
                                      if (
                                        provider.provider ===
                                        BrandProviderName.PAYTRING
                                      ) {
                                        return (
                                          <option
                                            key={provider.provider}
                                            value={PaymentMethodEnum.PAYTERNING}
                                          >
                                            Paytring
                                          </option>
                                        );
                                      } else if (
                                        provider.provider ===
                                        BrandProviderName.RAZORPAY
                                      ) {
                                        return (
                                          <option
                                            key={provider.provider}
                                            value={PaymentMethodEnum.RAZORPAY}
                                          >
                                            Razorpay
                                          </option>
                                        );
                                      } else if (
                                        provider.provider ===
                                        BrandProviderName.CASHFREE
                                      ) {
                                        return (
                                          <option
                                            key={provider.provider}
                                            value={PaymentMethodEnum.CASHFREE}
                                          >
                                            Cashfree
                                          </option>
                                        );
                                      } else if (
                                        provider.provider ===
                                        BrandProviderName.MANUAL
                                      ) {
                                        return (
                                          <option
                                            key={provider.provider}
                                            value={PaymentMethodEnum.MANUAL}
                                          >
                                            Manual
                                          </option>
                                        );
                                      }
                                      return null;
                                    })}
                                  </>
                                )}
                                {paymentType === "FULL_PAYMENT" && (
                                  <>
                                    {apiFullPaymentProviders.map((provider) => {
                                      if (
                                        provider.provider ===
                                        BrandProviderName.PAYTRING
                                      ) {
                                        return (
                                          <option
                                            key={provider.provider}
                                            value={PaymentMethodEnum.PAYTERNING}
                                          >
                                            Paytring
                                          </option>
                                        );
                                      } else if (
                                        provider.provider ===
                                        BrandProviderName.RAZORPAY
                                      ) {
                                        return (
                                          <option
                                            key={provider.provider}
                                            value={PaymentMethodEnum.RAZORPAY}
                                          >
                                            Razorpay
                                          </option>
                                        );
                                      } else if (
                                        provider.provider ===
                                        BrandProviderName.CASHFREE
                                      ) {
                                        return (
                                          <option
                                            key={provider.provider}
                                            value={PaymentMethodEnum.CASHFREE}
                                          >
                                            Cashfree
                                          </option>
                                        );
                                      } else if (
                                        provider.provider ===
                                        BrandProviderName.RAZORPAY_AUTOPAY
                                      ) {
                                        return (
                                          <option
                                            key={provider.provider}
                                            value={
                                              PaymentMethodEnum.RAZORPAY_AUTOPAY
                                            }
                                          >
                                            Razorpay Autopay
                                          </option>
                                        );
                                      } else if (
                                        provider.provider ===
                                        BrandProviderName.MANUAL
                                      ) {
                                        return (
                                          <option
                                            key={provider.provider}
                                            value={PaymentMethodEnum.MANUAL}
                                          >
                                            Manual
                                          </option>
                                        );
                                      }
                                      return null;
                                    })}
                                  </>
                                )}
                              </select>
                              {fieldErrors.method && (
                                <p className="mt-1 text-xs text-[var(--color-on-error)]">
                                  {fieldErrors.method}
                                </p>
                              )}
                            </div>

                            {/* Payment Date - Moved here for density */}
                            {!isRazorpayAutopay && (
                              <div>
                                <label className="block text-xs font-medium text-[var(--color-on-surface)] opacity-80 mb-1.5">
                                  Payment Date
                                </label>
                                <input
                                  type="date"
                                  min={(() => {
                                    const isAdminOrSuperAdmin = userRole.includes(PartnerUserRoleEnum.ADMIN) || userRole.includes(PartnerUserRoleEnum.SUPER_ADMIN);
                                    if (isAdminOrSuperAdmin) {
                                      return loanDetails?.disbursementDate?.split("T")[0] || "";
                                    }
                                    const sevenDaysAgo = new Date();
                                    sevenDaysAgo.setDate(
                                      sevenDaysAgo.getDate() - 7,
                                    );
                                    const sevenDaysAgoStr = sevenDaysAgo
                                      .toISOString()
                                      .split("T")[0];
                                    const disbursementDateStr =
                                      loanDetails?.disbursementDate?.split(
                                        "T",
                                      )[0] || "";
                                    return disbursementDateStr > sevenDaysAgoStr
                                      ? disbursementDateStr
                                      : sevenDaysAgoStr;
                                  })()}
                                  max={(() => {
                                    const isAdminOrSuperAdmin = userRole.includes(PartnerUserRoleEnum.ADMIN) || userRole.includes(PartnerUserRoleEnum.SUPER_ADMIN);
                                    if (isAdminOrSuperAdmin) {
                                      return undefined;
                                    }
                                    return new Date(
                                      new Date().setDate(
                                        new Date().getDate() + 7,
                                      ),
                                    )
                                      .toISOString()
                                      .split("T")[0];
                                  })()}
                                  name="paymentDate"
                                  value={formData.paymentDate}
                                  onChange={handleInputChange}
                                  className="w-full px-3 py-2 text-sm border border-[var(--color-muted)] border-opacity-50 rounded-md focus:outline-none focus:ring-1 focus:ring-[#EA5E18] focus:border-transparent"
                                />
                              </div>
                            )}
                          </div>

                          {/* Bank Account Dropdown - Only for Manual Payments */}
                          {formData.method === PaymentMethodEnum.MANUAL && (
                            <div className="mt-4">
                              <label className="block text-xs font-medium text-[var(--color-on-surface)] opacity-80 mb-1.5">
                                Brand Bank Account{" "}
                                <span className="text-[#EA5E18]">*</span>
                              </label>
                              <select
                                name="brandBankAccountId"
                                value={formData.brandBankAccountId || ""}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2 text-sm rounded-md border focus:outline-none focus:ring-1 focus:border-transparent ${
                                  fieldErrors.brandBankAccountId
                                    ? "border-red-300 focus:ring-red-400"
                                    : "border-[var(--color-muted)] border-opacity-50 focus:ring-[#EA5E18]"
                                }`}
                                disabled={brandBankAccounts.length === 0}
                              >
                                <option value="">
                                  {bankAccountsLoading
                                    ? "Loading..."
                                    : brandBankAccounts.length === 0
                                      ? "No bank accounts available"
                                      : "Select a bank account"}
                                </option>
                                {brandBankAccounts.map((account) => (
                                  <option key={account.id} value={account.id}>
                                    {account.bankName} - {account.accountNumber}
                                    {account.isPrimaryAccount && " (Primary)"}
                                  </option>
                                ))}
                              </select>
                              {fieldErrors.brandBankAccountId && (
                                <p className="mt-1 text-xs text-[var(--color-on-error)]">
                                  {fieldErrors.brandBankAccountId}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Info Text */}
                          {formData.method !== PaymentMethodEnum.MANUAL &&
                            !isRazorpayAutopay && (
                              <div className="text-xs text-gray-500 -mt-2">
                                Link generated for{" "}
                                {formData.method ===
                                PaymentMethodEnum.PAYTERNING
                                  ? "Paytring"
                                  : formData.method ===
                                      PaymentMethodEnum.RAZORPAY
                                    ? "Razorpay"
                                    : formData.method ===
                                        PaymentMethodEnum.CASHFREE
                                      ? "Cashfree"
                                      : ""}
                                . Send manually to customer.
                              </div>
                            )}

                          {isRazorpayAutopay && (
                            <div className="text-xs text-blue-700 bg-blue-50 p-2 rounded -mt-2">
                              Razorpay Autopay initiates recurring UPI.
                              Processed 48 hours before due.
                            </div>
                          )}

                          {/* Payment Details Section */}
                          {!isRazorpayAutopay && (
                            <div className="space-y-3">
                              {/* Loading State */}
                              {paymentSummaryLoading && (
                                <div className="p-3 bg-[var(--color-primary)] bg-opacity-10 border border-[var(--color-primary)] border-opacity-30 rounded-md flex items-center">
                                  <svg
                                    className="animate-spin h-4 w-4 text-[var(--color-on-primary)] mr-2"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle
                                      className="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                    />
                                    <path
                                      className="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                  </svg>
                                  <p className="text-xs text-[var(--color-on-primary)]">
                                    Calculating...
                                  </p>
                                </div>
                              )}

                              {/* Partial Payment Summary Box */}
                              {paymentType === "PARTIAL_PAYMENT" &&
                                initialPartialPaymentSummary && (
                                  <div className="p-3 bg-[var(--color-primary)] bg-opacity-10 border border-[var(--color-primary)] border-opacity-30 rounded-md">
                                    <h4 className="text-xs font-semibold text-on-primary mb-2">
                                      Loan Details
                                    </h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-1 gap-x-4 text-xs">
                                      {[
                                        {
                                          label: "Total Due",
                                          value:
                                            initialPartialPaymentSummary
                                              .paymentDetails
                                              .totalAmountDueAtPayment,
                                        },
                                        {
                                          label: "Principal",
                                          value:
                                            initialPartialPaymentSummary
                                              .paymentDetails
                                              .principalDueAtPayment,
                                        },
                                        {
                                          label: "Interest",
                                          value:
                                            initialPartialPaymentSummary
                                              .paymentDetails
                                              .interestDueAtPayment,
                                        },
                                        {
                                          label: "Penalty",
                                          value:
                                            initialPartialPaymentSummary
                                              .paymentDetails
                                              .penaltyDueAtPayment,
                                        },
                                      ].map((item, idx) => (
                                        <div key={idx}>
                                          <span className="text-[var(--color-on-primary)] opacity-80">
                                            {item.label}:
                                          </span>
                                          <span className="ml-1 font-semibold text-[var(--color-on-primary)]">
                                            ₹{item.value?.toLocaleString()}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                              {/* Full Payment Summary Box */}
                              {paymentType === "FULL_PAYMENT" &&
                                paymentSummary && (
                                  <div className="p-3 bg-[var(--color-success)] bg-opacity-10 border border-[var(--color-success)] border-opacity-30 rounded-md">
                                    <h4 className="text-xs font-semibold text-green-900 mb-2">
                                      Payment Summary
                                    </h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-1 gap-x-4 text-xs">
                                      {[
                                        {
                                          label: "Total Pay",
                                          value: paymentSummary.totalRepayment,
                                        },
                                        {
                                          label: "Principal",
                                          value: paymentSummary.principalAmount,
                                        },
                                        {
                                          label: "Fees",
                                          value:
                                            paymentSummary.totals.totalFees,
                                        },
                                        {
                                          label: "Taxes",
                                          value:
                                            paymentSummary.totals.totalTaxes,
                                          condition:
                                            Number(
                                              paymentSummary.totals.totalTaxes,
                                            ) > 0,
                                        },
                                        {
                                          label: "Penalties",
                                          value:
                                            paymentSummary.totals
                                              .totalPenalties,
                                        },
                                        {
                                          label: "Days < Due",
                                          value: paymentSummary.daysBeforeDue,
                                        },
                                        {
                                          label: "Days > Due",
                                          value: paymentSummary.isOverdue
                                            ? paymentSummary.daysAfterDue
                                            : null,
                                        },
                                      ].map(
                                        (item, idx) =>
                                          (!item.condition ||
                                            item.condition) && (
                                            <div key={idx}>
                                              <span className="text-[var(--color-on-success)] opacity-80">
                                                {item.label}:
                                              </span>
                                              <span className="ml-1 font-semibold text-green-900">
                                                {item.value?.toLocaleString?.() ??
                                                  item.value}
                                              </span>
                                            </div>
                                          ),
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                          )}

                          {/* Amount Breakdown Section */}
                          {!isRazorpayAutopay && formData.paymentDate && (
                            <div className="space-y-3 pt-2 border-t border-[var(--color-muted)] border-opacity-30">
                              <div className="flex justify-between items-center">
                                <h4 className="text-sm font-semibold text-[var(--color-on-background)]">
                                  Amount Breakdown
                                </h4>
                                {/* Checkbox for partial payment completion */}
                                {paymentType === "PARTIAL_PAYMENT" && (
                                  <label
                                    className={`group relative flex items-center gap-3 px-3 py-1.5 rounded-full border transition-all duration-200 cursor-pointer select-none ${
                                      formData.isPaymentCompleted
                                        ? "bg-[#EA5E18]/10 border-[#EA5E18] shadow-sm"
                                        : "bg-transparent border-[var(--color-muted)]/30 hover:border-[var(--color-muted)]/60"
                                    }`}
                                  >
                                    {/* Text Section */}
                                    <div className="flex flex-col items-end leading-none">
                                      <span
                                        className={`text-xs font-bold transition-colors ${
                                          formData.isPaymentCompleted
                                            ? "text-[#EA5E18]"
                                            : "text-[var(--color-on-surface)]"
                                        }`}
                                      >
                                        Final Payment
                                      </span>
                                      <span className="text-[9px] opacity-60 font-medium mt-0.5">
                                        Close Loan?
                                      </span>
                                    </div>

                                    {/* Custom Toggle Switch */}
                                    <div className="relative">
                                      <input
                                        type="checkbox"
                                        name="isPaymentCompleted"
                                        checked={
                                          formData.isPaymentCompleted || false
                                        }
                                        onChange={(e) =>
                                          setFormData((prev) => ({
                                            ...prev,
                                            isPaymentCompleted:
                                              e.target.checked,
                                          }))
                                        }
                                        className="peer sr-only"
                                        disabled={isPartialPaymentLocked}
                                      />
                                      {/* Track */}
                                      <div className="h-5 w-9 rounded-full bg-gray-200 peer-checked:bg-[#EA5E18] transition-colors duration-200"></div>
                                      {/* Thumb */}
                                      <div className="absolute top-1 left-1 h-3 w-3 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-4"></div>
                                    </div>
                                  </label>
                                )}
                              </div>

                              {paymentType === "PARTIAL_PAYMENT" ? (
                                // Partial Payment Logic
                                <div>
                                  <label className="block text-xs font-medium text-[var(--color-on-surface)] opacity-80 mb-1">
                                    Payment Amount{" "}
                                    <span className="text-[#EA5E18]">*</span>
                                  </label>
                                  <div className="flex flex-row items-center gap-2">
                                    <div className="relative flex-1">
                                      <span className="absolute left-3 top-2 text-[var(--color-on-surface)] opacity-70">
                                        ₹
                                      </span>
                                      <input
                                        type="number"
                                        value={partialPaymentAmount || ""}
                                        onChange={(e) => {
                                          const num =
                                            parseFloat(e.target.value) || 0;
                                          setPartialPaymentAmount(num);
                                          if (isAmountApplied) {
                                            setIsAmountApplied(false);
                                            setPartialPaymentSummary(null);
                                          }
                                          if (fieldErrors.amount) {
                                            setFieldErrors((prev) => ({
                                              ...prev,
                                              amount: "",
                                            }));
                                          }
                                        }}
                                        placeholder="0.00"
                                        min="0.01"
                                        step="0.01"
                                        max={
                                          initialPartialPaymentSummary
                                            ?.paymentDetails
                                            ?.totalAmountDueAtPayment ||
                                          undefined
                                        }
                                        className={`w-full pl-7 pr-3 py-2 border rounded-md text-sm font-semibold focus:outline-none focus:ring-1 ${
                                          fieldErrors.amount
                                            ? "border-red-300 focus:ring-red-500"
                                            : "border-[var(--color-muted)] border-opacity-50 focus:ring-[#EA5E18]"
                                        }`}
                                      />
                                    </div>

                                    <Button
                                      onClick={handleApplyAmount}
                                      className="h-[38px] px-3 text-xs"
                                      disabled={
                                        partialPaymentAmount <= 0 ||
                                        !formData.paymentDate ||
                                        paymentSummaryLoading ||
                                        partialPaymentAmount >
                                          (initialPartialPaymentSummary
                                            ?.paymentDetails
                                            ?.totalAmountDueAtPayment || 0) ||
                                        isAmountApplied
                                      }
                                    >
                                      {paymentSummaryLoading ? (
                                        <svg
                                          className="animate-spin h-3 w-3"
                                          xmlns="http://www.w3.org/2000/svg"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                        >
                                          <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                          />
                                          <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                          />
                                        </svg>
                                      ) : isAmountApplied ? (
                                        "Applied"
                                      ) : (
                                        "Apply"
                                      )}
                                    </Button>

                                    {isAmountApplied && (
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        className="h-[38px] px-3 text-xs"
                                        onClick={() => {
                                          handleCancelExcessAmount();
                                          setIsAmountApplied(false);
                                          setIsPartialPaymentLocked(false);
                                          setPartialPaymentSummary(null);
                                          setPartialPaymentAmount(0);
                                          setFormData((prev) => ({
                                            ...prev,
                                            amount: {
                                              penalty: 0,
                                              interest: 0,
                                              penalty_discount: 0,
                                              interest_discount: 0,
                                              principal: 0,
                                              discount: 0,
                                              total: 0,
                                            },
                                          }));
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                    )}
                                  </div>
                                  {fieldErrors.amount && (
                                    <p className="mt-1 text-xs text-[var(--color-on-error)]">
                                      {fieldErrors.amount}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                // Full Payment - Discounts Grid
                                <div className="grid grid-cols-2 gap-3">
                                  {/* Interest Discount */}
                                  <div>
                                    <label className="block text-xs font-medium text-[var(--color-on-surface)] opacity-80 mb-1">
                                      Interest Disc.
                                      <span className="text-[10px] opacity-60 ml-1">
                                        (Max:{" "}
                                        {Math.min(
                                          formData.amount.interest,
                                          max_intrest_discount,
                                        ).toLocaleString()}
                                        )
                                      </span>
                                    </label>
                                    <div className="relative">
                                      <span className="absolute left-2.5 top-2 text-[var(--color-on-surface)] opacity-70">
                                        ₹
                                      </span>
                                      <input
                                        type="number"
                                        value={
                                          formData.amount.interest_discount ||
                                          ""
                                        }
                                        onChange={(e) =>
                                          handleAmountChange(
                                            "interest_discount",
                                            e.target.value,
                                          )
                                        }
                                        disabled={formData.amount.interest <= 0}
                                        className={`w-full pl-6 pr-2 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 ${
                                          formData.amount.interest <= 0
                                            ? "bg-gray-50 opacity-50 cursor-not-allowed"
                                            : fieldErrors.interest_discount
                                              ? "border-red-300 focus:ring-red-500"
                                              : "border-[var(--color-muted)] border-opacity-50 focus:ring-[#EA5E18]"
                                        }`}
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                        max={max_intrest_discount}
                                      />
                                    </div>
                                    {fieldErrors.interest_discount && (
                                      <p className="mt-1 text-xs text-[var(--color-on-error)]">
                                        {fieldErrors.interest_discount}
                                      </p>
                                    )}
                                  </div>

                                  {/* Penalty Discount */}
                                  <div>
                                    <label className="block text-xs font-medium text-[var(--color-on-surface)] opacity-80 mb-1">
                                      Penalty Disc.
                                      {formData.amount.penalty > 0 && (
                                        <span className="text-[10px] opacity-60 ml-1">
                                          (Max:{" "}
                                          {formData.amount.penalty.toLocaleString()}
                                          )
                                        </span>
                                      )}
                                    </label>
                                    <div className="relative">
                                      <span className="absolute left-2.5 top-2 text-[var(--color-on-surface)] opacity-70">
                                        ₹
                                      </span>
                                      <input
                                        type="number"
                                        value={
                                          formData.amount.penalty_discount || ""
                                        }
                                        onChange={(e) =>
                                          handleAmountChange(
                                            "penalty_discount",
                                            e.target.value,
                                          )
                                        }
                                        disabled={formData.amount.penalty <= 0}
                                        className={`w-full pl-6 pr-2 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 ${
                                          formData.amount.penalty <= 0
                                            ? "bg-gray-50 opacity-50 cursor-not-allowed"
                                            : fieldErrors.penalty_discount
                                              ? "border-red-300 focus:ring-red-500"
                                              : "border-[var(--color-muted)] border-opacity-50 focus:ring-[#EA5E18]"
                                        }`}
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                        max={formData.amount.penalty || 0}
                                      />
                                    </div>
                                    {fieldErrors.penalty_discount && (
                                      <p className="mt-1 text-xs text-[var(--color-on-error)]">
                                        {fieldErrors.penalty_discount}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Final Amount Grid */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3">
                                {/* Principal */}
                                <div>
                                  <label className="block text-xs font-medium opacity-80 mb-1">
                                    Principal
                                  </label>
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-2 opacity-70">
                                      ₹
                                    </span>
                                    <FaLock className="absolute right-2.5 top-2.5 opacity-30 text-xs" />
                                    <input
                                      readOnly
                                      type="number"
                                      value={formData.amount.principal || ""}
                                      className="w-full pl-6 pr-6 py-2 text-sm border border-[var(--color-muted)] border-opacity-50 rounded-md bg-[var(--color-background)] opacity-80 focus:outline-none"
                                      placeholder="0.00"
                                    />
                                  </div>
                                </div>

                                {/* Interest */}
                                <div>
                                  <label className="block text-xs font-medium opacity-80 mb-1">
                                    Interest
                                    {formData.amount.interest_discount > 0 && (
                                      <span className="ml-1 text-[10px] text-green-600">
                                        (-{formData.amount.interest_discount})
                                      </span>
                                    )}
                                  </label>
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-2 opacity-70">
                                      ₹
                                    </span>
                                    <FaLock className="absolute right-2.5 top-2.5 opacity-30 text-xs" />
                                    <input
                                      readOnly
                                      type="number"
                                      value={
                                        Number(formData.amount.interest || 0) -
                                        Number(
                                          formData.amount.interest_discount ||
                                            0,
                                        )
                                      }
                                      className="w-full pl-6 pr-6 py-2 text-sm border border-[var(--color-muted)] border-opacity-50 rounded-md bg-[var(--color-background)] opacity-80 focus:outline-none"
                                      placeholder="0.00"
                                    />
                                  </div>
                                </div>

                                {/* Penalty */}
                                <div>
                                  <label className="block text-xs font-medium opacity-80 mb-1">
                                    Penalty
                                    {formData.amount.penalty_discount > 0 && (
                                      <span className="ml-1 text-[10px] text-green-600">
                                        (-{formData.amount.penalty_discount})
                                      </span>
                                    )}
                                  </label>
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-2 opacity-70">
                                      ₹
                                    </span>
                                    <FaLock className="absolute right-2.5 top-2.5 opacity-30 text-xs" />
                                    <input
                                      readOnly
                                      type="number"
                                      value={
                                        Number(formData.amount.penalty || 0) -
                                        Number(
                                          formData.amount.penalty_discount || 0,
                                        )
                                      }
                                      className="w-full pl-6 pr-6 py-2 text-sm border border-[var(--color-muted)] border-opacity-50 rounded-md bg-[var(--color-background)] opacity-80 focus:outline-none"
                                      placeholder="0.00"
                                    />
                                  </div>
                                </div>

                                {/* Total Amount */}
                                <div>
                                  <label className="block text-xs font-bold text-[var(--color-on-surface)] mb-1">
                                    Total{" "}
                                    <span className="text-[#EA5E18]">*</span>
                                  </label>
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-2 opacity-70 font-bold">
                                      ₹
                                    </span>
                                    <FaLock className="absolute right-2.5 top-2.5 opacity-30 text-xs" />
                                    <input
                                      type="number"
                                      value={formData.amount.total || ""}
                                      readOnly
                                      className="w-full pl-6 pr-6 py-2 text-sm font-bold border rounded-md bg-gray-50 focus:outline-none"
                                      placeholder="0.00"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Partial Payment Summary (Applied) */}
                          {!isRazorpayAutopay &&
                            paymentType === "PARTIAL_PAYMENT" &&
                            partialPaymentSummary &&
                            isAmountApplied && (
                              <div className="p-3 bg-[var(--color-success)] bg-opacity-10 border border-[var(--color-success)] border-opacity-30 rounded-md">
                                <h4 className="text-xs font-semibold text-green-900 mb-2">
                                  Breakdown: Paid & Remaining
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-1 gap-x-4 text-xs">
                                  <div>
                                    <span className="opacity-70">Amt:</span>
                                    <span className="ml-1 font-medium text-green-900">
                                      ₹
                                      {partialPaymentSummary.amount?.toLocaleString()}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="opacity-70">
                                      Prin Paid:
                                    </span>
                                    <span className="ml-1 font-medium text-green-900">
                                      ₹
                                      {partialPaymentSummary.principalAmount?.toLocaleString()}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="opacity-70">
                                      Int Paid:
                                    </span>
                                    <span className="ml-1 font-medium text-green-900">
                                      ₹
                                      {partialPaymentSummary.totalFees?.toLocaleString()}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="opacity-70">
                                      Pen Paid:
                                    </span>
                                    <span className="ml-1 font-medium text-green-900">
                                      ₹
                                      {partialPaymentSummary.totalPenalties?.toLocaleString()}
                                    </span>
                                  </div>
                                  {/* Discounts */}
                                  <div className="col-span-2 md:col-span-4 border-t border-green-200 mt-1 pt-1 flex flex-wrap gap-3">
                                    <span className="font-semibold text-green-900">
                                      Disc: ₹
                                      {partialPaymentSummary.discountSummary
                                        ?.roundOffDiscount?.total ?? 0}{" "}
                                      (Round)
                                    </span>
                                    <span className="font-semibold text-red-900">
                                      Disc: ₹
                                      {partialPaymentSummary.discountSummary?.penalty?.toLocaleString() ??
                                        0}{" "}
                                      (Penalty)
                                    </span>
                                  </div>
                                  {/* Remaining */}
                                  <div className="col-span-2 md:col-span-4 border-t border-green-200 mt-1 pt-1 flex flex-wrap gap-4">
                                    <span className="font-bold text-green-900">
                                      Remaining:
                                    </span>
                                    <span>
                                      Total: ₹
                                      {partialPaymentSummary.paymentDetails.remainingDueAfterPayment?.toLocaleString()}
                                    </span>
                                    <span>
                                      Prin: ₹
                                      {partialPaymentSummary.paymentDetails.principalDueAfterPayment?.toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                          {/* Additional Information (Ref, Notes, File) */}
                          {!isRazorpayAutopay && formData.paymentDate && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[var(--color-muted)] border-opacity-30">
                              {formData.method === PaymentMethodEnum.MANUAL && (
                                <>
                                  <div>
                                    <label className="block text-xs font-medium opacity-80 mb-1">
                                      Payment Ref{" "}
                                      <span className="text-[#EA5E18]">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      name="paymentReference"
                                      value={formData.paymentReference}
                                      onChange={handleInputChange}
                                      className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 ${
                                        fieldErrors.paymentReference
                                          ? "border-red-300 focus:ring-red-400"
                                          : "border-[var(--color-muted)] border-opacity-50 focus:ring-[#EA5E18]"
                                      }`}
                                      placeholder="Transaction ID"
                                    />
                                    {fieldErrors.paymentReference && (
                                      <p className="mt-1 text-xs text-[var(--color-on-error)]">
                                        {fieldErrors.paymentReference}
                                      </p>
                                    )}
                                  </div>
                                  <div className="row-span-2">
                                    <label className="block text-xs font-medium opacity-80 mb-1">
                                      Supporting Doc
                                    </label>
                                    <div
                                      className={`relative border-2 border-dashed rounded-md p-3 text-center transition-all cursor-pointer ${
                                        dragActive
                                          ? "border-[#EA5E18] bg-orange-50"
                                          : "border-[var(--color-muted)] border-opacity-50"
                                      }`}
                                      onDragEnter={handleDrag}
                                      onDragLeave={handleDrag}
                                      onDragOver={handleDrag}
                                      onDrop={handleDrop}
                                    >
                                      <input
                                        type="file"
                                        multiple
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                      />
                                      <div className="pointer-events-none flex flex-col items-center justify-center">
                                        <svg
                                          className="h-6 w-6 opacity-50 mb-1"
                                          stroke="currentColor"
                                          fill="none"
                                          viewBox="0 0 48 48"
                                        >
                                          <path
                                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                            strokeWidth={2}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        </svg>
                                        <p className="text-[10px] opacity-70">
                                          <span className="font-medium text-[#EA5E18]">
                                            Upload
                                          </span>{" "}
                                          or drop (Max 5MB)
                                        </p>
                                      </div>
                                    </div>
                                    {/* File List */}
                                    {files.length > 0 && (
                                      <div className="mt-2 space-y-1">
                                        {files.map((file, index) => (
                                          <div
                                            key={index}
                                            className="border rounded px-2 py-1 flex justify-between items-center text-xs"
                                          >
                                            <span className="truncate max-w-[80%]">
                                              {file.name}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => removeFile(index)}
                                              className="text-red-500 hover:text-red-700"
                                            >
                                              ×
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}

                              {/* Payment Notes */}
                              <div
                                className={
                                  formData.method !== PaymentMethodEnum.MANUAL
                                    ? "col-span-2"
                                    : ""
                                }
                              >
                                <label className="block text-xs font-medium text-[var(--color-on-background)] mb-2">
                                  Notes <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                  name="paymentNote"
                                  value={formData.paymentNote}
                                  onChange={handleInputChange}
                                  rows={
                                    formData.method === PaymentMethodEnum.MANUAL
                                      ? 2
                                      : 2
                                  }
                                  placeholder="Payment remarks..."
                                  className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 resize-none ${
                                    fieldErrors.paymentNote
                                      ? "border-red-300 focus:ring-red-500"
                                      : "border-[var(--color-muted)] border-opacity-50 focus:ring-[#EA5E18]"
                                  }`}
                                />
                              </div>
                            </div>
                          )}

                          {/* Reloan & Excess Amount */}
                          {!isRazorpayAutopay &&
                            formData.paymentDate &&
                            (paymentType === "FULL_PAYMENT" ||
                              (paymentType === "PARTIAL_PAYMENT" &&
                                isAmountApplied &&
                                formData.isPaymentCompleted)) && (
                              <div className="space-y-3 pt-2">
                                {/* Reloan Checkbox */}
                                <label
                                  htmlFor="isReloanApplicable"
                                  className="flex items-center space-x-2 cursor-pointer w-fit"
                                >
                                  <input
                                    id="isReloanApplicable"
                                    type="checkbox"
                                    checked={
                                      formData.isReloanApplicable || false
                                    }
                                    onChange={(e) =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        isReloanApplicable: e.target.checked,
                                        reloanRemark: e.target.checked
                                          ? prev.reloanRemark
                                          : "",
                                      }))
                                    }
                                    className="h-3.5 w-3.5 text-[#EA5E18] rounded focus:ring-[#EA5E18]"
                                  />
                                  <span className="flex items-center text-xs text-[var(--color-on-background)]">
                                    <BiRepeat className="h-3.5 w-3.5 mr-1 text-[#EA5E18]" />
                                    Add Reloan Notification
                                  </span>
                                </label>

                                {formData.isReloanApplicable && (
                                  <div>
                                    <textarea
                                      name="reloanRemark"
                                      value={formData.reloanRemark || ""}
                                      onChange={(e) =>
                                        setFormData((prev) => ({
                                          ...prev,
                                          reloanRemark: e.target.value,
                                        }))
                                      }
                                      rows={2}
                                      placeholder="Reloan remarks..."
                                      className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 resize-none ${
                                        fieldErrors.reloanRemark
                                          ? "border-red-300 focus:ring-red-500"
                                          : "border-[var(--color-muted)] border-opacity-50 focus:ring-[#EA5E18]"
                                      }`}
                                    />
                                    {fieldErrors.reloanRemark && (
                                      <p className="mt-1 text-xs text-[var(--color-on-error)]">
                                        {fieldErrors.reloanRemark}
                                      </p>
                                    )}
                                  </div>
                                )}

                                {/* Excess Amount Logic (Combined Condition) */}
                                {((paymentType === "PARTIAL_PAYMENT" &&
                                  isAmountApplied &&
                                  formData.isPaymentCompleted &&
                                  partialPaymentAmount ===
                                    initialPartialPaymentSummary?.paymentDetails
                                      ?.totalAmountDueAtPayment) ||
                                  (paymentType === "FULL_PAYMENT" &&
                                    formData.amount.total ===
                                      Number(
                                        paymentSummary?.totalRepayment,
                                      ))) && (
                                  <div className="p-3 bg-[var(--color-surface)] bg-opacity-10 border border-[var(--color-warning)] border-opacity-30 rounded-md">
                                    <h4 className="text-xs font-semibold text-yellow-900 mb-1">
                                      Excess Amount
                                    </h4>
                                    <div className="flex gap-2 items-center">
                                      <input
                                        type="number"
                                        value={excessAmount}
                                        onChange={(e) =>
                                          setExcessAmount(
                                            Number(e.target.value),
                                          )
                                        }
                                        disabled={isExcessAmountApplied}
                                        placeholder="Amount"
                                        min="0"
                                        className="w-32 px-3 py-1.5 text-sm rounded border focus:outline-none focus:ring-1 focus:ring-[#EA5E18]"
                                      />
                                      <button
                                        type="button"
                                        onClick={
                                          isExcessAmountApplied
                                            ? handleCancelExcessAmount
                                            : handleApplyExcessAmount
                                        }
                                        disabled={
                                          !isExcessAmountApplied &&
                                          excessAmount <= 0
                                        }
                                        className={`px-3 py-1.5 text-xs font-medium rounded border ${
                                          isExcessAmountApplied
                                            ? "text-[#EA5E18] border-[#EA5E18] hover:bg-orange-50"
                                            : "text-white bg-[#EA5E18] hover:bg-[#d54e14] disabled:opacity-50"
                                        }`}
                                      >
                                        {isExcessAmountApplied
                                          ? "Cancel"
                                          : "Apply"}
                                      </button>
                                    </div>
                                    {isExcessAmountApplied &&
                                      !excessAmountError && (
                                        <p className="mt-2 text-xs text-green-700">
                                          ✓ {excessAmount} excess applied.
                                          Total:{" "}
                                          <span className="font-bold">
                                            {formData.amount.total +
                                              excessAmount}
                                          </span>
                                        </p>
                                      )}
                                    {excessAmountError && (
                                      <p className="mt-1 text-xs text-red-600">
                                        {excessAmountError}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                          {/* Actions */}
                          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-muted)] border-opacity-30">
                            <button
                              type="button"
                              onClick={handleClose}
                              className="px-4 py-2 text-xs font-medium border rounded hover:bg-gray-50"
                              disabled={loading}
                            >
                              Cancel
                            </button>
                            <Button
                              type="submit"
                              className="px-4 py-2 text-xs"
                              disabled={
                                loading ||
                                !formData.method ||
                                paymentRequestsLoading ||
                                loanDetailsLoading ||
                                (paymentType === "PARTIAL_PAYMENT" &&
                                  !isAmountApplied &&
                                  !isRazorpayAutopay)
                              }
                            >
                              {loading ? (
                                <span className="flex items-center gap-1">
                                  <svg
                                    className="animate-spin h-3 w-3"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                  >
                                    <circle
                                      className="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      strokeWidth="4"
                                    />
                                    <path
                                      className="opacity-75"
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                  </svg>
                                  Processing
                                </span>
                              ) : isRazorpayAutopay ? (
                                "Initiate Autopay"
                              ) : formData.method !==
                                PaymentMethodEnum.MANUAL ? (
                                !formData.method ? (
                                  "Select Method"
                                ) : (
                                  `Generate Link`
                                )
                              ) : (
                                "Process Payment"
                              )}
                            </Button>
                          </div>
                        </form>
                      </div>
                    )}
                    {activeTab === TabType.SUMMARY && (
                      <PaymentTransactionsSummary
                        paymentRequests={paymentRequests}
                        loanDetails={loanDetails}
                      />
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}
