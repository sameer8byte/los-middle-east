import { PartnerUserRoleEnum } from "../constant/enum";

export function isOtherRoles(roles: PartnerUserRoleEnum[]): boolean {
  const excludedRoles = [PartnerUserRoleEnum.SUPER_ADMIN, PartnerUserRoleEnum.ADMIN];

  // Return true only if all roles are not in excludedRoles and are part of PartnerUserRoleEnum enum
  return roles.every(
    (role) =>
      Object.values(PartnerUserRoleEnum).includes(role) &&
      !excludedRoles.includes(role)
  );
}

export function isSuperAdmin(roles: PartnerUserRoleEnum[]): boolean {
  return roles.includes(PartnerUserRoleEnum.SUPER_ADMIN);
}
export function isAdmin(roles: PartnerUserRoleEnum[]): boolean {
  return roles.includes(PartnerUserRoleEnum.ADMIN);
}


export function isValidRole(role: PartnerUserRoleEnum[]): boolean {
  return Object.values(PartnerUserRoleEnum).some(
    (validRole) => role.includes(validRole)
  );
}