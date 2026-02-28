import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../redux/store";
import {
  ApplicationPage,
  PageIdToPageMap,
  PageRouteMap,
} from "../constant/redirect";
import { patchUpdateOnboardingStep } from "../services/api/user.api";
import { updateUserOnboardingStep } from "../redux/slices/user";
import { FiAlertTriangle, FiArrowLeft, FiArrowRight } from "react-icons/fi";
import { ImSpinner8 } from "react-icons/im";
import { useState, useEffect, useRef } from "react";
import { useGeolocation } from "../hooks/useGeoLocations";
import { useIPGeolocation } from "../hooks/useIPGeolocation";

type LoanApplicationButtonProps = {
  disabled: boolean;
  nextLabel?: React.ReactNode;
};

export const LoanApplicationButton = ({
  disabled,
  nextLabel = <span>Next</span>,
}: LoanApplicationButtonProps) => {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement | null>(null);
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user.user);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { latitude, longitude } = useGeolocation();
  const location = useIPGeolocation();
  // Auto-remove error message after 2 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [error]);

  const handlePrevious = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    navigate(PageRouteMap[ApplicationPage.LoanApplication]);
  };

  const onSubmit = async () => {
    if (disabled || isLoading) return;

    try {
      setError(null);
      setIsLoading(true);

      const response = await patchUpdateOnboardingStep(user.id, {
        latitude: latitude || 0,
        longitude: longitude || 0,
        ipJson: JSON.stringify(location),
      });

      if (response) {
        dispatch(updateUserOnboardingStep(response.onboardingStep));
        // Navigate to the next page based on the updated onboarding step
        window.location.href = PageIdToPageMap[response.onboardingStep];
      }
    } catch (err) {
      setError(
        (err as Error).message ||
          "Failed to update onboarding step. Please try again."
      );
      console.error("Onboarding step update failed:", err);
    } finally {
      setIsLoading(false);
    }
  };
  // Log the height of the ref element
  return (
    <div>
      <div style={{ height: ref.current?.offsetHeight || "4rem" }}></div>
      <div
        ref={ref}
        className="bg-white p-4 border-t border-gray-200 shadow-md fixed bottom-0 left-0 right-0 md:static md:p-0 md:pt-6 md:border-none md:shadow-none"
      >
        {error && (
          <div
            role="alert"
            className="flex items-center gap-3 p-4 mb-4 bg-red-50 border border-red-200 rounded-md"
          >
            <FiAlertTriangle
              className="flex-shrink-0 w-5 h-5 text-red-600"
              aria-hidden="true"
            />
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="flex flex-row  md:flex-row md:justify-between gap-3 w-full">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={isLoading}
            className="w-full md:w-36 py-3.5 border border-[var(--color-primary)] px-6  rounded-brand text-gray-700 font-medium
                 hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400
                 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white
                 transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <FiArrowLeft className="w-5 h-5" aria-hidden="true" />
            <span>Previous</span>
          </button>

          <button
            type="submit"
            onClick={onSubmit}
            disabled={disabled || isLoading}
            className="w-full md:w-36 py-3.5 px-6 rounded-brand font-medium flex items-center justify-center gap-2
                 text-on-primary bg-primary
                 hover:bg-primary-hover active:bg-primary-active
                 focus:outline-none focus:ring-2 focus:ring-primary-focus focus:ring-offset-2
                 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary
                 transition-colors duration-200"
          >
            {isLoading ? (
              <>
                <ImSpinner8
                  className="w-5 h-5 animate-spin"
                  aria-hidden="true"
                />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>{nextLabel}</span>
                <FiArrowRight className="w-5 h-5" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
