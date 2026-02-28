import { useEffect } from "react";
import { LoanApplicationButton } from "../../common/LoanApplicationButton";
import OnBoardingStep from "../../common/onboardingStepPopup";
import { ApplicationPage } from "../../constant/redirect";
import { getAllAlternatePhoneNumbers } from "../../services/api/web.api";
import { useAppDispatch, useAppSelector } from "../../redux/store";
import { updateAlternatePhoneNumbers } from "../../redux/slices/alternatePhoneNumbers";
import { setLoading } from "../../redux/slices/aaConsentRequests";
import { updateUserDetails } from "../../redux/slices/userDetails";
import { getPersonalDetails } from "../../services/api/user-details.api";
import { InitiateDigilockerV2 } from "./components/kycVerification/initiateDigilocker.v2";

function AadhaarKYCComponent() {
  const user = useAppSelector((state) => state.user.user);
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!user) return;
    const alternatePhoneNumbers = async () => {
      try {
        const response = await getAllAlternatePhoneNumbers(user?.id || "");
        if (response) {
          dispatch(updateAlternatePhoneNumbers(response));
        }
      } catch (error) {
        console.error("Error getting all alternate phone numbers:", error);
        throw error;
      }
    };
    alternatePhoneNumbers();
  }, [dispatch, user]);

  // Fetch personal details
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const startTime = Date.now();
        const response = await getPersonalDetails(user.userDetailsId);
        const endTime = Date.now();

        // Ensure minimum 2.5s loading delay
        const timeElapsed = endTime - startTime;
        const remainingDelay = 2500 - timeElapsed;
        if (remainingDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingDelay));
        }

        if (response?.firstName) {
          dispatch(updateUserDetails(response));
        }
      } catch (error) {
        console.error("Failed to fetch user details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [user.userDetailsId, dispatch]);

  return (
    <div className="min-h-[calc(90vh-4rem)] md:min-h-[calc(90vh-6rem)] flex flex-col justify-between">
      <InitiateDigilockerV2 />
      <LoanApplicationButton disabled={false} />
      <OnBoardingStep
        pageKey={ApplicationPage.LoanApplicationAddressVerification}
      />
    </div>
  );
}
export default AadhaarKYCComponent;
