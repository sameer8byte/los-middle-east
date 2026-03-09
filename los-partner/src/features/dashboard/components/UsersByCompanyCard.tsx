import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../../common/ui/card";
// import { CompanyChart } from "./CompanyChart";
import { getUsersByCompany } from "../../../shared/services/api/dashboard.api";
import { DashboardQuery, UsersByCompanyResponse } from "../types/dashboard.types";

interface UsersByCompanyCardProps {
  readonly query: DashboardQuery;
  readonly loading?: boolean;
}

export function UsersByCompanyCard({ query, loading: parentLoading }: UsersByCompanyCardProps) {
  const { brandId } = useParams();
  const [data, setData] = useState<UsersByCompanyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!brandId) return;

      try {
        setLoading(true);
        setError(null);
        const response = await getUsersByCompany(brandId, query);
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch users by company");
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

  const renderCompanyList = () => {
    if (!data?.usersByCompany.length) {
      return <div className="text-gray-500 text-sm">No company data available</div>;
    }

    return (
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Users
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                %
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Salary
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Roles
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Types
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.usersByCompany.slice(0, 15).map((company, index) => {
              const percentage = data.totalUsers > 0 ? ((company.userCount / data.totalUsers) * 100).toFixed(1) : "0";
              
              return (
                <tr key={company.companyName} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="inline-flex items-center justify-center w-5 h-5 bg-green-100 text-green-800 text-xs font-medium rounded-full mr-2">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-900 truncate max-w-32" title={company.companyName}>
                        {company.companyName}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                    {company.userCount.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right text-sm text-gray-500">
                    {percentage}%
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                    {company.averageSalary > 0 ? formatCurrency(company.averageSalary).replace('BHD', 'BHD').slice(0, -3) + 'K' : '-'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-gray-900">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {company.uniqueDesignations.length}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {company.employmentTypes.slice(0, 2).map((type) => (
                        <span 
                          key={type} 
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                        >
                          {type.replace('_', ' ').slice(0, 4)}
                        </span>
                      ))}
                      {company.employmentTypes.length > 2 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                          +{company.employmentTypes.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {data.usersByCompany.length > 15 && (
          <div className="bg-gray-50 px-3 py-2 text-center text-xs text-gray-500 border-t">
            Showing top 15 companies. Total: {data.totalCompanies.toLocaleString()} companies
          </div>
        )}
      </div>
    );
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Users by Company</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500 text-sm">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Company Chart */}
      {/* <CompanyChart
        title="Users by Company (Top 10)"
        data={data?.usersByCompany.map(company => ({
          companyName: company.companyName,
          userCount: company.userCount
        })) || []}
        loading={isLoading}
      /> */}

      {/* Detailed Company List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Users by Company</CardTitle>
            {data && (
              <div className="flex gap-3 text-sm text-gray-600">
                <span>Users: <strong>{data.totalUsers.toLocaleString()}</strong></span>
                <span>Companies: <strong>{data.totalCompanies.toLocaleString()}</strong></span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 bg-gray-200 rounded" />
              ))}
            </div>
          ) : (
            <>
              {renderCompanyList()}
              {/* Compact Disclosure */}
              <div className="text-xs text-gray-500 mt-3 p-2 bg-gray-50 rounded border-l-2 border-green-200">
                <strong>Note:</strong> Shows users by employer with salary averages and role counts. Top 15 companies displayed. Data for selected period only.
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
