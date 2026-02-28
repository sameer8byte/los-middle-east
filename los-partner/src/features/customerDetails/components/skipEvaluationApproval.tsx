import { useParams } from "react-router-dom";
import { ConfirmationDialog } from "./evaluationV2/confirmationDialog";
import { useState } from "react";
import dayjs from "dayjs";
import { LoanStatusEnum } from "../../../constant/enum";
import {
    updateLoan,
    updateLoanWithReasons,
} from "../../../shared/services/api/loan.api";
import { toast } from "react-toastify";
import { Loan } from "../../../shared/types/loan";

interface SkipEvaluationApprovalProps {
    readonly loanId: string | null;
    readonly setLoanId: (id: string | null) => void;
    readonly showConfirm: "approve" | "reject" | null;
    readonly setShowConfirm: (action: "approve" | "reject" | null) => void;
    readonly loan: Loan;
    readonly onLoanStatusUpdate?: (updatedLoan: Loan) => void;
}

export function SkipEvaluationApproval({
    loanId,
    setLoanId,
    showConfirm,
    setShowConfirm,
    loan,
    onLoanStatusUpdate,
}: SkipEvaluationApprovalProps) {
    const { brandId } = useParams<{ brandId: string }>();
    const [isLoanLoading, setIsLoanLoading] = useState(false);
    const [selectedRejectionReasons, setSelectedRejectionReasons] = useState<
        string[]
    >([]);
    const [rejectionReasonsValid, setRejectionReasonsValid] = useState(false);
    const [approvedLoanAmount, setApprovedLoanAmount] = useState<number | null>(
        null
    );
    const [approvedDueDate, setApprovedDueDate] = useState<string | null>(null);
    const [popupError, setPopupError] = useState<string | null>(null);

    const handleReject = async (id: string) => {
        if (!id || !brandId || !loanId) return;
        setIsLoanLoading(true);
        try {
            await updateLoanWithReasons(id, brandId, {
                loanId: id,
                status: LoanStatusEnum.REJECTED,
                reason: 
                  "Rejected by Credit Executive during Skip Evaluation",
                brandStatusReasonIds: selectedRejectionReasons,
            });

            if (onLoanStatusUpdate) {
                onLoanStatusUpdate({
                    ...loan,
                    status: LoanStatusEnum.REJECTED,
                });
            }
            toast.success("Application rejected successfully");
            setLoanId(null);
        } catch (error) {
            toast.error((error as Error).message || "Failed to reject application");
        } finally {
            setIsLoanLoading(false);
        }
    };

    const handleApprove = async (id: string, amount: number) => {
        if (!id || !brandId || !loanId) return;
        setIsLoanLoading(true);

        if (!amount || amount <= 0) {
            setPopupError("Please enter a valid loan amount");
            setIsLoanLoading(false);
            return;
        }
        if (!approvedDueDate) {
            setPopupError("Please select a due date for the loan repayment");
            setIsLoanLoading(false);
            return;
        }

        try {
            await updateLoan(id, brandId, {
                loanId: id,
                status: LoanStatusEnum.CREDIT_EXECUTIVE_APPROVED,
                reason: "Approved by Credit Executive during Skip Evaluation",
                approvedLoanAmount: amount,
                approvedDueDate: dayjs(approvedDueDate).format("YYYY-MM-DD"),
            });
            if (onLoanStatusUpdate) {
                onLoanStatusUpdate({
                    ...loan,
                    status: LoanStatusEnum.CREDIT_EXECUTIVE_APPROVED,
                    amount: amount,
                    ...(loan.loanDetails && {
                        loanDetails: {
                            ...loan.loanDetails,
                            dueDate: dayjs(approvedDueDate).format("YYYY-MM-DD"),
                        },
                    }),
                });
            }
            toast.success("Application approved and forwarded successfully");
            setLoanId(null);
        } catch (error) {
            setPopupError(
                (error as Error).message || "Failed to approve application"
            );
        } finally {
            setIsLoanLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="mb-4">
                <label
                    htmlFor="action-select"
                    className="block text-sm font-medium mb-2"
                >
                    Action
                </label>
                <select
                    id="action-select"
                    value={showConfirm || ""}
                    onChange={(e) =>
                        setShowConfirm((e.target.value as "approve" | "reject") || null)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">Select an action</option>
                    <option value="approve">Approve</option>
                    <option value="reject">Reject</option>
                </select>
            </div>

            {loanId && brandId && (
                <ConfirmationDialog
                    isOpen={
                        loanId !== null &&
                        (showConfirm === "approve" || showConfirm === "reject")
                    }
                    onClose={() => {
                        setLoanId(null);
                        setShowConfirm(null);
                    }}
                    showConfirm={showConfirm}
                    isLoanLoading={isLoanLoading}
                    approvedLoanAmount={approvedLoanAmount}
                    setApprovedLoanAmount={setApprovedLoanAmount}
                    approvedDueDate={approvedDueDate}
                    setApprovedDueDate={setApprovedDueDate}
                    popupError={popupError}
                    setPopupError={setPopupError}
                    loanId={loanId || ""}
                    loan={loan}
                    brandId={brandId || ""}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    selectedRejectionReasons={selectedRejectionReasons}
                    setSelectedRejectionReasons={setSelectedRejectionReasons}
                    rejectionReasonsValid={rejectionReasonsValid}
                    setRejectionReasonsValid={setRejectionReasonsValid}
                />
            )}
        </div>
    );
}
