import { useState, useMemo } from "react";
import { formatDateWithTime } from "../../../lib/utils";
import { useAwsSignedUrl } from "../../../hooks/useAwsSignedUrl";
import Dialog from "../../../common/dialog";
import { PaymentRequest, Loan } from "../../../shared/types/loan";

// Icons
import {
  FiArrowUpRight,
  FiArrowDownLeft,
  FiActivity,
  FiCopy,
  FiCheck,
  FiEye,
  FiFileText,
  FiDownload,
  FiUser,
  FiCalendar,
  FiCreditCard,
} from "react-icons/fi";

// --- Types ---
interface Props {
  readonly paymentRequests: PaymentRequest[];
  readonly loanDetails?: Loan | null;
}

export function PaymentTransactionsSummary({
  paymentRequests,
  loanDetails,
}: Props) {
  const { fetchSignedUrl } = useAwsSignedUrl();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewLink, setViewLink] = useState<string | null>(null);

  // --- 1. Logic: Flatten & Summarize ---
  const { transactions, summary } = useMemo(() => {
    const list: any[] = [];
    const stats = { disbursed: 0, collected: 0, interest: 0, pending: 0 };

    const process = (txs: any[], type: "OUT" | "IN") => {
      if (!txs) return;
      txs.forEach((tx) => {
        list.push({ ...tx, txType: type });

        const amount = parseFloat(tx.amount || "0");
        const isSuccess =
          tx.status === "SUCCESS" &&
          (tx.opsApprovalStatus === "APPROVED" || type === "OUT");

        if (tx.status === "PENDING") {
          stats.pending += amount;
        } else if (isSuccess) {
          if (type === "OUT") stats.disbursed += amount;
          else {
            stats.collected += amount;
            // Safe Interest Extraction
            let interest = tx.totalFees || 0;
            if (!interest && tx.paymentDetails) {
              try {
                const d =
                  typeof tx.paymentDetails === "string"
                    ? JSON.parse(tx.paymentDetails)
                    : tx.paymentDetails;
                interest = parseFloat(d.interest || d.totalFees || "0");
              } catch (e) {}
            }
            stats.interest += interest;
          }
        }
      });
    };

    paymentRequests.forEach((req) => {
      process(req.disbursalTransactions, "OUT");
      process(req.collectionTransactions, "IN");
      process(req.partialCollectionTransactions, "IN");
    });

    return {
      transactions: list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      summary: stats,
    };
  }, [paymentRequests]);

  // --- Handlers ---
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return "bg-green-100 text-green-700 border-green-200";
      case "PENDING":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "FAILED":
        return "bg-red-50 text-red-700 border-red-200";
      case "REJECTED":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  if (!transactions.length && !loanDetails) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      {/* --- Section 1: Loan Context (Componentized) --- */}
      {loanDetails && <LoanDetailCard loan={loanDetails} />}

      {/* --- Section 2: Financial Stats --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Disbursed"
          amount={summary.disbursed}
          icon={<FiArrowUpRight />}
          color="text-red-600"
          bg="bg-red-50"
        />
        <SummaryCard
          label="Total Obligation"
          amount={loanDetails?.repayment?.totalObligation || 0}
          icon={<FiArrowUpRight />}
          color="text-red-600"
          bg="bg-red-50"
        />
        <SummaryCard
          label="Total Collected"
          amount={summary.collected}
          icon={<FiArrowDownLeft />}
          color="text-green-600"
          bg="bg-green-50"
        />
        <SummaryCard
          label="Murabaha margin Earned"
          amount={summary.interest}
          icon={<FiActivity />}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        {/* <SummaryCard
          label="Pending"
          amount={summary.pending}
          icon={<FiClock />}
          color="text-orange-600"
          bg="bg-orange-50"
        /> */}
      </div>

      {/* --- Section 3: Transactions Table --- */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-200 text-xs uppercase font-semibold">
              <tr>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Type / Ref</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3">Info</th>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map((tx) => {
                const isOut = tx.txType === "OUT";
                const isFullyApproved = isOut
                  ? tx.status === "SUCCESS"
                  : tx.status === "SUCCESS" &&
                    tx.opsApprovalStatus === "APPROVED";
                return (
                  <tr
                    key={tx.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      isFullyApproved ? "bg-green-50" : ""
                    }`}
                  >
                    <td className="px-5 py-3">
                      <div className="text-gray-900 font-medium">
                        {
                          formatDateWithTime(
                            tx.completedAt || tx.createdAt
                          ).split(",")[0]
                        }
                      </div>
                      <div className="text-xs text-gray-400">
                        {
                          formatDateWithTime(
                            tx.completedAt || tx.createdAt
                          ).split(",")[1]
                        }
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isOut ? "bg-red-500" : "bg-green-500"
                          }`}
                        ></span>
                        <span className="text-gray-700 font-medium text-xs">
                          {isOut ? "Disbursal" : "Repayment"}
                        </span>
                      </div>
                      <div
                        className="text-xs text-gray-400 pl-3.5 mt-0.5"
                        title={tx.externalRef}
                      >
                        {tx.externalRef || "-"}
                      </div>
                    </td>
                    <td
                      className={`px-5 py-3 text-right font-semibold ${
                        isOut ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {isOut ? "-" : "+"}{" "}
                      {parseFloat(tx.amount).toLocaleString("en-IN", {
                        style: "currency",
                        currency: "INR",
                      })}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 text-[11px] font-bold rounded border ${getStatusBadge(
                          tx.status
                        )}`}
                      >
                        {tx.status}
                      </span>
                      {tx.opsApprovalStatus && !isOut && (
                        <div
                          className={`text-[10px] font-bold mt-1 ${
                            tx.opsApprovalStatus === "APPROVED"
                              ? "text-green-600"
                              : "text-orange-600"
                          }`}
                        >
                          OPS: {tx.opsApprovalStatus}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 max-w-[150px]">
                      <div className="text-gray-700 text-xs">
                        {tx.method || tx.platformType || "-"}
                      </div>
                      <div
                        className="text-gray-400 text-[11px] truncate"
                        title={tx.note}
                      >
                        {tx.note || ""}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {tx.createdByPartner ? (
                        <div>
                          <div className="text-xs font-medium text-gray-700">
                            {tx.createdByPartner.name}
                          </div>
                          {tx.opsByPartner && (
                            <div className="text-[10px] text-gray-400">
                              Ops: {tx.opsByPartner.name}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {tx.paymentLink && (
                          <>
                            <TableAction
                              onClick={() => handleCopy(tx.id, tx.paymentLink)}
                              icon={
                                copiedId === tx.id ? (
                                  <FiCheck className="text-green-600" />
                                ) : (
                                  <FiCopy />
                                )
                              }
                              title="Copy Link"
                            />
                            <TableAction
                              onClick={() => setViewLink(tx.paymentLink)}
                              icon={<FiEye />}
                              title="View Receipt"
                            />
                          </>
                        )}
                        {(tx.externalUrl || tx.receipt?.length > 0) && (
                          <div className="w-px h-3 bg-gray-300 mx-1"></div>
                        )}
                        {tx.externalUrl && (
                          <TableAction
                            onClick={() => fetchSignedUrl(tx.externalUrl)}
                            icon={<FiFileText />}
                            title="Document"
                          />
                        )}
                        {tx.receipt?.map((r: any, i: number) => (
                          <TableAction
                            key={i}
                            onClick={() => fetchSignedUrl(r.receiptKey)}
                            icon={<FiDownload />}
                            title="Download"
                          />
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {viewLink && (
        <Dialog
          isOpen={true}
          onClose={() => setViewLink(null)}
          title="Transaction Receipt"
          size="xl"
        >
          <iframe
            src={viewLink}
            className="w-full h-[70vh] border-0"
            title="Receipt"
          />
        </Dialog>
      )}
    </div>
  );
}

// --- Sub-Components (Clean Architecture) ---

// 1. Reusable Loan Detail Card
const LoanDetailCard = ({ loan }: { loan: Loan }) => {
  // const normalizeDate = (date?: string | null) => {
  //   if (!date) return null;
  //   const d = new Date(date);
  //   d.setHours(0, 0, 0, 0);
  //   return d.getTime();
  // };
  return (
    <div className="bg-gradient-to-br from-white to-gray-50 border border-indigo-100 rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-5">
        {/* Header: High Level Info */}
        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-gray-100 mb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <FiCreditCard size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Loan ID
              </p>
              <p className="text-lg font-bold text-gray-900">
                {loan.formattedLoanId || loan.id}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Current Status
            </p>

            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-bold capitalize ${
                loan.status === "ACTIVE"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {loan.status?.toLowerCase() || "unknown"}
            </span>
          </div>
        </div>

        {/* Detail Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-6 gap-x-4">
          {/* Column 1: Dates */}
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase mb-2">
              <FiCalendar /> Timeline
            </h4>
            <DetailItem
              label="Application"
              value={loan.applicationDate}
              isDate
            />
            <DetailItem
              label="Disbursal"
              value={loan.disbursementDate}
              isDate
            />
            <DetailItem
              label="Due Date"
              value={loan.loanDetails?.dueDate}
              isDate
              highlight
            />
            <DetailItem label="Closure" value={loan.closureDate} isDate />
          </div>

          {/* Column 2: Financials */}
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase mb-2">
              Financials
            </h4>
            <DetailItem
              label="Total Obligation"
              value={loan.repayment?.totalObligation}
              isCurrency
            />
            <DetailItem
              label="Total Fees"
              value={loan.repayment?.totalFees}
              isCurrency
            />
            <DetailItem
              label="Net Disbursed"
              value={loan.disbursement?.netAmount}
              isCurrency
            />
            <DetailItem
              label="Effective APR"
              value={
                loan.costSummary?.effectiveAPR
                  ? `${loan.costSummary.effectiveAPR.toFixed(2)}%`
                  : null
              }
            />
          </div>

          {/* Column 3: User Info */}
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase mb-2">
              <FiUser /> Borrower
            </h4>
            <DetailItem
              label="Name"
              value={
                loan.user?.userDetails
                  ? `${loan.user.userDetails.firstName} ${loan.user.userDetails.lastName}`
                  : null
              }
            />
            <DetailItem label="Phone" value={loan.user?.phoneNumber} />
            <DetailItem
              label="Salary"
              value={loan.user?.employment?.salary}
              isCurrency
            />
          </div>

          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase mb-2">
              <FiActivity /> Operations
            </h4>
            <DetailItem
              label="Duration"
              value={
                loan.loanDetails?.durationDays
                  ? `${loan.loanDetails.durationDays} Days`
                  : null
              }
            />
            <DetailItem label="Type" value={loan.loanType} />
            {loan.allottedPartners && loan.allottedPartners.length > 0 && (
              <div className="mt-1">
                <p className="text-[10px] text-gray-400 uppercase">Partner</p>
                <p
                  className="text-sm font-medium text-gray-700 truncate"
                  title={loan.allottedPartners[0].partnerUser?.name}
                >
                  {loan.allottedPartners[0].partnerUser?.name}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 2. Helper for consistent Data Key-Value pairs
const DetailItem = ({
  label,
  value,
  isDate,
  isCurrency,
  highlight,
  capitalize,
}: {
  label: string;
  value?: string | number | null;
  isDate?: boolean;
  isCurrency?: boolean;
  highlight?: boolean;
  capitalize?: boolean;
}) => {
  if (value === null || value === undefined) return null;

  let displayValue = value;
  if (isDate)
    displayValue = new Date(value as string).toLocaleDateString("en-IN");
  if (isCurrency) displayValue = `₹${Number(value).toLocaleString()}`;

  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
        {label}
      </p>
      <p
        className={`text-sm ${
          highlight ? "font-bold text-red-600" : "font-medium text-gray-700"
        } ${capitalize ? "capitalize" : ""}`}
      >
        {displayValue}
      </p>
    </div>
  );
};

// 3. Stats Card
const SummaryCard = ({ label, amount, icon, color, bg }: any) => (
  <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex items-center justify-between">
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-lg font-bold text-gray-800">
        {amount.toLocaleString("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        })}
      </p>
    </div>
    <div className={`p-2 rounded-md ${bg} ${color} text-lg`}>{icon}</div>
  </div>
);

// 4. Action Button
const TableAction = ({ onClick, icon, title }: any) => (
  <button
    onClick={onClick}
    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
    title={title}
  >
    {icon}
  </button>
);

const EmptyState = () => (
  <div className="p-12 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-500">
    <FiFileText className="mx-auto text-4xl mb-2 opacity-20" />
    <p>No data available for this loan.</p>
  </div>
);
