import { useState, useCallback } from "react";
import { FaEnvelope, FaCheckCircle, FaExclamationTriangle, FaClock } from "react-icons/fa";
import { processEmailReminders } from "../../../../shared/services/api/loan.api";
import { useToast } from "../../../../context/toastContext";
import Dialog from "../../../../common/dialog";

interface EmailReminderResponse {
  message: string;
  total: number;
  processed: number;
  successful: number;
  failed: number;
}

interface LoanEmailReminderProps {
  readonly brandId: string;
  readonly loanId?: string;
  readonly triggerType?: "manual" | "automatic";
  readonly campaignId?: string;
  readonly buttonText?: string;
  readonly buttonVariant?: "primary" | "secondary" | "outline";
  readonly size?: "sm" | "md" | "lg";
  readonly showConfirmDialog?: boolean;
  readonly onSuccess?: (result: EmailReminderResponse) => void;
  readonly onError?: (error: string) => void;
}

export function LoanEmailReminder({
  brandId,
  loanId,
  triggerType = "manual",
  campaignId,
  buttonText = "Send Email Reminder",
  buttonVariant = "outline",
  size = "sm",
  showConfirmDialog = true,
  onSuccess,
  onError,
}: LoanEmailReminderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<EmailReminderResponse | null>(null);
  const [showResult, setShowResult] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleEmailSuccess = useCallback((response: EmailReminderResponse) => {
    setResult(response);
    setShowResult(true);

    if (response.successful > 0) {
      const pluralSuffix = response.successful > 1 ? "s" : "";
      const message = loanId
        ? "Email reminder sent successfully for loan"
        : `${response.successful} email reminder${pluralSuffix} sent successfully`;
      showSuccess(message);
      onSuccess?.(response);
    }
  }, [loanId, showSuccess, onSuccess]);

  const handleEmailError = useCallback((response: EmailReminderResponse, errorMessage?: string) => {
    if (response.failed > 0) {
      const pluralSuffix = response.failed > 1 ? "s" : "";
      const message = loanId
        ? "Failed to send email reminder for loan"
        : `${response.failed} email reminder${pluralSuffix} failed to send`;
      showError(message);
      onError?.(message);
    } else if (errorMessage) {
      showError(errorMessage);
      onError?.(errorMessage);
    }
  }, [loanId, showError, onError]);

  const sendEmailReminders = useCallback(async () => {
    try {
      setIsLoading(true);

      const response = await processEmailReminders(brandId, {
        loanId,
        triggerType,
        campaignId,
      });

      if (response.successful > 0) {
        handleEmailSuccess(response);
      } else {
        handleEmailError(response);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send email reminder";
      handleEmailError({ successful: 0, failed: 1, total: 0, processed: 0, message: "" }, errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [brandId, loanId, triggerType, campaignId, handleEmailSuccess, handleEmailError]);

  const handleSendReminder = useCallback(async () => {
    if (showConfirmDialog && !showConfirm) {
      setShowConfirm(true);
      return;
    }

    setShowConfirm(false);
    await sendEmailReminders();
  }, [showConfirmDialog, showConfirm, sendEmailReminders]);

  const getButtonClass = () => {
    const baseClass = "inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
    
    const sizeClasses = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base",
    };

    const variantClasses = {
      primary: "bg-[#EA5E18] text-white hover:bg-[#d54e0f]",
      secondary: "bg-[var(--color-secondary)] bg-opacity-10 text-[var(--color-on-secondary)] hover:bg-[var(--color-secondary)] bg-opacity-20",
      outline: "border border-[var(--color-muted)] border-opacity-50 text-[var(--color-on-background)] hover:bg-[var(--color-surface)]",
    };

    return `${baseClass} ${sizeClasses[size]} ${variantClasses[buttonVariant]}`;
  };

  const getResultTitle = (result: EmailReminderResponse) => {
    if (result.successful > 0) return "Reminders Sent";
    if (result.failed > 0) return "Some Failures";
    return "No Reminders Sent";
  };

  return (
    <>
      <button
        onClick={handleSendReminder}
        disabled={isLoading}
        className={getButtonClass()}
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <FaEnvelope className="w-4 h-4" />
            {buttonText}
          </>
        )}
      </button>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <Dialog
        isOpen={showConfirm}  
        onClose={() => setShowConfirm(false)}
        title="Confirm Send Email Reminder"
        size="sm"
        >
          <div >
            <div className="flex items-center mb-4">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-[#EA5E18] bg-opacity-10">
                <FaEnvelope className="h-6 w-6 text-on-primary" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium text-[var(--color-on-background)] mb-2">
                Send Email Reminder
              </h3>
              <p className="text-sm text-[var(--color-on-surface)] opacity-70 mb-4">
                {loanId
                  ? "Are you sure you want to send an email reminder for this loan?"
                  : "Are you sure you want to process email reminders for all eligible loans?"}
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-[var(--color-on-surface)] opacity-70 hover:opacity-100 transition-opacity"
              >
                Cancel
              </button>
              <button
                onClick={handleSendReminder}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium bg-[#EA5E18] text-white rounded-lg hover:bg-[#d54e0f] disabled:opacity-50"
              >
                {isLoading ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Result Dialog */}
      {showResult && result && (
        <Dialog
          title="Email Reminder Results"
          isOpen={showResult}
          onClose={() => setShowResult(false)}
          size="md"
        >
          <div className="p-6">
            <div className="text-center mb-6">
              {result.successful > 0 && (
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaCheckCircle className="w-8 h-8 text-green-600" />
                </div>
              )}
              {result.failed > 0 && result.successful === 0 && (
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaExclamationTriangle className="w-8 h-8 text-red-600" />
                </div>
              )}
              {result.successful === 0 && result.failed === 0 && (
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaClock className="w-8 h-8 text-gray-600" />
                </div>
              )}
              
              <h3 className="text-lg font-semibold text-[var(--color-on-background)] mb-2">
                {getResultTitle(result)}
              </h3>
              <p className="text-sm text-[var(--color-on-surface)] opacity-70">
                {result.message}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 bg-[var(--color-surface)] rounded-lg">
                <div className="text-2xl font-bold text-[var(--color-on-background)]">{result.total}</div>
                <div className="text-sm text-[var(--color-on-surface)] opacity-70">Total Loans</div>
              </div>
              <div className="text-center p-4 bg-[var(--color-surface)] rounded-lg">
                <div className="text-2xl font-bold text-[var(--color-on-background)]">{result.processed}</div>
                <div className="text-sm text-[var(--color-on-surface)] opacity-70">Processed</div>
              </div>
            </div>

            {result.processed > 0 && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-700">{result.successful}</div>
                  <div className="text-sm text-green-600">Successful</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-2xl font-bold text-red-700">{result.failed}</div>
                  <div className="text-sm text-red-600">Failed</div>
                </div>
              </div>
            )}

            <div className="flex justify-center">
              <button
                onClick={() => setShowResult(false)}
                className="px-6 py-2 bg-[#EA5E18] text-white rounded-lg hover:bg-[#d54e0f] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}

export default LoanEmailReminder;
