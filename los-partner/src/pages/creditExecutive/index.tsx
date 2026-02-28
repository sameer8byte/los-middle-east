import { LoansCreditExecutiveComponent } from "../../features/loanCreditExecutive";
import { PermissionProvider } from "../../context/permissionContext";
import { RoleProvider } from "../../context/roleContext";

export function CreditExecutive() {
  return (
    <div>
      <RoleProvider>
        <PermissionProvider>
          <LoansCreditExecutiveComponent/>
        </PermissionProvider>
      </RoleProvider>
    </div>
  );
}