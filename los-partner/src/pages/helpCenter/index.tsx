import { HelpCenterComponent } from "../../features/helpCenter";
import { PermissionProvider } from "../../context/permissionContext";
import { RoleProvider } from "../../context/roleContext";

export function HelpCenterPage() {
  return (
    <div className="flex flex-col h-full">
      <RoleProvider>
        <PermissionProvider>
          <HelpCenterComponent />
        </PermissionProvider>
      </RoleProvider>
    </div>
  );
}