import { LoansSanctionManagerComponent } from "../../features/loanSanctionManager";
import { PermissionProvider } from "../../context/permissionContext";
import { RoleProvider } from "../../context/roleContext";

export function SanctionsManager() {
  return (
    <div>
      <RoleProvider>
        <PermissionProvider>
          <LoansSanctionManagerComponent/>
        </PermissionProvider>
      </RoleProvider>
    </div>
  );
}
