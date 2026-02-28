import { useEffect } from "react";
import { LoanApplicationButton } from "../../common/LoanApplicationButton";
import OnBoardingStep from "../../common/onboardingStepPopup";
import { ApplicationPage } from "../../constant/redirect";
import { useAppDispatch, useAppSelector } from "../../redux/store";
import PhotoUploader from "./components/photoUploader";
import VideoUploader from "./components/videoUploader";
import { FaShieldAlt } from "react-icons/fa";
import { getPersonalDetails } from "../../services/api/user-details.api";
import { updateUserDetails } from "../../redux/slices/userDetails";

function PhotoAndVideoComponent() {
  const userData = useAppSelector((state) => state.user);
  const dispatch = useAppDispatch();
  const userDetails = useAppSelector((state) => state.userDetails);

  const brandConfig = useAppSelector((state) => state.index.brandConfig);

  // Initial data fetch
  useEffect(() => {
    async function fetchUserDetails() {
      try {
        const response = await getPersonalDetails(userData.user.userDetailsId);
        if (response) {
          dispatch(updateUserDetails(response));
        }
      } catch (error) {
        console.error("Failed to fetch user details:", error);
      }
    }

    if (userData.user.userDetailsId) {
      fetchUserDetails();
    }
  }, [userData.user.userDetailsId, dispatch]);

  const completedItems = [
    userDetails?.profilePicUrl,
    userDetails?.profileVideoUrl,
  ].filter(Boolean).length;

  const totalItems = 2;

  return (
    <div className="min-h-[calc(90vh-4rem)] md:min-h-[calc(90vh-6rem)] flex flex-col justify-between mb-20 md:mb-0">
      {/* Mobile Header */}
      <div className=" px-4 py-6 md:hidden">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center mx-auto mb-3">
            <FaShieldAlt className="text-primary text-2xl" />
          </div>
          <h1 className="text-xl font-bold text-on-surface mb-1">
            Identity Verification
          </h1>
          <p className="text-sm text-muted">
            Complete your photo and video verification
          </p>
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-on-primarymb-2">
              <span>Progress</span>
              <span>
                {completedItems} of {totalItems} completed
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* Content Container */}
      <div className="space-y-6 md:space-y-8">
        {/* Photo Upload Section */}
        {brandConfig.requiresUserPhoto && <PhotoUploader />}

        {/* Video Upload Section */}
        {brandConfig.requiresUserVideo && <VideoUploader />}

        {/* Completion Status - Mobile */}
        {completedItems === totalItems && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4 md:hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-lg">✅</span>
              </div>
              <div className="flex-1">
                <h3 className="text-green-900 font-semibold text-sm">
                  All Verification Complete!
                </h3>
                <p className="text-green-700 text-xs mt-0.5">
                  You can now proceed to the next step
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <LoanApplicationButton disabled={false} />
      <OnBoardingStep pageKey={ApplicationPage.LoanApplicationSelfie} />
    </div>
  );
}

export default PhotoAndVideoComponent;
