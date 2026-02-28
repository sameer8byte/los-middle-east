import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageIdToPageMap } from "../../../../../constant/redirect";
import { signzyManualSync } from "../../../../../services/api/digilocker.api";

/**
 * Signzy DigiLocker Redirect Component
 * Handles the redirect after user completes DigiLocker verification on Signzy
 * Updates the Aadhaar document status and proceeds to next step
 */
export function SignzyRedirect() {
  const { brandId, userId, onboardingStep } = useParams<{
    brandId: string;
    userId: string;
    onboardingStep: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("Processing your Aadhaar verification...");

  useEffect(() => {
    handleRedirect();
  }, [userId, brandId]);

  const handleRedirect = async () => {
    setLoading(true);
    setError("");
    setSuccess(false);

    if (!userId || !brandId) {
      setError("Required parameters missing. Please start over.");
      setLoading(false);
      return;
    }

    try {
      setMessage("Verifying your Aadhaar details...");

      // Call the manual sync API service
      await signzyManualSync(brandId, userId);

      setMessage("Aadhaar verification completed successfully!");
      setSuccess(true);

      // Delay redirect to show success state
      setTimeout(() => {
        const nextStep = Number(onboardingStep) || 12;
        const redirectUrl = PageIdToPageMap[nextStep];

        if (redirectUrl) {
          globalThis.window.location.href = redirectUrl;
        } else {
          globalThis.window.location.href = "/";
        }
      }, 2000);
    } catch (err) {
      console.error("Error processing Signzy redirect:", err);
      setError(
        (err as Error).message ||
          (err as any).error ||
          "Failed to process your verification. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Aadhaar Verification
          </h2>
          <p className="text-gray-600 text-sm">
            Signzy DigiLocker Verification
          </p>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {loading && (
            <div className="text-center py-8">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-blue-600 rounded-full animate-pulse"></div>
                </div>
              </div>
              <p className="text-blue-600 font-medium">{message}</p>
              <p className="text-gray-500 text-sm mt-2">
                This may take a few moments
              </p>
            </div>
          )}

          {success && !loading && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-green-600 mb-2">
                Verification Successful!
              </h3>
              <p className="text-gray-600 text-sm">
                Your Aadhaar has been verified successfully through Signzy
              </p>
              <div className="mt-4 flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-green-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-green-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
              <p className="text-gray-500 text-xs mt-2">
                Redirecting you to the next step...
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-red-600 mb-2">
                Verification Failed
              </h3>
              <p className="text-gray-600 text-sm mb-4">{error}</p>
              <button
                onClick={handleRedirect}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Try Again
              </button>
            </div>
          )}
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
