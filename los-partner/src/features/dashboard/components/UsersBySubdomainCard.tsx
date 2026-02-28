import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../../common/ui/card";
import { getUsersBySubdomain } from "../../../shared/services/api/dashboard.api";
import { DashboardQuery, UsersBySubdomainResponse } from "../types/dashboard.types";

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format number with commas
const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-IN').format(num);
};

interface UsersBySubdomainCardProps {
  readonly query: DashboardQuery;
  readonly loading?: boolean;
  readonly onLoanFilterChange?: (filter: 'new' | 'repeat' | 'both') => void;
  readonly currentLoanFilter?: 'new' | 'repeat' | 'both';
}

type ViewMode = 'detailed' | 'summary';

export function UsersBySubdomainCard({ 
  query, 
  loading: parentLoading,
  onLoanFilterChange,
  currentLoanFilter = 'both'
}: UsersBySubdomainCardProps) {
  const { brandId } = useParams();
  const [data, setData] = useState<UsersBySubdomainResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('summary');

  // Add filter button styling helper
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
      default:
        return isActive 
          ? 'bg-gray-700 text-white border-gray-700' 
          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50';
    }
  };

  const toggleExpanded = (subdomainId: string | null) => {
    const key = subdomainId || 'no-domain';
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedItems(newExpanded);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!brandId) return;

      try {
        setLoading(true);
        setError(null);
        const response = await getUsersBySubdomain(brandId, query);
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch users by subdomain");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [brandId, query]);

  const isLoading = loading || parentLoading;

  const renderSummaryView = () => {
    if (!data?.loansBySubdomain.length) {
      return <div className="text-gray-500 text-sm">No subdomain data available</div>;
    }

    return (
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Subdomain
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Sanction count
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Sanction amount
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Avg Sanction amount
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Share %
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.loansBySubdomain.map((item) => {
              const isNoDomainSummary = item.subdomainId === null;
              const loanPercentage = data.totalLoans > 0 
                ? ((item.totalLoans / data.totalLoans) * 100).toFixed(1)
                : '0.0';
              
              const getRowClass = () => {
                if (item.isPrimary) return 'bg-green-50 hover:bg-green-100';
                if (isNoDomainSummary) return 'bg-orange-50 hover:bg-orange-100';
                return 'hover:bg-gray-50';
              };

              const getTextClass = () => {
                if (item.isPrimary) return 'text-green-800 font-semibold';
                if (isNoDomainSummary) return 'text-orange-800 font-semibold';
                return 'text-gray-900';
              };

              const getNumberClass = () => {
                if (item.isPrimary) return 'font-semibold text-green-700';
                if (isNoDomainSummary) return 'font-semibold text-orange-700';
                return 'font-medium text-gray-900';
              };

              return (
                <tr key={item.subdomainId || 'no-domain'} className={`${getRowClass()} transition-colors`}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm truncate max-w-[200px] ${getTextClass()}`} title={item.subdomain}>
                        {item.subdomain}
                      </span>
                      {item.isPrimary && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800 font-medium">
                          Primary
                        </span>
                      )}
                      {isNoDomainSummary && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-800 font-medium">
                          No Domain
                        </span>
                      )}
                    </div>
                    {item.marketingSource && (
                      <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]" title={item.marketingSource}>
                        {item.marketingSource}
                      </div>
                    )}
                  </td>
                  <td className={`px-3 py-3 whitespace-nowrap text-right text-sm ${getNumberClass()}`}>
                    {formatNumber(item.disbursedCount)}
                  </td>
                  <td className={`px-3 py-3 whitespace-nowrap text-right text-sm ${getNumberClass()}`}>
                    {formatCurrency(item.disbursedAmount)}
                  </td>
                  <td className={`px-3 py-3 whitespace-nowrap text-right text-sm ${getNumberClass()}`}>
                    {formatCurrency(item.averageLoanAmount)}
                  </td>
                  <td className={`px-3 py-3 whitespace-nowrap text-right text-sm ${getNumberClass()}`}>
                    {loanPercentage}%
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-50 border-t-2 border-gray-300">
            <tr className="font-semibold">
              <td className="px-4 py-3 text-sm text-gray-700">
                Total ({data.totalSubdomains} {data.totalSubdomains === 1 ? 'subdomain' : 'subdomains'})
              </td>
              <td className="px-3 py-3 text-right text-sm text-gray-900">
                {formatNumber(data.totalDisbursedCount)}
              </td>
              <td className="px-3 py-3 text-right text-sm text-gray-900">
                {formatCurrency(data.totalDisbursedAmount)}
              </td>
              <td className="px-3 py-3 text-right text-sm text-gray-900">
                {formatCurrency(data.averageLoanAmount)}
              </td>
              <td className="px-3 py-3 text-right text-sm text-gray-900">
                100%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  const renderSubdomainList = () => {
    if (!data?.loansBySubdomain.length) {
      return <div className="text-gray-500 text-sm">No subdomain data available</div>;
    }

    return (
      <div className="space-y-3 overflow-y-auto max-h-[600px]">
        {data.loansBySubdomain.map((item, index) => {
          const topStatuses = Object.entries(item.loanStatusBreakdown)
            .sort(([,a], [,b]) => (b as { count: number }).count - (a as { count: number }).count)
            .slice(0, 3);
          const isNoDomain = item.subdomainId === null;
          
          // Calculate loan percentage relative to total
          const loanPercentage = data.totalLoans > 0 
            ? ((item.totalLoans / data.totalLoans) * 100).toFixed(1)
            : '0.0';
          
          const getCardClassName = () => {
            if (item.isPrimary) {
              return 'bg-green-50 hover:bg-green-100 border border-green-200';
            }
            if (isNoDomain) {
              return 'bg-orange-50 hover:bg-orange-100 border border-orange-200';
            }
            return 'bg-gray-50 hover:bg-gray-100 border border-gray-200';
          };

          const getBadgeClassName = () => {
            if (item.isPrimary) return 'bg-green-500';
            if (isNoDomain) return 'bg-orange-500';
            return 'bg-blue-500';
          };

          const getBadgeContent = () => {
            if (item.isPrimary) return '★';
            if (isNoDomain) return '?';
            return index + 1;
          };

          const getButtonClassName = () => {
            if (item.isPrimary) return 'text-green-600 hover:text-green-800';
            if (isNoDomain) return 'text-orange-600 hover:text-orange-800';
            return 'text-blue-600 hover:text-blue-800';
          };

          const getBorderClassName = () => {
            if (item.isPrimary) return 'border-green-200';
            if (isNoDomain) return 'border-orange-200';
            return 'border-gray-200';
          };

          const getStatusCardClassName = () => {
            if (item.isPrimary) return 'bg-green-50 border-green-200';
            if (isNoDomain) return 'bg-orange-50 border-orange-200';
            return 'bg-white border-gray-200';
          };

          const getStatusTextClassName = () => {
            if (item.isPrimary) return 'text-green-800';
            if (isNoDomain) return 'text-orange-800';
            return 'text-gray-700';
          };

          const getStatusCountClassName = () => {
            if (item.isPrimary) return 'text-green-800';
            if (isNoDomain) return 'text-orange-800';
            return 'text-gray-800';
          };

          const getStatusAmountClassName = () => {
            if (item.isPrimary) return 'text-green-600';
            if (isNoDomain) return 'text-orange-600';
            return 'text-gray-500';
          };

          const getMetricsBgClassName = () => {
            if (item.isPrimary) return 'bg-green-50 border-green-200';
            if (isNoDomain) return 'bg-orange-50 border-orange-200';
            return 'bg-blue-50 border-blue-200';
          };

          const getMetricsTextClassName = () => {
            if (item.isPrimary) return 'text-green-800';
            if (isNoDomain) return 'text-orange-800';
            return 'text-blue-800';
          };
          
          return (
            <div key={item.subdomainId || 'no-domain'} className={`p-3 rounded-lg transition-colors ${getCardClassName()}`}>
              {/* Compact Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={`w-7 h-7 text-white rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${getBadgeClassName()}`}>
                    {getBadgeContent()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-gray-900 truncate" title={item.subdomain}>
                        {item.subdomain}
                      </p>
                      {item.isPrimary && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-green-100 text-green-800 flex-shrink-0">
                          Primary
                        </span>
                      )}
                    </div>
                    {item.marketingSource && (
                      <p className="text-xs text-gray-500 truncate" title={item.marketingSource}>
                        {item.marketingSource}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <div className="text-sm font-semibold text-gray-900">{formatNumber(item.disbursedCount)}</div>
                  <div className="text-xs text-gray-500">Disbursed</div>
                </div>
              </div>

              {/* Compact Stats Grid */}
              <div className="grid grid-cols-3 gap-2 mb-2 text-xs">
                <div className="text-center p-1.5 bg-white bg-opacity-50 rounded">
                  <div className="text-gray-500">Sanction count</div>
                  <div className="font-semibold text-green-600">{formatNumber(item.disbursedCount)}</div>
                </div>
                <div className="text-center p-1.5 bg-white bg-opacity-50 rounded">
                  <div className="text-gray-500">Amount</div>
                  <div className="font-semibold text-green-600">{formatCurrency(item.disbursedAmount)}</div>
                </div>
                <div className="text-center p-1.5 bg-white bg-opacity-50 rounded">
                  <div className="text-gray-500">Share</div>
                  <div className="font-semibold text-blue-600">{loanPercentage}%</div>
                </div>
              </div>

              {/* Compact Status Row */}
              {topStatuses.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-xs text-gray-600 font-medium">
                      Top Statuses ({topStatuses.length}/{Object.keys(item.loanStatusBreakdown).length})
                    </div>
                    {Object.keys(item.loanStatusBreakdown).length > 3 && (
                      <button
                        onClick={() => toggleExpanded(item.subdomainId)}
                        className={`text-xs font-medium px-2 py-0.5 rounded hover:bg-white transition-colors ${getButtonClassName()}`}
                      >
                        {expandedItems.has(item.subdomainId || 'no-domain') ? '▲ Less' : '▼ More'}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {topStatuses.map(([status, statusData]) => (
                      <span
                        key={status}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200"
                      >
                        <span className="font-medium">{status}:</span>
                        <span className="font-semibold">{(statusData as { count: number }).count}</span>
                      </span>
                    ))}
                  </div>
                  
                  {/* Expanded view with all statuses */}
                  {expandedItems.has(item.subdomainId || 'no-domain') && (
                    <div className={`mt-3 pt-3 border-t ${getBorderClassName()}`}>
                      <div className="text-xs text-gray-600 mb-2 font-medium flex items-center justify-between">
                        <span>
                          All Statuses
                          {item.isPrimary && <span className="ml-1 text-green-600">(Primary)</span>}
                          {isNoDomain && <span className="ml-1 text-orange-600">(No Domain)</span>}
                        </span>
                      </div>
                      
                      {/* Performance Metrics Row */}
                      <div className={`mb-2 p-2 rounded text-xs border ${getMetricsBgClassName()}`}>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center">
                            <div className={`font-medium ${getMetricsTextClassName()}`}>
                              {formatCurrency(item.averageLoanAmount)}
                            </div>
                            <div className="text-gray-600">Avg Loan</div>
                          </div>
                          <div className="text-center">
                            <div className={`font-medium ${getMetricsTextClassName()}`}>
                              {formatCurrency(item.totalLoanAmount)}
                            </div>
                            <div className="text-gray-600">Total Vol</div>
                          </div>
                          <div className="text-center">
                            <div className={`font-medium ${getMetricsTextClassName()}`}>
                              {loanPercentage}%
                            </div>
                            <div className="text-gray-600">Market Share</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Compact Status Grid */}
                      <div className="grid grid-cols-2 gap-1.5">
                        {Object.entries(item.loanStatusBreakdown)
                          .sort(([,a], [,b]) => (b as { count: number }).count - (a as { count: number }).count)
                          .map(([status, statusData]) => {
                            const typedStatusData = statusData as { count: number; amount: number };
                            return (
                            <div 
                              key={status} 
                              className={`flex justify-between items-center p-1.5 rounded text-xs border ${getStatusCardClassName()}`}
                            >
                              <span className={`font-medium truncate max-w-[120px] ${getStatusTextClassName()}`} title={status}>
                                {status}
                              </span>
                              <div className="text-right flex-shrink-0 ml-1">
                                <div className={`font-semibold ${getStatusCountClassName()}`}>
                                  {formatNumber(typedStatusData.count)}
                                </div>
                                <div className={`text-[10px] ${getStatusAmountClassName()}`}>
                                  {formatCurrency(typedStatusData.amount)}
                                </div>
                              </div>
                            </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Loans by Subdomain</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500 text-sm">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Loans by Subdomain</CardTitle>
          <div className="flex items-center space-x-2">
            {/* LOAN FILTER BUTTONS */}
            {data && onLoanFilterChange && (
              <div className="flex items-center space-x-1 bg-gray-100 p-0.5 rounded-lg">
                <button
                  onClick={() => onLoanFilterChange('both')}
                  className={`px-3 py-1 text-xs font-medium rounded-md border transition-colors ${getFilterButtonStyle('both')}`}
                >
                  All Loans
                </button>
                <button
                  onClick={() => onLoanFilterChange('new')}
                  className={`px-3 py-1 text-xs font-medium rounded-md border transition-colors ${getFilterButtonStyle('new')}`}
                >
                  New Only
                </button>
                <button
                  onClick={() => onLoanFilterChange('repeat')}
                  className={`px-3 py-1 text-xs font-medium rounded-md border transition-colors ${getFilterButtonStyle('repeat')}`}
                >
                  Repeat Only
                </button>
              </div>
            )}
            
            {/* VIEW MODE BUTTONS */}
            {data && (
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('detailed')}
                  className={`px-3 py-1 text-xs rounded ${
                    viewMode === 'detailed' 
                      ? 'bg-blue-100 text-blue-700 font-medium' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Detailed
                </button>
                <button
                  onClick={() => setViewMode('summary')}
                  className={`px-3 py-1 text-xs rounded ${
                    viewMode === 'summary' 
                      ? 'bg-blue-100 text-blue-700 font-medium' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Summary
                </button>
              </div>
            )}
          </div>
        </div>
        {data && (
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Domains:</span>
              <span className="font-semibold text-gray-900">{data.totalSubdomains}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Sanction count:</span>
              <span className="font-semibold text-green-600">{formatNumber(data.totalDisbursedCount)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Sanction amount:</span>
              <span className="font-semibold text-green-600">{formatCurrency(data.totalDisbursedAmount)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Avg. Loan:</span>
              <span className="font-semibold text-purple-600">{formatCurrency(data.averageLoanAmount)}</span>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            {viewMode === 'detailed' && renderSubdomainList()}
            {viewMode === 'summary' && renderSummaryView()}
            
            {/* Compact Disclosure */}
            <div className="text-xs text-gray-600 mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-semibold flex-shrink-0">ℹ️</span>
                <div className="space-y-1">
                  <p><strong className="text-gray-700">Loan Distribution:</strong> Shows all loans grouped by subdomain/marketing source.</p>
                  <p>
                    <strong className="text-gray-700">Key Indicators:</strong>{' '}
                    <span className="text-green-700">Primary</span> = main brand domain,{' '}
                    <span className="text-orange-700">No Domain</span> = direct traffic/unknown source.
                  </p>
                  <p>
                    <strong className="text-gray-700">Share %:</strong> (Subdomain Total Loans ÷ All Loans) × 100. Reflects market share per subdomain.
                  </p>
                  <p className="text-gray-500 italic">
                    Data filtered by selected date range and loan type (new/repeat/all).
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}