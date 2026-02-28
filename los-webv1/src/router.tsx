import {
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  useRoutes,
} from "react-router";
import { useAppDispatch, useAppSelector } from "./redux/store";
import { useEffect } from "react";
import PhoneVerification from "./pages/phoneVerification";
import EmailVerification from "./pages/emailVerification";
import LoanApplication from "./pages/loan-application";
import Kyc from "./pages/loan-application/kyc";
import PersonalInfo from "./pages/loan-application/personal-info";
import EmploymentInfo from "./pages/loan-application/employment-info";
import Selfie from "./pages/loan-application/selfie";

import { getIndex, getUser } from "./services/api/web.api";
import { updateIndexData } from "./redux/slices";
import { useDevice } from "./hooks/useDevice";
import Loans from "./pages/loans";
import BankDetails from "./pages/loan-application/bank-details";
import Review from "./pages/loan-application/review";
import { PageIdToPageMap } from "./constant/redirect";
import { updateUser } from "./redux/slices/user";
import { LoanRequestPage } from "./pages/loans/loanRequest";
import ProfilePage from "./pages/profile";
import SpecificProfilePage from "./pages/profile/specificProfile";
import RejectedPage from "./pages/rejected";
import CurrentStatus from "./pages/loan-application/currentStatus";
import { DigitapRedirect } from "./features/aadhaarKYC/components/digilocker2.0/digitap/digitapRedirect";
import { SignzyRedirect } from "./features/aadhaarKYC/components/digilocker2.0/signzy/redirect.signzy";
import { SignzyFailed } from "./features/aadhaarKYC/components/digilocker2.0/signzy/failed.signzy";
import AadhaarKycPage from "./pages/loan-application/aadhaarKyc";
import { DigitapRedirectV2 } from "./features/aadhaarKYC/components/digilocker2.0/digitap/digitapRedirectV2";
import RepayPage from "./pages/repaynow";

import { CashfreeIndex } from "./pages/cashfee";
import { PaymentStatusSync } from "./features/paytering/payment-status-sync";
import { UserStatusEnum } from "./constant/enum";

const ProtectedRoutes = () => {
  const token = useAppSelector((state) => state.user?.accessToken);
  const location = useLocation();

  const query = location.search || "";

  return token ? (
    <Outlet />
  ) : (
    <Navigate to={`/phone-verification${query}`} replace />
  );
};

const PublicRoutes = () => {
  const userData = useAppSelector((state) => state.user);
  const token = useAppSelector((state) => state.user?.accessToken);
  return !token ? (
    <Outlet />
  ) : (
    <Navigate to={PageIdToPageMap[userData.user.onboardingStep]} replace />
  );
};

const HomeRedirect = () => {
  const token = useAppSelector((state) => state.user?.accessToken);
  const userData = useAppSelector((state) => state.user);
  const location = useLocation();

  const query = location.search || "";
  return token ? (
    <Navigate to={PageIdToPageMap[userData.user.onboardingStep]} replace />
  ) : (
    <Navigate to={`/phone-verification${query}`} replace />
  );
};

export default function InternalPages() {
  const pathName = window.location.pathname;
  const dispatch = useAppDispatch();
  const userData = useAppSelector((state) => state.user);
  const { postRegisterUserDevice } = useDevice();
  const navigate = useNavigate();

  useEffect(() => {
    async function getIndexData() {
      try {
        const res = await getIndex();
        dispatch(updateIndexData(res));
      } catch (err) {
        console.error("Error fetching index data", err);
      }
    }
    getIndexData();
  }, [dispatch]);

  useEffect(() => {
    if (!userData.user.id || !userData.accessToken) return;
    postRegisterUserDevice();
  }, [postRegisterUserDevice]);

  // getUser
  useEffect(() => {
    if (userData.accessToken) {
      async function getUserData() {
        try {
          const response = await getUser();
          dispatch(updateUser(response));
          if (
            Number(response?.status_id) === UserStatusEnum.BLOCKED ||
            Number(response?.status_id )=== UserStatusEnum.SUSPENDED
          ) {
            navigate("/rejected", { replace: true }); // <-- correct way to navigate imperatively
            return;
          } else if (pathName === "/rejected") {
            navigate(PageIdToPageMap[response.onboardingStep], {
              replace: true,
            });
          }
        } catch (err) {
          console.error("Error fetching user data", err);
        }
      }
      getUserData();
    }
  }, [dispatch, navigate, pathName, userData.accessToken]);
  return useRoutes([
    {
      element: <Outlet />,
      children: [
        {
          path: "/digitap/digilocker/redirect/:brandId/:userId/:onboardingStep",
          element: <DigitapRedirectV2 />,
        },
        {
          path: "/signzy/digilocker/redirect/:brandId/:userId/:onboardingStep",
          element: <SignzyRedirect />,
        },
        {
          path: "/signzy/digilocker/failed/:brandId/:userId/:onboardingStep",
          element: <SignzyFailed />,
        },
        {
          path: "/loan-application/verify-aadhaar/:brandId/:userId/:onboardingStep",
          element: <DigitapRedirect />,
        },
        {
          path: "/payment/cashfree",
          element: <CashfreeIndex />,
        },
        {
          path: "/payment/status-sync",
          element: <PaymentStatusSync />,
        },
        { path: "/repay-now", element: <RepayPage /> },
      ],
    },
    {
      element: <PublicRoutes />,
      children: [
        { path: "/", element: <HomeRedirect /> },
        { path: "/phone-verification", element: <PhoneVerification /> },
        { path: "/repay-now", element: <RepayPage /> },
      ],
    },
    {
      element: <ProtectedRoutes />,
      children: [
        {
          path: "/rejected",
          element: <RejectedPage />,
        },
        { path: "/email-verification", element: <EmailVerification /> },
        {
          path: "/loan-application/current-status",
          element: <CurrentStatus />,
        },
        { path: "/loan-application", element: <LoanApplication /> },
        { path: "/loan-application/kyc", element: <Kyc /> },
        { path: "/loan-application/personal-info", element: <PersonalInfo /> },
        {
          path: "/loan-application/employment-info",
          element: <EmploymentInfo />,
        },
        {
          path: "/loan-application/bank-details",
          element: <BankDetails />,
        },
        { path: "/loan-application/selfie", element: <Selfie /> },
        {
          path: "/loan-application/address-verification",
          element: <AadhaarKycPage />,
        },
        {
          path: "/loan-application/review",
          element: <Review />,
        },
        { path: "/loans", element: <Loans /> },

        {
          path: "loan/:loanId/request",
          element: <LoanRequestPage />,
        },
        {
          path: "/profile",
          element: <ProfilePage />,
        },
        {
          path: "/profile/:profileId",
          element: <SpecificProfilePage />,
        },
      ],
    },
    {
      path: "*",
      element: <Navigate to="/phone-verification" replace />,
    },
  ]);
}
