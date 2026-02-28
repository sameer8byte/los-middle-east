import { AdminSettingComponent } from "../../features/adminSettings";
import { PermissionProvider } from "../../context/permissionContext";
import { RoleProvider } from "../../context/roleContext";

export function AdminSettingsPage() {
  return (
    <div>
      <RoleProvider>
        <PermissionProvider>
          <AdminSettingComponent />
        </PermissionProvider>
      </RoleProvider>
    </div>
  );
}