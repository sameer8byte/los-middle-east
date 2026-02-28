import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export function SignzyFailed() {
  const { brandId, userId } = useParams<{
    brandId: string;
    userId: string;
    onboardingStep: string;
  }>();

  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const errorMessage =
    "Aadhaar verification could not be completed via DigiLocker. This may be due to network issues or incomplete verification.";

  const handleRetry = () => {
    setLoading(true);
    // Redirect back to the Aadhaar KYC page to retry
    if (brandId && userId) {
      globalThis.window.location.href = `/onboard/${brandId}/2`;
    } else {
      navigate(-1);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Verification Failed
          </h2>
          <p className="text-gray-600 text-sm">
            We couldn't verify your Aadhaar at this moment
          </p>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Error Message */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              <div>
                <p className="text-red-700 font-medium text-sm">
                  Verification Unsuccessful
                </p>
                <p className="text-red-600 text-sm mt-1">{errorMessage}</p>
              </div>
            </div>
          </div>

          {/* Reasons */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <p className="text-gray-700 font-medium text-sm mb-3">
              This could happen due to:
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-1">•</span>
                <span>Network connectivity issues</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-1">•</span>
                <span>Incomplete Aadhaar verification in DigiLocker</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-1">•</span>
                <span>Your session may have expired</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-1">•</span>
                <span>Authorization was denied or cancelled</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <button
              onClick={handleRetry}
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              {loading ? "Redirecting..." : "Try Again"}
            </button>
            <button
              onClick={handleGoBack}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Go Back
            </button>
          </div>

          {/* Help Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-700 text-sm">
              <span className="font-medium">Need help?</span> If you continue to
              experience issues, please contact our support team or try an
              alternative verification method.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <div className="flex items-center justify-center space-x-2 text-gray-500 text-xs">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span>Your data is secure and encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
