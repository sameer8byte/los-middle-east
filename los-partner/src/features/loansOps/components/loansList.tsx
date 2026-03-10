import { useEffect, useState, useCallback, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FiMail, FiDownload, FiCopy } from "react-icons/fi";
import { useQueryParams } from "../../../hooks/useQueryParams";
import { useToast } from "../../../context/toastContext";
import { Disburse } from "./disburse";
import { AgreementSignedDetailsDialog } from "./agreementSignedDetailsDialog";
import { SendBackConfirmationDialog } from "./sendBackConfirmationDialog";
import { BulkDisbursementModal } from "../../loans/components/BulkDisbursementModal";
import {
  ApprovalStatusEnum,
  DocumentTypeEnum,
  LoanStatusEnum,
  PartnerTabsEnum,
  TransactionStatusEnum,
  TransactionTypeEnum,
} from "../../../constant/enum";
import { maskAadhaar, maskPan } from "../../../lib/utils";
import { SyncEsignStatus } from "../../common/synsEsignStatus";
import { LoanNoDueCertificate } from "./loanNoDueCertificate";
import { PaymentApproval } from "./paymentApproval";
import {
  Table,
  Pagination as TablePagination,
  SearchInput,
  ErrorMessage,
} from "../../../common/ui/table";
import Avatar from "../../../common/ui/avatar";
import {
  getAllLoans,
  sendBackToCreditExecutiveAndSanctionManager,
  clearLoansCache,
} from "../../../shared/services/api/loan.api";
import { Loan } from "../../../shared/types/loan";
import { Pagination } from "../../../shared/types/pagination";
import { FilterButton } from "../../../common/common/filterButton";
import { Filters } from "./filters";
import { Button } from "../../../common/ui/button";
import { useCustomerNavigator } from "../../../hooks/useViewCustomer";
import { usePersistedSearch } from "../../../hooks/usePersistedSearch";
import { useAppSelector } from "../../../shared/redux/store";
import { LoanStatusBadge } from "../../../common/ui/LoanStatusBadge";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { ColumnVisibilityDropdown } from "../../../common/ui/columnVisibilityDropdown";
import { DownloadDisbursementFile } from "./downloadDisbursementFile";
import { Conversion } from "../../../utils/conversion";
import { AcefoneClickToDialButton } from "../../acefone";

dayjs.extend(customParseFormat);
export default function LoanList() {
  const auth = useAppSelector((state) => state.auth.data);

  const { setQuery, getQuery } = useQueryParams();
  const [refresh, setRefresh] = useState(false);
  const [activeOpsStatus, setActiveOpsStatus] = useState<string>(
    getQuery("opsStatus") || "",
  );

  const noDueCertificateLoanId = getQuery("noDueCertificateLoanId");
  const [disburseLoanId, setDisburseLoanId] = useState<string | null>(
    getQuery("disburseLoanId"),
  );
  const paymentApprovalLoanId = getQuery("paymentApprovalLoanId");

  const [downloadLoanId, setDownloadLoanId] = useState<string | null>(null);
  const [selectedAgreementData, setSelectedAgreementData] = useState<
    string | null
  >(null);
  const [isAgreementDialogOpen, setIsAgreementDialogOpen] = useState(false);
  const [isBulkDisbursementOpen, setIsBulkDisbursementOpen] = useState(false);

  // Send back dialog state
  const [sendBackDialog, setSendBackDialog] = useState<{
    isOpen: boolean;
    loanId: string;
    customerName: string;
  }>({
    isOpen: false,
    loanId: "",
    customerName: "",
  });

  const { search } = useLocation();
  const navigate = useNavigate();
  const { brandId } = useParams();
  const { showSuccess, showError } = useToast();

  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pagination, setPagination] = useState<Pagination>(() => {
    const savedLimit = localStorage.getItem("loanOpsListPageSize");
    const savedPage = localStorage.getItem("loanOpsListPage");
    return {
      page: savedPage ? Number(savedPage) : 1,
      limit: savedLimit ? Number(savedLimit) : 10,
      dateFilter: "",
    };
  });
  const [totalCount, setTotalCount] = useState(0);
  const { searchTerm, setSearchTerm, clearSearch } = usePersistedSearch(
    "loansOpsList_search",
    "",
  );
  const queryParams = new URLSearchParams(search);
  const queryObject = Object.fromEntries(queryParams.entries());

  // Track copied loan ID for animation
  const [copiedLoanId, setCopiedLoanId] = useState<string | null>(null);

  // Cache clear state
  const [isClearingCache, setIsClearingCache] = useState(false);

  const toggleRefresh = useCallback(() => {
    setRefresh((prev) => !prev);
  }, []);

  const totalPages = useMemo(() => {
    return Math.ceil(totalCount / pagination.limit);
  }, [totalCount, pagination.limit]);

  // Add send back handler
  const handleSendBack = useCallback(
    async (targetRole: "CREDIT_MANAGER" | "SM_SH", reason: string) => {
      if (!brandId || !sendBackDialog.loanId) {
        showError("Error", "Brand ID and Loan ID are required");
        return;
      }

      try {
        await sendBackToCreditExecutiveAndSanctionManager(brandId, {
          loanId: sendBackDialog.loanId,
          targetRole,
          reason,
        });

        showSuccess("Success", "Loan sent back successfully");
        toggleRefresh(); // Refresh the list
      } catch (error: any) {
        showError(
          "Error",
          error.response?.data?.message || "Failed to send back loan",
        );
      }
    },
    [brandId, sendBackDialog.loanId, showSuccess, showError, toggleRefresh],
  );

  // Open send back dialog
  const openSendBackDialog = useCallback(
    (loanId: string, customerName: string) => {
      setSendBackDialog({
        isOpen: true,
        loanId,
        customerName,
      });
    },
    [],
  );

  // Close send back dialog
  const closeSendBackDialog = useCallback(() => {
    setSendBackDialog({
      isOpen: false,
      loanId: "",
      customerName: "",
    });
  }, []);

  const handleOpsStatusClick = (status: string) => {
    setActiveOpsStatus(status);
    const params = new URLSearchParams(location.search);
    if (status) {
      params.set("opsStatus", JSON.stringify([status]));
    } else {
      params.delete("opsStatus");
    }
    navigate(`?${params.toString()}`, { replace: true });
  };

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
        PartnerTabsEnum.LOAN_OPS,
        {
          page: pagination.page,
          limit: pagination.limit,
          dateFilter: queryObject?.dateFilter,
        },
        {
          status:
            queryObject?.status ||
            '["SANCTION_MANAGER_APPROVED","APPROVED","DISBURSED","PARTIALLY_PAID","PAID","ACTIVE"]',
          loanAgreementStatus: '["SIGNED"]',
          opsStatus: activeOpsStatus ? JSON.stringify([activeOpsStatus]) : "",
          search: searchTerm || "",
        },
      );
      setLoans(response.loans);
      setTotalCount(response.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch loans");
      console.error(err);
      setLoans([]);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  }, [
    brandId,
    pagination.page,
    pagination.limit,
    queryObject?.dateFilter,
    queryObject?.status,
    searchTerm,
    activeOpsStatus,
    refresh,
  ]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (brandId) fetchLoans();
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [fetchLoans, brandId]);

  const handleDisbursementComplete = useCallback(() => {
    toggleRefresh();
    setDisburseLoanId(null); // Close the disburse modal
  }, [toggleRefresh]);

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
      await fetchLoans();
    } catch (error) {
      console.error("Error clearing cache:", error);
      showSuccess("Cache Clear Failed", "Please try again or contact support");
    } finally {
      setIsClearingCache(false);
    }
  }, [brandId, showSuccess, fetchLoans]);

  const handlePageChange = useCallback((newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  }, []);

  const handleLimitChange = useCallback((newLimit: number) => {
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
  }, []);

  const { handleView } = useCustomerNavigator();
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
User ID: ${loan.user.id}
Loan ID: ${loan.id}
FormattedLoanId ID: ${loan.formattedLoanId}
${loan?.isMigratedloan ? `Migrated From: ${loan.oldLoanId}\n` : ""}
📧 Contact Information
━━━━━━━━━━━━━━━━━━━━
Email: ${loan.user.email || "N/A"}
Phone: ${loan.user.phoneNumber || "N/A"}

💰 Loan Details
━━━━━━━━━━━━━━━━━━━━
Amount: ${loan.amount ? Conversion.formatCurrency(loan.amount) : "N/A"}
Status: ${loan.status}
Agreement: ${loan?.agreement?.status
          ? loan.agreement.status.toLowerCase().replace(/_/g, " ")
          : "N/A"
        }
Created: ${dayjs(loan.createdAt).format("MMMM D, YYYY h:mm A")}

📄 Documents
━━━━━━━━━━━━━━━━━━━━
${documentInfo}

═══════════════════════════════
Generated on ${dayjs().format("DD MMM YYYY, hh:mm A")} by ${auth?.email}(${auth.name
        }) -  ${auth?.role || "N/A"} 
---- LOAN OPS ----
═══════════════════════════════    `.trim();

      navigator.clipboard.writeText(copyText).then(() => {
        setCopiedLoanId(loan.id);
        showSuccess("Copied!", "Customer information copied to clipboard");
        setTimeout(() => {
          setCopiedLoanId(null);
        }, 2000);
      });
    },
    [showSuccess, auth],
  );

  // Extract and format "Signed At" date from the signed text
  const extractDate = (signedText: string | null): string => {
    if (!signedText) return "N/A";

    // Try "Signed At: DD-MM-YYYY HH:mm:ss"
    const signedAtMatch = signedText.match(
      /Signed At:\s*(\d{2}-\d{2}-\d{4})\s+(\d{2}:\d{2}:\d{2})/,
    );

    if (signedAtMatch) {
      const dateStr = `${signedAtMatch[1]} ${signedAtMatch[2]}`;
      const parsed = dayjs(dateStr, "DD-MM-YYYY HH:mm:ss");
      return parsed.isValid() ? parsed.format("MMMM D, YYYY h:mm A") : "N/A";
    }

    // Try "on DD-MM-YYYY"
    const onDateMatch = signedText.match(/on\s+(\d{2})-(\d{2})-(\d{4})/);
    if (onDateMatch) {
      const dateStr = `${onDateMatch[1]}-${onDateMatch[2]}-${onDateMatch[3]}`;
      const parsed = dayjs(dateStr, "DD-MM-YYYY");
      return parsed.isValid() ? parsed.format("MMMM D, YYYY") : "N/A";
    }

    return "N/A";
  };

  const columns = useMemo(
    () => [
      {
        key: "customer",
        label: "Customer Info", // Updated label
        render: (_: any, loan: Loan) => {
          const fullName = [
            loan.user?.userDetails?.firstName,
            loan.user?.userDetails?.middleName,
            loan.user?.userDetails?.lastName,
          ]
            .filter(Boolean)
            .join(" ");

          const isForceBypass =
            loan?.forceCreditReportByPass || loan?.forceBsaReportByPass;

          return (
            <div className="flex items-start gap-3 w-[250px] group relative">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-[var(--color-surface)] rounded-full flex items-center justify-center overflow-hidden">
                  <Avatar />
                </div>
              </div>

              {/* Customer Details */}
              <div className="flex flex-col justify-center gap-1 w-full">
                {/* Name */}
                <div className="flex items-center gap-2">
                  <span className="text-[var(--color-on-background)] font-semibold text-sm truncate max-w-[180px]">
                    {fullName
                      ? fullName
                        .split(" ")
                        .map(
                          (word) =>
                            word.charAt(0).toUpperCase() +
                            word.slice(1).toLowerCase(),
                        )
                        .join(" ")
                      : "N/A"}
                  </span>
                  {isForceBypass && (
                    <span className="inline-flex items-center bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded">
                      Force Bypass
                    </span>
                  )}
                </div>

                {/* Loan ID & Migration Badge */}
                <div className="flex items-center gap-2 text-xs text-[var(--color-on-surface)] opacity-70">
                  <span>{loan.formattedLoanId}</span>
                  {loan?.isMigratedloan && (
                    <span className=" inline-flex items-center bg-[var(--color-secondary)] bg-opacity-10 px-2 py-0.5 text-xs font-medium text-[var(--color-on-secondary)]">
                      Migrated ({loan.oldLoanId})
                    </span>
                  )}
                  {/* Loan Type Badge */}
                  <div className="flex gap-1.5">
                    {loan.loanType && (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${!loan?.is_repeat_loan
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
                </div>

                {/* Email & Phone */}
                <div className="flex flex-col gap-1 text-xs text-[var(--color-on-surface)]">
                  <div className="flex items-center gap-1 truncate max-w-[200px]">
                    <FiMail className="h-3 w-3 text-[var(--color-on-surface)] opacity-50" />
                    <span className="truncate">{loan.user.email || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {loan.id && (
                      <AcefoneClickToDialButton
                        userId={loan.userId}
                        loanId={loan.id}
                      />
                    )}{" "}
                    <span>{loan.user.phoneNumber || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Copy Button */}
              <button
                onClick={(e) => copyCustomerInfo(loan, e)}
                className={`absolute -top-1 -right-1 p-1.5 rounded-md hover:bg-[var(--color-background)] opacity-0 group-hover:opacity-100 transition-all shadow-sm border border-[var(--color-muted)] border-opacity-30 ${copiedLoanId === loan.id
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
          );
        },
      },
      {
        key: "status",
        label: "Status",
        render: (_: any, loan: Loan) => (
          <LoanStatusBadge status={loan.status} />
        ),
      },
      {
        key: "date",
        label: "Created At",
        render: (_: any, loan: Loan) => (
          <div className="flex flex-col gap-1 justify-start">
            <div className="text-sm text-[var(--color-on-background)]">
              {dayjs(loan.createdAt).format("MMMM D, YYYY")}
            </div>
            <div className="text-[var(--color-on-surface)] opacity-70 font-light text-xs">
              {dayjs(loan.createdAt).format("h:mm A")} IST
            </div>
          </div>
        ),
      },
      {
        key: "agreementSignedDate",
        label: "Agreement Signed Date",
        render: (_: any, loan: Loan) => {
          const signedDate = !!loan.agreement.signedAt
            ? dayjs(loan.agreement.signedAt).format("MMMM D, YYYY h:mm A")
            : extractDate(loan.agreement.signed);
          const hasDetails =
            loan.agreement.signed && loan.agreement.signed.trim() !== "";

          return (
            <div className="flex flex-col gap-2 justify-start">
              <div className="text-sm text-[var(--color-on-background)]">
                {signedDate}
              </div>
              {hasDetails && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAgreementData(loan.agreement.signed);
                    setIsAgreementDialogOpen(true);
                  }}
                  variant="outline"
                >
                  View Details
                </Button>
              )}
            </div>
          );
        },
      },
      {
        key: "actions",
        label: "Actions",
        render: (_: any, loan: Loan) => {
          const isLoanPaidOrEligibleForNoDue =
            loan.status === LoanStatusEnum.PAID ||
            (loan.status === LoanStatusEnum.PARTIALLY_PAID &&
              loan.paymentRequests.filter(
                (pr) =>
                  pr.status === TransactionStatusEnum.SUCCESS &&
                  pr.partialCollectionTransactions.filter(
                    (pct) =>
                      pct.opsApprovalStatus === ApprovalStatusEnum.PENDING,
                  ).length === 0 &&
                  [TransactionTypeEnum.PARTIAL_COLLECTION].includes(pr.type),
              ).length > 0);
          const isLoanActiveOrPartiallyPaid =
            loan.paymentRequests.filter(
              (pr) =>
                (pr.type === TransactionTypeEnum.COLLECTION ||
                  pr.type === TransactionTypeEnum.PARTIAL_COLLECTION) &&
                (pr.collectionTransactions.filter(
                  (pct) => pct.opsApprovalStatus === ApprovalStatusEnum.PENDING,
                ).length > 0 ||
                  pr.partialCollectionTransactions.filter(
                    (pct) =>
                      pct.opsApprovalStatus === ApprovalStatusEnum.PENDING,
                  ).length > 0),
            ).length > 0;

          // Check if loan is in a state that can be sent back
          const canSendBack = [
            LoanStatusEnum.CREDIT_EXECUTIVE_APPROVED,
            LoanStatusEnum.SANCTION_MANAGER_APPROVED,
            LoanStatusEnum.APPROVED,
          ].includes(loan.status);

          return (
            <div className="flex items-center gap-2">
              {isLoanPaidOrEligibleForNoDue && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuery("noDueCertificateLoanId", loan.id);
                  }}
                  variant="outline"
                >
                  No Due Certificate
                </Button>
              )}
              {[LoanStatusEnum.ACTIVE, LoanStatusEnum.PARTIALLY_PAID].includes(
                loan.status,
              ) && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setQuery("paymentApprovalLoanId", loan.id);
                    }}
                    variant="outline"
                  >
                    {isLoanActiveOrPartiallyPaid
                      ? "Payment Approval"
                      : "Payment Details"}
                  </Button>
                )}
              {[
                LoanStatusEnum.APPROVED,
                LoanStatusEnum.SANCTION_MANAGER_APPROVED,
              ].includes(loan.status) && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDisburseLoanId(loan.id);
                      }}
                      className="flex items-center gap-1 px-3 py-1 text-xs text-black rounded bg-surface border border-gray-200"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        fill="none"
                        stroke="black"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M16 4.5A8.5 8.5 0 1 0 16 19.5" />
                        <line x1="10" y1="12" x2="21" y2="12" />
                        <polyline points="17,8 21,12 17,16" />
                      </svg>
                      <span>Disburse</span>
                    </button>

                    {/* Send Back Button */}
                    {canSendBack && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          const fullName =
                            [
                              loan.user?.userDetails?.firstName,
                              loan.user?.userDetails?.middleName,
                              loan.user?.userDetails?.lastName,
                            ]
                              .filter(Boolean)
                              .join(" ") || "Unknown";
                          openSendBackDialog(loan.id, fullName);
                        }}
                        variant="outline"
                        className="border-orange-300 hover:border-orange-400 hover:bg-orange-50 text-orange-700"
                      >
                        Send Back
                      </Button>
                    )}
                  </>
                )}
            </div>
          );
        },
      },
      {
        key: "view",
        label: "View",
        render: (_: any, loan: Loan) => (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleView(loan.user.id, brandId!, "loans-ops");
            }}
            variant="outline"
          >
            View
          </Button>
        ),
      },
    ],
    [
      handleView,
      setQuery,
      copyCustomerInfo,
      copiedLoanId,
      openSendBackDialog,
      brandId,
    ],
  );

  const handleCloseAgreementDialog = useCallback(() => {
    setIsAgreementDialogOpen(false);
    setSelectedAgreementData(null);
  }, []);

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = sessionStorage.getItem("loanOpsTabVisibleColumns");
    return saved ? JSON.parse(saved) : columns.map((col) => col.key);
  });

  useEffect(() => {
    sessionStorage.setItem(
      "loanOpsTabVisibleColumns",
      JSON.stringify(visibleColumns),
    );
  }, [visibleColumns]);

  return (
    <>
      {downloadLoanId && (
        <DownloadDisbursementFile
          setDownloadLoanId={setDownloadLoanId}
          downloadLoanId={downloadLoanId}
        />
      )}
      {disburseLoanId && (
        <Disburse
          disburseLoanId={disburseLoanId}
          onDisbursementComplete={handleDisbursementComplete}
          onClose={() => setDisburseLoanId(null)}
        />
      )}
      {noDueCertificateLoanId && (
        <LoanNoDueCertificate refresh={refresh} setRefresh={setRefresh} />
      )}
      {paymentApprovalLoanId && (
        <PaymentApproval refresh={refresh} setRefresh={setRefresh} />
      )}
      {isAgreementDialogOpen && selectedAgreementData && (
        <AgreementSignedDetailsDialog
          isOpen={isAgreementDialogOpen}
          onClose={handleCloseAgreementDialog}
          signedData={selectedAgreementData}
        />
      )}
      <BulkDisbursementModal
        isOpen={isBulkDisbursementOpen}
        onClose={() => setIsBulkDisbursementOpen(false)}
        onSuccess={() => {
          toggleRefresh();
          fetchLoans();
        }}
        brandId={brandId || ""}
      />
      <SendBackConfirmationDialog
        isOpen={sendBackDialog.isOpen}
        onClose={closeSendBackDialog}
        onConfirm={handleSendBack}
        loanId={sendBackDialog.loanId}
        customerName={sendBackDialog.customerName}
      />
      <div className="h-[calc(100vh-80px)] flex flex-col">
        {error && (
          <div className="border-b border-[var(--color-muted)] border-opacity-30 px-6 py-2 w-full flex-shrink-0">
            <ErrorMessage message={error} onRetry={() => setError(null)} />
          </div>
        )}
        <div className="bg-white px-6 py-4 w-full flex-shrink-0">
          <div className="flex items-center justify-between w-full">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--color-on-background)] whitespace-nowrap">
                Loans Operations{" "}
                <span className="text-[var(--color-on-surface)] opacity-70 font-normal">
                  ({totalCount})
                </span>
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-84">
                <SearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search by  Name,ID,Email or Phone"
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

        <div className="flex-shrink-0 bg-surface border-b  border-[var(--color-muted)] border-opacity-30 px-6 py-3 w-full">
          <div className="flex items-center justify-between mb-3 w-full">
            {/* Left side: Filter */}
            <FilterButton />

            {/* Right side: action buttons */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsBulkDisbursementOpen(true)}
                variant="primary"
              >
                <FiDownload className="h-4 w-4" />
                <span>Bulk UTR Sync</span>
              </Button>

              <Button onClick={() => setDownloadLoanId("all")}>
                <FiDownload className="h-4 w-4 cursor-pointer" />
                <span>Download Disbursement File</span>
              </Button>

              <SyncEsignStatus />
            </div>
          </div>

          {/* Operations Status Filter Tabs */}
          <div className="flex items-center">
            <div className="flex">
              {[
                { label: "All", value: "" },
                {
                  label: "Pending Disbursement",
                  value: "pending_disbursement",
                },
                { label: "Payment Approval", value: "payment_approval" },
                { label: "In Progress", value: "in_progress" },
                { label: "Completed", value: "completed" },
              ].map((option) => {
                const isAll = option.value === "";
                const isActive = isAll
                  ? activeOpsStatus === ""
                  : activeOpsStatus.includes(option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() => handleOpsStatusClick(option.value)}
                    className={`relative px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${isActive
                      ? "text-[var(--color-primary)] border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                      : "text-[var(--color-on-surface)] border-transparent hover:text-[var(--color-primary)] hover:border-gray-300"
                      }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-row justify-end items-center ml-auto gap-3">
              <ColumnVisibilityDropdown
                columns={columns}
                visibleColumns={visibleColumns}
                setVisibleColumns={setVisibleColumns}
                compulsoryColumns={["customerInfo"]}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="flex-shrink-0 border-r border-gray-200 bg-white">
            <div className="h-full overflow-y-auto">
              <Filters />
            </div>
          </div>
          <div className="flex-1 bg-white min-w-0">
            <div className="h-full overflow-y-auto overflow-x-auto">
              <Table
                columns={columns.filter((col) =>
                  visibleColumns.includes(col.key),
                )}
                data={loans}
                loading={isLoading}
                emptyMessage={
                  searchTerm
                    ? `No results for "${searchTerm}"`
                    : "No loans found"
                }
              />
            </div>
          </div>
        </div>
        {totalCount > 0 && (
          <div className="bg-white border-t border-gray-200 w-full flex-shrink-0">
            <TablePagination
              currentPage={pagination.page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pagination.limit}
              onPageChange={handlePageChange}
              onPageSizeChange={handleLimitChange}
              storageKey="loanOpsList"
            />
          </div>
        )}
      </div>
    </>
  );
}
