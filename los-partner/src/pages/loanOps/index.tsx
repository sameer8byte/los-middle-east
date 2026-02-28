import { LoansOpsComponent } from "../../features/loansOps";
import { PermissionProvider } from "../../context/permissionContext";
import { RoleProvider } from "../../context/roleContext";

export function LoanOpsPages() {
  return (
    <div>
      <RoleProvider>
        <PermissionProvider>
          <LoansOpsComponent />
        </PermissionProvider>
      </RoleProvider>
    </div>
  );
}