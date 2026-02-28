import { LoanApplicationButton } from "../../common/LoanApplicationButton";
import OnBoardingStep from "../../common/onboardingStepPopup";
import { ApplicationPage } from "../../constant/redirect";
import KYCVerification from "./components/kycVerification";

function KycComponent() {
  return (
    <div className="min-h-[calc(90vh-4rem)] md:min-h-[calc(90vh-6rem)] flex flex-col justify-between">
      <KYCVerification />
      <LoanApplicationButton disabled={false} nextLabel={"Next"} />
      <OnBoardingStep pageKey={ApplicationPage.LoanApplicationKyc} />
    </div>
  );
}
export default KycComponent;
