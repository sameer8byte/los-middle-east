import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FiMail, FiCopy } from "react-icons/fi";
import { maskAadhaar, maskPan } from "../../../lib/utils";
import { useToast } from "../../../context/toastContext";
import {
  DocumentTypeEnum,
  getUserStatusDisplay,
  LoanStatusEnum,
  PartnerTabsEnum,
  PartnerUserPermissionEnum,
  PartnerUserRoleEnum,
} from "../../../constant/enum";
import {
  getAllLoans,
  clearLoansCache,
} from "../../../shared/services/api/loan.api";
import { Loan } from "../../../shared/types/loan";
import { Pagination } from "../../../shared/types/pagination";
import {
  Table,
  Pagination as TablePagination,
  SearchInput,
  ErrorMessage,
} from "../../../common/ui/table";
import { Filters } from "./filters";
import { FilterButton } from "../../../common/common/filterButton";
import dayjs from "dayjs";
import Avatar from "../../../common/ui/avatar";
import { Button } from "../../../common/ui/button";
import { useCustomerNavigator } from "../../../hooks/useViewCustomer";
import { usePersistedSearch } from "../../../hooks/usePersistedSearch";
import { useAppSelector } from "../../../shared/redux/store";
import { LoanStatusBadge } from "../../../common/ui/LoanStatusBadge";
import { useQueryParams } from "../../../hooks/useQueryParams";
import { ColumnVisibilityDropdown } from "../../../common/ui/columnVisibilityDropdown";
import { LoanReallocationModal } from "../../customerDetails/components/RellocateLoans/loans";
import { Conversion } from "../../../utils/conversion";
import { ChangeLoanRuleType } from "../../loans/components/changeLoanRuleType";
import { HiChevronDown, HiOutlineUser } from "react-icons/hi2";
import {
  getCreditExecutiveUsers,
  getSupervisorUsers,
} from "../../../shared/services/api/partner-user.api";
import { selectIsLoanOnboarding } from "../../../shared/redux/slices/brand.slice";
import { AcefoneClickToDialButton } from "../../acefone";
const allowedEmails = ["sagarsalarywalle@gmil.com", "harshitasgr15@gmail.com"];

export default function LoanList() {
  const loanOnboardingEnabled = useAppSelector(selectIsLoanOnboarding);

  const [loanReallocationOpen, setLoanReallocationOpen] = useState(false);

  const auth = useAppSelector((state) => state.auth.data);

  const navigate = useNavigate();
  const { getQuery } = useQueryParams();
  const rawStatus = getQuery("status") || '["PENDING"]';
  const status: string[] = rawStatus
    ? rawStatus.trim().startsWith("[")
      ? JSON.parse(rawStatus)
      : rawStatus.split(",").filter(Boolean)
    : [];

  const [refresh] = useState(false);
  const { search } = useLocation();
  const { brandId } = useParams();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalLoanAmount, setTotalLoanAmount] = useState<number>(0);

  // Add visibility state for email and phone masking
  const [visibleInfo, setVisibleInfo] = useState<{
    [loanId: string]: {
      email: boolean;
      phone: boolean;
    };
  }>({});

  // Toggle visibility function
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

  // Executive filter dropdown state
  const [executiveDropdownOpen, setExecutiveDropdownOpen] = useState(false);
  const [executiveUsers, setExecutiveUsers] = useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const [isLoadingExecutiveUsers, setIsLoadingExecutiveUsers] = useState(false);
  const {
    searchTerm: selectedExecutives,
    setSearchTerm: setSelectedExecutives,
  } = usePersistedSearch<string[]>("loanCreditExecutiveList_executive", []);
  const executiveDropdownRef = useRef<HTMLDivElement>(null);

  // Supervisor filter dropdown state
  const [supervisorDropdownOpen, setSupervisorDropdownOpen] = useState(false);
  const [supervisorUsers, setSupervisorUsers] = useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const [isLoadingSupervisorUsers, setIsLoadingSupervisorUsers] =
    useState(false);
  const {
    searchTerm: selectedSupervisors,
    setSearchTerm: setSelectedSupervisors,
  } = usePersistedSearch<string[]>("loanCreditExecutiveList_supervisor", []);
  const supervisorDropdownRef = useRef<HTMLDivElement>(null);

  // Salary filter state
  const { searchTerm: salaryRange, setSearchTerm: setSalaryRange } =
    usePersistedSearch<{
      min: string;
      max: string;
    }>("loanCreditExecutiveList_salary", { min: "", max: "" });
  const [salaryDropdownOpen, setSalaryDropdownOpen] = useState(false);
  const salaryDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
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
      if (
        salaryDropdownRef.current &&
        !salaryDropdownRef.current.contains(event.target as Node)
      ) {
        setSalaryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Loan type filter state
  const [loanTypeFilter, setLoanTypeFilter] = useState<string>(() => {
    const savedFilter = sessionStorage.getItem("loansLoanTypeFilter");
    return savedFilter || "";
  });

  // Initialize pagination from localStorage to prevent double render
  const [pagination, setPagination] = useState<Pagination>(() => {
    const savedLimit = localStorage.getItem("loanCreditExecutiveListPageSize");
    const savedPage = localStorage.getItem("loanCreditExecutiveListPage");
    return {
      page: savedPage ? Number(savedPage) : 1,
      limit: savedLimit ? Number(savedLimit) : 10,
      dateFilter: "",
    };
  });
  const [totalCount, setTotalCount] = useState(0);

  const { searchTerm, setSearchTerm, clearSearch } = usePersistedSearch(
    "loanCreditExecutiveList_search",
    "",
  );

  // Cache clear state
  const [isClearingCache, setIsClearingCache] = useState(false);
  const isSenctionHead = useAppSelector((state) =>
    state.auth.data?.permissions?.some(
      (p) =>
        p === PartnerUserPermissionEnum.ALL ||
        p === PartnerUserPermissionEnum.SANCTION_HEAD ||
        p === PartnerUserPermissionEnum.SANCTION_MANAGER,
    ),
  );
  const queryParams = new URLSearchParams(search);
  const queryObject = Object.fromEntries(queryParams.entries());
  const [ruleTypeLoanId, setRuleTypeLoanId] = useState<string | null>(null);

  // Fetch executive users
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

  // Fetch supervisor users
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

  // Handle executive dropdown toggle
  const handleExecutiveDropdownToggle = useCallback(() => {
    if (!executiveDropdownOpen) {
      fetchExecutiveUsers();
    }
    setExecutiveDropdownOpen(!executiveDropdownOpen);
  }, [executiveDropdownOpen, fetchExecutiveUsers]);

  // Handle supervisor dropdown toggle
  const handleSupervisorDropdownToggle = useCallback(() => {
    if (!supervisorDropdownOpen) {
      fetchSupervisorUsers();
    }
    setSupervisorDropdownOpen(!supervisorDropdownOpen);
  }, [supervisorDropdownOpen, fetchSupervisorUsers]);

  // Handle executive selection
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

  // Clear salary filter
  const clearSalaryFilter = useCallback(() => {
    setSalaryRange({ min: "", max: "" });
  }, []);

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
        PartnerTabsEnum.CREDIT_EXECUTIVE,
        {
          page: pagination.page,
          limit: pagination.limit,
          dateFilter: queryObject?.dateFilter,
        },
        {
          status: queryObject?.status || '["PENDING"]',
          search: searchTerm || "",
          loanType: loanTypeFilter || "",
          assignedExecutive:
            selectedExecutives.length > 0
              ? JSON.stringify(selectedExecutives)
              : "[]",
          assignedSupervisor:
            selectedSupervisors.length > 0
              ? JSON.stringify(selectedSupervisors)
              : "[]",
          // Add salary range to the filter
          ...((salaryRange.min.trim() || salaryRange.max.trim()) && {
            salaryMin: salaryRange.min,
            salaryMax: salaryRange.max,
          }),
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
    pagination.page,
    pagination.limit,
    queryObject?.dateFilter,
    queryObject?.status,
    searchTerm,
    loanTypeFilter,
    selectedExecutives,
    selectedSupervisors,
    salaryRange.min,
    salaryRange.max,
  ]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (brandId) fetchLoans();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [
    refresh,
    brandId,
    pagination,
    queryObject?.dateFilter,
    queryObject?.status,
    searchTerm,
    loanTypeFilter,
    selectedExecutives,
    selectedSupervisors,
    salaryRange.min,
    salaryRange.max,
  ]);

  const totalPages = useMemo(() => {
    return Math.ceil(totalCount / pagination.limit);
  }, [totalCount, pagination.limit]);

  const handleLoanStatusClick = (statusValue: string) => {
    const params = new URLSearchParams(location.search);
    if (statusValue) {
      params.set("status", JSON.stringify([statusValue]));
      try {
        sessionStorage.setItem("loanCreditExecutiveFilters", statusValue);
      } catch (error) {
        console.error("Error saving account status to sessionStorage:", error);
      }
    } else {
      params.delete("status");
      try {
        sessionStorage.removeItem("loanCreditExecutiveFilters");
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
    if (!status) {
      try {
        const savedStatus = sessionStorage.getItem(
          "loanCreditExecutiveFilters",
        );
        if (savedStatus) {
          handleLoanStatusClick(savedStatus);
        }
      } catch (error) {
        console.error(
          "Error reading account status from sessionStorage:",
          error,
        );
      }
    }
  }, []);

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (newLimit: number) => {
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
  };
  const { handleView } = useCustomerNavigator();

  // Toast for notifications
  const { showSuccess } = useToast();

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
      setError(null);
      fetchLoans();
    } catch (error) {
      console.error("Error clearing cache:", error);
      showSuccess("Cache Clear Failed", "Please try again or contact support");
    } finally {
      setIsClearingCache(false);
    }
  }, [brandId, showSuccess]);

  // Track copied loan ID for animation
  const [copiedLoanId, setCopiedLoanId] = useState<string | null>(null);

  // Copy customer info to clipboard
  const copyCustomerInfo = (loan: Loan, e: React.MouseEvent) => {
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
---- LOAN CREDIT EXECUTIVE ----
═══════════════════════════════


    `.trim();

    navigator.clipboard.writeText(copyText).then(() => {
      setCopiedLoanId(loan.id);
      showSuccess("Copied!", "Customer information copied to clipboard");
      setTimeout(() => {
        setCopiedLoanId(null);
      }, 2000);
    });
  };

  // Handle loan type filter change
  const handleLoanTypeFilterClick = (typeFilter: string) => {
    setLoanTypeFilter(typeFilter);
    sessionStorage.setItem("loansLoanTypeFilter", typeFilter);
  };
  // Define table columns
  const columns = useMemo(
    () => [
      {
        key: "loanId",
        label: "Loan ID",
        render: (_: any, loan: Loan) => {
          const fullName =
            [
              loan?.user?.userDetails?.firstName,
              loan?.user?.userDetails?.middleName,
              loan?.user?.userDetails?.lastName,
            ]
              .filter(Boolean)
              .join(" ") || "N/A";

          const email = loan?.user?.email || "N/A";
          const phone = loan?.user?.phoneNumber || "N/A";
          const shortId = loan?.formattedLoanId || "N/A";

          // Get visibility state for this loan
          const isEmailVisible = visibleInfo[loan.id]?.email || false;
          const isPhoneVisible = visibleInfo[loan.id]?.phone || false;

          return (
            <div className="flex items-start gap-2 max-w-[250px] group relative">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-[var(--color-surface)] rounded-full flex items-center justify-center overflow-hidden">
                  <Avatar />
                </div>
              </div>

              {/* User Info */}
              <div className="flex flex-col justify-start flex-1">
                {/* Full Name */}
                <div className="text-[var(--color-on-background)] font-semibold text-base break-words">
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
                </div>
                {loan.user.employment?.salary && (
                  <div className="flex items-center gap-2 text-xs text-[var(--color-on-surface)] opacity-70 mt-1">
                    <span>
                      Salary: {loan.user.employment?.salary ? Conversion.formatCurrency(loan.user.employment.salary) : "N/A"}
                    </span>
                  </div>
                )}
                {/* Loan ID */}
                <div className="text-sm text-[var(--color-on-surface)] opacity-70 mt-1">
                  #{shortId}
                </div>

                {/* Email with toggle */}
                <div className="flex items-center justify-between group/email">
                  <div className="flex items-center gap-2 text-sm text-[var(--color-on-surface)] opacity-70 mt-1 flex-1">
                    <FiMail className="h-3 w-3 text-[var(--color-on-surface)] opacity-50 flex-shrink-0" />
                    <span className="truncate">
                      {email
                        ? isEmailVisible
                          ? email
                          : email.replace(/(?<=^.{1}).*?(?=@)/g, (match) =>
                            "X".repeat(match.length),
                          )
                        : "N/A"}
                    </span>
                  </div>
                  {email && email !== "N/A" && (
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
                  <div className="flex items-center gap-2 text-sm text-[var(--color-on-surface)] opacity-70 flex-1">
                    {loan.id && (
                      <AcefoneClickToDialButton
                        userId={loan.userId}
                        loanId={loan.id}
                      />
                    )}{" "}
                    <span className="truncate">
                      {phone
                        ? isPhoneVisible
                          ? phone
                          : phone.replace(/\d(?=\d{4})/g, "X")
                        : "N/A"}
                    </span>
                  </div>
                  {phone && phone !== "N/A" && (
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
                  {loan.user?.status_id && <span className="text-sm font-medium text-[var(--color-on-background)] capitalize">
                    {
                      getUserStatusDisplay(
                        loan.user?.status_id)}
                  </span>}
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
                      {(
                        loan.user?.user_status_brand_reasons || []
                      ).map((item) => (
                        <span
                          key={item.id}
                          className="inline-flex items-center px-2 py-0.5 text-xs bg-[var(--color-muted)] text-[var(--color-on-surface)] rounded-md"
                          title={item.brand_status_reasons.reason}
                        >
                          {item.brand_status_reasons.reason}
                        </span>
                      ))}
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
              loan.amount ? Conversion.formatCurrency(loan.amount) : "N/A"
            )}{" "}
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
                        Amount: {assignedPartner.amount ? Conversion.formatCurrency(assignedPartner.amount) : "0"}
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
            <div className="flex flex-col gap-1.5 max-w-[220px]">
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
                <div className="flex flex-col gap-1">
                  {statusReasons.map((reasonItem) => (
                    <span
                      key={reasonItem.id}
                      className="inline-flex items-center rounded-md bg-[var(--color-error)] bg-opacity-10 px-2 py-1 text-xs font-medium text-[var(--color-on-error)]"
                      title={reasonItem.brandStatusReason.reason}
                    >
                      {reasonItem.brandStatusReason.reason}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        },
      },

      {
        key: "createdAt",
        label: "Created",
        render: (_: any, loan: Loan) => (
          <div className="flex flex-col gap-1 justify-start">
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
        key: "view",
        label: "View",
        render: (_: any, loan: Loan) => {
          return (
            <Button
              onClick={() =>
                handleView(loan.user.id, brandId!, "credit-executive")
              }
              variant="outline"
            >
              View
            </Button>
          );
        },
      },
    ],
    [handleView, copyCustomerInfo, copiedLoanId, visibleInfo, toggleVisibility],
  );
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = sessionStorage.getItem("CreditExecutiveTabVisibleColumns");
    return saved ? JSON.parse(saved) : columns.map((col) => col.key);
  });

  useEffect(() => {
    sessionStorage.setItem(
      "CreditExecutiveTabVisibleColumns",
      JSON.stringify(visibleColumns),
    );
  }, [visibleColumns]);
  return (
    <div className="h-[calc(100vh-80px)] flex flex-col">
      {/* Error Message */}
      {error && (
        <div className="var(--color-background) px-6 py-2 w-full flex-shrink-0">
          <ErrorMessage message={error} onRetry={() => setError(null)} />
        </div>
      )}

      {/* Header Section - Full Width */}
      <div className="var(--color-background) border-b border-[var(--color-muted)] border-opacity-30 px-6 py-4 w-full flex-shrink-0">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center  w-full gap-3">
            <h1 className="text-2xl font-semibold text-[var(--color-on-background)]">
              Loans Executives{" "}
              <span className="text-[var(--color-on-surface)] opacity-70 font-normal">
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
                    className={`relative px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${isActive
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

      {/* Filter Button and Loan Status Tabs */}
      <div className="flex-shrink-0 bg-white border-b border-[var(--color-muted)] border-opacity-30 px-6 py-3 w-full flex flex-row items-center gap-3">
        <FilterButton />

        {/* Loan Status Filter Tabs */}
        <div className="flex items-center ml-5">
          <div className="flex">
            {[
              ...(loanOnboardingEnabled
                ? [{ value: LoanStatusEnum.ONBOARDING, label: "Onboarding" }]
                : []),
              { value: LoanStatusEnum.PENDING, label: "Pending" },
              { value: LoanStatusEnum.REJECTED, label: "Rejected" },
            ].map((option) => {
              const isActive =
                (status || []).filter((s: string) => s === option.value)
                  .length > 0;

              return (
                <button
                  key={option.value || "all"}
                  onClick={() => handleLoanStatusClick(option.value)}
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
        </div>

        {!auth.role.includes(PartnerUserRoleEnum.CREDIT_EXECUTIVE) && (
          <>
            {/* Executive Filter Dropdown */}
            <div className="relative" ref={executiveDropdownRef}>
              <Button
                onClick={handleExecutiveDropdownToggle}
                variant="surface"
                className={`flex items-center gap-2 border rounded-xl shadow-sm transition-all duration-150 ${selectedExecutives.length > 0
                  ? "bg-blue-50 border-blue-300 hover:bg-blue-100"
                  : "bg-white border-gray-300 hover:bg-gray-50"
                  }`}
              >
                <HiChevronDown
                  className={`w-4 h-4 transition-transform ${executiveDropdownOpen ? "rotate-180" : ""
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
                className={`flex items-center gap-2 border rounded-xl shadow-sm transition-all duration-150 ${selectedSupervisors.length > 0
                  ? "bg-purple-50 border-purple-300 hover:bg-purple-100"
                  : "bg-white border-gray-300 hover:bg-gray-50"
                  }`}
              >
                <HiChevronDown
                  className={`w-4 h-4 transition-transform ${supervisorDropdownOpen ? "rotate-180" : ""
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
          </>
        )}

        {/* Salary Filter Dropdown */}
        <div className="relative" ref={salaryDropdownRef}>
          <Button
            onClick={() => setSalaryDropdownOpen(!salaryDropdownOpen)}
            variant="surface"
            className={`flex items-center gap-2 border rounded-xl shadow-sm transition-all duration-150 ${salaryRange.min || salaryRange.max
              ? "bg-indigo-50 border-indigo-300 hover:bg-indigo-100"
              : "bg-white border-gray-300 hover:bg-gray-50"
              }`}
          >
            <HiChevronDown
              className={`w-4 h-4 transition-transform ${salaryDropdownOpen ? "rotate-180" : ""
                }`}
            />
            <span>
              {salaryRange.min || salaryRange.max
                ? `Salary (${salaryRange.min ? `${Conversion.formatCurrency(Number(salaryRange.min))}` : ""}${salaryRange.min && salaryRange.max ? "-" : ""
                }${salaryRange.max ? `${Conversion.formatCurrency(Number(salaryRange.max))}` : ""})`
                : "Salary"}
            </span>
          </Button>

          {salaryDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-3 flex justify-between items-center z-10">
                <span className="text-sm font-semibold text-gray-800">
                  Filter by Salary Range
                </span>
                {(salaryRange.min || salaryRange.max) && (
                  <button
                    onClick={clearSalaryFilter}
                    className="text-xs text-red-600 hover:text-red-800 font-medium"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="p-4 space-y-4">
                {/* Minimum Salary Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Salary (BHD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      BHD
                    </span>
                    <input
                      type="number"
                      value={salaryRange.min}
                      onChange={(e) =>
                        setSalaryRange((prev) => ({
                          ...prev,
                          min: e.target.value,
                        }))
                      }
                      placeholder="0"
                      min="0"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Maximum Salary Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Salary (BHD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      BHD
                    </span>
                    <input
                      type="number"
                      value={salaryRange.max}
                      onChange={(e) =>
                        setSalaryRange((prev) => ({
                          ...prev,
                          max: e.target.value,
                        }))
                      }
                      placeholder="No limit"
                      min="0"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Quick Range Buttons (Optional) */}
                <div className="space-y-2">
                  <div className="text-xs text-gray-500">Quick filters:</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSalaryRange({ min: "0", max: "25000" })}
                      className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      0 - 25k
                    </button>
                    <button
                      onClick={() =>
                        setSalaryRange({ min: "25001", max: "50000" })
                      }
                      className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      25k - 50k
                    </button>
                    <button
                      onClick={() => setSalaryRange({ min: "50001", max: "" })}
                      className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      50k+
                    </button>
                    <button
                      onClick={() => setSalaryRange({ min: "0", max: "0" })}
                      className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      No Salary
                    </button>
                  </div>
                </div>

                {/* Validation */}
                {salaryRange.min &&
                  salaryRange.max &&
                  parseFloat(salaryRange.min) > parseFloat(salaryRange.max) && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      Minimum cannot be greater than maximum
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-row justify-end items-center ml-auto gap-3">
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
              setRuleTypeLoanId("search");
            }}
          >
            Change Rule Type
          </Button>
          <ColumnVisibilityDropdown
            columns={columns}
            visibleColumns={visibleColumns}
            setVisibleColumns={setVisibleColumns}
            compulsoryColumns={["loanId"]}
          />
        </div>
      </div>

      {/* Main Content Area with Filters and Table */}
      <div className="flex flex-1 min-h-0">
        {/* Filters Sidebar - Separate Scrollable */}

        <div className=" flex-shrink-0 border-r border-[var(--color-muted)] border-opacity-30 var(--color-background) bg-white">
          <div className="h-full overflow-y-auto">
            <Filters />
          </div>
        </div>

        {/* Table Container - Separate Scrollable */}
        <div className="flex-1 var(--color-background) min-w-0">
          <div className="h-full overflow-y-auto overflow-x-auto">
            <Table
              columns={columns.filter((col) =>
                visibleColumns.includes(col.key),
              )}
              data={loans}
              loading={isLoading}
              emptyMessage={
                searchTerm ? `No results for "${searchTerm}"` : "No loans found"
              }
              className="border-0 rounded-none"
            />
          </div>
        </div>
      </div>

      {/* Fixed Pagination - Always at Bottom */}
      {totalCount > 0 && (
        <div className="var(--color-background) border-t border-[var(--color-muted)] border-opacity-30 w-full flex-shrink-0">
          <TablePagination
            currentPage={pagination.page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pagination.limit}
            onPageChange={handlePageChange}
            onPageSizeChange={handleLimitChange}
            storageKey="loanCreditExecutiveList"
            centerContent={
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-blue-600 font-medium">
                    Total Loan Amount:
                  </span>
                  <span className="text-lg font-bold text-blue-700">
                    {Conversion.formatCurrency(totalLoanAmount)}
                  </span>
                  <span className="text-sm text-blue-600 font-medium">
                    ({totalCount} Loans)
                  </span>
                </div>
              </div>
            }
          />
        </div>
      )}
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
  );
}
