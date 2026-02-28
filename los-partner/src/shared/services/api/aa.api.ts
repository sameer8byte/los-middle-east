import api from "../axios";
import {
  AAConsentStatus,
  AAConsentRequest,
  AADataSession,
  CreateConsentRequestResponse,
} from "../../types/aa-consent-request";

// Account Aggregator API Service
export class AAApiService {
  // Create consent request for a user
  static async createConsentRequest(data: {
    userId: string;
    brandId: string;
  }): Promise<CreateConsentRequestResponse> {
    try {
      const response = await api.post("/aa/consent-request", data);
      return response.data;
    } catch (error) {
      console.error("Error creating consent request:", error);
      throw error;
    }
  }

  // Create manual consent request with custom Handle ID and Mobile
  static async createManualConsentRequest(data: {
    userId: string;
    // handleId: string;
    mobile: string;
    brandId: string;
  }): Promise<CreateConsentRequestResponse> {
    try {
      const response = await api.post("/aa/consent-request/manual", data);
      return response.data;
    } catch (error) {
      console.error("Error creating manual consent request:", error);
      throw error;
    }
  }

  // Get consent request by ID
  static async getConsentRequest(id: string): Promise<AAConsentRequest> {
    try {
      const response = await api.get(`/aa/consent-request/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error getting consent request:", error);
      throw error;
    }
  }

  // Get all consent requests for a user
  static async getUserConsentRequests(
    userId: string
  ): Promise<AAConsentRequest[]> {
    try {
      const response = await api.get(`/aa/user/${userId}/consent-requests`);
      return response.data;
    } catch (error) {
      console.error("Error getting user consent requests:", error);
      throw error;
    }
  }

  // Get data sessions for a consent request
  static async getDataSessions(
    consentRequestId: string
  ): Promise<AADataSession[]> {
    try {
      const response = await api.get(
        `/aa/consent-request/${consentRequestId}/data-sessions`
      );
      return response.data;
    } catch (error) {
      console.error("Error getting data sessions:", error);
      throw error;
    }
  }

  // Update consent status
  static async updateConsentStatus(
    id: string,
    data: {
      consentStatus: AAConsentStatus;
      clientTransactionId?: string | null;
      consentHandle?: string | null;
    }
  ): Promise<AAConsentRequest> {
    try {
      const response = await api.post(`/aa/consent-request/${id}/status`, data);
      return response.data;
    } catch (error) {
      console.error("Error updating consent status:", error);
      throw error;
    }
  }

  // Send consent request email to user
  static async sendConsentRequestEmail(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`[AA API] Sending consent email to user: ${userId}`);
      const response = await api.post(`/aa/user/${userId}/send-consent-email`);
      console.log(`[AA API] Email response:`, response.data);
      console.log(`[AA API] ✅ Email sent successfully with EJS template!`);
      return response.data;
    } catch (error: any) {
      console.error("❌ Error sending consent request email:", error);
      console.error("Error details:", {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        message: error?.message,
      });
      throw error;
    }
  }

  // Generate consent URL for manual sharing
  static async generateConsentUrl(
    userId: string,
    brandId: string
  ): Promise<{
    success: boolean;
    consentUrl?: string;
    consentRequestId?: string;
    message: string;
  }> {
    try {
      const response = await api.post(
        `/aa/user/${userId}/generate-consent-url`,
        { brandId }
      );
      return response.data;
    } catch (error) {
      console.error("Error generating consent URL:", error);
      throw error;
    }
  }

  // Fetch periodic financial data for a consent request
  static async fetchPeriodicData(data: {
    userId: string;
    consentRequestId: string;
  }): Promise<{
    success: boolean;
    data?: any;
    meta?: {
      userId: string;
      timestamp: string;
      dataSessionId?: string;
    };
    message?: string;
  }> {
    try {
      console.log(
        `[AA API] Fetching periodic data for consent: ${data.consentRequestId}`
      );
      const response = await api.post("/aa/fetch-periodic-data", data);
      console.log(`[AA API] ✅ Periodic data fetched successfully!`);
      return response.data;
    } catch (error: any) {
      console.error("❌ Error fetching periodic data:", error);
      console.error("Error details:", {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        message: error?.message,
      });
      throw error;
    }
  }
}

export const createConsentRequest = AAApiService.createConsentRequest;
export const createManualConsentRequest =
  AAApiService.createManualConsentRequest;
export const getConsentRequest = AAApiService.getConsentRequest;
export const getUserConsentRequests = AAApiService.getUserConsentRequests;
export const getDataSessions = AAApiService.getDataSessions;
export const updateConsentStatus = AAApiService.updateConsentStatus;
export const sendConsentRequestEmail = AAApiService.sendConsentRequestEmail;
export const generateConsentUrl = AAApiService.generateConsentUrl;
export const fetchPeriodicData = AAApiService.fetchPeriodicData;
