import { useState, useEffect } from "react";
 import { FiEyeOff, FiCheck, FiX, FiAlertCircle } from "react-icons/fi";
import { FaEye } from "react-icons/fa";
import { Spinner } from "../../../common/ui/spinner";
import { resetPassword } from "../../../shared/services/api/auth.api";

// Types for password strength
interface PasswordChecks {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
}

interface PasswordStrength {
  checks: PasswordChecks;
  score: number;
  strength: "weak" | "medium" | "strong";
}

// Password strength checker
const checkPasswordStrength = (password: string): PasswordStrength => {
  const checks: PasswordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;
  const strength = score < 2 ? "weak" : score < 4 ? "medium" : "strong";

  return { checks, score, strength };
};

export function ResetPassword() {
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    checks: {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false,
    },
    score: 0,
    strength: "weak",
  });
  const [touched, setTouched] = useState({
    newPassword: false,
    confirmPassword: false,
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get("token") || "";
    setToken(tokenFromUrl);
  }, []);

  useEffect(() => {
    if (newPassword) {
      setPasswordStrength(checkPasswordStrength(newPassword));
    }
  }, [newPassword]);

  const validatePasswords = () => {
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }
    if (passwordStrength.score < 3) {
      setError("Please choose a stronger password.");
      return false;
    }
    return true;
  };

  const handleResetPassword = async () => {
    setError("");
    setMessage("");

    if (!validatePasswords()) {
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(token, newPassword);
      setMessage(
        "Password reset successfully. You can now log in with your new password."
      );
      setNewPassword("");
      setConfirmPassword("");
      setTouched({ newPassword: false, confirmPassword: false });
      // redirect to login page after a short delay
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    } catch (error) {
      console.error("Password reset error:", error);
      setError(
        (error as Error).message ||
          "An error occurred while resetting the password."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg border border-[var(--color-muted)] border-opacity-20">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-[var(--color-error)] bg-opacity-10 rounded-full flex items-center justify-center mb-4">
              <FiAlertCircle className="w-8 h-8 text-[var(--color-on-error)]" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--color-on-background)] mb-2">
              Invalid Reset Link
            </h2>
            <p className="text-[var(--color-on-surface)] opacity-70">
              The reset token is missing or invalid. Please check your email for
              the correct link or request a new password reset.
            </p>
          </div>
          <button
            onClick={() => (window.location.href = "/login")}
            className="w-full py-3 px-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold rounded-lg transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case "weak":
        return "text-[var(--color-on-error)] bg-[var(--color-error)] bg-opacity-10 border border-[var(--color-error)] border-opacity-30";
      case "medium":
        return "text-[var(--color-warning)] bg-[var(--color-secondary)] bg-opacity-10 border border-[var(--color-warning)] border-opacity-30";
      case "strong":
        return "text-[var(--color-on-success)] bg-[var(--color-success)] bg-opacity-10 border border-[var(--color-success)] border-opacity-30";
      default:
        return "text-[var(--color-on-surface)] opacity-70 bg-[var(--color-background)] border-[var(--color-muted)] border-opacity-30";
    }
  };

  const getStrengthBarColor = (strength: string) => {
    switch (strength) {
      case "weak":
        return "bg-[var(--color-error)] bg-opacity-100";
      case "medium":
        return "bg-[var(--color-secondary)] bg-opacity-100";
      case "strong":
        return "bg-[var(--color-success)] bg-opacity-100";
      default:
        return "bg-[var(--color-muted)] bg-opacity-50";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg border border-[var(--color-muted)] border-opacity-20">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-[var(--color-primary)] bg-opacity-15 rounded-full flex items-center justify-center mb-4">
            <FiCheck className="w-8 h-8 text-[var(--color-on-primary)]" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--color-on-background)] mb-2">
            Reset Your Password
          </h2>
          <p className="text-[var(--color-on-surface)] opacity-70">
            Choose a strong password to secure your account
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleResetPassword();
          }}
          className="space-y-6"
        >
          {/* New Password Field */}
          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-semibold text-[var(--color-on-surface)] opacity-80 mb-2"
            >
              New Password
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your new password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError("");
                }}
                onBlur={() =>
                  setTouched((prev) => ({ ...prev, newPassword: true }))
                }
                disabled={isLoading}
                className="w-full px-4 py-3 pr-12 border border-[var(--color-muted)] border-opacity-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                aria-describedby="password-strength"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface)] opacity-70 hover:text-[var(--color-on-surface)] opacity-80 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FiEyeOff size={20} /> : <FaEye size={20} />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {newPassword && touched.newPassword && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--color-on-surface)] opacity-70">
                    Password strength:
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full border ${getStrengthColor(
                      passwordStrength.strength
                    )}`}
                  >
                    {passwordStrength.strength.charAt(0).toUpperCase() +
                      passwordStrength.strength.slice(1)}
                  </span>
                </div>
                <div className="w-full bg-[var(--color-muted)] bg-opacity-30 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getStrengthBarColor(
                      passwordStrength.strength
                    )}`}
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div
                    className={`flex items-center gap-1 ${
                      passwordStrength.checks.length
                        ? "text-[var(--color-on-success)]"
                        : "text-[var(--color-on-surface)] opacity-50"
                    }`}
                  >
                    {passwordStrength.checks.length ? (
                      <FiCheck size={12} />
                    ) : (
                      <FiX size={12} />
                    )}
                    8+ characters
                  </div>
                  <div
                    className={`flex items-center gap-1 ${
                      passwordStrength.checks.uppercase
                        ? "text-[var(--color-on-success)]"
                        : "text-[var(--color-on-surface)] opacity-50"
                    }`}
                  >
                    {passwordStrength.checks.uppercase ? (
                      <FiCheck size={12} />
                    ) : (
                      <FiX size={12} />
                    )}
                    Uppercase
                  </div>
                  <div
                    className={`flex items-center gap-1 ${
                      passwordStrength.checks.lowercase
                        ? "text-[var(--color-on-success)]"
                        : "text-[var(--color-on-surface)] opacity-50"
                    }`}
                  >
                    {passwordStrength.checks.lowercase ? (
                      <FiCheck size={12} />
                    ) : (
                      <FiX size={12} />
                    )}
                    Lowercase
                  </div>
                  <div
                    className={`flex items-center gap-1 ${
                      passwordStrength.checks.number
                        ? "text-[var(--color-on-success)]"
                        : "text-[var(--color-on-surface)] opacity-50"
                    }`}
                  >
                    {passwordStrength.checks.number ? (
                      <FiCheck size={12} />
                    ) : (
                      <FiX size={12} />
                    )}
                    Number
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-semibold text-[var(--color-on-surface)] opacity-80 mb-2"
            >
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError("");
                }}
                onBlur={() =>
                  setTouched((prev) => ({ ...prev, confirmPassword: true }))
                }
                disabled={isLoading}
                className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                  touched.confirmPassword &&
                  confirmPassword &&
                  newPassword !== confirmPassword
                    ? "border-red-300 focus:ring-red-500"
                    : touched.confirmPassword &&
                      confirmPassword &&
                      newPassword === confirmPassword
                    ? "border-green-300 focus:ring-green-500"
                    : "border-[var(--color-muted)] border-opacity-50 focus:ring-blue-500"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface)] opacity-70 hover:text-[var(--color-on-surface)] opacity-80 transition-colors"
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                {showConfirmPassword ? (
                  <FiEyeOff size={20} />
                ) : (
                  <FaEye size={20} />
                )}
              </button>
            </div>
            {touched.confirmPassword && confirmPassword && (
              <div className="mt-2 flex items-center gap-1 text-sm">
                {newPassword === confirmPassword ? (
                  <>
                    <FiCheck className="text-[var(--color-on-success)]" size={14} />
                    <span className="text-[var(--color-on-success)]">Passwords match</span>
                  </>
                ) : (
                  <>
                    <FiX className="text-[var(--color-on-error)]" size={14} />
                    <span className="text-[var(--color-on-error)]">Passwords don't match</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={
              isLoading ||
              !newPassword ||
              !confirmPassword ||
              passwordStrength.score < 3
            }
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-all transform ${
              isLoading ||
              !newPassword ||
              !confirmPassword ||
              passwordStrength.score < 3
                ? "bg-[var(--color-muted)] bg-opacity-50 text-[var(--color-on-surface)] opacity-70 cursor-not-allowed"
                : "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            }`}
          >
            {isLoading && <Spinner />}
            {isLoading ? "Resetting Password..." : "Reset Password"}
          </button>
        </form>

        {/* Messages */}
        {error && (
          <div className="mt-6 p-4 bg-[var(--color-error)] bg-opacity-10 border border border-[var(--color-error)] border-opacity-30 rounded-lg">
            <div className="flex items-center gap-2">
              <FiAlertCircle className="text-[var(--color-on-error)]" size={16} />
              <p className="text-[var(--color-on-error)] text-sm font-medium">{error}</p>
            </div>
          </div>
        )}

        {message && (
          <div className="mt-6 p-4 bg-[var(--color-success)] bg-opacity-10 border border border-[var(--color-success)] border-opacity-30 rounded-lg">
            <div className="flex items-center gap-2">
              <FiCheck className="text-[var(--color-on-success)]" size={16} />
              <p className="text-[var(--color-on-success)] text-sm font-medium">{message}</p>
            </div>
            <div className="mt-3">
              <button
                onClick={() => (window.location.href = "/login")}
                className="text-[var(--color-on-success)] text-sm font-semibold hover:text-[var(--color-on-success)] transition-colors"
              >
                Go to Login →
              </button>
            </div>
          </div>
        )}

        {/* Security Note */}
        <div className="mt-6 p-4 bg-[var(--color-primary)] bg-opacity-10 border border border-[var(--color-primary)] border-opacity-30 rounded-lg">
          <div className="flex items-start gap-2">
            <FiAlertCircle className="text-[var(--color-on-primary)] mt-0.5" size={16} />
            <div>
              <p className="text-[var(--color-on-primary)] text-sm font-medium mb-1">
                Security Tip
              </p>
              <p className="text-[var(--color-on-primary)] text-xs">
                Use a unique password that you don't use for other accounts.
                Consider using a password manager to generate and store secure
                passwords.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
