import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useEffect,
} from "react";
 import { getCurrentRoleAndPermissions } from "../lib/getCurrentRoleAndPermissions";
import { UserPermission } from "../shared/types/partnerUser";
import { useAppSelector } from "../shared/redux/store";

interface PermissionContextType {
  permission: UserPermission | null;
  setPermission: (permission: UserPermission | null) => void;
}

const PermissionContext = createContext<PermissionContextType | undefined>(
  undefined
);

export const PermissionProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAppSelector((state) => state.auth.data);

  const [permission, setPermission] = useState<UserPermission | null>(null);

  // Update permissions when auth data changes
  useEffect(() => {
    if (auth?.userPermissions && auth.userPermissions.length > 0) {
      const getCurrentRoleAndPermission = getCurrentRoleAndPermissions();
      
      // Try to find permission based on current route
      let foundPermission = auth.userPermissions.find((perm) =>
        getCurrentRoleAndPermission.permissionIds.includes(
          perm.partnerPermission.name
        )
      );
      // Fallback: if no permission found based on route, use the first available permission
      if (!foundPermission && auth.userPermissions.length > 0) {
        foundPermission = auth.userPermissions[0];
      }

      setPermission(foundPermission || null);
    } else {
      // If no auth userPermissions, reset to null
      setPermission(null);
    }
  }, [auth]);

  return (
    <PermissionContext.Provider value={{ permission, setPermission }}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermission = () => {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error("usePermission must be used within a PermissionProvider");
  }
  return context;
};
