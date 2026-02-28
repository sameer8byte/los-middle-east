import React, { useState, useMemo } from "react";
import {
  FaChevronDown,
  FaChevronUp,
  FaBalanceScale,
  FaChartBar,
  FaFileAlt,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaExchangeAlt,
  FaInfoCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaArrowUp,
  FaArrowDown,
} from "react-icons/fa";

interface CustomerFinancialComparisonProps {
  reportData?: any; // JSON, Report, Transaction
  statementData?: any; // PDF, JSON, JSON
}

export const CustomerFinancialComparison: React.FC<
  CustomerFinancialComparisonProps
> = ({ reportData, statementData }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => setIsOpen((prev) => !prev);

  // Parse report data
  const parsedReportData = useMemo(() => {
    try {
      if (typeof reportData === "string") {
        return JSON.parse(reportData);
      }
      return reportData;
    } catch (error) {
      console.error("Error parsing report data:", error);
      return null;
    }
  }, [reportData]);

  // Parse statement data
  const parsedStatementData = useMemo(() => {
    try {
      if (typeof statementData === "string") {
        return JSON.parse(statementData);
      }
      return statementData;
    } catch (error) {
      console.error("Error parsing statement data:", error);
      return null;
    }
  }, [statementData]);

  // Extract data from both sources
  const reportProfile = parsedReportData?.custProfile;
  const reportOutput = parsedReportData?.finalOutput?.overall;

  const statementAccount = parsedStatementData?.Account;
  const statementProfile = statementAccount?.Profile?.Holders?.Holder;
  const statementSummary = statementAccount?.Summary;
  const statementTransactions = statementAccount?.Transactions?.Transaction || [];

  // Calculate statement statistics
  const statementStats = useMemo(() => {
    if (!statementTransactions.length) return null;

    const credits = statementTransactions.filter((t: any) => t.type === "CREDIT");
    const debits = statementTransactions.filter((t: any) => t.type === "DEBIT");

    const totalCredit = credits.reduce(
      (sum: number, t: any) => sum + parseFloat(t.amount || 0),
      0
    );
    const totalDebit = debits.reduce(
      (sum: number, t: any) => sum + parseFloat(t.amount || 0),
      0
    );

    return {
      totalTransactions: statementTransactions.length,
      totalCredit,
      totalDebit,
      creditCount: credits.length,
      debitCount: debits.length,
      netFlow: totalCredit - totalDebit,
    };
  }, [statementTransactions]);

  // Format currency
  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  if (!parsedReportData && !parsedStatementData) {
    return (
      <div className="w-full mt-4 bg-red-50 rounded-lg border border-red-200 p-5">
        <div className="flex items-center gap-3 text-red-800">
          <FaInfoCircle className="w-5 h-5" />
          <p className="text-sm">No financial data available for comparison</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mt-4 bg-gradient-to-br from-cyan-50 to-teal-50 rounded-lg border border-cyan-200">
      {/* Header */}
      <button
        onClick={toggleOpen}
        className="w-full cursor-pointer flex items-center justify-between px-5 py-3 rounded-t-lg bg-white hover:bg-gray-50 transition-colors border-b border-gray-200"
        aria-expanded={isOpen}
        aria-controls="customer-financial-comparison"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-100 rounded-lg">
            <FaBalanceScale className="w-5 h-5 text-cyan-600" />
          </div>
          <div className="text-left">
            <h4 className="text-base font-semibold text-[var(--color-on-background)]">
              Financial Data Comparison (Report vs Statement) --- BETA ---
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Side-by-side analysis of Report vs Statement data
            </p>
          </div>
        </div>
        <div className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          {isOpen ? (
            <FaChevronUp className="w-4 h-4 text-gray-600" />
          ) : (
            <FaChevronDown className="w-4 h-4 text-gray-600" />
          )}
        </div>
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div id="customer-financial-comparison" className="p-5 space-y-6">
          {/* Profile Comparison */}
          {(reportProfile || statementProfile) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Report Profile */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                  <FaFileAlt className="w-5 h-5 text-blue-600" />
                  <h5 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                    Report Data - Customer Profile
                  </h5>
                </div>
                {reportProfile ? (
                  <div className="space-y-3">
                    <ComparisonItem label="Name" value={reportProfile.name} />
                    <ComparisonItem label="PAN" value={reportProfile.pan} />
                    <ComparisonItem label="Mobile" value={reportProfile.mobile} />
                    <ComparisonItem label="Email" value={reportProfile.email} />
                    <ComparisonItem label="DOB" value={reportProfile.dob} />
                    <ComparisonItem label="CKYC" value={reportProfile.ckycCompliance} badge />
                    <ComparisonItem label="No. of Banks" value={reportProfile.numberOfBanks} />
                    <ComparisonItem label="No. of Accounts" value={reportProfile.numberOfAccounts} />
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No report data available</p>
                )}
              </div>

              {/* Statement Profile */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                  <FaFileAlt className="w-5 h-5 text-purple-600" />
                  <h5 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                    Statement Data - Account Holder
                  </h5>
                </div>
                {statementProfile ? (
                  <div className="space-y-3">
                    <ComparisonItem label="Name" value={statementProfile.name} />
                    <ComparisonItem label="PAN" value={statementProfile.pan} />
                    <ComparisonItem label="Mobile" value={statementProfile.mobile} />
                    <ComparisonItem label="Email" value={statementProfile.email} />
                    <ComparisonItem label="DOB" value={statementProfile.dob} />
                    <ComparisonItem label="CKYC" value={statementProfile.ckycCompliance} badge />
                    <ComparisonItem label="Address" value={statementProfile.address} />
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No statement data available</p>
                )}
              </div>
            </div>
          )}

          {/* Transaction Statistics Comparison */}
          {(reportOutput || statementStats) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                <FaChartBar className="w-5 h-5 text-green-600" />
                <h5 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                  Transaction Statistics Comparison (Report vs Statement ) in BETA
                </h5>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Transactions */}
                <ComparisonCard
                  label="Total Transactions"
                  reportValue={reportOutput?.VAR01A0013 || reportOutput?.VAR02A0013}
                  statementValue={statementStats?.totalTransactions}
                  icon={<FaExchangeAlt className="w-5 h-5" />}
                  color="blue"
                />

                {/* Total Credits */}
                <ComparisonCard
                  label="Total Credits"
                  reportValue={formatCurrency(reportOutput?.VAR01A0023 || reportOutput?.VAR02A0023 || 0)}
                  statementValue={formatCurrency(statementStats?.totalCredit || 0)}
                  icon={<FaArrowUp className="w-5 h-5" />}
                  color="green"
                  match={Math.abs((reportOutput?.VAR01A0023 || reportOutput?.VAR02A0023 || 0) - (statementStats?.totalCredit || 0)) < 1000}
                />

                {/* Total Debits */}
                <ComparisonCard
                  label="Total Debits"
                  reportValue={formatCurrency(reportOutput?.VAR01A0423 || reportOutput?.VAR02A0423 || 0)}
                  statementValue={formatCurrency(statementStats?.totalDebit || 0)}
                  icon={<FaArrowDown className="w-5 h-5" />}
                  color="red"
                  match={Math.abs((reportOutput?.VAR01A0423 || reportOutput?.VAR02A0423 || 0) - (statementStats?.totalDebit || 0)) < 1000}
                />

                {/* Current Balance */}
                <ComparisonCard
                  label="Current Balance"
                  reportValue="Calculated"
                  statementValue={formatCurrency(statementSummary?.currentBalance || 0)}
                  icon={<FaMoneyBillWave className="w-5 h-5" />}
                  color="purple"
                />
              </div>
            </div>
          )}

          {/* Period Comparison */}
          {(reportProfile || statementAccount?.Transactions) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Report Period */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FaCalendarAlt className="w-4 h-4 text-blue-600" />
                  <h6 className="text-sm font-semibold text-blue-900">Report Analysis Period</h6>
                </div>
                {reportProfile ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Start Date:</span>
                      <span className="font-semibold text-blue-900">{formatDate(reportProfile.minDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">End Date:</span>
                      <span className="font-semibold text-blue-900">{formatDate(reportProfile.maxDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Account Opening:</span>
                      <span className="font-semibold text-blue-900">{formatDate(reportProfile.openingDate)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-blue-700 italic">No period data</p>
                )}
              </div>

              {/* Statement Period */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FaCalendarAlt className="w-4 h-4 text-purple-600" />
                  <h6 className="text-sm font-semibold text-purple-900">Statement Period</h6>
                </div>
                {statementAccount?.Transactions ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-purple-700">Start Date:</span>
                      <span className="font-semibold text-purple-900">
                        {formatDate(statementAccount.Transactions.startDate)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-700">End Date:</span>
                      <span className="font-semibold text-purple-900">
                        {formatDate(statementAccount.Transactions.endDate)}
                      </span>
                    </div>
                    {statementSummary?.openingDate && (
                      <div className="flex justify-between">
                        <span className="text-purple-700">Account Opening:</span>
                        <span className="font-semibold text-purple-900">
                          {formatDate(statementSummary.openingDate)}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-purple-700 italic">No period data</p>
                )}
              </div>
            </div>
          )}

          {/* Account Details */}
          {statementSummary && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                <FaInfoCircle className="w-5 h-5 text-indigo-600" />
                <h5 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                  Statement - Additional Account Information
                </h5>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ComparisonItem label="Account Type" value={`${statementSummary.type} - ${statementSummary.accountType}`} />
                <ComparisonItem label="IFSC Code" value={statementSummary.ifscCode} />
                <ComparisonItem label="Branch" value={statementSummary.branch} />
                <ComparisonItem label="Status" value={statementSummary.status} badge />
              </div>
            </div>
          )}

          {/* Data Consistency Check */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <FaBalanceScale className="w-5 h-5 text-amber-600" />
              <h5 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                Data Consistency Analysis
              </h5>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <ConsistencyCheck
                label="Personal Information"
                match={
                  reportProfile?.name === statementProfile?.name &&
                  reportProfile?.pan === statementProfile?.pan &&
                  reportProfile?.mobile === statementProfile?.mobile
                }
                details="Name, PAN, Mobile verification"
              />
              <ConsistencyCheck
                label="Transaction Volume"
                match={
                  reportOutput &&
                  statementStats &&
                  Math.abs((reportOutput.VAR01A0013 || reportOutput.VAR02A0013) - statementStats.totalTransactions) < 5
                }
                details="Transaction count variance check"
              />
              <ConsistencyCheck
                label="Credit Amount"
                match={
                  reportOutput &&
                  statementStats &&
                  Math.abs((reportOutput.VAR01A0023 || reportOutput.VAR02A0023) - statementStats.totalCredit) < 1000
                }
                details="Total credit amount comparison"
              />
            </div>
          </div>

          {/* Summary Info */}
          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FaInfoCircle className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-cyan-800">
                <p className="font-medium mb-1">Comparison Summary</p>
                <p className="text-xs text-cyan-700">
                  This comparison analyzes data from both the analytical report (processed financial metrics) 
                  and the raw bank statement (transaction-level details). Discrepancies may occur due to 
                  different analysis periods, processing methods, or data sources.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Components
interface ComparisonItemProps {
  label: string;
  value: any;
  badge?: boolean;
}

const ComparisonItem: React.FC<ComparisonItemProps> = ({ label, value, badge }) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
    <span className="text-xs text-gray-600 font-medium">{label}</span>
    {badge ? (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
          value === "YES" || value === "ACTIVE"
            ? "bg-green-100 text-green-800"
            : "bg-gray-100 text-gray-800"
        }`}
      >
        {value || "—"}
      </span>
    ) : (
      <span className="text-xs font-semibold text-gray-900 text-right max-w-[60%] truncate" title={value}>
        {value || "—"}
      </span>
    )}
  </div>
);

interface ComparisonCardProps {
  label: string;
  reportValue: any;
  statementValue: any;
  icon: React.ReactNode;
  color: "blue" | "green" | "red" | "purple";
  match?: boolean;
}

const ComparisonCard: React.FC<ComparisonCardProps> = ({
  label,
  reportValue,
  statementValue,
  icon,
  color,
  match,
}) => {
  const colorClasses = {
    blue: "from-blue-50 to-indigo-50 border-blue-200",
    green: "from-green-50 to-emerald-50 border-green-200",
    red: "from-red-50 to-rose-50 border-red-200",
    purple: "from-purple-50 to-violet-50 border-purple-200",
  };

  const iconColorClasses = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    red: "bg-red-100 text-red-600",
    purple: "bg-purple-100 text-purple-600",
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-lg border p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-2 ${iconColorClasses[color]} rounded-lg`}>{icon}</div>
        {match !== undefined && (
          <div className="ml-auto">
            {match ? (
              <FaCheckCircle className="w-4 h-4 text-green-600" title="Values match" />
            ) : (
              <FaTimesCircle className="w-4 h-4 text-red-600" title="Values differ" />
            )}
          </div>
        )}
      </div>
      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">{label}</p>
      <div className="space-y-1">
        <div className=" flex flex-col  ">
          <span className="text-xs text-gray-600">Report:</span>
          <span className="text-sm  font-bold text-gray-900">{reportValue || "—"}</span>
        </div>
        <div className="flex flex-col  ">
          <span className="text-xs text-gray-600">Statement:</span>
          <span className="text-sm font-bold text-gray-900">{statementValue || "—"}</span>
        </div>
      </div>
    </div>
  );
};

interface ConsistencyCheckProps {
  label: string;
  match: boolean;
  details: string;
}

const ConsistencyCheck: React.FC<ConsistencyCheckProps> = ({ label, match, details }) => (
  <div
    className={`rounded-lg p-4 border-2 ${
      match ? "bg-green-50 border-green-300" : "bg-amber-50 border-amber-300"
    }`}
  >
    <div className="flex items-center gap-2 mb-2">
      {match ? (
        <FaCheckCircle className="w-5 h-5 text-green-600" />
      ) : (
        <FaTimesCircle className="w-5 h-5 text-amber-600" />
      )}
      <h6 className="text-sm font-semibold text-gray-900">{label}</h6>
    </div>
    <p className="text-xs text-gray-600">{details}</p>
    <p className={`text-xs font-medium mt-2 ${match ? "text-green-700" : "text-amber-700"}`}>
      {match ? "✓ Consistent" : "⚠ Review needed"}
    </p>
  </div>
);
