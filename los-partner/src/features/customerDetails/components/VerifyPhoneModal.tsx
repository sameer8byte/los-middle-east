import { useState, useEffect } from "react";
import { verifyAlternatePhoneNumber, resendAlternatePhoneOtp } from "../../../shared/services/api/customer.api";

export interface VerifyPhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  brandId: string;
  alternatePhoneId: string;
  phoneNumber: string;
  onSuccess: () => void;
}

export function VerifyPhoneModal({ 
  isOpen, 
  onClose, 
  customerId, 
  brandId, 
  alternatePhoneId,
  phoneNumber,
  onSuccess 
}: Readonly<VerifyPhoneModalProps>) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpTimer, setOtpTimer] = useState(0);

  const handleClose = () => {
    setOtp('');
    setError(null);
    setOtpTimer(0);
    onClose();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await verifyAlternatePhoneNumber(customerId, brandId, alternatePhoneId, otp);
      onSuccess();
      handleClose();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpTimer > 0) return;

    setLoading(true);
    setError(null);

    try {
      await resendAlternatePhoneOtp(customerId, brandId, alternatePhoneId);
      startOtpTimer();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to resend OTP');
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

  // Start timer when modal opens
  useEffect(() => {
    if (isOpen && otpTimer === 0) {
      startOtpTimer();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Verify Phone Number</h3>
          <button
            onClick={handleClose}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-[var(--destructive)]/10 border border-[var(--destructive)]/20 rounded-lg">
              <p className="text-[var(--destructive)] text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-[var(--muted-foreground)]">
                We've sent an OTP to <strong>{phoneNumber}</strong>
              </p>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                Please enter the 6-digit code to verify this number
              </p>
            </div>

            <div>
              <label htmlFor="verify-otp" className="block text-sm font-medium text-[var(--foreground)] mb-1">
                Enter OTP *
              </label>
              <input
                id="verify-otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit OTP"
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-center text-lg tracking-wider"
                maxLength={6}
                required
              />
            </div>

            <div className="text-center">
              {otpTimer > 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  Resend OTP in {otpTimer} seconds
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-sm text-[var(--primary)] hover:text-[var(--primary)]/80 underline"
                >
                  Resend OTP
                </button>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 text-[var(--foreground)] bg-[var(--secondary-bg)] rounded-lg hover:bg-[var(--secondary-bg)]/80 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
