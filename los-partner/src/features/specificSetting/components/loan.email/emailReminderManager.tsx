import { useState } from "react";
import { FaFlask } from "react-icons/fa";
// import LoanEmailReminder from "./loanEmailReminder";
import { EmailReminderLogs } from "./emailReminderLogs";
import TestEmailReminder from "./testEmailReminder";

interface EmailReminderManagerProps {
  readonly brandId: string;
  readonly loanId?: string;
  readonly showBulkActions?: boolean;
  readonly size?: "sm" | "md" | "lg";
  readonly className?: string;
}

export function EmailReminderManager({
  brandId,
  loanId,
  showBulkActions = true,
  size = "sm",
  className = "",
}: EmailReminderManagerProps) {
  const [showLogs, setShowLogs] = useState(false);
  const [showTestEmail, setShowTestEmail] = useState(false);
console.log({ brandId, loanId, showBulkActions, size, className });
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Main Actions Row */}
      {/* <div className="flex items-center gap-2">
        <LoanEmailReminder
          brandId={brandId}
          loanId={loanId}
          triggerType="manual"
          buttonText={loanId ? "Send Reminder" : "Send Bulk Reminders"}
          buttonVariant="primary"
          size={size}
          onSuccess={() => {
            // Optionally auto-show logs after successful send
            // setShowLogs(true);
          }}
        />

        {showBulkActions && !loanId && (
          <>
            <div className="h-4 w-px bg-[var(--color-muted)] opacity-30" />

            <LoanEmailReminder
              brandId={brandId}
              triggerType="automatic"
              campaignId="overdue-campaign"
              buttonText="Process Overdue"
              buttonVariant="secondary"
              size={size}
              showConfirmDialog={true}
            />
          </>
        )}
      </div> */}

      {/* Test Email Row */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowTestEmail(true)}
          className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 border border-blue-300 text-blue-700 hover:bg-blue-50 bg-blue-50 bg-opacity-50`}
        >
          <FaFlask className="w-3 h-3 text-blue-600" />
          Test Email
        </button>
        <span className="text-xs text-gray-500">
          Send a test email to any address for a specific loan
        </span>
      </div>

      {/* Modals */}
      <EmailReminderLogs
        brandId={brandId}
        isOpen={showLogs}
        onClose={() => setShowLogs(false)}
      />

      <TestEmailReminder
        brandId={brandId}
        isOpen={showTestEmail}
        onClose={() => setShowTestEmail(false)}
      />
    </div>
  );
}

export default EmailReminderManager;
