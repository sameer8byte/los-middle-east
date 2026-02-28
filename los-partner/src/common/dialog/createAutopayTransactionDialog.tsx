import { useState } from "react";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";
import Dialog from ".";
import { autopayApi } from "../../shared/services/api/autopay.api";

interface CreateAutopayTransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  loanDetails: {
    loanId: string;
    formattedLoanId: string;
    customerName: string;
    amount: number;
    userId: string;
  };
  brandId: string;
}

export const CreateAutopayTransactionDialog = ({
  isOpen,
  onClose,
  onSuccess,
  loanDetails,
  brandId,
}: CreateAutopayTransactionDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
       await autopayApi.createAutopayTransaction({
        brandId: brandId,
        userId: loanDetails.userId,
        loanId: loanDetails.loanId,
      });
    
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create autopay transaction"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create Autopay Transaction"
    >
      {/* Body */}
      <div className="space-y-4">
        {/* Loan Information Card */}
        <div className="bg-[var(--color-surface)] rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
  
            <div className="flex-1">
              <p className="text-xs text-[var(--color-on-surface)] opacity-70">
                Customer Name
              </p>
              <p className="text-sm font-medium text-[var(--color-on-background)]">
                {loanDetails.customerName}
              </p>
            </div>
          </div>

          <div className="border-t border-[var(--color-muted)] border-opacity-30 pt-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--color-on-surface)] opacity-70">
                Loan ID
              </span>
              <span className="text-sm font-semibold text-[var(--color-on-background)]">
                #{loanDetails.formattedLoanId}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--color-on-surface)] opacity-70">
                Loan Amount
              </span>
              <span className="text-sm font-semibold text-[var(--color-primary)]">
                ₹{loanDetails.amount?.toLocaleString("en-IN") || "0"}
              </span>
            </div>
          </div>
        </div>

        {/* Info Text */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-800">
            <span className="font-semibold">Note:</span> This will create an
            autopay transaction and initiate the UPI mandate process. The
            customer will receive a confirmation on their registered mobile
            number.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs text-red-800">
              <span className="font-semibold">Error:</span> {error}
            </p>
          </div>
        )}

        {/* Terms & Conditions */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-800 leading-relaxed">
            ⚠️ <span className="font-semibold">Important:</span> Ensure the
            customer has agreed to the autopay terms before proceeding.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex mt-2 gap-3">
        <Button
          onClick={onClose}
          variant="outline"
          className="flex-1"
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="primary"
          className="flex-1"
          disabled={loading}
        >
          {loading ? (
            <>
              <Spinner theme="light" />
              <span>Creating...</span>
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m0 0h6"
                />
              </svg>
              <span>Create Autopay</span>
            </>
          )}
        </Button>
      </div>
    </Dialog>
  );
};
