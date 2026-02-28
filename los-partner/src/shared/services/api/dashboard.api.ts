import api from '../axios';

const buildQueryParams = (filter?: Record<string, string>) => {
  const params = new URLSearchParams();
  if (filter?.dateFilter) params.set('dateFilter', filter.dateFilter);
  if (filter?.startDate) params.set('startDate', filter.startDate);
  if (filter?.endDate) params.set('endDate', filter.endDate);
  return params.toString();
};

// New dashboard stats specific query builder
const buildDashboardQueryParams = (params?: {
  period?: string;
  startDate?: string;
  endDate?: string;
  loanFilterType?: 'new' | 'repeat' | 'both'; // Add type here
}) => {
  const searchParams = new URLSearchParams();
  if (params?.period) searchParams.append('period', params.period);
  if (params?.startDate) searchParams.append('startDate', params.startDate);
  if (params?.endDate) searchParams.append('endDate', params.endDate);

  if (params?.loanFilterType) searchParams.append('loanFilterType', params.loanFilterType);
  
  return searchParams.toString();
};

export const getUserOnboardingData = async (
  brandId: string,
  filter?: Record<string, string>,
) => {
  try {
    const queryString = buildQueryParams(filter);
    const response = await api.get(
      `/partner/brand/${brandId}/dashboard/user-onboarding${queryString ? `?${queryString}` : ''}`,
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching user onboarding data:', error);
    throw error;
  }
};

export const getUsersVsLoansRatio = async (
  brandId: string,
  filter?: Record<string, string>,
) => {
  try {
    const queryString = buildQueryParams(filter);
    const response = await api.get(
      `/partner/brand/${brandId}/dashboard/users-vs-loans${queryString ? `?${queryString}` : ''}`,
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching users vs loans ratio:', error);
    throw error;
  }
};

export const getLoanStatusDistribution = async (
  brandId: string,
  filter?: Record<string, string>,
) => {
  try {
    const queryString = buildQueryParams(filter);
    const response = await api.get(
      `/partner/brand/${brandId}/dashboard/loan-status-distribution${queryString ? `?${queryString}` : ''}`,
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching loan status distribution:', error);
    throw error;
  }
};

export const getDetailedAnalytics = async (
  brandId: string,
  filter?: Record<string, string>,
) => {
  try {
    const queryString = buildQueryParams(filter);
    const response = await api.get(
      `/partner/brand/${brandId}/dashboard/detailed-analytics${queryString ? `?${queryString}` : ''}`,
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching detailed analytics:', error);
    throw error;
  }
};

export const getFinancialOverview = async (
  brandId: string,
  filter?: Record<string, string>,
) => {
  try {
    const queryString = buildQueryParams(filter);
    const response = await api.get(
      `/partner/brand/${brandId}/dashboard/financial-overview${queryString ? `?${queryString}` : ''}`,
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching financial overview:', error);
    throw error;
  }
};

export const getUserAnalytics = async (
  brandId: string,
  filter?: Record<string, string>,
) => {
  try {
    const queryString = buildQueryParams(filter);
    const response = await api.get(
      `/partner/brand/${brandId}/dashboard/user-analytics${queryString ? `?${queryString}` : ''}`,
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    throw error;
  }
};

export const getCustomerSegmentation = async (
  brandId: string,
  filter?: Record<string, string>,
) => {
  try {
    const queryString = buildQueryParams(filter);
    const response = await api.get(
      `/partner/brand/${brandId}/dashboard/customer-segmentation${queryString ? `?${queryString}` : ''}`,
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching customer segmentation:', error);
    throw error;
  }
};

export const getComprehensiveDashboard = async (
  brandId: string,
  filter?: Record<string, string>,
) => {
  try {
    const queryString = buildQueryParams(filter);
    const response = await api.get(
      `/partner/brand/${brandId}/dashboard/comprehensive${queryString ? `?${queryString}` : ''}`,
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching comprehensive dashboard:', error);
    throw error;
  }
};

export const getFinancialMetrics = async (
  brandId: string,
  filter?: Record<string, string>,
) => {
  try {
    const queryString = buildQueryParams(filter);
    const url = `/partner/brand/${brandId}/dashboard/financial-metrics`;
    const response = await api.get(queryString ? `${url}?${queryString}` : url);
    return response.data;
  } catch (error) {
    console.error('Error fetching financial metrics:', error);
    throw error;
  }
};

// New Dashboard Stats API functions
export const getDashboardStats = async (
  brandId: string,
  params?: {
    period?: string;
    startDate?: string;
    endDate?: string;
  },
) => {
  try {
    const queryString = buildDashboardQueryParams(params);
    const url = `/partner/brand/${brandId}/dashboard/stats`;
    const response = await api.get(queryString ? `${url}?${queryString}` : url);
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
};

export const getDashboardSummary = async (
  brandId: string,
  params?: {
    period?: string;
    startDate?: string;
    endDate?: string;
  },
) => {
  try {
    const queryString = buildDashboardQueryParams(params);
    const url = `/partner/brand/${brandId}/dashboard/summary`;
    const response = await api.get(queryString ? `${url}?${queryString}` : url);
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    throw error;
  }
};

export const getUsersBySubdomain = async (
  brandId: string,
  params?: {
    period?: string;
    startDate?: string;
    endDate?: string;
  },
) => {
  try {
    const queryString = buildDashboardQueryParams(params);
    const url = `/partner/brand/${brandId}/dashboard/users-by-subdomain`;
    const response = await api.get(queryString ? `${url}?${queryString}` : url);
    return response.data;
  } catch (error) {
    console.error('Error fetching users by subdomain:', error);
    throw error;
  }
};

export const getUsersByLocation = async (
  brandId: string,
  params?: {
    period?: string;
    startDate?: string;
    endDate?: string;
  },
) => {
  try {
    const queryString = buildDashboardQueryParams(params);
    const url = `/partner/brand/${brandId}/dashboard/users-by-location`;
    const response = await api.get(queryString ? `${url}?${queryString}` : url);
    return response.data;
  } catch (error) {
    console.error('Error fetching users by location:', error);
    throw error;
  }
};

export const getUsersByCompany = async (
  brandId: string,
  params?: {
    period?: string;
    startDate?: string;
    endDate?: string;
  },
) => {
  try {
    const queryString = buildDashboardQueryParams(params);
    const url = `/partner/brand/${brandId}/dashboard/users-by-company`;
    const response = await api.get(queryString ? `${url}?${queryString}` : url);
    return response.data;
  } catch (error) {
    console.error('Error fetching users by company:', error);
    throw error;
  }
};

export const getUsersByOnboardingStep = async (
  brandId: string,
  params?: {
    period?: string;
    startDate?: string;
    endDate?: string;
  },
) => {
  try {
    const queryString = buildDashboardQueryParams(params);
    const url = `/partner/brand/${brandId}/dashboard/users-by-onboarding-step`;
    const response = await api.get(queryString ? `${url}?${queryString}` : url);
    return response.data;
  } catch (error) {
    console.error('Error fetching users by onboarding step:', error);
    throw error;
  }
};

export const getLoansByType = async (
  brandId: string,
  params?: {
    period?: string;
    startDate?: string;
    endDate?: string;
  },
) => {
  try {
    const queryString = buildDashboardQueryParams(params);
    const url = `/partner/brand/${brandId}/dashboard/loans-by-type`;
    const response = await api.get(queryString ? `${url}?${queryString}` : url);
    return response.data;
  } catch (error) {
    console.error('Error fetching loans by type:', error);
    throw error;
  }
};

export const getLoanAllocationDetails = async (
  brandId: string,
  params?: {
    period?: string;
    startDate?: string;
    endDate?: string;
  },
) => {
  try {
    const queryString = buildDashboardQueryParams(params);
    const url = `/partner/brand/${brandId}/dashboard/loan-allocation-details`;
    const response = await api.get(queryString ? `${url}?${queryString}` : url);
    return response.data;
  } catch (error) {
    console.error('Error fetching loan allocation details:', error);
    throw error;
  }
};

export const getCollectionAnalysis = async (
  brandId: string,
  params?: {
    period?: string;
    startDate?: string;
    endDate?: string;
  },
) => {
  try {
    const queryString = buildDashboardQueryParams(params);
    const url = `/partner/brand/${brandId}/dashboard/collection-analysis`;
    const response = await api.get(queryString ? `${url}?${queryString}` : url);
    return response.data;
  } catch (error) {
    console.error('Error fetching collection analysis:', error);
    throw error;
  }
};

export const getDisbursementAnalysis = async (
  brandId: string,
  params?: {
    period?: string;
    startDate?: string;
    endDate?: string;
    loanFilterType?: 'new' | 'repeat' | 'both';
  },
) => {
  try {
    const queryString = buildDashboardQueryParams(params);
    const url = `/partner/brand/${brandId}/dashboard/disbursement-analysis`;
    const response = await api.get(queryString ? `${url}?${queryString}` : url);
    return response.data;
  } catch (error) {
    console.error('Error fetching disbursement analysis:', error);
    throw error;
  }
};
export const getPartnerUserLeadsStats = async (
  brandId: string,
  params?: {
    period?: string;
    startDate?: string;
    endDate?: string;
  },
) => {
  try {
    const queryString = buildDashboardQueryParams(params);
    const url = `/partner/brand/${brandId}/dashboard/partner-user-leads-stats`;
    const response = await api.get(queryString ? `${url}?${queryString}` : url);
    return response.data;
  } catch (error) {
    console.error('Error fetching partner user leads stats:', error);
    throw error;
  }
};
export const getPerformanceByCompany = async (
  brandId: string,
  params?: {
    period?: string;
    startDate?: string;
    endDate?: string;
  },
) => {
  try {
    const queryString = buildDashboardQueryParams(params);
    const url = `/partner/brand/${brandId}/dashboard/performance-by-company`;
    const response = await api.get(queryString ? `${url}?${queryString}` : url);
    return response.data;
  } catch (error) {
    console.error('Error fetching performance by company:', error);
    throw error;
  }
};