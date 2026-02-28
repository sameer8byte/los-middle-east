import { useState } from "react";
import { FaEnvelope, FaCheckCircle, FaExclamationTriangle, FaFlask } from "react-icons/fa";
import Dialog from "../../../../common/dialog";
import { Button } from "../../../../common/ui/button";
import { useToast } from "../../../../context/toastContext";
import { sendTestEmailReminder } from "../../../../shared/services/api/loan.api";
import { EmailType, EMAIL_TYPE_LABELS } from "../../../../constant/emailTypes";

interface TestEmailProps {
  readonly brandId: string;
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

interface TestEmailForm {
  loanId: string;
  email: string;
  emailType: EmailType;
}

export function TestEmailReminder({
  brandId,
  isOpen,
  onClose,
}: TestEmailProps) {
  const [form, setForm] = useState<TestEmailForm>({
    loanId: "",
    email: "",
    emailType: EmailType.SEVEN_DAY_REMINDER
  });
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const { showSuccess, showError } = useToast();

  const emailTypes = [
    { value: EmailType.SEVEN_DAY_REMINDER, label: EMAIL_TYPE_LABELS[EmailType.SEVEN_DAY_REMINDER] },
    { value: EmailType.THREE_DAY_REMINDER, label: EMAIL_TYPE_LABELS[EmailType.THREE_DAY_REMINDER] },
    { value: EmailType.ONE_DAY_REMINDER, label: EMAIL_TYPE_LABELS[EmailType.ONE_DAY_REMINDER] },
    { value: EmailType.OVERDUE_REMINDER, label: EMAIL_TYPE_LABELS[EmailType.OVERDUE_REMINDER] },
    { value: EmailType.CUSTOM_REMINDER, label: EMAIL_TYPE_LABELS[EmailType.CUSTOM_REMINDER] },
    { value: EmailType.PAYMENT_DUE_REMINDER, label: EMAIL_TYPE_LABELS[EmailType.PAYMENT_DUE_REMINDER] },
    { value: EmailType.FINAL_NOTICE, label: EMAIL_TYPE_LABELS[EmailType.FINAL_NOTICE] }
  ];

  const handleInputChange = (field: keyof TestEmailForm, value: string) => {
    if (field === 'emailType') {
      setForm(prev => ({ ...prev, [field]: value as EmailType }));
    } else {
      setForm(prev => ({ ...prev, [field]: value }));
    }
  };

  const sendTestEmail = async () => {
    if (!form.loanId.trim() || !form.email.trim()) {
      showError("Please fill in all required fields");
      return;
    }

    // Ensure email type is not null or empty
    if (!form.emailType || !Object.values(EmailType).includes(form.emailType)) {
      showError("Please select a valid email type");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      showError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      // Call the test email API with validated data
      const response = await sendTestEmailReminder(brandId, {
        loanId: form.loanId.trim(),
        email: form.email.trim(),
        emailType: form.emailType
      });
      
      setResult({ success: true, message: response.message || "Test email sent successfully!" });
      showSuccess("Test email sent successfully!");
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send test email";
      setResult({ success: false, message: errorMessage });
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      loanId: "",
      email: "",
      emailType: EmailType.SEVEN_DAY_REMINDER
    });
    setResult(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="Send Test Email Reminder" size="md">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <FaFlask className="h-6 w-6 text-blue-600" />
          </div>
          <p className="text-sm text-[var(--color-on-surface)] opacity-70">
            Send a test email reminder to any email address for a specific loan
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Loan ID Input */}
          <div>
            <label htmlFor="loanId" className="block text-sm font-medium text-[var(--color-on-background)] mb-2">
              Loan ID <span className="text-red-500">*</span>
            </label>
            <input
              id="loanId"
              type="text"
              value={form.loanId}
              onChange={(e) => handleInputChange("loanId", e.target.value)}
              placeholder="Enter loan ID (e.g., QL12345)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EA5E18] focus:border-transparent placeholder-gray-400"
              disabled={isLoading}
            />
          </div>

          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[var(--color-on-background)] mb-2">
              Recipient Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="Enter email address"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EA5E18] focus:border-transparent placeholder-gray-400"
              disabled={isLoading}
            />
          </div>

          {/* Email Type Selection */}
          <div>
            <label htmlFor="emailType" className="block text-sm font-medium text-[var(--color-on-background)] mb-2">
              Email Type
            </label>
            <select
              id="emailType"
              value={form.emailType}
              onChange={(e) => handleInputChange("emailType", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EA5E18] focus:border-transparent"
              disabled={isLoading}
            >
              {emailTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Result Display */}
        {result && (
          <div className={`p-4 rounded-lg border ${
            result.success 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center gap-2">
              {result.success ? (
                <FaCheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <FaExclamationTriangle className="w-5 h-5 text-red-600" />
              )}
              <span className="text-sm font-medium">
                {result.success ? "Success" : "Error"}
              </span>
            </div>
            <p className="text-sm mt-1">{result.message}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
          <Button
            onClick={handleClose}
            variant="outline"
            disabled={isLoading}
          >
            Cancel
          </Button>
          
          <Button
            onClick={sendTestEmail}
            variant="primary"
            disabled={isLoading || !form.loanId.trim() || !form.email.trim() || !form.emailType}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <FaEnvelope className="w-4 h-4" />
                Send Test Email
              </>
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export default TestEmailReminder;
