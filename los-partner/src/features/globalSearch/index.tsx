import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  HiMagnifyingGlass,
  HiXMark,
  HiUser,
  HiBanknotes,
  HiDocumentText,
  HiEnvelope,
  HiPhone,
  HiCalendarDays,
  HiCheckCircle,
  HiClock,
  HiXCircle,
  HiPlus,
  HiExclamationTriangle,
  HiArrowPath,
  HiCurrencyRupee,
  HiReceiptPercent,
  HiArrowTrendingUp,
  HiDocumentCheck,
  HiUserCircle,
  HiArrowPathRoundedSquare,
  HiTag,
  HiClipboardDocumentList,
  HiUserGroup,
  HiEye,
  HiSquare2Stack,
  HiBanknotes as HiCollectPayment,
} from "react-icons/hi2";
import {
  globalSearch,
  GlobalSearchResponse,
} from "../../shared/services/api/global-search.api";
import { Button } from "../../common/ui/button";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import { NonGetwayPayment } from "../loanCollection/components/nonGetwayPayment";
import { ClosingWriteOffType } from "../loanCollection/components/closingWriteOff";
import { ClosingSettlementType } from "../loanCollection/components/closingSettlement";
import { useQueryParams } from "../../hooks/useQueryParams";
import { AcefoneClickToDialButton } from "../acefone";
interface SearchTabData {
  id: string;
  label: string;
  searchTerm: string;
  results: GlobalSearchResponse | null;
  timestamp: number;
}

export function GlobalSearchComponent() {
  const { brandId } = useParams<{ brandId: string }>();
  const { getQuery } = useQueryParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const writeOffLoanId = getQuery("writeOffLoanId");
  const settlementLoanId = getQuery("settlementLoanId");
  // Multi-tab search management
  const [searchTabs, setSearchTabs] = useState<SearchTabData[]>([]);
  const [activeSearchTabId, setActiveSearchTabId] = useState<string | null>(
    null,
  );

  // NonGetwayPayment modal state
  const [nonGetwayPaymentLoanId, setNonGetwayPaymentLoanId] = useState<
    string | null
  >(null);
  const [nonGetwayPaymentUserId, setNonGetwayPaymentUserId] = useState<
    string | null
  >(null);
  const [refresh, setRefresh] = useState(false);

  const activeSearchTab = searchTabs.find(
    (tab) => tab.id === activeSearchTabId,
  );
  const results = activeSearchTab?.results || null;

  const handleSearch = async (inNewTab = false) => {
    if (!searchTerm.trim() || !brandId) return;

    if (searchTerm.trim().length < 3) {
      toast.error("Please enter at least 3 characters to search");
      return;
    }

    setLoading(true);
    try {
      const searchResults = await globalSearch(brandId, { search: searchTerm });

      if (inNewTab) {
        const newTab: SearchTabData = {
          id: `search-${Date.now()}`,
          label:
            searchTerm.substring(0, 20) + (searchTerm.length > 20 ? "..." : ""),
          searchTerm: searchTerm,
          results: searchResults,
          timestamp: Date.now(),
        };
        setSearchTabs((prev) => [...prev, newTab]);
        setActiveSearchTabId(newTab.id);
      } else if (activeSearchTabId && activeSearchTab) {
        setSearchTabs((prev) =>
          prev.map((tab) =>
            tab.id === activeSearchTabId
              ? {
                  ...tab,
                  searchTerm,
                  results: searchResults,
                  label:
                    searchTerm.substring(0, 20) +
                    (searchTerm.length > 20 ? "..." : ""),
                }
              : tab,
          ),
        );
      } else {
        const newTab: SearchTabData = {
          id: `search-${Date.now()}`,
          label:
            searchTerm.substring(0, 20) + (searchTerm.length > 20 ? "..." : ""),
          searchTerm: searchTerm,
          results: searchResults,
          timestamp: Date.now(),
        };
        setSearchTabs([newTab]);
        setActiveSearchTabId(newTab.id);
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const closeSearchTab = (tabId: string) => {
    setSearchTabs((prev) => {
      const newTabs = prev.filter((tab) => tab.id !== tabId);
      if (activeSearchTabId === tabId && newTabs.length > 0) {
        setActiveSearchTabId(newTabs[newTabs.length - 1].id);
        setSearchTerm(newTabs[newTabs.length - 1].searchTerm);
      } else if (newTabs.length === 0) {
        setActiveSearchTabId(null);
        setSearchTerm("");
      }
      return newTabs;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const formatUserName = (
    userDetails: {
      firstName?: string;
      middleName?: string;
      lastName?: string;
    } | null,
  ) => {
    if (!userDetails) return "N/A";
    const { firstName, middleName, lastName } = userDetails;
    return [firstName, middleName, lastName].filter(Boolean).join(" ");
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === "string" ? Number.parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num || 0);
  };

  const getStatusBadge = (status?: string) => {
    const config: Record<
      string,
      { bg: string; text: string; border: string; icon: React.ReactNode }
    > = {
      ACTIVE: {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
        icon: <HiCheckCircle className="w-3.5 h-3.5" />,
      },
      COMPLETED: {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
        icon: <HiCheckCircle className="w-3.5 h-3.5" />,
      },
      VERIFIED: {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
        icon: <HiCheckCircle className="w-3.5 h-3.5" />,
      },
      SUCCESS: {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
        icon: <HiCheckCircle className="w-3.5 h-3.5" />,
      },
      OVERDUE: {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        icon: <HiXCircle className="w-3.5 h-3.5" />,
      },
      REJECTED: {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        icon: <HiXCircle className="w-3.5 h-3.5" />,
      },
      FAILED: {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        icon: <HiXCircle className="w-3.5 h-3.5" />,
      },
      INACTIVE: {
        bg: "bg-slate-50",
        text: "text-slate-700",
        border: "border-slate-200",
        icon: <HiXCircle className="w-3.5 h-3.5" />,
      },
      PENDING: {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
        icon: <HiClock className="w-3.5 h-3.5" />,
      },
      CANCELLED: {
        bg: "bg-slate-50",
        text: "text-slate-600",
        border: "border-slate-200",
        icon: <HiXMark className="w-3.5 h-3.5" />,
      },
    };
    const s = config[status?.toUpperCase() || ""] || {
      bg: "bg-slate-50",
      text: "text-slate-600",
      border: "border-slate-200",
      icon: <HiClock className="w-3.5 h-3.5" />,
    };
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide rounded-full border ${s.bg} ${s.text} ${s.border}`}
      >
        {s.icon}
        {status || "N/A"}
      </span>
    );
  };

  // Info Item Component for consistent display
  const InfoItem = ({
    icon: Icon,
    label,
    value,
    mono = false,
    highlight = false,
  }: {
    icon: React.ElementType;
    label: string;
    value: React.ReactNode;
    mono?: boolean;
    highlight?: boolean;
  }) => (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-[var(--on-surface)]/40 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <span className="text-[10px] text-[var(--on-surface)]/40 block">
          {label}
        </span>
        <span
          className={`text-sm ${mono ? "font-mono" : ""} ${
            highlight
              ? "text-emerald-600 font-bold"
              : "text-[var(--on-surface)]/70"
          } block truncate`}
        >
          {value || "N/A"}
        </span>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-[var(--background)]">
      {/* Header with Search */}
      <div className="flex-none border-b border-[var(--muted)]/15 bg-gradient-to-r from-[var(--surface)] to-[var(--background)] px-5 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title Section */}
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-base font-bold text-[var(--on-surface)] leading-tight">
                Global Search
              </h1>
              <p className="text-xs text-[var(--on-surface)]/50 mt-0.5">
                Search users, loans, and documents across the platform
              </p>
            </div>
          </div>

          {/* Search Section */}
          <div className="flex items-center gap-3 flex-1 max-w-2xl">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search by name, email, phone, ID..."
                className="w-full pl-10 pr-10 py-2.5 text-sm font-medium rounded-xl border-2 border-[var(--muted)]/30 bg-[var(--surface)] text-[var(--on-surface)] placeholder-[var(--on-surface)]/40 focus:outline-none focus:border-[var(--primary)] focus:shadow-lg focus:shadow-[var(--primary)]/10 transition-all duration-200"
              />
              <HiMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--on-surface)]/40" />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-[var(--muted)]/20 text-[var(--on-surface)]/40 hover:text-[var(--on-surface)]/70 transition-all"
                >
                  <HiXMark className="w-4 h-4" />
                </button>
              )}
            </div>

            <Button
              onClick={() => handleSearch(false)}
              disabled={loading || !searchTerm.trim()}
              variant="primary"
              className="px-5"
            >
              {loading ? (
                <>
                  <HiArrowPath className="w-4 h-4 animate-spin mr-1.5" />
                  <span className="hidden sm:inline">Searching...</span>
                </>
              ) : (
                <>
                  <HiMagnifyingGlass className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">Search</span>
                </>
              )}
            </Button>

            {searchTabs.length > 0 && (
              <Button
                onClick={() => handleSearch(true)}
                disabled={loading || !searchTerm.trim()}
                variant="outline"
                title="Open search in new tab"
              >
                <HiPlus className="w-4 h-4" />
                <span className="hidden lg:inline ml-1.5">New Tab</span>
              </Button>
            )}
          </div>
        </div>

        {/* Validation Warning */}
        {searchTerm.trim().length > 0 && searchTerm.trim().length < 3 && (
          <div className="mt-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
            <HiExclamationTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-700">
              Please enter at least 3 characters to search
            </span>
          </div>
        )}
      </div>

      {/* Search Tabs */}
      {searchTabs.length > 0 && (
        <div className="flex-none border-b border-[var(--muted)]/15 bg-[var(--surface)] px-5">
          <div className="flex items-center gap-1 overflow-x-auto py-2">
            {searchTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveSearchTabId(tab.id);
                  setSearchTerm(tab.searchTerm);
                }}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${
                    activeSearchTabId === tab.id
                      ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/25"
                      : "bg-[var(--muted)]/10 text-[var(--on-surface)]/70 hover:bg-[var(--muted)]/20"
                  }
                `}
              >
                <HiMagnifyingGlass className="w-3.5 h-3.5" />
                <span className="max-w-[120px] truncate">{tab.label}</span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    activeSearchTabId === tab.id
                      ? "bg-white/20"
                      : "bg-[var(--muted)]/20"
                  }`}
                >
                  {tab.results?.totalResults || 0}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeSearchTab(tab.id);
                  }}
                  className={`p-0.5 rounded hover:bg-red-500 hover:text-white transition-colors ${
                    activeSearchTabId === tab.id
                      ? "text-white/70"
                      : "text-[var(--on-surface)]/40"
                  }`}
                >
                  <HiXMark className="w-3.5 h-3.5" />
                </button>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results Content */}
      <div className="flex-1 min-h-0 overflow-auto px-5 py-4">
        {results && (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="flex flex-wrap items-center gap-3 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl">
              <div className="flex items-center gap-2">
                <div>
                  <span className="text-lg font-bold text-indigo-700">
                    {results.totalResults}
                  </span>
                  <span className="text-sm text-indigo-600 ml-1">
                    total results
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium">
                  {results.users.total} Users
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                  <HiBanknotes className="w-4 h-4" />
                  {results.loans.total} Loans
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                  <HiDocumentText className="w-4 h-4" />
                  {results.documents.total} Docs
                </span>
              </div>
            </div>

            {/* Results List */}
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--muted)]/15 overflow-hidden shadow-sm divide-y divide-[var(--muted)]/10">
              {/* ========== USERS ========== */}
              {results.users.data.map((user) => (
                <div
                  key={user.id}
                  className="p-5 hover:bg-[var(--primary)]/[0.02] transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-emerald-500/20">
                      {(formatUserName(user.userDetails) || user.email || "U").charAt(0).toUpperCase()}
                    </div> */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase">
                            User
                          </span>
                          <h3 className="font-semibold text-[var(--on-surface)] truncate">
                            {formatUserName(user.userDetails)}
                          </h3>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(
                              `/${brandId}/fallbackpage/customers/${user.id}`,
                            )
                          }
                          className="flex-shrink-0"
                        >
                          <HiEye className="w-4 h-4 mr-1.5" />
                          View
                        </Button>
                      </div>
                      <span className="text-xs text-[var(--on-surface)]/50 font-mono">
                        {user.formattedUserId}
                      </span>

                      {/* User Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                        <InfoItem
                          icon={HiEnvelope}
                          label="Email"
                          value={user.email}
                        />
                        {user.phoneNumber && (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <HiPhone className="w-4 h-4 text-[var(--on-surface)]/60" />
                              <span className="text-xs text-[var(--on-surface)]/60 font-medium">
                                Phone
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono text-[var(--on-surface)]">
                                {user.phoneNumber}
                              </span>
                              {user.id && (
                                <AcefoneClickToDialButton userId={user.id} />
                              )}
                            </div>
                          </div>
                        )}
                        <InfoItem
                          icon={HiCheckCircle}
                          label="Status"
                          value={
                            user.status_id
                          }
                        />
                        <InfoItem
                          icon={HiCalendarDays}
                          label="Created"
                          value={dayjs(user.createdAt).format(
                            "DD MMM YYYY, HH:mm",
                          )}
                        />
                      </div>

                      {user.allocatedPartner && (
                        <div className="mt-3 pt-3 border-t border-[var(--muted)]/15">
                          <h4 className="text-xs font-semibold text-[var(--on-surface)]/70 mb-2 flex items-center gap-1">
                            <HiUserGroup className="w-4 h-4" />
                            user allocated to partner
                          </h4>
                          <div className="text-xs text-[var(--on-surface)]/60">
                            Name: {user.allocatedPartner.name} <br />
                            Email: {user.allocatedPartner.email} <br />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* ========== LOANS ========== */}
              {results.loans.data.map((loan) => (
                <div
                  key={loan.id}
                  className="p-5 hover:bg-[var(--primary)]/[0.02] transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">
                            Loan
                          </span>
                          <div className="flex items-center gap-1">
                            <h3 className="font-semibold text-[var(--on-surface)] font-mono">
                              {loan.formattedLoanId}
                            </h3>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  loan.formattedLoanId,
                                );
                                toast.success("Loan ID copied!");
                              }}
                              className="p-1 hover:bg-[var(--muted)]/20 rounded transition-colors"
                              title="Copy Loan ID"
                            >
                              <HiSquare2Stack className="w-3.5 h-3.5 text-[var(--on-surface)]/50" />
                            </button>
                          </div>
                          {getStatusBadge(loan.status)}
                          {loan.loanType && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded uppercase">
                              {loan.loanType}
                            </span>
                          )}
                          {loan.is_repeat_loan && (
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded uppercase flex items-center gap-1">
                              <HiArrowPathRoundedSquare className="w-3 h-3" />
                              Repeat
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {(loan.status === "ACTIVE" ||
                            loan.status === "PARTIALLY_PAID") && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                setNonGetwayPaymentLoanId(loan.id);
                                setNonGetwayPaymentUserId(loan.user.id);
                              }}
                            >
                              <HiCollectPayment className="w-4 h-4 mr-1.5" />
                              Collect Payment
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/${brandId}/fallbackpage/customers/${loan.user.id}?tab=LOAN_APPLICATIONS`,
                              )
                            }
                          >
                            <HiEye className="w-4 h-4 mr-1.5" />
                            View Customer
                          </Button>
                        </div>
                      </div>
                      <span className="text-xs text-[var(--on-surface)]/50">
                        {formatUserName(loan.user.userDetails)} •{" "}
                        {loan.user.formattedUserId}
                      </span>

                      {/* Loan Main Details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-3">
                        <InfoItem
                          icon={HiCurrencyRupee}
                          label="Loan Amount"
                          value={formatCurrency(loan.amount)}
                          highlight
                        />
                        <InfoItem
                          icon={HiEnvelope}
                          label="Email"
                          value={loan.user.email}
                        />
                        {loan.user.phoneNumber && (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <HiPhone className="w-4 h-4 text-[var(--on-surface)]/60" />
                              <span className="text-xs text-[var(--on-surface)]/60 font-medium">
                                Phone
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono text-[var(--on-surface)]">
                                {loan.user.phoneNumber}
                              </span>
                              {loan.user.id && loan.id && (
                                <AcefoneClickToDialButton
                                  userId={loan.user.id}
                                  loanId={loan.id}
                                />
                              )}
                            </div>
                          </div>
                        )}
                        <InfoItem
                          icon={HiCalendarDays}
                          label="Created"
                          value={dayjs(loan.createdAt).format(
                            "DD MMM YYYY, HH:mm",
                          )}
                        />
                        <InfoItem
                          icon={HiCalendarDays}
                          label="Updated"
                          value={dayjs(loan.updatedAt).format(
                            "DD MMM YYYY, HH:mm",
                          )}
                        />
                        {/* <InfoItem icon={HiUserCircle} label="Loan ID" value={loan.id} mono /> */}
                      </div>

                      {/* Loan Dates & Additional Info */}
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-3 pt-3 border-t border-[var(--muted)]/15">
                        {loan.applicationDate && (
                          <InfoItem
                            icon={HiCalendarDays}
                            label="Application Date"
                            value={dayjs(loan.applicationDate).format(
                              "DD MMM YYYY",
                            )}
                          />
                        )}
                        {loan.approvalDate && (
                          <InfoItem
                            icon={HiCheckCircle}
                            label="Approval Date"
                            value={dayjs(loan.approvalDate).format(
                              "DD MMM YYYY",
                            )}
                          />
                        )}
                        {loan.disbursementDate && (
                          <InfoItem
                            icon={HiCurrencyRupee}
                            label="Disbursement Date"
                            value={dayjs(loan.disbursementDate).format(
                              "DD MMM YYYY",
                            )}
                          />
                        )}
                        {loan.closureDate && (
                          <InfoItem
                            icon={HiXCircle}
                            label="Closure Date"
                            value={dayjs(loan.closureDate).format(
                              "DD MMM YYYY",
                            )}
                          />
                        )}
                        {loan.purpose && (
                          <InfoItem
                            icon={HiTag}
                            label="Purpose"
                            value={loan.purpose}
                          />
                        )}
                        {loan.oldLoanId && (
                          <InfoItem
                            icon={HiArrowPathRoundedSquare}
                            label="Old Loan ID"
                            value={
                              <div className="flex items-center gap-1">
                                <span>{loan.oldLoanId}</span>
                                <button
                                  onClick={() => {
                                    if (loan.oldLoanId) {
                                      navigator.clipboard.writeText(
                                        loan.oldLoanId,
                                      );
                                      toast.success("Old Loan ID copied!");
                                    }
                                  }}
                                  className="p-1 hover:bg-[var(--muted)]/20 rounded transition-colors"
                                  title="Copy Old Loan ID"
                                >
                                  <HiSquare2Stack className="w-3.5 h-3.5 text-[var(--on-surface)]/50" />
                                </button>
                              </div>
                            }
                            mono
                          />
                        )}
                      </div>

                      {/* Repayment Details */}
                      {loan.repayment && (
                        <div className="mt-3 pt-3 border-t border-[var(--muted)]/15">
                          <h4 className="text-xs font-semibold text-[var(--on-surface)]/70 mb-2 flex items-center gap-1">
                            <HiCurrencyRupee className="w-4 h-4" />
                            Repayment Details
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <InfoItem
                              icon={HiCurrencyRupee}
                              label="Total Obligation"
                              value={formatCurrency(
                                loan.repayment.totalObligation,
                              )}
                              highlight
                            />
                            <InfoItem
                              icon={HiReceiptPercent}
                              label="Total Fees"
                              value={formatCurrency(loan.repayment.totalFees)}
                            />
                          </div>
                        </div>
                      )}

                      {/* Loan Details (if available) */}
                      {loan.loanDetails && (
                        <div className="mt-3 pt-3 border-t border-[var(--muted)]/15">
                          <h4 className="text-xs font-semibold text-[var(--on-surface)]/70 mb-2 flex items-center gap-1">
                            <HiDocumentCheck className="w-4 h-4" />
                            Loan Details
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {loan.loanDetails.dueDate && (
                              <InfoItem
                                icon={HiCalendarDays}
                                label="Due Date"
                                value={dayjs(loan.loanDetails.dueDate).format(
                                  "DD MMM YYYY",
                                )}
                              />
                            )}
                            {loan.loanDetails.durationDays && (
                              <InfoItem
                                icon={HiClock}
                                label="Duration"
                                value={`${loan.loanDetails.durationDays} days`}
                              />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Allotted Partner */}
                      {loan.allottedPartners?.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[var(--muted)]/15">
                          <div className="flex items-start gap-2">
                            <HiUserGroup className="w-4 h-4 mt-1 text-[var(--on-surface)]/40" />

                            <div>
                              <div className="text-xs text-[var(--on-surface)]/50 mb-1">
                                Allotted to
                              </div>

                              <div className="flex flex-col gap-2">
                                {loan.allottedPartners.map((p) => (
                                  <div
                                    key={`${p.partnerUser.email}-${p.partnerUser.name}`}
                                    className="leading-tight"
                                  >
                                    <div className="text-sm font-medium text-[var(--on-surface)]">
                                      {p.partnerUser.name}
                                    </div>
                                    <div className="text-xs text-[var(--on-surface)]/50">
                                      {p.partnerUser?.email}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Loan Status History */}
                      {loan.loanStatusHistory &&
                        loan.loanStatusHistory.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-[var(--muted)]/15">
                            <h4 className="text-xs font-semibold text-[var(--on-surface)]/70 mb-2 flex items-center gap-1">
                              <HiClipboardDocumentList className="w-4 h-4" />
                              Status History ({loan.loanStatusHistory.length})
                            </h4>
                            <div className="space-y-2">
                              {loan.loanStatusHistory.map((history) => (
                                <div
                                  key={`${history.status}-${history.createdAt}`}
                                  className="bg-slate-50 rounded-lg p-2 border border-slate-200"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0">
                                      {getStatusBadge(history.status)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="text-xs text-slate-600">
                                        {dayjs(history.createdAt).format(
                                          "DD MMM YYYY, HH:mm",
                                        )}
                                      </span>
                                      {history.partnerUser && (
                                        <span className="text-xs text-slate-500 ml-2">
                                          by{" "}
                                          <span className="font-medium text-slate-700">
                                            {history.partnerUser.name}
                                          </span>
                                          {history.partnerUser.email && (
                                            <span className="text-slate-400">
                                              {" "}
                                              ({history.partnerUser.email})
                                            </span>
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {history.message && (
                                    <div className="mt-2 pt-2 border-t border-slate-200">
                                      <span className="text-slate-500 font-medium text-xs block mb-1">
                                        Message
                                      </span>
                                      <p className="text-xs text-slate-700 bg-slate-100 rounded px-2 py-1">
                                        {history.message}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Payment Requests */}
                      {loan.paymentRequests &&
                        loan.paymentRequests.length > 0 && (
                          <div className="mt-4 space-y-3">
                            <h4 className="text-xs font-semibold text-[var(--on-surface)]/70 flex items-center gap-1">
                              <HiArrowTrendingUp className="w-4 h-4" />
                              Payment Requests ({loan.paymentRequests.length})
                            </h4>
                            {loan.paymentRequests.map((pr) => (
                              <div
                                key={pr.id}
                                className="bg-[var(--background)] rounded-lg p-4 border border-[var(--muted)]/15"
                              >
                                {/* Payment Request Header */}
                                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                  <div className="flex items-center gap-2">
                                    <h5 className="text-sm font-semibold text-[var(--on-surface)]">
                                      Payment Request
                                    </h5>
                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded uppercase">
                                      {pr.type}
                                    </span>
                                    <span className="text-xs text-[var(--on-surface)]/50">
                                      {pr.currency}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {getStatusBadge(pr.status)}
                                    <span className="text-xs text-[var(--on-surface)]/40">
                                      {dayjs(pr.createdAt).format(
                                        "DD MMM YYYY, HH:mm",
                                      )}
                                    </span>
                                  </div>
                                </div>
                                {/* <div className="text-xs text-[var(--on-surface)]/40 mb-3 font-mono">ID: {pr.id}</div> */}

                                {/* Collection Transactions */}
                                {pr.collectionTransactions &&
                                  pr.collectionTransactions.length > 0 && (
                                    <div className="mb-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <h6 className="text-xs font-semibold text-emerald-700">
                                          Collections (
                                          {pr.collectionTransactions.length})
                                        </h6>
                                        <div className="flex items-center gap-2 bg-emerald-100 px-3 py-1 rounded-full">
                                          <span className="text-xs text-emerald-600 font-medium">
                                            Total Received:
                                          </span>
                                          <span className="text-sm font-bold text-emerald-700">
                                            {formatCurrency(
                                              pr.collectionTransactions
                                                .filter(
                                                  (tx) =>
                                                    tx.status === "SUCCESS" ||
                                                    tx.status === "COMPLETED",
                                                )
                                                .reduce(
                                                  (sum, tx) =>
                                                    sum +
                                                    Number.parseFloat(
                                                      String(tx.amount) || "0",
                                                    ),
                                                  0,
                                                ),
                                            )}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        {pr.collectionTransactions.map((tx) => (
                                          <div
                                            key={tx.id}
                                            className="bg-emerald-50 rounded-lg p-3 border border-emerald-200"
                                          >
                                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
                                              <div>
                                                <span className="text-emerald-600 font-medium block">
                                                  Amount
                                                </span>
                                                <span className="font-bold text-emerald-700">
                                                  {formatCurrency(tx.amount)}
                                                </span>
                                              </div>
                                              <div>
                                                <span className="text-emerald-600 font-medium block">
                                                  Method
                                                </span>
                                                <span className="text-emerald-800">
                                                  {tx.method}
                                                </span>
                                              </div>
                                              <div>
                                                <span className="text-emerald-600 font-medium block">
                                                  Status
                                                </span>
                                                {getStatusBadge(tx.status)}
                                              </div>
                                              <div>
                                                <span className="text-emerald-600 font-medium block">
                                                  Currency
                                                </span>
                                                <span className="text-emerald-800">
                                                  {tx.currency}
                                                </span>
                                              </div>
                                              <div>
                                                <span className="text-emerald-600 font-medium block">
                                                  Created
                                                </span>
                                                <span className="text-emerald-800">
                                                  {dayjs(tx.createdAt).format(
                                                    "DD MMM YY, HH:mm",
                                                  )}
                                                </span>
                                              </div>
                                              {tx.completedAt && (
                                                <div>
                                                  <span className="text-emerald-600 font-medium block">
                                                    Completed
                                                  </span>
                                                  <span className="text-emerald-800">
                                                    {dayjs(
                                                      tx.completedAt,
                                                    ).format(
                                                      "DD MMM YY, HH:mm",
                                                    )}
                                                  </span>
                                                </div>
                                              )}
                                              {tx.opsApprovalStatus && (
                                                <div>
                                                  <span className="text-emerald-600 font-medium block">
                                                    Ops Approval
                                                  </span>
                                                  {getStatusBadge(
                                                    tx.opsApprovalStatus,
                                                  )}
                                                </div>
                                              )}
                                              {tx.externalRef && (
                                                <div>
                                                  <span className="text-emerald-600 font-medium block">
                                                    Payment Ref
                                                  </span>
                                                  <div className="flex items-center gap-0.5">
                                                    <span className="text-emerald-800">
                                                      {tx.externalRef}
                                                    </span>
                                                    <button
                                                      onClick={() => {
                                                        if (tx.externalRef) {
                                                          navigator.clipboard.writeText(
                                                            tx.externalRef,
                                                          );
                                                          toast.success(
                                                            "Payment Ref copied!",
                                                          );
                                                        }
                                                      }}
                                                      className="p-1.5 hover:bg-emerald-200 rounded transition-colors"
                                                      title="Copy Payment Ref"
                                                    >
                                                      <HiSquare2Stack className="w-4 h-4 text-emerald-600" />
                                                    </button>
                                                  </div>
                                                </div>
                                              )}
                                              {tx.paymentLink && (
                                                <div>
                                                  <a
                                                    href={tx.paymentLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-block text-sm text-emerald-800 font-medium bg-emerald-100 rounded px-3 py-1 hover:bg-emerald-200 transition-colors"
                                                  >
                                                    Payment Link
                                                  </a>
                                                </div>
                                              )}
                                            </div>
                                            {/* Note */}
                                            {tx.note && (
                                              <div className="mt-2 pt-2 border-t border-emerald-200">
                                                <span className="text-emerald-600 font-medium text-xs block mb-1">
                                                  Note
                                                </span>
                                                <p className="text-xs text-emerald-800 bg-emerald-100 rounded px-2 py-1">
                                                  {tx.note}
                                                </p>
                                              </div>
                                            )}
                                            {/* Fees, Taxes, Penalties */}
                                            {(tx.totalFees > 0 ||
                                              tx.totalTaxes > 0 ||
                                              tx.totalPenalties > 0) && (
                                              <div className="grid grid-cols-3 gap-3 mt-2 pt-2 border-t border-emerald-200 text-xs">
                                                <div>
                                                  <span className="text-emerald-600 font-medium block">
                                                    Fees
                                                  </span>
                                                  <span className="text-emerald-800">
                                                    {formatCurrency(
                                                      tx.totalFees,
                                                    )}
                                                  </span>
                                                </div>
                                                <div>
                                                  <span className="text-emerald-600 font-medium block">
                                                    Taxes
                                                  </span>
                                                  <span className="text-emerald-800">
                                                    {formatCurrency(
                                                      tx.totalTaxes,
                                                    )}
                                                  </span>
                                                </div>
                                                <div>
                                                  <span className="text-emerald-600 font-medium block">
                                                    Penalties
                                                  </span>
                                                  <span className="text-emerald-800">
                                                    {formatCurrency(
                                                      tx.totalPenalties,
                                                    )}
                                                  </span>
                                                </div>
                                              </div>
                                            )}
                                            {/* <div className="text-[10px] text-emerald-600/60 mt-2 font-mono">ID: {tx.id}</div> */}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                {/* Disbursal Transactions */}
                                {pr.disbursalTransactions &&
                                  pr.disbursalTransactions.length > 0 && (
                                    <div className="mb-3">
                                      <h6 className="text-xs font-semibold text-indigo-700 mb-2">
                                        Disbursals (
                                        {pr.disbursalTransactions.length})
                                      </h6>
                                      <div className="space-y-2">
                                        {pr.disbursalTransactions.map((tx) => (
                                          <div
                                            key={tx.id}
                                            className="bg-indigo-50 rounded-lg p-3 border border-indigo-200"
                                          >
                                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
                                              <div>
                                                <span className="text-indigo-600 font-medium block">
                                                  Amount
                                                </span>
                                                <span className="font-bold text-indigo-700">
                                                  {formatCurrency(tx.amount)}
                                                </span>
                                              </div>
                                              <div>
                                                <span className="text-indigo-600 font-medium block">
                                                  Method
                                                </span>
                                                <span className="text-indigo-800">
                                                  {tx.method}
                                                </span>
                                              </div>
                                              <div>
                                                <span className="text-indigo-600 font-medium block">
                                                  Status
                                                </span>
                                                {getStatusBadge(tx.status)}
                                              </div>
                                              <div>
                                                <span className="text-indigo-600 font-medium block">
                                                  Currency
                                                </span>
                                                <span className="text-indigo-800">
                                                  {tx.currency}
                                                </span>
                                              </div>
                                              <div>
                                                <span className="text-indigo-600 font-medium block">
                                                  Created
                                                </span>
                                                <span className="text-indigo-800">
                                                  {dayjs(tx.createdAt).format(
                                                    "DD MMM YY, HH:mm",
                                                  )}
                                                </span>
                                              </div>
                                              {tx.completedAt && (
                                                <div>
                                                  <span className="text-indigo-600 font-medium block">
                                                    Completed
                                                  </span>
                                                  <span className="text-indigo-800">
                                                    {dayjs(
                                                      tx.completedAt,
                                                    ).format(
                                                      "DD MMM YY, HH:mm",
                                                    )}
                                                  </span>
                                                </div>
                                              )}
                                              {tx.opsApprovalStatus && (
                                                <div>
                                                  <span className="text-indigo-600 font-medium block">
                                                    Ops Approval
                                                  </span>
                                                  {getStatusBadge(
                                                    tx.opsApprovalStatus,
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                            {/* Note */}
                                            {tx.note && (
                                              <div className="mt-2 pt-2 border-t border-indigo-200">
                                                <span className="text-indigo-600 font-medium text-xs block mb-1">
                                                  Note
                                                </span>
                                                <p className="text-xs text-indigo-800 bg-indigo-100 rounded px-2 py-1">
                                                  {tx.note}
                                                </p>
                                              </div>
                                            )}
                                            {/* <div className="text-[10px] text-indigo-600/60 mt-2 font-mono">ID: {tx.id}</div> */}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                {/* Partial Collection Transactions */}
                                {pr.partialCollectionTransactions &&
                                  pr.partialCollectionTransactions.length >
                                    0 && (
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <h6 className="text-xs font-semibold text-amber-700">
                                          Partial Collections (
                                          {
                                            pr.partialCollectionTransactions
                                              .length
                                          }
                                          )
                                        </h6>
                                        <div className="flex items-center gap-2 bg-amber-100 px-3 py-1 rounded-full">
                                          <span className="text-xs text-amber-600 font-medium">
                                            Total Received:
                                          </span>
                                          <span className="text-sm font-bold text-amber-700">
                                            {formatCurrency(
                                              pr.partialCollectionTransactions
                                                .filter(
                                                  (tx) =>
                                                    tx.status === "SUCCESS" ||
                                                    tx.status === "COMPLETED",
                                                )
                                                .reduce(
                                                  (sum, tx) =>
                                                    sum +
                                                    Number(tx.amount || 0),
                                                  0,
                                                ),
                                            )}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        {pr.partialCollectionTransactions.map(
                                          (tx) => (
                                            <div
                                              key={tx.id}
                                              className="bg-amber-50 rounded-lg p-3 border border-amber-200"
                                            >
                                              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
                                                <div>
                                                  <span className="text-amber-600 font-medium block">
                                                    Amount
                                                  </span>
                                                  <span className="font-bold text-amber-700">
                                                    {formatCurrency(tx.amount)}
                                                  </span>
                                                </div>
                                                <div>
                                                  <span className="text-amber-600 font-medium block">
                                                    Principal
                                                  </span>
                                                  <span className="font-bold text-amber-700">
                                                    {formatCurrency(
                                                      tx.principalAmount,
                                                    )}
                                                  </span>
                                                </div>
                                                <div>
                                                  <span className="text-amber-600 font-medium block">
                                                    Method
                                                  </span>
                                                  <span className="text-amber-800">
                                                    {tx.method}
                                                  </span>
                                                </div>
                                                <div>
                                                  <span className="text-amber-600 font-medium block">
                                                    Status
                                                  </span>
                                                  {getStatusBadge(tx.status)}
                                                </div>
                                                <div>
                                                  <span className="text-amber-600 font-medium block">
                                                    Currency
                                                  </span>
                                                  <span className="text-amber-800">
                                                    {tx.currency}
                                                  </span>
                                                </div>
                                                <div>
                                                  <span className="text-amber-600 font-medium block">
                                                    Created
                                                  </span>
                                                  <span className="text-amber-800">
                                                    {dayjs(tx.createdAt).format(
                                                      "DD MMM YY, HH:mm",
                                                    )}
                                                  </span>
                                                </div>
                                                {tx.completedAt && (
                                                  <div>
                                                    <span className="text-amber-600 font-medium block">
                                                      Completed
                                                    </span>
                                                    <span className="text-amber-800">
                                                      {dayjs(
                                                        tx.completedAt,
                                                      ).format(
                                                        "DD MMM YY, HH:mm",
                                                      )}
                                                    </span>
                                                  </div>
                                                )}
                                                {tx.opsApprovalStatus && (
                                                  <div>
                                                    <span className="text-amber-600 font-medium block">
                                                      Ops Approval
                                                    </span>
                                                    {getStatusBadge(
                                                      tx.opsApprovalStatus,
                                                    )}
                                                  </div>
                                                )}
                                                {tx.externalRef && (
                                                  <div>
                                                    <span className="text-emerald-600 font-medium block">
                                                      Payment Ref
                                                    </span>
                                                    <div className="flex items-center gap-0.5">
                                                      <span className="text-emerald-800">
                                                        {tx.externalRef}
                                                      </span>
                                                      <button
                                                        onClick={() => {
                                                          if (tx.externalRef) {
                                                            navigator.clipboard.writeText(
                                                              tx.externalRef,
                                                            );
                                                            toast.success(
                                                              "Payment Ref copied!",
                                                            );
                                                          }
                                                        }}
                                                        className="p-1.5 hover:bg-emerald-200 rounded transition-colors"
                                                        title="Copy Payment Ref"
                                                      >
                                                        <HiSquare2Stack className="w-4 h-4 text-emerald-600" />
                                                      </button>
                                                    </div>
                                                  </div>
                                                )}

                                                {tx.paymentLink && (
                                                  <div>
                                                    <a
                                                      href={tx.paymentLink}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="inline-block text-sm text-emerald-800 font-medium bg-emerald-100 rounded px-3 py-1 hover:bg-emerald-200 transition-colors"
                                                    >
                                                      Payment Link
                                                    </a>
                                                  </div>
                                                )}
                                              </div>
                                              {/* Note */}
                                              {tx.note && (
                                                <div className="mt-2 pt-2 border-t border-amber-200">
                                                  <span className="text-amber-600 font-medium text-xs block mb-1">
                                                    Note
                                                  </span>
                                                  <p className="text-xs text-amber-800 bg-amber-100 rounded px-2 py-1">
                                                    {tx.note}
                                                  </p>
                                                </div>
                                              )}
                                              {/* Fees, Taxes, Penalties */}
                                              {(tx.totalFees > 0 ||
                                                tx.totalTaxes > 0 ||
                                                tx.totalPenalties > 0) && (
                                                <div className="grid grid-cols-3 gap-3 mt-2 pt-2 border-t border-amber-200 text-xs">
                                                  <div>
                                                    <span className="text-amber-600 font-medium block">
                                                      Fees
                                                    </span>
                                                    <span className="text-amber-800">
                                                      {formatCurrency(
                                                        tx.totalFees,
                                                      )}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-amber-600 font-medium block">
                                                      Taxes
                                                    </span>
                                                    <span className="text-amber-800">
                                                      {formatCurrency(
                                                        tx.totalTaxes,
                                                      )}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-amber-600 font-medium block">
                                                      Penalties
                                                    </span>
                                                    <span className="text-amber-800">
                                                      {formatCurrency(
                                                        tx.totalPenalties,
                                                      )}
                                                    </span>
                                                  </div>
                                                </div>
                                              )}
                                              {/* <div className="text-[10px] text-amber-600/60 mt-2 font-mono">ID: {tx.id}</div> */}
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    </div>
                                  )}
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              ))}

              {/* ========== DOCUMENTS ========== */}
              {results.documents.data.map((document) => (
                <div
                  key={document.id}
                  className="p-5 hover:bg-[var(--primary)]/[0.02] transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded uppercase">
                            Document
                          </span>
                          <h3 className="font-semibold text-[var(--on-surface)]">
                            {document.type}
                          </h3>
                          {getStatusBadge(document.status)}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(
                              `/${brandId}/fallbackpage/customers/${document.user.id}`,
                            )
                          }
                          className="flex-shrink-0"
                        >
                          <HiEye className="w-4 h-4 mr-1.5" />
                          View Customer
                        </Button>
                      </div>
                      <span className="text-xs text-[var(--on-surface)]/50">
                        {formatUserName(document.user.userDetails)} •{" "}
                        {document.user.formattedUserId}
                      </span>

                      {/* Document Details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-3">
                        <InfoItem
                          icon={HiDocumentText}
                          label="Document Number"
                          value={document.documentNumber}
                          mono
                        />
                        <InfoItem
                          icon={HiEnvelope}
                          label="Email"
                          value={document.user.email}
                        />
                        {document.user.phoneNumber && (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <HiPhone className="w-4 h-4 text-[var(--on-surface)]/60" />
                              <span className="text-xs text-[var(--on-surface)]/60 font-medium">
                                Phone
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono text-[var(--on-surface)]">
                                {document.user.phoneNumber}
                              </span>
                              {document.user.id && (
                                <AcefoneClickToDialButton
                                  userId={document.user.id}
                                />
                              )}
                            </div>
                          </div>
                        )}
                        <InfoItem
                          icon={HiCalendarDays}
                          label="Created"
                          value={dayjs(document.createdAt).format(
                            "DD MMM YYYY, HH:mm",
                          )}
                        />
                        <InfoItem
                          icon={HiCalendarDays}
                          label="Updated"
                          value={dayjs(document.updatedAt).format(
                            "DD MMM YYYY, HH:mm",
                          )}
                        />
                        <InfoItem
                          icon={HiUserCircle}
                          label="Document ID"
                          value={document.id}
                          mono
                        />
                      </div>

                      {/* User Details */}
                      {/* <div className="mt-3 pt-3 border-t border-[var(--muted)]/15">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <InfoItem icon={HiUserCircle} label="User ID" value={document.user.id} mono />
                        </div>
                      </div> */}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* No Results */}
            {results?.totalResults === 0 && (
              <div className="text-center py-16 bg-[var(--surface)] rounded-xl border border-[var(--muted)]/15">
                <h3 className="text-lg font-semibold text-[var(--on-surface)] mb-2">
                  No results found
                </h3>
                <p className="text-sm text-[var(--on-surface)]/50 mb-6 max-w-md mx-auto">
                  <span>We couldn't find any results matching "</span>
                  <span className="font-medium text-[var(--on-surface)]">
                    {searchTerm}
                  </span>
                  <span>". Try searching with different keywords.</span>
                </p>
                <div className="bg-indigo-50 rounded-xl p-4 max-w-md mx-auto text-left">
                  <h4 className="text-sm font-semibold text-indigo-700 mb-2">
                    Search Tips:
                  </h4>
                  <ul className="text-sm text-indigo-600 space-y-1">
                    <li>• Use full names or partial matches</li>
                    <li>• Try searching by email or phone number</li>
                    <li>• Search by user ID, loan ID, or document number</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Initial State */}
        {!results && !loading && (
          <div className="text-center py-20 bg-[var(--surface)] rounded-xl border border-[var(--muted)]/15">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mx-auto mb-6">
              <HiMagnifyingGlass className="w-10 h-10 text-indigo-500" />
            </div>
            <h3 className="text-xl font-bold text-[var(--on-surface)] mb-3">
              Start Your Search
            </h3>
            <p className="text-sm text-[var(--on-surface)]/50 mb-8 max-w-lg mx-auto">
              Enter at least 3 characters to search across users, loans, and
              documents. Search by name, email, phone, IDs, or document numbers.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center mx-auto mb-3">
                  <HiUser className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-semibold text-emerald-700 mb-1">Users</h4>
                <p className="text-xs text-emerald-600">
                  Search by name, email, phone, or user ID
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center mx-auto mb-3">
                  <HiBanknotes className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-semibold text-blue-700 mb-1">Loans</h4>
                <p className="text-xs text-blue-600">
                  Search by loan ID or borrower details
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center mx-auto mb-3">
                  <HiDocumentText className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-semibold text-purple-700 mb-1">
                  Documents
                </h4>
                <p className="text-xs text-purple-600">
                  Search by document number or type
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* NonGetwayPayment Modal */}
      {nonGetwayPaymentLoanId && (
        <NonGetwayPayment
          refresh={refresh}
          setRefresh={setRefresh}
          nonGetwayPaymentLoanId={nonGetwayPaymentLoanId}
          nonGetwayPaymentUserId={nonGetwayPaymentUserId}
          setNonGetwayPaymentLoanId={setNonGetwayPaymentLoanId}
          setNonGetwayPaymentUserId={setNonGetwayPaymentUserId}
        />
      )}
      {writeOffLoanId && <ClosingWriteOffType loanId={writeOffLoanId} />}
      {settlementLoanId && <ClosingSettlementType loanId={settlementLoanId} />}
    </div>
  );
}
