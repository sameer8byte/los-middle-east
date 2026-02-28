import CustomerDetailsComponent from "../../features/customerDetails";
import { PermissionProvider } from "../../context/permissionContext";
import { RoleProvider } from "../../context/roleContext";

export function CustomerDetailsPage() {
  return (
    <div>
      <RoleProvider>
        <PermissionProvider>
          <CustomerDetailsComponent />
        </PermissionProvider>
      </RoleProvider>
    </div>
  );
}
