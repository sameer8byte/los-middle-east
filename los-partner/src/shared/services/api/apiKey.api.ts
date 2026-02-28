import api from "../axios";

export interface CreateApiKeyPayload {
  name: string;
  description?: string;
  expiresAt?: string;
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  description?: string;
  key?: string;
  is_active: boolean;
  last_used_at?: Date;
  expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ApiKeyStatsResponse {
  totalKeys: number;
  activeKeys: number;
  expiredKeys: number;
  unusedKeys: number;
  lastUsedKey?: {
    name: string;
    lastUsedAt: Date;
  };
}

class ApiKeyService {
  private getBrandBasePath(brandId: string): string {
    return `/partner/brand/${brandId}`;
  }

  /**
   * Get all API keys for the authenticated brand
   */
  async getApiKeys(brandId: string): Promise<ApiKeyResponse[]> {
    try {
      const response = await api.get<ApiKeyResponse[]>(`${this.getBrandBasePath(brandId)}/api-keys`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch API keys:", error);
      throw error;
    }
  }

  /**
   * Get a single API key by ID
   */
  async getApiKeyById(brandId: string, apiKeyId: string): Promise<ApiKeyResponse> {
    try {
      const response = await api.get<ApiKeyResponse>(`${this.getBrandBasePath(brandId)}/api-keys/${apiKeyId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch API key ${apiKeyId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new API key
   */
  async createApiKey(brandId: string, payload: CreateApiKeyPayload): Promise<ApiKeyResponse> {
    try {
      const response = await api.post<ApiKeyResponse>(`${this.getBrandBasePath(brandId)}/api-keys`, payload);
      return response.data;
    } catch (error) {
      console.error("Failed to create API key:", error);
      throw error;
    }
  }

  /**
   * Revoke/disable an API key
   */
  async revokeApiKey(brandId: string, apiKeyId: string): Promise<ApiKeyResponse> {
    try {
      const response = await api.patch<ApiKeyResponse>(
        `${this.getBrandBasePath(brandId)}/api-keys/${apiKeyId}/revoke`,
        {}
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to revoke API key ${apiKeyId}:`, error);
      throw error;
    }
  }

  /**
   * Rotate an API key (create new, disable old)
   */
  async rotateApiKey(
    brandId: string,
    apiKeyId: string,
    newKeyName?: string
  ): Promise<ApiKeyResponse> {
    try {
      const response = await api.patch<ApiKeyResponse>(
        `${this.getBrandBasePath(brandId)}/api-keys/${apiKeyId}/rotate`,
        { newKeyName }
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to rotate API key ${apiKeyId}:`, error);
      throw error;
    }
  }

  /**
   * Delete an API key permanently
   */
  async deleteApiKey(brandId: string, apiKeyId: string): Promise<void> {
    try {
      await api.delete(`${this.getBrandBasePath(brandId)}/api-keys/${apiKeyId}`);
    } catch (error) {
      console.error(`Failed to delete API key ${apiKeyId}:`, error);
      throw error;
    }
  }

  /**
   * Get API key usage statistics for the authenticated brand
   */
  async getApiKeyStats(brandId: string): Promise<ApiKeyStatsResponse> {
    try {
      const response = await api.get<ApiKeyStatsResponse>(`${this.getBrandBasePath(brandId)}/api-keys/stats/usage`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch API key statistics:", error);
      throw error;
    }
  }

  /**
   * Copy API key to clipboard
   */
  copyToClipboard(text: string): boolean {
    navigator.clipboard.writeText(text).catch((error) => {
      console.error("Failed to copy to clipboard:", error);
    });
    return true;
  }

  /**
   * Mask API key for display
   */
  maskApiKey(key: string): string {
    if (!key || key.length < 4) return "****";
    return `${key.substring(0, key.lastIndexOf("_") + 1)}****${key.slice(-4)}`;
  }
}

export default new ApiKeyService();
