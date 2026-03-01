import { useEffect, useState, useCallback, useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import { IoIosDocument } from "react-icons/io";
import {  FiMail, FiCopy } from "react-icons/fi";
import Avatar from "../../../common/ui/avatar";
import { useToast } from "../../../context/toastContext";
import { useQueryParams } from "../../../hooks/useQueryParams";
import Sidebar from "../../../common/sidebar";
import { FaClipboard } from "react-icons/fa";
import { formatDateWithTime } from "../../../lib/utils";
import {
  Table,
  Pagination as TablePagination,
  SearchInput,
  ErrorMessage,
} from "../../../common/ui/table";
import {
  PartnerTabsEnum,
  TransactionTypeEnum,
} from "../../../constant/enum";
import { useAwsSignedUrl } from "../../../hooks/useAwsSignedUrl";
import {
  getAllLoans,
  clearLoansCache,
} from "../../../shared/services/api/loan.api";
import { Loan } from "../../../shared/types/loan";
import { Pagination } from "../../../shared/types/pagination";
import { Filters } from "./filters";
import { FilterButton } from "../../../common/common/filterButton";
import { Button } from "../../../common/ui/button";
import { HiOutlineCalendar } from "react-icons/hi2";
import { useCustomerNavigator } from "../../../hooks/useViewCustomer";
import { usePersistedSearch } from "../../../hooks/usePersistedSearch";
import { useAppSelector } from "../../../shared/redux/store";
import dayjs from "dayjs";
import { LoanStatusBadge } from "../../../common/ui/LoanStatusBadge";
import { AcefoneClickToDialButton } from "../../acefone";

export default function LoanList() {
  const { search } = useLocation();
  const auth = useAppSelector((state) => state.auth.data);
  const { fetchSignedUrl } = useAwsSignedUrl();

  const { getQuery, setQuery, removeQuery } = useQueryParams();
  const paymentRequestIdLoanId = getQuery("paymentRequestIdLoanId");
  const { brandId } = useParams();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize pagination from localStorage to prevent double render
  const [pagination, setPagination] = useState<Pagination>(() => {
    const savedLimit = localStorage.getItem("loanCompletedListPageSize");
    const savedPage = localStorage.getItem("loanCompletedListPage");
    return {
      page: savedPage ? Number(savedPage) : 1,
      limit: savedLimit ? Number(savedLimit) : 10,
      dateFilter: "",
    };
  });

  const [totalCount, setTotalCount] = useState(0);
  const { searchTerm, setSearchTerm, clearSearch } = usePersistedSearch(
    "loanCompletedSearch"
  );

  // Cache clear state
  const [isClearingCache, setIsClearingCache] = useState(false);

  const queryParams = new URLSearchParams(search);
  const queryObject = Object.fromEntries(queryParams.entries());

  // Memoized calculations
  const totalPages = useMemo(() => {
    return Math.ceil(totalCount / pagination.limit);
  }, [totalCount, pagination.limit]);

  const fetchLoans = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    if (!brandId) {
      setError("Brand ID is required");
      setIsLoading(false);
      return;
    }
    try {
      const response = await getAllLoans(
        brandId,
        PartnerTabsEnum.COMPLETED_LOANS,
        {
          page: pagination.page,
          limit: pagination.limit,
          dateFilter: queryObject?.dateFilter,
        },
        {
          status: queryObject?.status || '["COMPLETED"]',
          search: searchTerm || "",
        }
      );
      setLoans(response.loans);
      setTotalCount(response.meta.total);
    } catch (err) {
  setError(
          err instanceof Error ? err.message :
          "Failed to fetch loans");      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [
    brandId,
    pagination,
    queryObject?.dateFilter,
    queryObject?.status,
    searchTerm,
  ]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (brandId) fetchLoans();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [fetchLoans, brandId]);

  const handlePageChange = useCallback((newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  }, []);

  const handleLimitChange = useCallback((newLimit: number) => {
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
  }, []);

  const { handleView } = useCustomerNavigator();

  // Toast for notifications
  const { showSuccess } = useToast();

  // Track copied loan ID for animation
  const [copiedLoanId, setCopiedLoanId] = useState<string | null>(null);

  // Handle cache clear
  const handleClearCache = useCallback(async () => {
    if (!brandId) return;

    setIsClearingCache(true);
    try {
      const result = await clearLoansCache(brandId);
      showSuccess(
        "Cache Cleared!",
        `${result.message} - Fresh data will load on next query`
      );
      // Refresh the current data
      await fetchLoans();
    } catch (error) {
      console.error("Error clearing cache:", error);
      showSuccess("Cache Clear Failed", "Please try again or contact support");
    } finally {
      setIsClearingCache(false);
    }
  }, [brandId, showSuccess, fetchLoans]);

  // Copy customer info to clipboard
  const copyCustomerInfo = useCallback(
    (loan: Loan, e: React.MouseEvent) => {
      e.stopPropagation();

      const fullName = [
        loan.user?.userDetails?.firstName,
        loan.user?.userDetails?.middleName,
        loan.user?.userDetails?.lastName,
      ]
        .filter(Boolean)
        .join(" ");

      const formattedName = fullName
        ? fullName
            .split(" ")
            .map(
              (word) =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            )
            .join(" ")
        : "N/A";

      const copyText = `
═══════════════════════════════
        CUSTOMER INFORMATION
═══════════════════════════════

👤 Personal Details
━━━━━━━━━━━━━━━━━━━━
Name: ${formattedName}
User ID: ${loan.user.id}
Loan ID: ${loan.id}
FormattedLoanId ID: ${loan.formattedLoanId}
${loan?.isMigratedloan ? `Migrated From: ${loan.oldLoanId}\n` : ""}
📧 Contact Information
━━━━━━━━━━━━━━━━━━━━
Email: ${loan.user.email || "N/A"}
Phone: ${loan.user.phoneNumber || "N/A"}

💰 Loan Details
━━━━━━━━━━━━━━━━━━━━
Amount: ₹${loan.amount?.toLocaleString("en-IN") || "N/A"}
Status: ${loan.status}
Agreement: ${
        loan?.agreement?.status
          ? loan.agreement.status.toLowerCase().replace(/_/g, " ")
          : "N/A"
      }

═══════════════════════════════
Generated on ${dayjs().format("DD MMM YYYY, hh:mm A")} by ${auth?.email}(${
        auth.name
      }) -  ${auth?.role || "N/A"} 
---- LOAN COMPLETED ----
═══════════════════════════════

    `.trim();

      navigator.clipboard.writeText(copyText).then(() => {
        setCopiedLoanId(loan.id);
        showSuccess("Copied!", "Customer information copied to clipboard");
        setTimeout(() => {
          setCopiedLoanId(null);
        }, 2000);
      });
    },
    [showSuccess]
  );

  const paymentRequest = loans.find(
    (loan) => loan.id === paymentRequestIdLoanId
  );

  // Define table columns
  const columns = useMemo(
    () => [
         {
        key: "customer",
        label: "Customer Info", // Updated label
        render: (_: any, loan: Loan) => {
          const fullName = [
            loan.user?.userDetails?.firstName,
            loan.user?.userDetails?.middleName,
            loan.user?.userDetails?.lastName,
          ]
            .filter(Boolean)
            .join(" ");

          const isForceBypass =
            loan?.forceCreditReportByPass || loan?.forceBsaReportByPass;

          return (
            <div className="flex items-start gap-3 w-[250px] group relative">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-[var(--color-surface)] rounded-full flex items-center justify-center overflow-hidden">
                  <Avatar />
                </div>
              </div>

              {/* Customer Details */}
              <div className="flex flex-col justify-center gap-1 w-full">
                {/* Name */}
                <div className="flex items-center gap-2">
                  <span className="text-[var(--color-on-background)] font-semibold text-sm truncate max-w-[180px]">
                    {fullName
                      ? fullName
                          .split(" ")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() +
                              word.slice(1).toLowerCase()
                          )
                          .join(" ")
                      : "N/A"}
                  </span>
                  {isForceBypass && (
                    <span className="inline-flex items-center bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded">
                      Force Bypass
                    </span>
                  )}
                </div>

                {/* Loan ID & Migration Badge */}
                <div className="flex items-center gap-2 text-xs text-[var(--color-on-surface)] opacity-70">
                  <span>{loan.formattedLoanId}</span>
                  {loan?.isMigratedloan && (
                      <span className=" inline-flex items-center bg-[var(--color-secondary)] bg-opacity-10 px-2 py-0.5 text-xs font-medium text-[var(--color-on-secondary)]">
                      Migrated ({loan.oldLoanId})
                    </span>
                  )}
                  {/* Loan Type Badge */}
                  {loan.loanType && (
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${
                      !loan?.is_repeat_loan
                        ? "bg-green-100 text-green-800"
                        : "bg-blue-100 text-blue-800"
                    }`}>
                      {!loan?.is_repeat_loan? "Fresh" : "Repeat"}
                    </span>
                  )}
                </div>

                {/* Email & Phone */}
                <div className="flex flex-col gap-1 text-xs text-[var(--color-on-surface)]">
                  <div className="flex items-center gap-1 truncate max-w-[200px]">
                    <FiMail className="h-3 w-3 text-[var(--color-on-surface)] opacity-50" />
                    <span className="truncate">{loan.user.email || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                   {loan.id && (
                                         <AcefoneClickToDialButton userId={loan.userId}
                                         loanId={loan.id}  
                                         />
                                       )}{" "}
                    <span>{loan.user.phoneNumber || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Copy Button */}
              <button
                onClick={(e) => copyCustomerInfo(loan, e)}
                className={`absolute -top-1 -right-1 p-1.5 rounded-md hover:bg-[var(--color-background)] opacity-0 group-hover:opacity-100 transition-all shadow-sm border border-[var(--color-muted)] border-opacity-30 ${
                  copiedLoanId === loan.id
                    ? "bg-green-500 scale-110 opacity-100"
                    : "bg-[var(--color-surface)]"
                }`}
                title={
                  copiedLoanId === loan.id ? "Copied!" : "Copy customer info"
                }
              >
                {copiedLoanId === loan.id ? (
                  <svg
                    className="h-3.5 w-3.5 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <FiCopy className="h-3.5 w-3.5 text-[var(--color-on-surface)]" />
                )}
              </button>
            </div>
          );
        },
      },
   
      {
        key: "status",
        label: "Status",
        render: (_: any, loan: Loan) => (
          <div className="flex flex-col gap-1">
            <LoanStatusBadge status={loan.status} />
            <span className="inline-flex items-center rounded-full bg-[var(--color-surface)] px-2 py-0.5 text-xs font-medium text-[var(--color-on-surface)] opacity-80 capitalize">
              Agreement: {loan.agreement?.status?.toLowerCase() || "N/A"}
            </span>
          </div>
        ),
      },
      {
        key: "transactions",
        label: "Transactions",
        render: (_: any, loan: Loan) =>
          loan.paymentRequests.length ? (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setQuery("paymentRequestIdLoanId", loan.id);
              }}
              variant="outline"
            >
              Transaction Details
            </Button>
          ) : (
            <span className="text-[var(--color-on-surface)] opacity-50">
              No Transactions
            </span>
          ),
      },
      {
        key: "created",
        label: "Created",
        render: (_: any, loan: Loan) => (
          <div className="text-sm text-[var(--color-on-background)] flex items-center gap-2">
            <HiOutlineCalendar className="h-4 w-4 text-[var(--color-on-surface)] opacity-50" />
            {formatDateWithTime(loan.createdAt)}
          </div>
        ),
      },
      {
        key: "view",
        label: "View",
        render: (_: any, loan: Loan) => (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleView(loan.user.id, brandId!, "completed");
            }}
            variant="outline"
          >
            View
          </Button>
        ),
      },
    ],
    [handleView, setQuery, copyCustomerInfo, copiedLoanId]
  );
  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "SUCCESS":
        return "bg-[var(--color-success)] bg-opacity-10 text-[var(--color-on-success)] border border-[var(--color-success)] border-opacity-30";
      case "PENDING":
        return "bg-[var(--color-secondary)] bg-opacity-10 text-[var(--color-warning)] border border-[var(--color-warning)] border-opacity-30";
      case "FAILED":
        return "bg-[var(--color-error)] bg-opacity-10 text-[var(--color-on-error)] border border-[var(--color-error)] border-opacity-30";
      case "CANCELLED":
        return "bg-[var(--color-surface)] text-[var(--color-on-background)] border-[var(--color-muted)] border-opacity-30";
      case "TIMEOUT":
        return "bg-[var(--color-secondary)] bg-opacity-10 text-[var(--color-warning)] border-orange-200";
      case "RETRYING":
        return "bg-[var(--color-primary)] bg-opacity-15 text-[var(--color-on-primary)] border border-[var(--color-primary)] border-opacity-30";
      default:
        return "bg-[var(--color-surface)] text-[var(--color-on-surface)] border border-[var(--color-muted)] border-opacity-30";
    }
  };
  return (
    <>
      <Sidebar
        isOpen={!!paymentRequest?.id}
        onClose={() => removeQuery("paymentRequestIdLoanId")}
        title="Payment Details"
      >
        {paymentRequest && (
          <div>
            {/* Loan Header */}
            <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-[var(--color-muted)] border-opacity-20">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xs font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider">
                    Loan ID
                  </h3>
                  <div className="mt-1 flex items-center">
                    <span className="text-lg font-bold text-[var(--color-on-background)]">
                      {paymentRequest.formattedLoanId}
                    </span>
                    <button
                      className="ml-2 text-[var(--color-on-surface)] opacity-50 hover:text-[var(--color-on-primary)]"
                      onClick={() =>
                        navigator.clipboard.writeText(
                          paymentRequest.formattedLoanId
                        )
                      }
                    >
                      <FaClipboard className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <LoanStatusBadge status={paymentRequest.status} />
              </div>
            </div>

            {/* Transactions Section */}
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--color-on-background)]">
                Transactions
              </h3>
              <span className="bg-[var(--color-surface)] text-[var(--color-on-background)] text-xs font-medium px-2.5 py-0.5 rounded-full">
                {paymentRequest.paymentRequests.length} records
              </span>
            </div>

            <div className="space-y-5">
              {paymentRequest.paymentRequests.length > 0 ? (
                <div className="space-y-6">
                  {paymentRequest.paymentRequests.map((request) => (
                    <div
                      key={request.id}
                      className="bg-white rounded-lg p-4 shadow-sm space-y-4 border border-[var(--color-muted)] border-opacity-20"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[var(--color-on-background)]">
                          {request.type}
                        </span>
                        {request.type === TransactionTypeEnum.DISBURSEMENT && (
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                              request.status
                            )}`}
                          >
                            {request.status}
                          </span>
                        )}
                      </div>

                      {/* Collection Transactions */}
{request.collectionTransactions?.map((transaction) => (
  <div
    key={transaction.id}
    className="bg-white rounded-xl border border-[var(--color-muted)] border-opacity-20 shadow-sm overflow-hidden"
  >
    {/* Transaction Header */}
    <div className="bg-[var(--color-surface)] bg-opacity-30 p-4 border-b border-[var(--color-muted)] border-opacity-20">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-4 bg-[#EA5E18] rounded-full"></div>
            <h3 className="text-sm font-semibold text-[var(--color-on-background)]">
              Collection Transaction
            </h3>
          </div>
          <div className="text-xs text-[var(--color-on-surface)] opacity-70 font-mono">
            ID: {transaction.id}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(
              transaction.status
            )}`}
          >
            {transaction.status}
          </span>
          {transaction.opsApprovalStatus && (
            <span
              className={`px-2 py-1 text-xs font-semibold rounded-full ${
                transaction.opsApprovalStatus === "APPROVED"
                  ? "bg-[var(--color-success)] bg-opacity-10 text-[var(--color-on-success)] border border-[var(--color-success)] border-opacity-30"
                  : transaction.opsApprovalStatus === "REJECTED"
                  ? "bg-[var(--color-error)] bg-opacity-10 text-[var(--color-on-error)] border border-[var(--color-error)] border-opacity-30"
                  : "bg-[var(--color-secondary)] bg-opacity-10 text-[var(--color-warning)] border border-[var(--color-warning)] border-opacity-30"
              }`}
            >
              Ops: {transaction.opsApprovalStatus}
            </span>
          )}
        </div>
      </div>
    </div>

    {/* Amount Breakdown Table */}
    <div className="p-4">
      <table className="w-full border-collapse border border-[var(--color-muted)] border-opacity-20 text-xs mb-4">
        <thead>
          <tr className="bg-[var(--color-muted)] bg-opacity-10">
            <th className="border border-[var(--color-muted)] border-opacity-20 px-3 py-2 text-left text-xs font-semibold text-[var(--color-on-background)]">
              Component
            </th>
            <th className="border border-[var(--color-muted)] border-opacity-20 px-3 py-2 text-right text-xs font-semibold text-[var(--color-on-background)]">
              Amount (₹)
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Principal Amount */}
          <tr className="bg-white hover:bg-[var(--color-muted)] hover:bg-opacity-5">
            <td className="border border-[var(--color-muted)] border-opacity-20 px-3 py-2 text-[var(--color-on-background)] font-medium">
              Principal
            </td>
            <td className="border border-[var(--color-muted)] border-opacity-20 px-3 py-2 text-right text-amber-600 font-semibold">
              {Number(transaction.principalAmount || 0).toLocaleString("en-IN")}
            </td>
          </tr>

          {/* Interest/Fees */}
          <tr className="bg-[var(--color-surface)] bg-opacity-20 hover:bg-[var(--color-muted)] hover:bg-opacity-5">
            <td className="border border-[var(--color-muted)] border-opacity-20 px-3 py-2 text-[var(--color-on-background)] font-medium">
              Murabaha margin
            </td>
            <td className="border border-[var(--color-muted)] border-opacity-20 px-3 py-2 text-right text-amber-600 font-semibold">
              {Number(transaction.totalFees || 0).toLocaleString("en-IN")}
            </td>
          </tr>

          {/* Taxes */}
          {Number(transaction.totalTaxes || 0) > 0 && (
            <tr className="bg-white hover:bg-[var(--color-muted)] hover:bg-opacity-5">
              <td className="border border-[var(--color-muted)] border-opacity-20 px-3 py-2 text-[var(--color-on-background)] font-medium">
                Taxes
              </td>
              <td className="border border-[var(--color-muted)] border-opacity-20 px-3 py-2 text-right text-amber-600 font-semibold">
                {Number(transaction.totalTaxes || 0).toLocaleString("en-IN")}
              </td>
            </tr>
          )}

          {/* Penalties */}
          {Number(transaction.totalPenalties || 0) > 0 && (
            <tr className="bg-white hover:bg-[var(--color-muted)] hover:bg-opacity-5">
              <td className="border border-[var(--color-muted)] border-opacity-20 px-3 py-2 text-[var(--color-on-background)] font-medium">
                Penalties
              </td>
              <td className="border border-[var(--color-muted)] border-opacity-20 px-3 py-2 text-right text-amber-600 font-semibold">
                {Number(transaction.totalPenalties || 0).toLocaleString("en-IN")}
              </td>
            </tr>
          )}

          {/* Penalty Discount */}
          {Number(transaction.penaltyDiscount || 0) > 0 && (
            <tr className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <td className="border border-[var(--color-muted)] border-opacity-20 px-3 py-2 text-[var(--color-on-background)] font-medium text-blue-900">
                Penalty Discount
              </td>
              <td className="border border-[var(--color-muted)] border-opacity-20 px-3 py-2 text-right text-blue-600 font-bold">
                -{Number(transaction.penaltyDiscount || 0).toLocaleString("en-IN")}
              </td>
            </tr>
          )}

          {/* Round Off Discount */}
          {Number(transaction.roundOffDiscount || 0) > 0 && (
            <tr className="bg-gradient-to-r from-purple-50 to-pink-50">
              <td className="border border-[var(--color-muted)] border-opacity-20 px-3 py-2 text-[var(--color-on-background)]">
                <div className="font-medium text-purple-900">Round Off Discount</div>
                <div className="text-[10px] text-purple-700 italic">(on Murabaha margin + Principal)</div>
              </td>
              <td className="border border-[var(--color-muted)] border-opacity-20 px-3 py-2 text-right text-purple-700 font-bold">
                -{Number(transaction.roundOffDiscount || 0).toLocaleString("en-IN")}
              </td>
            </tr>
          )}

          {/* Excess Amount */}
          {Number(transaction.excessAmount || 0) > 0 && (
            <tr className="bg-gradient-to-r from-green-50 to-emerald-50">
              <td className="border border-[var(--color-muted)] border-opacity-20 px-3 py-2 text-[var(--color-on-background)] font-medium text-green-900">
                Excess Amount
              </td>
              <td className="border border-[var(--color-muted)] border-opacity-20 px-3 py-2 text-right text-green-700 font-bold">
                +{Number(transaction.excessAmount || 0).toLocaleString("en-IN")}
              </td>
            </tr>
          )}

          {/* Total Amount */}
          <tr className="bg-gradient-to-r from-slate-100 to-slate-200 border-t-2 border-slate-300 font-bold">
            <td className="border border-[var(--color-muted)] border-opacity-20 px-3 py-3 text-[var(--color-on-background)]">
              <div className="text-sm">Total Amount</div>
            </td>
            <td className="border border-[var(--color-muted)] border-opacity-20 px-3 py-3 text-right text-red-700 text-sm">
              {Number(transaction.amount || 0).toLocaleString("en-IN")}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Transaction Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        {/* Left Column */}
        <div className="space-y-3">
          {/* Method */}
          {transaction.method && (
            <div className="flex justify-between items-center py-1 border-b border-[var(--color-muted)] border-opacity-10">
              <span className="text-[var(--color-on-surface)] opacity-70">Method:</span>
              <span className="text-[var(--color-on-background)] font-medium">{transaction.method}</span>
            </div>
          )}

          {/* Closing Type */}
          {transaction.closingType && (
            <div className="flex justify-between items-center py-1 border-b border-[var(--color-muted)] border-opacity-10">
              <span className="text-[var(--color-on-surface)] opacity-70">Closing Type:</span>
              <span className="text-[var(--color-on-background)] font-medium">{transaction.closingType}</span>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          {/* Receipt ID */}
          {transaction.receiptId && (
            <div className="flex justify-between items-center py-1 border-b border-[var(--color-muted)] border-opacity-10">
              <span className="text-[var(--color-on-surface)] opacity-70">Receipt ID:</span>
              <span className="text-[var(--color-on-background)] font-mono text-xs font-medium">
                {transaction.receiptId}
              </span>
            </div>
          )}

          {/* External Ref */}
          {transaction.externalRef && (
            <div className="flex justify-between items-center py-1 border-b border-[var(--color-muted)] border-opacity-10">
              <span className="text-[var(--color-on-surface)] opacity-70">External Ref:</span>
              <span className="text-[var(--color-on-background)] font-medium">{transaction.externalRef}</span>
            </div>
          )}

          {/* Completed Date */}
          {transaction.completedAt && (
            <div className="flex justify-between items-center py-1 border-b border-[var(--color-muted)] border-opacity-10">
              <span className="text-[var(--color-on-surface)] opacity-70">Completed:</span>
              <span className="text-[var(--color-on-background)] font-medium">
                {formatDateWithTime(transaction.completedAt)}
              </span>
            </div>
          )}

          {/* Reloan Applicable */}
          <div className="flex justify-between items-center py-1 border-b border-[var(--color-muted)] border-opacity-10">
            <span className="text-[var(--color-on-surface)] opacity-70">Reloan Applicable:</span>
            <span
              className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                transaction.isReloanApplicable
                  ? "bg-[var(--color-success)] bg-opacity-10 text-[var(--color-on-success)] border border-[var(--color-success)] border-opacity-30"
                  : "bg-[var(--color-surface)] text-[var(--color-on-surface)] border border-[var(--color-muted)] border-opacity-30"
              }`}
            >
              {transaction.isReloanApplicable ? "Yes" : "No"}
            </span>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="mt-4 pt-4 border-t border-[var(--color-muted)] border-opacity-30">
        {/* Note */}
        {transaction.note && (
          <div className="text-sm mb-3 p-2 bg-blue-50 rounded border border-blue-200">
            <span className="font-medium text-blue-900">Note: </span>
            <span className="text-blue-800">{transaction.note}</span>
          </div>
        )}

        {/* Ops Remark */}
        {transaction.opsRemark && (
          <div className="text-sm mb-3 p-2 bg-amber-50 rounded border border-amber-200">
            <span className="font-medium text-amber-900">Ops Remark: </span>
            <span className="text-amber-800">{transaction.opsRemark}</span>
          </div>
        )}

        {/* Reloan Remark */}
        {transaction.reloanRemark && (
          <div className="text-sm mb-3 p-2 bg-green-50 rounded border border-green-200">
            <span className="font-medium text-green-900">Reloan Remark: </span>
            <span className="text-green-800">{transaction.reloanRemark}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mt-3">
          {/* Receipts */}
          {transaction?.receipt?.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[var(--color-on-surface)] opacity-70">
                Receipts:
              </span>
              <div className="flex flex-wrap gap-1">
                {transaction.receipt.map((receipt) => (
                  <button
                    key={receipt.id}
                    onClick={() => fetchSignedUrl(receipt.receiptKey)}
                    className="flex items-center gap-1 px-2 py-1 bg-[var(--color-surface)] hover:bg-[var(--color-muted)] border border-[var(--color-muted)] border-opacity-30 rounded text-xs text-[var(--color-on-background)] transition-colors"
                  >
                    <IoIosDocument className="h-3 w-3" />
                    {receipt.receiptKey.split("/").pop()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
))}

                      {/* Disbursal Transactions */}
                      {request.disbursalTransactions?.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="p-4 bg-white rounded-xl border border-[var(--color-muted)] border-opacity-30 shadow-sm space-y-3 text-sm text-[var(--color-on-surface)] opacity-80"
                        >
                          {/* Transaction ID */}
                          <div className="flex justify-between items-center">
                            <span className="text-[var(--color-on-surface)] opacity-70">
                              Transaction ID:
                            </span>
                            <span className="text-[var(--color-on-background)] font-medium">
                              {transaction.id}
                            </span>
                          </div>

                          {/* Amount */}
                          <div className="flex justify-between items-center">
                            <span className="text-[var(--color-on-surface)] opacity-70">
                              Amount:
                            </span>
                            <span className="text-[var(--color-on-success)] font-semibold">
                              ₹{transaction.amount.toLocaleString()}
                            </span>
                          </div>

                          {/* Payment Status */}
                          <div className="flex justify-between items-center">
                            <span className="text-[var(--color-on-surface)] opacity-70">
                              Status:
                            </span>
                            <span
                              className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(
                                transaction.status
                              )}`}
                            >
                              {transaction.status}
                            </span>
                          </div>

                          {/* Optional Metadata */}
                          {transaction.note && (
                            <div className="text-xs text-[var(--color-on-surface)] opacity-70">
                              <span className="font-medium text-[var(--color-on-surface)] opacity-70">
                                Note:
                              </span>{" "}
                              {transaction.note}
                            </div>
                          )}

                          {transaction.externalRef && (
                            <div className="text-xs text-[var(--color-on-surface)] opacity-70">
                              <span className="font-medium text-[var(--color-on-surface)] opacity-70">
                                External Ref:
                              </span>{" "}
                              {transaction.externalRef}
                            </div>
                          )}

                          {transaction.receiptId && (
                            <div className="text-xs text-[var(--color-on-surface)] opacity-70">
                              <span className="font-medium text-[var(--color-on-surface)] opacity-70">
                                Receipt ID (Auto-generated):
                              </span>{" "}
                              {transaction.receiptId}
                            </div>
                          )}

                          {transaction.completedAt && (
                            <div className="flex justify-between items-center">
                              <span className="text-[var(--color-on-surface)] opacity-70">
                                Completed At:
                              </span>
                              <span className="text-[var(--color-on-background)]">
                                {formatDateWithTime(transaction.completedAt)}
                              </span>
                            </div>
                          )}

                          {transaction.method && (
                            <div className="flex justify-between items-center">
                              <span className="text-[var(--color-on-surface)] opacity-70">
                                Method:
                              </span>
                              <span className="text-[var(--color-on-background)]">
                                {transaction.method}
                              </span>
                            </div>
                          )}

                          {/* External URL */}
                          {transaction.externalUrl && (
                            <div className="text-xs">
                              <button
                                onClick={() =>
                                  fetchSignedUrl(transaction.externalUrl)
                                }
                                rel="noopener noreferrer"
                                className="text-[var(--color-on-primary)] hover:underline"
                              >
                                View External URL
                              </button>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Partial Collection Transactions */}
                      {request.partialCollectionTransactions?.map(
                        (transaction) => (
                          <div
                            key={transaction.id}
                            className="p-4 bg-white rounded-xl border border-[var(--color-muted)] border-opacity-30 shadow-sm space-y-3 text-sm text-[var(--color-on-surface)] opacity-80"
                          >
                            {/* Header Info */}
                            <div className="flex justify-between items-center">
                              <span className="text-[var(--color-on-surface)] opacity-70">
                                Transaction ID:
                              </span>
                              <span className="font-medium text-[var(--color-on-background)]">
                                {transaction.id}
                              </span>
                            </div>

                            <div className="flex justify-between items-center">
                              <span className="text-[var(--color-on-surface)] opacity-70">
                                Amount:
                              </span>
                              <span className="text-[var(--color-on-success)] font-semibold">
                                ₹{transaction.amount.toLocaleString()}
                              </span>
                            </div>

                            {transaction.closingType && (
                              <div className="flex justify-between items-center">
                                <span className="text-[var(--color-on-surface)] opacity-70">
                                  Closing Type:
                                </span>
                                <span className="text-[var(--color-on-background)]">
                                  {transaction.closingType}
                                </span>
                              </div>
                            )}

                            <div className="flex justify-between items-center">
                              <span className="text-[var(--color-on-surface)] opacity-70">
                                Payment Status:
                              </span>
                              <span
                                className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(
                                  transaction.status
                                )}`}
                              >
                                {transaction.status}
                              </span>
                            </div>

                            {/* 🔶 Highlighted Ops Approval */}
                            {transaction.opsApprovalStatus && (
                              <div className="flex justify-between items-center">
                                <span className="text-[var(--color-on-surface)] opacity-70">
                                  Ops Status:
                                </span>
                                <span
                                  className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                    transaction.opsApprovalStatus === "APPROVED"
                                      ? "bg-[var(--color-success)] bg-opacity-10 text-[var(--color-on-success)]"
                                      : transaction.opsApprovalStatus ===
                                        "REJECTED"
                                      ? "bg-[var(--color-error)] bg-opacity-10 text-[var(--color-on-error)]"
                                      : "bg-[var(--color-secondary)] bg-opacity-10 text-[var(--color-warning)]"
                                  }`}
                                >
                                  {transaction.opsApprovalStatus}
                                </span>
                              </div>
                            )}

                            {/* Optional Details */}
                            {transaction.note && (
                              <div className="text-xs text-[var(--color-on-surface)] opacity-70">
                                <span className="font-medium text-[var(--color-on-surface)] opacity-70">
                                  Note:
                                </span>{" "}
                                {transaction.note}
                              </div>
                            )}
                            {transaction.externalRef && (
                              <div className="text-xs text-[var(--color-on-surface)] opacity-70">
                                <span className="font-medium text-[var(--color-on-surface)] opacity-70">
                                  External Ref:
                                </span>{" "}
                                {transaction.externalRef}
                              </div>
                            )}
                            {transaction.receiptId && (
                              <div className="text-xs text-[var(--color-on-surface)] opacity-70">
                                <span className="font-medium text-[var(--color-on-surface)] opacity-70">
                                  Receipt ID (Auto-generated):
                                </span>{" "}
                                {transaction.receiptId}
                              </div>
                            )}
                            <div className="text-xs text-[var(--color-on-surface)] opacity-70">
                              <span className="font-medium text-[var(--color-on-surface)] opacity-70">
                                Ops Remark:
                              </span>{" "}
                              {transaction?.opsRemark || "N/A"}
                            </div>
                            {transaction.completedAt && (
                              <div className="text-xs text-[var(--color-on-surface)] opacity-70">
                                <span className="font-medium text-[var(--color-on-surface)] opacity-70">
                                  Completed At:
                                </span>{" "}
                                {formatDateWithTime(transaction.completedAt)}
                              </div>
                            )}
                            {transaction.method && (
                              <div className="text-xs text-[var(--color-on-surface)] opacity-70">
                                <span className="font-medium text-[var(--color-on-surface)] opacity-70">
                                  Method:
                                </span>{" "}
                                {transaction.method}
                              </div>
                            )}
                            {/* External URL */}
                            {transaction.externalUrl && (
                              <div className="text-xs">
                                <button
                                  onClick={() =>
                                    fetchSignedUrl(transaction.externalUrl)
                                  }
                                  rel="noopener noreferrer"
                                  className="text-[var(--color-on-primary)] hover:underline"
                                >
                                  View External URL
                                </button>
                              </div>
                            )}
                            {/* // recipt  */}
                            {transaction?.receipt?.length > 0 && (
                              <div className="text-xs text-[var(--color-on-surface)] opacity-70">
                                <span className="font-medium text-[var(--color-on-surface)] opacity-70">
                                  Receipt:
                                </span>{" "}
                                {transaction.receipt.map((receipt) => (
                                  <button
                                    onClick={() =>
                                      fetchSignedUrl(receipt.receiptKey)
                                    }
                                    key={receipt.id}
                                    rel="noopener noreferrer"
                                    className="text-[var(--color-on-primary)] hover:underline"
                                  >
                                    {receipt.receiptKey.split("/").pop()}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <IoIosDocument className="mx-auto h-12 w-12 text-[var(--color-muted)]" />
                  <h3 className="mt-4 text-sm font-medium text-[var(--color-on-background)]">
                    No transactions found
                  </h3>
                  <p className="mt-1 text-sm text-[var(--color-on-surface)] opacity-70">
                    This payment request has no associated transactions yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </Sidebar>

      <div className="h-[calc(100vh-80px)] flex flex-col">
        {/* Error Message */}
        {error && (
          <div className="bg-white px-6 py-2 w-full flex-shrink-0">
            <ErrorMessage message={error} onRetry={() => setError(null)} />
          </div>
        )}

        {/* Header Section - Full Width */}
        <div className="bg-white border-b border-[var(--color-muted)] border-opacity-30   px-6 py-4 w-full flex-shrink-0">
          <div className="flex items-center justify-between w-full">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--color-on-background)]">
                Loans Completed{" "}
                <span className="text-gray-500 font-normal">
                  ({totalCount})
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-84">
                <SearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search by Name,ID,Email,or Phone"
                  onClear={clearSearch}
                />
              </div>
              <Button
                variant="surface"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearCache();
                }}
                disabled={isClearingCache}
                className="flex items-center gap-2 border-orange-300 hover:border-orange-400 hover:bg-orange-50 text-orange-700"
              >
                {isClearingCache ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-600 border-t-transparent"></div>
                    Clearing...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Sync
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Filter Button */}
        <div className="flex-shrink-0 bg-white border-b border-[var(--color-muted)] border-opacity-30  px-6 py-3 w-full flex justify-between items-center">
          <FilterButton />
          {/* <Button
            variant="surface"
            onClick={(e) => {
              e.stopPropagation();
              handleClearCache();
            }}
            disabled={isClearingCache}
            className="flex items-center gap-2 border-orange-300 hover:border-orange-400 hover:bg-orange-50 text-orange-700"
          >
            {isClearingCache ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-600 border-t-transparent"></div>
                Clearing...
              </>
            ) : (
              <>
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                  />
                </svg>
                Sync
              </>
            )}
          </Button> */}
        </div>

        {/* Main Content Area with Filters and Table */}
        <div className="flex flex-1 min-h-0">
          {/* Filters Sidebar - Separate Scrollable */}
          <div className=" flex-shrink-0 border-r border-gray-200 bg-white">
            <div className="h-full overflow-y-auto">
              <Filters />
            </div>
          </div>
          {/* Table Container - Separate Scrollable */}
          <div className="flex-1 bg-white min-w-0">
            <div className="h-full overflow-y-auto overflow-x-auto">
              <Table
                columns={columns}
                data={loans}
                loading={isLoading}
                emptyMessage={
                  searchTerm
                    ? `No results for "${searchTerm}"`
                    : "No loans found"
                }
                className="border-0 rounded-none"
              />
            </div>
          </div>
        </div>

        {/* Fixed Pagination - Always at Bottom */}
        {totalCount > 0 && (
          <div className="bg-white border-t w-full flex-shrink-0">
            <TablePagination
              currentPage={pagination.page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pagination.limit}
              onPageChange={handlePageChange}
              onPageSizeChange={handleLimitChange}
              storageKey="loanCompletedList"
            />
          </div>
        )}
      </div>
    </>
  );
}
