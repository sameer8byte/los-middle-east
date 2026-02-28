export enum RoleEnum {
  OTHER = "OTHER",
  ADMIN = "ADMIN",
  SUPER_ADMIN = "SUPER_ADMIN",
  CUSTOMER = "CUSTOMER",
  BRAND_SETTINGS = "BRAND_SETTINGS",
  LOANS = "LOANS",
  LOAN_OPS = "LOAN_OPS",
  PARTNER_USER_MANAGEMENT = "PARTNER_USER_MANAGEMENT",
  VIEW_DASHBOARD = "VIEW_DASHBOARD",
  COMPLETED_LOANS = "COMPLETED_LOANS",
  REPORT = "REPORT",
  // Approval Module
  SANCTION_MANAGER = "SANCTION_MANAGER",
  SANCTION_HEAD = "SANCTION_HEAD",
  CREDIT_EXECUTIVE = "CREDIT_EXECUTIVE",
  //Collection Module
  COLLECTION_EXECUTIVE = "COLLECTION_EXECUTIVE",
  COLLECTION_MANAGER = "COLLECTION_MANAGER",
  COLLECTION_HEAD = "COLLECTION_HEAD",
}

export const RoleEnumMap: { id: number; value: RoleEnum }[] = [
  { id: 1, value: RoleEnum.OTHER },
  { id: 2, value: RoleEnum.ADMIN },
  { id: 3, value: RoleEnum.SUPER_ADMIN },
  { id: 4, value: RoleEnum.CUSTOMER },
  { id: 5, value: RoleEnum.BRAND_SETTINGS },
  { id: 6, value: RoleEnum.LOANS },
  { id: 7, value: RoleEnum.LOAN_OPS },
  { id: 8, value: RoleEnum.COLLECTION_EXECUTIVE },
  { id: 9, value: RoleEnum.PARTNER_USER_MANAGEMENT },
  { id: 10, value: RoleEnum.VIEW_DASHBOARD },
  { id: 11, value: RoleEnum.COMPLETED_LOANS },
  { id: 12, value: RoleEnum.REPORT },
  { id: 14, value: RoleEnum.SANCTION_MANAGER },
  { id: 15, value: RoleEnum.SANCTION_HEAD },
  { id: 16, value: RoleEnum.CREDIT_EXECUTIVE },
  { id: 17, value: RoleEnum.COLLECTION_MANAGER },
  { id: 18, value: RoleEnum.COLLECTION_HEAD },
];

/**
 * Get numeric ID of a role.
 * @param role RoleEnum value
 * @returns numeric ID or undefined if role not found
 */
export function getRoleId(role: RoleEnum): number | undefined {
  return RoleEnumMap.find((r) => r.value === role)?.id;
}

/**
 * Optional: Get RoleEnum by numeric ID
 * @param id numeric ID
 * @returns RoleEnum value or undefined if not found
 */
export function getRoleById(id: number): RoleEnum | undefined {
  return RoleEnumMap.find((r) => r.id === id)?.value;
}
