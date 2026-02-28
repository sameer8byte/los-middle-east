import { useCallback, useState } from "react";
import { FileRejection, useDropzone } from "react-dropzone";
import Dialog from "../../../common/dialog";
import {
  FiUploadCloud,
  FiFile,
  FiAlertCircle,
  FiX,
  FiLock,
  FiCheckCircle,
} from "react-icons/fi";
import { motion, AnimatePresence, HTMLMotionProps } from "framer-motion";
import { ImSpinner8 } from "react-icons/im";
import { useParams } from "react-router-dom";
import { useQueryParams } from "../../../hooks/useQueryParams";
import { uploadBankAccountStatement } from "../../../shared/services/api/customer.api";

interface BankStatementFormData {
  statementType: string;
  filePassword: string;
}

const ACCEPTED_FILE_TYPES = {
  "application/pdf": [".pdf"],
};
const MAX_FILE_SIZE_MB = 15;

const dropzoneVariants = {
  initial: { scale: 0.98, opacity: 0.9 },
  hover: { scale: 1.02, opacity: 1 },
  tap: { scale: 0.98 },
};

export default function BankAccountStatementUpload() {
  const { brandId, customerId } = useParams();
  const { getQuery, removeQuery } = useQueryParams();
  const userBankAccountId = getQuery("addNewStatementAccountId");

  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState<BankStatementFormData>({
    statementType: "bank",
    filePassword: "",
  });
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    setError("");
    setSuccess(false);

    if (fileRejections.length > 0) {
      const reason = fileRejections[0].errors[0]?.message || "Invalid file";
      setError(`Upload failed: ${reason}`);
      return;
    }

    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];

      if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError("File size exceeds 15MB limit.");
        return;
      }

      setFile(selectedFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE_MB * 1024 * 1024,
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    try {
      setIsUploading(true);
      setError("");

      const form = new FormData();
      form.append("file", file);
      form.append("userId", customerId || "");
      form.append("brandId", brandId || "");
      form.append("userBankAccountId", userBankAccountId || "");
      form.append("statementType", formData.statementType);
      form.append("filePassword", formData.filePassword);

      await uploadBankAccountStatement(
        brandId || "",
        customerId || "",
        userBankAccountId || "",
        form
      );

      setSuccess(true);
      setTimeout(() => {
        setFile(null);
        setFormData({ statementType: "bank", filePassword: "" });
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError((err as Error).message || "Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full">
      <Dialog
        isOpen={Boolean(userBankAccountId)}
        onClose={() => removeQuery("addNewStatementAccountId")}
        title="Upload Bank Statement"
      >
        <div className="space-y-6">
          {/* Dropzone */}
          <motion.div
            {...(getRootProps() as HTMLMotionProps<"div">)}
            initial={dropzoneVariants.initial}
            whileHover={dropzoneVariants.hover}
            whileTap={dropzoneVariants.tap}
            className={`group border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? "border-blue-500 bg-[var(--color-primary)] bg-opacity-10" : "border-[var(--color-muted)] border-opacity-50 hover:border-[var(--color-muted)]"}
              ${error ? "border-red-600 bg-[var(--color-error)] bg-opacity-10" : ""}
              ${success ? "border-green-500 bg-[var(--color-success)] bg-opacity-10" : ""}
            `}
          >
            <input {...getInputProps()} />
            <div className="space-y-4">
              <motion.div
                animate={isDragActive ? { y: [-2, 2, -2] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
                className="inline-flex justify-center"
              >
                <FiUploadCloud
                  className={`w-12 h-12 ${
                    error
                      ? "text-[var(--color-on-error)]"
                      : success
                      ? "text-[var(--color-on-success)]"
                      : "text-[var(--color-on-surface)] opacity-50 group-hover:text-[var(--color-on-primary)]"
                  }`}
                />
              </motion.div>
              <div className="space-y-1">
                <p className={`text-sm ${error ? "text-[var(--color-on-error)]" : "text-[var(--color-on-surface)] opacity-80"}`}>
                  {isDragActive ? "Drop the file here" : "Drag & drop a file or click to select"}
                </p>
                <p className="text-xs text-[var(--color-on-surface)] opacity-50">PDF only (max 15MB)</p>
              </div>
            </div>
          </motion.div>

          {/* File preview */}
          <AnimatePresence>
            {file && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[var(--color-surface)] rounded-md p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <FiFile className="w-5 h-5 text-[var(--color-on-primary)]" />
                  <span className="text-sm font-medium text-[var(--color-on-background)]">{file.name}</span>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="text-[var(--color-on-surface)] opacity-50 hover:text-[var(--color-on-surface)] opacity-80"
                  aria-label="Remove file"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Password field */}
          <div>
            <label className=" text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2 flex items-center gap-2">
              <FiLock className="text-[var(--color-on-surface)] opacity-50" />
              File Password (optional)
            </label>
            <input
              type="password"
              value={formData.filePassword}
              onChange={(e) =>
                setFormData({ ...formData, filePassword: e.target.value })
              }
              className="w-full px-4 py-2.5 border border-[var(--color-muted)] border-opacity-50 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none transition"
              placeholder="Enter password if any"
            />
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-[var(--color-error)] bg-opacity-10 text-[var(--color-on-error)] rounded-md flex items-center gap-3"
              >
                <FiAlertCircle className="w-5 h-5" />
                <span className="text-sm">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success Message */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-[var(--color-success)] bg-opacity-10 text-[var(--color-on-success)] rounded-md flex items-center gap-3"
              >
                <FiCheckCircle className="w-5 h-5" />
                <span className="text-sm">File uploaded successfully</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upload Button */}
          <motion.button
            whileHover={!isUploading && file ? { scale: 1.02 } : {}}
            whileTap={!isUploading && file ? { scale: 0.98 } : {}}
            onClick={handleUpload}
            disabled={isUploading || !file}
            className={`w-full py-3 px-6 rounded-md font-medium flex items-center justify-center gap-2 transition
              ${isUploading ? "bg-[var(--color-primary)] bg-opacity-15 text-[var(--color-on-primary)] cursor-wait" : ""}
              ${!file ? "bg-[var(--color-muted)] bg-opacity-30 text-[var(--color-on-surface)] opacity-50 cursor-not-allowed" : "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white"}
            `}
          >
            {isUploading ? (
              <ImSpinner8 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <FiUploadCloud className="w-5 h-5" />
                Upload Statement
              </>
            )}
          </motion.button>

          {/* Footer note */}
          <div className="text-center text-sm text-[var(--color-on-surface)] opacity-50 flex items-center justify-center gap-2">
            <FiLock className="w-4 h-4" />
            <span>Secure 256-bit SSL encryption</span>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
