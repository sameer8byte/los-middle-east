import { useState } from "react";
import Dialog from "../../../common/dialog";
import { useQueryParams } from "../../../hooks/useQueryParams";
 import { useParams } from "react-router-dom";
import { updateLoanAmount } from "../../../shared/services/api/loan.api";

export function UpdateLoanAmount() {
  const { brandId, 
    customerId
   } = useParams<{ brandId: string; customerId: string }>();
  const { getQuery, removeQuery } = useQueryParams();

  const [loanAmount, setLoanAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);

  const updateLoanId = getQuery("updateLoanId");

  const handleLoanAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow positive numbers with up to 2 decimal places
    if (/^\d*\.?\d{0,2}$/.test(value) || value === "") {
      setLoanAmount(value);
      setError("");
    }
  };

  const validateForm = (): boolean => {
    if (!updateLoanId) {
      setError("No loan ID provided for update.");
      return false;
    }

    if (!brandId || !customerId) {
      setError("Missing brand ID or user ID.");
      return false;
    }

    const amount = parseFloat(loanAmount);
    if (!loanAmount || isNaN(amount) || amount <= 0) {
      setError("Please enter a valid loan amount greater than 0.");
      return false;
    }

    if (amount > 1000000) {
      setError("Loan amount cannot exceed BHD10,00,000.");
      return false;
    }

    return true;
  };

  const handleLoanAmountUpdate = async () => {
    if(!customerId || !brandId || !updateLoanId) {
      setError("Missing required parameters for loan update.");
      return;
    }
    if (!validateForm()) return;

    setIsLoading(true);
    setError("");
    setSuccess(false);

    try {
      const amount = parseFloat(loanAmount);
      const response = await updateLoanAmount(
        brandId!,
        customerId!,
        amount,
        updateLoanId!
      );

      if (response) {
        setSuccess(true);
        setLoanAmount("");

        // Auto-close dialog after success
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        setError(
          response.message || "Failed to update loan amount. Please try again."
        );
      }
    } catch (err) {
      console.error("Error updating loan amount:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    removeQuery("updateLoanId");
    setLoanAmount("");
    setError("");
    setSuccess(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      handleLoanAmountUpdate();
    }
  };

  return (
    <Dialog
      isOpen={!!updateLoanId}
      onClose={handleClose}
      title="Update Loan Amount"
    >
      <div className="space-y-4">
        {success ? (
          <div className="text-center py-4">
            <div className="text-[var(--color-on-success)] text-lg font-semibold mb-2">
              ✓ Loan amount updated successfully!
            </div>
            <p className="text-[var(--color-on-surface)] opacity-70">
              The dialog will close automatically.
            </p>
          </div>
        ) : (
          <>
            <div>
              <label
                htmlFor="loanAmount"
                className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2"
              >
                New Loan Amount (BHD)
              </label>
              <input
                id="loanAmount"
                type="text"
                value={loanAmount}
                onChange={handleLoanAmountChange}
                onKeyPress={handleKeyPress}
                placeholder="Enter amount (e.g., 50000)"
                className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
                autoFocus
              />
              {loanAmount && (
                <p className="text-xs text-[var(--color-on-surface)] opacity-70 mt-1">
                  Amount: BHD
                  {parseFloat(loanAmount || "0").toLocaleString("en-IN")}
                </p>
              )}
            </div>

            {error && (
              <div className="text-[var(--color-on-error)] text-sm bg-[var(--color-error)] bg-opacity-10 p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 text-[var(--color-on-surface)] opacity-80 bg-[var(--color-surface)] hover:bg-[var(--color-muted)] bg-opacity-30 rounded-md transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleLoanAmountUpdate}
                disabled={isLoading || !loanAmount}
                className="flex-1 px-4 py-2 bg-[var(--color-primary)] text-white rounded-md hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-muted)] bg-opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? "Updating..." : "Update Amount"}
              </button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
