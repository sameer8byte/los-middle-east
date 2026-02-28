export interface FinancialOverviewResponse {
  data: {
    totalRevenue: number;
    totalDisbursed: number;
    averageLoanAmount: number;
    commissionEarned: number;
    revenueChange?: number;
    disbursedChange?: number;
    averageLoanChange?: number;
    commissionChange?: number;
    performanceRate?: number;
    growthRate?: number;
    marketShare?: number;
  };
  success: boolean;
  message?: string;
}

export interface FinancialMetric {
  label: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease';
  icon: React.ReactNode;
}

export interface FinancialInsight {
  title: string;
  description: string;
  value: number;
  type: 'performance' | 'growth' | 'market';
  color: 'blue' | 'green' | 'purple';
}
