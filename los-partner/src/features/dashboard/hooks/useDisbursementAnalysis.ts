import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { getDisbursementAnalysis } from "../../../shared/services/api/dashboard.api";
import { DisbursementAnalysisResponse, DashboardQuery } from "../types/dashboard.types";

export const useDisbursementAnalysis = (query: DashboardQuery | null) => {
  const { brandId } = useParams();
  const [data, setData] = useState<DisbursementAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDisbursementAnalysis = useCallback(async () => {
    if (!brandId || !query) return;

    setLoading(true);
    setError(null);
    
    try {
      const params = {
        period: query.period,
        startDate: query.startDate,
        endDate: query.endDate,
        loanFilterType: query.loanFilterType,
      };
      
      const response = await getDisbursementAnalysis(brandId, params);
      setData(response);
    } catch (err) {
      console.error("Error fetching disbursement analysis:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch disbursement analysis");
      setData(null);
    } finally {
      setLoading(false);
    }
  },  [brandId, query?.period, query?.startDate, query?.endDate, query?.loanFilterType]);

  useEffect(() => {
    if (!query) return;
    fetchDisbursementAnalysis();
  }, [fetchDisbursementAnalysis]);

  return {
    data,
    loading,
    error,
    refetch: fetchDisbursementAnalysis,
  };
};
