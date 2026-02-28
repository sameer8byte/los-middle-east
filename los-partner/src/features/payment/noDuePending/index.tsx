import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  HiCheckCircle,
  HiXCircle,
  HiClock,
  HiChevronLeft,
  HiChevronRight,
  HiArrowPath,
  HiInbox,
  HiMagnifyingGlass,
  HiDocumentText,
  HiXMark,
} from "react-icons/hi2";
import { Loan } from "../../../shared/types/loan";
import { Button } from "../../../common/ui/button";
import { useQueryParams } from "../../../hooks/useQueryParams";
import { useCustomerNavigator } from "../../../hooks/useViewCustomer";
import { LoanNoDueCertificate } from "../../loansOps/components/loanNoDueCertificate";
import { TransactionsDetails } from "../../customerDetails/components/payment/transactionsDetails";
import { getNoDuePending } from "../../../shared/services/api/loan.api";

type SortField = "createdAt" | "name";
type SortDirection = "asc" | "desc";

// Shimmer animation component
const Shimmer = ({ className }: { className?: string }) => (
  <div
    className={`animate-pulse bg-gradient-to-r from-[var(--muted)]/20 via-[var(--muted)]/40 to-[var(--muted)]/20 bg-[length:200%_100%] rounded ${className}`}
    style={{ animation: "shimmer 1.5s ease-in-out infinite" }}
  />
);

// Skeleton row
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
        <Shimmer className="h-4 w-32" />
        <Shimmer className="h-3 w-20" />
      </div>
    </td>
    <td className="px-4 py-3.5">
      <div className="space-y-2">
        <Shimmer className="h-4 w-28" />
        <Shimmer className="h-3 w-36" />
      </div>
    </td>
    <td className="px-4 py-3.5">
      <Shimmer className="h-6 w-20 rounded-full" />
    </td>
    <td className="px-4 py-3.5">
      <Shimmer className="h-4 w-20" />
    </td>
    <td className="px-4 py-3.5">
      <Shimmer className="h-9 w-36 rounded-lg" />
    </td>
  </tr>
);

// Status badge with improved styling
const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<
    string,
    {
      bg: string;
      text: string;
      border: string;
      icon: React.ReactNode;
      label: string;
    }
  > = {
    COMPLETED: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      icon: <HiCheckCircle className="w-3.5 h-3.5" />,
      label: "Completed",
    },
    PENDING: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      icon: <HiClock className="w-3.5 h-3.5" />,
      label: "Pending",
    },
    FAILED: {
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-200",
      icon: <HiXCircle className="w-3.5 h-3.5" />,
      label: "Failed",
    },
    WRITE_OFF: {
      bg: "bg-slate-50",
      text: "text-slate-700",
      border: "border-slate-200",
      icon: <HiDocumentText className="w-3.5 h-3.5" />,
      label: "Write-Off",
    },
    SETTLED: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      icon: <HiCheckCircle className="w-3.5 h-3.5" />,
      label: "Settled",
    },
  };
  const s = config[status?.toUpperCase()] || config.PENDING;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide rounded-full border ${s.bg} ${s.text} ${s.border}`}
    >
      {s.icon}
      {s.label}
    </span>
  );
};

// Action button text based on status
const getActionButtonText = (status: string) => {
  const upperStatus = status?.toUpperCase();
  if (upperStatus === "COMPLETED") return "Generate Certificate";
  if (upperStatus === "WRITE_OFF") return "Generate Write-Off Letter";
  if (upperStatus === "SETTLED") return "Generate Settlement Letter";
  return "View Details";
};

export function NoDuePendingComponent() {
  const { brandId } = useParams<{ brandId: string }>();
  const { setQuery, getQuery } = useQueryParams();
  const { handleView } = useCustomerNavigator();
  const [refresh, setRefresh] = useState(false);
  const noDueCertificateLoanId = getQuery("noDueCertificateLoanId");
  const paymentRequestIdLoanId = getQuery("paymentRequestIdLoanId");
  const [transactions, setTransactions] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
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
      setPage(1); // Reset to first page on search
    }, 400);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  const fetchTransactions = useCallback(async () => {
    if (!brandId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getNoDuePending(
        brandId,
        { page, limit, dateFilter: "" },
        { search: debouncedSearch }
      );
      setTransactions(data?.data || []);
      setTotal(data?.total || 0);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch pending loans"
      );
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [brandId, page, limit, debouncedSearch, refresh]);

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

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      if (sortField === "name") {
        aVal = `${a.user?.userDetails?.firstName || ""} ${
          a.user?.userDetails?.lastName || ""
        }`.trim();
        bVal = `${b.user?.userDetails?.firstName || ""} ${
          b.user?.userDetails?.lastName || ""
        }`.trim();
      } else {
        aVal = new Date(a.createdAt).getTime();
        bVal = new Date(b.createdAt).getTime();
      }

      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });
  }, [transactions, sortField, sortDirection]);

  const formatDate = (date: string) => {
    if (!date) return "—";
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const totalPages = Math.ceil(total / limit) || 1;
   return (
    <div className="flex flex-col h-full bg-[var(--background)]">
      {/* Shimmer keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {noDueCertificateLoanId && (
        <LoanNoDueCertificate refresh={refresh} setRefresh={setRefresh} />
      )}

      {paymentRequestIdLoanId && <TransactionsDetails />}

      {/* Header */}
      <div className="flex-none border-b border-[var(--muted)]/15 bg-gradient-to-r from-[var(--surface)] to-[var(--background)] px-5 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Title Section */}
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-base font-bold text-[var(--on-surface)] leading-tight">
                No Due Pending
              </h1>
              <p className="text-xs text-[var(--on-surface)]/50 mt-0.5">
                {loading ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[var(--muted)]/30 animate-pulse" />
                    <span>Loading...</span>
                  </span>
                ) : (
                  <span>
                    <span className="font-semibold text-[var(--on-surface)]/70">
                      {total}
                    </span>
                    <span> loans awaiting closure</span>
                    {debouncedSearch && (
                      <span className="ml-1 text-[var(--primary)]">
                        • Filtered by &quot;{debouncedSearch}&quot;
                      </span>
                    )}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Search by name, ID, phone..."
                className={`
                  w-64 pl-10 pr-10 py-2.5
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
                  absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4
                  transition-colors duration-200
                  ${
                    isSearchFocused || searchTerm
                      ? "text-[var(--primary)]"
                      : "text-[var(--on-surface)]/40"
                  }
                `}
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-[var(--muted)]/20 text-[var(--on-surface)]/40 hover:text-[var(--on-surface)]/70 transition-all"
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
              <HiArrowPath
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
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
            <p className="text-sm font-medium text-red-800">
              Error loading data
            </p>
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
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--muted)]/15 overflow-hidden shadow-sm">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-[var(--background)]">
              <tr className="text-[var(--on-surface)]/60 border-b border-[var(--muted)]/15">
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider w-12">
                  #
                </th>
                <th
                  className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider cursor-pointer hover:text-[var(--on-surface)] select-none group"
                  onClick={() => handleSort("name")}
                >
                  Customer
                </th>
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">
                  Status
                </th>
                <th
                  className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider cursor-pointer hover:text-[var(--on-surface)] select-none"
                  onClick={() => handleSort("createdAt")}
                >
                  Created
                </th>
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--muted)]/10">
              {/* Skeleton Loading */}
              {loading &&
                [0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <SkeletonRow key={`skeleton-${n}`} index={n} />
                ))}

              {/* Empty State */}
              {!loading && sortedTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20">
                    <div className="flex flex-col items-center justify-center text-[var(--on-surface)]/40">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--muted)]/20 to-[var(--muted)]/10 flex items-center justify-center mb-4 shadow-inner">
                        <HiInbox className="w-8 h-8 opacity-50" />
                      </div>
                      <p className="text-sm font-semibold text-[var(--on-surface)]/60">
                        {debouncedSearch
                          ? "No results found"
                          : "No pending closures"}
                      </p>
                      <p className="text-xs opacity-60 mt-1 max-w-xs text-center">
                        {debouncedSearch
                          ? `No loans match "${debouncedSearch}". Try a different search term.`
                          : "All loans have been processed successfully."}
                      </p>
                      {debouncedSearch && (
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
                sortedTransactions.map((tx, idx) => {
                  const name =
                    `${tx.user?.userDetails?.firstName || ""} ${
                      tx.user?.userDetails?.lastName || ""
                    }`.trim() || "—";

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-[var(--primary)]/[0.03] transition-colors group"
                    >
                      <td className="px-4 py-3.5 text-[var(--on-surface)]/30 tabular-nums font-medium text-xs">
                        {(page - 1) * limit + idx + 1}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-[var(--on-surface)] group-hover:text-[var(--primary)] transition-colors">
                            {name}
                          </span>
                          <span className="text-xs text-[var(--on-surface)]/40 mt-0.5 font-mono">
                            {tx.formattedLoanId}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <span className="text-[var(--on-surface)]/70 font-mono text-sm">
                            {tx.user?.phoneNumber || "—"}
                          </span>
                          <span className="text-xs text-[var(--on-surface)]/40 truncate max-w-[180px] mt-0.5">
                            {tx.user?.email || ""}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={tx.status} />
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[var(--on-surface)]/50 text-sm">
                          {formatDate(tx.createdAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col items-center gap-2">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuery("noDueCertificateLoanId", tx.id);
                            }}
                            variant="outline"
                            className="text-xs px-3 py-2 whitespace-nowrap"
                            title={`Loan: ${tx.formattedLoanId}`}
                          >
                            <HiDocumentText className="w-3.5 h-3.5 mr-1.5" />
                            {getActionButtonText(tx.status)}
                          </Button>

                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuery("paymentRequestIdLoanId", tx.id);
                            }}
                            variant="outline"
                            className="text-xs px-3 py-2 whitespace-nowrap"
                          >
                            Transactions
                          </Button>

                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleView(tx.user.id, brandId!, "collections");
                            }}
                            variant="outline"
                          >
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                {total === 0 ? 0 : (page - 1) * limit + 1}
              </span>
              <span className="mx-1">–</span>
              <span className="font-semibold text-[var(--on-surface)]/70">
                {Math.min(page * limit, total)}
              </span>
              <span className="mx-1.5">of</span>
              <span className="font-semibold text-[var(--on-surface)]/70">
                {total}
              </span>
              <span> results</span>
            </span>

            {/* Rows per page */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--on-surface)]/40">Rows:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
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
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
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
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }

                return (
                  <button
                    key={`page-${pageNum}`}
                    onClick={() => setPage(pageNum)}
                    className={`
                      min-w-[32px] h-8 text-xs font-semibold rounded-lg transition-all duration-200
                      ${
                        page === pageNum
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
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
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
