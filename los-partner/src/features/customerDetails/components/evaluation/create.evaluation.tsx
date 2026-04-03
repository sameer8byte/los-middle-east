import { useEffect, useState, useCallback } from "react";
import {
  FaPercent,
  FaInfoCircle,
  FaCheck,
  FaTimes,
  FaFileAlt,
  FaChevronLeft,
  FaChevronRight,
  FaSpinner,
  FaExclamationTriangle,
  FaSave,
  FaEdit,
  FaShieldAlt,
  FaCalendarAlt,
  FaRupeeSign,
  FaClock,
  FaUser,
} from "react-icons/fa";
import { useParams } from "react-router-dom";

import { useQueryParams } from "../../../../hooks/useQueryParams";
import Sidebar from "../../../../common/sidebar";
import { cn } from "../../../../lib/utils";

import { LoanStatusEnum } from "../../../../constant/enum";
import { CreditReport } from "../customerCreditReport";
import Dialog from "../../../../common/dialog";
import { toast } from "react-toastify";
import Markdown from "react-markdown";
import {
  getEvaluation,
  updateEvaluationItem,
} from "../../../../shared/services/api/evaluation.api";
import { updateLoan, updateLoanWithReasons } from "../../../../shared/services/api/loan.api";
import { Evaluation, EvaluationItem } from "../../../../shared/types/customers";
import { Loan } from "../../../../shared/types/loan";
import dayjs from "dayjs";
import { Button } from "../../../../common/ui/button";
import { RejectionReasonsSelector } from "./RejectionReasonsSelector";

interface EvaluationProps {
  loan: Loan;
  onLoanStatusUpdate?: (updatedLoan: Partial<Loan>) => void;
}

export function LoanEvaluation({ loan, onLoanStatusUpdate }: EvaluationProps) {
  const { brandId } = useParams();
  const customerId = loan.userId;
  const { getQuery, removeQuery } = useQueryParams();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [localItems, setLocalItems] = useState<EvaluationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoanLoading, setIsLoanLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [showConfirm, setShowConfirm] = useState<"approve" | "reject" | null>(
    null
  );
  const [commentDebounceTimers, setCommentDebounceTimers] = useState<
    Record<string, NodeJS.Timeout>
  >({});

  const [savingComments, setSavingComments] = useState<Record<string, boolean>>(
    {}
  );
  const [updatingOverride, setUpdatingOverride] = useState<
    Record<string, boolean>
  >({});
  const evaluationId = getQuery("evaluationId");
  const [approvedLoanAmount, setApprovedLoanAmount] = useState<number | null>(
    null
  );
  const [approvedDueDate, setApprovedDueDate] = useState<string | null>(null);
  const [popupError, setError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [expandedFeedback, setExpandedFeedback] = useState(false);
  const [filterStatus, setFilterStatus] = useState<
    "ALL" | "ELIGIBLE" | "NOT_ELIGIBLE" | "OVERRIDDEN"
  >("ALL");
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [currentLoanStatus, setCurrentLoanStatus] = useState(loan.status);
  const [selectedRejectionReasons, setSelectedRejectionReasons] = useState<string[]>([]);
  const [rejectionReasonsValid, setRejectionReasonsValid] = useState(false)

  useEffect(() => {
    const fetchEvaluation = async () => {
    if (!evaluationId || !brandId || !customerId) return;
    setIsLoading(true);
    try {
      const response = await getEvaluation(customerId, brandId, evaluationId);
      setEvaluation(response);
      setLocalItems([...response.evaluation_item]);
    } catch (error) {
      toast.error(
        (error as Error).message || "Failed to load evaluation data"
      );
    } finally {
      setIsLoading(false);
    }
  };
  fetchEvaluation();

  }, [brandId, customerId, evaluation?.loanId, evaluationId]);

  const handleToggleOverride = async (itemId: string) => {
    if (!evaluation || !brandId) return;
    const item = localItems.find((i) => i.id === itemId);
    if (!item) return;

    const newOverride = !item.override;
    const previousOverride = item.override;

    setUpdatingOverride((prev) => ({ ...prev, [itemId]: true }));
    setLocalItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, override: newOverride } : i))
    );

    try {
      await updateEvaluationItem(evaluation.userId, brandId, evaluation.id, {
        id: itemId,
        status: item.status,
        override: newOverride,
        comments: item.comments,
      });
      toast.success(
        `Override ${newOverride ? "enabled" : "disabled"} successfully`
      );
    } catch (error) {
      setLocalItems((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, override: previousOverride } : i
        )
      );
      toast.error((error as Error).message || "Failed to update override");
    } finally {
      setUpdatingOverride((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  const handleStatusChange = async (
    itemId: string,
    newStatus: "ELIGIBLE" | "NOT_ELIGIBLE"
  ) => {
    if (!evaluation || !brandId) return;
    const item = localItems.find((i) => i.id === itemId);
    if (!item) return;

    const previousStatus = item.status;

    setLocalItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, status: newStatus } : i))
    );

    try {
      await updateEvaluationItem(evaluation.userId, brandId, evaluation.id, {
        id: itemId,
        status: newStatus,
        override: item.override,
        comments: item.comments,
      });
      // showToast("success", `Status updated to ${newStatus.toLowerCase()}`);
      toast.success(`Status updated to ${newStatus.toLowerCase()}`);
    } catch (error) {
      setLocalItems((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, status: previousStatus } : i
        )
      );
      // showToast("error", (error as Error).message || "Failed to update status");
      toast.error((error as Error).message || "Failed to update status");
    }
  };

  // Debounced comment update function
  const debouncedCommentUpdate = useCallback(
    (itemId: string, value: string) => {
      if (!evaluation || !brandId) return;

      // Clear existing timer for this item
      if (commentDebounceTimers[itemId]) {
        clearTimeout(commentDebounceTimers[itemId]);
      }

      setSavingComments((prev) => ({ ...prev, [itemId]: true }));

      // Set new timer
      const timer = setTimeout(async () => {
        try {
          await updateEvaluationItem(
            evaluation.userId,
            brandId,
            evaluation.id,
            {
              id: itemId,
              status:
                localItems.find((i) => i.id === itemId)?.status ||
                "NOT_ELIGIBLE",
              override:
                localItems.find((i) => i.id === itemId)?.override || false,
              comments: value,
            }
          );
          toast.success("Comment saved");
        } catch (error) {
          toast.error((error as Error).message || "Failed to save comment");
        } finally {
          setSavingComments((prev) => ({ ...prev, [itemId]: false }));
        }
      }, 1500); // Increased debounce time

      setCommentDebounceTimers((prev) => ({
        ...prev,
        [itemId]: timer,
      }));
    },
    [evaluation, brandId, localItems, commentDebounceTimers]
  );

  const handleCommentChange = (itemId: string, value: string) => {
    // Update local state immediately
    setLocalItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, comments: value } : i))
    );

    // Debounce the API call
    debouncedCommentUpdate(itemId, value);
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      Object.values(commentDebounceTimers).forEach((timer) =>
        clearTimeout(timer)
      );
    };
  }, [commentDebounceTimers]);

  const handleReject = async (loanId: string) => {
    if (!loanId || !brandId) return;
    setIsLoanLoading(true);
    try {
      await updateLoanWithReasons(loanId, brandId, {
        loanId,
        status: LoanStatusEnum.REJECTED,
        reason: notes,
        brandStatusReasonIds: selectedRejectionReasons,
      });

      setCurrentLoanStatus(LoanStatusEnum.REJECTED);

      if (onLoanStatusUpdate) {
        onLoanStatusUpdate({
          id: loanId,
          status: LoanStatusEnum.REJECTED,
        });
      }

      setShowSuccessAnimation(true);
      toast.success("Application rejected successfully");

        removeQuery("evaluationId");
    } catch (error) {
      toast.error((error as Error).message || "Failed to reject application");
    } finally {
      setIsLoanLoading(false);
      setShowConfirm(null);
    }
  };

  const handleApprove = async (loanId: string, amount: number) => {
    if (!loanId || !brandId) return;
    setIsLoanLoading(true);

    if (!amount || amount <= 0) {
      setError("Please enter a valid loan amount");
      setIsLoanLoading(false);
      return;
    }
    if (!approvedDueDate) {
      setError("Please select a due date for the loan repayment");
      setIsLoanLoading(false);
      return;
    }

    try {
      await updateLoan(loanId, brandId, {
        loanId,
        status: LoanStatusEnum.CREDIT_EXECUTIVE_APPROVED,
        reason: notes,
        approvedLoanAmount: amount,
        approvedDueDate: dayjs(approvedDueDate).format("YYYY-MM-DD"),
      });

      // Update local state immediately
      setCurrentLoanStatus(LoanStatusEnum.CREDIT_EXECUTIVE_APPROVED);

      // Notify parent component about the status change
      if (onLoanStatusUpdate) {
        onLoanStatusUpdate({
          id: loanId,
          status: LoanStatusEnum.CREDIT_EXECUTIVE_APPROVED,
          amount: amount,
          approvalDate: new Date().toISOString(),
        });
      }

      // Show success animation
      setShowSuccessAnimation(true);
      toast.success("Application approved and forwarded successfully");
        removeQuery("evaluationId");
      setShowConfirm(null);
    } catch (error) {
      setError((error as Error).message || "Failed to approve application");
    } finally {
      setIsLoanLoading(false);
    }
  };

  const totalCategories = localItems.length;
  const categoriesPassed = localItems.filter(
    (item) => item.status === "ELIGIBLE"
  ).length;
  const overrideCount = localItems.filter((item) => item.override).length;
  const overallEligibility =
    totalCategories > 0
      ? Math.round((categoriesPassed / totalCategories) * 100)
      : 0;

  // Filter items based on selected filter
  const filteredItems = localItems.filter((item) => {
    if (filterStatus === "ALL") return true;
    if (filterStatus === "OVERRIDDEN") return item.override;
    return item.status === filterStatus;
  });

  // Enhanced loading state
  if (isLoading) {
    return (
      <Sidebar
        title="Credit Evaluation"
        isOpen={!!evaluationId}
        width="w-full max-full"
        onClose={() => removeQuery("evaluationId")}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border border-[var(--color-primary)] border-opacity-30 border-t-blue-600 mx-auto"></div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-[var(--color-on-surface)] opacity-80">
                Loading Evaluation
              </h3>
              <p className="text-[var(--color-on-surface)] opacity-70">
                Fetching assessment data...
              </p>
            </div>
          </div>
        </div>
      </Sidebar>
    );
  }

  return (
    <div>
      {/* Success Animation Overlay */}
      {showSuccessAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="var(--color-background) rounded-2xl p-8 shadow-2xl max-w-md mx-4 text-center transform animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-[var(--color-success)] bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaCheck className="w-8 h-8 text-[var(--color-on-success)] animate-bounce" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--color-on-background)] mb-2">
              {currentLoanStatus === LoanStatusEnum.REJECTED
                ? "Application Rejected"
                : "Application Approved"}
            </h3>
            <p className="text-[var(--color-on-surface)] opacity-70">
              {currentLoanStatus === LoanStatusEnum.REJECTED
                ? "The loan application has been rejected successfully."
                : "The loan application has been approved and forwarded to the next stage."}
            </p>
            <div className="mt-4">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border border-[var(--color-success)] border-opacity-30 border-t-green-600 mx-auto"></div>
              <p className="text-sm text-[var(--color-on-surface)] opacity-70 mt-2">
                Updating status...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Dialog with better UX */}
      <Dialog
        isOpen={!!showConfirm}
        onClose={() => {
          setShowConfirm(null);
          setError(null);
          setApprovedLoanAmount(null);
          setApprovedDueDate(null);
          setSelectedRejectionReasons([]);
          setRejectionReasonsValid(false);
        }}
        title={`${
          showConfirm === "approve" ? "Approve" : "Reject"
        } Application`}
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
                      BHD{loan?.amount?.toLocaleString() || "N/A"}
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
                </div>
              </div>

              {/* Approval Form */}
              <div className="var(--color-background) border border-[var(--color-muted)] border-opacity-30 rounded-xl p-6 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-[var(--color-on-background)] flex items-center gap-2">
                    <FaShieldAlt className="w-5 h-5 text-[var(--color-on-success)]" />
                    Approval Details
                  </h3>
                  <p className="text-sm text-[var(--color-on-surface)] opacity-70 mt-1">
                    Please review and specify the approved loan terms carefully.
                  </p>
                </div>

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
                          if (popupError) setError(null);
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
                      Maximum recommended: BHD
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
                        onChange={(e) => {
                          setApprovedDueDate(e.target.value);
                          if (popupError) setError(null);
                        }}
                        min={new Date().toISOString().split("T")[0]}
                        className={cn(
                          "w-full pl-10 pr-4 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all var(--color-background)",
                          popupError && !approvedDueDate
                            ? "border-red-300 bg-[var(--color-error)] bg-opacity-10"
                            : "border-[var(--color-muted)] border-opacity-50"
                        )}
                      />
                    </div>
                    <p className="text-xs text-[var(--color-on-surface)] opacity-70 mt-1">
                      Select the final repayment date for this loan
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {popupError && (
                <div className="flex items-start gap-3 p-4 bg-[var(--color-error)] bg-opacity-10 border border border-[var(--color-error)] border-opacity-30 rounded-lg">
                  <FaExclamationTriangle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-[var(--color-on-error)]">
                      Validation Error
                    </h4>
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
              <div className="flex items-start gap-3 p-4 bg-[var(--color-secondary)] bg-opacity-10 border border-[var(--color-warning)] border-opacity-30 rounded-lg">
                <FaExclamationTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-[var(--color-warning)]">
                    Confirm Rejection
                  </h4>
                  <p className="text-sm text-amber-700 mt-1">
                    Please select rejection reasons before proceeding. This action cannot be undone.
                  </p>
                </div>
              </div>

              {/* Rejection Reasons Selector */}
              <div className="bg-[var(--color-background)] border border-[var(--color-muted)] border-opacity-30 rounded-xl p-6">
                <RejectionReasonsSelector
                  brandId={brandId || ''}
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
            <Button
              variant="danger"
              onClick={() => {
                setShowConfirm(null);
                setError(null);
                setApprovedLoanAmount(null);
                setApprovedDueDate(null);
                setSelectedRejectionReasons([]);
                setRejectionReasonsValid(false);
              }}
              disabled={isLoanLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={isLoanLoading}
              onClick={() =>
                showConfirm === "approve"
                  ? handleApprove(
                      evaluation?.loanId || "",
                      approvedLoanAmount || 0
                    )
                  : handleReject(evaluation?.loanId || "")
              }
              disabled={isLoanLoading || (showConfirm === "reject" && !rejectionReasonsValid)}
 
            >
              {isLoanLoading ? (
                <>
                  Processing...
                </>
              ) : (
                <>
                  {showConfirm === "approve" ? (
                    <>
                      <FaCheck className="w-4 h-4" />
                      Confirm Approval
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

      <Sidebar
        title="Credit Evaluation"
        isOpen={!!evaluationId}
        width="w-full max-full"
        onClose={() => removeQuery("evaluationId")}
      >
        <div className="relative flex h-full overflow-hidden bg-[var(--color-background)]">
          {/* Main Content Area */}
          <div
            className={`transition-all duration-300 ease-in-out flex flex-col h-full var(--color-background) ${
              showSummary ? "w-2/3" : "w-full"
            }`}
          >
            {/* Enhanced Header with Status Indicator */}
            <div className="flex-shrink-0 var(--color-background) border-b border-[var(--color-muted)] border-opacity-30 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Status Badge */}
                  <div
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg border font-semibold text-sm",
                      currentLoanStatus === LoanStatusEnum.PENDING
                        ? "bg-[var(--color-secondary)] bg-opacity-10 border border-[var(--color-warning)] border-opacity-30 text-[var(--color-warning)]"
                        : currentLoanStatus === LoanStatusEnum.REJECTED
                        ? "bg-[var(--color-error)] bg-opacity-10 border border-[var(--color-error)] border-opacity-30 text-[var(--color-on-error)]"
                        : currentLoanStatus ===
                          LoanStatusEnum.CREDIT_EXECUTIVE_APPROVED
                        ? "bg-[var(--color-success)] bg-opacity-10 border border-[var(--color-success)] border-opacity-30 text-[var(--color-on-success)]"
                        : "bg-[var(--color-background)] border-[var(--color-muted)] border-opacity-30 text-[var(--color-on-surface)] opacity-80"
                    )}
                  >
                    {currentLoanStatus === LoanStatusEnum.PENDING && (
                      <FaClock className="w-4 h-4" />
                    )}
                    {currentLoanStatus === LoanStatusEnum.REJECTED && (
                      <FaTimes className="w-4 h-4" />
                    )}
                    {currentLoanStatus ===
                      LoanStatusEnum.CREDIT_EXECUTIVE_APPROVED && (
                      <FaCheck className="w-4 h-4" />
                    )}
                    Current Status: {currentLoanStatus?.replace(/_/g, " ")}
                  </div>

                  <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] bg-opacity-10 rounded-lg border border-blue-100">
                    <FaFileAlt className="w-4 h-4 text-[var(--color-on-primary)]" />
                    <span className="text-sm font-semibold text-[var(--color-on-primary)]">
                      {totalCategories} Parameters
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-success)] bg-opacity-10 rounded-lg border border-green-100">
                    <FaCheck className="w-4 h-4 text-[var(--color-on-success)]" />
                    <span className="text-sm font-semibold text-[var(--color-on-success)]">
                      {categoriesPassed} Passed
                    </span>
                  </div>
                  {overrideCount > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-secondary)] bg-opacity-10 rounded-lg border border-amber-100">
                      <FaEdit className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-semibold text-amber-700">
                        {overrideCount} Overridden
                      </span>
                    </div>
                  )}
                </div>

                {/* Summary Toggle Button */}
                <button
                  onClick={() => setShowSummary(!showSummary)}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-on-primary)] rounded-lg transition-all duration-200 shadow-sm hover:shadow-md font-medium"
                >
                  {showSummary ? (
                    <>
                      <FaChevronRight className="w-3 h-3" />
                      Hide Summary
                    </>
                  ) : (
                    <>
                      <FaChevronLeft className="w-3 h-3" />
                      Show Summary
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Scrollable Main Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Enhanced Eligibility Score Card */}
              <div className="relative overflow-hidden">
                <div className="bg-surface border-secondary border-2 p-8 rounded-2xl shadow-xl">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
                      {/* Left Side - Text Info */}
                      <div>
                        <h3 className="text-lg font-medium text-gray-800 mb-2">
                          Overall Eligibility Score
                        </h3>

                        <div className="flex items-center space-x-3">
                          <span className="text-4xl font-bold text-gray-900">
                            {overallEligibility}
                          </span>
                          <span className="text-lg text-gray-600">%</span>

                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-sm font-medium",
                              overallEligibility >= 80
                                ? "bg-green-100 text-green-700"
                                : overallEligibility >= 60
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            )}
                          >
                            {overallEligibility >= 80
                              ? "Excellent"
                              : overallEligibility >= 60
                              ? "Good"
                              : "Needs Review"}
                          </span>
                        </div>
                      </div>

                      {/* Right Side - Icon */}
                      <div className="w-14 h-14 flex items-center justify-center rounded-full bg-gray-100">
                        <FaPercent className="w-6 h-6 text-gray-500" />
                      </div>
                    </div>

                    {/* Enhanced Progress Bar */}
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm text-[var(--color-on-primary)]/80">
                        <span>Assessment Progress</span>
                        <span>
                          {categoriesPassed} of {totalCategories} criteria met
                        </span>
                      </div>
                      <div className="h-3 var(--color-background)/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-400 via-blue-300 to-purple-300 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${overallEligibility}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Background Pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-6 right-6 w-32 h-32 rounded-full var(--color-background) animate-pulse" />
                    <div className="absolute bottom-6 left-6 w-20 h-20 rounded-full var(--color-background) animate-pulse delay-1000" />
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full var(--color-background) animate-pulse delay-500" />
                  </div>
                </div>
              </div>

              {/* Enhanced Evaluation Parameters Section */}
              <div className="var(--color-background) rounded-2xl shadow-lg border border-[var(--color-muted)] border-opacity-20 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-5 border-b border-[var(--color-muted)] border-opacity-30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-[var(--color-on-background)]">
                        Evaluation Parameters
                      </h3>
                      <p className="text-[var(--color-on-surface)] opacity-70 text-sm mt-1">
                        Review and modify individual assessment criteria
                      </p>
                    </div>

                    {/* Filter Controls */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-[var(--color-on-surface)] opacity-80">
                        Filter:
                      </label>
                      <select
                        value={filterStatus}
                        onChange={(e) =>
                          setFilterStatus(e.target.value as typeof filterStatus)
                        }
                        className="px-3 py-1.5 border border-[var(--color-muted)] border-opacity-30 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary var(--color-background)"
                      >
                        <option value="ALL">All ({localItems.length})</option>
                        <option value="ELIGIBLE">
                          Passed (
                          {
                            localItems.filter((i) => i.status === "ELIGIBLE")
                              .length
                          }
                          )
                        </option>
                        <option value="NOT_ELIGIBLE">
                          Failed (
                          {
                            localItems.filter(
                              (i) => i.status === "NOT_ELIGIBLE"
                            ).length
                          }
                          )
                        </option>
                        <option value="OVERRIDDEN">
                          Overridden ({overrideCount})
                        </option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {filteredItems.length === 0 ? (
                    <div className="p-8 text-center text-[var(--color-on-surface)] opacity-70">
                      <FaFileAlt className="w-12 h-12 mx-auto mb-4 text-[var(--color-muted)]" />
                      <p>No parameters match the selected filter.</p>
                    </div>
                  ) : (
                    filteredItems.map((item, index) => (
                      <div
                        key={item.id}
                        className={cn(
                          "p-5 transition-all duration-200",
                          "hover:bg-[var(--color-background)]/80",
                          item.override &&
                            "bg-[var(--color-primary)] bg-opacity-10/30 border-l-4 border-l-blue-400"
                        )}
                      >
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
                          {/* Parameter Info - Enhanced */}
                          <div className="xl:col-span-3">
                            <div className="flex items-start gap-2 mb-2">
                              <span className="text-xs font-mono bg-[var(--color-surface)] px-2 py-1 rounded text-[var(--color-on-surface)] opacity-70">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              <h4 className="font-semibold text-[var(--color-on-background)] text-sm leading-tight">
                                <Markdown>{item.parameter}</Markdown>
                              </h4>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="bg-[var(--color-primary)] text-[var(--color-on-primary)]  bg-opacity-10 px-2 py-1 rounded-md border border-[var(--color-primary)] border-opacity-30 font-medium">
                                  Required: {item.requiredValue}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span
                                  className={cn(
                                    "px-2 py-1 rounded-md border font-medium",
                                    item.status === "ELIGIBLE"
                                      ? "bg-[var(--color-success)] bg-opacity-10 border border-[var(--color-success)] border-opacity-30 text-[var(--color-on-success)]"
                                      : "bg-[var(--color-error)] bg-opacity-10 border border-[var(--color-error)] border-opacity-30 text-[var(--color-on-error)]"
                                  )}
                                >
                                  Actual: {item.actualValue}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Source Badge - Enhanced */}
                          <div className="xl:col-span-2 flex items-center">
                            <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200">
                              <FaShieldAlt className="w-3 h-3 mr-1" />
                              {item.source}
                            </span>
                          </div>

                          {/* Status Control - Enhanced */}
                          <div className="xl:col-span-2">
                            {item.override ? (
                              <select
                                value={item.status}
                                onChange={(e) =>
                                  handleStatusChange(
                                    item.id,
                                    e.target.value as
                                      | "ELIGIBLE"
                                      | "NOT_ELIGIBLE"
                                  )
                                }
                                className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-primary focus:border-primary transition-all var(--color-background) hover:border-[var(--color-muted)]"
                              >
                                <option value="ELIGIBLE">
                                  ✓ Mark as Eligible
                                </option>
                                <option value="NOT_ELIGIBLE">
                                  ✗ Mark as Not Eligible
                                </option>
                              </select>
                            ) : (
                              <div
                                className={cn(
                                  "inline-flex items-center px-3 py-2 rounded-lg text-xs font-semibold border",
                                  item.status === "ELIGIBLE"
                                    ? "bg-emerald-50 text-emerald-700 border border-[var(--color-success)] border-opacity-30"
                                    : "bg-[var(--color-error)] bg-opacity-10 text-[var(--color-on-error)] border border-[var(--color-error)] border-opacity-30"
                                )}
                              >
                                {item.status === "ELIGIBLE" ? (
                                  <>
                                    <FaCheck className="w-3 h-3 mr-2" />
                                    Passed
                                  </>
                                ) : (
                                  <>
                                    <FaTimes className="w-3 h-3 mr-2" />
                                    Failed
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Override Toggle - Enhanced */}
                          <div className="xl:col-span-1 flex justify-center">
                            <button
                              onClick={() => handleToggleOverride(item.id)}
                              disabled={updatingOverride[item.id]}
                              className={cn(
                                "relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50",
                                item.override
                                  ? "bg-blue-500 shadow-lg"
                                  : "bg-gray-200 hover:bg-gray-300"
                              )}
                              title={
                                item.override
                                  ? "Disable override"
                                  : "Enable override"
                              }
                            >
                              <span
                                className={cn(
                                  "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200",
                                  item.override
                                    ? "translate-x-6"
                                    : "translate-x-1"
                                )}
                              />
                              {updatingOverride[item.id] && (
                                <FaSpinner className="absolute inset-0 m-auto w-3 h-3 animate-spin text-gray-700 opacity-70" />
                              )}
                            </button>
                          </div>

                          {/* Comments Field - Enhanced */}
                          <div className="xl:col-span-4">
                            {item.override ? (
                              <div className="relative">
                                <input
                                  type="text"
                                  value={item.comments || ""}
                                  onChange={(e) =>
                                    handleCommentChange(item.id, e.target.value)
                                  }
                                  className="w-full px-3 py-2 pr-8 border border-[var(--color-muted)] border-opacity-50 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-[var(--color-background)] placeholder-gray-400"
                                  placeholder="Add justification for override..."
                                />
                                {savingComments[item.id] ? (
                                  <FaSpinner className="absolute right-3 top-1/2 transform -translate-y-1/2 w-3 h-3 animate-spin text-[var(--color-on-primary)]" />
                                ) : item.comments ? (
                                  <FaSave className="absolute right-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-success" />
                                ) : null}
                              </div>
                            ) : (
                              <div className="text-xs text-[var(--color-on-surface)] opacity-70 italic py-2 px-3 bg-[var(--color-background)] rounded-lg border">
                                {item.comments || "No comments provided"}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Enhanced Decision Section */}
              <div>
                {currentLoanStatus === LoanStatusEnum.PENDING ? (
                  <div className="var(--color-background) rounded-2xl shadow-lg border border-[var(--color-muted)] border-opacity-20 overflow-hidden">
                    <div className="bg-gradient-to-r from-gray-50 to-green-50 px-6 py-5 border-b border-[var(--color-muted)] border-opacity-30">
                      <h3 className="text-xl font-semibold text-[var(--color-on-background)] flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--color-success)] bg-opacity-10 flex items-center justify-center">
                          <FaCheck className="w-4 h-4 text-[var(--color-on-success)]" />
                        </div>
                        Final Decision
                      </h3>
                      <p className="text-[var(--color-on-surface)] opacity-70 text-sm mt-1">
                        Complete your assessment with detailed notes and make
                        your final decision
                      </p>
                    </div>

                    <div className="p-6 space-y-6">
                      {/* Decision Notes */}
                      <div>
                        <label className="block text-sm font-semibold text-[var(--color-on-surface)] opacity-80 mb-3 flex items-center gap-2">
                          <FaEdit className="w-4 h-4" />
                          Decision Notes
                          <span className="text-error">*</span>
                        </label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Provide comprehensive reasoning for your decision including key factors considered, risk assessment, and any additional observations..."
                          className={cn(
                            "w-full p-4 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none var(--color-background)",
                            notes.trim()
                              ? "border-green-300 bg-[var(--color-success)] bg-opacity-10/30"
                              : "border-[var(--color-muted)] border-opacity-50"
                          )}
                          rows={5}
                        />
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-xs text-[var(--color-on-surface)] opacity-70">
                            Detailed notes help in audit trails and future
                            reference
                          </p>
                          <span
                            className={cn(
                              "text-xs font-medium",
                              notes.length < 50
                                ? "text-error"
                                : notes.length < 100
                                ? "text-[var(--color-warning)]"
                                : "text-[var(--color-on-success)]"
                            )}
                          >
                            {notes.length} characters
                          </span>
                        </div>
                      </div>

                      {/* Enhanced AI Feedback Section */}
                      {evaluation?.autoGeneratedFeedback && (
                        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-5 border border border-[var(--color-warning)] border-opacity-30 shadow-sm">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-[var(--color-secondary)] bg-opacity-10 flex items-center justify-center flex-shrink-0">
                              <FaInfoCircle className="text-amber-600 w-5 h-5" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-3">
                                <h4 className="font-semibold text-[var(--color-warning)]">
                                  AI-Generated Insights
                                </h4>
                                <span className="px-2 py-1 bg-amber-200 text-[var(--color-warning)] text-xs rounded-full font-semibold">
                                  AUTOMATED ANALYSIS
                                </span>
                              </div>

                              <div
                                className={cn(
                                  "text-amber-700 leading-relaxed text-sm transition-all duration-300",
                                  !expandedFeedback &&
                                    evaluation.autoGeneratedFeedback.length >
                                      200 &&
                                    "line-clamp-3"
                                )}
                              >
                                {expandedFeedback
                                  ? evaluation.autoGeneratedFeedback
                                  : evaluation.autoGeneratedFeedback.length >
                                    200
                                  ? `${evaluation.autoGeneratedFeedback.substring(
                                      0,
                                      200
                                    )}...`
                                  : evaluation.autoGeneratedFeedback}
                              </div>

                              {evaluation.autoGeneratedFeedback.length >
                                200 && (
                                <button
                                  onClick={() =>
                                    setExpandedFeedback(!expandedFeedback)
                                  }
                                  className="mt-2 text-[var(--color-warning)] hover:text-amber-900 font-medium text-sm underline hover:no-underline transition-all"
                                >
                                  {expandedFeedback
                                    ? "Show less"
                                    : "Read full analysis"}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Enhanced Action Buttons with Progress */}
                      <div className="flex gap-4 justify-end pt-4 border-t border-[var(--color-muted)] border-opacity-30">
                        <Button
                          onClick={() => setShowConfirm("reject")}
                          disabled={
                            isLoanLoading ||
                            currentLoanStatus !== LoanStatusEnum.PENDING ||
                            !notes.trim()
                          }
                          variant="danger"
               
                        >
                          {isLoanLoading && showConfirm === "reject" ? (
                            <>
                              <div className="absolute inset-0 var(--color-error) opacity-75"></div>
                              <FaSpinner className="w-4 h-4 animate-spin relative z-10" />
                              <span className="relative z-10">
                                Processing...
                              </span>
                            </>
                          ) : (
                            <>
                              <FaTimes className="w-4 h-4" />
                              Reject Application
                            </>
                          )}
                        </Button>

                        <Button
                          onClick={() => setShowConfirm("approve")}
                          disabled={
                            isLoanLoading ||
                            currentLoanStatus !== LoanStatusEnum.PENDING ||
                            !notes.trim()
                          }
                          loading={isLoanLoading}
                          variant="primary"
                          // className={cn(
                          //   "px-8 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-3 text-sm min-w-[160px] justify-center relative overflow-hidden",
                          //   currentLoanStatus === LoanStatusEnum.PENDING &&
                          //     notes.trim()
                          //     ? "bg-[var(--color-success)] bg-opacity-100 text-[var(--color-on-primary)] hover:var(--color-success) shadow-md hover:shadow-lg hover:-translate-y-0.5"
                          //     : "bg-[var(--color-surface)] text-[var(--color-on-surface)] opacity-50 cursor-not-allowed"
                          // )}
                        >
                          {isLoanLoading && showConfirm === "approve" ? (
                            <>
                              <div className="absolute inset-0  bg-[var(--color-primary)]opacity-75"></div>
                              <FaSpinner className="w-4 h-4 animate-spin relative z-10" />
                              <span className="relative z-10">
                                Processing...
                              </span>
                            </>
                          ) : (
                            <>
                              <FaCheck className="w-4 h-4" />
                              Approve Application 
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Helper Text */}
                      {!notes.trim() && (
                        <p className="text-center text-sm text-[var(--color-on-surface)] opacity-70 bg-[var(--color-background)] rounded-lg p-3 border border-[var(--color-muted)] border-opacity-30">
                          <FaClock className="w-4 h-4 inline mr-2" />
                          Please add decision notes to proceed with approval or
                          rejection
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="var(--color-background) rounded-2xl shadow-lg border border-[var(--color-muted)] border-opacity-20 overflow-hidden">
                    <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-[var(--color-muted)] border-opacity-30">
                      <h3 className="text-lg font-semibold text-[var(--color-on-background)]">
                        Application Status
                      </h3>
                    </div>

                    <div className="p-6">
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center",
                            currentLoanStatus ===
                              LoanStatusEnum.CREDIT_EXECUTIVE_APPROVED
                              ? "bg-[var(--color-success)] bg-opacity-10"
                              : currentLoanStatus === LoanStatusEnum.REJECTED
                              ? "bg-[var(--color-error)] bg-opacity-10"
                              : "bg-[var(--color-surface)]"
                          )}
                        >
                          {currentLoanStatus ===
                          LoanStatusEnum.CREDIT_EXECUTIVE_APPROVED ? (
                            <FaCheck className="w-6 h-6 text-[var(--color-on-success)]" />
                          ) : currentLoanStatus === LoanStatusEnum.REJECTED ? (
                            <FaTimes className="w-6 h-6 text-[var(--color-on-error)]" />
                          ) : (
                            <FaClock className="w-6 h-6 text-[var(--color-on-surface)] opacity-70" />
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg font-semibold text-[var(--color-on-background)]">
                              Application{" "}
                              {currentLoanStatus === LoanStatusEnum.REJECTED
                                ? "Rejected"
                                : currentLoanStatus ===
                                  LoanStatusEnum.CREDIT_EXECUTIVE_APPROVED
                                ? "Approved"
                                : currentLoanStatus
                                    ?.toLowerCase()
                                    .replace(/_/g, " ")}
                            </span>
                            <span
                              className={cn(
                                "px-2 py-1 rounded-lg text-xs font-medium",
                                currentLoanStatus ===
                                  LoanStatusEnum.CREDIT_EXECUTIVE_APPROVED
                                  ? "bg-[var(--color-success)] bg-opacity-10 text-[var(--color-on-success)]"
                                  : currentLoanStatus ===
                                    LoanStatusEnum.REJECTED
                                  ? "bg-[var(--color-error)] bg-opacity-10 text-[var(--color-on-error)]"
                                  : "bg-[var(--color-surface)] text-[var(--color-on-background)]"
                              )}
                            >
                              {currentLoanStatus?.replace(/_/g, " ")}
                            </span>
                          </div>

                          {notes && (
                            <div className="bg-[var(--color-background)] p-3 rounded-lg border">
                              <p className="text-xs text-[var(--color-on-surface)] opacity-70 font-medium mb-1">
                                Decision Notes:
                              </p>
                              <p className="text-[var(--color-on-background)] text-sm">
                                {notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Summary Sidebar */}
          {showSummary && (
            <div className="w-1/3 var(--color-background) border-l border-[var(--color-muted)] border-opacity-30 flex flex-col h-full">
              <div className="flex-1 overflow-y-auto">
                <CreditReport />
              </div>
            </div>
          )}
        </div>
      </Sidebar>
    </div>
  );
}