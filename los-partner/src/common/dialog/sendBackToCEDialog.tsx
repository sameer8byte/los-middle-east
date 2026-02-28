import { useState } from "react";
import Dialog from "./index";
import { Button } from "../ui/button";

interface SendBackToCEDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, comments: string) => Promise<void>;
  customerName: string;
  loading?: boolean;
}

export function SendBackToCEDialog({
  isOpen,
  onClose,
  onConfirm,
  customerName,
  loading = false,
}: SendBackToCEDialogProps) {
  const [reason, setReason] = useState("");
  const [comments, setComments] = useState("");

  const handleConfirm = async () => {
    if (!reason.trim()) {
      return;
    }
    await onConfirm(reason, comments);
    // Reset form after successful submission
    setReason("");
    setComments("");
  };

  const handleClose = () => {
    if (!loading) {
      setReason("");
      setComments("");
      onClose();
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="Send Back to Credit Executive">
      <div>
        <div className="flex items-center mb-4">
          <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-[var(--color-secondary)] bg-opacity-10">
            <svg
              className="h-6 w-6 text-[var(--color-warning)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
        </div>

        <div className="text-center">
          <h3 className="text-lg font-medium text-[var(--color-on-background)] mb-2">
            Send Back to Credit Executive
          </h3>
          <p className="text-sm text-[var(--color-on-surface)] opacity-70 mb-4">
            Are you sure you want to send back the loan for{" "}
            <span className="font-semibold">{customerName}</span> to Credit Executive?
          </p>

          {/* Reason Input */}
          <div className="text-left mb-4">
            <label
              htmlFor="sendBackReason"
              className="block text-sm font-medium text-[var(--color-on-background)] mb-2"
            >
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              id="sendBackReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a reason for sending back to CE..."
              className="w-full p-3 border border-[var(--color-muted)] border-opacity-50 rounded-lg bg-[var(--color-background)] focus:ring-2 focus:ring-[#EA5E18] text-[var(--color-on-background)] resize-none"
              rows={3}
              required
              disabled={loading}
            />
          </div>

          {/* Comments Input */}
          <div className="text-left mb-4">
            <label
              htmlFor="sendBackComments"
              className="block text-sm font-medium text-[var(--color-on-background)] mb-2"
            >
              Additional Comments (Optional)
            </label>
            <textarea
              id="sendBackComments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Any additional comments..."
              className="w-full p-3 border border-[var(--color-muted)] border-opacity-50 rounded-lg bg-[var(--color-background)] focus:ring-2 focus:ring-[#EA5E18] text-[var(--color-on-background)] resize-none"
              rows={2}
              disabled={loading}
            />
          </div>

          {/* Warning Box */}
          <div className="bg-[var(--color-secondary)] bg-opacity-10 border border-[var(--color-warning)] border-opacity-30 rounded-md p-3 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-[var(--color-warning)]">
                  <strong>Warning:</strong> This will change the loan status back to PENDING and
                  the Credit Executive will need to re-evaluate and approve the loan.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            // className="bg-red-600 hover:bg-red-700 text-white"
            disabled={loading || !reason.trim()}
            loading={loading}
            variant="danger"
          >
            {loading ? "Sending Back..." : "Yes, Send Back"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
