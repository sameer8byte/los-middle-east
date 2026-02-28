import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../../common/ui/card";
import { FiLayers } from "react-icons/fi";
import { DashboardQuery } from "../types/dashboard.types";
import { getLoansByType } from "../../../shared/services/api/dashboard.api";

interface LoanTypeData {
  loanType: string;
  totalLoans: number;
  totalAmount: number;
  averageLoanAmount: number;
  statusBreakdown: Record<string, { count: number; amount: number }>;
  subdomainBreakdown: Record<string, { count: number; amount: number }>;
}

interface LoansByTypeResponse {
  loansByType: LoanTypeData[];
  totalLoanTypes: number;
  totalLoans: number;
  totalAmount: number;
  averageLoanAmount: number;
  dateRange: {
    startDate?: string;
    endDate?: string;
    period: string;
  };
}

interface LoansByTypeCardProps {
  query: DashboardQuery;
  loading: boolean;
}

export function LoansByTypeCard({ query, loading }: Readonly<LoansByTypeCardProps>) {
  const [data, setData] = useState<LoansByTypeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'overview' | 'detailed'>('overview');
  const [expandedType, setExpandedType] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const { brandId } = useParams();

  const fetchLoansByType = async () => {
    if (!brandId) {
      setError('No brand ID available');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const queryParams = {
        period: query.period,
        startDate: query.startDate,
        endDate: query.endDate,
      };

      const result = await getLoansByType(brandId, queryParams);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch loan type data');
      console.error('Error fetching loans by type:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLoansByType();
  }, [query]);

  const toggleTypeDetails = (loanType: string) => {
    setExpandedType(expandedType === loanType ? null : loanType);
  };

  const renderStatusBreakdown = (statusBreakdown: Record<string, { count: number; amount: number }>) => {
    const statusColors: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-800",
      APPROVED: "bg-blue-100 text-blue-800",
      DISBURSED: "bg-green-100 text-green-800",
      COMPLETED: "bg-gray-100 text-gray-800",
      REJECTED: "bg-red-100 text-red-800",
    };

    return (
      <div className="mt-2 p-2 bg-gray-50 rounded-md">
        <div className="flex flex-wrap gap-2">
          {Object.entries(statusBreakdown).map(([status, info]) => (
            <div key={status} className="flex items-center gap-1 text-xs">
              <span className={`inline-flex px-1.5 py-0.5 text-xs rounded-full ${statusColors[status] || "bg-gray-100 text-gray-800"}`}>
                {status.toLowerCase()}
              </span>
              <span className="text-gray-600">
                {info.count} • {formatCurrency(info.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderOverview = () => {
    if (!data?.loansByType.length) {
      return <div className="text-gray-500 text-sm">No loan type data available</div>;
    }

    return (
      <div className="space-y-3">
        {/* Compact Summary Stats */}
        <div className="grid grid-cols-3 gap-3 p-2 bg-gray-50 rounded-md text-center">
          <div>
            <div className="text-base font-semibold text-gray-900">{data.totalLoanTypes}</div>
            <div className="text-xs text-gray-600">Types</div>
          </div>
          <div>
            <div className="text-base font-semibold text-gray-900">{data.totalLoans.toLocaleString()}</div>
            <div className="text-xs text-gray-600">Loans</div>
          </div>
          <div>
            <div className="text-base font-semibold text-gray-900">{formatCurrency(data.averageLoanAmount)}</div>
            <div className="text-xs text-gray-600">Avg</div>
          </div>
        </div>

        {/* Compact Loan Types List */}
        <div className="space-y-2">
          {data.loansByType.map((loanType) => {
            const percentage = data.totalLoans > 0 ? 
              ((loanType.totalLoans / data.totalLoans) * 100).toFixed(1) : '0';
            
            return (
              <div key={loanType.loanType} className="border border-gray-200 rounded-md p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <FiLayers className="w-3 h-3 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 text-sm">{loanType.loanType}</h4>
                        <span className="text-xs text-gray-500">({percentage}%)</span>
                      </div>
                      {/* Inline Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                        <div 
                          className="bg-blue-600 h-1 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-2 flex-shrink-0">
                    <div className="font-semibold text-gray-900 text-sm">{loanType.totalLoans.toLocaleString()}</div>
                    <div className="text-xs text-gray-600">{formatCurrency(loanType.totalAmount)}</div>
                  </div>
                  <button
                    onClick={() => toggleTypeDetails(loanType.loanType)}
                    className="ml-2 text-xs text-blue-600 hover:text-blue-800 transition-colors flex-shrink-0"
                  >
                    {expandedType === loanType.loanType ? '−' : '+'}
                  </button>
                </div>

                {expandedType === loanType.loanType && renderStatusBreakdown(loanType.statusBreakdown)}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDetailed = () => {
    if (!data?.loansByType.length) {
      return <div className="text-gray-500 text-sm">No loan type data available</div>;
    }

    return (
      <div className="overflow-hidden rounded-md border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Count
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Share
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.loansByType.map((loanType) => {
              const percentage = data.totalLoans > 0 ? 
                ((loanType.totalLoans / data.totalLoans) * 100).toFixed(1) : '0';
              
              return (
                <tr key={loanType.loanType} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                        <FiLayers className="w-2.5 h-2.5 text-blue-600" />
                      </div>
                      <span className="font-medium text-gray-900 text-sm">{loanType.loanType}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                    {loanType.totalLoans.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                    {formatCurrency(loanType.totalAmount)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right text-sm text-gray-500">
                    {formatCurrency(loanType.averageLoanAmount)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right text-sm text-gray-500">
                    {percentage}%
                  </td>
                </tr>
              );
            })}
            
            {/* Totals Row */}
            <tr className="bg-gray-50 font-semibold">
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                Total ({data.totalLoanTypes})
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-right text-sm text-gray-900">
                {data.totalLoans.toLocaleString()}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-right text-sm text-gray-900">
                {formatCurrency(data.totalAmount)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-right text-sm text-gray-900">
                {formatCurrency(data.averageLoanAmount)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-right text-sm text-gray-900">
                100%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderContent = () => {
    if (loading || isLoading) {
      return (
        <div className="animate-pulse space-y-2">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded" />
            ))}
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-gray-200 rounded" />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-medium">Error Loading Loan Types</div>
          <div className="text-red-600 text-sm mt-1">{error}</div>
          <button
            onClick={fetchLoansByType}
            className="mt-2 px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    return (
      <>
        {selectedView === 'overview' ? renderOverview() : renderDetailed()}
        
        {/* Compact Disclosure */}
        <div className="text-xs text-gray-500 mt-2 p-1.5 bg-gray-50 rounded border-l-2 border-blue-200">
          <strong>Note:</strong> Loan type metrics for selected period. Click + for status details.
        </div>
      </>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FiLayers className="w-4 h-4 text-blue-600" />
            Loans by Type
          </CardTitle>
          <select
            value={selectedView}
            onChange={(e) => setSelectedView(e.target.value as 'overview' | 'detailed')}
            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="overview">Overview</option>
            <option value="detailed">Table</option>
          </select>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {renderContent()}
      </CardContent>
    </Card>
  );
}
