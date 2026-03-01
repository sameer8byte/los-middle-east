import { useState, useEffect, useRef } from "react";
export type IDFCTransferType = "BENEFIT Fawri+" | "ACH/BENEFIT";
export enum IDFCTransferTypeEnum {
  IMPS = "BENEFIT Fawri+",
  NEFT = "ACH/BENEFIT",
}
import Sidebar from "../../../common/sidebar";
import dayjs from "dayjs";
import {
  BiXCircle,
  BiCheckCircle,
  BiDollarCircle,
  BiUser,
  BiHash,
  BiError,
  BiCalendar,
  BiCreditCard,
  BiLock,
} from "react-icons/bi";
import {
  BrandBankAccountType,
  PaymentMethodEnum,
  BrandProviderType,
  BrandProviderName,
} from "../../../constant/enum";
import { useParams } from "react-router-dom";
import { getLoanDetails } from "../../../shared/services/api/loan.api";
import {
  disburseLoanRequest,
  disburseTransaction,
} from "../../../shared/services/api/payment.api";
import { getBrandBankAccounts } from "../../../shared/services/api/settings/brandBankAccount.setting.api";
import { Loan } from "../../../shared/types/loan";
import Dialog from "../../../common/dialog";
import { Button } from "../../../common/ui/button";
import { useAppSelector } from "../../../shared/redux/store";
import { selectProvidersByType } from "../../../shared/redux/slices/brand.slice";

export function Disburse({
  disburseLoanId,
  onDisbursementComplete,
  onClose,
}: {
  disburseLoanId: string;
  onDisbursementComplete?: () => void;
  onClose?: () => void;
}) {
  const { brandId } = useParams();
  const [accountDetails, setAccountDetails] = useState<
    {
      id: string;
      bankName: string;
      accountNumber: string;
      ifscCode: string;
      branchName: string;
      upiId?: string;
      type: BrandBankAccountType;
      isPrimaryAccount: boolean;
      isActive: boolean;
    }[]
  >([]);
  const apiProviders = useAppSelector((state) =>
    selectProvidersByType(state, BrandProviderType.DISBURSEMENT),
  );
  const [paymentRequest, setPaymentRequest] = useState<{ id: string } | null>(
    null,
  );
  const [isSuccess, setIsSuccess] = useState(false);
  const [provider, setProvider] = useState("");
  const [brandBankAccountId, setBrandBankAccountId] = useState<string | null>(
    null,
  );
  const [externalRef, setExternalRef] = useState("");
  const [disbursementDate, setDisbursementDate] = useState(
    dayjs().format("YYYY-MM-DD"),
  );
  const [idfcTransferType, setIdfcTransferType] =
    useState<IDFCTransferType>("BENEFIT Fawri+");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    provider?: string;
    externalRef?: string;
    disbursementDate?: string;
  }>({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loanDetailsLoading, setLoanDetailsLoading] = useState(false);
  const [loanDetails, setLoanDetails] = useState<Loan | null>(null);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const providerInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens/closes or disburseLoanId changes
  useEffect(() => {
    if (!disburseLoanId) {
      setPaymentRequest(null);
      setIsSuccess(false);
      setProvider("");
      setExternalRef("");
      setDisbursementDate(dayjs().format("YYYY-MM-DD"));
      setError(null);
      setValidationErrors({});
      setLoading(false);
      setShowConfirmation(false);
    }
  }, [disburseLoanId]);

  useEffect(() => {
    const fetchBankDetails = async () => {
      if (!brandId) {
        setError("Brand ID is missing");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await getBrandBankAccounts(brandId);
        setAccountDetails(response || []);
        setError(null);
      } catch (err) {
        setError((err as Error).message || "Failed to fetch bank details.");
      } finally {
        setLoading(false);
      }
    };

    fetchBankDetails();
  }, [brandId]);

  useEffect(() => {
    if (paymentRequest && providerInputRef.current) {
      providerInputRef.current.focus();
    }
  }, [paymentRequest]);

  useEffect(() => {
    const fetchLoanDetails = async () => {
      if (!disburseLoanId || !brandId) return;

      try {
        setLoanDetailsLoading(true);
        const response = await getLoanDetails(brandId, disburseLoanId);
        setLoanDetails(response);
      } catch (error) {
        console.error("Error fetching loan details:", error);
        setError("Failed to fetch loan details");
      } finally {
        setLoanDetailsLoading(false);
      }
    };

    fetchLoanDetails();
  }, [disburseLoanId, brandId]);

  // Clear fields when IDFC or ICICI is selected
  useEffect(() => {
    if (
      provider === PaymentMethodEnum.IDFC ||
      provider === PaymentMethodEnum.ICICI
    ) {
      setExternalRef("");
      setDisbursementDate(dayjs().format("YYYY-MM-DD"));
      setBrandBankAccountId(null);
      // Clear validation errors for disabled fields
      const errors = { ...validationErrors };
      delete errors.externalRef;
      delete errors.disbursementDate;
      setValidationErrors(errors);
    }
  }, [provider]);

  const validateForm = () => {
    const errors: {
      provider?: string;
      externalRef?: string;
      disbursementDate?: string;
    } = {};

    // Provider validation
    if (!provider.trim()) {
      errors.provider = "Payment provider is required";
    } else if (provider.trim().length < 2) {
      errors.provider = "Provider name must be at least 2 characters";
    } else if (provider.trim().length > 50) {
      errors.provider = "Provider name must be less than 50 characters";
    }

    // Skip other validations for IDFC/ICICI Bank
    if (
      provider === PaymentMethodEnum.IDFC ||
      provider === PaymentMethodEnum.ICICI
    ) {
      setValidationErrors(errors);
      return Object.keys(errors).length === 0;
    }

    // External reference validation (only for non-IDFC/ICICI)
    if (!externalRef.trim()) {
      errors.externalRef = "External reference is required";
    } else if (externalRef.trim().length < 3) {
      errors.externalRef = "Reference must be at least 3 characters";
    } else if (externalRef.trim().length > 100) {
      errors.externalRef = "Reference must be less than 100 characters";
    } else if (!/^[a-zA-Z0-9\-_]+$/.test(externalRef.trim())) {
      errors.externalRef =
        "Reference can only contain letters, numbers, hyphens, and underscores";
    }

    // Disbursement date validation (only for non-IDFC/ICICI)
    if (!disbursementDate) {
      errors.disbursementDate = "Disbursement date is required";
    } else {
      const selectedDate = dayjs(disbursementDate);
      const today = dayjs().startOf("day");

      const diffInDays = selectedDate.diff(today, "day");

      if (diffInDays > 0) {
        errors.disbursementDate = "Disbursement date cannot be in the future";
      } else if (diffInDays < -30) {
        errors.disbursementDate =
          "Disbursement date cannot be more than 30 days ago";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateField = (
    fieldName: "provider" | "externalRef" | "disbursementDate",
    value: string,
  ) => {
    const errors: {
      provider?: string;
      externalRef?: string;
      disbursementDate?: string;
    } = {
      ...validationErrors,
    };

    if (fieldName === "provider") {
      if (!value.trim()) {
        errors.provider = "Payment provider is required";
      } else if (value.trim().length < 2) {
        errors.provider = "Provider name must be at least 2 characters";
      } else if (value.trim().length > 50) {
        errors.provider = "Provider name must be less than 50 characters";
      } else {
        delete errors.provider;
      }
    }

    // Skip validation for IDFC/ICICI fields
    if (
      (provider === PaymentMethodEnum.IDFC ||
        provider === PaymentMethodEnum.ICICI) &&
      (fieldName === "externalRef" || fieldName === "disbursementDate")
    ) {
      delete errors[fieldName];
      setValidationErrors(errors);
      return;
    }

    if (fieldName === "externalRef") {
      if (!value.trim()) {
        errors.externalRef = "External reference is required";
      } else if (value.trim().length < 3) {
        errors.externalRef = "Reference must be at least 3 characters";
      } else if (value.trim().length > 100) {
        errors.externalRef = "Reference must be less than 100 characters";
      } else if (!/^[a-zA-Z0-9\-_]+$/.test(value.trim())) {
        errors.externalRef =
          "Reference can only contain letters, numbers, hyphens, and underscores";
      } else {
        delete errors.externalRef;
      }
    }

    if (fieldName === "disbursementDate") {
      if (!value) {
        errors.disbursementDate = "Disbursement date is required";
      } else {
        const selectedDate = dayjs(value);
        const today = dayjs().startOf("day");

        const diffInDays = selectedDate.diff(today, "day");

        if (diffInDays > 0) {
          errors.disbursementDate = "Disbursement date cannot be in the future";
        } else if (diffInDays < -30) {
          errors.disbursementDate =
            "Disbursement date cannot be more than 30 days ago";
        } else {
          delete errors.disbursementDate;
        }
      }
    }

    setValidationErrors(errors);
  };

  const handleDisburse = async () => {
    if (!disburseLoanId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await disburseLoanRequest(disburseLoanId);
      setPaymentRequest(response);
    } catch (err) {
      setError((err as Error).message || "Failed to initiate disbursement");
    } finally {
      setLoading(false);
    }
  };

  const handleDisburseTransaction = async () => {
    if (!disburseLoanId || !paymentRequest?.id) return;

    // Validate password before proceeding
    if (!validatePasswordBeforeDisburse()) {
      return;
    }

    setShowConfirmation(false);
    setLoading(true);
    setError(null);

    try {
      // For IDFC/ICICI, use default values for disabled fields
      const finalExternalRef =
        provider === PaymentMethodEnum.IDFC ||
          provider === PaymentMethodEnum.ICICI
          ? "AUTO_REF"
          : externalRef.trim();
      const finalDisbursementDate =
        provider === PaymentMethodEnum.IDFC ||
          provider === PaymentMethodEnum.ICICI
          ? dayjs().format("YYYY-MM-DD")
          : disbursementDate;
      const finalBrandBankAccountId =
        provider === PaymentMethodEnum.IDFC ||
          provider === PaymentMethodEnum.ICICI
          ? null
          : brandBankAccountId;

      await disburseTransaction(
        paymentRequest.id,
        disburseLoanId,
        provider as PaymentMethodEnum,
        finalExternalRef,
        finalDisbursementDate,
        finalBrandBankAccountId,
        confirmPassword,
        (provider === PaymentMethodEnum.IDFC ||
          provider === PaymentMethodEnum.ICICI)
          ? idfcTransferType : undefined,
      );
      setIsSuccess(true);

      if (onDisbursementComplete) {
        onDisbursementComplete();
      }
    } catch (err) {
      setError((err as Error).message || "Failed to complete disbursement");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setShowConfirmation(true);
    setConfirmPassword("");
    setPasswordError(null);
  };

  const validatePasswordBeforeDisburse = (): boolean => {
    // Password is mandatory for IDFC and ICICI
    if (
      provider === PaymentMethodEnum.IDFC ||
      provider === PaymentMethodEnum.ICICI
    ) {
      if (!confirmPassword.trim()) {
        setPasswordError(`Password is required for ${provider} disbursements`);
        return false;
      }
      if (confirmPassword.trim().length < 4) {
        setPasswordError("Password must be at least 4 characters");
        return false;
      }
    }
    setPasswordError(null);
    return true;
  };

  // Fix form validity check
  const isFormValid = () => {
    // For IDFC/ICICI Bank, only provider selection is required
    if (
      provider === PaymentMethodEnum.IDFC ||
      provider === PaymentMethodEnum.ICICI
    ) {
      return provider.trim().length > 0;
    }

    const hasValues =
      provider.trim().length > 0 &&
      externalRef.trim().length > 0 &&
      disbursementDate.length > 0 &&
      brandBankAccountId !== null;
    const hasNoErrors = Object.keys(validationErrors).length === 0;
    return hasValues && hasNoErrors;
  };

  return (
    <div>
      <Sidebar
        title="Loan Disbursement"
        isOpen={!!disburseLoanId}
        onClose={() => onClose?.()}
      >
        <>
          {loanDetailsLoading ? (
            <div className="mb-6 p-4 bg-[var(--color-primary)] bg-opacity-10 border border-[var(--color-primary)] border-opacity-30 rounded-lg">
              <div className="flex items-center">
                <svg
                  className="animate-spin h-5 w-5 text-[var(--color-on-primary)] mr-3"
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
                <p className="text-sm text-[var(--color-on-primary)]">
                  Loading loan Details
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div>
                {loading && (
                  <div className="text-center py-16">
                    <div className="w-8 h-8 border-2 border-[var(--color-muted)] border-opacity-30 border-t-[#EA5E18] rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-[var(--color-on-surface)] opacity-70 font-medium">
                      Processing disbursement...
                    </p>
                  </div>
                )}

                {error && (
                  <div className="bg-[var(--color-error)] bg-opacity-10 border border-red-100 rounded-lg p-6 mb-8">
                    <div className="flex items-start">
                      <BiXCircle className="w-5 h-5 text-error mt-0.5 mr-3 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-red-900 mb-2">
                          Error
                        </h3>
                        <p className="text-[var(--color-on-error)] mb-4">
                          {error}
                        </p>
                        <button
                          onClick={() => setError(null)}
                          className="var(--color-error) hover:bg-red-700 text-[var(--color-on-primary)] px-4 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {!loading && !error && (
                  <>
                    {isSuccess ? (
                      <div className="text-center py-16">
                        <div className="w-16 h-16 bg-[var(--color-success)] bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-6">
                          <BiCheckCircle className="w-8 h-8 text-[var(--color-on-success)]" />
                        </div>
                        <h2 className="text-2xl font-bold text-[var(--color-on-background)] mb-3">
                          Disbursement Successful
                        </h2>
                        <p className="text-[var(--color-on-surface)] opacity-70 mb-8 max-w-md mx-auto">
                          The loan has been successfully disbursed to the
                          borrower.
                        </p>

                        <div className="bg-[var(--color-background)] rounded-lg p-6 mb-8 text-left max-w-md mx-auto">
                          <div className="space-y-4">
                            <div className="flex justify-between">
                              <span className="text-[var(--color-on-surface)] opacity-70">
                                Provider:
                              </span>
                              <span className="font-medium text-[var(--color-on-background)]">
                                {provider}
                              </span>
                            </div>
                            {provider === PaymentMethodEnum.IDFC && (
                              <div className="flex justify-between">
                                <span className="text-[var(--color-on-surface)] opacity-70">
                                  Transfer Type:
                                </span>
                                <span className="font-medium text-[var(--color-on-background)]">
                                  {idfcTransferType}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-[var(--color-on-surface)] opacity-70">
                                Reference:
                              </span>
                              <span className="font-mono text-sm text-[var(--color-on-background)]">
                                {externalRef}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--color-on-surface)] opacity-70">
                                Date:
                              </span>
                              <span className="font-medium text-[var(--color-on-background)]">
                                {dayjs(disbursementDate).format("MMM DD, YYYY")}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => onClose?.()}
                          className="bg-[#EA5E18] hover:bg-[#d54e0f] text-[var(--color-on-primary)] px-8 py-3 rounded-md font-semibold transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    ) : paymentRequest ? (
                      <div className="space-y-8">
                        {/* Warning */}
                        <div className="bg-[var(--color-secondary)] bg-opacity-10 border border-[var(--color-warning)] border-opacity-30 rounded-lg p-4">
                          <div className="flex items-start">
                            <BiError className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                            <div>
                              <h3 className="font-semibold text-amber-900">
                                Important Notice
                              </h3>
                              <p className="text-[var(--color-on-warning)] mt-1">
                                This action cannot be reversed. Please verify
                                all details before proceeding.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-orange-50  p-4 rounded-xl shadow-sm text-sm text-[var(--color-on-background)]">
                          <div className="flex justify-between mb-2">
                            <span className="font-medium">Loan ID:</span>
                            <span>{loanDetails?.formattedLoanId || "N/A"}</span>
                          </div>

                          <div className="flex justify-between mb-2">
                            <span className="font-medium">
                              Principal Amount:
                            </span>
                            <span className="font-semibold text-[var(--color-on-background)]">
                              ₹{loanDetails?.amount?.toLocaleString() || "0"}
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span className="font-medium">
                              Disbursement Amount:
                            </span>
                            <span className="font-semibold text-[var(--color-on-background)]">
                              ₹
                              {loanDetails?.disbursement?.netAmount?.toLocaleString() ||
                                "0"}
                            </span>
                          </div>
                        </div>

                        {/* IDFC/ICICI Warning */}
                        {(provider === PaymentMethodEnum.IDFC ||
                          provider === PaymentMethodEnum.ICICI) && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                              <div className="flex items-start">
                                <BiError className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                                <div>
                                  <h3 className="font-semibold text-amber-800 mb-2">
                                    {provider === PaymentMethodEnum.IDFC
                                      ? "IDFC"
                                      : "ICICI"}{" "}
                                    Bank Disbursement Notice
                                  </h3>
                                  <p className="text-amber-700 text-sm leading-relaxed">
                                    ⚠️ <strong>Important:</strong> For{" "}
                                    {provider === PaymentMethodEnum.IDFC
                                      ? "IDFC"
                                      : "ICICI"}{" "}
                                    Bank disbursements, clicking "Proceed with
                                    Disbursement" will automatically transfer the
                                    loan amount directly to the customer's primary
                                    bank account. This process is immediate and
                                    cannot be reversed once initiated.
                                  </p>
                                  <p className="text-amber-700 text-sm mt-2">
                                    {provider === PaymentMethodEnum.ICICI
                                      ? "ICICI uses BENEFIT Fawri+ → ACH/BENEFIT fallback for higher success rates."
                                      : "No additional reference details or bank account selection is required."}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                        {/* Form */}
                        <form onSubmit={handleFormSubmit} className="space-y-6">
                          {/* Payment Provider */}
                          <div>
                            <label className="block text-sm font-semibold text-[var(--color-on-background)] mb-3">
                              <BiUser className="inline w-4 h-4 mr-2" />
                              Payment Provider
                            </label>
                            <select
                              value={provider}
                              onChange={(e) => {
                                setProvider(
                                  e.target.value as PaymentMethodEnum,
                                );
                                validateField("provider", e.target.value);
                              }}
                              className={`w-full px-4 py-3 border rounded-md var(--color-background) focus:ring-2 focus:ring-[#EA5E18] focus:border-[#EA5E18] outline-none transition-all ${validationErrors.provider
                                  ? "border-red-300 focus:ring-red-500 focus:border-error"
                                  : "border-[var(--color-muted)] border-opacity-50"
                                }`}
                              required
                            >
                              <option value="" disabled>
                                Select Payment Provider
                              </option>
                              {apiProviders.map((providerItem) => {
                                if (
                                  providerItem.provider ===
                                  BrandProviderName.MANUAL
                                ) {
                                  return (
                                    <option
                                      key={PaymentMethodEnum.MANUAL}
                                      value={PaymentMethodEnum.MANUAL}
                                    >
                                      Manual
                                    </option>
                                  );
                                } else if (
                                  providerItem.provider ===
                                  BrandProviderName.IDFC
                                ) {
                                  return (
                                    <option
                                      key={PaymentMethodEnum.IDFC}
                                      value={PaymentMethodEnum.IDFC}
                                    >
                                      IDFC Bank
                                    </option>
                                  );
                                } else if (
                                  providerItem.provider ===
                                  BrandProviderName.ICICI
                                ) {
                                  return (
                                    <option
                                      key={PaymentMethodEnum.ICICI}
                                      value={PaymentMethodEnum.ICICI}
                                    >
                                      ICICI Bank
                                    </option>
                                  );
                                }
                                return null;
                              })}
                            </select>
                            {validationErrors.provider && (
                              <p className="text-[var(--color-on-error)] text-sm mt-2">
                                {validationErrors.provider}
                              </p>
                            )}
                          </div>

                          {/* IDFC Transfer Type */}
                          {(provider === PaymentMethodEnum.IDFC ||
                            provider === PaymentMethodEnum.ICICI) && (
                              <div>
                                <label className="block text-sm font-semibold text-[var(--color-on-background)] mb-3">
                                  <BiCreditCard className="inline w-4 h-4 mr-2" />
                                  Transfer Type
                                  <span className="text-red-500 ml-1">*</span>
                                </label>
                                <select
                                  value={idfcTransferType}
                                  onChange={(e) =>
                                    setIdfcTransferType(
                                      e.target.value as IDFCTransferType,
                                    )
                                  }
                                  className="w-full px-4 py-3 border border-[var(--color-muted)] border-opacity-50 rounded-md var(--color-background) focus:ring-2 focus:ring-[#EA5E18] focus:border-[#EA5E18] outline-none transition-all"
                                  required
                                >
                                  <option value="IMPS">BENEFIT Fawri+</option>
                                  <option value="NEFT">ACH/BENEFIT</option>
                                </select>
                                <p className="text-[var(--color-on-surface)] opacity-70 text-sm mt-2">
                                  Select the transfer method for IDFC Bank
                                  disbursement
                                </p>
                              </div>
                            )}

                          {/* External Reference */}
                          <div>
                            <label className="block text-sm font-semibold text-[var(--color-on-background)] mb-3">
                              <BiHash className="inline w-4 h-4 mr-2" />
                              External Reference
                            </label>
                            <input
                              type="text"
                              placeholder={
                                provider === PaymentMethodEnum.IDFC
                                  ? "IDFC External Reference disabled"
                                  : provider === PaymentMethodEnum.ICICI
                                    ? "ICICI External Reference disabled"
                                    : "Enter transaction reference"
                              }
                              value={externalRef}
                              onChange={(e) => {
                                setExternalRef(e.target.value);
                                validateField("externalRef", e.target.value);
                              }}
                              disabled={
                                provider === PaymentMethodEnum.IDFC ||
                                provider === PaymentMethodEnum.ICICI
                              }
                              className={`w-full px-4 py-3 border rounded-md var(--color-background) focus:ring-2 focus:ring-[#EA5E18] focus:border-[#EA5E18] outline-none transition-all ${provider === PaymentMethodEnum.IDFC ||
                                  provider === PaymentMethodEnum.ICICI
                                  ? "bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300"
                                  : validationErrors.externalRef
                                    ? "border-red-300 focus:ring-red-500 focus:border-error"
                                    : "border-[var(--color-muted)] border-opacity-50"
                                }`}
                              required={
                                provider !== PaymentMethodEnum.IDFC &&
                                provider !== PaymentMethodEnum.ICICI
                              }
                            />
                            {provider === PaymentMethodEnum.IDFC && (
                              <p className="text-orange-600 text-sm mt-2">
                                External Reference is disabled for IDFC Bank
                              </p>
                            )}
                            {provider === PaymentMethodEnum.ICICI && (
                              <p className="text-blue-600 text-sm mt-2">
                                External Reference is disabled for ICICI Bank
                              </p>
                            )}
                            {validationErrors.externalRef &&
                              provider !== PaymentMethodEnum.IDFC &&
                              provider !== PaymentMethodEnum.ICICI && (
                                <p className="text-[var(--color-on-error)] text-sm mt-2">
                                  {validationErrors.externalRef}
                                </p>
                              )}
                            {provider !== PaymentMethodEnum.IDFC &&
                              provider !== PaymentMethodEnum.ICICI && (
                                <p className="text-[var(--color-on-surface)] opacity-70 text-sm mt-2">
                                  Alphanumeric characters, hyphens, and
                                  underscores only
                                </p>
                              )}
                          </div>

                          {/* Disbursement Date */}
                          <div>
                            <label className="block text-sm font-semibold text-[var(--color-on-background)] mb-3">
                              <BiCalendar className="inline w-4 h-4 mr-2" />
                              Disbursement Date
                            </label>
                            <input
                              type="date"
                              value={disbursementDate}
                              max={dayjs().format("YYYY-MM-DD")}
                              min={dayjs()
                                .subtract(30, "day")
                                .format("YYYY-MM-DD")}
                              onChange={(e) => {
                                setDisbursementDate(e.target.value);
                                validateField(
                                  "disbursementDate",
                                  e.target.value,
                                );
                              }}
                              disabled={
                                provider === PaymentMethodEnum.IDFC ||
                                provider === PaymentMethodEnum.ICICI
                              }
                              className={`w-full px-4 py-3 border rounded-md var(--color-background) focus:ring-2 focus:ring-[#EA5E18] focus:border-[#EA5E18] outline-none transition-all ${provider === PaymentMethodEnum.IDFC ||
                                  provider === PaymentMethodEnum.ICICI
                                  ? "bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300"
                                  : validationErrors.disbursementDate
                                    ? "border-red-300 focus:ring-red-500 focus:border-error"
                                    : "border-[var(--color-muted)] border-opacity-50"
                                }`}
                              required={
                                provider !== PaymentMethodEnum.IDFC &&
                                provider !== PaymentMethodEnum.ICICI
                              }
                            />
                            {provider === PaymentMethodEnum.IDFC && (
                              <p className="text-orange-600 text-sm mt-2">
                                Disbursement Date is disabled for IDFC Bank
                              </p>
                            )}
                            {provider === PaymentMethodEnum.ICICI && (
                              <p className="text-blue-600 text-sm mt-2">
                                Disbursement Date is disabled for ICICI Bank
                              </p>
                            )}
                            {validationErrors.disbursementDate &&
                              provider !== PaymentMethodEnum.IDFC &&
                              provider !== PaymentMethodEnum.ICICI && (
                                <p className="text-[var(--color-on-error)] text-sm mt-2">
                                  {validationErrors.disbursementDate}
                                </p>
                              )}
                            {provider !== PaymentMethodEnum.IDFC &&
                              provider !== PaymentMethodEnum.ICICI && (
                                <p className="text-[var(--color-on-surface)] opacity-70 text-sm mt-2">
                                  Date must be today or earlier, within 30 days
                                </p>
                              )}
                          </div>

                          {/* Bank Account */}
                          <div>
                            <label className="block text-sm font-semibold text-[var(--color-on-background)] mb-3">
                              <BiCreditCard className="inline w-4 h-4 mr-2" />
                              Bank Account
                            </label>
                            <select
                              value={brandBankAccountId || ""}
                              onChange={(e) =>
                                setBrandBankAccountId(e.target.value)
                              }
                              disabled={
                                provider === PaymentMethodEnum.IDFC ||
                                provider === PaymentMethodEnum.ICICI
                              }
                              className={`w-full px-4 py-3 border rounded-md var(--color-background) focus:ring-2 focus:ring-[#EA5E18] focus:border-[#EA5E18] outline-none transition-all ${provider === PaymentMethodEnum.IDFC ||
                                  provider === PaymentMethodEnum.ICICI
                                  ? "bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300"
                                  : !brandBankAccountId
                                    ? "border-red-300"
                                    : "border-[var(--color-muted)] border-opacity-50"
                                }`}
                              required={
                                provider !== PaymentMethodEnum.IDFC &&
                                provider !== PaymentMethodEnum.ICICI
                              }
                            >
                              <option value="" disabled>
                                {provider === PaymentMethodEnum.IDFC
                                  ? "Bank Account selection disabled for IDFC Bank"
                                  : provider === PaymentMethodEnum.ICICI
                                    ? "Bank Account selection disabled for ICICI Bank"
                                    : "Select Bank Account"}
                              </option>
                              {accountDetails.map((account) => (
                                <option key={account.id} value={account.id}>
                                  {`${account.bankName} - ${account.accountNumber} (${account.type})`}
                                </option>
                              ))}
                            </select>
                            {provider === PaymentMethodEnum.IDFC && (
                              <p className="text-orange-600 text-sm mt-2">
                                Bank Account selection is disabled for IDFC Bank
                              </p>
                            )}
                            {provider === PaymentMethodEnum.ICICI && (
                              <p className="text-blue-600 text-sm mt-2">
                                Bank Account selection is disabled for ICICI
                                Bank
                              </p>
                            )}
                            {!brandBankAccountId &&
                              provider !== PaymentMethodEnum.IDFC &&
                              provider !== PaymentMethodEnum.ICICI && (
                                <p className="text-[var(--color-on-error)] text-sm mt-2">
                                  Please select a bank account
                                </p>
                              )}
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-6 border-t border-[var(--color-muted)] border-opacity-30">
                            <div className="flex space-x-4">
                              <button
                                type="button"
                                onClick={() => onClose?.()}
                                className="flex-1 py-3 px-4 border border-[var(--color-muted)] border-opacity-50 text-[var(--color-on-surface)] opacity-80 rounded-md font-semibold hover:bg-[var(--color-background)] transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={loading || !isFormValid()}
                                className={`flex-1 py-3 px-4 rounded-md font-semibold transition-colors ${loading || !isFormValid()
                                    ? "bg-[var(--color-muted)] bg-opacity-50 text-[var(--color-on-surface)] opacity-70 cursor-not-allowed"
                                    : "bg-primary text-[var(--color-on-primary)]"
                                  }`}
                              >
                                {loading
                                  ? "Processing..."
                                  : "Proceed with Disbursement"}
                              </button>
                            </div>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="w-16 h-16 bg-[var(--color-surface)] rounded-full flex items-center justify-center mx-auto mb-6">
                          <BiDollarCircle className="w-8 h-8 text-[var(--color-on-surface)] opacity-70" />
                        </div>
                        <h2 className="text-2xl font-bold text-[var(--color-on-background)] mb-3">
                          Ready to Disburse
                        </h2>
                        <p className="text-[var(--color-on-surface)] opacity-70 mb-8 max-w-md mx-auto">
                          Click below to initiate the loan disbursement process
                          for this borrower.
                        </p>
                        <Button
                          onClick={handleDisburse}
                          disabled={loading}
                          loading={loading}
                        >
                          {loading ? "Initializing..." : "Start Disbursement"}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {showConfirmation && (
                <Dialog
                  onClose={() => setShowConfirmation(false)}
                  isOpen={showConfirmation}
                  title="Confirm Disbursement"
                >
                  <div>
                    {/* Header */}
                    <div className="text-center mb-6">
                      <div className="w-12 h-12 bg-[var(--color-secondary)] bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BiError className="w-6 h-6 text-amber-600" />
                      </div>
                      <h3 className="text-xl font-bold text-[var(--color-on-background)] mb-1">
                        Confirm Disbursement
                      </h3>
                      <p className="text-[var(--color-on-surface)] opacity-70 text-sm">
                        Review the details before proceeding
                      </p>
                    </div>

                    {/* Loan Summary */}
                    <div className="bg-orange-50 p-4 rounded-lg shadow-sm text-sm text-[var(--color-on-background)] mb-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium">Loan ID:</span>
                          <span>{loanDetails?.formattedLoanId || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Principal Amount:</span>
                          <span className="font-semibold text-[var(--color-on-background)]">
                            ₹{loanDetails?.amount?.toLocaleString() || "0"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">
                            Disbursement Amount:
                          </span>
                          <span className="font-semibold text-[var(--color-on-background)]">
                            ₹
                            {loanDetails?.disbursement?.netAmount?.toLocaleString() ||
                              "0"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Metadata Section */}
                    <div className="bg-[var(--color-background)] rounded-lg p-4 mb-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-[var(--color-on-surface)] opacity-70">
                            Provider:
                          </span>
                          <span className="font-medium text-[var(--color-on-background)]">
                            {provider}
                          </span>
                        </div>
                        {provider !== PaymentMethodEnum.IDFC &&
                          provider !== PaymentMethodEnum.ICICI ? (
                          <>
                            <div className="flex justify-between">
                              <span className="text-[var(--color-on-surface)] opacity-70">
                                Reference:
                              </span>
                              <span className="font-mono text-[var(--color-on-background)]">
                                {externalRef}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--color-on-surface)] opacity-70">
                                Date:
                              </span>
                              <span className="font-medium text-[var(--color-on-background)]">
                                {dayjs(disbursementDate).format("MMM DD, YYYY")}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="bg-amber-50 border border-amber-200 rounded p-3 mt-2">
                            <p className="text-amber-800 text-sm font-medium">
                              🏦{" "}
                              {provider === PaymentMethodEnum.IDFC
                                ? "IDFC"
                                : "ICICI"}{" "}
                              Bank Auto-Disbursement
                            </p>
                            <p className="text-amber-700 text-xs mt-1">
                              Funds will be transferred directly to customer's
                              primary account
                            </p>
                            {provider === PaymentMethodEnum.IDFC && (
                              <div className="mt-2 pt-2 border-t border-amber-200">
                                <span className="text-amber-700 text-xs font-medium">
                                  Transfer Type:{" "}
                                </span>
                                <span className="text-amber-900 text-xs font-bold">
                                  {idfcTransferType}
                                </span>
                              </div>
                            )}
                            {provider === PaymentMethodEnum.ICICI && (
                              <div className="mt-2 pt-2 border-t border-amber-200">
                                <span className="text-amber-700 text-xs font-medium">
                                  Mode:{" "}
                                </span>
                                <span className="text-amber-900 text-xs font-bold">
                                  BENEFIT Fawri+ → ACH/BENEFIT Fallback
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Warning */}
                    <div className="bg-[var(--color-error)] bg-opacity-10 border border-[var(--color-error)] border-opacity-30 rounded-lg p-3 mb-6 text-center">
                      <p className="text-[var(--color-on-error)] text-sm font-medium">
                        ⚠️{" "}
                        {provider === PaymentMethodEnum.IDFC ||
                          provider === PaymentMethodEnum.ICICI
                          ? `${provider} disbursement will transfer funds immediately to customer's primary bank account - this action cannot be undone`
                          : "This action cannot be undone"}
                      </p>
                    </div>

                    {/* Password Field - Mandatory for IDFC/ICICI */}
                    {(provider === PaymentMethodEnum.IDFC ||
                      provider === PaymentMethodEnum.ICICI) && (
                        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <label className="block text-sm font-semibold text-[var(--color-on-background)] mb-3">
                            <BiLock className="inline w-4 h-4 mr-2" />
                            Confirm Password
                            <span className="text-red-500 ml-1">*</span>
                            <span className="text-xs font-normal text-amber-600 ml-2">
                              (Required for {provider})
                            </span>
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your password to confirm"
                              value={confirmPassword}
                              onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                if (passwordError) setPasswordError(null);
                              }}
                              className={`w-full px-4 py-3 border rounded-md var(--color-background) focus:ring-2 focus:ring-[#EA5E18] focus:border-[#EA5E18] outline-none transition-all pr-10 ${passwordError
                                  ? "border-red-300 focus:ring-red-500 focus:border-error"
                                  : "border-[var(--color-muted)] border-opacity-50"
                                }`}
                              autoComplete="off"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--color-on-surface)] opacity-60 hover:opacity-100 transition-opacity"
                            >
                              {showPassword ? (
                                <svg
                                  className="w-5 h-5"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                  <path
                                    fillRule="evenodd"
                                    d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  className="w-5 h-5"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                                    clipRule="evenodd"
                                  />
                                  <path d="M15.171 13.576l1.414 1.414a1 1 0 00.707-.293.986.986 0 00.293-.707 1 1 0 00-.293-.707l-.707-.707" />
                                </svg>
                              )}
                            </button>
                          </div>
                          {passwordError && (
                            <p className="text-red-600 text-sm mt-2 font-medium">
                              ❌ {passwordError}
                            </p>
                          )}
                          <p className="text-amber-700 text-xs mt-2 leading-relaxed">
                            Enter your password to authorize this high-value{" "}
                            {provider} bank disbursement.
                          </p>
                        </div>
                      )}

                    {/* Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowConfirmation(false)}
                        className="flex-1 py-3 px-4 border border-[var(--color-muted)] border-opacity-50 text-[var(--color-on-surface)] opacity-80 rounded-md font-semibold hover:bg-[var(--color-background)] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDisburseTransaction}
                        disabled={
                          loading ||
                          ((provider === PaymentMethodEnum.IDFC ||
                            provider === PaymentMethodEnum.ICICI) &&
                            !confirmPassword.trim())
                        }
                        className="flex-1 py-3 px-4 bg-primary text-[var(--color-on-primary)] rounded-md font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? "Processing..." : "Confirm Disbursement"}
                      </button>
                    </div>
                  </div>
                </Dialog>
              )}
            </div>
          )}
        </>
      </Sidebar>
    </div>
  );
}
