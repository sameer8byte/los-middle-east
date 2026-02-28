import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Spinner } from "../../../common/ui/spinner";
import {
  HiOutlineDocumentArrowDown,
  HiOutlineCalendar,
  HiOutlineUsers,
  HiOutlineCurrencyDollar,
  HiOutlineChartBar,
} from "react-icons/hi2";
import { FiDownload, FiRefreshCw } from "react-icons/fi";
import dayjs from "dayjs";
import {
  exportReportToCSV,
  getReport,
  type ReportData,
} from "../../../shared/services/api/report.api";
import { Button } from "../../../common/ui/button";

// General Reports (shown without heading)
const GENERAL_REPORTS = [
  {
    id: "master-report",
    name: "Master Reports",
    description: "Comprehensive report with all details",
    icon: <HiOutlineChartBar className="w-5 h-5" />,
    color: "bg-[var(--color-surface)] text-[var(--color-on-surface)]",
  },
  {
    id: "reject-report",
    name: "Reject Report",
    description: "Analytics on rejection patterns and reasons",
    icon: <HiOutlineDocumentArrowDown className="w-5 h-5" />,
    color: "bg-[var(--color-surface)] text-[var(--color-on-surface)]",
  },
  {
    id: "login-sessions-report",
    name: "Login Sessions Report",
    description:
      "User login activity with device, IP, and session duration tracking",
    icon: <HiOutlineUsers className="w-5 h-5" />,
    color: "bg-[var(--color-surface)] text-[var(--color-on-surface)]",
  },
];

// Disbursed Reports
const DISBURSED_REPORTS = [
  {
    id: "disbursed-loan-report",
    name: "Disbursed Loan Report",
    description: "Information about disbursed loans",
    icon: <HiOutlineCurrencyDollar className="w-5 h-5" />,
    color: "bg-[var(--color-surface)] text-[var(--color-on-surface)]",
  },
  {
    id: "non-disbursed-loan-report",
    name: "Non-Disbursed Loan Report",
    description: "Loans that were not disbursed",
    icon: <HiOutlineCurrencyDollar className="w-5 h-5" />,
    color: "bg-[var(--color-surface)] text-[var(--color-on-surface)]",
  },
  {
    id: "disburse-non-disburse-report",
    name: "Disburse - Non Disburse Report",
    description: "Combined report of disbursed and non-disbursed loans",
    icon: <HiOutlineCurrencyDollar className="w-5 h-5" />,
    color: "bg-[var(--color-surface)] text-[var(--color-on-surface)]",
  },
];

// Collection Reports
const COLLECTION_REPORTS = [
  {
    id: "master-collection-report",
    name: "Master Collection Report",
    description: "Collection status and payment information",
    icon: <HiOutlineUsers className="w-5 h-5" />,
    color: "bg-[var(--color-surface)] text-[var(--color-on-surface)]",
  },
  {
    id: "collection-loan-report",
    name: "Collection Loan Report",
    description: "Detailed collection data for loans",
    icon: <HiOutlineCalendar className="w-5 h-5" />,
    color: "bg-[var(--color-surface)] text-[var(--color-on-surface)]",
  },
  {
    id: "collection-due-report",
    name: "Collection Due Report",
    description: "Loans due for collection based on due date",
    icon: <HiOutlineCalendar className="w-5 h-5" />,
    color: "bg-[var(--color-surface)] text-[var(--color-on-surface)]",
  },
  {
    id: "collection-allocation-executive-report",
    name: "Collection Allocation Executive Report",
    description:
      "Executive-wise collection allocation with DPD and outstanding amounts",
    icon: <HiOutlineUsers className="w-5 h-5" />,
    color: "bg-[var(--color-surface)] text-[var(--color-on-surface)]",
  },
  {
    id: "collection-remarks-report",
    name: "Collection Remarks Report",
    description: "Historical comments and remarks on loan collections",
    icon: <HiOutlineDocumentArrowDown className="w-5 h-5" />,
    color: "bg-[var(--color-surface)] text-[var(--color-on-surface)]",
  },
  {
    id: "field-visit-report",
    name: "Field Visit Report",
    description:
      "Report for field collection team with customer details and references",
    icon: <HiOutlineUsers className="w-5 h-5" />,
    color: "bg-[var(--color-surface)] text-[var(--color-on-surface)]",
  },
  {
    id: "collection-loan-report-by-approved-date",
    name: "Collection Report by Approved Date",
    description: "Collection transactions from 14 january 2024",
    icon: <HiOutlineCalendar className="w-5 h-5" />,
    color: "bg-[var(--color-surface)] text-[var(--color-on-surface)]",
  },
];

// Marketing Reports
const MARKETING_REPORTS = [
  {
    id: "marketing-report",
    name: "Marketing Report",
    description: "Marketing ID, Lead Stage, and Rejection details",
    icon: <HiOutlineChartBar className="w-5 h-5" />,
    color: "bg-[var(--color-surface)] text-[var(--color-on-surface)]",
  },
  {
    id: "daily-marketing-mis-report",
    name: "Daily Marketing MIS Report",
    description: "Daily MIS report with lead tracking and loan status",
    icon: <HiOutlineChartBar className="w-5 h-5" />,
    color: "bg-[var(--color-surface)] text-[var(--color-on-surface)]",
  },
  {
    id: "internal-marketing-report",
    name: "Internal Marketing Report",
    description:
      "Comprehensive marketing analytics with UTM tracking and lead conversion",
    icon: <HiOutlineChartBar className="w-5 h-5" />,
    color: "bg-[var(--color-surface)] text-[var(--color-on-surface)]",
  },
  {
    id: "completed-loan-with-no-repet-report",
    name: "Completed with no repeat Report",
    description: "Completed loans with latest status per user",
    icon: <HiOutlineChartBar className="w-5 h-5" />,
    color: "bg-[var(--color-surface)] text-[var(--color-on-surface)]",
  },
  {
    id: "active-loans-by-due-date-report",
    name: "Active Loans Report by Due Date",
    description:
      "Active and partially paid loans with disbursement and due dates",
    icon: <HiOutlineCalendar className="w-5 h-5" />,
    color: "bg-[var(--color-surface)] text-[var(--color-on-surface)]",
  },
];

// Credit Bureau Reports
const CREDIT_BUREAU_REPORTS = [
  {
    id: "cic-report",
    name: "CIC Report",
    description: "Credit Information Company compliance report",
    icon: <HiOutlineDocumentArrowDown className="w-5 h-5" />,
    color: "bg-[var(--color-surface)] text-[var(--color-on-surface)]",
  },
  {
    id: "equifax-credit-report",
    name: "Equifax Credit Report",
    description: "Credit bureau reporting format for Equifax",
    icon: <HiOutlineDocumentArrowDown className="w-5 h-5" />,
    color: "bg-[var(--color-surface)] text-[var(--color-on-surface)]",
  },
  {
    id: "transunion-report",
    name: "TransUnion Credit Report",
    description: "Credit bureau reporting format for TransUnion (CIBIL)",
    icon: <HiOutlineDocumentArrowDown className="w-5 h-5" />,
    color: "bg-[var(--color-surface)] text-[var(--color-on-surface)]",
  },
];

const Legacy_REPORTS = [
  {
    id: "outstanding-data-report",
    name: "Outstanding Data Report",
    description:
      "Detailed outstanding loans with DPD, bucket classification, and collection status",
    icon: <HiOutlineCurrencyDollar className="w-5 h-5" />,
    color: "bg-[var(--color-surface)] text-[var(--color-on-surface)]",
  },
  {
    id: "loan-close-report",
    name: "Loan Close Report",
    description:
      "Closed loans with payment details, NOC status, and recovery information",
    icon: <HiOutlineDocumentArrowDown className="w-5 h-5" />,
    color: "bg-[var(--color-surface)] text-[var(--color-on-surface)]",
  },
  {
    id: "total-recovery-report",
    name: "Total Recovery Report",
    description:
      "All payment recoveries with discounts, refunds, and approval details",
    icon: <HiOutlineCurrencyDollar className="w-5 h-5" />,
    color: "bg-[var(--color-surface)] text-[var(--color-on-surface)]",
  },
  {
    id: "total-approve-sanction-report",
    name: "Total Approve Sanction Report",
    description:
      "All approved and sanctioned loans with approval chain details",
    icon: <HiOutlineDocumentArrowDown className="w-5 h-5" />,
    color: "bg-[var(--color-surface)] text-[var(--color-on-surface)]",
  },
  {
    id: "lead-total-report",
    name: "Lead Total Report",
    description:
      "Complete lead journey with timeline, assignments, and status tracking",
    icon: <HiOutlineUsers className="w-5 h-5" />,
    color: "bg-[var(--color-surface)] text-[var(--color-on-surface)]",
  },
];

// Combined list for finding report names
const ALL_REPORTS = [
  ...GENERAL_REPORTS,
  ...DISBURSED_REPORTS,
  ...COLLECTION_REPORTS,
  ...MARKETING_REPORTS,
  ...CREDIT_BUREAU_REPORTS,
  ...Legacy_REPORTS,
];

export function ReportList() {
  const { brandId } = useParams<{ brandId: string }>();
  const [selectedReportType, setSelectedReportType] = useState<string>("");
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingCSV, setDownloadingCSV] = useState(false);
  const [error, setError] = useState<string>("");

  // Date filters
  const [fromDate, setFromDate] = useState(
    dayjs().subtract(1, "day").format("YYYY-MM-DD")
  );

  const [toDate, setToDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [selectedDate] = useState(dayjs().format("YYYY-MM-DD"));

  // Fetch report data
  const fetchReportData = async () => {
    if (!brandId || !selectedReportType) return;

    setLoading(true);
    setError("");

    try {
      const fromDateTime = dayjs(fromDate).format('YYYY-MM-DD');

      const toDateTime = dayjs(toDate).format('YYYY-MM-DD');

      const data = await getReport(
        selectedReportType,
        fromDateTime,
        toDateTime,
        brandId
      );
      setReportData(data);
    } catch (err: any) {
      let errorMessage = "Failed to fetch report data. Please try again.";
      
      if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  // Download CSV report
  const handleDownloadCSV = async () => {
    if (!brandId || !selectedReportType) return;

    setDownloadingCSV(true);

    try {
      const fromDateTime = dayjs(fromDate).format('YYYY-MM-DD'); // "2024-01-15"

      const toDateTime = dayjs(toDate).format('YYYY-MM-DD'); // "2024-01-15"

      const csvData = await exportReportToCSV(
        selectedReportType,
        fromDateTime,
        toDateTime,
        brandId
      );

      const blob = new Blob([csvData], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${selectedReportType}-${dayjs().format(
        "YYYY-MM-DD"
      )}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Error downloading CSV:", err);

      let errorMessage = "Failed to download CSV. Please try again.";
      
      if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setDownloadingCSV(false);
    }
  };
  // Fetch data when component mounts or filters change
  useEffect(() => {
    if (selectedReportType) {
      fetchReportData();
    }
  }, [selectedReportType, fromDate, toDate, selectedDate, brandId]);

  // Reusable Report Card Component with smaller size
  const ReportCard = ({ report }: { report: (typeof GENERAL_REPORTS)[0] }) => {
    const isSelected = selectedReportType === report.id;
    return (
      <button
        key={report.id}
        onClick={() => setSelectedReportType(report.id)}
        className={`relative p-2.5 rounded-lg border text-left transition-all duration-150 hover:shadow-sm
          ${
            isSelected
              ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] shadow-sm"
              : "border-[var(--color-muted)] bg-white hover:border-[var(--color-primary)] hover:border-opacity-50"
          }`}
      >
        <div className="flex items-start gap-2">
          <div
            className={`p-1.5 rounded-md transition-colors duration-150 flex-shrink-0
              ${
                isSelected
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--color-surface)] text-[var(--color-on-surface)] opacity-70"
              }`}
          >
            {report.icon}
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className={`font-medium text-sm leading-tight mb-0.5 ${
                isSelected
                  ? "text-[var(--color-on-primary)]"
                  : "text-[var(--color-on-background)]"
              }`}
            >
              {report.name}
            </h3>
            <p
              className={`text-xs leading-snug ${
                isSelected
                  ? "text-[var(--color-on-primary)]"
                  : "text-[var(--color-on-background)]"
              } opacity-70`}
            >
              {report.description}
            </p>
          </div>
        </div>

        {isSelected && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--color-primary)] rounded-full flex items-center justify-center">
            <div className="w-1 h-1 bg-white rounded-full"></div>
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 md:p-4">
      {/* Compact Header Section */}
      <div className="bg-[color:var(--color-background,var(--background))] rounded-xl shadow-sm border border-[color:var(--color-muted,var(--muted))] p-4 md:p-6 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-black">Reports</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={fetchReportData}
              disabled={loading || !selectedReportType}
              variant="outline"
              size="sm"
            >
              <FiRefreshCw
                className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              onClick={handleDownloadCSV}
              disabled={
                downloadingCSV ||
                loading ||
                reportData.length === 0 ||
                !selectedReportType
              }
              size="sm"
            >
              {downloadingCSV ? (
                <>
                  <Spinner />
                  <span className="ml-2 text-on-primary">Downloading...</span>
                </>
              ) : (
                <>
                  <FiDownload className="w-4 h-4 mr-2 text-on-primary" />
                  Export CSV
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Compact Filters Section */}
      <div className="bg-white rounded-xl shadow-sm border border-[var(--color-muted)] border-opacity-30 p-4 md:p-5 mb-4">
        {/* Date Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-lg shadow-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-lg shadow-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-all text-sm"
            />
          </div>
        </div>

        {/* Report Type Selection */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-3">
            Select Report Type <span className="text-red-500">*</span>
          </label>

          {/* General Reports - No Heading */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 mb-5">
            {GENERAL_REPORTS.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>

          {/* Disbursed Reports Section */}
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-[var(--color-on-surface)] mb-2.5 flex items-center gap-2">
              <HiOutlineCurrencyDollar className="w-4 h-4" />
              Disbursed Reports
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {DISBURSED_REPORTS.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          </div>

          {/* Collection Reports Section */}
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-[var(--color-on-surface)] mb-2.5 flex items-center gap-2">
              <HiOutlineUsers className="w-4 h-4" />
              Collection Reports
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {COLLECTION_REPORTS.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          </div>

          {/* Marketing Reports Section */}
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-[var(--color-on-surface)] mb-2.5 flex items-center gap-2">
              <HiOutlineChartBar className="w-4 h-4" />
              Marketing Reports
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {MARKETING_REPORTS.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          </div>

          {/* Credit Bureau Reports Section */}
          {/* Credit Bureau Reports Section */}
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-[var(--color-on-surface)] mb-2.5 flex items-center gap-2">
              <HiOutlineDocumentArrowDown className="w-4 h-4" />
              Credit Bureau Reports
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {CREDIT_BUREAU_REPORTS.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          </div>

          {/* Legacy Reports Section */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-on-surface)] mb-2.5 flex items-center gap-2">
              <HiOutlineCurrencyDollar className="w-4 h-4" />
              Legacy PHP Reports
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {Legacy_REPORTS.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Error State - Compact */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              {error.toLowerCase().includes("permission") ||
              error.toLowerCase().includes("forbidden") ? (
                <svg
                  className="w-4 h-4 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-15a9 9 0 110 18 9 9 0 010-18zm-2 9h4"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-red-800 font-semibold mb-1 text-sm">
                {error.toLowerCase().includes("permission") ||
                error.toLowerCase().includes("forbidden")
                  ? "Access Denied"
                  : "Error"}
              </h3>
              <p className="text-red-700 text-sm leading-relaxed">{error}</p>
              {(error.toLowerCase().includes("permission") ||
                error.toLowerCase().includes("forbidden")) && (
                <div className="mt-2 p-2 bg-red-100 rounded-lg">
                  <p className="text-red-800 text-xs font-medium">
                    💡 Contact your administrator to request access to this
                    report type.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No Report Type Selected State - Compact */}
      {!selectedReportType && !loading && !error && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <HiOutlineChartBar className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-blue-800 font-semibold text-lg mb-2">
            Select a Report Type
          </h3>
          <p className="text-blue-600 text-sm">
            Please choose a report type from the options above to view the data.
          </p>
        </div>
      )}

      {/* Loading State - Compact */}
      {loading && selectedReportType && (
        <div className="bg-white rounded-xl shadow-sm border border-[var(--color-muted)] border-opacity-30 p-6 text-center">
          <Spinner />
          <p className="text-[var(--color-on-surface)] mt-3 text-sm">
            Loading report data...
          </p>
        </div>
      )}

      {/* Empty State - Compact */}
      {!loading && selectedReportType && reportData.length === 0 && !error && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <HiOutlineDocumentArrowDown className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-gray-700 font-semibold text-lg mb-2">
            No Data Available
          </h3>
          <p className="text-gray-500 text-sm mb-4">
            No report data found for the selected date range and report type.
          </p>
          <Button
            onClick={fetchReportData}
            variant="outline"
            disabled={loading}
            size="sm"
          >
            <FiRefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      )}

      {/* Report Data Available - Ready for Download - Compact */}
      {!loading && selectedReportType && reportData.length > 0 && !error && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 md:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-green-800">
                  {ALL_REPORTS.find((r) => r.id === selectedReportType)?.name}{" "}
                  Ready
                </h2>
                {/* <p className="text-green-600 text-sm">
                  {reportData.length} records found
                </p> */}
              </div>
            </div>
            <Button
              onClick={handleDownloadCSV}
              disabled={downloadingCSV}
              className="bg-green-600 hover:bg-green-700"
              size="sm"
            >
              {downloadingCSV ? (
                <>
                  <Spinner />
                  <span className="ml-2">Downloading...</span>
                </>
              ) : (
                <>
                  <FiDownload className="w-4 h-4 mr-2" />
                  Download CSV
                </>
              )}
            </Button>
          </div>

          <div className="bg-white rounded-lg p-3 border border-green-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-gray-500 text-xs">Report Type:</span>
                <div className="font-medium text-gray-900 text-sm">
                  {ALL_REPORTS.find((r) => r.id === selectedReportType)?.name}
                </div>
              </div>
              <div>
                <span className="text-gray-500 text-xs">Date Range:</span>
                <div className="font-medium text-gray-900 text-sm">
                  {dayjs(fromDate).format("MMM DD, YYYY")} -{" "}
                  {dayjs(toDate).format("MMM DD, YYYY")}
                </div>
              </div>
              {/* <div>
                <span className="text-gray-500 text-xs">Total Records:</span>
                <div className="font-medium text-gray-900 text-sm">
                  {reportData.length.toLocaleString()}
                </div>
              </div> */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
