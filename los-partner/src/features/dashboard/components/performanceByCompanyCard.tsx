import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../../common/ui/card";
import { getPerformanceByCompany } from "../../../shared/services/api/dashboard.api";
import { DashboardQuery, PerformanceByCompanyResponse } from "../types/dashboard.types";

interface PerformanceByCompanyCardProps {
  readonly query: DashboardQuery;
  readonly loading?: boolean;
}

export function PerformanceByCompanyCard({ query, loading: parentLoading }: PerformanceByCompanyCardProps) {
  const { brandId } = useParams();
  const [data, setData] = useState<PerformanceByCompanyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!brandId) return;

      try {
        setLoading(true);
        setError(null);
        const response = await getPerformanceByCompany(brandId, query);
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch performance by company");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [brandId, query]);

  const isLoading = loading || parentLoading;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 90) return 'text-green-700 bg-green-50';
    if (efficiency >= 70) return 'text-blue-700 bg-blue-50';
    if (efficiency >= 50) return 'text-yellow-700 bg-yellow-50';
    return 'text-red-700 bg-red-50';
  };

  const renderCompanyPerformanceList = () => {
    if (!data?.companyPerformance.length) {
      return <div className="text-gray-500 text-sm">No performance data available</div>;
    }

  const sortedCompanies = [...data.companyPerformance].sort((a, b) => b.totalDisbursed - a.totalDisbursed);

    return (
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Disbursed
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dis. Amount
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Obligation
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Collected
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Collection %
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedCompanies.map((company, index) => (
              <tr key={company.companyName} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full mr-2">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900 truncate max-w-32" title={company.companyName}>
                      {company.companyName}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                  {company.totalDisbursed.toLocaleString()}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                  {formatCurrency(company.disbursedAmount)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-sm text-gray-600">
                  {formatCurrency(company.totalObligation)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium text-green-700">
                  {formatCurrency(company.totalCollected)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-center">
                  <span 
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEfficiencyColor(company.collectionEfficiency)}`}
                  >
                    {company.collectionEfficiency.toFixed(2)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance by Company</CardTitle>
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
          <CardTitle className="text-lg">Performance by Company (Top 15)</CardTitle>
          {data && (
            <div className="flex gap-3 text-sm text-gray-600">
              <span>Disbursed: <strong>{data.summary.totalDisbursed.toLocaleString()}</strong></span>
              <span>Efficiency: <strong className={getEfficiencyColor(data.summary.overallCollectionEfficiency).split(' ')[0]}>{data.summary.overallCollectionEfficiency.toFixed(2)}%</strong></span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 bg-gray-200 rounded" />
            ))}
          </div>
        ) : (
          <>
            {renderCompanyPerformanceList()}
            {/* Compact Disclosure */}
            <div className="text-xs text-gray-500 mt-3 p-2 bg-gray-50 rounded border-l-2 border-blue-200">
              <strong>Note:</strong> Shows disbursement and collection performance by employer. Collection Efficiency = (Collected / Obligation) × 100. Top 15 companies by disbursed amount. Data for selected period only.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}