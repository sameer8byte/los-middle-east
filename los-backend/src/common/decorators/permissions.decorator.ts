import { SetMetadata } from "@nestjs/common";
import { PermissionsEnum } from "src/constant/permissions";
 
export const PERMISSIONS_KEY = "permissions";
export const Permissions = (
  ...permissions: (keyof typeof PermissionsEnum)[]
) => SetMetadata(PERMISSIONS_KEY, permissions);
