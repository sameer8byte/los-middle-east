import { useState, useCallback } from "react";
import Dialog from "../../../common/dialog";
import { useAppDispatch, useAppSelector } from "../../../redux/store";
import {
  removeUserDetailsDocumentProof,
  uploadUserDetailsDocumentProof,
} from "../../../services/api/user-details.api";
import { updateUserDetails } from "../../../redux/slices/userDetails";
import {
  FiUpload,
  FiX,
  FiFile,
  FiTrash2,
  FiAlertCircle,
  FiCheck,
  FiEye,
} from "react-icons/fi";
import { AddressProofEnum } from "../../../types/user-details";
import { useAwsSignedUrl } from "../../../hooks/useAwsSignedUrl";

// Constants for file validation
const SUPPORTED_FORMATS = [".pdf", ".jpg", ".jpeg", ".png"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

export default function PrimaryAddressDocument() {
  const { fetchSignedUrl } = useAwsSignedUrl();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressProofType, setAddressProofType] = useState<
    AddressProofEnum | ""
  >("");

  const userDetails = useAppSelector((state) => state.userDetails);
  const dispatch = useAppDispatch();

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
    if (!userDetails.id || !userDetails.residenceType)
      return setError("Required user details are missing");

    try {
      setIsUploading(true);
      const response = await uploadUserDetailsDocumentProof(
        userDetails.id,
        addressProofType,
        selectedFile
      );

      if (response) {
        dispatch(updateUserDetails(response));
        setIsOpen(false);
        setSelectedFile(null);
        setAddressProofType("");
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
    userDetails.id,
    userDetails.residenceType,
    addressProofType,
    dispatch,
  ]);

  const resetUpload = useCallback(() => {
    setSelectedFile(null);
    setAddressProofType("");
    setError(null);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setIsOpen(false);
    resetUpload();
  }, [resetUpload]);

  const handleDeleteDocument = useCallback(async () => {
    if (!userDetails.id) return;
    try {
      const response = await removeUserDetailsDocumentProof(userDetails.id);
      if (response) {
        dispatch(updateUserDetails(response));
        setSelectedFile(null);
        setAddressProofType("");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete document"
      );
      console.error("Delete error:", err);
    } 
  }, [userDetails.id, dispatch]);

  if (!userDetails.isCommunicationAddress) return null;

  return (
    <div className="w-full space-y-4 sm:space-y-6 pt-3 sm:pt-5 ">
      {/* Upload Card */}
      {!userDetails.filePrivateKey ? (
        <div className="p-4 sm:p-6 border-2 border-dashed border-gray-200 rounded-2xl sm:rounded-[var(--radius-brand)] bg-white hover:border-[var(--color-primary-hover)] transition-colors">
          <div className="flex flex-col items-center text-center gap-4 sm:gap-4">
            <div className="space-y-2 sm:space-y-2">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-800 leading-tight">
                Verify Your Primary Address
              </h1>
              <p className="text-sm sm:text-sm text-gray-600 max-w-prose leading-relaxed px-2 sm:px-0">
                Upload a government-issued document or utility bill that clearly
                shows your name and residential address.
              </p>
              <p className="text-xs sm:text-sm text-gray-500">
                Supported: PDF, JPG, PNG (Max 5MB)
              </p>
            </div>
            <button
              onClick={() => setIsOpen(true)}
              className="w-full sm:w-fit flex items-center justify-center gap-2 bg-[var(--color-primary)] active:bg-[var(--color-primary-hover)] hover:bg-[var(--color-primary-hover)] text-[var(--color-on-primary)] px-6 py-4 sm:px-5 sm:py-3 rounded-2xl sm:rounded-[var(--radius-brand)] 
                    shadow-sm hover:shadow-md active:shadow-lg transition-all font-medium text-base sm:text-sm min-h-[48px] sm:min-h-auto"
            >
              <FiUpload className="w-5 h-5" />
              <span>Upload Document</span>
            </button>
          </div>
        </div>
      ) : (
        // Uploaded State
        <div className="p-4 sm:p-6 border border-gray-200 rounded-2xl sm:rounded-[var(--radius-brand)] bg-white shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-full mt-1">
                <FiCheck className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-lg sm:text-lg font-semibold text-gray-800 leading-tight">
                  Document Verified
                </h1>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                  Your address verification is complete. You can view or update
                  the document below.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <button
                onClick={() => {
                  if (userDetails.filePrivateKey) {
                    fetchSignedUrl(userDetails.filePrivateKey);
                  } else {
                    setError("No document available to view");
                  }
                }}
                className="flex items-center justify-center gap-2 bg-[var(--color-primary)] active:bg-[var(--color-primary-hover)] hover:bg-[var(--color-primary-hover)] text-[var(--color-on-primary)] px-6 py-3 sm:px-4 sm:py-2.5 rounded-2xl sm:rounded-[var(--radius-brand)] transition-colors font-medium min-h-[48px] sm:min-h-auto"
              >
                <FiEye className="w-4 h-4" />
                <span>View Document</span>
              </button>
              <button
                onClick={handleDeleteDocument}
                className="flex items-center justify-center gap-2 bg-red-50 active:bg-red-100 hover:bg-red-100 text-red-700 px-6 py-3 sm:px-4 sm:py-2.5 rounded-2xl sm:rounded-[var(--radius-brand)] transition-colors font-medium min-h-[48px] sm:min-h-auto"
              >
                <FiTrash2 className="w-4 h-4" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog
         isOpen={isOpen}
        onClose={handleCloseDialog}
        title="Upload Document"
      >
        <div className="flex flex-col gap-6 p-1">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Document Type
            </label>
            <select
              value={addressProofType || ""}
              onChange={(e) =>
                setAddressProofType(e.target.value as AddressProofEnum)
              }
              className="w-full px-4 py-4 sm:py-3 border border-gray-300 rounded-2xl sm:rounded-[var(--radius-brand)] bg-white focus:ring-2 
                       focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] text-gray-700 text-base sm:text-sm min-h-[48px] sm:min-h-auto"
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
                       border-dashed border-gray-300 rounded-2xl sm:rounded-[var(--radius-brand)] bg-[var(--color-surface)] 
                       active:border-[var(--color-primary)] hover:border-[var(--color-primary-hover)] hover:bg-[var(--color-surface)] 
                       text-[var(--color-on-surface)] transition-colors min-h-[120px]"
            >
              <div className="text-center space-y-3">
                <FiUpload className="mx-auto h-8 w-8 text-gray-400 group-hover:text-[var(--color-primary)] group-active:text-[var(--color-primary)]" />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-gray-700 group-hover:text-[var(--color-primary)] group-active:text-[var(--color-primary)]">
                    Tap to select file
                  </p>
                  <p className="text-xs text-gray-500 group-hover:text-[var(--color-primary)] group-active:text-[var(--color-primary)]">
                    Max 5MB
                  </p>
                </div>
                <span className="text-xs text-gray-400 mt-2 block">
                  PDF, JPG, JPEG, PNG
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
            <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-2xl sm:rounded-[var(--radius-brand)]">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="p-2 bg-[var(--color-surface)] text-[var(--color-on-surface)] rounded-xl sm:rounded-[var(--radius-brand)] flex-shrink-0">
                  <FiFile className="w-6 h-6 text-[var(--color-primary)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={resetUpload}
                className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2"
                disabled={isUploading}
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl sm:rounded-[var(--radius-brand)] flex items-start gap-3">
              <FiAlertCircle className="w-5 h-5 text-[var(--color-error)] flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-error)] leading-relaxed">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Dialog Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
            <button
              onClick={handleCloseDialog}
              className="w-full sm:w-auto px-6 py-4 sm:px-5 sm:py-2.5 text-gray-700 active:bg-gray-100 hover:bg-gray-50 rounded-2xl sm:rounded-[var(--radius-brand)] border 
                       border-gray-300 font-medium transition-colors min-h-[48px] sm:min-h-auto order-2 sm:order-1"
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              onClick={handleFileUpload}
              disabled={!selectedFile || !addressProofType || isUploading}
              className={`w-full sm:w-auto px-6 py-4 sm:px-5 sm:py-2.5 rounded-2xl sm:rounded-[var(--radius-brand)] font-medium transition-all min-h-[48px] sm:min-h-auto order-1 sm:order-2 ${
                !selectedFile || !addressProofType || isUploading
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-[var(--color-primary)] active:bg-[var(--color-primary-hover)] hover:bg-[var(--color-primary-hover)] text-[var(--color-on-primary)] shadow-sm active:shadow-lg"
              }`}
            >
              {isUploading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Uploading...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
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
