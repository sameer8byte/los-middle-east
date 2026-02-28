import api from "../axios";

/**
 * DigiLocker API Service
 * Handles all DigiLocker verification endpoints for both Signzy and Digitap
 */

export interface ManualSyncRequest {
  userId: string;
}

export interface DigiLockerResponse {
  success: boolean;
  message: string;
  provider: "SIGNZY" | "DIGITAP";
  raw?: any;
}

/**
 * Trigger manual Signzy DigiLocker verification sync
 * POST /partner/brand/:brandId/digilocker/signzy/manual-sync
 */
export const signzyManualSync = async (
  brandId: string,
  userId: string
): Promise<DigiLockerResponse> => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/digilocker/signzy/manual-sync`,
      { userId }
    );
    return response.data;
  } catch (error) {
    console.error("Error triggering Signzy manual sync:", error);
    throw error;
  }
};

/**
 * Trigger manual Digitap DigiLocker verification sync
 * POST /partner/brand/:brandId/digilocker/digitap/manual-sync
 */
export const digitapManualSync = async (
  brandId: string,
  userId: string
): Promise<DigiLockerResponse> => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/digilocker/digitap/manual-sync`,
      { userId }
    );
    return response.data;
  } catch (error) {
    console.error("Error triggering Digitap manual sync:", error);
    throw error;
  }
};