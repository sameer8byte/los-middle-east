import { LoanCompletedComponent } from "../../features/loanCompleted";
import { PermissionProvider } from "../../context/permissionContext";
import { RoleProvider } from "../../context/roleContext";

export function LoanCompletedPages() {
  return (
    <div>
      <RoleProvider>
        <PermissionProvider>
          <LoanCompletedComponent />
        </PermissionProvider>
      </RoleProvider>
    </div>
  );
}