import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { FaHistory, FaCheckCircle, FaTimesCircle, FaSearch, FaFilter } from "react-icons/fa";
import { useToast } from "../../../context/toastContext";
import api from "../../../shared/services/axios";

interface DigiLockerLog {
  id: string;
  userId: string;
  brandId: string;
  provider: "SIGNZY" | "DIGITAP";
  requestType: "CREATE_URL" | "CALLBACK" | "MANUAL_SUCCESS";
  status: "SUCCESS" | "FAILED" | "PENDING";
  digiLockerId?: string;
  errorMessage?: string;
  request?: Record<string, any>;
  response?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export function DigiLocker20LogsSetting() {
  const { brandId } = useParams<{ brandId: string }>();
  const [logs, setLogs] = useState<DigiLockerLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed">("all");
  const [providerFilter, setProviderFilter] = useState<"all" | "SIGNZY" | "DIGITAP">("all");
  const [requestTypeFilter, setRequestTypeFilter] = useState<"all" | "CREATE_URL" | "CALLBACK" | "MANUAL_SUCCESS">("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const { showError } = useToast();

  useEffect(() => {
    fetchLogs();
  }, [brandId, statusFilter, providerFilter, requestTypeFilter, page]);

  const fetchLogs = async () => {
    if (!brandId) return;

    try {
      setLoading(true);
      const params: any = {
        brandId,
        skip: (page - 1) * limit,
        take: limit,
      };

      if (statusFilter === "success") params.status = "SUCCESS";
      if (statusFilter === "failed") params.status = "FAILED";
      if (providerFilter !== "all") params.provider = providerFilter;
      if (requestTypeFilter !== "all") params.requestType = requestTypeFilter;

      const response = await api.get(
        `/partner/brand/${brandId}/digilocker/logs`,
        { params }
      );
      setLogs(response.data.data || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error("Error fetching DigiLocker logs:", error);
      showError("Failed to load DigiLocker logs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      log.userId?.toLowerCase().includes(searchLower) ||
      log.digiLockerId?.toLowerCase().includes(searchLower) ||
      log.errorMessage?.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2";
    if (status === "SUCCESS") {
      return (
        <div className={`${baseClasses} bg-green-100 text-green-700`}>
          <FaCheckCircle className="w-4 h-4" />
          Success
        </div>
      );
    }
    if (status === "FAILED") {
      return (
        <div className={`${baseClasses} bg-red-100 text-red-700`}>
          <FaTimesCircle className="w-4 h-4" />
          Failed
        </div>
      );
    }
    return (
      <div className={`${baseClasses} bg-yellow-100 text-yellow-700`}>
        <FaHistory className="w-4 h-4" />
        Pending
      </div>
    );
  };

  const getProviderBadge = (provider: string) => {
    return (
      <span
        className={`px-3 py-1 rounded-full text-sm font-medium ${
          provider === "SIGNZY"
            ? "bg-blue-100 text-blue-700"
            : "bg-purple-100 text-purple-700"
        }`}
      >
        {provider}
      </span>
    );
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--color-on-background)]">
          DigiLocker 2.0 Logs
        </h2>
        <p className="text-[var(--color-on-surface)] opacity-70 mt-2">
          View all CPR Card verification request logs for debugging and monitoring.
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-on-surface)] opacity-50" />
              <input
                type="text"
                placeholder="Search by user ID, digiLocker ID, or error..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-md bg-white border-[var(--color-muted)] border-opacity-50 focus:ring-2 focus:ring-[#EA5E18] focus:border-[#EA5E18] outline-none"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-on-background)] mb-2">
              <FaFilter className="inline mr-2" />
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "all" | "success" | "failed");
                setPage(1);
              }}
              className="w-full px-3 py-2 border rounded-md bg-white border-[var(--color-muted)] border-opacity-50 focus:ring-2 focus:ring-[#EA5E18] focus:border-[#EA5E18] outline-none"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Provider Filter */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-on-background)] mb-2">
              Provider
            </label>
            <select
              value={providerFilter}
              onChange={(e) => {
                setProviderFilter(e.target.value as "all" | "SIGNZY" | "DIGITAP");
                setPage(1);
              }}
              className="w-full px-3 py-2 border rounded-md bg-white border-[var(--color-muted)] border-opacity-50 focus:ring-2 focus:ring-[#EA5E18] focus:border-[#EA5E18] outline-none"
            >
              <option value="all">All Providers</option>
              <option value="SIGNZY">Signzy</option>
              <option value="DIGITAP">Digitap</option>
            </select>
          </div>

          {/* Request Type Filter */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-on-background)] mb-2">
              Request Type
            </label>
            <select
              value={requestTypeFilter}
              onChange={(e) => {
                setRequestTypeFilter(e.target.value as "all" | "CREATE_URL" | "CALLBACK" | "MANUAL_SUCCESS");
                setPage(1);
              }}
              className="w-full px-3 py-2 border rounded-md bg-white border-[var(--color-muted)] border-opacity-50 focus:ring-2 focus:ring-[#EA5E18] focus:border-[#EA5E18] outline-none"
            >
              <option value="all">All Types</option>
              <option value="CREATE_URL">Create URL</option>
              <option value="CALLBACK">Callback</option>
              <option value="MANUAL_SUCCESS">Manual Success</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto border border-[var(--color-muted)] border-opacity-50 rounded-lg">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#EA5E18]"></div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-[var(--color-on-surface)] opacity-70">
              No DigiLocker logs found
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-background)] border-b border-[var(--color-muted)] border-opacity-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-[var(--color-on-background)]">
                  User ID
                </th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--color-on-background)]">
                  Provider
                </th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--color-on-background)]">
                  Request Type
                </th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--color-on-background)]">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--color-on-background)]">
                  DigiLocker ID
                </th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--color-on-background)]">
                  Error
                </th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--color-on-background)]">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, index) => (
                <tr
                  key={log.id}
                  className={`border-b border-[var(--color-muted)] border-opacity-50 ${
                    index % 2 === 0 ? "bg-white" : "bg-[var(--color-background)]"
                  } hover:bg-opacity-50 transition-colors`}
                >
                  <td className="px-4 py-3 text-[var(--color-on-surface)]">
                    <span className="font-mono text-xs bg-[var(--color-background)] px-2 py-1 rounded">
                      {log.userId}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {getProviderBadge(log.provider)}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-on-surface)]">
                    <span className="text-xs font-medium uppercase">
                      {log.requestType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(log.status)}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-on-surface)]">
                    <span className="font-mono text-xs">
                      {log.digiLockerId || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-on-surface)]">
                    <span className="text-xs text-red-600">
                      {log.errorMessage || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-on-surface)] text-xs">
                    {formatDate(log.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-[var(--color-on-surface)] opacity-70">
            Page {page} of {totalPages} • Total: {total} logs
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-md border border-[var(--color-muted)] text-[var(--color-on-background)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-background)] transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-md border border-[var(--color-muted)] text-[var(--color-on-background)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-background)] transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
