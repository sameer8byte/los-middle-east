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
  HiArrowUturnLeft,
  HiMagnifyingGlass,
  HiXMark,
  HiDocumentArrowDown,
  HiArrowsUpDown,
  HiDocumentText,
} from "react-icons/hi2";

import { Loan } from "../../../shared/types/loan";

interface LoanWithDisbursement extends Loan {
  existingDisbursement?: {
    completedAt: string;
    disbursedBy: string | null;
  } | null;
}
import { Disburse } from "../../loansOps/components/disburse";
import { SendBackConfirmationDialog } from "../../loansOps/components/sendBackConfirmationDialog";
import { BulkDisbursementModal } from "../../loans/components/BulkDisbursementModal";
import { SyncEsignStatus } from "../../common/synsEsignStatus";
import { getPendingDisbursementTransactions } from "../../../shared/services/api/payment.api";
import { sendBackToCreditExecutiveAndSanctionManager } from "../../../shared/services/api/loan.api";
import { Button } from "../../../common/ui/button";
import { useCustomerNavigator } from "../../../hooks/useViewCustomer";
import { DownloadDisbursementFile } from "../../loansOps/components/downloadDisbursementFile";
import { LoanStatusBadge } from "../../../common/ui/LoanStatusBadge";
import { getESignedDocument } from "../../../shared/services/api/agreament.api";
import { downloadPdfBlob } from "../../../utils/pdfBlobUtils";
import { useToast } from "../../../context/toastContext";
import { AcefoneClickToDialButton } from "../../acefone";

type SortField = "createdAt" | "amount" | "name";
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
    <td className="px-4 py-3.5 text-right hidden md:table-cell">
      <Shimmer className="h-4 w-20 ml-auto" />
    </td>
    <td className="px-4 py-3.5 text-right hidden md:table-cell">
      <Shimmer className="h-4 w-20 ml-auto" />
    </td>
    <td className="px-4 py-3.5 hidden lg:table-cell">
      <Shimmer className="h-4 w-24" />
    </td>
    <td className="px-4 py-3.5 hidden lg:table-cell">
      <Shimmer className="h-4 w-20" />
    </td>
    <td className="px-4 py-3.5">
      <Shimmer className="h-4 w-20" />
    </td>
    <td className="px-4 py-3.5">
      <div className="flex gap-2">
        <Shimmer className="h-9 w-24 rounded-lg" />
        <Shimmer className="h-9 w-24 rounded-lg" />
      </div>
    </td>
  </tr>
);

// Agreement Status Badge
const AgreementBadge = ({
  agreement,
}: {
  agreement:
    | { signedAt?: string | null; status?: string; signed?: string | null }
    | null
    | undefined;
}) => {
  if (!agreement) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-100 text-slate-500">
        No agreement
      </span>
    );
  }

  if (agreement.signed || agreement.signedAt || agreement.status === "SIGNED") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
        <HiCheckCircle className="w-3 h-3" />
        Signed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-md bg-amber-50 text-amber-700 border border-amber-200">
      <HiClock className="w-3 h-3" />
      Pending
    </span>
  );
};

export function PendingDisbursementComponent() {
  const { brandId } = useParams<{ brandId: string }>();
  const { handleView } = useCustomerNavigator();
  const { showSuccess, showError } = useToast();
  const [transactions, setTransactions] = useState<LoanWithDisbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [selectedLoanForDisburse, setSelectedLoanForDisburse] = useState<
    string | null
  >(null);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [isBulkDisbursementOpen, setIsBulkDisbursementOpen] = useState(false);
  const [downloadLoanId, setDownloadLoanId] = useState<string | null>(null);
  const [downloadingEsignId, setDownloadingEsignId] = useState<string | null>(
    null
  );

  // Send back dialog state
  const [sendBackDialog, setSendBackDialog] = useState<{
    isOpen: boolean;
    loanId: string;
    customerName: string;
  }>({
    isOpen: false,
    loanId: "",
    customerName: "",
  });

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
      const offset = (page - 1) * limit;
      const response = await getPendingDisbursementTransactions({
        brandId,
        limit,
        offset,
        search: debouncedSearch,
      });
      setTransactions(response.data || []);
      setTotal(response.total || 0);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch pending disbursements"
      );
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [brandId, page, limit, debouncedSearch]);

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
    return [...transactions].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      if (sortField === "amount") {
        aVal = a.amount || 0;
        bVal = b.amount || 0;
      } else if (sortField === "name") {
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

  const handleDisbursementComplete = () => {
    setSelectedLoanForDisburse(null);
    fetchTransactions();
  };

  // Add send back handler
  const handleSendBack = useCallback(
    async (targetRole: "CREDIT_MANAGER" | "SM_SH", reason: string) => {
      if (!brandId || !sendBackDialog.loanId) {
        showError("Error", "Brand ID and Loan ID are required");
        return;
      }

      try {
        await sendBackToCreditExecutiveAndSanctionManager(brandId, {
          loanId: sendBackDialog.loanId,
          targetRole,
          reason,
        });

        showSuccess("Success", "Loan sent back successfully");
        closeSendBackDialog();
        fetchTransactions(); // Refresh the list
      } catch (error: any) {
        showError(
          "Error",
          error.response?.data?.message || "Failed to send back loan"
        );
      }
    },
    [brandId, sendBackDialog.loanId, showSuccess, showError, fetchTransactions]
  );

  // Open send back dialog
  const openSendBackDialog = useCallback(
    (loanId: string, customerName: string) => {
      setSendBackDialog({
        isOpen: true,
        loanId,
        customerName,
      });
    },
    []
  );

  // Close send back dialog
  const closeSendBackDialog = useCallback(() => {
    setSendBackDialog({
      isOpen: false,
      loanId: "",
      customerName: "",
    });
  }, []);
  const handleDownloadEsignDocument = async (
    loanId: string,
    formattedLoanId?: string
  ) => {
    try {
      setDownloadingEsignId(loanId);
      const response = await getESignedDocument(loanId);

      if (response?.document) {
        downloadPdfBlob(
          response.document,
          `signed-agreement-${formattedLoanId || loanId}.pdf`
        );
      }
    } catch (err) {
      console.error("Error downloading e-signed document:", err);
    } finally {
      setDownloadingEsignId(null);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount || 0);

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

  const totalPendingAmount = useMemo(() => {
    return transactions.reduce((sum, loan) => sum + (loan.amount || 0), 0);
  }, [transactions]);

  const totalNetPendingAmount = useMemo(() => {
    return transactions.reduce(
      (sum, loan) => sum + (loan.disbursement?.netAmount || 0),
      0
    );
  }, [transactions]);

  return (
    <div className="h-full flex flex-col bg-[var(--background)]">
      {/* Header */}
      <div className="flex-none border-b border-[var(--muted)]/15 bg-gradient-to-r from-[var(--surface)] to-[var(--background)] px-5 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title Section */}
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-base font-bold text-[var(--on-surface)] leading-tight">
                Pending Disbursement
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
                    <span className="font-semibold text-[var(--on-surface)]/70">
                      {total}
                    </span>
                    <span> awaiting disbursement</span>
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

          {/* Search & Refresh */}
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
                placeholder="Search by name, loan ID, phone..."
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

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <Button
            onClick={() => setIsBulkDisbursementOpen(true)}
            variant="outline"
            className="text-xs"
          >
            <HiArrowsUpDown className="w-3.5 h-3.5 mr-1.5" />
            Bulk UTR Sync
          </Button>

          <Button
            onClick={() => setDownloadLoanId("all")}
            variant="outline"
            className="text-xs"
          >
            <HiDocumentArrowDown className="w-3.5 h-3.5 mr-1.5" />
            Disbursement File
          </Button>

          <SyncEsignStatus />
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
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--muted)]/15 shadow-sm overflow-hidden">
          <table className="w-full min-w-[700px] text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-[var(--background)]">
              <tr className="text-[var(--on-surface)]/60 border-b border-[var(--muted)]/15">
                <th className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider w-10">
                  #
                </th>
                <th
                  className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider cursor-pointer hover:text-[var(--on-surface)] select-none"
                  onClick={() => handleSort("name")}
                >
                  Customer
                </th>
                <th className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider hidden md:table-cell">
                  Contact
                </th>
                <th className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider">
                  Status
                </th>
                <th
                  className="px-3 py-3 text-right font-semibold text-xs uppercase tracking-wider cursor-pointer hover:text-[var(--on-surface)] select-none hidden lg:table-cell"
                  onClick={() => handleSort("amount")}
                >
                  Amount
                </th>
                <th className="px-3 py-3 text-right font-semibold text-xs uppercase tracking-wider hidden lg:table-cell">
                  Net Amount
                </th>
                <th className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider hidden xl:table-cell">
                  Agreement
                </th>
                <th className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider hidden xl:table-cell">
                  Signed At
                </th>
                <th
                  className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider cursor-pointer hover:text-[var(--on-surface)] select-none hidden md:table-cell"
                  onClick={() => handleSort("createdAt")}
                >
                  Created
                </th>
                <th className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider hidden 2xl:table-cell">
                  Warning
                </th>
                <th className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--muted)]/10">
              {/* Loading Skeleton */}
              {loading &&
                [0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <SkeletonRow key={`skeleton-${n}`} index={n} />
                ))}

              {/* Empty State */}
              {!loading && sortedTransactions.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-20">
                    <div className="flex flex-col items-center justify-center text-[var(--on-surface)]/40">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--muted)]/20 to-[var(--muted)]/10 flex items-center justify-center mb-4 shadow-inner">
                        <HiInbox className="w-8 h-8 opacity-50" />
                      </div>
                      <p className="text-sm font-semibold text-[var(--on-surface)]/60">
                        {searchTerm
                          ? "No results found"
                          : "No pending disbursements"}
                      </p>
                      <p className="text-xs opacity-60 mt-1 max-w-xs text-center">
                        {searchTerm
                          ? `No loans match "${searchTerm}". Try a different search.`
                          : "All disbursements have been processed successfully."}
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
                sortedTransactions.map((tx, idx) => {
                  const name =
                    `${tx.user?.userDetails?.firstName || ""} ${
                      tx.user?.userDetails?.lastName || ""
                    }`.trim() || "—";
                  const hasExistingDisbursement = !!tx.existingDisbursement;

                  return (
                    <tr
                      key={tx.id}
                      className={`transition-colors group ${
                        hasExistingDisbursement 
                          ? 'bg-red-50 border-l-4 border-red-500 hover:bg-red-50' 
                          : 'hover:bg-[var(--primary)]/[0.03]'
                      }`}
                    >
                      <td className="px-3 py-3 text-[var(--on-surface)]/30 tabular-nums font-medium text-xs w-10">
                        {(page - 1) * limit + idx + 1}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-[var(--on-surface)] group-hover:text-[var(--primary)] transition-colors leading-tight">
                            {name}
                          </span>
                          <span className="text-[11px] text-[var(--on-surface)]/40 font-mono">
                            {tx.formattedLoanId}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell">
                        <div className="flex flex-col gap-0.5">
                          {tx.id && (
                            <AcefoneClickToDialButton userId={tx.user?.id!} loanId={tx.id} />
                          )}
                          <span className="text-[var(--on-surface)]/70 font-mono text-xs leading-tight">
                            {tx.user?.phoneNumber || "—"}
                          </span>
                          <span className="text-[11px] text-[var(--on-surface)]/40 truncate max-w-[140px]">
                            {tx.user?.email || ""}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1">
                          <LoanStatusBadge status={tx.status || "PENDING_DISBURSEMENT"} />
                          <div className="flex flex-wrap gap-1">
                            {tx?.is_repeat_loan && (
                              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-50 text-blue-700 border border-blue-100">
                                Repeat
                              </span>
                            )}
                            {tx?.is_workflow_automated && (
                              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-50 text-purple-700 border border-purple-100">
                                Auto
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right hidden lg:table-cell">
                        <span className="font-bold text-emerald-600 tabular-nums text-sm">
                          {formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right hidden lg:table-cell">
                        <span className="font-bold text-blue-600 tabular-nums text-sm">
                          {formatCurrency(tx.disbursement?.netAmount || 0)}
                        </span>
                      </td>
                      <td className="px-3 py-3 hidden xl:table-cell">
                        <AgreementBadge agreement={tx.agreement} />
                      </td>
                      <td className="px-3 py-3 hidden xl:table-cell text-[var(--on-surface)]/50 text-xs">
                        {tx.agreement?.signed}
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell">
                        <span className="text-[var(--on-surface)]/50 text-xs">
                          {formatDate(tx.createdAt)}
                        </span>
                      </td>
                      <td className="px-3 py-3 hidden 2xl:table-cell">
                        {hasExistingDisbursement && (
                          <div className="flex items-start gap-1.5">
                            <HiXCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="text-[11px]">
                              <div className="font-semibold text-red-700">Already Disbursed</div>
                              <div className="text-red-600 mt-0.5">
                                {new Date(tx.existingDisbursement?.completedAt!).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                              {tx.existingDisbursement?.disbursedBy && (
                                <div className="text-red-500 text-[10px] mt-0.5">
                                  By: {tx.existingDisbursement.disbursedBy}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Button
                            onClick={() => setSelectedLoanForDisburse(tx.id)}
                            variant="primary"
                          >
                            <HiCheckCircle className="w-3.5 h-3.5 mr-1" />
                            Disburse
                          </Button>
                          <Button
                            onClick={() => {
                              const customerName =
                                `${tx.user?.userDetails?.firstName || ""} ${
                                  tx.user?.userDetails?.lastName || ""
                                }`.trim() || "Customer";
                              openSendBackDialog(tx.id, customerName);
                            }}
                            variant="outline"
                          >
                            <HiArrowUturnLeft className="w-3.5 h-3.5 mr-1" />
                            Send Back
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
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadEsignDocument(
                                tx.id,
                                tx.formattedLoanId
                              );
                            }}
                            variant="outline"
                            disabled={downloadingEsignId === tx.id}
                          >
                            <HiDocumentText className="w-3.5 h-3.5 mr-1" />
                            {downloadingEsignId === tx.id ? "..." : "E-Sign"}
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
        {transactions.length > 0 && (
          <div className="flex justify-end gap-8 mb-3 pb-3 border-b border-[var(--muted)]/10">
            <div className="text-right">
              <p className="text-[10px] text-[var(--on-surface)]/50 font-bold uppercase tracking-wider">
                Total Pending Amount
              </p>
              <p className="text-base font-bold text-[var(--on-surface)]">
                {formatCurrency(totalPendingAmount)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[var(--on-surface)]/50 font-bold uppercase tracking-wider">
                Total Net Amount
              </p>
              <p className="text-base font-bold text-blue-600">
                {formatCurrency(totalNetPendingAmount)}
              </p>
            </div>
          </div>
        )}
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

      {/* Disburse Modal */}
      {selectedLoanForDisburse && (
        <Disburse
          disburseLoanId={selectedLoanForDisburse}
          onDisbursementComplete={handleDisbursementComplete}
          onClose={() => setSelectedLoanForDisburse(null)}
        />
      )}

      {/* Send Back Dialog */}
      {sendBackDialog.isOpen && (
        <SendBackConfirmationDialog
          isOpen={sendBackDialog.isOpen}
          onClose={closeSendBackDialog}
          onConfirm={handleSendBack}
          loanId={sendBackDialog.loanId}
          customerName={sendBackDialog.customerName}
        />
      )}
      {/* Bulk Disbursement Modal */}
      {isBulkDisbursementOpen && (
        <BulkDisbursementModal
          isOpen={isBulkDisbursementOpen}
          onClose={() => setIsBulkDisbursementOpen(false)}
          onSuccess={() => {
            setIsBulkDisbursementOpen(false);
            fetchTransactions();
          }}
          brandId={brandId || ""}
        />
      )}

      {/* Download CSV */}
      {downloadLoanId && (
        <DownloadDisbursementFile
          downloadLoanId={downloadLoanId}
          setDownloadLoanId={setDownloadLoanId}
        />
      )}
    </div>
  );
}
