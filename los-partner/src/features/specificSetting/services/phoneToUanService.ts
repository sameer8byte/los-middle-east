import api from "../../../shared/services/axios";

export type PhoneToUanStatus = "SUCCESS" | "FAILED" | "INVALID" | "PENDING";
export type PhoneToUanProvider = "DIGITAP" | "SCOREME" | "FINBOX";

export interface PhoneToUanLog {
  id: string;
  mobileNumber: string;
  uan?: string;
  provider: string;
  status: PhoneToUanStatus;
  errorMessage?: string;
  createdAt: string;
  request?: any;
  response?: any;
  user?: {
    email?: string;
    userDetails?: {
      firstName?: string;
      lastName?: string;
    };
  };
}

export interface PhoneToUanLogsQuery {
  brandId: string;
  skip: number;
  take: number;
  status?: PhoneToUanStatus;
  provider?: PhoneToUanProvider;
}

export interface PhoneToUanLogsResponse {
  data: PhoneToUanLog[];
  total?: number;
}

export class PhoneToUanService {
  /**
   * Fetch Phone to UAN verification logs
   */
  static async getPhoneToUanLogs(query: PhoneToUanLogsQuery): Promise<PhoneToUanLog[]> {
    const params: any = {
      skip: query.skip,
      take: query.take,
    };
    
    if (query.status) params.status = query.status;
    if (query.provider) params.provider = query.provider;
    
    const response = await api.get(`/partner/brand/${query.brandId}/phone-to-uan/logs`, { params });
    return response.data.data || response.data || [];
  }

  /**
   * Get Phone to UAN logs with filters
   */
  static async getFilteredLogs(
    brandId: string,
    page: number,
    limit: number,
    statusFilter?: PhoneToUanStatus,
    providerFilter?: PhoneToUanProvider
  ): Promise<PhoneToUanLog[]> {
    return this.getPhoneToUanLogs({
      brandId,
      skip: (page - 1) * limit,
      take: limit,
      status: statusFilter,
      provider: providerFilter,
    });
  }
}
