import { useState, useEffect, useRef } from "react";
import Dialog from "../../common/dialog";
import { useAppDispatch, useAppSelector } from "../../redux/store";
import {
  initiateAlternatePhoneNumberVerification,
  verifyAlternatePhoneNumber,
} from "../../services/api/kyc.api";
import { CgSpinner } from "react-icons/cg";
import { IoMdPersonAdd } from "react-icons/io";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiChevronDown,
  FiSend,
  FiPhone,
  FiUser,
  FiUsers,
  FiArrowLeft,
} from "react-icons/fi";
import { RelationshipEnum } from "../../types/document";
import { upsertAlternatePhoneNumber } from "../../redux/slices/alternatePhoneNumbers";

const PHONE_NUMBER_LENGTH = 10; // For +91 country code

export function AlternatePhoneNumber({
  label,
}: {
  label: "FAMILY_MEMBER" | "NON_FAMILY_MEMBER";
}) {
  const user = useAppSelector((state) => state.user);
  const alternatePhoneNumbers = useAppSelector(
    (state) => state.alternatePhoneNumbers
  );
  const dispatch = useAppDispatch();

  const isFamilyMemberVerified =
    alternatePhoneNumbers.alternatePhoneNumber.some(
      (phone) => phone.label === "FAMILY_MEMBER" && phone.isVerified
    );
  const isNonFamilyMemberVerified =
    alternatePhoneNumbers.alternatePhoneNumber.some(
      (phone) => phone.label === "NON_FAMILY_MEMBER" && phone.isVerified
    );

  const [open, setOpen] = useState(false);
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState<RelationshipEnum>(
    RelationshipEnum.SPOUSE
  );
  const [otp, setOtp] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [error, setError] = useState("");
  const [isInitiating, setIsInitiating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [step, setStep] = useState<"input" | "verify">("input");
  const otpInputsRef = useRef<HTMLInputElement[]>([]);

  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === "verify" && !canResend) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanResend(true);
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, canResend]);

  const resetForm = () => {
    setStep("input");
    setCountryCode("+91");
    setPhoneNumber("");
    setName("");
    setOtp("");
    setError("");
    setCanResend(false);
    setCountdown(30);
  };

  const validateInputStep = () => {
    if (!phoneNumber || !name || !relationship) {
      setError("All fields are required");
      return false;
    }

    if (phoneNumber.length !== PHONE_NUMBER_LENGTH) {
      setError(
        `Please enter a valid ${PHONE_NUMBER_LENGTH}-digit phone number`
      );
      return false;
    }

    return true;
  };

  const handleInitiate = async () => {
    if (!validateInputStep()) return;

    setIsInitiating(true);
    setError("");

    try {
      const response = await initiateAlternatePhoneNumberVerification(
        user.user.id,
        `${countryCode}${phoneNumber}`,
        label,
        relationship,
        name
      );

      if (response?.id) {
        setVerificationId(response.id);
        setStep("verify");
      } else {
        setError("Failed to initiate verification. Please try again.");
      }
    } catch (err) {
      setError((err as Error).message || "Error initiating verification.");
    } finally {
      setIsInitiating(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      const response = await verifyAlternatePhoneNumber(
        user.user.id,
        otp,
        verificationId
      );

      if (response) {
        dispatch(upsertAlternatePhoneNumber(response));
        setOpen(false);
      }
    } catch (err) {
      setError(
        (err as Error).message || "Verification failed. Please try again."
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    setCanResend(false);
    setCountdown(30);
    await handleInitiate();
  };

  const handleOtpChange = (index: number, value: string) => {
    const numericValue = value.replace(/\D/g, "");
    if (numericValue) {
      const updated = otp.slice(0, index) + numericValue + otp.slice(index + 1);
      setOtp(updated.slice(0, 6));
      if (index < 5 && otpInputsRef.current[index + 1]) {
        otpInputsRef.current[index + 1].focus();
      }
    } else {
      // Handle backspace
      const updated = otp.slice(0, index) + otp.slice(index + 1);
      setOtp(updated);
      if (index > 0 && otpInputsRef.current[index - 1]) {
        otpInputsRef.current[index - 1].focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1].focus();
    }
  };

  const isVerified =
    (label === "FAMILY_MEMBER" && isFamilyMemberVerified) ||
    (label === "NON_FAMILY_MEMBER" && isNonFamilyMemberVerified);

  const labelText =
    label === "FAMILY_MEMBER"
      ? "Family Member Contact"
      : "Non-Family Member Contact";

  const getIcon = () => {
    if (label === "FAMILY_MEMBER") {
      return <FiUsers className="w-6 h-6" />;
    }
    return <FiUser className="w-6 h-6" />;
  };

  return (
    <div className="mb-6">
      {/* Enhanced Status Card */}
      <div
        className={`relative overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-lg ${
          isVerified
            ? "border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 shadow-green-100/50"
            : "border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 shadow-amber-100/50"
        }`}
      >
        {/* Soft pattern overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-5">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white to-transparent" />
        </div>

        <div className="relative p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div
                className={`relative p-3 rounded-2xl shadow-lg transition-all duration-300 ${
                  isVerified
                    ? "bg-green-100 text-green-600 shadow-green-200/50"
                    : "bg-amber-100 text-amber-600 shadow-amber-200/50"
                }`}
              >
                {getIcon()}
                {isVerified && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center ring-2 ring-white">
                    <FiCheckCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>

              {/* Text */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {labelText}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full font-medium ${
                      isVerified
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700 animate-pulse"
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isVerified ? "bg-green-500" : "bg-amber-500"
                      }`}
                    ></div>
                    {isVerified ? "Verified" : "Not Added"}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {isVerified
                    ? "Contact verification completed successfully"
                    : "Add an alternative contact for emergencies"}
                </p>
              </div>
            </div>

            {/* Action Button */}
            {!isVerified && (
              <button
                onClick={() => setOpen(true)}
                className="group relative inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-md hover:from-blue-700 hover:to-blue-800 hover:shadow-lg active:scale-[0.97] transition-all duration-200"
              >
                <IoMdPersonAdd className="w-5 h-5 md:w-5 md:h-5" />
                <span>Add</span>

                {/* Hover animation overlay */}
                <div className="absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-300 pointer-events-none" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Verification Dialog */}
      <Dialog
        isOpen={open}
        onClose={() => setOpen(false)}
        title={
          step === "input" ? "Add Emergency Contact" : "Verify Phone Number"
        }
      >
        <div className="relative">
          {/* Custom Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              {step === "verify" && (
                <button
                  onClick={() => setStep("input")}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <FiArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              )}
              <div>
                <p className="text-sm text-gray-600 mt-1">
                  {step === "input"
                    ? "This contact can be reached in case of emergency"
                    : `Code sent to +91 ${phoneNumber}`}
                </p>
              </div>
            </div>
          </div>

          {/* Enhanced Error Message */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 p-4 rounded-xl mb-6 animate-shake">
              <div className="flex-shrink-0 p-1 bg-red-100 rounded-full">
                <FiAlertCircle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-red-800 text-sm font-medium">
                  Verification Error
                </p>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Step Content */}
          {step === "input" ? (
            <div className="space-y-6">
              {/* Enhanced Phone Input */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <FiPhone className="w-4 h-4" />
                  Phone Number
                </label>
                <div className="group relative">
                  <div className="flex items-center bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-4 focus-within:border-blue-500 focus-within:bg-white transition-all duration-200">
                    <span className="text-gray-700 font-semibold text-lg">
                      +91
                    </span>
                    <div className="w-px h-6 bg-gray-300 mx-3"></div>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) =>
                        setPhoneNumber(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="Enter 10-digit number"
                      className="flex-1 text-lg outline-none bg-transparent placeholder-gray-400"
                      maxLength={10}
                    />
                  </div>
                  <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 group-focus-within:scale-x-100 transition-transform duration-300" />
                </div>
              </div>

              {/* Enhanced Relationship Select */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <FiUsers className="w-4 h-4" />
                  Relationship
                </label>
                <div className="relative group">
                  <select
                    value={relationship}
                    onChange={(e) =>
                      setRelationship(e.target.value as RelationshipEnum)
                    }
                    className="w-full appearance-none bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-4 pr-12 text-lg focus:border-blue-500 focus:bg-white transition-all duration-200 cursor-pointer"
                  >
                    {Object.values(RelationshipEnum).map((relation) => (
                      <option key={relation} value={relation}>
                        {relation
                          .replace("_", " ")
                          .toLowerCase()
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <FiChevronDown className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                </div>
              </div>

              {/* Enhanced Name Input */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <FiUser className="w-4 h-4" />
                  Contact Name
                </label>
                <div className="group relative">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-4 text-lg focus:border-blue-500 focus:bg-white transition-all duration-200 placeholder-gray-400"
                  />
                  <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 group-focus-within:scale-x-100 transition-transform duration-300" />
                </div>
              </div>

              {/* Enhanced Action Buttons */}
              <div className="flex gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 py-3 text-gray-600 hover:text-gray-800 font-medium rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInitiate}
                  disabled={
                    !phoneNumber ||
                    phoneNumber.length !== 10 ||
                    !name ||
                    isInitiating
                  }
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
                >
                  {isInitiating ? (
                    <CgSpinner className="animate-spin w-5 h-5" />
                  ) : (
                    <FiSend className="w-5 h-5" />
                  )}
                  Verify
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Enhanced OTP Section */}
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl">
                  <FiPhone className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Enter Verification Code
                  </h3>
                  <p className="text-gray-600">
                    We've sent a 6-digit code to
                    <br />
                    <span className="font-semibold text-gray-900">
                      +91 {phoneNumber}
                    </span>
                  </p>
                </div>
              </div>

              {/* Enhanced OTP Inputs */}
              <div className="space-y-6">
                <div className="flex justify-center gap-3">
                  {[...Array(6)].map((_, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        if (el) otpInputsRef.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={otp[i] || ""}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      className="w-10 h-10 text-xl font-bold text-center bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all duration-200 hover:border-gray-300"
                      autoFocus={i === 0}
                    />
                  ))}
                </div>

                {/* Enhanced Resend Section */}
                <div className="text-center space-y-3">
                  <p className="text-gray-600 text-sm">
                    Didn't receive the code?
                  </p>
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={!canResend || isInitiating}
                    className="text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm transition-colors"
                  >
                    {canResend ? (
                      "Resend Code"
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        {isInitiating && (
                          <CgSpinner className="animate-spin w-4 h-4" />
                        )}
                        Resend in {countdown}s
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Enhanced Verify Button */}
              <button
                onClick={handleVerify}
                disabled={otp.length !== 6 || isVerifying}
                className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-xl hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
              >
                {isVerifying ? (
                  <CgSpinner className="animate-spin w-6 h-6" />
                ) : (
                  <FiCheckCircle className="w-6 h-6" />
                )}
                {isVerifying ? "Verifying..." : "Verify & Save Contact"}
              </button>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}
