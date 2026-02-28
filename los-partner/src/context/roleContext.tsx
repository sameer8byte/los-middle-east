import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useEffect,
} from "react";
import { PartnerUserRoleEnum } from "../constant/enum";
import { getCurrentRoleAndPermissions } from "../lib/getCurrentRoleAndPermissions";
import { useAppSelector } from "../shared/redux/store";

interface RoleContextType {
  role: PartnerUserRoleEnum;
  setRole: (role: PartnerUserRoleEnum) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAppSelector((state) => state.auth.data);

  // Initialize role state with user's current role from auth data
  const [role, setRole] = useState<PartnerUserRoleEnum>(auth?.role[0] || []);

  // Update role when auth data changes
  useEffect(() => {
    if (auth?.role) {
      setRole(auth.role[0]);
      const getCurrentRoleAndPermission = getCurrentRoleAndPermissions();
      if (getCurrentRoleAndPermission.roleId?.includes(auth.role[0])) {
        setRole(auth.role[0]);
      }
    }
  }, [auth.role]);

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
};
