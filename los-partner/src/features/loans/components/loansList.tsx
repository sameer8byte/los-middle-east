import { useEffect, useState, useCallback, useMemo, useRef } from "react";

import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FiMail, FiCopy } from "react-icons/fi";
import { HiChevronDown, HiOutlineUser } from "react-icons/hi2";

import Avatar from "../../../common/ui/avatar";

import {
  DocumentTypeEnum,
  getUserStatusDisplay,
  LoanStatusEnum,
  PartnerTabsEnum,
  PartnerUserPermissionEnum,
} from "../../../constant/enum";
import { maskAadhaar, maskPan } from "../../../lib/utils";
import {
  Table,
  Pagination as TablePagination,
  SearchInput,
  ErrorMessage,
} from "../../../common/ui/table";
import {
  getAllLoans,
  clearLoansCache,
} from "../../../shared/services/api/loan.api";
import {
  getCreditExecutiveUsers,
  getSupervisorUsers,
} from "../../../shared/services/api/partner-user.api";
import { Loan } from "../../../shared/types/loan";
import { Pagination } from "../../../shared/types/pagination";
import { Filters } from "./filters";
import { FilterButton } from "../../../common/common/filterButton";
import dayjs from "dayjs";
import { Button } from "../../../common/ui/button";
import { useCustomerNavigator } from "../../../hooks/useViewCustomer";
import { usePersistedSearch } from "../../../hooks/usePersistedSearch";
import { StatusUpdateModal } from "./StatusUpdateModal";
import { ForceBypassReportModal } from "./forceBypassReportModel";
import { ChangeLoanRuleType } from "./changeLoanRuleType";
import { LoanReallocationModal } from "../../customerDetails/components/RellocateLoans/loans";
import { useToast } from "../../../context/toastContext";
import { useAppSelector } from "../../../shared/redux/store";
import { LoanStatusBadge } from "../../../common/ui/LoanStatusBadge";
import { useQueryParams } from "../../../hooks/useQueryParams";
import { ColumnVisibilityDropdown } from "../../../common/ui/columnVisibilityDropdown";
import { FaRupeeSign } from "react-icons/fa";
import { UserStatusReasonsDialog } from "../../customerDetails/components/UserStatusReasonsDialog";
import {
  selectIsBrand,
  selectIsLoanOnboarding,
} from "../../../shared/redux/slices/brand.slice";
import { AcefoneClickToDialButton } from "../../acefone";
const allowedEmails = ["sagarsalarywalle@gmil.com", "harshitasgr15@gmail.com"];
export default function LoanList() {
  const loanOnboardingEnabled = useAppSelector(selectIsLoanOnboarding);

  const auth = useAppSelector((state) => state.auth.data);
  const navigate = useNavigate();
  const { getQuery } = useQueryParams();
  const rawStatus = getQuery("status");

  // QuaLoan
  const isQuaLoan = useAppSelector((state) => selectIsBrand(state, "QuaLoan"));

  const status: string[] = rawStatus
    ? rawStatus.trim().startsWith("[")
      ? JSON.parse(rawStatus)
      : [rawStatus]
    : [];

  const { search } = useLocation();
  const { brandId } = useParams();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [visibleInfo, setVisibleInfo] = useState<{
    [loanId: string]: {
      email: boolean;
      phone: boolean;
    };
  }>({});

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

  const [executiveDropdownOpen, setExecutiveDropdownOpen] = useState(false);
  const [executiveUsers, setExecutiveUsers] = useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const [isLoadingExecutiveUsers, setIsLoadingExecutiveUsers] = useState(false);
  const {
    searchTerm: selectedExecutives,
    setSearchTerm: setSelectedExecutives,
  } = usePersistedSearch<string[]>("loansList_executive", []);
  const executiveDropdownRef = useRef<HTMLDivElement>(null);
  const isSenctionHead = useAppSelector((state) =>
    state.auth.data?.permissions?.some(
      (p) =>
        p === PartnerUserPermissionEnum.ALL ||
        p === PartnerUserPermissionEnum.SANCTION_HEAD ||
        p === PartnerUserPermissionEnum.SANCTION_MANAGER,
    ),
  );

  const [supervisorDropdownOpen, setSupervisorDropdownOpen] = useState(false);
  const [supervisorUsers, setSupervisorUsers] = useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const [isLoadingSupervisorUsers, setIsLoadingSupervisorUsers] =
    useState(false);
  const {
    searchTerm: selectedSupervisors,
    setSearchTerm: setSelectedSupervisors,
  } = usePersistedSearch<string[]>("loansList_supervisor", []);
  const supervisorDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        executiveDropdownRef.current &&
        !executiveDropdownRef.current.contains(event.target as Node)
      ) {
        setExecutiveDropdownOpen(false);
      }
      if (
        supervisorDropdownRef.current &&
        !supervisorDropdownRef.current.contains(event.target as Node)
      ) {
        setSupervisorDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize pagination from localStorage to prevent double render
  const [pagination, setPagination] = useState<Pagination>(() => {
    const savedLimit = localStorage.getItem("loansListPageSize");
    const savedPage = localStorage.getItem("loansListPage");
    return {
      page: savedPage ? Number(savedPage) : 1,
      limit: savedLimit ? Number(savedLimit) : 10,
      dateFilter: "",
    };
  });
  const [totalCount, setTotalCount] = useState(0);
  const { searchTerm, setSearchTerm, clearSearch } =
    usePersistedSearch("loansListSearch");
  const queryParams = new URLSearchParams(search);
  const queryObject = Object.fromEntries(queryParams.entries());

  const [updateLoanId, setUpdateLoanId] = useState<string | null>(null);
  const [bypassLoan, setBypassLoan] = useState<boolean>(false);
  const [ruleTypeLoanId, setRuleTypeLoanId] = useState<string | null>(null);
  const [loanReallocationOpen, setLoanReallocationOpen] = useState(false);
  const { showSuccess } = useToast();
  const [copiedLoanId, setCopiedLoanId] = useState<string | null>(null);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const isInitialMount = useRef(true);

  // User Status Reasons Dialog state
  const [isUserStatusReasonsDialogOpen, setIsUserStatusReasonsDialogOpen] =
    useState(false);
  const [selectedUserForStatus, setSelectedUserForStatus] = useState<
    Loan["user"] | null
  >(null);

  // Loan type filter state
  const [loanTypeFilter, setLoanTypeFilter] = useState<string>(() => {
    const savedFilter = sessionStorage.getItem("loansLoanTypeFilter");
    return savedFilter || "";
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(globalThis.location.search);
    const loanIdFromUrl = urlParams.get("updateLoanId");
    if (loanIdFromUrl) {
      setUpdateLoanId(loanIdFromUrl);
    }
  }, []);
  const totalPages = useMemo(() => {
    return Math.ceil(totalCount / pagination.limit);
  }, [totalCount, pagination.limit]);
  const fetchExecutiveUsers = useCallback(async () => {
    if (!brandId || executiveUsers.length > 0) return;

    setIsLoadingExecutiveUsers(true);
    try {
      const response = await getCreditExecutiveUsers(brandId);
      setExecutiveUsers(response || []);
    } catch (error) {
      console.error("Error fetching executive users:", error);
    } finally {
      setIsLoadingExecutiveUsers(false);
    }
  }, [brandId, executiveUsers.length]);
  const fetchSupervisorUsers = useCallback(async () => {
    if (!brandId || supervisorUsers.length > 0) return;

    setIsLoadingSupervisorUsers(true);
    try {
      const response = await getSupervisorUsers(brandId);
      setSupervisorUsers(response || []);
    } catch (error) {
      console.error("Error fetching supervisor users:", error);
    } finally {
      setIsLoadingSupervisorUsers(false);
    }
  }, [brandId, supervisorUsers.length]);
  const handleExecutiveDropdownToggle = useCallback(() => {
    if (!executiveDropdownOpen) {
      fetchExecutiveUsers();
    }
    setExecutiveDropdownOpen(!executiveDropdownOpen);
  }, [executiveDropdownOpen, fetchExecutiveUsers]);
  const handleSupervisorDropdownToggle = useCallback(() => {
    if (!supervisorDropdownOpen) {
      fetchSupervisorUsers();
    }
    setSupervisorDropdownOpen(!supervisorDropdownOpen);
  }, [supervisorDropdownOpen, fetchSupervisorUsers]);
  const handleExecutiveToggle = useCallback((executiveId: string) => {
    setSelectedExecutives((prev) => {
      const newSelected = prev.includes(executiveId)
        ? prev.filter((id) => id !== executiveId)
        : [...prev, executiveId];

      return newSelected;
    });
  }, []);

  // Handle supervisor selection
  const handleSupervisorToggle = useCallback((supervisorId: string) => {
    setSelectedSupervisors((prev) => {
      const newSelected = prev.includes(supervisorId)
        ? prev.filter((id) => id !== supervisorId)
        : [...prev, supervisorId];

      return newSelected;
    });
  }, []);

  // Clear executive filter
  const clearExecutiveFilter = useCallback(() => {
    setSelectedExecutives([]);
  }, []);

  // Clear supervisor filter
  const clearSupervisorFilter = useCallback(() => {
    setSelectedSupervisors([]);
  }, []);

  // Handle loan type filter change
  const handleLoanTypeFilterClick = (typeFilter: string) => {
    setLoanTypeFilter(typeFilter);
    sessionStorage.setItem("loansLoanTypeFilter", typeFilter);
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
        PartnerTabsEnum.LOANS,
        {
          page: pagination.page,
          limit: pagination.limit,
          dateFilter: queryObject?.dateFilter,
        },
        {
          status: status.length > 0 ? JSON.stringify(status) : "[]",
          search: searchTerm || "",
          loanAgreementStatus: queryObject?.loanAgreementStatus || "[]",
          assignedExecutive:
            selectedExecutives.length > 0
              ? JSON.stringify(selectedExecutives)
              : "[]",
          assignedSupervisor:
            selectedSupervisors.length > 0
              ? JSON.stringify(selectedSupervisors)
              : "[]",
          loanType: loanTypeFilter || "",
        },
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
    queryObject?.loanAgreementStatus,
    queryObject?.status,
    selectedExecutives,
    selectedSupervisors,
    searchTerm,
    loanTypeFilter,
  ]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (brandId) fetchLoans();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [fetchLoans, brandId]);

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
      // Optionally refresh the current data
      await fetchLoans();
    } catch (error) {
      console.error("Error clearing cache:", error);
      showSuccess("Cache Clear Failed", "Please try again or contact support");
    } finally {
      setIsClearingCache(false);
    }
  }, [brandId, showSuccess, fetchLoans]);

  // Handle opening User Status Reasons dialog
  const handleOpenUserStatusReasons = (loan: Loan) => {
    setSelectedUserForStatus(loan.user);
    setIsUserStatusReasonsDialogOpen(true);
  };

  // Handle success after updating user status reasons
  const handleUserStatusReasonsSuccess = () => {
    // Refresh the loans list
    fetchLoans();
  };

  const handlePageChange = useCallback((newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  }, []);

  const handleLimitChange = useCallback((newLimit: number) => {
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
  }, []);

  const { handleView } = useCustomerNavigator();

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

      // Get assigned executives info
      const assignedPartners = loan.allottedPartners || [];
      const assignedInfo = assignedPartners.length
        ? assignedPartners
            .map((partner) => {
              const role = partner.partnerUser.reportsToId
                ? "Executive"
                : "Manager/Head";
              return `  • ${partner.partnerUser.name || "N/A"} (${role}) - ₹${
                partner.amount?.toLocaleString("en-IN") || "0"
              }`;
            })
            .join("\n")
        : "  Not assigned";

      // Get status reasons if any
      const latestStatusWithReasons = loan.loanStatusHistory?.find(
        (history) =>
          history.status === loan.status &&
          (history.loan_status_brand_reasons?.length ?? 0) > 0,
      );
      const statusReasons =
        latestStatusWithReasons?.loan_status_brand_reasons || [];
      const reasonsInfo = statusReasons.length
        ? "\nRejection Reasons:\n" +
          statusReasons
            .map((reason) => `  • ${reason.brandStatusReason.reason}`)
            .join("\n")
        : "";

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
Amount: ₹${loan.amount?.toLocaleString("en-IN") || "N/A"}
Status: ${loan.status}
Agreement: ${
        loan?.agreement?.status
          ? loan.agreement.status.toLowerCase().replace(/_/g, " ")
          : "N/A"
      }
Created: ${dayjs(loan.createdAt).format("MMMM D, YYYY h:mm A")}${reasonsInfo}

👥 Assigned To
━━━━━━━━━━━━━━━━━━━━
${assignedInfo}

📄 Documents
━━━━━━━━━━━━━━━━━━━━
${documentInfo}
${
  loan?.forceCreditReportByPass || loan?.forceBsaReportByPass
    ? "\n⚠️  WARNING: Force Bypass Applied"
    : ""
}

═══════════════════════════════
Generated on ${dayjs().format("DD MMM YYYY, hh:mm A")} by ${auth?.email}(${
        auth.name
      }) -  ${auth?.role || "N/A"} 
---- LOAN ----
═══════════════════════════════
    `.trim();

      navigator.clipboard.writeText(copyText).then(() => {
        // Set copied state for animation
        setCopiedLoanId(loan.id);

        // Show success toast
        showSuccess("Copied!", "Customer information copied to clipboard");

        // Reset copied state after animation
        setTimeout(() => {
          setCopiedLoanId(null);
        }, 2000);
      });
    },
    [showSuccess],
  );

  // Persist account status filter
  const handleLoanStatusClick = (statusValue: string) => {
    const params = new URLSearchParams(location.search);
    if (statusValue) {
      params.set("status", JSON.stringify([statusValue]));
      // Save to sessionStorage
      try {
        sessionStorage.setItem("loansListFilters", statusValue);
      } catch (error) {
        console.error("Error saving account status to sessionStorage:", error);
      }
    } else {
      params.delete("status");
      try {
        sessionStorage.removeItem("loansListFilters");
      } catch (error) {
        console.error(
          "Error removing account status from sessionStorage:",
          error,
        );
      }
    }
    navigate(`?${params.toString()}`, { replace: true });
  };

  useEffect(() => {
    if (isInitialMount.current && status.length === 0) {
      try {
        const savedStatus = sessionStorage.getItem("loansListFilters");
        if (savedStatus) {
          handleLoanStatusClick(savedStatus);
        } else {
          const defaultStatus = isQuaLoan ? "" : LoanStatusEnum.PENDING;
          handleLoanStatusClick(defaultStatus);
        }
      } catch (error) {
        console.error("Error with loan status state:", error);
        handleLoanStatusClick("");
      }
    }
    isInitialMount.current = false;
  }, [status, handleLoanStatusClick]);

  // Define table columns
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
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${
                        !loan?.is_repeat_loan
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {!loan?.is_repeat_loan ? "Fresh" : "Repeat"}
                    </span>
                  )}
                </div>

                {/* Email with toggle */}
                <div className="flex items-center justify-between group/email">
                  <div className="flex items-center gap-1 text-xs text-[var(--color-on-surface)] flex-1">
                    <FiMail className="h-3 w-3 text-[var(--color-on-surface)] opacity-50 flex-shrink-0" />
                    <span className="truncate max-w-[150px]">
                      {loan.user.email
                        ? isEmailVisible
                          ? loan.user.email
                          : loan.user.email.replace(
                              /(?<=^.{1}).*?(?=@)/g,
                              (match) => "X".repeat(match.length),
                            )
                        : "N/A"}
                    </span>
                  </div>
                  {loan.user.email && loan.user.email !== "N/A" && (
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
                  <div className="flex items-center gap-1 text-xs text-[var(--color-on-surface)] flex-1">
                    {loan.id && (
                      <AcefoneClickToDialButton
                        userId={loan.userId}
                        loanId={loan.id}
                      />
                    )}{" "}
                    <span className="truncate max-w-[150px]">
                      {loan.user.phoneNumber
                        ? isPhoneVisible
                          ? loan.user.phoneNumber
                          : loan.user.phoneNumber.replace(/\d(?=\d{4})/g, "X")
                        : "N/A"}
                    </span>
                  </div>
                  {loan.user.phoneNumber && loan.user.phoneNumber !== "N/A" && (
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
            <div className="space-y-2 min-w-[160px] ">
              {/* Account Status */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--color-on-background)] capitalize">
                    {getUserStatusDisplay(loan.user?.status_id)}
                  </span>
                  {loanOnboardingEnabled &&
                    loan.status === LoanStatusEnum.ONBOARDING && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenUserStatusReasons(loan);
                        }}
                        className="text-xs px-2 py-1 h-6 text-[var(--color-primary)] hover:text-[var(--color-primary-active)]"
                        title="Edit status reasons"
                      >
                        Edit
                      </Button>
                    )}
                </div>
                {hasBlockAlert && (
                  <div className="flex flex-col gap-1 mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        ---- ⚠️ FD Alert ----
                      </span>
                    </div>
                    <div className="text-xs text-amber-800 mt-1 max-w-[250px]">
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
        label: "Loan Amount",
        render: (_: any, loan: Loan) => (
          <div className="text-sm text-[var(--color-on-background)] font-semibold">
            {loan.status === LoanStatusEnum.ONBOARDING ? (
              <span className="italic text-[var(--color-on-surface)] opacity-70">
                Amount will be visible post onboarding
              </span>
            ) : (
              loan.amount?.toLocaleString("en-IN") || "N/A"
            )}
          </div>
        ),
      },
      {
        key: "assignedExecutive",
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
        key: "created",
        label: "Created",
        render: (_: any, loan: Loan) => (
          <div className="flex flex-col gap-1 justify-start min-w-[120px]">
            {/* Date */}
            <div className="text-sm text-[var(--color-on-background)]">
              {dayjs(loan.createdAt).format("MMMM D, YYYY")}
            </div>

            {/* Time */}
            <div className="text-[var(--color-on-surface)] opacity-70 font-light text-xs">
              {dayjs(loan.createdAt).format("h:mm A")} IST
            </div>
          </div>
        ),
      },

      {
        key: "loan_status",
        label: "Loan Status",
        render: (_: any, loan: Loan) => {
          // Get latest status history with reasons
          const latestStatusWithReasons = loan.loanStatusHistory?.find(
            (history) =>
              history.status === loan.status &&
              (history.loan_status_brand_reasons?.length ?? 0) > 0,
          );
          const statusReasons =
            latestStatusWithReasons?.loan_status_brand_reasons || [];

          // Get the latest status history entry for partner user info
          const latestStatusHistory = loan.loanStatusHistory?.find(
            (history) => history.status === loan.status,
          );

          return (
            <div className="flex  align-top flex-col items-start gap-1 max-w-[220px]">
              {/* Loan Status button */}
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

              {/* Status Reasons */}
              {statusReasons.length > 0 && (
                <div className="flex flex-col gap-1 text-xs">
                  {statusReasons.map((reason, index) => (
                    <span
                      key={`${reason.brandStatusReason.reason}-${index}`}
                      className="bg-[var(--color-error)] text-white px-2 py-0.5 rounded w-fit"
                      title={reason.brandStatusReason.reason}
                    >
                      {reason.brandStatusReason.reason}
                    </span>
                  ))}
                </div>
              )}

              {/* Agreement Status */}
              <div className="font-normal text-[var(--color-on-surface)] opacity-70 text-sm break-words">
                <span className="capitalize">
                  Agreement{" "}
                  {loan?.agreement?.status
                    ? loan.agreement.status.toLowerCase().replace(/_/g, " ")
                    : "N/A"}
                </span>
              </div>
            </div>
          );
        },
      },

      {
        key: "actions",
        label: "Actions",
        render: (_: any, loan: Loan) => {
          // const isForceBypass =
          //   loan?.forceCreditReportByPass || loan?.forceBsaReportByPass;

          return (
            <div className="flex flex-col gap-2 min-w-[120px]">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleView(loan.user.id, brandId!, "loans");
                }}
              >
                View
              </Button>
              {/* Only show Update Status button for REJECTED loans */}
              {loan.status === "REJECTED" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUpdateLoanId(loan.id);
                  }}
                >
                  Reactivate
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [handleView, copyCustomerInfo, copiedLoanId, visibleInfo, toggleVisibility],
  );
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = sessionStorage.getItem("loansVisibleColumns");
    return saved ? JSON.parse(saved) : columns.map((col) => col.key);
  });

  useEffect(() => {
    sessionStorage.setItem(
      "loansVisibleColumns",
      JSON.stringify(visibleColumns),
    );
  }, [visibleColumns]);
  return (
    <div>
      <div className="h-[calc(100vh-80px)] flex flex-col">
        {error && (
          <div className="bg-white px-6 py-2 w-full flex-shrink-0">
            <ErrorMessage message={error} onRetry={() => setError(null)} />
          </div>
        )}

        {/* Header Section - Full Width */}
        <div className="bg-white border-b border-[var(--color-muted)] border-opacity-30  px-6 py-4 w-full flex-shrink-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-6">
              <h1 className="text-2xl font-semibold text-[var(--color-on-background)] whitespace-nowrap">
                Loans{" "}
                <span className="text-gray-500 font-normal">
                  ({totalCount})
                </span>
              </h1>

              {/* Loan Type Tabs */}
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

        {/* === Filter Toolbar === */}
        <div className="flex-shrink-0 bg-white border-b border-[var(--color-muted)] border-opacity-30 px-6 py-3 w-full flex flex-wrap items-center gap-3">
          {/* Left side - Filter controls */}
          <div className="flex flex-wrap items-center gap-3">
            <FilterButton />

            {/* Executive Filter Dropdown */}
            <div className="relative" ref={executiveDropdownRef}>
              <Button
                onClick={handleExecutiveDropdownToggle}
                variant="surface"
                className={`flex items-center gap-2 border rounded-xl shadow-sm transition-all duration-150 ${
                  selectedExecutives.length > 0
                    ? "bg-blue-50 border-blue-300 hover:bg-blue-100"
                    : "bg-white border-gray-300 hover:bg-gray-50"
                }`}
              >
                <HiChevronDown
                  className={`w-4 h-4 transition-transform ${
                    executiveDropdownOpen ? "rotate-180" : ""
                  }`}
                />
                <span>
                  {selectedExecutives.length > 0
                    ? `Executive (${selectedExecutives.length})`
                    : "Executive"}
                </span>
              </Button>

              {executiveDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                  <div className="sticky top-0 bg-white border-b border-gray-200 p-3 flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-800">
                      Filter by Executive
                    </span>
                    {selectedExecutives.length > 0 && (
                      <button
                        onClick={clearExecutiveFilter}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {isLoadingExecutiveUsers ? (
                    <div className="p-6 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-sm text-gray-500 mt-2">
                        Loading executives...
                      </p>
                    </div>
                  ) : executiveUsers.length > 0 ? (
                    <div className="p-2">
                      {executiveUsers.map((user) => (
                        <label
                          key={user.id}
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition"
                        >
                          <input
                            type="checkbox"
                            checked={selectedExecutives.includes(user.id)}
                            onChange={() => handleExecutiveToggle(user.id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">
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
                      <p>No executives found</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Supervisor Filter Dropdown */}
            <div className="relative" ref={supervisorDropdownRef}>
              <Button
                onClick={handleSupervisorDropdownToggle}
                variant="surface"
                className={`flex items-center gap-2 border rounded-xl shadow-sm transition-all duration-150 ${
                  selectedSupervisors.length > 0
                    ? "bg-purple-50 border-purple-300 hover:bg-purple-100"
                    : "bg-white border-gray-300 hover:bg-gray-50"
                }`}
              >
                <HiChevronDown
                  className={`w-4 h-4 transition-transform ${
                    supervisorDropdownOpen ? "rotate-180" : ""
                  }`}
                />
                <span>
                  {selectedSupervisors.length > 0
                    ? `Supervisor (${selectedSupervisors.length})`
                    : "Supervisor"}
                </span>
              </Button>

              {supervisorDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                  <div className="sticky top-0 bg-white border-b border-gray-200 p-3 flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-800">
                      Filter by Supervisor
                    </span>
                    {selectedSupervisors.length > 0 && (
                      <button
                        onClick={clearSupervisorFilter}
                        className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {isLoadingSupervisorUsers ? (
                    <div className="p-6 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                      <p className="text-sm text-gray-500 mt-2">
                        Loading supervisors...
                      </p>
                    </div>
                  ) : supervisorUsers.length > 0 ? (
                    <div className="p-2">
                      {supervisorUsers.map((user) => (
                        <label
                          key={user.id}
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition"
                        >
                          <input
                            type="checkbox"
                            checked={selectedSupervisors.includes(user.id)}
                            onChange={() => handleSupervisorToggle(user.id)}
                            className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-medium text-sm">
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
                      <p>No supervisors found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex flex-row justify-end items-center ml-auto gap-3">
            {/* <SyncEsignStatus /> */}
            {(isSenctionHead ||
              allowedEmails.includes(auth.email?.trim()) ||
              (window.location.origin !== "https://lm.qualoan.com" &&
                window.location.origin !== "https://lm.salary4sure.com" &&
                window.location.origin !== "https://crm.zeptofinance.com")) && (
              <Button
                variant="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  setLoanReallocationOpen(true);
                }}
              >
                Reallocate Loans
              </Button>
            )}
            <Button
              variant="primary"
              onClick={(e) => {
                e.stopPropagation();
                setBypassLoan(true);
              }}
            >
              Bypass Reports
            </Button>
            <Button
              variant="primary"
              onClick={(e) => {
                e.stopPropagation();
                setRuleTypeLoanId("search");
              }}
            >
              Change Rule Type
            </Button>
          </div>
        </div>

        {/* === Loan Status Filter Bar === */}
        <div className="flex items-center px-6 bg-white border-b border-gray-200">
          <div className="flex">
            {[
              // Show "All" first only if isQuaLoan is true
              ...(isQuaLoan ? [{ label: "All", value: "" }] : []),
              // Only show Onboarding tab when loanOnboardingEnabled is true
              ...(loanOnboardingEnabled
                ? [
                    {
                      value: LoanStatusEnum.ONBOARDING,
                      label: "Onboarding",
                    },
                  ]
                : []),
              { value: LoanStatusEnum.PENDING, label: "Pending" },
              {
                value: LoanStatusEnum.CREDIT_EXECUTIVE_APPROVED,
                label: "Credit Executive",
              },
              {
                value: LoanStatusEnum.SANCTION_MANAGER_APPROVED,
                label: "Sanction Manager",
              },
              { value: LoanStatusEnum.APPROVED, label: "Sanction Head" },
              { value: LoanStatusEnum.REJECTED, label: "Rejected" },
              { value: LoanStatusEnum.DISBURSED, label: "Disbursed" },
              // Show "All" last if isQuaLoan is false
              ...(!isQuaLoan ? [{ label: "All", value: "" }] : []),
            ].map((option) => {
              const isAll = option.value === "";
              const isActive = isAll
                ? status.length === 0
                : status?.some?.((s) => s === option.value);

              return (
                <button
                  key={option.value || "all"}
                  onClick={() => handleLoanStatusClick(option.value)}
                  className={`relative px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
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
          <div className="flex flex-row justify-end items-center ml-auto gap-3">
            <ColumnVisibilityDropdown
              columns={columns}
              visibleColumns={visibleColumns}
              setVisibleColumns={setVisibleColumns}
              compulsoryColumns={["customer"]}
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
            <div className="h-full overflow-y-auto overflow-x-auto ">
              <Table
                columns={columns.filter(
                  (col) =>
                    visibleColumns.includes(col.key) &&
                    // Hide "Loan Amount" column in Onboarding tab
                    !(
                      col.key === "amount" &&
                      status.includes(LoanStatusEnum.ONBOARDING)
                    ),
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
              storageKey="loansList"
            />
          </div>
        )}
      </div>

      {/* Status Update Modal */}
      <StatusUpdateModal
        isOpen={!!updateLoanId}
        onClose={() => setUpdateLoanId(null)}
        loanId={updateLoanId}
        onSuccess={() => {
          fetchLoans(); // Refresh the loans list
        }}
      />

      {/* Force Bypass Reports Modal */}
      <ForceBypassReportModal
        isOpen={!!bypassLoan}
        onClose={() => setBypassLoan(false)}
        onSuccess={() => {
          fetchLoans(); // Refresh the loans list
        }}
      />

      {/* Change Loan Rule Type Modal */}
      <ChangeLoanRuleType
        isOpen={!!ruleTypeLoanId}
        onClose={() => setRuleTypeLoanId(null)}
        loanId={ruleTypeLoanId}
        onSuccess={() => {
          fetchLoans(); // Refresh the loans list
          setRuleTypeLoanId(null);
        }}
      />

      {/* Loan Reallocation Modal */}
      <LoanReallocationModal
        isOpen={loanReallocationOpen}
        onClose={() => setLoanReallocationOpen(false)}
        loanId={null}
        brandId={brandId!}
        onSuccess={() => {
          fetchLoans(); // Refresh the loans list
        }}
      />

      {/* User Status Reasons Dialog */}
      <UserStatusReasonsDialog
        isOpen={isUserStatusReasonsDialogOpen}
        onClose={() => {
          setIsUserStatusReasonsDialogOpen(false);
          setSelectedUserForStatus(null);
        }}
        brandId={brandId!}
        customerId={selectedUserForStatus?.id || ""}
        customer={selectedUserForStatus as any}
        onSuccess={handleUserStatusReasonsSuccess}
      />
    </div>
  );
}
