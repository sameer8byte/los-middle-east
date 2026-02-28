import { useState, useEffect } from "react";
import { 
  FaHistory, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaSearch,
  FaFilter,
  FaDownload,
  FaEye,
  FaUser,
  FaEnvelope,
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight
} from "react-icons/fa";
import Dialog from "../../../../common/dialog";
import { Button } from "../../../../common/ui/button";
import { useToast } from "../../../../context/toastContext";
import { EmailType, EMAIL_TYPE_LABELS } from "../../../../constant/emailTypes";
import { 
  EmailReminderLog, 
  EmailReminderStats, 
  getEmailReminderLogs, 
  getEmailReminderStats,
  getAllEmailReminderLogs
} from "../../../../shared/services/api/loan.api";

interface EmailReminderLogsProps {
  readonly brandId: string;
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function EmailReminderLogs({
  brandId,
  isOpen,
  onClose,
}: EmailReminderLogsProps) {
  const [logs, setLogs] = useState<EmailReminderLog[]>([]);
  const [stats, setStats] = useState<EmailReminderStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed">("all");
  const [selectedLog, setSelectedLog] = useState<EmailReminderLog | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const recordsPerPage = 10;
  
  // Date filter state
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
  const { showError, showSuccess } = useToast();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchLogs = async (page = 1, resetPage = false) => {
    try {
      setLoading(true);
      const filters: any = { 
        limit: recordsPerPage, 
        page: resetPage ? 1 : page 
      };
      
      if (statusFilter === "success") filters.success = true;
      if (statusFilter === "failed") filters.success = false;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      if (debouncedSearchTerm.trim()) filters.search = debouncedSearchTerm.trim();
      
      const [logsResponse, statsData] = await Promise.all([
        getEmailReminderLogs(brandId, filters),
        getEmailReminderStats(brandId)
      ]);
      
      // Handle both paginated and non-paginated response formats for backward compatibility
      if (logsResponse.data && logsResponse.pagination) {
        // New paginated format
        setLogs(logsResponse.data);
        setTotalRecords(logsResponse.pagination.total);
        setTotalPages(logsResponse.pagination.totalPages);
        setCurrentPage(resetPage ? 1 : page);
      } else {
        // Old format (array of logs) - treat as single page
        const logsArray = Array.isArray(logsResponse) ? logsResponse : [];
        setLogs(logsArray);
        setTotalRecords(logsArray.length);
        setTotalPages(1);
        setCurrentPage(1);
      }
      
      setStats(statsData);
    } catch (error) {
      console.error("Error fetching email logs:", error);
      showError("Failed to load email logs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadAllLogs = async () => {
    try {
      setDownloadingAll(true);
      const filters: any = {};
      
      if (statusFilter === "success") filters.success = true;
      if (statusFilter === "failed") filters.success = false;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      if (debouncedSearchTerm.trim()) filters.search = debouncedSearchTerm.trim();
      
      const allLogs = await getAllEmailReminderLogs(brandId, filters);
      
      const csvContent = [
        ['Date', 'Loan ID', 'Customer Name', 'Email', 'Type', 'Status', 'Recipient', 'Error'].join(','),
        ...allLogs.map(log => [
          formatDate(log.sentAt),
          log.loan.formattedLoanId,
          `${log.loan.user.userDetails?.firstName || ''} ${log.loan.user.userDetails?.lastName || ''}`.trim(),
          log.loan.user.email,
          getEmailTypeDisplay(log.emailType),
          log.success ? 'Success' : 'Failed',
          log.recipient || log.loan.user.email,
          log.error ? `"${log.error.replace(/"/g, '""')}"` : ''
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      let dateRange = '';
      if (dateFrom && dateTo) {
        dateRange = `_${dateFrom}_to_${dateTo}`;
      } else if (dateFrom) {
        dateRange = `_from_${dateFrom}`;
      } else if (dateTo) {
        dateRange = `_to_${dateTo}`;
      }
      
      const statusSuffix = statusFilter !== 'all' ? `_${statusFilter}` : '';
      
      link.download = `email-logs-all${dateRange}${statusSuffix}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      showSuccess(`Successfully downloaded ${allLogs.length} email log records.`);
    } catch (error) {
      console.error("Error downloading all logs:", error);
      showError("Failed to download all logs. Please try again.");
    } finally {
      setDownloadingAll(false);
    }
  };

  useEffect(() => {
    if (isOpen && brandId) {
      fetchLogs(1, true);
    }
  }, [isOpen, brandId, statusFilter, dateFrom, dateTo, debouncedSearchTerm]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchLogs(newPage);
    }
  };

  const clearDateFilter = () => {
    setDateFrom("");
    setDateTo("");
  };

  const clearSearch = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
  };

  const handleViewDetails = (log: EmailReminderLog) => {
    setSelectedLog(log);
    setShowDetails(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getEmailTypeDisplay = (emailType: EmailType) => {
    return EMAIL_TYPE_LABELS[emailType] || emailType;
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog isOpen={isOpen} onClose={onClose} title="Email Reminder Logs" size="xl">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">Total Sent</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                </div>
                <FaEnvelope className="text-blue-500 text-xl" />
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">Successful</p>
                  <p className="text-2xl font-bold text-green-900">{stats.successful}</p>
                </div>
                <FaCheckCircle className="text-green-500 text-xl" />
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-600 text-sm font-medium">Failed</p>
                  <p className="text-2xl font-bold text-red-900">{stats.failed}</p>
                </div>
                <FaTimesCircle className="text-red-500 text-xl" />
              </div>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 text-sm font-medium">Success Rate</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.successRate.toFixed(1)}%</p>
                </div>
                <FaHistory className="text-purple-500 text-xl" />
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="space-y-4 mb-6">
          {/* First row: Search and Status Filter */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by loan ID, customer name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EA5E18] focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
              {loading && searchTerm !== debouncedSearchTerm && (
                <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <FaFilter className="text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "success" | "failed")}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EA5E18] focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="success">Success Only</option>
                <option value="failed">Failed Only</option>
              </select>
            </div>
          </div>

          {/* Second row: Date Filters and Actions */}
          <div className="flex gap-4 items-end">
            <div className="flex gap-4 items-end">
              <div className="flex flex-col">
                <label htmlFor="dateFrom" className="text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EA5E18] focus:border-transparent"
                />
              </div>
              
              <div className="flex flex-col">
                <label htmlFor="dateTo" className="text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EA5E18] focus:border-transparent"
                />
              </div>
              
              {(dateFrom || dateTo) && (
                <Button
                  onClick={clearDateFilter}
                  variant="outline"
                  size="sm"
                  className="mb-0"
                >
                  Clear Dates
                </Button>
              )}
            </div>
            
            <div className="flex-1" />
            
            <div className="flex gap-2">
              <Button
                onClick={downloadAllLogs}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                disabled={downloadingAll}
              >
                {downloadingAll ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <FaDownload />
                    Download All
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="border border-[var(--color-muted)] border-opacity-30 rounded-lg">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-[var(--color-muted)] border-opacity-30 border-t-[#EA5E18] rounded-full animate-spin mr-2" />
              Loading email logs...
            </div>
          )}
          
          {!loading && logs.length === 0 && (
            <div className="flex items-center justify-center py-12 text-[var(--color-on-surface)] opacity-50">
              <FaHistory className="w-5 h-5 mr-2" />
              No email logs found
            </div>
          )}
          
          {!loading && logs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Loan ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <FaCalendarAlt className="w-3 h-3 mr-2 text-gray-400" />
                          {formatDate(log.sentAt)}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {log.loan.formattedLoanId}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FaUser className="w-3 h-3 mr-2 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {`${log.loan.user.userDetails?.firstName || ''} ${log.loan.user.userDetails?.lastName || ''}`.trim() || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">{log.loan.user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {getEmailTypeDisplay(log.emailType)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          log.success 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {log.success ? (
                            <>
                              <FaCheckCircle className="w-3 h-3 mr-1" />
                              Success
                            </>
                          ) : (
                            <>
                              <FaTimesCircle className="w-3 h-3 mr-1" />
                              Failed
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          onClick={() => handleViewDetails(log)}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <FaEye className="w-3 h-3" />
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination and Info */}
        <div className="flex justify-between items-center mt-6">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              Showing {logs.length} of {totalRecords} email logs
            </div>
            {debouncedSearchTerm && (
              <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded flex items-center gap-1">
                <FaSearch className="w-3 h-3" />
                Search active
              </div>
            )}
            {(dateFrom || dateTo) && (
              <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded flex items-center gap-1">
                <FaCalendarAlt className="w-3 h-3" />
                Date filtered
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <FaChevronLeft className="w-3 h-3" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        variant={currentPage === pageNum ? "primary" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  Next
                  <FaChevronRight className="w-3 h-3" />
                </Button>
                
                <span className="text-sm text-gray-500 ml-2">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
            )}
            
            <Button onClick={onClose} className="bg-[#EA5E18] hover:bg-[#d54e0f]">
              Close
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Log Details Modal */}
      {selectedLog && (
        <Dialog 
          isOpen={showDetails} 
          onClose={() => setShowDetails(false)} 
          title="Email Log Details"
          size="lg"
        >
          <div className="space-y-6">
            {/* Email Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {selectedLog.success ? (
                  <FaCheckCircle className="w-8 h-8 text-green-500" />
                ) : (
                  <FaTimesCircle className="w-8 h-8 text-red-500" />
                )}
                <div>
                  <h3 className="text-lg font-medium">
                    {selectedLog.success ? 'Email Sent Successfully' : 'Email Failed'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formatDate(selectedLog.sentAt)}
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                selectedLog.success 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {getEmailTypeDisplay(selectedLog.emailType)}
              </span>
            </div>

            {/* Customer Information */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Customer Information</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FaUser className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      {`${selectedLog.loan.user.userDetails?.firstName || ''} ${selectedLog.loan.user.userDetails?.lastName || ''}`.trim() || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaEnvelope className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{selectedLog.loan.user.email}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Loan Information</h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Loan ID: </span>
                    <span className="text-sm">{selectedLog.loan.formattedLoanId}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Recipient: </span>
                    <span className="text-sm">{selectedLog.recipient || selectedLog.loan.user.email}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Details */}
            {!selectedLog.success && selectedLog.error && (
              <div>
                <h4 className="text-sm font-medium text-red-700 mb-2">Error Details</h4>
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800 font-mono">{selectedLog.error}</p>
                </div>
              </div>
            )}

            {/* Technical Details */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Technical Information</h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-medium">Email Log ID: </span>
                  <span className="font-mono">{selectedLog.id}</span>
                </div>
                <div>
                  <span className="font-medium">Loan ID: </span>
                  <span className="font-mono">{selectedLog.loanId}</span>
                </div>
                <div>
                  <span className="font-medium">Sent At: </span>
                  <span>{formatDate(selectedLog.sentAt)}</span>
                </div>
                <div>
                  <span className="font-medium">Created At: </span>
                  <span>{formatDate(selectedLog.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button onClick={() => setShowDetails(false)} variant="outline">
              Close
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}

export default EmailReminderLogs;
