import { PostCollectionComponent } from "../../features/loanPostCollection";
import { PermissionProvider } from "../../context/permissionContext";
import { RoleProvider } from "../../context/roleContext";

export function PostCollection() {
  return (
    <div>
      <RoleProvider>
        <PermissionProvider>
          <PostCollectionComponent />
        </PermissionProvider>
      </RoleProvider>
    </div>
  );
}