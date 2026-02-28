import CustomersComponent from "../../features/customers";
import { PermissionProvider } from "../../context/permissionContext";
import { RoleProvider } from "../../context/roleContext";

export function CustomersPage() {
  return (
    <div>
      <RoleProvider>
        <PermissionProvider>
          <CustomersComponent />
        </PermissionProvider>
      </RoleProvider>
    </div>
  );
}