/**
 * Acefone Dialer Service - Frontend
 * Handles click-to-dial call initiation and management
 */

import api from "../axios";

/**
 * Acefone Dialer Payload Interface
 * Matches backend AcefoneDialerPayload
 */
export interface AcefoneDialerPayload {
  // User Context (REQUIRED)
  userId: string;
  partnerUserId: string;
  brandId: string;

  // Optional call metadata
  loanId?: string;
  callType?: "inbound" | "outbound" | "manual";
  callReason?: string;
}

/**
 * Acefone Dialer Call Response Interface
 */
export interface AcefoneDialerCallResponse {
  success: boolean;
  message: string;
  callId?: string;
  user?: {
    id: string;
    email: string;
  };
  partnerUser?: {
    id: string;
    email: string;
  };
  acefoneResponse?: any;
  error?: string;
}

/**
 * Acefone Dialer Service
 * Frontend service for initiating click-to-dial calls
 */
class AcefoneDialerService {
  /**
   * Initiate a click-to-dial call
   * @param payload AcefoneDialerPayload with user context and optional metadata
   * @returns Promise with call response
   */
  async initiateCall(
    payload: AcefoneDialerPayload
  ): Promise<AcefoneDialerCallResponse> {
    try {
      const response = await api.post<AcefoneDialerCallResponse>(
        `/acefone/dialer/initiate`,
        payload
      );

      return response.data;
    } catch (error: any) {
      console.error("Acefone Dialer Error:", error);
      throw error;
    }
  }

  /**
   * Get all calls for the current user
   * @param options Pagination and filtering options
   */
  async getUserCalls(options?: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    calls: any[];
    total: number;
    limit: number;
    offset: number;
  }> {
    try {
      const params = new URLSearchParams();
      if (options?.limit) params.append("limit", options.limit.toString());
      if (options?.offset) params.append("offset", options.offset.toString());
      if (options?.startDate)
        params.append("startDate", options.startDate.toISOString());
      if (options?.endDate)
        params.append("endDate", options.endDate.toISOString());

      const response = await api.get<{
        calls: any[];
        total: number;
        limit: number;
        offset: number;
      }>(
        `/acefone/dialer/user/:userId/calls?${params}`
      );

      return response.data;
    } catch (error: any) {
      console.error("Error fetching user calls:", error);
      throw error;
    }
  }

  /**
   * Get all calls for the current partner user
   * @param options Pagination and filtering options
   */
  async getPartnerUserCalls(options?: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    calls: any[];
    total: number;
    limit: number;
    offset: number;
  }> {
    try {
      const params = new URLSearchParams();
      if (options?.limit) params.append("limit", options.limit.toString());
      if (options?.offset) params.append("offset", options.offset.toString());
      if (options?.startDate)
        params.append("startDate", options.startDate.toISOString());
      if (options?.endDate)
        params.append("endDate", options.endDate.toISOString());

      const response = await api.get<{
        calls: any[];
        total: number;
        limit: number;
        offset: number;
      }>(
        `/acefone/dialer/partner/:partnerUserId/calls?${params}`
      );

      return response.data;
    } catch (error: any) {
      console.error("Error fetching partner user calls:", error);
      throw error;
    }
  }

  /**
   * Get call details by call ID
   * @param callId Call ID (UserCall id)
   */
  async getCallDetails(callId: string): Promise<any> {
    try {
      const response = await api.get<any>(
        `/acefone/dialer/call/${callId}`
      );

      return response.data;
    } catch (error: any) {
      console.error("Error fetching call details:", error);
      throw error;
    }
  }

  /**
   * End/close a call
   * @param callId Call ID (UserCall id)
   * @param duration Call duration in seconds (optional)
   */
  async endCall(callId: string, duration?: number): Promise<any> {
    try {
      const response = await api.patch<any>(
        `/acefone/dialer/call/${callId}/end`,
        { duration }
      );

      return response.data;
    } catch (error: any) {
      console.error("Error ending call:", error);
      throw error;
    }
  }

  /**
   * Get call statistics for the current user
   * @param dateRange Optional date range for statistics
   */
  async getUserCallStats(dateRange?: {
    startDate: Date;
    endDate: Date;
  }): Promise<{
    totalCalls: number;
    averageDuration: number;
    totalDuration: number;
    dateRange: {
      startDate: Date;
      endDate: Date;
    };
  }> {
    try {
      const params = new URLSearchParams();
      if (dateRange?.startDate)
        params.append("startDate", dateRange.startDate.toISOString());
      if (dateRange?.endDate)
        params.append("endDate", dateRange.endDate.toISOString());

      const response = await api.get<{
        totalCalls: number;
        averageDuration: number;
        totalDuration: number;
        dateRange: {
          startDate: Date;
          endDate: Date;
        };
      }>(
        `/acefone/dialer/user/:userId/stats?${params}`
      );

      return response.data;
    } catch (error: any) {
      console.error("Error fetching user call stats:", error);
      throw error;
    }
  }

  /**
   * Get call statistics for the current partner user
   * @param dateRange Optional date range for statistics
   */
  async getPartnerUserCallStats(dateRange?: {
    startDate: Date;
    endDate: Date;
  }): Promise<{
    totalCalls: number;
    averageDuration: number;
    totalDuration: number;
    dateRange: {
      startDate: Date;
      endDate: Date;
    };
  }> {
    try {
      const params = new URLSearchParams();
      if (dateRange?.startDate)
        params.append("startDate", dateRange.startDate.toISOString());
      if (dateRange?.endDate)
        params.append("endDate", dateRange.endDate.toISOString());

      const response = await api.get<{
        totalCalls: number;
        averageDuration: number;
        totalDuration: number;
        dateRange: {
          startDate: Date;
          endDate: Date;
        };
      }>(
        `/acefone/dialer/partner/:partnerUserId/stats?${params}`
      );

      return response.data;
    } catch (error: any) {
      console.error("Error fetching partner user call stats:", error);
      throw error;
    }
  }

  /**
   * Get calls for a specific customer user
   * @param userId Customer user ID
   * @param options Pagination and filtering options
   */
  async getCustomerUserCalls(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{
    calls: any[];
    total: number;
    limit: number;
    offset: number;
  }> {
    try {
      const params = new URLSearchParams();
      if (options?.limit) params.append("limit", options.limit.toString());
      if (options?.offset) params.append("offset", options.offset.toString());
      if (options?.startDate)
        params.append("startDate", options.startDate.toISOString());
      if (options?.endDate)
        params.append("endDate", options.endDate.toISOString());

      const response = await api.get<{
        success: boolean;
        data: {
          calls: any[];
          total: number;
          limit: number;
          offset: number;
        };
      }>(
        `/acefone/dialer/user/${userId}/calls?${params}`
      );

      // Backend wraps response in { success, data } structure
      return response.data.data;
    } catch (error: any) {
      console.error("Error fetching customer user calls:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const acefoneDialerService = new AcefoneDialerService();

// Export class for dependency injection if needed
export default AcefoneDialerService;
