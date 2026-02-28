import { platform_type, PermissionType } from "@prisma/client";

export interface PartnerUserPermission {
  name: string;
  type: PermissionType;
}

export interface AuthenticatedPartnerUser {
  id: string;
  deviceId: string;
  brandId: string | null;
  platformType: platform_type;
  roles: string[];
  permissions: PartnerUserPermission[];
  email: string;
  name: string | null;
  isActive: boolean;
}

export interface AuthenticatedWebUser {
  id: string;
  deviceId: string;
  brandId: string;
  platformType: platform_type;
}
