import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useAppSelector } from "../../../redux/store";
import Dialog from "../../../common/dialog";
import {
  FiUploadCloud,
  FiFile,
  FiAlertCircle,
  FiCheckCircle,
  FiX,
  FiLock,
  FiCalendar,
  FiTrash,
} from "react-icons/fi";
import { motion, AnimatePresence, HTMLMotionProps } from "framer-motion";
import { ImSpinner8 } from "react-icons/im";
import {
  createPayslip,
  deletePayslip,
  getPayslip,
} from "../../../services/api/employment.api";
import dayjs from "dayjs";
import { useAwsSignedUrl } from "../../../hooks/useAwsSignedUrl";

interface SalarySlipEntry {
  month: number;
  year: number;
  file: File | null;
  filePassword?: string;
}

interface Payslip {
  id: string;
  month: number;
  year: number;
  fileName: string;
  filePrivateKey: string;
  filePassword?: string;
}

const dropzoneVariants = {
  initial: { scale: 0.98, opacity: 0.9 },
  hover: { scale: 1.02, opacity: 1 },
  tap: { scale: 0.98 },
};

function getPreviousThreeMonths() {
  const months = [];

  for (let i = 3; i >= 1; i--) {
    const date = dayjs().subtract(i, "month");
    months.push({
      month: date.month() + 1, // dayjs months are 0-based
      year: date.year(),
    });
  }

  return months;
}

const UploadSection: React.FC<{
  month: number;
  year: number;
  file: File | null;
  onFileUpload: (file: File) => void;
  onFileRemove: () => void;
  error: boolean;
}> = ({ file, onFileUpload, onFileRemove, error }) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFileUpload(acceptedFiles[0]);
    },
    [onFileUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg"],
    },
    maxSize: 5 * 1024 * 1024,
    multiple: false,
  });

  return (
    <div className="space-y-4">
      <motion.div
        {...(getRootProps() as HTMLMotionProps<"div">)}
        initial={dropzoneVariants.initial}
        whileHover={dropzoneVariants.hover}
        whileTap={dropzoneVariants.tap}
        className={`border-2 border-dashed rounded-brand p-4 text-center cursor-pointer transition-colors
        ${
          isDragActive
            ? "border-primary bg-surface text-on-surface"
            : "border-edge hover:border-edge-hover"
        }
        ${error ? "border-error bg-error-light" : ""}`}
      >
        <input {...getInputProps()} />
        <div className="space-y-2">
          <motion.div
            animate={isDragActive ? { y: [-2, 2, -2] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
            className="inline-flex justify-center"
          >
            <FiUploadCloud
              className={`w-8 h-8 ${
                error ? "text-error" : "text-label-muted"
              } group-hover:text-primary`}
            />
          </motion.div>
          <div className="space-y-1">
            <p className={`text-sm ${error ? "text-error" : "text-label"}`}>
              {isDragActive ? "Drop to upload" : "Drag & drop file here"}
            </p>
            <p className="text-xs text-label-muted">
              Supported formats: PDF, PNG, JPG (max 5MB)
            </p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {file && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-muted rounded-brand p-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <FiFile className="w-4 h-4 text-primary" />
              <span className="text-sm text-label">{file.name}</span>
            </div>
            <button
              onClick={onFileRemove}
              className="text-label-muted hover:text-label"
            >
              <FiX className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function SalarySlip() {
  const user = useAppSelector((state) => state.user.user);
  const { fetchSignedUrl } = useAwsSignedUrl();
  const userData = useAppSelector((state) => state.user);
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState<SalarySlipEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [paySlips, setPaySlips] = useState<Payslip[]>([]);

  const fetchPaySlips = useCallback(async () => {
    try {
      const response = await getPayslip(userData.user.employmentId);
      setPaySlips(response || []);
    } catch (error) {
      console.error("Failed to fetch payslips:", error);
    }
  }, [userData.user.employmentId]);

  useEffect(() => {
    if (userData.user.employmentId) {
      fetchPaySlips();
    }
  }, [userData.user.employmentId, fetchPaySlips]);

  useEffect(() => {
    if (isOpen) {
      setFiles(
        getPreviousThreeMonths().map((m) => ({
          month: m.month,
          year: m.year,
          file: null,
        }))
      );
    }
  }, [isOpen]);

  const handleDelete = async (payslipId: string) => {
    try {
      await deletePayslip(payslipId);
      setPaySlips((prev) => prev.filter((p) => p.id !== payslipId));
      await fetchPaySlips();
    } catch (error) {
      console.error("Failed to delete payslip:", error);
    }
  };

  const handleUpload = async () => {
    const allCovered = files.every((entry) => {
      const hasExisting = paySlips.some(
        (p) => p.month === entry.month && p.year === entry.year
      );
      return hasExisting || entry.file !== null;
    });

    if (!allCovered) {
      setError("Please ensure all three months have files");
      return;
    }

    try {
      setIsUploading(true);
      setError("");

      const entriesToUpload = files.filter(
        (entry) =>
          !paySlips.some(
            (p) => p.month === entry.month && p.year === entry.year
          ) && entry.file
      );

      await Promise.all(
        entriesToUpload.map((entry) => {
          if (!entry.file) return;

          const formData = new FormData();
          formData.append("userId", user.id);
          formData.append("employmentId", userData.user.employmentId || "");
          formData.append("month", entry.month.toString());
          formData.append("year", entry.year.toString());
          formData.append("file", entry.file);
          formData.append("filePassword", entry.filePassword || "");

          return createPayslip(formData);
        })
      );

      await fetchPaySlips();

      setUploadSuccess(true);
      setTimeout(() => {
        setUploadSuccess(false);
        setIsOpen(false);
      }, 2000);
    } catch (err) {
      setError((err as Error)?.message || "Failed to upload documents");
    } finally {
      setIsUploading(false);
    }
  };

  const allMonthsCovered = files.every((entry) => {
    const hasExisting = paySlips.some(
      (p) => p.month === entry.month && p.year === entry.year
    );
    return hasExisting || entry.file !== null;
  });

  return (
    <div>
      {paySlips.length !== 3 && (
        <div className="flex justify-between items-center bg-surface p-6 rounded-brand shadow-sm border border-edge mt-4">
          <h2 className="text-lg font-semibold text-heading">Salary Slips</h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="bg-primary hover:bg-primary-hover text-on-primary px-4 py-2.5 rounded-brand flex items-center gap-2"
          >
            <FiUploadCloud className="w-5 h-5" />
            Upload Slips
          </motion.button>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {paySlips.map((payslip) => (
          <div
            key={payslip.id}
            className="bg-surface p-4 rounded-brand shadow-sm border border-edge flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <FiFile className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-label">{payslip.fileName}</p>
                <p className="text-sm text-label-muted">
                  {new Date(payslip.year, payslip.month - 1).toLocaleString(
                    "default",
                    { month: "long", year: "numeric" }
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {payslip.filePrivateKey && (
                <button
                  onClick={() => {
                    fetchSignedUrl(payslip.filePrivateKey);
                  }}
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary-hover"
                >
                  View
                </button>
              )}
              <button
                onClick={() => handleDelete(payslip.id)}
                className="text-error hover:text-error-hover"
              >
                <FiTrash className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Upload Salary Slips"
      >
        <div className="space-y-6">
          {files.map((entry, index) => {
            const existingPayslip = paySlips.find(
              (p) => p.month === entry.month && p.year === entry.year
            );

            return (
              <div key={`${entry.month}-${entry.year}`} className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-label">
                  <FiCalendar className="text-label-muted" />
                  {new Date(entry.year, entry.month - 1).toLocaleString(
                    "default",
                    { month: "long", year: "numeric" }
                  )}
                </div>

                {existingPayslip ? (
                  <div className="bg-muted p-4 rounded-brand flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FiFile className="w-5 h-5 text-primary" />
                      <span className="text-sm">
                        {existingPayslip.fileName}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(existingPayslip.id)}
                      className="text-error hover:text-error-hover"
                    >
                      <FiTrash className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <UploadSection
                    month={entry.month}
                    year={entry.year}
                    file={entry.file}
                    onFileUpload={(file) => {
                      const newFiles = [...files];
                      newFiles[index].file = file;
                      setFiles(newFiles);
                    }}
                    onFileRemove={() => {
                      const newFiles = [...files];
                      newFiles[index].file = null;
                      setFiles(newFiles);
                    }}
                    error={!!error && !entry.file}
                  />
                )}

                <div>
                  <label
                    htmlFor={`filePassword-${entry.month}-${entry.year}`}
                    className="text-sm text-label-muted"
                  >
                    File Password (optional)
                  </label>
                  <input
                    type="password"
                    id={`filePassword-${entry.month}-${entry.year}`}
                    value={entry.filePassword || ""}
                    onChange={(e) => {
                      const newFiles = [...files];
                      newFiles[index].filePassword = e.target.value;
                      setFiles(newFiles);
                    }}
                    className="border border-edge rounded-brand px-3 py-2 w-full focus:ring-2 focus:ring-primary-focus"
                  />
                </div>
              </div>
            );
          })}

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-error-light text-error rounded-brand flex items-center gap-3"
              >
                <FiAlertCircle className="w-5 h-5" />
                <span className="text-sm">{error}</span>
              </motion.div>
            )}

            {uploadSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-success-light text-success rounded-brand flex items-center gap-3"
              >
                <FiCheckCircle className="w-5 h-5" />
                <span className="text-sm">
                  All salary slips uploaded successfully!
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileHover={!isUploading ? { scale: 1.02 } : {}}
            whileTap={!isUploading ? { scale: 0.98 } : {}}
            onClick={handleUpload}
            disabled={isUploading || !allMonthsCovered}
            className={`w-full py-3 px-6 rounded-brand font-medium flex items-center justify-center gap-2
            ${
              isUploading
                ? "bg-primary-light text-primary-disabled"
                : "bg-primary hover:bg-primary-hover text-on-primary"
            }
            ${
              !allMonthsCovered
                ? "bg-muted text-label-muted cursor-not-allowed"
                : ""
            }`}
          >
            {isUploading ? (
              <ImSpinner8 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <FiUploadCloud className="w-5 h-5" />
                Upload All Slips
              </>
            )}
          </motion.button>

          <div className="text-center text-sm text-label-muted flex items-center justify-center gap-2">
            <FiLock className="w-4 h-4 text-label-muted" />
            <span>Secured with 256-bit SSL encryption</span>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
