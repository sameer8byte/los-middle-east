import { CollectionComponent } from "../../features/loanCollection";
import { PermissionProvider } from "../../context/permissionContext";
import { RoleProvider } from "../../context/roleContext";

export function CollectionPage() {
    return (
        <div>
            <RoleProvider>
                <PermissionProvider>
                    <CollectionComponent />
                </PermissionProvider>
            </RoleProvider>
        </div>
    );
}