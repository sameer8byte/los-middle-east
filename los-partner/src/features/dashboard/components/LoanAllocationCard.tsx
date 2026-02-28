import React, { useState, useEffect, useRef } from 'react';
import {
  LoanAllocationDetailsResponse,
  PartnerUserAllocation,
} from '../types/dashboard.types';
import { getPartnerUserLeadsStats } from '../../../shared/services/api/dashboard.api';

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

const getRoleClass = (role: string) => {
  if (role === 'head') return 'bg-red-100 text-red-800';
  if (role === 'manager') return 'bg-blue-100 text-blue-800';
  return 'bg-green-100 text-green-800';
};

interface LoanAllocationCardProps {
  brandId: string;
  data: LoanAllocationDetailsResponse | null;
  loading: boolean;
  error: string | null;
  dateFilter?: {
    period?: string;
    startDate?: string;
    endDate?: string;
  };
}

export const LoanAllocationCard: React.FC<LoanAllocationCardProps> = ({
  brandId,
  data,
  loading,
  error,
  dateFilter,
}) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<'leads' | 'loans'>('loans');
  const [showViewDropdown, setShowViewDropdown] = useState(false);

  // Leads data state with prefetching
  const [leadsData, setLeadsData] = useState<any>(null);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsError, setLeadsError] = useState<string | null>(null);

  // Cache and prefetch tracking
  const leadsCache = useRef<Map<string, any>>(new Map());
  const prefetchTriggered = useRef<Set<string>>(new Set());

  // Generate cache key based on filter parameters
  const getCacheKey = () => {
    return `${brandId}-${dateFilter?.period || 'all'}-${dateFilter?.startDate || ''}-${dateFilter?.endDate || ''}`;
  };

  // Prefetch leads data in the background when loans data loads
  useEffect(() => {
    const prefetchLeadsData = async () => {
      if (!brandId || loading) return;

      const cacheKey = getCacheKey();

      // Check if already prefetched or in cache
      if (
        prefetchTriggered.current.has(cacheKey) ||
        leadsCache.current.has(cacheKey)
      ) {
        return;
      }

      // Mark as prefetch triggered
      prefetchTriggered.current.add(cacheKey);

      try {
        // Prefetch in background without showing loading state
        const response = await getPartnerUserLeadsStats(brandId, dateFilter);
        leadsCache.current.set(cacheKey, response);

        // If user hasn't switched yet, set the data silently
        if (viewMode === 'loans') {
          setLeadsData(response);
        }
      } catch (err) {
        console.error('Error prefetching leads data:', err);
      }
    };

    // Trigger prefetch after a short delay to prioritize loans rendering
    const prefetchTimer = setTimeout(prefetchLeadsData, 500);

    return () => clearTimeout(prefetchTimer);
  }, [
    brandId,
    loading,
    dateFilter?.period,
    dateFilter?.startDate,
    dateFilter?.endDate,
  ]);

  // Fetch leads data when explicitly switching to leads view
  useEffect(() => {
    const fetchLeadsData = async () => {
      if (viewMode !== 'leads') return;

      const cacheKey = getCacheKey();

      // Check if data exists in cache
      if (leadsCache.current.has(cacheKey)) {
        const cachedData = leadsCache.current.get(cacheKey);
        setLeadsData(cachedData);
        setLeadsError(null);
        return;
      }

      // If not in cache, fetch with loading state
      try {
        setLeadsLoading(true);
        setLeadsError(null);
        const response = await getPartnerUserLeadsStats(brandId, dateFilter);

        // Store in cache
        leadsCache.current.set(cacheKey, response);
        prefetchTriggered.current.add(cacheKey);
        setLeadsData(response);
      } catch (err) {
        console.error('Error fetching leads data:', err);
        setLeadsError('Failed to load leads statistics');
      } finally {
        setLeadsLoading(false);
      }
    };

    fetchLeadsData();
  }, [
    viewMode,
    brandId,
    dateFilter?.period,
    dateFilter?.startDate,
    dateFilter?.endDate,
  ]);

  // Clear cache when date filter changes
  useEffect(() => {
    const currentKey = getCacheKey();
    const currentData = leadsCache.current.get(currentKey);

    // Clear cache and prefetch tracking
    leadsCache.current.clear();
    prefetchTriggered.current.clear();

    // Restore current data if it exists
    if (currentData) {
      leadsCache.current.set(currentKey, currentData);
      prefetchTriggered.current.add(currentKey);
    }
  }, [dateFilter?.period, dateFilter?.startDate, dateFilter?.endDate]);

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
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Loan Allocation Details
        </h3>
        <div className="text-center py-6 text-gray-500">
          {error || 'No data available'}
        </div>
      </div>
    );
  }

  const tabCategories =
    viewMode === 'loans'
      ? [
          {
            name: 'Overview',
            count: data.allocationDetails.filter((a) => a.totalLoans > 0)
              .length,
          },
          {
            name: 'Executives',
            count: data.allocationDetails.filter(
              (a) => a.role === 'executive' && a.totalLoans > 0,
            ).length,
          },
          {
            name: 'Managers',
            count: data.allocationDetails.filter(
              (a) => a.role === 'manager' && a.totalLoans > 0,
            ).length,
          },
          {
            name: 'Heads',
            count: data.allocationDetails.filter(
              (a) => a.role === 'head' && a.totalLoans > 0,
            ).length,
          },
          { name: 'Unallocated', count: data.summary.unallocatedCount },
        ]
      : leadsData
        ? [
            {
              name: 'Overview',
              count: leadsData.partnerUserStats.filter(
                (s: any) => s.totalLeads > 0,
              ).length,
            },
            {
              name: 'Executives',
              count: leadsData.partnerUserStats.filter(
                (s: any) => s.role === 'executive' && s.totalLeads > 0,
              ).length,
            },
            {
              name: 'Managers',
              count: leadsData.partnerUserStats.filter(
                (s: any) => s.role === 'manager' && s.totalLeads > 0,
              ).length,
            },
            {
              name: 'Heads',
              count: leadsData.partnerUserStats.filter(
                (s: any) => s.role === 'head' && s.totalLeads > 0,
              ).length,
            },
          ]
        : [
            { name: 'Overview', count: 0 },
            { name: 'Executives', count: 0 },
            { name: 'Managers', count: 0 },
            { name: 'Heads', count: 0 },
          ];

  const renderSummaryStats = () => {
    if (viewMode === 'leads') {
      if (leadsLoading) {
        return (
          <div className="animate-pulse space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        );
      }

      if (!leadsData) {
        return (
          <div className="text-center py-4 text-gray-500">
            No leads data available
          </div>
        );
      }

      return (
        <div className="space-y-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-xs text-blue-600 font-medium">
                Total Leads
              </div>
              <div className="text-lg font-bold text-blue-900">
                {formatNumber(leadsData.summary.totalLeads)}
              </div>
              <div className="text-xs text-blue-600">
                {leadsData.summary.totalPartnerUsers} Partners
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="text-xs text-green-600 font-medium">Active</div>
              <div className="text-lg font-bold text-green-900">
                {formatNumber(leadsData.summary.totalActive)}
              </div>
              <div className="text-xs text-green-600">Active leads</div>
            </div>
            <div className="bg-orange-50 p-3 rounded">
              <div className="text-xs text-orange-600 font-medium">Pending</div>
              <div className="text-lg font-bold text-orange-900">
                {formatNumber(leadsData.summary.totalPending)}
              </div>
              <div className="text-xs text-orange-600">Awaiting review</div>
            </div>
            <div className="bg-red-50 p-3 rounded">
              <div className="text-xs text-red-600 font-medium">Rejected</div>
              <div className="text-lg font-bold text-red-900">
                {formatNumber(leadsData.summary.totalRejected)}
              </div>
              <div className="text-xs text-red-600">Rejected leads</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-purple-50 p-3 rounded">
              <div className="text-xs text-purple-600 font-medium">On Hold</div>
              <div className="text-lg font-bold text-purple-900">
                {formatNumber(leadsData.summary.totalHold)}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs text-gray-600 font-medium">
                Unassigned
              </div>
              <div className="text-lg font-bold text-gray-900">
                {formatNumber(leadsData.summary.unassignedLeads)}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-blue-50 p-3 rounded">
            <div className="text-xs text-blue-600 font-medium">Total Loans</div>
            <div className="text-lg font-bold text-blue-900">
              {formatNumber(data.summary.totalLoans)}
            </div>
            <div className="text-xs text-blue-600">
              {formatCurrency(data.summary.totalAmount)}
            </div>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <div className="text-xs text-green-600 font-medium">Allocated</div>
            <div className="text-lg font-bold text-green-900">
              {formatNumber(data.summary.allocatedCount)}
            </div>
            <div className="text-xs text-green-600">
              {formatCurrency(data.summary.allocatedAmount)}
            </div>
          </div>
          <div className="bg-orange-50 p-3 rounded">
            <div className="text-xs text-orange-600 font-medium">
              Unallocated
            </div>
            <div className="text-lg font-bold text-orange-900">
              {formatNumber(data.summary.unallocatedCount)}
            </div>
            <div className="text-xs text-orange-600">
              {formatCurrency(data.summary.unallocatedAmount)}
            </div>
          </div>
          <div className="bg-purple-50 p-3 rounded">
            <div className="text-xs text-purple-600 font-medium">
              Allocation %
            </div>
            <div className="text-lg font-bold text-purple-900">
              {data.summary.allocationPercentage}%
            </div>
            <div className="text-xs text-purple-600">
              {formatNumber(data.summary.allocatedCount)} /{' '}
              {formatNumber(data.summary.totalLoans)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderHierarchyOverview = () => {
    if (viewMode === 'leads') {
      if (leadsLoading) {
        return (
          <div className="animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        );
      }

      if (!leadsData) return null;

      const activeExecutives = leadsData.partnerUserStats.filter(
        (s: any) => s.role === 'executive' && s.totalLeads > 0,
      );
      const activeManagers = leadsData.partnerUserStats.filter(
        (s: any) => s.role === 'manager' && s.totalLeads > 0,
      );
      const activeHeads = leadsData.partnerUserStats.filter(
        (s: any) => s.role === 'head' && s.totalLeads > 0,
      );

      const executivesLeads = activeExecutives.reduce(
        (sum: number, s: any) => sum + s.totalLeads,
        0,
      );
      const executivesActive = activeExecutives.reduce(
        (sum: number, s: any) => sum + s.active,
        0,
      );
      const executivesPending = activeExecutives.reduce(
        (sum: number, s: any) => sum + s.pending,
        0,
      );
      const executivesRejected = activeExecutives.reduce(
        (sum: number, s: any) => sum + s.rejected,
        0,
      );

      const managersLeads = activeManagers.reduce(
        (sum: number, s: any) => sum + s.totalLeads,
        0,
      );
      const managersActive = activeManagers.reduce(
        (sum: number, s: any) => sum + s.active,
        0,
      );
      const managersPending = activeManagers.reduce(
        (sum: number, s: any) => sum + s.pending,
        0,
      );
      const managersRejected = activeManagers.reduce(
        (sum: number, s: any) => sum + s.rejected,
        0,
      );

      const headsLeads = activeHeads.reduce(
        (sum: number, s: any) => sum + s.totalLeads,
        0,
      );
      const headsActive = activeHeads.reduce(
        (sum: number, s: any) => sum + s.active,
        0,
      );
      const headsPending = activeHeads.reduce(
        (sum: number, s: any) => sum + s.pending,
        0,
      );
      const headsRejected = activeHeads.reduce(
        (sum: number, s: any) => sum + s.rejected,
        0,
      );

      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-indigo-50 p-3 rounded">
            <div className="text-sm font-medium text-indigo-900">
              Executives
            </div>
            <div className="text-lg font-bold text-indigo-900">
              {activeExecutives.length}
            </div>
            <div className="text-xs text-indigo-600">
              {formatNumber(executivesLeads)} leads •
              {formatNumber(executivesActive)} active
            </div>
            <div className="text-xs text-indigo-500 mt-1">
              Pending: {formatNumber(executivesPending)} | Rejected:{' '}
              {formatNumber(executivesRejected)}
            </div>
          </div>
          <div className="bg-teal-50 p-3 rounded">
            <div className="text-sm font-medium text-teal-900">Managers</div>
            <div className="text-lg font-bold text-teal-900">
              {activeManagers.length}
            </div>
            <div className="text-xs text-teal-600">
              {formatNumber(managersLeads)} leads •
              {formatNumber(managersActive)} active
            </div>
            <div className="text-xs text-teal-500 mt-1">
              Pending: {formatNumber(managersPending)} | Rejected:{' '}
              {formatNumber(managersRejected)}
            </div>
          </div>
          <div className="bg-amber-50 p-3 rounded">
            <div className="text-sm font-medium text-amber-900">Heads</div>
            <div className="text-lg font-bold text-amber-900">
              {activeHeads.length}
            </div>
            <div className="text-xs text-amber-600">
              {formatNumber(headsLeads)} leads •{formatNumber(headsActive)}{' '}
              active
            </div>
            <div className="text-xs text-amber-500 mt-1">
              Pending: {formatNumber(headsPending)} | Rejected:{' '}
              {formatNumber(headsRejected)}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="bg-indigo-50 p-3 rounded">
          <div className="text-sm font-medium text-indigo-900">Executives</div>
          <div className="text-lg font-bold text-indigo-900">
            {
              data.allocationDetails.filter(
                (a) => a.role === 'executive' && a.totalLoans > 0,
              ).length
            }
          </div>
          <div className="text-xs text-indigo-600">
            {formatNumber(data.hierarchy.executives.totalLoans)} loans •{' '}
            {formatCurrency(data.hierarchy.executives.totalAmount)}
          </div>
        </div>
        <div className="bg-teal-50 p-3 rounded">
          <div className="text-sm font-medium text-teal-900">Managers</div>
          <div className="text-lg font-bold text-teal-900">
            {
              data.allocationDetails.filter(
                (a) => a.role === 'manager' && a.totalLoans > 0,
              ).length
            }
          </div>
          <div className="text-xs text-teal-600">
            {formatNumber(data.hierarchy.managers.totalLoans)} loans •{' '}
            {formatCurrency(data.hierarchy.managers.totalAmount)}
          </div>
        </div>
        <div className="bg-amber-50 p-3 rounded">
          <div className="text-sm font-medium text-amber-900">Heads</div>
          <div className="text-lg font-bold text-amber-900">
            {
              data.allocationDetails.filter(
                (a) => a.role === 'head' && a.totalLoans > 0,
              ).length
            }
          </div>
          <div className="text-xs text-amber-600">
            {formatNumber(data.hierarchy.heads.totalLoans)} loans •{' '}
            {formatCurrency(data.hierarchy.heads.totalAmount)}
          </div>
        </div>
      </div>
    );
  };

  const renderUserAllocationTable = (
    allocations: PartnerUserAllocation[] | any[],
  ) => {
    const filteredAllocations = allocations.filter((a: any) => {
      if (viewMode === 'leads') {
        return a.totalLeads > 0;
      }
      return a.totalLoans > 0;
    });

    const groupedAllocations: any[] = [];
    const heads = filteredAllocations.filter((a: any) => a.role === 'head');
    const managers = filteredAllocations.filter(
      (a: any) => a.role === 'manager',
    );
    const executives = filteredAllocations.filter(
      (a: any) => a.role === 'executive',
    );

    heads.forEach((head: any) => {
      groupedAllocations.push(head);
    });

    managers.forEach((manager: any) => {
      groupedAllocations.push(manager);
      const subordinates = executives.filter((exec: any) => {
        if (viewMode === 'leads') {
          return exec.managerName === manager.name;
        }
        return exec.managerName === manager.partnerUser.name;
      });
      groupedAllocations.push(...subordinates);
    });

    const unmanagedExecutives = executives.filter((exec: any) => {
      if (viewMode === 'leads') {
        return (
          !exec.managerName ||
          !managers.some((m: any) => m.name === exec.managerName)
        );
      }
      return (
        !exec.managerName ||
        !managers.some((m: any) => m.partnerUser.name === exec.managerName)
      );
    });
    groupedAllocations.push(...unmanagedExecutives);

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                <div className="flex items-center gap-2">
                  <span>User</span>
                  <div className="relative">
                    <button
                      onClick={() => setShowViewDropdown(!showViewDropdown)}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                    >
                      <span className="capitalize">{viewMode}</span>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {showViewDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-32 bg-white border border-gray-300 rounded shadow-lg z-10">
                        <button
                          onClick={() => {
                            setViewMode('leads');
                            setShowViewDropdown(false);
                            setSelectedTab(0);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                            viewMode === 'leads'
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-gray-700'
                          }`}
                        >
                          Leads
                        </button>
                        <button
                          onClick={() => {
                            setViewMode('loans');
                            setShowViewDropdown(false);
                            setSelectedTab(0);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                            viewMode === 'loans'
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-gray-700'
                          }`}
                        >
                          Loans
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Role
              </th>
              {viewMode === 'leads' ? (
                <>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Total Leads
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Pending
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Hold
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Rejected
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Active
                  </th>
                </>
              ) : (
                <>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Loan Amount
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Loans
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Pending
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Hold
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Rejected
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Subordinates
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {groupedAllocations.map((allocation) => {
              const isExecutive = allocation.role === 'executive';
              const rowClass = isExecutive ? 'bg-blue-50/30' : '';

              if (viewMode === 'leads') {
                return (
                  <tr
                    key={allocation.partnerUserId}
                    className={`hover:bg-gray-50 ${rowClass}`}
                  >
                    <td className="px-4 py-2">
                      <div className={isExecutive ? 'pl-6' : ''}>
                        <div className="text-sm font-medium text-gray-900">
                          {allocation.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {allocation.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${getRoleClass(allocation.role)}`}
                      >
                        {allocation.role}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="text-sm font text-black-700">
                        {formatNumber(allocation.totalLeads)}
                      </div>
                      {(allocation.role === 'manager' ||
                        allocation.role === 'head') &&
                        allocation.teamLeads > 0 && (
                          <div className="text-xs text-gray-500">
                            Direct: {formatNumber(allocation.directLeads)} |
                            Team: {formatNumber(allocation.teamLeads)}
                          </div>
                        )}
                    </td>
                    <td className="px-4 py-2 text-sm text-black-700">
                      {formatNumber(allocation.pending)}
                    </td>
                    <td className="px-4 py-2 text-sm text-black-700">
                      {formatNumber(allocation.hold)}
                    </td>
                    <td className="px-4 py-2 text-sm text-black-700">
                      {formatNumber(allocation.rejected)}
                    </td>
                    <td className="px-4 py-2 text-sm text-black-700">
                      {formatNumber(allocation.active)}
                    </td>
                  </tr>
                );
              }

              const statusBreakdown = allocation.statusBreakdown || {};
              const pending = statusBreakdown['PENDING']?.count || 0;
              const hold =
                (statusBreakdown['HOLD']?.count || 0) +
                (statusBreakdown['ON_HOLD']?.count || 0);
              const rejected = statusBreakdown['REJECTED']?.count || 0;

              return (
                <tr
                  key={allocation.partnerUser.id}
                  className={`hover:bg-gray-50 ${rowClass}`}
                >
                  <td className="px-4 py-2">
                    <div className={isExecutive ? 'pl-6' : ''}>
                      <div className="text-sm font-medium text-gray-900">
                        {allocation.partnerUser.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {allocation.partnerUser.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${getRoleClass(allocation.role)}`}
                    >
                      {allocation.role}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {formatCurrency(allocation.totalAmount)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {formatNumber(allocation.totalLoans)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {formatNumber(pending)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {formatNumber(hold)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {formatNumber(rejected)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {allocation.subordinateCount}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderUnallocatedLoans = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Loan ID
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Amount
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Status
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Type
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Date
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.unallocatedLoans.slice(0, 50).map((loan) => (
            <tr key={loan.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 text-sm font-medium text-gray-900">
                {loan.formattedLoanId || loan.id.slice(0, 8)}
              </td>
              <td className="px-4 py-2 text-sm text-gray-900">
                {formatCurrency(loan.amount)}
              </td>
              <td className="px-4 py-2">
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                  {loan.status}
                </span>
              </td>
              <td className="px-4 py-2 text-sm text-gray-900">
                {loan.loanType}
              </td>
              <td className="px-4 py-2 text-sm text-gray-500">
                {new Date(loan.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.unallocatedLoans.length > 50 && (
        <div className="p-3 text-center text-sm text-gray-500">
          Showing 50 of {data.unallocatedLoans.length} unallocated loans
        </div>
      )}
    </div>
  );

  const renderTabContent = () => {
    if (viewMode === 'leads') {
      if (leadsLoading) {
        return (
          <div className="animate-pulse space-y-3">
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        );
      }

      if (leadsError || !leadsData) {
        return (
          <div className="text-center py-6 text-red-500">
            {leadsError || 'No leads data available'}
          </div>
        );
      }

      const getFilteredLeadsStats = () => {
        const activeStats = leadsData.partnerUserStats.filter(
          (s: any) => s.totalLeads > 0,
        );

        switch (selectedTab) {
          case 1:
            return activeStats.filter((s: any) => s.role === 'executive');
          case 2:
            return activeStats.filter((s: any) => s.role === 'manager');
          case 3:
            return activeStats.filter((s: any) => s.role === 'head');
          default:
            return activeStats;
        }
      };

      switch (selectedTab) {
        case 0:
          return (
            <div className="space-y-4">
              {renderSummaryStats()}
              {renderHierarchyOverview()}
              {renderUserAllocationTable(
                leadsData.partnerUserStats.filter((s: any) => s.totalLeads > 0),
              )}
            </div>
          );
        case 1:
        case 2:
        case 3:
          return renderUserAllocationTable(getFilteredLeadsStats());
        default:
          return null;
      }
    }

    // Loans view
    switch (selectedTab) {
      case 0:
        return (
          <div className="space-y-4">
            {renderSummaryStats()}
            {renderHierarchyOverview()}
            {renderUserAllocationTable(
              data.allocationDetails.filter((a) => a.totalLoans > 0),
            )}
          </div>
        );
      case 1:
        return renderUserAllocationTable(
          data.allocationDetails.filter(
            (a) => a.role === 'executive' && a.totalLoans > 0,
          ),
        );
      case 2:
        return renderUserAllocationTable(
          data.allocationDetails.filter(
            (a) => a.role === 'manager' && a.totalLoans > 0,
          ),
        );
      case 3:
        return renderUserAllocationTable(
          data.allocationDetails.filter(
            (a) => a.role === 'head' && a.totalLoans > 0,
          ),
        );
      case 4:
        return renderUnallocatedLoans();
      default:
        return null;
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
    <div className="flex justify-between items-center px-3 py-2 bg-gray-50 border-b">
      <h3 className="text-sm font-semibold text-gray-900">
        {viewMode === 'leads'
          ? 'Leads Allocation Details'
          : 'Loan Allocation Details'}{' '}
        <span className="text-xs font-normal text-gray-600">
          ({data.dateRange.period})
        </span>
      </h3>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-gray-500 hover:text-gray-700 p-1"
      >
        {isExpanded ? (
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
        ) : (
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        )}
      </button>
    </div>
  
    {isExpanded && (
      <div className="p-3">
        {/* Tab Navigation - Compact */}
        <div className="flex space-x-0.5 rounded-lg bg-gray-100 p-0.5 mb-3 overflow-x-auto text-xs">
          {tabCategories.map((category, index) => (
            <button
              key={category.name}
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
  </div>)};

export default LoanAllocationCard;
