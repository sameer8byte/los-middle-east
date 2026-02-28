import { useState, useEffect, ChangeEvent, KeyboardEvent, useRef } from "react";
import { sendSms, verifyOtp } from "../../../services/api/auth.api";
import { useAppDispatch, useAppSelector } from "../../../redux/store";
import { updateAccessToken, updateUser } from "../../../redux/slices/user";
import { useDevice } from "../../../hooks/useDevice";
import { FaMobile } from "react-icons/fa";
import { PageIdToPageMap } from "../../../constant/redirect";
import { SecureEncryptedLabel } from "../../../common/ui/secureEncryptedLabel";
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
import { TermsAndConditions } from "./termsandConditions";

export default function PhoneVerification() {
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
    const utmParams = getUTMParameters();
    storeUTMParameters(utmParams);
  }, []);

  const handlePhoneChange = (e: { target: { value: string } }) => {
    const input = e.target.value.replace(/\D/g, "");
    setPhoneNumber(input);

    if (input.length === 10 && /^[6-9]\d{9}$/.test(input)) {
      if (!termsAccepted) {
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
        if (newOtp.join("").length === 6) {
          handleOtpVerify(newOtp.join(""));
        }
      }
    }
  };

  const handlePhoneVerify = async () => {
    if (!termsAccepted) {
      setError(
        "Please accept the Terms of Service and Privacy Policy to continue"
      );
      return;
    }

    if (phoneNumber.replace(/\D/g, "").length < 6) {
      setError("Please enter a valid phone number");
      return;
    }

    if (!brand.id) {
      setError("Something went wrong! Please refresh and try again");
      return;
    }

    const fullNumber = phoneNumber.replace(/\D/g, ""); // Remove non-digits

    if (!/^[6-9]\d{9}$/.test(fullNumber)) {
      setError("Please enter a valid Indian phone number");
      return;
    }
    setIsLoading(true);

    try {
      const fullNumber = `+91${phoneNumber.replace(/\D/g, "")}`;
      const response = await sendSms(fullNumber, brand.id);
      if (response) {
        dispatch(
          updateUser({
            ...response.user,
            signUpVersion: "V1",
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

  const handleOtpVerify = async (otpValue = otp.join("")) => {
    if (otpValue.length !== 6) {
      setError("Please enter a valid 6-digit verification code");
      return;
    }
    setIsLoading(true);
    const deviceId = (await postRegisterUserDevice()) || "";
    try {
      const response = await verifyOtp(
        otpValue,
        brand.id,
        userData.user.id,
        "phone",
        deviceId
      );
      if (response) {
        dispatch(updateUser(response.user));
        dispatch(updateAccessToken(response.accessToken));

        try {
          await trackLoginEvent(response.user.id, response.user.brandId, "otp");
        } catch (utmError) {
          console.error("Error tracking login event:", utmError);
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

  const resendOtp = async () => {
    await handlePhoneVerify();
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowTermsDialog(true);
  };

  const handleLabelClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowTermsDialog(true);
  };

  const handleAcceptTerms = () => {
    setTermsAccepted(true);
    setShowTermsDialog(false);
    if (error) setError("");
  };

  const handleDeclineTerms = () => {
    setTermsAccepted(false);
    setShowTermsDialog(false);
  };

  const handlePhoneVerifyClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return;

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
    <>
      <TermsAndConditions
        showTermsDialog={showTermsDialog}
        setShowTermsDialog={setShowTermsDialog}
        handleAcceptTerms={handleAcceptTerms}
        handleDeclineTerms={handleDeclineTerms}
      />
      <div className="px-0 sm:px-6 p-4   md:p-8">
        <div className="text-center  mb-2">
          <div className="mb-6 hidden md:flex  justify-center">
            <div className="bg-primary-light p-4  rounded-full">
              <svg
                className="w-8 h-8 text-primary"
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

          <div className="mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl font-semibold text-primary text-center">
              {step === 1
                ? "Get Started with your Personal Loan Application"
                : "Verify Your Identity"}
            </h2>
            <p className="text-sm text-on-surface-muted text-center mt-2">
              {step === 1
                ? "Enter your mobile number to begin your loan application"
                : "Enter the 6-digit code sent to your phone"}
            </p>
          </div>
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            {/* Phone Input */}
            <div className="space-y-3">
              <label
                htmlFor="phone"
                className="block text-center text-sm font-medium text-secondary"
              >
                Mobile Number
                <span className="block text-xs text-on-surface-muted mt-1">
                  (Aadhaar linked phone number only)
                </span>
              </label>

              <div className="flex items-center max-w-md mx-auto">
                <div className="flex items-center h-12 px-4 bg-surface-variant border border-r-0 border-outline rounded-l-lg">
                  <span className="text-on-surface font-medium">+91</span>
                </div>

                <input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      // Only allow sending OTP if terms are accepted and phone number is valid
                      if (
                        termsAccepted &&
                        phoneNumber.length === 10 &&
                        /^[6-9]\d{9}$/.test(phoneNumber)
                      ) {
                        handlePhoneVerify();
                      } else if (!termsAccepted) {
                        setError(
                          "Please accept the Terms of Service and Privacy Policy to continue"
                        );
                      } else {
                        setError("Please enter a valid 10-digit phone number");
                      }
                    }
                  }}
                  placeholder="Enter 10-digit phone number"
                  className={`flex-1 h-12 px-4 py-3 border rounded-r-lg focus:ring-2 focus:ring-primary-focus focus:border-primary placeholder-on-surface-muted text-on-surface transition-all duration-200 ${
                    phoneNumber.length === 10 &&
                    /^[6-9]\d{9}$/.test(phoneNumber)
                      ? "border-success bg-success/5"
                      : "border-outline"
                  }`}
                  maxLength={10}
                />
              </div>

              <p className="text-xs text-center text-on-surface-muted">
                We'll send a verification code to your number
              </p>

              {/* Show validation feedback */}
              {phoneNumber.length === 10 &&
                /^[6-9]\d{9}$/.test(phoneNumber) && (
                  <div className="mt-2 p-2 bg-success/10 border border-success/20 rounded-lg text-sm text-success flex items-center justify-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Valid phone number entered</span>
                  </div>
                )}

              {error && (
                <div className="mt-2 p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error flex items-center justify-center gap-2">
                  <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Terms */}
            <div className="flex mt-6 items-start gap-3 max-w-md mx-auto">
              <input
                checked={termsAccepted}
                type="checkbox"
                id="nbfc-tnc"
                onClick={handleCheckboxClick}
                readOnly
                className="mt-0.5 w-4 h-4 accent-[var(--color-primary)] border-outline rounded focus:ring-primary-focus cursor-pointer flex-shrink-0"
              />

              <div
                className="text-sm text-on-surface cursor-pointer"
                onClick={handleLabelClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleLabelClick(e as any);
                  }
                }}
              >
                I accept the{" "}
                <a
                  href={brand.brandPolicyLinks.termsConditionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:text-primary-hover"
                  onClick={(e) => e.stopPropagation()}
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href={brand.brandPolicyLinks.privacyPolicyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:text-primary-hover"
                  onClick={(e) => e.stopPropagation()}
                >
                  Privacy Policy
                </a>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handlePhoneVerifyClick}
              disabled={
                isLoading ||
                phoneNumber.replace(/\D/g, "").length !== 10 ||
                !/^[6-9]\d{9}$/.test(phoneNumber.replace(/\D/g, "")) ||
                !termsAccepted
              }
              className={`w-full max-w-md mx-auto mt-6 p-3 h-12 rounded-brand font-medium text-base transition-all duration-200 flex items-center justify-center ${
                isLoading ||
                phoneNumber.replace(/\D/g, "").length !== 10 ||
                !/^[6-9]\d{9}$/.test(phoneNumber.replace(/\D/g, "")) ||
                !termsAccepted
                  ? "bg-gray-300 cursor-not-allowed text-gray-500"
                  : "bg-primary hover:bg-primary-hover text-on-primary shadow-lg hover:shadow-xl"
              }`}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-5 w-5 text-on-primary"
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
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Sending...
                </span>
              ) : (
                <>
                  <FaMobile className="mr-2" />
                  <span>Send Verification Code</span>
                </>
              )}
            </button>

            {/* Helper text for disabled button */}
            {(phoneNumber.replace(/\D/g, "").length !== 10 ||
              !/^[6-9]\d{9}$/.test(phoneNumber.replace(/\D/g, "")) ||
              !termsAccepted) &&
              !isLoading && (
                <div className="text-center max-w-md mx-auto">
                  <p className="text-xs text-on-surface-muted mt-2">
                    {!termsAccepted && "Please accept the terms and conditions"}
                    {termsAccepted &&
                      phoneNumber.replace(/\D/g, "").length !== 10 &&
                      "Please enter a complete 10-digit phone number"}
                    {termsAccepted &&
                      phoneNumber.length === 10 &&
                      !/^[6-9]\d{9}$/.test(phoneNumber.replace(/\D/g, "")) &&
                      "Please enter a valid Indian phone number (6-9 followed by 9 digits)"}
                  </p>
                </div>
              )}
          </div>
        ) : (
          <div className="space-y-6 max-w-md mx-auto">
            {/* OTP Section */}
            <div>
              <div className="block text-sm font-medium text-on-surface mb-4 text-center">
                Verification Code (OTP)
              </div>
              <div
                className="flex justify-center gap-2 md:gap-3"
                onPaste={handleOtpPaste}
              >
                {otp.map((digit, index) => (
                  <input
                    key={`otp-${index}`}
                    ref={(el) => {
                      otpRefs.current[index] = el;
                    }}
                    type="text"
                    value={digit}
                    onChange={(e) => handleOtpChange(e, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className="w-11 h-12 md:w-12 md:h-14 text-center text-xl md:text-2xl font-semibold border-2 border-outline rounded-brand focus:ring-2 focus:ring-primary-focus focus:border-primary transition-all caret-transparent"
                    maxLength={1}
                    autoFocus={index === 0}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                ))}
              </div>
              {error && (
                <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error flex items-center justify-center gap-2">
                  <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* OTP Actions */}
            <div className="flex flex-col sm:flex-row sm:justify-between items-center text-sm space-y-3 sm:space-y-0 px-2">
              <button
                onClick={() => {
                  setStep(1);
                  setError("");
                  setOtp(["", "", "", "", "", ""]);
                }}
                className="flex items-center text-primary hover:text-primary-hover transition-colors font-medium"
              >
                <FiChevronLeft className="mr-1.5" />
                Change Number
              </button>

              {timer > 0 ? (
                <div className="flex items-center text-on-surface-muted">
                  <FiClock className="mr-1.5" />
                  Resend code in {timer}s
                </div>
              ) : (
                <button
                  onClick={resendOtp}
                  disabled={isLoading}
                  className="flex items-center text-primary hover:text-primary-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiRefreshCw className="mr-1.5" />
                  Resend Code
                </button>
              )}
            </div>

            {/* Verify OTP Button */}
            <button
              onClick={isLoading ? undefined : handleOtpVerifyClick}
              disabled={isLoading || otp.join("").length !== 6}
              className={`w-full h-12 md:h-14 rounded-brand font-medium text-base transition-all ${
                isLoading || otp.join("").length !== 6
                  ? "bg-gray-300 cursor-not-allowed text-gray-500"
                  : "bg-primary hover:bg-primary-hover text-on-primary shadow-lg hover:shadow-xl"
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-5 w-5 text-on-primary"
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
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Verifying...
                </span>
              ) : (
                "Verify Code"
              )}
            </button>
          </div>
        )}

        <div className="mt-2">
          <SecureEncryptedLabel />
        </div>
      </div>
    </>
  );
}
