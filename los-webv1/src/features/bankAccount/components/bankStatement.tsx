import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useAppSelector } from "../../../redux/store";
import Dialog from "../../../common/dialog";
import {
  FiUploadCloud,
  FiFile,
  FiAlertCircle,
  FiX,
  FiLock,
  FiTrash,
  FiEye,
  FiPlus,
} from "react-icons/fi";
import { motion, AnimatePresence, HTMLMotionProps } from "framer-motion";
import { ImSpinner8 } from "react-icons/im";
import {
  deleteBankAccountStatement,
  getBankAccountStatement,
  uploadBankAccountStatement,
} from "../../../services/api/user-bank-account.api";
// import { user_bank_verification_status } from "../../../types/user-bank-account";
import { useAwsSignedUrl } from "../../../hooks/useAwsSignedUrl";

interface BankStatementFormData {
  statementType: string;
  // fromDate: string;
  // toDate: string;
  filePassword: string;
}

const dropzoneVariants = {
  initial: { scale: 0.98, opacity: 0.9 },
  hover: { scale: 1.02, opacity: 1 },
  tap: { scale: 0.98 },
};

export default function BankAccountStatementUpload() {
  const { fetchSignedUrl } = useAwsSignedUrl();
  const user = useAppSelector((state) => state.user.user);
  const brand = useAppSelector((state) => state.index);
  // const userBankAccount = useAppSelector((state) => state.bankAccount);
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [statements, setStatements] = useState<
    {
      id: string;
      userId: string;
      userBankAccountId: string;
      filePrivateKey: string;
      fileName: string;
      statementType: string;
      fromDate: Date;
      toDate: Date;
    }[]
  >([]);
  const [formData, setFormData] = useState<BankStatementFormData>({
    statementType: "bank",
    filePassword: "",
    // fromDate: "",
    // toDate: "",
  });
  const [error, setError] = useState<string>("");

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: useCallback((acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0]);
        setError("");
      }
    }, []),
    accept: {
      "application/pdf": [".pdf"],
      // "image/*": [".png", ".jpg", ".jpeg"],
    },
    maxSize: 5 * 1024 * 1024,
    multiple: false,
  });

  const fetchStatements = useCallback(async () => {
    try {
      const response = await getBankAccountStatement(user.userBankAccountId);
      if (response) {
        setStatements(response);
        setError("");
      }
    } catch (error) {
      console.error("Error fetching statements:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch statements"
      );
    }
  }, [user.userBankAccountId]);

  useEffect(() => {
    fetchStatements();
  }, [fetchStatements]);

  const handleUpload = async () => {
    if (statements.length >= 1) {
      setError("Only one statement allowed. Delete existing to upload new.");
      return;
    }

    if (!file) {
      setError("Please select a file first");
      return;
    }

    try {
      setIsUploading(true);
      setError("");

      const form = new FormData();

      form.append("file", file);
      form.append("userId", user.id);
      form.append("brandId", user.brandId);
      form.append("userBankAccountId", user.userBankAccountId);
      form.append("statementType", "bank");
      // form.append("fromDate", formData.fromDate);
      // form.append("toDate", formData.toDate);
      form.append("filePassword", formData.filePassword);

      const response = await uploadBankAccountStatement(
        user.userBankAccountId,
        form
      );

      setTimeout(() => {
        setIsOpen(false);
        setStatements([response]);
        setFile(null);
        setFormData({
          statementType: "bank",
          // fromDate: "",
          // toDate: "",
          filePassword: "",
        });
      }, 2000);
    } catch (err) {
      setError((err as Error).message || "Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBankAccountStatement(user.userBankAccountId, id);
      await fetchStatements();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to delete document"
      );
    }
  };

  return (
    <div className="w-full mt-6 ">

      <div className="bg-surface rounded-xl md:rounded-brand shadow-sm border border-edge overflow-hidden">
        {/* Header Section - Mobile Optimized */}
        <div className="p-4 md:p-6 border-edge  to-primary-light">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex flex-col gap-3">
              <div>
                <h2 className="text-lg md:text-xl font-semibold text-primary">
                  Bank Statements
                </h2>
                <p className="text-sm text-label-muted">
                  Please upload last {brand.brandConfig.bankStatementHistoryMonths} months statement
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span
                  className={`w-3 h-3 rounded-full ${statements.length > 0 ? "bg-green-500" : "bg-gray-300"
                    }`}
                />
                <span className="text-label-muted">
                  {statements.length}/1 statement uploaded
                </span>
              </div>
            </div>

            {statements.length < 1 && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsOpen(true)}
                className="bg-primary hover:bg-primary-hover text-on-primary px-3 py-2 md:px-4 md:py-2.5 rounded-xl flex items-center gap-2 shadow-lg active:shadow-sm transition-all duration-200 min-h-[44px]"
                disabled={statements.length >= 1}
              >
                <FiPlus className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline">Upload Statement</span>
                <span className="sm:hidden">Upload</span>
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Statements List - Mobile App Style */}
      {statements.length > 0 && (
        <div className="mt-4">
          <AnimatePresence>
            {statements.map((statement) => (
              <motion.div
                key={statement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-surface rounded-xl border border-edge shadow-sm overflow-hidden"
              >
                {/* Statement Card */}
                <div className="p-4 md:p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary text-on-primary rounded-xl flex items-center justify-center flex-shrink-0">
                      <FiFile className="w-6 h-6 text-on-primary " />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium  text-on-primary  text-heading text-base md:text-lg truncate mb-1">
                        {statement.fileName}
                      </h3>
                      <p className="text-sm text-label-muted">Bank Statement</p>
                    </div>
                  </div>

                  {/* Action Buttons - Mobile Optimized */}
                  <div className="flex gap-3 mt-4">
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => fetchSignedUrl(statement.filePrivateKey)}
                      className="flex-1 bg-primary  hover:bg-primary text-on-primary px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors min-h-[48px]"
                    >
                      <FiEye className="w-4 h-4" />
                      <span>View</span>
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleDelete(statement.id)}
                      className=" text-error px-4 py-3 rounded-xl flex items-center justify-center min-h-[48px]"
                    >
                      <FiTrash className="w-4 h-4 text-primary" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Upload Dialog - Mobile Optimized */}
      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={`Upload Bank Statement`}
      >
        <div className="space-y-6 p-1">
          {/* Subtitle for mobile */}
          <p className="text-sm text-label-muted text-center leading-relaxed">
            Upload your last {brand.brandConfig.bankStatementHistoryMonths}{" "}
            months salary account statement
          </p>

          {/* Dropzone - Mobile Optimized */}
          <motion.div
            {...(getRootProps() as HTMLMotionProps<"div">)}
            initial={dropzoneVariants.initial}
            whileHover={dropzoneVariants.hover}
            whileTap={dropzoneVariants.tap}
            className={`group border-2 border-dashed rounded-xl p-6 md:p-8 text-center cursor-pointer transition-all duration-200
              ${isDragActive
                ? "border-primary bg-primary scale-[1.02]"
                : "border-edge hover:border-primary active:scale-[0.98]"
              }
              ${error ? "border-error " : ""}`}
          >
            <input {...getInputProps()} />
            <div className="space-y-4">
              <motion.div
                animate={isDragActive ? { y: [-2, 2, -2] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
                className="inline-flex justify-center"
              >
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <FiUploadCloud
                    className={`w-8 h-8 ${error ? "text-error" : "text-on-primary"
                      }`}
                  />
                </div>
              </motion.div>
              <div className="space-y-2">
                <p
                  className={`text-base font-medium ${error ? "text-error" : "text-heading"
                    }`}
                >
                  {isDragActive ? "Drop to upload" : "Tap to select file"}
                </p>
                <p className="text-sm text-label-muted">
                  PDF  • Max 5MB
                </p>
              </div>
            </div>
          </motion.div>

          {/* Selected File - Mobile Card Style */}
          <AnimatePresence>
            {file && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className=" border border-primary rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                    <FiFile className="w-5 h-5 text-on-primary" />
                  </div>
                  <span className="text-sm font-medium text-heading truncate">
                    {file.name}
                  </span>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setFile(null)}
                  className="w-8 h-8 text-on-error rounded-lg flex items-center justify-center transition-colors"
                >
                  <FiX className="w-4 h-4" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Password Input - Mobile Optimized */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-label">
              <FiLock className="w-4 h-4 text-label-muted" />
              File Password (optional)
            </label>
            <input
              type="password"
              value={formData.filePassword}
              onChange={(e) =>
                setFormData({ ...formData, filePassword: e.target.value })
              }
              placeholder="Enter password if file is protected"
              className="w-full px-4 py-3 md:py-2.5 border border-edge rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-base md:text-sm min-h-[48px] md:min-h-[auto]"
            />
          </div>

          {/* Error Message - Mobile Styled */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 border border-error text-error rounded-xl flex items-start gap-3"
              >
                <FiAlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm leading-relaxed">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upload Button - Mobile App Style */}
          <motion.button
            whileHover={!isUploading ? { scale: 1.01 } : {}}
            whileTap={!isUploading ? { scale: 0.99 } : {}}
            onClick={handleUpload}
            disabled={isUploading || !file || statements.length >= 1}
            className={`w-full py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-3 transition-all duration-200 shadow-lg active:shadow-sm min-h-[56px]
              ${isUploading
                ? "bg-primary text-on-primary cursor-not-allowed"
                : file && statements.length < 1
                  ? "bg-primary hover:bg-primary-hover text-on-primary shadow-primary"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
              }`}
          >
            {isUploading ? (
              <>
                <ImSpinner8 className="w-5 h-5 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <FiUploadCloud className="w-5 h-5" />
                <span>
                  {statements.length >= 1
                    ? "Maximum Reached"
                    : "Upload Statement"}
                </span>
              </>
            )}
          </motion.button>
        </div>
      </Dialog>
    </div>
  );
}
