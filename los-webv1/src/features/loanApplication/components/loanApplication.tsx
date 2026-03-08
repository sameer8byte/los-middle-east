import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../redux/store";
import {
  ApplicationPage,
  getIdFromPage,
  getPageFromId,
  PageRouteMap,
} from "../../../constant/redirect";
import { patchUpdateOnboardingStep } from "../../../services/api/user.api";
import { updateUserOnboardingStep } from "../../../redux/slices/user";
import { FiCheck, FiLock } from "react-icons/fi";
import { useGeolocation } from "../../../hooks/useGeoLocations";
import { useIPGeolocation } from "../../../hooks/useIPGeolocation";

const LoanApplication = () => {
  const userData = useAppSelector((state) => state.user);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { latitude, longitude } = useGeolocation();
  const pathname = window.location.pathname;
  const isLoanApplicationPage = pathname === "/loan-application";
  const location = useIPGeolocation();
  // --- Get domain and theme ---
  const fullDomain = window.location.hostname.replace("www.", "");
  const baseDomain = fullDomain.split(".").slice(-2).join(".");
  // const isLocalhost = fullDomain.includes("localhost");

  // const isQualoan = baseDomain === "qualoan.com";
  // const isMinutesLoan = baseDomain === "minutesloan.com";
  // const isPaisapop = baseDomain === "paisapop.com";
  // const isZeptoFinance = baseDomain === "zeptofinance.com";
  // const isSalary4Sure = baseDomain === "salary4sure.com";
  const isFastsalary = baseDomain === "fastsalary.com";

  // Define steps
  let steps = [
    {
      title: "Current Status",
      page: ApplicationPage.CurrentStatus,
      icon: <FiCheck />,
      description: "Select your current employment or student status",
      isActive: true,
    },
    {
      title: "PAN Verification",
      page: ApplicationPage.LoanApplicationKyc,
      icon: <FiCheck />,
      description: "Verify your identity using your PAN card",
      isActive: true,
    },
    {
      title: "Personal Information",
      page: ApplicationPage.LoanApplicationPersonalInfo,
      icon: <FiCheck />,
      description: "Enter your personal details",
      isActive: true,
    },

    {
      title: "Bank Details",
      page: ApplicationPage.LoanApplicationBankDetails,
      icon: <FiCheck />,
      description: "Enter your bank account information",
      isActive: true,
    },
    {
      title: "Employment Info",
      page: ApplicationPage.LoanApplicationEmploymentInfo,
      icon: <FiCheck />,
      description: "Provide your employment details",
      isActive: true,
    },
    {
      title: "Selfie Verification",
      page: ApplicationPage.LoanApplicationSelfie,
      icon: <FiCheck />,
      description: "Take and upload a live selfie for verification",
      isActive: true,
    },
    {
      title: "CPR Card KYC",
      page: ApplicationPage.LoanApplicationAddressVerification,
      icon: <FiCheck />,
      description: "Verify your identity using your CPR (Central Population Register) Card",
      isActive: true,
    },
  ];
  if (isFastsalary) {
    steps = steps.filter(
      (step) =>
        step.page !== ApplicationPage.LoanApplicationSelfie &&
        step.page !== ApplicationPage.LoanApplicationPersonalInfo &&
        step.page !== ApplicationPage.CurrentStatus &&
        step.page !== ApplicationPage.LoanApplicationKyc &&
        step.page !== ApplicationPage.LoanApplicationEmploymentInfo
    );
  }

  const currentStep = userData.user.onboardingStep;
  const completedSteps = steps.filter(
    (step) => currentStep > getIdFromPage(step.page)
  ).length;
  const progress = (completedSteps / steps.length) * 100;

  const handleStart = async () => {
    const firstStepId = getIdFromPage(ApplicationPage.CurrentStatus);
    if (currentStep >= firstStepId) {
      const nextStep = getPageFromId(currentStep);
      navigate(PageRouteMap[nextStep]);
    } else {
      navigate(PageRouteMap[ApplicationPage.CurrentStatus]);
      const response = await patchUpdateOnboardingStep(userData.user.id, {
        latitude: latitude || 0,
        longitude: longitude || 0,
        ipJson: JSON.stringify(location),
      });
      dispatch(updateUserOnboardingStep(response.onboardingStep));
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-on-surface mb-2">
          Loan Application
        </h1>
        <p className="text-muted">
          Complete <span className="font-semibold">{steps.length}</span> simple
          steps to get your loan
        </p>

        {/* Progress Bar */}
        <div className="mt-6 relative bg-muted rounded-full h-3">
          <div
            className="absolute top-0 left-0 bg-primary h-3 rounded-full transition-all duration-500 ease-in-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 text-sm text-muted">
          <span className="font-semibold">{completedSteps}</span> of{" "}
          {steps.length} steps completed
        </div>
      </div>
      {/* Action Button */}
      {isLoanApplicationPage && (
        <div className="mb-8">
          <button
            onClick={handleStart}
            className="w-full bg-primary text-on-primary py-3 rounded-lg font-medium hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition"
          >
            {completedSteps > 0 ? "Continue Application" : "Start Application"}
          </button>
        </div>
      )}
      {/* Step List */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const stepId = getIdFromPage(step.page);
          const isCompleted = currentStep > stepId;
          const isCurrent = currentStep === stepId;
          const isLocked = currentStep < stepId;

          const getStepIcon = () => {
            if (isLocked) return <FiLock />;
            if (isCompleted) return <FiCheck />;
            return index + 1;
          };

          return (
            <div
              key={step.title}
              className={`p-4 rounded-lg shadow-md transition duration-200 flex items-center gap-4
            ${
              isCurrent
                ? "border-2 border-primary bg-blue-50 text-primary"
                : "border border-muted bg-white text-on-surface"
            }
            ${
              isLocked
                ? "opacity-50 pointer-events-none"
                : "cursor-pointer hover:shadow-lg"
            }
          `}
            >
              <div
                className={`w-10 h-10 flex items-center justify-center rounded-full font-semibold text-lg
              ${
                isCompleted
                  ? "bg-green-500 text-white"
                  : isCurrent
                  ? "bg-primary text-white"
                  : "bg-gray-200 text-gray-500"
              }
            `}
              >
                {getStepIcon()}
              </div>

              <div className="flex-1">
                <h3 className="font-medium text-lg">{step.title}</h3>
                <p className="text-sm text-muted">{step.description}</p>
              </div>

              {/* Lock icon on right if locked */}
              {isLocked && <FiLock className="text-gray-400" />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LoanApplication;
