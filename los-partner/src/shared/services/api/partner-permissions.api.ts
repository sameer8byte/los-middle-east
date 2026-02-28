import api from "../axios";

export interface Permission {
  id: number;
  name: string;
  description?: string;
  permission_group_id?: number;
  permissionGroupId?: number;
  _count?: {
    users?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Fetch all permissions for a brand
 */
export async function getPermissions(brandId: string): Promise<Permission[]> {
  try {
    const response = await api.get(`/partner/brand/${brandId}/partner-users/permissions`);
    return response.data || [];
  } catch (error) {
    console.error("Error fetching permissions:", error);
    throw error;
  }
}

/**
 * Fetch all roles for a brand
 */
export async function getRoles(brandId: string): Promise<Role[]> {
  try {
    const response = await api.get(`/partner/brand/${brandId}/partner-users/roles`);
    return response.data || [];
  } catch (error) {
    console.error("Error fetching roles:", error);
    throw error;
  }
}

/**
 * Update permission description and/or group
 */
export async function updatePermissionDescription(
  brandId: string,
  permissionId: number,
  description: string,
  permission_group_id?: string
): Promise<Permission> {
  try {
    const payload: any = { description };
    if (permission_group_id !== undefined) {
      payload.permission_group_id = permission_group_id;
    }
    const response = await api.patch(
      `/partner/brand/${brandId}/partner-users/permissions/${permissionId}`,
      payload
    );
    return response.data;
  } catch (error) {
    console.error("Error updating permission description:", error);
    throw error;
  }
}

/**
 * Delete a permission
 */
export async function deletePermission(
  brandId: string,
  permissionId: number
): Promise<void> {
  try {
    await api.post(`/partner/brand/${brandId}/partner-users/permissions/${permissionId}/delete`);
  } catch (error) {
    console.error("Error deleting permission:", error);
    throw error;
  }
}

/**
 * Create a new permission
 */
export async function createPermission(
  brandId: string,
  data: {
    name: string;
    description?: string;
    permission_group_id?: number;
  }
): Promise<Permission> {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/partner-users/permissions`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Error creating permission:", error);
    throw error;
  }
}
