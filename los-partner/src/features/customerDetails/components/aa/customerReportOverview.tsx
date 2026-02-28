import React, { useState, useMemo } from "react";
import {
  FaChevronDown,
  FaChevronUp,
  FaUser,
  FaUniversity,
  FaCalendarAlt,
  FaChartLine,
  FaMoneyBillWave,
  FaExclamationTriangle,
  FaInfoCircle,
  FaHandHoldingUsd,
  FaCreditCard,
} from "react-icons/fa";

interface CustomerFinancialOverviewProps {
  jsonData: any;
}

export const CustomerReportOverview: React.FC<
  CustomerFinancialOverviewProps
> = ({ jsonData }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => setIsOpen((prev) => !prev);

  const parsedData = useMemo(() => {
    try {
      if (typeof jsonData === "string") {
        return JSON.parse(jsonData);
      }
      return jsonData;
    } catch (error) {
      console.error("Error parsing JSON data:", error);
      return null;
    }
  }, [jsonData]);

  const custProfile = parsedData?.custProfile;
  const finalOutput = parsedData?.finalOutput?.overall;
  const salaryCredits = finalOutput?.VAR01A0321 || {};
  const loanDisbursements = finalOutput?.VAR01AAI21 || {}; 
  const emiPaid = finalOutput?.VAR02A0421 || {};
  const creditCardPayments = finalOutput?.VAR02A1221 || {};
  const rentPaid = finalOutput?.VAR02A0521 || {};
  const travelPaid = finalOutput?.VAR02A1121 || {};
  const shoppingPaid = finalOutput?.VAR02A0621 || {};
  const investmentPaid = finalOutput?.VAR02A0821 || {};
  const utilityPaid = finalOutput?.VAR02A0721 || {};
  const insurancePaid = finalOutput?.VAR02A1421 || {};
  const healthPremiumPaid = finalOutput?.VAR02A1521 || {};
  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return "—";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(Math.round(numAmount));
  };

  const formatNumber = (num: number | string) => {
    const numValue = typeof num === "string" ? parseFloat(num) : num;
    if (isNaN(numValue)) return "—";
    return numValue.toLocaleString("en-IN");
  };
  const monthlyBreakdown = useMemo(() => {
    const allMonths = new Set([
      ...Object.keys(salaryCredits),
      ...Object.keys(loanDisbursements),
      ...Object.keys(emiPaid),
      ...Object.keys(creditCardPayments),
      ...Object.keys(rentPaid),
      ...Object.keys(travelPaid),
      ...Object.keys(shoppingPaid),
      ...Object.keys(investmentPaid),
      ...Object.keys(utilityPaid),
      ...Object.keys(insurancePaid),
      ...Object.keys(healthPremiumPaid),
    ]);

    return Array.from(allMonths)
      .sort((a, b) => b.localeCompare(a))
      .map((month) => {
        const salary = salaryCredits[month] || 0;
        const loans = loanDisbursements[month] || 0;
        const emi = emiPaid[month] || 0;
        const creditCard = creditCardPayments[month] || 0;
        const rent = rentPaid[month] || 0;
        const travel = travelPaid[month] || 0;
        const shopping = shoppingPaid[month] || 0;
        const investment = investmentPaid[month] || 0;
        const utility = utilityPaid[month] || 0;
        const insurance = insurancePaid[month] || 0;
        const healthPremium = healthPremiumPaid[month] || 0;
        const others = investment + utility + insurance + healthPremium;
        return {
          month,
          salaryCredits: salary,
          loansTaken: loans,
          emiPaid: emi,
          creditCardPayments: creditCard,
          rentPaid: rent,
          travelPaid: travel,
          shoppingPaid: shopping,
          othersPaid: others,
          remaining: salary + loans - emi - creditCard - rent - travel - shopping - others,
        };
      });
  }, [salaryCredits, loanDisbursements, emiPaid, creditCardPayments, rentPaid, travelPaid, shoppingPaid, investmentPaid, utilityPaid, insurancePaid, healthPremiumPaid]);

  // Get total credits
  const totalCredits = finalOutput?.VAR01A0023 || 0;
  const avgMonthlyCredits = finalOutput?.VAR01A0033 || 0;

  // Get transaction counts
  const totalTransactions = finalOutput?.VAR01A0013 || 0;
  const totalDebitTransactions = finalOutput?.VAR01A0413 || 0;

  // Get EMI/recurring payment data
  const emiCount = finalOutput?.VAR01A0313 || 0;
  const totalEmiAmount = finalOutput?.VAR01A0323 || 0;

  // Get bounce/penalty data
  const bounceCount = finalOutput?.VAR01A1013 || 0;
  const bounceAmount = finalOutput?.VAR01A1023 || 0;

  // Financial health indicators
  const debitRatio =
    totalTransactions > 0
      ? ((totalDebitTransactions / totalTransactions) * 100).toFixed(1)
      : "0";

  return (
    <div className="w-full mt-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
      {/* Dropdown Header */}
      <button
        onClick={toggleOpen}
        className="w-full cursor-pointer flex items-center justify-between px-5 py-3 rounded-t-lg bg-white hover:bg-gray-50 transition-colors border-b border-gray-200"
        aria-expanded={isOpen}
        aria-controls="customer-financial-overview"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FaChartLine className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-left">
            <h4 className="text-base font-semibold text-[var(--color-on-background)]">
              Financial Analysis Report
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Comprehensive banking behavior insights
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

      {/* Collapsible Panel Content */}
      {isOpen && (
        <div id="customer-financial-overview" className="p-5 space-y-6">
          {/* Customer Profile Section */}
          {custProfile && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                <FaUser className="w-5 h-5 text-blue-600" />
                <h5 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                  Customer Profile
                </h5>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <DataItem label="Name" value={custProfile.name} />
                <DataItem label="PAN" value={custProfile.pan} />
                <DataItem label="Mobile" value={custProfile.mobile} />
                <DataItem label="Email" value={custProfile.email} />
                <DataItem label="Date of Birth" value={custProfile.dob} />
                <DataItem
                  label="CKYC Compliance"
                  value={custProfile.ckycCompliance}
                  badge
                />
                <DataItem
                  label="Holding Nature"
                  value={custProfile.holdingNature}
                />
                <DataItem
                  label="Number of Banks"
                  value={custProfile.numberOfBanks}
                />
                <DataItem
                  label="Number of Accounts"
                  value={custProfile.numberOfAccounts}
                />
              </div>
            </div>
          )}

          {/* Key Financial Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={<FaMoneyBillWave className="w-6 h-6" />}
              label="Total Credits"
              value={formatCurrency(totalCredits)}
              subtext={`Avg: ${formatCurrency(avgMonthlyCredits)}/month`}
              color="green"
            />
            <MetricCard
              icon={<FaChartLine className="w-6 h-6" />}
              label="Total Transactions"
              value={formatNumber(totalTransactions)}
              subtext={`${debitRatio}% debits`}
              color="blue"
            />
            <MetricCard
              icon={<FaCalendarAlt className="w-6 h-6" />}
              label="EMI Payments"
              value={formatNumber(emiCount)}
              subtext={formatCurrency(totalEmiAmount)}
              color="purple"
            />
            <MetricCard
              icon={<FaExclamationTriangle className="w-6 h-6" />}
              label="Bounces/Penalties"
              value={formatNumber(bounceCount)}
              subtext={formatCurrency(bounceAmount)}
              color="red"
            />
          </div>

          {/* Monthly Financial Breakdown */}
          {monthlyBreakdown.length > 0 && (
            <>
              {/* Section 1: Monthly Salary Credits */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                {/* Detailed Monthly Breakdown Table with Dropdown */}
                <DetailedMonthlyBreakdownTable
                  monthlyData={monthlyBreakdown}
                  formatCurrency={formatCurrency}
                />
                <div className="flex items-center gap-2 mb-3 mt-4">
                  <FaMoneyBillWave className="w-5 h-5 text-green-600" />
                  <h5 className="text-sm font-semibold text-gray-800">
                    Monthly Salary Credits
                  </h5>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {monthlyBreakdown.map(({ month, salaryCredits }) => (
                    <div
                      key={`salary-${month}`}
                      className="bg-white rounded p-2 border border-green-100"
                    >
                      <div className="text-xs text-gray-600 mb-1">{month}</div>
                      <div
                        className={`text-sm font-semibold ${salaryCredits > 0 ? "text-green-700" : "text-gray-400"}`}
                      >
                        {salaryCredits > 0
                          ? formatCurrency(salaryCredits)
                          : "Not Received"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Monthly Loans Taken */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <FaHandHoldingUsd className="w-5 h-5 text-blue-600" />
                  <h5 className="text-sm font-semibold text-gray-800">
                    Monthly Loans Taken
                  </h5>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {monthlyBreakdown.map(({ month, loansTaken }) => (
                    <div
                      key={`loan-${month}`}
                      className="bg-white rounded p-2 border border-blue-100"
                    >
                      <div className="text-xs text-gray-600 mb-1">{month}</div>
                      {loansTaken > 0 ? (
                        <div className="text-sm font-semibold text-blue-700">
                          {formatCurrency(loansTaken)}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400">No loans</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Monthly Loan Repayments */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-200">
                <div className="flex items-center gap-2 mb-3">
                  <FaCreditCard className="w-5 h-5 text-orange-600" />
                  <h5 className="text-sm font-semibold text-gray-800">
                    Monthly Loan Repayments (EMIs & Debits)
                  </h5>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {monthlyBreakdown.map(({ month, emiPaid }) => (
                    <div
                      key={`repay-${month}`}
                      className="bg-white rounded p-2 border border-orange-100"
                    >
                      <div className="text-xs text-gray-600 mb-1">{month}</div>
                      <div
                        className={`text-sm font-semibold ${emiPaid > 0 ? "text-orange-700" : "text-gray-400"}`}
                      >
                        {emiPaid > 0 ? formatCurrency(emiPaid) : "No payments"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Transaction Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Credit Analysis */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                <FaChartLine className="w-5 h-5 text-blue-600" />
                <h5 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                  Credit Analysis
                </h5>
              </div>
              <div className="space-y-3">
                <DetailRow
                  label="Total Credit Transactions"
                  value={formatNumber(totalTransactions)}
                />
                <DetailRow
                  label="Total Credit Amount"
                  value={formatCurrency(totalCredits)}
                />
                <DetailRow
                  label="Average Monthly Credit"
                  value={formatCurrency(avgMonthlyCredits)}
                />
                <DetailRow
                  label="Highest Monthly Credit"
                  value={formatCurrency(finalOutput?.VAR01A0053 || 0)}
                />
                <DetailRow
                  label="Minimum Credit Amount"
                  value={formatCurrency(finalOutput?.VAR01A0043 || 0)}
                />
              </div>
            </div>

            {/* Debit Analysis */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                <FaMoneyBillWave className="w-5 h-5 text-orange-600" />
                <h5 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                  Debit Analysis
                </h5>
              </div>
              <div className="space-y-3">
                <DetailRow
                  label="Total Debit Transactions"
                  value={formatNumber(totalDebitTransactions)}
                />
                <DetailRow
                  label="Total Debit Amount"
                  value={formatCurrency(finalOutput?.VAR01A0423 || 0)}
                />
                <DetailRow
                  label="Average Monthly Debit"
                  value={formatCurrency(finalOutput?.VAR01A0433 || 0)}
                />
                <DetailRow
                  label="Large Debits (>50K)"
                  value={formatNumber(finalOutput?.VAR01A0413 || 0)}
                />
              </div>
            </div>
          </div>

          {/* EMI & Recurring Payments */}
          {emiCount > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                <FaUniversity className="w-5 h-5 text-purple-600" />
                <h5 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                  EMI & Recurring Payments
                </h5>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <DetailRow
                  label="Total EMI Count"
                  value={formatNumber(emiCount)}
                />
                <DetailRow
                  label="Total EMI Amount"
                  value={formatCurrency(totalEmiAmount)}
                />
                <DetailRow
                  label="Average EMI"
                  value={formatCurrency(finalOutput?.VAR01A0333 || 0)}
                />
              </div>
            </div>
          )}

          {/* Risk Indicators */}
          {(bounceCount > 0 || bounceAmount > 0) && (
            <div className="bg-red-50 rounded-lg shadow-sm border border-red-200 p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-red-300">
                <FaExclamationTriangle className="w-5 h-5 text-red-600" />
                <h5 className="text-sm font-semibold text-red-800 uppercase tracking-wide">
                  Risk Indicators
                </h5>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <DetailRow
                  label="Bounce Count"
                  value={formatNumber(bounceCount)}
                  alert
                />
                <DetailRow
                  label="Total Penalty Amount"
                  value={formatCurrency(bounceAmount)}
                  alert
                />
                <DetailRow
                  label="Average Penalty"
                  value={
                    bounceAmount && bounceCount
                      ? formatCurrency(bounceAmount / bounceCount)
                      : "—"
                  }
                  alert
                />
              </div>
            </div>
          )}
          {/* Additional Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FaInfoCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Report Summary</p>
                <p className="text-xs text-blue-700">
                  This financial analysis is based on{" "}
                  {custProfile?.numberOfBanks || "available"} bank account(s)
                  over a period from {custProfile?.minDate} to{" "}
                  {custProfile?.maxDate}. Data includes transaction patterns,
                  EMI obligations, and risk indicators.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Component definitions
interface DataItemProps {
  label: string;
  value: any;
  badge?: boolean;
}

const DataItem: React.FC<DataItemProps> = ({ label, value, badge }) => (
  <div className="space-y-1">
    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
      {label}
    </p>
    {badge ? (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
          value === "YES"
            ? "bg-green-100 text-green-800"
            : "bg-gray-100 text-gray-800"
        }`}
      >
        {value || "—"}
      </span>
    ) : (
      <p className="text-sm font-medium text-gray-900">{value || "—"}</p>
    )}
  </div>
);

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  color: "green" | "blue" | "purple" | "red";
}

const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  label,
  value,
  subtext,
  color,
}) => {
  const colorClasses = {
    green: "from-green-50 to-emerald-50 border-green-200 text-green-700",
    blue: "from-blue-50 to-indigo-50 border-blue-200 text-blue-700",
    purple: "from-purple-50 to-violet-50 border-purple-200 text-purple-700",
    red: "from-red-50 to-rose-50 border-red-200 text-red-700",
  };

  const iconColorClasses = {
    green: "bg-green-100 text-green-600",
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
    red: "bg-red-100 text-red-600",
  };

  return (
    <div
      className={`bg-gradient-to-br ${colorClasses[color]} rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 ${iconColorClasses[color]} rounded-lg`}>
          {icon}
        </div>
      </div>
      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p
        className={`text-2xl md:text-sm font-bold ${colorClasses[color]} mb-1`}
      >
        {value}
      </p>
      {subtext && <p className="text-xs text-gray-600 mt-1">{subtext}</p>}
    </div>
  );
};

interface DetailRowProps {
  label: string;
  value: string;
  alert?: boolean;
  icon?: React.ReactNode;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, alert, icon }) => (
  <div className="flex justify-between items-center py-2 px-3 bg-white rounded border border-gray-100 last:border-0">
    <div className="flex items-center gap-2">
      {icon && <div className="flex-shrink-0">{icon}</div>}
      <span
        className={`text-sm ${alert ? "text-red-700" : "text-gray-600"} font-medium`}
      >
        {label}
      </span>
    </div>
    <span
      className={`text-sm ${alert ? "text-red-800 font-semibold" : "text-gray-900 font-semibold"}`}
    >
      {value}
    </span>
  </div>
);

interface DetailedMonthlyBreakdownTableProps {
  monthlyData: Array<{
    month: string;
    salaryCredits: number;
    loansTaken: number;
    emiPaid: number;
    creditCardPayments: number;
    rentPaid: number;
    travelPaid: number;
    shoppingPaid: number;
    othersPaid: number;
    remaining: number;
  }>;
  formatCurrency: (amount: number | string) => string;
}

const DetailedMonthlyBreakdownTable: React.FC<
  DetailedMonthlyBreakdownTableProps
> = ({ monthlyData, formatCurrency }) => {
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
        <FaCalendarAlt className="w-5 h-5 text-indigo-600" />
        <h5 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
          Detailed Monthly Breakdown & Transactions
        </h5>
      </div>

      <div className="hidden md:block relative overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="sticky left-0 z-20 bg-gray-50 px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                Month
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-green-600 uppercase tracking-wide whitespace-nowrap">
                💰 Salary
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-blue-600 uppercase tracking-wide whitespace-nowrap">
                🏦 Loans
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-orange-600 uppercase tracking-wide whitespace-nowrap">
                💳 EMI
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-pink-600 uppercase tracking-wide whitespace-nowrap">
                💳 Credit Card
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-indigo-600 uppercase tracking-wide whitespace-nowrap">
                🏠 Rent
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-cyan-600 uppercase tracking-wide whitespace-nowrap">
                ✈️ Travel
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-amber-600 uppercase tracking-wide whitespace-nowrap">
                🛍️ Shopping
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">
                📋 Others
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-purple-600 uppercase tracking-wide whitespace-nowrap">
                💵 Remaining
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {monthlyData.map((data) => (
              <tr key={data.month} className="hover:bg-gray-50 transition-colors">
                <td className="sticky left-0 z-10 bg-white px-3 py-3 text-sm font-medium text-gray-900 border-r border-gray-200 whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-gray-50">
                  {data.month}
                </td>
                <td className={`px-3 py-3 text-sm font-semibold whitespace-nowrap text-right ${data.salaryCredits > 0 ? "text-green-700" : "text-gray-400"}`}>
                  {data.salaryCredits > 0 ? formatCurrency(data.salaryCredits) : "—"}
                </td>
                <td className={`px-3 py-3 text-sm font-semibold whitespace-nowrap text-right ${data.loansTaken > 0 ? "text-blue-700" : "text-gray-400"}`}>
                  {data.loansTaken > 0 ? formatCurrency(data.loansTaken) : "—"}
                </td>
                <td className={`px-3 py-3 text-sm font-semibold whitespace-nowrap text-right ${data.emiPaid > 0 ? "text-orange-700" : "text-gray-400"}`}>
                  {data.emiPaid > 0 ? formatCurrency(data.emiPaid) : "—"}
                </td>
                <td className={`px-3 py-3 text-sm font-semibold whitespace-nowrap text-right ${data.creditCardPayments > 0 ? "text-pink-700" : "text-gray-400"}`}>
                  {data.creditCardPayments > 0 ? formatCurrency(data.creditCardPayments) : "—"}
                </td>
                <td className={`px-3 py-3 text-sm font-semibold whitespace-nowrap text-right ${data.rentPaid > 0 ? "text-indigo-700" : "text-gray-400"}`}>
                  {data.rentPaid > 0 ? formatCurrency(data.rentPaid) : "—"}
                </td>
                <td className={`px-3 py-3 text-sm font-semibold whitespace-nowrap text-right ${data.travelPaid > 0 ? "text-cyan-700" : "text-gray-400"}`}>
                  {data.travelPaid > 0 ? formatCurrency(data.travelPaid) : "—"}
                </td>
                <td className={`px-3 py-3 text-sm font-semibold whitespace-nowrap text-right ${data.shoppingPaid > 0 ? "text-amber-700" : "text-gray-400"}`}>
                  {data.shoppingPaid > 0 ? formatCurrency(data.shoppingPaid) : "—"}
                </td>
                <td className={`px-3 py-3 text-sm font-semibold whitespace-nowrap text-right ${data.othersPaid > 0 ? "text-gray-700" : "text-gray-400"}`}>
                  {data.othersPaid > 0 ? formatCurrency(data.othersPaid) : "—"}
                </td>
                <td className={`px-3 py-3 text-sm font-bold whitespace-nowrap text-right ${data.remaining >= 0 ? "text-purple-700 bg-purple-50" : "text-red-600 bg-red-50"}`}>
                  {formatCurrency(data.remaining)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {monthlyData.map((data) => (
          <div key={data.month} className="border border-gray-200 rounded-lg overflow-hidden">
           
            <button
              onClick={() => setExpandedMonth(expandedMonth === data.month ? null : data.month)}
              className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-900">{data.month}</span>
                  <span className={`text-sm font-bold ${data.remaining >= 0 ? "text-purple-700" : "text-red-600"}`}>
                    {formatCurrency(data.remaining)}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span>💰 {data.salaryCredits > 0 ? formatCurrency(data.salaryCredits) : "—"}</span>
                  <span>🏦 {data.loansTaken > 0 ? formatCurrency(data.loansTaken) : "—"}</span>
                </div>
              </div>
              <div className="ml-3">
                {expandedMonth === data.month ? (
                  <FaChevronUp className="w-4 h-4 text-gray-600" />
                ) : (
                  <FaChevronDown className="w-4 h-4 text-gray-600" />
                )}
              </div>
            </button>

            {expandedMonth === data.month && (
              <div className="px-4 py-3 bg-white space-y-2 border-t border-gray-200">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-xs text-gray-600 flex items-center gap-2">
                    <span>💰</span> Salary Credits
                  </span>
                  <span className={`text-sm font-semibold ${data.salaryCredits > 0 ? "text-green-700" : "text-gray-400"}`}>
                    {data.salaryCredits > 0 ? formatCurrency(data.salaryCredits) : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-xs text-gray-600 flex items-center gap-2">
                    <span>🏦</span> Loans Taken
                  </span>
                  <span className={`text-sm font-semibold ${data.loansTaken > 0 ? "text-blue-700" : "text-gray-400"}`}>
                    {data.loansTaken > 0 ? formatCurrency(data.loansTaken) : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-xs text-gray-600 flex items-center gap-2">
                    <span>💳</span> EMI Paid
                  </span>
                  <span className={`text-sm font-semibold ${data.emiPaid > 0 ? "text-orange-700" : "text-gray-400"}`}>
                    {data.emiPaid > 0 ? formatCurrency(data.emiPaid) : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-xs text-gray-600 flex items-center gap-2">
                    <span>💳</span> Credit Card
                  </span>
                  <span className={`text-sm font-semibold ${data.creditCardPayments > 0 ? "text-pink-700" : "text-gray-400"}`}>
                    {data.creditCardPayments > 0 ? formatCurrency(data.creditCardPayments) : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-xs text-gray-600 flex items-center gap-2">
                    <span>🏠</span> Rent Paid
                  </span>
                  <span className={`text-sm font-semibold ${data.rentPaid > 0 ? "text-indigo-700" : "text-gray-400"}`}>
                    {data.rentPaid > 0 ? formatCurrency(data.rentPaid) : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-xs text-gray-600 flex items-center gap-2">
                    <span>✈️</span> Travel
                  </span>
                  <span className={`text-sm font-semibold ${data.travelPaid > 0 ? "text-cyan-700" : "text-gray-400"}`}>
                    {data.travelPaid > 0 ? formatCurrency(data.travelPaid) : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-xs text-gray-600 flex items-center gap-2">
                    <span>🛍️</span> Shopping
                  </span>
                  <span className={`text-sm font-semibold ${data.shoppingPaid > 0 ? "text-amber-700" : "text-gray-400"}`}>
                    {data.shoppingPaid > 0 ? formatCurrency(data.shoppingPaid) : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-xs text-gray-600 flex items-center gap-2">
                    <span>📋</span> Others
                  </span>
                  <span className={`text-sm font-semibold ${data.othersPaid > 0 ? "text-gray-700" : "text-gray-400"}`}>
                    {data.othersPaid > 0 ? formatCurrency(data.othersPaid) : "—"}
                  </span>
                </div>
                <div className={`flex justify-between items-center py-2 px-3 rounded-lg mt-2 ${data.remaining >= 0 ? "bg-purple-50" : "bg-red-50"}`}>
                  <span className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                    <span>💵</span> Remaining Balance
                  </span>
                  <span className={`text-base font-bold ${data.remaining >= 0 ? "text-purple-700" : "text-red-600"}`}>
                    {formatCurrency(data.remaining)}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
