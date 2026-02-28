import { useState, useCallback, useEffect, useMemo, memo } from "react";
import { getReminderDashboardMetrics, refreshReminderDashboardMetrics } from "../../../shared/services/api/reminder.api";
import { useParams } from "react-router-dom";
import { CgSpinner } from "react-icons/cg";
import { HiOutlineUser } from "react-icons/hi2";
import { MdRefresh } from "react-icons/md";
import { useToast } from "../../../context/toastContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface MetricsData {
  template_code: string;
  total_reminders: number;
  total_users_with_reminders: number;
  pending_reminders: number;
  success_reminders: number;
  failed_reminders: number;
  cancelled_reminders: number;
  users_progressed: number;
  users_not_progressed: number;
  progress_rate_percent: string | null;
  avg_hours_since_created: string;
  reminders_last_24h: number;
  reminders_24_72h: number;
  reminders_over_72h: number;
  last_refreshed: string;
loan_applied_count:number;
disbursed_count:number;

  
}

interface SummaryStats {
  totalReminders: number;
  successReminders: number;
  failedReminders: number;
  pendingReminders: number;
  loanAppliedCount: number;
  disbursedCount: number;
}

// Memoized Summary Card Component
interface SummaryCardProps {
  label: string;
  value: number;
  gradient: string;
  lightText: string;
}

const SummaryCard = memo<SummaryCardProps>(({ label, value, gradient, lightText }) => {
  const formattedValue = value.toLocaleString();
  
  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-lg p-2.5 sm:p-3 md:p-3.5 text-white shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer group overflow-hidden`}>
      <div className="flex items-center justify-between mb-1">
        <p className={`${lightText} text-[9px] sm:text-[10px] md:text-xs uppercase tracking-wide font-bold opacity-90 leading-tight`}>
          {label}
        </p>
      </div>
      <div className="overflow-hidden">
        <p 
          className="font-black leading-tight whitespace-nowrap"
          style={{
            fontSize: `clamp(0.875rem, ${Math.max(0.875, 2.5 - formattedValue.length * 0.12)}rem, 2.5rem)`
          }}
        >
          {formattedValue}
        </p>
      </div>
    </div>
  );
});

SummaryCard.displayName = "SummaryCard";

// Memoized Chart Component
interface PerformanceChartProps {
  data: MetricsData[];
}

const PerformanceChart = memo<PerformanceChartProps>(({ data }) => {
  const filteredData = useMemo(() => {
    return data
      .filter((m) => m.total_reminders > 0)
      .map((m) => ({
        ...m,
        progress_rate_percent: m.progress_rate_percent
          ? Number(m.progress_rate_percent)
          : 0,
      }));
  }, [data]);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sm:p-7 md:p-8 overflow-hidden backdrop-blur-sm">
 
      <div className="w-full overflow-x-auto -mx-6 sm:-mx-7 md:-mx-8 px-6 sm:px-7 md:px-8">
        <ResponsiveContainer width="100%" height={380} minWidth={400}>
          <BarChart data={filteredData} margin={{ top: 20, right: 30, left: 0, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="template_code"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 11, fill: "#475569", fontWeight: 500 }}
              interval={0}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: "#475569", fontWeight: 500 }}
              label={{
                value: "Count",
                angle: -90,
                position: "insideLeft",
                style: { fill: "#475569", fontSize: 11, fontWeight: 500 },
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: "#475569", fontWeight: 500 }}
              domain={[0, 100]}
              label={{
                value: "Progress Rate (%)",
                angle: 90,
                position: "insideRight",
                style: { fill: "#475569", fontSize: 11, fontWeight: 500 },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "2px solid #e2e8f0",
                borderRadius: "0.75rem",
                boxShadow: "0 10px 15px rgba(0, 0, 0, 0.1)",
                fontSize: 12,
                fontWeight: 500,
              }}
              formatter={(value, name) => {
                if (name === "Rate %") {
                  return [`${Number(value).toFixed(1)}%`, name];
                }
                return [value, name];
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: 13, paddingTop: 24, fontWeight: 500 }}
              iconType="square"
            />
            <Bar
              yAxisId="left"
              dataKey="total_reminders"
              fill="#3b82f6"
              name="Total"
              radius={[6, 6, 0, 0]}
            />
            <Bar
              yAxisId="left"
              dataKey="success_reminders"
              fill="#10b981"
              name="Success"
              radius={[6, 6, 0, 0]}
            />
            <Bar
              yAxisId="left"
              dataKey="failed_reminders"
              fill="#ef4444"
              name="Failed"
              radius={[6, 6, 0, 0]}
            />
            <Bar
              yAxisId="right"
              dataKey="progress_rate_percent"
              fill="#8b5cf6"
              name="Rate %"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

PerformanceChart.displayName = "PerformanceChart";

// Memoized Table Row Component
interface MetricsTableRowProps {
  metric: MetricsData;
}

const MetricsTableRow = memo<MetricsTableRowProps>(({ metric }) => {
  const progressRate = metric.progress_rate_percent
    ? Number(metric.progress_rate_percent)
    : 0;
  
  const getProgressBgColor = useMemo(() => {
    if (progressRate > 50) return "bg-emerald-100 text-emerald-700 font-bold";
    if (progressRate > 0) return "bg-amber-100 text-amber-700 font-bold";
    return "bg-slate-100 text-slate-700";
  }, [progressRate]);

  return (
    <tr className="hover:bg-blue-50/50 transition-colors border-b border-slate-100 text-xs sm:text-sm group">
      <td className="px-3 sm:px-4 md:px-6 py-4 font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
        {metric.template_code}
      </td>
      <td className="px-3 sm:px-4 md:px-6 py-4 text-right text-slate-700 whitespace-nowrap font-semibold">
        {metric.total_reminders.toLocaleString()}
      </td>
      <td className="px-3 sm:px-4 md:px-6 py-4 text-right">
        <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold inline-block shadow-sm">
          {metric.success_reminders.toLocaleString()}
        </span>
      </td>
      <td className="px-3 sm:px-4 md:px-6 py-4 text-right">
        <span className="px-3 py-1.5 bg-rose-100 text-rose-700 rounded-lg text-xs font-bold inline-block shadow-sm">
          {metric.failed_reminders.toLocaleString()}
        </span>
      </td>
      <td className="px-3 sm:px-4 md:px-6 py-4 text-right">
        <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold inline-block shadow-sm">
          {metric.pending_reminders.toLocaleString()}
        </span>
      </td>
      <td className="hidden sm:table-cell px-3 sm:px-4 md:px-6 py-4 text-right text-slate-700 whitespace-nowrap font-semibold">
        {metric.users_progressed.toLocaleString()}
      </td>
      <td className="px-3 sm:px-4 md:px-6 py-4 text-right">
        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-block shadow-sm ${getProgressBgColor}`}>
          {metric.progress_rate_percent
            ? `${progressRate.toFixed(1)}%`
            : "—"}
        </span>
      </td>
      <td className="hidden md:table-cell px-3 sm:px-4 md:px-6 py-4 text-right text-slate-700 whitespace-nowrap font-semibold">
        {metric.reminders_last_24h.toLocaleString()}
      </td>
      <td className="hidden lg:table-cell px-3 sm:px-4 md:px-6 py-4 text-right">
        <span className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold inline-block shadow-sm">
          {metric.loan_applied_count.toLocaleString()}
        </span>
      </td>
      <td className="hidden lg:table-cell px-3 sm:px-4 md:px-6 py-4 text-right">
        <span className="px-3 py-1.5 bg-cyan-100 text-cyan-700 rounded-lg text-xs font-bold inline-block shadow-sm">
          {metric.disbursed_count.toLocaleString()}
        </span>
      </td>
    </tr>
  );
});

MetricsTableRow.displayName = "MetricsTableRow";

// Memoized Detailed Table Component
interface DetailedMetricsTableProps {
  data: MetricsData[];
}

const DetailedMetricsTable = memo<DetailedMetricsTableProps>(({ data }) => (
  <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden backdrop-blur-sm">
    <div className="p-6 sm:p-7 md:p-8 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-1 h-6 bg-gradient-to-b from-slate-400 to-slate-600 rounded-full" />
        <h3 className="text-lg sm:text-xl font-bold text-slate-900">
          Detailed Metrics
        </h3>
      </div>
      <p className="text-sm text-slate-500 ml-4">
        Complete breakdown by template
      </p>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-xs sm:text-sm">
        <thead className="bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200 sticky top-0 z-10">
          <tr>
            <th className="px-3 sm:px-4 md:px-6 py-4 text-left font-bold text-slate-700 uppercase tracking-wider text-xs">
              Template
            </th>
            <th className="px-3 sm:px-4 md:px-6 py-4 text-right font-bold text-slate-700 uppercase tracking-wider text-xs">
              Total
            </th>
            <th className="px-3 sm:px-4 md:px-6 py-4 text-right font-bold text-slate-700 uppercase tracking-wider text-xs">
              Successful
            </th>
            <th className="px-3 sm:px-4 md:px-6 py-4 text-right font-bold text-slate-700 uppercase tracking-wider text-xs">
              Failed
            </th>
            <th className="px-3 sm:px-4 md:px-6 py-4 text-right font-bold text-slate-700 uppercase tracking-wider text-xs">
              Pending
            </th>
            <th className="hidden sm:table-cell px-3 sm:px-4 md:px-6 py-4 text-right font-bold text-slate-700 uppercase tracking-wider text-xs">
              Users Progress
            </th>
            <th className="px-3 sm:px-4 md:px-6 py-4 text-right font-bold text-slate-700 uppercase tracking-wider text-xs">
              Progress %
            </th>
            <th className="hidden md:table-cell px-3 sm:px-4 md:px-6 py-4 text-right font-bold text-slate-700 uppercase tracking-wider text-xs">
              Last 24h
            </th>
            <th className="hidden lg:table-cell px-3 sm:px-4 md:px-6 py-4 text-right font-bold text-slate-700 uppercase tracking-wider text-xs">
              Loan Applied
            </th>
            <th className="hidden lg:table-cell px-3 sm:px-4 md:px-6 py-4 text-right font-bold text-slate-700 uppercase tracking-wider text-xs">
              Disbursed
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((metric) => (
            <MetricsTableRow key={metric.template_code} metric={metric} />
          ))}
        </tbody>
      </table>
    </div>
  </div>
));

DetailedMetricsTable.displayName = "DetailedMetricsTable";

// Loading State Component
const LoadingState = memo(() => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <div className="relative w-16 h-16">
          <CgSpinner className="animate-spin text-blue-600 text-5xl absolute inset-0" />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent rounded-full" />
        </div>
      </div>
      <div>
        <p className="text-slate-700 font-semibold text-lg">
          Loading metrics dashboard...
        </p>
        <p className="text-slate-500 text-sm mt-1">Please wait while we fetch your data</p>
      </div>
    </div>
  </div>
));

LoadingState.displayName = "LoadingState";

// Empty State Component
const EmptyState = memo(() => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <div className="text-center space-y-4">
      <div className="bg-gradient-to-br from-slate-200 to-slate-300 rounded-full p-8 mx-auto w-fit shadow-lg">
        <HiOutlineUser className="w-16 h-16 text-slate-500" />
      </div>
      <div>
        <p className="text-slate-900 font-bold text-xl">
          No metrics data available
        </p>
        <p className="text-slate-500 text-sm mt-2 max-w-sm">
          Your reminders will appear here once they are created and start processing
        </p>
      </div>
    </div>
  </div>
));

EmptyState.displayName = "EmptyState";

export function MatrixGraph() {
  const { brandId } = useParams<{ brandId: string }>();
  const { showError, showSuccess } = useToast();

  const [metricsData, setMetricsData] = useState<MetricsData[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);

  // Memoize summary statistics calculations
  const summaryStats = useMemo<SummaryStats>(() => {
    if (!metricsData.length) {
      return {
        totalReminders: 0,
        successReminders: 0,
        failedReminders: 0,
        pendingReminders: 0,
        loanAppliedCount: 0,
        disbursedCount: 0,
      };
    }

    return {
      totalReminders: metricsData.reduce(
        (sum, m) => sum + (m.total_reminders || 0),
        0
      ),
      successReminders: metricsData.reduce(
        (sum, m) => sum + (m.success_reminders || 0),
        0
      ),
      failedReminders: metricsData.reduce(
        (sum, m) => sum + (m.failed_reminders || 0),
        0
      ),
      pendingReminders: metricsData.reduce(
        (sum, m) => sum + (m.pending_reminders || 0),
        0
      ),
      loanAppliedCount: metricsData.reduce(
        (sum, m) => sum + (m.loan_applied_count || 0),
        0
      ),
      disbursedCount: metricsData.reduce(
        (sum, m) => sum + (m.disbursed_count || 0),
        0
      ),
    };
  }, [metricsData]);

  const fetchMetrics = useCallback(async () => {
    if (!brandId) return;
    try {
      setLoadingMetrics(true);
      const data = await getReminderDashboardMetrics(brandId);
      setMetricsData(data || []);
    } catch (error) {
      console.error("Failed to load metrics", error);
      setMetricsData([]);
      showError("Error", "Failed to load metrics");
    } finally {
      setLoadingMetrics(false);
    }
  }, [brandId, showError]);

  const handleRefreshMetrics = useCallback(async () => {
    if (!brandId) return;
    try {
      setRefreshing(true);
      await refreshReminderDashboardMetrics(brandId);
      showSuccess("Success", "Dashboard metrics refreshed successfully");
      setLastRefreshed(new Date().toLocaleString());
      await fetchMetrics();
    } catch (error) {
      console.error("Failed to refresh metrics", error);
      showError("Error", "Failed to refresh dashboard metrics");
    } finally {
      setRefreshing(false);
    }
  }, [brandId, showError, showSuccess, fetchMetrics]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Loading state
  if (loadingMetrics) {
    return <LoadingState />;
  }

  // Empty state
  if (!metricsData.length) {
    return <EmptyState />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-7">
          {/* Summary Cards - Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 sm:gap-5">
            <SummaryCard
              label="Total Reminders"
              value={summaryStats.totalReminders}
              gradient="from-blue-500 to-blue-600"
              lightText="text-blue-100"
            />
            <SummaryCard
              label="Successful"
              value={summaryStats.successReminders}
              gradient="from-emerald-500 to-emerald-600"
              lightText="text-emerald-100"
            />
            <SummaryCard
              label="Failed"
              value={summaryStats.failedReminders}
              gradient="from-rose-500 to-rose-600"
              lightText="text-rose-100"
            />
            <SummaryCard
              label="Pending"
              value={summaryStats.pendingReminders}
              gradient="from-amber-500 to-amber-600"
              lightText="text-amber-100"
            />
            <SummaryCard
              label="Loan Applied"
              value={summaryStats.loanAppliedCount}
              gradient="from-purple-500 to-purple-600"
              lightText="text-purple-100"
            />
            <SummaryCard
              label="Disbursed"
              value={summaryStats.disbursedCount}
              gradient="from-cyan-500 to-cyan-600"
              lightText="text-cyan-100"
            />
          </div>

          {/* Chart Section with aligned Header and Refresh */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full" />
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  Performance Overview
                </h2>
              </div>
              <button
                onClick={handleRefreshMetrics}
                disabled={refreshing}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-500 transition-all duration-300 font-semibold text-sm whitespace-nowrap"
              >
                <MdRefresh className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            
            {/* Last Refreshed Info */}
            {lastRefreshed && (
              <div className="flex items-center gap-2 text-xs text-slate-500 ml-4">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span>Last refreshed: {lastRefreshed}</span>
              </div>
            )}

            <PerformanceChart data={metricsData} />
          </div>

          {/* Detailed Table Section */}
          <DetailedMetricsTable data={metricsData} />
        </div>
      </div>
    </div>
  );
}
