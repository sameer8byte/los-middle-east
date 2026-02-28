import api from "../../../shared/services/axios";

export type UanToEmploymentStatus = "SUCCESS" | "FAILED" | "INVALID" | "PENDING";
export type UanToEmploymentProvider = "DIGITAP" | "SCOREME" | "FINBOX";

export interface UanToEmploymentLog {
  id: string;
  uan: string;
  provider: string;
  status: UanToEmploymentStatus;
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

export interface UanToEmploymentLogsQuery {
  brandId: string;
  skip: number;
  take: number;
  status?: UanToEmploymentStatus;
  provider?: UanToEmploymentProvider;
}

export interface UanToEmploymentLogsResponse {
  data: UanToEmploymentLog[];
  total?: number;
}

export class UanToEmploymentService {
  /**
   * Fetch UAN to Employment verification logs
   */
  static async getUanToEmploymentLogs(query: UanToEmploymentLogsQuery): Promise<UanToEmploymentLog[]> {
    const params: any = {
      skip: query.skip,
      take: query.take,
    };
    
    if (query.status) params.status = query.status;
    if (query.provider) params.provider = query.provider;
    
    const response = await api.get(`/partner/brand/${query.brandId}/uan-to-employment/logs`, { params });
    return response.data.data || response.data || [];
  }

  /**
   * Get UAN to Employment logs with filters
   */
  static async getFilteredLogs(
    brandId: string,
    page: number,
    limit: number,
    statusFilter?: UanToEmploymentStatus,
    providerFilter?: UanToEmploymentProvider
  ): Promise<UanToEmploymentLog[]> {
    return this.getUanToEmploymentLogs({
      brandId,
      skip: (page - 1) * limit,
      take: limit,
      status: statusFilter,
      provider: providerFilter,
    });
  }
}
