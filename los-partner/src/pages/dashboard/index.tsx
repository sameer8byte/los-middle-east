import { ProtectedRoute } from "../../components/ProtectedRoute";
import {
  PartnerUserPermissionEnum,
  // PartnerUserRoleEnum,
} from "../../constant/enum";
import { PermissionProvider } from "../../context/permissionContext";
import { RoleProvider } from "../../context/roleContext";
import { DashboardComponent } from "../../features/dashboard";

export function DashboardPage() {
  return (
    <div>
      <RoleProvider>
        <PermissionProvider>
          <ProtectedRoute
            // allowedRoles={[
            //   PartnerUserRoleEnum.SUPER_ADMIN,
            //   PartnerUserRoleEnum.ADMIN,
            // ]}
            allowedPermissions={[
              PartnerUserPermissionEnum.VIEW_DASHBOARD,
              PartnerUserPermissionEnum.ALL,
            ]}
          >
            <DashboardComponent />
          </ProtectedRoute>
        </PermissionProvider>
      </RoleProvider>
    </div>
  );
}
