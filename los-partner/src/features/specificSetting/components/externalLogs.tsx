import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { FaHistory, FaCheckCircle, FaTimesCircle, FaSearch, FaFilter } from "react-icons/fa";
import { useToast } from "../../../context/toastContext";
import api from "../../../shared/services/axios";

interface ServiceRequestLog {
  id: string;
  userId?: string;
  partnerUserId?: string;
  brandId?: string;
  action: string;
  method: string;
  url: string;
  ipAddress?: string;
  userAgent?: string;
  responseStatus?: number;
  responseTime?: number;
  errorMessage?: string;
  success: boolean;
  createdAt: string;
}

export function ExternalLogsSetting() {
  const { brandId } = useParams<{ brandId: string }>();
  const [logs, setLogs] = useState<ServiceRequestLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [successFilter, setSuccessFilter] = useState<"all" | "success" | "failed">("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const { showError } = useToast();

  useEffect(() => {
    fetchLogs();
  }, [brandId, successFilter, page]);

  const fetchLogs = async () => {
    if (!brandId) return;
    
    try {
      setLoading(true);
      const params: any = {
        brandId,
        skip: (page - 1) * limit,
        take: limit,
      };
      
      if (successFilter === "success") params.success = true;
      if (successFilter === "failed") params.success = false;
      
      const response = await api.get("/service-request-logs", { params });
      setLogs(response.data.data || []);
    } catch (error) {
      console.error("Error fetching external logs:", error);
      showError("Failed to load external logs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      log.action?.toLowerCase().includes(searchLower) ||
      log.method?.toLowerCase().includes(searchLower) ||
      log.url?.toLowerCase().includes(searchLower) ||
      log.errorMessage?.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--color-on-background)]">
          External API Logs
        </h2>
        <p className="text-[var(--color-on-surface)] opacity-70 mt-2">
          View all external API service request logs for debugging and monitoring.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[250px]">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-on-surface)] opacity-50" />
            <input
              type="text"
              placeholder="Search by action, method, URL, or error..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-md var(--color-background) border-[var(--color-muted)] border-opacity-50 focus:ring-2 focus:ring-[#EA5E18] focus:border-[#EA5E18] outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <FaFilter className="text-[var(--color-on-surface)] opacity-70" />
          <select
            value={successFilter}
            onChange={(e) => setSuccessFilter(e.target.value as typeof successFilter)}
            className="px-4 py-2 border rounded-md var(--color-background) border-[var(--color-muted)] border-opacity-50 focus:ring-2 focus:ring-[#EA5E18] focus:border-[#EA5E18] outline-none"
          >
            <option value="all">All Status</option>
            <option value="success">Success Only</option>
            <option value="failed">Failed Only</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="text-center py-8 text-[var(--color-on-surface)] opacity-70">
          Loading logs...
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-8 text-[var(--color-on-surface)] opacity-70">
          <FaHistory className="text-4xl mx-auto mb-2 opacity-50" />
          <p>No external logs found</p>
        </div>
      ) : (
        <div className="var(--color-background) rounded-lg border border-[var(--color-muted)] border-opacity-30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--color-muted)] bg-opacity-10">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">Method</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">Action</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">URL</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">Response Time</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-muted)] divide-opacity-10">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--color-muted)] hover:bg-opacity-5">
                    <td className="px-4 py-3">
                      {log.success ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <FaCheckCircle />
                          <span className="text-sm">{log.responseStatus || "200"}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-600">
                          <FaTimesCircle />
                          <span className="text-sm">{log.responseStatus || "Error"}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        log.method === "GET" ? "bg-blue-100 text-blue-800" :
                        log.method === "POST" ? "bg-green-100 text-green-800" :
                        log.method === "PUT" ? "bg-yellow-100 text-yellow-800" :
                        log.method === "DELETE" ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {log.method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-on-surface)]">
                      {log.action}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-on-surface)] opacity-70 max-w-xs truncate">
                      {log.url}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-on-surface)]">
                      {log.responseTime ? `${log.responseTime}ms` : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-on-surface)] opacity-70">
                      {formatDate(log.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-center gap-2">
        <button
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="px-4 py-2 border rounded-md var(--color-background) border-[var(--color-muted)] border-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-muted)] hover:bg-opacity-10"
        >
          Previous
        </button>
        <span className="px-4 py-2 text-[var(--color-on-surface)]">
          Page {page}
        </span>
        <button
          onClick={() => setPage(page + 1)}
          disabled={filteredLogs.length < limit}
          className="px-4 py-2 border rounded-md var(--color-background) border-[var(--color-muted)] border-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-muted)] hover:bg-opacity-10"
        >
          Next
        </button>
      </div>
    </div>
  );
}
