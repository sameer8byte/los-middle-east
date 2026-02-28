import React, { useEffect, useState} from "react";
import { useAppDispatch, useAppSelector } from "../../../redux/store";
import { user_bank_verification_status } from "../../../types/user-bank-account";
import { FiCheckCircle, FiAlertCircle, FiX } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { ImSpinner8 } from "react-icons/im";
import { FiInfo } from "react-icons/fi"; 
import { fetchIFSCDetails } from "../../../utils/fetchIFSCDetails";
import { updateAccount } from "../../../services/api/user-bank-account.api";
import { updateUserBankAccount } from "../../../redux/slices/bankAccount";

const BankDetails = () => {
  const dispatch = useAppDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const [existingAccountStatus, setExistingAccountStatus] =
    useState<user_bank_verification_status | null>(null);
  const [formData, setFormData] = useState({
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const userData = useAppSelector((state) => state.user);
  const userBankAccount = useAppSelector((state) => state.bankAccount);
  const isVerified =
    existingAccountStatus === user_bank_verification_status.VERIFIED;
  useEffect(() => {
    const initializeForm = () => {
      const bankAccount = userBankAccount;
      if (bankAccount?.id) {
        setExistingAccountStatus(bankAccount.verificationStatus || null);
        setIsEditing(
          bankAccount.verificationStatus !==
            user_bank_verification_status.VERIFIED
        );
        setFormData({
          accountHolderName: bankAccount.accountHolderName,
          accountNumber: bankAccount.accountNumber,
          ifscCode: bankAccount.ifscCode,
        });
      } else {
        resetForm();
        setIsEditing(true);
      }
    };
    initializeForm();
  }, [userBankAccount]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    // remove any leading/trailing spaces
    if (name === "ifscCode") {
      // Convert IFSC code to uppercase
      setFormData((prev) => ({
        ...prev,
        [name]: value.toUpperCase().trim(),
      }));
      return;
    } else if (name === "accountNumber") {
      // Remove any non-numeric characters from account number
      setFormData((prev) => ({
        ...prev,
        [name]: value.replace(/\D/g, ""),
      }));
      return;
    } else if (name === "accountHolderName") {
      // Remove any leading/trailing spaces from account holder name
      setFormData((prev) => ({
        ...prev,
        [name]: value.trimStart(),
      }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };
  const resetForm = () => {
    setFormData({
      accountHolderName: "",
      accountNumber: "",
      ifscCode: "",
    });
  };

const handleOnKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === " ") {
    e.preventDefault();   
  }
};

  const validateForm = () => {
    const requiredFields = [
      "accountHolderName",
      "accountNumber",
      "ifscCode",
    ];

    return requiredFields.every(
      (field) => !!formData[field as keyof typeof formData]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      setError("Please fill all required fields");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const ifscDetails = await fetchIFSCDetails(formData.ifscCode);
      if (ifscDetails && ifscDetails.BANK && ifscDetails.ADDRESS) {
        const verificationResponse = await updateAccount(
          userData.user.userBankAccountId,
          {
            accountHolderName: formData.accountHolderName,
            accountNumber: formData.accountNumber,
            ifscCode: formData.ifscCode,
            bankName: ifscDetails.BANK,
            bankAddress: ifscDetails.ADDRESS,
            accountType: "SAVINGS",
          }
        );
        if (verificationResponse) {
          setExistingAccountStatus(user_bank_verification_status.VERIFIED);
          setFormData({
            accountHolderName: verificationResponse.accountHolderName,
            accountNumber: verificationResponse.accountNumber,
            ifscCode: verificationResponse.ifscCode,
          });
          dispatch(updateUserBankAccount(verificationResponse));
          setSuccessMessage("Bank account verified successfully!");
          setIsEditing(false);
          setTimeout(() => setSuccessMessage(""), 3000);
        }
      }else {
        setError("Invalid IFSC code or bank details not found for the provided IFSC code.");
      }
    } catch (error) {
      setError((error as Error).message || "Failed to save bank details");
    } finally {
      setIsSaving(false);
    }
  };

  if (isVerified && !isEditing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold text-[var(--color-primary)] flex items-center gap-2 text-heading">
            <FiInfo className="text-primary hidden md:flex" />
            Verified Bank Account
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {Object.entries(formData).map(([key, value]) => (
            <div key={key} className="space-y-1">
              <label className="block text-sm font-medium text-label-muted capitalize">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </label>
              <p className="text-heading font-medium break-all">
                {value || "-"}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-success-light rounded-brand flex items-center gap-3">
          <FiCheckCircle className="w-5 h-5 text-success flex-shrink-0" />
          <span className="text-sm text-success">
            Account successfully verified
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex md:justify-between items-center">
        <div>
          <h3 className="text-[var(--color-primary)]  font-semibold text-2xl flex items-center gap-2">
            {isVerified ? "Edit Bank Account" : "Add Your Salary Bank Account"}
          </h3>
          {!isVerified && (
            <p
              className="ml-2 text-sm text-gray-400 text-label-muted flex items-center gap-1 italic"
              title="Fields marked with * are required"
            >
              <FiInfo className="text-label-muted text-base" />
              Must be your salary account
            </p>
          )}
        </div>
        {isVerified && (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="text-label-muted hover:text-label"
          >
            <FiX className="w-5 h-5" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-error-light rounded-brand flex items-center gap-3"
          >
            <FiAlertCircle className="w-5 h-5 text-error" />
            <span className="text-sm text-error">{error}</span>
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-success-light rounded-brand flex items-center gap-3"
          >
            <FiCheckCircle className="w-5 h-5 text-success" />
            <span className="text-sm text-success">{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-label">
           Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="accountHolderName"
            value={formData.accountHolderName}
            placeholder="e.g. John Doe"
            onChange={handleChange}
            onKeyDown={()=>handleOnKeyDown}
            className="w-full px-4 py-2.5 border border-edge rounded-brand focus:ring-2 focus:ring-primary-focus transition"
            disabled={isVerified && !isEditing}
            required
          />
        </div>

        {/* Account Number */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-label">
            Account Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="accountNumber"
            placeholder="e.g. 123456789012"
            value={formData.accountNumber}
            onChange={handleChange}
            onKeyDown={()=>handleOnKeyDown}
            className="w-full px-4 py-2.5 border border-edge rounded-brand focus:ring-2 focus:ring-primary-focus transition"
            disabled={isVerified && !isEditing}
            required
          />
        </div>

        {/* IFSC Code */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-label">
            IFSC Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. SBIN0001234"
            name="ifscCode"
            value={formData.ifscCode}
            onChange={handleChange}
            onKeyDown={()=>handleOnKeyDown}
            className="w-full px-4 py-2.5 border border-edge rounded-brand focus:ring-2 focus:ring-primary-focus transition uppercase"
            disabled={isVerified && !isEditing}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-label">
            Account Type
          </label>
          <div
            className={`w-full px-4 py-2.5 border border-edge rounded-brand text-on-surface transition ${
              isVerified && !isEditing ? "bg-surface-muted" : "bg-surface"
            } cursor-not-allowed select-none`}
          >
            SAVINGS
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4 mt-8">
        {isVerified && (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="px-6 py-2.5 text-label border border-edge rounded-brand hover:bg-surface-hover"
          >
            Cancel
          </button>
        )}
        <motion.button
          type="submit"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-6 py-2.5 bg-primary text-on-primary rounded-brand hover:bg-primary-hover flex items-center justify-center gap-2 disabled:opacity-50"
          disabled={isSaving || (isVerified && !isEditing) || !validateForm()}
        >
          {isSaving ? (
            <ImSpinner8 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <FiCheckCircle className="w-5 h-5" />
              {isVerified ? "Update Account" : "Save & Verify Account"}
            </>
          )}
        </motion.button>
      </div>
    </motion.form>
  );
};

export default BankDetails;
