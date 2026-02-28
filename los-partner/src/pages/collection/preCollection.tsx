import { PermissionProvider } from "../../context/permissionContext";
import { RoleProvider } from "../../context/roleContext";
import { PreCollectionComponent } from "../../features/loanPreCollection";

export function PreCollection() {
  return (
    <div>
      <RoleProvider>
        <PermissionProvider>
          <PreCollectionComponent />
        </PermissionProvider>
      </RoleProvider>
    </div>
  );
}