import { useState, useEffect } from "react";
import {
  FaExclamationTriangle,
  FaTimes,
  FaRupeeSign,
  FaCalendarAlt,
  FaCheck,
  FaUser,
} from "react-icons/fa";
import Dialog from "../../../../common/dialog";
import { Button } from "../../../../common/ui/button";
import { cn } from "../../../../lib/utils";
import { RejectionReasonsSelector } from "../evaluation/RejectionReasonsSelector";
import { nonRepaymentDatesApi } from "../../../../shared/services/api/settings/nonRepaymentDates.api";
import dayjs from "dayjs";
import { getBrandConfig } from "../../../../shared/services/api/settings/general.setting.api";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  showConfirm: "approve" | "reject" | null;
  isLoanLoading: boolean;
  approvedLoanAmount: number | null;
  setApprovedLoanAmount: (amount: number | null) => void;
  approvedDueDate: string | null;
  setApprovedDueDate: (date: string | null) => void;
  popupError: string | null;
  setPopupError: (error: string | null) => void;
  loanId: string;
  onApprove: (loanId: string, amount: number) => void;
  onReject: (loanId: string) => void;
  brandId?: string;
  loan?: any;
  selectedRejectionReasons: string[];
  setSelectedRejectionReasons: (reasons: string[]) => void;
  rejectionReasonsValid: boolean;
  setRejectionReasonsValid: (valid: boolean) => void;
  salary?: number;
}

interface BrandConfig {
  id: string;
  brandId: string;
  sunday_off: boolean;
  [key: string]: any;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  showConfirm,
  isLoanLoading,
  approvedLoanAmount,
  setApprovedLoanAmount,
  approvedDueDate,
  setApprovedDueDate,
  popupError,
  setPopupError,
  loanId,
  onApprove,
  onReject,
  brandId,
  loan,
  selectedRejectionReasons,
  setSelectedRejectionReasons,
  rejectionReasonsValid,
  setRejectionReasonsValid,
  salary,
}: ConfirmationDialogProps) {
  const [nonRepaymentDates, setNonRepaymentDates] = useState<string[]>([]);
  const [brandConfig, setBrandConfig] = useState<BrandConfig | null>(null);
  const [loadingDates, setLoadingDates] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);

  useEffect(() => {
    if (isOpen && showConfirm === "approve" && brandId) {
      fetchBrandConfig();
      fetchNonRepaymentDates();
    }
  }, [isOpen, showConfirm, brandId]);

  const fetchBrandConfig = async () => {
    if (!brandId) return;

    setLoadingConfig(true);
    try {
      const config = await getBrandConfig(brandId);
      setBrandConfig(config);
    } catch (err) {
      console.error("Failed to fetch brand config:", err);
      // Set default config with sunday_off as true if API fails
      setBrandConfig({
        id: "",
        brandId: brandId,
        sunday_off: true,
      });
    } finally {
      setLoadingConfig(false);
    }
  };

  const fetchNonRepaymentDates = async () => {
    if (!brandId) return;

    setLoadingDates(true);
    try {
      // Fetch all active non-repayment dates for the brand
      const data = await nonRepaymentDatesApi.getNonRepaymentDates(brandId, {
        active: "true",
      });

      // Extract dates and format them as YYYY-MM-DD
      const blockedDates = data
        .filter((date) => date.isActive)
        .map((date) => dayjs(date.date).format("YYYY-MM-DD"));

      setNonRepaymentDates(blockedDates);
    } catch (err) {
      console.error("Failed to fetch non-repayment dates:", err);
    } finally {
      setLoadingDates(false);
    }
  };

  const isDateBlocked = (dateStr: string) => {
    if (!dateStr) return false;

    // Check if it's Sunday and sunday_off is true
    const dayOfWeek = dayjs(dateStr).day();
    const isSundayBlocked = brandConfig?.sunday_off && dayOfWeek === 0;

    if (isSundayBlocked) return true;

    // Check if it's in the non-repayment dates list
    return nonRepaymentDates.includes(dateStr);
  };

  const getBlockedDateMessage = (dateStr: string) => {
    if (!dateStr) return "";

    const dayOfWeek = dayjs(dateStr).day();

    // Check if it's Sunday and sunday_off is true
    if (brandConfig?.sunday_off && dayOfWeek === 0) {
      return "Sundays are blocked for repayments (Sunday Off is enabled)";
    }

    if (nonRepaymentDates.includes(dateStr)) {
      return "This date is a non-repayment holiday";
    }

    return "";
  };

  const handleDateChange = (selectedDate: string) => {
    const isBlocked = isDateBlocked(selectedDate);

    if (isBlocked) {
      setPopupError(getBlockedDateMessage(selectedDate));
    } else {
      setApprovedDueDate(selectedDate);
      if (popupError) setPopupError(null);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`${showConfirm === "approve" ? "Approve" : "Reject"} Application`}
    >
      <div className="space-y-6">
        {showConfirm === "approve" ? (
          <div className="space-y-6">
            {/* Loan Summary Card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
              <h4 className="font-semibold text-[var(--color-on-background)] mb-3 flex items-center gap-2">
                <FaUser className="w-4 h-4 text-[var(--color-on-primary)]" />
                Current Loan Details
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <FaRupeeSign className="w-3 h-3 text-[var(--color-on-surface)] opacity-70" />
                  <span className="text-[var(--color-on-surface)] opacity-70">
                    Requested:
                  </span>
                  <span className="font-semibold text-[var(--color-on-background)]">
                    ₹{loan?.amount?.toLocaleString() || "N/A"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FaCalendarAlt className="w-3 h-3 text-[var(--color-on-surface)] opacity-70" />
                  <span className="text-[var(--color-on-surface)] opacity-70">
                    Due Date:
                  </span>
                  <span className="font-semibold text-[var(--color-on-background)]">
                    {loan?.loanDetails?.dueDate ? (
                      <>
                        {new Date(
                          loan.loanDetails.dueDate
                        ).toLocaleDateString()}
                        <span className="text-[var(--color-on-surface)] opacity-70 ml-1">
                          ({loan.loanDetails.durationDays} days)
                        </span>
                      </>
                    ) : (
                      "N/A"
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FaRupeeSign className="w-3 h-3 text-[var(--color-on-surface)] opacity-70" />
                  <span className="text-[var(--color-on-surface)] opacity-70">
                    Salary:
                  </span>
                  <span className="font-semibold text-[var(--color-on-background)]">
                    ₹{salary?.toLocaleString() || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Approval Form */}
            <div>
              <div className="space-y-4">
                {/* Approved Amount Input */}
                <div>
                  <label
                    htmlFor="approvedLoanAmount"
                    className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2"
                  >
                    Approved Loan Amount <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <FaRupeeSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-on-surface)] opacity-50 w-4 h-4" />
                    <input
                      id="approvedLoanAmount"
                      type="number"
                      value={approvedLoanAmount || ""}
                      onChange={(e) => {
                        setApprovedLoanAmount(Number(e.target.value));
                        if (popupError) setPopupError(null);
                      }}
                      placeholder="Enter approved amount"
                      className={cn(
                        "w-full pl-10 pr-4 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all var(--color-background)",
                        popupError && !approvedLoanAmount
                          ? "border-red-300 bg-[var(--color-error)] bg-opacity-10"
                          : "border-[var(--color-muted)] border-opacity-50"
                      )}
                      min="1"
                      step="1000"
                    />
                  </div>
                  <p className="text-xs text-[var(--color-on-surface)] opacity-70 mt-1">
                    Maximum recommended: ₹
                    {loan?.amount?.toLocaleString() || "N/A"}
                  </p>
                </div>

                {/* Due Date Input */}
                <div>
                  <label
                    htmlFor="approvedDueDate"
                    className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2"
                  >
                    Repayment Due Date <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-on-surface)] opacity-50 w-4 h-4" />
                    <input
                      id="approvedDueDate"
                      type="date"
                      form="mm/dd/yyyy"
                      value={approvedDueDate || ""}
                      onChange={(e) => handleDateChange(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className={cn(
                        "w-full pl-10 pr-4 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all var(--color-background)",
                        (popupError && !approvedDueDate) ||
                          (approvedDueDate && isDateBlocked(approvedDueDate))
                          ? "border-red-300 bg-[var(--color-error)] bg-opacity-10"
                          : "border-[var(--color-muted)] border-opacity-50"
                      )}
                      disabled={loadingDates || loadingConfig}
                    />
                    {(loadingDates || loadingConfig) && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--color-primary)]"></div>
                      </div>
                    )}
                  </div>
                  <div className="mt-1 space-y-1">
                    <p className="text-xs text-[var(--color-on-surface)] opacity-70">
                      Select the final repayment date for this loan
                    </p>
                    {approvedDueDate && isDateBlocked(approvedDueDate) && (
                      <p className="text-xs text-[var(--color-on-error)] flex items-center gap-1">
                        <FaExclamationTriangle className="w-3 h-3" />
                        {getBlockedDateMessage(approvedDueDate)}
                      </p>
                    )}
                    {brandConfig && (
                      <p className="text-xs text-blue-600">
                        {brandConfig.sunday_off
                          ? "✓ Sunday Off is enabled (Sundays are blocked)"
                          : "✓ Sunday Off is disabled (Sundays are allowed)"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {popupError && (
              <div className="flex items-start gap-3 p-4 bg-[var(--color-error)] bg-opacity-10 border border-[var(--color-error)] border-opacity-30 rounded-lg">
                <FaExclamationTriangle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-[var(--color-on-error)] mt-1">
                    {popupError}
                  </p>
                </div>
              </div>
            )}

            <p className="text-[var(--color-on-surface)] opacity-70 text-sm">
              By clicking "Confirm Approval", you are forwarding this
              application to the next approval stage.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-start gap-3 p-4 bg-[var(--color-secondary)] text-on-secondary bg-opacity-10 border border-[var(--color-warning)] border-opacity-30 rounded-lg">
              <FaExclamationTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium ">Confirm Rejection</h4>
                <p className="text-sm  mt-1">
                  Please select rejection reasons before proceeding. This action
                  cannot be undone.
                </p>
              </div>
            </div>

            {/* Rejection Reasons Selector */}
            <div className="bg-[var(--color-background)] border border-[var(--color-muted)] border-opacity-30 rounded-xl p-6">
              <RejectionReasonsSelector
                brandId={brandId || ""}
                selectedReasons={selectedRejectionReasons}
                onReasonsChange={setSelectedRejectionReasons}
                onValidationChange={setRejectionReasonsValid}
                disabled={isLoanLoading}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-[var(--color-muted)] border-opacity-30">
          <Button variant="danger" onClick={onClose} disabled={isLoanLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={isLoanLoading}
            onClick={() =>
              showConfirm === "approve"
                ? onApprove(loanId, approvedLoanAmount || 0)
                : onReject(loanId)
            }
            disabled={
              isLoanLoading ||
              (showConfirm === "reject" && !rejectionReasonsValid) ||
              (showConfirm === "approve" &&
                isDateBlocked(approvedDueDate || ""))
            }
          >
            {isLoanLoading ? (
              <>Processing...</>
            ) : (
              <>
                {showConfirm === "approve" ? (
                  <>
                    <FaCheck className="w-4 h-4" />
                    Confirm Approval{" "}
                    {approvedLoanAmount
                      ? ` - ₹${approvedLoanAmount.toLocaleString()}`
                      : ""}
                    {approvedDueDate
                      ? `, DueDate: ${new Date(
                          approvedDueDate
                        ).toLocaleDateString()}`
                      : ""}
                  </>
                ) : (
                  <>
                    <FaTimes className="w-4 h-4" />
                    Confirm Rejection
                  </>
                )}
              </>
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
