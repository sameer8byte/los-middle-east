import React, { useRef, useState } from "react";
import Dialog from "../../../../common/dialog";
import { useQueryParams } from "../../../../hooks/useQueryParams";
import { useParams } from "react-router-dom";
import { FiUpload } from "react-icons/fi";
import { Spinner } from "../../../../common/ui/spinner";
import { createRepaymentTimeline } from "../../../../shared/services/api/collection.api";
import { useAppSelector } from "../../../../shared/redux/store";

export function CreateRepaymentTimeline() {
  const { brandId } = useParams();
  const auth = useAppSelector((state) => state.auth);
  const { getQuery, removeQuery } = useQueryParams();
  const createRepaymentTimelineLoanId = getQuery("createRepaymentTimelineLoanId");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!message.trim()) newErrors.message = "Message is required.";
    // if (!fileRef.current?.files?.[0]) newErrors.file = "File is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");

    if (!brandId || !createRepaymentTimelineLoanId) return;
    if (!validate()) return;
    // invalidate aith .data.id
    if (!auth.data.id) {
      setSubmitError("User ID is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("loanId", createRepaymentTimelineLoanId);
        formData.append("partnerUserId", auth.data.id); // Assuming brandId is the partner user ID
      formData.append("message", message);
      if( fileRef.current?.files?.[0])
      formData.append("file", fileRef.current!.files![0]);

      await createRepaymentTimeline(brandId, formData);
      setSubmitSuccess("Repayment timeline uploaded successfully.");
      setMessage("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setSubmitError((err as Error).message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileClick = () => {
    fileRef.current?.click();
  };


  return (
    <Dialog
      title="Create Repayment Timeline"
      isOpen={!!createRepaymentTimelineLoanId}
      onClose={() => removeQuery("createRepaymentTimelineLoanId")}
    >
      <form onSubmit={handleSubmit} className="space-y-6 p-4">
        <div>
          <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.message
                ? "border-red-500 focus:ring-red-500"
                : "border-[var(--color-muted)] border-opacity-50 focus:ring-blue-500"
            }`}
            rows={3}
            placeholder="Enter a message for the repayment timeline"
          />
          {errors.message && <p className="text-sm text-[var(--color-on-error)] mt-1">{errors.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-1">File</label>
          <div
            onClick={handleFileClick}
            className={`cursor-pointer relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              errors.file
                ? "border-red-500 bg-[var(--color-error)] bg-opacity-10"
                : "border-[var(--color-muted)] border-opacity-50 hover:border-blue-500 bg-[var(--color-background)]"
            }`}
          >
            <input
              type="file"
              accept="image/*,application/pdf"
              ref={fileRef}
              onChange={() => {
                if (fileRef.current?.files?.[0]) {
                  setErrors((prev) => ({ ...prev, file: "" }));
                }
              }}
              className="hidden"
            />
            <FiUpload className="mx-auto h-8 w-8 text-[var(--color-on-surface)] opacity-50 mb-2" />
            <p className="text-sm text-[var(--color-on-surface)] opacity-70">
              {fileRef.current?.files?.[0]?.name || "Click to upload a file"}
            </p>
            <p className="text-xs text-[var(--color-on-surface)] opacity-70 mt-1">PNG, JPG, or PDF (max 5MB)</p>
          </div>
          {errors.file && <p className="mt-1 text-sm text-[var(--color-on-error)]">{errors.file}</p>}
        </div>

        {submitError && <div className="text-[var(--color-on-error)] text-sm font-medium">{submitError}</div>}
        {submitSuccess && <div className="text-[var(--color-on-success)] text-sm font-medium">{submitSuccess}</div>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg font-medium hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isSubmitting && (
                <Spinner theme='light' />
          )}
          {isSubmitting ? "Uploading..." : "Upload Document"}
        </button>
      </form>
    </Dialog>
  );
}
