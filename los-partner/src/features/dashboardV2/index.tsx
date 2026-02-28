import { PartnerUserRoleEnum } from "../../constant/enum";
import { isAdmin, isSuperAdmin } from "../../lib/role";
import { useAppSelector } from "../../shared/redux/store";
import { CollectionExecutiveDashboard } from "./components/collection/collectionExecutive";
import CreditExecutiveDashboard from "./components/credit/creditExecutive/page";
import CreditManager from "./components/credit/creditManager/page";
import SalesExecutive from "./components/sales/sales-executive";
import SalesManagerDashboard from "./components/sales/sales-manager";

/**
 * DashboardV2Content
 * New dashboard design and layout for V2
 */
function DashboardV2Content() {
  const auth = useAppSelector((state) => state.auth);
  const userRoles = auth.data.role;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {(auth.data.role[0] === PartnerUserRoleEnum.CREDIT_EXECUTIVE ||
        auth.data.role[0] === PartnerUserRoleEnum.SANCTION_HEAD ||
        auth.data.role[0] === PartnerUserRoleEnum.SANCTION_MANAGER ||
        isSuperAdmin(userRoles) ||
        isAdmin(userRoles)) && <SalesExecutive />}
      {(auth.data.role[0] === PartnerUserRoleEnum.SANCTION_HEAD ||
        auth.data.role[0] === PartnerUserRoleEnum.SANCTION_MANAGER ||
        isSuperAdmin(userRoles) ||
        isAdmin(userRoles)) && <SalesManagerDashboard />}
      {/* CollectionExecutiveDashboard */}
      {(auth.data.role[0] === PartnerUserRoleEnum.COLLECTION_EXECUTIVE ||
        isSuperAdmin(userRoles) ||
        isAdmin(userRoles)) && <CollectionExecutiveDashboard />}
      {(auth.data.role[0] === PartnerUserRoleEnum.COLLECTION_HEAD ||
        auth.data.role[0] === PartnerUserRoleEnum.COLLECTION_MANAGER ||
        isSuperAdmin(userRoles) ||
        isAdmin(userRoles)) && <CollectionExecutiveDashboard />}

      {(auth.data.role[0] === PartnerUserRoleEnum.CREDIT_EXECUTIVE ||
        auth.data.role[0] === PartnerUserRoleEnum.SANCTION_HEAD ||
        auth.data.role[0] === PartnerUserRoleEnum.SANCTION_MANAGER ||
        isSuperAdmin(userRoles) ||
        isAdmin(userRoles)) && <CreditExecutiveDashboard />}

      {(auth.data.role[0] === PartnerUserRoleEnum.SANCTION_HEAD ||
        auth.data.role[0] === PartnerUserRoleEnum.SANCTION_MANAGER ||
        isSuperAdmin(userRoles) ||
        isAdmin(userRoles)) && <CreditManager />}
    </div>
  );
}
export default DashboardV2Content;
