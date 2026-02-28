import { useEffect, useState } from "react";
import { LoanApplicationButton } from "../../common/LoanApplicationButton";
import OnBoardingStep from "../../common/onboardingStepPopup";
import { ApplicationPage } from "../../constant/redirect";
import { useAppDispatch, useAppSelector } from "../../redux/store";
import { Alternate } from "./components/alternateAddress";
import {
  getPersonalDetails,
  getUserGeoTags,
} from "../../services/api/user-details.api";
import { updateUserDetails } from "../../redux/slices/userDetails";
import { updateUserGeoLocation } from "../../redux/slices/userGeoLocation";
import UserDetails from "./components/userDetails";
import PrimaryAddressDocument from "./components/primaryAddressDocument";

function PersonalInfoComponent() {
  const userData = useAppSelector((state) => state.user);
  const userGeoLocation = useAppSelector((state) => state.userGeoLocation);
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);
  const userDetails = useAppSelector((state) => state.userDetails);

  // Fetch personal details
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const startTime = Date.now();
        const response = await getPersonalDetails(userData.user.userDetailsId);
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
  }, [userData.user.userDetailsId, dispatch]);

  // Fetch user geo tags
  useEffect(() => {
    const fetchGeoTags = async () => {
      try {
        const response = await getUserGeoTags(userData.user.id);
        if (response) {
          dispatch(updateUserGeoLocation(response));
        } else {
          console.error("Failed to fetch geo tags");
        }
      } catch (error) {
        console.error("Error fetching geo tags:", error);
      }
    };

    fetchGeoTags();
  }, [userData.user.id, dispatch]);

  // Loading state
  if (loading || !userDetails.firstName || !userDetails.dateOfBirth) {
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

  // Compare first 5 digits of userDetails.pincode and userGeoLocation.postalCode
  const pinMismatch =
    userDetails?.pincode?.substring(0, 5) !==
    userGeoLocation?.postalCode?.substring(0, 5);

  return (
    <div>
      <UserDetails />
      {pinMismatch && <PrimaryAddressDocument />}
      <Alternate />
      <LoanApplicationButton disabled={false} />
      <OnBoardingStep pageKey={ApplicationPage.LoanApplicationPersonalInfo} />
    </div>
  );
}

export default PersonalInfoComponent;
