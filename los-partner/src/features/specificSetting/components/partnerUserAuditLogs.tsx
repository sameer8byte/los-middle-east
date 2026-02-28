import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { FaHistory, FaCheckCircle, FaTimesCircle, FaSearch, FaFilter } from "react-icons/fa";
import { useToast } from "../../../context/toastContext";
import api from "../../../shared/services/axios";

interface PartnerUserAuditLog {
  id: string;
  partnerUserId?: string;
  performedByUserId?: string;
  action: string;
  details?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  createdAt: string;
}

export function PartnerUserAuditLogsSetting() {
  const { brandId } = useParams<{ brandId: string }>();
  const [logs, setLogs] = useState<PartnerUserAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const { showError } = useToast();

  useEffect(() => {
    fetchLogs();
  }, [brandId, actionFilter, page]);

  const fetchLogs = async () => {
    if (!brandId) return;
    
    try {
      setLoading(true);
      const params: any = {
        page,
        limit,
      };
      
      if (actionFilter !== "all") params.action = actionFilter;
      
      const response = await api.get(`/partner/brand/${brandId}/partner-users/audit-logs`, { params });
      setLogs(response.data.data || []);
    } catch (error) {
      console.error("Error fetching partner user audit logs:", error);
      showError("Failed to load partner user audit logs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      log.action?.toLowerCase().includes(searchLower) ||
      log.details?.toLowerCase().includes(searchLower) ||
      log.errorMessage?.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getActionBadgeColor = (action: string): string => {
    const colorMap: Record<string, string> = {
      CREATE: "bg-green-100 text-green-800",
      UPDATE: "bg-blue-100 text-blue-800",
      DELETE: "bg-red-100 text-red-800",
      LOGIN: "bg-purple-100 text-purple-800",
      LOGOUT: "bg-yellow-100 text-yellow-800",
    };
    return colorMap[action] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-[var(--color-on-surface)] opacity-70">
        Loading logs...
      </div>
    );
  }

  const isEmptyLogs = filteredLogs.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--color-on-background)]">
          Partner User Audit Logs
        </h2>
        <p className="text-[var(--color-on-surface)] opacity-70 mt-2">
          View all partner user activities and changes for audit and monitoring purposes.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[250px]">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-on-surface)] opacity-50" />
            <input
              type="text"
              placeholder="Search by action, details, or error..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-md var(--color-background) border-[var(--color-muted)] border-opacity-50 focus:ring-2 focus:ring-[#EA5E18] focus:border-[#EA5E18] outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <FaFilter className="text-[var(--color-on-surface)] opacity-70" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-4 py-2 border rounded-md var(--color-background) border-[var(--color-muted)] border-opacity-50 focus:ring-2 focus:ring-[#EA5E18] focus:border-[#EA5E18] outline-none"
          >
            <option value="all">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="LOGIN">Login</option>
            <option value="LOGOUT">Logout</option>
          </select>
        </div>
      </div>

      {/* Logs Content */}
      {isEmptyLogs ? (
        <div className="text-center py-8 text-[var(--color-on-surface)] opacity-70">
          <FaHistory className="text-4xl mx-auto mb-2 opacity-50" />
          <p>No partner user audit logs found</p>
        </div>
      ) : (
        <div className="var(--color-background) rounded-lg border border-[var(--color-muted)] border-opacity-30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--color-muted)] bg-opacity-10">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">Action</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">Details</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">Changes</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">User ID</th>
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
                          <span className="text-sm">Success</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-600">
                          <FaTimesCircle />
                          <span className="text-sm">Failed</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-on-surface)]">
                      {log.details || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-on-surface)]">
                      {log.changes ? (
                        <div className="max-h-20 overflow-y-auto p-2 bg-[var(--color-muted)] bg-opacity-10 rounded text-xs font-mono">
                          {typeof log.changes === "string"
                            ? log.changes
                            : JSON.stringify(log.changes, null, 2)}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-on-surface)] opacity-70">
                      {log.partnerUserId || "-"}
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
