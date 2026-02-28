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
  HiClock,
} from "react-icons/hi2";

import { getPendingOpsApprovalTransactions } from "../../../shared/services/api/payment.api";
import { PaymentApprovalV2 } from "../../loansOps/components/paymentApprovalV2";
import { Button } from "../../../common/ui/button";
import { useCustomerNavigator } from "../../../hooks/useViewCustomer";

interface PaymentTransaction {
  id: string;
  amount: number;
  receiptId: string;
  method: string;
  status: string;
  opsApprovalStatus: string;
  createdAt: string;
  completedAt: string;
  bankName?: string;
  isPaymentComplete?: boolean;
  isReloanApplicable?: boolean;
  closingType?: string;
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
        userDetails:{
           firstName:string;
                      lastName:string;
                      middleName: string;
        }
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

type SortField = "createdAt" | "amount" | "loanAmount" | "loanId";
type SortDirection = "asc" | "desc";

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
    <td className="px-4 py-3.5 text-right hidden md:table-cell">
      <Shimmer className="h-4 w-18 ml-auto" />
    </td>
    <td className="px-4 py-3.5">
      <div className="space-y-2">
        <Shimmer className="h-4 w-20" />
        <Shimmer className="h-3 w-28" />
      </div>
    </td>
    <td className="px-4 py-3.5">
      <Shimmer className="h-4 w-20" />
    </td>
    <td className="px-4 py-3.5">
      <Shimmer className="h-6 w-16 rounded-full" />
    </td>
    <td className="px-4 py-3.5">
      <Shimmer className="h-4 w-20" />
    </td>
    <td className="px-4 py-3.5 text-center">
      <Shimmer className="h-9 w-24 mx-auto rounded-lg" />
    </td>
  </tr>
);

// Type badge component with improved styling
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
const MethodBadge = ({ method, bankName }: { method: string; bankName?: string }) => {
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
  const isManual = method?.toUpperCase() === "MANUAL";

  if (isManual && bankName) {
    return (
      <div className="flex flex-col gap-0.5">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-semibold uppercase tracking-wide rounded-full border ${config.bg} ${config.text} ${config.border}`}
        >
          {method}
        </span>
        <span className="text-[13px] text-gray-600 font-medium px-1">
          {bankName}
        </span>
      </div>
    );
  }

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

export function PaymentApprovalPageComponent() {
  const { brandId } = useParams<{ brandId: string }>();
  const { handleView } = useCustomerNavigator();
  const [paymentApprovalLoanId, setPaymentApprovalLoanId] = useState<
    string | null
  >(null);

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
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

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
      setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page on search
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

      const response = await getPendingOpsApprovalTransactions({
        brandId,
        limit: pagination.limit,
        offset,
        transactionType,
        search: debouncedSearch,
      });

      if (transactionType === "all") {
        const collections = response.collectionTransactions || [];
        const partialCollections = response.partialCollectionTransactions || [];
        setCollectionTransactions(collections);
        setPartialCollectionTransactions(partialCollections);
        setCollectionCount(response.collectionCount || collections.length);
        setPartialCollectionCount(response.partialCollectionCount || partialCollections.length);
        setPagination((prev) => ({
          ...prev,
          total: response.total || (collections.length + partialCollections.length),
        }));
      } else if (transactionType === "collection") {
        const data = response.data || [];
        setCollectionTransactions(data);
        setPartialCollectionTransactions([]);
        setPagination((prev) => ({ ...prev, total: response.total || data.length }));
      } else {
        const data = response.data || [];
        setPartialCollectionTransactions(data);
        setCollectionTransactions([]);
        setPagination((prev) => ({ ...prev, total: response.total || data.length }));
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch transactions"
      );
    } finally {
      setLoading(false);
    }
  }, [brandId, pagination.page, pagination.limit, transactionType, debouncedSearch, refresh]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    searchInputRef.current?.focus();
  };

  // Sort transactions client-side (search is handled server-side)
  const sortedTransactions = useMemo(() => {
    let transactions: PaymentTransaction[];
    if (transactionType === "all") {
      transactions = [
        ...collectionTransactions,
        ...partialCollectionTransactions,
      ];
    } else {
      transactions =
        transactionType === "collection"
          ? collectionTransactions
          : partialCollectionTransactions;
    }

    return transactions.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      if (sortField === "amount") {
        aVal = a.amount;
        bVal = b.amount;
      } else if (sortField === "loanAmount") {
        aVal = a.paymentRequest.loan.amount;
        bVal = b.paymentRequest.loan.amount;
      } else if (sortField === "loanId") {
        aVal = a.paymentRequest.loan.formattedLoanId;
        bVal = b.paymentRequest.loan.formattedLoanId;
      } else {
        aVal = new Date(a.createdAt).getTime();
        bVal = new Date(b.createdAt).getTime();
      }

      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });
  }, [
    transactionType,
    collectionTransactions,
    partialCollectionTransactions,
    sortField,
    sortDirection,
  ]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const tabCounts = useMemo(
    () => ({
      all: collectionCount + partialCollectionCount,
      collection: collectionCount,
      partial_collection: partialCollectionCount,
    }),
    [collectionCount, partialCollectionCount]
  );

  const totalPages = Math.ceil(pagination.total / pagination.limit) || 1;

  return (
    <div className="h-full flex flex-col bg-[var(--background)]">
      {/* Shimmer keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {paymentApprovalLoanId && (
        <PaymentApprovalV2
          refresh={refresh}
          setRefresh={setRefresh}
          loanId={paymentApprovalLoanId}
          setLoanId={setPaymentApprovalLoanId}
        />
      )}

      {/* Header */}
      <div className="flex-none border-b border-[var(--muted)]/15 bg-gradient-to-r from-[var(--surface)] to-[var(--background)] px-5 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title Section */}
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-base font-bold text-[var(--on-surface)] leading-tight">
                Payment Approvals
              </h1>
              <p className="text-xs text-[var(--on-surface)]/50 mt-0.5 flex items-center gap-1.5">
                <HiClock className="w-3 h-3" />
                {loading ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[var(--muted)]/30 animate-pulse" />
                    <span>Loading...</span>
                  </span>
                ) : (
                  <span>
                    <span className="font-semibold text-[var(--on-surface)]/70">{tabCounts.all}</span>
                    <span> pending review</span>
                    {searchTerm && (
                      <span className="ml-1 text-[var(--primary)]">
                        • Filtered by &quot;{debouncedSearch}&quot;
                      </span>
                    )}
                  </span>
                )}
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
                onClick={fetchTransactions}
                disabled={loading}
                className={`
                  p-2.5 rounded-xl border-2 transition-all duration-200
                  ${
                    loading
                      ? "border-[var(--muted)]/20 bg-[var(--muted)]/10 text-[var(--on-surface)]/30"
                      : "border-[var(--muted)]/30 hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 text-[var(--on-surface)]/60 hover:text-[var(--primary)]"
                  }
                `}
                title="Refresh data"
              >
                <HiArrowPath className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex-none mx-5 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100">
            <HiXCircle className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Error loading data</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
          <button
            onClick={fetchTransactions}
            className="px-3 py-1.5 text-xs font-semibold text-red-700 hover:text-red-900 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto px-5 py-4">
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--muted)]/15 overflow-hidden shadow-sm min-w-[1200px]">
          <table className="w-full text-sm border-collapse table-fixed">
            <thead className="sticky top-0 z-20 bg-[var(--background)]">
              <tr className="text-[var(--on-surface)]/60 border-b border-[var(--muted)]/15">
                <th className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider w-10">#</th>

                {/* Loan ID */}
                <th
                  className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider cursor-pointer hover:text-[var(--on-surface)] transition-colors select-none w-[140px]"
                  onClick={() => handleSort("loanId")}
                >
                  Loan ID
                </th>

                <th className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider w-[100px]">Old Loan ID</th>

                <th className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider w-[80px]">Type</th>

                {/* Amount */}
                <th
                  className="px-3 py-3 text-right font-semibold text-xs uppercase tracking-wider cursor-pointer hover:text-[var(--on-surface)] transition-colors select-none w-[90px]"
                  onClick={() => handleSort("amount")}
                >
                  Amount
                </th>

                {/* Loan Amount */}
                <th
                  className="px-3 py-3 text-right font-semibold text-xs uppercase tracking-wider cursor-pointer hover:text-[var(--on-surface)] select-none w-[90px]"
                  onClick={() => handleSort("loanAmount")}
                >
                  Loan Amt
                </th>

                {/* Method Column */}
                <th className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider w-[90px]">
                  Method
                </th>

                {/* Created By Column */}
                <th className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider w-[120px]">
                  Created By
                </th>

                {/* Created Date */}
                <th
                  className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider cursor-pointer hover:text-[var(--on-surface)] select-none w-[80px]"
                  onClick={() => handleSort("createdAt")}
                >
                  Created
                </th>

                <th className="px-3 py-3 text-center font-semibold text-xs uppercase tracking-wider w-[100px]">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[var(--muted)]/10">
              {/* Loading Skeleton */}
              {loading &&
                [0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <SkeletonRow key={`skeleton-row-${n}`} index={n} />
                ))}

              {/* Empty State */}
              {!loading && sortedTransactions.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-20">
                    <div className="flex flex-col items-center justify-center text-[var(--on-surface)]/40">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--muted)]/20 to-[var(--muted)]/10 flex items-center justify-center mb-4 shadow-inner">
                        <HiInbox className="w-8 h-8 opacity-50" />
                      </div>
                      <p className="text-sm font-semibold text-[var(--on-surface)]/60">
                        {searchTerm ? "No results found" : "No pending approvals"}
                      </p>
                      <p className="text-xs opacity-60 mt-1 max-w-xs text-center">
                        {searchTerm
                          ? `No transactions match "${searchTerm}". Try a different search.`
                          : "All transactions have been reviewed successfully."}
                      </p>
                      {searchTerm && (
                        <button
                          onClick={clearSearch}
                          className="mt-4 px-4 py-2 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg transition-colors"
                        >
                          Clear search
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {/* Data Rows */}
              {!loading &&
                sortedTransactions.map((tx, idx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-[var(--primary)]/[0.03] transition-colors group"
                  >
                    <td className="px-3 py-3 text-[var(--on-surface)]/30 tabular-nums font-medium text-xs">
                      {(pagination.page - 1) * pagination.limit + idx + 1}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-[var(--on-surface)] group-hover:text-[var(--primary)] transition-colors text-sm truncate">
                          {tx.paymentRequest?.loan?.formattedLoanId || "N/A"}
                        </span>
                        <span className="text-[14px] text-[var(--on-surface)]/40 truncate">
                          {tx.paymentRequest?.loan?.user?.userDetails?.firstName} {tx.paymentRequest?.loan?.user?.userDetails?.lastName}
                        </span>
                        <span className="text-[12px] text-[var(--on-surface)]/50 truncate">
                          {tx.paymentRequest?.loan?.user?.formattedUserId || "Unknown"} • {tx.paymentRequest?.loan?.user?.phoneNumber}
                        </span>
                        {tx.receiptId && (
                          <span className="text-[10px] text-[var(--on-surface)]/40 truncate">
                            {tx.receiptId}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-xs text-[var(--on-surface)]/60 truncate block">
                        {tx.paymentRequest?.loan?.oldLoanId || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <TypeBadge type={tx.paymentRequest?.type} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="font-bold text-emerald-600 tabular-nums text-sm">
                          {formatCurrency(tx.amount)}
                        </span>
                        {tx.closingType === "SETTLEMENT" && (
                          <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">
                            Settlement
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right text-[var(--on-surface)]/50 tabular-nums text-sm">
                      {formatCurrency(tx.paymentRequest?.loan?.amount)}
                    </td>
                    <td className="px-3 py-3 ">
                      <MethodBadge method={tx.method} bankName={tx.bankName} />
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-sm text-[var(--on-surface)]/70 truncate block">
                        {tx.createdByPartner?.name || "System"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[var(--on-surface)]/50 whitespace-nowrap text-sm">
                      {formatDate(tx.createdAt)}
                    </td>
                    <td className="px- py-3 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPaymentApprovalLoanId(tx.paymentRequest?.loan?.id);
                          }}
                          variant="outline"
                        >
                          Payment Approval
                        </Button>

                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleView(tx.paymentRequest?.loan?.user?.id, brandId!, "collections");
                          }}
                          variant="outline"
                          className=""
                        >
                          <HiEye className="w-4 h-4 mr" />
                          View
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer / Pagination */}
      <div className="flex-none border-t border-[var(--muted)]/15 bg-[var(--surface)] px-5 py-3">
        <div className="flex items-center justify-between">
          {/* Results Info */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-[var(--on-surface)]/50">
              Showing{" "}
              <span className="font-semibold text-[var(--on-surface)]/70">
                {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
              </span>
              <span className="mx-1">–</span>
              <span className="font-semibold text-[var(--on-surface)]/70">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>
              <span className="mx-1.5">of</span>
              <span className="font-semibold text-[var(--on-surface)]/70">{pagination.total}</span>
              <span> results</span>
            </span>

            {/* Rows per page */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--on-surface)]/40">Rows:</span>
              <select
                value={pagination.limit}
                onChange={(e) =>
                  setPagination((prev) => ({
                    ...prev,
                    limit: Number(e.target.value),
                    page: 1,
                  }))
                }
                className="px-2 py-1 text-xs border border-[var(--muted)]/25 rounded-lg bg-[var(--surface)] text-[var(--on-surface)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] cursor-pointer"
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() =>
                setPagination((prev) => ({
                  ...prev,
                  page: Math.max(1, prev.page - 1),
                }))
              }
              disabled={pagination.page === 1}
              className="p-2 rounded-lg text-[var(--on-surface)]/50 hover:bg-[var(--muted)]/15 hover:text-[var(--on-surface)]/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Previous page"
            >
              <HiChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 px-2">
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }

                return (
                  <button
                    key={`page-${pageNum}`}
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page: pageNum }))
                    }
                    className={`
                      min-w-[32px] h-8 text-xs font-semibold rounded-lg transition-all duration-200
                      ${
                        pagination.page === pageNum
                          ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/30"
                          : "text-[var(--on-surface)]/50 hover:bg-[var(--muted)]/15 hover:text-[var(--on-surface)]/80"
                      }
                    `}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }
              disabled={pagination.page >= totalPages}
              className="p-2 rounded-lg text-[var(--on-surface)]/50 hover:bg-[var(--muted)]/15 hover:text-[var(--on-surface)]/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Next page"
            >
              <HiChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}