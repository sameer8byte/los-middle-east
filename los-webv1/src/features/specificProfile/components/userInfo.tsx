import { useEffect, useState } from "react";
import { updateUserDetails } from "../../../redux/slices/userDetails";
import { useAppDispatch, useAppSelector } from "../../../redux/store";
import { getPersonalDetails } from "../../../services/api/user-details.api";
import { GenderEnum } from "../../../constant/enum";

export function UserInfo() {
  const dispatch = useAppDispatch();
  const userData = useAppSelector((state) => state.user);
  const userDetails = useAppSelector((state) => state.userDetails);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const abortController = new AbortController();
    let retryTimeout: NodeJS.Timeout;

    const fetchUserDetails = async (retryCount = 0) => {
      if (!userData.user.userDetailsId) return;

      setIsLoading(true);
      setError("");

      try {
        const response = await getPersonalDetails(userData.user.userDetailsId);

        if (response && response.firstName && response.dateOfBirth) {
          dispatch(updateUserDetails(response));
          setIsLoading(false);
        } else if (retryCount < 3) {
          // Exponential backoff: 2s, 4s, 8s
          const delay = 2000 * Math.pow(2, retryCount);
          retryTimeout = setTimeout(
            () => fetchUserDetails(retryCount + 1),
            delay,
          );
        } else {
          setError("Could not retrieve complete user information");
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Failed to fetch user details:", error);
        setError("Failed to load user information");
        setIsLoading(false);
      }
    };

    if (userData.user.userDetailsId) {
      fetchUserDetails();
    }

    return () => {
      abortController.abort();
      clearTimeout(retryTimeout);
    };
  }, [userData.user.userDetailsId, dispatch]);

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return "";
    // Format as +91 XXX XXX XXXX
    return `${phone}`.replace(/(\d{2})(\d{3})(\d{3})(\d{4})/, "$1 $2 $3 $4");
  };

  const renderUserIdBadge = () => {
    const shortId = userData.user.id?.split("-")[0]?.toUpperCase() || "";
    return shortId ? `#${shortId}` : "";
  };

  if (isLoading && !userDetails.firstName) {
    return (
      <div className="w-full bg-surface rounded-2xl shadow-lg p-6 space-y-6 flex justify-center items-center h-64">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 border-4 border-primary-light border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-muted">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full bg-white rounded-2xl shadow-lg p-6 space-y-6"
      aria-labelledby="user-profile-heading"
    >
      {error && (
        <div className="bg-error-light text-error p-3 rounded-brand text-sm mb-4">
          {error}
          <button
            onClick={() => window.location.reload()}
            className="ml-2 text-error-dark underline"
            aria-label="Retry loading profile"
          >
            Retry
          </button>
        </div>
      )}

      {/* Profile Header */}
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          {userDetails.profilePicUrl && (
            <img
              src={userDetails.profilePicUrl || "/assets/default-avatar.png"}
              alt={`${userDetails.firstName || "User "}'s profile`}
              className="w-32 h-32 rounded-full border-4 border-primary-light object-cover"
              onError={(e) => {
                e.currentTarget.src = "/assets/default-avatar.png";
              }}
            />
          )}
          {userData.user.isEmailVerified && userData.user.isPhoneVerified && (
            <span
              className="absolute bottom-0 right-0 bg-secondary p-1 rounded-full text-white"
              title="Fully verified account"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          )}
        </div>
        <div className="text-center">
          <h1
            id="user-profile-heading"
            className="text-2xl font-semibold text-gray-800"
          >
            {userDetails.firstName
              ? `${userDetails.gender === GenderEnum.MALE ? "Mr." : "Ms."} ${
                  userDetails.firstName +
                  // add middle name if available
                  (userDetails.middleName ? " " + userDetails.middleName : "") +
                  (userDetails.lastName ? " " + userDetails.lastName : "")
                }`
              : "Welcome User"}
          </h1>
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <div className="bg-surface text-on-surface p-4 rounded-brand">
          <p className="text-sm text-gray-500 mb-1">Contact Number</p>
          <p className="text-xl font-bold text-primary break-words">
            {formatPhoneNumber(userData.user.phoneNumber)}
          </p>
        </div>

        <div className="bg-surface text-on-surface p-4 rounded-brand">
          <p className="text-sm text-gray-500 mb-1">Email Address</p>
          <p className="text-xl font-bold text-primary break-words">
            {userData.user.email || "Not provided"}
          </p>
        </div>
      </div>

      {/* Verification Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-green-50 p-3 rounded-brand">
          <p className="text-sm text-gray-600">Phone Verification</p>
          <span
            className={`font-semibold flex items-center ${
              userData.user.isPhoneVerified
                ? "text-green-600"
                : "text-yellow-600"
            }`}
          >
            {userData.user.isPhoneVerified ? (
              <>
                Verified
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 ml-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </>
            ) : (
              <>
                Pending
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 ml-1 animate-pulse"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
              </>
            )}
          </span>
        </div>
        <div className="bg-green-50 p-3 rounded-brand">
          <p className="text-sm text-gray-600">Email Verification</p>
          <span
            className={`font-semibold flex items-center ${
              userData.user.isEmailVerified
                ? "text-green-600"
                : "text-yellow-600"
            }`}
          >
            {userData.user.isEmailVerified ? (
              <>
                Verified
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 ml-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </>
            ) : (
              <>
                Pending
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 ml-1 animate-pulse"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
              </>
            )}
          </span>
        </div>
      </div>

      {/* User ID */}
      <div className="text-center text-sm text-gray-500 pt-4 border-t border-muted">
        User ID: {renderUserIdBadge()}
      </div>
    </div>
  );
}
