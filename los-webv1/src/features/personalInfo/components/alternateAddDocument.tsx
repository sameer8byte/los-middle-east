import { useState, useCallback } from "react";
import Dialog from "../../../common/dialog";
import { useAppSelector } from "../../../redux/store";
import {
  removeAlternateAddressDocumentProof,
  updateAlternateAddressDocumentProof,
} from "../../../services/api/user-details.api";
import {
  FiUpload,
  FiX,
  FiFile,
  FiTrash2,
  FiAlertCircle,
  FiCheckCircle,
} from "react-icons/fi";
import { AddressProofEnum } from "../../../types/user-details";
import { useAwsSignedUrl } from "../../../hooks/useAwsSignedUrl";

// Constants for file validation
const SUPPORTED_FORMATS = [".pdf", ".jpg", ".jpeg", ".png"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

export default function AlternateAddDocument({
  filePrivateKey,
  alternateAddressId,
  addressProofType,
  setFilePrivateKey,
  setAddressProofType,
}: {
  filePrivateKey: string;
  alternateAddressId: string | null;
  addressProofType: AddressProofEnum | null;

  setAlternateAddressId: (id: string | null) => void;
  setFilePrivateKey: (file: string | null) => void;
  setAddressProofType: (type: AddressProofEnum | null) => void;
}) {
  const user = useAppSelector((state) => state.user.user);
  const { fetchSignedUrl } = useAwsSignedUrl();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const fileExtension = file.name
      .substring(file.name.lastIndexOf("."))
      .toLowerCase();

    if (!SUPPORTED_FORMATS.includes(fileExtension)) {
      setError(
        `Unsupported file format. Please upload one of: ${SUPPORTED_FORMATS.join(
          ", "
        )}`
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("File size exceeds the 5MB limit");
      return;
    }

    setSelectedFile(file);
  };

  const handleFileUpload = useCallback(async () => {
    if (!selectedFile) return setError("Please select a file first");
    if (!addressProofType) return setError("Please select a document type");
    if (!alternateAddressId)
      return setError("Required user details are missing");

    try {
      setIsUploading(true);
      const response = await updateAlternateAddressDocumentProof(
        user.brandId,
        user.id,
        alternateAddressId,
        addressProofType,
        selectedFile
      );

      if (response) {
        setFilePrivateKey(response.filePrivateKey);

        setIsOpen(false);
        setSelectedFile(null);
        setAddressProofType(null);
      } else {
        setError("File upload failed. Please try again.");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred during file upload"
      );
      console.error("Upload error:", err);
    } finally {
      setIsUploading(false);
    }
  }, [
    selectedFile,
    addressProofType,
    alternateAddressId,
    user.id,
    setFilePrivateKey,
    setAddressProofType,
    setIsOpen,
    setSelectedFile,
    setError,
  ]);

  const resetUpload = useCallback(() => {
    setSelectedFile(null);
    setAddressProofType(null);
    setError(null);
  }, [setAddressProofType]);

  const handleCloseDialog = useCallback(() => {
    setIsOpen(false);
    resetUpload();
  }, [resetUpload]);

  const handleDeleteDocument = useCallback(async () => {
    if (!alternateAddressId) return;
    try {
      const response = await removeAlternateAddressDocumentProof(
        alternateAddressId
      );
      if (response) {
        setFilePrivateKey(null);
        setSelectedFile(null);
        setAddressProofType(null);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete document"
      );
      console.error("Delete error:", err);
    } 
  }, [alternateAddressId, setFilePrivateKey, setAddressProofType]);

  return (
    <div className="w-full space-y-6 pt-5">
      {/* Upload Card */}
      {!filePrivateKey ? (
        <div className="p-6 border-2 border-dashed border-edge rounded-brand bg-surface hover:border-primary-hover transition-colors">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="space-y-2">
              <h1 className="text-lg font-semibold text-heading">
                Verify Your Primary Address
              </h1>
              <p className="text-sm text-label max-w-prose">
                Upload a government-issued document or utility bill that clearly
                shows your name and residential address. Supported formats: PDF,
                JPG, PNG.
              </p>
            </div>
            <button
              onClick={() => setIsOpen(true)}
              className="w-fit flex items-center gap-2 bg-primary hover:bg-primary-hover text-on-primary px-5 py-3 rounded-brand 
                      shadow-sm hover:shadow-md transition-all"
            >
              <FiUpload className="w-5 h-5" />
              <span className="font-medium">Upload Verification Document</span>
            </button>
          </div>
        </div>
      ) : (
        /* Uploaded State */
        <div className="p-6 border border-edge rounded-brand bg-surface shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1 text-success">
                <FiCheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-heading">
                  Document Successfully Uploaded
                </h1>
                <p className="text-sm text-label mt-1">
                  Your address verification is complete. You can view or update
                  the document at any time.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-2">
              <button
                onClick={() => {
                  if (filePrivateKey) {
                    fetchSignedUrl(filePrivateKey)
                 
                  } else {
                    setError("No document available to view");
                  }
                }}
                className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-on-primary px-4 py-2.5 rounded-brand
                        transition-colors"
              >
                View Document
              </button>
              <button
                onClick={handleDeleteDocument}
                className="flex items-center gap-2 bg-error-light hover:bg-error-hover text-error px-4 py-2.5 rounded-brand
                        transition-colors"
              >
                <FiTrash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog
         
        isOpen={isOpen}
        onClose={handleCloseDialog}
        title="Upload Verification Document"
      >
        <div className="flex flex-col gap-6">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-label">
              Document Type
            </label>
            <select
              value={addressProofType || ""}
              onChange={(e) =>
                setAddressProofType(e.target.value as AddressProofEnum)
              }
              className="w-full px-4 py-3 border border-edge rounded-brand bg-surface focus:ring-2 
                      focus:ring-primary-focus text-label"
            >
              <option value="" disabled>
                Select document type...
              </option>
              {Object.values(AddressProofEnum).map((type) => (
                <option key={type} value={type} className="py-2">
                  {type.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          {/* File Upload Area */}
          <label className="group cursor-pointer">
            <div
              className="mt-1 flex flex-col items-center justify-center px-6 pt-8 pb-8 border-2 
                        border-dashed border-edge rounded-brand bg-surface-light hover:border-primary 
                        text-label transition-colors"
            >
              <div className="text-center space-y-3">
                <FiUpload className="mx-auto h-8 w-8 text-label-muted group-hover:text-primary" />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium group-hover:text-primary">
                    Drag and drop files here
                  </p>
                  <p className="text-xs text-label-muted group-hover:text-primary">
                    or click to browse (Max 5MB)
                  </p>
                </div>
                <span className="text-xs text-label-muted mt-2">
                  Supported formats: PDF, JPG, JPEG, PNG
                </span>
              </div>
              <input
                type="file"
                accept={SUPPORTED_FORMATS.join(",")}
                onChange={handleFileChange}
                className="sr-only"
                disabled={isUploading}
              />
            </div>
          </label>

          {/* File Preview */}
          {selectedFile && (
            <div className="flex items-center justify-between p-4 bg-surface border border-edge rounded-brand">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-surface-light text-label rounded-brand">
                  <FiFile className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-heading truncate max-w-[240px]">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-label mt-1">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={resetUpload}
                className="p-1.5 hover:bg-surface-hover rounded-full text-label-muted hover:text-label"
                disabled={isUploading}
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-error-light border border-error rounded-brand flex items-start gap-3">
              <FiAlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-error">{error}</p>
              </div>
            </div>
          )}

          {/* Dialog Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={handleCloseDialog}
              className="px-5 py-2.5 text-label hover:bg-surface-hover rounded-brand border 
                      border-edge font-medium transition-colors"
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              onClick={handleFileUpload}
              disabled={!selectedFile || !addressProofType || isUploading}
              className={`px-5 py-2.5 rounded-brand font-medium transition-all ${
                !selectedFile || !addressProofType || isUploading
                  ? "bg-primary-light text-primary-disabled cursor-not-allowed"
                  : "bg-primary hover:bg-primary-hover text-on-primary shadow-sm"
              }`}
            >
              {isUploading ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                  Uploading...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <FiUpload className="w-4 h-4" />
                  Upload Document
                </span>
              )}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
