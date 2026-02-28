import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { FiUsers, FiTrendingUp, FiPieChart } from 'react-icons/fi';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../common/ui/card';
import { StatsCard } from './StatsCard';
import { DateRangePicker } from './DateRangePicker';
import { UsersBySubdomainCard } from './UsersBySubdomainCard';
import { UsersByLocationCard } from './UsersByLocationCard';
import { UsersByCompanyCard } from './UsersByCompanyCard';
import { UsersByOnboardingStepCard } from './UsersByOnboardingStepCard';
import { LoansByTypeCard } from './LoansByTypeCard';
import { LoanAllocationCard } from './LoanAllocationCard';
import { CollectionAnalysisCard } from './CollectionAnalysisCard';
import { DisbursementAnalysisCard } from './DisbursementAnalysisCard';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { DashboardQuery } from '../types/dashboard.types';
import { useLoanAllocationDetails } from '../hooks/useLoanAllocationDetails';
import { useCollectionAnalysis } from '../hooks/useCollectionAnalysis';
import { useDisbursementAnalysis } from '../hooks/useDisbursementAnalysis';
import { PerformanceByCompanyCard } from './performanceByCompanyCard';
import { DashboardCalendar } from './DashboardCalendar';

export function DashboardComponent() {
  const { brandId } = useParams<{ brandId: string }>();
  const [query, setQuery] = useState<DashboardQuery>({ period: 'today' });
  const [selectedLoanView, setSelectedLoanView] = useState<
    'count' | 'amount' | 'both'
  >('both');
  // Add loan filter state
  const [loanFilterType, setLoanFilterType] = useState<'new' | 'repeat' | 'both'>('both');
  
  const [visibleSections, setVisibleSections] = useState({
    stats: true,
    loanBreakdown: false,
    loanTypes: false,
    loanAllocation: false,
    collectionAnalysis: false,
    disbursementAnalysis: false,
    subdomain: false,
    location: false,
    company: false,
    onboarding: false,
    companyPerformance: false,
    calendar: false
  });
  
  const { summary, loading, error, fetchStats } = useDashboardStats(
    visibleSections.stats ? query : null
  );
  
  const {
    data: allocationData,
    loading: allocationLoading,
    error: allocationError,
  } = useLoanAllocationDetails(
    visibleSections.loanAllocation ? query : null
  );
  
  const {
    data: collectionData,
    loading: collectionLoading,
    error: collectionError,
  } = useCollectionAnalysis(
    visibleSections.collectionAnalysis ? query : null
  );
  
  // Update hook call to include loanFilterType
  const {
    data: disbursementData,
    loading: disbursementLoading,
    error: disbursementError,
  } = useDisbursementAnalysis(
    visibleSections.disbursementAnalysis ? query : null,
  );

  const toggleSection = (section: keyof typeof visibleSections) => {
    setVisibleSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handlePeriodChange = (newQuery: DashboardQuery) => {
    setQuery(newQuery);
    fetchStats(newQuery);
  };

 const handleLoanFilterChange = (filter: 'new' | 'repeat' | 'both') => {
  // Update the local badge state
  setLoanFilterType(filter);
  
  // CRITICAL: Update the query object so the hook sees the change and refetches
  setQuery(prev => ({
    ...prev,
    loanFilterType: filter
  }));
};

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPeriodLabel = (
    period: string,
    startDate?: string,
    endDate?: string,
  ) => {
    if (period === 'custom' && startDate && endDate) {
      return `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
    }

    const periodLabels: Record<string, string> = {
      today: 'Today',
      tilldate: 'This Month',
      yesterday: 'Yesterday',
      week: 'Last 7 days',
      month: 'Last 30 days',
      year: 'Last year',
      all: 'All time',
    };

    return periodLabels[period] || 'All time';
  };

  const renderLoanStatusBreakdown = () => {
    const statusData = summary?.summary.loanStatusBreakdown || {};
    const totals = summary?.summary.loanStatusBreakdownTotals || {
      totalCount: 0,
      totalAmount: 0,
    };
    const loanTypeData = summary?.summary.loanTypeBreakdown || {};

    const statusColors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-blue-100 text-blue-800',
      DISBURSED: 'bg-green-100 text-green-800',
      COMPLETED: 'bg-gray-100 text-gray-800',
      REJECTED: 'bg-red-100 text-red-800',
    };

    if (totals.totalCount === 0) {
      return (
        <div className="text-gray-500 text-sm">No loan data available</div>
      );
    }

    return (
      <div className="space-y-4">
        {/* View Toggle Dropdown */}
        <div className="flex justify-between items-center">
          <h3 className="font-medium text-gray-900">Breakdown View</h3>
          <select
            value={selectedLoanView}
            onChange={(e) =>
              setSelectedLoanView(e.target.value as 'count' | 'amount' | 'both')
            }
            className="text-sm border border-gray-300 rounded-md px-3 py-1 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="both">Both Count & Amount</option>
            <option value="count">By Count Only</option>
            <option value="amount">By Amount Only</option>
          </select>
        </div>

        {/* Simple Table */}
        <div className="overflow-hidden rounded-lg border border-gray-200 whitespace-nowrap">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {selectedLoanView === 'both' ? (
                  <>
                    <th className=" text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Count
                    </th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Count %
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount %
                    </th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {selectedLoanView === 'count' ? 'Count' : 'Amount'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Percentage
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(statusData).map(([status, statusInfo]) => {
                const countPercentage = (
                  (statusInfo.count / totals.totalCount) *
                  100
                ).toFixed(1);
                const amountPercentage =
                  totals.totalAmount > 0
                    ? ((statusInfo.amount / totals.totalAmount) * 100).toFixed(
                        1,
                      )
                    : '0';

                return (
                  <tr key={status} className="hover:bg-gray-50">
                    <td className="px-2 py-2 whitespace-nowrap">
                      <div className="flex items-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            statusColors[status] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {status
                            ? status
                                .toLowerCase()
                                .split('_')
                                .map(
                                  (word) =>
                                    word.charAt(0).toUpperCase() +
                                    word.slice(1),
                                )
                                .join(' ')
                            : ''}
                        </span>
                      </div>
                    </td>
                    {selectedLoanView === 'both' ? (
                      <>
                        <td className="px-2 py-2 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                          {statusInfo.count.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-right text-sm text-gray-500">
                          {countPercentage}%
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                          {formatCurrency(statusInfo.amount)}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-right text-sm text-gray-500">
                          {amountPercentage}%
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-2 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                          {selectedLoanView === 'count'
                            ? statusInfo.count.toLocaleString()
                            : formatCurrency(statusInfo.amount)}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-right text-sm text-gray-500">
                          {selectedLoanView === 'count'
                            ? countPercentage
                            : amountPercentage}
                          %
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}

              {/* Totals Row */}
              <tr className="bg-gray-50 font-semibold">
                <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-900">
                  Total
                </td>
                {selectedLoanView === 'both' ? (
                  <>
                    <td className="px-2 py-2 whitespace-nowrap text-right text-sm text-gray-900">
                      {totals.totalCount.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-right text-sm text-gray-900">
                      100%
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatCurrency(totals.totalAmount)}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-right text-sm text-gray-900">
                      100%
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-2 py-2 whitespace-nowrap text-right text-sm text-gray-900">
                      {selectedLoanView === 'count'
                        ? totals.totalCount.toLocaleString()
                        : formatCurrency(totals.totalAmount)}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-right text-sm text-gray-900">
                      100%
                    </td>
                  </>
                )}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Loan Type Quick Summary */}
        {Object.keys(loanTypeData).length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              Loan Types Overview
            </h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(loanTypeData).map(([loanType, typeInfo]) => (
                <div
                  key={loanType}
                  className="inline-flex items-center gap-2 bg-white px-2 py-1 rounded text-xs"
                >
                  <span className="font-medium text-blue-800">{loanType}:</span>
                  <span className="text-gray-700">
                    {typeInfo.count} ({typeInfo.percentage}%)
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-blue-700 mt-2">
              View detailed loan type analysis in the "Loans by Type" section
              below.
            </p>
          </div>
        )}

        {/* Compact Disclosure */}
        <div className="text-xs text-gray-500 mt-3 p-2 bg-gray-50 rounded border-l-2 border-yellow-200">
          <strong>Note:</strong> Shows loan applications by current status.
          Count = number of applications, Amount = total loan value. Percentages
          calculated for selected period only.
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-medium">
            Error Loading Dashboard
          </div>
          <div className="text-red-600 text-sm mt-1">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Compact Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 text-sm">
            Overview of your business metrics
          </p>
        </div>

        {/* Section Controls */}
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500">
            Sections: {Object.values(visibleSections).filter(Boolean).length}/
            {Object.keys(visibleSections).length}
          </div>
          <button
            onClick={() =>
              setVisibleSections({
                stats: true,
                loanBreakdown: true,
                loanTypes: true,
                loanAllocation: true,
                collectionAnalysis: true,
                disbursementAnalysis: true,
                subdomain: true,
                location: true,
                company: true,
                onboarding: true,
                companyPerformance: true,
                calendar: true,
              })
            }
            className="px-2 py-1 text-xs text-blue-700 rounded hover:bg-blue-200 transition-colors"
            title="Show all sections"
          >
            Show All
          </button>
          <button
            onClick={() =>
              setVisibleSections({
                stats: false,
                loanBreakdown: false,
                loanTypes: false,
                loanAllocation: false,
                collectionAnalysis: false,
                disbursementAnalysis: false,
                subdomain: false,
                location: false,
                company: false,
                onboarding: false,
                companyPerformance: false,
                calendar: false
              })
            }
            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            title="Hide all sections"
          >
            Hide All
          </button>
        </div>
      </div>

      {/* Date Range Picker */}
      <DateRangePicker
        onPeriodChange={handlePeriodChange}
        currentPeriod={query.period || 'month'}
        loading={loading}
      />

      {/* Hidden Sections Restore Panel */}
      {Object.entries(visibleSections).some(([, visible]) => !visible) && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Hidden Sections</h3>
                  <p className="text-xs text-gray-600">Click any section to restore it to the dashboard</p>
                </div>
              </div>
              <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                {Object.values(visibleSections).filter(v => !v).length} Hidden
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {Object.entries(visibleSections).map(([section, visible]) => {
                if (visible) return null;

                const sectionLabels = {
                  stats: 'Key Metrics',
                  loanBreakdown: 'Loan Status',
                  loanTypes: 'Loan Types',
                  loanAllocation: 'Loan Allocation',
                  collectionAnalysis: 'Collection Analysis',
                  disbursementAnalysis: 'Disbursement Analysis',
                  subdomain: 'Subdomains',
                  location: 'Locations',
                  company: 'Companies',
                  onboarding: 'Onboarding',
                  companyPerformance: 'Company Performance',
                  calendar: 'Calendar',
                };

                return (
                  <button
                    key={section}
                    onClick={() =>
                      toggleSection(section as keyof typeof visibleSections)
                    }
                    className="group relative px-3 py-2 text-xs font-medium bg-white text-gray-700 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-1.5"
                    title={`Show ${sectionLabels[section as keyof typeof sectionLabels]} section`}
                  >
                    <svg className="w-3 h-3 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="truncate">{sectionLabels[section as keyof typeof sectionLabels]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Key Metrics</h2>
          <button
            onClick={() => toggleSection('stats')}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            title={visibleSections.stats ? 'Hide section' : 'Show section'}
          >
            {visibleSections.stats ? '−' : '+'}
          </button>
        </div>
        {visibleSections.stats && (
          <div className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
              <StatsCard
                title="Total Users"
                value={summary?.summary.totalUsers || 0}
                subtitle="Registered customers"
                icon={<FiUsers className="w-4 h-4" />}
                loading={loading}
              />
              <StatsCard
                title="Total Loans"
                value={summary?.summary.totalLoans || 0}
                subtitle="Active loan applications"
                icon={<FiTrendingUp className="w-4 h-4" />}
                loading={loading}
              />
              <StatsCard
                title="Total Loan Amount"
                value={formatCurrency(summary?.summary.totalLoanAmount || 0)}
                subtitle="Total loan amount"
                icon={<></>}
                loading={loading}
              />
              <StatsCard
                title="Average Loan Amount"
                value={formatCurrency(summary?.summary.averageLoanAmount || 0)}
                subtitle="Per loan application"
                icon={<FiPieChart className="w-4 h-4" />}
                loading={loading}
              />
            </div>
            {/* Stats Disclosure */}
            <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded border-l-2 border-gray-400">
              <strong>Note:</strong> Key metrics summary for selected period.
              Users = active registered customers. Loans = all loan
              applications. Values formatted for readability (K=thousands,
              M=millions).
            </div>
          </div>
        )}
      </div>

      {/* Disbursement Analysis Section - FIRST PRIORITY */}
      {visibleSections.disbursementAnalysis && (
        <div className="relative">
          <button
            onClick={() => toggleSection('disbursementAnalysis')}
            className="absolute top-3 right-3 z-10 text-gray-500 hover:text-gray-700 transition-colors bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm border border-gray-200"
            title="Hide section"
          >
            ×
          </button>
          <DisbursementAnalysisCard
            data={disbursementData}
            loading={disbursementLoading}
            error={disbursementError}
            onLoanFilterChange={handleLoanFilterChange}
            currentLoanFilter={loanFilterType}
          />
        </div>
      )}

      {/* Collection Analysis Section - SECOND PRIORITY */}
      {visibleSections.collectionAnalysis && (
        <div className="relative">
          <button
            onClick={() => toggleSection('collectionAnalysis')}
            className="absolute top-3 right-3 z-10 text-gray-500 hover:text-gray-700 transition-colors bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm border border-gray-200"
            title="Hide section"
          >
            ×
          </button>
          <CollectionAnalysisCard
            data={collectionData}
            loading={collectionLoading}
            error={collectionError}
          />
        </div>
      )}

      {/* Loan Allocation Section - THIRD PRIORITY */}
      {visibleSections.loanAllocation && (
        <div className="relative">
          <button
            onClick={() => toggleSection('loanAllocation')}
            className="absolute top-3 right-3 z-10 text-gray-500 hover:text-gray-700 transition-colors bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm border border-gray-200"
            title="Hide section"
          >
            ×
          </button>
          <LoanAllocationCard
            brandId={brandId || ''}
            data={allocationData}
            loading={allocationLoading}
            error={allocationError}
            dateFilter={query}
          />
        </div>
      )}

      {/* Second Row - Loan Analysis */}
      {(visibleSections.loanBreakdown || visibleSections.loanTypes) && (
        <div
          className={`grid gap-4 ${
            visibleSections.loanBreakdown && visibleSections.loanTypes
              ? 'grid-cols-1 xl:grid-cols-2'
              : 'grid-cols-1'
          }`}
        >
          {/* Loan Status Breakdown */}
          {visibleSections.loanBreakdown && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Loan Status Breakdown
                  </CardTitle>
                  <button
                    onClick={() => toggleSection('loanBreakdown')}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                    title="Hide section"
                  >
                    ×
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-8 bg-gray-200 rounded" />
                    ))}
                  </div>
                ) : (
                  renderLoanStatusBreakdown()
                )}
              </CardContent>
            </Card>
          )}

          {/* Loans by Type */}
          {visibleSections.loanTypes && (
            <div className="relative">
              <button
                onClick={() => toggleSection('loanTypes')}
                className="absolute top-3 right-3 z-10 text-gray-500 hover:text-gray-700 transition-colors bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm border border-gray-200"
                title="Hide section"
              >
                ×
              </button>
              <LoansByTypeCard query={query} loading={loading} />
            </div>
          )}
        </div>
      )}

      {/* Third Row - Subdomain Analysis */}
      {visibleSections.subdomain && (
  <div className="relative">
    <button
      onClick={() => toggleSection('subdomain')}
      className="absolute top-3 right-3 z-10 text-gray-500 hover:text-gray-700 transition-colors bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm border border-gray-200"
      title="Hide section"
    >
      ×
    </button>
    <UsersBySubdomainCard 
      query={query} 
      loading={loading}
      onLoanFilterChange={handleLoanFilterChange}
      currentLoanFilter={loanFilterType}
    />
  </div>
)}

      {/* Fourth Row - Additional Analytics */}
      {(visibleSections.location || visibleSections.company) && (
        <div
          className={`grid gap-4 ${
            visibleSections.location && visibleSections.company
              ? 'grid-cols-1 xl:grid-cols-2'
              : 'grid-cols-1'
          }`}
        >
          {/* Users by Location */}
          {visibleSections.location && (
            <div className="relative">
              <button
                onClick={() => toggleSection('location')}
                className="absolute top-3 right-3 z-10 text-gray-500 hover:text-gray-700 transition-colors bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm border border-gray-200"
                title="Hide section"
              >
                ×
              </button>
              <UsersByLocationCard query={query} loading={loading} />
            </div>
          )}

          {/* Users by Company */}
          {visibleSections.company && (
            <div className="relative">
              <button
                onClick={() => toggleSection('company')}
                className="absolute top-3 right-3 z-10 text-gray-500 hover:text-gray-700 transition-colors bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm border border-gray-200"
                title="Hide section"
              >
                ×
              </button>
              <UsersByCompanyCard query={query} loading={loading} />
            </div>
          )}
        </div>
      )}

      {/* Company Performance Section */}
      {visibleSections.companyPerformance && (
        <div className="relative">
          <button
            onClick={() => toggleSection('companyPerformance')}
            className="absolute top-3 right-3 z-10 text-gray-500 hover:text-gray-700 transition-colors bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm border border-gray-200"
            title="Hide section"
          >
            ×
          </button>
          <PerformanceByCompanyCard query={query} loading={loading} />
        </div>
      )}

     {visibleSections.calendar && (
  <div className="relative">
    <button
      onClick={() => toggleSection('calendar')}
      className="absolute top-3 right-3 z-10 text-gray-500 hover:text-gray-700 transition-colors bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm border border-gray-200"
      title="Hide section"
    >
      ×
    </button>
    <DashboardCalendar query={query} loading={loading} />
  </div>
)}

      {/* Fifth Row - Onboarding Analytics (Full Width) */}
      {visibleSections.onboarding && (
        <div className="relative">
          <button
            onClick={() => toggleSection('onboarding')}
            className="absolute top-3 right-3 z-10 text-gray-500 hover:text-gray-700 transition-colors bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm border border-gray-200"
            title="Hide section"
          >
            ×
          </button>
          <UsersByOnboardingStepCard query={query} loading={loading} />
        </div>
      )}

      {/* Global Dashboard Disclosure */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="text-sm text-blue-900">
          <strong>Dashboard Information:</strong>
        </div>
        <div className="text-xs text-blue-800 mt-1 space-y-1">
          <div>
            • All data reflects the selected time period:{' '}
            <strong>
              {getPeriodLabel(
                query.period || 'all',
                query.startDate,
                query.endDate,
              )}
            </strong>
          </div>
          <div>• Includes only active users and valid loan applications</div>
          <div>
            • Percentages and ratios calculated based on filtered dataset
          </div>
          <div>• Currency values displayed in Indian Rupees (INR)</div>
          <div>• Data refreshed in real-time based on your selections</div>
          <div>
            • Disbursement Analysis filter: Currently showing{' '}
            <strong>
              {loanFilterType === 'new' ? 'New Loans Only' : 
               loanFilterType === 'repeat' ? 'Repeat Loans Only' : 
               'All Loans'}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}
