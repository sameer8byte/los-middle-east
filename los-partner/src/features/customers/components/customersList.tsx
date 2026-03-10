import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  HiOutlineCheckCircle,
  HiChevronDown,
  HiOutlineUser,
} from "react-icons/hi2";
import { FiMail, FiCopy } from "react-icons/fi";
import { useQueryParams } from "../../../hooks/useQueryParams";
import { useToast } from "../../../context/toastContext";
import { Conversion } from "../../../utils/conversion";
import {
  PartnerUserRoleEnum,
  PartnerUserPermissionEnum,
  ReloanStatus,
  getUserStatusDisplay,
  UserStatusEnum,
} from "../../../constant/enum";
import { formatDateWithTime } from "../../../lib/utils";
import {
  Table,
  Pagination as TablePagination,
  SearchInput,
  ErrorMessage,
} from "../../../common/ui/table";
import { JOURNEY_STEPS } from "../../../constant/redirect";
import { getAllCustomers } from "../../../shared/services/api/customer.api";
import {
  getCreditExecutiveUsers,
  getSupervisorUsers,
} from "../../../shared/services/api/partner-user.api";
import { Customer } from "../../../shared/types/customers";
import { Pagination } from "../../../shared/types/pagination";
import { FilterButton } from "../../../common/common/filterButton";
import { Filters } from "./filters";
import { Button } from "../../../common/ui/button";
import { useCustomerNavigator } from "../../../hooks/useViewCustomer";
import { RelocateUser } from "../../common/components/relocateUser";
import { UserReallocationModal } from "../../customerDetails/components/RellocateLoans/users";
import { usePersistedSearch } from "../../../hooks/usePersistedSearch";
import { useAppSelector } from "../../../shared/redux/store";
import { UserStatusReasonsDialog } from "../../customerDetails/components/UserStatusReasonsDialog";
import dayjs from "dayjs";
import { ColumnVisibilityDropdown } from "../../../common/ui/columnVisibilityDropdown";
import {
  selectIsBrand,
  selectIsLoanOnboarding,
} from "../../../shared/redux/slices/brand.slice";
import { AcefoneClickToDialButton } from "../../acefone";

export default function CustomersList() {
  const loanOnboardingEnabled = useAppSelector(selectIsLoanOnboarding);
  const auth = useAppSelector((state) => state.auth.data);
  const brand = useAppSelector((state) => state.brand);
  // QuaLoan
  const isQuaLoan = useAppSelector((state) => selectIsBrand(state, "QuaLoan"));
  const navigate = useNavigate();
  const { search } = useLocation();
  const { handleView } = useCustomerNavigator();
  const { brandId } = useParams();
  const { setQuery, getQuery } = useQueryParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const queryParams = new URLSearchParams(search);
  const queryObject = Object.fromEntries(queryParams.entries());
  const [error, setError] = useState<string | null>(null);

  // Initialize pagination from localStorage to prevent double render
  const [pagination, setPagination] = useState<Pagination>(() => {
    const savedLimit = localStorage.getItem("customersListPageSize");
    const savedPage = localStorage.getItem("customersListPage");
    return {
      page: savedPage ? Number(savedPage) : 1,
      limit: savedLimit ? Number(savedLimit) : 10,
      dateFilter: "",
    };
  });

  const [totalCount, setTotalCount] = useState(0);
  const [isRelocating, setIsRelocating] = useState(false);
  const [selectedCustomerForRelocate, setSelectedCustomerForRelocate] =
    useState<string | null>(null);
  const [isUserReallocationOpen, setIsUserReallocationOpen] = useState(false);
  const [isUserStatusReasonsDialogOpen, setIsUserStatusReasonsDialogOpen] =
    useState(false);
  const [selectedCustomerForStatus, setSelectedCustomerForStatus] =
    useState<Customer | null>(null);

  const { showSuccess } = useToast();
  const [copiedCustomerId, setCopiedCustomerId] = useState<string | null>(null);

  // Get current user's role
  const { data: user } = useAppSelector((state) => state.auth);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Executive filter dropdown state
  const [executiveDropdownOpen, setExecutiveDropdownOpen] = useState(false);
  const [partnerUsers, setPartnerUsers] = useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const [isLoadingPartnerUsers, setIsLoadingPartnerUsers] = useState(false);
  const {
    searchTerm: selectedExecutives,
    setSearchTerm: setSelectedExecutives,
  } = usePersistedSearch<string[]>("customersList_executive", []);
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
  } = usePersistedSearch<string[]>("customersList_supervisor", []);

  const supervisorDropdownRef = useRef<HTMLDivElement>(null);
  // Toggle checkbox state - get from URL params
  const [isToggleChecked, setIsToggleChecked] = useState(() => {
    const toggleParam = getQuery("fetchAllCustomers");
    return toggleParam === "true";
  });
  const {
    searchTerm: selectedLoanFilter,
    setSearchTerm: setSelectedLoanFilter,
  } = usePersistedSearch<">0" | "0" | null>("customersList_loanFilter", null);
  const [loansDropdownOpen, setLoansDropdownOpen] = useState(false);

  const loansDropdownRef = useRef<HTMLDivElement>(null);
  const {
    searchTerm: selectedReloanStatus,
    setSearchTerm: setSelectedReloanStatus,
  } = usePersistedSearch<string | null>("customersList_reloanStatus", null);
  const reloanStatusRef = useRef<HTMLDivElement>(null);
  const [reloanStatusOpen, setReloanStatusOpen] = useState(false);
  const { searchTerm: salaryRange, setSearchTerm: setSalaryRange } =
    usePersistedSearch<{
      min: string;
      max: string;
    }>("customersList_salary", { min: "", max: "" });
  const isInitialMount = useRef(true);
  const [salaryDropdownOpen, setSalaryDropdownOpen] = useState(false);
  const salaryDropdownRef = useRef<HTMLDivElement>(null);
  const [visibleInfo, setVisibleInfo] = useState<{
    [customerId: string]: {
      email: boolean;
      phone: boolean;
    };
  }>({});

  const toggleVisibility = (customerId: string, type: "email" | "phone") => {
    setVisibleInfo((prev) => ({
      ...prev,
      [customerId]: {
        email:
          type === "email"
            ? !prev[customerId]?.email
            : prev[customerId]?.email || false,
        phone:
          type === "phone"
            ? !prev[customerId]?.phone
            : prev[customerId]?.phone || false,
      },
    }));
  };

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
        loansDropdownRef.current &&
        !loansDropdownRef.current.contains(event.target as Node)
      ) {
        setLoansDropdownOpen(false);
      }
      if (
        reloanStatusRef.current &&
        !reloanStatusRef.current.contains(event.target as Node)
      ) {
        setReloanStatusOpen(false);
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

  // Check if user can reallocate customers (either by role or permission)
  const canReallocateUsers = useMemo(() => {
    const hasRequiredRole =
      user?.role?.includes(PartnerUserRoleEnum.SANCTION_HEAD) ||
      user?.role?.includes(PartnerUserRoleEnum.SANCTION_MANAGER) ||
      user?.role?.includes(PartnerUserRoleEnum.SUPER_ADMIN) ||
      user?.role?.includes(PartnerUserRoleEnum.ADMIN);
    const hasRelocatePermission = user?.permissions?.includes(
      PartnerUserPermissionEnum.RELOCATE_USER,
    );

    return hasRequiredRole || hasRelocatePermission;
  }, [user?.role, user?.permissions]);

  // Use persisted search hook
  const { searchTerm, setSearchTerm } = usePersistedSearch(
    "customersListSearch",
  );

  // Sync search term with URL
  useEffect(() => {
    if (searchTerm) {
      setQuery("search", searchTerm);
    } else {
      const currentSearch = getQuery("search");
      if (currentSearch) {
        setSearchTerm(currentSearch);
      }
    }
  }, []);

  // Handle toggle checkbox change with URL params
  const handleToggleChange = (checked: boolean) => {
    setIsToggleChecked(checked);
    if (checked) {
      setQuery("fetchAllCustomers", "true");
    } else {
      setQuery("fetchAllCustomers", "");
    }
  };

  const status = getQuery("status") || "";
  // Persist account status filter[]
  const handleAccountStatusClick = (
    statusValue: string // allow any string, including ""
  ) => {
    const params = new URLSearchParams(location.search);
    if (statusValue) {
      params.set("status", JSON.stringify([statusValue]));
      // Save to sessionStorage
      try {
        sessionStorage.setItem("customersListAccountStatus", statusValue);
      } catch (error) {
        console.error("Error saving account status to sessionStorage:", error);
      }
    } else {
      params.delete("status");
      try {
        sessionStorage.removeItem("customersListAccountStatus");
      } catch (error) {
        console.error(
          "Error removing account status from sessionStorage:",
          error,
        );
      }
    }
    navigate(`?${params.toString()}`, { replace: true });
  };

  // Restore account status on mount
  useEffect(() => {
    if (isInitialMount.current) {
      try {
        const savedStatus = sessionStorage.getItem(
          "customersListAccountStatus",
        );

        if (savedStatus) {
          handleAccountStatusClick(savedStatus);
        } else if (!status) {
          const defaultStatus = isQuaLoan ? "" : UserStatusEnum.PENDING;
          handleAccountStatusClick(defaultStatus as string);
        }
      } catch (error) {
        console.error(
          "Error restoring account status from sessionStorage:",
          error,
        );
      }
      isInitialMount.current = false;
    }
  }, []);

  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoading(true);
      setError(null);
      if (!brandId) {
        setError("Brand ID is required");
        setIsLoading(false);
        return;
      }
      if (!auth?.id) {
        return;
      }
      if (!brand?.id) {
        return;
      }
      try {
        // Build query object with state-based executive filter
        const queryWithExecutiveFilter = {
          ...queryObject,
          ...((selectedExecutives.length > 0 ||
            (auth.role[0] === PartnerUserRoleEnum.CREDIT_EXECUTIVE &&
              !isToggleChecked &&
              brand.brandConfig?.autoAllocationType === "ATTENDANCE")) && {
            allottedPartnerUserIds: JSON.stringify(
              auth.role[0] === PartnerUserRoleEnum.CREDIT_EXECUTIVE &&
                brand.brandConfig?.autoAllocationType === "ATTENDANCE"
                ? [auth.id]
                : selectedExecutives,
            ),
          }),
          ...(selectedSupervisors.length > 0 && {
            allottedSupervisorIds: JSON.stringify(selectedSupervisors),
          }),
          ...(selectedLoanFilter && {
            loanCount: selectedLoanFilter,
          }),
          ...(selectedReloanStatus && {
            userReloanStatus: JSON.stringify([selectedReloanStatus]),
          }),
          ...((salaryRange.min.trim() || salaryRange.max.trim()) && {
            salaryMin: salaryRange.min,
            salaryMax: salaryRange.max,
          }),
        };
        const response = await getAllCustomers(
          brandId,
          {
            page: pagination.page,
            limit: pagination.limit,
            dateFilter: queryObject?.dateFilter,
          },
          queryWithExecutiveFilter,
        );
        // Filter out customers where creditScore is explicitly 0 or "N/A"
        // (Supports if creditScore is either directly on the user or inside userDetails)
        // Also filter out users with an empty name ("")
        // Also filter out users where they have loans but NONE are >= 12156
        const filteredUsers = (response.users || []).filter((user: any) => {
          const score = user.creditScore ?? user.userDetails?.creditScore;
          const hasValidScore = score !== 0 && score !== "0" && score !== "N/A";
          const hasValidName = user.name !== "";

          // Check loans condition
          let hasValidLoan = false; // By default, assume false unless proven otherwise
          if (user.loans && user.loans.length > 0) {
            hasValidLoan = user.loans.some((loan: any) => (loan.amount || 0) >= 12156);
          }

          return hasValidScore && hasValidName && hasValidLoan;
        });

        setCustomers(filteredUsers);
        setTotalCount(response.meta.total);
      } catch (err) {
        setError("Failed to fetch customers");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      if (brandId) fetchCustomers();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [
    brandId,
    pagination,
    JSON.stringify(queryObject),
    selectedExecutives,
    selectedSupervisors,
    isToggleChecked,
    selectedLoanFilter,
    selectedReloanStatus,
    salaryRange.min,
    salaryRange.max,
    auth,
    brand,
  ]);

  const handleOpenUserStatusReasons = (customer: Customer) => {
    setSelectedCustomerForStatus(customer);
    setIsUserStatusReasonsDialogOpen(true);
  };

  const handleUserStatusReasonsSuccess = async () => {
    // Refresh customers list after successful save
    if (!brandId) return;

    try {
      const response = await getAllCustomers(
        brandId,
        {
          page: pagination.page,
          limit: pagination.limit,
          dateFilter: queryObject?.dateFilter,
        },
        queryObject,
      );
      setCustomers(response.users);
      setTotalCount(response.meta.total);
    } catch (err) {
      console.error("Failed to refresh customers:", err);
    }
  };

  const copyCustomerInfo = useCallback(
    (customer: Customer, e: React.MouseEvent) => {
      e.stopPropagation();

      const formattedUserId = customer.formattedUserId || "N/A";
      const name = customer.name || "N/A";
      const email = customer.email || "N/A";
      const phoneNumber = customer.phoneNumber || "N/A";
      const salary = customer.Salary;
      const onboardingStep =
        JOURNEY_STEPS.find((step) => step.id === customer.onboardingStep)
          ?.title || "N/A";
      const loanCount = customer.loanCount || 0;

      const copyText = `📋 Customer Information
━━━━━━━━━━━━━━━━━━━━━━
👤 Name: ${name}
   
🆔 Customer ID: ${customer.id}
🆔 FormattedUserId: ${formattedUserId}
📧 Email: ${email}
📱 Phone: ${phoneNumber}
💰 Salary: ${salary}
━━━━━━━━━━━━━━━━━━━━━━
🔄 Onboarding: ${onboardingStep}
💰 Total Loans: ${loanCount}
═══════════════════════════════
Generated on ${dayjs().format("DD MMM YYYY, hh:mm A")} by ${auth?.email}(${auth.name
        }) -  ${auth?.role || "N/A"} 
---- CUSTOMER DETAILS ----
═══════════════════════════════

`;

      navigator.clipboard
        .writeText(copyText)
        .then(() => {
          setCopiedCustomerId(customer.id);
          showSuccess("Copied!", "Customer information copied to clipboard");
          setTimeout(() => setCopiedCustomerId(null), 2000);
        })
        .catch((err) => {
          console.error("Failed to copy:", err);
        });
    },
    [showSuccess],
  );

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };
  const totalPages = useMemo(() => {
    return Math.ceil(totalCount / pagination.limit);
  }, [totalCount, pagination.limit]);

  const handleLimitChange = (newLimit: number) => {
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
  };

  const clearSearch = useCallback(() => {
    setSearchTerm("");
    setQuery("search", "");
  }, [setSearchTerm, setQuery]);

  // Fetch partner users when dropdown opens
  const fetchPartnerUsers = useCallback(async () => {
    if (!brandId || partnerUsers.length > 0) return;

    setIsLoadingPartnerUsers(true);
    try {
      const response = await getCreditExecutiveUsers(brandId);
      setPartnerUsers(response || []);
    } catch (error) {
      console.error("Error fetching partner users:", error);
    } finally {
      setIsLoadingPartnerUsers(false);
    }
  }, [brandId, partnerUsers.length]);

  // Fetch supervisor users when dropdown opens
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
      fetchPartnerUsers();
    }
    setExecutiveDropdownOpen(!executiveDropdownOpen);
  }, [executiveDropdownOpen, fetchPartnerUsers]);

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

  // Define table columns
  const columns = useMemo(
    () => [
      {
        key: "customerContact",
        label: "Customer",
        render: (_: any, customer: Customer) => {
          const isEmailVisible = visibleInfo[customer.id]?.email || false;
          const isPhoneVisible = visibleInfo[customer.id]?.phone || false;

          return (
            <div className="flex items-start gap-1 p-2 group relative">
              {/* Customer Details */}
              <div className="flex flex-col flex-1 gap-1 text-sm">
                {/* Copy Button */}
                <button
                  onClick={(e) => copyCustomerInfo(customer, e)}
                  className={`absolute -top-1 -right-1 p-1.5 rounded-md hover:bg-[var(--color-background)] opacity- group-hover:opacity-100 transition-all ${copiedCustomerId === customer.id
                    ? "bg-green-500 scale-110 opacity-100"
                    : "bg-[var(--color-surface)]"
                    }`}
                  title="Copy customer information"
                >
                  {copiedCustomerId === customer.id ? (
                    <svg
                      className="h-4 w-4 text-primary"
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
                    <FiCopy className="h-4 w-4 text-[var(--color-on-surface)]" />
                  )}
                </button>

                {/* Name & Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-[var(--color-on-background)] truncate max-w-[180px]">
                    Name: {customer.name || "N/A"}
                  </span>

                  {/* Migration Badge */}
                  {customer.migrationStatus === "MIGRATED" && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-success)] bg-opacity-10 text-[var(--color-on-success)]">
                      Migrated
                    </span>
                  )}
                  {customer.migrationStatus === "PARTIALLY_MIGRATED" && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-secondary)] bg-opacity-10 text-[var(--color-warning)]">
                      Partially Migrated
                    </span>
                  )}

                  {/* Status Badge */}
                  {customer?.status_id && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-muted)] text-[var(--color-on-surface)]">
                      {getUserStatusDisplay(customer.status_id)}
                    </span>
                  )}

                  {/* Reloan Badge */}
                  {customer.userReloans?.length > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-secondary)] bg-opacity-10 text-[var(--color-warning)]">
                      Reloan
                    </span>
                  )}
                </div>
                {/* ID & Formatted ID */}
                <div className="text-xs text-[var(--color-on-surface)] opacity-70 mt-1 flex flex-wrap gap-2 items-center">
                  <span>ID: #{customer.id.split("-")[0].toUpperCase()}</span>
                  <span>{customer.formattedUserId || "N/A"}</span>
                  {customer.googleId && (
                    <span className="text-[var(--color-primary)]">
                      (Google User)
                    </span>
                  )}
                </div>

                {customer.Salary && (
                  <div className="flex items-center gap-2 text-xs text-[var(--color-on-surface)] opacity-70 mt-1">
                    <span>
                      Salary: {customer.Salary ? Conversion.formatCurrency(customer.Salary) : "N/A"}
                    </span>
                    {formatDateWithTime(customer.createdAt)}
                  </div>
                )}

                {/* Contact Info */}
                <div className="flex flex-col gap-1 mt-1 md:text-[12px]">
                  {/* Email with toggle */}
                  <div className="flex items-center justify-between group/email">
                    {customer.email && (
                      <div className="flex items-center gap-2 flex-1">
                        <FiMail className="h-3 w-3 text-[var(--color-on-surface)] opacity-50 flex-shrink-0" />
                        <span className="truncate">
                          {customer.email
                            ? isEmailVisible
                              ? customer.email
                              : customer.email.replace(
                                /(?<=^.{1}).*?(?=@)/g,
                                (match) => "X".repeat(match.length),
                              )
                            : ""}
                        </span>
                      </div>
                    )}
                    {customer.email && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVisibility(customer.id, "email");
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
                    <div className="flex items-center gap-2 flex-1">
                      {customer.phoneNumber && (
                        <AcefoneClickToDialButton userId={customer.id} />
                      )}{" "}
                      <span className="truncate">
                        {customer.phoneNumber
                          ? isPhoneVisible
                            ? customer.phoneNumber
                            : customer.phoneNumber.replace(/\d(?=\d{4})/g, "X")
                          : "N/A"}
                      </span>
                    </div>
                    {customer.phoneNumber && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVisibility(customer.id, "phone");
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
            </div>
          );
        },
      },
      {
        key: "loans",
        label: "Loans",
        render: (_: any, customer: Customer) => {
          const loans = (customer.loans || []).filter((loan) => (loan.amount || 0) >= 12156);
          const loanCount = loans.length;
          const userAllocatedPartnerId = customer.allocatedPartnerUserId;
          const userExecutiveIds = new Set(
            userAllocatedPartnerId ? [userAllocatedPartnerId] : [],
          );

          if (loanCount === 0) {
            return (
              <div className="text-sm text-[var(--color-on-surface)] opacity-70">
                No loans
              </div>
            );
          }

          return (
            <div className="space-y-2 min-w-[240px] max-w-[320px]">
              {/* Loan Count Summary */}
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[var(--color-surface)] text-[var(--color-on-background)] border border-[var(--color-muted)] border-opacity-30">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-on-background)] mr-1.5"></span>
                  Total Loans: {loanCount}
                </div>
              </div>

              {/* Loan Details */}
              <div className="space-y-2">
                {loans.slice(0, 2).map((loan) => {
                  const allottedPartners = loan.allottedPartners || [];
                  const hasDifferentExecutive = allottedPartners.some(
                    (p) => !userExecutiveIds.has(p.partnerUser.id),
                  );

                  return (
                    <div
                      key={loan.id}
                      className={`p-2.5 rounded-lg border transition-all ${hasDifferentExecutive
                        ? "bg-amber-50 border-amber-200 border-opacity-50"
                        : "bg-[var(--color-surface)] border-[var(--color-muted)] border-opacity-30 hover:border-opacity-50"
                        }`}
                    >
                      {/* Loan Header with Different Executive Badge */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[var(--color-on-background)] tracking-wide">
                            {loan.formattedLoanId}
                          </span>
                          {hasDifferentExecutive && (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-widest rounded bg-amber-200 text-amber-800 border border-amber-300 animate-pulse">
                              ⚠️ Different Executive
                            </span>
                          )}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${(() => {
                            switch (loan.status) {
                              case "DISBURSED":
                                return "bg-emerald-100 text-emerald-700";
                              case "APPROVED":
                                return "bg-blue-100 text-blue-700";
                              case "PENDING":
                                return "bg-amber-100 text-amber-700";
                              case "REJECTED":
                                return "bg-red-100 text-red-700";
                              default:
                                return "bg-gray-100 text-gray-700";
                            }
                          })()}`}
                        >
                          {loan.status}
                        </span>
                      </div>

                      {/* Loan Amount & Duration */}
                      <div className="flex items-center gap-3 text-xs mb-2">
                        <span className="font-medium text-[var(--color-on-background)]">
                          {Conversion.formatCurrency(loan.amount)}
                        </span>
                        <span className="text-[var(--color-on-surface)] opacity-60">
                          •
                        </span>
                        <span className="text-[var(--color-on-surface)] opacity-70">
                          {loan.loanDetails?.durationDays
                            ? `${loan.loanDetails.durationDays} days`
                            : "N/A"}
                        </span>
                      </div>

                      {loan.disbursementDate && (
                        <div className="text-[10px] text-[var(--color-on-surface)] opacity-60 mb-2">
                          Disbursed: {formatDateWithTime(loan.disbursementDate)}
                        </div>
                      )}

                      {allottedPartners.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-[var(--color-muted)] border-opacity-30">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <HiOutlineUser className="w-3 h-3 text-[var(--color-on-surface)] opacity-60" />
                            <span className="text-[10px] font-medium text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider">
                              Assigned To
                            </span>
                          </div>

                          {/* 🔹 GRID: 2 COLUMNS */}
                          <div className="grid grid-cols-2 gap-1.5">
                            {allottedPartners.slice(0, 2).map((partner) => {
                              const isDifferentFromUser = !userExecutiveIds.has(
                                partner.partnerUser.id,
                              );

                              return (
                                <div
                                  key={partner.id}
                                  className={`flex items-start gap-1.5 px-2 py-1 rounded-md border transition-all ${isDifferentFromUser
                                    ? "bg-amber-100 border-amber-300 border-opacity-60"
                                    : "bg-[var(--color-background)] border-[var(--color-muted)] border-opacity-20"
                                    }`}
                                  title={`${partner.partnerUser.name || "Unknown"
                                    } - ${partner.partnerUser.email
                                    }\nAllotted: ${formatDateWithTime(
                                      partner.allottedAt,
                                    )}${isDifferentFromUser
                                      ? "\n⚠️ Different from user assignment"
                                      : ""
                                    }`}
                                >
                                  <div className="flex flex-col min-w-0">
                                    <div className="flex items-start gap-1.5">
                                      {/* 🔹 FULL NAME VISIBLE */}
                                      <span
                                        className={`text-[10px] font-medium break-words leading-tight ${isDifferentFromUser
                                          ? "text-amber-900"
                                          : "text-[var(--color-on-background)]"
                                          }`}
                                      >
                                        {partner.partnerUser.name || "Unknown"}
                                      </span>

                                      {partner.partnerUser.reportsToId ? (
                                        <span
                                          className={`px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider rounded shrink-0 ${isDifferentFromUser
                                            ? "bg-amber-300 text-amber-900 border border-amber-400"
                                            : "bg-blue-100 text-blue-700"
                                            }`}
                                        >
                                          Executive
                                        </span>
                                      ) : (
                                        <span
                                          className={`px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider rounded shrink-0 ${isDifferentFromUser
                                            ? "bg-amber-300 text-amber-900 border border-amber-400"
                                            : "bg-purple-100 text-purple-700"
                                            }`}
                                        >
                                          Manager
                                        </span>
                                      )}
                                    </div>

                                    <span
                                      className={`text-[9px] ${isDifferentFromUser
                                        ? "text-amber-800 font-medium"
                                        : "text-[var(--color-on-surface)] opacity-60"
                                        }`}
                                    >
                                      {
                                        formatDateWithTime(
                                          partner.allottedAt,
                                        ).split(",")[0]
                                      }
                                    </span>
                                  </div>
                                </div>
                              );
                            })}

                            {allottedPartners.length > 2 && (
                              <div className="flex items-center justify-center px-2 py-1 rounded-md bg-[var(--color-muted)] bg-opacity-30 text-[10px] text-[var(--color-on-surface)] opacity-70">
                                +{allottedPartners.length - 2} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Show more loans indicator */}
                {loanCount > 2 && (
                  <div className="text-xs text-[var(--color-on-surface)] opacity-70 italic text-center py-1">
                    +{loanCount - 2} more loans
                  </div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        key: "assignedExecutive",
        label: "User Assigned Executive",
        render: (_: any, customer: Customer) => {
          const allocatedPartner = customer.allocatedPartner;

          if (!allocatedPartner) {
            return (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-on-surface)] opacity-50">
                  —
                </span>
                {canReallocateUsers && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCustomerForRelocate(customer.id);
                      setIsRelocating(true);
                    }}
                    className="text-[10px] text-[var(--color-primary)] hover:underline"
                  >
                    Assign
                  </button>
                )}
              </div>
            );
          }

          return (
            <div className="min-w-[200px]">
              <div className="space-y-1 bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {allocatedPartner.name?.charAt(0).toUpperCase() || "P"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-medium text-blue-900 truncate"
                      title={allocatedPartner.name || "Unknown"}
                    >
                      {allocatedPartner.name || "Unknown"}
                    </div>
                    <div
                      className="text-xs text-blue-700 truncate"
                      title={allocatedPartner.email}
                    >
                      {allocatedPartner.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider rounded bg-blue-100 text-blue-700 border border-blue-300">
                    Executive
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-200">
                {canReallocateUsers && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCustomerForRelocate(customer.id);
                      setIsRelocating(true);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Reallocate
                  </Button>
                )}
              </div>
            </div>
          );
        },
      },
      {
        // utm tracking
        key: "utmTracking",
        label: "Marketing Source",
        render: (_: any, customer: Customer) => {
          const hasUtmTracking =
            customer.utmTracking && customer.utmTracking.length > 0;
          const hasLeadMatches =
            customer.leadMatches && customer.leadMatches > 0;

          return (
            <div className="space-y-2 text-sm  text-[var(--color-on-background)]">
              {customer?.brandSubDomain?.subdomain && (
                <div className="border-b border-[var(--color-muted)] border-opacity-30 pb-1">
                  Domain: {customer.brandSubDomain?.subdomain} <br />
                  Source: {customer.brandSubDomain?.marketingSource}
                </div>
              )}
              {/* UTM Tracking Information */}
              {hasUtmTracking && (
                <div className="space-y-2">
                  {customer.utmTracking!.map((utm, index) => (
                    <div
                      key={index}
                      className="border-b border-[var(--color-muted)] border-opacity-30 pb-1 last:border-none"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {utm.utmSource || "—"}
                        </span>
                        <span className="text-[var(--color-on-surface)] opacity-70">
                          |
                        </span>
                        <span>{utm.utmMedium || "—"}</span>
                      </div>
                      {utm.utmCampaign && (
                        <div className="text-xs text-[var(--color-on-surface)] opacity-70">
                          {utm.utmCampaign}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Lead Matches Information */}
              {hasLeadMatches && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[var(--color-surface)] text-[var(--color-on-background)] border border-[var(--color-muted)] border-opacity-30">
                      <span className="w-2 h-2 rounded-full bg-[var(--color-on-background)] mr-1.5"></span>
                      Lead Matches: {customer.leadMatches}
                    </div>
                  </div>
                  {customer.leadMatchesDetails && (
                    <div className="text-xs text-[var(--color-on-surface)] opacity-70 space-y-0.5">
                      {(() => {
                        const userMatches = customer.leadMatchesDetails.filter(
                          (m) => m.hasUserId,
                        ).length;
                        const documentMatches =
                          customer.leadMatchesDetails.filter(
                            (m) => m.hasDocumentId && !m.hasUserId,
                          ).length;
                        const matchFields = [
                          ...new Set(
                            customer.leadMatchesDetails.map(
                              (m) => m.matchField,
                            ),
                          ),
                        ].join(", ");
                        const campaignNames = [
                          ...new Set(
                            customer.leadMatchesDetails
                              .map((m) => m.campaignName)
                              .filter(Boolean),
                          ),
                        ];

                        return (
                          <>
                            {userMatches > 0 && (
                              <div>• {userMatches} User-based matches</div>
                            )}
                            {documentMatches > 0 && (
                              <div>
                                • {documentMatches} Document-only matches
                              </div>
                            )}
                            <div className="truncate" title={matchFields}>
                              Fields: {matchFields}
                            </div>
                            {campaignNames.length > 0 && (
                              <div
                                className="truncate"
                                title={campaignNames.join(", ")}
                              >
                                Campaigns: {campaignNames.join(", ")}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Combined indicator when both exist */}
              {hasUtmTracking && hasLeadMatches && (
                <div className="text-xs text-[var(--color-on-surface)] opacity-60 italic">
                  Multi-source customer
                </div>
              )}
            </div>
          );
        },
      },
      // onboarding status
      {
        key: "onboardingStatus",
        label: "Onboarding Status",
        render: (_: any, customer: Customer) => {
          const currentStep = JOURNEY_STEPS.find(
            (step) => step.id === customer.onboardingStep,
          );

          const upcomingSteps = JOURNEY_STEPS.filter(
            (step) => step.id > customer.onboardingStep,
          ).slice(0, 2);

          const completedSteps = customer.onboardingStep;
          const totalSteps = JOURNEY_STEPS.length;
          const progressPercentage = Math.round(
            (completedSteps / totalSteps) * 100,
          );
          const Icon = currentStep?.icon;

          return (
            <div className="min-w-[180px] max-w-[180px]">
              {/* Progress Header */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {Icon && (
                    <div className="w-6 h-6 rounded-full bg-[var(--color-surface)] border border-[var(--color-muted)] border-opacity-30 flex items-center justify-center">
                      <Icon className="w-3 h-3 text-[var(--color-on-background)]" />
                    </div>
                  )}
                  <div>
                    <div
                      className="font-medium text-[var(--color-on-background)] text-xs whitespace-nowrap max-w-[80px]"
                      title={currentStep?.title}
                    >
                      {currentStep?.title || "Not Started"}
                    </div>
                    <div className="text-xs text-[var(--color-on-surface)] opacity-70">
                      Step {completedSteps} of {totalSteps}
                    </div>
                  </div>
                </div>
                <div className="ml-auto">
                  <div className="text-right">
                    <div className="text-xs font-medium text-[var(--color-on-background)]">
                      {progressPercentage}%
                    </div>
                    <div className="text-xs text-[var(--color-on-surface)] opacity-70">
                      Complete
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative bg-[var(--color-muted)] bg-opacity-30 rounded-full h-1.5 mb-2">
                <div
                  className="absolute top-0 left-0 h-1.5 rounded-full transition-all duration-300 ease-in-out"
                  style={{
                    width: `${progressPercentage}%`,
                    backgroundColor: "var(--secondary, #000000)", // solid black
                  }}
                />
              </div>

              {/* Current Step Description */}
              <div
                className="text-xs text-[var(--color-on-surface)] opacity-80 mb-2 truncate"
                title={currentStep?.description}
              >
                {currentStep?.description || "Onboarding not yet started"}
              </div>

              {/* Next Steps Preview */}
              {upcomingSteps.length > 0 && (
                <div className="border-t border-[var(--color-muted)] border-opacity-30 pt-1.5">
                  <div className="text-xs font-medium text-[var(--color-on-background)] mb-1">
                    Next Steps:
                  </div>
                  <div className="space-y-1">
                    {upcomingSteps.map((step) => {
                      const StepIcon = step.icon;
                      return (
                        <div
                          key={step.id}
                          className="flex items-center gap-1.5"
                        >
                          <div className="w-3 h-3 rounded-full bg-[var(--color-surface)] border border-[var(--color-muted)] border-opacity-50 flex items-center justify-center">
                            <StepIcon className="w-2 h-2 text-[var(--color-on-surface)] opacity-70" />
                          </div>
                          <span
                            className="text-xs text-[var(--color-on-surface)] opacity-70 truncate max-w-[120px]"
                            title={step.title}
                          >
                            {step.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Completion Badge */}
              {completedSteps === totalSteps && (
                <div className="mt-1.5 space-y-1">
                  <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-on-background)] text-white border border-[var(--color-on-background)]">
                    <HiOutlineCheckCircle className="w-3 h-3 mr-1" />
                    Completed
                  </div>
                  {/* Loan Status Badge */}
                  {(customer.loanCount || 0) > 0 ? (
                    <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                      <span className="w-2 h-2 rounded-full bg-green-600 mr-1.5"></span>
                      With Loan ({customer.loanCount})
                    </div>
                  ) : (
                    <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                      <span className="w-2 h-2 rounded-full bg-blue-600 mr-1.5"></span>
                      Without Loan
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        },
      },
      {
        key: "customer_status",
        label: "Customer Status",
        render: (_: any, customer: Customer) => {
          const hasStatusReasons =
            customer?.user_status_brand_reasons &&
            customer.user_status_brand_reasons.length > 0;
          const hasBlockAlert = customer?.userBlockAlert;

          return (
            <div className="space-y-2 min-w-[160px] ">
              {/* Account Status */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--color-on-background)] capitalize">
                    {getUserStatusDisplay(customer?.status_id) || "N/A"}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenUserStatusReasons(customer);
                    }}
                    className="text-xs px-2 py-1 h-6 text-[var(--color-primary)] hover:text-[var(--color-primary-active)]"
                    title="Edit status reasons"
                  >
                    Edit
                  </Button>
                </div>
                {hasBlockAlert && (
                  <div className="flex flex-col gap-1 mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        ---- ⚠️ FD Alert ----
                      </span>
                    </div>
                    <div className="text-xs text-amber-800 mt-1 max-w-[250px]">
                      {customer?.userBlockAlert}
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
                      {(customer?.user_status_brand_reasons || []).map(
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
        key: "actions",
        label: "Actions",
        render: (_: any, customer: Customer) => (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleView(customer.id, brandId!, "customers");
            }}
            variant="outline"
          >
            View
          </Button>
        ),
      },
    ],
    [handleView, copyCustomerInfo, copiedCustomerId, toggleVisibility],
  );

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = sessionStorage.getItem("CustomerTabVisibleColumns");
    return saved ? JSON.parse(saved) : columns.map((col) => col.key);
  });

  useEffect(() => {
    sessionStorage.setItem(
      "CustomerTabVisibleColumns",
      JSON.stringify(visibleColumns),
    );
  }, [visibleColumns]);
  return (
    <div className="h-[calc(100vh-80px)] flex flex-col">
      {/* Error Message */}
      {error && (
        <div className="bg-white px-6 py-2 w-full flex-shrink-0">
          <ErrorMessage message={error} onRetry={() => setError(null)} />
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-[var(--color-muted)] border-opacity-30 px-6 py-4 w-full flex-shrink-0">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-[var(--color-on-background)]">
              Customers
              <span className="text-[var(--color-on-surface)] opacity-70 font-normal">
                ({totalCount})
              </span>
            </h1>
            {auth.role[0] === PartnerUserRoleEnum.CREDIT_EXECUTIVE && (
              <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-md transition-colors">
                <input
                  type="checkbox"
                  checked={isToggleChecked}
                  onChange={(e) => handleToggleChange(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span
                  className="text-sm cursor-pointer"
                  onClick={() => handleToggleChange(!isToggleChecked)}
                >
                  Show All Customers
                </span>
              </div>
            )}
          </div>

          <div className="w-84">
            <SearchInput
              value={searchTerm}
              onChange={(value) => {
                setSearchTerm(value);
                setQuery("search", value);
              }}
              placeholder="Search by Name,ID,Email or Phone"
              onClear={clearSearch}
            />
          </div>
        </div>
      </div>

      {/* === Filter Toolbar === */}
      <div className="flex-shrink-0 bg-white border-b border-[var(--color-muted)] border-opacity-30 px-6 py-3 w-full flex flex-wrap items-center gap-3">
        {/* Left side - Filter controls */}
        <div className="flex flex-wrap items-center gap-3">
          <FilterButton />

          {/* Executive Filter Dropdown */}
          {(auth.role[0] !== "CREDIT_EXECUTIVE" ||
            brand.brandConfig.autoAllocationType === "LOGIN") && (
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

                    {isLoadingPartnerUsers ? (
                      <div className="p-6 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-sm text-gray-500 mt-2">
                          Loading executives...
                        </p>
                      </div>
                    ) : partnerUsers.length > 0 ? (
                      <div className="p-2">
                        {/* Not Assigned Option */}
                        <label className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition">
                          <input
                            type="checkbox"
                            checked={selectedExecutives.includes("NOT_ASSIGNED")}
                            onChange={() => handleExecutiveToggle("NOT_ASSIGNED")}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <HiOutlineUser className="w-4 h-4 text-gray-500" />
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                              Not Assigned
                            </span>
                          </div>
                        </label>

                        {/* Partner Users */}
                        {partnerUsers.map((user) => (
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
                                <span className="text-xs  text-gray-500">
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
            )}

          {/* Supervisor Filter Dropdown */}
          {(auth.role[0] !== "CREDIT_EXECUTIVE" ||
            brand.brandConfig.autoAllocationType === "LOGIN") && (
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
                        {/* Supervisor Users */}
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
            )}
        </div>
        <div className="relative" ref={loansDropdownRef}>
          <Button
            onClick={() => setLoansDropdownOpen(!loansDropdownOpen)}
            variant="surface"
            className={`flex items-center gap-2 border rounded-xl shadow-sm transition-all duration-150 ${selectedLoanFilter
              ? "bg-green-50 border-green-300 hover:bg-green-100"
              : "bg-white border-gray-300 hover:bg-gray-50"
              }`}
          >
            <HiChevronDown
              className={`w-4 h-4 transition-transform ${loansDropdownOpen ? "rotate-180" : ""
                }`}
            />
            <span>
              {selectedLoanFilter === ">0"
                ? "With Loans"
                : selectedLoanFilter === "0"
                  ? "Without Loans"
                  : " Loans"}
            </span>
          </Button>

          {loansDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="p-4 border-b border-gray-200">
                <span className="text-sm font-semibold text-gray-800">
                  Filter by Loan Status
                </span>
              </div>
              <div className="p-3 space-y-2">
                <button
                  onClick={() => {
                    setSelectedLoanFilter(">0");
                    setLoansDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm transition ${selectedLoanFilter === ">0"
                    ? "bg-green-50 font-semibold text-green-800"
                    : ""
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-600"></span>
                    Customers With Loans
                  </div>
                </button>

                <button
                  onClick={() => {
                    setSelectedLoanFilter("0");
                    setLoansDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm transition ${selectedLoanFilter === "0"
                    ? "bg-blue-50 font-semibold text-blue-800"
                    : ""
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    Customers Without Loans
                  </div>
                </button>

                {selectedLoanFilter && (
                  <button
                    onClick={() => {
                      setSelectedLoanFilter(null);
                      setLoansDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-red-50 rounded text-xs text-red-600 font-medium border-t border-gray-200 mt-2 pt-2"
                  >
                    Clear Loan Filter
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="relative" ref={reloanStatusRef}>
          <Button
            onClick={() => setReloanStatusOpen(!reloanStatusOpen)}
            variant="surface"
            className={`
      flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all shadow-sm
      ${selectedReloanStatus
                ? " font-semibold"
                : "bg-white border-gray-300 hover:bg-gray-50 "
              }
    `}
          >
            <HiChevronDown
              className={`w-4 h-4 transition-transform ${reloanStatusOpen ? "rotate-180" : ""
                }`}
            />
            <span>Reloan Status</span>
          </Button>

          {reloanStatusOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="p-3 space-y-1">
                <button
                  onClick={() => {
                    setSelectedReloanStatus(null);
                    setReloanStatusOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition ${!selectedReloanStatus ? "bg-gray-100" : "hover:bg-gray-50"
                    }`}
                >
                  All Reloan Status
                </button>
                {Object.values(ReloanStatus).map((status) => {
                  const isActive = selectedReloanStatus === status;

                  const colorMap: Record<
                    string,
                    { activeBg: string; text: string; dot: string }
                  > = {
                    PENDING: {
                      activeBg: "bg-amber-100",
                      text: "text-amber-800",
                      dot: "bg-amber-600",
                    },
                    APPROVED: {
                      activeBg: "bg-emerald-100",
                      text: "text-emerald-800",
                      dot: "bg-emerald-600",
                    },
                    REJECTED: {
                      activeBg: "bg-rose-100",
                      text: "text-rose-800",
                      dot: "bg-rose-600",
                    },
                  };

                  const colors = colorMap[status];

                  return (
                    <button
                      key={status}
                      onClick={() => {
                        setSelectedReloanStatus(status);
                        setReloanStatusOpen(false);
                      }}
                      className={`
        w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2.5 transition
        ${isActive ? `${colors.activeBg} ${colors.text} font-bold` : ""}
      `}
                    >
                      <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                      {status}
                    </button>
                  );
                })}

                {/* Clear */}
                {selectedReloanStatus && (
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <button
                      onClick={() => {
                        setSelectedReloanStatus(null);
                        setReloanStatusOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-red-600 text-sm font-medium hover:bg-red-50 rounded-lg transition"
                    >
                      Clear Filter
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
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
                ? `Salary (${salaryRange.min ? `BHD ${salaryRange.min}` : ""}${salaryRange.min && salaryRange.max ? "-" : ""
                }${salaryRange.max ? `BHD ${salaryRange.max}` : ""})`
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
                    onClick={() => {
                      setSalaryRange({ min: "", max: "" });
                    }}
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
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-[10px] font-bold">
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
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-[10px] font-bold">
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
        {/* Right side - View Options */}
        <div className="flex flex-row justify-end items-center ml-auto gap-3">
          {/* Bulk User Reallocation Button */}
          {canReallocateUsers && !loanOnboardingEnabled && (
            <Button
              onClick={() => setIsUserReallocationOpen(true)}
              variant="primary"
            >
              <HiOutlineUser className="w-4 h-4" />
              User Reallocation
            </Button>
          )}

          <div className="relative" ref={dropdownRef}>
            <ColumnVisibilityDropdown
              columns={columns}
              visibleColumns={visibleColumns}
              setVisibleColumns={setVisibleColumns}
              compulsoryColumns={["Customer"]}
            />
          </div>
        </div>
      </div>

      {/* === user Status Filter Bar === */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6">
          <div className="flex items-center">
            <div className="flex space-x-0 border-b border-gray-200">
              {(() => {
                // Check if user is CREDIT_EXECUTIVE and domain is https://lm.salary4sure.com
                const isCreditExecutive =
                  auth.role[0] === PartnerUserRoleEnum.CREDIT_EXECUTIVE;
                const currentDomain = window.location.origin;
                const isTargetDomain =
                  currentDomain === "https://lm.salary4sure.com" ||
                  currentDomain === "http://localhost:5174"; // Include localhost for testing
                const shouldHideRejectedAndAll =
                  isCreditExecutive && isTargetDomain;
                const statusOptions = [
                  // Show "All" first only if isQuaLoan is true
                  ...(isQuaLoan && !shouldHideRejectedAndAll
                    ? [{ label: "All", value: "", count: totalCount }]
                    : []),

                  { value: "1", label: "Pending" }, // PENDING
                  { value: "3", label: "Hold" }, // ON_HOLD
                  { value: "4", label: "Suspended" }, // SUSPENDED

                  ...(shouldHideRejectedAndAll
                    ? []
                    : [{ value: "5", label: "Rejected" }]), // BLOCKED

                  { value: "2", label: "Active" }, // ACTIVE

                  // Show "All" last if isQuaLoan is false and not shouldHideRejectedAndAll
                  ...(!isQuaLoan && !shouldHideRejectedAndAll
                    ? [{ label: "All", value: "", count: totalCount }]
                    : []),
                ];

                return statusOptions;
              })().map((option) => {
                const isAll = option.value === "";
                const isActive = isAll
                  ? status === ""
                  : status.includes(option.value);

                return (
                  <button
                    key={option.value || "all"}
                    onClick={() => handleAccountStatusClick(option.value)}
                    className={`
                      relative px-6 py-3 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap
                      ${isActive
                        ? "border-blue-500 text-blue-600 bg-blue-50"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span>{option.label}</span>
                    </div>

                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-500 rounded-t-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab Actions */}
            <div className="ml-auto flex items-center gap-3 py-3">
              {status && (
                <button
                  onClick={() => handleAccountStatusClick("")}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                  title="Clear filter"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Clear
                </button>
              )}

              <div className="text-sm text-gray-500">
                {customers.length} of {totalCount} customers
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className=" flex-shrink-0 border-r border-[var(--color-muted)] border-opacity-30 bg-white">
          <div className="h-full overflow-y-auto">
            <Filters />
          </div>
        </div>
        <div className="flex-1 bg-white min-w-0">
          <div className="h-full overflow-y-auto overflow-x-auto">
            <Table
              columns={columns.filter(
                (col) =>
                  visibleColumns.includes(col.key) &&
                  !(col.key === "assignedExecutive" && loanOnboardingEnabled),
              )}
              data={customers}
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
        <div className="bg-white border-t  border-[var(--color-muted)] border-opacity-30 w-full flex-shrink-0">
          <TablePagination
            currentPage={pagination.page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pagination.limit}
            onPageChange={handlePageChange}
            onPageSizeChange={handleLimitChange}
            storageKey="customersList"
          />
        </div>
      )}

      {/* Relocate User Modal */}
      <RelocateUser
        isOpen={isRelocating}
        setIsOpen={setIsRelocating}
        selectedCustomerId={selectedCustomerForRelocate || undefined}
      />

      {/* User Reallocation Modal */}
      <UserReallocationModal
        isOpen={isUserReallocationOpen}
        onClose={() => setIsUserReallocationOpen(false)}
        userId={null}
        brandId={brandId!}
        onSuccess={async () => {
          setIsUserReallocationOpen(false);
          // Refresh customers list after successful allocation
          if (!brandId) return;

          try {
            const queryWithExecutiveFilter = {
              ...queryObject,
              ...((selectedExecutives.length > 0 ||
                (auth.role[0] === PartnerUserRoleEnum.CREDIT_EXECUTIVE &&
                  !isToggleChecked &&
                  brand.brandConfig?.autoAllocationType === "ATTENDANCE")) && {
                allottedPartnerUserIds: JSON.stringify(
                  auth.role[0] === PartnerUserRoleEnum.CREDIT_EXECUTIVE &&
                    brand.brandConfig?.autoAllocationType === "ATTENDANCE"
                    ? [auth.id]
                    : selectedExecutives,
                ),
              }),
              ...(selectedSupervisors.length > 0 && {
                allottedSupervisorIds: JSON.stringify(selectedSupervisors),
              }),
              ...((salaryRange.min || salaryRange.max) && {
                salaryMin: salaryRange.min,
                salaryMax: salaryRange.max,
              }),
            };

            const response = await getAllCustomers(
              brandId,
              {
                page: pagination.page,
                limit: pagination.limit,
                dateFilter: queryObject?.dateFilter,
              },
              queryWithExecutiveFilter,
            );
            setCustomers(response.users);
            setTotalCount(response.meta.total);
          } catch (err) {
            console.error(
              "Failed to refresh customers after bulk allocation:",
              err,
            );
          }
        }}
      />

      {/* User Status Reasons Dialog */}
      <UserStatusReasonsDialog
        isOpen={isUserStatusReasonsDialogOpen}
        onClose={() => {
          setIsUserStatusReasonsDialogOpen(false);
          setSelectedCustomerForStatus(null);
        }}
        brandId={brandId!}
        customerId={selectedCustomerForStatus?.id || ""}
        customer={selectedCustomerForStatus}
        onSuccess={handleUserStatusReasonsSuccess}
      />
    </div>
  );
}
