import api from "../../../shared/services/axios";
import { DashboardStats, DashboardQuery } from "../types/dashboard.types";

export class DashboardService {
  /**
   * Fetch comprehensive dashboard statistics
   */
  static async getDashboardStats(brandId: string, query: DashboardQuery): Promise<DashboardStats> {
    const params = new URLSearchParams();
    
    if (query.period) params.append("period", query.period);
    if (query.startDate) params.append("startDate", query.startDate);
    if (query.endDate) params.append("endDate", query.endDate);

    const response = await api.get(`/partner/brand/${brandId}/dashboard/stats?${params.toString()}`);
    return response.data;
  }

  /**
   * Fetch basic dashboard summary
   */
  static async getDashboardSummary(brandId: string, query: DashboardQuery): Promise<DashboardStats> {
    const params = new URLSearchParams();
    
    if (query.period) params.append("period", query.period);
    if (query.startDate) params.append("startDate", query.startDate);
    if (query.endDate) params.append("endDate", query.endDate);

    const response = await api.get(`/partner/brand/${brandId}/dashboard/summary?${params.toString()}`);
    return response.data;
  }

  /**
   * Get quick stats for a specific period
   */
  static async getQuickStats(brandId: string, period: DashboardQuery["period"] = "month") {
    return this.getDashboardSummary(brandId, { period });
  }

  /**
   * Get current month overview
   */
  static async getCurrentMonthOverview(brandId: string) {
    const [currentMonth, lastMonth] = await Promise.all([
      this.getDashboardSummary(brandId, { period: "month" }),
      this.getDashboardSummary(brandId, { 
        period: "custom",
        startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
        endDate: new Date(new Date().setDate(0)).toISOString().split('T')[0]
      })
    ]);

    // Calculate growth percentages
    const userGrowth = lastMonth.summary.totalUsers > 0 
      ? ((currentMonth.summary.totalUsers - lastMonth.summary.totalUsers) / lastMonth.summary.totalUsers) * 100
      : 0;

    const loanGrowth = lastMonth.summary.totalLoans > 0
      ? ((currentMonth.summary.totalLoans - lastMonth.summary.totalLoans) / lastMonth.summary.totalLoans) * 100
      : 0;

    return {
      current: currentMonth,
      previous: lastMonth,
      growth: {
        users: userGrowth,
        loans: loanGrowth,
      }
    };
  }
}
