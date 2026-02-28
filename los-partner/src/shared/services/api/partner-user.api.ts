import { Pagination } from "../../types/pagination";
import api from "../axios";

export const getBrandUsers = async (
  brandId: string,
  paginationDto: Pagination,
  filter?: Record<string, string | number>
) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/partner-users?page=${
        paginationDto?.page || "1"
      }&limit=${paginationDto?.limit || "10"}${
        paginationDto?.dateFilter
          ? `&dateFilter=${paginationDto.dateFilter}`
          : ""
      }${
        filter?.search ? `&search=${filter?.search ? filter.search : ""}` : ""
      }${
        filter?.roleId ? `&roleId=${filter.roleId}` : ""
      }${
        filter?.permissionId ? `&permissionId=${filter.permissionId}` : ""
      }`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

export const getBrandUserById = async (userId: string, brandId: string) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/partner-users/${userId}/roles-permissions`
    );
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};

export const getBrandRoles = async (brandId: string) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/partner-users/roles`
    );
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};

export const getBrandPermissions = async (brandId: string) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/partner-users/permissions`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching permissions:", error);
    throw error;
  }
};

// @Get("roles-permissions")
export const getBrandRolesAndPermissions = async (brandId: string) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/partner-users/roles-permissions`
    );
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};

// @Get(":userId/roles-permissions")
export const getUserRolesAndPermissions = async (
  partnerUserId: string,
  brandId: string
) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/partner-users/${partnerUserId}/roles-permissions`
    );
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};

export const createOrUpdateBrandUser = async (
  brandId: string,
  partnerUserId: string | null,
  data: {
    email: string;
    password?: string; // Make password optional
    name: string;
    phone_number?: string;
    brandId: string;
    roleId: number;
    permissions: Array<{
      permissionId: number;
      permissionType: string;
    }>;
    reportsToId?: string;
    isReloanSupport?: boolean;
    is_fresh_loan_support?: boolean;
  }
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/partner-users/create-or-update${
        partnerUserId ? `?partnerUserId=${partnerUserId}` : ""
      }`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};

// @Post(":userId/delete")
export const deleteBrandUser = async (brandId: string, userId: string) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/partner-users/${userId}/delete`,
      {}
    );
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};


export const partnerUserLogin = async (brandId: string, partnerUserId: string) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/partner-users/partner-user-login-logs`,
      { partnerUserId }
    );
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
} 

export const getPartnerUserLoginLogs = async (
  brandId: string,
  userId: string,
  pagination?: { page?: number; limit?: number; startDate?: string; endDate?: string }
) => {
  try {
    const params = new URLSearchParams();
    if (pagination?.page) params.append("page", pagination.page.toString());
    if (pagination?.limit) params.append("limit", pagination.limit.toString());
    if (pagination?.startDate) params.append("startDate", pagination.startDate);
    if (pagination?.endDate) params.append("endDate", pagination.endDate);

    const response = await api.get(
      `/partner/brand/${brandId}/partner-users/${userId}/login-logs?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching login logs:", error);
    throw error;
  }
};


 export const getCreditExecutiveUsers = async (brandId: string) => {  
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/partner-users/credit-executive-users`
    );
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};

// Get supervisor users (SANCTION_MANAGER and SANCTION_HEAD)
export const getSupervisorUsers = async (brandId: string) => {  
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/partner-users/supervisor-users`
    );
    return response.data;
  } catch (error) {
    console.error("Error getting supervisor users:", error);
    throw error;
  }
};

// Get collection executive users (users who can handle collection tasks)
export const getCollectionExecutiveUsers = async (brandId: string) => {  
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/partner-users/collection-executive-users`
    );
    return response.data;
  } catch (error) {
    console.error("Error getting collection executive users:", error);
    throw error;
  }
};

// Get collection supervisor users (users who supervise collection tasks)
export const getCollectionSupervisorUsers = async (brandId: string) => {  
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/partner-users/collection-supervisor-users`
    );
    return response.data;
  } catch (error) {
    console.error("Error getting collection supervisor users:", error);
    throw error;
  }
};

// Generate secure code for partner user (SUPER_ADMIN only)
export const generateSecureCode = async (
  brandId: string,
  userId: string
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/partner-users/${userId}/generate-secure-code`,
      {}
    );
    return response.data;
  } catch (error) {
    console.error("Error generating secure code:", error);
    throw error;
  }
};

// Get partner user audit logs
export const getPartnerUserAuditLogs = async (
  brandId: string,
  userId: string,
  pagination?: { page?: number; limit?: number; startDate?: string; endDate?: string }
) => {
  try {
    const params = new URLSearchParams();
    if (pagination?.page) params.append("page", pagination.page.toString());
    if (pagination?.limit) params.append("limit", pagination.limit.toString());
    if (pagination?.startDate) params.append("startDate", pagination.startDate);
    if (pagination?.endDate) params.append("endDate", pagination.endDate);

    const response = await api.get(
      `/partner/brand/${brandId}/partner-users/${userId}/audit-logs?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    throw error;
  }
};

// Get partner user code audit logs
export const getPartnerUserCodeAuditLogs = async (
  brandId: string,
  userId: string,
  pagination?: { page?: number; limit?: number; startDate?: string; endDate?: string }
) => {
  try {
    const params = new URLSearchParams();
    if (pagination?.page) params.append("page", pagination.page.toString());
    if (pagination?.limit) params.append("limit", pagination.limit.toString());
    if (pagination?.startDate) params.append("startDate", pagination.startDate);
    if (pagination?.endDate) params.append("endDate", pagination.endDate);

    const response = await api.get(
      `/partner/brand/${brandId}/partner-users/${userId}/code-audit-logs?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching code audit logs:", error);
    throw error;
  }
};

// Get brand settings audit logs
export const getBrandSettingAuditLogs = async (
  brandId: string,
  pagination?: { page?: number; limit?: number; startDate?: string; endDate?: string }
) => {
  try {
    const params = new URLSearchParams();
    if (pagination?.page) params.append("page", pagination.page.toString());
    if (pagination?.limit) params.append("limit", pagination.limit.toString());
    if (pagination?.startDate) params.append("startDate", pagination.startDate);
    if (pagination?.endDate) params.append("endDate", pagination.endDate);

    const response = await api.get(
      `/partner/brand/${brandId}/settings/brand-setting-audit-logs?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching brand setting audit logs:", error);
    throw error;
  }
};