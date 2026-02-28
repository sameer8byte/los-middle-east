import React, { ChangeEvent, useEffect, useRef, useState } from "react";
import { MdWarning, MdChevronRight } from "react-icons/md";
import { FiAlertCircle } from "react-icons/fi";
import { useAppDispatch, useAppSelector } from "../../../redux/store";
import authService from "../../../services/api/auth.service";
import { useDevice } from "../../../hooks/useDevice";
import { PageIdToPageMap } from "../../../constant/redirect";
import { updateAccessToken, updateUser } from "../../../redux/slices/user";
import { trackLoginEvent } from "../../../utils/utmTracking";
import { TermsAndConditions } from "./termsandConditions";
import { TbEdit } from "react-icons/tb";
import { OccupationTypeEnum } from "../../../constant/enum";

interface FormData {
  phoneNumber: string;
  occupationTypeId: number;
  monthlySalary: string;
  panCard: string;
  firstName: string;
  middleName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
}

interface FormErrors {
  [key: string]: string;
}

interface SignupV2Props {
  onSwitchToLogin?: () => void;
}

const STEPS = [
  { number: 1, title: "Contact", description: "Employment & Contact" },
  { number: 2, title: "Profile", description: "Personal info" },
];

const SignupV2: React.FC<SignupV2Props> = ({ onSwitchToLogin }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otp, setOtp] = useState(Array(6).fill(""));
  const [otpError, setOtpError] = useState("");
  const [resendCount, setResendCount] = useState(0);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const brand = useAppSelector((state) => state.index);
  const { postRegisterUserDevice } = useDevice();
  const [userId, setUserId] = useState("");
  const dispatch = useAppDispatch();
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [formData, setFormData] = useState<FormData>({
    phoneNumber: "",
    occupationTypeId: 0,
    monthlySalary: "",
    panCard: "",
    firstName: "",
    middleName: "",
    lastName: "",
    gender: "",
    dateOfBirth: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [hasDeclinedTerms, setHasDeclinedTerms] = useState(false);

  const formatPanCard = (value: string): string => {
    let formatted = value.toUpperCase();
    formatted = formatted.replace(/[^A-Z0-9]/g, "");
    if (formatted.length > 10) formatted = formatted.slice(0, 10);
    return formatted;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === "panCard") {
      formattedValue = formatPanCard(value);
    } else if (name === "monthlySalary") {
      if (!/^\d*$/.test(value)) return;
      if (Number(value) > 9999999) return;
    } else if (name === "phoneNumber") {
      formattedValue = value.replace(/\D/g, "").slice(0, 10);
    } else if (
      name === "firstName" ||
      name === "lastName" ||
      name === "middleName"
    ) {
      formattedValue = value.replace(/[^a-zA-Z\s]/g, "");
    }

    setFormData((prev) => ({
      ...prev,
      [name]: formattedValue,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  useEffect(() => {
    const { occupationTypeId, monthlySalary, phoneNumber, panCard } = formData;
    const allValid =
      occupationTypeId &&
      monthlySalary &&
      /^\d{10}$/.test(phoneNumber) &&
      /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panCard);

    if (allValid && !termsAccepted && !hasDeclinedTerms && !showTermsDialog) {
      setShowTermsDialog(true);
    }
  }, [formData, termsAccepted, hasDeclinedTerms, showTermsDialog]);

  const handleOtpChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value;
    if (/^\d?$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      setOtpError("");

      if (value && index < 5) {
        otpRefs.current[index + 1]?.focus();
      }

      if (newOtp.every((digit) => digit !== "")) {
        handleVerifyOTP(newOtp.join(""));
      }
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (
      (e.key === "Backspace" || e.key === "Delete") &&
      !otp[index] &&
      index > 0
    ) {
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
      otpRefs.current[index - 1]?.focus();
      setOtpError("");
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split("").slice(0, 6);
      setOtp(newOtp);
      setOtpError("");
      otpRefs.current[5]?.focus();
      handleVerifyOTP(pastedData);
    } else {
      setOtpError("Please paste a valid 6-digit OTP");
    }
  };

  const handleSendOTP = async () => {
    setLoading(true);
    try {
      const hostname = window.location.hostname;
      const brandId = brand.id;

      const payload = {
        phoneNumber: "+91" + formData.phoneNumber.replace(/\D/g, "").slice(-10),
        occupationTypeId: formData.occupationTypeId.toString(),
        monthlySalary: formData.monthlySalary,
        panCard: formData.panCard.toUpperCase(),
        brandId: brandId,
        domain: hostname,
      };

      const response = await authService.sendSignupOtpV2(payload);

      if (response) {
        setShowOtpScreen(true);
        setCurrentStep(1);
        setErrors({});
        setUserId(response.id);
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to send OTP. Please try again.";
      setErrors({ submit: errorMessage });
      console.error("Error sending OTP:", error);
    } finally {
      setLoading(false);
      setTimeout(()=>{
        setErrors({})
      },3000)
    }
  };

  const handleVerifyOTP = async (otpValue = otp.join("")) => {
    if (otpValue.length !== 6) {
      setOtpError("Please enter a valid 6-digit verification code");
      return;
    }

    setLoading(true);
    const deviceId = (await postRegisterUserDevice()) || "";
    try {
      const brandId = brand.id;

      const response = await authService.verifyOtp({
        otp: otpValue,
        brandId: brandId,
        userId: userId,
        type: "phone",
        deviceId,
      });
      if (response?.accessToken) {
        sessionStorage.setItem("accessToken", response.accessToken);
        setCompletedSteps([...completedSteps, currentStep]);
        setShowOtpScreen(false);
        setOtpError("");
        window.scrollTo(0, 0);
        dispatch(updateUser(response.user));
        dispatch(updateAccessToken(response.accessToken));

        try {
          await trackLoginEvent(response.user.id, response.user.brandId, "otp");
        } catch (utmError) {
          console.error("Error tracking login event:", utmError);
        }

        // Track click ID if present
        const urlParams = new URLSearchParams(window.location.search);
        const clickid = urlParams.get("clickid") || "";
        if (clickid) {
          try {
            const trackUrl = `https://affiliates.adsplay.in/trackingcode_installs.php?clickid=${clickid}`;
            await fetch(trackUrl);
          } catch (trackingError) {
            console.error("Error tracking click ID:", trackingError);
          }
        }

        if ((window as any)?.fbq) {
          (window as any).fbq("track", "SubmitApplication", {
            currency: "INR",
            value: "final_price_without_currency",
          });
        }
        window.location.href = PageIdToPageMap[response.onboardingStep] || "/";
      } 
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || "Invalid OTP. Please try again.";
      setOtpError(errorMessage);
      console.error("Error verifying OTP:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCount >= 3) return;
    setLoading(true);
    setResendCount(resendCount + 1);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setOtp(Array(6).fill(""));
      setOtpError("");
    } catch (error) {
      console.error("Resend failed");
    } finally {
      setLoading(false);
    }
  };

  const handleBackFromOTP = () => {
    setShowOtpScreen(false);
    setOtp(Array(6).fill(""));
    setOtpError("");
  };

  const formatPhoneForDisplay = (phone: string) => {
    if (phone.length === 10) {
      return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
    }
    return phone;
  };

  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {};

    if (step === 1) {
      if (!formData.occupationTypeId)
        newErrors.occupationTypeId = "Occupation type is required";
      if (!formData.monthlySalary.trim())
        newErrors.monthlySalary = "Monthly salary is required";
      else if (isNaN(Number(formData.monthlySalary)))
        newErrors.monthlySalary = "Enter a valid amount";
      if (!formData.phoneNumber.trim())
        newErrors.phoneNumber = "Phone number is required";
      else if (!/^\d{10}$/.test(formData.phoneNumber.replace(/\D/g, "")))
        newErrors.phoneNumber = "Enter a valid 10-digit phone number";
      if (!formData.panCard.trim()) newErrors.panCard = "PAN card is required";
      else if (
        !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panCard.toUpperCase())
      )
        newErrors.panCard = "Enter a valid PAN card number";
    }

    if (step === 2) {
      if (!formData.firstName.trim())
        newErrors.firstName = "First name is required";
      if (!formData.lastName.trim())
        newErrors.lastName = "Last name is required";
      if (!formData.gender) newErrors.gender = "Gender is required";
      if (!formData.dateOfBirth)
        newErrors.dateOfBirth = "Date of birth is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (validateStep(currentStep)) {
        handleSendOTP();
      }
    } else if (currentStep < STEPS.length) {
      if (validateStep(currentStep)) {
        setCompletedSteps([...completedSteps, currentStep]);
        setCurrentStep(currentStep + 1);
        window.scrollTo(0, 0);
      }
    }
  };
  const handleAcceptTerms = () => {
    setTermsAccepted(true);
    setShowTermsDialog(false);
  };

  const handleDeclineTerms = () => {
    setHasDeclinedTerms(true);
    setTermsAccepted(false);
    setShowTermsDialog(false);
  };

  return (
    <>
      <TermsAndConditions
        showTermsDialog={showTermsDialog}
        setShowTermsDialog={setShowTermsDialog}
        handleAcceptTerms={handleAcceptTerms}
        handleDeclineTerms={handleDeclineTerms}
      />
      <div className="max-w-sm w-full mx-auto p-6 md:bg-white/80 md:backdrop-blur-lg md:rounded-2xl md:shadow-xl md:border md:border-gray-100 md:transition-all md:duration-300">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-4">
            <div className=" flex justify-center">
              <div className="bg-primary/10 p-3 rounded-full shadow-inner hidden md:block">
                <svg
                  className="w-7 h-7 text-primary "
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

            <h2 className="text-xl hidden md:block  font-bold text-gray-900 mt-4 ">
              Get Started with your Personal Loan Application
            </h2>
            <h2 className="text-xl font-bold text-gray-900 mt-4 md:hidden">
              Start your loan process
            </h2>

            <p className=" hidden md:block text-sm text-gray-500 mt-1">
              Get started in minutes — it only takes a few simple steps.
            </p>
          </div>
          {/* Form Container */}

          <div>
            {currentStep === 1 && !showOtpScreen && (
              <div className="animate-fadeIn">
                {/* Form Fields */}
                <div className="space-y-4">
                  {/* Submit Error Display */}
                  {errors.submit && (
                    <div className="bg-error/10 border-l-4 border-error rounded-lg p-3 flex items-start gap-2">
                      <FiAlertCircle
                        size={18}
                        className="text-error flex-shrink-0 mt-0.5"
                      />
                      <p className="text-error text-xs font-medium">
                        {errors.submit}
                      </p>
                    </div>
                  )}

                  {/* Current Status */}
                  <div>
                    <label className="block text-xs font-semibold text-on-surface mb-1.5 uppercase tracking-wide">
                      Employment Status <span className="text-error">*</span>
                    </label>
                    <div className="flex gap-1 text-xs whitespace-nowrap">
                      {[
                        {
                          label: "Salaried",
                          value: OccupationTypeEnum.SALARIED,
                        },
                        {
                          label: "Self Employed",
                          value: OccupationTypeEnum.SELF_EMPLOYED_BUSINESS,
                        },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              occupationTypeId: option.value,
                            }));
                            if (errors.occupationTypeId) {
                              setErrors((prev) => ({
                                ...prev,
                                occupationTypeId: "",
                              }));
                            }
                          }}
                          className={`flex-1 px-1 py-2.5 rounded-lg border-2 text-xs  transition-all duration-200 cursor-pointer
                               ${
                                 formData.occupationTypeId === option.value
                                   ? "border-primary bg-primary text-white shadow-md"
                                   : "border-muted bg-background text-on-background hover:border-primary/60"
                               }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    {errors.occupationTypeId && (
                      <div className="flex items-center mt-1 text-error text-xs font-medium">
                        <MdWarning size={12} className="mr-1 flex-shrink-0" />
                        <span>{errors.occupationTypeId}</span>
                      </div>
                    )}
                  </div>

                  {/* Current Status & Salary Grid */}
                  <div className="grid grid-cols-1 gap-4">
                    {/* Monthly Salary */}
                    <div>
                      <label className="block text-xs font-semibold text-on-surface mb-1.5 uppercase tracking-wide">
                        Monthly Salary <span className="text-error">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-on-background font-semibold text-sm">
                          ₹
                        </span>
                        <input
                          type="text"
                          name="monthlySalary"
                          value={formData.monthlySalary}
                          onChange={handleChange}
                          placeholder="50000"
                          className={`w-full pl-7 pr-3 py-2.5 rounded-lg border-2 transition-all duration-200 focus:outline-none bg-background text-on-background text-sm ${
                            errors.monthlySalary
                              ? "border-error focus:border-error focus:ring-2 focus:ring-error/20"
                              : "border-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
                          }`}
                        />
                      </div>
                    

                      {errors.monthlySalary && (
                        <div className="flex items-center mt-1 text-error text-xs font-medium">
                          <MdWarning size={12} className="mr-1 flex-shrink-0" />
                          <span>{errors.monthlySalary}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Phone Number & PAN Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Phone Number */}
                    <div>
                      <label className="block text-xs font-semibold text-on-surface mb-1.5 uppercase tracking-wide">
                        Phone <span className="text-error">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-on-background font-semibold text-sm">
                          +91
                        </span>
                        <input
                          type="tel"
                          name="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={handleChange}
                          placeholder="XXXXXXXXXX" 
                          maxLength={10}
                          className={`w-full pl-10 pr-3 py-2.5 rounded-lg border-2 transition-all duration-200 focus:outline-none bg-background text-on-background text-sm ${
                            errors.phoneNumber
                              ? "border-error focus:border-error focus:ring-2 focus:ring-error/20"
                              : "border-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
                          }`}
                        />
                      </div>
                      {errors.phoneNumber && (
                        <div className="flex items-center mt-1 text-error text-xs font-medium">
                          <MdWarning size={12} className="mr-1 flex-shrink-0" />
                          <span>{errors.phoneNumber}</span>
                        </div>
                      )}
                    </div>

                    {/* PAN Card */}
                    <div>
                      <label className="block text-xs font-semibold text-on-surface mb-1.5 uppercase tracking-wide">
                        PAN Card <span className="text-error">*</span>
                      </label>
                      <input
                        type="text"
                        name="panCard"
                        value={formData.panCard}
                        onChange={handleChange}
                        placeholder="ABCDE1234F"
                        maxLength={10}
                        className={`w-full px-3 py-2.5 rounded-lg border-2 transition-all duration-200 focus:outline-none bg-background text-on-background uppercase font-semibold text-sm ${
                          errors.panCard
                            ? "border-error focus:border-error focus:ring-2 focus:ring-error/20"
                            : "border-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
                        }`}
                      />
                      {errors.panCard && (
                        <div className="flex items-center mt-1 text-error text-xs font-medium">
                          <MdWarning size={12} className="mr-1 flex-shrink-0" />
                          <span>{errors.panCard}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="flex items-start gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="terms-acceptance"
                    checked={termsAccepted}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setShowTermsDialog(true);
                      } else {
                        setTermsAccepted(false);
                      }
                    }}
                    className="w-4 h-4 mt-0.5 accent-primary cursor-pointer"
                  />
                  <label
                    htmlFor="terms-acceptance"
                    className="text-xs text-secondary cursor-pointer"
                  >
                    I accept the{" "}
                    <a
                      href={brand.brandPolicyLinks.termsConditionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium"
                    >
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a
                      href={brand.brandPolicyLinks.privacyPolicyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium"
                    >
                      Privacy Policy
                    </a>
                  </label>
                </div>

                {/* Next Button */}
                <button
                  onClick={handleNext}
                  disabled={loading || !termsAccepted}
                  className={`w-full py-3 text-black rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 mt-6 text-sm ${
                    loading || !termsAccepted
                      ? "bg-muted text-secondary cursor-not-allowed"
                      : "bg-primary text-on-primary hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 active:scale-95"
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-on-primary border-t-transparent rounded-full" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Send OTP</span>
                      <MdChevronRight size={18} />
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-muted/30"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-background text-secondary">
                      Already have an account?
                    </span>
                  </div>
                </div>

                {/* Login Link */}
                <button
                  onClick={onSwitchToLogin}
                  className="w-full py-2.5 rounded-lg border-2 border-muted text-on-surface font-semibold text-sm hover:bg-muted/20 transition-all duration-200 active:scale-95"
                >
                  Sign In
                </button>
              </div>
            )}

            {/* OTP Screen */}
            {currentStep === 1 && showOtpScreen && (
              <div className="animate-fadeIn">
                {/* Header */}
                <div className="mb-5">
                  <h2 className="text-2xl font-bold text-on-surface mb-1">
                    Verify OTP
                  </h2>
                </div>

                {/* OTP Info Card */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-5">
                  <p className="font-bold text-base text-on-surface flex gap-1">
                    +91 {formatPhoneForDisplay(formData.phoneNumber).slice(3)}
                    <button
                      type="button"
                      onClick={handleBackFromOTP}
                      className="text-primary text-lg  font-medium  "
                    >
                      <TbEdit />
                    </button>
                  </p>
                </div>

                {/* OTP Input */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-on-surface mb-2 uppercase tracking-wide">
                    Enter OTP <span className="text-error">*</span>
                  </label>
                  <div
                    className="flex justify-center gap-2"
                    onPaste={handleOtpPaste}
                  >
                    {otp.map((digit: any, index: any) => (
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
                  {otpError && (
                    <p className="mt-1.5 flex items-center text-error text-xs font-medium">
                      <FiAlertCircle size={14} className="mr-1" />
                      {otpError}
                    </p>
                  )}
                </div>

                {/* Resend Section */}
                <div className="text-center py-2 mb-4">
                  <p className="text-xs text-secondary mb-1.5">
                    Didn't receive code?
                  </p>
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={loading || resendCount >= 3}
                    className={`text-xs font-semibold transition-all ${
                      resendCount >= 3
                        ? "text-muted cursor-not-allowed"
                        : "text-primary hover:text-primary/80"
                    }`}
                  >
                    {loading
                      ? "Resending..."
                      : `Resend (${3 - resendCount} left)`}
                  </button>
                </div>

                {/* Verify Button */}
                <button
                  type="button"
                  onClick={() => handleVerifyOTP()}
                  disabled={loading}
                  className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 text-sm mb-2 ${
                    loading
                      ? "bg-muted text-muted cursor-not-allowed"
                      : "bg-primary text-on-primary hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 active:scale-95"
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-on-primary border-t-transparent rounded-full" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify & Continue</span>
                      <MdChevronRight size={18} />
                    </>
                  )}
                </button>

                {/* Back Button */}
                <button
                  type="button"
                  onClick={handleBackFromOTP}
                  className="w-full py-2.5 rounded-lg border-2 border-muted text-on-surface font-semibold text-sm hover:bg-muted/20 transition-all duration-200 active:scale-95"
                >
                  ← Back
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SignupV2;
