import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { FaHistory, FaCheckCircle, FaTimesCircle, FaSearch, FaFilter, FaDownload } from "react-icons/fa";
import { useToast } from "../../../context/toastContext";
import { PanDetailsService, PanDetailsLog, PanStatus, PanProvider } from "../services/panDetailsService";

export function PanDetailsLogsSetting() {
  const { brandId } = useParams<{ brandId: string }>();
  const [logs, setLogs] = useState<PanDetailsLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PanStatus>("all");
  const [providerFilter, setProviderFilter] = useState<"all" | PanProvider>("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    fetchLogs();
  }, [brandId, statusFilter, providerFilter, page]);

  const fetchLogs = async () => {
    if (!brandId) return;
    
    try {
      setLoading(true);
      const data = await PanDetailsService.getFilteredLogs(
        brandId,
        page,
        limit,
        statusFilter !== "all" ? statusFilter : undefined,
        providerFilter !== "all" ? providerFilter : undefined
      );
      setLogs(data);
    } catch (error) {
      console.error("Error fetching PAN details logs:", error);
      showError("Failed to load PAN details logs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      log.pan?.toLowerCase().includes(searchLower) ||
      log.clientRefNum?.toLowerCase().includes(searchLower) ||
      log.panHolderName?.toLowerCase().includes(searchLower) ||
      log.user?.email?.toLowerCase().includes(searchLower)
    );
  });

  const downloadCSV = () => {
    const csvContent = [
      ['Date', 'PAN', 'Client Ref', 'Provider', 'Status', 'PAN Holder Name', 'Valid', 'Error'].join(','),
      ...filteredLogs.map(log => {
        let validValue = '';
        if (log.isValid !== undefined) {
          validValue = log.isValid ? 'Yes' : 'No';
        }
        return [
          formatDate(log.createdAt),
          log.pan,
          log.clientRefNum || '',
          log.provider,
          log.status,
          log.panHolderName || '',
          validValue,
          log.errorMessage ? `"${log.errorMessage.replace(/"/g, '""')}"` : ''
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pan-details-logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    showSuccess(`Successfully downloaded ${filteredLogs.length} PAN details log records.`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const maskPan = (pan: string) => {
    if (!pan || pan.length < 8) return pan;
    return `${pan.substring(0, 3)}XXX${pan.substring(7)}`;
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      SUCCESS: "bg-green-100 text-green-800",
      FAILED: "bg-red-100 text-red-800",
      INVALID: "bg-orange-100 text-orange-800",
      PENDING: "bg-yellow-100 text-yellow-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getProviderBadgeClass = (provider: string) => {
    if (provider === "DIGITAP") return "bg-blue-100 text-blue-800";
    if (provider === "SCOREME") return "bg-purple-100 text-purple-800";
    return "bg-gray-100 text-gray-800";
  };

  const renderValidIcon = (isValid?: boolean) => {
    if (isValid === undefined) {
      return <span className="text-[var(--color-on-surface)] opacity-50">-</span>;
    }
    return isValid ? (
      <FaCheckCircle className="text-green-600" />
    ) : (
      <FaTimesCircle className="text-red-600" />
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--color-on-background)]">
          PAN Details Verification Logs
        </h2>
        <p className="text-[var(--color-on-surface)] opacity-70 mt-2">
          View all PAN verification attempts and results.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[250px]">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-on-surface)] opacity-50" />
            <input
              type="text"
              placeholder="Search by PAN, client ref, name, or email..."
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
            <option value="INVALID">Invalid</option>
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
      {loading && (
        <div className="text-center py-8 text-[var(--color-on-surface)] opacity-70">
          Loading PAN details logs...
        </div>
      )}
      
      {!loading && filteredLogs.length === 0 && (
        <div className="text-center py-8 text-[var(--color-on-surface)] opacity-70">
          <FaHistory className="text-4xl mx-auto mb-2 opacity-50" />
          <p>No PAN details logs found</p>
        </div>
      )}
      
      {!loading && filteredLogs.length > 0 && (
        <div className="var(--color-background) rounded-lg border border-[var(--color-muted)] border-opacity-30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--color-muted)] bg-opacity-10">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">PAN</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">Client Ref</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">PAN Holder Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">Provider</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">Valid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-muted)] divide-opacity-10">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--color-muted)] hover:bg-opacity-5">
                    <td className="px-4 py-3 text-sm text-[var(--color-on-surface)] opacity-70">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-[var(--color-on-surface)]">
                      {maskPan(log.pan)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-on-surface)]">
                      {log.clientRefNum || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-on-surface)]">
                      {log.panHolderName || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getProviderBadgeClass(log.provider)}`}>
                        {log.provider}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadge(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {renderValidIcon(log.isValid)}
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
                  <span className="font-medium">{maskPan(log.pan)}</span>: {log.errorMessage}
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
    </div>
  );
}
