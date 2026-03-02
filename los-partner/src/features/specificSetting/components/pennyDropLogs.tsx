import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { FaHistory, FaCheckCircle, FaTimesCircle, FaSearch, FaFilter, FaDownload } from "react-icons/fa";
import { useToast } from "../../../context/toastContext";
import api from "../../../shared/services/axios";
import Dialog from "../../../common/dialog";

interface PennyDropLog {
  id: string;
  accountNumber: string;
  ifsc: string;
  beneficiaryName?: string;
  provider: string;
  status: "SUCCESS" | "FAILED" | "PENDING" | "NAME_MISMATCH";
  accountHolderName?: string;
  nameMatch?: boolean;
  errorMessage?: string;
  createdAt: string;
  user?: {
    email?: string;
    userDetails?: {
      firstName?: string;
      lastName?: string;
    };
  };
}

export function PennyDropLogsSetting() {
  const { brandId } = useParams<{ brandId: string }>();
  const [logs, setLogs] = useState<PennyDropLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "SUCCESS" | "FAILED" | "NAME_MISMATCH">("all");
  const [providerFilter, setProviderFilter] = useState<"all" | "DIGITAP" | "SCOREME" | "SIGNZY">("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [selectedLog, setSelectedLog] = useState<PennyDropLog | null>(null);
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    fetchLogs();
  }, [brandId, statusFilter, providerFilter, page]);

  const fetchLogs = async () => {
    if (!brandId) return;
    
    try {
      setLoading(true);
      const params: any = {
        brandId,
        skip: (page - 1) * limit,
        take: limit,
      };
      
      if (statusFilter !== "all") params.status = statusFilter;
      if (providerFilter !== "all") params.provider = providerFilter;
      
      const response = await api.get(`/partner/brand/${brandId}/penny-drop/logs`, { params });
      setLogs(response.data.data || response.data || []);
    } catch (error) {
      console.error("Error fetching penny drop logs:", error);
      showError("Failed to load penny drop logs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      log.accountNumber?.toLowerCase().includes(searchLower) ||
      log.ifsc?.toLowerCase().includes(searchLower) ||
      log.beneficiaryName?.toLowerCase().includes(searchLower) ||
      log.accountHolderName?.toLowerCase().includes(searchLower) ||
      log.user?.email?.toLowerCase().includes(searchLower)
    );
  });

  const downloadCSV = () => {
    const csvContent = [
      ['Date', 'Account Number', 'IFSC', 'Beneficiary Name', 'Provider', 'Status', 'Account Holder', 'Name Match', 'Error'].join(','),
      ...filteredLogs.map(log => [
        formatDate(log.createdAt),
        log.accountNumber,
        log.ifsc,
        log.beneficiaryName || '',
        log.provider,
        log.status,
        log.accountHolderName || '',
        log.nameMatch !== undefined ? (log.nameMatch ? 'Yes' : 'No') : '',
        log.errorMessage ? `"${log.errorMessage.replace(/"/g, '""')}"` : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `penny-drop-logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    showSuccess(`Successfully downloaded ${filteredLogs.length} penny drop log records.`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getProviderBadgeColor = (provider: string) => {
    switch(provider) {
      case "DIGITAP":
        return "bg-blue-100 text-blue-800";
      case "SCOREME":
        return "bg-purple-100 text-purple-800";
      case "SIGNZY":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      SUCCESS: "bg-green-100 text-green-800",
      FAILED: "bg-red-100 text-red-800",
      PENDING: "bg-yellow-100 text-yellow-800",
      NAME_MISMATCH: "bg-orange-100 text-orange-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--color-on-background)]">
          Penny Drop Verification Logs
        </h2>
        <p className="text-[var(--color-on-surface)] opacity-70 mt-2">
          View all bank account penny drop verification attempts and results.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[250px]">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-on-surface)] opacity-50" />
            <input
              type="text"
              placeholder="Search by account number, IBAN, name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-md var(--color-background) border-[var(--color-muted)] border-opacity-50 focus:ring-2 focus:ring-[#EA5E18] focus:border-[#EA5E18] outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <FaFilter className="text-[var(--color-on-surface)] opacity-70" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-4 py-2 border rounded-md var(--color-background) border-[var(--color-muted)] border-opacity-50 focus:ring-2 focus:ring-[#EA5E18] focus:border-[#EA5E18] outline-none"
          >
            <option value="all">All Status</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
            <option value="NAME_MISMATCH">Name Mismatch</option>
            <option value="PENDING">Pending</option>
          </select>

          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value as typeof providerFilter)}
            className="px-4 py-2 border rounded-md var(--color-background) border-[var(--color-muted)] border-opacity-50 focus:ring-2 focus:ring-[#EA5E18] focus:border-[#EA5E18] outline-none"
          >
            <option value="all">All Providers</option>
            <option value="DIGITAP">DIGITAP</option>
            <option value="SCOREME">SCOREME</option>
            <option value="SIGNZY">SIGNZY</option>
          </select>
        </div>

        <button
          onClick={downloadCSV}
          disabled={filteredLogs.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-[#EA5E18] text-white rounded-md hover:bg-[#d54e0f] disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <FaDownload />
          Download CSV
        </button>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="text-center py-8 text-[var(--color-on-surface)] opacity-70">
          Loading penny drop logs...
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-8 text-[var(--color-on-surface)] opacity-70">
          <FaHistory className="text-4xl mx-auto mb-2 opacity-50" />
          <p>No penny drop logs found</p>
        </div>
      ) : (
        <div className="var(--color-background) rounded-lg border border-[var(--color-muted)] border-opacity-30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--color-muted)] bg-opacity-10">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">Account Number</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">IBAN</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">Beneficiary Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">Provider</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">Verified Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">Name Match</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-muted)] divide-opacity-10">
                {filteredLogs.map((log) => (
                  <tr 
                    key={log.id} 
                    className="hover:bg-[var(--color-muted)] hover:bg-opacity-5 cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-4 py-3 text-sm text-[var(--color-on-surface)] opacity-70">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-[var(--color-on-surface)]">
                      {log.accountNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-on-surface)]">
                      {log.ifsc}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-on-surface)]">
                      {log.beneficiaryName || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        log.provider === "DIGITAP" ? "bg-blue-100 text-blue-800" :
                        log.provider === "SCOREME" ? "bg-purple-100 text-purple-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {log.provider}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadge(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-on-surface)]">
                      {log.accountHolderName || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {log.nameMatch !== undefined ? (
                        log.nameMatch ? (
                          <FaCheckCircle className="text-green-600" />
                        ) : (
                          <FaTimesCircle className="text-red-600" />
                        )
                      ) : (
                        <span className="text-[var(--color-on-surface)] opacity-50">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Error messages section */}
      {filteredLogs.some(log => log.errorMessage) && (
        <div className="var(--color-background) rounded-lg border border-[var(--color-muted)] border-opacity-30 p-4">
          <h3 className="text-lg font-semibold text-[var(--color-on-background)] mb-3">Recent Errors</h3>
          <div className="space-y-2">
            {filteredLogs
              .filter(log => log.errorMessage)
              .slice(0, 5)
              .map((log) => (
                <div key={log.id} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  <span className="font-medium">{log.accountNumber}</span>: {log.errorMessage}
                </div>
              ))}
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

      {/* Details Modal */}
      {selectedLog && (
        <Dialog 
        isOpen={!!selectedLog}
        title="Penny Drop Verification Details"
        onClose={() => setSelectedLog(null)}>
          <div >
            {/* Modal Header */}
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-lg font-semibold text-[var(--color-on-background)] mb-4">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">Date & Time</div>
                    <p className="text-[var(--color-on-surface)] mt-1">{formatDate(selectedLog.createdAt)}</p>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">Status</div>
                    <div className="mt-1">
                      <span className={`px-3 py-1 text-sm font-medium rounded ${getStatusBadge(selectedLog.status)}`}>
                        {selectedLog.status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">Provider</div>
                    <div className="mt-1">
                      <span className={`px-3 py-1 text-sm font-medium rounded ${getProviderBadgeColor(selectedLog.provider)}`}>
                        {selectedLog.provider}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">User Email</div>
                    <p className="text-[var(--color-on-surface)] mt-1">{selectedLog.user?.email || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Bank Account Details */}
              <div>
                <h4 className="text-lg font-semibold text-[var(--color-on-background)] mb-4">Bank Account Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">Account Number</div>
                    <p className="text-[var(--color-on-surface)] mt-1 font-mono">{selectedLog.accountNumber}</p>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">IBAN Code</div>
                    <p className="text-[var(--color-on-surface)] mt-1 font-mono">{selectedLog.ifsc}</p>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">Beneficiary Name (Input)</div>
                    <p className="text-[var(--color-on-surface)] mt-1">{selectedLog.beneficiaryName || "-"}</p>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">Account Holder Name (Verified)</div>
                    <p className="text-[var(--color-on-surface)] mt-1">{selectedLog.accountHolderName || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Verification Results */}
              <div>
                <h4 className="text-lg font-semibold text-[var(--color-on-background)] mb-4">Verification Results</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">Name Match</div>
                    <div className="mt-1">
                      {selectedLog.nameMatch !== undefined && (
                        <div className="flex items-center gap-2">
                          {selectedLog.nameMatch ? (
                            <>
                              <FaCheckCircle className="text-green-600" size={20} />
                              <span className="text-green-600 font-medium">Matched</span>
                            </>
                          ) : (
                            <>
                              <FaTimesCircle className="text-red-600" size={20} />
                              <span className="text-red-600 font-medium">Not Matched</span>
                            </>
                          )}
                        </div>
                      )}
                      {selectedLog.nameMatch === undefined && (
                        <span className="text-[var(--color-on-surface)] opacity-50">-</span>
                      )}
                    </div>
                  </div>
                  {selectedLog.errorMessage && (
                    <div>
                      <div className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">Error Message</div>
                      <p className="text-red-600 mt-1 bg-red-50 p-2 rounded text-sm">{selectedLog.errorMessage}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* User Information */}
              {selectedLog.user && (
                <div>
                  <h4 className="text-lg font-semibold text-[var(--color-on-background)] mb-4">User Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">First Name</div>
                      <p className="text-[var(--color-on-surface)] mt-1">{selectedLog.user.userDetails?.firstName || "-"}</p>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">Last Name</div>
                      <p className="text-[var(--color-on-surface)] mt-1">{selectedLog.user.userDetails?.lastName || "-"}</p>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">Email</div>
                      <p className="text-[var(--color-on-surface)] mt-1">{selectedLog.user.email || "-"}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-[var(--color-muted)] border-opacity-30 px-6 py-4 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-[var(--color-muted)] bg-opacity-20 text-[var(--color-on-background)] rounded-md hover:bg-opacity-30 transition"
              >
                Close
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
