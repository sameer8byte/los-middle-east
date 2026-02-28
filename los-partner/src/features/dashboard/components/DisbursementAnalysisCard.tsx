import React, { useState } from "react";
import { DisbursementAnalysisResponse } from "../types/dashboard.types";

// Utility functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-IN').format(num);
};

interface DisbursementAnalysisCardProps {
  data: DisbursementAnalysisResponse | null;
  loading: boolean;
  error: string | null;
  onLoanFilterChange?: (filter: 'new' | 'repeat' | 'both') => void;
  currentLoanFilter?: 'new' | 'repeat' | 'both';
}

export const DisbursementAnalysisCard: React.FC<DisbursementAnalysisCardProps> = ({
  data,
  loading,
  error,
  onLoanFilterChange,
  currentLoanFilter = 'both',
}) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedExecutive, setExpandedExecutive] = useState<string | null>(null);

  // Handler for loan filter change
  const handleLoanFilterChange = (filter: 'new' | 'repeat' | 'both') => {
    if (onLoanFilterChange) {
      onLoanFilterChange(filter);
    }
  };

  // Function to get filter button style
  const getFilterButtonStyle = (filterType: string) => {
    const isActive = currentLoanFilter === filterType;
    switch(filterType) {
      case 'new':
        return isActive 
          ? 'bg-blue-600 text-white border-blue-600' 
          : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50';
      case 'repeat':
        return isActive 
          ? 'bg-green-600 text-white border-green-600' 
          : 'bg-white text-green-600 border-green-300 hover:bg-green-50';
      case 'both':
        return isActive 
          ? 'bg-gray-700 text-white border-gray-700' 
          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50';
      default:
        return isActive 
          ? 'bg-gray-700 text-white border-gray-700' 
          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Disbursement Analysis</h3>
        <div className="text-center py-6 text-gray-500">
          {error || "No data available"}
        </div>
      </div>
    );
  }

  const tabCategories = [
    { name: "Overview", id: "overview" },
    { name: "Daily Performance", id: "daily-performance", count: data.dailyPerformance?.length || 0 },
    { name: "By Date", id: "by-date", count: data.disbursementByDate?.length || 0 },
    { name: "By Status", id: "by-status", count: data.disbursementByStatus?.length || 0 },
    { name: "By Type", id: "by-type", count: data.disbursementByType?.length || 0 },
    { name: "By State", id: "by-state", count: data.disbursementByState?.length || 0 },
    { name: "By Executive", id: "by-executive", count: data.disbursementByExecutive?.length || 0 },
    { name: "All Loans", id: "all-loans", count: data.disbursementByDate?.reduce((sum, m) => sum + (m.loans?.length || 0), 0) || 0 },
    { name: "Performance", id: "performance" },
  ];

  const renderSummaryStats = () => (
    <div className="space-y-2">
      {/* Top Row - Primary Stats (Compact) */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-green-50 p-3 rounded border border-green-100">
          <div className="text-xs text-green-600 font-medium uppercase tracking-tight">Total Disburse</div>
          <div className="text-xl font-bold text-green-900">{formatNumber(data.summary.totalDisbursements)}</div>
        </div>
        <div className="bg-blue-50 p-3 rounded border border-blue-100">
          <div className="text-xs text-blue-600 font-medium uppercase tracking-tight">Total Amount</div>
          <div className="text-xl font-bold text-blue-900">{formatCurrency(data.summary.totalAmount)}</div>
        </div>
        <div className="bg-purple-50 p-3 rounded border border-purple-100">
          <div className="text-xs text-purple-600 font-medium uppercase tracking-tight">Avg Amount</div>
          <div className="text-xl font-bold text-purple-900">{formatCurrency(data.summary.averageAmount)}</div>
        </div>
      </div>

      {/* Secondary Stats (Compact) */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-indigo-50 p-2 rounded border border-indigo-100 text-center">
          <div className="text-xs text-indigo-600 font-medium">Statuses</div>
          <div className="text-lg font-bold text-indigo-900">{data.disbursementByStatus?.length || 0}</div>
        </div>
        <div className="bg-amber-50 p-2 rounded border border-amber-100 text-center">
          <div className="text-xs text-amber-600 font-medium">Types</div>
          <div className="text-lg font-bold text-amber-900">{data.disbursementByType?.length || 0}</div>
        </div>
        <div className="bg-rose-50 p-2 rounded border border-rose-100 text-center">
          <div className="text-xs text-rose-600 font-medium">States</div>
          <div className="text-lg font-bold text-rose-900">{data.disbursementByState?.length || 0}</div>
        </div>
        <div className="bg-cyan-50 p-2 rounded border border-cyan-100 text-center">
          <div className="text-xs text-cyan-600 font-medium">Execs</div>
          <div className="text-lg font-bold text-cyan-900">{data.disbursementByExecutive?.length || 0}</div>
        </div>
      </div>
    </div>
  );

  const renderDailyPerformance = () => {
    // Check if dailyPerformance data exists
    if (!data.dailyPerformance || data.dailyPerformance.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No daily performance data available
        </div>
      );
    }

    const formatDate = (dateString: string): string => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // Get dynamic title based on period
    const getTitleText = (): string => {
      const period = data.dateRange.period;
      
      switch(period) {
        case 'today':
          return "Today's Performance";
        case 'yesterday':
          return "Yesterday's Performance";
        case 'week':
          return "Last 7 Days Performance";
        case 'month':
          return "Last 30 Days Performance";
        case 'year':
          return "Last Year Performance";
        case 'custom':
          return "Custom Period Performance";
        default:
          if (!data.dailyPerformance || data.dailyPerformance.length === 0) return "Daily Performance";
          const startDate = new Date(data.dailyPerformance[0].date);
          return `${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Daily Performance`;
      }
    };

    // Calculate totals based on current filter
    const totals = data.dailyPerformance.reduce((acc, day) => ({
      newCase: currentLoanFilter === 'repeat' ? 0 : acc.newCase + day.newCase,
      repeatCases: currentLoanFilter === 'new' ? 0 : acc.repeatCases + day.repeatCases,
      totalCases: currentLoanFilter === 'new' ? acc.totalCases + day.newCase : 
                  currentLoanFilter === 'repeat' ? acc.totalCases + day.repeatCases :
                  acc.totalCases + day.totalCases,
      loanAmount: acc.loanAmount + day.loanAmount,
      pfAmount: acc.pfAmount + day.pfAmount,
      disbursalAmount: acc.disbursalAmount + day.disbursalAmount,
      repayAmount: acc.repayAmount + day.repayAmount
    }), {
      newCase: 0,
      repeatCases: 0,
      totalCases: 0,
      loanAmount: 0,
      pfAmount: 0,
      disbursalAmount: 0,
      repayAmount: 0
    });

    return (
      <div className="space-y-3">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-bold text-gray-900">{getTitleText()}</h4>
        </div>

        {/* Summary Cards - Compact */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200 p-2 rounded">
            <div className="text-xs text-pink-600 font-medium">Total Cases</div>
            <div className="text-xl font-bold text-pink-900">{formatNumber(totals.totalCases)}</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-2 rounded">
            <div className="text-xs text-blue-600 font-medium">Loan Amount</div>
            <div className="text-lg font-bold text-blue-900">{formatCurrency(totals.loanAmount)}</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 p-2 rounded">
            <div className="text-xs text-green-600 font-medium">Disbursal</div>
            <div className="text-lg font-bold text-green-900">{formatCurrency(totals.disbursalAmount)}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 p-2 rounded">
            <div className="text-xs text-purple-600 font-medium">Repay</div>
            <div className="text-lg font-bold text-purple-900">{formatCurrency(totals.repayAmount)}</div>
          </div>
        </div>

        {/* Main Table */}
        <div className="overflow-x-auto border border-gray-300 rounded-lg shadow-sm">
          {/* vertical scroll container: body scrolls, header/footer stay visible via sticky */}
          <div className="max-h-72 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-300">
              {/* Header */}
              <thead className="bg-gradient-to-r from-pink-100 to-pink-50 sticky top-0 z-20">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-800 uppercase tracking-tight border-r border-gray-300">
                    Date
                  </th>
                  {currentLoanFilter !== 'repeat' && (
                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-tight border-r border-gray-300">
                      New Case
                    </th>
                  )}
                  {currentLoanFilter !== 'new' && (
                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-tight border-r border-gray-300">
                      Repeat Cases
                    </th>
                  )}
                  <th className="px-3 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-tight border-r border-gray-300">
                    Total Cases
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-tight border-r border-gray-300">
                    Loan Amount
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-tight border-r border-gray-300">
                    PF Amount
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-tight border-r border-gray-300">
                    Disbursal Amount
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-tight">
                    Repay Amount
                  </th>
                </tr>
              </thead>

              {/* Body */}
              <tbody className="bg-white divide-y divide-gray-200">
                {data.dailyPerformance.map((day, index) => (
                  <tr key={day.date} className={`${index % 2 === 0 ? 'bg-pink-50/30' : 'bg-white'} hover:bg-pink-50 transition-colors`}>
                    <td className="px-3 py-2 text-xs font-semibold text-gray-900 border-r border-gray-200">
                      {formatDate(day.date)}
                    </td>
                    {currentLoanFilter !== 'repeat' && (
                      <td className="px-3 py-2 text-xs font-bold text-gray-900 text-center border-r border-gray-200">
                        {formatNumber(day.newCase)}
                      </td>
                    )}
                    {currentLoanFilter !== 'new' && (
                      <td className="px-3 py-2 text-xs font-bold text-gray-900 text-center border-r border-gray-200">
                        {formatNumber(day.repeatCases)}
                      </td>
                    )}
                    <td className="px-3 py-2 text-xs font-bold text-gray-900 text-center border-r border-gray-200">
                      {currentLoanFilter === 'new' ? formatNumber(day.newCase) :
                       currentLoanFilter === 'repeat' ? formatNumber(day.repeatCases) :
                       formatNumber(day.totalCases)}
                    </td>
                    <td className="px-3 py-2 text-xs font-bold text-gray-900 text-center border-r border-gray-200">
                      {formatCurrency(day.loanAmount)}
                    </td>
                    <td className="px-3 py-2 text-xs font-bold text-gray-900 text-center border-r border-gray-200">
                      {formatCurrency(day.pfAmount)}
                    </td>
                    <td className="px-3 py-2 text-xs font-bold text-green-900 text-center border-r border-gray-200 bg-green-50/50">
                      {formatCurrency(day.disbursalAmount)}
                    </td>
                    <td className="px-3 py-2 text-xs font-bold text-purple-900 text-center bg-purple-50/50">
                      {formatCurrency(day.repayAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Footer Totals */}
              <tfoot className="bg-gradient-to-r from-blue-100 to-blue-50 sticky bottom-0 z-10">
                <tr className="border-t-2 border-gray-400">
                  <td className="px-3 py-2 text-xs font-bold text-gray-900 uppercase border-r border-gray-300">
                    Total
                  </td>
                  {currentLoanFilter !== 'repeat' && (
                    <td className="px-3 py-2 text-xs font-bold text-gray-900 text-center border-r border-gray-300">
                      {formatNumber(totals.newCase)}
                    </td>
                  )}
                  {currentLoanFilter !== 'new' && (
                    <td className="px-3 py-2 text-xs font-bold text-gray-900 text-center border-r border-gray-300"> 
                      {formatNumber(totals.repeatCases)}
                    </td>
                  )}
                  <td className="px-3 py-2 text-xs font-bold text-gray-900 text-center border-r border-gray-300">
                    {formatNumber(totals.totalCases)}
                  </td>
                  <td className="px-3 py-2 text-xs font-bold text-gray-900 text-center border-r border-gray-300">
                    {formatCurrency(totals.loanAmount)}
                  </td>
                  <td className="px-3 py-2 text-xs font-bold text-gray-900 text-center border-r border-gray-300">
                    {formatCurrency(totals.pfAmount)}
                  </td>
                  <td className="px-3 py-2 text-xs font-bold text-green-900 text-center border-r border-gray-300 bg-green-100">
                    {formatCurrency(totals.disbursalAmount)}
                  </td>
                  <td className="px-3 py-2 text-xs font-bold text-purple-900 text-center bg-purple-100">
                    {formatCurrency(totals.repayAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Additional Insights */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 border border-gray-200 p-2 rounded text-xs">
            <div className="font-semibold text-gray-700 mb-1">📊 Daily Average</div>
            <div className="space-y-0.5">
              <div className="flex justify-between">
                <span className="text-gray-600">Cases:</span>
                <span className="font-bold text-gray-900">{(totals.totalCases / data.dailyPerformance.length).toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Disbursal:</span>
                <span className="font-bold text-green-700">{formatCurrency(totals.disbursalAmount / data.dailyPerformance.length)}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 p-2 rounded text-xs">
            <div className="font-semibold text-gray-700 mb-1">🎯 Peak Performance</div>
            <div className="space-y-0.5">
              <div className="flex justify-between">
                <span className="text-gray-600">Highest Cases:</span>
                <span className="font-bold text-gray-900">
                  {currentLoanFilter === 'new' ? Math.max(...data.dailyPerformance.map(d => d.newCase)) :
                   currentLoanFilter === 'repeat' ? Math.max(...data.dailyPerformance.map(d => d.repeatCases)) :
                   Math.max(...data.dailyPerformance.map(d => d.totalCases))} cases
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Best Day:</span>
                <span className="font-bold text-blue-700">
                  {formatDate(data.dailyPerformance.reduce((max, d) => d.disbursalAmount > max.disbursalAmount ? d : max).date)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderByDateTable = () => (
    <div className="space-y-2">
      <div className="overflow-x-auto text-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-2 text-left text-xs font-bold text-gray-700">Month</th>
              <th className="px-2 py-2 text-xs font-bold text-gray-700">Count</th>
              <th className="px-2 py-2 text-xs font-bold text-gray-700">Amount</th>
              <th className="px-2 py-2 text-xs font-bold text-gray-700">Avg</th>
              <th className="px-2 py-2 text-xs font-bold text-gray-700">%</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.disbursementByDate.map((month) => {
              const percentOfTotal = data.summary.totalDisbursements > 0 
                ? ((month.count / data.summary.totalDisbursements) * 100).toFixed(1)
                : 0;
              return (
                <tr key={month.month} className="hover:bg-gray-50">
                  <td className="px-2 py-1 text-xs font-medium text-gray-900">{month.month}</td>
                  <td className="px-2 py-1 text-xs text-gray-900 font-semibold text-center">{formatNumber(month.count)}</td>
                  <td className="px-2 py-1 text-xs text-gray-900 font-semibold text-center">{formatCurrency(month.totalAmount)}</td>
                  <td className="px-2 py-1 text-xs text-gray-900 text-center">
                    {formatCurrency(month.count > 0 ? month.totalAmount / month.count : 0)}
                  </td>
                  <td className="px-2 py-1 text-center">
                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {percentOfTotal}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Monthly Progress Bar - Compact */}
      <div className="bg-gray-50 p-2 rounded text-xs">
        <div className="font-semibold text-gray-600 mb-1">Distribution</div>
        <div className="space-y-1">
          {data.disbursementByDate.map((month) => {
            const width = (month.count / Math.max(...data.disbursementByDate.map(m => m.count))) * 100;
            return (
              <div key={month.month} className="flex items-center gap-1">
                <div className="w-12 text-xs font-medium text-gray-600">{month.month}</div>
                <div className="flex-1 bg-gray-200 rounded h-1.5 overflow-hidden">
                  <div 
                    className="bg-blue-500 h-1.5 rounded transition-all" 
                    style={{ width: `${width}%` }}
                  />
                </div>
                <div className="w-8 text-right text-xs font-semibold text-gray-600">{month.count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Loans Detail by Month - Collapsible */}
      <details className="border border-gray-200 rounded text-xs">
        <summary className="px-2 py-1 cursor-pointer hover:bg-gray-50 font-semibold text-gray-900">
          📋 Loans by Month ({data.disbursementByDate.reduce((sum, m) => sum + (m.loans?.length || 0), 0)} total)
        </summary>
        <div className="px-2 py-1 border-t border-gray-200 bg-gray-50 max-h-96 overflow-y-auto">
          <div className="space-y-1">
            {data.disbursementByDate.map((month) => (
              <details key={month.month} className="group border border-gray-200 rounded">
                <summary className="px-2 py-1 cursor-pointer hover:bg-white text-xs font-semibold text-gray-900">
                  {month.month} - {month.count} loans ({formatCurrency(month.totalAmount)})
                </summary>
                <div className="px-2 py-1 border-t border-gray-200 bg-white">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-300">
                          <th className="px-1 py-1 text-left font-bold text-gray-700">Loan ID</th>
                          <th className="px-1 py-1 text-left font-bold text-gray-700">Customer</th>
                          <th className="px-1 py-1 text-left font-bold text-gray-700">Type</th>
                          <th className="px-1 py-1 text-left font-bold text-gray-700">Amount</th>
                          <th className="px-1 py-1 text-left font-bold text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {month.loans.map((loan: any) => (
                          <tr key={loan.id} className="hover:bg-gray-50">
                            <td className="px-1 py-1">
                              <span className="inline-flex px-1 rounded text-xs font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                {loan.formattedLoanId}
                              </span>
                            </td>
                            <td className="px-1 py-1 text-gray-900 font-medium">{loan.customerName.substring(0, 15)}</td>
                            <td className="px-1 py-1">
                              <span className="inline-flex px-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                {loan.loanType}
                              </span>
                            </td>
                            <td className="px-1 py-1 font-bold text-gray-900">{formatCurrency(loan.amount)}</td>
                            <td className="px-1 py-1">
                              <span className={`inline-flex px-1 rounded text-xs font-medium ${
                                loan.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                loan.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                loan.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                                loan.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {loan.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </details>
    </div>
  );

  const renderByStatusTable = () => (
    <div className="space-y-2">
      <div className="overflow-x-auto text-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-2 text-left text-xs font-bold text-gray-700">Status</th>
              <th className="px-2 py-2 text-xs font-bold text-gray-700">Count</th>
              <th className="px-2 py-2 text-xs font-bold text-gray-700">Amount</th>
              <th className="px-2 py-2 text-xs font-bold text-gray-700">Avg</th>
              <th className="px-2 py-2 text-xs font-bold text-gray-700">%</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.disbursementByStatus.map((item) => {
              const statusColors: Record<string, { bg: string; text: string; bar: string }> = {
                'COMPLETED': { bg: 'bg-green-50', text: 'text-green-800', bar: 'bg-green-500' },
                'PENDING': { bg: 'bg-yellow-50', text: 'text-yellow-800', bar: 'bg-yellow-500' },
                'PROCESSING': { bg: 'bg-blue-50', text: 'text-blue-800', bar: 'bg-blue-500' },
                'FAILED': { bg: 'bg-red-50', text: 'text-red-800', bar: 'bg-red-500' },
              };
              const colors = statusColors[item.status] || { bg: 'bg-gray-50', text: 'text-gray-800', bar: 'bg-gray-500' };
              return (
                <tr key={item.status} className={`${colors.bg} hover:opacity-75`}>
                  <td className="px-2 py-1 text-xs font-semibold text-gray-900">{item.status}</td>
                  <td className="px-2 py-1 text-xs font-bold text-gray-900 text-center">{formatNumber(item.count)}</td>
                  <td className="px-2 py-1 text-xs font-bold text-gray-900 text-center">{formatCurrency(item.totalAmount)}</td>
                  <td className="px-2 py-1 text-xs text-gray-900 text-center">
                    {formatCurrency(item.count > 0 ? item.totalAmount / item.count : 0)}
                  </td>
                  <td className="px-2 py-1 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${colors.text} bg-white border border-current`}>
                      {item.percentage}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Status Distribution Chart - Compact */}
      <div className="bg-gray-50 p-2 rounded text-xs">
        <div className="font-bold text-gray-700 mb-1">Distribution</div>
        <div className="space-y-1">
          {data.disbursementByStatus.map((item) => {
            const colors = {
              'COMPLETED': 'bg-green-500',
              'PENDING': 'bg-yellow-500',
              'PROCESSING': 'bg-blue-500',
              'FAILED': 'bg-red-500',
            } as Record<string, string>;
            const barColor = colors[item.status] || 'bg-gray-500';
            return (
              <div key={item.status} className="flex items-center gap-1">
                <div className="w-20 text-xs font-medium text-gray-700">{item.status}</div>
                <div className="flex-1">
                  <div className="bg-white border border-gray-200 rounded h-1.5 overflow-hidden">
                    <div 
                      className={`${barColor} h-1.5 rounded transition-all`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
                <div className="w-10 text-right text-xs font-bold text-gray-700">{item.percentage}%</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderByTypeTable = () => (
    <div className="space-y-2">
      <div className="overflow-x-auto text-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-2 text-left text-xs font-bold text-gray-700">Loan Type</th>
              <th className="px-2 py-2 text-xs font-bold text-gray-700">Count</th>
              <th className="px-2 py-2 text-xs font-bold text-gray-700">Amount</th>
              <th className="px-2 py-2 text-xs font-bold text-gray-700">Avg</th>
              <th className="px-2 py-2 text-xs font-bold text-gray-700">%</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.disbursementByType.map((item) => (
              <tr key={item.loanType} className="hover:bg-gray-50">
                <td className="px-2 py-1 text-xs font-semibold text-gray-900">{item.loanType}</td>
                <td className="px-2 py-1 text-xs font-bold text-gray-900 text-center">{formatNumber(item.count)}</td>
                <td className="px-2 py-1 text-xs font-bold text-gray-900 text-center">{formatCurrency(item.totalAmount)}</td>
                <td className="px-2 py-1 text-xs text-gray-900 text-center">
                  {formatCurrency(item.count > 0 ? item.totalAmount / item.count : 0)}
                </td>
                <td className="px-2 py-1 text-center">
                  <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold text-orange-800 bg-orange-100">
                    {item.percentage}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Type Comparison Cards - Compact */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {data.disbursementByType.map((item) => (
          <div key={item.loanType} className="bg-orange-50 border border-orange-200 p-2 rounded text-xs">
            <div className="flex justify-between items-start mb-1">
              <div className="font-semibold text-gray-900">{item.loanType}</div>
              <span className="text-xs font-bold bg-orange-200 text-orange-800 px-1.5 py-0.5 rounded">{item.percentage}%</span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-xs">
              <div>
                <div className="text-gray-600 font-medium">Count</div>
                <div className="font-bold text-gray-900">{item.count}</div>
              </div>
              <div>
                <div className="text-gray-600 font-medium">Total</div>
                <div className="font-bold text-gray-900">{formatCurrency(item.totalAmount)}</div>
              </div>
              <div>
                <div className="text-gray-600 font-medium">Avg</div>
                <div className="font-bold text-gray-900">{formatCurrency(item.count > 0 ? item.totalAmount / item.count : 0)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderByStateTable = () => (
    <div className="space-y-2">
      <div className="overflow-x-auto text-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-2 text-left text-xs font-bold text-gray-700">State</th>
              <th className="px-2 py-2 text-xs font-bold text-gray-700">Count</th>
              <th className="px-2 py-2 text-xs font-bold text-gray-700">Amount</th>
              <th className="px-2 py-2 text-xs font-bold text-gray-700">Avg</th>
              <th className="px-2 py-2 text-xs font-bold text-gray-700">% Share</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.disbursementByState.slice(0, 15).map((item) => {
              const percentShare = data.summary.totalDisbursements > 0 
                ? ((item.count / data.summary.totalDisbursements) * 100).toFixed(1)
                : 0;
              return (
                <tr key={item.state} className="hover:bg-gray-50">
                  <td className="px-2 py-1 text-xs font-semibold text-gray-900">{item.state}</td>
                  <td className="px-2 py-1 text-xs font-bold text-gray-900 text-center">{formatNumber(item.count)}</td>
                  <td className="px-2 py-1 text-xs font-bold text-gray-900 text-center">{formatCurrency(item.totalAmount)}</td>
                  <td className="px-2 py-1 text-xs text-gray-900 text-center">
                    {formatCurrency(item.count > 0 ? item.totalAmount / item.count : 0)}
                  </td>
                  <td className="px-2 py-1 text-center">
                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold text-rose-800 bg-rose-100">
                      {percentShare}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* State Distribution Map - Compact */}
      <div className="bg-rose-50 border border-rose-200 p-2 rounded text-xs">
        <div className="font-bold text-gray-700 mb-1">Geographic Distribution (Top 10)</div>
        <div className="space-y-1">
          {data.disbursementByState.slice(0, 10).map((item) => {
            const maxCount = Math.max(...data.disbursementByState.map(s => s.count));
            const width = (item.count / maxCount) * 100;
            const percentShare = data.summary.totalDisbursements > 0 
              ? ((item.count / data.summary.totalDisbursements) * 100).toFixed(1)
              : 0;
            return (
              <div key={item.state} className="flex items-center gap-1">
                <div className="w-14 text-xs font-medium text-gray-700 truncate">{item.state}</div>
                <div className="flex-1 bg-white border border-rose-200 rounded h-1.5 overflow-hidden">
                  <div 
                    className="bg-rose-500 h-1.5 rounded transition-all" 
                    style={{ width: `${width}%` }}
                  />
                </div>
                <div className="w-16 text-right text-xs font-bold text-gray-700">
                  {item.count} ({percentShare}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {data.disbursementByState.length > 10 && (
        <div className="text-xs text-gray-600 italic text-center">
          +{data.disbursementByState.length - 10} more states
        </div>
      )}
    </div>
  );

  const renderByExecutiveTable = () => {
    if (!data.disbursementByExecutive || data.disbursementByExecutive.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No executive disbursement data available
        </div>
      );
    }
  
    // Helper function to get loan breakdown by type for an executive
    const getLoanTypeBreakdown = (executiveId: string, _executiveName: string, _executiveEmail: string) => {
      const loanTypes = data.disbursementByType || [];
      const executiveItem = data.disbursementByExecutive.find(
        e => e.executiveId === executiveId
      );
      
      if (!executiveItem) return [];
      
      const breakdown = loanTypes.map(typeData => {
        const estimatedCount = Math.round((typeData.count * executiveItem.percentage) / 100);
        const estimatedAmount = (typeData.totalAmount * executiveItem.percentage) / 100;
        
        return {
          type: typeData.loanType,
          count: estimatedCount,
          amount: estimatedAmount
        };
      }).filter(item => item.count > 0);
      
      return breakdown.sort((a, b) => b.count - a.count);
    };
  
    // Separate by role
    const heads = data.disbursementByExecutive.filter(e => {
      const role = String(e.role || '').toLowerCase().trim();
      return role.includes('head');
    }).sort((a, b) => b.count - a.count); // Sort heads by count
  
    const managers = data.disbursementByExecutive.filter(e => {
      const role = String(e.role || '').toLowerCase().trim();
      return role.includes('manager');
    }).sort((a, b) => b.count - a.count); // Sort managers by count
  
    const executives = data.disbursementByExecutive.filter(e => {
      const role = String(e.role || '').toLowerCase().trim();
      return role.includes('exec') || role === 'executive';
    }).sort((a, b) => b.count - a.count); // Sort executives by count
  
    const unassigned = data.disbursementByExecutive.filter(e => {
      const role = String(e.role || '').toLowerCase().trim();
      return !role || (
        !role.includes('exec') && 
        !role.includes('manager') && 
        !role.includes('head')
      );
    });
  
    // Create hierarchical grouped array
    const groupedExecutives: typeof data.disbursementByExecutive = [];
  
    // Add heads first (already sorted by count)
    heads.forEach(head => {
      groupedExecutives.push(head);
    });
  
    // Then add each manager followed by their executives (sorted)
    managers.forEach(manager => {
      groupedExecutives.push(manager);
      // Find executives under this manager using managerName field
      const subordinates = executives.filter(exec => {
        const managerName = (exec as any).managerName;
        return managerName === manager.executiveName;
      }).sort((a, b) => b.count - a.count); // Sort subordinates by count
      
      groupedExecutives.push(...subordinates);
    });
  
    // Add any executives without a manager at the end (sorted)
    const unmanagedExecutives = executives.filter(exec => {
      const managerName = (exec as any).managerName;
      return !managerName || !managers.some(m => m.executiveName === managerName);
    }).sort((a, b) => b.count - a.count);
    groupedExecutives.push(...unmanagedExecutives);
  
    // Add unassigned at the end
    groupedExecutives.push(...unassigned);
    return (
      <div className="space-y-3">
        {/* Summary by Role Tiers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <div className="bg-green-50 border border-green-200 p-2 rounded">
            <div className="text-xs text-green-600 font-bold uppercase tracking-tight">🎯 Heads</div>
            <div className="mt-1">
              <div className="text-lg font-bold text-green-900">{heads.length}</div>
              <div className="text-xs text-green-600">
                {formatCurrency(heads.reduce((sum, e) => sum + e.totalAmount, 0))}
              </div>
            </div>
          </div>
  
          <div className="bg-purple-50 border border-purple-200 p-2 rounded">
            <div className="text-xs text-purple-600 font-bold uppercase tracking-tight">👥 Managers</div>
            <div className="mt-1">
              <div className="text-lg font-bold text-purple-900">{managers.length}</div>
              <div className="text-xs text-purple-600">
                {formatCurrency(managers.reduce((sum, e) => sum + e.totalAmount, 0))}
              </div>
            </div>
          </div>
  
          <div className="bg-blue-50 border border-blue-200 p-2 rounded">
            <div className="text-xs text-blue-600 font-bold uppercase tracking-tight">👤 Executives</div>
            <div className="mt-1">
              <div className="text-lg font-bold text-blue-900">{executives.length}</div>
              <div className="text-xs text-blue-600">
                {formatCurrency(executives.reduce((sum, e) => sum + e.totalAmount, 0))}
              </div>
            </div>
          </div>
  
          {unassigned.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 p-2 rounded">
              <div className="text-xs text-gray-600 font-bold uppercase tracking-tight">❓ Unassigned</div>
              <div className="mt-1">
                <div className="text-lg font-bold text-gray-900">{unassigned.length}</div>
                <div className="text-xs text-gray-600">
                  {formatCurrency(unassigned.reduce((sum, e) => sum + e.totalAmount, 0))}
                </div>
              </div>
            </div>
          )}
        </div>
  
        {/* Hierarchical Table */}
        <div className="overflow-x-auto border border-gray-200 rounded text-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-bold text-gray-700">Name</th>
                <th className="px-2 py-2 text-left text-xs font-bold text-gray-700">Email</th>
                <th className="px-2 py-2 text-left text-xs font-bold text-gray-700">Role</th>
                <th className="px-2 py-2 text-xs font-bold text-gray-700">Count</th>
                <th className="px-2 py-2 text-xs font-bold text-gray-700">Amount</th>
                <th className="px-2 py-2 text-xs font-bold text-gray-700">Avg</th>
                <th className="px-2 py-2 text-xs font-bold text-gray-700">%</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {groupedExecutives.map((item) => {
                const loanBreakdown = getLoanTypeBreakdown(item.executiveId, item.executiveName, item.executiveEmail);
                const isExpanded = expandedExecutive === item.executiveId;
                
                const role = String(item.role || '').toLowerCase().trim();
                const isExecutive = role.includes('exec') || role === 'executive';
                const isManager = role.includes('manager');
                const isHead = role.includes('head');
                
                // Get role-specific styling
                const getRoleStyle = () => {
                  if (isHead) return {
                    badgeBg: 'bg-green-100',
                    badgeText: 'text-green-800'
                  };
                  if (isManager) return {
                    badgeBg: 'bg-purple-100',
                    badgeText: 'text-purple-800'
                  };
                  if (isExecutive) return {
                    badgeBg: 'bg-blue-100',
                    badgeText: 'text-blue-800'
                  };
                  return {
                    badgeBg: 'bg-gray-100',
                    badgeText: 'text-gray-800'
                  };
                };
  
                const roleStyle = getRoleStyle();
                
                return (
                  <React.Fragment key={item.executiveId}>
                    <tr className={`hover:bg-gray-50 transition-colors ${isExecutive ? 'border-l-4 border-l-cyan-400' : ''}`}>
                      <td className={`px-2 py-1 text-xs font-semibold text-gray-900 ${isExecutive ? 'pl-6' : ''}`}>
                        <div className="flex items-center gap-2">
                          {isExecutive && <span className="text-gray-400">↳</span>}
                          {(isManager || isHead) && <span className="text-green-600 font-semibold">✓</span>}
                          {item.executiveName}
                        </div>
                      </td>
                      <td className="px-2 py-1 text-xs text-gray-600 truncate">{item.executiveEmail}</td>
                      <td className="px-2 py-1">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${roleStyle.badgeBg} ${roleStyle.badgeText}`}>
                          {item.role || 'Unassigned'}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-xs font-bold text-gray-900 text-center">
                        <button
                          onClick={() => {
                            setExpandedExecutive(isExpanded ? null : item.executiveId);
                          }}
                          className="inline-flex items-center gap-1 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                        >
                          {formatNumber(item.count)}
                          <svg 
                            className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </td>
                      <td className="px-2 py-1 text-xs font-bold text-gray-900 text-center">{formatCurrency(item.totalAmount)}</td>
                      <td className="px-2 py-1 text-xs text-gray-900 text-center">{formatCurrency(item.averageAmount)}</td>
                      <td className="px-2 py-1 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${roleStyle.badgeBg} ${roleStyle.badgeText}`}>
                          {item.percentage.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} className="px-2 py-1 bg-gray-50">
                          <div className="ml-4 space-y-0.5">
                            <div className="text-xs font-bold text-gray-700 mb-1">
                              Loan Type Breakdown: {loanBreakdown.length > 0 ? `${loanBreakdown.length} types` : 'No data'}
                            </div>
                            {loanBreakdown.length > 0 ? (
                              loanBreakdown.map((typeData) => (
                                <div key={typeData.type} className="flex items-center justify-between bg-white border border-gray-200 rounded px-2 py-0.5 text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                      {typeData.type}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="font-semibold text-gray-900">
                                      {typeData.count} {typeData.count === 1 ? 'loan' : 'loans'}
                                    </span>
                                    <span className="font-bold text-gray-900">
                                      {formatCurrency(typeData.amount)}
                                    </span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-xs text-gray-500 italic">
                                No loan details available for this executive
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderAllLoans = () => {
    // Collect all loans from all months
    const allLoans = data.disbursementByDate.flatMap((month) => month.loans);
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2 text-xs">
          <div className="font-bold text-gray-700">
            Total: <span className="text-blue-600">{allLoans.length}</span> | <span className="text-green-600">{formatCurrency(data.summary.totalAmount)}</span>
          </div>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded text-xs max-h-96 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-1 py-1 text-left text-xs font-bold text-gray-700 w-16">Loan ID</th>
                <th className="px-1 py-1 text-left text-xs font-bold text-gray-700">Customer</th>
                <th className="px-1 py-1 text-left text-xs font-bold text-gray-700 w-20">Type</th>
                <th className="px-1 py-1 text-xs font-bold text-gray-700 w-20">Amount</th>
                <th className="px-1 py-1 text-xs font-bold text-gray-700 w-16">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allLoans.map((loan: any, index: number) => (
                <tr key={`${loan.id}-${index}`} className="hover:bg-blue-50">
                  <td className="px-1 py-1">
                    <span className="inline-flex px-1 rounded text-xs font-mono font-bold bg-blue-50 text-blue-800 border border-blue-300">
                      {loan.formattedLoanId}
                    </span>
                  </td>
                  <td className="px-1 py-1 text-xs font-medium text-gray-900 truncate">{loan.customerName || '-'}</td>
                  <td className="px-1 py-1">
                    <span className="inline-flex px-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      {loan.loanType}
                    </span>
                  </td>
                  <td className="px-1 py-1 text-xs font-bold text-gray-900 text-right">
                    {formatCurrency(loan.amount)}
                  </td>
                  <td className="px-1 py-1">
                    <span className={`inline-flex px-1 rounded text-xs font-bold ${
                      loan.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      loan.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      loan.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                      loan.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {loan.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Stats - Compact */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-blue-50 p-2 rounded border border-blue-200 text-center">
            <div className="text-xs text-blue-600 font-medium">Total</div>
            <div className="text-lg font-bold text-blue-900">{allLoans.length}</div>
          </div>
          <div className="bg-green-50 p-2 rounded border border-green-200 text-center">
            <div className="text-xs text-green-600 font-medium">Completed</div>
            <div className="text-lg font-bold text-green-900">{allLoans.filter((l: any) => l.status === 'COMPLETED').length}</div>
          </div>
          <div className="bg-yellow-50 p-2 rounded border border-yellow-200 text-center">
            <div className="text-xs text-yellow-600 font-medium">Pending</div>
            <div className="text-lg font-bold text-yellow-900">{allLoans.filter((l: any) => l.status === 'PENDING').length}</div>
          </div>
          <div className="bg-red-50 p-2 rounded border border-red-200 text-center">
            <div className="text-xs text-red-600 font-medium">Failed</div>
            <div className="text-lg font-bold text-red-900">{allLoans.filter((l: any) => l.status === 'FAILED').length}</div>
          </div>
        </div>
      </div>
    );
  };

  const renderPerformanceInsights = () => {
    const topState = data.disbursementByState[0];
    const topStatus = data.disbursementByStatus[0];
    const topType = data.disbursementByType[0];
    const avgAmountPerMonth = data.summary.averageAmount;
    const monthlyDistribution = data.disbursementByDate.length > 0 
      ? (data.summary.totalDisbursements / data.disbursementByDate.length).toFixed(0)
      : 0;

    return (
      <div className="space-y-2">
        {/* Key Metrics - Compact Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Top State */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-2 rounded text-xs">
            <div className="text-xs font-bold text-blue-700 mb-1">📍 Top State</div>
            <div className="text-lg font-bold text-blue-900">{topState.state}</div>
            <div className="text-xs text-blue-600 mt-1">{topState.count} | {formatCurrency(topState.totalAmount)}</div>
          </div>

          {/* Top Status */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 p-2 rounded text-xs">
            <div className="text-xs font-bold text-green-700 mb-1">✓ Top Status</div>
            <div className="text-lg font-bold text-green-900">{topStatus.status}</div>
            <div className="text-xs text-green-600 mt-1">{topStatus.count} ({topStatus.percentage}%)</div>
          </div>

          {/* Top Loan Type */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 p-2 rounded text-xs">
            <div className="text-xs font-bold text-purple-700 mb-1">💰 Top Type</div>
            <div className="text-lg font-bold text-purple-900">{topType.loanType}</div>
            <div className="text-xs text-purple-600 mt-1">{topType.count} | {formatCurrency(topType.totalAmount)}</div>
          </div>

          {/* Monthly Average */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 p-2 rounded text-xs">
            <div className="text-xs font-bold text-amber-700 mb-1">📊 Avg/Month</div>
            <div className="text-lg font-bold text-amber-900">{monthlyDistribution}</div>
            <div className="text-xs text-amber-600 mt-1">{data.disbursementByDate.length} months</div>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="bg-gray-50 border border-gray-200 p-2 rounded text-xs space-y-1">
          <div className="font-bold text-gray-700 mb-1">📈 Key Insights</div>
          <div className="flex items-start gap-1">
            <span>📍</span>
            <div>
              <div className="font-semibold text-gray-900 text-xs">{topState.state} leads with {((topState.count / data.summary.totalDisbursements) * 100).toFixed(1)}% of disbursements</div>
            </div>
          </div>
          <div className="flex items-start gap-1">
            <span>✓</span>
            <div>
              <div className="font-semibold text-gray-900 text-xs">{topStatus.status} is {topStatus.percentage}% of all disbursements</div>
            </div>
          </div>
          <div className="flex items-start gap-1">
            <span>💳</span>
            <div>
              <div className="font-semibold text-gray-900 text-xs">{topType.loanType} is most popular with {topType.count} disbursements</div>
            </div>
          </div>
          <div className="flex items-start gap-1">
            <span>💹</span>
            <div>
              <div className="font-semibold text-gray-900 text-xs">Average loan: {formatCurrency(avgAmountPerMonth)}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (selectedTab) {
      case 0: // Overview
        return renderSummaryStats();
      case 1: // Daily Performance
        return renderDailyPerformance();
      case 2: // By Date
        return renderByDateTable();
      case 3: // By Status
        return renderByStatusTable();
      case 4: // By Type
        return renderByTypeTable();
      case 5: // By State
        return renderByStateTable();
      case 6: // By Executive
        return renderByExecutiveTable();
      case 7: // All Loans
        return renderAllLoans();
      case 8: // Performance
        return renderPerformanceInsights();
      default:
        return null;
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="flex justify-between items-center px-3 py-2 bg-gray-50 border-b">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-semibold text-gray-900">
            Disbursement <span className="text-xs font-normal text-gray-600">({data.dateRange.period})</span>
          </h3>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Loan Filter Buttons */}
          {data && onLoanFilterChange && (
            <div className="flex items-center space-x-1 bg-gray-100 p-0.5 rounded-lg">
              <button
                onClick={() => handleLoanFilterChange('both')}
                className={`px-3 py-1 text-xs font-medium rounded-md border transition-colors ${getFilterButtonStyle('both')}`}
              >
                All Loans
              </button>
              <button
                onClick={() => handleLoanFilterChange('new')}
                className={`px-3 py-1 text-xs font-medium rounded-md border transition-colors ${getFilterButtonStyle('new')}`}
              >
                New Only
              </button>
              <button
                onClick={() => handleLoanFilterChange('repeat')}
                className={`px-3 py-1 text-xs font-medium rounded-md border transition-colors ${getFilterButtonStyle('repeat')}`}
              >
                Repeat Only
              </button>
            </div>
          )}
          
          {/* Existing expand/collapse button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700 p-1"
          >
            {isExpanded ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3">
          {/* Tab Navigation - Compact */}
          <div className="flex space-x-0.5 rounded-lg bg-gray-100 p-0.5 mb-3 overflow-x-auto text-xs">
            {tabCategories.map((category, index) => (
              <button
                key={category.id}
                onClick={() => setSelectedTab(index)}
                className={`px-2 py-1 text-xs font-medium leading-4 whitespace-nowrap rounded transition-colors ${
                  selectedTab === index
                    ? 'bg-white text-blue-700 shadow'
                    : 'text-gray-700 hover:bg-white hover:text-gray-900'
                }`}
              >
                <span>{category.name}</span>
                {(category.count || 0) > 0 && (
                  <span className="ml-1 bg-gray-200 text-gray-700 text-xs px-1.5 py-0.5 rounded-full">
                    {category.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div>
            {renderTabContent()}
          </div>
        </div>
      )}
    </div>
  );
};

export default DisbursementAnalysisCard;