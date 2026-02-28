import { useState } from "react";
import { RelationshipEnum, VerificationType } from "../../../constant/enum";
import {
  addAlternatePhoneNumber,
  verifyAlternatePhoneNumber,
  resendAlternatePhoneOtp,
} from "../../../shared/services/api/customer.api";
import Dialog from "../../../common/dialog";
import { Button } from "../../../common/ui/button";

export interface AddAlternatePhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  brandId: string;
  onSuccess: () => void;
}

interface AddPhoneFormData {
  phone: string;
  label: string;
  name: string;
  relationship: RelationshipEnum;
  verificationType: VerificationType;
}

const validatePhoneNumber = (phone: string): string | null => {
  // Remove any spaces, dashes, or other formatting
  const cleanPhone = phone.replace(/[\s\-()]/g, "");

  // Check if it starts with +91
  if (!cleanPhone.startsWith("+91")) {
    return "Phone number must start with +91";
  }

  // Remove +91 and check the remaining digits
  const phoneDigits = cleanPhone.substring(3);

  // Must be exactly 10 digits
  if (phoneDigits.length !== 10) {
    return "Phone number must be 10 digits after +91";
  }

  // Must contain only digits
  if (!/^\d+$/.test(phoneDigits)) {
    return "Phone number can only contain digits";
  }

  // First digit should be 6-9 (valid Indian mobile number)
  if (!/^[6-9]/.test(phoneDigits)) {
    return "Invalid mobile number format";
  }

  return null;
};

const formatPhoneNumber = (value: string): string => {
  // Remove all non-digit characters except +
  let cleaned = value.replace(/[^\d+]/g, "");

  // If it doesn't start with +91, add it
  if (!cleaned.startsWith("+91")) {
    // Remove any existing + or country codes
    cleaned = cleaned.replace(/^\+?91?/, "");
    cleaned = "+91" + cleaned;
  }

  // Limit to +91 + 10 digits
  if (cleaned.length > 13) {
    cleaned = cleaned.substring(0, 13);
  }

  return cleaned;
};

const PhoneValidationIcon = ({
  phone,
  phoneError,
}: {
  phone: string;
  phoneError: string | null;
}) => {
  if (phone.length <= 3) return null;

  if (phoneError) {
    return (
      <svg
        className="w-5 h-5 text-red-500"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  if (phone.length === 13) {
    return (
      <svg
        className="w-5 h-5 text-green-500"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  return null;
};

export function AddAlternatePhoneModal({
  isOpen,
  onClose,
  customerId,
  brandId,
  onSuccess,
}: Readonly<AddAlternatePhoneModalProps>) {
  const [step, setStep] = useState<"add" | "verify">("add");
  const [formData, setFormData] = useState<AddPhoneFormData>({
    phone: "+91",
    label: "",
    name: "",
    relationship: RelationshipEnum.OTHER,
    verificationType: VerificationType.OTP,
  });
  const [otp, setOtp] = useState("");
  const [alternatePhoneId, setAlternatePhoneId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otpTimer, setOtpTimer] = useState(0);

  const handleClose = () => {
    setStep("add");
    setFormData({
      phone: "+91",
      label: "",
      name: "",
      relationship: RelationshipEnum.OTHER,
      verificationType: VerificationType.OTP,
    });
    setOtp("");
    setAlternatePhoneId(null);
    setError(null);
    setPhoneError(null);
    setOtpTimer(0);
    onClose();
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    setFormData({ ...formData, phone: formatted });
    const validationError = validatePhoneNumber(formatted);
    setPhoneError(validationError);
  };

  const handleAddPhone = async (e: React.FormEvent) => {
    e.preventDefault();

    // Final validation before submitting
    const phoneValidationError = validatePhoneNumber(formData.phone);
    if (phoneValidationError) {
      setPhoneError(phoneValidationError);
      return;
    }

    setLoading(true);
    setError(null);
    setPhoneError(null);

    try {
      const response = await addAlternatePhoneNumber(customerId, brandId, {
        phone: formData.phone,
        label: formData.label,
        name: formData.name,
        relationship: formData.relationship,
        verificationType: formData.verificationType,
      });

      setAlternatePhoneId(response.id);
      
      // Skip OTP verification for voice calls
      if (formData.verificationType === VerificationType.VOICE_CALL) {
        onSuccess();
        handleClose();
      } else {
        setStep("verify");
        startOtpTimer();
      }
    } catch (error: any) {
      setError(error.response?.data?.message || "Failed to add phone number");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alternatePhoneId) return;

    setLoading(true);
    setError(null);

    try {
      await verifyAlternatePhoneNumber(
        customerId,
        brandId,
        alternatePhoneId,
        otp
      );
      onSuccess();
      handleClose();
    } catch (error: any) {
      setError(error.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!alternatePhoneId || otpTimer > 0) return;

    setLoading(true);
    setError(null);

    try {
      await resendAlternatePhoneOtp(customerId, brandId, alternatePhoneId);
      startOtpTimer();
    } catch (error: any) {
      setError(error.response?.data?.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  const startOtpTimer = () => {
    setOtpTimer(60);
    const interval = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={
        step === "add" ? "Add Alternate Phone Number" : "Verify Phone Number"
      }
    >
      <div>
        {error && (
          <div className="mb-6 p-4 bg-[var(--color-error)] bg-opacity-10 border border-[var(--color-error)] border-opacity-30 rounded-lg">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-red-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-[var(--color-on-error)] text-sm font-medium">
                {error}
              </p>
            </div>
          </div>
        )}

        {step === "add" ? (
          <form onSubmit={handleAddPhone} className="space-y-5">
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2"
              >
                Phone Number *
              </label>
              <div className="relative">
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="+91XXXXXXXXXX"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    phoneError
                      ? "border-red-300 bg-[var(--color-error)] bg-opacity-10 focus:ring-red-500"
                      : "border-[var(--color-muted)] border-opacity-50 bg-white"
                  }`}
                  required
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <PhoneValidationIcon
                    phone={formData.phone}
                    phoneError={phoneError}
                  />
                </div>
              </div>
              {phoneError && (
                <p className="mt-2 text-sm text-[var(--color-on-error)] flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {phoneError}
                </p>
              )}
              <p className="mt-2 text-xs text-[var(--color-on-surface)] opacity-70">
                 Enter Indian mobile number with +91 prefix
              </p>
            </div>

            <div>
              <label
                htmlFor="label"
                className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2"
              >
                Label *
              </label>
              <input
                id="label"
                type="text"
                value={formData.label}
                onChange={(e) =>
                  setFormData({ ...formData, label: e.target.value })
                }
                placeholder="e.g., Personal, Work, Home"
                className="w-full px-4 py-3 border border-[var(--color-muted)] border-opacity-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                required
              />
            </div>

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2"
              >
                Contact Person Name *
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Full name of contact person"
                className="w-full px-4 py-3 border border-[var(--color-muted)] border-opacity-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                required
              />
            </div>

            <div>
              <label
                htmlFor="relationship"
                className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2"
              >
                Relationship *
              </label>
              <select
                id="relationship"
                value={formData.relationship}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    relationship: e.target.value as RelationshipEnum,
                  })
                }
                className="w-full px-4 py-3 border border-[var(--color-muted)] border-opacity-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                required
              >
                {Object.values(RelationshipEnum).map((relationship) => (
                  <option key={relationship} value={relationship}>
                    {relationship.charAt(0) +
                      relationship.slice(1).toLowerCase().replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            <fieldset>
              <legend className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2">
                Verification Method *
              </legend>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="otp"
                    name="verificationType"
                    value={VerificationType.OTP}
                    checked={formData.verificationType === VerificationType.OTP}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        verificationType: e.target.value as VerificationType,
                      })
                    }
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
                  />
                  <label htmlFor="otp" className="flex items-center gap-2 cursor-pointer">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                    </svg>
                    <span className="text-sm text-[var(--color-on-surface)]">SMS OTP</span>
                  </label>
                </div>
                
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="voice-call"
                    name="verificationType"
                    value={VerificationType.VOICE_CALL}
                    checked={formData.verificationType === VerificationType.VOICE_CALL}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        verificationType: e.target.value as VerificationType,
                      })
                    }
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
                  />
                  <label htmlFor="voice-call" className="flex items-center gap-2 cursor-pointer">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                    </svg>
                    <span className="text-sm text-[var(--color-on-surface)]">Voice Call (Auto-verify)</span>
                  </label>
                </div>
              </div>
              <p className="mt-2 text-xs text-[var(--color-on-surface)] opacity-70">
                {formData.verificationType === VerificationType.VOICE_CALL 
                  ? "Voice call verification will automatically verify the number" 
                  : "Choose how you want to receive the verification code"
                }
              </p>
            </fieldset>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-3 text-[var(--color-on-surface)] opacity-80 bg-[var(--color-surface)] rounded-lg hover:bg-[var(--color-muted)] bg-opacity-30 transition-colors font-medium"
              >
                Cancel
              </button>
              <Button variant="danger" disabled={loading || !!phoneError}>
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Adding...
                  </div>
                ) : (
                  <>Add & {formData.verificationType === VerificationType.VOICE_CALL ? 'Verify via Voice Call' : 'Send OTP'}</>
                )}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[var(--color-success)] bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-[var(--color-on-success)]"
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
              <h4 className="text-lg font-medium text-[var(--color-on-background)] mb-2">
                Verification Code Sent
              </h4>
              <p className="text-[var(--color-on-surface)] opacity-70">
                We've sent a 6-digit verification code {formData.verificationType === VerificationType.VOICE_CALL ? 'via voice call' : 'via SMS'} to{" "}
                <span className="font-medium text-[var(--color-on-background)]">
                  {formData.phone}
                </span>
              </p>
              <p className="text-sm text-[var(--color-on-surface)] opacity-70 mt-1">
                Please enter the code to verify this number
              </p>
            </div>

            <div>
              <label
                htmlFor="otp"
                className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2"
              >
                Enter Verification Code *
              </label>
              <input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000000"
                className="w-full px-4 py-3 border border-[var(--color-muted)] border-opacity-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest font-mono"
                maxLength={6}
                required
              />
            </div>

            <div className="text-center">
              {otpTimer > 0 ? (
                <p className="text-sm text-[var(--color-on-surface)] opacity-70 flex items-center justify-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Resend OTP in {otpTimer} seconds
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-sm text-[var(--color-on-primary)] hover:text-[var(--color-on-primary)] underline font-medium"
                >
                  Resend OTP
                </button>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setStep("add")}
                className="flex-1 px-4 py-3 text-[var(--color-on-surface)] opacity-80 bg-[var(--color-surface)] rounded-lg hover:bg-[var(--color-muted)] bg-opacity-30 transition-colors font-medium"
              >
                ← Back
              </button>
              <Button disabled={loading || otp.length !== 6}>
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Verifying...
                  </div>
                ) : (
                  "✓ Verify & Save"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  );
}
