import api from '../../axios';

export type NonRepaymentDateType = 'BRAND_NON_REPAYMENT' | 'PARTNER_UNAVAILABILITY';

export interface NonRepaymentDate {
  id: string;
  brandId: string;
  date: string;
  reason: string;
  state: string;
  type: NonRepaymentDateType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNonRepaymentDateDto {
  date: string;
  reason: string;
  state: string;
  type?: NonRepaymentDateType;
}

export interface UpdateNonRepaymentDateDto {
  date?: string;
  reason?: string;
  state?: string;
  type?: NonRepaymentDateType;
  isActive?: boolean;
}

export interface GetNonRepaymentDatesQuery {
  year?: number;
  state?: string;
  active?: string;
  type?: NonRepaymentDateType;
}

export interface RepaymentCheckResult {
  isRepaymentAllowed: boolean;
  reason: string | null;
  state: string | null;
}

const BASE_URL = '/partner/brand';

export const nonRepaymentDatesApi = {
  // Create a new non-repayment date
  createNonRepaymentDate: async (
    brandId: string,
    data: CreateNonRepaymentDateDto
  ): Promise<NonRepaymentDate> => {
    const response = await api.post(
      `${BASE_URL}/${brandId}/settings/non-repayment-dates`,
      data
    );
    return response.data;
  },

  // Get all non-repayment dates for a brand
  getNonRepaymentDates: async (
    brandId: string,
    query?: GetNonRepaymentDatesQuery
  ): Promise<NonRepaymentDate[]> => {
    const params = new URLSearchParams();
    if (query?.year) params.append('year', query.year.toString());
    if (query?.state) params.append('state', query.state);
    if (query?.active) params.append('active', query.active);
    
    const response = await api.get(
      `${BASE_URL}/${brandId}/settings/non-repayment-dates?${params.toString()}`
    );
    return response.data;
  },

  // Get a specific non-repayment date by ID
  getNonRepaymentDateById: async (
    brandId: string,
    id: string
  ): Promise<NonRepaymentDate> => {
    const response = await api.get(
      `${BASE_URL}/${brandId}/settings/non-repayment-dates/${id}`
    );
    return response.data;
  },

  // Update a non-repayment date
  updateNonRepaymentDate: async (
    brandId: string,
    id: string,
    data: UpdateNonRepaymentDateDto
  ): Promise<NonRepaymentDate> => {
    const response = await api.put(
      `${BASE_URL}/${brandId}/settings/non-repayment-dates/${id}`,
      data
    );
    return response.data;
  },

  // Delete a non-repayment date
  deleteNonRepaymentDate: async (
    brandId: string,
    id: string
  ): Promise<{ message: string }> => {
    const response = await api.delete(
      `${BASE_URL}/${brandId}/settings/non-repayment-dates/${id}`
    );
    return response.data;
  },

  // Check if repayment is allowed on a specific date
  checkRepaymentAllowed: async (
    brandId: string,
    date: string,
    state?: string
  ): Promise<RepaymentCheckResult> => {
    const params = new URLSearchParams();
    if (state) params.append('state', state);
    
    const response = await api.get(
      `${BASE_URL}/${brandId}/settings/non-repayment-dates/check/${date}?${params.toString()}`
    );
    return response.data;
  },
};
