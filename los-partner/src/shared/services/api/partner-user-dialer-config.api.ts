import api from "../axios";

export interface DialerConfig {
  id: string;
  partner_user_id: string;
  agent_user_id: string;
  agent_user_number: string;
  agent_user_email: string;
  agent_allowed_caller_id?: string;
   agent_skill_id?: string;
  is_disabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDialerConfigPayload {
  agentUserId: string;
  agentUserNumber: string;
  agentUserEmail?: string;
  agentAllowedCallerId?: string;
   agentSkillId?: string;
}

export interface UpdateDialerConfigPayload {
  agent_user_id?: string;
  agent_user_number?: string;
  agent_allowed_caller_id?: string;
  agent_skill_id?: string;
  is_disabled?: boolean;
}

export class PartnerUserDialerConfigService {
  /**
   * Create a new dialer configuration for a partner user
   */
  static async createDialerConfig(
    partnerUserId: string,
    payload: CreateDialerConfigPayload,
  ) {
    const response = await api.post<DialerConfig>(
      `/partner-users/${partnerUserId}/dialer-configs`,
      payload,
    );
    return response.data;
  }

  /**
   * Get dialer configuration for a specific partner user
   */
  static async getDialerConfig(partnerUserId: string) {
    const response = await api.get<DialerConfig>(
      `/partner-users/${partnerUserId}/dialer-configs`,
    );
    return response.data;
  }

  /**
   * Get all dialer configurations with pagination
   */
  static async getAllDialerConfigs(brandId: string, skip: number = 0, take: number = 10) {
    const response = await api.get<DialerConfig[]>(
      `/partner/brand/${brandId}/partner-users/dialer-configs/all?skip=${skip}&take=${take}`,
    );
    return response.data;
  }

  /**
   * Update dialer configuration
   */
  static async updateDialerConfig(
    partnerUserId: string,
    payload: UpdateDialerConfigPayload,
  ) {
    const response = await api.put<DialerConfig>(
      `/partner-users/${partnerUserId}/dialer-configs`,
      payload,
    );
    return response.data;
  }

  /**
   * Delete dialer configuration
   */
  static async deleteDialerConfig(partnerUserId: string) {
    const response = await api.delete<{ message: string }>(
      `/partner-users/${partnerUserId}/dialer-configs`,
    );
    return response.data;
  }

  /**
   * Enable dialer for a partner user
   */
  static async enableDialer(partnerUserId: string) {
    const response = await api.post<DialerConfig>(
      `/partner-users/${partnerUserId}/dialer-configs/enable`,
    );
    return response.data;
  }

  /**
   * Disable dialer for a partner user
   */
  static async disableDialer(partnerUserId: string) {
    const response = await api.post<DialerConfig>(
      `/partner-users/${partnerUserId}/dialer-configs/disable`,
    );
    return response.data;
  }
}
