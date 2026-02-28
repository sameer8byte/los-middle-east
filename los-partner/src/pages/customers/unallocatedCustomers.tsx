import { ProtectedRoute } from "../../components/ProtectedRoute";
import {
  PartnerUserPermissionEnum,
  PartnerUserRoleEnum,
} from "../../constant/enum";
import { PermissionProvider } from "../../context/permissionContext";
import { RoleProvider } from "../../context/roleContext";
import UnallocatedCustomersComponent from "../../features/unallocatedCustomers";

export function UnallocatedCustomersPage() {
  return (
    <div>
      <RoleProvider>
        <PermissionProvider>
          <ProtectedRoute
            allowedRoles={[
              PartnerUserRoleEnum.SUPER_ADMIN,
              PartnerUserRoleEnum.ADMIN,
              PartnerUserRoleEnum.SANCTION_HEAD,
              PartnerUserRoleEnum.SANCTION_MANAGER,
            ]}
            allowedPermissions={[PartnerUserPermissionEnum.ALL]}
          >
            <UnallocatedCustomersComponent />
          </ProtectedRoute>
        </PermissionProvider>
      </RoleProvider>
    </div>
  );
}
