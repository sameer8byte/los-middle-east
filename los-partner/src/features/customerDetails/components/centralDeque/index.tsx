import React, { useEffect, useState, useMemo } from "react";
import { getCustomerDocuments } from "../../../../shared/services/api/customer.api";
import { useParams } from "react-router-dom";
import { Button } from "../../../../common/ui/button";
import { CustomerDetailsBefore1MarchComponent } from "./sfs";

const REQUEST_TIMEOUT = 8000;
const CACHE_DURATION = 5 * 60 * 1000;

interface CacheEntry {
  data: any[];
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry>();

// Helper function to normalize status words
const normalizeStatus = (status: string): string => {
  if (!status) return "";
  
  const lowerStatus = status.toLowerCase().trim();
  
  const normalizations: Record<string, string> = {
    'activated': 'active',
    'activating': 'active',
    'activates': 'active',
    'rejected': 'reject',
    'rejecting': 'reject',
    'rejects': 'reject',
    'rejection': 'reject',
    'pending': 'pending',
    'approved': 'approve',
    'approving': 'approve',
    'approves': 'approve',
    'approval': 'approve',
    'cancelled': 'cancel',
    'canceling': 'cancel',
    'cancels': 'cancel',
    'cancellation': 'cancel',
    'completed': 'complete',
    'completing': 'complete',
    'completes': 'complete',
    'completion': 'complete',
    'qualified': 'qualify',
    'qualifying': 'qualify',
    'qualifies': 'qualify',
    'qualification': 'qualify',
    'processed': 'process',
    'processing': 'process',
    'processes': 'process',
    'verified': 'verify',
    'verifying': 'verify',
    'verifies': 'verify',
    'verification': 'verify',
    'disbursed': 'disbursed',
    'disbursing': 'disbursed',
    'overdue': 'overdue',
    'closed': 'closed',
    'closing': 'closed',
  };
  
  if (normalizations[lowerStatus]) {
    return normalizations[lowerStatus];
  }
  
  let normalized = lowerStatus
    .replace(/(ed|ing|s|ion)$/, '')
    .trim();
  
  normalized = normalized.replace(/([bcdfghjklmnpqrstvwxyz])\1$/, '$1');
  
  return normalized || lowerStatus;
};

const getDisplayStatus = (status: string): string => {
  if (!status) return "Unknown";
  
  return status
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Format date properly (remove timestamp, show DD/MM/YYYY)
const formatDateDisplay = (dateString: string): string => {
  if (!dateString) return "N/A";
  
  try {
    // Handle both date formats: "YYYY-MM-DD HH:MM:SS" and "YYYY-MM-DD"
    const datePart = dateString.split(' ')[0]; // Get only date part
    const [year, month, day] = datePart.split('-');
    
    if (!year || !month || !day) return dateString;
    
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  } catch (error) {
    return dateString;
  }
};

const fetchWithTimeout = async (
  endpoint: { url: string; source: string },
  pan: string,
  timeout: number
) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pancard: pan }),
      signal: controller.signal,
    });
    const data = await response.json();
    return { source: endpoint.source, data, error: null };
  } catch (error) {
    return { source: endpoint.source, data: null, error };
  } finally {
    clearTimeout(timeoutId);
  }
};

// Updated SkeletonRow with 12 columns (removed final disbursed)
const SkeletonRow = ({ tdStyle }: { tdStyle: React.CSSProperties }) => (
  <tr style={{ backgroundColor: "var(--color-surface)", opacity: 0.7 }}>
    {new Array(12).fill(null).map((_, i) => (
      <td key={`skeleton-cell-${i}`} style={tdStyle}>
        <div
          style={{
            height: "16px",
            backgroundColor: "var(--color-muted)",
            borderRadius: "var(--radius-brand)",
            animation: "shimmer 1.5s infinite",
            background:
              "linear-gradient(90deg, var(--color-muted) 0%, var(--color-surface) 50%, var(--color-muted) 100%)",
            backgroundSize: "200% 100%",
          }}
        />
      </td>
    ))}
  </tr>
);

// Status Filter Component
const StatusFilter = ({
  statusFilters,
  selectedFilters,
  onFilterChange,
}: {
  statusFilters: Array<{ normalized: string; display: string; count: number }>;
  selectedFilters: string[];
  onFilterChange: (filters: string[]) => void;
}) => {
  const handleFilterToggle = (normalizedStatus: string) => {
    if (selectedFilters.includes(normalizedStatus)) {
      onFilterChange(selectedFilters.filter(s => s !== normalizedStatus));
    } else {
      onFilterChange([...selectedFilters, normalizedStatus]);
    }
  };

  const handleSelectAll = () => {
    if (selectedFilters.length === statusFilters.length) {
      onFilterChange([]);
    } else {
      onFilterChange(statusFilters.map(s => s.normalized));
    }
  };

  const handleClearAll = () => {
    onFilterChange([]);
  };

  if (statusFilters.length === 0) return null;

  const isAllSelected = selectedFilters.length === statusFilters.length;
  const isAnySelected = selectedFilters.length > 0;

  return (
    <div style={filterContainerStyle}>
      <div style={filterHeaderStyle}>
        <div style={filterTitleWrapperStyle}>
          <span style={filterIconStyle}>🔍</span>
          <span style={filterTitleStyle}>Status Filters</span>
          {isAnySelected && (
            <span style={activeFiltersBadgeStyle}>
              {selectedFilters.length} active
            </span>
          )}
        </div>
        <div style={filterActionsStyle}>
          <button
            onClick={handleSelectAll}
            style={{
              ...filterActionButtonStyle,
              backgroundColor: isAllSelected 
                ? "var(--color-primary)" 
                : "var(--color-surface)",
              color: isAllSelected 
                ? "var(--color-on-primary)" 
                : "var(--color-primary)",
              borderColor: isAllSelected 
                ? "var(--color-primary)" 
                : "var(--color-primary-light)",
              borderWidth: "1.5px",
              fontWeight: isAllSelected ? 600 : 500,
            }}
            title={isAllSelected ? "Deselect all filters" : "Select all filters"}
          >
            <span style={{ 
              marginRight: '6px', 
              fontSize: '13px',
              opacity: 0.9
            }}>
              {isAllSelected ? '✓' : '☑️'}
            </span>
            <span style={filterActionButtonTextStyle}>
              {isAllSelected ? 'All Selected' : 'Select All'}
            </span>
          </button>
          
          <button
            onClick={handleClearAll}
            style={{
              ...filterActionButtonStyle,
              backgroundColor: isAnySelected 
                ? "var(--color-error-light)" 
                : "var(--color-surface)",
              color: isAnySelected 
                ? "var(--color-error)" 
                : "var(--color-muted)",
              borderColor: isAnySelected 
                ? "var(--color-error)" 
                : "var(--color-muted)",
              borderWidth: "1.5px",
              cursor: isAnySelected ? 'pointer' : 'not-allowed',
              opacity: isAnySelected ? 1 : 0.6,
              fontWeight: 500,
            }}
            disabled={!isAnySelected}
            title={isAnySelected ? "Clear all filters" : "No filters to clear"}
          >
            <span style={{ 
              marginRight: '6px', 
              fontSize: '13px',
              opacity: 0.9
            }}>
              ✕
            </span>
            <span style={filterActionButtonTextStyle}>
              Clear All
            </span>
          </button>
        </div>
      </div>
      <div style={filterGridStyle}>
        {statusFilters.map(({ normalized, display, count }) => {
          const isSelected = selectedFilters.includes(normalized);
          return (
            <button
              key={normalized}
              style={{
                ...filterItemStyle,
                backgroundColor: isSelected
                  ? "var(--color-primary-light)"
                  : "var(--color-surface)",
                color: isSelected
                  ? "var(--color-primary)"
                  : "var(--color-on-surface)",
                borderColor: isSelected
                  ? "var(--color-primary)"
                  : "var(--color-muted)",
                borderWidth: isSelected ? "2px" : "1px",
                transform: isSelected ? "translateY(-1px)" : "none",
                boxShadow: isSelected 
                  ? "0 2px 6px rgba(var(--color-primary-rgb, 0, 100, 200), 0.2)" 
                  : "none",
              }}
              onClick={() => handleFilterToggle(normalized)}
              title={`Click to ${isSelected ? 'remove' : 'apply'} "${display}" filter`}
            >
              <span style={filterItemTextStyle}>
                {display}
              </span>
              <span style={{
                ...filterCountStyle,
                backgroundColor: isSelected
                  ? "var(--color-primary)"
                  : "var(--color-muted)",
                color: isSelected
                  ? "var(--color-on-primary)"
                  : "var(--color-on-muted)",
                fontWeight: isSelected ? 600 : 500,
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Field Display Component for showing all data in a modal
const LeadDetailsModal = ({ lead, onClose }: { lead: any, onClose: () => void }) => {
  const formatCurrency = (amount: number) => {
    if (!amount) return "₹ 0";
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <h3 style={modalTitleStyle}>Lead Details</h3>
          <button onClick={onClose} style={modalCloseButtonStyle}>✕</button>
        </div>
        
        <div style={modalBodyStyle}>
          <div style={detailsGridStyle}>
            <div style={detailItemStyle}>
              <span style={detailLabelStyle}>Lead ID:</span>
              <span style={detailValueStyle}>{lead.lead_id || "N/A"}</span>
            </div>
            <div style={detailItemStyle}>
              <span style={detailLabelStyle}>Name:</span>
              <span style={detailValueStyle}>{lead.first_name || "N/A"}</span>
            </div>
            <div style={detailItemStyle}>
              <span style={detailLabelStyle}>Mobile:</span>
              <span style={detailValueStyle}>{lead.mobile || "N/A"}</span>
            </div>
            <div style={detailItemStyle}>
              <span style={detailLabelStyle}>PAN:</span>
              <span style={detailValueStyle}>{lead.pancard || "N/A"}</span>
            </div>
            <div style={detailItemStyle}>
              <span style={detailLabelStyle}>Status:</span>
              <span style={getStatusBadgeStyle(lead.status)}>
                {lead.status || "N/A"}
              </span>
            </div>
            <div style={detailItemStyle}>
              <span style={detailLabelStyle}>Source:</span>
              <span style={detailValueStyle}>{lead.source || "N/A"}</span>
            </div>
            <div style={detailItemStyle}>
              <span style={detailLabelStyle}>Reason:</span>
              <span style={detailValueStyle}>{lead.reason || "N/A"}</span>
            </div>
            <div style={detailItemStyle}>
              <span style={detailLabelStyle}>Created On:</span>
              <span style={detailValueStyle}>{formatDateDisplay(lead.created_on)}</span>
            </div>
            <div style={detailItemStyle}>
              <span style={detailLabelStyle}>Disbursal Date:</span>
              <span style={detailValueStyle}>{formatDateDisplay(lead.disbursal_date)}</span>
            </div>
            <div style={detailItemStyle}>
              <span style={detailLabelStyle}>Repayment Date:</span>
              <span style={detailValueStyle}>{formatDateDisplay(lead.repayment_date)}</span>
            </div>
            <div style={detailItemStyle}>
              <span style={detailLabelStyle}>Loan Amount:</span>
              <span style={detailValueStyle}>
                {formatCurrency(lead.loan_recommended)}
              </span>
            </div>
            <div style={detailItemStyle}>
              <span style={detailLabelStyle}>DPD:</span>
              <span style={detailValueStyle}>
                {lead.dpd !== null ? `${lead.dpd}` : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export function CentralDqueueComponent() {
  const [pan, setPan] = useState("");
  const { brandId, customerId } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [fetchingDocs, setFetchingDocs] = useState(false);
  const [selectedStatusFilters, setSelectedStatusFilters] = useState<string[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);

  const isSalary4sureDomain = globalThis.window?.location?.hostname?.includes('salary4sure.com') ?? false;

  const statusFilters = useMemo(() => {
    if (!results || results.length === 0) return [];
    
    const statusCounts: Record<string, { count: number; original: string }> = {};
    
    results.forEach(lead => {
      const originalStatus = lead.status || "Unknown";
      const normalizedStatus = normalizeStatus(originalStatus);
      const displayStatus = getDisplayStatus(originalStatus);
      
      if (!statusCounts[normalizedStatus]) {
        statusCounts[normalizedStatus] = {
          count: 1,
          original: displayStatus,
        };
      } else {
        statusCounts[normalizedStatus].count += 1;
        statusCounts[normalizedStatus].original = displayStatus;
      }
    });
    
    return Object.entries(statusCounts)
      .map(([normalized, { count, original }]) => ({
        normalized,
        display: original,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [results]);

  const filteredResults = useMemo(() => {
    if (selectedStatusFilters.length === 0) return results;
    
    return results.filter(lead => {
      const normalizedStatus = normalizeStatus(lead.status || "Unknown");
      return selectedStatusFilters.includes(normalizedStatus);
    });
  }, [results, selectedStatusFilters]);

  // Fetch customer documents
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        if (!customerId || !brandId) return;
        setFetchingDocs(true);
        setLoading(true);

        const data = await getCustomerDocuments(customerId, brandId);

        const foundPan =
          data.documents.find((doc: any) => doc.type === "PAN")
            ?.documentNumber || "";
        if (foundPan) {
          const upperPan = foundPan.toUpperCase();
          setPan(upperPan);
          await handleSearch(upperPan);
        }
      } catch (error) {
        console.error("Error fetching documents:", error);
      } finally {
        setLoading(false);
        setFetchingDocs(false);
      }
    };

    fetchDocuments();
  }, [customerId, brandId]);

  const handleSearch = async (panValue?: string) => {
    const searchPan = panValue || pan;
    if (!searchPan) return;

    const cacheKey = searchPan.toUpperCase();
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setResults(cached.data);
      setSelectedStatusFilters([]);
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);
    setSelectedStatusFilters([]);

    const crmPath = "/api/v1/TaskApi/getLeadDataFromPancard";
    const legacyCrmPath = "/api/Api/TaskApi/getLeadDataFromPancard";

    const crmEndpoints = [
      // New Client Brands
      {
        url: `https://apilm.qualoan.com${crmPath}`,
        source: "apilm.qualoan.com",
      },
      {
        url: `https://apilm.paisapop.com${crmPath}`,
        source: "apilm.paisapop.com",
      },
      {
        url: `https://apilm.salary4sure.com${crmPath}`,
        source: "apilm.salary4sure.com",
      },
      {
        url: `https://apilm.salarybolt.com${crmPath}`,
        source: "apilm.salarybolt.com",
      },
      {
        url: `https://apilm.fastsalary.com${crmPath}`,
        source: "apilm.fastsalary.com",
      },
      {
        url: `https://apilm.minutesloan.com${crmPath}`,
        source: "apilm.minutesloan.com",
      },
      {
        url: `https://apilm.zeptofinance.com${crmPath}`,
        source: "apilm.zeptofinance.com",
      },
      // Existing CRM Endpoints
      {
        url: `https://crm.fastpaise.com${legacyCrmPath}`,
        source: "crm.fastpaise.com",
      },
      {
        url: `https://crm.duniyafinance.in${legacyCrmPath}`,
        source: "crm.duniyafinance.in",
      },
      {
        url: `https://crm.tejasloan.com${legacyCrmPath}`,
        source: "crm.tejasloan.com",
      },
      {
        url: `https://crm.salary4sure.com${legacyCrmPath}`,
        source: "crm.salary4sure.com",
      },
      {
        url: `https://crm.salarywalle.com${legacyCrmPath}`,
        source: "crm.salarywalle.com",
      },
    ];

    try {
      const promises = crmEndpoints.map((endpoint) =>
        fetchWithTimeout(endpoint, searchPan, REQUEST_TIMEOUT)
      );

      const responses = await Promise.all(promises);

      let allResults: any[] = [];
      let successCount = 0;

      for (const response of responses) {
        const typedResponse = response as any;
        if (typedResponse.data?.lead_data) {
          successCount++;
          const enrichedData = typedResponse.data.lead_data.map(
            (lead: any) => ({
              ...lead,
              source: typedResponse.source,
              normalizedStatus: normalizeStatus(lead.status || "Unknown"),
            })
          );
          allResults = [...allResults, ...enrichedData];
        }
      }

      if (allResults.length > 0) {
        searchCache.set(cacheKey, { data: allResults, timestamp: Date.now() });
        setResults(allResults);
      } else if (successCount === 0) {
        setError("All CRM sources timed out or are unavailable");
      } else {
        setError("No data found in any CRM source");
      }
    } catch (error) {
      console.error("Search error:", error);
      setError("Search failed. Please try again.");
    }
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    if (!amount) return "₹ 0";
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div style={containerStyle}>
      {/* Show CustomerDetailsBefore1MarchComponent only for salary4sure domain */}
      {isSalary4sureDomain && <CustomerDetailsBefore1MarchComponent />}
      
      <style>{`
      @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
      }
      `}</style>

      {/* Search Input Section */}
      {!(loading || fetchingDocs) && (
        <div style={searchContainerStyle}>
          <div style={inputWrapperStyle}>
            <input
              type="text"
              value={pan}
              onChange={(e) => setPan(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading && !fetchingDocs && pan) {
                  handleSearch();
                }
              }}
              placeholder="Enter PAN card (e.g. ABCDE1234F)"
              style={inputStyle}
            />
            <span style={inputIconStyle}>🎫</span>
          </div>
          <Button
            onClick={() => handleSearch()}
            disabled={loading || fetchingDocs || !pan}
          >
            {loading || fetchingDocs ? "Searching..." : "🔎 Search"}
          </Button>
        </div>
      )}

      {/* Status Filter Section */}
      {results.length > 0 && !loading && !fetchingDocs && (
        <StatusFilter
          statusFilters={statusFilters}
          selectedFilters={selectedStatusFilters}
          onFilterChange={setSelectedStatusFilters}
        />
      )}

      {/* Skeleton Loader */}
      {(loading || fetchingDocs) && (
        <div style={skeletonContainerStyle}>
          <table style={tableStyle}>
            <tbody>
              {new Array(2).fill(null).map((_, i) => (
                <tr key={`skeleton-row-${i}`} style={skeletonRowStyle}>
                  {new Array(11).fill(null).map((_, j) => (
                    <td key={`skeleton-cell-${i}-${j}`} style={tdStyle}>
                      <div
                        style={{
                          height: "16px",
                          backgroundColor: "var(--color-muted)",
                          borderRadius: "var(--radius-brand)",
                          animation: "shimmer 1.5s infinite",
                          background:
                            "linear-gradient(90deg, var(--color-muted) 0%, var(--color-surface) 50%, var(--color-muted) 100%)",
                          backgroundSize: "200% 100%",
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Error Message */}
      {error && <div style={errorStyle}>{error}</div>}

      {/* Results Table - Updated with 11 columns (removed final disbursed) */}
      {(filteredResults.length > 0 || loading) && (
        <div style={tableContainerStyle}>
          <div style={tableHeaderInfoStyle}>
            <span style={resultCountStyle}>
              {getResultCountText(filteredResults.length, selectedStatusFilters.length > 0)}
              {selectedStatusFilters.length > 0 && (
                <span style={{ marginLeft: '8px', fontSize: '12px', opacity: 0.8 }}>
                  ({selectedStatusFilters.length} filter{selectedStatusFilters.length !== 1 ? 's' : ''} applied)
                </span>
              )}
            </span>
          </div>
          <div style={tableWrapperStyle}>
            <table style={tableStyle}>
              <thead>
                <tr style={theadRowStyle}>
                  <th style={thStyle}>Lead ID</th>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Mobile</th>
                  <th style={thStyle}>PAN</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Source (CRM)</th>
                  <th style={thStyle}>Created On</th>
                  <th style={thStyle}>Disbursal Date</th>
                  <th style={thStyle}>Repayment Date</th>
                  <th style={thStyle}>Loan Amount</th>
                  <th style={thStyle}>DPD</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? new Array(5)
                      .fill(null)
                      .map((_, i) => (
                        <SkeletonRow
                          key={`skeleton-body-${i}`}
                          tdStyle={tdStyle}
                        />
                      ))
                  : filteredResults.map((lead, i) => (
                    <tr
                      key={lead.lead_id || `lead-${i}`}
                      style={{
                        ...tbodyRowStyle,
                        backgroundColor:
                          i % 2 === 0
                            ? "var(--color-surface)"
                            : "var(--color-background)",
                      }}
                    >
                      <td style={tdStyle}>{lead.lead_id}</td>
                      <td style={tdStyle}>{lead.first_name}</td>
                      <td style={tdStyle}>{lead.mobile}</td>
                      <td style={tdStyle}>
                        <span style={panBadgeStyle}>{lead.pancard}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={getStatusBadgeStyle(lead.status)}>
                          {lead.status}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={sourceBadgeStyle()}>{lead.source}</span>
                      </td>
                      <td style={tdStyle}>{formatDateDisplay(lead.created_on)}</td>
                      <td style={tdStyle}>{formatDateDisplay(lead.disbursal_date)}</td>
                      <td style={tdStyle}>{formatDateDisplay(lead.repayment_date)}</td>
                      <td style={tdStyle}>
                        <span style={amountBadgeStyle}>
                          {formatCurrency(lead.loan_recommended)}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {lead.dpd !== null ? (
                          <span style={getDpdBadgeStyle(lead.dpd)}>
                            {lead.dpd}
                          </span>
                        ) : (
                          "N/A"
                        )}
                      </td>
                      <td style={tdStyle}>
                        <button
                          onClick={() => setSelectedLead(lead)}
                          style={viewDetailsButtonStyle}
                          title="View all details"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "var(--color-info)";
                            e.currentTarget.style.color = "var(--color-on-primary)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "var(--color-info-light)";
                            e.currentTarget.style.color = "var(--color-info)";
                          }}
                        >
                          👁️ View All
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lead Details Modal */}
      {selectedLead && (
        <LeadDetailsModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  );
}

// ========== STYLES ==========
const containerStyle: React.CSSProperties = {
  padding: "24px",
  backgroundColor: "var(--color-background)",
  borderRadius: "var(--radius-brand)",
  color: "var(--color-on-background)",
  fontFamily: "var(--font-brand)",
  minHeight: "100vh",
};

const searchContainerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  marginBottom: "32px",
  gap: "12px",
  alignItems: "center",
};

const inputWrapperStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: "500px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px 12px 40px",
  border: "1.5px solid var(--color-muted)",
  borderRadius: "var(--radius-brand)",
  fontSize: "15px",
  backgroundColor: "var(--color-surface)",
  color: "var(--color-on-surface)",
  transition: "all 0.3s ease",
  fontFamily: "var(--font-brand)",
  boxSizing: "border-box",
  outline: "none",
};

const inputIconStyle: React.CSSProperties = {
  position: "absolute",
  left: "12px",
  top: "50%",
  transform: "translateY(-50%)",
  fontSize: "16px",
  pointerEvents: "none",
};

const skeletonContainerStyle: React.CSSProperties = {
  marginBottom: "32px",
  borderRadius: "var(--radius-brand)",
  overflow: "hidden",
};

const errorStyle: React.CSSProperties = {
  backgroundColor: "var(--color-error)",
  color: "var(--color-on-primary)",
  padding: "14px 16px",
  borderRadius: "var(--radius-brand)",
  marginBottom: "20px",
  textAlign: "center",
  fontSize: "14px",
  fontWeight: 500,
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
};

const tableContainerStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  borderRadius: "var(--radius-brand)",
  overflow: "hidden",
  boxShadow: "0 2px 12px rgba(0, 0, 0, 0.08)",
  marginTop: "24px",
};

const tableHeaderInfoStyle: React.CSSProperties = {
  padding: "16px 20px",
  backgroundColor: "var(--color-primary)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const resultCountStyle: React.CSSProperties = {
  color: "var(--color-on-primary)",
  fontSize: "14px",
  fontWeight: 600,
};

const tableWrapperStyle: React.CSSProperties = {
  overflowX: "auto",
  maxHeight: "70vh",
  overflowY: "auto",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  backgroundColor: "transparent",
  minWidth: "1200px",
};

const theadRowStyle: React.CSSProperties = {
  backgroundColor: "var(--color-primary)",
  color: "var(--color-on-primary)",
  position: "sticky",
  top: 0,
  zIndex: 10,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "14px 16px",
  fontWeight: 600,
  fontSize: "13px",
  borderBottom: "2px solid var(--color-muted)",
  whiteSpace: "nowrap",
  backgroundColor: "var(--color-primary)",
  color: "var(--color-on-primary)",
};

const tdStyle: React.CSSProperties = {
  padding: "14px 16px",
  fontSize: "13px",
  color: "var(--color-on-surface)",
  borderBottom: "1px solid var(--color-muted)",
  whiteSpace: "nowrap",
};

const skeletonRowStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  opacity: 0.7,
};

const tbodyRowStyle: React.CSSProperties = {
  transition: "background-color 0.2s ease",
  borderBottom: "1px solid var(--color-muted)",
};

const panBadgeStyle: React.CSSProperties = {
  backgroundColor: "var(--color-primary-light)",
  color: "var(--color-surface)",
  padding: "4px 8px",
  borderRadius: "4px",
  fontSize: "12px",
  fontWeight: 600,
  display: "inline-block",
};

const amountBadgeStyle: React.CSSProperties = {
  backgroundColor: "var(--color-success-light)",
  color: "var(--color-success)",
  padding: "6px 10px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: 600,
  display: "inline-block",
};

const getDpdBadgeStyle = (dpd: number): React.CSSProperties => {
  if (dpd === 0) {
    return {
      backgroundColor: "var(--color-success-light)",
      color: "var(--color-success)",
      padding: "4px 8px",
      borderRadius: "4px",
      fontSize: "12px",
      fontWeight: 600,
      display: "inline-block",
    };
  } else if (dpd <= 30) {
    return {
      backgroundColor: "var(--color-warning-light)",
      color: "var(--color-warning)",
      padding: "4px 8px",
      borderRadius: "4px",
      fontSize: "12px",
      fontWeight: 600,
      display: "inline-block",
    };
  } else {
    return {
      backgroundColor: "var(--color-error-light)",
      color: "var(--color-error)",
      padding: "4px 8px",
      borderRadius: "4px",
      fontSize: "12px",
      fontWeight: 600,
      display: "inline-block",
    };
  }
};

const viewDetailsButtonStyle: React.CSSProperties = {
  backgroundColor: "var(--color-info-light)",
  color: "var(--color-info)",
  padding: "6px 12px",
  borderRadius: "6px",
  border: "1px solid var(--color-info)",
  fontSize: "12px",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.2s ease",
  fontFamily: "var(--font-brand)",
  outline: "none",
  minWidth: "90px",
};

// ========== FILTER STYLES ==========
const filterContainerStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  borderRadius: "12px",
  padding: "20px",
  marginBottom: "24px",
  boxShadow: "0 2px 12px rgba(0, 0, 0, 0.06)",
  border: "1px solid var(--color-muted)",
};

const filterHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
  paddingBottom: "16px",
  borderBottom: "1px solid var(--color-muted-light)",
};

const filterTitleWrapperStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const filterIconStyle: React.CSSProperties = {
  fontSize: "16px",
  opacity: 0.8,
};

const filterTitleStyle: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
  color: "var(--color-on-surface)",
};

const activeFiltersBadgeStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 500,
  backgroundColor: "var(--color-primary-light)",
  color: "var(--color-primary)",
  padding: "4px 10px",
  borderRadius: "12px",
  marginLeft: "8px",
  border: "1px solid var(--color-primary)",
};

const filterActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  alignItems: "center",
};

const filterActionButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 16px",
  borderRadius: "8px",
  border: "1.5px solid",
  fontSize: "14px",
  cursor: "pointer",
  transition: "all 0.2s ease",
  fontFamily: "var(--font-brand)",
  outline: "none",
  minHeight: "36px",
  minWidth: "100px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
};

const filterActionButtonTextStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 500,
};

const filterGridStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
};

const filterItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 16px",
  borderRadius: "8px",
  border: "1px solid",
  cursor: "pointer",
  transition: "all 0.2s ease",
  userSelect: "none",
  minWidth: "140px",
  outline: "none",
  fontFamily: "var(--font-brand)",
  fontSize: "14px",
};

const filterItemTextStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 500,
  flex: 1,
};

const filterCountStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  padding: "4px 8px",
  borderRadius: "10px",
  minWidth: "24px",
  textAlign: "center",
  marginLeft: "10px",
};

// ========== MODAL STYLES ==========
const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  backdropFilter: "blur(4px)",
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  borderRadius: "12px",
  width: "90%",
  maxWidth: "800px",
  maxHeight: "90vh",
  overflow: "auto",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
  border: "1px solid var(--color-muted)",
};

const modalHeaderStyle: React.CSSProperties = {
  padding: "20px 24px",
  borderBottom: "1px solid var(--color-muted)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: "var(--color-primary-light)",
};

const modalTitleStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 600,
  color: "var(--color-on-surface)",
  margin: 0,
};

const modalCloseButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  fontSize: "20px",
  cursor: "pointer",
  padding: "4px 8px",
  borderRadius: "4px",
  transition: "background-color 0.2s ease",
  backgroundColor: "var(--color-error-light)",
  color: "var(--color-error)",
};

const modalBodyStyle: React.CSSProperties = {
  padding: "24px",
};

const detailsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
  gap: "16px",
};

const detailItemStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  padding: "12px",
  backgroundColor: "var(--color-background)",
  borderRadius: "8px",
  border: "1px solid var(--color-muted)",
};

const detailLabelStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--color-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const detailValueStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 500,
  color: "var(--color-on-surface)",
  wordBreak: "break-word",
};

// ========== STATUS BADGE STYLES ==========
const getStatusBadgeStyle = (status: string): React.CSSProperties => {
  const baseStyle: React.CSSProperties = {
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 600,
    display: "inline-block",
    border: "1px solid transparent",
  };

  const normalizedStatus = normalizeStatus(status);

  if (
    normalizedStatus.includes("active") ||
    normalizedStatus.includes("qualif") ||
    normalizedStatus.includes("approve") ||
    normalizedStatus.includes("disbursed")
  ) {
    return {
      ...baseStyle,
      backgroundColor: "var(--color-success-light)",
      color: "var(--color-success)",
      borderColor: "var(--color-success)",
    };
  } else if (
    normalizedStatus.includes("pend") ||
    normalizedStatus.includes("process") ||
    normalizedStatus.includes("verify")
  ) {
    return {
      ...baseStyle,
      backgroundColor: "var(--color-warning-light)",
      color: "var(--color-warning)",
      borderColor: "var(--color-warning)",
    };
  } else if (
    normalizedStatus.includes("reject") ||
    normalizedStatus.includes("cancel") ||
    normalizedStatus.includes("fail") ||
    normalizedStatus.includes("deny") ||
    normalizedStatus.includes("decline")
  ) {
    return {
      ...baseStyle,
      backgroundColor: "var(--color-error-light)",
      color: "var(--color-error)",
      borderColor: "var(--color-error)",
    };
  } else if (normalizedStatus.includes("complete") || normalizedStatus.includes("closed")) {
    return {
      ...baseStyle,
      backgroundColor: "var(--color-info-light)",
      color: "var(--color-info)",
      borderColor: "var(--color-info)",
    };
  } else if (normalizedStatus.includes("overdue")) {
    return {
      ...baseStyle,
      backgroundColor: "var(--color-error-light)",
      color: "var(--color-error)",
      borderColor: "var(--color-error)",
    };
  }

  return {
    ...baseStyle,
    backgroundColor: "var(--color-muted-light)",
    color: "var(--color-on-surface)",
    borderColor: "var(--color-muted)",
  };
};

const sourceBadgeStyle = (): React.CSSProperties => ({
  backgroundColor: "var(--color-secondary-light)",
  color: "var(--color-secondary)",
  padding: "6px 12px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: 600,
  display: "inline-block",
  border: "1px solid var(--color-secondary)",
});

const getResultCountText = (count: number, isFiltered: boolean): string => {
  if (count === 0) {
    return isFiltered ? "No results match the selected filters" : "No results";
  }
  return count === 1 ? "1 result found" : `${count} results found`;
};