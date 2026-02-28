import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Spinner } from "../../../common/ui/spinner";
import { useToast as useToastContext } from "../../../context/toastContext";
import {
  getAllBankAccounts,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  setPrimaryBankAccount,
  uploadBankAccountStatement,
  getBsaReport,
} from "../../../shared/services/api/customer.api";
import { verifyBankAccountWithFallback } from "../../../shared/services/api/external/pennyDrop.api";
import Dialog from "../../../common/dialog";
import { fetchIFSCDetails } from "../../../lib/fetchIFSCDetails";
import { Button } from "../../../common/ui/button";
import { CustomerDetailsTabs } from "./aa";
import { getAwsSignedUrl } from "../../../shared/services/api/common.api";
import { PennyDropVerificationCard } from "./PennyDropVerificationCard";

interface PennyDropResponse {
  code?: string;
  model?: {
    rrn?: string;
    status?: string;
    isNameMatch?: boolean;
    paymentMode?: string;
    clientRefNum?: string;
    matchingScore?: number;
    transactionId?: string;
    beneficiaryName?: string;
  };
}

interface BankAccount {
  id: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  bankAddress: string | null;
  accountType: string;
  verificationStatus: string;
  verificationMethod: string | null;
  isPrimary: boolean;
  createdAt: string;
  pennyDropResponse?: PennyDropResponse | null;
  BankAccountStatement?: Array<{
    id: string;
    fromDate: string | null;
    toDate: string | null;
    createdAt: string;
    filePrivateKey: string;
    filePassword?: string;
  }>;
}

// BSA Report Types
export interface BankStatementReport {
  excel?: string;
  data?: BankStatementAnalysisResult;
}

// Updated BankingHistory type to match the backend BankStatementAnalysisResult - made robust with optional fields
type BankStatementAnalysisResult = {
  message?: string;
  // (a) Cheque Bounce Details
  chequeBounce?: {
    hasChequeBounce?: boolean;
    inwardBounces?: {
      count?: number;
      totalAmount?: number;
      details?: Array<{
        date?: string;
        amount?: number;
        payee?: string;
        narration?: string;
        category?: string;
      }>;
    };
    outwardBounces?: {
      count?: number;
      totalAmount?: number;
      details?: Array<{
        date?: string;
        amount?: number;
        payee?: string;
        narration?: string;
        category?: string;
      }>;
    };
    summary?: string;
  };

  // (b) EMI Details
  emiDetails?: {
    hasEMI?: boolean;
    totalEMIs?: number;
    totalEMIAmount?: number;
    emiBounces?: {
      count?: number;
      totalAmount?: number;
    };
    emiList?: Array<{
      bank?: string;
      amount?: number;
      date?: string;
      transactionMode?: string;
      reference?: string;
      status?: "SUCCESS" | "BOUNCE";
    }>;
  };

  // (c) FCU (Fraud Control Unit) Triggers
  fcuTriggers?: {
    totalTriggers?: number;
    triggers?: Array<{
      name?: string;
      description?: string;
      count?: number;
      amount?: number;
      details?: string;
      riskLevel?: "LOW" | "MEDIUM" | "HIGH";
    }>;
  };

  // (d) Salary Credits (Last 6 months)
  salaryCredits?: {
    last6MonthsCount?: number;
    last3MonthsCount?: number;
    totalSalaryAmount?: number;
    salaryDetails?: Array<{
      month?: string;
      amount?: number;
      date?: string;
      employer?: string;
    }>;
    avgMonthlySalary?: number;
    hasSalaryCredits?: boolean;
  };

  // (e) ECS Transactions
  ecsTransactions?: {
    hasECS?: boolean;
    totalCount?: number;
    totalAmount?: number;
    transactions?: Array<{
      date?: string;
      amount?: number;
      type?: "DEBIT" | "CREDIT";
      beneficiary?: string;
      purpose?: string;
      mode?: string;
    }>;
  };

  // (f) Penal Charges
  penalCharges?: {
    hasPenalCharges?: boolean;
    totalPenalAmount?: number;
    penalTypes?: {
      minimumBalanceCharges?: { count?: number; amount?: number };
      chequeReturnCharges?: { count?: number; amount?: number };
      bankCharges?: { count?: number; amount?: number };
      emiBounceCharges?: { count?: number; amount?: number };
      other?: { count?: number; amount?: number };
    };
    details?: Array<{
      date?: string;
      type?: string;
      amount?: number;
      description?: string;
    }>;
  };

  // Additional Analysis
  accountSummary?: {
    accountNumber?: string;
    bankName?: string;
    accountHolderName?: string;
    periodStart?: string;
    periodEnd?: string;
    averageBalance?: number;
    minimumBalance?: number;
    maximumBalance?: number;
    totalCredits?: number;
    totalDebits?: number;
    fraudScore?: number;
  };
};

interface FormData {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  bankAddress: string;
  accountType: string;
}

interface FormErrors {
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
}

export function CustomerBankAccounts() {
  const { brandId, customerId } = useParams();
  const { showSuccess, showError } = useToastContext();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(
    null
  );
  const [actionLoading, setActionLoading] = useState(false);
  const [verifyingAccountId, setVerifyingAccountId] = useState<string | null>(
    null
  );
  const [fetchingIfsc, setFetchingIfsc] = useState(false);
  const [uploadStatementAccountId, setUploadStatementAccountId] = useState<
    string | null
  >(null);
  const [statementFile, setStatementFile] = useState<File | null>(null);
  const [filePassword, setFilePassword] = useState("");
  const [uploadingStatement, setUploadingStatement] = useState(false);

  // BSA Report state
  const [bsaReports, setBsaReports] = useState<
    Record<string, BankStatementReport>
  >({});
  const [loadingBsaId, setLoadingBsaId] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
    bankAddress: "",
    accountType: "SAVINGS",
  });

  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Fetch all bank accounts
  const fetchAccounts = async () => {
    if (!customerId || !brandId) return;

    try {
      setLoading(true);
      const data = await getAllBankAccounts(customerId, brandId);
      setAccounts(data);
    } catch (error: any) {
      showError(
        error?.response?.data?.message || "Failed to fetch bank accounts"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [customerId, brandId]);

  // Validation functions
  const validateAccountHolderName = (name: string): string | undefined => {
    if (!name.trim()) return "Account holder name is required";
    if (!/^[a-zA-Z\s]+$/.test(name)) return "Only alphabets and spaces allowed";
    if (name.trim().length < 2) return "Name must be at least 2 characters";
    if (name.trim().length > 50) return "Name must not exceed 50 characters";
    return undefined;
  };

  const validateAccountNumber = (accountNumber: string): string | undefined => {
    const cleaned = accountNumber.replace(/\s/g, "");
    if (!cleaned) return "Account number is required";
    if (!/^\d+$/.test(cleaned))
      return "Account number must contain only digits";
    if (cleaned.length < 9 || cleaned.length > 18)
      return "Account number must be 9-18 digits";
    return undefined;
  };

  const validateIFSC = (ifsc: string): string | undefined => {
    if (!ifsc) return "IFSC code is required";
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase()))
      return "Invalid IFSC code format";
    return undefined;
  };

  const validateBankName = (name: string): string | undefined => {
    if (!name.trim()) return "Bank name is required";
    return undefined;
  };

  // Fetch IFSC details
  const fetchBankDetailsFromIfsc = async (ifscCode: string) => {
    if (ifscCode.length !== 11) return;

    const error = validateIFSC(ifscCode);
    if (error) return;

    setFetchingIfsc(true);
    try {
      const ifscDetails = await fetchIFSCDetails(ifscCode.toUpperCase());
      if (ifscDetails?.BANK && ifscDetails?.ADDRESS) {
        setForm((prev) => ({
          ...prev,
          bankName: ifscDetails.BANK,
          bankAddress: ifscDetails.ADDRESS,
        }));
        setFieldErrors((prev) => ({
          ...prev,
          bankName: undefined,
          ifscCode: undefined,
        }));
        showSuccess("Bank details fetched successfully!");
      } else {
        showError("Unable to fetch bank details for this IFSC code");
      }
    } catch (error) {
      console.error("Error fetching IFSC details:", error);
      showError("Failed to fetch bank details");
    } finally {
      setFetchingIfsc(false);
    }
  };

  // Handle form changes
  const handleChange = async (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (fieldErrors[name as keyof FormErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }

    // Auto-fetch bank details when IFSC code is complete
    if (name === "ifscCode" && value.length === 11) {
      await fetchBankDetailsFromIfsc(value);
    } else if (name === "ifscCode" && form.bankName) {
      // Clear bank details if IFSC is changed
      setForm((prev) => ({ ...prev, bankName: "", bankAddress: "" }));
    }
  };

  const handleBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));

    // Validate field on blur
    let error: string | undefined;
    if (name === "accountHolderName") error = validateAccountHolderName(value);
    else if (name === "accountNumber") error = validateAccountNumber(value);
    else if (name === "ifscCode") {
      error = validateIFSC(value);
      // Fallback: Fetch if not already fetched on change
      if (!error && value.length === 11 && !form.bankName && !fetchingIfsc) {
        await fetchBankDetailsFromIfsc(value);
      }
    } else if (name === "bankName") error = validateBankName(value);

    setFieldErrors((prev) => ({ ...prev, [name]: error }));
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {
      accountHolderName: validateAccountHolderName(form.accountHolderName),
      accountNumber: validateAccountNumber(form.accountNumber),
      ifscCode: validateIFSC(form.ifscCode),
      // Don't validate bankName here as it's auto-filled from IFSC
    };

    setFieldErrors(errors);
    setTouched({
      accountHolderName: true,
      accountNumber: true,
      ifscCode: true,
    });

    return !Object.values(errors).some((error) => error);
  };

  // Handle add account
  const handleAddAccount = async () => {
    if (!customerId || !brandId) return;
    if (!validateForm()) return;

    // Check if bank name is filled (from IFSC lookup)
    if (!form.bankName) {
      showError("Please enter a valid IFSC code to fetch bank details");
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        accountHolderName: form.accountHolderName.trim(),
        accountNumber: form.accountNumber.replace(/\s/g, ""),
        ifscCode: form.ifscCode.toUpperCase(),
        bankName: form.bankName,
        bankAddress: form.bankAddress,
        accountType: form.accountType,
      };

      await createBankAccount(customerId, brandId, payload);
      showSuccess("Bank account added successfully");
      setIsAddModalOpen(false);
      resetForm();
      fetchAccounts();
    } catch (error: any) {
      showError(error?.response?.data?.message || "Failed to add bank account");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle edit account
  const handleEditAccount = async () => {
    if (!customerId || !brandId || !selectedAccount) return;
    if (!validateForm()) return;

    // Check if bank name is filled (from IFSC lookup)
    if (!form.bankName) {
      showError("Please enter a valid IFSC code to fetch bank details");
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        accountHolderName: form.accountHolderName.trim(),
        accountNumber: form.accountNumber.replace(/\s/g, ""),
        ifscCode: form.ifscCode.toUpperCase(),
        bankName: form.bankName,
        bankAddress: form.bankAddress,
        accountType: form.accountType,
      };

      await updateBankAccount(customerId, brandId, selectedAccount.id, payload);
      showSuccess("Bank account updated successfully");
      setIsEditModalOpen(false);
      setSelectedAccount(null);
      resetForm();
      fetchAccounts();
    } catch (error: any) {
      showError(
        error?.response?.data?.message || "Failed to update bank account"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete account
  const handleDeleteAccount = async (accountId: string) => {
    if (!customerId || !brandId) return;

    if (!confirm("Are you sure you want to delete this bank account?")) return;

    try {
      await deleteBankAccount(customerId, brandId, accountId);
      showSuccess("Bank account deleted successfully");
      fetchAccounts();
    } catch (error: any) {
      showError(
        error?.response?.data?.message || "Failed to delete bank account"
      );
    }
  };

  // Handle set primary
  const handleSetPrimary = async (accountId: string, isVerified: boolean) => {
    if (!customerId || !brandId) return;

    // Check if account is verified
    if (!isVerified) {
      showError("Only verified accounts can be set as primary");
      return;
    }

    // Confirm action
    if (!confirm("Are you sure you want to set this as the primary account?"))
      return;

    try {
      await setPrimaryBankAccount(customerId, brandId, accountId);
      showSuccess("Primary account updated successfully");
      fetchAccounts();
    } catch (error: any) {
      showError(
        error?.response?.data?.message || "Failed to set primary account"
      );
    }
  };

  // Handle verify bank account
  const handleVerifyAccount = async (account: BankAccount) => {
    if (!brandId) return;

    setVerifyingAccountId(account.id);
    try {
      const result = await verifyBankAccountWithFallback(brandId, {
        accountNumber: account.accountNumber,
        ifsc: account.ifscCode,
        beneficiaryName: account.accountHolderName,
        userId: customerId,
        userBankAccountId: account.id,
      });

      if (result.success) {
        showSuccess(
          `Bank account verified successfully! ${
            result.nameMatch ? "Name matched." : "Name mismatch detected."
          }`
        );
        fetchAccounts();
      } else {
        showError(result.message || "Bank account verification failed");
      }
    } catch (error: any) {
      showError(
        error?.response?.data?.message || "Failed to verify bank account"
      );
    } finally {
      setVerifyingAccountId(null);
    }
  };

  // Handle upload bank statement
  const handleUploadStatement = async () => {
    if (!statementFile || !uploadStatementAccountId || !customerId || !brandId)
      return;

    setUploadingStatement(true);
    try {
      const formData = new FormData();
      formData.append("file", statementFile);
      formData.append("userId", customerId);
      formData.append("brandId", brandId);
      formData.append("userBankAccountId", uploadStatementAccountId);
      formData.append("statementType", "bank");
      formData.append("filePassword", filePassword);

      await uploadBankAccountStatement(
        brandId,
        customerId,
        uploadStatementAccountId,
        formData
      );

      showSuccess("Bank statement uploaded successfully!");
      setUploadStatementAccountId(null);
      setStatementFile(null);
      setFilePassword("");
      fetchAccounts();
    } catch (error: any) {
      showError(
        error?.response?.data?.message || "Failed to upload bank statement"
      );
    } finally {
      setUploadingStatement(false);
    }
  };
  const handleDownloadStatement = async (
    privateKey: string,
    fileName = "statement.pdf"
  ) => {
    try {
      const { url } = await getAwsSignedUrl(privateKey);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName; // may be ignored by some browsers
      link.target = "_blank";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading statement:", error);
    }
  };

  // Handle BSA Report generation
  const handleGetBsaReport = async (
    bankAccountStatementId: string,
    bankAccountId: string
  ) => {
    if (!customerId || !brandId || !bankAccountId) return;

    setLoadingBsaId(bankAccountStatementId);
    try {
      const response = await getBsaReport(
        customerId,
        brandId,
        bankAccountStatementId,
        bankAccountId
      );
      setBsaReports((prev) => ({
        ...prev,
        [bankAccountStatementId]: response,
      }));
    } catch (error) {
      showError((error as Error).message || "Error fetching BSA report");
      console.error("Error fetching BSA report:", error);
    } finally {
      setLoadingBsaId(null);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      showError("Only PDF files are allowed");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      showError("File size must be less than 15MB");
      return;
    }

    setStatementFile(file);
  };

  // Reset form
  const resetForm = () => {
    setForm({
      accountHolderName: "",
      accountNumber: "",
      ifscCode: "",
      bankName: "",
      bankAddress: "",
      accountType: "SAVINGS",
    });
    setFieldErrors({});
    setTouched({});
  };

  // Open edit modal
  const openEditModal = (account: BankAccount) => {
    setSelectedAccount(account);
    setForm({
      accountHolderName: account.accountHolderName,
      accountNumber: account.accountNumber,
      ifscCode: account.ifscCode,
      bankName: account.bankName,
      bankAddress: account.bankAddress || "",
      accountType: account.accountType,
    });
    setIsEditModalOpen(true);
  };

  const getVerificationStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      VERIFIED: "bg-green-100 text-green-800",
      PENDING: "bg-yellow-100 text-yellow-800",
      FAILED: "bg-red-100 text-red-800",
    };

    return (
      <span
        className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${
          statusColors[status] || "bg-gray-100 text-gray-800"
        }`}
      >
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-on-surface)]">
            Bank Accounts
          </h2>
          <p className="text-sm text-[var(--color-on-surface)] opacity-60 mt-1">
            Manage customer bank accounts
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add an Account
        </button>
      </div>

      {/* Accounts List */}
      <div className="space-y-4">
        {accounts.length === 0 ? (
          <div className="text-center py-12 bg-[var(--color-surface)] rounded-lg border border-[var(--color-muted)] border-opacity-30">
            <svg
              className="w-16 h-16 mx-auto text-[var(--color-on-surface)] opacity-30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
            <p className="mt-4 text-[var(--color-on-surface)] opacity-60">
              No bank accounts found
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Add First Account
            </button>
          </div>
        ) : (
          accounts.map((account) => (
            <div
              key={account.id}
              className={`bg-[var(--color-surface)] rounded-lg border ${
                account.isPrimary
                  ? "border-[var(--color-primary)] border-2"
                  : "border-[var(--color-muted)] border-opacity-30"
              } p-5 transition-all hover:shadow-md`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-base font-semibold text-[var(--color-on-surface)]">
                      {account.bankName}
                    </h3>
                    {account.isPrimary && (
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        Primary
                      </span>
                    )}
                    {getVerificationStatusBadge(account.verificationStatus)}
                  </div>
                  <p className="text-sm text-[var(--color-on-surface)] opacity-60">
                    {account.accountHolderName} • {account.accountNumber}
                  </p>
                </div>

                {/* Verify Button - Prominent */}
                {account.verificationStatus === "PENDING" && (
                  <button
                    onClick={() => handleVerifyAccount(account)}
                    disabled={verifyingAccountId === account.id}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-medium rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {verifyingAccountId === account.id ? (
                      <>
                        <Spinner />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>Verify Account</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Penny Drop Verification Details - Highlighted Card */}
              {account.pennyDropResponse && account.verificationStatus === "VERIFIED" && (
                <PennyDropVerificationCard pennyDropResponse={account.pennyDropResponse} />
              )}

              {/* Details Grid - Expanded */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 mb-4">
                <div>
                  <p className="text-xs text-[var(--color-on-surface)] opacity-50 mb-0.5">
                    ACCOUNT NUMBER
                  </p>
                  <p className="text-sm font-medium text-[var(--color-on-surface)] font-mono">
                    {account.accountNumber}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-on-surface)] opacity-50 mb-0.5">
                    IFSC CODE
                  </p>
                  <p className="text-sm font-medium text-[var(--color-on-surface)] font-mono">
                    {account.ifscCode}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-on-surface)] opacity-50 mb-0.5">
                    ACCOUNT TYPE
                  </p>
                  <p className="text-sm font-medium text-[var(--color-on-surface)]">
                    {account.accountType}
                  </p>
                </div>

                {account.bankAddress && (
                  <div className="md:col-span-2">
                    <p className="text-xs text-[var(--color-on-surface)] opacity-50 mb-0.5 ">
                      BANK ADDRESS
                    </p>
                    <p className="text-sm font-medium text-[var(--color-on-surface)] ">
                      {account.bankAddress}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-[var(--color-on-surface)] opacity-50 mb-0.5">
                    ACCOUNT HOLDER
                  </p>
                  <p className="text-sm font-medium text-[var(--color-on-surface)]">
                    {account.accountHolderName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-on-surface)] opacity-50 mb-0.5">
                    CREATED ON
                  </p>
                  <p className="text-sm font-medium text-[var(--color-on-surface)]">
                    {new Date(account.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                {account.verificationMethod && (
                  <div>
                    <p className="text-xs text-[var(--color-on-surface)] opacity-50 mb-0.5">
                      VERIFICATION METHOD
                    </p>
                    <p className="text-sm font-medium text-[var(--color-on-surface)]">
                      {account.verificationMethod
                        .toLowerCase()
                        .split("_")
                        .map(
                          (word) => word.charAt(0).toUpperCase() + word.slice(1)
                        )
                        .join(" ")}
                    </p>
                  </div>
                )}
                {/* {account.verifiedAt && (
                  <div>
                    <p className="text-xs text-[var(--color-on-surface)] opacity-50 mb-0.5">
                      VERIFIED ON
                    </p>
                    <p className="text-sm font-medium text-[var(--color-on-surface)]">
                      {new Date(account.verifiedAt).toLocaleDateString(
                        "en-IN",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </p>
                  </div>
                )} */}
                {account.BankAccountStatement &&
                  account.BankAccountStatement.length > 0 && (
                    <div>
                      <p className="text-xs text-[var(--color-on-surface)] opacity-50 mb-0.5">
                        ACCOUNT STATEMENTS
                      </p>
                      <p className="text-sm font-medium text-[var(--color-on-surface)]">
                        {account.BankAccountStatement.length} file(s) uploaded
                      </p>
                    </div>
                  )}
              </div>

              {/* Bank Statements List */}
              {account.BankAccountStatement &&
                account.BankAccountStatement.length > 0 && (
                  <div className="mb-4 p-3 bg-[var(--color-background)] rounded-lg border border-[var(--color-muted)] border-opacity-20">
                    <p className="text-xs font-semibold text-[var(--color-on-surface)] mb-2 flex items-center gap-1">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Uploaded Statements ({account.BankAccountStatement.length}
                      )
                    </p>
                    <div className="space-y-1.5">
                      {account.BankAccountStatement.map((statement) => (
                        <div key={statement.id} className="space-y-2">
                          <div className="flex items-center justify-between text-xs py-1.5 px-2 hover:bg-[var(--color-surface)] rounded">
                            <div className="flex items-center gap-2">
                              <svg
                                className="w-4 h-4 text-red-500"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                />
                              </svg>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-[var(--color-on-surface)]">
                                      Statement{" "}
                                      {statement.fromDate && statement.toDate
                                        ? `(${new Date(
                                            statement.fromDate
                                          ).toLocaleDateString("en-IN", {
                                            month: "short",
                                            year: "numeric",
                                          })} - ${new Date(
                                            statement.toDate
                                          ).toLocaleDateString("en-IN", {
                                            month: "short",
                                            year: "numeric",
                                          })})`
                                        : `#${statement.id.slice(0, 8)}`}
                                    </p>
                                    <p className="text-[var(--color-on-surface)] opacity-50">
                                      Uploaded on{" "}
                                      {new Date(
                                        statement.createdAt
                                      ).toLocaleDateString("en-IN", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                      })}
                                      {statement.filePassword && (
                                        <span className="ml-2 text-xs text-[var(--color-on-surface)] opacity-70">
                                          (Pass: {statement.filePassword})
                                        </span>
                                      )}
                                    </p>
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {/* BSA Report */}
                                    {!bsaReports[statement.id]?.excel && (
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() =>
                                          handleGetBsaReport(
                                            statement.id,
                                            account.id
                                          )
                                        }
                                        disabled={!!loadingBsaId}
                                        className="text-xs"
                                      >
                                        {loadingBsaId === statement.id ? (
                                          <span className="flex items-center gap-1">
                                            <Spinner />
                                            <span>Loading...</span>
                                          </span>
                                        ) : (
                                          <span>BSA Report</span>
                                        )}
                                      </Button>
                                    )}

                                    {/* Download Button */}
                                    {!!statement.filePrivateKey && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          handleDownloadStatement(
                                            statement.filePrivateKey,
                                            statement.id + ".pdf"
                                          )
                                        }
                                        className="text-xs"
                                      >
                                        Download
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* BSA Report Display */}
                          {bsaReports[statement.id] && (
                            <div className="bg-[var(--color-background)] rounded-lg shadow-sm ">
                              {bsaReports[statement.id] && (
                                <div>
                                  {/* Header */}
                                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                                        <svg
                                          className="w-4 h-4 text-white"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                          />
                                        </svg>
                                      </div>
                                      <div>
                                        <h4 className="text-sm font-bold text-slate-800">
                                          BSA Analysis Report
                                        </h4>
                                        <p className="text-xs text-slate-500">
                                          Bank Statement Analysis
                                        </p>
                                      </div>
                                    </div>
                                    {bsaReports[statement.id]?.excel && (
                                      <a
                                        href={bsaReports[statement.id].excel}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm hover:shadow-md"
                                      >
                                        <svg
                                          className="w-3.5 h-3.5"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                          />
                                        </svg>
                                        Download Excel
                                      </a>
                                    )}
                                  </div>

                                  {bsaReports[statement.id]?.data ? (
                                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                      {/* Message Alert */}
                                      {bsaReports[statement.id].data
                                        ?.message && (
                                        <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg">
                                          <div className="flex items-start gap-2">
                                            <svg
                                              className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0"
                                              fill="none"
                                              viewBox="0 0 24 24"
                                              stroke="currentColor"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                              />
                                            </svg>
                                            <div className="flex-1">
                                              <p className="text-xs font-semibold text-amber-800 mb-0.5">
                                                Important Message
                                              </p>
                                              <p className="text-xs text-amber-700">
                                                {
                                                  bsaReports[statement.id].data
                                                    ?.message
                                                }
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Account Summary Card */}
                                      {bsaReports[statement.id].data
                                        ?.accountSummary && (
                                        <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
                                          <div className="flex items-center gap-2 mb-2.5">
                                            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                              <svg
                                                className="w-3.5 h-3.5 text-white"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                              >
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                                />
                                              </svg>
                                            </div>
                                            <h5 className="text-xs font-bold text-slate-700">
                                              Account Summary
                                            </h5>
                                          </div>
                                          <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg p-2 border border-slate-100">
                                              <p className="text-xs text-slate-500 mb-0.5">
                                                Fraud Score
                                              </p>
                                              <div className="flex items-end gap-1">
                                                <p className="text-base font-bold text-slate-800">
                                                  {bsaReports[statement.id].data
                                                    ?.accountSummary
                                                    ?.fraudScore || 0}
                                                </p>
                                                <p className="text-xs text-slate-500 mb-0.5">
                                                  /100
                                                </p>
                                              </div>
                                            </div>
                                            <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg p-2 border border-slate-100">
                                              <p className="text-xs text-slate-500 mb-0.5">
                                                Avg Balance
                                              </p>
                                              <p className="text-base font-bold text-slate-800">
                                                ₹
                                                {(
                                                  bsaReports[statement.id].data
                                                    ?.accountSummary
                                                    ?.averageBalance || 0
                                                ).toLocaleString()}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Cheque Bounces Card */}
                                      {bsaReports[statement.id].data
                                        ?.chequeBounce && (
                                        <div
                                          className={`rounded-lg border p-3 shadow-sm ${
                                            bsaReports[statement.id].data
                                              ?.chequeBounce?.hasChequeBounce
                                              ? "bg-red-50 border-red-200"
                                              : "bg-emerald-50 border-emerald-200"
                                          }`}
                                        >
                                          <div className="flex items-center gap-2 mb-2.5">
                                            <div
                                              className={`w-6 h-6 rounded-md flex items-center justify-center ${
                                                bsaReports[statement.id].data
                                                  ?.chequeBounce
                                                  ?.hasChequeBounce
                                                  ? "bg-gradient-to-br from-red-500 to-rose-600"
                                                  : "bg-gradient-to-br from-emerald-500 to-green-600"
                                              }`}
                                            >
                                              <svg
                                                className="w-3.5 h-3.5 text-white"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                              >
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                />
                                              </svg>
                                            </div>
                                            <h5
                                              className={`text-xs font-bold ${
                                                bsaReports[statement.id].data
                                                  ?.chequeBounce
                                                  ?.hasChequeBounce
                                                  ? "text-red-800"
                                                  : "text-emerald-800"
                                              }`}
                                            >
                                              Cheque Bounces
                                            </h5>
                                          </div>
                                          <div className="space-y-1.5">
                                            <div className="flex justify-between items-center text-xs">
                                              <span
                                                className={
                                                  bsaReports[statement.id].data
                                                    ?.chequeBounce
                                                    ?.hasChequeBounce
                                                    ? "text-red-700"
                                                    : "text-emerald-700"
                                                }
                                              >
                                                Status
                                              </span>
                                              <span
                                                className={`font-semibold px-2 py-0.5 rounded-full text-xs ${
                                                  bsaReports[statement.id].data
                                                    ?.chequeBounce
                                                    ?.hasChequeBounce
                                                    ? "bg-red-100 text-red-800"
                                                    : "bg-emerald-100 text-emerald-800"
                                                }`}
                                              >
                                                {bsaReports[statement.id].data
                                                  ?.chequeBounce
                                                  ?.hasChequeBounce
                                                  ? "Has Bounces"
                                                  : "No Bounces"}
                                              </span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs bg-white/50 rounded px-2 py-1.5">
                                              <span
                                                className={
                                                  bsaReports[statement.id].data
                                                    ?.chequeBounce
                                                    ?.hasChequeBounce
                                                    ? "text-red-700"
                                                    : "text-emerald-700"
                                                }
                                              >
                                                Inward
                                              </span>
                                              <span
                                                className={`font-semibold ${
                                                  bsaReports[statement.id].data
                                                    ?.chequeBounce
                                                    ?.hasChequeBounce
                                                    ? "text-red-900"
                                                    : "text-emerald-900"
                                                }`}
                                              >
                                                {bsaReports[statement.id].data
                                                  ?.chequeBounce?.inwardBounces
                                                  ?.count || 0}
                                                <span className="text-xs font-normal ml-1">
                                                  (₹
                                                  {(
                                                    bsaReports[statement.id]
                                                      .data?.chequeBounce
                                                      ?.inwardBounces
                                                      ?.totalAmount || 0
                                                  ).toLocaleString()}
                                                  )
                                                </span>
                                              </span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs bg-white/50 rounded px-2 py-1.5">
                                              <span
                                                className={
                                                  bsaReports[statement.id].data
                                                    ?.chequeBounce
                                                    ?.hasChequeBounce
                                                    ? "text-red-700"
                                                    : "text-emerald-700"
                                                }
                                              >
                                                Outward
                                              </span>
                                              <span
                                                className={`font-semibold ${
                                                  bsaReports[statement.id].data
                                                    ?.chequeBounce
                                                    ?.hasChequeBounce
                                                    ? "text-red-900"
                                                    : "text-emerald-900"
                                                }`}
                                              >
                                                {bsaReports[statement.id].data
                                                  ?.chequeBounce?.outwardBounces
                                                  ?.count || 0}
                                                <span className="text-xs font-normal ml-1">
                                                  (₹
                                                  {(
                                                    bsaReports[statement.id]
                                                      .data?.chequeBounce
                                                      ?.outwardBounces
                                                      ?.totalAmount || 0
                                                  ).toLocaleString()}
                                                  )
                                                </span>
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* EMI Details Card */}
                                      {bsaReports[statement.id].data
                                        ?.emiDetails && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 shadow-sm">
                                          <div className="flex items-center gap-2 mb-2.5">
                                            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                                              <svg
                                                className="w-3.5 h-3.5 text-white"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                              >
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                                                />
                                              </svg>
                                            </div>
                                            <h5 className="text-xs font-bold text-blue-800">
                                              EMI Details
                                            </h5>
                                          </div>
                                          <div className="space-y-1.5">
                                            <div className="flex justify-between items-center text-xs">
                                              <span className="text-blue-700">
                                                EMI Status
                                              </span>
                                              <span
                                                className={`font-semibold px-2 py-0.5 rounded-full text-xs ${
                                                  bsaReports[statement.id].data
                                                    ?.emiDetails?.hasEMI
                                                    ? "bg-blue-100 text-blue-800"
                                                    : "bg-gray-100 text-gray-700"
                                                }`}
                                              >
                                                {bsaReports[statement.id].data
                                                  ?.emiDetails?.hasEMI
                                                  ? "Active"
                                                  : "None"}
                                              </span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs bg-white/60 rounded px-2 py-1.5">
                                              <span className="text-blue-700">
                                                Total EMIs
                                              </span>
                                              <span className="font-semibold text-blue-900">
                                                {bsaReports[statement.id].data
                                                  ?.emiDetails?.totalEMIs || 0}
                                              </span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs bg-white/60 rounded px-2 py-1.5">
                                              <span className="text-blue-700">
                                                EMI Bounces
                                              </span>
                                              <span
                                                className={`font-semibold ${
                                                  (bsaReports[statement.id].data
                                                    ?.emiDetails?.emiBounces
                                                    ?.count || 0) > 0
                                                    ? "text-red-600"
                                                    : "text-emerald-600"
                                                }`}
                                              >
                                                {bsaReports[statement.id].data
                                                  ?.emiDetails?.emiBounces
                                                  ?.count || 0}
                                                <span className="text-xs font-normal ml-1">
                                                  (₹
                                                  {(
                                                    bsaReports[statement.id]
                                                      .data?.emiDetails
                                                      ?.emiBounces
                                                      ?.totalAmount || 0
                                                  ).toLocaleString()}
                                                  )
                                                </span>
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Salary Credits Card */}
                                      {bsaReports[statement.id].data
                                        ?.salaryCredits && (
                                        <div
                                          className={`rounded-lg border p-3 shadow-sm ${
                                            bsaReports[statement.id].data
                                              ?.salaryCredits?.hasSalaryCredits
                                              ? "bg-emerald-50 border-emerald-200"
                                              : "bg-gray-50 border-gray-200"
                                          }`}
                                        >
                                          <div className="flex items-center gap-2 mb-2.5">
                                            <div
                                              className={`w-6 h-6 rounded-md flex items-center justify-center ${
                                                bsaReports[statement.id].data
                                                  ?.salaryCredits
                                                  ?.hasSalaryCredits
                                                  ? "bg-gradient-to-br from-emerald-500 to-green-600"
                                                  : "bg-gradient-to-br from-gray-400 to-gray-500"
                                              }`}
                                            >
                                              <svg
                                                className="w-3.5 h-3.5 text-white"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                              >
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                              </svg>
                                            </div>
                                            <h5
                                              className={`text-xs font-bold ${
                                                bsaReports[statement.id].data
                                                  ?.salaryCredits
                                                  ?.hasSalaryCredits
                                                  ? "text-emerald-800"
                                                  : "text-gray-700"
                                              }`}
                                            >
                                              Salary Credits
                                            </h5>
                                          </div>
                                          <div className="space-y-1.5">
                                            <div className="flex justify-between items-center text-xs">
                                              <span
                                                className={
                                                  bsaReports[statement.id].data
                                                    ?.salaryCredits
                                                    ?.hasSalaryCredits
                                                    ? "text-emerald-700"
                                                    : "text-gray-600"
                                                }
                                              >
                                                Status
                                              </span>
                                              <span
                                                className={`font-semibold px-2 py-0.5 rounded-full text-xs ${
                                                  bsaReports[statement.id].data
                                                    ?.salaryCredits
                                                    ?.hasSalaryCredits
                                                    ? "bg-emerald-100 text-emerald-800"
                                                    : "bg-gray-100 text-gray-700"
                                                }`}
                                              >
                                                {bsaReports[statement.id].data
                                                  ?.salaryCredits
                                                  ?.hasSalaryCredits
                                                  ? "Detected"
                                                  : "Not Found"}
                                              </span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs bg-white/60 rounded px-2 py-1.5">
                                              <span
                                                className={
                                                  bsaReports[statement.id].data
                                                    ?.salaryCredits
                                                    ?.hasSalaryCredits
                                                    ? "text-emerald-700"
                                                    : "text-gray-600"
                                                }
                                              >
                                                Last 6 Months
                                              </span>
                                              <span
                                                className={`font-semibold ${
                                                  bsaReports[statement.id].data
                                                    ?.salaryCredits
                                                    ?.hasSalaryCredits
                                                    ? "text-emerald-900"
                                                    : "text-gray-800"
                                                }`}
                                              >
                                                {bsaReports[statement.id].data
                                                  ?.salaryCredits
                                                  ?.last6MonthsCount || 0}{" "}
                                                credits
                                              </span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs bg-white/60 rounded px-2 py-1.5">
                                              <span
                                                className={
                                                  bsaReports[statement.id].data
                                                    ?.salaryCredits
                                                    ?.hasSalaryCredits
                                                    ? "text-emerald-700"
                                                    : "text-gray-600"
                                                }
                                              >
                                                Avg Monthly
                                              </span>
                                              <span
                                                className={`font-semibold ${
                                                  bsaReports[statement.id].data
                                                    ?.salaryCredits
                                                    ?.hasSalaryCredits
                                                    ? "text-emerald-900"
                                                    : "text-gray-800"
                                                }`}
                                              >
                                                ₹
                                                {(
                                                  bsaReports[statement.id].data
                                                    ?.salaryCredits
                                                    ?.avgMonthlySalary || 0
                                                ).toLocaleString()}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* FCU Triggers Card */}
                                      {bsaReports[statement.id].data
                                        ?.fcuTriggers && (
                                        <div
                                          className={`rounded-lg border p-3 shadow-sm ${
                                            (bsaReports[statement.id].data
                                              ?.fcuTriggers?.totalTriggers ||
                                              0) > 0
                                              ? "bg-orange-50 border-orange-200"
                                              : "bg-emerald-50 border-emerald-200"
                                          }`}
                                        >
                                          <div className="flex items-center gap-2 mb-2.5">
                                            <div
                                              className={`w-6 h-6 rounded-md flex items-center justify-center ${
                                                (bsaReports[statement.id].data
                                                  ?.fcuTriggers
                                                  ?.totalTriggers || 0) > 0
                                                  ? "bg-gradient-to-br from-orange-500 to-red-600"
                                                  : "bg-gradient-to-br from-emerald-500 to-green-600"
                                              }`}
                                            >
                                              <svg
                                                className="w-3.5 h-3.5 text-white"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                              >
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                                />
                                              </svg>
                                            </div>
                                            <h5
                                              className={`text-xs font-bold ${
                                                (bsaReports[statement.id].data
                                                  ?.fcuTriggers
                                                  ?.totalTriggers || 0) > 0
                                                  ? "text-orange-800"
                                                  : "text-emerald-800"
                                              }`}
                                            >
                                              Fraud Triggers
                                            </h5>
                                          </div>
                                          <div className="flex justify-between items-center text-xs bg-white/60 rounded px-2 py-1.5">
                                            <span
                                              className={
                                                (bsaReports[statement.id].data
                                                  ?.fcuTriggers
                                                  ?.totalTriggers || 0) > 0
                                                  ? "text-orange-700"
                                                  : "text-emerald-700"
                                              }
                                            >
                                              Total Triggers
                                            </span>
                                            <span
                                              className={`font-bold text-base ${
                                                (bsaReports[statement.id].data
                                                  ?.fcuTriggers
                                                  ?.totalTriggers || 0) > 0
                                                  ? "text-red-600"
                                                  : "text-emerald-600"
                                              }`}
                                            >
                                              {bsaReports[statement.id].data
                                                ?.fcuTriggers?.totalTriggers ||
                                                0}
                                            </span>
                                          </div>
                                        </div>
                                      )}

                                      {/* Penal Charges Card */}
                                      {bsaReports[statement.id].data
                                        ?.penalCharges && (
                                        <div
                                          className={`rounded-lg border p-3 shadow-sm ${
                                            bsaReports[statement.id].data
                                              ?.penalCharges?.hasPenalCharges
                                              ? "bg-red-50 border-red-200"
                                              : "bg-emerald-50 border-emerald-200"
                                          }`}
                                        >
                                          <div className="flex items-center gap-2 mb-2.5">
                                            <div
                                              className={`w-6 h-6 rounded-md flex items-center justify-center ${
                                                bsaReports[statement.id].data
                                                  ?.penalCharges
                                                  ?.hasPenalCharges
                                                  ? "bg-gradient-to-br from-red-500 to-rose-600"
                                                  : "bg-gradient-to-br from-emerald-500 to-green-600"
                                              }`}
                                            >
                                              <svg
                                                className="w-3.5 h-3.5 text-white"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                              >
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                              </svg>
                                            </div>
                                            <h5
                                              className={`text-xs font-bold ${
                                                bsaReports[statement.id].data
                                                  ?.penalCharges
                                                  ?.hasPenalCharges
                                                  ? "text-red-800"
                                                  : "text-emerald-800"
                                              }`}
                                            >
                                              Penal Charges
                                            </h5>
                                          </div>
                                          <div className="space-y-1.5">
                                            <div className="flex justify-between items-center text-xs">
                                              <span
                                                className={
                                                  bsaReports[statement.id].data
                                                    ?.penalCharges
                                                    ?.hasPenalCharges
                                                    ? "text-red-700"
                                                    : "text-emerald-700"
                                                }
                                              >
                                                Status
                                              </span>
                                              <span
                                                className={`font-semibold px-2 py-0.5 rounded-full text-xs ${
                                                  bsaReports[statement.id].data
                                                    ?.penalCharges
                                                    ?.hasPenalCharges
                                                    ? "bg-red-100 text-red-800"
                                                    : "bg-emerald-100 text-emerald-800"
                                                }`}
                                              >
                                                {bsaReports[statement.id].data
                                                  ?.penalCharges
                                                  ?.hasPenalCharges
                                                  ? "Has Charges"
                                                  : "No Charges"}
                                              </span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs bg-white/60 rounded px-2 py-1.5">
                                              <span
                                                className={
                                                  bsaReports[statement.id].data
                                                    ?.penalCharges
                                                    ?.hasPenalCharges
                                                    ? "text-red-700"
                                                    : "text-emerald-700"
                                                }
                                              >
                                                Total Amount
                                              </span>
                                              <span
                                                className={`font-semibold ${
                                                  bsaReports[statement.id].data
                                                    ?.penalCharges
                                                    ?.hasPenalCharges
                                                    ? "text-red-900"
                                                    : "text-emerald-900"
                                                }`}
                                              >
                                                ₹
                                                {(
                                                  bsaReports[statement.id].data
                                                    ?.penalCharges
                                                    ?.totalPenalAmount || 0
                                                ).toLocaleString()}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-center py-8">
                                      <svg
                                        className="w-12 h-12 mx-auto text-slate-300 mb-3"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={1.5}
                                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        />
                                      </svg>
                                      <p className="text-sm text-slate-500 font-medium">
                                        No BSA data available
                                      </p>
                                      <p className="text-xs text-slate-400 mt-1">
                                        Upload a statement to generate analysis
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {!bsaReports[statement.id]?.data && (
                                <div className="text-center text-[var(--color-on-surface)] opacity-70 py-2 text-xs">
                                  No BSA data available
                                </div>
                              )}

                              {/* {bsaReports[statement.id]?.excel && (
                                <div className="mt-2 text-center">
                                  <a
                                    href={bsaReports[statement.id].excel}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-fg-brand bg-neutral-primary border border-brand hover:bg-brand focus:ring-4 focus:ring-brand-subtle font-medium leading-5 rounded-base text-xs px-3 py-1.5 focus:outline-none"
                                  >
                                    View BSA Report (Excel)
                                  </a>
                                </div>
                              )} */}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Actions Row */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-muted)] border-opacity-20">
                {account.verificationStatus.includes("VERIFIED")
                 && (
                  <button
                    onClick={() => setUploadStatementAccountId(account.id)}
                    className="px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors font-medium flex items-center gap-1.5"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    Upload Account Statement
                  </button>
                )}

                {!account.isPrimary && account.verificationStatus.includes("VERIFIED")
                 && (
                  <button
                    onClick={() =>
                      handleSetPrimary(account.id, account.verificationStatus.includes("VERIFIED")
                        
                      )
                    }
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Set as Primary
                  </button>
                )}

                {!account.isPrimary && !account.verificationStatus.includes("VERIFIED")
                 && (
                  <button
                    onClick={() =>
                      showError(
                        "Please verify this account before setting it as primary"
                      )
                    }
                    className="px-4 py-2 bg-gray-200 text-gray-500 text-sm font-medium rounded-lg cursor-not-allowed opacity-60 flex items-center gap-2"
                    disabled
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    Set as Primary (Verify First)
                  </button>
                )}

                <button
                  onClick={() => openEditModal(account)}
                  className="px-3 py-1.5 text-sm text-[var(--color-on-surface)] opacity-60 hover:opacity-100 hover:bg-[var(--color-muted)] hover:bg-opacity-20 rounded-lg transition-all font-medium"
                >
                  Edit
                </button>

                {!account.isPrimary && (
                  <button
                    onClick={() => handleDeleteAccount(account.id)}
                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Account Modal */}
      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          resetForm();
        }}
        title="Add New Bank Account"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="add-accountHolderName"
                className="block text-sm font-medium text-[var(--color-on-surface)] mb-1"
              >
                Account Holder Name <span className="text-red-500">*</span>
              </label>
              <input
                id="add-accountHolderName"
                type="text"
                name="accountHolderName"
                value={form.accountHolderName}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  fieldErrors.accountHolderName && touched.accountHolderName
                    ? "border-red-500"
                    : "border-[var(--color-muted)]"
                }`}
                placeholder="Enter full name"
              />
              {fieldErrors.accountHolderName && touched.accountHolderName && (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.accountHolderName}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="add-accountNumber"
                className="block text-sm font-medium text-[var(--color-on-surface)] mb-1"
              >
                ACCOUNT NUMBER <span className="text-red-500">*</span>
              </label>
              <input
                id="add-accountNumber"
                type="text"
                name="accountNumber"
                value={form.accountNumber}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  fieldErrors.accountNumber && touched.accountNumber
                    ? "border-red-500"
                    : "border-[var(--color-muted)]"
                }`}
                placeholder="1234567890123456"
              />
              {fieldErrors.accountNumber && touched.accountNumber && (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.accountNumber}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="add-ifscCode"
                className="block text-sm font-medium text-[var(--color-on-surface)] mb-1"
              >
                IFSC CODE <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="add-ifscCode"
                  type="text"
                  name="ifscCode"
                  value={form.ifscCode}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  maxLength={11}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    fieldErrors.ifscCode && touched.ifscCode
                      ? "border-red-500"
                      : "border-[var(--color-muted)]"
                  }`}
                  placeholder="ABCD0123456"
                  disabled={fetchingIfsc}
                />
                {fetchingIfsc && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Spinner />
                  </div>
                )}
              </div>
              {fieldErrors.ifscCode && touched.ifscCode && (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.ifscCode}
                </p>
              )}
              {fetchingIfsc && (
                <p className="mt-1 text-xs text-blue-600">
                  Fetching bank details...
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="add-accountType"
                className="block text-sm font-medium text-[var(--color-on-surface)] mb-1"
              >
                ACCOUNT TYPE
              </label>
              <select
                id="add-accountType"
                name="accountType"
                value={form.accountType}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[var(--color-muted)] rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="SAVINGS">Savings</option>
                <option value="CURRENT">Current</option>
              </select>
            </div>
          </div>

          {/* Bank Name and Address Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="add-bankName"
                className="block text-sm font-medium text-[var(--color-on-surface)] mb-1"
              >
                Bank Name <span className="text-red-500">*</span>
              </label>
              <input
                id="add-bankName"
                type="text"
                name="bankName"
                value={form.bankName}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  fieldErrors.bankName && touched.bankName
                    ? "border-red-500"
                    : "border-[var(--color-muted)]"
                }`}
                placeholder="Auto-filled from IFSC or enter manually"
                readOnly={!!form.bankName}
              />
              {fieldErrors.bankName && touched.bankName && (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.bankName}
                </p>
              )}
              {form.bankName && (
                <p className="mt-1 text-xs text-blue-600">
                  Auto-filled from IFSC lookup
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="add-bankAddress"
                className="block text-sm font-medium text-[var(--color-on-surface)] mb-1"
              >
                Bank Address
              </label>
              <input
                id="add-bankAddress"
                type="text"
                name="bankAddress"
                value={form.bankAddress}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[var(--color-muted)] rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter bank branch address"
              />
              {form.bankAddress && (
                <p className="mt-1 text-xs text-green-600">
                  Bank address added
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setIsAddModalOpen(false);
                resetForm();
              }}
              className="px-4 py-2 border border-[var(--color-muted)] rounded-lg hover:bg-[var(--color-muted)] hover:bg-opacity-10 transition-colors"
              disabled={actionLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleAddAccount}
              disabled={
                actionLoading ||
                Object.values(fieldErrors).some((error) => error)
              }
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {actionLoading && <Spinner />}
              Add Account
            </button>
          </div>
        </div>
      </Dialog>

      {/* Upload Bank Statement Modal */}
      <Dialog
        isOpen={uploadStatementAccountId !== null}
        onClose={() => {
          setUploadStatementAccountId(null);
          setStatementFile(null);
          setFilePassword("");
        }}
        title="Upload Bank Statement"
      >
        <div className="space-y-4">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-2">
              Select PDF File <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                className="hidden"
                id="statement-file-input"
              />
              <label
                htmlFor="statement-file-input"
                className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-[var(--color-muted)] rounded-lg cursor-pointer hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:bg-opacity-5 transition-all"
              >
                <div className="text-center">
                  <svg
                    className="w-12 h-12 mx-auto mb-3 text-[var(--color-on-surface)] opacity-40"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="text-sm text-[var(--color-on-surface)] opacity-70 mb-1">
                    {statementFile
                      ? statementFile.name
                      : "Click to upload or drag and drop"}
                  </p>
                  <p className="text-xs text-[var(--color-on-surface)] opacity-50">
                    PDF only (max 15MB)
                  </p>
                </div>
              </label>
            </div>
            {statementFile && (
              <div className="mt-2 flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="text-sm font-medium text-blue-900 flex-1">
                  {statementFile.name}
                </span>
                <button
                  onClick={() => setStatementFile(null)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label
              htmlFor="statement-password"
              className="block text-sm font-medium text-[var(--color-on-surface)] mb-1"
            >
              File Password (optional)
            </label>
            <input
              id="statement-password"
              type="password"
              value={filePassword}
              onChange={(e) => setFilePassword(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-muted)] rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter password if file is protected"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setUploadStatementAccountId(null);
                setStatementFile(null);
                setFilePassword("");
              }}
              className="px-4 py-2 border border-[var(--color-muted)] rounded-lg hover:bg-[var(--color-muted)] hover:bg-opacity-10 transition-colors"
              disabled={uploadingStatement}
            >
              Cancel
            </button>
            <button
              onClick={handleUploadStatement}
              disabled={uploadingStatement || !statementFile}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {uploadingStatement ? (
                <>
                  <Spinner />
                  Uploading...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  Upload Statement
                </>
              )}
            </button>
          </div>
        </div>
      </Dialog>

      {/* Edit Account Modal */}
      <Dialog
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedAccount(null);
          resetForm();
        }}
        title="Edit Bank Account"
      >
        <div className="space-y-4">
          {/* Info banner for verified accounts */}
          {selectedAccount?.verificationStatus.includes("VERIFIED") && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-amber-800">
                  This is a verified account. Only IFSC Code and Account Holder
                  Name can be edited.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="edit-accountHolderName"
                className="block text-sm font-medium text-[var(--color-on-surface)] mb-1"
              >
                Account Holder Name <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-accountHolderName"
                type="text"
                name="accountHolderName"
                value={form.accountHolderName}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  fieldErrors.accountHolderName && touched.accountHolderName
                    ? "border-red-500"
                    : "border-[var(--color-muted)]"
                }`}
                placeholder="Enter full name"
              />
              {fieldErrors.accountHolderName && touched.accountHolderName && (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.accountHolderName}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="edit-accountNumber"
                className="block text-sm font-medium text-[var(--color-on-surface)] mb-1"
              >
                Account Number <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-accountNumber"
                type="text"
                name="accountNumber"
                value={form.accountNumber}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={selectedAccount?.verificationStatus.includes("VERIFIED")
                  
                }
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  fieldErrors.accountNumber && touched.accountNumber
                    ? "border-red-500"
                    : "border-[var(--color-muted)]"
                } ${
                  selectedAccount?.verificationStatus.includes("VERIFIED")
                    ? "bg-gray-100 cursor-not-allowed opacity-60"
                    : ""
                }`}
                placeholder="1234567890123456"
              />
              {fieldErrors.accountNumber && touched.accountNumber && (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.accountNumber}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="edit-ifscCode"
                className="block text-sm font-medium text-[var(--color-on-surface)] mb-1"
              >
                IFSC Code <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="edit-ifscCode"
                  type="text"
                  name="ifscCode"
                  value={form.ifscCode}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  maxLength={11}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    fieldErrors.ifscCode && touched.ifscCode
                      ? "border-red-500"
                      : "border-[var(--color-muted)]"
                  }`}
                  placeholder="ABCD0123456"
                  disabled={fetchingIfsc}
                />
                {fetchingIfsc && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Spinner />
                  </div>
                )}
              </div>
              {fieldErrors.ifscCode && touched.ifscCode && (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.ifscCode}
                </p>
              )}
              {fetchingIfsc && (
                <p className="mt-1 text-xs text-blue-600">
                  Fetching bank details...
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="edit-accountType"
                className="block text-sm font-medium text-[var(--color-on-surface)] mb-1"
              >
                Account Type
              </label>
              <select
                id="edit-accountType"
                name="accountType"
                value={form.accountType}
                onChange={handleChange}
                disabled={selectedAccount?.verificationStatus.includes("VERIFIED")}
                className={`w-full px-3 py-2 border border-[var(--color-muted)] rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  selectedAccount?.verificationStatus.includes("VERIFIED")
                    ? "bg-gray-100 cursor-not-allowed opacity-60"
                    : ""
                }`}
              >
                <option value="SAVINGS">Savings</option>
                <option value="CURRENT">Current</option>
              </select>
            </div>
          </div>

          {/* Bank Name and Address Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="edit-bankName"
                className="block text-sm font-medium text-[var(--color-on-surface)] mb-1"
              >
                Bank Name <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-bankName"
                type="text"
                name="bankName"
                value={form.bankName}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  fieldErrors.bankName && touched.bankName
                    ? "border-red-500"
                    : "border-[var(--color-muted)]"
                }`}
                placeholder="Auto-filled from IFSC or enter manually"
                readOnly={!!form.bankName}
              />
              {fieldErrors.bankName && touched.bankName && (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.bankName}
                </p>
              )}
              {form.bankName && (
                <p className="mt-1 text-xs text-blue-600">
                  Auto-filled from IFSC lookup
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="edit-bankAddress"
                className="block text-sm font-medium text-[var(--color-on-surface)] mb-1"
              >
                Bank Address
              </label>
              <input
                id="edit-bankAddress"
                type="text"
                name="bankAddress"
                value={form.bankAddress}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[var(--color-muted)] rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter bank branch address"
              />
              {form.bankAddress && (
                <p className="mt-1 text-xs text-green-600">
                  Bank address added
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedAccount(null);
                resetForm();
              }}
              className="px-4 py-2 border border-[var(--color-muted)] rounded-lg hover:bg-[var(--color-muted)] hover:bg-opacity-10 transition-colors"
              disabled={actionLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleEditAccount}
              disabled={
                actionLoading ||
                Object.values(fieldErrors).some((error) => error)
              }
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {actionLoading && <Spinner />}
              Update Account
            </button>
          </div>
        </div>
      </Dialog>

      {/* Account Aggregator Section */}
      <div className="mt-8">
        <CustomerDetailsTabs />
      </div>
    </div>
  );
}
