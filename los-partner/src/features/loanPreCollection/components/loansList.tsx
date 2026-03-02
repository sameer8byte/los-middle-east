import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useLocation, useParams } from "react-router-dom";
import { FiMail, FiCopy } from "react-icons/fi";
import { HiChevronDown, HiOutlineUser } from "react-icons/hi2";
import { AddRemarksButton } from "../../../common/ui/AddRemarksButton";
import { RemarksCommentModal } from "../../../common/ui/RemarksCommentModal";
import Avatar from "../../../common/ui/avatar";
import { PartnerTabsEnum } from "../../../constant/enum";
import { formatDate, formatDateWithTime } from "../../../lib/utils";
import { NonGetwayPayment } from "../../loanCollection/components/nonGetwayPayment";
import {
  Table,
  Pagination as TablePagination,
  SearchInput,
  ErrorMessage,
} from "../../../common/ui/table";
import { ClosingWriteOffType } from "../../loanCollection/components/closingWriteOff";
import { ClosingSettlementType } from "../../loanCollection/components/closingSettlement";
import { useQueryParams } from "../../../hooks/useQueryParams";
import {
  getAllLoans,
  clearLoansCache,
} from "../../../shared/services/api/loan.api";
import { Loan } from "../../../shared/types/loan";
import { Pagination } from "../../../shared/types/pagination";
import { FilterButton } from "../../../common/common/filterButton";
import { Filters } from "../../loanCollection/components/filters";
import { Button } from "../../../common/ui/button";
import { useCustomerNavigator } from "../../../hooks/useViewCustomer";
import { usePersistedSearch } from "../../../hooks/usePersistedSearch";
import dayjs from "dayjs";
import { useToast } from "../../../context/toastContext";
import { useAppSelector } from "../../../shared/redux/store";
import { LoanStatusBadge } from "../../../common/ui/LoanStatusBadge";
import { ColumnVisibilityDropdown } from "../../../common/ui/columnVisibilityDropdown";
import { addLoanComment, getLoanComments, LoanComment } from "../../../shared/services/api/loanComments.api";
import {
  getCollectionExecutiveUsers,
  getCollectionSupervisorUsers,
} from "../../../shared/services/api/partner-user.api";
import { AcefoneClickToDialButton } from "../../acefone";
import { Conversion } from "../../../utils/conversion";

export default function LoanList() {
  const auth = useAppSelector((state) => state.auth.data);
  const { setQuery, getQuery } = useQueryParams();
  const [nonGetwayPaymentLoanId, setNonGetwayPaymentLoanId] = useState<
    string | null
  >(null);
  const [nonGetwayPaymentUserId, setNonGetwayPaymentUserId] = useState<
    string | null
  >(null);
  const [refresh, setRefresh] = useState(false);
  const writeOffLoanId = getQuery("writeOffLoanId");
  const settlementLoanId = getQuery("settlementLoanId");

  const { search } = useLocation();
  const { brandId } = useParams();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Email/Phone visibility state
  const [visibleInfo, setVisibleInfo] = useState<{
    [loanId: string]: {
      email: boolean;
      phone: boolean;
    };
  }>({});

  // Comment modal states
  const [commentModal, setCommentModal] = useState<{
    isOpen: boolean;
    loanId: string | null;
    currentComment: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    loanId: null,
    currentComment: "",
    isLoading: false,
  });

  // Loan comments state
  const [loanComments, setLoanComments] = useState<{
    [loanId: string]: LoanComment[];
  }>({});
  const [loadingComments, setLoadingComments] = useState<{
    [loanId: string]: boolean;
  }>({});

  // Check if current domain is crm.zeptofinance.com
  const isCrmZeptofinanceDomain = typeof globalThis !== "undefined" &&
    globalThis.window?.location?.hostname === "crm.zeptofinance.com";

  // Check if user is a COLLECTION_EXECUTIVE (only for crm.zeptofinance.com domain)
  const isCollectionExecutive = isCrmZeptofinanceDomain && auth?.role?.some(
    (r: any) => r === "COLLECTION_EXECUTIVE" || r?.name === "COLLECTION_EXECUTIVE"
  );

  // Collection Executive filter dropdown state
  const [collectionExecutiveDropdownOpen, setCollectionExecutiveDropdownOpen] =
    useState(false);
  const [collectionExecutiveUsers, setCollectionExecutiveUsers] = useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const [
    isLoadingCollectionExecutiveUsers,
    setIsLoadingCollectionExecutiveUsers,
  ] = useState(false);
  const { searchTerm: selectedCollectionExecutives, setSearchTerm: setSelectedCollectionExecutives } =
    usePersistedSearch<string[]>(
      "loanPreCollectionList_collectionExecutive",
      isCollectionExecutive && auth?.id ? [auth.id] : []
    );
  const collectionExecutiveDropdownRef = useRef<HTMLDivElement>(null);

  // Collection Supervisor filter dropdown state
  const [
    collectionSupervisorDropdownOpen,
    setCollectionSupervisorDropdownOpen,
  ] = useState(false);
  const [collectionSupervisorUsers, setCollectionSupervisorUsers] = useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const [
    isLoadingCollectionSupervisorUsers,
    setIsLoadingCollectionSupervisorUsers,
  ] = useState(false);
  const { searchTerm: selectedCollectionSupervisors, setSearchTerm: setSelectedCollectionSupervisors } =
    usePersistedSearch<string[]>("loanPreCollectionList_collectionSupervisor", []);
  const collectionSupervisorDropdownRef = useRef<HTMLDivElement>(null);

  // Initialize pagination from localStorage to prevent double render
  const [pagination, setPagination] = useState<Pagination>(() => {
    const savedLimit = localStorage.getItem("loanPreCollectionListPageSize");
    const savedPage = localStorage.getItem("loanPreCollectionListPage");
    return {
      page: savedPage ? Number(savedPage) : 1,
      limit: savedLimit ? Number(savedLimit) : 10,
      dateFilter: "",
    };
  });
  const [totalCount, setTotalCount] = useState(0);
  const { searchTerm, setSearchTerm, clearSearch } = usePersistedSearch(
    "loanPreCollectionList_search",
    ""
  );
  const queryParams = new URLSearchParams(search);
  const queryObject = Object.fromEntries(queryParams.entries());

  // Memoized calculations
  const totalPages = useMemo(() => {
    return Math.ceil(totalCount / pagination.limit);
  }, [totalCount, pagination.limit]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        collectionExecutiveDropdownRef.current &&
        !collectionExecutiveDropdownRef.current.contains(event.target as Node)
      ) {
        setCollectionExecutiveDropdownOpen(false);
      }
      if (
        collectionSupervisorDropdownRef.current &&
        !collectionSupervisorDropdownRef.current.contains(event.target as Node)
      ) {
        setCollectionSupervisorDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch collection executive users
  const fetchCollectionExecutiveUsers = useCallback(async () => {
    if (!brandId || collectionExecutiveUsers.length > 0) return;

    setIsLoadingCollectionExecutiveUsers(true);
    try {
      const response = await getCollectionExecutiveUsers(brandId);
      setCollectionExecutiveUsers(response || []);
    } catch (error) {
      console.error("Error fetching collection executive users:", error);
    } finally {
      setIsLoadingCollectionExecutiveUsers(false);
    }
  }, [brandId, collectionExecutiveUsers.length]);

  // Fetch collection supervisor users
  const fetchCollectionSupervisorUsers = useCallback(async () => {
    if (!brandId || collectionSupervisorUsers.length > 0) return;

    setIsLoadingCollectionSupervisorUsers(true);
    try {
      const response = await getCollectionSupervisorUsers(brandId);
      setCollectionSupervisorUsers(response || []);
    } catch (error) {
      console.error("Error fetching collection supervisor users:", error);
    } finally {
      setIsLoadingCollectionSupervisorUsers(false);
    }
  }, [brandId, collectionSupervisorUsers.length]);

  // Handle collection executive dropdown toggle
  const handleCollectionExecutiveDropdownToggle = useCallback(() => {
    if (!collectionExecutiveDropdownOpen) {
      fetchCollectionExecutiveUsers();
    }
    setCollectionExecutiveDropdownOpen(!collectionExecutiveDropdownOpen);
  }, [collectionExecutiveDropdownOpen, fetchCollectionExecutiveUsers]);

  // Handle collection supervisor dropdown toggle
  const handleCollectionSupervisorDropdownToggle = useCallback(() => {
    if (!collectionSupervisorDropdownOpen) {
      fetchCollectionSupervisorUsers();
    }
    setCollectionSupervisorDropdownOpen(!collectionSupervisorDropdownOpen);
  }, [collectionSupervisorDropdownOpen, fetchCollectionSupervisorUsers]);

  // Handle collection executive selection
  const handleCollectionExecutiveToggle = useCallback((executiveId: string) => {
    setSelectedCollectionExecutives((prev) => {
      const newSelected = prev.includes(executiveId)
        ? prev.filter((id) => id !== executiveId)
        : [...prev, executiveId];
      return newSelected;
    });
  }, []);

  // Handle collection supervisor selection
  const handleCollectionSupervisorToggle = useCallback(
    (supervisorId: string) => {
      setSelectedCollectionSupervisors((prev) => {
        const newSelected = prev.includes(supervisorId)
          ? prev.filter((id) => id !== supervisorId)
          : [...prev, supervisorId];
        return newSelected;
      });
    },
    []
  );

  // Clear collection executive filter
  const clearCollectionExecutiveFilter = useCallback(() => {
    setSelectedCollectionExecutives([]);
  }, []);

  // Clear collection supervisor filter
  const clearCollectionSupervisorFilter = useCallback(() => {
    setSelectedCollectionSupervisors([]);
  }, []);

  // Toggle function for email/phone visibility
  const toggleVisibility = (loanId: string, type: "email" | "phone") => {
    setVisibleInfo((prev) => ({
      ...prev,
      [loanId]: {
        email:
          type === "email"
            ? !prev[loanId]?.email
            : prev[loanId]?.email || false,
        phone:
          type === "phone"
            ? !prev[loanId]?.phone
            : prev[loanId]?.phone || false,
      },
    }));
  };

  // Masking functions
  const maskEmail = (email: string) => {
    return email.replace(/(?<=^.{1}).*?(?=@)/g, (match) =>
      "X".repeat(match.length)
    );
  };

  const maskPhone = (phone: string) => {
    return phone.replace(/\d(?=\d{4})/g, "X");
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
        PartnerTabsEnum.PRE_COLLECTIONS,
        {
          page: pagination.page,
          limit: pagination.limit,
          dateFilter: queryObject?.dateFilter,
        },
        {
          status:
            queryObject?.status ||
            '["ACTIVE","POST_ACTIVE", "PARTIALLY_PAID","PAID", "OVERDUE", "DEFAULTED"]',
          search: searchTerm || "",
          assignedCollectionExecutive:
            selectedCollectionExecutives.length > 0
              ? JSON.stringify(selectedCollectionExecutives)
              : "",
          assignedCollectionSupervisor:
            selectedCollectionSupervisors.length > 0
              ? JSON.stringify(selectedCollectionSupervisors)
              : "",
        }
      );
      setLoans(response.loans);
      setTotalCount(response.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch loans");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [
    brandId,
    pagination,
    queryObject?.dateFilter,
    queryObject?.status,
    searchTerm,
    selectedCollectionExecutives,
    selectedCollectionSupervisors,
    refresh,
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

  const { showSuccess, showError } = useToast();

  // Fetch loan comments
  const fetchLoanComments = useCallback(
    async (loanId: string) => {
      if (!brandId) return;

      setLoadingComments((prev) => ({ ...prev, [loanId]: true }));

      try {
        const response = await getLoanComments(brandId, loanId);
        setLoanComments((prev) => ({ ...prev, [loanId]: response.comments }));
      } catch (error) {
        console.error("Error fetching loan comments:", error);
        showError("Failed to load remarks");
      } finally {
        setLoadingComments((prev) => ({ ...prev, [loanId]: false }));
      }
    },
    [brandId, showError]
  );

  // Comment modal handlers
  const openCommentModal = (loanId: string) => {
    setCommentModal({
      isOpen: true,
      loanId,
      currentComment: "",
      isLoading: false,
    });
    // Fetch remarks for this loan
    fetchLoanComments(loanId);
  };

  const closeCommentModal = () => {
    setCommentModal({
      isOpen: false,
      loanId: null,
      currentComment: "",
      isLoading: false,
    });
  };

  const handleCommentSubmit = async () => {
    if (!commentModal.loanId || !commentModal.currentComment.trim() || !brandId)
      return;

    setCommentModal((prev) => ({ ...prev, isLoading: true }));

    try {
      await addLoanComment(brandId, {
        loanId: commentModal.loanId,
        comment: commentModal.currentComment.trim(),
      });

      showSuccess("Comment added successfully!");
      closeCommentModal();
      // Refresh loans to get updated data
      setRefresh(!refresh);
    } catch (error) {
      console.error("Failed to add comment:", error);
      showError("Failed to add comment", "Please try again later.");
      console.error("Error adding comment:", error);
    } finally {
      setCommentModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const [copiedLoanId, setCopiedLoanId] = useState<string | null>(null);

  // Cache clear state
  const [isClearingCache, setIsClearingCache] = useState(false);

  // Handle cache clear
  const handleClearCache = useCallback(async () => {
    if (!brandId) return;

    setIsClearingCache(true);
    try {
      const result = await clearLoansCache(brandId);
      showSuccess(
        "Cache Cleared!",
        `${result.message} - Fresh data will load on next query`
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
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          )
          .join(" ")
        : "N/A";

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

═══════════════════════════════
Generated on ${dayjs().format("DD MMM YYYY, hh:mm A")} by ${auth?.email}(${auth.name
        }) -  ${auth?.role || "N/A"} 
---- LOAN COMPLETED ----



    `.trim();

      navigator.clipboard.writeText(copyText).then(() => {
        setCopiedLoanId(loan.id);
        showSuccess("Copied!", "Customer information copied to clipboard");
        setTimeout(() => {
          setCopiedLoanId(null);
        }, 2000);
      });
    },
    [showSuccess]
  );

  // Define table columns
  const columns = useMemo(
    () => [
      {
        key: "customer",
        label: "Customer Info",
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

          // Get visibility state for this loan
          const isEmailVisible = visibleInfo[loan.id]?.email || false;
          const isPhoneVisible = visibleInfo[loan.id]?.phone || false;

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
                            word.slice(1).toLowerCase()
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
                </div>

                {/* Email & Phone with toggle */}
                <div className="flex flex-col gap-1 text-xs text-[var(--color-on-surface)]">
                  {/* Email with toggle */}
                  <div className="flex items-center justify-between group/email">
                    <div className="flex items-center gap-1 flex-1 truncate max-w-[180px]">
                      <FiMail className="h-3 w-3 text-[var(--color-on-surface)] opacity-50 flex-shrink-0" />
                      <span className="truncate">
                        {loan.user.email
                          ? isEmailVisible
                            ? loan.user.email
                            : maskEmail(loan.user.email)
                          : "N/A"}
                      </span>
                    </div>
                    {loan.user.email && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVisibility(loan.id, "email");
                        }}
                        className="ml-2 p-1 hover:bg-gray-100 rounded-md opacity-0 group-hover/email:opacity-100 transition-opacity flex-shrink-0"
                        title={isEmailVisible ? "Hide email" : "Show email"}
                      >
                        {isEmailVisible ? (
                          <svg
                            className="h-3 w-3 text-gray-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-3 w-3 text-gray-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Phone with toggle */}
                  <div className="flex items-center justify-between group/phone">
                    <div className="flex items-center gap-1 flex-1">
                      {loan.id && (
                        <AcefoneClickToDialButton userId={loan.userId}
                          loanId={loan.id}
                        />
                      )}{" "}                      <span className="truncate max-w-[180px]">
                        {loan.user.phoneNumber
                          ? isPhoneVisible
                            ? loan.user.phoneNumber
                            : maskPhone(loan.user.phoneNumber)
                          : "N/A"}
                      </span>
                    </div>
                    {loan.user.phoneNumber && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVisibility(loan.id, "phone");
                        }}
                        className="ml-2 p-1 hover:bg-gray-100 rounded-md opacity-0 group-hover/phone:opacity-100 transition-opacity flex-shrink-0"
                        title={isPhoneVisible ? "Hide phone" : "Show phone"}
                      >
                        {isPhoneVisible ? (
                          <svg
                            className="h-3 w-3 text-gray-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-3 w-3 text-gray-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        )}
                      </button>
                    )}
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
          <div className="flex flex-col items-start gap-1 max-w-[220px]">
            <LoanStatusBadge status={loan.status} />
            <span className="inline-flex items-center  text-xs font-medium text-[var(--color-on-surface)] opacity-80 capitalize">
              Agreement {loan.agreement?.status?.toLowerCase() || "N/A"}
            </span>
          </div>
        ),
      },
      {
        key: "dates",
        label: "Date",
        render: (_: any, loan: Loan) => {
          const disbursedDate = loan.disbursementDate
            ? new Date(loan.disbursementDate)
            : null;
          const dueDate = loan.loanDetails?.dueDate
            ? new Date(loan.loanDetails?.dueDate)
            : null;
          const postActiveDate = loan.loanDetails?.postActiveDate
            ? new Date(loan.loanDetails?.postActiveDate)
            : null;
          const createdAt = new Date(loan.createdAt);

          const now = new Date();
          const collectionLabel =
            postActiveDate && now < postActiveDate
              ? "Pre-Collection"
              : "Post-Collection";

          return (
            <div className="text-sm text-[var(--color-on-background)] flex flex-col gap-1">
              {/* Collection Status Label */}
              <div className="flex items-center gap-2 font-medium text-[var(--color-primary)]">
                <span>{collectionLabel}</span>
              </div>

              {/* Disbursed Date */}
              <div className="flex items-center gap-2">
                <span>
                  Disbursed –{" "}
                  {disbursedDate ? formatDate(disbursedDate) : "N/A"}
                </span>
              </div>

              {/* Due Date */}
              <div className="flex items-center gap-2">
                <span>Due Date – {dueDate ? formatDate(dueDate) : "N/A"}</span>
              </div>

              {/* Post Collection Date */}
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap">
                  Post Collection –{" "}
                  {postActiveDate ? formatDate(postActiveDate) : "N/A"}
                </span>
              </div>

              {/* Created */}
              <div className="flex items-center gap-2">
                <span>Created – {formatDateWithTime(createdAt)}</span>
              </div>
            </div>
          );
        },
      },
      {
        key: "collectionExecutives",
        label: "Collection Executives",
        render: (_: any, loan: Loan) => {
          const activePartners =
            loan.loan_collection_allocated_partner?.filter(
              (partner) => partner.isActive
            ) || [];

          return (
            <div className="text-sm text-[var(--color-on-background)] flex flex-col gap-1 min-w-[200px]">
              {activePartners.length > 0 ? (
                activePartners.map((partner) => {
                  const role = partner.partnerUser.reportsToId
                    ? "Executive"
                    : "Manager/Head";
                  const bgColor = partner.partnerUser.reportsToId
                    ? "#EA5E18"
                    : "#10B981";

                  return (
                    <div
                      key={partner.id}
                      className="flex items-center gap-2 mb-2"
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                        style={{ backgroundColor: bgColor }}
                      >
                        {partner.partnerUser.name?.charAt(0) || "U"}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">
                          {partner.partnerUser.name}
                        </span>
                        <span className="text-xs text-[var(--color-on-surface)] opacity-70">
                          {role} •{" "}
                          {formatDateWithTime(new Date(partner.allocatedAt))}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <span className="text-[var(--color-on-surface)] opacity-50 italic">
                  No partners allocated
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: "actions",
        label: "Actions",
        render: (_: any, loan: Loan) => (
          <div className="flex flex-col items-center gap-2">
            <AddRemarksButton
              loanId={loan.id}
              onOpenModal={openCommentModal}
            />

            {/* Non Gateway Payment Button */}
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setNonGetwayPaymentLoanId(loan.id);
                setNonGetwayPaymentUserId(loan.user.id);
              }}
            >
              Payments            </Button>

            {/* View Button with text-width only */}
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleView(loan.user.id, brandId!, "post-collection");
              }}
              variant="outline"
            >
              View
            </Button>
          </div>
        ),
      },
    ],
    [handleView, setQuery, toggleVisibility, copiedLoanId, maskEmail, maskPhone]
  );

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = sessionStorage.getItem("preCollectionTabVisibleColumns");
    return saved ? JSON.parse(saved) : columns.map((col) => col.key);
  });

  useEffect(() => {
    sessionStorage.setItem(
      "preCollectionTabVisibleColumns",
      JSON.stringify(visibleColumns)
    );
  }, [visibleColumns]);

  return (
    <>
      {nonGetwayPaymentLoanId && (
        <NonGetwayPayment
          refresh={refresh}
          setRefresh={setRefresh}
          nonGetwayPaymentLoanId={nonGetwayPaymentLoanId}
          nonGetwayPaymentUserId={nonGetwayPaymentUserId}
          setNonGetwayPaymentLoanId={setNonGetwayPaymentLoanId}
          setNonGetwayPaymentUserId={setNonGetwayPaymentUserId}
        />
      )}
      {writeOffLoanId && <ClosingWriteOffType loanId={writeOffLoanId} />}
      {settlementLoanId && <ClosingSettlementType loanId={settlementLoanId} />}
      <div className="h-[calc(100vh-80px)] flex flex-col">
        {/* Error Message */}
        {error && (
          <div className="bg-white px-6 py-2 w-full flex-shrink-0">
            <ErrorMessage message={error} onRetry={() => setError(null)} />
          </div>
        )}

        {/* Header Section - Full Width */}
        <div className="bg-white border-b border-[var(--color-muted)] border-opacity-30 px-6 py-4 w-full flex-shrink-0">
          <div className="flex items-center justify-between w-full">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--color-on-background)]">
                Loans Pre Collection
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
          <div className="flex items-center gap-3">
            <FilterButton />

            {/* Collection Executive Filter Dropdown - Hidden for COLLECTION_EXECUTIVE role */}
            {!isCollectionExecutive && (
              <div className="relative" ref={collectionExecutiveDropdownRef}>
                <Button
                  onClick={handleCollectionExecutiveDropdownToggle}
                  variant="surface"
                  className={`flex items-center gap-2 border rounded-xl shadow-sm transition-all duration-150 ${selectedCollectionExecutives.length > 0
                      ? "bg-green-50 border-green-300 hover:bg-green-100"
                      : "bg-white border-gray-300 hover:bg-gray-50"
                    }`}
                >
                  <HiChevronDown
                    className={`w-4 h-4 transition-transform ${collectionExecutiveDropdownOpen ? "rotate-180" : ""
                      }`}
                  />
                  <span>
                    {selectedCollectionExecutives.length > 0
                      ? `Collection Executive (${selectedCollectionExecutives.length})`
                      : "Collection Executive"}
                  </span>
                </Button>

                {collectionExecutiveDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                    <div className="sticky top-0 bg-white border-b border-gray-200 p-3 flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-800">
                        Filter by Collection Executive
                      </span>
                      {selectedCollectionExecutives.length > 0 && (
                        <button
                          onClick={clearCollectionExecutiveFilter}
                          className="text-xs text-green-600 hover:text-green-800 font-medium"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    {isLoadingCollectionExecutiveUsers ? (
                      <div className="p-6 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                        <p className="text-sm text-gray-500 mt-2">
                          Loading collection executives...
                        </p>
                      </div>
                    ) : collectionExecutiveUsers.length > 0 ? (
                      <div className="p-2">
                        {collectionExecutiveUsers.map((user) => (
                          <label
                            key={user.id}
                            className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition"
                          >
                            <input
                              type="checkbox"
                              checked={selectedCollectionExecutives.includes(
                                user.id
                              )}
                              onChange={() =>
                                handleCollectionExecutiveToggle(user.id)
                              }
                              className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-medium text-sm">
                                {user.name?.charAt(0)?.toUpperCase() || "?"}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900">
                                  {user.name}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {user.email}
                                </span>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-sm text-gray-500">
                        <HiOutlineUser className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>No collection executives found</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Collection Supervisor Filter Dropdown - Hidden for COLLECTION_EXECUTIVE role */}
            {!isCollectionExecutive && (
              <div className="relative" ref={collectionSupervisorDropdownRef}>
                <Button
                  onClick={handleCollectionSupervisorDropdownToggle}
                  variant="surface"
                  className={`flex items-center gap-2 border rounded-xl shadow-sm transition-all duration-150 ${selectedCollectionSupervisors.length > 0
                      ? "bg-teal-50 border-teal-300 hover:bg-teal-100"
                      : "bg-white border-gray-300 hover:bg-gray-50"
                    }`}
                >
                  <HiChevronDown
                    className={`w-4 h-4 transition-transform ${collectionSupervisorDropdownOpen ? "rotate-180" : ""
                      }`}
                  />
                  <span>
                    {selectedCollectionSupervisors.length > 0
                      ? `Collection Supervisor (${selectedCollectionSupervisors.length})`
                      : "Collection Supervisor"}
                  </span>
                </Button>

                {collectionSupervisorDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                    <div className="sticky top-0 bg-white border-b border-gray-200 p-3 flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-800">
                        Filter by Collection Supervisor
                      </span>
                      {selectedCollectionSupervisors.length > 0 && (
                        <button
                          onClick={clearCollectionSupervisorFilter}
                          className="text-xs text-teal-600 hover:text-teal-800 font-medium"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    {isLoadingCollectionSupervisorUsers ? (
                      <div className="p-6 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
                        <p className="text-sm text-gray-500 mt-2">
                          Loading collection supervisors...
                        </p>
                      </div>
                    ) : collectionSupervisorUsers.length > 0 ? (
                      <div className="p-2">
                        {collectionSupervisorUsers.map((user) => (
                          <label
                            key={user.id}
                            className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition"
                          >
                            <input
                              type="checkbox"
                              checked={selectedCollectionSupervisors.includes(
                                user.id
                              )}
                              onChange={() =>
                                handleCollectionSupervisorToggle(user.id)
                              }
                              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                            />
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white font-medium text-sm">
                                {user.name?.charAt(0)?.toUpperCase() || "?"}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900">
                                  {user.name}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {user.email}
                                </span>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-sm text-gray-500">
                        <HiOutlineUser className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>No collection supervisors found</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="ml-auto">
            <ColumnVisibilityDropdown
              columns={columns}
              visibleColumns={visibleColumns}
              setVisibleColumns={setVisibleColumns}
              compulsoryColumns={["Customer Info"]}
            />
          </div>
        </div>

        {/* Main Content Area with Filters and Table */}
        <div className="flex flex-1 min-h-0">
          {/* Filters Sidebar - Separate Scrollable */}
          <div className=" flex-shrink-0 border-r border-[var(--color-muted)] border-opacity-30 bg-white">
            <div className="h-full overflow-y-auto">
              <Filters />
            </div>
          </div>

          {/* Table Container - Separate Scrollable */}
          <div className="flex-1 bg-white min-w-0">
            <div className="h-full overflow-y-auto overflow-x-auto">
              <Table
                columns={columns.filter((col) =>
                  visibleColumns.includes(col.key)
                )}
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

        {totalCount > 0 && (
          <div className="bg-white border-t  border-[var(--color-muted)] border-opacity-30 w-full flex-shrink-0">
            <TablePagination
              currentPage={pagination.page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pagination.limit}
              onPageChange={handlePageChange}
              onPageSizeChange={handleLimitChange}
              storageKey="loanPostCollectionList"
            />
          </div>
        )}
      </div>

      {/* Comment Modal */}
      <RemarksCommentModal
        isOpen={commentModal.isOpen}
        loanId={commentModal.loanId}
        currentComment={commentModal.currentComment}
        isLoading={commentModal.isLoading}
        loans={loans}
        loanComments={loanComments}
        loadingComments={loadingComments}
        onClose={closeCommentModal}
        onCommentChange={(comment) =>
          setCommentModal((prev) => ({
            ...prev,
            currentComment: comment,
          }))
        }
        onSubmit={handleCommentSubmit}
      />
    </>
  );
}
