import { SetMetadata } from "@nestjs/common";
import { PermissionType } from "@prisma/client";
import { PermissionsEnum } from "src/constant/permissions";
import { RoleEnum } from "src/constant/roles";

export const ROLE_PERMISSION_KEY = "role_permission";

export interface PermissionRequirement {
  permission: keyof typeof PermissionsEnum;
  type?: PermissionType; // READ, WRITE, or ALL (default: ALL)
}

export interface RolePermissionRequirement {
  roles?: (keyof typeof RoleEnum)[];
  permissions?: PermissionRequirement[];
  // 'AND' means user must have ALL specified roles AND permissions
  // 'OR' means user must have ANY of the specified roles OR permissions
  operator?: 'AND' | 'OR';
}

/**
 * Decorator to specify both role and permission requirements for a route.
 * Can be used with different operators:
 * - AND: User must have specified roles AND permissions
 * - OR: User must have specified roles OR permissions (default)
 */
export const RequireRoleOrPermission = (requirement: RolePermissionRequirement) =>
  SetMetadata(ROLE_PERMISSION_KEY, { 
    ...requirement, 
    operator: requirement.operator || 'OR' 
  });

// Convenience decorators for common use cases
export const RequireRoleAndPermission = (
  roles: (keyof typeof RoleEnum)[],
  permissions: (keyof typeof PermissionsEnum)[],
  permissionType: PermissionType = PermissionType.ALL
) => RequireRoleOrPermission({ 
  roles, 
  permissions: permissions.map(p => ({ permission: p, type: permissionType })), 
  operator: 'AND' 
});

export const RequireEitherRoleOrPermission = (
  roles: (keyof typeof RoleEnum)[],
  permissions: (keyof typeof PermissionsEnum)[],
  permissionType: PermissionType = PermissionType.ALL
) => RequireRoleOrPermission({ 
  roles, 
  permissions: permissions.map(p => ({ permission: p, type: permissionType })), 
  operator: 'OR' 
});

// Convenience decorators for specific permission types
export const RequireReadPermission = (
  permissions: (keyof typeof PermissionsEnum)[]
) => RequireRoleOrPermission({
  permissions: permissions.map(p => ({ permission: p, type: PermissionType.READ }))
});

export const RequireWritePermission = (
  permissions: (keyof typeof PermissionsEnum)[]
) => RequireRoleOrPermission({
  permissions: permissions.map(p => ({ permission: p, type: PermissionType.WRITE }))
});

export const RequireAllPermission = (
  permissions: (keyof typeof PermissionsEnum)[]
) => RequireRoleOrPermission({
  permissions: permissions.map(p => ({ permission: p, type: PermissionType.ALL }))
});
