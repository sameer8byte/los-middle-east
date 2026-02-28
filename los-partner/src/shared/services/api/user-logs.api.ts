import api from "../axios";

export interface UserLog {
  id: string;
  timestamp: string;
  userId: string;
  partnerUserId?: string;
  message: string;
  serialNumber: number;
  type: string;
  platformType?: string;
  context?: any;
  user?: {
    id: string;
    phoneNumber: string;
    email: string;
    formattedUserId: string;
    userDetails?: {
      firstName: string;
      lastName: string;
    };
  };
  partnerUser?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface UserLogsResponse {
  data: UserLog[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UserLogType {
  value: string;
  label: string;
}

export interface UserLogStats {
  totalLogs: number;
  uniqueUsers: number;
  logsByType: Array<{
    type: string;
    count: number;
  }>;
  logsOverTime: Array<{
    date: string;
    count: number;
  }>;
}

export const getUserLogs = async (
  brandId: string,
  params?: {
    page?: number;
    limit?: number;
    userId?: string;
    partnerUserId?: string;
    type?: string;
    platformType?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }
): Promise<UserLogsResponse> => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.userId) queryParams.append("userId", params.userId);
    if (params?.partnerUserId) queryParams.append("partnerUserId", params.partnerUserId);
    if (params?.type) queryParams.append("type", params.type);
    if (params?.platformType) queryParams.append("platformType", params.platformType);
    if (params?.search) queryParams.append("search", params.search);
    if (params?.fromDate) queryParams.append("fromDate", params.fromDate);
    if (params?.toDate) queryParams.append("toDate", params.toDate);
    if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params?.sortOrder) queryParams.append("sortOrder", params.sortOrder);

    const queryString = queryParams.toString();
    const baseUrl = `/partner/brand/${brandId}/user-logs`;
    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;

    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching user logs:", error);
    throw error;
  }
};

export const getUserLogTypes = async (brandId: string): Promise<UserLogType[]> => {
  try {
    const response = await api.get(`/partner/brand/${brandId}/user-logs/types`);
    return response.data;
  } catch (error) {
    console.error("Error fetching user log types:", error);
    throw error;
  }
};

export const getUserLogStats = async (
  brandId: string,
  params?: {
    userId?: string;
    fromDate?: string;
    toDate?: string;
  }
): Promise<UserLogStats> => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.userId) queryParams.append("userId", params.userId);
    if (params?.fromDate) queryParams.append("fromDate", params.fromDate);
    if (params?.toDate) queryParams.append("toDate", params.toDate);

    const queryString = queryParams.toString();
    const baseUrl = `/partner/brand/${brandId}/user-logs/stats`;
    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;

    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching user log stats:", error);
    throw error;
  }
};

export const getUserLogById = async (
  brandId: string,
  logId: string
): Promise<UserLog> => {
  try {
    const response = await api.get(`/partner/brand/${brandId}/user-logs/${logId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching user log by ID:", error);
    throw error;
  }
};
