import { useState, useCallback } from "react";
import {
  acefoneDialerService,
  AcefoneDialerPayload,
  AcefoneDialerCallResponse,
} from "../shared/services/api/acefone.dialer.service";

/**
 * Hook for managing Acefone dialer calls
 */
export const useAcefoneDialer = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callData, setCallData] = useState<AcefoneDialerCallResponse | null>(
    null
  );

  /**
   * Initiate a click-to-dial call
   */
  const initiateCall = useCallback(async (payload: AcefoneDialerPayload) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await acefoneDialerService.initiateCall(payload);
      setCallData(response);
      return response;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to initiate call";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get user calls
   */
  const getUserCalls = useCallback(
    async (options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    }) => {
      setIsLoading(true);
      setError(null);

      try {
        return await acefoneDialerService.getUserCalls(options);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch user calls";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Get partner user calls
   */
  const getPartnerUserCalls = useCallback(
    async (options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    }) => {
      setIsLoading(true);
      setError(null);

      try {
        return await acefoneDialerService.getPartnerUserCalls(options);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to fetch partner user calls";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Get call details
   */
  const getCallDetails = useCallback(async (callId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      return await acefoneDialerService.getCallDetails(callId);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch call details";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * End a call
   */
  const endCall = useCallback(async (callId: string, duration?: number) => {
    setIsLoading(true);
    setError(null);

    try {
      return await acefoneDialerService.endCall(callId, duration);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to end call";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get user call statistics
   */
  const getUserCallStats = useCallback(
    async (dateRange?: { startDate: Date; endDate: Date }) => {
      setIsLoading(true);
      setError(null);

      try {
        return await acefoneDialerService.getUserCallStats(dateRange);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to fetch user call stats";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Get partner user call statistics
   */
  const getPartnerUserCallStats = useCallback(
    async (dateRange?: { startDate: Date; endDate: Date }) => {
      setIsLoading(true);
      setError(null);

      try {
        return await acefoneDialerService.getPartnerUserCallStats(dateRange);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to fetch partner user call stats";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Clear call data
   */
  const clearCallData = useCallback(() => {
    setCallData(null);
  }, []);

  return {
    // State
    isLoading,
    error,
    callData,

    // Methods
    initiateCall,
    getUserCalls,
    getPartnerUserCalls,
    getCallDetails,
    endCall,
    getUserCallStats,
    getPartnerUserCallStats,

    // Utilities
    clearError,
    clearCallData,
  };
};
