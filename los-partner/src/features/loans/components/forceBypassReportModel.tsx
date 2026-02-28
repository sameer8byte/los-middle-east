import { useState, useEffect, FC } from "react";
import { useParams } from "react-router-dom";
import { FiAlertTriangle, FiX } from "react-icons/fi";
import { CgSpinner } from "react-icons/cg";
import Dialog from "../../../common/dialog";
import { Button } from "../../../common/ui/button";
import { LoanStatusEnum } from "../../../constant/enum";
import { Loan } from "../../../shared/types/loan";
import {
  getLoanById,
  forceBypassReports,
} from "../../../shared/services/api/loan.api";

interface ForceBypassReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const FIXED_REASONS = [
  "System error while fetching reports",
  "Third-party API downtime",
  "Incorrect report mapping",
  "False negative detected in report",
  "Internal server error",
  "Urgent disbursement required",
  "Compliance exception approved",
];

export const ForceBypassReportModal: FC<ForceBypassReportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { brandId } = useParams();
  const [manualLoanId, setManualLoanId] = useState("");
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    selectedReasons: [] as string[],
    customReason: "",
  });

  const effectiveLoanId = manualLoanId.trim();

  useEffect(() => {
    const fetchLoan = async () => {
      if(effectiveLoanId.trim()==="")return;
      if(effectiveLoanId.length <= 11) return; // Basic validation to avoid unnecessary calls
      if (!effectiveLoanId || !brandId || !isOpen) return;
      setLoading(true);
      setError("");
      try {
        const response = await getLoanById(brandId, effectiveLoanId);
        setLoan(response);
        setForm({ selectedReasons: [], customReason: "" });
      } catch (err) {
        setError("Failed to fetch loan details");
        setLoan(null);
        console.error("Error fetching loan:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLoan();
  }, [effectiveLoanId, brandId, isOpen]);

  const getFinalReason = () => {
    const reasons = [...form.selectedReasons];
    if (form.customReason.trim()) {
      reasons.push(form.customReason.trim());
    }
    return reasons.join(", ");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalReason = getFinalReason();

    if (!loan || !finalReason || !brandId || !effectiveLoanId) {
      setError("Please provide at least one reason before proceeding");
      return;
    }

    if (loan.status !== LoanStatusEnum.PENDING) {
      setError("Only PENDING loans can have reports bypassed");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // Use loan.id (actual ID) instead of effectiveLoanId (user input)
      await forceBypassReports(brandId, loan.id, finalReason);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      let errorMessage = "Failed to bypass reports. Please try again.";
      if (err?.response?.data?.message) {
        const backendMessage = err.response.data.message;
        if (backendMessage.includes("permission")) {
          errorMessage =
            "Access denied. You don't have permission to bypass reports.";
        } else {
          errorMessage = backendMessage;
        }
      } else if (err?.message) errorMessage = err.message;
      else if (typeof err === "string") errorMessage = err;
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReasonToggle = (reason: string) => {
    setForm((prev) => {
      const isSelected = prev.selectedReasons.includes(reason);
      return {
        ...prev,
        selectedReasons: isSelected
          ? prev.selectedReasons.filter((r) => r !== reason)
          : [...prev.selectedReasons, reason],
      };
    });
    setError("");
  };

  const handleRemoveTag = (reason: string) => {
    setForm((prev) => ({
      ...prev,
      selectedReasons: prev.selectedReasons.filter((r) => r !== reason),
    }));
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = e.target;
    setForm((prev) => ({ ...prev, customReason: value }));
    setError("");
  };

  const handleClose = () => {
    setForm({ selectedReasons: [], customReason: "" });
    setError("");
    setSuccess(false);
    setLoan(null);
    setManualLoanId("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="Force Bypass Reports">
      <div className="space-y-6">
        {/* Manual Loan ID Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Enter Formatted loan ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={manualLoanId}
            onChange={(e) => setManualLoanId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. LOAN123456"
            disabled={loading || submitting}
          />
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <CgSpinner className="animate-spin text-2xl text-blue-600" />
            <span className="ml-2 text-gray-600">Loading loan details...</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
            ✅ Reports successfully bypassed!
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-2">
            <FiAlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loan Info + Form */}
        {loan && !loading && (
          <>
            {/* Loan Info */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Loan Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Loan ID:</span>
                  <span className="ml-2 font-mono">{loan.formattedLoanId}</span>
                </div>
                <div>
                  <span className="text-gray-600">Amount:</span>
                  <span className="ml-2 font-semibold">
                    ₹{loan.amount?.toLocaleString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                    {loan.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Form */}
            {loan.status === LoanStatusEnum.PENDING ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-amber-900 mb-2 flex items-center gap-2">
                    <FiAlertTriangle className="w-4 h-4" />
                    Important Notice
                  </h4>
                  <p className="text-sm text-amber-800">
                    This action will bypass all pending report verifications.
                    Select all applicable reasons and provide details if needed.
                  </p>
                </div>

                {/* Reason checkboxes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Reasons <span className="text-red-500">*</span>
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 space-y-2 bg-white max-h-64 overflow-y-auto">
                    {FIXED_REASONS.map((reason) => (
                      <label
                        key={reason}
                        className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={form.selectedReasons.includes(reason)}
                          onChange={() => handleReasonToggle(reason)}
                          disabled={submitting}
                          className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 flex-1">
                          {reason}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* Tags */}
                  {form.selectedReasons.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {form.selectedReasons.map((r) => (
                        <span
                          key={r}
                          className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs"
                        >
                          {r}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(r)}
                            className="hover:text-red-600"
                          >
                            <FiX className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Optional notes */}
                <div>
                  <label
                    htmlFor="customReason"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Additional Notes (optional)
                  </label>
                  <textarea
                    id="customReason"
                    name="customReason"
                    value={form.customReason}
                    onChange={handleCustomChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Add any additional context..."
                    disabled={submitting}
                  />
                </div>

                {/* Submit / Cancel */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    onClick={handleClose}
                    disabled={submitting}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || form.selectedReasons.length === 0}
                    variant="primary"
                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                  >
                    {submitting ? (
                      <>
                        <CgSpinner className="animate-spin -ml-1 mr-2 h-4 w-4" />
                        Processing...
                      </>
                    ) : (
                      "Bypass Reports"
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <h3 className="font-medium text-red-900 mb-2 flex items-center gap-2">
                  <FiAlertTriangle className="w-5 h-5" />
                  Invalid Loan Status
                </h3>
                <p className="text-sm text-red-800">
                  Reports can only be bypassed for loans in{" "}
                  <strong>PENDING</strong> status.
                </p>
                <div className="mt-4">
                  <Button onClick={handleClose} variant="outline">
                    Close
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
};
