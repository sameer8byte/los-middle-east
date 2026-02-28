
import { PermissionProvider } from "../../context/permissionContext";
import { RoleProvider } from "../../context/roleContext";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import {
  PartnerUserPermissionEnum,
  // PartnerUserRoleEnum,
} from "../../constant/enum";
import { GlobalSearchComponent } from "../../features/globalSearch";

export function GlobalSearch() {
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
              PartnerUserPermissionEnum.GLOBAL_SEARCH,
              PartnerUserPermissionEnum.ALL,
            ]}
          >
            <GlobalSearchComponent />
          </ProtectedRoute>
        </PermissionProvider>
      </RoleProvider>
    </div>
  );
}
