import { useState, useEffect } from "react";
import {
  FiAlertCircle,
  FiArrowRight,
  FiCalendar,
  FiChevronDown,
  FiTarget,
  FiCheck,
} from "react-icons/fi";
import { BiLoaderAlt } from "react-icons/bi";
import { useAppSelector } from "../../../redux/store";
import { createLoan } from "../../../services/api/loans.api";
import {
  getUser,
} from "../../../services/api/web.api";
import { useNavigate } from "react-router-dom";
interface TenureType {
  id: string;
  duration: number;
  unit: string;
}

export default function AmountTenureSelector() {
  const navigate = useNavigate();
  const loanCredibility = useAppSelector((state) => state.loanCredibility);

  // --- Derived Constants ---
  const minAmt = loanCredibility.minAmount;
  const maxAmt = loanCredibility.maxAmount;

  const minTermDays = loanCredibility?.tenures?.minTermDays;
  const maxTermDays = loanCredibility?.tenures?.maxTermDays;

  // --- AI Assessment Helper ---
  const getStoredAssessment = () => {
    const stored = localStorage.getItem("credit_risk_assessment");
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored);
      if (parsed.micro_lending_eligibility && parsed.micro_lending_eligibility.eligible && parsed.micro_lending_eligibility.max_loan_amount_bhd) {
        return parsed.micro_lending_eligibility;
      }
    } catch (e) {
      console.error("Error parsing assessment:", e);
    }
    return null;
  };

  const assessment = getStoredAssessment();

  // --- Initial Calculated States ---
  const initialMaxBhd = assessment ? assessment.max_loan_amount_bhd : 1000;
  const initialRecommendedBhd = assessment 
    ? Number(assessment.recommended_loan_amount_bhd || assessment.max_loan_amount_bhd).toFixed(2)
    : (loanCredibility?.suggestedAmount ? (loanCredibility.suggestedAmount / 242).toFixed(2) : (Math.round((maxAmt + minAmt) / 2) / 242).toFixed(2));

  const initialAmount = assessment 
    ? (assessment.recommended_loan_amount_bhd || assessment.max_loan_amount_bhd) * 242
    : (loanCredibility?.suggestedAmount || Math.round((maxAmt + minAmt) / 2));

  // --- Persistent & Enforced State ---
  const [amount, setAmount] = useState<string | number>(Math.round(Number(initialAmount)));
  const [bhdInputValue, setBhdInputValue] = useState(String(initialRecommendedBhd));
  const [maxBhdAllowed, setMaxBhdAllowed] = useState(initialMaxBhd);

  const [purpose, setPurpose] = useState("");
  const [otherPurpose, setOtherPurpose] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    // Helper to format date as YYYY-MM-DD without timezone issues
    const toDateString = (date: Date | string) => {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    // Use suggested due date if available, otherwise default to 24 days from today
    if (loanCredibility.suggestedDueDate) {
      return toDateString(loanCredibility.suggestedDueDate);
    }
    const d = new Date();
    d.setDate(d.getDate() + 24);
    return toDateString(d);
  });

  // Tenure logic hidden from UI
  const [selectedTenure, setSelectedTenure] = useState<TenureType | null>(null);

  // UI States
  const [isPurposeOpen, setIsPurposeOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showIneligibleModal, setShowIneligibleModal] = useState(false);

  // BHD range enforced at submit time only
  const MIN_BHD = 50;

  // Helper to format date as YYYY-MM-DD without timezone issues
  const toDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const today = new Date();
  const minDateAllowed = new Date(today);
  minDateAllowed.setDate(minDateAllowed.getDate() + minTermDays);
  const maxDateAllowed = new Date(today);
  maxDateAllowed.setDate(maxDateAllowed.getDate() + maxTermDays);

  const minDateStr = toDateString(minDateAllowed);
  const maxDateStr = toDateString(maxDateAllowed);

  // --- Effects ---
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // 1. Prioritize Dynamic Risk Assessment Limits if they changed
    const currentAssessment = getStoredAssessment();
    if (currentAssessment) {
      setMaxBhdAllowed(currentAssessment.max_loan_amount_bhd);
    } else {
      // 2. Fallback to loanCredibility from Redux only if no assessment exists
      if (loanCredibility.suggestedAmount) {
        setAmount(loanCredibility.suggestedAmount);
        setBhdInputValue((loanCredibility.suggestedAmount / 242).toFixed(2));
      } else if (loanCredibility.minAmount) {
        setAmount(loanCredibility.minAmount);
        setBhdInputValue((loanCredibility.minAmount / 242).toFixed(2));
      }
    }

    // 3. Set Tenure independently
    const defaultTenure = Array.isArray(loanCredibility.tenures)
      ? loanCredibility.tenures[0]
      : loanCredibility.tenures;
    if (defaultTenure) setSelectedTenure(defaultTenure);

  }, [
    loanCredibility.minAmount,
    loanCredibility.tenures,
    loanCredibility.suggestedAmount,
  ]);

  // --- Handlers ---
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow only digits and a single decimal point
    if (!/^\d*\.?\d*$/.test(val)) return;
    
    const bhdVal = parseFloat(val);
    
    // Prevent entering amount greater than max allowed
    if (!isNaN(bhdVal) && bhdVal > maxBhdAllowed) {
      setError(`Maximum allowed amount is BHD ${maxBhdAllowed}`);
      return;
    }

    setBhdInputValue(val); // Always update display value as typed
    
    if (val === "" || isNaN(bhdVal)) {
      setAmount("");
    } else {
      setAmount(Math.round(bhdVal * 242));
    }
    if (error) setError(null);
  };

  const handleInputBlur = () => {
    // No auto-clamping; validate only on submit
  };

  const handleDateChange = (dateValue: string) => {
    setDueDate(dateValue);
    if (error) setError(null);
  };

  // Generate all dates between min and max
  const getAllDatesInRange = () => {
    const dates: { value: string; label: string; days: number }[] = [];
    const current = new Date(minDateAllowed);
    const end = new Date(maxDateAllowed);

    while (current <= end) {
      const dateStr = toDateString(current);
      const daysFromNow = Math.ceil(
        (current.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
      dates.push({
        value: dateStr,
        label: new Intl.DateTimeFormat("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
        }).format(current),
        days: daysFromNow,
      });
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const availableDates = getAllDatesInRange();

  const formatCurrency = (val: number) => {
    const bhd = (val / 242).toFixed(2);
    return `BHD ${bhd}`;
  };

  const formatDate = (input?: string | Date | null): string => {
    if (!input) return "";
    let date: Date;
    if (input instanceof Date) {
      date = input;
    } else if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
      const [year, month, day] = input.split("-").map(Number);
      date = new Date(year, month - 1, day);
    } else {
      date = new Date(input as any);
    }
    if (isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const handleCreateLoan = async () => {
    try {
      const bhdAmount = Number(amount) / 242;
      if (!amount || bhdAmount < MIN_BHD || bhdAmount > maxBhdAllowed)
        throw new Error(`Amount must be between BHD ${MIN_BHD} and BHD ${maxBhdAllowed}`);
      if (!purpose) throw new Error("Please select a purpose");
      if (purpose === "Others" && !otherPurpose.trim())
        throw new Error("Please specify the purpose");
      if (!dueDate) throw new Error("Please select a repayment date");
      if (dueDate < minDateStr || dueDate > maxDateStr)
        throw new Error(
          `Repayment date must be between ${formatDate(
            minDateStr,
          )} and ${formatDate(maxDateStr)}`,
        );
      if (!selectedTenure) throw new Error("Loan configuration error");

      setIsSubmitting(true);
      setError(null);

      // 1. Fetch User Summary (to get employmentId and userDetailsId)
      const userSummary = await getUser();
      if (!userSummary) throw new Error("Failed to fetch user summary");


      const finalPurpose = purpose === "Others" ? otherPurpose : purpose;

      const response = await createLoan(userSummary.id, {
        purpose: finalPurpose,
        userId: userSummary.id,
        requestAmount: Number(amount),
        tenureId: selectedTenure.id,
        dueDate: dueDate,
      });

      navigate(`/loan/${response.id}/request`, {
        state: {
          loanId: response.id,
          amount: Number(amount),
          tenure: selectedTenure,
          dueDate: dueDate,
        },
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };


  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="min-h-screen bg-[var(--color-background)] pb-32">

      {/* ---- Ineligibility Modal ---- */}
      {showIneligibleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center animate-fadeIn">
            {/* Icon */}
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-5 rounded-full bg-red-100">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-2">Not Eligible</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Sorry, you are not eligible for a loan at this time based on our risk assessment. Please try again later or contact support.
            </p>

            <button
              onClick={() => setShowIneligibleModal(false)}
              className="w-full py-3 rounded-xl bg-[var(--color-primary)] text-white font-semibold text-sm hover:bg-[var(--color-primary)]/90 transition-all active:scale-95"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Top Background Decoration */}
      <div className="bg-[var(--color-primary)] h-48 w-full absolute top-0 left-0 rounded-b-[2.5rem] shadow-lg z-0" />

      <div className="relative z-10 max-w-lg mx-auto px-4 pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold text-[var(--color-on-primary)] mb-1">
            Loan Application
          </h1>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="bg-red-500 border-l-4 border-[var(--color-error)] p-4 rounded-r-lg shadow-sm mb-6 flex items-start gap-3">
            <FiAlertCircle className="text-white mt-0.5 flex-shrink-0" />
            <p className="text-sm text-white font-medium">
              {error}
            </p> 
          </div>
        )}

        {/* --- Card 1: Amount Input --- */}
        <div className="bg-[var(--color-surface)] rounded-3xl shadow-xl p-6 mb-6">
          <label className="text-gray-500 font-bold text-xs uppercase tracking-wider block mb-4">
            I want to borrow
          </label>
          {!!loanCredibility?.suggestedAmount &&
            loanCredibility?.suggestedDueDate && (
              <div className="mb-6 rounded-2xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 p-5 shadow-sm transition-all duration-300 hover:shadow-lg">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/15">
                    <FiCheck className="text-[var(--color-primary)] text-lg" />
                  </div>

                  {/* Content */}
                  <div className="flex w-full flex-col">
                    {/* Title */}
                    <p className="text-sm font-medium text-gray-700">
                      for instant approval, we recommend borrowing{" "}
                    </p>

                    {/* Amount */}
                    <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:gap-4">
                      <p className="text-2xl font-bold text-[var(--color-primary)]">
                        {formatCurrency(loanCredibility.suggestedAmount)}
                      </p>

                      <span className="mt-2 sm:mt-0 inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                        Repayment by{" "}
                        {formatDate(loanCredibility.suggestedDueDate)}
                      </span>
                    </div>

                    {/* Recommendation badge */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        Recommended
                      </span>
                      <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        Instant Approval
                      </span>
                    </div>

                    {/* Helper text */}
                    <p className="mt-3 text-xs text-gray-500 leading-relaxed">
                      Choosing this amount increases approval speed and may
                      improve your loan terms.
                    </p>
                  </div>
                </div>
              </div>
            )}

          <div className="relative mb-6">
            <div
              className="flex items-center border-2 rounded-2xl px-4 py-3 transition-all duration-200 bg-[var(--color-surface)] border-gray-200 focus-within:border-[var(--color-primary)] focus-within:ring-4 focus-within:ring-[var(--color-primary)]/10"
            >
              <div className="flex flex-col flex-1">
                {/* BHD prefix label */}
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-400">BHD</span>
                  <input
                    type="text"
                    value={bhdInputValue}
                    onChange={handleAmountChange}
                    onBlur={handleInputBlur}
                    placeholder="0.00"
                    maxLength={4}
                    className="w-full text-3xl font-bold text-gray-900 bg-transparent outline-none placeholder-gray-300"
                  />
                </div>
               
              </div>
            </div>

            {/* Range hint */}
            <p className="mt-2 left-1 text-gray-400 text-xs">
              Range: BHD {MIN_BHD} – BHD {maxBhdAllowed}
            </p>
          </div>

          {/* Quick Select Chips */}
          {/* <div className="flex justify-between gap-3 mt-8">
            {[minAmt, Math.round((maxAmt + minAmt) / 2), maxAmt].map((val) => (
              <button
                key={val}
                onClick={() => setAmount(val)}
                className="flex-1 py-3 px-2 text-xs font-semibold text-[var(--color-on-primary)] bg-[var(--color-primary-light)] border border-[var(--color-primary-light)] rounded-xl hover:bg-[var(--color-primary)] hover:border-[var(--color-primary)] hover:scale-105 active:scale-95 transition-all"
              >
                {formatCurrency(val)}
              </button>
            ))}
          </div> */}
        </div>

        {/* --- Card 2: Details (Purpose & Date) --- */}
        <div className="bg-[var(--color-surface)] rounded-3xl shadow-xl p-6 mb-6 space-y-6">
          {/* Purpose Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <FiTarget className="text-[var(--color-primary)] text-lg" />{" "}
              Purpose of Loan
            </label>

            <div className="relative">
              <button
                onClick={() => setIsPurposeOpen(!isPurposeOpen)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all text-left"
              >
                <span
                  className={
                    purpose ? "text-gray-900 font-medium" : "text-gray-400"
                  }
                >
                  {purpose || "Select a reason..."}
                </span>
                <FiChevronDown
                  className={`transition-transform duration-300 ${
                    isPurposeOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <div
                className={`absolute w-full z-30 mt-2 overflow-hidden transition-all duration-200 origin-top ${
                  isPurposeOpen
                    ? "opacity-100 scale-100 translate-y-0"
                    : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                }`}
              >
                <div className="bg-[var(--color-surface)] border border-gray-100 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                  {[
                    "Healthcare",
                    "Personal Expense",
                    "Travel",
                    "Rent",
                    "Others",
                  ].map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setPurpose(p);
                        setIsPurposeOpen(false);
                      }}
                      className="w-full text-left px-5 py-3 hover:bg-[var(--color-primary-light)] text-sm font-medium text-gray-700 border-b border-gray-50 last:border-0 flex justify-between items-center"
                    >
                      {p}
                      {purpose === p && (
                        <FiCheck className="text-[var(--color-success)] text-lg" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {purpose === "Others" && (
              <div className="mt-3 animate-fade-in-down">
                <input
                  type="text"
                  placeholder="Please specify..."
                  value={otherPurpose}
                  onChange={(e) => setOtherPurpose(e.target.value)}
                  className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none transition-all"
                />
              </div>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <FiCalendar className="text-[var(--color-primary)]" />
              Repayment Date
              {dueDate && (
                <span className="ml-auto text-[11px] font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-1 rounded-full">
                  {(() => {
                    const [y, m, d] = dueDate.split("-").map(Number);
                    const selected = new Date(y, m - 1, d);
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    return Math.ceil(
                      (selected.getTime() - now.getTime()) /
                        (1000 * 60 * 60 * 24),
                    );
                  })()}{" "}
                  days
                </span>
              )}
            </label>

            <div className="relative">
              <select
                value={dueDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full p-4 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium appearance-none cursor-pointer focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none transition-all"
              >
                <option value="" disabled>
                  Select repayment date
                </option>
                {availableDates.map((date) => (
                  <option key={date.value} value={date.value}>
                    {date.label} — {date.days} days
                  </option>
                ))}
              </select>
              <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* --- Card 3: Summary --- */}
        {dueDate && amount && (
          <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-primary)]/20 p-5 mb-24 animate-fade-in">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-500 text-sm">Total Request</span>
              <span className="text-gray-900 font-bold text-lg">
                {formatCurrency(Number(amount))}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">Due Date</span>
              <span className="text-gray-900 font-medium">
                {formatDate(dueDate)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* --- Sticky Footer --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleCreateLoan}
            disabled={
              !purpose ||
              !dueDate ||
              dueDate < minDateStr ||
              dueDate > maxDateStr ||
              isSubmitting
            }
            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all transform active:scale-95
              ${
                !purpose ||
                !dueDate ||
                dueDate < minDateStr ||
                dueDate > maxDateStr ||
                isSubmitting
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] shadow-lg shadow-[var(--color-primary)]/20"
              }`}
          >
            {isSubmitting ? (
              <>
                <BiLoaderAlt className="animate-spin text-xl" /> Processing
              </>
            ) : (
              <>
                Apply Now <FiArrowRight />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const LoadingSkeleton = () => (
  <div className="min-h-screen bg-[var(--color-background)] pt-8 px-4 max-w-lg mx-auto">
    <div className="h-8 w-48 bg-gray-200 rounded mx-auto mb-8 animate-pulse" />
    <div className="h-64 bg-[var(--color-surface)] rounded-3xl shadow-sm mb-6 animate-pulse" />
    <div className="h-40 bg-[var(--color-surface)] rounded-3xl shadow-sm mb-6 animate-pulse" />
  </div>
);
