import React, { useEffect, useState } from "react";
import { getCustomerById, getCustomerDetails } from "../../../../shared/services/api/customer.api";
import { useParams } from "react-router-dom";
import { Button } from "../../../../common/ui/button";

interface Lead {
  lead_id: number;
  status: string;
  mobile: number | string;
  user_type: string;
}

interface ApiResponse {
  success: boolean;
  number_of_loans?: number;
  status: string;
  leads?: Lead[];
  message?: string;
}

export function CustomerDetailsBefore1MarchComponent() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const { brandId, customerId } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<Lead[]>([]);
  const [numberOfLoans, setNumberOfLoans] = useState<number>(0);
  const [overallStatus, setOverallStatus] = useState<string>("");

  // Get distinct status counts
  const statusCounts = results.reduce((acc, lead) => {
    const status = lead.status || "Unknown";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Fetch customer documents to get phone number
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        if (!customerId || !brandId) return;
        setLoading(true);

        const data = await  getCustomerById(customerId, brandId);
        getCustomerDetails(customerId, brandId);
        //. remove +91
        console.log("Customer Documents Data:", data);
        const foundPhone = data.phoneNumber.replace(/^(\+91|91)/, '');

        if (foundPhone) {

          setPhoneNumber(foundPhone);
          handleSearch(foundPhone);
        }
      } catch (err) {
        console.error("Error fetching documents:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [customerId, brandId]);

  // Handle search
  const handleSearch = async (phoneValue?: string) => {
    const searchPhone = phoneValue || phoneNumber;
    if (!searchPhone) return;

    setLoading(true);
    setError("");
    setResults([]);
    setNumberOfLoans(0);
    setOverallStatus("");

    try {
      const response = await fetch(
        `https://api2.salary4sure.com/api/v1/customer-details-before-1-march?phoneNumber=${searchPhone}`
      );
      const data: ApiResponse = await response.json();

      if (data.success && data.leads && data.leads.length > 0) {
        setResults(data.leads);
        setNumberOfLoans(data.number_of_loans || data.leads.length);
        setOverallStatus(data.status || "");
      } else {
        setError(data.message || "No leads found for this phone number");
      }
    } catch (err) {
      console.error("Search error:", err);
      setError("Search failed. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h2 style={titleStyle}>📋 Customer Details (Before 1 March)</h2>
      </div>

      {/* Search Input */}
      {!loading && (
        <div style={searchContainerStyle}>
          <div style={inputWrapperStyle}>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && phoneNumber) handleSearch();
              }}
              placeholder="Enter Phone Number"
              style={inputStyle}
              maxLength={10}
            />
          </div>
          <Button
            onClick={() => handleSearch()}
            disabled={loading || !phoneNumber || phoneNumber.length < 10}
          >
            {loading ? "Searching..." : "🔎 Search"}
          </Button>
        </div>
      )}

      {/* Loading */}
      {loading && <div style={loadingStyle}>Loading...</div>}

      {/* Error */}
      {error && <div style={errorStyle}>{error}</div>}

      {/* Summary */}
      {results.length > 0 && (
        <div style={summaryStyle}>
          <div style={{ marginBottom: "12px" }}>
            <span><strong>Total Loans:</strong> {numberOfLoans}</span>
            {overallStatus && <span style={{ marginLeft: "16px" }}><strong>Overall Status:</strong> {overallStatus}</span>}
          </div>
          {/* Status Breakdown */}
          <div style={statusBreakdownStyle}>
            <strong>Status Breakdown:</strong>
            <div style={statusChipsContainerStyle}>
              {Object.entries(statusCounts).map(([status, count]) => (
                <span key={status} style={getStatusChipStyle(status)}>
                  {status}: {count}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results Table */}
      {results.length > 0 && (
        <div style={tableContainerStyle}>
          <table style={tableStyle}>
            <thead>
              <tr style={theadRowStyle}>
                <th style={thStyle}>Lead ID</th>
                <th style={thStyle}>Mobile</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>User Type</th>
              </tr>
            </thead>
            <tbody>
              {results.map((lead) => (
                <tr key={lead.lead_id} style={tbodyRowStyle}>
                  <td style={tdStyle}>{lead.lead_id}</td>
                  <td style={tdStyle}>{lead.mobile}</td>
                  <td style={tdStyle}>
                    <span style={getStatusBadgeStyle(lead.status)}>{lead.status}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={getUserTypeBadgeStyle(lead.user_type)}>{lead.user_type}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Styles
const containerStyle: React.CSSProperties = {
  padding: "24px",
  backgroundColor: "var(--color-background)",
  borderRadius: "var(--radius-brand)",
  fontFamily: "var(--font-brand)",
};

const headerStyle: React.CSSProperties = {
  marginBottom: "24px",
  textAlign: "center",
};

const titleStyle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 700,
  color: "var(--color-on-background)",
};

const searchContainerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  marginBottom: "24px",
  gap: "12px",
  alignItems: "center",
};

const inputWrapperStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "300px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  border: "1.5px solid var(--color-muted)",
  borderRadius: "var(--radius-brand)",
  fontSize: "15px",
  backgroundColor: "var(--color-surface)",
  color: "var(--color-on-surface)",
  boxSizing: "border-box",
  outline: "none",
};

const loadingStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "20px",
  color: "var(--color-muted)",
};

const errorStyle: React.CSSProperties = {
  backgroundColor: "var(--color-error)",
  color: "var(--color-on-primary)",
  padding: "12px 16px",
  borderRadius: "var(--radius-brand)",
  marginBottom: "16px",
  textAlign: "center",
};

const summaryStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  padding: "16px",
  borderRadius: "var(--radius-brand)",
  marginBottom: "16px",
  textAlign: "center",
};

const statusBreakdownStyle: React.CSSProperties = {
  marginTop: "8px",
  paddingTop: "12px",
  borderTop: "1px solid var(--color-muted)",
};

const statusChipsContainerStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  justifyContent: "center",
  marginTop: "8px",
};

const getStatusChipStyle = (status: string): React.CSSProperties => {
  const baseStyle: React.CSSProperties = {
    padding: "6px 12px",
    borderRadius: "16px",
    fontSize: "13px",
    fontWeight: 600,
  };

  const s = status?.toUpperCase();
  if (s === "DISBURSED" || s === "APPROVED" || s === "CLOSED") {
    return { ...baseStyle, backgroundColor: "var(--color-success)", color: "#fff" };
  }
  if (s === "PENDING" || s === "PROCESSING") {
    return { ...baseStyle, backgroundColor: "var(--color-warning)", color: "#fff" };
  }
  if (s === "REJECTED" || s === "CANCELLED") {
    return { ...baseStyle, backgroundColor: "var(--color-error)", color: "#fff" };
  }
  return { ...baseStyle, backgroundColor: "var(--color-muted)", color: "var(--color-on-background)" };
};

const tableContainerStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  borderRadius: "var(--radius-brand)",
  overflow: "hidden",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const theadRowStyle: React.CSSProperties = {
  backgroundColor: "var(--color-primary)",
  color: "var(--color-on-primary)",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 16px",
  fontWeight: 600,
  fontSize: "13px",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 16px",
  fontSize: "13px",
  borderBottom: "1px solid var(--color-muted)",
};

const tbodyRowStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
};

const getStatusBadgeStyle = (status: string): React.CSSProperties => {
  const baseStyle: React.CSSProperties = {
    padding: "4px 10px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: 600,
  };

  const s = status?.toUpperCase();
  if (s === "DISBURSED" || s === "APPROVED" || s === "CLOSED") {
    return { ...baseStyle, backgroundColor: "var(--color-success)", color: "#fff" };
  }
  if (s === "PENDING" || s === "PROCESSING") {
    return { ...baseStyle, backgroundColor: "var(--color-warning)", color: "#fff" };
  }
  if (s === "REJECTED" || s === "CANCELLED") {
    return { ...baseStyle, backgroundColor: "var(--color-error)", color: "#fff" };
  }
  return { ...baseStyle, backgroundColor: "var(--color-muted)", color: "var(--color-on-background)" };
};

const getUserTypeBadgeStyle = (userType: string): React.CSSProperties => {
  const baseStyle: React.CSSProperties = {
    padding: "4px 10px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: 600,
  };

  if (userType?.toUpperCase() === "NEW") {
    return { ...baseStyle, backgroundColor: "var(--color-info)", color: "#fff" };
  }
  if (userType?.toUpperCase() === "REPEAT") {
    return { ...baseStyle, backgroundColor: "var(--color-secondary)", color: "#fff" };
  }
  return { ...baseStyle, backgroundColor: "var(--color-muted)", color: "var(--color-on-background)" };
};
