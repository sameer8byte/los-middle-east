import { SpecificSettingComponent } from "../../features/specificSetting";
import { PermissionProvider } from "../../context/permissionContext";
import { RoleProvider } from "../../context/roleContext";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import {
  PartnerUserPermissionEnum,
  PartnerUserRoleEnum,
} from "../../constant/enum";

export function SpecificSettingPage() {
  return (
    <div>
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
            <SpecificSettingComponent />
          </ProtectedRoute>
        </PermissionProvider>
      </RoleProvider>
    </div>
  );
}
