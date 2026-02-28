import Employment from "./components/employment";
// import SalarySlip from "./modules/salerySlip";
import { LoanApplicationButton } from "../../common/LoanApplicationButton";
import OnBoardingStep from "../../common/onboardingStepPopup";
import { ApplicationPage } from "../../constant/redirect";
import { useAppDispatch, useAppSelector } from "../../redux/store";
import { useEffect, useState } from "react";
import { getEmployment } from "../../services/api/employment.api";
import { updateEmployment } from "../../redux/slices/employment";

function EmploymentInfoComponent() {
  const dispatch = useAppDispatch();
  const userData = useAppSelector((state) => state.user);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const startTime = Date.now();
        const response = await getEmployment(userData.user.employmentId);
        const endTime = Date.now();

        // Ensure minimum 3-second loading
        const timeElapsed = endTime - startTime;
        const remainingDelay = 2500 - timeElapsed;

        if (remainingDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingDelay));
        }

        if (response) {
          dispatch(updateEmployment(response));
        }
      } catch (error) {
        console.error("Failed to fetch user details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [userData.user.employmentId, dispatch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen gap-4 text-primary font-brand">
        <div
          className="w-8 h-8 rounded-full border-4 border-primary-light border-t-primary animate-spin"
          style={{ borderTopColor: "var(--color-primary)" }}
        />
        <div>Loading your information...</div>
      </div>
    );
  }
  return (
    <div className="min-h-[calc(90vh-4rem)] md:min-h-[calc(90vh-6rem)] flex flex-col justify-between">
      <Employment />
      {/* <SalarySlip /> */}
      <LoanApplicationButton disabled={false} />
      <OnBoardingStep pageKey={ApplicationPage.LoanApplicationEmploymentInfo} />
    </div>
  );
}
export default EmploymentInfoComponent;
