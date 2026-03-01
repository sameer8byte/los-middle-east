import { ProtectedRoute } from "../../components/ProtectedRoute";
import { PartnerUserPermissionEnum } from "../../constant/enum";
import { PermissionProvider } from "../../context/permissionContext";
import { RoleProvider } from "../../context/roleContext";
import DomainHeadDashboard from "../../features/dashboardV2/components/domainHead";

export function DomainHeadPage() {
    return (
        <div>
            <RoleProvider>
                <PermissionProvider>
                    <ProtectedRoute
                        allowedPermissions={[
                            PartnerUserPermissionEnum.VIEW_DASHBOARD,
                            PartnerUserPermissionEnum.ALL,
                        ]}
                    >
                        <DomainHeadDashboard />
                    </ProtectedRoute>
                </PermissionProvider>
            </RoleProvider>
        </div>
    );
}
