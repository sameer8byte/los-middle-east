import api from "../../axios";

/**
 * Brand Acefone Configuration Interface
 */
export interface BrandAcefoneConfig {
  id: string;
  brand_id: string;
  acefone_token: string;
  allowed_caller_ids: string[];
  metadata?: any;
  is_active: boolean;
  is_disabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Acefone Configuration Update Payload
 */
export interface UpdateAcefoneConfigPayload {
  acefoneToken: string;
  allowedCallerIds?: string[];
  metadata?: any;
}

/**
 * Add Caller ID Payload
 */
export interface AddCallerIdPayload {
  callerId: string;
}

/**
 * Brand Acefone Settings API Service
 */
export class BrandAcefoneSettingService {
  /**
   * Fetch brand Acefone configuration
   */
  static async getConfig(brandId: string): Promise<BrandAcefoneConfig> {
    const response = await api.get<BrandAcefoneConfig>(
      `/partner/brand/${brandId}/acefone-config`
    );
    return response.data;
  }

  /**
   * Update brand Acefone configuration
   */
  static async updateConfig(
    brandId: string,
    payload: UpdateAcefoneConfigPayload
  ): Promise<BrandAcefoneConfig> {
    const response = await api.put<BrandAcefoneConfig>(
      `/partner/brand/${brandId}/acefone-config`,
      payload
    );
    return response.data;
  }

  /**
   * Add a caller ID to the allowed list
   */
  static async addCallerId(
    brandId: string,
    payload: AddCallerIdPayload
  ): Promise<BrandAcefoneConfig> {
    const response = await api.post<BrandAcefoneConfig>(
      `/partner/brand/${brandId}/acefone-config/caller-ids`,
      payload
    );
    return response.data;
  }

  /**
   * Remove a caller ID from the allowed list
   */
  static async removeCallerId(
    brandId: string,
    callerId: string
  ): Promise<BrandAcefoneConfig> {
    const response = await api.delete<BrandAcefoneConfig>(
      `/partner/brand/${brandId}/acefone-config/caller-ids/${callerId}`
    );
    return response.data;
  }
}
