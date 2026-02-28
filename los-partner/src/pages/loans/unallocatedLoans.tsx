import { ProtectedRoute } from "../../components/ProtectedRoute";
import {
  PartnerUserPermissionEnum,
  PartnerUserRoleEnum,
} from "../../constant/enum";
import { PermissionProvider } from "../../context/permissionContext";
import { RoleProvider } from "../../context/roleContext";
import UnallocatedLoansComponent from "../../features/unallocatedLoans";

const UnAllocatedLoansPage = () => {
  return (
    <div>
      <RoleProvider>
        <PermissionProvider>
          {/* <LoansComponent /> */}
          <ProtectedRoute
            allowedRoles={[
              PartnerUserRoleEnum.SUPER_ADMIN,
              PartnerUserRoleEnum.ADMIN,
            ]}
            allowedPermissions={[PartnerUserPermissionEnum.ALL]}
            // todo: need more permission check
          >
            <UnallocatedLoansComponent/>
          </ProtectedRoute>
        </PermissionProvider>
      </RoleProvider>
    </div>
  );
};

export default UnAllocatedLoansPage;
