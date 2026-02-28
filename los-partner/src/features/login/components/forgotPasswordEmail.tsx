import { useState } from "react";
import { Spinner } from "../../../common/ui/spinner";
import { sendResetPasswordEmail } from "../../../shared/services/api/auth.api";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MESSAGE_CONFIG = {
  success: {
    bg: "bg-[var(--color-success)]",
    border: "border-[var(--color-success)]",
    text: "text-[var(--color-on-success)]",
  },
  error: {
    bg: "bg-[var(--color-error)]",
    border: "border-[var(--color-error)]",
    text: "text-[var(--color-on-error)]",
  },
} as const;

interface Message {
  type: "success" | "error";
  text: string;
}

export function ForgotPasswordEmail() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [emailError, setEmailError] = useState("");

  const validateEmail = (value: string): boolean => {
    if (!value.trim()) {
      setEmailError("Email address is required");
      return false;
    }
    if (!EMAIL_REGEX.test(value)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    
    if (emailError) setEmailError("");
    if (message) setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateEmail(email)) return;

    setIsLoading(true);
    setMessage(null);

    try {
      await sendResetPasswordEmail(email);
      setMessage({
        type: "success",
        text: "Password reset link has been sent to your email address. Please check your inbox."
      });
      setEmail("");
    } catch (error) {
      console.error("Error sending reset password email:", error);
      setMessage({
        type: "error",
        text: "Failed to send reset password link. Please try again or contact support if the problem persists."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const msgStyle = message ? MESSAGE_CONFIG[message.type] : null;

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-[var(--color-on-background)] mb-2">
          Forgot Password
        </h2>
        <p className="text-[var(--color-on-surface)] opacity-70">
          Please enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      {message && msgStyle && (
        <div
          className={`mb-4 p-4 rounded-md ${msgStyle.bg} bg-opacity-10 border ${msgStyle.border} border-opacity-30 ${msgStyle.text}`}
        >
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-1"
          >
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={handleEmailChange}
            placeholder="Enter your email address"
            className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              emailError
                ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                : "border-[var(--color-muted)] border-opacity-50"
            }`}
            disabled={isLoading}
            required
            autoComplete="email"
          />
          {emailError && (
            <p className="mt-1 text-sm text-[var(--color-on-error)]">{emailError}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !email.trim()}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {isLoading ? (
            <>
              <Spinner />
              Sending...
            </>
          ) : (
            "Send Reset Link"
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-[var(--color-on-surface)] opacity-70">
          Remember your password?{" "}
          <button
            type="button"
            onClick={() => window.history.back()}
            className="font-medium text-[var(--color-on-primary)] hover:text-[var(--color-on-primary)] focus:outline-none focus:underline transition-colors duration-200"
          >
            Back to Login
          </button>
        </p>
      </div>
    </div>
  );
}