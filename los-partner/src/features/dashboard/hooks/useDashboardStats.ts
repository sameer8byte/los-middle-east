import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { DashboardStats, DashboardQuery } from "../types/dashboard.types";
import { getDashboardStats, getDashboardSummary } from "../../../shared/services/api/dashboard.api";

export function useDashboardStats(query: DashboardQuery | null = { period: "month" }) {
  const { brandId } = useParams();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [summary, setSummary] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (queryParams: DashboardQuery) => {
    if (!brandId) return;

    try {
      setLoading(true);
      setError(null);

      const data = await getDashboardStats(brandId, queryParams);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch dashboard stats");
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  const fetchSummary = useCallback(async (queryParams: DashboardQuery) => {
    if (!brandId) return;

    try {
      setLoading(true);
      setError(null);

      const data = await getDashboardSummary(brandId, queryParams);
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch dashboard summary");
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  const refetch = useCallback(() => {
    if (!query) return;
    fetchStats(query);
  }, [fetchStats, query]);

  const refetchSummary = useCallback(() => {
    if(!query) return;
  }, [fetchSummary, query]);

  useEffect(() => {
    // Fetch both summary and stats on initial load
    if (!query) return;
    fetchSummary(query);
    fetchStats(query);
  }, [fetchSummary, fetchStats, query]);

  return {
    stats,
    summary,
    loading,
    error,
    refetch,
    refetchSummary,
    fetchStats,
    fetchSummary,
  };
}
