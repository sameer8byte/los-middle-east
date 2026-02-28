import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { FaHistory, FaSearch, FaFilter, FaDownload } from "react-icons/fa";
import { useToast } from "../../../context/toastContext";
import api from "../../../shared/services/axios";

interface MobileVerificationLog {
  id: string;
  userId?: string;
  brandId?: string;
  provider: string;
  serviceType: string;
  request: any;
  response: any;
  isValid?: boolean;
  errorMessage?: string;
  createdAt: string;
  users?: {
    email?: string;
    phoneNumber?: string;
    userDetails?: {
      firstName?: string;
      lastName?: string;
    };
  };
}

export function MobileVerificationLogsSetting() {
  const { brandId } = useParams<{ brandId: string }>();
  const [logs, setLogs] = useState<MobileVerificationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("all");
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    if (brandId) {
      fetchLogs();
    }
  }, [brandId]);

  const fetchLogs = async () => {
    if (!brandId) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/partner/mobile-to-addrress-verification/logs/all/${brandId}`);
      setLogs(response.data || []);
    } catch (error: any) {
      console.error("Error fetching mobile verification logs:", error);
      showError("Failed to load mobile verification logs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        log.users?.email?.toLowerCase().includes(searchLower) ||
        log.users?.phoneNumber?.toLowerCase().includes(searchLower) ||
        log.serviceType?.toLowerCase().includes(searchLower) ||
        log.provider?.toLowerCase().includes(searchLower) ||
        log.users?.userDetails?.firstName?.toLowerCase().includes(searchLower) ||
        log.users?.userDetails?.lastName?.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "SUCCESS" && !log.isValid) return false;
      if (statusFilter === "FAILED" && (log.isValid || !log.errorMessage)) return false;
    }

    // Service type filter
    if (serviceTypeFilter !== "all" && log.serviceType !== serviceTypeFilter) {
      return false;
    }

    return true;
  });

  const downloadCSV = () => {
    const headers = ['Date', 'User Email', 'Phone', 'Service Type', 'Provider', 'Status', 'Error Message'];
    const csvData = filteredLogs.map(log => [
      formatDate(log.createdAt),
      log.users?.email || '',
      log.users?.phoneNumber || '',
      log.serviceType,
      log.provider,
      log.isValid ? 'SUCCESS' : 'FAILED',
      log.errorMessage ? `"${log.errorMessage.replace(/"/g, '""')}"` : ''
    ]);

    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mobile-verification-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    showSuccess(`Successfully downloaded ${filteredLogs.length} mobile verification log records.`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (isValid?: boolean) => {
    if (isValid === true) {
      return "bg-green-100 text-green-800";
    } else if (isValid === false) {
      return "bg-red-100 text-red-800";
    }
    return "bg-gray-100 text-gray-800";
  };

  const getStatusText = (isValid?: boolean) => {
    if (isValid === true) return "SUCCESS";
    if (isValid === false) return "FAILED";
    return "UNKNOWN";
  };

  const getServiceTypeDisplay = (serviceType: string) => {
    const types: Record<string, string> = {
      "MOBILE_TO_ADDRESSES": "Mobile to Addresses",
      "MOBILE_TO_ADDRESSES_ECOM": "Mobile to E-commerce",
      "MOBILE_TO_LPG_DETAILS": "Mobile to LPG",
      "MOBILE_TO_DL_ADVANCED": "Mobile to DL"
    };
    return types[serviceType] || serviceType;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--color-on-background)]">
          Mobile Verification Logs
        </h2>
        <p className="text-[var(--color-on-surface)] opacity-70 mt-2">
          View all mobile to address verification attempts and results.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[250px]">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-on-surface)] opacity-50" />
            <input
              type="text"
              placeholder="Search by email, phone, service type..."
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
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-md var(--color-background) border-[var(--color-muted)] border-opacity-50 focus:ring-2 focus:ring-[#EA5E18] focus:border-[#EA5E18] outline-none"
          >
            <option value="all">All Status</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
          </select>

          <select
            value={serviceTypeFilter}
            onChange={(e) => setServiceTypeFilter(e.target.value)}
            className="px-4 py-2 border rounded-md var(--color-background) border-[var(--color-muted)] border-opacity-50 focus:ring-2 focus:ring-[#EA5E18] focus:border-[#EA5E18] outline-none"
          >
            <option value="all">All Services</option>
            <option value="MOBILE_TO_ADDRESSES">Mobile to Addresses</option>
            <option value="MOBILE_TO_ADDRESSES_ECOM">Mobile to E-commerce</option>
            <option value="MOBILE_TO_LPG_DETAILS">Mobile to LPG</option>
            <option value="MOBILE_TO_DL_ADVANCED">Mobile to DL</option>
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
          Loading mobile verification logs...
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-8 text-[var(--color-on-surface)] opacity-70">
          <FaHistory className="text-4xl mx-auto mb-2 opacity-50" />
          <p>No mobile verification logs found</p>
        </div>
      ) : (
        <div className="var(--color-background) rounded-lg border border-[var(--color-muted)] border-opacity-30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--color-muted)] bg-opacity-10">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">User Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">Phone</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">Service Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">Provider</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-on-background)]">Error Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-muted)] divide-opacity-10">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--color-muted)] hover:bg-opacity-5">
                    <td className="px-4 py-3 text-sm text-[var(--color-on-surface)] opacity-70">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-[var(--color-on-surface)]">
                      {log.users?.email || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-on-surface)]">
                      {log.users?.phoneNumber || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-on-surface)]">
                      {getServiceTypeDisplay(log.serviceType)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                        {log.provider}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadge(log.isValid)}`}>
                        {getStatusText(log.isValid)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-on-surface)] max-w-xs truncate">
                      {log.errorMessage || "-"}
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
                  <span className="font-medium">{log.users?.email || log.users?.phoneNumber || 'Unknown user'}</span>: {log.errorMessage}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Statistics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="var(--color-background) rounded-lg border border-[var(--color-muted)] border-opacity-30 p-4">
          <p className="text-sm text-[var(--color-on-surface)] opacity-70">Total Logs</p>
          <p className="text-2xl font-bold text-[var(--color-on-background)]">{filteredLogs.length}</p>
        </div>
        <div className="var(--color-background) rounded-lg border border-[var(--color-muted)] border-opacity-30 p-4">
          <p className="text-sm text-[var(--color-on-surface)] opacity-70">Successful</p>
          <p className="text-2xl font-bold text-green-600">
            {filteredLogs.filter(log => log.isValid).length}
          </p>
        </div>
        <div className="var(--color-background) rounded-lg border border-[var(--color-muted)] border-opacity-30 p-4">
          <p className="text-sm text-[var(--color-on-surface)] opacity-70">Failed</p>
          <p className="text-2xl font-bold text-red-600">
            {filteredLogs.filter(log => !log.isValid && log.errorMessage).length}
          </p>
        </div>
      </div>
    </div>
  );
}