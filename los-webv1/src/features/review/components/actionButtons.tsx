import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../redux/store";
import { getDownloadReviewPdf } from "../../../services/api/web.api";
import { patchUpdateOnboardingStep } from "../../../services/api/user.api";
import { updateUserOnboardingStep } from "../../../redux/slices/user";
import { useNavigate } from "react-router-dom";
import { PageIdToPageMap } from "../../../constant/redirect";
import { FiDownload, FiCheck, FiArrowRight } from "react-icons/fi";
import { useGeolocation } from "../../../hooks/useGeoLocations";
import { useIPGeolocation } from "../../../hooks/useIPGeolocation";

export function ActionButtons() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const userData = useAppSelector((state) => state.user);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { latitude, longitude } = useGeolocation();
  const location = useIPGeolocation();

  const handleSubmit = async () => {
    if (!userData.user) return;

    try {
      setIsSubmitting(true);
      const response = await patchUpdateOnboardingStep(
        userData.user.id,
       {
          latitude: latitude||0,
          longitude: longitude||0,
          ipJson: JSON.stringify(location),
       }
      );

      if (response) {
        dispatch(updateUserOnboardingStep(response.onboardingStep));
        navigate(PageIdToPageMap[response.onboardingStep]);
      }
    } catch (err) {
      console.error("Onboarding step update failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const response = await getDownloadReviewPdf(userData.user.id);

      if (response) {
        const link = document.createElement("a");
        link.target = "_blank";
        link.href = response.url;
        link.setAttribute("download", "review.pdf");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="">
   
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Download Button */}
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex-1 group relative overflow-hidden bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-6 py-4 transition-all duration-300 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center justify-center gap-3">
            {isDownloading ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <FiDownload className="w-5 h-5 text-gray-600 group-hover:text-gray-800 transition-colors" />
            )}
            <span className="font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
              {isDownloading ? "Downloading..." : "Download PDF"}
            </span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 -skew-x-12 translate-x-full group-hover:translate-x-[-200%]"></div>
        </button>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 group relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-6 py-4 transition-all duration-300 hover:shadow-lg transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <div className="flex items-center justify-center gap-3">
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <FiCheck className="w-5 h-5" />
                <span className="font-semibold">Submit Application</span>
                <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 -skew-x-12 translate-x-full group-hover:translate-x-[-200%]"></div>
        </button>
      </div>

      {/* Footer Note */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          By submitting, you agree to our terms and conditions
        </p>
      </div>
    </div>
  );
}