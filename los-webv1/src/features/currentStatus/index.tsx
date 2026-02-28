import { LoanApplicationButton } from "../../common/LoanApplicationButton";
import OnBoardingStep from "../../common/onboardingStepPopup";
import QuaLoanPixel from "../../common/QuaLoanPixel";
import { ApplicationPage } from "../../constant/redirect";
import CurrentStatus from "./components/currentStatus";

function CurrentStatusComponent() {
  return (
    <div className="min-h-[calc(90vh-4rem)] md:min-h-[calc(90vh-6rem)] flex flex-col justify-between">
      <CurrentStatus />
      <QuaLoanPixel />
      <OnBoardingStep pageKey={ApplicationPage.CurrentStatus} />
      <LoanApplicationButton disabled={false} />
    </div>
  );
}
export default CurrentStatusComponent;
