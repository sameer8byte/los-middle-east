import React, { useRef, useState, useEffect, useCallback } from "react";
import Dialog from "../../../common/dialog";
import { useQueryParams } from "../../../hooks/useQueryParams";
import { useParams } from "react-router-dom";
import { FiUpload, FiAlertCircle, FiFile, FiCheck, FiX } from "react-icons/fi";
import { OtherDocumentTypeEnum } from "../../../constant/enum";
import { upsertOtherDocument } from "../../../shared/services/api/customer.api";
import { OtherDocument } from "../../../shared/types/customers";
import { Button } from "../../../common/ui/button";

// Constants
const ACCEPTED_FILE_TYPES = "image/*,application/pdf,.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.pdf', '.xlsx', '.xls', '.csv'];

// Helper function to format document type
const formatDocumentType = (type: OtherDocumentTypeEnum) => {
  return type.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
};

// Helper function to validate file
const validateFile = (file: File): string | null => {
  const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`;
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`;
  }
  
  return null;
};

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

interface UpsertOtherDocumentsProps {
  editingDocument?: OtherDocument | null;
  onSuccess?: () => void;
}

export function UpsertOtherDocuments({
  editingDocument,
  onSuccess,
}: UpsertOtherDocumentsProps) {
  const { customerId, brandId } = useParams();
  const { getQuery, removeQuery } = useQueryParams();
  const [documentNumber, setDocumentNumber] = useState("");
  const [frontPassword, setFrontPassword] = useState("");
  const [backPassword, setBackPassword] = useState("");
  const [verificationNotes, setVerificationNotes] = useState("");
  const [documentType, setDocumentType] = useState<OtherDocumentTypeEnum>(
    OtherDocumentTypeEnum.OTHER
  );
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  const frontFileRef = useRef<HTMLInputElement>(null);
  const backFileRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!editingDocument;
  const dialogTitle = isEditMode ? "Edit Document" : "Upload Documents";

  // Populate form fields when editing
  useEffect(() => {
    if (editingDocument) {
      setDocumentNumber(editingDocument.documentNumber || "");
      setDocumentType(editingDocument.type);
      setVerificationNotes(editingDocument.verificationNotes || "");
      // Populate passwords if they exist
      setFrontPassword(editingDocument.frontPassword || "");
      setBackPassword(editingDocument.backPassword || "");
    } else {
      // Reset form when not editing
      setDocumentNumber("");
      setDocumentType(OtherDocumentTypeEnum.OTHER);
      setVerificationNotes("");
      setFrontPassword("");
      setBackPassword("");
    }
  }, [editingDocument]);

  const validate = useCallback((): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Files are required for new uploads, optional for edits
    if (!isEditMode) {
      const frontFile = frontFileRef.current?.files?.[0];
      if (!frontFile) {
        newErrors.frontFile = "Front file is required";
      } else {
        const error = validateFile(frontFile);
        if (error) newErrors.frontFile = error;
      }
    } else {
      // Validate files if provided in edit mode
      const frontFile = frontFileRef.current?.files?.[0];
      const backFile = backFileRef.current?.files?.[0];
      
      if (frontFile) {
        const error = validateFile(frontFile);
        if (error) newErrors.frontFile = error;
      }
      
      if (backFile) {
        const error = validateFile(backFile);
        if (error) newErrors.backFile = error;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [isEditMode]);

  const handleFileClick = useCallback((ref: React.RefObject<HTMLInputElement | null>) => {
    ref.current?.click();
  }, []);

  const handleFileChange = useCallback((
    ref: React.RefObject<HTMLInputElement | null>,
    field: string
  ) => {
    const file = ref.current?.files?.[0];
    if (file) {
      const validationError = validateFile(file);
      setErrors((prev) => ({ ...prev, [field]: validationError || "" }));
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !brandId) return;

    setSubmitError("");
    setSubmitSuccess("");

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("documentNumber", documentNumber.trim());
      formData.append("documentType", documentType);
      formData.append("verificationNotes", verificationNotes.trim());
      formData.append("frontPassword", frontPassword.trim());
      formData.append("backPassword", backPassword.trim());

      // Add document ID for edit mode
      if (isEditMode && editingDocument) {
        formData.append("id", editingDocument.id);
      }

      // Add files if they are selected
      const frontFile = frontFileRef.current?.files?.[0];
      const backFile = backFileRef.current?.files?.[0];

      if (frontFile) formData.append("files", frontFile);
      if (backFile) formData.append("files", backFile);

      await upsertOtherDocument(customerId, brandId, formData);
      
      setSubmitSuccess(
        isEditMode
          ? "Document updated successfully."
          : "Documents uploaded successfully."
      );

      // Call onSuccess callback to refresh documents list
      onSuccess?.();

      // Close the dialog after a short delay
      setTimeout(() => {
        removeQuery(isEditMode ? "edit-document" : "upload-documents");
      }, 1500);
    } catch (err) {
      setSubmitError((err as Error).message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }, [customerId, brandId, validate, documentNumber, documentType, verificationNotes, frontPassword, backPassword, isEditMode, editingDocument, onSuccess, removeQuery]);

  const handleClose = useCallback(() => {
    removeQuery(isEditMode ? "edit-document" : "upload-documents");
  }, [isEditMode, removeQuery]);

  // Memoize file info for display
  // const frontFileInfo = useMemo(() => {
  //   const file = frontFileRef.current?.files?.[0];
  //   return file ? { name: file.name, size: formatFileSize(file.size) } : null;
  // }, [frontFileRef.current?.files?.[0]]);

  // const backFileInfo = useMemo(() => {
  //   const file = backFileRef.current?.files?.[0];
  //   return file ? { name: file.name, size: formatFileSize(file.size) } : null;
  // }, [backFileRef.current?.files?.[0]]);

  return (
    <Dialog
      title={dialogTitle}
      isOpen={
        getQuery("upload-documents") === "true" ||
        !!getQuery("edit-document")
      }
      onClose={handleClose}
    >
      <div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary)] bg-opacity-5 border border-[var(--color-primary)] border-opacity-20 rounded-xl p-3.5">
            <div className="flex items-start gap-3">
              <div className="bg-[var(--color-primary)] bg-opacity-10 p-2 rounded-lg flex-shrink-0">
                <FiFile className="h-4 w-4 text-[var(--color-on-primary)]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-[var(--color-on-primary)] mb-0.5">
                  {isEditMode ? "Edit Document" : "Document Upload"}
                </h3>
                <p className="text-xs text-[var(--color-on-primary)] opacity-70 leading-relaxed">
                  {isEditMode
                    ? "Update document information and optionally replace files"
                    : "Upload document files (PDF, Images, Excel, CSV) with optional password protection"}
                </p>
              </div>
            </div>
          </div>

          {/* Document Information Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-[var(--color-on-background)] flex items-center gap-2">
              <span className="w-1 h-4 bg-[var(--color-primary)] rounded-full"></span>
              Document Information
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Document Type Select */}
              <div>
                <label className="block text-xs font-medium text-[var(--color-on-surface)] opacity-70 mb-1.5">
                  Document Type <span className="text-error">*</span>
                </label>
                <select
                  value={documentType}
                  onChange={(e) =>
                    setDocumentType(e.target.value as OtherDocumentTypeEnum)
                  }
                  className="w-full px-3 py-2.5 border border-[var(--color-muted)] border-opacity-40 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary focus:ring-opacity-20 bg-[var(--color-background)] text-[var(--color-on-background)] transition-all"
                >
                  {Object.values(OtherDocumentTypeEnum).map((type) => (
                    <option key={type} value={type}>
                      {formatDocumentType(type)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Document Number Input */}
              <div>
                <label className="block text-xs font-medium text-[var(--color-on-surface)] opacity-70 mb-1.5">
                  {formatDocumentType(documentType)} Number <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={documentNumber}
                    onChange={(e) => {
                      setDocumentNumber(e.target.value);
                      setErrors((prev) => ({ ...prev, documentNumber: "" }));
                    }}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all ${
                      errors.documentNumber
                        ? "border-error focus:ring-red-500 bg-[var(--color-error)] bg-opacity-5"
                        : "border-[var(--color-muted)] border-opacity-40 focus:border-primary focus:ring-primary"
                    }`}
                    placeholder="Enter document number"
                  />
                  {errors.documentNumber && (
                    <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none">
                      <FiAlertCircle className="text-error h-4 w-4" />
                    </div>
                  )}
                </div>
                {errors.documentNumber && (
                  <p className="mt-1.5 text-xs text-[var(--color-on-error)] flex items-center gap-1">
                    <FiX className="h-3 w-3" />
                    {errors.documentNumber}
                  </p>
                )}
              </div>
            </div>

            {/* Verification Notes */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-on-surface)] opacity-70 mb-1.5">
                Verification Notes (Optional)
              </label>
              <textarea
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 border border-[var(--color-muted)] border-opacity-40 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary focus:ring-opacity-20 resize-none transition-all"
                placeholder="Add verification notes or special instructions..."
              />
            </div>
          </div>

          {/* Document Upload Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-[var(--color-on-background)] flex items-center gap-2">
                <span className="w-1 h-4 bg-[var(--color-primary)] rounded-full"></span>
                Document Files & Security
              </h4>
              {isEditMode && (
                <span className="text-xs text-[var(--color-on-warning)] bg-[var(--color-warning)] bg-opacity-10 px-2 py-1 rounded-md">
                  Files optional
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Front Document Section */}
              <div className="bg-[var(--color-surface)] bg-opacity-30 rounded-lg p-3.5 space-y-3 border border-[var(--color-muted)] border-opacity-20">
                <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-muted)] border-opacity-20">
                  <div className="w-5 h-5 bg-[var(--color-primary)] bg-opacity-15 rounded-md flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-[var(--color-on-primary)]">1</span>
                  </div>
                  <h5 className="text-xs font-semibold text-[var(--color-on-background)]">
                    Front Document {!isEditMode && <span className="text-error">*</span>}
                  </h5>
                </div>

                {/* Front File Upload */}
                <div>
                  <div
                    onClick={() => handleFileClick(frontFileRef)}
                    className={`cursor-pointer relative border-2 border-dashed rounded-lg p-4 text-center transition-all duration-200 ${
                      errors.frontFile
                        ? "border-error bg-[var(--color-error)] bg-opacity-5"
                        : frontFileRef.current?.files?.[0]
                        ? "border-success bg-[var(--color-success)] bg-opacity-5"
                        : "border-[var(--color-muted)] border-opacity-30 hover:border-primary hover:bg-[var(--color-primary)] hover:bg-opacity-5"
                    }`}
                  >
                    <input
                      type="file"
                      accept={ACCEPTED_FILE_TYPES}
                      ref={frontFileRef}
                      onChange={() => handleFileChange(frontFileRef, "frontFile")}
                      className="hidden"
                    />
                    {frontFileRef.current?.files?.[0] ? (
                      <div className="space-y-1.5">
                        <FiCheck className="mx-auto h-6 w-6 text-success" />
                        <p className="text-xs font-medium text-[var(--color-on-success)] break-all px-2">
                          {frontFileRef.current.files[0].name}
                        </p>
                        <p className="text-xs text-[var(--color-on-success)] opacity-80">
                          {formatFileSize(frontFileRef.current.files[0].size)}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <FiUpload className="mx-auto h-6 w-6 text-[var(--color-on-surface)] opacity-40" />
                        <p className="text-xs font-medium text-[var(--color-on-surface)] opacity-70">
                          Click to upload
                        </p>
                        <p className="text-xs text-[var(--color-on-surface)]  hover:text-[var(--color-on-surface)] opacity-50">
                          PDF, Images, Excel, CSV (max 10MB)
                        </p>
                      </div>
                    )}
                  </div>
                  {errors.frontFile && (
                    <p className="mt-1.5 text-xs text-[var(--color-on-error)] flex items-center gap-1">
                      <FiX className="h-3 w-3" />
                      {errors.frontFile}
                    </p>
                  )}
                </div>

                {/* Front Password */}
                <div>
                  <label className="block text-xs font-medium text-[var(--color-on-surface)] opacity-70 mb-1.5">
                    Password (Optional)
                  </label>
                  <input
                    type="password"
                    value={frontPassword}
                    onChange={(e) => setFrontPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-40 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary focus:ring-opacity-20 transition-all"
                    placeholder="If password-protected"
                  />
                </div>
              </div>

              {/* Back Document Section */}
              <div className="bg-[var(--color-surface)] bg-opacity-30 rounded-lg p-3.5 space-y-3 border border-[var(--color-muted)] border-opacity-20">
                <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-muted)] border-opacity-20">
                  <div className="w-5 h-5 bg-[var(--color-primary)] bg-opacity-15 rounded-md flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-[var(--color-on-primary)]">2</span>
                  </div>
                  <h5 className="text-xs font-semibold text-[var(--color-on-background)]">
                    Back Document (Optional)
                  </h5>
                </div>

                {/* Back File Upload */}
                <div>
                  <div
                    onClick={() => handleFileClick(backFileRef)}
                    className={`cursor-pointer relative border-2 border-dashed rounded-lg p-4 text-center transition-all duration-200 ${
                      errors.backFile
                        ? "border-error bg-[var(--color-error)] bg-opacity-5"
                        : backFileRef.current?.files?.[0]
                        ? "border-success bg-[var(--color-success)] bg-opacity-5"
                        : "border-[var(--color-muted)] border-opacity-30 hover:border-primary hover:bg-[var(--color-primary)] hover:bg-opacity-5"
                    }`}
                  >
                    <input
                      type="file"
                      accept={ACCEPTED_FILE_TYPES}
                      ref={backFileRef}
                      onChange={() => handleFileChange(backFileRef, "backFile")}
                      className="hidden"
                    />
                    {backFileRef.current?.files?.[0] ? (
                      <div className="space-y-1.5">
                        <FiCheck className="mx-auto h-6 w-6 text-success" />
                        <p className="text-xs font-medium text-[var(--color-on-success)] break-all px-2">
                          {backFileRef.current.files[0].name}
                        </p>
                        <p className="text-xs text-[var(--color-on-success)] opacity-80">
                          {formatFileSize(backFileRef.current.files[0].size)}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <FiUpload className="mx-auto h-6 w-6 text-[var(--color-on-surface)] opacity-40" />
                        <p className="text-xs font-medium text-[var(--color-on-surface)] opacity-70">
                          Click to upload
                        </p>
                        <p className="text-xs text-[var(--color-on-surface)] opacity-50">
                          PDF, Images, Excel, CSV (max 10MB)
                        </p>
                      </div>
                    )}
                  </div>
                  {errors.backFile && (
                    <p className="mt-1.5 text-xs text-[var(--color-on-error)] flex items-center gap-1">
                      <FiX className="h-3 w-3" />
                      {errors.backFile}
                    </p>
                  )}
                </div>

                {/* Back Password */}
                <div>
                  <label className="block text-xs font-medium text-[var(--color-on-surface)] opacity-70 mb-1.5">
                    Password (Optional)
                  </label>
                  <input
                    type="password"
                    value={backPassword}
                    onChange={(e) => setBackPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-40 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary focus:ring-opacity-20 transition-all"
                    placeholder="If password-protected"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Status Messages */}
          {(submitError || submitSuccess) && (
            <div className="space-y-2">
              {submitError && (
                <div className="bg-[var(--color-error)] bg-opacity-5 border border-[var(--color-error)] border-opacity-20 rounded-lg p-3 flex items-start gap-2.5">
                  <FiX className="h-4 w-4 text-error flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-[var(--color-on-error)] font-medium leading-relaxed">
                    {submitError}
                  </p>
                </div>
              )}
              {submitSuccess && (
                <div className="bg-[var(--color-success)] bg-opacity-5 border border-[var(--color-success)] border-opacity-20 rounded-lg p-3 flex items-start gap-2.5">
                  <FiCheck className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-[var(--color-on-success)] font-medium leading-relaxed">
                    {submitSuccess}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--color-muted)] border-opacity-20">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="min-w-[90px]"
            >
              Cancel
            </Button>   
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[140px]"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-[var(--color-on-primary)]"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    ></path>
                  </svg>
                  <span className="text-sm">{isEditMode ? "Updating..." : "Uploading..."}</span>
                </>
              ) : (
                <>
                  <FiUpload className="h-4 w-4" />
                  <span className="text-sm">{isEditMode ? "Update" : "Upload"}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
