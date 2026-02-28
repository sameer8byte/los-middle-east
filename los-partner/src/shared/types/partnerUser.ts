import {
  PartnerUserPermissionEnum,
  PartnerUserRoleEnum,
  PartnerUserPermissionType,
} from "../../constant/enum";

export interface Permission {
  id: number;
  name: PartnerUserPermissionEnum;
  description: string | null;
  permission_group_id?: number;
  permissionGroupId?: number;
}

export interface RolesAndPermissions {
  roles: Role[];
  permissions: Permission[];
}

export interface PartnerUserLoginLog {
  id: string;
  partnerUserId: string;
  date: Date;
  firstLogin: Date;
  lastLogout: Date | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerUser {
  id: string;
  email: string;
  password: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  name: string;
  reportsTo: PartnerUser;
  isActive: boolean;
  deletedAt: string | null;
  phone_number: string;
  brandRoles: BrandRole[];
  userPermissions: UserPermission[];
  isReloanSupport: boolean;
  old_id: number | null;
  is_fresh_loan_support: boolean;
  is_disabled: boolean;
}

export interface BrandRole {
  partnerUserId: string;
  brandId: string;
  roleId: number;
  role: Role;
}

export interface Role {
  id: number;
  name: PartnerUserRoleEnum;
  description: string | null;
}

export interface UserPermission {
  partnerUserId: string;
  partnerPermissionId: number;
  partnerPermission: PartnerPermission;
  partnerPermissionType: PartnerUserPermissionType;
}

export interface PartnerPermission {
  id: number;
  name: PartnerUserPermissionEnum;
  description: string | null;
}
