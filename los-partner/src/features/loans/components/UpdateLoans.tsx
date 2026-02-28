import { useParams } from "react-router-dom";
import Dialog from "../../../common/dialog";
import { useQueryParams } from "../../../hooks/useQueryParams";
import { useEffect, useState } from "react";
 
import { CgSpinner } from "react-icons/cg";
import { canUpdateLoanStatus } from "../../../lib/canUpdateLoanStatus";
import { LoanStatusEnum } from "../../../constant/enum";
import { getLoanById, updateLoan } from "../../../shared/services/api/loan.api";
import { Loan } from "../../../shared/types/loan";

export function UpdateLoans() {
  const { brandId } = useParams();
  const { removeQuery, getQuery } = useQueryParams();
  const loanId = getQuery("editLoanId");
  const [loan, setLoan] = useState<Loan | null>(null);

  const [errors, setErrors] = useState<{ status?: string; reason?: string }>({});
  const [form, setForm] = useState<{
    loanId: string;
    userId: string;
    status: LoanStatusEnum | "";
    reason: string;
  }>({
    loanId: "",
    userId: "",
    status: "",
    reason: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submissionError, setSubmissionError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  useEffect(() => {
    const fetchLoan = async () => {
      if (!loanId || !brandId) return;
      try {
        const response = await getLoanById(brandId, loanId);
        setLoan(response);
        setForm((prev) => ({
          ...prev,
          loanId: response.id,
          userId: response.userId,
          status: response.status,
        }));
      } catch (error) {
        console.error("Error fetching loan:", error);
      }
    };

    fetchLoan();
  }, [loanId, brandId]);

  const validateForm = () => {
    const newErrors: typeof errors = {};
    if (!form.status) newErrors.status = "Status is required";
    if (!form.reason) newErrors.reason = "Reason is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEditLoan = async () => {
    if (!loan || !loan.status || !loanId || !brandId) return;
    if (!validateForm()) return;

    setLoading(true);
    setSubmissionError("");
    setSuccess(false);

    if (!canUpdateLoanStatus(loan.status, form.status as LoanStatusEnum)) {
      setSubmissionError(
        `Cannot update loan status from ${loan.status} to ${form.status}`
      );
      setLoading(false);
      return;
    }

    try {
      const response = await updateLoan(loanId, brandId, {
        loanId,
        status: form.status as LoanStatusEnum,
        reason: form.reason,
      });

      if (response) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          removeQuery("editLoanId");
        }, 1500);
      }
    } catch (err) {
      console.error("Error updating loan:", err);
      setSubmissionError("Failed to update loan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={!!getQuery("editLoanId")}
      onClose={() => removeQuery("editLoanId")}
      title="Update Loan Status"
    >
      <div className="w-full space-y-6">
        {success && (
          <div className="text-[var(--color-on-success)] bg-[var(--color-success)] bg-opacity-10 border border-green-300 p-3 rounded-md text-sm">
            ✅ Loan updated successfully.
          </div>
        )}

        {submissionError && (
          <div className="text-[var(--color-on-error)] bg-[var(--color-error)] bg-opacity-10 border border-red-300 p-3 rounded-md text-sm">
            ❌ {submissionError}
          </div>
        )}

        <div className="space-y-5">
          {/* Status Select */}
          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-[var(--foreground)] mb-1"
            >
              Status <span className="text-error">*</span>
            </label>
            <select
              name="status"
              id="status"
              value={form.status}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.status ? "border-error" : "border-[var(--border)]"
              }`}
            >
              <option value="">-- Select Status --</option>
              {Object.values(LoanStatusEnum).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            {errors.status && (
              <p className="text-sm text-error mt-1">{errors.status}</p>
            )}
          </div>

          {/* Reason Input */}
          <div>
            <label
              htmlFor="reason"
              className="block text-sm font-medium text-[var(--color-on-background)] mb-1"
            >
              Reason <span className="text-error">*</span>
            </label>
            <input
              type="text"
              name="reason"
              id="reason"
              value={form.reason}
              onChange={handleChange}
              placeholder="e.g. Payment verified, updated status accordingly"
              className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.reason ? "border-error" : "border-[var(--color-muted)] border-opacity-50"
              }`}
            />
            {errors.reason && (
              <p className="text-sm text-error mt-1">{errors.reason}</p>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            onClick={() => removeQuery("editLoanId")}
            className="px-4 py-2 text-sm text-[var(--muted-foreground)] hover:bg-[var(--secondary-bg)] rounded-md border border-[var(--border)]"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleEditLoan}
            disabled={loading}
            className="px-4 py-2 text-sm bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-md hover:bg-[var(--color-primary-hover)] disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <>
                <CgSpinner className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Loan"
            )}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
