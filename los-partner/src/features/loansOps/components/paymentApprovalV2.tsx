import { useEffect, useState } from "react";
import {
  FiCheck,
  FiX,
  FiAlertCircle,
  FiExternalLink,
  FiFileText,
} from "react-icons/fi";
import {
  HiCurrencyRupee,
  HiBanknotes,
  HiClock,
  HiCheckCircle,
  HiXCircle,
} from "react-icons/hi2";
import Dialog from "../../../common/dialog";
import { ApprovalStatusEnum } from "../../../constant/enum";
import { updateOpsApprovalStatus } from "../../../shared/services/api/payment.api";
import { TodayCalculations } from "../../loanCollection/components/todayCalculations";
import { getLoanDetails } from "../../../shared/services/api/loan.api";
import { useParams } from "react-router-dom";
import { Loan } from "../../../shared/types/loan";
import { useAwsSignedUrl } from "../../../hooks/useAwsSignedUrl";
import { isAdmin, isSuperAdmin } from "../../../lib/role";
import { useAppSelector } from "../../../shared/redux/store";

enum ClosingTypeEnum {
  WRITE_OFF = "WRITE_OFF",
  NORMAL = "NORMAL",
  SETTLEMENT = "SETTLEMENT",
}

// Compact Transaction Card Component
const TransactionCard = ({
  tx,
  requestId,
  actionLoading,
  openConfirmationDialog,
  fetchSignedUrl,
}: {
  tx: any;
  requestId: string;
  actionLoading: string | null;
  openConfirmationDialog: (
    action: "approve" | "reject",
    requestId: string,
    collectionId: string | null,
    partialId: string | null,
  ) => void;
  fetchSignedUrl: (url: string) => void;
}) => {
  const isPending = tx.opsApprovalStatus === "PENDING";
  const isApproved = tx.opsApprovalStatus === "APPROVED";
  const hasReceipts = tx?.receipt?.length > 0;

  const getCardStyle = () => {
    if (isPending) return "border-amber-200 bg-amber-50/40";
    if (isApproved) return "border-emerald-200 bg-emerald-50/40";
    return "border-red-200 bg-red-50/40";
  };

  const getBadgeStyle = () => {
    if (isPending) return "bg-amber-100 text-amber-700";
    if (isApproved) return "bg-emerald-100 text-emerald-700";
    return "bg-red-100 text-red-700";
  };

  return (
    <div className={`rounded-lg border p-3 ${getCardStyle()}`}>
      {/* Top Row: Type Icon + Amount + Status + Receipts */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              tx.type === "collection" ? "bg-emerald-500" : "bg-blue-500"
            }`}
          >
            {tx.type === "collection" ? (
              <HiBanknotes className="w-4 h-4 text-white" />
            ) : (
              <HiCurrencyRupee className="w-4 h-4 text-white" />
            )}
          </div>
          <div>
            <div className="text-lg font-bold text-slate-800 tabular-nums leading-tight">
              ₹{Number(tx?.amount || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 leading-tight">
              {tx.type === "collection" ? "Full" : "Partial"} •{" "}
              {tx.method || "—"} •{" "}
              {tx.completedAt
                ? new Date(tx.completedAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                  })
                : "—"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Receipt buttons */}
          {tx.externalUrl && (
            <a
              href={tx.externalUrl}
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-2"
              title="View Receipt"
            >
              <FiExternalLink className="w-3.5 h-3.5" /> Preview provider
              payment link{" "}
            </a>
          )}
          {hasReceipts && (
            <div className="flex gap-1">
              {tx?.receipt?.map((r: any) => (
                <button
                  key={r.id}
                  onClick={() => fetchSignedUrl(r.receiptKey)}
                  className="w-7 h-7 flex items-center justify-center rounded bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 transition-colors"
                  title={r.receiptKey.split("/").pop()}
                >
                  <FiFileText className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          )}
          {/* Status badge */}
          <div
            className={`px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 ${getBadgeStyle()}`}
          >
            {isPending && <HiClock className="w-3 h-3" />}
            {isApproved && <HiCheckCircle className="w-3 h-3" />}
            {!isPending && !isApproved && <HiXCircle className="w-3 h-3" />}
            {tx.opsApprovalStatus}
          </div>
        </div>
      </div>

      {/* Financial Details Row - Only show if exists */}
      {(tx.totalFees > 0 ||
        tx.totalPenalties > 0 ||
        tx.penaltyDiscount > 0 ||
        tx.externalRef) && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-600 mb-2 pb-2 border-b border-slate-200/50">
          {tx.externalRef && (
            <span>
              Ref:{" "}
              <span className="font-mono font-medium">{tx.externalRef}</span>
            </span>
          )}
          {tx.totalFees > 0 && (
            <span>Fees: ₹{tx.totalFees.toLocaleString()}</span>
          )}
          {tx.totalPenalties > 0 && (
            <span className="text-red-600">
              Penalties: ₹{tx.totalPenalties.toLocaleString()}
            </span>
          )}
          {tx.penaltyDiscount > 0 && (
            <span className="text-emerald-600">
              Discount: -₹{tx.penaltyDiscount.toLocaleString()}
            </span>
          )}
          {tx.excessAmount > 0 && (
            <span className="text-blue-600">
              Excess: ₹{tx.excessAmount.toLocaleString()}
            </span>
          )}
        </div>
      )}

      {/* Alerts - Write-off warning */}
      {tx.closingType === ClosingTypeEnum.WRITE_OFF && (
        <div className="flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-100 rounded px-2 py-1 mb-2">
          <FiAlertCircle className="w-3 h-3 flex-shrink-0" />
          <span className="font-medium">
            Write-off: Loan closes after approval
          </span>
        </div>
      )}
      {tx.closingType === ClosingTypeEnum.SETTLEMENT && (
        <div className="flex items-center gap-1.5 text-[10px] text-blue-700 bg-blue-100 rounded px-2 py-1 mb-2">
          <FiAlertCircle className="w-3 h-3 flex-shrink-0" />
          <span className="font-medium">
            Settlement: This is a settlement payment
          </span>
        </div>
      )}

      {/* Notes inline */}
      {(tx.note || tx.opsRemark) && (
        <div className="text-[10px] text-slate-600 mb-2">
          {tx.note && (
            <div className="truncate">
              <span className="text-slate-400">Note:</span> {tx.note}
            </div>
          )}
          {tx.opsRemark && (
            <div className="truncate text-blue-600">
              <span className="text-blue-400">Ops:</span> {tx.opsRemark}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {isPending && (
        <div className="flex gap-2">
          <button
            onClick={() =>
              openConfirmationDialog(
                "approve",
                requestId,
                tx.type === "collection" ? tx.id : null,
                tx.type === "partial" ? tx.id : null,
              )
            }
            disabled={actionLoading === `${requestId}-${tx.id}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-all"
          >
            {actionLoading === `${requestId}-${tx.id}` ? (
              <div className="w-3.5 h-3.5 border-2 border-transparent border-t-white rounded-full animate-spin" />
            ) : (
              <FiCheck className="w-3.5 h-3.5" />
            )}
            Approve
          </button>
          <button
            onClick={() =>
              openConfirmationDialog(
                "reject",
                requestId,
                tx.type === "collection" ? tx.id : null,
                tx.type === "partial" ? tx.id : null,
              )
            }
            disabled={actionLoading === `${requestId}-${tx.id}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 disabled:opacity-50 transition-all"
          >
            <FiX className="w-3.5 h-3.5" />
            Reject
          </button>
        </div>
      )}

      {/* Created by info - compact */}
      {(tx.createdByPartner || tx.opsByPartner) && (
        <div className="flex gap-3 mt-2 pt-2 border-t border-slate-200/50 text-[10px] text-slate-500">
          {tx.createdByPartner && (
            <span>
              By:{" "}
              <span className="text-blue-600 font-medium">
                {tx.createdByPartner.name}
              </span>
            </span>
          )}
          {tx.opsByPartner && (
            <span>
              Ops:{" "}
              <span className="text-orange-600 font-medium">
                {tx.opsByPartner.name}
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export function PaymentApprovalV2({
  refresh,
  setRefresh,
  loanId,
  setLoanId,
}: {
  readonly refresh: boolean;
  readonly setRefresh: (value: boolean) => void;
  readonly loanId: string;
  readonly setLoanId: (value: string) => void;
}) {
  const auth = useAppSelector((state) => state.auth.data);
  const userRoles = auth?.role || [];
  const { brandId } = useParams();
  const { fetchSignedUrl } = useAwsSignedUrl();
  const [loanDetails, setLoanDetails] = useState<Loan | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    action: "approve" | "reject" | null;
    paymentRequestId: string;
    paymentCollectionTransactionId: string | null;
    paymentPartialCollectionTransactionId: string | null;
    reason: string;
    closingType: string;
    transactionData?: any;
  }>({
    isOpen: false,
    action: null,
    paymentRequestId: "",
    paymentCollectionTransactionId: null,
    paymentPartialCollectionTransactionId: null,
    reason: "",
    closingType: "",
    transactionData: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<{
    show: boolean;
    type: "approve" | "reject" | null;
  }>({ show: false, type: null });

  const handleUpdateOpsApprovalStatus = async (
    paymentRequestId: string,
    paymentCollectionTransactionId: string | null,
    paymentPartialCollectionTransactionId: string | null,
    opsApprovalStatus: string,
    reason?: string,
    closingType?: string,
  ) => {
    if (!paymentRequestId || !opsApprovalStatus) return;
    if (
      !paymentCollectionTransactionId &&
      !paymentPartialCollectionTransactionId
    )
      return;
    if (!loanId) return;

    setError(null);
    setActionLoading(
      `${paymentRequestId}-${
        paymentCollectionTransactionId || paymentPartialCollectionTransactionId
      }`,
    );

    try {
      const actionType =
        opsApprovalStatus === ApprovalStatusEnum.APPROVED
          ? "approve"
          : "reject";

      await updateOpsApprovalStatus(
        paymentRequestId,
        paymentCollectionTransactionId,
        paymentPartialCollectionTransactionId,
        opsApprovalStatus,
        reason,
        closingType,
      );

      // Refetch loan details to update the UI
      if (brandId) {
        const response = await getLoanDetails(brandId, loanId);
        setLoanDetails(response);
      }

      setRefresh(!refresh);

      // Close confirmation dialog
      setConfirmationDialog({
        isOpen: false,
        action: null,
        paymentRequestId: "",
        paymentCollectionTransactionId: null,
        paymentPartialCollectionTransactionId: null,
        reason: "",
        closingType: "",
        transactionData: null,
      });

      // Show success message
      setSuccessMessage({ show: true, type: actionType });

      // Close main dialog after 3 seconds
      setTimeout(() => {
        setSuccessMessage({ show: false, type: null });
        setLoanId("");
      }, 3000);
    } catch (err: any) {
      console.error("Error updating ops approval status:", err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update approval status. Please try again.";
      setError(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmationDialog.reason.trim()) return;
    const opsApprovalStatus =
      confirmationDialog.action === "approve"
        ? ApprovalStatusEnum.APPROVED
        : ApprovalStatusEnum.REJECTED;
    await handleUpdateOpsApprovalStatus(
      confirmationDialog.paymentRequestId,
      confirmationDialog.paymentCollectionTransactionId,
      confirmationDialog.paymentPartialCollectionTransactionId,
      opsApprovalStatus,
      confirmationDialog.reason,
      confirmationDialog.closingType || undefined,
    );
    // Dialog is closed in handleUpdateOpsApprovalStatus on success
  };

  useEffect(() => {
    const fetchLoanDetailsData = async () => {
      if (!loanId || !brandId) return;
      try {
        const response = await getLoanDetails(brandId, loanId);
        setLoanDetails(response);
      } catch (err) {
        console.error("Failed to fetch loan details", err);
      }
    };
    fetchLoanDetailsData();
  }, [loanId, brandId]);

  return (
    <div>
      {loanId && (
        <Dialog
          isOpen={!!loanId}
          onClose={() => setLoanId("")}
          title="Payment Approval"
          size="xl"
        >
          {/* Success Message Overlay */}
          {successMessage.show && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div
                className={`flex flex-col items-center gap-4 p-8 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-300 ${
                  successMessage.type === "approve"
                    ? "bg-gradient-to-br from-emerald-500 to-green-600"
                    : "bg-gradient-to-br from-red-500 to-rose-600"
                }`}
              >
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                  {successMessage.type === "approve" ? (
                    <HiCheckCircle className="w-10 h-10 text-white" />
                  ) : (
                    <HiXCircle className="w-10 h-10 text-white" />
                  )}
                </div>
                <div className="text-center text-white">
                  <h3 className="text-xl font-bold mb-1">
                    {successMessage.type === "approve"
                      ? "Payment Approved!"
                      : "Payment Rejected"}
                  </h3>
                  <p className="text-sm text-white/80">
                    {successMessage.type === "approve"
                      ? "The payment has been successfully approved."
                      : "The payment has been rejected."}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-white/60 text-xs">
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Closing in a moment...
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Loan Info */}
            <div className="rounded-xl border border-[var(--color-muted)]/20 bg-[var(--color-surface)] overflow-hidden">
              <div className="bg-gradient-to-r from-[var(--color-primary)]/5 to-[var(--color-primary)]/10 px-4 py-3 flex justify-between items-center border-b border-[var(--color-muted)]/10">
                <div>
                  <span className="text-[10px] uppercase opacity-60 font-medium tracking-wider">
                    Loan Amount
                  </span>
                  <div className="text-2xl font-bold text-[var(--color-primary)]">
                    ₹{loanDetails?.amount?.toLocaleString() || "0"}
                  </div>
                </div>
                {loanDetails?.loanDetails?.dueDate && (
                  <div className="text-right">
                    <span className="text-[10px] uppercase opacity-60 font-medium tracking-wider">
                      Due Date
                    </span>
                    <div className="text-sm font-bold text-[#EA5E18]">
                      {new Date(
                        loanDetails.loanDetails.dueDate,
                      ).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "2-digit",
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 p-3 text-xs">
                <div className="flex justify-between items-center bg-[var(--color-muted)]/5 rounded-lg px-2.5 py-1.5">
                  <span className="opacity-60">Loan ID</span>
                  <span className="font-semibold">
                    {loanDetails?.formattedLoanId}
                  </span>
                </div>
                {loanDetails?.disbursementDate && (
                  <div className="flex justify-between items-center bg-[var(--color-muted)]/5 rounded-lg px-2.5 py-1.5">
                    <span className="opacity-60">Disbursed</span>
                    <span className="font-semibold">
                      {new Date(
                        loanDetails.disbursementDate,
                      ).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "2-digit",
                      })}
                    </span>
                  </div>
                )}
                {loanDetails?.loanDetails?.durationDays && (
                  <div className="flex justify-between items-center bg-[var(--color-muted)]/5 rounded-lg px-2.5 py-1.5">
                    <span className="opacity-60">Duration</span>
                    <span className="font-semibold">
                      {loanDetails.loanDetails.durationDays} days
                    </span>
                  </div>
                )}
                {loanDetails?.repayment && (
                  <div className="flex justify-between items-center bg-[var(--color-muted)]/5 rounded-lg px-2.5 py-1.5">
                    <span className="opacity-60">Obligation</span>
                    <span className="font-semibold">
                      ₹{loanDetails.repayment.totalObligation?.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
              {loanDetails?.repayment && (
                <div className="px-3 pb-3 text-xs">
                  <div className="bg-[var(--color-muted)]/5 rounded-lg p-2.5">
                    <div className="flex justify-between mb-2 pb-1.5 border-b border-[var(--color-muted)]/10">
                      <span className="font-medium opacity-70">
                        Fees & Charges
                      </span>
                      <span className="font-bold">
                        ₹{loanDetails.repayment.totalFees?.toLocaleString()}
                      </span>
                    </div>
                    {loanDetails.repayment.feeBreakdowns?.map((fee: any) => (
                      <div key={fee.id} className="text-[11px] opacity-70 mb-1">
                        <div className="flex justify-between">
                          <span>{fee.type}</span>
                          <span>₹{fee.total?.toLocaleString()}</span>
                        </div>
                        {fee.taxes?.map((tax: any) => (
                          <div
                            key={tax.id}
                            className="flex justify-between pl-3 opacity-60"
                          >
                            <span>+ {tax.type}</span>
                            <span>₹{tax.amount?.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <TodayCalculations loanId={loanId} />

            {/* Payment Requests Section */}
            {loanDetails?.paymentRequests
              ?.filter((request) =>
                [
                  ...request.collectionTransactions,
                  ...request.partialCollectionTransactions,
                ].some(
                  (tx) =>
                    tx.status === "SUCCESS" &&
                    tx.opsApprovalStatus === ApprovalStatusEnum.PENDING,
                ),
              )
              .sort(
                (a, b) =>
                  new Date(a.createdAt).getTime() -
                  new Date(b.createdAt).getTime(),
              )
              .slice(0, 1)
              .map((request) => {
                const allTransactions = [
                  ...request.collectionTransactions
                    .filter((tx) => tx.status === "SUCCESS")
                    .map((tx) => ({ ...tx, type: "collection" })),
                  ...request.partialCollectionTransactions
                    .filter((tx) => tx.status === "SUCCESS")
                    .map((tx) => ({ ...tx, type: "partial" })),
                ];
                return (
                  <div key={request.id} className="space-y-3">
                    {/* Section Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-[var(--color-on-surface)]">
                            Payment Requests
                          </h3>
                          <p className="text-[10px] text-[var(--color-on-surface)]/50">
                            {allTransactions.length} transaction
                            {allTransactions.length === 1 ? "" : "s"} pending
                            approval
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Transaction Cards */}
                    <div className="space-y-3">
                      {allTransactions
                        .sort(
                          (a, b) =>
                            new Date(b.createdAt).getTime() -
                            new Date(a.createdAt).getTime(),
                        )
                        .map((tx: any) => (
                          <TransactionCard
                            key={tx.id}
                            tx={tx}
                            requestId={request.id}
                            actionLoading={actionLoading}
                            openConfirmationDialog={(
                              action,
                              requestId,
                              collId,
                              partialId,
                            ) => {
                              setError(null);
                              setConfirmationDialog({
                                isOpen: true,
                                action,
                                paymentRequestId: requestId,
                                paymentCollectionTransactionId: collId,
                                paymentPartialCollectionTransactionId:
                                  partialId,
                                reason: "",
                                closingType: "",
                                transactionData: tx,
                              });
                            }}
                            fetchSignedUrl={fetchSignedUrl}
                          />
                        ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </Dialog>
      )}

      {/* Confirmation Dialog */}
      {confirmationDialog.isOpen && (
        <Dialog
          isOpen={confirmationDialog.isOpen}
          onClose={() =>
            setConfirmationDialog({
              isOpen: false,
              action: null,
              paymentRequestId: "",
              paymentCollectionTransactionId: null,
              paymentPartialCollectionTransactionId: null,
              reason: "",
              closingType: "",
              transactionData: null,
            })
          }
          title={
            confirmationDialog.action === "approve"
              ? "Approve Payment"
              : "Reject Payment"
          }
        >
          <div>
            {/* Transaction Summary - Inline */}
            {confirmationDialog.transactionData && (
              <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      confirmationDialog.transactionData?.type === "collection"
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    {confirmationDialog.transactionData?.type ===
                    "collection" ? (
                      <HiBanknotes className="w-4 h-4" />
                    ) : (
                      <HiCurrencyRupee className="w-4 h-4" />
                    )}
                  </span>
                  <div>
                    <div className="text-[10px] uppercase text-slate-400 font-medium leading-none">
                      {confirmationDialog.transactionData?.type === "collection"
                        ? "Full Collection"
                        : "Partial"}{" "}
                      • {confirmationDialog.transactionData?.method || "—"}
                    </div>
                    <div className="text-lg font-bold text-slate-800 tabular-nums leading-tight">
                      ₹
                      {Number(
                        confirmationDialog.transactionData?.amount || 0,
                      ).toLocaleString()}
                    </div>
                  </div>
                </div>
                {!!confirmationDialog.transactionData?.externalUrl && (
                  <a
                    href={confirmationDialog.transactionData?.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2"
                    title="View Receipt"
                  >
                    <FiExternalLink className="w-3.5 h-3.5" /> Preview provider
                    payment link
                  </a>
                )}
                {/* Attachments inline */}
                {confirmationDialog.transactionData?.receipt?.length > 0 && (
                  <div className="flex gap-1">
                    {confirmationDialog.transactionData?.receipt?.map(
                      (r: any) => (
                        <button
                          key={r.id}
                          onClick={() => fetchSignedUrl(r.receiptKey)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-[var(--color-primary)] hover:bg-slate-50 transition-colors"
                          title={r.receiptKey.split("/").pop()}
                        >
                          <FiFileText className="w-3.5 h-3.5" />
                        </button>
                      ),
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Reason Input - Compact */}
            <div>
              <label
                htmlFor="reason-textarea"
                className="text-xs font-semibold text-slate-600 mb-1.5 block"
              >
                Reason <span className="text-red-400">*</span>
              </label>
              <textarea
                id="reason-textarea"
                value={confirmationDialog.reason}
                onChange={(e) =>
                  setConfirmationDialog((prev) => ({
                    ...prev,
                    reason: e.target.value,
                  }))
                }
                placeholder={`Enter reason for ${
                  confirmationDialog.action === "approve"
                    ? "approval"
                    : "rejection"
                }...`}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none transition-all resize-none text-sm ${
                  confirmationDialog.reason.trim()
                    ? "border-slate-300 bg-white"
                    : "border-amber-300 bg-amber-50/50"
                } focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20`}
                rows={2}
              />
            </div>

            {/* Closing Type - Only show when approving and loan is PARTIALLY_PAID */}
            {confirmationDialog.action === "approve" &&
              loanDetails?.status === "PARTIALLY_PAID" &&
              (isAdmin(userRoles) || isSuperAdmin(userRoles)) && (
                <div>
                  <label
                    htmlFor="closing-type-select"
                    className="text-xs font-semibold text-slate-600 mb-1.5 block"
                  >
                    Closing Type <span className="text-red-400">*</span>
                  </label>
                  <select
                    id="closing-type-select"
                    value={confirmationDialog.closingType}
                    onChange={(e) =>
                      setConfirmationDialog((prev) => ({
                        ...prev,
                        closingType: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20 transition-all"
                  >
                    <option value="">-- Select Closing Type --</option>
                    <option value="NORMAL">Normal Closure</option>
                    <option value="SETTLEMENT">Settlement</option>
                    <option value="WRITE_OFF">Write-off</option>
                  </select>
                </div>
              )}

            {/* Error Message - Compact */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs">
                <FiAlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-red-600 flex-1">{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600"
                >
                  <FiX className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Action Buttons - Compact */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() =>
                  setConfirmationDialog({
                    isOpen: false,
                    action: null,
                    paymentRequestId: "",
                    paymentCollectionTransactionId: null,
                    paymentPartialCollectionTransactionId: null,
                    reason: "",
                    closingType: "",
                    transactionData: null,
                  })
                }
                className="flex-1 px-3 py-2.5 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200 transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={
                  !confirmationDialog.reason.trim() ||
                  actionLoading !== null
                }
                className={`flex-1 px-3 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 ${
                  confirmationDialog.action === "approve"
                    ? "bg-emerald-500 text-white hover:bg-emerald-600"
                    : "bg-red-500 text-white hover:bg-red-600"
                }`}
              >
                {actionLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-transparent border-t-white rounded-full animate-spin" />
                    <span>Processing</span>
                  </>
                ) : (
                  <>
                    {confirmationDialog.action === "approve" ? (
                      <FiCheck className="w-4 h-4" />
                    ) : (
                      <FiX className="w-4 h-4" />
                    )}
                    <span>
                      {confirmationDialog.action === "approve"
                        ? "Approve"
                        : "Reject"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
