import { AAConsentStatus } from "../../types/aa-consent-request";
import api from "../axios";

export const postConsentRequest = async (userId: string, brandId?: string) => {
    try {
        const response = await api.post("/aa/consent-request", { userId, brandId });
        return response.data;
    } catch (error) {
        console.error("Error creating consent request:", error);
        throw error;
    }
};

export const getRedirectUrl = async (userId: string, clienttrnxid: string) => {
    try {
        const response = await api.post("/aa/redirect-url", {
            userId,
            clienttrnxid,
        });
        return response.data;
    } catch (error) {
        console.error("Error getting redirect URL:", error);
        throw error;
    }
};

export const getConsentRequest = async (id: string) => {
    try {
        const response = await api.get(`/aa/consent-request/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error getting consent request:", error);
        throw error;
    }
};

export const getUserConsentRequests = async (userId: string) => {
    try {
        const response = await api.get(`/aa/user/${userId}/consent-requests`);
        return response.data;
    } catch (error) {
        console.error("Error getting user consent requests:", error);
        throw error;
    }
};

export const getDataSessions = async (consentRequestId: string) => {
    try {
        const response = await api.get(
            `/aa/consent-request/${consentRequestId}/data-sessions`
        );
        return response.data;
    } catch (error) {
        console.error("Error getting data sessions:", error);
        throw error;
    }
};
export const postUpdateConsentStatus = async (
    id: string,
    body: {
        consentStatus: AAConsentStatus,
        clientTransactionId?: string | null,
        consentHandle?: string | null
    }
) => {
    try {
        const response = await api.post(`/aa/consent-request/${id}/status`, body);
        return response.data;
    } catch (error) {
        console.error("Error updating consent status:", error);
        throw error;
    }
};
