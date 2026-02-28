import api from "../axios";

// User allocation interfaces
export interface UserAllocation {
  newPartnerUserId: string;
  remarks?: string;
}

export interface User {
  id: string;
  phoneNumber: string;
  formattedUserId?: string;
  userDetails?: {
    firstName?: string;
    lastName?: string;
  };
  allottedPartners?: Array<{
    partnerUser?: {
      id: string;
      name: string;
    };
  }>;
  createdAt: Date;
}

// Bulk allocation interfaces
export interface BulkUserAllocationRequest {
  brandId: string;
  targetPartnerUserIds?: string[]; // Support multiple target partners
  createdFrom?: string; // ISO date string (start date) - Optional for all-time mode
  createdTo?: string; // ISO date string (end date for range) - Optional for all-time mode  
  sourcePartnerUserIds?: string[]; // Support multiple source partners
  isAllTime?: boolean; // If true, ignore date range
  remarks?: string;
}

export interface BulkUserAllocationResponse {
  success: boolean;
  message: string;
  allocatedCount: number;
  failedCount: number;
  details: Array<{
    userId: string;
    formattedUserId: string;
    status: "success" | "failed";
    partnerUserId?: string;
    error?: string;
  }>;
}

export interface GetUsersForAllocationRequest {
  brandId: string;
  createdFrom?: string;
  createdTo?: string;
  sourcePartnerUserIds?: string[];
  isAllTime?: boolean;
  limit?: number;
}

export interface GetUsersForAllocationResponse {
  users: User[];
  totalCount: number;
}

// Single user allocation
export const allocateUser = async (
  userId: string,
  allocation: UserAllocation
) => {
  try {
    const response = await api.post(
      `/user/relocate-user`,
      {
        userId,
        newPartnerUserId: allocation.newPartnerUserId,
        remarks: allocation.remarks,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error allocating user:", error);
    throw error;
  }
};

// Bulk user allocation
export const bulkRelocateUsers = async (
  request: BulkUserAllocationRequest
): Promise<BulkUserAllocationResponse> => {
  try {
    const response = await api.post(
      `/user/bulk-relocate-users`,
      request
    );
    return response.data;
  } catch (error) {
    console.error("Error bulk allocating users:", error);
    throw error;
  }
};

// Get users for allocation preview
export const getUsersForAllocation = async (
  request: GetUsersForAllocationRequest
): Promise<GetUsersForAllocationResponse> => {
  try {
    const response = await api.post(
      `/user/users-for-allocation`,
      request
    );
    return response.data;
  } catch (error) {
    console.error("Error getting users for allocation:", error);
    throw error;
  }
};
