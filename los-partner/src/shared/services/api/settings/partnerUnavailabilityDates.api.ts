import api from '../../axios';

export interface PartnerUnavailabilityDate {
  id: string;
  partnerUserId: string;
  date: string;
  reason: string;
  type: 'PARTNER_UNAVAILABILITY';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePartnerUnavailabilityDateDto {
  date: string;
  reason: string;
}

export interface UpdatePartnerUnavailabilityDateDto {
  date?: string;
  reason?: string;
  isActive?: boolean;
}

export interface GetPartnerUnavailabilityDatesQuery {
  year?: number;
  active?: string;
}

export interface PartnerAvailabilityCheckResult {
  isAvailable: boolean;
  reason: string | null;
}

const BASE_URL = '/partner/partner-user';

export const partnerUnavailabilityDatesApi = {
  // Create a new unavailability date
  createUnavailabilityDate: async (
    partnerUserId: string,
    data: CreatePartnerUnavailabilityDateDto
  ): Promise<PartnerUnavailabilityDate> => {
    const response = await api.post(
      `${BASE_URL}/${partnerUserId}/unavailability-dates`,
      data
    );
    return response.data;
  },

  // Get all unavailability dates for a partner user
  getUnavailabilityDates: async (
    partnerUserId: string,
    query?: GetPartnerUnavailabilityDatesQuery
  ): Promise<PartnerUnavailabilityDate[]> => {
    const params = new URLSearchParams();
    if (query?.year) params.append('year', query.year.toString());
    if (query?.active) params.append('active', query.active);
    
    const response = await api.get(
      `${BASE_URL}/${partnerUserId}/unavailability-dates?${params.toString()}`
    );
    return response.data;
  },

  // Get a specific unavailability date by ID
  getUnavailabilityDateById: async (
    partnerUserId: string,
    id: string
  ): Promise<PartnerUnavailabilityDate> => {
    const response = await api.get(
      `${BASE_URL}/${partnerUserId}/unavailability-dates/${id}`
    );
    return response.data;
  },

  // Update an unavailability date
  updateUnavailabilityDate: async (
    partnerUserId: string,
    id: string,
    data: UpdatePartnerUnavailabilityDateDto
  ): Promise<PartnerUnavailabilityDate> => {
    const response = await api.put(
      `${BASE_URL}/${partnerUserId}/unavailability-dates/${id}`,
      data
    );
    return response.data;
  },

  // Delete an unavailability date
  deleteUnavailabilityDate: async (
    partnerUserId: string,
    id: string
  ): Promise<{ message: string }> => {
    const response = await api.delete(
      `${BASE_URL}/${partnerUserId}/unavailability-dates/${id}`
    );
    return response.data;
  },

  // Check if partner is available on a specific date
  checkPartnerAvailable: async (
    partnerUserId: string,
    date: string
  ): Promise<PartnerAvailabilityCheckResult> => {
    const response = await api.get(
      `${BASE_URL}/${partnerUserId}/unavailability-dates/check/${date}`
    );
    return response.data;
  },
};
