import { ProtectedRoute } from "../../components/ProtectedRoute";
import {
  PartnerUserPermissionEnum,
} from "../../constant/enum";
import { PermissionProvider } from "../../context/permissionContext";
import { RoleProvider } from "../../context/roleContext";
import DashboardV2Content from "../../features/dashboardV2";

export function DashboardV2Page() {
  return (
    <div>
      <RoleProvider>
        <PermissionProvider>
          <ProtectedRoute
            // allowedRoles={[
           // PartnerUserRoleEnum.SUPER_ADMIN,
           // PartnerUserRoleEnum.ADMIN,
           // ]}
            allowedPermissions={[
              PartnerUserPermissionEnum.VIEW_DASHBOARD,
              PartnerUserPermissionEnum.ALL,
            ]}
          >
            <DashboardV2Content />
          </ProtectedRoute>
        </PermissionProvider>
      </RoleProvider>
    </div>
  );
}
