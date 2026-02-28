import { useEffect } from "react";
import { getDocumentReview } from "../../services/api/web.api";
import { useAppDispatch, useAppSelector } from "../../redux/store";
import { Profile } from "./components/profile";
import { Documents } from "./components/documents";
import { UserBankAccount } from "./components/userBankAccount";
import { ActionButtons } from "./components/actionButtons";
import { updateUserDetails } from "../../redux/slices/userDetails";
import { updateEmployment } from "../../redux/slices/employment";
import { updateDocuments } from "../../redux/slices/documents";
import { updateUserBankAccount } from "../../redux/slices/bankAccount";
import { Employment } from "./components/employment";
import OnBoardingStep from "../../common/onboardingStepPopup";
import { ApplicationPage } from "../../constant/redirect";

export function ReviewComponent() {
  // getDocumentReview
  const userData = useAppSelector((state) => state.user);
  const dispatch = useAppDispatch();

  // Initial data fetch
  useEffect(() => {
    async function fetchUserDetails() {
      try {
        const response = await getDocumentReview(userData.user.id);
        if (response) {
          dispatch(updateUserDetails(response.userDetails));
          dispatch(updateEmployment(response.employment));
          dispatch(updateDocuments(response.documents));
          dispatch(updateUserBankAccount(response.user_bank_account));
        }
      } catch (error) {
        console.error("Failed to fetch user details:", error);
      }
    }

    if (userData.user.id) {
      fetchUserDetails();
    }
  }, [userData.user.id, dispatch]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header Section */}
      <div className=" top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-200/50">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Application Review
              </h1>
              <p className="text-gray-600 mt-1">
                Please review your information before submitting
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Ready to submit</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Progress Indicator */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Application Progress</h3>
            <span className="text-sm text-green-600 font-medium">
              100% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full w-full transition-all duration-500"></div>
          </div>
          <div className="flex justify-between mt-3 text-xs text-gray-500">
            <span>Personal Info</span>
            <span>Documents</span>
            <span>Employment</span>
            <span>Bank Details</span>
          </div>
        </div>

        {/* Review Cards Grid */}
        <div className="grid grid-cols-1 gap-6">
          <Profile />
          <Documents />
          <Employment />
          <UserBankAccount />
        </div>

        {/* Action Buttons */}
        <ActionButtons />
      </div>

      <OnBoardingStep pageKey={ApplicationPage.LoanApplicationReview} />
    </div>
  );
}
