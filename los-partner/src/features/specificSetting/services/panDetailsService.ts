import api from "../../../shared/services/axios";

export type PanStatus = "SUCCESS" | "FAILED" | "INVALID" | "PENDING";
export type PanProvider = "DIGITAP" | "SCOREME";

export interface PanDetailsLog {
  id: string;
  pan: string;
  clientRefNum?: string;
  provider: string;
  status: PanStatus;
  panHolderName?: string;
  isValid?: boolean;
  errorMessage?: string;
  createdAt: string;
  user?: {
    email?: string;
    userDetails?: {
      firstName?: string;
      lastName?: string;
    };
  };
}

export interface PanDetailsLogsQuery {
  brandId: string;
  skip: number;
  take: number;
  status?: PanStatus;
  provider?: PanProvider;
}

export interface PanDetailsLogsResponse {
  data: PanDetailsLog[];
  total?: number;
}

export class PanDetailsService {
  /**
   * Fetch PAN details verification logs
   */
  static async getPanDetailsLogs(query: PanDetailsLogsQuery): Promise<PanDetailsLog[]> {
    const params: any = {
      skip: query.skip,
      take: query.take,
    };
    
    if (query.status) params.status = query.status;
    if (query.provider) params.provider = query.provider;
    
    const response = await api.get(`/partner/brand/${query.brandId}/pan-details-plus/logs`, { params });
    return response.data.data || response.data || [];
  }

  /**
   * Get PAN details logs with filters
   */
  static async getFilteredLogs(
    brandId: string,
    page: number,
    limit: number,
    statusFilter?: PanStatus,
    providerFilter?: PanProvider
  ): Promise<PanDetailsLog[]> {
    return this.getPanDetailsLogs({
      brandId,
      skip: (page - 1) * limit,
      take: limit,
      status: statusFilter,
      provider: providerFilter,
    });
  }
}
