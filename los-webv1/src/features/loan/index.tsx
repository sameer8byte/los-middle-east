import { useEffect, useState } from "react";
import OnBoardingStep from "../../common/onboardingStepPopup";
import { ApplicationPage } from "../../constant/redirect";
import { useAppDispatch, useAppSelector } from "../../redux/store";
import { UnderReview } from "./components/underReview";
import { getUserLoansCredibility } from "../../services/api/loans.api";
import { updateLoanRulesData } from "../../redux/slices/loanCredibility";
import AmountTenureSelector from "./components/loans";
import { NotAllowed } from "./components/notAllowed";

export function LoanComponent() {
  const dispatch = useAppDispatch();
  const userData = useAppSelector((state) => state.user);
  const loanCredibility = useAppSelector((state) => state.loanCredibility);

  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (userData.user.id) {
    // Handle the case when ruleType is not available
    // You can show a message or redirect the user
    const getLoans = async () => {
      try {
        const response = await getUserLoansCredibility(userData.user.id);
        if (response) {
          dispatch(updateLoanRulesData(response));
        }
      } catch (error) {
        console.error("Error fetching user loans credibility:", error);
      } finally {
        setLoading(true);
      }
      };
      getLoans();
    };
  }, [dispatch]);
  if (!loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }
  // Check if the user is under review
  return (
    <div className="min-h-[calc(90vh-4rem)] md:min-h-[calc(90vh-6rem)] flex flex-col justify-between">
      <div>
        {loanCredibility.isAllowed ? (
          <div>
            {!userData.user.id && <UnderReview />} 
            <AmountTenureSelector />
          </div>
        ) : (
          <NotAllowed />
        )}
      </div>

      <OnBoardingStep pageKey={ApplicationPage.LoanApplicationSubmit} />
    </div>
  );
}
