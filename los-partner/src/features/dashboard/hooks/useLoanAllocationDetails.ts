import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { getLoanAllocationDetails } from "../../../shared/services/api/dashboard.api";
import { LoanAllocationDetailsResponse, DashboardQuery } from "../types/dashboard.types";

export const useLoanAllocationDetails = (query: DashboardQuery | null) => {
  const { brandId } = useParams();
  const [data, setData] = useState<LoanAllocationDetailsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllocationDetails = useCallback(async () => {
    if (!brandId || !query) return;

    setLoading(true);
    setError(null);
    
    try {
      const params = {
        period: query.period,
        startDate: query.startDate,
        endDate: query.endDate,
      };
      
      const response = await getLoanAllocationDetails(brandId, params);
      setData(response);
    } catch (err) {
      console.error("Error fetching loan allocation details:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch loan allocation details");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [brandId, query?.period, query?.startDate, query?.endDate]);

  useEffect(() => {
    fetchAllocationDetails();
  }, [fetchAllocationDetails]);

  return {
    data,
    loading,
    error,
    refetch: fetchAllocationDetails,
  };
};
