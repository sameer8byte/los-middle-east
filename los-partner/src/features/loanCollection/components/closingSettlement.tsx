import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { ClosingTypeEnum } from "../../../constant/enum";
import { FaExclamationTriangle } from "react-icons/fa";
import Dialog from "../../../common/dialog";
import { useQueryParams } from "../../../hooks/useQueryParams";
import {
  upsertClosingType,
  getLoanById,
  postCurrentPartialRepayment,
} from "../../../shared/services/api/loan.api";
import { Loan } from "../../../shared/types/loan";
import { toast } from "react-toastify";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { Button } from "../../../common/ui/button";

interface ClosingTypeProps {
  loanId: string;
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

// Currency formatter
const formatCurrency = (value: number | string) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function ClosingSettlementType({ loanId }: ClosingTypeProps) {
  const { brandId } = useParams<{ brandId: string }>();
  const { getQuery, removeQuery } = useQueryParams();
  const settlementLoanId = getQuery("settlementLoanId");

  const [loan, setLoan] = useState<Loan | null>(null);
  const [initialPartialPaymentSummary, setInitialPartialPaymentSummary] =
    useState<PartialRepaymentCalculationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [, setPaymentSummaryLoading] = useState(false);
  const [, setError] = useState<string | null>(null);

  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Auto dismiss message
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Fetch loan details
  useEffect(() => {
    const fetchLoan = async () => {
      if (!loanId || !brandId) return;
      try {
        const response = await getLoanById(brandId, loanId);
        setLoan(response);
      } catch (error) {
        console.error("Error fetching loan:", error);
      }
    };

    fetchLoan();
  }, [loanId, brandId]);

  // Fetch initial partial payment summary
  useEffect(() => {
    const fetchInitialPartialPaymentSummary = async () => {
      if (!loan?.userId || !brandId || !loanId) return;

      try {
        setPaymentSummaryLoading(true);
        const response = await postCurrentPartialRepayment(
          loan.userId,
          loanId,
          0,
          new Date().toISOString().split("T")[0]
        );
        if (response) {
          setInitialPartialPaymentSummary(response);
        }
      } catch (error) {
        const msg =
          (error as Error)?.message || "Failed to calculate payment breakdown";
        setError(msg);
        toast.error(msg);
      } finally {
        setPaymentSummaryLoading(false);
      }
    };

    fetchInitialPartialPaymentSummary();
  }, [loan?.userId, brandId, loanId]);

  // --- Payment Totals ---
  const successDisbursement = loan?.paymentRequests?.filter(
    (pr) => pr?.type === "DISBURSEMENT" && pr.status === "SUCCESS"
  );
  const totalDisbursedAmount =
    successDisbursement?.reduce((sum, pr) => {
      const disbursementSum =
        pr.disbursalTransactions?.reduce(
          (dSum, dt) => dSum + Number(dt.amount),
          0
        ) || 0;
      return sum + disbursementSum;
    }, 0) || 0;

  const successPartialPayment = loan?.paymentRequests?.filter(
    (pr) => pr?.type === "PARTIAL_COLLECTION"
  );
  const totalReceivedAmount =
    successPartialPayment?.reduce((sum, pr) => {
      const partialCollectionSum =
        pr.partialCollectionTransactions?.reduce(
          (pcSum, pct) =>
            pct.status === "SUCCESS" && pct.opsApprovalStatus === "APPROVED"
              ? pcSum + Number(pct.amount)
              : pcSum,
          0
        ) || 0;
      return sum + partialCollectionSum;
    }, 0) || 0;

  const totalInterestAmount =
    successPartialPayment?.reduce((sum, pr) => {
      const partialCollectionSum =
        pr.partialCollectionTransactions?.reduce(
          (pcSum, pct) => pcSum + Number(pct.totalFees || 0),
          0
        ) || 0;
      return sum + partialCollectionSum;
    }, 0) || 0;

  const totalPrincipalAmount =
    successPartialPayment?.reduce((sum, pr) => {
      const partialCollectionSum =
        pr.partialCollectionTransactions?.reduce(
          (pcSum, pct) => pcSum + Number(pct.principalAmount || 0),
          0
        ) || 0;
      return sum + partialCollectionSum;
    }, 0) || 0;

  const totalPenaltyAmount =
    successPartialPayment?.reduce((sum, pr) => {
      const partialCollectionSum =
        pr.partialCollectionTransactions?.reduce(
          (pcSum, pct) => pcSum + Number(pct.totalPenalties || 0),
          0
        ) || 0;
      return sum + partialCollectionSum;
    }, 0) || 0;

  const totalPenaltyDiscount =
    successPartialPayment?.reduce((sum, pr) => {
      const partialCollectionSum =
        pr.partialCollectionTransactions?.reduce(
          (pcSum, pct) => pcSum + Number(pct.penaltyDiscount || 0),
          0
        ) || 0;
      return sum + partialCollectionSum;
    }, 0) || 0;

  const totalRoundOffDiscount =
    successPartialPayment?.reduce((sum, pr) => {
      const partialCollectionSum =
        pr.partialCollectionTransactions?.reduce(
          (pcSum, pct) => pcSum + Number(pct.roundOffDiscount || 0),
          0
        ) || 0;
      return sum + partialCollectionSum;
    }, 0) || 0;

  const totalPrincipalPayable =
    (initialPartialPaymentSummary?.paymentDetails.principalDueAfterPayment ||
      0) + totalPrincipalAmount;

  const totalInterestPayable =
    (initialPartialPaymentSummary?.paymentDetails.interestDueAfterPayment ||
      0) + totalInterestAmount;

  const totalPenaltyPayable =
    (initialPartialPaymentSummary?.paymentDetails.penaltyDueAfterPayment || 0) +
    totalPenaltyAmount +
    totalPenaltyDiscount;

  const OverallTotalPayable =
    (initialPartialPaymentSummary?.paymentDetails.remainingDueAfterPayment ||
      0) + totalReceivedAmount;

  // --- Eligibility Check ---
  const isLoanSettled =
    typeof totalReceivedAmount === "number" &&
    typeof totalDisbursedAmount === "number" &&
    totalReceivedAmount >= totalDisbursedAmount;

  const handleUpdate = async (newType: ClosingTypeEnum) => {
    if (!loanId || !brandId || !newType) {
      setMessage({ text: "Missing required fields.", type: "error" });
      return;
    }

    setLoading(true);
    setMessage(null);

    if (isLoanSettled === false) {
      setLoading(false);
      setMessage({
        text: "Loan is not eligible for settlement.",
        type: "error",
      });
      return;
    }
    try {
      const res = await upsertClosingType({
        loanId,
        brandId,
      });
      if (res) {
        setMessage({
          text: "Closing type updated successfully",
          type: "success",
        });
        setShowConfirmation(false);
        setTimeout(() => {
          removeQuery("settlementLoanId");
        }, 2000);
      } else {
        setMessage({ text: "Failed to update closing type", type: "error" });
      }
    } catch (error) {
      console.error(error);
      setMessage({
        text:
          (error as Error).message ||
          "An error occurred while updating closing type",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShowConfirmation(false);
    setMessage(null);
    removeQuery("settlementLoanId");
  };

  const handleConfirmWriteOff = () => {
    if (!isLoanSettled) {
      setMessage({
        text: "Loan is not eligible for settlement.",
        type: "error",
      });
      return;
    }
    setShowConfirmation(true);
    setMessage(null);
  };

  const handleFinalConfirm = () => {
    handleUpdate(ClosingTypeEnum.SETTLEMENT);
  };
  return (
    <Dialog
      isOpen={!!settlementLoanId}
      onClose={handleClose}
      title="Loan Settlement"
    >
      <div className="space-y-6">
        {/* Loan Info */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-[var(--color-on-background)] mb-1">
            Loan Settlement Details
          </h3>
          <p className="text-sm text-[var(--color-on-surface)] opacity-80">
            Loan ID:{" "}
            <span className="font-mono font-semibold text-[var(--color-on-background)]">
              {loan?.formattedLoanId || "N/A"}
            </span>
            {loan?.isMigratedloan && (
              <span className=" inline-flex items-center bg-[var(--color-secondary)] bg-opacity-10 px-2 py-0.5 text-xs font-medium text-[var(--color-on-secondary)]">
                Migrated ({loan.oldLoanId})
              </span>
            )}
          </p>

          {/* Collection Table */}
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border border-[var(--color-muted)] border-opacity-30 text-sm divide-y divide-gray-200">
              <thead className="bg-[var(--color-background)] text-left text-[var(--color-on-surface)] opacity-70 font-medium">
                <tr>
                  <th className="px-4 py-2">Disbursed Amount</th>
                  <th className="px-4 py-2 text-right">
                    {formatCurrency(totalDisbursedAmount)}
                  </th>
                </tr>
              </thead>
              <thead className="bg-[var(--color-background)] text-left text-[var(--color-on-surface)] opacity-70 font-medium">
                <tr>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2 text-right">Payable</th>
                  <th className="px-4 py-2 text-right">Received</th>
                  <th className="px-4 py-2 text-right">Discount</th>
                  <th className="px-4 py-2 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-2 text-[var(--color-on-background)]">
                    Principal Amount
                  </td>
                  <td className="px-4 py-2 text-right text-[var(--color-warning)]">
                    {formatCurrency(totalPrincipalPayable)}
                  </td>

                  <td className="px-4 py-2 text-right text-[var(--color-on-success)] font-medium">
                    {formatCurrency(totalPrincipalAmount)}
                  </td>
                  <td className="px-4 py-2 text-right text-[var(--color-warning)]">
                    -
                  </td>
                  <td className="px-4 py-2 text-right text-[var(--color-on-error)] font-medium">
                    {formatCurrency(
                      initialPartialPaymentSummary?.paymentDetails
                        .principalDueAfterPayment || 0
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-[var(--color-on-background)]">
                    Murabaha margin Amount
                  </td>
                  <td className="px-4 py-2 text-right text-[var(--color-warning)]">
                    {formatCurrency(totalInterestPayable)}
                  </td>

                  <td className="px-4 py-2 text-right text-[var(--color-on-success)] font-medium">
                    {formatCurrency(totalInterestAmount)}
                  </td>
                  <td className="px-4 py-2 text-right text-[var(--color-warning)]">
                    -
                  </td>
                  <td className="px-4 py-2 text-right text-[var(--color-on-error)] font-medium">
                    {formatCurrency(
                      initialPartialPaymentSummary?.paymentDetails
                        .interestDueAfterPayment || 0
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-[var(--color-on-background)]">
                    Penalty Amount
                  </td>
                  <td className="px-4 py-2 text-right text-[var(--color-warning)]">
                    {formatCurrency(totalPenaltyPayable)}
                  </td>

                  <td className="px-4 py-2 text-right text-[var(--color-on-success)] font-medium">
                    {formatCurrency(totalPenaltyAmount)}
                  </td>
                  <td className="px-4 py-2 text-right text-[var(--color-warning)] font-medium">
                    {formatCurrency(totalPenaltyDiscount)}
                  </td>
                  <td className="px-4 py-2 text-right text-[var(--color-on-error)] font-medium">
                    {formatCurrency(
                      initialPartialPaymentSummary?.paymentDetails
                        .penaltyDueAfterPayment || 0
                    )}
                  </td>
                </tr>
                <tr className="bg-[var(--color-primary)] bg-opacity-10">
                  <td className="px-4 py-2 text-[var(--color-on-primary)]">
                    <div>
                      <div className="font-medium">Round Off Discount</div>
                      <div className="text-xs text-[var(--color-on-primary)] opacity-70 italic">
                        (on Murabaha margin + Principal)
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right text-[var(--color-warning)]">
                    -
                  </td>

                  <td className="px-4 py-2 text-right text-[var(--color-on-primary)] font-medium">
                    {formatCurrency(totalRoundOffDiscount)}
                  </td>
                  <td className="px-4 py-2 text-right text-[var(--color-warning)]">
                    -
                  </td>
                  <td className="px-4 py-2 text-right text-[var(--color-on-error)]">
                    -
                  </td>
                </tr>
                <tr className="font-semibold bg-[var(--color-background)]">
                  <td className="px-4 py-2 text-[var(--color-on-background)]">
                    Total
                    <small>(Round Off discount not included)</small>
                  </td>
                  <td className="px-4 py-2 text-right text-[var(--color-warning)]">
                    {formatCurrency(OverallTotalPayable)}
                  </td>

                  <td className="px-4 py-2 text-right text-[var(--color-on-background)]">
                    {formatCurrency(totalReceivedAmount)}
                  </td>
                  <td className="px-4 py-2 text-right text-[var(--color-on-background)]">
                    {formatCurrency(totalPenaltyDiscount)}
                  </td>
                  <td className="px-4 py-2 text-right text-[var(--color-on-background)]">
                    {formatCurrency(
                      initialPartialPaymentSummary?.paymentDetails
                        .remainingDueAfterPayment || 0
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4">
          {isLoanSettled ? (
            <div className="bg-[var(--color-success)] bg-opacity-10 border border border-[var(--color-success)] border-opacity-30 p-4 rounded-lg text-[var(--color-on-success)]">
              <div className="flex items-center gap-3 mb-2">
                <FaCheckCircle className="w-5 h-5 text-[var(--color-on-success)]" />
                <span className="text-sm font-medium">
                  ✅ This loan is eligible for settlement.
                </span>
              </div>
              <div className="text-sm">
                <p>
                  <strong>Total Received:</strong>{" "}
                  {formatCurrency(totalReceivedAmount)}
                </p>
                <p>
                  <strong>Total Disbursed:</strong>{" "}
                  {formatCurrency(totalDisbursedAmount)}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-[var(--color-error)] bg-opacity-10 border border border-[var(--color-error)] border-opacity-30 p-4 rounded-lg text-[var(--color-on-error)]">
              <div className="flex items-center gap-3 mb-2">
                <FaTimesCircle className="w-5 h-5 text-[var(--color-on-error)]" />
                <span className="text-sm font-medium">
                  ❌ This loan is <strong>not eligible</strong> for settlement.
                </span>
              </div>
              <div className="text-sm">
                <p>
                  <strong>Total Received:</strong>{" "}
                  {formatCurrency(totalReceivedAmount)}
                </p>
                <p>
                  <strong>Total Disbursed:</strong>{" "}
                  {formatCurrency(totalDisbursedAmount)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Flash Message */}
        {message && (
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm ${
              message.type === "success"
                ? "bg-[var(--color-success)] bg-opacity-10 border border-[var(--color-success)] border-opacity-30 text-[var(--color-on-success)]"
                : "bg-[var(--color-error)] bg-opacity-10 border border-[var(--color-error)] border-opacity-30 text-[var(--color-on-error)]"
            }`}
          >
            {message.type === "success" ? (
              <FaCheckCircle className="w-5 h-5 text-[var(--color-on-success)]" />
            ) : (
              <FaTimesCircle className="w-5 h-5 text-[var(--color-on-error)]" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Action/Confirmation */}
        {!showConfirmation && !message && (
          <>
            <div className="bg-[var(--color-primary)] bg-opacity-10 border  border-[var(--color-primary)] border-opacity-30 p-4 rounded-lg">
              <h4 className="text-sm font-semibold text-[var(--color-on-primary)] mb-1">
                Important Information
              </h4>
              <p className="text-sm text-[var(--color-on-primary)] mb-2">
                Settling this loan will permanently mark it as uncollectible.
              </p>
              <ul className="list-disc list-inside text-sm text-[var(--color-on-primary)] space-y-1">
                <li>Loan status and collection activities</li>
                <li>Financial reporting and accounting</li>
                <li>Customer credit history</li>
              </ul>
            </div>

            <div className="bg-[var(--color-secondary)] bg-opacity-10 border  border-[var(--color-warning)] border-opacity-30 p-3 rounded-lg">
              <div className="flex items-center gap-3">
                <FaExclamationTriangle className="w-5 h-5 text-amber-600" />
                <span className="text-sm text-[var(--color-warning)] font-medium">
                  This action cannot be undone once confirmed.
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleConfirmWriteOff}
                disabled={loading}
                className="w-full"
                // className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-red-600 transition"
              >
                Proceed to Settlement
              </Button>
              <button
                onClick={handleClose}
                className="w-full h-10 bg-[var(--color-surface)] text-[var(--color-on-surface)] opacity-80 rounded-lg hover:bg-[var(--color-muted)] bg-opacity-30 transition"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {/* Final Confirmation Section */}
        {showConfirmation && !message && (
          <div className="space-y-4">
            <div className="bg-[var(--color-error)] bg-opacity-10 border border border-[var(--color-error)] border-opacity-30 p-5 rounded-lg text-center">
              <div className="w-16 h-16 mx-auto mb-3 flex items-center justify-center rounded-full bg-[var(--color-error)] bg-opacity-10">
                <FaExclamationTriangle className="w-8 h-8 text-[var(--color-on-error)]" />
              </div>
              <h3 className="text-lg font-bold text-[var(--color-on-error)] mb-2">
                Final Confirmation Required
              </h3>
              <p className="text-sm text-[var(--color-on-error)]">
                Are you sure you want to settle the loan{" "}
                <span className="font-mono font-bold text-red-900">
                  {loan?.formattedLoanId || "N/A"}
                </span>
                ? This action is irreversible.
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleFinalConfirm}
                disabled={loading}
                className="w-full h-12 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition"
              >
                {loading ? "Processing Settlement..." : "Yes, Settle This Loan"}
              </button>
              <button
                onClick={() => setShowConfirmation(false)}
                disabled={loading}
                className="w-full h-10 bg-[var(--color-surface)] text-[var(--color-on-surface)] opacity-80 rounded-lg hover:bg-[var(--color-muted)] bg-opacity-30 transition"
              >
                No, Go Back
              </button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
