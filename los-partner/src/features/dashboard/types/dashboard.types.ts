export interface DashboardStats {
  summary: {
    totalUsers: number;
    totalLoans: number;
    loanStatusBreakdown: Record<string, { count: number; amount: number }>;
    loanStatusBreakdownTotals: {
      totalCount: number;
      totalAmount: number;
    };
    loanTypeBreakdown?: Record<
      string,
      {
        count: number;
        amount: number;
        percentage: number;
        amountPercentage: number;
      }
    >;
    loanTypeBreakdownTotals?: {
      totalCount: number;
      totalAmount: number;
    };
    totalLoanAmount: number;
    averageLoanAmount: number;
  };

  dateRange: {
    startDate?: string;
    endDate?: string;
    period: string;
  };
}

export interface DashboardQuery {
  period?:  'today'| 'tilldate' | 'yesterday' | 'week' | 'month' | 'year' | 'all' | 'custom';
  startDate?: string;
  endDate?: string;
  loanFilterType?: 'new' | 'repeat' | 'both'; 
}

export interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
}

export interface ChartDataPoint {
  date: string;
  count: number;
}

export interface LoanStatusBreakdown {
  [status: string]: {
    count: number;
    amount: number;
  };
}

export interface SubdomainUserData {
  subdomain: string;
  marketingSource: string | null;
  isPrimary: boolean;
  subdomainId: string | null;
  totalLoans: number;
  totalLoanAmount: number;
  averageLoanAmount: number;
  loanStatusBreakdown: Record<string, { count: number; amount: number }>;
  loanTypeBreakdown?: Record<string, { count: number; amount: number }>;
  disbursedCount: number;
  disbursedAmount: number;  
}

export interface UsersBySubdomainResponse {
  loansBySubdomain: SubdomainUserData[];
  totalSubdomains: number;
  totalLoans: number;
  totalLoanAmount: number;
  averageLoanAmount: number;
  totalDisbursedCount: number;
  totalDisbursedAmount: number;
  loanFilterType?: 'new' | 'repeat' | 'both';
  dateRange: {
    startDate?: string;
    endDate?: string;
    period: string;
  };
}

export interface LocationUserData {
  state: string;
  totalUsers: number;
  cities: Array<{
    city: string;
    userCount: number;
  }>;
}

export interface UsersByLocationResponse {
  usersByLocation: LocationUserData[];
  totalStates: number;
  totalUsers: number;
  dateRange: {
    startDate?: string;
    endDate?: string;
    period: string;
  };
}

export interface CompanyUserData {
  companyName: string;
  userCount: number;
  uniqueDesignations: string[];
  averageSalary: number;
  employmentTypes: string[];
}

export interface UsersByCompanyResponse {
  usersByCompany: CompanyUserData[];
  totalCompanies: number;
  totalUsers: number;
  dateRange: {
    startDate?: string;
    endDate?: string;
    period: string;
  };
}

export interface OnboardingStepData {
  step: number;
  stepLabel: string;
  userCount: number;
  percentage: number;
}

export interface UsersByOnboardingStepResponse {
  usersByStep: OnboardingStepData[];
  totalSteps: number;
  totalUsers: number;
  completionRate: number;
  dateRange: {
    startDate?: string;
    endDate?: string;
    period: string;
  };
}

export interface PartnerUserAllocation {
  partnerUser: {
    id: string;
    name: string;
    email: string;
    reportsToId: string | null;
    reportsTo?: {
      name: string;
      email: string;
    };
  };
  role: 'executive' | 'manager' | 'head';
  totalLoans: number;
  totalAmount: number;
  statusBreakdown: Record<string, { count: number; amount: number }>;
  loanTypeBreakdown: Record<string, { count: number; amount: number }>;
  managerName: string | null;
  subordinateCount: number;
}

export interface UnallocatedLoan {
  id: string;
  formattedLoanId: string | null;
  amount: number;
  status: string;
  loanType: string;
  createdAt: string;
}

export interface LoanAllocationDetailsResponse {
  summary: {
    totalLoans: number;
    totalAmount: number;
    unallocatedCount: number;
    allocatedCount: number;
    unallocatedAmount: number;
    allocatedAmount: number;
    allocationPercentage: number;
  };
  hierarchy: {
    executives: {
      count: number;
      totalLoans: number;
      totalAmount: number;
    };
    managers: {
      count: number;
      totalLoans: number;
      totalAmount: number;
    };
    heads: {
      count: number;
      totalLoans: number;
      totalAmount: number;
    };
  };
  allocationDetails: PartnerUserAllocation[];
  unallocatedLoans: UnallocatedLoan[];
  dateRange: {
    startDate?: string;
    endDate?: string;
    period: string;
  };
}
export interface DailyPerformanceData {
  date: string;
  newCase: number;
  repeatCases: number;
  totalCases: number;
  loanAmount: number;
  pfAmount: number;
  disbursalAmount: number;
  repayAmount: number;
}

export interface DisbursementByDateData {
  month: string;
  count: number;
  totalAmount: number;
  loans: Array<{
    id: string;
    formattedLoanId: string | null;
    amount: number;
    status: string;
    loanType: string;
    disbursementDate: string | null;
    customerName: string;
    customerId: string;
    phoneNumber: string;
  }>;
}

export interface DisbursementByStatusData {
  status: string;
  count: number;
  totalAmount: number;
  percentage: number;
}

export interface DisbursementByTypeData {
  loanType: string;
  count: number;
  totalAmount: number;
  percentage: number;
}

export interface DisbursementByStateData {
  state: string;
  count: number;
  totalAmount: number;
}

export interface DisbursementByExecutiveData {
  executiveId: string;
  executiveName: string;
  executiveEmail: string;
  count: number;
  totalAmount: number;
  percentage: number;
  averageAmount: number;
  role?: 'executive' | 'manager' | 'head';
}

export interface DisbursementAnalysisResponse {
  summary: {
    totalDisbursements: number;
    totalAmount: number;
    averageAmount: number;
  };
  dailyPerformance?: DailyPerformanceData[]; 
  disbursementByDate: DisbursementByDateData[];
  disbursementByStatus: DisbursementByStatusData[];
  disbursementByType: DisbursementByTypeData[];
  disbursementByState: DisbursementByStateData[];
  disbursementByExecutive: DisbursementByExecutiveData[];
  dateRange: {
    startDate?: string;
    endDate?: string;
    period: string;
  };
}
export interface PartnerUserLeadStats {
  partnerUserId: string;
  name: string;
  email: string;
  role: 'executive' | 'manager' | 'head';
  managerName?: string;
  totalLeads: number;
  directLeads: number;
  teamLeads: number;
  pending: number;
  hold: number;
  rejected: number;
  active: number;
  conversionRate: number;
}

export interface HierarchyBreakdown {
  executives: {
    count: number;
    totalLeads: number;
    pending: number;
    hold: number;
    rejected: number;
    active: number;
  };
  managers: {
    count: number;
    totalLeads: number;
    pending: number;
    hold: number;
    rejected: number;
    active: number;
  };
  heads: {
    count: number;
    totalLeads: number;
    pending: number;
    hold: number;
    rejected: number;
    active: number;
  };
}

export interface PartnerUserLeadsStatsResponse {
  summary: {
    totalLeads: number;
    totalPending: number;
    totalHold: number;
    totalRejected: number;
    totalActive: number;
    unassignedLeads: number;
    overallConversionRate: number;
  };
  hierarchyBreakdown: HierarchyBreakdown;
  partnerUserStats: PartnerUserLeadStats[];
  dateRange: {
    startDate?: string;
    endDate?: string;
    period: string;
  };
}
export interface CompanyPerformanceData { companyName: string;
  totalDisbursed: number;
  disbursedAmount: number;
  totalObligation: number;
  totalCollected: number;
  collectionEfficiency: number;
}

export interface PerformanceByCompanyResponse {
  summary: {
    totalCompanies: number;
    totalDisbursed: number;
    totalDisbursedAmount: number;
    totalObligation: number;
    totalCollected: number;
    overallCollectionEfficiency: number;
  };
  companyPerformance: CompanyPerformanceData[];
  dateRange: {
    startDate?: string;
    endDate?: string;
    period: string;
  };
}
