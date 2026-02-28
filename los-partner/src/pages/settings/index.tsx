import { SettingsComponent } from "../../features/settings";
import { PermissionProvider } from "../../context/permissionContext";
import { RoleProvider } from "../../context/roleContext";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import {
  PartnerUserRoleEnum,
  PartnerUserPermissionEnum,
} from "../../constant/enum";

export function SettingPage() {
  return (
    <RoleProvider>
      <PermissionProvider>
        <ProtectedRoute
          allowedRoles={[
            PartnerUserRoleEnum.SUPER_ADMIN,
            PartnerUserRoleEnum.ADMIN,
          ]}
          allowedPermissions={[
            PartnerUserPermissionEnum.BRAND_SETTINGS,
            PartnerUserPermissionEnum.ALL,
          ]}
        >
          <SettingsComponent />
        </ProtectedRoute>
      </PermissionProvider>
    </RoleProvider>
  );
}
