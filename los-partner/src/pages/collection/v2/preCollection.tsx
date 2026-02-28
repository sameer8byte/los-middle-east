import { PermissionProvider } from "../../../context/permissionContext";
import { RoleProvider } from "../../../context/roleContext";
import { PreCollection } from "../../../features/collectionV2/components/preCollection.v2";
 
export function PreCollectionV2() {
    return (
        <div>
            <RoleProvider>
                <PermissionProvider>
                    <PreCollection />
                </PermissionProvider>
            </RoleProvider>
        </div>
    );
}