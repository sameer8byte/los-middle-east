import { useState } from "react";
import Dialog from ".";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";

interface SkipAutopayConsentDialogProps {
  readonly isOpen: boolean;
  readonly customerName: string;
  readonly loanId: string;
  readonly onConfirm: (reason: string) => Promise<void>;
  readonly onCancel: () => void;
  readonly loading?: boolean;
}

export function SkipAutopayConsentDialog({
  isOpen,
  customerName,
  loanId,
  onConfirm,
  onCancel,
  loading = false,
}: SkipAutopayConsentDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [comments, setComments] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleConfirm = async () => {
    try {
      setError("");
      const reasonText =
        selectedReason === "other" ? comments : selectedReason;
      await onConfirm(reasonText);
      handleClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to skip autopay consent"
      );
    }
  };

  const handleClose = () => {
    setSelectedReason("");
    setComments("");
    setError("");
    onCancel();
  };

  return (
    <Dialog isOpen={isOpen} title="Skip Autopay Consent" onClose={handleClose}>
      <div className="flex items-center mb-4">
        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-orange-100">
          <svg
            className="h-6 w-6 text-orange-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>

      <div className="text-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Skip Autopay Consent?
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Loan: <span className="font-semibold">{loanId}</span>
        </p>
        <p className="text-sm text-gray-500">
          Customer: <span className="font-semibold">{customerName}</span>
        </p>
      </div>

      {/* Warning Message */}
      <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p className="text-sm text-amber-900">
          <strong>⚠️ Warning:</strong> Skipping autopay consent will require
          manual consent process. This may delay loan disbursement.
        </p>
      </div>

      {/* Comments for "Other" reason */}
      {selectedReason === "other" && (
        <div className="mb-4 space-y-2">
          <label
            htmlFor="comments"
            className="block text-sm font-medium text-gray-700"
          >
            Additional Comments <span className="text-red-500">*</span>
          </label>
          <textarea
            id="comments"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Please provide additional details..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            rows={3}
          />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="mt-6 flex flex-row-reverse gap-3">
        <Button
          onClick={handleConfirm}
          disabled={loading}
          className="bg-orange-600 hover:bg-orange-700 text-white"
        >
          {loading ? (
            <>
              <Spinner theme="light" />
              <span>Skipping...</span>
            </>
          ) : (
            "Skip Autopay"
          )}
        </Button>
        <Button
          onClick={handleClose}
          disabled={loading}
          variant="outline"
        >
          Cancel
        </Button>
      </div>
    </Dialog>
  );
}
