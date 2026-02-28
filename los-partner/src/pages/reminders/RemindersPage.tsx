import { ProtectedRoute } from "../../components/ProtectedRoute";
import {
  PartnerUserPermissionEnum,
  PartnerUserRoleEnum,
} from "../../constant/enum";
import { PermissionProvider } from "../../context/permissionContext";
import { RoleProvider } from "../../context/roleContext";
import RemindersComponent from "../../features/Reminders";

const RemindersPage = () => {
  return (
    <div>
      <RoleProvider>
        <PermissionProvider>
          <ProtectedRoute
            allowedRoles={[
              PartnerUserRoleEnum.SUPER_ADMIN,
              PartnerUserRoleEnum.ADMIN,
            ]}
            allowedPermissions={[PartnerUserPermissionEnum.ALL]}
          >
            <RemindersComponent />
          </ProtectedRoute>
        </PermissionProvider>
      </RoleProvider>
    </div>
  );
};

export default RemindersPage;
