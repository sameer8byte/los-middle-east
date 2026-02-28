import { useEffect, useState, useCallback, useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import { HiOutlineCalendar } from "react-icons/hi2";
import { FiCopy } from "react-icons/fi";
import { formatDateWithTime, maskAadhaar, maskPan } from "../../../lib/utils";
import { useToast } from "../../../context/toastContext";
import { useQueryParams } from "../../../hooks/useQueryParams";
import { useResendConfirmation } from "../../../hooks/useResendConfirmation";
import { SectionStatusUpdate } from "../../customerDetails/components/senction/sectionStatusUpdate";
import {
  AgreementStatusEnum,
  BrandProviderType,
  DocumentTypeEnum,
  getUserStatusDisplay,
  LoanStatusEnum,
  PartnerTabsEnum,
  TransactionStatusEnum,
} from "../../../constant/enum";
import { Spinner } from "../../../common/ui/spinner";
import { LoanAgreements } from "../../customerDetails/components/loanAgreament";
import { SyncEsignStatus } from "../../common/synsEsignStatus";
import { RelocateLoan } from "../../customerDetails/components/relocateLoan";
import {
  Table,
  Pagination as TablePagination,
  SearchInput,
  ErrorMessage,
} from "../../../common/ui/table";
import Avatar from "../../../common/ui/avatar";
import { Button } from "../../../common/ui/button";
import {
  getAllLoans,
  sendBackToCreditExecutive,
  clearLoansCache,
  skipAutopayConsent,
} from "../../../shared/services/api/loan.api";
import {
  resetAgreementStatus,
  sendDocumentForSigning,
} from "../../../shared/services/api/agreament.api";
import { Loan } from "../../../shared/types/loan";
import { Pagination } from "../../../shared/types/pagination";
import { Filters } from "./filters";
import { FilterButton } from "../../../common/common/filterButton";
import { ResendConfirmationDialog } from "../../../common/dialog/resendConfirmationDialog";
import { SendBackToCEDialog } from "../../../common/dialog/sendBackToCEDialog";
import { LoanAgreementDetailsDialog } from "../../../common/dialog/loanAgreementDetailsDialog";
import { CreateAutopayTransactionDialog } from "../../../common/dialog/createAutopayTransactionDialog";
import { SkipAutopayConsentDialog } from "../../../common/dialog/skipAutopayConsentDialog";
import { useCustomerNavigator } from "../../../hooks/useViewCustomer";
import { usePersistedSearch } from "../../../hooks/usePersistedSearch";
import { useAppSelector } from "../../../shared/redux/store";
import dayjs from "dayjs";
import { LoanStatusBadge } from "../../../common/ui/LoanStatusBadge";
import { selectProvidersByType } from "../../../shared/redux/slices/brand.slice";
import { FaRupeeSign } from "react-icons/fa";
import { ChangeLoanRuleType } from "../../loans/components/changeLoanRuleType";

// Razorpay type declaration
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function LoanList() {
  const auth = useAppSelector((state) => state.auth.data);
  const { getQuery, setQuery } = useQueryParams();
  const apiProviders = useAppSelector((state) =>
    selectProvidersByType(state, BrandProviderType.UPI_AUTOPAY),
  );
  const [loanTypeFilter, setLoanTypeFilter] = useState<string>(() => {
    const savedFilter = sessionStorage.getItem("loansLoanTypeFilter");
    return savedFilter || "";
  });

  // Handle loan type filter change
  const handleLoanTypeFilterClick = (typeFilter: string) => {
    setLoanTypeFilter(typeFilter);
    sessionStorage.setItem("loansLoanTypeFilter", typeFilter);
  };
  const [isRelocating, setIsRelocating] = useState(false);
  const [agreementLoading, setAgreementLoading] = useState<string | null>(null);
  const {
    showResendConfirmation,
    resendData,
    selectedProvider,
    handleResendConfirmation,
    handleProviderChange,
    cancelResend,
  } = useResendConfirmation();
  const [resendLoading, setResendLoading] = useState(false);
  const sectionStatusUpdateLoadId = getQuery("sectionStatusUpdateLoadId");
  const [loan, setLoan] = useState<Loan | null>(null);
  const [agreementId, setAgreementId] = useState<string | null>(null);
  const [agreementUserId, setAgreementUserId] = useState<string | null>(null);
  const [showAgreementDetailsDialog, setShowAgreementDetailsDialog] =
    useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState<any>(null);

  // Send back to CE state
  const [showSendBackConfirmation, setShowSendBackConfirmation] =
    useState(false);
  const [sendBackData, setSendBackData] = useState<{
    loanId: string;
    customerName: string;
  } | null>(null);
  const [sendBackLoading, setSendBackLoading] = useState(false);
  // Autopay Transaction Dialog state
  const [showAutopayDialog, setShowAutopayDialog] = useState(false);
  const [autopayLoanData, setAutopayLoanData] = useState<{
    loanId: string;
    formattedLoanId: string;
    customerName: string;
    amount: number;
    userId: string;
  } | null>(null);

  // Skip Autopay Consent Dialog state
  const [showSkipAutopayDialog, setShowSkipAutopayDialog] = useState(false);
  const [skipAutopayData, setSkipAutopayData] = useState<{
    loanId: string;
    formattedLoanId: string;
    customerName: string;
  } | null>(null);
  const [skipAutopayLoading, setSkipAutopayLoading] = useState(false);

  const { search } = useLocation();
  const { brandId } = useParams();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalLoanAmount, setTotalLoanAmount] = useState<number>(0);

  // Initialize pagination from localStorage to prevent double render
  const [pagination, setPagination] = useState<Pagination>(() => {
    const savedLimit = localStorage.getItem("loanSanctionHeadListPageSize");
    const savedPage = localStorage.getItem("loanSanctionHeadListPage");
    return {
      page: savedPage ? Number(savedPage) : 1,
      limit: savedLimit ? Number(savedLimit) : 10,
      dateFilter: "",
    };
  });
  const [totalCount, setTotalCount] = useState(0);
  const { searchTerm, setSearchTerm, clearSearch } = usePersistedSearch(
    "loanSanctionHeadList_search",
    "",
  );
  const queryParams = new URLSearchParams(search);
  const queryObject = Object.fromEntries(queryParams.entries());
  const [refresh, setRefresh] = useState(false);

  // Cache clear state
  const [isClearingCache, setIsClearingCache] = useState(false);

  // Memoized calculations
  const totalPages = useMemo(() => {
    return Math.ceil(totalCount / pagination.limit);
  }, [totalCount, pagination.limit]);

  const fetchLoans = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    if (!brandId) {
      setError("Brand ID is required");
      setIsLoading(false);
      return;
    }
    try {
      const response = await getAllLoans(
        brandId,
        PartnerTabsEnum.SANCTION_HEAD,
        {
          page: pagination.page,
          limit: pagination.limit,
          dateFilter: queryObject?.dateFilter,
        },
        {
          pSenctionStatus:
            queryObject?.status || '["SANCTION_MANAGER_APPROVED"]',
          search: searchTerm || "",
          loanAgreementStatus: queryObject?.loanAgreementStatus || "[]",
          loanType: loanTypeFilter || "",
        },
      );
      setLoans(response.loans);
      setTotalCount(response.meta.total);
      setTotalLoanAmount(response.meta.totalLoanAmount || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch loans");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [
    brandId,
    pagination.limit,
    pagination.page,
    queryObject?.dateFilter,
    queryObject?.status,
    searchTerm,
    refresh,
    queryObject?.loanAgreementStatus,
    loanTypeFilter,
  ]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (brandId) fetchLoans();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [fetchLoans, brandId]);

  const handlePageChange = useCallback((newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  }, []);

  const handleLimitChange = useCallback((newLimit: number) => {
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
  }, []);

  const { handleView } = useCustomerNavigator();

  // Toast for notifications
  const { showSuccess } = useToast();

  // Track copied loan ID for animation
  const [copiedLoanId, setCopiedLoanId] = useState<string | null>(null);
  const [ruleTypeLoanId, setRuleTypeLoanId] = useState<string | null>(null);

  // Handle cache clear
  const handleClearCache = useCallback(async () => {
    if (!brandId) return;

    setIsClearingCache(true);
    try {
      const result = await clearLoansCache(brandId);
      showSuccess(
        "Cache Cleared!",
        `${result.message} - Fresh data will load on next query`,
      );
      // Refresh the current data
      await fetchLoans();
    } catch (error) {
      console.error("Error clearing cache:", error);
      showSuccess("Cache Clear Failed", "Please try again or contact support");
    } finally {
      setIsClearingCache(false);
    }
  }, [brandId, showSuccess, fetchLoans]);

  // Copy customer info to clipboard
  const copyCustomerInfo = useCallback(
    (loan: Loan, e: React.MouseEvent) => {
      e.stopPropagation();

      const fullName = [
        loan.user?.userDetails?.firstName,
        loan.user?.userDetails?.middleName,
        loan.user?.userDetails?.lastName,
      ]
        .filter(Boolean)
        .join(" ");

      const formattedName = fullName
        ? fullName
            .split(" ")
            .map(
              (word) =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
            )
            .join(" ")
        : "N/A";

      const documents = loan.user?.documents ?? [];
      const documentInfo = documents.length
        ? documents
            .map((doc) => {
              const docNumber =
                doc.type === DocumentTypeEnum.AADHAAR
                  ? maskAadhaar(doc.documentNumber)
                  : maskPan(doc.documentNumber);
              return `${doc.type}: ${docNumber}`;
            })
            .join("\n")
        : "No documents";

      const copyText = `
═══════════════════════════════
        CUSTOMER INFORMATION
═══════════════════════════════

👤 Personal Details
━━━━━━━━━━━━━━━━━━━━
Name: ${formattedName}
Loan ID: ${loan.formattedLoanId}
${loan?.isMigratedloan ? `Migrated From: ${loan.oldLoanId}\n` : ""}
📧 Contact Information
━━━━━━━━━━━━━━━━━━━━
Email: ${loan.user.email || "N/A"}
Phone: ${loan.user.phoneNumber || "N/A"}

💰 Loan Details
━━━━━━━━━━━━━━━━━━━━
Amount: ₹${loan.amount?.toLocaleString("en-IN") || "N/A"}
Status: ${loan.status}
Agreement: ${
        loan?.agreement?.status
          ? loan.agreement.status.toLowerCase().replace(/_/g, " ")
          : "N/A"
      }

📄 Documents
━━━━━━━━━━━━━━━━━━━━
${documentInfo}

═══════════════════════════════
Generated on ${dayjs().format("DD MMM YYYY, hh:mm A")} by ${auth?.email}(${
        auth.name
      }) -  ${auth?.role || "N/A"} 
---- LOAN SANCTION HEAD ----
═══════════════════════════════


    `.trim();

      navigator.clipboard.writeText(copyText).then(() => {
        setCopiedLoanId(loan.id);
        showSuccess("Copied!", "Customer information copied to clipboard");
        setTimeout(() => {
          setCopiedLoanId(null);
        }, 2000);
      });
    },
    [showSuccess],
  );

  const confirmResend = async () => {
    if (!resendData) return;

    setResendLoading(true);
    try {
      // First reset the agreement status
      await resetAgreementStatus(resendData.agreementId);

      // Then send the document with the selected provider
      await sendDocumentForSigning(
        resendData.agreementUserId,
        resendData.agreementId,
        selectedProvider,
      );

      // Refresh the loans list
      await fetchLoans();

      cancelResend();
    } catch (error) {
      console.error("Error during resend:", error);
      // You might want to show an error toast here
    } finally {
      setResendLoading(false);
    }
  };

  // Send back to CE handlers
  const handleSendBackConfirmation = (loanId: string, customerName: string) => {
    setSendBackData({
      loanId,
      customerName,
    });
    setShowSendBackConfirmation(true);
  };

  const confirmSendBack = async (reason: string, comments: string) => {
    if (!sendBackData || !brandId) return;

    setSendBackLoading(true);
    try {
      await sendBackToCreditExecutive(brandId, {
        loanId: sendBackData.loanId,
        reason: reason,
        comments: comments,
      });

      setShowSendBackConfirmation(false);
      setSendBackData(null);

      // Refresh the loans list
      await fetchLoans();
    } catch (error) {
      console.error("Error sending back loan to CE:", error);
      alert("Failed to send back loan to Credit Executive");
    } finally {
      setSendBackLoading(false);
    }
  };

  const cancelSendBack = () => {
    setShowSendBackConfirmation(false);
    setSendBackData(null);
  };

  // Handle autopay transaction
  const handleCreateAutopayTransaction = (loan: Loan) => {
    const fullName = [
      loan.user?.userDetails?.firstName,
      loan.user?.userDetails?.middleName,
      loan.user?.userDetails?.lastName,
    ]
      .filter(Boolean)
      .join(" ");

    setAutopayLoanData({
      loanId: loan.id,
      formattedLoanId: loan.formattedLoanId,
      customerName: fullName,
      amount: loan.amount || 0,
      userId: loan.user.id,
    });
    setShowAutopayDialog(true);
  };

  // Handle skip autopay consent
  const handleSkipAutopayConsent = (loan: Loan) => {
    const fullName = [
      loan.user?.userDetails?.firstName,
      loan.user?.userDetails?.middleName,
      loan.user?.userDetails?.lastName,
    ]
      .filter(Boolean)
      .join(" ");

    setSkipAutopayData({
      loanId: loan.id,
      formattedLoanId: loan.formattedLoanId,
      customerName: fullName,
    });
    setShowSkipAutopayDialog(true);
  };

  const confirmSkipAutopay = async (reason: string) => {
    if (!skipAutopayData || !brandId) return;

    setSkipAutopayLoading(true);
    try {
      await skipAutopayConsent(brandId, skipAutopayData.loanId, reason);

      showSuccess("Success", "Autopay consent skipped successfully!");
      setShowSkipAutopayDialog(false);
      setSkipAutopayData(null);

      // Refresh the loans list
      await fetchLoans();
    } catch (error) {
      console.error("Error skipping autopay consent:", error);
      showSuccess(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to skip autopay consent",
      );
    } finally {
      setSkipAutopayLoading(false);
    }
  };

  const cancelSkipAutopay = () => {
    setShowSkipAutopayDialog(false);
    setSkipAutopayData(null);
  };

  const closeAgreementPanel = () => {
    setAgreementId(null);
    setAgreementUserId(null);
  };

  const setAgreementParams = async (
    agreementIdParam: string,
    agreementUserIdParam: string,
    loanId: string,
    isResend: boolean = false,
  ) => {
    try {
      setAgreementLoading(loanId);

      // If it's a resend, first reset the agreement status to NOT_SENT
      if (isResend) {
        await resetAgreementStatus(agreementIdParam);
        // Refresh the loans list to show updated status
        await fetchLoans();
      }

      setAgreementId(agreementIdParam);
      setAgreementUserId(agreementUserIdParam);
    } catch (error) {
      console.error("Error setting agreement params:", error);
      setAgreementLoading(null);
    } finally {
      setAgreementLoading(null);
    }
  };

  const getAgreementStatusText = (status: AgreementStatusEnum) => {
    switch (status) {
      case AgreementStatusEnum.SIGNED:
        return "Signed";
      case AgreementStatusEnum.REJECTED:
        return "Rejected";
      case AgreementStatusEnum.EXPIRED:
        return "Expired";
      case AgreementStatusEnum.SENT:
        return "Sent";
      default:
        return "-";
    }
  };

  // Define table columns
  const columns = useMemo(
    () => [
      {
        key: "customer",
        label: "Customer",
        render: (_: any, loan: Loan) => {
          const fullName = [
            loan.user?.userDetails?.firstName,
            loan.user?.userDetails?.middleName,
            loan.user?.userDetails?.lastName,
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div className="group relative">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-[var(--color-surface)] rounded-full flex items-center justify-center">
                  <Avatar />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-[var(--color-on-background)]">
                    {fullName}

                    {loan?.isMigratedloan && (
                      <span className=" inline-flex items-center bg-[var(--color-secondary)] bg-opacity-10 px-2 py-0.5 text-xs font-medium text-[var(--color-on-secondary)]">
                        Migrated ({loan.oldLoanId})
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-[var(--color-on-surface)] opacity-70">
                    #{loan.formattedLoanId}
                  </div>
                </div>
                {loan.user.employment?.salary && (
                  <div className="flex items-center gap-2 text-xs text-[var(--color-on-surface)] opacity-70 mt-1">
                    <FaRupeeSign className="w-3 h-3" />{" "}
                    {/* Add this import at top */}
                    <span>
                      Salary: ₹
                      {loan.user.employment?.salary?.toLocaleString() || "N/A"}
                    </span>
                  </div>
                )}
                {/* Loan Type Badge */}
                <div className="flex flex-col gap-1.5">
                  {loan.loanType && (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${
                        !loan?.is_repeat_loan
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {!loan?.is_repeat_loan ? "Fresh" : "Repeat"}
                    </span>
                  )}
                  {loan.is_workflow_automated && (
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-800">
                      Automated
                    </span>
                  )}
                </div>
                {/* Copy Button */}
                <button
                  onClick={(e) => copyCustomerInfo(loan, e)}
                  className={`absolute -top-1 -right-1 p-1.5 rounded-md hover:bg-[var(--color-background)] opacity-0 group-hover:opacity-100 transition-all shadow-sm border border-[var(--color-muted)] border-opacity-30 ${
                    copiedLoanId === loan.id
                      ? "bg-green-500 scale-110 opacity-100"
                      : "bg-[var(--color-surface)]"
                  }`}
                  title={
                    copiedLoanId === loan.id ? "Copied!" : "Copy customer info"
                  }
                >
                  {copiedLoanId === loan.id ? (
                    <svg
                      className="h-3.5 w-3.5 text-primary"
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
                  ) : (
                    <FiCopy className="h-3.5 w-3.5 text-[var(--color-on-surface)]" />
                  )}
                </button>
              </div>
            </div>
          );
        },
      },
      {
        key: "customer_status",
        label: "Customer Status",
        render: (_: any, loan: Loan) => {
          const hasStatusReasons =
            loan.user?.user_status_brand_reasons &&
            loan.user.user_status_brand_reasons.length > 0;
          const hasBlockAlert = loan.user?.userDetails?.userBlockAlert;

          return (
            <div className="space-y-2 min-w-[180px]">
              {/* Account Status */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--color-on-background)] capitalize">
                    {getUserStatusDisplay(loan.user?.status_id)}
                  </span>
                </div>
                {hasBlockAlert && (
                  <div className="flex flex-col gap-1 mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        ----- ⚠️ FD Alert -----
                      </span>
                    </div>
                    <div className="text-xs text-amber-800 mt-1">
                      {loan.user?.userDetails.userBlockAlert}
                    </div>
                  </div>
                )}
                {/* Status Reasons */}
                {hasStatusReasons && (
                  <div className="flex flex-col gap-1 mt-1">
                    <span className="text-xs text-[var(--color-on-surface)] opacity-70">
                      Reasons:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {(loan.user?.user_status_brand_reasons || []).map(
                        (item) => (
                          <span
                            key={item.id}
                            className="inline-flex items-center px-2 py-0.5 text-xs bg-[var(--color-muted)] text-[var(--color-on-surface)] rounded-md"
                            title={item.brand_status_reasons.reason}
                          >
                            {item.brand_status_reasons.reason}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        key: "amount",
        label: "Amounts",
        render: (_: any, loan: Loan) => (
          <div className="flex flex-col gap-1.5 min-w-[160px]">
            <div className="flex items-start gap-1">
              <span className="text-xs font-medium text-gray-700 whitespace-nowrap">Loan Amount:</span>
              <span className="text-sm font-bold text-gray-900">
                ₹{loan.amount?.toLocaleString("en-IN") || "N/A"}
              </span>
            </div>
            {loan.disbursement && (
              <div className="flex items-start gap-1">
                <span className="text-xs font-medium text-gray-700 whitespace-nowrap">Disbursed:</span>
                <span className="text-sm font-bold text-gray-900">
                  ₹{loan.disbursement.netAmount?.toLocaleString("en-IN") || "N/A"}
                </span>
              </div>
            )}
          </div>
        ),
      },
      {
        key: "loanAssignedExecutive",
        label: "Assigned To",
        render: (_: any, loan: Loan) => {
          const assignedPartners = loan.allottedPartners || [];

          if (assignedPartners.length === 0) {
            return (
              <div className="text-sm text-[var(--color-on-surface)] opacity-50 italic">
                Not assigned
              </div>
            );
          }

          return (
            <div className="flex flex-col gap-2 max-w-[220px]">
              {assignedPartners.map((assignedPartner) => {
                const role = assignedPartner.partnerUser.reportsToId
                  ? "Executive"
                  : "Manager/Head";
                const bgColor = assignedPartner.partnerUser.reportsToId
                  ? "#EA5E18"
                  : "#10B981";

                return (
                  <div
                    key={assignedPartner.id}
                    className="flex items-center gap-1.5 bg-[var(--color-surface)] bg-opacity-50 rounded px-2 py-1"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: bgColor }}
                    >
                      <span className="text-white text-sm font-medium">
                        {assignedPartner.partnerUser.name?.charAt(0) || "U"}
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-sm font-medium text-[var(--color-on-background)] truncate"
                          title={assignedPartner.partnerUser.name || "N/A"}
                        >
                          {assignedPartner.partnerUser.name || "N/A"}
                        </span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: assignedPartner.partnerUser
                              .reportsToId
                              ? "#FEF3C7"
                              : "#D1FAE5",
                            color: assignedPartner.partnerUser.reportsToId
                              ? "#92400E"
                              : "#065F46",
                          }}
                        >
                          {role}
                        </span>
                      </div>
                      <span
                        className="text-xs text-[var(--color-on-surface)] opacity-70 truncate"
                        title={assignedPartner.partnerUser.email || ""}
                      >
                        {assignedPartner.partnerUser.email || "No email"}
                      </span>
                      <span className="text-xs text-[var(--color-on-surface)] opacity-60">
                        Amount: ₹
                        {assignedPartner.amount?.toLocaleString("en-IN") || "0"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        },
      },
      {
        key: "loan_status",
        label: "Loan Status",
        render: (_: any, loan: Loan) => {
          // Get the latest status history entry with reasons
          const latestStatusWithReasons = loan.loanStatusHistory?.find(
            (history) =>
              history.status === loan.status &&
              history.loan_status_brand_reasons &&
              history.loan_status_brand_reasons.length > 0,
          );

          const statusReasons =
            latestStatusWithReasons?.loan_status_brand_reasons || [];

          // Get the latest status history entry for partner user info
          const latestStatusHistory = loan.loanStatusHistory?.find(
            (history) => history.status === loan.status,
          );

          return (
            <div className="flex flex-col gap-1 max-w-[220px]">
              <LoanStatusBadge status={loan.status} />

              {/* Show partner user who processed this status */}
              {latestStatusHistory?.partnerUser && (
                <div className="flex items-center gap-1.5 bg-[var(--color-surface)] bg-opacity-50 rounded px-2 py-1">
                  <div className="w-5 h-5 bg-[#EA5E18] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-medium">
                      {latestStatusHistory.partnerUser.name?.charAt(0) || "U"}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span
                      className="text-xs font-medium text-[var(--color-on-background)] truncate"
                      title={latestStatusHistory.partnerUser.name || "N/A"}
                    >
                      {latestStatusHistory.partnerUser.name || "N/A"}
                    </span>
                    <span
                      className="text-xs text-[var(--color-on-surface)] opacity-70 truncate"
                      title={latestStatusHistory.partnerUser.email || ""}
                    >
                      {latestStatusHistory.partnerUser.email || "No email"}
                    </span>
                  </div>
                </div>
              )}

              {/* Show reasons if available */}
              {statusReasons.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {statusReasons.map((reasonItem) => (
                    <span
                      key={reasonItem.id}
                      className="inline-flex items-center rounded-full bg-[var(--color-error)] bg-opacity-10 px-2 py-0.5 text-xs font-medium text-[var(--color-error)]"
                      title={reasonItem.brandStatusReason.reason}
                    >
                      {reasonItem.brandStatusReason.reason}
                    </span>
                  ))}
                </div>
              )}

              <span className="inline-flex items-center rounded-full bg-[var(--color-surface)] px-2 py-0.5 text-xs font-medium text-[var(--color-on-surface)] opacity-80 capitalize">
                Agreement: {loan.agreement?.status?.toLowerCase() || "N/A"}
              </span>
            </div>
          );
        },
      },
      {
        key: "created",
        label: "Created",
        render: (_: any, loan: Loan) => (
          <div className="text-sm text-[var(--color-on-background)] flex items-center gap-2">
            <HiOutlineCalendar className="h-4 w-4 text-[var(--color-on-surface)] opacity-50" />
            {formatDateWithTime(loan.createdAt)}
          </div>
        ),
      },
      {
        key: "autopay_consent",
        label: "Autopay Consent",
        render: (_: any, loan: Loan) => {
          // Get AUTOPAY_CONSENT payment requests from the loan

          const autopayConsents =
            loan.paymentRequests?.filter(
              (pr) => (pr.type as any) === "AUTOPAY_CONSENT",
            ) || [];

          // Get successful AUTOPAY_CONSENT requests
          const successfulConsents = autopayConsents.filter(
            (consent) => consent.status === TransactionStatusEnum.SUCCESS,
          );

          // Get pending AUTOPAY_CONSENT requests
          const pendingConsents = autopayConsents.filter(
            (consent) => consent.status === TransactionStatusEnum.PENDING,
          );

          // Get failed AUTOPAY_CONSENT requests
          const failedConsents = autopayConsents.filter(
            (consent) =>
              consent.status === TransactionStatusEnum.FAILED ||
              consent.status === TransactionStatusEnum.CANCELLED,
          );

          const totalConsents = autopayConsents.length;

          if (apiProviders.length === 0) {
            return (
              <div className="text-sm text-[var(--color-on-surface)] opacity-50 italic">
                No Autopay
              </div>
            );
          }
          const isSignedAgreement =
            loan?.agreement?.status === AgreementStatusEnum.SIGNED;

          if (!isSignedAgreement) {
            return (
              <div className="text-sm text-[var(--color-on-surface)] opacity-50 italic">
                Awaiting Signed Agreement
              </div>
            );
          }

          return (
            <div className="flex flex-col gap-2 max-w-[240px]">
              {/* Summary Stats */}
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium text-[var(--color-on-background)]">
                  {totalConsents} Total
                </span>
              </div>

              {/* Successful Status */}
              {successfulConsents.length > 0 && (
                <div className="flex items-center gap-2 px-2 py-1 bg-green-50 border border-green-200 rounded">
                  <svg
                    className="w-3.5 h-3.5 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-green-800">
                      Success: {successfulConsents.length}
                    </span>
                    <span className="text-xs text-green-700">
                      {successfulConsents[0]?.updatedAt
                        ? new Date(
                            successfulConsents[0].updatedAt,
                          ).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                </div>
              )}

              {/* Pending Status */}
              {pendingConsents.length > 0 && (
                <div className="flex items-center gap-2 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded">
                  <svg
                    className="w-3.5 h-3.5 text-yellow-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-yellow-800">
                      Pending: {pendingConsents.length}
                    </span>
                    <span className="text-xs text-yellow-700">
                      {pendingConsents[0]?.createdAt
                        ? new Date(
                            pendingConsents[0].createdAt,
                          ).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                </div>
              )}

              {/* Failed Status */}
              {failedConsents.length > 0 && (
                <div className="flex items-center gap-2 px-2 py-1 bg-red-50 border border-red-200 rounded">
                  <svg
                    className="w-3.5 h-3.5 text-red-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-red-800">
                      Failed: {failedConsents.length}
                    </span>
                    <span className="text-xs text-red-700">
                      {failedConsents[0]?.updatedAt
                        ? new Date(
                            failedConsents[0].updatedAt,
                          ).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                </div>
              )}

              {/* Autopay Transaction Button - Show for approved loans */}
              {(loan.status === LoanStatusEnum.SANCTION_MANAGER_APPROVED ||
                loan.status === LoanStatusEnum.APPROVED) &&
                apiProviders.length > 0 && (
                  // successfulConsents.length === 0 &&
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateAutopayTransaction(loan);
                    }}
                    variant="outline"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m0 0h6"
                      />
                    </svg>
                    Autopay Transaction
                  </Button>
                )}

              {/* Skip Autopay Consent Button - Show when no successful consents */}
              {(loan.status === LoanStatusEnum.SANCTION_MANAGER_APPROVED ||
                loan.status === LoanStatusEnum.APPROVED) && (
                // successfulConsents.length === 0 &&
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSkipAutopayConsent(loan);
                  }}
                  variant="outline"
                  className="border-orange-300 hover:border-orange-400 hover:bg-orange-50 text-orange-700"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Skip Autopay
                </Button>
              )}
            </div>
          );
        },
      },
      {
        key: "agreement",
        label: "Agreement",
        render: (_: any, loan: Loan) => {
          //UPDATED: Check for Active Mandate using correct property name ---

          // ONLY proceed with the existing UI if mandate is active AND loan status is correct
          return loan.status === LoanStatusEnum.SANCTION_MANAGER_APPROVED ||
            loan.status === LoanStatusEnum.APPROVED ? (
            <div>
              {loan?.agreement?.status &&
              loan?.agreement?.status !== AgreementStatusEnum.NOT_SENT ? (
                <div className="text-sm text-[var(--color-on-surface)] opacity-70 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span>{getAgreementStatusText(loan.agreement.status)}</span>
                    {loan?.agreement?.status === AgreementStatusEnum.SENT && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAgreement(loan.agreement);
                          setShowAgreementDetailsDialog(true);
                        }}
                      >
                        View Details
                      </Button>
                    )}
                  </div>
                  {loan?.agreement?.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        const fullName = [
                          loan.user?.userDetails?.firstName,
                          loan.user?.userDetails?.middleName,
                          loan.user?.userDetails?.lastName,
                        ]
                          .filter(Boolean)
                          .join(" ");
                        handleResendConfirmation(
                          loan.agreement.id,
                          loan.user.id,
                          loan.id,
                          fullName,
                        );
                      }}
                      loading={agreementLoading === loan.id}
                    >
                      {agreementLoading === loan.id ? (
                        <>
                          <Spinner theme="light" />
                          <span>Resending...</span>
                        </>
                      ) : (
                        <span>Resend</span>
                      )}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 text-sm text-[var(--color-on-surface)]">
                  <span className="italic opacity-50">Not Sent</span>

                  {loan?.agreement?.id && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAgreementParams(
                          loan.agreement.id,
                          loan.user.id,
                          loan.id,
                          false, // isResend = false
                        );
                      }}
                      loading={agreementLoading === loan.id}
                      size="sm"
                      variant="primary"
                    >
                      {agreementLoading === loan.id ? "Sending..." : "Send"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <span className="text-[var(--color-on-surface)] opacity-50">-</span>
          );
        },
      },
      {
        key: "actions",
        label: "Actions",
        render: (_: any, loan: Loan) => (
          <div className="flex items-center flex-col gap-2">
            {loan.status === LoanStatusEnum.CREDIT_EXECUTIVE_APPROVED ? (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  setLoan(loan);
                  setQuery("sectionStatusUpdateLoadId", loan.id);
                }}
              >
                Approve Loan
              </Button>
            ) : (
              <></>
            )}

            {/* Always show View */}
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleView(loan.user.id, brandId!, "sanction-head");
              }}
              variant="outline"
            >
              View
            </Button>
            {/* Send back to CE Button */}
            <Button
              onClick={(e) => {
                e.stopPropagation();
                const fullName = [
                  loan.user?.userDetails?.firstName,
                  loan.user?.userDetails?.middleName,
                  loan.user?.userDetails?.lastName,
                ]
                  .filter(Boolean)
                  .join(" ");
                handleSendBackConfirmation(loan.id, fullName);
              }}
              variant="outline"
            >
              Send back to CE
            </Button>
          </div>
        ),
      },
    ],
    [
      handleView,
      setQuery,
      agreementLoading,
      setAgreementParams,
      copyCustomerInfo,
      copiedLoanId,
      handleResendConfirmation,
      handleCreateAutopayTransaction,
      handleSkipAutopayConsent,
      handleSendBackConfirmation,
    ],
  );

  return (
    <>
      {sectionStatusUpdateLoadId && loan && (
        <SectionStatusUpdate
          status={LoanStatusEnum.APPROVED}
          loan={loan}
          setRefresh={setRefresh}
          refresh={refresh}
        />
      )}
      {agreementId && agreementUserId && (
        <LoanAgreements
          fatchLoans={fetchLoans}
          agreementId={agreementId}
          agreementUserId={agreementUserId}
          onClose={closeAgreementPanel}
        />
      )}
      {isRelocating && (
        <RelocateLoan isOpen={isRelocating} setIsOpen={setIsRelocating} />
      )}

      {/* Loan Agreement Details Dialog */}
      <LoanAgreementDetailsDialog
        isOpen={showAgreementDetailsDialog}
        onClose={() => {
          setShowAgreementDetailsDialog(false);
          setSelectedAgreement(null);
        }}
        agreement={selectedAgreement}
      />

      {/* Resend Confirmation Dialog */}
      {showResendConfirmation && resendData && (
        <ResendConfirmationDialog
          isOpen={showResendConfirmation}
          customerName={resendData.customerName}
          selectedProvider={selectedProvider}
          onProviderChange={handleProviderChange}
          onConfirm={confirmResend}
          onCancel={cancelResend}
          loading={resendLoading}
        />
      )}

      {/* Send Back to CE Confirmation Dialog */}
      {showSendBackConfirmation && sendBackData && (
        <SendBackToCEDialog
          isOpen={showSendBackConfirmation}
          onClose={cancelSendBack}
          onConfirm={confirmSendBack}
          customerName={sendBackData.customerName}
          loading={sendBackLoading}
        />
      )}

      {/* Create Autopay Transaction Dialog */}
      {autopayLoanData && brandId && (
        <CreateAutopayTransactionDialog
          isOpen={showAutopayDialog}
          onClose={() => {
            setShowAutopayDialog(false);
            setAutopayLoanData(null);
          }}
          onSuccess={async () => {
            showSuccess("Success", "Autopay transaction created successfully!");
            await fetchLoans();
          }}
          loanDetails={autopayLoanData}
          brandId={brandId}
        />
      )}

      {/* Skip Autopay Consent Dialog */}
      {skipAutopayData && (
        <SkipAutopayConsentDialog
          isOpen={showSkipAutopayDialog}
          customerName={skipAutopayData.customerName}
          loanId={skipAutopayData.formattedLoanId}
          onConfirm={confirmSkipAutopay}
          onCancel={cancelSkipAutopay}
          loading={skipAutopayLoading}
        />
      )}

      <div
        className="
       h-[calc(100vh-80px)]
      
      flex flex-col"
      >
        {/* Error Message */}
        {error && (
          <div className="bg-white px-6 py-2 w-full flex-shrink-0">
            <ErrorMessage message={error} onRetry={() => setError(null)} />
          </div>
        )}

        {/* Header Section - Full Width */}
        <div className="bg-white border-b border-[var(--color-muted)] border-opacity-30  px-6 py-4 w-full flex-shrink-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center  w-full gap-3">
              <h1 className="text-2xl font-semibold text-[var(--color-on-background)]">
                Sanction Head
                <span className="text-[var(--color-on-surface)] opacity-70 font-normal">
                  ({totalCount})
                </span>
              </h1>
              <div className="flex space-x-2 bg-white">
                {[
                  { label: "All Loan", value: "" },
                  { label: "Fresh Loan", value: "fresh" },
                  { label: "Repeat Loan", value: "repeat" },
                ].map((option) => {
                  const isActive = loanTypeFilter === option.value;

                  return (
                    <button
                      key={option.value || "all"}
                      onClick={() => handleLoanTypeFilterClick(option.value)}
                      className={`relative px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                        isActive
                          ? "text-[var(--color-primary)] border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                          : "text-[var(--color-on-surface)] border-transparent hover:text-[var(--color-primary)] hover:border-gray-300"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-84">
                <SearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search by Name,ID,Email or Phone"
                  onClear={clearSearch}
                />
              </div>
              <Button
                variant="surface"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearCache();
                }}
                disabled={isClearingCache}
                className="flex items-center gap-2 border-orange-300 hover:border-orange-400 hover:bg-orange-50 text-orange-700"
              >
                {isClearingCache ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-600 border-t-transparent"></div>
                    Clearing...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Sync
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Filter Button */}
        <div className="flex-shrink-0 bg-white border-b border-[var(--color-muted)] border-opacity-30 px-6 py-3 w-full flex flex-row">
          <FilterButton />
          <div className="flex flex-row justify-end items-center ml-auto gap-3">
            {/* 
             <Button
              variant="surface"
              onClick={(e) => {
                e.stopPropagation();
                handleClearCache();
              }}
              disabled={isClearingCache}
              className="flex items-center gap-2 border-orange-300 hover:border-orange-400 hover:bg-orange-50 text-orange-700"
            >
              {isClearingCache ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-600 border-t-transparent"></div>
                  Clearing...
                </>
              ) : (
                <>
                  <svg 
                    className="w-4 h-4" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                    />
                  </svg>
                  Sync
                </>
              )}
            </Button> */}
            <SyncEsignStatus />
            <Button
              variant="primary"
              onClick={(e) => {
                e.stopPropagation();
                setRuleTypeLoanId("search");
              }}
            >
              Change Rule Type
            </Button>
            <Button onClick={() => setIsRelocating(true)} disabled={isLoading}>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
              <span>Relocate Loans</span>
            </Button>
          </div>
        </div>

        {/* Main Content Area with Filters and Table */}
        <div className="flex flex-1 min-h-0">
          {/* Filters Sidebar - Separate Scrollable */}

          <div className=" flex-shrink-0 border-r border-[var(--color-muted)] border-opacity-30  bg-white">
            <div className="h-full overflow-y-auto">
              <Filters />
            </div>
          </div>

          {/* Table Container - Separate Scrollable */}

          <div className="flex-1 bg-white min-w-0">
            <div className="h-full overflow-y-auto overflow-x-auto">
              <Table
                columns={columns}
                data={loans}
                loading={isLoading}
                emptyMessage={
                  searchTerm
                    ? `No results for "${searchTerm}"`
                    : "No loans found"
                }
                className="border-0 rounded-none"
              />
            </div>
          </div>
        </div>

        {/* Fixed Pagination - Always at Bottom */}
        {totalCount > 0 && (
          <div className="bg-white border-t border-[var(--color-muted)] border-opacity-30 w-full flex-shrink-0">
            <TablePagination
              currentPage={pagination.page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pagination.limit}
              onPageChange={handlePageChange}
              onPageSizeChange={handleLimitChange}
              storageKey="loanSanctionHeadList"
              centerContent={
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-1">
                    <FaRupeeSign className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-blue-600 font-medium">Total Loan Amount:</span>
                    <span className="text-lg font-bold text-blue-700">
                      {totalLoanAmount.toLocaleString("en-IN")}
                    </span>
                    <span className="text-sm text-blue-600 font-medium">({totalCount} Loans)</span>
                  </div>
                </div>
              }
            />
          </div>
        )}
        <ChangeLoanRuleType
          isOpen={!!ruleTypeLoanId}
          loanId={ruleTypeLoanId}
          onClose={() => setRuleTypeLoanId(null)}
          onSuccess={() => {
            fetchLoans(); // refresh list
            setRuleTypeLoanId(null);
          }}
        />
      </div>
      {/* Relocate User Modal */}
      {/* {selectedCustomerForRelocate && (
        <RelocateUser
          isOpen={isUserRelocating}
          setIsOpen={setUserIsRelocating}
          selectedCustomerId={selectedCustomerForRelocate || undefined}
        />
      )} */}
    </>
  );
}
