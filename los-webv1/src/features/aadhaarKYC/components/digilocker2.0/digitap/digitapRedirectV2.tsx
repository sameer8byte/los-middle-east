import { useEffect, useState } from "react";
import { PageIdToPageMap } from "../../../../../constant/redirect";
import { useParams } from "react-router-dom";
import Dialog from "../../../../../common/dialog";
import { FiAlertTriangle, FiCheckCircle, FiLoader, FiLock } from "react-icons/fi";
import { digitapManualSync } from "../../../../../services/api/digilocker.api";
export function DigitapRedirectV2() {
  const {brandId, userId, onboardingStep } = useParams<{
    brandId: string;
    userId: string;
    onboardingStep: string;
  }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const verifyOTP = async () => {
    setLoading(true);
    setError("");
    setSuccess(false);

    if (!userId) {
      setError("User not found. Please log in again.");
      setLoading(false);
      return;
    }
    if(!brandId) {
      setError("Brand information missing. Please contact support.");
      setLoading(false);
      return;
    }

    try {
      await digitapManualSync(brandId, userId);

      setSuccess(true);

      // Delay redirect to show success state
      setTimeout(() => {
        if (Number(onboardingStep) === 12) {
          window.location.href = PageIdToPageMap[12];
        } else {
          window.location.href = PageIdToPageMap[Number(onboardingStep)]; // Redirect to the next step
        }
      }, 2000);
    } catch (err) {
      console.error("Error verifying Aadhaar:", err);
      setError(
        (err as Error).message ||
          (err as any).error ||
          "Failed to verify Aadhaar. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verifyOTP();
  }, []);

  return (
     <Dialog
      isOpen={true}
      onClose={() => {}}
      title="Aadhaar Verification"
      description="We're verifying your Aadhaar details to secure your account"
    >
      {/* Content */}
      <div className="space-y-6">
        {/* Loading */}
        {loading && (
          <div className="text-center py-8">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <FiLoader className="absolute inset-0 w-6 h-6 text-blue-600 animate-pulse m-auto" />
            </div>

            <p className="text-blue-600 font-medium">Verifying your Aadhaar...</p>
            <p className="text-gray-500 text-sm mt-2">This may take a few moments</p>
          </div>
        )}

        {/* Success */}
        {success && !loading && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiCheckCircle className="w-8 h-8 text-green-600" />
            </div>

            <h3 className="text-lg font-semibold text-green-600 mb-2">
              Verification Successful!
            </h3>

            <p className="text-gray-600 text-sm">
              Your Aadhaar has been verified successfully
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

        {/* Error */}
        {error && !loading && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiAlertTriangle className="w-8 h-8 text-red-600" />
            </div>

            <h3 className="text-lg font-semibold text-red-600 mb-2">
              Verification Failed
            </h3>
            <p className="text-gray-600 text-sm mb-4">{error}</p>

            <button
              onClick={verifyOTP}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded-lg transition duration-200 focus:ring-2 focus:ring-red-500"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Ready State */}
        {!loading && !success && !error && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiAlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>

            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Ready to Verify
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Click the button below to start the verification process
            </p>

            <button
              onClick={verifyOTP}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
            >
              Start Verification
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-100">
        <div className="flex items-center justify-center space-x-2 text-gray-500 text-xs">
          <FiLock className="w-4 h-4" />
          <span>Your data is secure and encrypted</span>
        </div>
      </div>
    </Dialog>
  );
}
