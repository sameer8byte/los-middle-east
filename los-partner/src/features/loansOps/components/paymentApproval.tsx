import { useEffect, useState } from "react";

import { useQueryParams } from "../../../hooks/useQueryParams";
import Dialog from "../../../common/dialog";
import { FiCheck, FiX, FiClock, FiAlertCircle } from "react-icons/fi";
import {
  ApprovalStatusEnum,
  ClosingTypeEnum,
  TransactionTypeEnum,
} from "../../../constant/enum";
import { useAwsSignedUrl } from "../../../hooks/useAwsSignedUrl";
import { formatDateWithTime } from "../../../lib/utils";
import {
  getPaymentRequestByLoanId,
  updateOpsApprovalStatus,
} from "../../../shared/services/api/payment.api";
import { PaymentRequest } from "../../../shared/types/loan";
import { TodayCalculations } from "../../loanCollection/components/todayCalculations";
import { camelOrSnakeToTitle } from "../../../utils/camelOrSnakeToTitle";

export function PaymentApproval({
  refresh,
  setRefresh,
}: {
  readonly refresh: boolean;
  readonly setRefresh: (value: boolean) => void;
}) {
  const { getQuery, removeQuery } = useQueryParams();
  const paymentApprovalLoanId = getQuery("paymentApprovalLoanId");
  const { fetchSignedUrl } = useAwsSignedUrl();
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Confirmation popup states
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    action: "approve" | "reject" | null;
    paymentRequestId: string;
    paymentCollectionTransactionId: string | null;
    paymentPartialCollectionTransactionId: string | null;
    reason: string;
  }>({
    isOpen: false,
    action: null,
    paymentRequestId: "",
    paymentCollectionTransactionId: null,
    paymentPartialCollectionTransactionId: null,
    reason: "",
  });

  useEffect(() => {
    const fetchPaymentRequest = async () => {
      if (paymentApprovalLoanId) {
        setIsLoading(true);
        try {
          const response = await getPaymentRequestByLoanId(
            paymentApprovalLoanId
          );
          setPaymentRequest(response || []);
        } catch (error) {
          console.error("Error fetching payment request:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchPaymentRequest();
  }, [paymentApprovalLoanId]);

  const handleUpdateOpsApprovalStatus = async (
    paymentRequestId: string,
    paymentCollectionTransactionId: string | null,
    paymentPartialCollectionTransactionId: string | null,
    opsApprovalStatus: string,
    reason?: string
  ) => {
    if (!paymentRequestId || !opsApprovalStatus) {
      console.error("Payment Request ID and Ops Approval Status are required");
      return;
    }
    if (
      !paymentCollectionTransactionId &&
      !paymentPartialCollectionTransactionId
    ) {
      console.error(
        "At least one of Payment Collection Transaction ID or Payment Partial Collection Transaction ID is required"
      );
      return;
    }
    if (!paymentApprovalLoanId) {
      console.error("Payment Approval Loan ID is required");
      return;
    }

    const actionKey = `${paymentRequestId}-${
      paymentCollectionTransactionId || paymentPartialCollectionTransactionId
    }`;
    setActionLoading(actionKey);

    try {
      await updateOpsApprovalStatus(
        paymentRequestId,
        paymentCollectionTransactionId,
        paymentPartialCollectionTransactionId,
        opsApprovalStatus,
        reason
      );

      const response = await getPaymentRequestByLoanId(paymentApprovalLoanId);
      setPaymentRequest(response || []);
      setRefresh(!refresh);
    } catch (error) {
      console.error("Error updating ops approval status:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const openConfirmationDialog = (
    action: "approve" | "reject",
    paymentRequestId: string,
    paymentCollectionTransactionId: string | null,
    paymentPartialCollectionTransactionId: string | null
  ) => {
    setConfirmationDialog({
      isOpen: true,
      action,
      paymentRequestId,
      paymentCollectionTransactionId,
      paymentPartialCollectionTransactionId,
      reason: "",
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmationDialog.reason.trim()) {
      return; // Don't proceed if reason is empty
    }

    const opsApprovalStatus =
      confirmationDialog.action === "approve"
        ? ApprovalStatusEnum.APPROVED
        : ApprovalStatusEnum.REJECTED;

    await handleUpdateOpsApprovalStatus(
      confirmationDialog.paymentRequestId,
      confirmationDialog.paymentCollectionTransactionId,
      confirmationDialog.paymentPartialCollectionTransactionId,
      opsApprovalStatus,
      confirmationDialog.reason
    );

    setConfirmationDialog({
      isOpen: false,
      action: null,
      paymentRequestId: "",
      paymentCollectionTransactionId: null,
      paymentPartialCollectionTransactionId: null,
      reason: "",
    });
  };

  const getStatusIcon = (status: string) => {
    const iconClass = "w-4 h-4";
    switch (status?.toLowerCase()) {
      case "success":
      case "completed":
      case "approved":
        return <FiCheck className={`${iconClass} text-[#EA5E18]`} />;
      case "failed":
      case "rejected":
        return <FiX className={`${iconClass} text-error`} />;
      case "pending":
        return (
          <FiClock
            className={`${iconClass} text-[var(--color-on-surface)] opacity-50`}
          />
        );
      default:
        return (
          <FiAlertCircle
            className={`${iconClass} text-[var(--color-on-surface)] opacity-50`}
          />
        );
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClass =
      "text-[10px] px-1.5 py-0.5 rounded-full font-medium inline-block";
    switch (status?.toLowerCase()) {
      case "success":
      case "completed":
      case "approved":
        return `${baseClass} bg-[#EA5E18] text-white`;
      case "failed":
      case "rejected":
        return `${baseClass} bg-[var(--color-error)] text-white`;
      case "pending":
        return `${baseClass} bg-[var(--color-muted)] bg-opacity-30 text-[var(--color-on-surface)]`;
      default:
        return `${baseClass} bg-[var(--color-surface)] text-[var(--color-on-surface)] opacity-70`;
    }
  };

  return (
    <div>
      {paymentApprovalLoanId && (
        <Dialog
          isOpen={!!paymentApprovalLoanId}
          onClose={() => {
            setPaymentRequest([]);
            removeQuery("paymentApprovalLoanId");
          }}
          title="Payment Approval"
          size="xl"
        >
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-[var(--color-muted)] border-opacity-30 border-t-[#EA5E18] rounded-full animate-spin"></div>
                <span className="ml-3 text-[var(--color-on-surface)] opacity-70 text-sm">
                  Loading payment details...
                </span>
              </div>
            ) : (
              paymentRequest.map((request, index) => (
                <>
                  {index > 0 && (
                    <div className="relative py-3">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t-2 border-dashed border-[var(--color-muted)] border-opacity-30"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="px-3 py-1 bg-[var(--color-background)] text-xs text-[var(--color-on-surface)] opacity-50 font-medium rounded-full border border-[var(--color-muted)] border-opacity-20">
                          Payment Request {index + 1}
                        </span>
                      </div>
                    </div>
                  )}
                  <div
                    key={request.id}
                    className="var(--color-background) border-2 border-[var(--color-muted)] border-opacity-30 rounded-lg shadow-sm"
                  >
                    {/* Request Header */}
                    <div className="px-4 py-3 border-b border-[var(--color-muted)] border-opacity-20">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-[var(--color-on-background)]">
                            {`${camelOrSnakeToTitle(
                              request.type
                            )} Payment Request`}
                          </h3>
                          <p className="text-xs text-[var(--color-on-surface)] opacity-70 mt-0.5">
                            #{request.id.slice(-8).toUpperCase()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={getStatusBadge(request.status)}>
                            {request.status}
                          </span>
                          <span className="text-xs text-[var(--color-on-surface)] opacity-70">
                            {request.type}
                          </span>
                        </div>
                      </div>
                    </div>
                    {request?.loanId &&
                      request.partialCollectionTransactions.filter(
                        (tx) => tx.status === "SUCCESS"
                      ).length > 0 &&
                      request.type ===
                        TransactionTypeEnum.PARTIAL_COLLECTION && (
                        <TodayCalculations loanId={request?.loanId as string} />
                      )}
                    <div className="p-4 space-y-4">
                      {/* Collection Transactions Table */}
                      {request.collectionTransactions.filter(
                        (tx) => tx.status === "SUCCESS"
                      ).length > 0 && (
                        <div className="overflow-x-auto bg-[var(--color-surface)] bg-opacity-30 p-3 rounded-lg border border-[var(--color-muted)] border-opacity-10">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-1 h-5 bg-[#EA5E18] rounded-full"></div>
                            <h3 className="text-base font-semibold text-[var(--color-on-background)]">
                              Collection Transactions
                            </h3>
                            <span className="text-xs px-2 py-0.5 bg-[var(--color-muted)] bg-opacity-20 rounded-full">
                              {
                                request.collectionTransactions.filter(
                                  (tx) => tx.status === "SUCCESS"
                                ).length
                              }
                            </span>
                          </div>
                          <table className="w-full border-collapse border border-[var(--color-muted)] border-opacity-20 text-xs">
                            <thead>
                              <tr className="bg-[var(--color-muted)] bg-opacity-10">
                              <th className="border border-[var(--color-muted)] border-opacity-20 px-2 py-2 text-left text-xs font-semibold text-[var(--color-on-background)] whitespace-nowrap">
                                  Actions
                                </th>
                                <th className="border border-[var(--color-muted)] border-opacity-20 px-2 py-2 text-left text-xs font-semibold text-[var(--color-on-background)] whitespace-nowrap">
                                  Status
                                </th>
                                <th className="border border-[var(--color-muted)] border-opacity-20 px-2 py-2 text-left text-xs font-semibold text-[var(--color-on-background)] whitespace-nowrap">
                                  Amount
                                </th>
                                <th className="border border-[var(--color-muted)] border-opacity-20 px-2 py-2 text-left text-xs font-semibold text-[var(--color-on-background)] whitespace-nowrap">
                                  Method
                                </th>
                                <th className="border border-[var(--color-muted)] border-opacity-20 px-2 py-2 text-left text-xs font-semibold text-[var(--color-on-background)] whitespace-nowrap">
                                  Ref Number
                                </th>
                                <th className="border border-[var(--color-muted)] border-opacity-20 px-2 py-2 text-left text-xs font-semibold text-[var(--color-on-background)] whitespace-nowrap">
                                  Date
                                </th>
                                <th className="border border-[var(--color-muted)] border-opacity-20 px-2 py-2 text-left text-xs font-semibold text-[var(--color-on-background)] whitespace-nowrap">
                                  Fees
                                </th>
                                <th className="border border-[var(--color-muted)] border-opacity-20 px-2 py-2 text-left text-xs font-semibold text-[var(--color-on-background)] whitespace-nowrap">
                                  Penalties
                                </th>
                                <th className="border border-[var(--color-muted)] border-opacity-20 px-2 py-2 text-left text-xs font-semibold text-[var(--color-on-background)] whitespace-nowrap">
                                  Discount
                                </th>
                                <th className="border border-[var(--color-muted)] border-opacity-20 px-2 py-2 text-left text-xs font-semibold text-[var(--color-on-background)] whitespace-nowrap">
                                  Round Off
                                </th>
                                <th className="border border-[var(--color-muted)] border-opacity-20 px-2 py-2 text-left text-xs font-semibold text-[var(--color-on-background)] whitespace-nowrap">
                                  Excess
                                </th>
                                <th className="border border-[var(--color-muted)] border-opacity-20 px-2 py-2 text-left text-xs font-semibold text-[var(--color-on-background)] whitespace-nowrap">
                                  Approval
                                </th>
                                <th className="border border-[var(--color-muted)] border-opacity-20 px-2 py-2 text-left text-xs font-semibold text-[var(--color-on-background)] whitespace-nowrap">
                                  Created By
                                </th>
                                <th className="border border-[var(--color-muted)] border-opacity-20 px-2 py-2 text-left text-xs font-semibold text-[var(--color-on-background)] whitespace-nowrap">
                                  Ops Partner
                                </th>
                                
                              </tr>
                            </thead>
                            <tbody>
                              {request.collectionTransactions
                                .filter((tx) => tx.status === "SUCCESS")
                                .map((tx, txIndex) => (
                                  <>
                                    <tr
                                      key={tx.id}
                                      className={`hover:bg-[var(--color-muted)] hover:bg-opacity-5 ${
                                        txIndex % 2 === 0
                                          ? "bg-white"
                                          : "bg-[var(--color-surface)] bg-opacity-20"
                                      } ${
                                        txIndex > 0
                                          ? "border-t-2 border-[var(--color-muted)] border-opacity-30"
                                          : ""
                                      }`}
                                    >
                                      <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-2 py-2">
                                        {tx.opsApprovalStatus ===
                                          ApprovalStatusEnum.PENDING && (
                                          <div className="flex gap-1 flex-nowrap">
                                            <button
                                              onClick={() =>
                                                openConfirmationDialog(
                                                  "approve",
                                                  request.id,
                                                  tx.id,
                                                  null
                                                )
                                              }
                                              disabled={
                                                actionLoading ===
                                                `${request.id}-${tx.id}`
                                              }
                                              className="flex items-center gap-0.5 px-2 py-1 bg-[#EA5E18] text-[var(--color-on-primary)] text-[10px] font-medium rounded hover:bg-[#EA5E18]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                                            >
                                              {actionLoading ===
                                              `${request.id}-${tx.id}` ? (
                                                <div className="w-2.5 h-2.5 border border-transparent border-t-white rounded-full animate-spin" />
                                              ) : (
                                                <FiCheck className="w-2.5 h-2.5" />
                                              )}
                                              Approve
                                            </button>
                                            <button
                                              onClick={() =>
                                                openConfirmationDialog(
                                                  "reject",
                                                  request.id,
                                                  tx.id,
                                                  null
                                                )
                                              }
                                              disabled={
                                                actionLoading ===
                                                `${request.id}-${tx.id}`
                                              }
                                              className="flex items-center gap-0.5 px-2 py-1 border border-[var(--color-muted)] border-opacity-30 text-[var(--color-on-surface)] text-[10px] font-medium rounded hover:bg-[var(--color-muted)] hover:bg-opacity-10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                                            >
                                              <FiX className="w-2.5 h-2.5" />
                                              Reject
                                            </button>
                                          </div>
                                        )}
                                      </td>
                                      <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-2 py-2">
                                        <div className="flex items-center gap-1">
                                          {getStatusIcon(tx.status)}
                                          <span
                                            className={getStatusBadge(
                                              tx.status
                                            )}
                                          >
                                            {tx.status}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-2 py-2 font-semibold text-[var(--color-on-background)] whitespace-nowrap">
                                        {Number(tx?.amount) > 0
                                          ? `BHD ${tx.amount}`
                                          : "N/A"}
                                      </td>
                                      <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-2 py-2 text-[var(--color-on-surface)]">
                                        {tx.method}
                                      </td>
                                      <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-2 py-2 text-[var(--color-on-background)]">
                                        {tx.externalRef || "N/A"}
                                      </td>
                                      <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-2 py-2 text-[var(--color-on-background)] whitespace-nowrap">
                                        {tx.completedAt
                                          ? formatDateWithTime(tx.completedAt)
                                          : "N/A"}
                                      </td>
                                      <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-2 py-2 text-[var(--color-on-background)] text-right">
                                        {tx.totalFees > 0
                                          ? `BHD ${tx.totalFees}`
                                          : "-"}
                                      </td>
                                      <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-2 py-2 text-[var(--color-on-background)] text-right">
                                        {tx.totalPenalties > 0
                                          ? `BHD ${tx.totalPenalties}`
                                          : "-"}
                                      </td>
                                      <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-2 py-2 text-[var(--color-on-background)] text-right">
                                        {tx.penaltyDiscount > 0
                                          ? `BHD ${tx.penaltyDiscount}`
                                          : "-"}
                                      </td>
                                      <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-2 py-2 text-[var(--color-on-background)] text-right">
                                        {tx.roundOffDiscount > 0
                                          ? `BHD ${tx.roundOffDiscount}`
                                          : "-"}
                                      </td>
                                      <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-2 py-2 text-[var(--color-on-background)] text-right">
                                        {tx.excessAmount > 0
                                          ? `BHD ${tx.excessAmount}`
                                          : "-"}
                                      </td>
                                      <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-2 py-2">
                                        <span
                                          className={getStatusBadge(
                                            tx.opsApprovalStatus
                                          )}
                                        >
                                          {tx.opsApprovalStatus}
                                        </span>
                                      </td>
                                      <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-2 py-2 max-w-[120px]">
                                        {tx.createdByPartner ? (
                                          <div
                                            className="space-y-0.5"
                                            title={`${tx.createdByPartner.name} (${tx.createdByPartner.email})`}
                                          >
                                            <div className="font-medium text-blue-600 truncate text-xs">
                                              {tx.createdByPartner.name}
                                            </div>
                                            <div className="text-gray-500 truncate text-xs opacity-75">
                                              {tx.createdByPartner.email}
                                            </div>
                                          </div>
                                        ) : (
                                          <span className="text-gray-400">
                                            -
                                          </span>
                                        )}
                                      </td>
                                      <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-2 py-2 max-w-[120px]">
                                        {tx.opsByPartner ? (
                                          <div
                                            className="space-y-0.5"
                                            title={`${tx.opsByPartner.name} (${tx.opsByPartner.email})`}
                                          >
                                            <div className="font-medium text-orange-600 truncate text-xs">
                                              {tx.opsByPartner.name}
                                            </div>
                                            <div className="text-gray-500 truncate text-xs opacity-75">
                                              {tx.opsByPartner.email}
                                            </div>
                                          </div>
                                        ) : (
                                          <span className="text-gray-400">
                                            -
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                    {/* Additional details row */}
                                    {(tx.externalUrl ||
                                      tx.closingType ||
                                      tx.failureReason ||
                                      tx.note ||
                                      tx.opsRemark ||
                                      tx?.receipt?.length > 0) && (
                                      <tr
                                        key={`${tx.id}-details`}
                                        className={`${
                                          txIndex % 2 === 0
                                            ? "bg-white"
                                            : "bg-[var(--color-surface)] bg-opacity-20"
                                        }`}
                                      >
                                        <td
                                          colSpan={14}
                                          className="border-l border-r border-b-2 border-[var(--color-muted)] border-opacity-30 px-3 py-2.5 bg-[var(--color-muted)] bg-opacity-10"
                                        >
                                          <div className="space-y-1.5 text-xs">
                                            {tx.externalUrl && (
                                              <div>
                                                <span className="font-medium text-[var(--color-on-surface)] opacity-70">
                                                  Receipt:
                                                </span>{" "}
                                                <button
                                                  onClick={() =>
                                                    fetchSignedUrl(
                                                      tx.externalUrl
                                                    )
                                                  }
                                                  className="text-[var(--color-on-primary)] hover:underline"
                                                >
                                                  View
                                                </button>
                                              </div>
                                            )}
                                            {tx.closingType ===
                                              ClosingTypeEnum.WRITE_OFF && (
                                              <div className="flex items-start gap-1.5 p-1.5 bg-[var(--color-secondary)] bg-opacity-10 border border-yellow-100 rounded">
                                                <FiAlertCircle className="w-3 h-3 text-warning mt-0.5 flex-shrink-0" />
                                                <span className="text-[var(--color-warning)]">
                                                  Write-off: Loan will be closed
                                                  after approval.
                                                </span>
                                              </div>
                                            )}
                                            {tx.failureReason && (
                                              <div className="flex items-start gap-1.5 p-1.5 bg-[var(--color-error)] bg-opacity-10 border border-red-100 rounded">
                                                <FiAlertCircle className="w-3 h-3 text-error mt-0.5 flex-shrink-0" />
                                                <span className="text-[var(--color-on-error)]">
                                                  {tx.failureReason}
                                                </span>
                                              </div>
                                            )}
                                            {tx.note && (
                                              <div className="p-1.5 bg-[var(--color-background)] border border-[var(--color-muted)] border-opacity-20 rounded ">
                                                <span className="font-medium text-[var(--color-on-surface)] opacity-70">
                                                  Note:
                                                </span>{" "}
                                                <span className="text-[var(--color-on-surface)] opacity-80">
                                                  {tx.note}
                                                </span>
                                              </div>
                                            )}
                                            {tx.opsRemark && (
                                              <div className="p-1.5 bg-blue-50 border border-blue-200 rounded">
                                                <span className="font-medium text-blue-800">
                                                  Ops:
                                                </span>{" "}
                                                <span className="text-blue-700">
                                                  {tx.opsRemark}
                                                </span>
                                              </div>
                                            )}
                                            {tx?.receipt?.length > 0 && (
                                              <div>
                                                <span className="font-medium text-[var(--color-on-surface)] opacity-70">
                                                  Files:
                                                </span>{" "}
                                                {tx.receipt.map((receipt) => (
                                                  <button
                                                    onClick={() =>
                                                      fetchSignedUrl(
                                                        receipt.receiptKey
                                                      )
                                                    }
                                                    key={receipt.id}
                                                    className="text-[var(--color-on-primary)] hover:underline mr-1.5"
                                                  >
                                                    {receipt.receiptKey
                                                      .split("/")
                                                      .pop()}
                                                  </button>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Partial Collection Transactions Table */}
                      {request.partialCollectionTransactions.filter(
                        (tx) => tx.status === "SUCCESS"
                      ).length > 0 && (
                        <div className="overflow-x-auto bg-[var(--color-surface)] bg-opacity-30 p-3 rounded-lg border border-[var(--color-muted)] border-opacity-10">
                          {/* Header */}
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
                            <h3 className="text-base font-semibold text-[var(--color-on-background)]">
                              Partial Collection Transactions
                            </h3>
                            <span className="text-xs px-2 py-0.5 bg-[var(--color-muted)] bg-opacity-20 rounded-full">
                              {
                                request.partialCollectionTransactions.filter(
                                  (tx) => tx.status === "SUCCESS"
                                ).length
                              }
                            </span>
                          </div>

                          {/* Table */}
                          <table className="w-full border-collapse border border-[var(--color-muted)] border-opacity-20 text-xs">
                            <thead className="bg-[var(--color-muted)] bg-opacity-10">
                              <tr>
                                {[
                                    "Actions",
                                  "Status",
                                  "Amount",
                                  "Method",
                                
                                  "Ref Number",
                                  "Date",
                                  "Fees",
                                  "Penalties",
                                  "Discount",
                                  "Round Off",
                                  "Excess",
                                  "Approval",
                                  "Created By",
                                  "Ops Partner",
                                ].map((col) => (
                                  <th
                                    key={col}
                                    className="border border-[var(--color-muted)] border-opacity-20 px-3 py-2 text-left font-semibold text-[var(--color-on-background)] whitespace-nowrap"
                                  >
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>

                            <tbody>
                              {request.partialCollectionTransactions
                                .filter((tx) => tx.status === "SUCCESS")
                                .map((tx, txIndex) => {
                                  const rowBg =
                                    txIndex % 2 === 0
                                      ? "bg-white"
                                      : "bg-[var(--color-surface)] bg-opacity-20";
                                  const borderTop =
                                    txIndex > 0
                                      ? "border-t-2 border-[var(--color-muted)] border-opacity-30"
                                      : "";

                                  return (
                                    <>
                                      <tr
                                        key={tx.id}
                                        className={`hover:bg-[var(--color-muted)] hover:bg-opacity-5 ${rowBg} ${borderTop}`}
                                      >
                                         <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-3 py-2">
                                          {tx.opsApprovalStatus ===
                                            ApprovalStatusEnum.PENDING && (
                                            <div className="flex gap-1 flex-nowrap">
                                              <button
                                                onClick={() =>
                                                  openConfirmationDialog(
                                                    "approve",
                                                    request.id,
                                                    null,
                                                    tx.id
                                                  )
                                                }
                                                disabled={
                                                  actionLoading ===
                                                  `${request.id}-${tx.id}`
                                                }
                                                className="flex items-center gap-1 px-2 py-1 bg-[#EA5E18] text-[var(--color-on-primary)] text-[10px] font-medium rounded hover:bg-[#EA5E18]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                                              >
                                                {actionLoading ===
                                                `${request.id}-${tx.id}` ? (
                                                  <div className="w-2.5 h-2.5 border border-transparent border-t-white rounded-full animate-spin" />
                                                ) : (
                                                  <FiCheck className="w-2.5 h-2.5" />
                                                )}
                                                Approve
                                              </button>
                                              <button
                                                onClick={() =>
                                                  openConfirmationDialog(
                                                    "reject",
                                                    request.id,
                                                    null,
                                                    tx.id
                                                  )
                                                }
                                                disabled={
                                                  actionLoading ===
                                                  `${request.id}-${tx.id}`
                                                }
                                                className="flex items-center gap-1 px-2 py-1 border border-[var(--color-muted)] border-opacity-30 text-[var(--color-on-surface)] text-[10px] font-medium rounded hover:bg-[var(--color-muted)] hover:bg-opacity-10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                                              >
                                                <FiX className="w-2.5 h-2.5" />{" "}
                                                Reject
                                              </button>
                                            </div>
                                          )}
                                        </td>
                                        <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-3 py-2">
                                          <div className="flex items-center gap-1">
                                            {getStatusIcon(tx.status)}
                                            <span
                                              className={getStatusBadge(
                                                tx.status
                                              )}
                                            >
                                              {tx.status}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-3 py-2 font-semibold text-right">
                                          {Number(tx?.amount) > 0
                                            ? `BHD ${tx.amount} `
                                            : "N/A"}
                                          {Number(tx?.amount) > 0 && (
                                            <span className="text-[10px] text-[var(--color-on-surface)] opacity-70 font-normal">
                                              (Partial)
                                            </span>
                                          )}
                                        </td>
                                        <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-3 py-2">
                                          {tx.method}
                                        </td>
                                       
                                        <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-3 py-2">
                                          {tx.externalRef || "N/A"}
                                        </td>
                                        <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-3 py-2 whitespace-nowrap">
                                          {tx.completedAt
                                            ? formatDateWithTime(tx.completedAt)
                                            : "N/A"}
                                        </td>
                                        <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-3 py-2 text-right">
                                          {tx.totalFees > 0
                                            ? `BHD ${tx.totalFees}`
                                            : "-"}
                                        </td>
                                        <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-3 py-2 text-right">
                                          {tx.totalPenalties > 0
                                            ? `BHD ${tx.totalPenalties}`
                                            : "-"}
                                        </td>
                                        <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-3 py-2 text-right">
                                          {tx.penaltyDiscount > 0
                                            ? `BHD ${tx.penaltyDiscount}`
                                            : "-"}
                                        </td>
                                        <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-3 py-2 text-right">
                                          {tx.roundOffDiscount > 0
                                            ? `BHD ${tx.roundOffDiscount}`
                                            : "-"}
                                        </td>
                                        <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-3 py-2 text-right">
                                          {tx.excessAmount > 0
                                            ? `BHD ${tx.excessAmount}`
                                            : "-"}
                                        </td>
                                        <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-3 py-2">
                                          <span
                                            className={getStatusBadge(
                                              tx.opsApprovalStatus
                                            )}
                                          >
                                            {tx.opsApprovalStatus}
                                          </span>
                                        </td>
                                        <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-3 py-2 max-w-[120px] truncate">
                                          {tx.createdByPartner ? (
                                            <div
                                              className="space-y-0.5"
                                              title={`${tx.createdByPartner.name} (${tx.createdByPartner.email})`}
                                            >
                                              <div className="font-medium text-purple-600 truncate text-xs">
                                                {tx.createdByPartner.name}
                                              </div>
                                              <div className="text-gray-500 truncate text-xs opacity-75">
                                                {tx.createdByPartner.email}
                                              </div>
                                            </div>
                                          ) : (
                                            <span className="text-gray-400">
                                              -
                                            </span>
                                          )}
                                        </td>
                                        <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-3 py-2 max-w-[120px] truncate">
                                          {tx.opsByPartner ? (
                                            <div
                                              className="space-y-0.5"
                                              title={`${tx.opsByPartner.name} (${tx.opsByPartner.email})`}
                                            >
                                              <div className="font-medium text-orange-600 truncate text-xs">
                                                {tx.opsByPartner.name}
                                              </div>
                                              <div className="text-gray-500 truncate text-xs opacity-75">
                                                {tx.opsByPartner.email}
                                              </div>
                                            </div>
                                          ) : (
                                            <span className="text-gray-400">
                                              -
                                            </span>
                                          )}
                                        </td>
                                       
                                      </tr>

                                      {/* Optional Details Row */}
                                      {(tx.externalUrl ||
                                        tx.closingType ||
                                        tx.failureReason ||
                                        tx.note ||
                                        tx.opsRemark ||
                                        tx?.receipt?.length > 0) && (
                                        <tr className={`${rowBg}`}>
                                          <td
                                            colSpan={14}
                                            className="border-l border-r border-b-2 border-[var(--color-muted)] border-opacity-30 px-3 py-2 bg-[var(--color-muted)] bg-opacity-10"
                                          >
                                            <div className="space-y-1.5 text-xs">
                                              {tx.externalUrl && (
                                                <div>
                                                  <span className="font-medium text-[var(--color-on-surface)] opacity-70">
                                                    Receipt:
                                                  </span>{" "}
                                                  <button
                                                    onClick={() =>
                                                      fetchSignedUrl(
                                                        tx.externalUrl
                                                      )
                                                    }
                                                    className="text-[var(--color-on-primary)] hover:underline"
                                                  >
                                                    View
                                                  </button>
                                                </div>
                                              )}
                                              {tx.closingType ===
                                                ClosingTypeEnum.WRITE_OFF && (
                                                <div className="flex items-start gap-1.5 p-1.5 bg-[var(--color-secondary)] bg-opacity-10 border border-yellow-100 rounded">
                                                  <FiAlertCircle className="w-3 h-3 text-warning mt-0.5 flex-shrink-0" />
                                                  <span className="text-[var(--color-warning)]">
                                                    Write-off: Loan will be
                                                    closed after approval.
                                                  </span>
                                                </div>
                                              )}
                                              {tx.failureReason && (
                                                <div className="flex items-start gap-1.5 p-1.5 bg-[var(--color-error)] bg-opacity-10 border border-red-100 rounded">
                                                  <FiAlertCircle className="w-3 h-3 text-error mt-0.5 flex-shrink-0" />
                                                  <span className="text-[var(--color-on-error)]">
                                                    {tx.failureReason}
                                                  </span>
                                                </div>
                                              )}
                                              {tx.note && (
                                                <div className="p-1.5 bg-[var(--color-background)] border border-[var(--color-muted)] border-opacity-20 rounded">
                                                  <span className="font-medium text-[var(--color-on-surface)] opacity-70">
                                                    Note:
                                                  </span>{" "}
                                                  <span className="text-[var(--color-on-surface)] opacity-80">
                                                    {tx.note}
                                                  </span>
                                                </div>
                                              )}
                                              {tx.opsRemark && (
                                                <div className="p-1.5 bg-blue-50 border border-blue-200 rounded">
                                                  <span className="font-medium text-blue-800">
                                                    Ops:
                                                  </span>{" "}
                                                  <span className="text-blue-700">
                                                    {tx.opsRemark}
                                                  </span>
                                                </div>
                                              )}
                                              {tx?.receipt?.length > 0 && (
                                                <div>
                                                  <span className="font-medium text-[var(--color-on-surface)] opacity-70">
                                                    Files:
                                                  </span>{" "}
                                                  {tx.receipt.map((receipt) => (
                                                    <button
                                                      key={receipt.id}
                                                      onClick={() =>
                                                        fetchSignedUrl(
                                                          receipt.receiptKey
                                                        )
                                                      }
                                                      className="text-[var(--color-on-primary)] hover:underline mr-1.5"
                                                    >
                                                      {receipt.receiptKey
                                                        .split("/")
                                                        .pop()}
                                                    </button>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {/* Disbursal Transactions Table */}
                      {request.disbursalTransactions.length > 0 && (
                        <div className="overflow-x-auto bg-[var(--color-surface)] bg-opacity-30 p-3 rounded-lg border border-[var(--color-muted)] border-opacity-10">
                          {/* Header */}
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-1 h-5 bg-green-500 rounded-full"></div>
                            <h3 className="text-base font-semibold text-[var(--color-on-background)]">
                              Disbursal Transactions
                            </h3>
                            <span className="text-xs px-2 py-0.5 bg-[var(--color-muted)] bg-opacity-20 rounded-full font-medium">
                              {request.disbursalTransactions.length}
                            </span>
                          </div>

                          {/* Table */}
                          <table className="w-full border-collapse border border-[var(--color-muted)] border-opacity-20 text-xs">
                            <thead className="bg-[var(--color-muted)] bg-opacity-10">
                              <tr>
                                {[
                                  "Status",
                                  "Amount",
                                  "Method",
                                  "Ref Number",
                                  "Date",
                                ].map((col) => (
                                  <th
                                    key={col}
                                    className="border border-[var(--color-muted)] border-opacity-20 px-3 py-2.5 text-left font-semibold text-[var(--color-on-background)] whitespace-nowrap"
                                  >
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>

                            <tbody>
                              {request.disbursalTransactions.map(
                                (tx, txIndex) => {
                                  const rowBg =
                                    txIndex % 2 === 0
                                      ? "bg-white"
                                      : "bg-[var(--color-surface)] bg-opacity-20";
                                  const borderTop =
                                    txIndex > 0
                                      ? "border-t-2 border-[var(--color-muted)] border-opacity-30"
                                      : "";
                                  return (
                                    <>
                                      {/* Main Row */}
                                      <tr
                                        className={`hover:bg-[var(--color-muted)] hover:bg-opacity-5 ${rowBg} ${borderTop} transition-colors`}
                                      >
                                        {/* Status */}
                                        <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-3 py-2.5">
                                          <div className="flex items-center gap-1.5">
                                            {getStatusIcon(tx.status)}
                                            <span
                                              className={getStatusBadge(
                                                tx.status
                                              )}
                                            >
                                              {tx.status}
                                            </span>
                                          </div>
                                        </td>

                                        {/* Amount */}
                                        <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-3 py-2.5 font-semibold text-right whitespace-nowrap">
                                          BHD {tx.amount}{" "}
                                          <span className="text-[10px] text-[var(--color-on-surface)] opacity-70 font-normal ml-1">
                                            (Disbursal)
                                          </span>
                                        </td>

                                        {/* Method */}
                                        <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-3 py-2.5 text-[var(--color-on-surface)]">
                                          {tx.method}
                                        </td>

                                        {/* Ref Number */}
                                        <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-3 py-2.5 text-[var(--color-on-background)]">
                                          {tx.externalRef || "N/A"}
                                        </td>

                                        {/* Date */}
                                        <td className="border-l border-r border-[var(--color-muted)] border-opacity-20 px-3 py-2.5 whitespace-nowrap">
                                          {tx.completedAt
                                            ? formatDateWithTime(tx.completedAt)
                                            : "N/A"}
                                        </td>
                                      </tr>

                                      {/* Optional Details Row */}
                                      {(tx.failureReason || tx.note) && (
                                        <tr className={rowBg}>
                                          <td
                                            colSpan={5}
                                            className="border-l border-r border-b-2 border-[var(--color-muted)] border-opacity-30 px-4 py-3 bg-[var(--color-muted)] bg-opacity-10"
                                          >
                                            <div className="space-y-2 text-xs">
                                              {tx.failureReason && (
                                                <div className="flex items-start gap-2 p-2 bg-[var(--color-error)] bg-opacity-10 border border-red-100 rounded-md">
                                                  <FiAlertCircle className="w-3.5 h-3.5 text-error mt-0.5 flex-shrink-0" />
                                                  <span className="text-[var(--color-on-error)] leading-tight">
                                                    {tx.failureReason}
                                                  </span>
                                                </div>
                                              )}
                                              {tx.note && (
                                                <div className="p-2 bg-[var(--color-background)] border border-[var(--color-muted)] border-opacity-20 rounded-md">
                                                  <span className="font-medium text-[var(--color-on-surface)] opacity-70">
                                                    Note:
                                                  </span>{" "}
                                                  <span className="text-[var(--color-on-surface)] opacity-80">
                                                    {tx.note}
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </>
                                  );
                                }
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ))
            )}
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
            })
          }
          title={`Confirm ${
            confirmationDialog.action === "approve" ? "Approval" : "Rejection"
          }`}
        >
          <div className="space-y-4">
            <p className="text-[var(--color-on-surface)] opacity-80">
              Are you sure you want to {confirmationDialog.action} this payment
              request? Please provide a reason for this action (required).
            </p>

            <div>
              <label
                htmlFor="reason-textarea"
                className="block text-sm font-medium text-[var(--color-on-background)] mb-2"
              >
                Reason <span className="text-red-500">*</span>
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
                placeholder={`Please provide a reason for ${
                  confirmationDialog.action === "approve"
                    ? "approving"
                    : "rejecting"
                } this payment...`}
                className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EA5E18] focus:border-transparent resize-none bg-[var(--color-background)] text-[var(--color-on-background)]"
                rows={3}
                required
              />
              {!confirmationDialog.reason.trim() && (
                <p className="text-red-500 text-xs mt-1">Reason is required</p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() =>
                  setConfirmationDialog({
                    isOpen: false,
                    action: null,
                    paymentRequestId: "",
                    paymentCollectionTransactionId: null,
                    paymentPartialCollectionTransactionId: null,
                    reason: "",
                  })
                }
                className="flex-1 px-4 py-2 border border-[var(--color-muted)] border-opacity-30 text-[var(--color-on-surface)] opacity-80 rounded-lg hover:bg-[var(--color-muted)] hover:bg-opacity-10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={
                  !confirmationDialog.reason.trim() || actionLoading !== null
                }
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  confirmationDialog.action === "approve"
                    ? "bg-[#EA5E18] text-[var(--color-on-primary)] hover:bg-[#EA5E18]/90"
                    : "bg-red-600 text-white hover:bg-red-700"
                }`}
              >
                {actionLoading !== null ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin" />
                    <span className="ml-2">Processing...</span>
                  </div>
                ) : (
                  (() => {
                    const actionText =
                      confirmationDialog.action === "approve"
                        ? "Approval"
                        : "Rejection";
                    return `Confirm ${actionText}`;
                  })()
                )}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
