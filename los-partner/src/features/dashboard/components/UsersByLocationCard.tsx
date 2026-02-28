import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../../common/ui/card";
import { getUsersByLocation } from "../../../shared/services/api/dashboard.api";
import { DashboardQuery, UsersByLocationResponse } from "../types/dashboard.types";

interface UsersByLocationCardProps {
  readonly query: DashboardQuery;
  readonly loading?: boolean;
}

export function UsersByLocationCard({ query, loading: parentLoading }: UsersByLocationCardProps) {
  const { brandId } = useParams();
  const [data, setData] = useState<UsersByLocationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!brandId) return;

      try {
        setLoading(true);
        setError(null);
        const response = await getUsersByLocation(brandId, query);
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch users by location");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [brandId, query]);

  const isLoading = loading || parentLoading;

  const renderLocationList = () => {
    if (!data?.usersByLocation.length) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm font-medium">No location data available</p>
            <p className="text-gray-400 text-xs mt-1">Users will appear here when data is available</p>
          </div>
        </div>
      );
    }

    return (
      <div className="overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Rank & State
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                User Count
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Share
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Leading Cities
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.usersByLocation.map((location, index) => {
              const percentage = data.totalUsers > 0 ? ((location.totalUsers / data.totalUsers) * 100).toFixed(1) : "0";
              const topCities = location.cities.slice(0, 3);
              
              // Different styling for top 3 states
              const isTopPerformer = index < 3;
              const rankColors = [
                'bg-yellow-100 text-yellow-800 border-yellow-200', // Gold
                'bg-gray-100 text-gray-800 border-gray-200',       // Silver  
                'bg-orange-100 text-orange-800 border-orange-200'  // Bronze
              ];
              
              return (
                <tr key={location.state} className={`hover:bg-blue-50 transition-colors duration-200 ${isTopPerformer ? 'bg-gradient-to-r from-blue-50/50 to-transparent' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center justify-center w-7 h-7 text-xs font-bold rounded-full border-2 ${
                        isTopPerformer 
                          ? rankColors[index]
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}>
                        {index + 1}
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{location.state}</div>
                        <div className="text-xs text-gray-500">{location.cities.length} cities</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="text-sm font-bold text-gray-900">{location.totalUsers.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">users</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="text-sm font-semibold text-blue-600">{percentage}%</div>
                    <div className="w-12 h-1.5 bg-gray-200 rounded-full ml-auto mt-1">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(parseFloat(percentage), 100)}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {topCities.map((city, cityIndex) => (
                        <div
                          key={city.city}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs transition-colors duration-200 ${
                            cityIndex === 0 
                              ? 'bg-blue-100 text-blue-800 font-medium' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <span className="font-medium">{city.city}</span>
                          <span className="ml-1 text-gray-500">({city.userCount})</span>
                        </div>
                      ))}
                      {location.cities.length > 3 && (
                        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 font-medium">
                          +{location.cities.length - 3} more
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Users by Location</CardTitle>
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
          <CardTitle className="text-lg">Users by State</CardTitle>
          {data && (
            <div className="flex gap-3 text-sm text-gray-600">
              <span>Users: <strong>{data.totalUsers.toLocaleString()}</strong></span>
              <span>States: <strong>{data.totalStates}</strong></span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-200 rounded" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 bg-gray-200 rounded" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Enhanced Visualization Section */}
            {data && data.usersByLocation.length > 0 && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">Geographic Distribution</h3>
                    <p className="text-xs text-gray-600 mt-1">Top performing states by user count</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Showing</div>
                    <div className="text-sm font-semibold text-blue-600">{Math.min(data.usersByLocation.length, 10)} of {data.usersByLocation.length}</div>
                  </div>
                </div>
                
                {/* Horizontal Bar Chart */}
                <div className="space-y-2">
                  {data.usersByLocation.slice(0, 10).map((location, index) => {
                    const maxUsers = Math.max(...data.usersByLocation.map(l => l.totalUsers), 1);
                    const percentage = ((location.totalUsers / data.totalUsers) * 100);
                    const barWidth = (location.totalUsers / maxUsers) * 100;
                    
                    const colors = [
                      { bg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-100' },
                      { bg: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-100' },
                      { bg: 'bg-purple-500', text: 'text-purple-700', light: 'bg-purple-100' },
                      { bg: 'bg-orange-500', text: 'text-orange-700', light: 'bg-orange-100' },
                      { bg: 'bg-pink-500', text: 'text-pink-700', light: 'bg-pink-100' },
                      { bg: 'bg-teal-500', text: 'text-teal-700', light: 'bg-teal-100' },
                      { bg: 'bg-indigo-500', text: 'text-indigo-700', light: 'bg-indigo-100' },
                      { bg: 'bg-red-500', text: 'text-red-700', light: 'bg-red-100' },
                      { bg: 'bg-yellow-500', text: 'text-yellow-700', light: 'bg-yellow-100' },
                      { bg: 'bg-cyan-500', text: 'text-cyan-700', light: 'bg-cyan-100' }
                    ];
                    
                    const color = colors[index % colors.length];
                    
                    return (
                      <div key={location.state} className="group">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center justify-center w-5 h-5 ${color.light} ${color.text} text-xs font-bold rounded`}>
                              {index + 1}
                            </span>
                            <span className="text-sm font-medium text-gray-900 min-w-[80px]">
                              {location.state}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-gray-600">{percentage.toFixed(1)}%</span>
                            <span className="font-semibold text-gray-900 min-w-[50px] text-right">
                              {location.totalUsers.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`absolute left-0 top-0 h-full ${color.bg} rounded-full transition-all duration-500 ease-out`}
                            style={{ width: `${Math.max(barWidth, 2)}%` }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Summary Stats */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-blue-200">
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <div>
                      <span className="font-semibold text-gray-800">{data.totalUsers.toLocaleString()}</span> Total Users
                    </div>
                    <div>
                      <span className="font-semibold text-gray-800">{data.totalStates}</span> States
                    </div>
                  </div>
                  {data.usersByLocation.length > 10 && (
                    <div className="text-xs text-blue-600 font-medium">
                      +{data.usersByLocation.length - 10} more states in table below
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Enhanced Table with Dropdown */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button 
                className="w-full bg-gray-50 px-4 py-3 border-b border-gray-200 hover:bg-gray-100 transition-colors duration-200 text-left"
                onClick={() => setShowDetailedBreakdown(!showDetailedBreakdown)}
                aria-expanded={showDetailedBreakdown}
                aria-controls="detailed-breakdown-content"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">Detailed Breakdown</h3>
                    <p className="text-xs text-gray-600 mt-1">Complete state-wise user distribution with top cities</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                      {data?.usersByLocation.length || 0} states
                    </span>
                    <div className={`transform transition-transform duration-200 ${showDetailedBreakdown ? 'rotate-180' : ''}`}>
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </button>
              
              {/* Collapsible Content */}
              <div 
                id="detailed-breakdown-content"
                className={`transition-all duration-300 ease-in-out ${
                  showDetailedBreakdown 
                    ? 'max-h-96 opacity-100' 
                    : 'max-h-0 opacity-0 overflow-hidden'
                }`}
              >
                <div className="overflow-y-auto max-h-96">
                  {renderLocationList()}
                </div>
              </div>
              
              {/* Show/Hide Toggle */}
              {!showDetailedBreakdown && (
                <div className="px-4 py-3 bg-blue-50 border-t border-blue-200">
                  <button
                    onClick={() => setShowDetailedBreakdown(true)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200 flex items-center gap-1"
                  >
                    <span>Show detailed state-wise breakdown</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            
            {/* Enhanced Disclosure */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-4 h-4 bg-amber-400 rounded-full mt-0.5 flex items-center justify-center">
                  <span className="text-xs text-amber-800 font-bold">i</span>
                </div>
                <div className="text-xs text-amber-800">
                  <strong>Data Insights:</strong> Geographic distribution shows user concentration by state. 
                  Chart displays top 10 states for visual clarity. Table includes all states with city-wise breakdown. 
                  Percentages calculated from total users in selected time period.
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
