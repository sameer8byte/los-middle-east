import { PermissionProvider } from "../../context/permissionContext";
import { RoleProvider } from "../../context/roleContext";
import { PendingDisbursementComponent } from "../../features/payment/pendingDisbursement";

export function PendingDisbursementPage() {
  return (
    <div>
      <RoleProvider>
        <PermissionProvider>
          <PendingDisbursementComponent />
        </PermissionProvider>
      </RoleProvider>
    </div>
  );
}

