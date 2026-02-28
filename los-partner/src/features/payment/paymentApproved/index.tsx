import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  HiXCircle,
  HiInbox,
  HiArrowPath,
  HiEye,
  HiChevronLeft,
  HiChevronRight,
  HiMagnifyingGlass,
  HiXMark,
  HiPencilSquare,
} from "react-icons/hi2";

import { getPaymentOpsApprovedTransactions } from "../../../shared/services/api/payment.api";
import { Button } from "../../../common/ui/button";
import { useCustomerNavigator } from "../../../hooks/useViewCustomer";
import LoanStatusUpdateModal from "./LoanStatusUpdateModal";
import { useAppSelector } from "../../../shared/redux/store";
import { isAdmin, isSuperAdmin } from "../../../lib/role";
import { LoanStatusBadge } from "../../../common/ui/LoanStatusBadge";

interface PaymentTransaction {
  id: string;
  amount: number;
  receiptId: string;
  method: string;
  status: string;
  opsApprovalStatus: string;
  createdAt: string;
  completedAt: string;
  externalRef?: string;
  isPaymentComplete?: boolean;
  isReloanApplicable?: boolean;
  createdByPartner: {
    name: string;
  } | null;
  paymentRequest: {
    id: string;
    type: string;
    loanId: string;
    loan: {
      id: string;
      formattedLoanId: string;
      oldLoanId?: string;
      amount: number;
      status: string;
      user: {
        id: string;
        phoneNumber: string;
        email: string;
        formattedUserId: string;
        userDetails: {
          firstName: string;
          lastName: string;
          middleName: string;
        };
      };
      brand: {
        id: string;
        name: string;
      };
    };
  };
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
}

// Skeleton shimmer animation
const Shimmer = ({ className }: { className?: string }) => (
  <div
    className={`animate-pulse bg-gradient-to-r from-[var(--muted)]/20 via-[var(--muted)]/40 to-[var(--muted)]/20 bg-[length:200%_100%] rounded ${className}`}
    style={{ animation: "shimmer 1.5s ease-in-out infinite" }}
  />
);

// Table skeleton row
const SkeletonRow = ({ index }: { index: number }) => (
  <tr
    className="border-b border-[var(--muted)]/8"
    style={{ animationDelay: `${index * 50}ms` }}
  >
    <td className="px-4 py-3.5">
      <Shimmer className="h-4 w-6" />
    </td>
    <td className="px-4 py-3.5">
      <div className="space-y-2">
        <Shimmer className="h-4 w-24" />
        <Shimmer className="h-3 w-16" />
      </div>
    </td>
    <td className="px-4 py-3.5">
      <Shimmer className="h-6 w-16 rounded-full" />
    </td>
    <td className="px-4 py-3.5 text-right">
      <Shimmer className="h-4 w-20 ml-auto" />
    </td>
  </tr>
);

// Type badge component
const TypeBadge = ({ type }: { type: string }) => {
  const isFull = type === "COLLECTION";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-semibold uppercase tracking-wide rounded-full border ${
        isFull
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-amber-50 text-amber-700 border-amber-200"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isFull ? "bg-emerald-500" : "bg-amber-500"
        }`}
      />
      {isFull ? "Full" : "Partial"}
    </span>
  );
};

// Method badge component
const MethodBadge = ({ method }: { method: string }) => {
  const getMethodConfig = (method: string) => {
    switch (method?.toUpperCase()) {
      case "MANUAL":
        return {
          bg: "bg-blue-50",
          text: "text-blue-700",
          border: "border-blue-200",
        };
      case "CASHFREE":
        return {
          bg: "bg-purple-50",
          text: "text-purple-700",
          border: "border-purple-200",
        };
      case "RAZORPAY":
        return {
          bg: "bg-indigo-50",
          text: "text-indigo-700",
          border: "border-indigo-200",
        };
      default:
        return {
          bg: "bg-gray-50",
          text: "text-gray-700",
          border: "border-gray-200",
        };
    }
  };

  const config = getMethodConfig(method);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-semibold uppercase tracking-wide rounded-full border ${config.bg} ${config.text} ${config.border}`}
    >
      {method?.replace("_", " ") || "N/A"}
    </span>
  );
};

// Filter Tab Button
const FilterTab = ({
  label,
  count,
  isActive,
  onClick,
}: {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`
      relative px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200
      ${
        isActive
          ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/25"
          : "text-[var(--on-surface)]/60 hover:text-[var(--on-surface)] hover:bg-[var(--muted)]/15"
      }
    `}
  >
    <span>{label}</span>
    <span
      className={`
        ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold
        ${
          isActive
            ? "bg-white/20 text-white"
            : "bg-[var(--muted)]/20 text-[var(--on-surface)]/50"
        }
      `}
    >
      {count}
    </span>
  </button>
);

export function PaymentApprovedPageComponent() {
  const { brandId } = useParams<{ brandId: string }>();
  const { handleView } = useCustomerNavigator();
  const auth = useAppSelector((state) => state.auth.data);
  const userRoles = auth?.role || [];

  const [transactionType, setTransactionType] = useState<
    "all" | "collection" | "partial_collection"
  >("all");
  const [collectionTransactions, setCollectionTransactions] = useState<
    PaymentTransaction[]
  >([]);
  const [partialCollectionTransactions, setPartialCollectionTransactions] =
    useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 25,
    total: 0,
  });
  const [collectionCount, setCollectionCount] = useState(0);
  const [partialCollectionCount, setPartialCollectionCount] = useState(0);
  const [refresh, setRefresh] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce search input
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 400);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  const fetchTransactions = useCallback(async () => {
    if (!brandId) return;

    try {
      setLoading(true);
      setError(null);

      const offset = (pagination.page - 1) * pagination.limit;

      // Fetch based on transaction type
      if (transactionType === "all") {
        const [collectionResponse, partialResponse] = await Promise.all([
          getPaymentOpsApprovedTransactions({
            brandId,
            limit: pagination.limit,
            offset,
            transactionType: "collection",
            search: debouncedSearch,
          }),
          getPaymentOpsApprovedTransactions({
            brandId,
            limit: pagination.limit,
            offset,
            transactionType: "partial_collection",
            search: debouncedSearch,
          }),
        ]);

        const filteredCollections = (
          collectionResponse.collectionTransactions || []
        ).filter((tx: PaymentTransaction) => tx.status === "SUCCESS");

        const filteredPartials = (
          partialResponse.partialCollectionTransactions || []
        ).filter((tx: PaymentTransaction) => tx.status === "SUCCESS");

        setCollectionTransactions(filteredCollections);
        setPartialCollectionTransactions(filteredPartials);
        setCollectionCount(collectionResponse.total || 0);
        setPartialCollectionCount(partialResponse.total || 0);
        setPagination((prev) => ({
          ...prev,
          total: (collectionResponse.total || 0) + (partialResponse.total || 0),
        }));
      } else if (transactionType === "collection") {
        const response = await getPaymentOpsApprovedTransactions({
          brandId,
          limit: pagination.limit,
          offset,
          transactionType: "collection",
          search: debouncedSearch,
        });

        const filtered = (response.collectionTransactions || []).filter(
          (tx: PaymentTransaction) => tx.status === "SUCCESS",
        );

        setCollectionTransactions(filtered);
        setPartialCollectionTransactions([]);
        setPagination((prev) => ({
          ...prev,
          total: response.total || 0,
        }));
      } else {
        const response = await getPaymentOpsApprovedTransactions({
          brandId,
          limit: pagination.limit,
          offset,
          transactionType: "partial_collection",
          search: debouncedSearch,
        });

        const filtered = (response.partialCollectionTransactions || []).filter(
          (tx: PaymentTransaction) => tx.status === "SUCCESS",
        );

        setPartialCollectionTransactions(filtered);
        setCollectionTransactions([]);
        setPagination((prev) => ({
          ...prev,
          total: response.total || 0,
        }));
      }
    } catch (err) {
      console.error("Error fetching approved transactions:", err);
      setError("Failed to load approved transactions");
    } finally {
      setLoading(false);
    }
  }, [
    brandId,
    pagination.page,
    pagination.limit,
    debouncedSearch,
    transactionType,
  ]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions, refresh]);

  const clearSearch = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    searchInputRef.current?.focus();
  };

  const tabCounts = useMemo(
    () => ({
      all: collectionCount + partialCollectionCount,
      collection: collectionCount,
      partial_collection: partialCollectionCount,
    }),
    [collectionCount, partialCollectionCount],
  );

  const currentTransactions = useMemo(() => {
    if (transactionType === "all") {
      return [...collectionTransactions, ...partialCollectionTransactions];
    }
    return transactionType === "collection"
      ? collectionTransactions
      : partialCollectionTransactions;
  }, [transactionType, collectionTransactions, partialCollectionTransactions]);

  const sortedTransactions = useMemo(() => {
    return currentTransactions;
  }, [currentTransactions]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="h-full flex flex-col bg-[var(--background)]">
      {/* Shimmer keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {/* Header */}
      <div className="flex-none border-b border-[var(--muted)]/15 bg-gradient-to-r from-[var(--surface)] to-[var(--background)] px-5 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title Section */}
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-base font-bold text-[var(--on-surface)] leading-tight">
                Approved Payments
              </h1>
              <p className="text-xs text-[var(--on-surface)]/50 mt-0.5 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${loading ? "bg-[var(--muted)]/30 animate-pulse" : "bg-emerald-500"}`}
                  />
                  <span>
                    {loading ? (
                      "Loading..."
                    ) : (
                      <>
                        <span className="font-semibold text-[var(--on-surface)]/70">
                          {tabCounts.all}
                        </span>
                        <span> approved transactions</span>
                        {debouncedSearch && (
                          <span className="ml-1 text-[var(--primary)]">
                            • Filtered by &quot;{debouncedSearch}&quot;
                          </span>
                        )}
                      </>
                    )}
                  </span>
                </span>
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-[var(--muted)]/10 rounded-xl">
              <FilterTab
                label="All"
                count={tabCounts.all}
                isActive={transactionType === "all"}
                onClick={() => {
                  setTransactionType("all");
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              />
              <FilterTab
                label="Full"
                count={tabCounts.collection}
                isActive={transactionType === "collection"}
                onClick={() => {
                  setTransactionType("collection");
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              />
              <FilterTab
                label="Partial"
                count={tabCounts.partial_collection}
                isActive={transactionType === "partial_collection"}
                onClick={() => {
                  setTransactionType("partial_collection");
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              />
            </div>

            {/* Search & Refresh */}
            <div className="flex items-center gap-2">
              {/* Update Status Button */}
              {(isSuperAdmin(userRoles) || isAdmin(userRoles)) && (
                <button
                  onClick={() => setIsStatusModalOpen(true)}
                  className="p-2.5 rounded-lg bg-[var(--primary)] hover:opacity-90 text-white transition-all flex items-center gap-2 text-sm font-semibold"
                  title="Update Loan Status"
                >
                  <HiPencilSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">Update Status</span>
                </button>
              )}

              {/* Search Input */}
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder="Search loan, customer, partner, method..."
                  className={`
                    w-56 pl-9 pr-9 py-2.5
                    text-sm font-medium rounded-xl
                    border-2 transition-all duration-200
                    bg-[var(--surface)]
                    text-[var(--on-surface)]
                    placeholder-[var(--on-surface)]/40
                    focus:outline-none
                    ${
                      isSearchFocused || searchTerm
                        ? "border-[var(--primary)] shadow-lg shadow-[var(--primary)]/10"
                        : "border-[var(--muted)]/30 hover:border-[var(--muted)]/50"
                    }
                  `}
                />
                <HiMagnifyingGlass
                  className={`
                    absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4
                    transition-colors duration-200
                    ${isSearchFocused || searchTerm ? "text-[var(--primary)]" : "text-[var(--on-surface)]/40"}
                  `}
                />
                {searchTerm && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-[var(--muted)]/20 text-[var(--on-surface)]/40 hover:text-[var(--on-surface)]/70 transition-all"
                  >
                    <HiXMark className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Refresh Button */}
              <button
                onClick={() => setRefresh(!refresh)}
                disabled={loading}
                className="p-2.5 rounded-lg bg-[var(--muted)]/10 hover:bg-[var(--muted)]/20 disabled:opacity-50 text-[var(--on-surface)]/60 hover:text-[var(--on-surface)] transition-all"
                title="Refresh"
              >
                <HiArrowPath
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Error State */}
        {error && (
          <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-3">
            <HiXCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
            <button
              onClick={() => {
                setRefresh(!refresh);
              }}
              className="ml-auto text-red-700 hover:text-red-900"
            >
              <HiArrowPath className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && sortedTransactions.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <HiInbox className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[var(--foreground)]">
                No approved transactions
              </h3>
              <p className="text-sm text-[var(--muted-foreground)] mt-2">
                There are no approved transactions currently available.
              </p>
            </div>
          </div>
        )}

        {/* Table */}
        {sortedTransactions.length > 0 && (
          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-[var(--muted)]/5 border-b border-[var(--muted)]/15">
                <tr className="text-[11px] font-semibold text-[var(--on-surface)]/50 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Loan ID</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left">Loan Status</th>
                  <th className="px-4 py-3 text-left">Payment Method</th>
                  <th className="px-4 py-3 text-left">External Ref</th>
                  <th className="px-4 py-3 text-left">Created By</th>
                  <th className="px-4 py-3 text-left">Approved Date</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--muted)]/8">
                {loading &&
                collectionTransactions.length === 0 &&
                partialCollectionTransactions.length === 0
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <SkeletonRow
                        key={`skeleton-${transactionType}-${pagination.page}-${i}`}
                        index={i}
                      />
                    ))
                  : sortedTransactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="hover:bg-[var(--muted)]/5 transition-colors text-sm"
                      >
                        {/* Type */}
                        <td className="px-4 py-3.5">
                          <TypeBadge
                            type={
                              transaction.paymentRequest?.type === "COLLECTION"
                                ? "COLLECTION"
                                : "PARTIAL_COLLECTION"
                            }
                          />
                        </td>

                        {/* Loan ID */}
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-[var(--on-surface)]">
                            {transaction.paymentRequest?.loan?.formattedLoanId}
                          </div>
                          <div className="text-xs text-[var(--on-surface)]/50">
                            {transaction.receiptId}
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-[var(--on-surface)]">
                            {`${
                              transaction.paymentRequest?.loan?.user
                                ?.userDetails?.firstName || ""
                            } ${
                              transaction.paymentRequest?.loan?.user
                                ?.userDetails?.lastName || ""
                            }`.trim()}
                          </div>
                          <div className="text-xs text-[var(--on-surface)]/50">
                            {
                              transaction.paymentRequest?.loan?.user
                                ?.phoneNumber
                            }
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <div className="font-semibold text-[var(--on-surface)]">
                            ₹
                            {Number(transaction.amount).toLocaleString("en-IN")}
                          </div>
                        </td>

                        {/* Loan Status */}
                        <td className="px-4 py-3.5">
                          <LoanStatusBadge
                            status={transaction.paymentRequest?.loan?.status || "N/A"}
                          />
                        </td>

                        {/* Payment Method */}
                        <td className="px-4 py-3.5">
                          <MethodBadge method={transaction.method} />
                        </td>

                        {/* External Ref */}
                        <td className="px-4 py-3.5">
                          <div className="text-sm text-[var(--on-surface)] font-mono break-all">
                            {transaction.externalRef || "N/A"}
                          </div>
                        </td>

                        {/* Created By */}
                        <td className="px-4 py-3.5">
                          <div className="text-sm text-[var(--on-surface)]">
                            {transaction.createdByPartner?.name || "N/A"}
                          </div>
                        </td>

                        {/* Approved Date */}
                        <td className="px-4 py-3.5">
                          <div className="text-sm text-[var(--on-surface)]">
                            {formatDate(
                              transaction.completedAt || transaction.createdAt,
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-center">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleView(
                                transaction.paymentRequest?.loan?.user?.id ||
                                  "",
                                brandId || "",
                                "payment",
                              );
                            }}
                            variant="outline"
                            className=""
                          >
                            <HiEye className="w-4 h-4 mr" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {sortedTransactions.length > 0 && (
          <div className="px-6 py-4 bg-white border-t border-[var(--border)] flex items-center justify-between">
            <div className="text-sm text-[var(--muted-foreground)]">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              of {pagination.total} results
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    page: Math.max(prev.page - 1, 1),
                  }))
                }
                disabled={pagination.page === 1 || loading}
              >
                <HiChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    page: prev.page + 1,
                  }))
                }
                disabled={
                  pagination.page >=
                    Math.ceil(pagination.total / pagination.limit) || loading
                }
              >
                <HiChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Loan Status Update Modal */}
      <LoanStatusUpdateModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        brandId={brandId}
      />
    </div>
  );
}
