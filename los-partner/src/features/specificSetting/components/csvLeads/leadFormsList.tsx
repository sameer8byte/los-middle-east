import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  HiEye,
  HiTrash,
  HiArrowPathRoundedSquare,
  HiArrowDownTray,
  HiMagnifyingGlass,
} from "react-icons/hi2";
import { toast } from "react-toastify";
import { Button } from "../../../../common/ui/button";
import { Badge } from "../../../../common/ui/badge";
import {
  Pagination as TablePagination,
  Table,
} from "../../../../common/ui/table";
import { Spinner } from "../../../../common/ui/spinner";
import {
  getLeadForms,
  getLeadFormsStats,
  getLeadFormById,
  syncLeadForms,
  deleteLeadForm,
  type LeadForm,
  type LeadFormsStats,
} from "../../../../shared/services/api/leads/leads.api";
import { Pagination } from "../../../../shared/types/pagination";
import Dialog from "../../../../common/dialog";

interface LeadFormsListProps {
  readonly refreshTrigger?: number;
}

export function LeadFormsList({ refreshTrigger }: LeadFormsListProps) {
  const { brandId } = useParams();
  const [leadForms, setLeadForms] = useState<LeadForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState<LeadFormsStats | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadForm | null>(null);
  const [detailedLead, setDetailedLead] = useState<LeadForm | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Initialize pagination from localStorage to prevent double render
  const [pagination, setPagination] = useState<Pagination>(() => {
    const savedLimit = localStorage.getItem("lead-forms-table-paginationPageSize");
    const savedPage = localStorage.getItem("lead-forms-table-paginationPage");
    return {
      page: savedPage ? Number(savedPage) : 1,
      limit: savedLimit ? Number(savedLimit) : 10,
      dateFilter: "",
    };
  });
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [exportingMatched, setExportingMatched] = useState(false);
  const [exportingUnmatched, setExportingUnmatched] = useState(false);

  // Refs to store current values for stable callbacks
  const paginationRef = useRef(pagination);
  const searchQueryRef = useRef(searchQuery);

  const handlePageChange = useCallback((newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  }, []);

  const handleLimitChange = useCallback((newLimit: number) => {
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
  }, []);

  const handleViewDetails = async (leadForm: LeadForm) => {
    setSelectedLead(leadForm);
    setShowDetailModal(true);
    setLoadingDetails(true);

    try {
      // Fetch detailed information for this lead
      const detailedInfo = await getLeadFormById(brandId!, leadForm.id);
      setDetailedLead(detailedInfo);
    } catch (error) {
      console.error("Error fetching lead details:", error);
      toast.error("Failed to fetch detailed lead information");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedLead(null);
    setDetailedLead(null);
    setLoadingDetails(false);
  };
  const fetchLeadForms = useCallback(
    async (
      page = pagination.page,
      limit = pagination.limit,
      search = searchQuery
    ) => {
      try {
        setLoading(true);
        const response = await getLeadForms(brandId!, { page, limit, search });

        setLeadForms(response.data);
        setTotalCount(response.total);

        // Only update pagination if values actually changed to prevent unnecessary re-renders
        setPagination((prev) => {
          const newPagination = {
            ...prev,
            page: response.page,
            limit: response.limit,
          };

          // Check if pagination actually changed
          if (
            prev.page === newPagination.page &&
            prev.limit === newPagination.limit
          ) {
            return prev; // Return same reference to prevent re-render
          }

          return newPagination;
        });
      } catch (error) {
        console.error("Error fetching lead forms:", error);
        toast.error("Failed to fetch lead forms");
      } finally {
        setLoading(false);
      }
    },
    [brandId, pagination, refreshTrigger]
  );

  const fetchStats = async () => {
    try {
      const data = await getLeadFormsStats(brandId!);
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const result = await syncLeadForms(brandId!);

      toast.success(`Sync completed! Processed ${result.processed} records`);

      // Refresh data after sync
      await Promise.all([fetchLeadForms(), fetchStats()]);
    } catch (error) {
      console.error("Error syncing:", error);
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lead form?")) {
      return;
    }

    try {
      await deleteLeadForm(brandId!, id);
      toast.success("Lead form deleted successfully");
      await Promise.all([fetchLeadForms(), fetchStats()]);
    } catch (error) {
      console.error("Error deleting lead form:", error);
      toast.error("Failed to delete lead form");
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const exportToCSV = (data: LeadForm[], filename: string) => {
    if (data.length === 0) {
      toast.warning("No data to export");
      return;
    }

    const headers = [
      "Lead ID",
      "Full Name",
      "Email",
      "Phone",
      "City",
      "Street Address",
      "Platform",
      "Is Organic",
      "Status",
      "PAN Number",
      "Monthly Salary",
      "Salaried Employee",
      "Campaign ID",
      "Campaign Name",
      "Ad ID",
      "Ad Name",
      "Form ID",
      "Form Name",
      "Created At",
      "Processed At",
      "Error Message",
      "Lead Matches Count",
    ];
    const csvData = data.map((lead) => [
      lead.id,
      lead.fullName || "",
      lead.email || "",
      lead.phone || "",
      lead.city || "",
      lead.streetAddress || "",
      lead.platform || "",
      lead.isOrganic ? "Yes" : "No",
      lead.status || "",
      (lead as any).enter_your_pan_no ||
        (lead as any).enterYourPanNo ||
        (lead as any).panNumber ||
        "",
      (lead as any).what_is_your_monthly_salary ||
        (lead as any).whatIsYourMonthlySalary ||
        (lead as any).monthlySalary ||
        "",
      (lead as any).are_you_a_salaried_employee ||
        (lead as any).areYouASalariedEmployee ||
        (lead as any).isSalariedEmployee ||
        "",
      (lead as any).campaign_id || (lead as any).campaignId || "",
      (lead as any).campaign_name || (lead as any).campaignName || "",
      (lead as any).ad_id || (lead as any).adId || "",
      (lead as any).ad_name || (lead as any).adName || "",
      (lead as any).form_id || (lead as any).formId || "",
      (lead as any).form_name || (lead as any).formName || "",
      new Date(lead.createdAt).toLocaleString(),
      (lead as any).processedAt
        ? new Date((lead as any).processedAt).toLocaleString()
        : "",
      (lead as any).errorMessage || "",
      (() => {
        // Check if lead_matches exists, otherwise calculate from relationship arrays
        let leadMatches = (lead as any).lead_matches;
        if (leadMatches === undefined) {
          const userMatchesCount = (lead as any).userMatches?.length || 0;
          const documentMatchesCount =
            (lead as any).documentMatches?.length || 0;
          leadMatches = userMatchesCount + documentMatchesCount;
        } else {
          // Convert to number if it's a string (from database)
          leadMatches = parseInt(leadMatches) || 0;
        }
        return leadMatches.toString();
      })(),
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) =>
        row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleExportMatched = async () => {
    try {
      setExportingMatched(true);
      // Fetch all processed leads with matches
      const response = await getLeadForms(brandId!, {
        page: 1,
        limit: 1000, // Get a large number
        status: "PROCESSED",
      });

      const matchedLeads = response.data.filter((lead: LeadForm) => {
        // Check if lead_matches exists, otherwise calculate from relationship arrays
        let leadMatches = (lead as any).lead_matches;

        if (leadMatches === undefined) {
          // Fallback: calculate from userMatches and documentMatches arrays
          const userMatchesCount = (lead as any).userMatches?.length || 0;
          const documentMatchesCount =
            (lead as any).documentMatches?.length || 0;
          leadMatches = userMatchesCount + documentMatchesCount;
        } else {
          // Convert to number if it's a string (from database)
          leadMatches = parseInt(leadMatches) || 0;
        }

        return leadMatches > 0;
      });

      exportToCSV(
        matchedLeads,
        `matched-leads-${new Date().toISOString().split("T")[0]}.csv`
      );
      toast.success(`Exported ${matchedLeads.length} matched leads`);
    } catch (error) {
      console.error("Error exporting matched leads:", error);
      toast.error("Failed to export matched leads");
    } finally {
      setExportingMatched(false);
    }
  };

  const handleExportUnmatched = async () => {
    try {
      setExportingUnmatched(true);
      // Fetch all processed leads without matches
      const response = await getLeadForms(brandId!, {
        page: 1,
        limit: 1000, // Get a large number
        status: "PROCESSED",
      });

      const unmatchedLeads = response.data.filter((lead: LeadForm) => {
        // Check if lead_matches exists, otherwise calculate from relationship arrays
        let leadMatches = (lead as any).lead_matches;

        if (leadMatches === undefined) {
          // Fallback: calculate from userMatches and documentMatches arrays
          const userMatchesCount = (lead as any).userMatches?.length || 0;
          const documentMatchesCount =
            (lead as any).documentMatches?.length || 0;
          leadMatches = userMatchesCount + documentMatchesCount;
        } else {
          // Convert to number if it's a string (from database)
          leadMatches = parseInt(leadMatches) || 0;
        }

        return leadMatches === 0;
      });

      exportToCSV(
        unmatchedLeads,
        `unmatched-leads-${new Date().toISOString().split("T")[0]}.csv`
      );
      toast.success(`Exported ${unmatchedLeads.length} unmatched leads`);
    } catch (error) {
      console.error("Error exporting unmatched leads:", error);
      toast.error("Failed to export unmatched leads");
    } finally {
      setExportingUnmatched(false);
    }
  };

  // Memoized calculations
  const totalPages = useMemo(() => {
    return Math.ceil(totalCount / pagination.limit);
  }, [totalCount, pagination.limit]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case "processed":
        return "success";
      case "failed":
        return "danger";
      case "duplicate":
        return "warning";
      case "pending":
        return "primary";
      default:
        return "primary";
    }
  };

  // Cell render functions
  const renderNameCell = (row: LeadForm) => (
    <div>
      <div className="font-medium">{row.fullName}</div>
      <div className="text-xs text-[var(--color-on-surface)] opacity-70">
        {row.email}
      </div>
    </div>
  );

  const renderPlatformCell = (row: LeadForm) => (
    <div className="flex items-center gap-2">
      <span>{row.platform}</span>
      {row.isOrganic && (
        <Badge variant="outline" className="text-xs">
          Organic
        </Badge>
      )}
    </div>
  );

  const renderStatusCell = (row: LeadForm) => (
    <Badge variant={getStatusBadgeVariant(row.status)}>
      {row.status?.toUpperCase() || "UNKNOWN"}
    </Badge>
  );

  const renderDateCell = (row: LeadForm) => (
    <span className="text-sm">
      {new Date(row.createdAt).toLocaleDateString()}
    </span>
  );

  const renderActionsCell = (row: LeadForm) => (
    <div className="flex items-center gap-2">
      <Button
        variant="surface"
        size="sm"
        onClick={() => handleViewDetails(row)}
      >
        <HiEye className="w-4 h-4" />
      </Button>
      <button
        onClick={() => handleDelete(row.id)}
        className="text-[var(--color-error)] hover:text-[var(--color-error-dark)] p-1 rounded"
      >
        <HiTrash className="w-4 h-4" />
      </button>
    </div>
  );

  const renderMatchingCell = (row: LeadForm) => {
    // Check if lead_matches exists, otherwise calculate from relationship arrays
    let leadMatches = (row as any).lead_matches;

    if (leadMatches === undefined) {
      // Fallback: calculate from userMatches and documentMatches arrays
      const userMatchesCount = (row as any).userMatches?.length || 0;
      const documentMatchesCount = (row as any).documentMatches?.length || 0;
      leadMatches = userMatchesCount + documentMatchesCount;
    } else {
      // Convert to number if it's a string (from database)
      leadMatches = parseInt(leadMatches) || 0;
    }

    const hasMatches = leadMatches > 0;

    if (hasMatches) {
      return (
        <div className="flex items-center gap-2">
          <Badge variant="success" className="text-xs">
            Matched ({leadMatches})
          </Badge>
        </div>
      );
    } else if (row.status === "PROCESSED") {
      return (
        <Badge variant="outline" className="text-xs">
          No Matches
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="text-xs">
          Not Processed
        </Badge>
      );
    }
  };

  // Update refs when state changes
  useEffect(() => {
    paginationRef.current = pagination;
  }, [pagination]);

  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (brandId) fetchLeadForms();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [fetchLeadForms, brandId]);

  useEffect(() => {
    if (brandId) {
      Promise.all([fetchLeadForms(), fetchStats()]);
    }
  }, [brandId, refreshTrigger]);

  const columns = [
    {
      key: "fullName",
      label: "Name",
      render: (_value: unknown, row: LeadForm) => renderNameCell(row),
    },
    {
      key: "phone",
      label: "Phone",
    },
    {
      key: "city",
      label: "City",
    },
    {
      key: "platform",
      label: "Platform",
      render: (_value: unknown, row: LeadForm) => renderPlatformCell(row),
    },
    {
      key: "status",
      label: "Status",
      render: (_value: unknown, row: LeadForm) => renderStatusCell(row),
    },
    {
      key: "matching",
      label: "Matching",
      render: (_value: unknown, row: LeadForm) => renderMatchingCell(row),
    },
    {
      key: "createdAt",
      label: "Date",
      render: (_value: unknown, row: LeadForm) => renderDateCell(row),
    },
    {
      key: "id",
      label: "Actions",
      render: (_value: unknown, row: LeadForm) => renderActionsCell(row),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner theme="light" />
        <span className="ml-2">Loading lead forms...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] space-y-6 px-4 py-6">
      {/* Stats Section */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg p-4 border border-[var(--color-muted)] border-opacity-30">
            <div className="text-2xl font-bold text-[var(--color-on-background)]">
              {stats.total}
            </div>
            <div className="text-sm text-[var(--color-on-surface)] opacity-70">
              Total Records
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-[var(--color-muted)] border-opacity-30">
            <div className="text-2xl font-bold text-[var(--color-info)]">
              {stats.pending}
            </div>
            <div className="text-sm text-[var(--color-on-surface)] opacity-70">
              Pending
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-[var(--color-muted)] border-opacity-30">
            <div className="text-2xl font-bold text-[var(--color-success)]">
              {stats.processed}
            </div>
            <div className="text-sm text-[var(--color-on-surface)] opacity-70">
              Processed
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-[var(--color-muted)] border-opacity-30">
            <div className="text-2xl font-bold text-[var(--color-error)]">
              {stats.failed}
            </div>
            <div className="text-sm text-[var(--color-on-surface)] opacity-70">
              Failed
            </div>
          </div>
          {stats.duplicates !== undefined && stats.duplicates > 0 && (
            <div className="bg-white rounded-lg p-4 border border-[var(--color-muted)] border-opacity-30">
              <div className="text-2xl font-bold text-[var(--color-warning)]">
                {stats.duplicates}
              </div>
              <div className="text-sm text-[var(--color-on-surface)] opacity-70">
                Duplicates
              </div>
            </div>
          )}
        </div>
      )}

      {/* Header & Actions */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-[var(--color-on-background)]">
          Lead Forms ({leadForms.length})
        </h2>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[250px]">
            <HiMagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearch("")}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {/* Export Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleExportMatched}
              disabled={exportingMatched}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
              title="Export leads that have matches"
            >
              {exportingMatched ? (
                <Spinner theme="light" />
              ) : (
                <HiArrowDownTray className="h-3.5 w-3.5" />
              )}
              Export Matched
            </button>

            <button
              onClick={handleExportUnmatched}
              disabled={exportingUnmatched}
              className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
              title="Export leads that have no matches"
            >
              {exportingUnmatched ? (
                <Spinner theme="light" />
              ) : (
                <HiArrowDownTray className="h-3.5 w-3.5" />
              )}
              Export Unmatched
            </button>
          </div>

          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center px-3 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? (
              <>
                <Spinner theme="light" />
                <span className="ml-2">Syncing...</span>
              </>
            ) : (
              <>
                <HiArrowPathRoundedSquare className="w-4 h-4 mr-2" />
                Sync Database
              </>
            )}
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="flex flex-1 min-h-0 bg-white rounded-md border border-[var(--color-muted)] border-opacity-30 overflow-hidden">
        <div className="flex-1 overflow-auto">
          <Table
            data={leadForms}
            columns={columns}
            emptyMessage="No lead forms found. Upload a CSV file to get started."
          />
        </div>
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="bg-white border-t border-[var(--color-muted)] border-opacity-30 w-full flex-shrink-0">
          <TablePagination
            currentPage={pagination.page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pagination.limit}
            onPageChange={handlePageChange}
            onPageSizeChange={handleLimitChange}
            storageKey="lead-forms-table-pagination"
          />
        </div>
      )}

      {/* Lead Details Modal */}
      {showDetailModal && selectedLead && (
        <Dialog
          isOpen={showDetailModal}
          onClose={() => handleCloseModal()}
          title="Lead Details"
        >
          <div>
            {loadingDetails ? (
              <div className="flex items-center justify-center py-8">
                <Spinner theme="light" />
                <span className="ml-2">Loading detailed information...</span>
              </div>
            ) : (
              <>
                {/* Use detailedLead if available, otherwise fallback to selectedLead */}
                {(() => {
                  const leadData = detailedLead || selectedLead;
                  return (
                    <>
                      {/* Basic Information */}
                      <div>
                        <h4 className="font-medium text-[var(--color-on-background)] mb-3 text-base">
                          Basic Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                              Lead ID
                            </span>
                            <p className="text-[var(--color-on-background)] font-mono text-sm">
                              {leadData.id}
                            </p>
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                              Brand ID
                            </span>
                            <p className="text-[var(--color-on-background)] font-mono text-sm">
                              {(leadData as any).brandId || "N/A"}
                            </p>
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                              Full Name
                            </span>
                            <p className="text-[var(--color-on-background)]">
                              {leadData.fullName || "N/A"}
                            </p>
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                              Email
                            </span>
                            <p className="text-[var(--color-on-background)]">
                              {leadData.email || "N/A"}
                            </p>
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                              Phone
                            </span>
                            <p className="text-[var(--color-on-background)]">
                              {leadData.phone || "N/A"}
                            </p>
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                              City
                            </span>
                            <p className="text-[var(--color-on-background)]">
                              {leadData.city || "N/A"}
                            </p>
                          </div>
                          {leadData.streetAddress && (
                            <div className="md:col-span-2">
                              <span className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                                Street Address
                              </span>
                              <p className="text-[var(--color-on-background)]">
                                {leadData.streetAddress}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Platform & Status Information */}
                      <div className="border-t border-[var(--color-muted)] border-opacity-30 pt-4">
                        <h4 className="font-medium text-[var(--color-on-background)] mb-3 text-base">
                          Platform & Status
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <span className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                              Platform
                            </span>
                            <p className="text-[var(--color-on-background)]">
                              {leadData.platform || "N/A"}
                            </p>
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                              Is Organic
                            </span>
                            <div className="flex items-center gap-2">
                              <p className="text-[var(--color-on-background)]">
                                {leadData.isOrganic ? "Yes" : "No"}
                              </p>
                              {leadData.isOrganic && (
                                <Badge variant="outline" className="text-xs">
                                  Organic
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                              Status
                            </span>
                            <Badge
                              variant={getStatusBadgeVariant(leadData.status)}
                            >
                              {leadData.status?.toUpperCase() || "UNKNOWN"}
                            </Badge>
                          </div>
                          {(leadData as any).errorMessage && (
                            <div className="md:col-span-3">
                              <span className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                                Error Message
                              </span>
                              <p className="text-[var(--color-error)] text-sm bg-red-50 p-2 rounded">
                                {(leadData as any).errorMessage}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Campaign Details */}
                      <div className="border-t border-[var(--color-muted)] border-opacity-30 pt-4">
                        <h4 className="font-medium text-[var(--color-on-background)] mb-3 text-base">
                          Campaign Details
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                              Ad ID
                            </span>
                            <p className="text-[var(--color-on-background)] font-mono text-sm">
                              {(leadData as any).ad_id ||
                                leadData.adId ||
                                "N/A"}
                            </p>
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                              Ad Name
                            </span>
                            <p className="text-[var(--color-on-background)]">
                              {(leadData as any).ad_name ||
                                leadData.adName ||
                                "N/A"}
                            </p>
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                              Adset ID
                            </span>
                            <p className="text-[var(--color-on-background)] font-mono text-sm">
                              {(leadData as any).adset_id ||
                                leadData.adsetId ||
                                "N/A"}
                            </p>
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                              Adset Name
                            </span>
                            <p className="text-[var(--color-on-background)]">
                              {(leadData as any).adset_name ||
                                leadData.adsetName ||
                                "N/A"}
                            </p>
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                              Campaign ID
                            </span>
                            <p className="text-[var(--color-on-background)] font-mono text-sm">
                              {(leadData as any).campaign_id ||
                                leadData.campaignId ||
                                "N/A"}
                            </p>
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                              Campaign Name
                            </span>
                            <p className="text-[var(--color-on-background)]">
                              {(leadData as any).campaign_name ||
                                leadData.campaignName ||
                                "N/A"}
                            </p>
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                              Form ID
                            </span>
                            <p className="text-[var(--color-on-background)] font-mono text-sm">
                              {(leadData as any).form_id ||
                                leadData.formId ||
                                "N/A"}
                            </p>
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                              Form Name
                            </span>
                            <p className="text-[var(--color-on-background)]">
                              {(leadData as any).form_name ||
                                leadData.formName ||
                                "N/A"}
                            </p>
                          </div>
                          {((leadData as any).createdTime ||
                            (leadData as any).created_time) && (
                            <div className="md:col-span-2">
                              <span className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                                Original Created Time (from source)
                              </span>
                              <p className="text-[var(--color-on-background)]">
                                {new Date(
                                  (leadData as any).createdTime ||
                                    (leadData as any).created_time
                                ).toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Additional Information */}
                      <div className="border-t border-[var(--color-muted)] border-opacity-30 pt-4">
                        <h4 className="font-medium text-[var(--color-on-background)] mb-3 text-base">
                          Lead Form Responses
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                              Are you a salaried employee?
                            </span>
                            <p className="text-[var(--color-on-background)]">
                              {(() => {
                                const employeeResponse =
                                  (leadData as any)
                                    .are_you_a_salaried_employee ||
                                  (leadData as any).areYouASalariedEmployee;
                                if (employeeResponse) return employeeResponse;
                                if (leadData.isSalariedEmployee !== undefined) {
                                  return leadData.isSalariedEmployee
                                    ? "Yes"
                                    : "No";
                                }
                                return "N/A";
                              })()}
                            </p>
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                              What is your monthly salary?
                            </span>
                            <p className="text-[var(--color-on-background)]">
                              {(leadData as any).what_is_your_monthly_salary ||
                                (leadData as any).whatIsYourMonthlySalary ||
                                leadData.monthlySalary ||
                                "N/A"}
                            </p>
                          </div>
                          <div className="md:col-span-2">
                            <span className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                              Enter your PAN No.
                            </span>
                            <p className="text-[var(--color-on-background)] font-mono">
                              {(leadData as any).enter_your_pan_no ||
                                (leadData as any).enterYourPanNo ||
                                leadData.panNumber ||
                                "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* System Information */}
                      <div className="border-t border-[var(--color-muted)] border-opacity-30 pt-4">
                        <h4 className="font-medium text-[var(--color-on-background)] mb-3 text-base">
                          System Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                              Uploaded At
                            </span>
                            <p className="text-[var(--color-on-background)]">
                              {(leadData as any).uploadedAt
                                ? new Date(
                                    (leadData as any).uploadedAt
                                  ).toLocaleString()
                                : "N/A"}
                            </p>
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                              Processed At
                            </span>
                            <p className="text-[var(--color-on-background)]">
                              {(leadData as any).processedAt
                                ? new Date(
                                    (leadData as any).processedAt
                                  ).toLocaleString()
                                : "Not processed yet"}
                            </p>
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                              Created At
                            </span>
                            <p className="text-[var(--color-on-background)]">
                              {new Date(leadData.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                              Updated At
                            </span>
                            <p className="text-[var(--color-on-background)]">
                              {(leadData as any).updatedAt
                                ? new Date(
                                    (leadData as any).updatedAt
                                  ).toLocaleString()
                                : new Date(leadData.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Relationship Matches */}
                      {((leadData as any).userMatches?.length > 0 ||
                        (leadData as any).documentMatches?.length > 0) && (
                        <div className="border-t border-[var(--color-muted)] border-opacity-30 pt-4">
                          <h4 className="font-medium text-[var(--color-on-background)] mb-3 text-base">
                            Relationship Matches
                          </h4>

                          {/* Combined Matches Display */}
                          {(() => {
                            const allMatches = [
                              ...((leadData as any).userMatches || []).map(
                                (match: any) => ({
                                  ...match,
                                  entityType: "USER",
                                })
                              ),
                              ...((leadData as any).documentMatches || []).map(
                                (match: any) => ({
                                  ...match,
                                  entityType: "DOCUMENT",
                                })
                              ),
                            ].sort(
                              (a, b) =>
                                (b.confidence || 0) - (a.confidence || 0)
                            );

                            return (
                              allMatches.length > 0 && (
                                <div>
                                  <h5 className="font-medium text-[var(--color-on-surface)] mb-2 text-sm">
                                    All Matches ({allMatches.length})
                                  </h5>
                                  <div className="space-y-2">
                                    {allMatches.map(
                                      (match: any, index: number) => {
                                        const getMatchVariant = (
                                          type: string
                                        ) => {
                                          switch (type) {
                                            case "EXACT":
                                              return "success";
                                            case "FUZZY":
                                              return "warning";
                                            default:
                                              return "primary";
                                          }
                                        };

                                        return (
                                          <div
                                            key={match.id || index}
                                            className="bg-gray-50 p-3 rounded-lg border"
                                          >
                                            <div className="flex items-center justify-between mb-2">
                                              <div className="flex items-center gap-2">
                                                <Badge
                                                  variant={getMatchVariant(
                                                    match.matchType
                                                  )}
                                                  className="text-xs"
                                                >
                                                  {match.matchType}
                                                </Badge>
                                                <Badge
                                                  variant="outline"
                                                  className="text-xs"
                                                >
                                                  {match.matchField}
                                                </Badge>
                                                <Badge
                                                  variant={
                                                    match.entityType === "USER"
                                                      ? "primary"
                                                      : "secondary"
                                                  }
                                                  className="text-xs"
                                                >
                                                  {match.entityType}
                                                </Badge>
                                                {match.confidence && (
                                                  <span className="text-xs text-[var(--color-on-surface)] opacity-70">
                                                    {Math.round(
                                                      match.confidence * 100
                                                    )}
                                                    % confidence
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                              <div>
                                                <span className="font-medium text-[var(--color-on-surface)]">
                                                  {match.entityType === "USER"
                                                    ? "User:"
                                                    : "Document Owner:"}
                                                </span>
                                                <p className="text-[var(--color-on-background)]">
                                                  {match.firstName}{" "}
                                                  {match.lastName} (
                                                  {match.userEmail})
                                                </p>
                                                <p className="text-[var(--color-on-surface)] opacity-70">
                                                  Phone: {match.userPhone}
                                                </p>
                                                {match.entityType ===
                                                  "DOCUMENT" && (
                                                  <p className="text-[var(--color-on-surface)] opacity-70">
                                                    Type: {match.documentType}
                                                  </p>
                                                )}
                                              </div>
                                              <div>
                                                <span className="font-medium text-[var(--color-on-surface)]">
                                                  {match.entityType ===
                                                  "DOCUMENT"
                                                    ? "Document:"
                                                    : "Matched Value:"}
                                                </span>
                                                <p className="text-[var(--color-on-background)] font-mono">
                                                  {match.entityType ===
                                                  "DOCUMENT"
                                                    ? match.documentNumber
                                                    : match.matchValue}
                                                </p>
                                                {match.entityType ===
                                                  "DOCUMENT" &&
                                                  match.matchValue && (
                                                    <p className="text-[var(--color-on-surface)]">
                                                      Matched:{" "}
                                                      {match.matchValue}
                                                    </p>
                                                  )}
                                                <p className="text-xs text-[var(--color-on-surface)] opacity-70">
                                                  {new Date(
                                                    match.createdAt
                                                  ).toLocaleString()}
                                                </p>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      }
                                    )}
                                  </div>
                                </div>
                              )
                            );
                          })()}
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}
          </div>
          <div className="flex justify-end p-6 border-t border-[var(--color-muted)] border-opacity-30">
            <Button onClick={handleCloseModal} variant="outline">
              Close
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
