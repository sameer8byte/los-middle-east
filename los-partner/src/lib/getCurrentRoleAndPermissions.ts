import {
  PartnerUserPermissionEnum,
  PartnerUserRoleEnum,
} from "../constant/enum";

interface RolePermissionResult {
  roleId: PartnerUserRoleEnum | null;
  permissionIds: PartnerUserPermissionEnum[];
}

// Mapping route segments to roles
const pathRoleMap: Record<string, PartnerUserRoleEnum> = {
  "/help-center": PartnerUserRoleEnum.ADMIN,
  "/settings": PartnerUserRoleEnum.BRAND_SETTINGS,
  "/dashboard": PartnerUserRoleEnum.VIEW_DASHBOARD,
  "/customers": PartnerUserRoleEnum.CUSTOMER,
  "/collection": PartnerUserRoleEnum.COLLECTION_HEAD,
  "/pre-collection": PartnerUserRoleEnum.COLLECTION_EXECUTIVE,
  "/post-collection": PartnerUserRoleEnum.COLLECTION_EXECUTIVE,
  "/sanction-manager": PartnerUserRoleEnum.SANCTION_MANAGER,
  "/sanction-head": PartnerUserRoleEnum.SANCTION_HEAD,
  "/credit-executive": PartnerUserRoleEnum.CREDIT_EXECUTIVE,
  "/completed": PartnerUserRoleEnum.COMPLETED_LOANS,
  "/user": PartnerUserRoleEnum.PARTNER_USER_MANAGEMENT,
  "/loans": PartnerUserRoleEnum.LOANS,
  "/loans-ops": PartnerUserRoleEnum.LOAN_OPS,
  "/reports": PartnerUserRoleEnum.REPORT,
};

// Mapping route segments to permissions
const pathPermissionMap: Record<string, PartnerUserPermissionEnum[]> = {
  "/help-center": [
    PartnerUserPermissionEnum.BRAND_SETTINGS,
    PartnerUserPermissionEnum.ALL,
  ], // Adjust as needed
  "/settings": [
    PartnerUserPermissionEnum.BRAND_SETTINGS,
    PartnerUserPermissionEnum.ALL,
  ],
  "/dashboard": [
    PartnerUserPermissionEnum.VIEW_DASHBOARD,
    PartnerUserPermissionEnum.ALL,
  ],
  "/global-search": [
    PartnerUserPermissionEnum.GLOBAL_SEARCH,
    PartnerUserPermissionEnum.ALL,
  ],
  "dashboard-v1": [
    PartnerUserPermissionEnum.VIEW_DASHBOARD,
    PartnerUserPermissionEnum.ALL,
  ],
  "dashboard-v2": [
    PartnerUserPermissionEnum.VIEW_DASHBOARD,
    PartnerUserPermissionEnum.ALL,
  ],
  "/customers": [
    PartnerUserPermissionEnum.CUSTOMER,
    PartnerUserPermissionEnum.ALL,
  ],
  "/collection": [
    PartnerUserPermissionEnum.COLLECTIONS,
    PartnerUserPermissionEnum.ALL,
  ],
  "/pre-collection": [
    PartnerUserPermissionEnum.PRE_COLLECTIONS,
    PartnerUserPermissionEnum.ALL,
  ],
  "/post-collection": [
    PartnerUserPermissionEnum.POST_COLLECTIONS,
    PartnerUserPermissionEnum.ALL,
  ],
  "/sanction-manager": [
    PartnerUserPermissionEnum.SANCTION_MANAGER,
    PartnerUserPermissionEnum.ALL,
  ],
  "/sanction-head": [
    PartnerUserPermissionEnum.SANCTION_HEAD,
    PartnerUserPermissionEnum.ALL,
  ],
  "/credit-executive": [
    PartnerUserPermissionEnum.CREDIT_EXECUTIVE,
    PartnerUserPermissionEnum.ALL,
  ],
  "/completed": [
    PartnerUserPermissionEnum.COMPLETED_LOANS,
    PartnerUserPermissionEnum.ALL,
  ],
  "/user": [
    PartnerUserPermissionEnum.PARTNER_USER_MANAGEMENT,
    PartnerUserPermissionEnum.ALL,
  ],
  "/loans": [PartnerUserPermissionEnum.LOANS, PartnerUserPermissionEnum.ALL],
  "/loans-ops": [
    PartnerUserPermissionEnum.LOAN_OPS,
    PartnerUserPermissionEnum.ALL,
  ],
  "/reports": [
    PartnerUserPermissionEnum.REPORTS,
    PartnerUserPermissionEnum.ALL,
  ],
};

export function getCurrentRoleAndPermissions(): RolePermissionResult {
  const path = window.location.pathname.toLowerCase();

  // Extract route after :brandId
  const segments = path.split("/").filter(Boolean);
  
  // The path structure is typically: /brandId/route-name
  // segments[0] = brandId, segments[1] = route-name
  const routeSegment = segments[1] ? `/${segments[1]}` : "";

  const roleId = pathRoleMap[routeSegment] || null;
  const permissionIds = pathPermissionMap[routeSegment] || [];

  return { roleId, permissionIds };
}
