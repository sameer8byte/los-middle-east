import { LoansSanctionHeadComponent } from "../../features/loanSanctionHead";
import { PermissionProvider } from "../../context/permissionContext";
import { RoleProvider } from "../../context/roleContext";

export function SanctionsHead() {
  return (
    <div>
      <RoleProvider>
        <PermissionProvider>
          <LoansSanctionHeadComponent />
        </PermissionProvider>
      </RoleProvider>
    </div>
  );
}