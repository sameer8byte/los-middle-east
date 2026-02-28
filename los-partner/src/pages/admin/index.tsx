import { AdminComponent } from "../../features/admin";
import { PermissionProvider } from "../../context/permissionContext";
import { RoleProvider } from "../../context/roleContext";
 
export function AdminPage(){
    return (
        <div>
            <RoleProvider>
                <PermissionProvider>
                    <AdminComponent/>
                </PermissionProvider>
            </RoleProvider>
        </div>
    )
}