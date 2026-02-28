import { PermissionProvider } from "../../../context/permissionContext";
import { RoleProvider } from "../../../context/roleContext";
import { PostCollection } from "../../../features/collectionV2/components/postCollection.v2";
  
export function PostCollectionV2() {
    return (
        <div>
            <RoleProvider>
                <PermissionProvider>
                    <PostCollection />
                </PermissionProvider>
            </RoleProvider>
        </div>
    );
}