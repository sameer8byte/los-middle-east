import React, { useState, useMemo } from "react";
import {
  FaChevronDown,
  FaChevronUp,
  FaUniversity,
  FaUser,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaExchangeAlt,
  FaChartLine,
  FaArrowUp,
  FaArrowDown,
  FaInfoCircle,
  FaSearch,
  FaTimes,
} from "react-icons/fa";
interface CustomerStatementOverviewProps {
  pdfData?: any;
}

const LISTED_COMPANIES = [
    "Solomon",
  "Konark",
  "Agrim",
  "Sampati",
  "Gagan Metals",
  "Richman",
  "Aman Fincap",
  "Dpal",
  "Pawansut",
  "Naman Finlease",
  "UCA Finvest",
  "Comero Finvest",
  "Raghavi Finance",
  "AGF",
  "Unifinz",
  "RK Bansal",
  "Sawalsha",
  "Sashi Enterprise",
  "Agarwal Assignments",
  "Regency",
  "Tycoon",
  "Girdhar",
  "U.Y. Fincorp",
  "Datta",
  "Goldline",
  "Goodskills",
  "Vaishali",
  "Ayaan Finserv",
  "Mahashakti",
  "TSB",
  "Digner",
  "TBS",
  "Chinmay",
  "Chintamany",
  "Skyrise",
  "Loan 2 grow",
  "Ampire Finance",
  "Kasar",
  "Ramchand",
  "UY Fincorp",
];
export const CustomerStatementOverview: React.FC<
  CustomerStatementOverviewProps
> = ({ pdfData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTransactionType, setSelectedTransactionType] = useState<
    "all" | "credit" | "debit"
  >("all");
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleOpen = () => setIsOpen((prev) => !prev);

  // Check if transaction is from a listed company
  const isFromListedCompany = (narration: string) => {
    if (!narration) return false;
    return LISTED_COMPANIES.some((company: string) =>
      narration.toUpperCase().includes(company.toUpperCase())
    );
  };

  // Filter transactions based on listed companies with specific criteria
  // PHP Logic: Only IMPS credits from listed companies
  const getFilteredListedTransactions = (txns: any[]) => {
    return txns.filter((txn: any) => {
      // Check if narration contains a listed company name
      const isListed = isFromListedCompany(txn.narration);
      if (!isListed) return false;

      const narrationLower = txn.narration?.toLowerCase() || "";
      const modeLower = txn.mode?.toLowerCase() || "";

      // Check if it's IMPS (in narration or mode)
      const isIMPS =
        narrationLower.includes("imps") || modeLower.includes("imps");

      // Check if it's UPI (exclude UPI)
      const isUPI = narrationLower.includes("upi") || modeLower.includes("upi");

      const isCREDIT = txn.type === "CREDIT";

      // Include only IMPS credit transactions, exclude UPI
      if (isIMPS && isCREDIT && !isUPI) return true;

      return false;
    });
  };

  // Parse the JSON data from pdfData
  const parsedData = useMemo(() => {
    try {
      if (typeof pdfData === "string") {
        return JSON.parse(pdfData);
      }
      return pdfData;
    } catch (error) {
      console.error("Error parsing PDF data:", error);
      return null;
    }
  }, [pdfData]);

  const account = parsedData?.Account;
  const profile = account?.Profile?.Holders?.Holder;
  const summary = account?.Summary;
  const transactions = account?.Transactions?.Transaction || [];

  // Calculate transaction statistics
  const stats = useMemo(() => {
    if (!transactions.length) return null;

    const credits = transactions.filter((t: any) => t.type === "CREDIT");
    const debits = transactions.filter((t: any) => t.type === "DEBIT");

    const totalCredit = credits.reduce(
      (sum: number, t: any) => sum + Number.parseFloat(t.amount || 0),
      0
    );
    const totalDebit = debits.reduce(
      (sum: number, t: any) => sum + Number.parseFloat(t.amount || 0),
      0
    );

    // Group by mode
    const modeStats = transactions.reduce((acc: any, t: any) => {
      const mode = t.mode || "OTHERS";
      if (!acc[mode]) {
        acc[mode] = { count: 0, amount: 0 };
      }
      acc[mode].count++;
      acc[mode].amount += Number.parseFloat(t.amount || 0);
      return acc;
    }, {});

    return {
      totalTransactions: transactions.length,
      totalCredit,
      totalDebit,
      creditCount: credits.length,
      debitCount: debits.length,
      avgCredit: credits.length > 0 ? totalCredit / credits.length : 0,
      avgDebit: debits.length > 0 ? totalDebit / debits.length : 0,
      netFlow: totalCredit - totalDebit,
      modeStats,
    };
  }, [transactions]);

  // Format currency
  const formatCurrency = (amount: number | string) => {
    const numAmount =
      typeof amount === "string" ? Number.parseFloat(amount) : amount;
    if (Number.isNaN(numAmount)) return "₹0.00";
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

  // Format date with time
  const formatDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    if (selectedTransactionType !== "all") {
      filtered = transactions.filter(
        (t: any) => t.type?.toLowerCase() === selectedTransactionType
      );
    }
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const queryNumber = Number.parseFloat(query);
      const isNumericQuery = !Number.isNaN(queryNumber);

      filtered = filtered.filter((t: any) => {
        // Text search - narration, mode, transaction ID
        const textMatch =
          t.narration?.toLowerCase().includes(query) ||
          t.mode?.toLowerCase().includes(query) ||
          t.txnId?.toLowerCase().includes(query);

        // Amount search - handle numeric queries more intelligently
        let amountMatch = false;
        if (isNumericQuery) {
          const txnAmount = Number.parseFloat(t.amount || 0);
          // Match if the amount equals the query or starts with the query
          amountMatch =
            txnAmount === queryNumber ||
            t.amount?.toString().startsWith(query) ||
            formatCurrency(txnAmount).toLowerCase().includes(query);
        }

        return textMatch || amountMatch;
      });
    }
    return showAllTransactions ? filtered : filtered.slice(0, 10);
  }, [
    transactions,
    selectedTransactionType,
    showAllTransactions,
    searchQuery,
    formatCurrency,
  ]);

  if (!parsedData || !account) {
    return (
      <div className="w-full mt-4 bg-red-50 rounded-lg border border-red-200 p-5">
        <div className="flex items-center gap-3 text-red-800">
          <FaInfoCircle className="w-5 h-5" />
          <p className="text-sm">Unable to load bank statement data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mt-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
      {/* Header */}
      <button
        onClick={toggleOpen}
        className="w-full cursor-pointer flex items-center justify-between px-5 py-3 rounded-t-lg bg-white hover:bg-gray-50 transition-colors border-b border-gray-200"
        aria-expanded={isOpen}
        aria-controls="customer-statement-overview"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <FaUniversity className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-left">
            <h4 className="text-base font-semibold text-[var(--color-on-background)]">
              Bank Statement Analysis
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Transaction history and account details
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
        <div id="customer-statement-overview" className="p-5 space-y-6">
          {/* Account Holder Info */}
          {profile && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                <FaUser className="w-5 h-5 text-purple-600" />
                <h5 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                  Account Holder Information
                </h5>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoItem label="Name" value={profile.name} />
                <InfoItem label="PAN" value={profile.pan} />
                <InfoItem label="Mobile" value={profile.mobile} />
                <InfoItem label="Email" value={profile.email} />
                <InfoItem label="Date of Birth" value={profile.dob} />
                <InfoItem label="CKYC" value={profile.ckycCompliance} badge />
              </div>
            </div>
          )}

          {/* Account Summary */}
          {summary && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                <FaUniversity className="w-5 h-5 text-blue-600" />
                <h5 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                  Account Details
                </h5>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <InfoItem
                  label="Account Type"
                  value={`${summary.type} - ${summary.accountType}`}
                />
                <InfoItem label="IBAN Code" value={summary.ifscCode} />
                <InfoItem label="Branch" value={summary.branch} />
                <InfoItem label="Status" value={summary.status} badge />
                <InfoItem
                  label="Current Balance"
                  value={formatCurrency(summary.currentBalance)}
                  highlight
                />
                <InfoItem
                  label="Opening Date"
                  value={formatDate(summary.openingDate)}
                />
                <InfoItem label="Currency" value={summary.currency} />
                <InfoItem
                  label="Facility"
                  value={summary.facility?.replaceAll("_", " ")}
                />
              </div>
            </div>
          )}

          {/* Transaction Statistics */}
          {stats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={<FaExchangeAlt className="w-6 h-6" />}
                  label="Total Transactions"
                  value={stats.totalTransactions.toString()}
                  color="blue"
                />
                <StatCard
                  icon={<FaArrowUp className="w-6 h-6" />}
                  label="Total Credits"
                  value={formatCurrency(stats.totalCredit)}
                  subtext={`${stats.creditCount} transactions`}
                  color="green"
                />
                <StatCard
                  icon={<FaArrowDown className="w-6 h-6" />}
                  label="Total Debits"
                  value={formatCurrency(stats.totalDebit)}
                  subtext={`${stats.debitCount} transactions`}
                  color="red"
                />
                <StatCard
                  icon={<FaChartLine className="w-6 h-6" />}
                  label="Net Cash Flow"
                  value={formatCurrency(stats.netFlow)}
                  subtext={stats.netFlow >= 0 ? "Positive" : "Negative"}
                  color={stats.netFlow >= 0 ? "green" : "red"}
                />
              </div>

              {/* Transaction Mode Breakdown */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                  <FaMoneyBillWave className="w-5 h-5 text-orange-600" />
                  <h5 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                    Transaction Mode Analysis
                  </h5>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {Object.entries(stats.modeStats)
                    .sort(([, a]: any, [, b]: any) => b.count - a.count)
                    .map(([mode, data]: [string, any]) => (
                      <div
                        key={mode}
                        className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-3 border border-orange-200"
                      >
                        <p className="text-xs font-medium text-gray-600 mb-1">
                          {mode}
                        </p>
                        <p className="text-lg font-bold text-orange-700 mb-0.5">
                          {data.count}
                        </p>
                        <p className="text-xs text-gray-600">
                          {formatCurrency(data.amount)}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}

          {/* Highlighted Transactions - Table Format */}
          {getFilteredListedTransactions(transactions).length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-yellow-200 p-5 overflow-x-auto">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-yellow-200">
                <div className="flex items-center gap-2">
                  <span className="text-lg">★</span>
                  <h5 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                    Listed Company Transactions
                  </h5>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                  {getFilteredListedTransactions(transactions).length} found
                </span>
              </div>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-yellow-50 border-b border-yellow-200">
                    <th className="border border-yellow-200 px-4 py-2 text-left font-semibold text-gray-700">
                      S.No
                    </th>
                    <th className="border border-yellow-200 px-4 py-2 text-left font-semibold text-gray-700">
                      Date
                    </th>
                    <th className="border border-yellow-200 px-4 py-2 text-left font-semibold text-gray-700">
                      Company
                    </th>
                    <th className="border border-yellow-200 px-4 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">
                      Description
                    </th>
                    <th className="border border-yellow-200 px-4 py-2 text-right font-semibold text-gray-700">
                      Amount
                    </th>
                    <th className="border border-yellow-200 px-4 py-2 text-center font-semibold text-gray-700">
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredListedTransactions(transactions).map(
                    (txn: any, idx: number) => {
                      const matchedCompany = LISTED_COMPANIES.find((company) =>
                        txn.narration
                          ?.toUpperCase()
                          .includes(company.toUpperCase())
                      );
                      const txnDate = formatDate(
                        txn.transactionDate || txn.transactionTimestamp
                      );
                      return (
                        <tr
                          key={`listed-${txn.txnId}-${idx}`}
                          className="border-b border-yellow-100 hover:bg-yellow-50"
                        >
                          <td className="border border-yellow-200 px-4 py-2 text-gray-700">
                            {idx + 1}
                          </td>
                          <td className="border border-yellow-200 px-4 py-2 text-gray-700">
                            {txnDate}
                          </td>
                          <td className="border border-yellow-200 px-4 py-2 text-gray-700 font-medium">
                            {matchedCompany || "—"}
                          </td>
                          <td className="border border-yellow-200 px-4 py-2 text-gray-700 md:break-words max-w-xs">
                            {txn.narration || "—"}
                          </td>
                          <td className="border border-yellow-200 px-4 py-2 text-right text-gray-700 font-semibold">
                            {formatCurrency(txn.amount)}
                          </td>
                          <td className="border border-yellow-200 px-4 py-2 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                                txn.type === "CREDIT"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {txn.type === "CREDIT" ? "Cr" : "Dr"}
                            </span>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Transaction List */}
          {transactions.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <FaCalendarAlt className="w-5 h-5 text-indigo-600" />
                  <h5 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                    Transaction History
                  </h5>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedTransactionType("all")}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      selectedTransactionType === "all"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setSelectedTransactionType("credit")}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      selectedTransactionType === "credit"
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Credits
                  </button>
                  <button
                    onClick={() => setSelectedTransactionType("debit")}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      selectedTransactionType === "debit"
                        ? "bg-red-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Debits
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="mb-4 relative">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by description, mode, ID, or amount (e.g., 5000, BENEFIT Fawri+)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <FaTimes className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {searchQuery && (
                  <p className="text-xs text-gray-500 mt-1.5">
                    Found{" "}
                    <span className="font-semibold text-gray-700">
                      {filteredTransactions.length}
                    </span>{" "}
                    transaction{filteredTransactions.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((txn: any, idx: number) => (
                    <TransactionRow
                      key={`${txn.txnId}-${idx}`}
                      transaction={txn}
                      formatCurrency={formatCurrency}
                      formatDateTime={formatDateTime}
                      isFromListedCompany={isFromListedCompany}
                    />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">
                      No transactions found matching your search.
                    </p>
                  </div>
                )}
              </div>

              {!showAllTransactions &&
                filteredTransactions.length < transactions.length && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => setShowAllTransactions(true)}
                      className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      Show All {transactions.length} Transactions
                    </button>
                  </div>
                )}
            </div>
          )}

          {/* Statement Period Info */}
          {account?.Transactions && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FaInfoCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Statement Period</p>
                  <p className="text-xs text-blue-700">
                    This statement covers transactions from{" "}
                    <span className="font-semibold">
                      {formatDate(account.Transactions.startDate)}
                    </span>{" "}
                    to{" "}
                    <span className="font-semibold">
                      {formatDate(account.Transactions.endDate)}
                    </span>
                    , showing {transactions.length} total transactions with a
                    current balance of{" "}
                    <span className="font-semibold">
                      {formatCurrency(summary?.currentBalance || 0)}
                    </span>
                    .
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper Components
interface InfoItemProps {
  label: string;
  value: any;
  badge?: boolean;
  highlight?: boolean;
}

const InfoItem: React.FC<InfoItemProps> = ({
  label,
  value,
  badge,
  highlight,
}) => {
  let displayValue;

  if (badge) {
    displayValue = (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
          value === "YES" || value === "ACTIVE"
            ? "bg-green-100 text-green-800"
            : "bg-gray-100 text-gray-800"
        }`}
      >
        {value || "—"}
      </span>
    );
  } else if (highlight) {
    displayValue = (
      <p className="text-lg font-bold text-green-700">{value || "—"}</p>
    );
  } else {
    displayValue = (
      <p className="text-sm font-medium text-gray-900">{value || "—"}</p>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
        {label}
      </p>
      {displayValue}
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  color: "green" | "blue" | "purple" | "red" | "orange";
}

const StatCard: React.FC<StatCardProps> = ({
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
    orange: "from-orange-50 to-amber-50 border-orange-200 text-orange-700",
  };

  const iconColorClasses = {
    green: "bg-green-100 text-green-600",
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
    red: "bg-red-100 text-red-600",
    orange: "bg-orange-100 text-orange-600",
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
        className={`text-2xl md:text-lg font-bold ${colorClasses[color]} mb-1`}
      >
        {value}
      </p>
      {subtext && <p className="text-xs text-gray-600 mt-1">{subtext}</p>}
    </div>
  );
};

interface TransactionRowProps {
  transaction: any;
  formatCurrency: (amount: number | string) => string;
  formatDateTime: (dateStr: string) => string;
  isFromListedCompany: (narration: string) => boolean;
}

const TransactionRow: React.FC<TransactionRowProps> = ({
  transaction,
  formatCurrency,
  formatDateTime,
  isFromListedCompany,
}) => {
  const isCredit = transaction.type === "CREDIT";
  const isListed = isFromListedCompany(transaction.narration);

  const getRowStyles = () => {
    if (isListed) return "bg-yellow-50 border-yellow-300 hover:bg-yellow-100";
    return isCredit
      ? "bg-green-50 border-green-200 hover:bg-green-100"
      : "bg-red-50 border-red-200 hover:bg-red-100";
  };

  return (
    <div
      className={`flex items-start justify-between p-3 rounded-lg border ${getRowStyles()} transition-colors`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {isListed && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-200 text-yellow-900">
              ★ Listed
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
              isCredit
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {isCredit ? (
              <FaArrowUp className="w-2.5 h-2.5" />
            ) : (
              <FaArrowDown className="w-2.5 h-2.5" />
            )}
            {transaction.type}
          </span>
          <span className="text-xs px-2 py-0.5 bg-white rounded text-gray-600 font-medium">
            {transaction.mode}
          </span>
        </div>
        <p className="text-sm text-gray-900 font-medium mb-1 truncate">
          {transaction.narration || "No description"}
        </p>
        <div className="flex items-center gap-3 text-xs text-gray-600">
          <span>ID: {transaction.txnId}</span>
          <span>•</span>
          <span>{formatDateTime(transaction.transactionTimestamp)}</span>
        </div>
      </div>
      <div className="text-right ml-4 flex-shrink-0">
        <p className={`text-lg font-bold ${getAmountColorClass()}`}>
          {isCredit ? "+" : "-"}
          {formatCurrency(transaction.amount)}
        </p>
        <p className="text-xs text-gray-600 mt-1">
          Bal: {formatCurrency(transaction.currentBalance)}
        </p>
      </div>
    </div>
  );

  function getAmountColorClass() {
    if (isListed) return "text-yellow-700";
    return isCredit ? "text-green-700" : "text-red-700";
  }
};
