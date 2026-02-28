import { PermissionProvider } from "../../context/permissionContext";
import { RoleProvider } from "../../context/roleContext";
import { NoDuePendingComponent } from "../../features/payment/noDuePending";

export function NoDuePendingPage() {
  return (
    <div>
      <RoleProvider>
        <PermissionProvider>
          <NoDuePendingComponent />
        </PermissionProvider>
      </RoleProvider>
    </div>
  );
}
