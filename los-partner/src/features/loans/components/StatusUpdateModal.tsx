import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { FiAlertTriangle } from "react-icons/fi";
import { CgSpinner } from "react-icons/cg";
import Dialog from "../../../common/dialog";
import { Button } from "../../../common/ui/button";
import { LoanStatusEnum } from "../../../constant/enum";
import { Loan } from "../../../shared/types/loan";
import {
  getLoanById,
  reactivateLoan,
} from "../../../shared/services/api/loan.api";
import { LoanStatusBadge } from "../../../common/ui/LoanStatusBadge";

interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanId: string | null;
  onSuccess?: () => void;
}

export function StatusUpdateModal({
  isOpen,
  onClose,
  loanId,
  onSuccess,
}: Readonly<StatusUpdateModalProps>) {
  const { brandId } = useParams();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    status: "" as LoanStatusEnum | "",
    reason: "",
  });

  // This modal only handles reactivating REJECTED loans to PENDING status

  // Fetch loan details when modal opens
  useEffect(() => {
    const fetchLoan = async () => {
      if (!loanId || !brandId || !isOpen) return;

      setLoading(true);
      setError("");

      try {
        const response = await getLoanById(brandId, loanId);
        setLoan(response);
        // Auto-set status to PENDING for rejected loans
        setForm({
          status:
            response.status === LoanStatusEnum.REJECTED
              ? LoanStatusEnum.PENDING
              : "",
          reason: "",
        });
      } catch (err) {
        setError("Failed to fetch loan details");
        console.error("Error fetching loan:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLoan();
  }, [loanId, brandId, isOpen]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loan || !form.status || !form.reason || !brandId) {
      setError("Please fill in all required fields");
      return;
    }

    // Only allow REJECTED loans to be updated to PENDING
    if (loan.status !== LoanStatusEnum.REJECTED) {
      setError("Only rejected loans can be updated");
      return;
    }

    if (form.status !== LoanStatusEnum.PENDING) {
      setError("Rejected loans can only be updated to PENDING status");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await reactivateLoan(brandId, loanId!, form.reason);

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      // Try to extract error message from different possible structures
      let errorMessage = "Failed to reactivate loan. Please try again.";

      if (err?.response?.data?.message) {
        // Format the structured error message for better readability
        const backendMessage = err.response.data.message;
        if (backendMessage.includes("User does not have required access")) {
          errorMessage =
            "Access denied. You don't have the required permissions to reactivate loans. Please contact your administrator.";
        } else {
          errorMessage = backendMessage;
        }
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      }

      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle form changes
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError(""); // Clear error when user types
  };

  // Reset form when modal closes
  const handleClose = () => {
    setForm({ status: "", reason: "" });
    setError("");
    setSuccess(false);
    setLoan(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Reactivate Rejected Loan"
    >
      <div className="space-y-6">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <CgSpinner className="animate-spin text-2xl text-blue-600" />
            <span className="ml-2 text-gray-600">Loading loan details...</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Loan reactivated successfully! Status changed to PENDING.
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-2">
            <FiAlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loan Details & Form */}
        {loan && !loading && loan.status === LoanStatusEnum.REJECTED && (
          <>
            {/* Current Loan Info */}
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <h3 className="font-medium text-red-900 mb-2">
                Rejected Loan Details
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Loan ID:</span>
                  <span className="ml-2 font-mono">{loan.formattedLoanId}</span>
                </div>
                <div>
                  <span className="text-gray-600">Amount:</span>
                  <span className="ml-2 font-semibold">
                    BHD {loan.amount?.toLocaleString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Current Status:</span>
                  <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                    {loan.status}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Customer:</span>
                  <span className="ml-2">
                    {[
                      loan.user?.userDetails?.firstName,
                      loan.user?.userDetails?.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ") || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Update Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Reactivation Notice */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  Reactivation Action
                </h4>
                <p className="text-sm text-blue-800">
                  This action will change the loan status from{" "}
                  <strong>REJECTED</strong> to <strong>PENDING</strong>,
                  allowing it to be reviewed again by the credit team.
                </p>
              </div>

              {/* Hidden Status Field - Always PENDING for rejected loans */}
              <input
                type="hidden"
                name="status"
                value={LoanStatusEnum.PENDING}
              />

              {/* Reason */}
              <div>
                <label
                  htmlFor="reason"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Reason for Reactivation{" "}
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  value={form.reason}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Please provide a reason for reactivating this rejected loan (e.g., additional documents received, error in initial assessment, etc.)..."
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting || !form.status || !form.reason}
                  className="min-w-[120px]"
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <CgSpinner className="animate-spin" />
                      Updating...
                    </div>
                  ) : (
                    "Reactivate Loan"
                  )}
                </Button>
              </div>
            </form>
          </>
        )}

        {/* Message for non-rejected loans */}
        {loan && !loading && loan.status !== LoanStatusEnum.REJECTED && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg flex items-start gap-2">
            <FiAlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium">
                Loan Not Eligible for Reactivation
              </h4>
              <p className="text-sm mt-1">
                Only rejected loans can be reactivated. This loan has status:{" "}
                <LoanStatusBadge status={loan.status} />
              </p>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
