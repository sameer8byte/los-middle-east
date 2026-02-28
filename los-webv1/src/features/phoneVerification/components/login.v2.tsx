import { useState, useEffect, ChangeEvent, KeyboardEvent, useRef } from "react";
// import { sendSms } from "../../../services/api/auth.api";
import { useAppDispatch, useAppSelector } from "../../../redux/store";
import { updateAccessToken, updateUser } from "../../../redux/slices/user";
import { useDevice } from "../../../hooks/useDevice";
import { FaMobile } from "react-icons/fa";
import { PageIdToPageMap } from "../../../constant/redirect";
import { SecureEncryptedLabel } from "../../../common/ui/secureEncryptedLabel";
// import Dialog from "../../../common/dialog";
import {
  FiAlertCircle,
  FiChevronLeft,
  FiClock,
  FiRefreshCw,
} from "react-icons/fi";
import {
  trackLoginEvent,
  getUTMParameters,
  storeUTMParameters,
} from "../../../utils/utmTracking";
import authService from "../../../services/api/auth.service";
import { TermsAndConditions } from "./termsandConditions";

interface LoginV2Props {
  onSwitchToSignup?: () => void;
}

const LoginV2: React.FC<LoginV2Props> = ({ onSwitchToSignup }) => {
  const { postRegisterUserDevice } = useDevice();
  // const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const brand = useAppSelector((state) => state.index);
  const userData = useAppSelector((state) => state.user);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [step, setStep] = useState(1); // 1: Phone input, 2: OTP verification
  const [timer, setTimer] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Get and store UTM parameters
    const utmParams = getUTMParameters();
    storeUTMParameters(utmParams);
  }, []);
  // Format phone number as user types
  const handlePhoneChange = (e: { target: { value: string } }) => {
    const input = e.target.value.replace(/\D/g, "");
    setPhoneNumber(input);

    // Auto-show terms dialog when 10 digits are entered
    if (input.length === 10 && /^[6-9]\d{9}$/.test(input)) {
      // Only show dialog if terms haven't been accepted yet
      if (!termsAccepted) {
        // Add a small delay to make the transition feel more natural
        setTimeout(() => {
          setShowTermsDialog(true);
        }, 300);
      }
    }
  };

  const handleOtpChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value;
    if (/^\d*$/.test(value) && value.length <= 1) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
      if (error) setError("");
      if (value && index < 5) {
        otpRefs.current[index + 1]?.focus();
      }
      if (value && index === 5) {
        const completeOtp = [...otp.slice(0, 5), value].join("");
        if (completeOtp.length === 6) {
          handleOtpVerify(completeOtp);
        }
      }
    }
  };

  // Handle key events for OTP fields (backspace & delete)
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (
      (e.key === "Backspace" || e.key === "Delete") &&
      !otp[index] &&
      index > 0
    ) {
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste event for OTP
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").trim();
    if (/^\d+$/.test(pastedData) && pastedData.length <= 6) {
      const digits = pastedData.split("");
      const newOtp = [...otp];

      digits.forEach((digit, idx) => {
        if (idx < 6) newOtp[idx] = digit;
      });

      setOtp(newOtp);

      // Focus the next empty input or the last one if all are filled
      const nextEmptyIndex = newOtp.findIndex((val) => val === "");
      if (nextEmptyIndex !== -1) {
        otpRefs.current[nextEmptyIndex]?.focus();
      } else {
        otpRefs.current[5]?.focus();
        // Auto-verify when all digits are filled via paste
        if (newOtp.join("").length === 6) {
          handleOtpVerify(newOtp.join(""));
        }
      }
    }
  };
  // Handle phone verify button click
  const handlePhoneVerify = async () => {
    // Check if terms are accepted first
    if (!termsAccepted) {
      setError(
        "Please accept the Terms of Service and Privacy Policy to continue"
      );
      return;
    }

    // Different validation based on country code
    if (phoneNumber.replace(/\D/g, "").length < 6) {
      setError("Please enter a valid phone number");
      return;
    }

    if (!brand.id) {
      setError("Something went wrong! Please refresh and try again");
      return;
    }

    // add validation for phone number based on country code(+91 for India)
    // Assuming we are only dealing with Indian phone numbers for now
    const fullNumber = phoneNumber.replace(/\D/g, ""); // Remove non-digits

    // Validate: Must be a 10-digit number starting with 6, 7, 8, or 9
    if (!/^[6-9]\d{9}$/.test(fullNumber)) {
      setError("Please enter a valid Indian phone number");
      return;
    }
    setIsLoading(true);

    try {
      // Pass both country code and phone number
      const fullNumber = `+91${phoneNumber.replace(/\D/g, "")}`;
      const response = await authService.sendSmsOtp(fullNumber, brand.id);
      if (response) {
        dispatch(
          updateUser({
            ...response,
            signUpVersion: "V2",
          })
        );
        setError("");
        setStep(2);
        startTimer();
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch (err) {
      setError(
        (err as { message: string }).message ||
          "Failed to send verification code. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP verification
  const handleOtpVerify = async (otpValue = otp.join("")) => {
    if (otpValue.length !== 6) {
      setError("Please enter a valid 6-digit verification code");
      return;
    }
    setIsLoading(true);
    const deviceId = (await postRegisterUserDevice()) || "";
    try {
      const response = await authService.verifyOtp({
        otp: otpValue,
        type: "phone",
        brandId: brand.id,
        userId: userData.user.id,
        deviceId: deviceId,
      });
      if (response) {
        dispatch(updateUser(response.user));
        dispatch(updateAccessToken(response.accessToken));

        // Call UTM tracking using the new utility function
        try {
          await trackLoginEvent(response.user.id, response.user.brandId, "otp");
        } catch (utmError) {
          console.error("Error tracking login event:", utmError);
          // Don't block the flow if UTM tracking fails
        }

        // Track click ID if present
        const urlParams = new URLSearchParams(window.location.search);
        const clickid = urlParams.get("clickid") || "";
        if (clickid) {
          try {
            const trackUrl = `https://affiliates.adsplay.in/trackingcode_installs.php?clickid=${clickid}`;
            // Make a request to the tracking URL
            await fetch(trackUrl);
          } catch (trackingError) {
            console.error("Error tracking click ID:", trackingError);
            // Don't block the flow if click ID tracking fails
          }
        }

        if ((window as any)?.fbq) {
          (window as any).fbq("track", "SubmitApplication", {
            currency: "INR",
            value: "final_price_without_currency",
          });
        }
        window.location.href = PageIdToPageMap[response.onboardingStep] || "/";
      } else {
        setError("Invalid verification code. Please try again.");
        // Clear OTP fields on error
        setOtp(["", "", "", "", "", ""]);
        otpRefs.current[0]?.focus();
      }
    } catch (err) {
      setError(
        (err as { message: string }).message ||
          "Verification failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Timer for OTP expiration
  const startTimer = () => {
    setTimer(60);
    setIsTimerRunning(true);
  };

  useEffect(() => {
    let interval: number | undefined;
    if (isTimerRunning) {
      interval = window.setInterval(() => {
        setTimer((prevTimer) => {
          if (prevTimer <= 1) {
            clearInterval(interval);
            setIsTimerRunning(false);
            return 0;
          }
          return prevTimer - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Resend OTP
  const resendOtp = async () => {
    await handlePhoneVerify();
  };

  // Handle checkbox click - show dialog for checking, direct toggle for unchecking
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowTermsDialog(true);
  };

  // Handle terms acceptance
  const handleAcceptTerms = () => {
    setTermsAccepted(true);
    setShowTermsDialog(false);
    // Clear any existing errors when terms are accepted
    if (error) setError("");
  };

  // Handle terms decline
  const handleDeclineTerms = () => {
    setTermsAccepted(false);
    setShowTermsDialog(false);
  };

  // Handle phone verify with debouncing
  const handlePhoneVerifyClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return; // Prevent multiple clicks during loading

    await handlePhoneVerify();
  };

  // Handle OTP verify with debouncing
  const handleOtpVerifyClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return; // Prevent multiple clicks during loading

    await handleOtpVerify(otp.join(""));
  };

  return (
    <div>
      <TermsAndConditions
        showTermsDialog={showTermsDialog}
        setShowTermsDialog={setShowTermsDialog}
        handleAcceptTerms={handleAcceptTerms}
        handleDeclineTerms={handleDeclineTerms}
      />
      <div className="max-w-sm w-full mx-auto p-6 ">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <div className="bg-primary/10 p-3 rounded-full shadow-inner">
              <svg
                className="w-7 h-7 text-primary"
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
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900">
            {step === 1 ? "Welcome Back" : "Verify Your Identity"}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {step === 1
              ? "Enter your mobile number to continue"
              : "Enter the 6-digit code sent to your phone"}
          </p>
        </div>

        {/* Step 1: Phone Input */}
        {step === 1 ? (
          <div className="space-y-5">
            {/* Mobile Number */}
            <div>
              <label
                htmlFor="phone"
                className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide"
              >
                Mobile Number
              </label>
              <div className="flex items-center rounded-xl border border-gray-300 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden transition-all">
                <span className="px-4 py-2 text-sm font-medium bg-gray-50 text-gray-700 border-r border-gray-200">
                  +91
                </span>
                <input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    handlePhoneVerifyClick(e as unknown as React.MouseEvent)
                  }
                  placeholder="Enter 10-digit number"
                  maxLength={10}
                  className="flex-1 h-11 px-3 text-sm bg-transparent focus:outline-none placeholder-gray-400 text-gray-800"
                />
              </div>
              {error && (
                <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                  <FiAlertCircle className="w-3.5 h-3.5" /> {error}
                </p>
              )}
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2">
              <input
                checked={termsAccepted}
                type="checkbox"
                id="tnc"
                onClick={handleCheckboxClick}
                readOnly
                className="mt-1 w-4 h-4 accent-primary border-gray-300 rounded cursor-pointer"
              />
              <label
                htmlFor="tnc"
                className="text-xs text-gray-600 cursor-pointer leading-snug"
              >
                I accept the{" "}
                <a
                  href={brand.brandPolicyLinks.termsConditionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary font-medium hover:underline"
                >
                  Terms
                </a>{" "}
                and{" "}
                <a
                  href={brand.brandPolicyLinks.privacyPolicyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary font-medium hover:underline"
                >
                  Privacy Policy
                </a>
              </label>
            </div>

            {/* Continue Button */}
            <button
              onClick={handlePhoneVerifyClick}
              disabled={
                isLoading ||
                phoneNumber.replace(/\D/g, "").length !== 10 ||
                !/^[6-9]\d{9}$/.test(phoneNumber.replace(/\D/g, "")) ||
                !termsAccepted
              }
              className={`w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
                isLoading ||
                phoneNumber.replace(/\D/g, "").length !== 10 ||
                !/^[6-9]\d{9}$/.test(phoneNumber.replace(/\D/g, "")) ||
                !termsAccepted
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-primary text-white hover:bg-primary-hover shadow-md hover:shadow-lg"
              }`}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <FaMobile className="w-4 h-4" />
                  <span>Continue</span>
                </>
              )}
            </button>

            {/* Footer */}
            <p className="text-center text-xs text-gray-500 pt-4 border-t border-gray-200">
              Don’t have an account?{" "}
              <button
                onClick={onSwitchToSignup}
                className="text-primary font-semibold hover:underline"
              >
                Sign up
              </button>
            </p>
          </div>
        ) : (
          /* Step 2: OTP Verification */
          <div className="space-y-6">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Enter Code
            </label>
            <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    otpRefs.current[index] = el;
                  }}
                  type="text"
                  value={digit}
                  onChange={(e) => handleOtpChange(e, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="w-12 h-12 text-center text-lg font-bold border border-gray-300 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  maxLength={1}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              ))}
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <FiAlertCircle className="w-3.5 h-3.5" /> {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between text-xs">
              <button
                onClick={() => {
                  setStep(1);
                  setError("");
                  setOtp(["", "", "", "", "", ""]);
                }}
                className="text-primary hover:text-primary-hover font-semibold flex items-center gap-1"
              >
                <FiChevronLeft className="w-3.5 h-3.5" />
                Change Number
              </button>

              {timer > 0 ? (
                <div className="flex items-center text-gray-500 gap-1">
                  <FiClock className="w-3.5 h-3.5" />
                  {timer}s
                </div>
              ) : (
                <button
                  onClick={resendOtp}
                  disabled={isLoading}
                  className="text-primary hover:text-primary-hover font-semibold flex items-center gap-1 disabled:opacity-50"
                >
                  <FiRefreshCw className="w-3.5 h-3.5" />
                  Resend
                </button>
              )}
            </div>

            {/* Verify Button */}
            <button
              onClick={isLoading ? undefined : handleOtpVerifyClick}
              disabled={isLoading || otp.join("").length !== 6}
              className={`w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
                isLoading || otp.join("").length !== 6
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-primary text-white hover:bg-primary-hover shadow-md hover:shadow-lg"
              }`}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <span>Verifying...</span>
                </>
              ) : (
                "Verify Code"
              )}
            </button>
          </div>
        )}

        {/* Secure Label */}
        <div className="mt-6 text-center">
          <SecureEncryptedLabel />
        </div>
      </div>
    </div>
  );
};
export default LoginV2;
