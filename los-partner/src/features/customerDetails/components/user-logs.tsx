import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getUserLogs,
  getUserLogTypes,
  UserLog,
  UserLogType,
} from "../../../shared/services/api/user-logs.api";
import { Badge } from "../../../common/ui/badge";
import {
  HiArrowPath,
  HiEye,
  HiUser,
  HiClock,
  HiDocumentText,
  HiFunnel,
  HiXMark,
} from "react-icons/hi2";
import Dialog from "../../../common/dialog";
import { formatDateWithTime } from "../../../lib/utils";
import { PageIdToPageNameMap } from "../../../constant/redirect";
import { FaCheckCircle } from "react-icons/fa";
import { Customer } from "../../../shared/types/customers";
import { getCustomerById } from "../../../shared/services/api/customer.api";

interface UserLogsProps {
  readonly customerId?: string;
}

export default function UserLogs({ customerId }: UserLogsProps) {
  const { brandId, customerId: paramsCustomerId } = useParams<{
    brandId: string;
    customerId: string;
  }>();

  const userId = customerId || paramsCustomerId;

  const [logs, setLogs] = useState<UserLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  //   const [, setExpandedRows] = useState<Set<string>>(new Set());
  const [logTypes, setLogTypes] = useState<UserLogType[]>([]);
  const [selectedLog, setSelectedLog] = useState<UserLog | null>(null);
  const [showContextModal, setShowContextModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [customer, setCustomer] = useState<null | Customer>(null);
  const [customerLoading, setCustomerLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // Filter state
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  // Fetch log types
  useEffect(() => {
    const fetchLogTypes = async () => {
      if (!brandId) return;
      try {
        const types = await getUserLogTypes(brandId);
        setLogTypes(types);
      } catch (err) {
        console.error("Error fetching log types:", err);
      }
    };
    fetchLogTypes();
  }, [brandId]);

  // Fetch customer data for onboarding journey
  useEffect(() => {
    const fetchCustomerData = async () => {
      if (!userId || !brandId) return;
      try {
        const response = await getCustomerById(userId, brandId);
        setCustomer(response);
      } catch (error) {
        console.error("Error fetching customer data:", error);
      } finally {
        setCustomerLoading(false);
      }
    };
    fetchCustomerData();
  }, [userId, brandId]);

  // Fetch logs
  const fetchLogs = async () => {
    if (!brandId) return;

    setLoading(true);
    setError(null);

    try {
      const params: any = {
        page: currentPage,
        limit: pageSize,
        sortBy: "timestamp",
        sortOrder: "desc" as const,
      };

      if (userId) params.userId = userId;
      if (selectedType) params.type = selectedType;
      if (selectedPlatform) params.platformType = selectedPlatform;
      if (searchQuery) params.search = searchQuery;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      const response = await getUserLogs(brandId, params);
      setLogs(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotalCount(response.pagination.total);
    } catch (err: any) {
      console.error("Error fetching user logs:", err);
      setError(
        err?.response?.data?.message ||
          "Failed to load user logs. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [
    brandId,
    userId,
    currentPage,
    pageSize,
    selectedType,
    selectedPlatform,
    searchQuery,
    fromDate,
    toDate,
  ]);

  //   const toggleRow = (id: string) => {
  //     setExpandedRows((prev) => {
  //       const newSet = new Set(prev);
  //       if (newSet.has(id)) {
  //         newSet.delete(id);
  //       } else {
  //         newSet.add(id);
  //       }
  //       return newSet;
  //     });
  //   };

  const getLogTypeVariant = (
    type: string
  ): "default" | "primary" | "success" | "warning" | "danger" => {
    const lowercaseType = type.toLowerCase();
    if (lowercaseType.includes("error")) return "danger";
    if (lowercaseType.includes("warning")) return "warning";
    if (lowercaseType.includes("success") || lowercaseType.includes("submit"))
      return "success";
    if (
      lowercaseType.includes("application") ||
      lowercaseType.includes("verification")
    )
      return "primary";
    return "default";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  };

  const sortedJourneys = customer?.onboardingJourneys
    ? [...customer.onboardingJourneys].sort(
        (a, b) => a.stepNumber - b.stepNumber
      )
    : [];

  const formatDuration = (ms: number) => {
    const min = Math.floor(ms / 60000);
    if (min < 60) return `${min}m`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  };

  const handleRefresh = () => {
    fetchLogs();
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const resetFilters = () => {
    setSelectedType("");
    setSelectedPlatform("");
    setSearchQuery("");
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
  };

  const handleViewContext = (log: UserLog) => {
    setSelectedLog(log);
    setShowContextModal(true);
  };

  const hasActiveFilters =
    selectedType || selectedPlatform || searchQuery || fromDate || toDate;

  if (loading && logs.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 5 }, (_, idx) => (
            <div
              key={`skeleton-item-${idx}`}
              className="h-20 bg-[var(--color-on-muted)] bg-opacity-20 rounded-lg"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <h3 className="font-semibold mb-2">Error Loading Logs</h3>
          <p className="text-sm">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {!customerLoading && sortedJourneys.length > 0 && (
        <div className="bg-white border-b border-[var(--border)] px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <HiDocumentText
              className="text-[var(--color-primary)] flex-shrink-0"
              size={20}
            />
            <div>
              <h3 className="text-base font-semibold text-[var(--color-on-surface)]">
                Onboarding Progress
              </h3>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-[var(--color-on-success)]">
                    {customer?.onboardingStep || 0}
                  </span>
                  <span className="text-[var(--color-on-surface)] opacity-60">
                    /
                  </span>
                  <span className="text-[var(--color-on-surface)] opacity-60">
                    12
                  </span>
                </div>
                <span className="text-xs font-semibold text-[var(--color-on-primary)] bg-[var(--color-muted)] px-2 py-1 rounded">
                  {Math.round(((customer?.onboardingStep || 0) / 12) * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[var(--color-muted)] rounded-full h-2 mb-3">
            <div
              className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-active)] h-2 rounded-full transition-all duration-500"
              style={{
                width: `${((customer?.onboardingStep || 0) / 12) * 100}%`,
              }}
            />
          </div>

          {/* Journey Steps */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {sortedJourneys.map((journey, index) => {
              const previous = index > 0 ? sortedJourneys[index - 1] : null;
              const diffMs = previous
                ? new Date(journey.createdAt).getTime() -
                  new Date(previous.createdAt).getTime()
                : 0;

              return (
                <div
                  key={journey.id}
                  className="flex items-center justify-between border border-[var(--color-muted)] rounded-lg p-2 hover:bg-[var(--color-muted)] hover:bg-opacity-30 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-6 h-6 bg-[var(--color-primary)] text-[var(--color-primary-contrast)] rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                      {journey.stepNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--color-on-surface)] truncate">
                        {PageIdToPageNameMap[journey.stepNumber]}
                      </p>
                      <p className="text-[10px] text-[var(--color-on-surface)] opacity-50">
                        {formatDateWithTime(journey.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {diffMs > 0 && (
                      <span className="text-[10px] text-[var(--color-on-surface)] opacity-50 bg-[var(--color-muted)] px-1.5 py-0.5 rounded">
                        +{formatDuration(diffMs)}
                      </span>
                    )}
                    <FaCheckCircle className="w-3.5 h-3.5 text-[var(--color-on-success)]" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Next Steps */}
          {(customer?.onboardingStep || 0) < 12 && (
            <div className="mt-3 pt-3 border-t border-[var(--color-muted)]">
              <h4 className="text-xs font-medium text-[var(--color-on-surface)] opacity-70">
                Next: {PageIdToPageNameMap[(customer?.onboardingStep || 0) + 1]}
              </h4>
            </div>
          )}
        </div>
      )}

      {/* Compact Header with Actions */}
      <div className="bg-white border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <HiDocumentText
              className="text-[var(--color-primary)] flex-shrink-0"
              size={24}
            />
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-[var(--color-on-surface)] truncate">
                Audit Logs
              </h2>
              <p className="text-xs text-[var(--color-on-muted)]">
                {totalCount} total logs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                showFilters || hasActiveFilters
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <HiFunnel size={16} />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 px-1.5 py-0.5 bg-white text-[var(--color-primary)] rounded text-xs font-medium">
                  {
                    [
                      selectedType,
                      selectedPlatform,
                      searchQuery,
                      fromDate,
                      toDate,
                    ].filter(Boolean).length
                  }
                </span>
              )}
            </button>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[var(--color-primary)] text-white rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <HiArrowPath
                className={loading ? "animate-spin" : ""}
                size={16}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Collapsible Filters */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-[var(--border)]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <input
                id="search-logs"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="px-3 py-2 text-sm border border-[var(--border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />

              <select
                id="log-type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 text-sm border border-[var(--border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              >
                <option value="">All Types</option>
                {logTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>

              <select
                id="platform-type"
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="px-3 py-2 text-sm border border-[var(--border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              >
                <option value="">All Platforms</option>
                <option value="WEB">Web</option>
                <option value="PARTNER">Partner</option>
              </select>

              <input
                id="from-date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                placeholder="From date"
                className="px-3 py-2 text-sm border border-[var(--border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />

              <input
                id="to-date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                placeholder="To date"
                className="px-3 py-2 text-sm border border-[var(--border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="mt-2 flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium"
              >
                <HiXMark size={14} />
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Logs List - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center py-12">
              <HiDocumentText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-[var(--color-on-muted)] text-sm">
                No activity logs found for the selected filters.
              </p>
            </div>
          </div>
        ) : (
 <div className="h-[420px] overflow-y-auto overflow-x-auto border border-[var(--border)] rounded-lg">
  <table className="w-full">
    <thead className="sticky top-0 bg-gray-50 z-10 text-xs text-gray-500 border-b border-[var(--border)]">
      <tr>
        <th className="px-4 py-3 text-left">Number</th>
        <th className="px-4 py-3 text-left">Platform</th>
        <th className="px-4 py-3 text-left">Message</th>
        <th className="px-4 py-3 text-left">User</th>
        <th className="px-4 py-3 text-left">Timestamp</th>
        <th className="px-4 py-3 text-left">Actions</th>
      </tr>
    </thead>

    <tbody className="divide-y divide-[var(--border)]">
      {logs.map((log, index) => (
        <tr
          key={`log-${log.id}-${index}`}
          className="hover:bg-gray-50 transition"
        >
          <td className="px-4 py-3 text-xs font-semibold text-gray-400">
            <p className=" h-8 w-8  items-center  bg-(--primary) rounded-full text-sm font-mono text-on-primary flex justify-center">
            {log.serialNumber}

            </p>
          </td>

          <td className="px-4 py-3">
            {log.platformType && (
              <Badge
                variant={log.platformType === "WEB" ? "primary" : "default"}
                size="sm"
              >
                {log.platformType}
              </Badge>
            )}
          </td>

          <td
            className="px-4 py-3 text-sm font-medium text-[var(--color-on-surface)] max-w-[320px] truncate"
            title={log.message}
          >
            {log.message}
          </td>

          <td className="px-4 py-3 text-xs text-[var(--color-on-muted)]">
            {log.user && (
              <div className="flex items-center gap-1 truncate">
                <HiUser size={12} />
                {log.user.userDetails?.firstName}{" "}
                {log.user.userDetails?.lastName}
              </div>
            )}

            {log.partnerUser && (
              <div className="flex items-center gap-1 truncate">
                <HiUser size={12} />
                {log.partnerUser.name}
                <span className="ml-1 text-gray-400">(Partner)</span>
              </div>
            )}
          </td>

          <td className="px-4 py-3 text-xs text-[var(--color-on-muted)]">
            <div className="flex items-center gap-1">
              <HiClock size={12} />
              {formatDate(log.timestamp)}
            </div>
          </td>

          <td className="px-4 py-3">
            {log.context && (
              <button
                onClick={() => handleViewContext(log)}
                className="p-1.5 text-[var(--color-primary)] hover:bg-blue-50 rounded-md"
              >
                <HiEye size={16} />
              </button>
            )}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

        )}
      </div>

      {/* Compact Pagination Footer */}
      {totalPages > 1 && (
        <div className="bg-white border-t border-[var(--border)] px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-[var(--color-on-muted)]">
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <span className="text-gray-300">•</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 text-xs border border-[var(--border)] rounded"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>per page</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-2 py-1 text-xs border border-[var(--border)] rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Prev
              </button>

              {/* Compact Page Numbers */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = idx + 1;
                  } else if (currentPage <= 3) {
                    pageNum = idx + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + idx;
                  } else {
                    pageNum = currentPage - 2 + idx;
                  }

                  return (
                    <button
                      key={`page-${pageNum}`}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-7 h-7 text-xs rounded ${
                        currentPage === pageNum
                          ? "bg-[var(--color-primary)] text-white font-medium"
                          : "border border-[var(--border)] hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-xs border border-[var(--border)] rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context Modal */}
      <Dialog
        isOpen={showContextModal}
        onClose={() => setShowContextModal(false)}
        title="Log Context Details"
      >
        <div>
          {selectedLog && (
            <div>
              {/* Log Info */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={getLogTypeVariant(selectedLog.type)}>
                        {selectedLog.type}
                      </Badge>
                      <span className="text-xs text-[var(--color-on-muted)]">
                        {formatDate(selectedLog.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-[var(--color-on-surface)]">
                      {selectedLog.message}
                    </p>
                  </div>
                </div>

                {selectedLog.user && (
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs font-medium text-[var(--color-on-muted)] mb-2">
                      User Information
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[var(--color-on-muted)]">
                          Name:
                        </span>
                        <p className="font-medium mt-0.5">
                          {selectedLog.user.userDetails?.firstName}{" "}
                          {selectedLog.user.userDetails?.lastName}
                        </p>
                      </div>
                      <div>
                        <span className="text-[var(--color-on-muted)]">
                          User ID:
                        </span>
                        <p className="font-medium mt-0.5">
                          {selectedLog.user.formattedUserId}
                        </p>
                      </div>
                      <div>
                        <span className="text-[var(--color-on-muted)]">
                          Phone:
                        </span>
                        <p className="font-medium mt-0.5">
                          {selectedLog.user.phoneNumber}
                        </p>
                      </div>
                      <div>
                        <span className="text-[var(--color-on-muted)]">
                          Email:
                        </span>
                        <p className="font-medium mt-0.5">
                          {selectedLog.user.email || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Context Data */}
              {selectedLog.context ? (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <HiDocumentText size={16} />
                    Context Data
                  </h4>
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto max-h-96 overflow-y-auto">
                    <pre className="text-xs text-gray-100 font-mono">
                      {JSON.stringify(selectedLog.context, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-[var(--color-on-muted)]">
                  No context data available for this log.
                </div>
              )}

              {/* Footer Info */}
              <div className="text-xs text-[var(--color-on-muted)] pt-3 border-t border-gray-200">
                <span className="font-medium">Log ID:</span> {selectedLog.id}
              </div>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}
