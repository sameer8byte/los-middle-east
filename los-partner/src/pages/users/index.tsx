import { PartnerUserComponent } from "../../features/partnerUsers";
import { PermissionProvider } from "../../context/permissionContext";
import { RoleProvider } from "../../context/roleContext";
import {
  PartnerUserPermissionEnum,
  PartnerUserRoleEnum,
} from "../../constant/enum";
import { ProtectedRoute } from "../../components/ProtectedRoute";

export function PartnerUserPage() {
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
              PartnerUserPermissionEnum.PARTNER_USER_MANAGEMENT,
              PartnerUserPermissionEnum.ALL,
            ]}
          >
            <PartnerUserComponent />
          </ProtectedRoute>
        </PermissionProvider>
      </RoleProvider>
    </div>
  );
}
