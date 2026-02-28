import { PermissionProvider } from "../../../context/permissionContext";
import { RoleProvider } from "../../../context/roleContext";
 import { AllCollection } from "../../../features/collectionV2/components/allCollection.v2";

export function AllCollectionV2() {
    return (
        <div>
            <RoleProvider>
                <PermissionProvider>
                    <AllCollection />
                </PermissionProvider>
            </RoleProvider>
        </div>
    );
}