import dayjs from "dayjs";
import { useState } from "react";
import { useQueryParams } from "../../../../hooks/useQueryParams";
import { LoanStatusEnum } from "../../../../constant/enum";
import Dialog from "../../../../common/dialog";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Button } from "../../../../common/ui/button";
import {
  updateLoan,
  updateLoanWithReasons,
} from "../../../../shared/services/api/loan.api";
import { Loan } from "../../../../shared/types/loan";
import { RejectionReasonsSelector } from "../evaluation/RejectionReasonsSelector";
import { useAppSelector } from "../../../../shared/redux/store";

export function SectionStatusUpdate({
  status,
  loan,
  setRefresh,
  refresh,
}: {
  status: LoanStatusEnum;
  loan: Loan;
  setRefresh: (value: boolean) => void;
  refresh: boolean;
}) {
  const { brandId } = useParams();

  const loanRules = useAppSelector((state) => state.brand.loanRules);
  const { getQuery, removeQuery } = useQueryParams();
  const sectionStatusUpdateLoadId = getQuery("sectionStatusUpdateLoadId");

  const [approvedLoanAmount, setApprovedLoanAmount] = useState<string>(
    loan?.amount ? String(loan.amount) : "",
  );
  const [approvedDueDate, setApprovedDueDate] = useState<string>(
    loan?.loanDetails?.dueDate
      ? new Date(loan.loanDetails.dueDate).toISOString().split("T")[0]
      : "",
  );
  const [error, setError] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isLoanLoading, setIsLoanLoading] = useState<boolean>(false);
  const [isPermanentlyBlocked, setIsPermanentlyBlocked] =
    useState<boolean>(false);
  const [selectedRejectionReasons, setSelectedRejectionReasons] = useState<
    string[]
  >([]);
  const [rejectionReasonsValid, setRejectionReasonsValid] = useState(false);
  const [selectedRuleType, setSelectedRuleType] = useState<string>(
    loan?.ruleType || "",
  );
  const handleReject = async (loanId: string) => {
    if (!loanId || !brandId) return;

    // Check if rejection reasons are required and valid
    if (!rejectionReasonsValid) {
      toast.error("Please select at least 3 rejection reasons");
      return;
    }

    setIsLoanLoading(true);
    setError("");

    try {
      await updateLoanWithReasons(brandId, loanId, {
        loanId,
        status: LoanStatusEnum.REJECTED,
        reason: notes,
        isPermanentlyBlocked: isPermanentlyBlocked,
        brandStatusReasonIds: selectedRejectionReasons,
      });

      toast.success("Loan rejected successfully");
      setRefresh(!refresh);
      removeQuery("sectionStatusUpdateLoadId");
    } catch (error) {
      setError((error as Error).message || "Failed to reject loan");
    } finally {
      setIsLoanLoading(false);
    }
  };

  const handleApprove = async (loanId: string, amount: string) => {
    if (!loanId || !brandId) return;
    setIsLoanLoading(true);
    setError("");

    const numericAmount = Number(amount);

    if (!amount || numericAmount <= 0 || isNaN(numericAmount)) {
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
        status: status,
        reason: notes,
        approvedLoanAmount: numericAmount,
        approvedDueDate,
        ruleType: selectedRuleType || undefined,
      });
      toast.success("Application approved successfully");
      setRefresh(!refresh); // Trigger refresh after rejection

      removeQuery("sectionStatusUpdateLoadId");
    } catch (error) {
      setError((error as Error).message || "Failed to approve application");
    } finally {
      setIsLoanLoading(false);
    }
  };

  const [isApprovalFlow, setIsApprovalFlow] = useState<boolean>(
    [
      LoanStatusEnum.SANCTION_MANAGER_APPROVED,
      LoanStatusEnum.APPROVED,
    ].includes(status),
  );

  return (
    <Dialog
      isOpen={!!sectionStatusUpdateLoadId}
      onClose={() => removeQuery("sectionStatusUpdateLoadId")}
      title={`Senction - ${isApprovalFlow ? "Approve Loan" : "Reject Loan"}`}
    >
      <div>
        {isApprovalFlow ? (
          <div>
            <div className="mb-4">
              <p>
                Loan Amount By Credit Executive:{" "}
                <span className="font-semibold text-[var(--color-on-background)]">
                  BHD{loan?.amount || "N/A"}
                </span>
              </p>
              <p>
                Due Date:{" "}
                <span className="font-semibold text-[var(--color-on-background)]">
                  {approvedDueDate
                    ? `${dayjs(approvedDueDate).format("DD-MM-YY")} (${
                        loan?.loanDetails?.durationDays
                      } days)`
                    : "N/A"}
                </span>
              </p>
              {loan.is_workflow_automated && (
                <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm transition-all duration-300 hover:shadow-md">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                      <svg
                        className="h-5 w-5 text-amber-600"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
                        />
                      </svg>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-amber-800">
                        Automated Workflow Alert
                      </h3>
                      <p className="mt-1 text-sm text-amber-700 leading-relaxed">
                        This loan is processed through an{" "}
                        <span className="font-medium">automated workflow</span>
                        and is not reviewed by a Credit Executive. Please
                        carefully verify:
                      </p>

                      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-700">
                        <li>Bank Statement / Account Aggregator (AA) data</li>
                        <li>Approved Loan Amount</li>
                        <li>Due Date</li>
                        <li>Sanction Letter details</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 bg-white border border-[var(--color-muted)] border-opacity-30 rounded-2xl p-4 shadow-sm my-2">
              {/* Approved Loan Amount */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-1">
                  Approved Loan Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-[var(--color-on-surface)] opacity-70 text-sm">
                    BHD
                  </span>
                  <input
                    type="number"
                    value={approvedLoanAmount}
                    onChange={(e) => setApprovedLoanAmount(e.target.value)}
                    placeholder="50,000"
                    className="w-full pl-8 pr-4 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isLoanLoading}
                  />
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-1">
                  Due Date for Loan Repayment{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={approvedDueDate}
                  onChange={(e) => setApprovedDueDate(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoanLoading}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-1">
                  Notes (Required)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add remarks..."
                  className="w-full px-4 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  disabled={isLoanLoading}
                />
              </div>

              {/* Loan Rule Type */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-1">
                  Loan Rule Type (
                  <span className="text-xs text-[var(--color-on-surface)]">
                    PLEASE SELECT THE APPROPRIATE RULE TYPE TO ENSURE CORRECT
                    PROCESSING OF THIS LOAN
                  </span>
                  )
                </label>
                <select
                  value={selectedRuleType}
                  onChange={(e) => setSelectedRuleType(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoanLoading}
                >
                  <option value="">Select a rule type...</option>
                  {loanRules.map((rule) => {
                    const processingFee = rule.loan_charge_config?.find(
                      (config) => config.type === "processing",
                    )?.chargeValue;
                    const interestRate = rule.loan_charge_config?.find(
                      (config) => config.type === "interest",
                    )?.chargeValue;
                    return (
                      <option key={rule.id} value={rule.ruleType}>
                        {rule.ruleType +
                          ` | Processing: ${processingFee ?? "N/A"}% | Murabaha margin: ${interestRate ?? "N/A"}%`}
                      </option>
                    );
                  })}
                </select>
                {selectedRuleType && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm border border-blue-200">
                    <p className="text-blue-900 font-medium">
                      Selected Rule Type:
                    </p>
                    <p className="text-blue-800 mt-1 font-mono">
                      {selectedRuleType}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <p className="text-[var(--color-on-surface)] opacity-70 text-sm pt-4">
              Please confirm your decision by clicking the button below.
            </p>
          </div>
        ) : (
          <p>
            Are you sure you want to reject this loan application? Please
            provide a reason for rejection.
          </p>
        )}

        {error && (
          <div className="my-3 flex items-center gap-2 rounded-lg bg-[var(--color-error)] bg-opacity-10 p-3 text-[var(--color-on-error)] shadow-sm">
            <svg
              className="h-5 w-5 text-[var(--color-on-error)]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M4.93 4.93l14.14 14.14M1 12C1 5.924 5.924 1 12 1s11 4.924 11 11-4.924 11-11 11S1 18.076 1 12z"
              />
            </svg>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Notes input shown in rejection flow */}
        {!isApprovalFlow && (
          <div className="mb-3">
            <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-1">
              Reason (Required)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add rejection reason..."
              className="w-full px-4 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              disabled={isLoanLoading}
            />
          </div>
        )}

        {/* Rejection Reasons Selector */}
        {!isApprovalFlow && (
          <div className="mb-4">
            <RejectionReasonsSelector
              brandId={brandId!}
              selectedReasons={selectedRejectionReasons}
              onReasonsChange={setSelectedRejectionReasons}
              onValidationChange={setRejectionReasonsValid}
              disabled={isLoanLoading}
            />
          </div>
        )}

        {!isApprovalFlow && (
          <p className="text-[var(--color-on-surface)] opacity-70 text-sm">
            <input
              type="checkbox"
              checked={isPermanentlyBlocked}
              onChange={(e) => setIsPermanentlyBlocked(e.target.checked)}
              className="mr-2"
              disabled={isLoanLoading}
            />
            Permanently block this customer from applying for loans in the
            future.
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setIsApprovalFlow(!isApprovalFlow)}
            className="flex-1 px-4 py-2.5 text-[var(--color-on-error)] bg-[var(--color-error)] bg-opacity-10 hover:bg-[var(--color-error)] bg-opacity-10 rounded-lg font-semibold text-sm border  border-[var(--color-error)] border-opacity-30 transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoanLoading}
          >
            {isApprovalFlow ? "Reject" : "Back to Approval"}
          </button>

          <Button
            onClick={() =>
              isApprovalFlow
                ? handleApprove(
                    sectionStatusUpdateLoadId || "",
                    approvedLoanAmount,
                  )
                : handleReject(sectionStatusUpdateLoadId || "")
            }
            loading={isLoanLoading}
            disabled={!isApprovalFlow && !rejectionReasonsValid}
            className={`flex-1 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition transform 
    ${
      isApprovalFlow
        ? "bg-green-600 hover:bg-green-700"
        : "bg-red-600 hover:bg-red-700"
    } 
    ${
      isLoanLoading || (!isApprovalFlow && !rejectionReasonsValid)
        ? "opacity-50 cursor-not-allowed"
        : "hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
    } 
    focus:outline-none focus:ring-2 focus:ring-offset-2 ${
      isApprovalFlow ? "focus:ring-green-500" : "focus:ring-red-500"
    }`}
          >
            {isLoanLoading ? (
              <div className="flex items-center justify-center gap-2">
                {/* <Spinner /> */}
                <span>Processing...</span>
              </div>
            ) : isApprovalFlow ? (
              (() => {
                const formattedDate = approvedDueDate
                  ? dayjs(approvedDueDate).format("DD-MM-YY")
                  : "";
                return `Approve Loan BHD${approvedLoanAmount} - Due Date ${formattedDate} - Rule: ${selectedRuleType || "Default"}`;
              })()
            ) : (
              "Confirm Rejection"
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
