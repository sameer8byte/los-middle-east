import { useState, useEffect, ChangeEvent, KeyboardEvent, useRef } from "react";
import { sendEmail } from "../../../services/api/auth.api";
import { useAppDispatch, useAppSelector } from "../../../redux/store";
import { useNavigate } from "react-router-dom";
import { updateUser } from "../../../redux/slices/user";
import { useDevice } from "../../../hooks/useDevice";
import { PageIdToPageMap } from "../../../constant/redirect";
import { SecureEncryptedLabel } from "../../../common/ui/secureEncryptedLabel";
import { trackLoginEvent } from "../../../utils/utmTracking";
import authService from "../../../services/api/auth.service";
import { SiMinutemailer } from "react-icons/si";
interface CredentialResponse {
  clientId: string;
  credential: string;
  select_by: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: unknown) => void;
          renderButton: (element: HTMLElement, options: unknown) => void;
          prompt: (notification?: unknown) => void;
        };
      };
    };
  }
}

export default function EmailVerificationV2() {
  const navigate = useNavigate();
  const { postRegisterUserDevice } = useDevice();
  const dispatch = useAppDispatch();
  const brand = useAppSelector((state) => state.index);
  const userDetails = useAppSelector((state) => state.user);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [step, setStep] = useState(1);
  const [timer, setTimer] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [, setAnimation] = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!document.querySelector("script#google-auth")) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.id = "google-auth";
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleAuth;
      document.body.appendChild(script);
    } else {
      initializeGoogleAuth();
    }

    return () => {
      const googleScript = document.getElementById("google-auth");
      googleScript?.parentNode?.removeChild(googleScript);
    };
  }, [brand?.id]);

  const initializeGoogleAuth = () => {
    if (window.google?.accounts) {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleAuthResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      if (googleButtonRef.current) {
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          logo_alignment: "center",
          width: googleButtonRef.current.offsetWidth,
        });
      }

      setTimeout(() => {
        window.google?.accounts?.id?.prompt((notification: unknown) => {
          console.log("Google One Tap status:", notification);
        });
      }, 1000);
    }
  };

  const handleGoogleAuthResponse = async (response: CredentialResponse) => {
    if (!response.credential) {
      setError("Google authentication failed");
      setAnimation("shake");
      setTimeout(() => setAnimation(""), 500);
      return;
    }
    if (!brand.id) {
      setError("Brand ID is not available");
      setAnimation("shake");
      setTimeout(() => setAnimation(""), 500);
      return;
    }

    setIsGoogleLoading(true);
    setError("");

    try {
      const deviceId = (await postRegisterUserDevice()) || "";
      const res = await authService.googleLogin(
        response.credential,
        userDetails.user.id,
        brand.id,
        deviceId,
      );

      if (res) {
        setAnimation("success");
        dispatch(updateUser(res));

        // Track Google login event
        try {
          await trackLoginEvent(res.id, brand.id, "google");
        } catch (trackingError) {
          console.error("Error tracking Google login event:", trackingError);
        }

        setTimeout(() => navigate(PageIdToPageMap[res.onboardingStep]), 300);
      }
    } catch (err) {
      setError((err as Error).message || "Google authentication failed");
      setAnimation("error");
    } finally {
      setIsGoogleLoading(false);
    }
  };
  const validateEmail = (email: string) => {
    if (/\s/.test(email)) {
      return "Spaces are not allowed in email";
    }
    // (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(values.email))
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address";
    }
    return "";
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    // Immediate space removal
    const sanitizedInput = input.replace(/\s/g, "");

    setEmail(sanitizedInput);
  };
  const handleOtpChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value;
    if (/^\d*$/.test(value) && value.length <= 1) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      if (error) setError("");
      if (value && index < 5) otpRefs.current[index + 1]?.focus();
      if (index === 5) handleOtpVerify([...otp.slice(0, 5), value].join(""));
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
    if (/^\d+$/.test(pastedData)) {
      const digits = pastedData.slice(0, 6).split("");
      const newOtp = [...otp].map((_, i) => digits[i] || "");
      setOtp(newOtp);
      const nextEmptyIndex = newOtp.findIndex((val) => !val);
      otpRefs.current[nextEmptyIndex === -1 ? 5 : nextEmptyIndex]?.focus();
    }
  };

  const handleEmailVerify = async () => {
    const validationError = validateEmail(email);
    if (validationError) {
      setError(validationError);
      setAnimation("shake");
      setTimeout(() => setAnimation(""), 500);
      return;
    }
    setIsLoading(true);
    try {
      const response = await sendEmail(email, brand.id, userDetails.user.id);
      if (response) {
        // dispatch(updateUser(response));
        dispatch(
          updateUser({
            ...response,
            signUpVersion: "V2",
          }),
        );
        setStep(2);
        startTimer();
      }
    } catch (err) {
      setError((err as Error).message || "Failed to send verification code");
      setAnimation("shake");
    } finally {
      setIsLoading(false);
      setTimeout(() => setAnimation(""), 500);
    }
  };

  const handleOtpVerify = async (otpValue = otp.join("")) => {
    if (otpValue.length !== 6) {
      setError("Please enter a 6-digit code");
      setAnimation("shake");
      setTimeout(() => setAnimation(""), 500);
      return;
    }
    setIsLoading(true);
    try {
      const deviceId = (await postRegisterUserDevice()) || "";
      const response = await authService.verifyOtp({
        otp: otpValue,
        brandId: brand.id,
        userId: userDetails.user.id,
        type: "email" as const,
        deviceId: deviceId,
      });
      if (response) {
        setAnimation("success");
        dispatch(updateUser(response));

        // Track email OTP login event
        try {
          await trackLoginEvent(response.id, response.brandId, "email");
        } catch (trackingError) {
          console.error("Error tracking email login event:", trackingError);
        }

        setTimeout(
          () => navigate(PageIdToPageMap[response.onboardingStep]),
          300,
        );
      }
    } catch (err) {
      setError((err as Error).message || "Verification failed");
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
      setAnimation("shake");
    } finally {
      setIsLoading(false);
      setTimeout(() => setAnimation(""), 500);
    }
  };

  const startTimer = () => {
    setTimer(60);
    setIsTimerRunning(true);
  };

  useEffect(() => {
    let interval: number;
    if (isTimerRunning) {
      interval = window.setInterval(() => {
        setTimer((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  return (
    <div>
      {/* Header Section */}
      <div className="text-center mb-8">
        <div className="mb-6  hidden md:flex justify-center">
          <div className="bg-primary/10 p-4 rounded-full">
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

        <div className="w-full text-center mt-8">
          <div className="flex items-center justify-center space-x-4 mb-2">
            <hr className="flex-grow border-t border-gray-300" />
            <h2 className="text-xl md:text-3xl font-semibold whitespace-nowrap">
              {step === 1 ? "Email Verification" : "Verify Your Identity"}
            </h2>
            <hr className="flex-grow border-t border-gray-300" />
          </div>

          <p className="text-sm hidden md:flex text-on-surface-muted justify-center">
            {step === 1
              ? "Verify your email address to continue with the application"
              : "Enter the verification code sent to your email address"}
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-2 md:mb-6 p-1 md:p-4 bg-gray-200 border-l-4 border-black rounded-brand flex items-center">
          <svg
            className="h-5 w-5 text-error mr-3"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm text-error-text">{error}</p>
        </div>
      )}

      {/* Step 1: Email Input and Google Login */}
      {step === 1 ? (
        <div className="space-y-4">
          <div className="">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-on-surface mt-4 mb-4"
            >
              Email Address
            </label>
            <div className="flex items-center">
              <input
                id="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="your.email@example.com"
                className={`flex-1 h-12 px-4 py-3 border rounded-brand  placeholder-on-surface-muted text-on-surface transition-all duration-200 ${
                  error ? "border-error" : "border-outline"
                }`}
                autoComplete="email"
              />
            </div>
            <p className="text-xs text-on-surface-muted mt-4 text-center">
              We will send you a verification code to this email address.
            </p>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-on-surface-muted">
                or continue with
              </span>
            </div>
          </div>

          {/* Google Button */}
          <div className="flex w-full items-center justify-center">
            {isGoogleLoading ? (
              <div className="w-full h-[50px] rounded-full border border-outline bg-surface flex items-center justify-center">
                <svg
                  className="animate-spin h-5 w-5 text-primary"
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
                    d="M4 12a8 8 0 018-8V0..."
                  />
                </svg>
              </div>
            ) : (
              <div
                ref={googleButtonRef}
                className="w-full rounded-full overflow-hidden hover:shadow"
              />
            )}
          </div>

          {/* Continue with Email Button */}
          <button
            onClick={handleEmailVerify}
            disabled={isLoading || !email}
            className={`w-full h-[40px] rounded-brand font-medium text-base transition-colors ${
              isLoading || !email
                ? "bg-white border border-gray-100 rounded-3xlcursor-not-allowed"
                : "bg-primary hover:bg-primary-hover text-on-primary shadow-lg"
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                {/* <svg
                  className="animate-spin mr-2 h-5 w-5 text-on-primary"
                  viewBox="0 0 24 24"
                  fill="none"
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
                    d="M4 12a8 8 0 018-8V0..."
                  />
                </svg> */}
                Sending...
              </span>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <SiMinutemailer className="text-on-primary" /> Continue with
                Email
              </div>
            )}
          </button>
        </div>
      ) : (
        // Step 2: OTP Verification
        <div className="space-y-8">
          <div>
            <label
              htmlFor="otp"
              className="block text-sm font-medium text-on-surface mb-4"
            >
              6-digit Verification Code
            </label>
            <div
              className="flex justify-between gap-3"
              onPaste={handleOtpPaste}
            >
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
                  className="w-11 h-11 text-center text-2xl font-semibold border-2 border-outline rounded-brand focus:ring-2 focus:ring-primary"
                  maxLength={1}
                  inputMode="numeric"
                  autoFocus={index === 0}
                />
              ))}
            </div>
            <p className="mt-2 text-sm text-on-surface-muted">
              OTP sent to {email}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between items-center text-sm space-y-4 sm:space-y-0">
            <button
              onClick={() => setStep(1)}
              className="flex items-center text-primary hover:text-primary-hover font-medium"
            >
              {/* <svg
                className="w-5 h-5 mr-1.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg> */}
              Change Email
            </button>

            {timer > 0 ? (
              <div className="flex items-center text-on-surface-muted">
                <svg
                  className="w-5 h-5 mr-1.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Resend in {timer}s
              </div>
            ) : (
              <button
                onClick={() => {
                  setStep(1);
                  setTimer(60);
                  setIsTimerRunning(false);
                }}
                className="flex items-center text-primary hover:text-primary-hover font-medium"
              >
                <svg
                  className="w-5 h-5 mr-1.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2..."
                  />
                </svg>
                Resend Code
              </button>
            )}
          </div>

          <button
            onClick={
              isLoading || otp.join("").length !== 6
                ? undefined
                : () => handleOtpVerify()
            }
            disabled={isLoading || otp.join("").length !== 6}
            className={`w-full h-[50px] rounded-brand font-medium text-base transition-colors ${
              isLoading || otp.join("").length !== 6
                ? "bg-gray-200 cursor-not-allowed"
                : "bg-primary hover:bg-primary-hover text-on-primary shadow-lg"
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                {/* <svg
                  className="animate-spin mr-2 h-5 w-5 text-on-primary"
                  viewBox="0 0 24 24"
                  fill="none"
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
                    d="M4 12a8 8 0 018-8V0..."
                  />
                </svg> */}
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
  );
}
