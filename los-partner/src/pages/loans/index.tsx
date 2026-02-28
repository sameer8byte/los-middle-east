import { LoansComponent } from "../../features/loans";
import { PermissionProvider } from "../../context/permissionContext";
import { RoleProvider } from "../../context/roleContext";

export function LoansPages() {
  return (
    <div>
      <RoleProvider>
        <PermissionProvider>
          <LoansComponent />
        </PermissionProvider>
      </RoleProvider>
    </div>
  );
}
