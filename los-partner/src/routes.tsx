import { Navigate, Outlet, useRoutes } from "react-router-dom";
import { LoginPage } from "./pages/login";
import { AdminPage } from "./pages/admin";
import { SettingPage } from "./pages/settings";
import { DashboardPage } from "./pages/dashboard";
import { PartnerUserPage } from "./pages/users";
import { JSX, useEffect } from "react";
import { Layout } from "./layout";
import { CustomersPage } from "./pages/customers";
import { CustomerDetailsPage } from "./pages/customers/customerDetails";
import { SpecificSettingPage } from "./pages/settings/specificSetting";
import { useDevice } from "./hooks/useDevice";
import { LoansPages } from "./pages/loans";
import { LoanOpsPages } from "./pages/loanOps";
import { PendingDisbursementPage } from "./pages/loanOps/pendingDisbursement";
import { PaymentApprovalPage } from "./pages/loanOps/paymentApproval";
import { PaymentRejectedPage } from "./pages/loanOps/paymentRejected";
import { AdminSettingsPage } from "./pages/adminSettings";
import { CollectionPage } from "./pages/collection";
import { HelpCenterPage } from "./pages/helpCenter";
import { LoanCompletedPages } from "./pages/loanCompleted";
import { ResetPasswordPage } from "./pages/login/resetPassword";
import { ReportPage } from "./pages/report";
import {
  PartnerUserPermissionEnum,
  PartnerUserRoleEnum,
} from "./constant/enum";
import { PostCollection } from "./pages/collection/postCollection";
import { SanctionsManager } from "./pages/sanctionsManager";
import { SanctionsHead } from "./pages/sanctionsHead";
import { CreditExecutive } from "./pages/creditExecutive";
import { isAdmin, isOtherRoles, isSuperAdmin, isValidRole } from "./lib/role";
import { useAppSelector } from "./shared/redux/store";
import { PreCollection } from "./pages/collection/preCollection";
import { GlobalSearch } from "./pages/gloabalSearch";
import { UnallocatedCustomersPage } from "./pages/customers/unallocatedCustomers";
import { NoDuePendingPage } from "./pages/loanOps/noDuePending";
import { LoanCompletedAllPages } from "./pages/loanCompleted/all";
import { LoanSettled } from "./pages/loanCompleted/settlement";
import { LoanWriteOff } from "./pages/loanCompleted/write-off";
import LoansClosed from "./features/loanCompleted/closed";
import { AllCollectionV2 } from "./pages/collection/v2";
import { PostCollectionV2 } from "./pages/collection/v2/postCollection";
import { PreCollectionV2 } from "./pages/collection/v2/preCollection";
import { PaymentApprovedPage } from "./pages/loanOps/paymentApproved";
import UnAllocatedLoansPage from "./pages/loans/unallocatedLoans";
import RemindersPage from "./pages/reminders/RemindersPage";
import { useVersionGuard } from "./hooks/useVersionGuard";
import { DashboardV2Page } from "./pages/dashboard/dashboard-v2";
// Component to protect routes for super_admin only
const SuperAdminRoute = ({ children }: { children: JSX.Element }) => {
  const userRoles = useAppSelector((state) => state.auth.data?.role) || [];
  return isSuperAdmin(userRoles) ? children : <Navigate to="/" />;
};

const AdminOrPermissionRoute = ({ children }: { children: JSX.Element }) => {
  const userData = useAppSelector((state) => state.auth.data);
  return isValidRole(userData.role) ? children : <Navigate to="/" />;
};

const ProtectedRoutes = () => {
  const token = useAppSelector((state) => state.auth.accessToken);
  return token ? (
    <Layout>
      <Outlet />
    </Layout>
  ) : (
    <Navigate to="/login" />
  );
};

const HomeRedirect = () => {
  const userData = useAppSelector((state) => state.auth.data);
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const brand = useAppSelector((state) => state.brand.brandConfig);
  const isDashboardV1 = brand?.dashboard_version === "V1";
  const isDashboardV2 = brand?.dashboard_version === "V2";

  const redirectPath = () => {
    if (userData?.role?.includes(PartnerUserRoleEnum.SUPER_ADMIN))
      return "/admin";
    if (
      (userData?.role && isOtherRoles(userData.role)) ||
      (userData?.role && isAdmin(userData.role))
    ) {
      const brandId = userData?.brandId;
      if (!brandId) {
        return "/login";
      }
      if (
        userData?.permissions.includes(PartnerUserPermissionEnum.ALL) ||
        userData?.permissions.includes(PartnerUserPermissionEnum.VIEW_DASHBOARD)
      ) {
        // return `/${brandId}/dashboard`;
        if (isDashboardV2) {
          return `/${brandId}/dashboard-v2`;
        } else if (isDashboardV1) {
          return `/${brandId}/dashboard-v1`;
        } else {
          return `/${brandId}/dashboard`;
        }
      }
      if (isOtherRoles(userData?.role)) {
        switch (userData?.permissions[0]) {
          case PartnerUserPermissionEnum.CUSTOMER:
            return `/${brandId}/customers`;
          case PartnerUserPermissionEnum.LOANS:
            return `/${brandId}/loans`;
          case PartnerUserPermissionEnum.LOAN_OPS:
            return `/${brandId}/loans-ops`;
          case PartnerUserPermissionEnum.PARTNER_USER_MANAGEMENT:
            return `/${brandId}/user`;
          case PartnerUserPermissionEnum.BRAND_SETTINGS:
            return `/${brandId}/settings`;
          case PartnerUserPermissionEnum.VIEW_DASHBOARD:
            if (isDashboardV2) {
              return `/${brandId}/dashboard-v2`;
            } else if (isDashboardV1) {
              return `/${brandId}/dashboard-v1`;
            } else {
              return `/${brandId}/dashboard`;
            }
          case PartnerUserPermissionEnum.COMPLETED_LOANS:
            return `/${brandId}/completed`;
          case PartnerUserPermissionEnum.REPORTS:
            return `/${brandId}/reports`;
          case PartnerUserPermissionEnum.COLLECTIONS:
            return `/${brandId}/collection`;
          case PartnerUserPermissionEnum.PRE_COLLECTIONS:
            return `/${brandId}/pre-collection`;
          case PartnerUserPermissionEnum.POST_COLLECTIONS:
            return `/${brandId}/post-collection`;
          case PartnerUserPermissionEnum.SANCTION_MANAGER:
            return `/${brandId}/sanction-manager`;
          case PartnerUserPermissionEnum.SANCTION_HEAD:
            return `/${brandId}/sanction-head`;
          case PartnerUserPermissionEnum.CREDIT_EXECUTIVE:
            return `/${brandId}/credit-executive`;
          case PartnerUserPermissionEnum.GLOBAL_SEARCH:
            return `/${brandId}/global-search`;
          default:
            return `/${brandId}/dashboard`;
        }
      }
    }
    return "/login";
  };

  return accessToken ? <Navigate to={redirectPath()} /> : <Outlet />;
};

export default function InternalPages() {
  const { postRegisterUserDevice } = useDevice();
  useEffect(() => {
    postRegisterUserDevice();
  }, [postRegisterUserDevice]);
  useVersionGuard(); // ← one line

  return useRoutes([
    {
      path: "/",
      element: <HomeRedirect />,
      children: [
        { index: true, element: <Navigate to="/login" /> },
        { path: "login", element: <LoginPage /> },

        {
          path: "reset-password",
          element: <ResetPasswordPage />,
        },
      ],
    },
    {
      element: <ProtectedRoutes />,
      children: [
        {
          path: ":brandId/help-center",
          element: <HelpCenterPage />,
        },
        {
          path: "admin",
          element: (
            <SuperAdminRoute>
              <AdminPage />
            </SuperAdminRoute>
          ),
        },
        {
          path: "admin/settings",
          element: (
            <SuperAdminRoute>
              <AdminSettingsPage />
            </SuperAdminRoute>
          ),
        },
        {
          path: ":brandId/settings",
          element: (
            <AdminOrPermissionRoute>
              <SettingPage />
            </AdminOrPermissionRoute>
          ),
        },
        {
          path: ":brandId/settings/:settingId",
          element: (
            <AdminOrPermissionRoute>
              <SpecificSettingPage />
            </AdminOrPermissionRoute>
          ),
        },
        {
          path: ":brandId/dashboard",
          element: (
            <AdminOrPermissionRoute>
              <DashboardPage />
            </AdminOrPermissionRoute>
          ),
        },
        // {
        //   path: ":brandId/collection-executive-dashboard",
        //   element: (
        //     <AdminOrPermissionRoute>
        //       <CollectionExecutiveDashboard />
        //     </AdminOrPermissionRoute>
        //   ),
        // },
        {
          path: ":brandId/dashboard-v1",
          element: (
            <AdminOrPermissionRoute>
              <DashboardPage />
            </AdminOrPermissionRoute>
          ),
        },
        {
          path: ":brandId/dashboard-v2",
          element: (
            <AdminOrPermissionRoute>
              <DashboardV2Page />
            </AdminOrPermissionRoute>
          ),
        },
        {
          path: ":brandId/customers",
          element: (
            <AdminOrPermissionRoute>
              <CustomersPage />
            </AdminOrPermissionRoute>
          ),
        },
        {
          path: ":brandId/unallocated-customers",
          element: (
            <AdminOrPermissionRoute>
              <UnallocatedCustomersPage />
            </AdminOrPermissionRoute>
          ),
        },
        {
          path: ":brandId/:fallbackpage/customers/:customerId",
          element: (
            <AdminOrPermissionRoute>
              <CustomerDetailsPage />
            </AdminOrPermissionRoute>
          ),
        },
        {
          path: ":brandId/collection",
          element: (
            <AdminOrPermissionRoute>
              <CollectionPage />
            </AdminOrPermissionRoute>
          ),
        },
        {
          path: ":brandId/pre-collection",
          element: (
            <AdminOrPermissionRoute>
              <PreCollection />
            </AdminOrPermissionRoute>
          ),
        },
        {
          path: ":brandId/post-collection",
          element: (
            <AdminOrPermissionRoute>
              <PostCollection />
            </AdminOrPermissionRoute>
          ),
        },
        {
          path: ":brandId/collection/all",
          element: (
            <AdminOrPermissionRoute>
              <AllCollectionV2 />
            </AdminOrPermissionRoute>
          ),
        },
        {
          path: ":brandId/collection/pre-collection",
          element: (
            <AdminOrPermissionRoute>
              <PreCollectionV2 />
            </AdminOrPermissionRoute>
          ),
        },
        {
          path: ":brandId/collection/post-collection",
          element: (
            <AdminOrPermissionRoute>
              <PostCollectionV2 />
            </AdminOrPermissionRoute>
          ),
        },
        {
          path: ":brandId/sanction-manager",
          element: (
            <AdminOrPermissionRoute>
              <SanctionsManager />
            </AdminOrPermissionRoute>
          ),
        },
        {
          path: ":brandId/sanction-head",
          element: (
            <AdminOrPermissionRoute>
              <SanctionsHead />
            </AdminOrPermissionRoute>
          ),
        },
        {
          path: ":brandId/credit-executive",
          element: (
            <AdminOrPermissionRoute>
              <CreditExecutive />
            </AdminOrPermissionRoute>
          ),
        },
        {
          path: ":brandId/completed",
          element: (
            <AdminOrPermissionRoute>
              <LoanCompletedPages />
            </AdminOrPermissionRoute>
          ),
        },
        {
          path: ":brandId/completed/all",
          element: (
            <AdminOrPermissionRoute>
              <LoanCompletedAllPages />
            </AdminOrPermissionRoute>
          ),
        },
        {
          path: ":brandId/completed/closed",
          element: (
            <AdminOrPermissionRoute>
              <LoansClosed />
            </AdminOrPermissionRoute>
          ),
        },
        {
          path: ":brandId/completed/settled",
          element: (
            <AdminOrPermissionRoute>
              <LoanSettled />
            </AdminOrPermissionRoute>
          ),
        },
        {
          path: ":brandId/completed/writeoff",
          element: (
            <AdminOrPermissionRoute>
              <LoanWriteOff />
            </AdminOrPermissionRoute>
          ),
        },
        {
          path: ":brandId/partner-users",
          element: (
            <AdminOrPermissionRoute>
              <PartnerUserPage />
            </AdminOrPermissionRoute>
          ),
        },
        {
          path: ":brandId/loans",
          element: (
            <AdminOrPermissionRoute>
              <LoansPages />
            </AdminOrPermissionRoute>
          ),
        },
        {
          path: ":brandId/unallocated-loans",
          element: (
            <AdminOrPermissionRoute>
              <UnAllocatedLoansPage />
            </AdminOrPermissionRoute>
          ),
        },
        {
          path: ":brandId/reminders",
          element: (
            <AdminOrPermissionRoute>
              <RemindersPage />
            </AdminOrPermissionRoute>
          ),
        },
        {
          path: ":brandId/reports",
          element: (
            <AdminOrPermissionRoute>
              <ReportPage />
            </AdminOrPermissionRoute>
          ),
        },
        {
          path: ":brandId/loans-ops",
          element: (
            <AdminOrPermissionRoute>
              <LoanOpsPages />
            </AdminOrPermissionRoute>
          ),
        },
        {
          path: ":brandId/loans-ops/pending-disbursement",
          element: (
            <AdminOrPermissionRoute>
              <PendingDisbursementPage />
            </AdminOrPermissionRoute>
          ),
        },
        {
          path: ":brandId/loans-ops/payment-approval",
          element: (
            <AdminOrPermissionRoute>
              <PaymentApprovalPage />
            </AdminOrPermissionRoute>
          ),
        },
        {
          path: ":brandId/loans-ops/payment-rejected",
          element: (
            <AdminOrPermissionRoute>
              <PaymentRejectedPage />
            </AdminOrPermissionRoute>
          ),
        },
        {
          path: ":brandId/loans-ops/payment-approved",
          element: (
            <AdminOrPermissionRoute>
              <PaymentApprovedPage />
            </AdminOrPermissionRoute>
          ),
        },

        {
          path: ":brandId/loans-ops/no-due-pending",
          element: (
            <AdminOrPermissionRoute>
              <NoDuePendingPage />
            </AdminOrPermissionRoute>
          ),
        },
        {
          path: ":brandId/global-search",
          element: (
            <AdminOrPermissionRoute>
              <GlobalSearch />
            </AdminOrPermissionRoute>
          ),
        },
      ],
    },
    { path: "*", element: <Navigate to="/" /> },
  ]);
}
