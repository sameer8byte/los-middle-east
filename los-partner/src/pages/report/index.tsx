import { ReportComponent } from "../../features/msiReport";
import { PermissionProvider } from "../../context/permissionContext";
import { RoleProvider } from "../../context/roleContext";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import {
  PartnerUserPermissionEnum,
  PartnerUserRoleEnum,
} from "../../constant/enum";

export function ReportPage() {
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
              PartnerUserPermissionEnum.MASTER_REPORTS,
              PartnerUserPermissionEnum.DISBURSED_LOAN_REPORT,
              PartnerUserPermissionEnum.NON_DISBURSED_LOAN_REPORT,
              PartnerUserPermissionEnum.MASTER_COLLECTION_REPORT,
              PartnerUserPermissionEnum.COLLECTION_LOAN_REPORT,
              PartnerUserPermissionEnum.CIC_REPORT,
              PartnerUserPermissionEnum.MARKETING_REPORT,
              PartnerUserPermissionEnum.REPORTS,
              PartnerUserPermissionEnum.ALL,
            ]}
          >
            <ReportComponent />
          </ProtectedRoute>
        </PermissionProvider>
      </RoleProvider>
    </div>
  );
}
