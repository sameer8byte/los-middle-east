import { useState, useEffect } from "react";
import { FaCheckCircle, FaClipboardList, FaCoins } from "react-icons/fa";
import Dialog from "../../../common/dialog";
import { Button } from "../../../common/ui/button";
import { useParams } from "react-router-dom";
import {
  getLoanRuleTenures,
  calculateRepaymentForPartner,
} from "../../../shared/services/api/loan.api";
import {
  saveCAMCalculator,
  getCAMCalculatorByUser,
} from "../../../shared/services/api/cam-calculator.api";
import { FeeValueType, PenaltyType, TaxType } from "../../../constant/enum";
import { toast } from "react-toastify";
type LoanDetails = {
  type: "PAYDAY_LOAN" | string;
  durationDays: number;
  dueDate: string;
};

type DisbursementDeduction = {
  type: string;
  calculation: {
    valueType: "percentage" | string;
    applicable: "request_amount" | string;
    baseAmount: number;
    taxAmount: number;
  };
  chargeMode: "INCLUSIVE" | "EXCLUSIVE" | string;
  total: number;
  taxes: {
    type: string;
    rate: number;
    amount: number;
    isInclusive: boolean;
  }[];
};

type Disbursement = {
  grossAmount: number;
  totalDeductions: number;
  netAmount: number;
  deductions: DisbursementDeduction[];
};

type RepaymentFeeBreakdown = {
  type: string;
  calculation: {
    valueType: "percentage" | string;
    applicable: "each_installment" | string;
    baseAmount: number;
    taxAmount: number;
  };
  chargeMode: "INCLUSIVE" | "EXCLUSIVE" | string;
  total: number;
  taxes: {
    type: string;
    rate: number;
    amount: number;
    isInclusive: boolean;
  }[];
};

type Repayment = {
  totalObligation: number;
  totalFees: number;
  feeBreakdown: RepaymentFeeBreakdown[];
};

type CostSummary = {
  totalTaxes: number;
};

type EarlyRepaymentDiscount = {
  totalAmount: string;
};

type Penalty = {
  type: PenaltyType;
  valueType: FeeValueType;
  chargeValue: number;
  tax: {
    taxType: TaxType;
    taxChargeValue: number;
    taxValueType: FeeValueType;
    isTaxInclusive: boolean;
  };
}[];

type LoanRepaymentData = {
  loanDetails: LoanDetails;
  disbursement: Disbursement;
  repayment: Repayment;
  costSummary: CostSummary;
  earlyRepaymentDiscount: EarlyRepaymentDiscount;
  penalty: Penalty;
};
type FormData = {
  salaryCreditDate1: string;
  salaryCreditDate2: string;
  salaryCreditDate3: string;
  salaryAmount1: string;
  salaryAmount2: string;
  salaryAmount3: string;
  nextPayDate: string;
  salaryVariance: string;
  actualSalary: string;
  eligibleFoir: string;
  loanApplied: string;
  finalFoir: string;
  processingFee: string;
  totalProcessingFee: string;
  repayDate: string;
  tenureId: string;
  repayAmount: string;
  avgSalary: string;
  obligations: string;
  eligibleLoan: string;
  loanRecommended: string;
  foirAchieved: string;
  proposedFoir: string;
  disbursalDate: string;
  salaryFrequency: "monthly" | "fortnightly" | "weekly";
};

const INITIAL_DATA: FormData = {
  salaryCreditDate1: "",
  salaryCreditDate2: "",
  salaryCreditDate3: "",
  salaryAmount1: "",
  salaryAmount2: "",
  salaryAmount3: "",
  nextPayDate: "",
  salaryVariance: "",
  actualSalary: "",
  eligibleFoir: "",
  loanApplied: "",
  finalFoir: "",
  processingFee: "18",
  totalProcessingFee: "",
  repayDate: "",
  tenureId: "",
  repayAmount: "",
  avgSalary: "",
  obligations: "",
  eligibleLoan: "",
  loanRecommended: "",
  foirAchieved: "",
  proposedFoir: "",
  disbursalDate: "",
  salaryFrequency: "monthly",
};

// Utility functions
const parseNum = (val: string): number => Number.parseFloat(val) || 0;

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const calculateAvgSalary = (s1: number, s2: number, s3: number): number => {
  const count = (s1 > 0 ? 1 : 0) + (s2 > 0 ? 1 : 0) + (s3 > 0 ? 1 : 0);
  return count > 0 ? (s1 + s2 + s3) / count : 0;
};

const calculateVariance = (salaries: number[], avgSal: number): number => {
  if (salaries.length < 2) return 0;
  const maxSal = Math.max(...salaries);
  const minSal = Math.min(...salaries);
  return avgSal > 0 ? ((maxSal - minSal) / avgSal) * 100 : 0;
};

const calculateEligibleLoan = (
  avgSal: number,
  eligFoir: number,
  obligations: number
): number => {
  return Math.max(0, avgSal * (eligFoir / 100) - obligations);
};

// --- START OF UI ADJUSTMENTS ---
// Reusable Input Component with adjusted styles for compactness
interface CompactInputFieldProps {
  readonly id: keyof FormData;
  readonly label: string;
  readonly value: string;
  readonly onChange?: (val: string) => void;
  readonly type?: string;
  readonly readOnly?: boolean;
  readonly placeholder?: string;
  readonly required?: boolean;
  readonly step?: string;
  readonly hint?: string;
  readonly error?: string;
}

const getInputClassName = (error: string, readOnly: boolean): string => {
  // Adjusted: py-1.5 instead of py-2, text-xs instead of text-sm
  const baseClass = "w-full px-3 py-1.5 border rounded text-xs transition-all ";
  if (error) return baseClass + "border-red-300 bg-red-50";
  if (readOnly) return baseClass + "bg-gray-50 border-gray-200 text-gray-700";
  return (
    baseClass +
    "border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
  );
};

function CompactInputField({
  id,
  label,
  value,
  onChange,
  type = "text",
  readOnly = false,
  placeholder = "",
  required = false,
  step = "1",
  // hint = "", // Removed hint for compactness
  error = "",
}: Readonly<CompactInputFieldProps>) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        {/* Adjusted: text-xs instead of text-sm */}
        <label htmlFor={id} className="block text-xs font-medium text-gray-600">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {/* {hint && <span className="text-xs text-gray-500 truncate">{hint}</span>} */}
      </div>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        step={step}
        className={getInputClassName(error, readOnly)}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
// --- END OF UI ADJUSTMENTS ---

interface CamCalculatorProps {
  readonly loan?: {
    amount?: number;
    status?: string;
    loanDetails?: {
      durationDays?: number;
      dueDate?: string;
    };
    userId?: string;
    id?: string;
  };
  readonly brandId?: string;
  refresh: boolean;
  setRefresh: (val: boolean) => void;
}

interface TenureOption {
  id: string;
  loanRuleId: string;
  minTermDays: number;
  isActive: boolean;
  loan_type: string;
  allowPrepayment: boolean;
  gracePeriod: number;
  minPostActiveTermDays: number;
  maxTermDays: number;
  minRepaymentDays: number;
  ruleType?: string;
  loan_charge_config?: Array<{
    id: string;
    type: string;
    chargeValue: number;
    valueType: string;
    chargeMode: string;
    isRecurringDaily: boolean;
    loan_charge_taxes?: Array<{
      type: string;
      chargeValue: number;
      valueType: string;
      isInclusive: boolean;
    }>;
  }>;
}

export function CamCalculator({
  loan,
  refresh,
  setRefresh,
}: Readonly<CamCalculatorProps>) {
  const { brandId } = useParams();
  const [isOpen, setIsOpen] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(true);
  const [tenures, setTenures] = useState<TenureOption[]>([]);
  const [loadingTenures, setLoadingTenures] = useState(false);
  const [existingCalculations, setExistingCalculations] = useState<any[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [formData, setFormData] = useState<FormData>(() => ({
    ...INITIAL_DATA,
    disbursalDate: formatDate(new Date()),
    loanApplied: loan?.amount ? loan.amount.toString() : "",
    loanRecommended: loan?.amount ? loan.amount.toString() : "",
  }));
  const [repaymentData, setRepaymentData] = useState<LoanRepaymentData | null>(
    null
  );
  const [repaymentError, setRepaymentError] = useState<string | null>(null);
  const [isCalculatingRepayment, setIsCalculatingRepayment] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [manuallyEditedFields, setManuallyEditedFields] = useState<
    Set<keyof FormData>
  >(new Set());
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const isReadOnly = loan?.status !== "PENDING";

  // Fetch loan rule tenures when dialog opens
  useEffect(() => {
    if (isOpen && brandId && tenures.length === 0) {
      fetchLoanRuleTenures();
      if (loan?.userId) {
        fetchExistingCalculations();
      }
    }
  }, [isOpen, brandId, tenures.length]);

  const calculateRepayment = async (tenureIdOverride?: string) => {
    // Use the override if provided (for immediate calculation after selection)
    // Otherwise use the state value
    const tenureIdToUse = tenureIdOverride || formData.tenureId;
    if (
      !tenureIdToUse ||
      !loan?.userId ||
      !brandId ||
      !formData.loanRecommended
    ) {
      return;
    }

    setIsCalculatingRepayment(true);
    setRepaymentError(null);

    try {
      const repaymentData = await calculateRepaymentForPartner(brandId, {
        userId: loan.userId,
        requestAmount: parseNum(formData.loanRecommended),
        tenureId: tenureIdToUse,
        requestedDueDate: formData.repayDate || null,
      });
      if (repaymentData) {
        setRepaymentData(repaymentData);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to calculate repayment";
      setRepaymentError(errorMessage);
      setRepaymentData(null);
    } finally {
      setIsCalculatingRepayment(false);
    }
  };

  const fetchLoanRuleTenures = async () => {
    if (!brandId) {
      return;
    }

    setLoadingTenures(true);
    try {
      const data = await getLoanRuleTenures(brandId);
      // Flatten the nested structure: extract tenures from each loan rule
      const flattenedTenures: TenureOption[] = data.flatMap((rule: any) => ({
        ...rule.tenures,
        ruleType: rule.ruleType,
      }));
      setTenures(flattenedTenures);
    } catch (error) {
      setTenures([]);
    } finally {
      setLoadingTenures(false);
    }
  };

  const fetchExistingCalculations = async () => {
    if (!loan?.userId || !brandId) return;
    setLoadingExisting(true);
    setLoadingError(null);
    try {
      const result = await getCAMCalculatorByUser(loan.userId, brandId);
      if (result.success && result.data && result.data.length > 0) {
        // Group by loanId and keep only the most recent calculation for each loan
        const latestByLoan = new Map<string, any>();
        result.data.forEach((calc: any) => {
          const existingCalc = latestByLoan.get(calc.loanId);
          if (
            !existingCalc ||
            new Date(calc.createdAt) > new Date(existingCalc.createdAt)
          ) {
            latestByLoan.set(calc.loanId, calc);
          }
        });
        // Convert back to array and sort by creation date (newest first)
        const uniqueCalculations = Array.from(latestByLoan.values()).sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setExistingCalculations(uniqueCalculations);
        if (uniqueCalculations.length > 0) {
          setShowLoadDialog(true);
        }
      } else {
        setShowLoadDialog(false);
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to load calculations";
      setLoadingError(errorMsg);
    } finally {
      setLoadingExisting(false);
    }
  };

  const loadExistingCalculation = (calculationId: string) => {
    const calculation = existingCalculations.find(
      (calc) => calc.loanId === calculationId
    );
    if (calculation) {
      setFormData({
        salaryCreditDate1: calculation.salaryCreditDate1 || "",
        salaryCreditDate2: calculation.salaryCreditDate2 || "",
        salaryCreditDate3: calculation.salaryCreditDate3 || "",
        salaryAmount1: calculation.salaryAmount1?.toString() || "",
        salaryAmount2: calculation.salaryAmount2?.toString() || "",
        salaryAmount3: calculation.salaryAmount3?.toString() || "",
        nextPayDate: calculation.nextPayDate || "",
        salaryVariance: calculation.salaryVariance?.toString() || "",
        actualSalary: calculation.actualSalary?.toString() || "",
        eligibleFoir: calculation.eligibleFoir?.toString() || "",
        loanApplied: calculation.loanApplied?.toString() || "",
        finalFoir: "",
        processingFee: "18",
        totalProcessingFee: "",
        repayDate: calculation.repayDate || "",
        tenureId: calculation.tenureId || "",
        repayAmount: "",
        avgSalary: calculation.avgSalary?.toString() || "",
        obligations: calculation.obligations?.toString() || "",
        eligibleLoan: calculation.eligibleLoan?.toString() || "",
        loanRecommended: calculation.loanRecommended?.toString() || "",
        foirAchieved: calculation.foirAchieved?.toString() || "",
        proposedFoir: calculation.proposedFoir?.toString() || "",
        disbursalDate: calculation.disbursalDate || formatDate(new Date()),
        salaryFrequency: "monthly",
      });

      // FIX: Force the repayment data into state so UI cards appear
      if (calculation?.repaymentData) {
        setRepaymentData(calculation.repaymentData);
      }
      setManuallyEditedFields(new Set(["loanRecommended"]));
      setShowLoadDialog(false);
    }
  };

  // Auto-calculate derived fields
  useEffect(() => {
    calculateDerivedFields();
  }, [
    formData.salaryAmount1,
    formData.salaryAmount2,
    formData.salaryAmount3,
    formData.loanRecommended,
    formData.processingFee,
    formData.disbursalDate,
    formData.repayDate,
    formData.eligibleFoir,
    formData.obligations,
  ]);

  // Update Proposed FOIR when repaymentData is fetched with actual totalObligation
  useEffect(() => {
    if (repaymentData?.repayment?.totalObligation && formData.actualSalary) {
      const actualSalary = parseNum(formData.actualSalary);
      const totalObligation = repaymentData.repayment.totalObligation;
      if (actualSalary > 0 && totalObligation > 0) {
        const proposedFoirValue = (totalObligation / actualSalary) * 100;
        setFormData((prev) => ({
          ...prev,
          proposedFoir: proposedFoirValue.toFixed(2),
        }));
      }
    }
  }, [repaymentData?.repayment?.totalObligation, formData.actualSalary]);

  // Recalculate repayment when critical fields change
  useEffect(() => {
    if (
      formData.tenureId &&
      formData.loanRecommended &&
      loan?.userId &&
      brandId
    ) {
      calculateRepayment();
    }
  }, [
    formData.tenureId,
    formData.loanRecommended,
    formData.repayDate,
  ]);

  // ADDED: useEffect to handle recommended field auto-updates
  useEffect(() => {
    const loanApplied = parseNum(formData.loanApplied);
    const eligibleLoan = parseNum(formData.eligibleLoan);
    const isRecommendedManuallyEdited =
      manuallyEditedFields.has("loanRecommended");
    const currentRecommended = formData.loanRecommended;

    if (
      !isRecommendedManuallyEdited &&
      (loanApplied > 0 || eligibleLoan > 0) &&
      currentRecommended !== ""
    ) {
      const recommendedValue = Math.min(loanApplied, eligibleLoan);

      // Only update if the calculated value is different from current
      if (
        recommendedValue > 0 &&
        recommendedValue !== parseNum(currentRecommended)
      ) {
        setFormData((prev) => ({
          ...prev,
          loanRecommended: recommendedValue.toFixed(2),
        }));
      }
    }
  }, [formData.loanApplied, formData.eligibleLoan, manuallyEditedFields]);

  const calculateDerivedFields = () => {
    const updates: Partial<FormData> = {};

    // Calculate Average Salary
    const sal1 = parseNum(formData.salaryAmount1);
    const sal2 = parseNum(formData.salaryAmount2);
    const sal3 = parseNum(formData.salaryAmount3);

    if (sal1 || sal2 || sal3) {
      const avgSal = calculateAvgSalary(sal1, sal2, sal3);
      updates.avgSalary = avgSal.toFixed(2);
      updates.actualSalary = avgSal.toFixed(2);

      const salaries = [sal1, sal2, sal3].filter((s) => s > 0);
      if (salaries.length > 1) {
        const variance = calculateVariance(salaries, avgSal);
        updates.salaryVariance = variance.toFixed(2);
      }

      // Calculate Eligible Loan
      const eligFoir = parseNum(formData.eligibleFoir);
      const obligations = parseNum(formData.obligations);
      if (eligFoir > 0) {
        const eligLoan = calculateEligibleLoan(avgSal, eligFoir, obligations);
        updates.eligibleLoan = eligLoan.toFixed(2);
      }

      // Calculate FOIR Achieved
      const repayAmt = parseNum(formData.repayAmount);
      if (avgSal > 0 && (repayAmt > 0 || obligations > 0)) {
        const foirAch = ((repayAmt + obligations) / avgSal) * 100;
        updates.foirAchieved = foirAch.toFixed(2);
      }
    }

    // Calculate the minimum of Loan Applied and Eligible Loan
    const loanApplied = parseNum(formData.loanApplied);
    const eligibleLoan = parseNum(
      updates.eligibleLoan || formData.eligibleLoan
    );
    let recommendedValue = 0;
    if (loanApplied > 0 && eligibleLoan > 0) {
      recommendedValue = Math.min(loanApplied, eligibleLoan);
    } else if (loanApplied > 0) {
      recommendedValue = loanApplied;
    } else if (eligibleLoan > 0) {
      recommendedValue = eligibleLoan;
    }

    const isRecommendedManuallyEdited =
      manuallyEditedFields.has("loanRecommended");
    const currentRecommended = formData.loanRecommended;

    if (!isRecommendedManuallyEdited) {
      updates.loanRecommended = recommendedValue.toFixed(2);
    } else if (currentRecommended === "") {
      updates.loanRecommended = "";
    }
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    // If user is typing in the recommended field
    if (field === "loanRecommended") {
      // Mark it as manually edited if it has a value
      if (value !== "" && value !== formData.loanRecommended) {
        setManuallyEditedFields((prev) => new Set(prev).add(field));
      }
      // If user clears the field (empty string), keep it cleared
      if (value === "") {
        setManuallyEditedFields((prev) => new Set(prev).add(field));
        setFormData((prev) => ({ ...prev, [field]: value }));
        return;
      }
    }

    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ADDED: Reset function
  const handleReset = () => {
    setFormData({
      ...INITIAL_DATA,
      disbursalDate: formatDate(new Date()),
      loanApplied: loan?.amount ? loan.amount.toString() : "",
      loanRecommended: loan?.amount ? loan.amount.toString() : "",
    });
    setManuallyEditedFields(new Set()); // Clear the manual edits tracking
    setRepaymentData(null);
    setRepaymentError(null);
  };

  const handleSalaryDateChange = (
    field: "salaryCreditDate1" | "salaryCreditDate2" | "salaryCreditDate3",
    value: string
  ) => {
    const updates: Partial<FormData> = { [field]: value };

    // When first date is set, calculate previous two months going backwards
    if (field === "salaryCreditDate1" && value) {
      const date1 = new Date(value);

      // Go back 1 month for date 2
      const date2 = new Date(date1);
      date2.setMonth(date2.getMonth() - 1);
      updates.salaryCreditDate2 = formatDate(date2);

      // Go back 2 months for date 3
      const date3 = new Date(date1);
      date3.setMonth(date3.getMonth() - 2);
      updates.salaryCreditDate3 = formatDate(date3);

      // Auto-set next pay date (next month)
      const nextPayDate = new Date(date1);
      nextPayDate.setMonth(nextPayDate.getMonth() + 1);
      updates.nextPayDate = formatDate(nextPayDate);
    }

    // When second date is set, auto-calculate first and third
    if (field === "salaryCreditDate2" && value) {
      const date2 = new Date(value);

      // Calculate date 1 (next month)
      const date1 = new Date(date2);
      date1.setMonth(date1.getMonth() + 1);
      updates.salaryCreditDate1 = formatDate(date1);

      // Calculate date 3 (previous month)
      const date3 = new Date(date2);
      date3.setMonth(date3.getMonth() - 1);
      updates.salaryCreditDate3 = formatDate(date3);

      // Auto-set next pay date
      const nextPayDate = new Date(date1);
      nextPayDate.setMonth(nextPayDate.getMonth() + 1);
      updates.nextPayDate = formatDate(nextPayDate);
    }

    // When third date is set, auto-calculate date 1 and 2
    if (field === "salaryCreditDate3" && value) {
      const date3 = new Date(value);

      // Calculate date 2 (next month)
      const date2 = new Date(date3);
      date2.setMonth(date2.getMonth() + 1);
      updates.salaryCreditDate2 = formatDate(date2);

      // Calculate date 1 (two months ahead)
      const date1 = new Date(date3);
      date1.setMonth(date1.getMonth() + 2);
      updates.salaryCreditDate1 = formatDate(date1);

      // Auto-set next pay date
      const nextPayDate = new Date(date1);
      nextPayDate.setMonth(nextPayDate.getMonth() + 1);
      updates.nextPayDate = formatDate(nextPayDate);
    }

    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    if (!loan?.id || !loan?.userId || !brandId) {
      alert("Missing required loan information");
      return;
    }

    try {
      setIsSaving(true);
      const savePayload = {
        loanId: loan.id,
        userId: loan.userId,
        partnerUserId: loan?.userId || "",
        salaryCreditDate1: formData.salaryCreditDate1,
        salaryCreditDate2: formData.salaryCreditDate2,
        salaryCreditDate3: formData.salaryCreditDate3,
        salaryAmount1: formData.salaryAmount1
          ? parseNum(formData.salaryAmount1)
          : undefined,
        salaryAmount2: formData.salaryAmount2
          ? parseNum(formData.salaryAmount2)
          : undefined,
        salaryAmount3: formData.salaryAmount3
          ? parseNum(formData.salaryAmount3)
          : undefined,
        nextPayDate: formData.nextPayDate,
        salaryVariance: formData.salaryVariance
          ? parseNum(formData.salaryVariance)
          : undefined,
        actualSalary: formData.actualSalary
          ? parseNum(formData.actualSalary)
          : undefined,
        eligibleFoir: formData.eligibleFoir
          ? parseNum(formData.eligibleFoir)
          : undefined,
        loanApplied: formData.loanApplied
          ? parseNum(formData.loanApplied)
          : undefined,
        eligibleLoan: formData.eligibleLoan
          ? parseNum(formData.eligibleLoan)
          : undefined,
        loanRecommended: formData.loanRecommended
          ? parseNum(formData.loanRecommended)
          : undefined,
        disbursalDate: formData.disbursalDate,
        repayDate: formData.repayDate,
        tenureId: formData.tenureId,
        avgSalary: formData.avgSalary
          ? parseNum(formData.avgSalary)
          : undefined,
        foirAchieved: formData.foirAchieved
          ? parseNum(formData.foirAchieved)
          : undefined,
        proposedFoir: formData.proposedFoir
          ? parseNum(formData.proposedFoir)
          : undefined,
        obligations: formData.obligations
          ? parseNum(formData.obligations)
          : undefined,
        repaymentData: repaymentData,
      };

      const result = await saveCAMCalculator(brandId, savePayload);

      if (result.success) {
        toast.success("✅ CAM Calculator data saved successfully!");
        setExistingCalculations([result.data, ...existingCalculations]);
        setRefresh(!refresh);
        setIsOpen(false);
      } else {
        alert("❌ " + (result.message || "Failed to save CAM Calculator data"));
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to save CAM Calculator data";
      alert("❌ " + errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const getTenurePlaceholder = () => {
    if (loadingTenures) return "Loading tenures...";
    if (tenures.length === 0) return "No tenures available";
    return "Select a tenure option";
  };

  const renderTenureChargesSection = () => {
    const selectedTenureObj = formData.tenureId
      ? tenures.find((t) => t.id === formData.tenureId)
      : null;

    if (
      !selectedTenureObj ||
      !selectedTenureObj.loan_charge_config ||
      selectedTenureObj.loan_charge_config.length === 0
    ) {
      return null;
    }
    // Reduced padding and font sizes here
    return (
      <div>
        <div className="flex items-center gap-1 mb-2">
          <FaClipboardList className="w-3 h-3 text-blue-600" />
          <h4 className="text-xs font-bold text-gray-900">
            Tenure Charges Configuration
          </h4>
        </div>

        <div className="space-y-1">
          {/* Tenure Info */}
          <div className="bg-white/80 p-2 rounded-lg border border-blue-100 grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-gray-500 text-[10px]">Duration</p>
              <p className="font-bold text-blue-700">
                {selectedTenureObj.minTermDays}-{selectedTenureObj.maxTermDays}d
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-[10px]">Grace Period</p>
              <p className="font-bold text-blue-700">
                {selectedTenureObj.gracePeriod}d
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-[10px]">Repayment</p>
              <p className="font-bold text-blue-700">
                {selectedTenureObj.minRepaymentDays}d
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-[10px]">Type</p>
              <p className="font-bold text-blue-700 text-[10px]">
                {selectedTenureObj.loan_type}
              </p>
            </div>
          </div>

          {/* Charges */}
          {selectedTenureObj.loan_charge_config.map((charge, cidx) => (
            <div
              key={`charge-tenure-${cidx}`}
              className="bg-white/80 p-2 rounded-lg border border-amber-100 hover:shadow-sm transition-shadow"
            >
              <div className="flex justify-between items-start mb-1">
                <div>
                  <p className="text-xs text-gray-600 font-semibold">
                    {charge.type}
                  </p>
                  <div className="flex gap-1 mt-0.5 text-[10px] text-gray-500">
                    <span
                      className={`px-1 py-0.5 rounded ${
                        charge.chargeMode === "INCLUSIVE"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-teal-100 text-teal-700"
                      }`}
                    >
                      {charge.chargeMode.substring(0, 3)}
                    </span>
                    <span className="px-1 py-0.5 bg-gray-100 rounded">
                      {charge.valueType === "percentage"
                        ? charge.chargeValue + "%"
                        : "₹" + charge.chargeValue}
                    </span>
                    {charge.isRecurringDaily && (
                      <span className="px-1 py-0.5 bg-blue-100 text-blue-700 rounded">
                        Daily
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Taxes for this charge */}
              {charge.loan_charge_taxes &&
                charge.loan_charge_taxes.length > 0 && (
                  <div className="ml-2 mt-1 space-y-0.5 border-t pt-1">
                    {charge.loan_charge_taxes.map((tax, tidx) => (
                      <div
                        key={`tax-tenure-${cidx}-${tidx}`}
                        className="flex justify-between text-xs bg-amber-50 p-1 rounded"
                      >
                        <span className="text-gray-700 text-[10px]">
                          <span className="font-medium">{tax.type}:</span>{" "}
                          {tax.valueType === "percentage"
                            ? tax.chargeValue + "%"
                            : "₹" + tax.chargeValue}
                        </span>
                        <span
                          className={`text-[10px] ${
                            tax.isInclusive
                              ? "text-amber-600"
                              : "text-orange-600"
                          }`}
                        >
                          {tax.isInclusive ? "(Incl.)" : "(Excl.)"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderRepaymentDetailsSection = () => {
    if (repaymentData) {
      // Reduced padding and font sizes here
      return (
        <div>
          <div className="flex items-center gap-1 mb-2">
            <FaCoins className="w-3 h-3 text-indigo-600" />
            <h4 className="text-xs font-bold text-gray-900">
              Repayment Details
            </h4>
          </div>

          <div className="space-y-2">
            {/* Disbursement Info */}
            <div className="bg-white/80 p-2 rounded-lg border border-blue-100">
              <p className="text-xs text-gray-600 font-semibold mb-1">
                Disbursement
              </p>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="bg-blue-50 p-1.5 rounded-lg">
                  <p className="text-gray-500 text-[10px]">Gross</p>
                  <p className="font-bold text-blue-700 text-xs">
                    ₹
                    {repaymentData.disbursement?.grossAmount?.toFixed(2) || "0"}
                  </p>
                </div>
                <div className="bg-green-50 p-1.5 rounded-lg">
                  <p className="text-gray-500 text-[10px]">Net</p>
                  <p className="font-bold text-green-700 text-xs">
                    ₹{repaymentData.disbursement?.netAmount?.toFixed(2) || "0"}
                  </p>
                </div>
                <div className="bg-red-50 p-1.5 rounded-lg">
                  <p className="text-gray-500 text-[10px]">Deductions</p>
                  <p className="font-bold text-red-600 text-xs">
                    ₹
                    {repaymentData.disbursement?.totalDeductions?.toFixed(2) ||
                      "0"}
                  </p>
                </div>
              </div>
            </div>

            {/* Repayment Info */}
            <div className="bg-white/80 p-2 rounded-lg border border-green-100">
              <p className="text-xs text-gray-600 font-semibold mb-1">
                Repayment
              </p>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="bg-green-50 p-1.5 rounded-lg col-span-2">
                  <p className="text-gray-500 text-[10px]">Total Obligation</p>
                  <p className="font-bold text-green-700 text-xs">
                    ₹
                    {repaymentData.repayment?.totalObligation?.toFixed(2) ||
                      "0"}
                  </p>
                </div>
                <div className="bg-orange-50 p-1.5 rounded-lg">
                  <p className="text-gray-500 text-[10px]">Fees</p>
                  <p className="font-bold text-orange-600 text-xs">
                    ₹{repaymentData.repayment?.totalFees?.toFixed(2) || "0"}
                  </p>
                </div>
              </div>
            </div>

            {/* Cost Summary */}
            <div className="bg-white/80 p-2 rounded-lg border border-purple-100">
              <p className="text-xs text-gray-600 font-semibold mb-1">
                Cost Summary
              </p>
              <div className="bg-purple-50 p-1.5 rounded-lg">
                <p className="text-gray-500 text-[10px]">Total Taxes</p>
                <p className="font-bold text-purple-700 text-xs">
                  ₹{repaymentData.costSummary?.totalTaxes?.toFixed(2) || "0"}
                </p>
              </div>
            </div>

            {/* Charge Configuration (Deductions) */}
            {repaymentData.disbursement?.deductions &&
              repaymentData.disbursement.deductions.length > 0 && (
                <div className="bg-white/80 p-2 rounded-lg border border-amber-100">
                  <p className="text-xs text-gray-600 font-semibold mb-1">
                    ⚙️ Charges (Deductions)
                  </p>
                  <div className="space-y-1">
                    {repaymentData.disbursement.deductions.map(
                      (charge, idx) => (
                        <div
                          key={`charge-${charge.type}-${idx}`}
                          className="bg-amber-50 p-1.5 rounded-lg text-xs"
                        >
                          <div className="flex justify-between mb-0.5">
                            <span className="text-gray-700 font-medium text-[10px]">
                              {charge.type}
                            </span>
                            <span className="font-bold text-amber-700 text-[10px]">
                              ₹{charge.total?.toFixed(2) || "0"}
                            </span>
                          </div>
                          {charge.taxes && charge.taxes.length > 0 && (
                            <div className="ml-2 text-gray-600 text-[9px] space-y-0.5">
                              {charge.taxes.map((tax, tidx) => (
                                <div
                                  key={`tax-${charge.type}-${tidx}`}
                                  className="flex justify-between"
                                >
                                  <span>
                                    {tax.type}: {tax.rate}%
                                  </span>
                                  <span className="text-amber-600">
                                    ₹{tax.amount?.toFixed(2) || "0"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* Repayment Charges (Fee Breakdown) */}
            {repaymentData.repayment?.feeBreakdown &&
              repaymentData.repayment.feeBreakdown.length > 0 && (
                <div className="bg-white/80 p-2 rounded-lg border border-teal-100">
                  <p className="text-xs text-gray-600 font-semibold mb-1">
                    📋 Fees (Repayment)
                  </p>
                  <div className="space-y-1">
                    {repaymentData.repayment.feeBreakdown.map((fee, idx) => (
                      <div
                        key={`fee-${fee.type}-${idx}`}
                        className="bg-teal-50 p-1.5 rounded-lg text-xs"
                      >
                        <div className="flex justify-between mb-0.5">
                          <span className="text-gray-700 font-medium text-[10px]">
                            {fee.type}
                          </span>
                          <span className="font-bold text-teal-700 text-[10px]">
                            ₹{fee.total?.toFixed(2) || "0"}
                          </span>
                        </div>
                        {fee.taxes && fee.taxes.length > 0 && (
                          <div className="ml-2 text-gray-600 text-[9px] space-y-0.5">
                            {fee.taxes.map((tax, tidx) => (
                              <div
                                key={`fee-tax-${fee.type}-${tidx}`}
                                className="flex justify-between"
                              >
                                <span>
                                  {tax.type}: {tax.rate}%
                                </span>
                                <span className="text-teal-600">
                                  ₹{tax.amount?.toFixed(2) || "0"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3 mb-3">
              <div className="flex items-start gap-2">
                <FaCheckCircle className="text-blue-600 flex-shrink-0 mt-0.5 w-4 h-4" />
                <div>
                  <p className="font-bold text-sm text-blue-900">
                    Proposed FOIR: {formData.proposedFoir || "0"}%
                  </p>
                  <p className="text-xs mt-0.5 text-blue-700">
                    Calculated as: Actual Salary / Total Obligation
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Status/Loading/Error messages also use smaller padding/fonts
    if (repaymentError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
          <div className="flex items-start gap-2">
            <span className="text-base mt-0.5">❌</span>
            <div>
              <p className="text-sm font-semibold text-red-900">
                Calculation Error
              </p>
              <p className="text-xs text-red-700 mt-1">{repaymentError}</p>
            </div>
          </div>
        </div>
      );
    }

    if (isCalculatingRepayment) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-400 border-t-blue-600"></div>
            <p className="text-xs text-blue-700 font-medium">
              Calculating repayment details...
            </p>
          </div>
        </div>
      );
    }

    if (
      formData.tenureId &&
      formData.disbursalDate &&
      formData.repayDate &&
      formData.loanRecommended
    ) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
          <div className="flex items-start gap-2">
            <span className="text-base mt-0.5">⏳</span>
            <div>
              <p className="text-sm font-semibold text-yellow-900">
                Processing
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Fetching repayment details...
              </p>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)}>
        CAM Calculator
        {loan && (
          <span
            className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"
            title="Required for pending loans"
          />
        )}
      </Button>
    );
  }
  return (
    <>
      {showLoadDialog && (
        <Dialog
          onClose={() => setShowLoadDialog(false)}
          isOpen={showLoadDialog}
          title="Load Previous Calculations"
          size="md"
        >
          {/* Header / Summary */}
          <div className="mb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-gray-600">
                  One saved CAM per loan. Select a loan to load the latest saved
                  calculation.
                </p>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-700">
                  <span className="font-semibold">Total:</span>
                  <span>{existingCalculations?.length || 0}</span>
                </div>
              </div>

              <button
                onClick={() => fetchExistingCalculations()}
                disabled={loadingExisting}
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition-all flex items-center gap-1.5"
              >
                {loadingExisting ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border border-slate-300 border-t-slate-700" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    Refresh
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto pr-1">
            {/* Loading State */}
            {loadingExisting && (
              <div className="space-y-2">
                {new Array(1).fill(null).map((_, index) => (
                  <div
                    key={`skeleton-loader-${String.fromCodePoint(97 + index)}`}
                    className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm animate-pulse"
                  >
                    <div className="space-y-3">
                      {/* Badge Skeleton */}
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-20 rounded-full bg-slate-200" />
                      </div>

                      {/* Content Skeleton */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <div className="h-3 w-16 rounded bg-slate-200" />
                          <div className="h-4 w-24 rounded bg-slate-300" />
                        </div>
                        <div className="space-y-1.5">
                          <div className="h-3 w-16 rounded bg-slate-200" />
                          <div className="h-4 w-24 rounded bg-slate-300" />
                        </div>
                      </div>

                      {/* Footer Skeleton */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        <div className="h-3 w-32 rounded-full bg-slate-200" />
                        <div className="h-3 w-24 rounded-full bg-slate-200" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {!loadingExisting && loadingError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 flex-shrink-0">
                    <span className="text-lg">⚠️</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-red-900">
                      Failed to Load Calculations
                    </h3>
                    <p className="text-xs text-red-700 mt-1 break-words">
                      {loadingError}
                    </p>
                    <button
                      onClick={() => fetchExistingCalculations()}
                      className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      🔄 Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Success State - Calculations List */}
            {!loadingExisting &&
              !loadingError &&
              existingCalculations &&
              existingCalculations.length > 0 && (
                <div className="space-y-2 animate-in fade-in duration-300">
                  {existingCalculations.map((calc, idx) => {
                    const foir = parseNum(calc.foirAchieved);
                    const isHighFoir = foir > 50;

                    return (
                      <button
                        key={`calc-${calc.loanId}-${idx}`}
                        onClick={() => loadExistingCalculation(calc.loanId)}
                        className="group w-full text-left transition-all duration-200 hover:scale-[1.01]"
                      >
                        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-blue-300 hover:shadow-lg hover:bg-blue-50 group-active:scale-95">
                          <div className="flex items-start justify-between gap-3">
                            {/* Main Content */}
                            <div className="min-w-0 flex-1">
                              {/* FOIR Badge */}
                              <div className="flex items-center gap-2 mb-2">
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold transition-all ${
                                    isHighFoir
                                      ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                                      : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                  }`}
                                >
                                  {isHighFoir ? "⚠️" : "✓"} FOIR{" "}
                                  {foir ? `${foir.toFixed(1)}%` : "N/A"}
                                </span>
                              </div>

                              {/* Loan Details Grid */}
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                <div className="rounded-lg border border-slate-100 bg-slate-50 p-2 group-hover:bg-blue-100 transition-colors">
                                  <p className="text-[10px] font-semibold text-slate-500">
                                    Recommended
                                  </p>
                                  <p className="text-xs font-bold text-slate-900 group-hover:text-blue-700">
                                    ₹
                                    {parseNum(
                                      calc.loanRecommended
                                    ).toLocaleString("en-IN")}
                                  </p>
                                </div>

                                <div className="rounded-lg border border-slate-100 bg-slate-50 p-2 group-hover:bg-blue-100 transition-colors">
                                  <p className="text-[10px] font-semibold text-slate-500">
                                    Avg Salary
                                  </p>
                                  <p className="text-xs font-bold text-slate-900 group-hover:text-blue-700">
                                    ₹
                                    {parseNum(calc.avgSalary).toLocaleString(
                                      "en-IN"
                                    )}
                                  </p>
                                </div>
                              </div>

                              {/* Metadata */}
                              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 group-hover:bg-slate-200">
                                  <span>📅</span>
                                  {new Date(calc.createdAt).toLocaleDateString(
                                    "en-IN",
                                    {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )}
                                </span>
                                {calc.tenure && (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 group-hover:bg-slate-200">
                                    <span>⏱️</span> {calc.tenure}d
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Action Arrow */}
                            <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg bg-slate-100 group-hover:bg-blue-200 transition-colors">
                              <span className="text-lg group-hover:translate-x-1 transition-transform">
                                →
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

            {/* Empty State */}
            {!loadingExisting &&
              !loadingError &&
              (!existingCalculations || existingCalculations.length === 0) && (
                <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <div className="text-3xl mb-2">📋</div>
                  <p className="text-sm font-semibold text-slate-900">
                    No saved CAM calculations
                  </p>
                  <p className="mt-1 text-xs text-slate-600 max-w-xs mx-auto">
                    Create a new calculation from the CAM Calculator and save it
                    to see it here.
                  </p>
                </div>
              )}
          </div>

          <div className="mt-4 flex items-center justify-end gap-3 border-t border-gray-200 pt-3">
            <button
              onClick={() => setShowLoadDialog(false)}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </Dialog>
      )}

      <Dialog
        onClose={() => setIsOpen(false)}
        isOpen={isOpen && !showLoadDialog}
        title="CAM Calculator"
        size="xl"
      >
        <div className="flex flex-col h-full max-h-[75vh]">
          {/* Scrollable Content (Reduced gap and padding) */}
          <div className="overflow-y-auto flex-1 pr-2">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* Column 1 - Salary Information */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3 pb-1 border-b-2 border-blue-300 flex items-center gap-1">
                  <span className="text-blue-600">💰</span>
                  Last 3 Months Salary
                </h3>

                {/* Salary Date and Amount Grid (Reduced spacing) */}
                <div className="space-y-2">
                  {/* Latest Salary */}
                  <div className="bg-white p-2 rounded-lg border border-blue-200">
                    <h4 className="text-xs font-semibold text-blue-800 mb-2">
                      Latest Salary
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <CompactInputField
                        id="salaryCreditDate1"
                        label="Date"
                        type="date"
                        value={formData.salaryCreditDate1}
                        onChange={(val) =>
                          handleSalaryDateChange("salaryCreditDate1", val)
                        }
                        required
                        readOnly={isReadOnly}
                      />
                      <CompactInputField
                        id="salaryAmount1"
                        label="Amount (₹)"
                        type="number"
                        value={formData.salaryAmount1}
                        onChange={(val) =>
                          handleInputChange("salaryAmount1", val)
                        }
                        placeholder="0"
                        required
                        readOnly={isReadOnly}
                      />
                    </div>
                  </div>

                  {/* 2nd Month Salary */}
                  <div className="bg-white p-2 rounded-lg border border-blue-100">
                    <h4 className="text-xs font-semibold text-blue-700 mb-2">
                      2nd Month
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <CompactInputField
                        id="salaryCreditDate2"
                        label="Date"
                        type="date"
                        value={formData.salaryCreditDate2}
                        onChange={(val) =>
                          handleInputChange("salaryCreditDate2", val)
                        }
                        readOnly={isReadOnly}
                      />
                      <CompactInputField
                        id="salaryAmount2"
                        label="Amount (₹)"
                        type="number"
                        value={formData.salaryAmount2}
                        onChange={(val) =>
                          handleInputChange("salaryAmount2", val)
                        }
                        placeholder="0"
                        readOnly={isReadOnly}
                      />
                    </div>
                  </div>

                  {/* 3rd Month Salary */}
                  <div className="bg-white p-2 rounded-lg border border-blue-100">
                    <h4 className="text-xs font-semibold text-blue-700 mb-2">
                      3rd Month
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <CompactInputField
                        id="salaryCreditDate3"
                        label="Date"
                        type="date"
                        value={formData.salaryCreditDate3}
                        onChange={(val) =>
                          handleInputChange("salaryCreditDate3", val)
                        }
                        readOnly={isReadOnly}
                      />
                      <CompactInputField
                        id="salaryAmount3"
                        label="Amount (₹)"
                        type="number"
                        value={formData.salaryAmount3}
                        onChange={(val) =>
                          handleInputChange("salaryAmount3", val)
                        }
                        placeholder="0"
                        readOnly={isReadOnly}
                      />
                    </div>
                  </div>
                </div>

                {/* Summary Box (Reduced padding and font sizes) */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-2 mt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-600 mb-0.5">
                        Average Salary
                      </p>
                      <p className="text-sm font-bold text-green-700">
                        ₹{formData.avgSalary || "0"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-0.5">Variance</p>
                      <p
                        className={`text-sm font-bold ${
                          parseNum(formData.salaryVariance) > 20
                            ? "text-yellow-600"
                            : "text-gray-900"
                        }`}
                      >
                        {formData.salaryVariance || "0"}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Next Pay Date and Other Info (Reduced spacing) */}
                <div className="space-y-2 mt-3">
                  <CompactInputField
                    id="nextPayDate"
                    label="Next Pay Date"
                    type="date"
                    value={formData.nextPayDate}
                    onChange={(val) => handleInputChange("nextPayDate", val)}
                    readOnly={isReadOnly}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <CompactInputField
                      id="actualSalary"
                      label="Actual Salary (₹)"
                      type="number"
                      value={formData.actualSalary}
                      onChange={(val) => handleInputChange("actualSalary", val)}
                      placeholder="0"
                      readOnly={isReadOnly}
                    />
                    <CompactInputField
                      id="obligations"
                      label="Obligations (₹)"
                      type="number"
                      value={formData.obligations}
                      onChange={(val) => handleInputChange("obligations", val)}
                      placeholder="0"
                      readOnly={isReadOnly}
                    />
                  </div>
                </div>
              </div>

              {/* Column 2 - Loan Details */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3 pb-1 border-b-2 border-purple-300 flex items-center gap-1">
                  <span className="text-purple-600">💳</span>
                  Loan Details
                </h3>

                <div className="space-y-3">
                  {/* FOIR and Eligible Loan */}
                  <div className="bg-white p-2 rounded-lg border border-purple-100">
                    <h4 className="text-xs font-semibold text-purple-800 mb-2">
                      FOIR & Eligibility
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <CompactInputField
                        id="eligibleFoir"
                        label="Eligible FOIR (%)"
                        type="number"
                        value={formData.eligibleFoir}
                        onChange={(val) =>
                          handleInputChange("eligibleFoir", val)
                        }
                        placeholder="0"
                        readOnly={isReadOnly}
                      />
                      <CompactInputField
                        id="eligibleLoan"
                        label="Eligible Loan (₹)"
                        type="number"
                        value={formData.eligibleLoan}
                        readOnly
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Loan Applied and Recommended */}
                  <div className="space-y-2">
                    <CompactInputField
                      id="loanApplied"
                      label="Loan Applied (₹)"
                      type="number"
                      value={formData.loanApplied}
                      readOnly
                    />
                    <CompactInputField
                      id="loanRecommended"
                      label="Recommended (₹)"
                      type="number"
                      value={formData.loanRecommended}
                      onChange={(val) =>
                        handleInputChange("loanRecommended", val)
                      }
                      placeholder="10000"
                      readOnly={isReadOnly}
                    />
                  </div>
                </div>

                {/* Repayment Section */}
                <h3 className="text-sm font-bold text-gray-900 mb-3 mt-4 pb-1 border-b-2 border-purple-300 flex items-center gap-1">
                  <span className="text-purple-600">📅</span>
                  Repayment
                </h3>

                <div className="space-y-3">
                  {/* Dates */}
                  <div className="bg-white p-2 rounded-lg border border-purple-100">
                    <h4 className="text-xs font-semibold text-purple-800 mb-2">
                      Dates
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <CompactInputField
                        id="disbursalDate"
                        label="Disbursal Date"
                        type="date"
                        value={formData.disbursalDate}
                        onChange={(val) =>
                          handleInputChange("disbursalDate", val)
                        }
                        readOnly={isReadOnly}
                      />
                      <CompactInputField
                        id="repayDate"
                        label="Due Date"
                        type="date"
                        value={formData.repayDate}
                        onChange={(val) => handleInputChange("repayDate", val)}
                        readOnly={isReadOnly}
                      />
                    </div>
                  </div>

                  {/* Tenure Selection */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Select Tenure *
                    </label>
                    <select
                      id="tenureSelect"
                      value={formData.tenureId}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        // Update form data first
                        setFormData((prev) => ({
                          ...prev,
                          tenureId: selectedId,
                        }));
                        // Call calculateRepayment with the selected ID
                        if (selectedId) {
                          calculateRepayment(selectedId);
                        }
                      }}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      disabled={
                        tenures.length === 0 || loadingTenures || isReadOnly
                      }
                    >
                      <option value="">{getTenurePlaceholder()}</option>
                      {tenures
                        .filter((tenure) => {
                          const ruleType = tenure.ruleType?.toLowerCase() || "";
                          return [
                            "very_poor",
                            "poor",
                            "medium",
                            "high",
                            "very_high",

                            "low",
                            "moderate",
                            "good",
                            "excellent",
                            "exceptional",

                            "subprime",
                            "near_prime",
                            "prime",
                            "super_prime",
                            "ultra_prime",
                          ].includes(ruleType);
                        })
                        .map((tenure) => {
                          let processingFee = "0%";
                          let interestRate = "0%";

                          // Extract processing fee and interest rate from loan_charge_config
                          if (
                            tenure.loan_charge_config &&
                            tenure.loan_charge_config.length > 0
                          ) {
                            // Find processing fee (type: "processing")
                            const processingConfig =
                              tenure.loan_charge_config.find(
                                (config) => config.type === "processing"
                              );
                            if (processingConfig) {
                              processingFee = `${processingConfig.chargeValue}%`;
                            }

                            // Find interest rate (type: "interest")
                            const interestConfig =
                              tenure.loan_charge_config.find(
                                (config) => config.type === "interest"
                              );
                            if (interestConfig) {
                              interestRate = `${interestConfig.chargeValue}%`;
                            }
                          }

                          return (
                            <option key={tenure.id} value={tenure.id}>
                              {tenure.ruleType?.toUpperCase()} | Processing
                              Fees: {processingFee} | Murabaha margin: {interestRate}
                            </option>
                          );
                        })}
                    </select>
                  </div>

                  {/* Tenure Charges Configuration */}
                  {renderTenureChargesSection()}
                </div>
              </div>

              {/* Column 3 - Status & Summary */}
              <div>{renderRepaymentDetailsSection()}</div>
            </div>
          </div>

          {/* Sticky Action Buttons (Reduced padding and button size) */}
          <div className="sticky bottom-0 mt-3 pt-3 bg-white border-t border-gray-200 flex gap-2 justify-end">
            {/* ONLY show Reset if NOT read-only */}
            {!isReadOnly && (
              <button
                onClick={handleReset}
                className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Reset
              </button>
            )}

            {/* Always show this button, but change text based on mode */}
            <button
              onClick={() => setIsOpen(false)}
              className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              {isReadOnly ? "Close" : "Cancel"}
            </button>

            {/* ONLY show Save if NOT read-only */}
            {!isReadOnly && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:from-blue-400 disabled:to-blue-500 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
              >
                {isSaving && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                )}
                {isSaving ? "Saving..." : "Save Calculation"}
              </button>
            )}
          </div>
        </div>
      </Dialog>
    </>
  );
}
