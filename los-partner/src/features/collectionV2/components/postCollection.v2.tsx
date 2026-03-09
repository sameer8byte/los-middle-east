import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { FiCopy, FiMoreVertical, FiFileText } from "react-icons/fi";
import { FaMapMarkerAlt } from "react-icons/fa";
import { HiChevronDown, HiOutlineUser } from "react-icons/hi2";
import { formatDate, formatDateWithTime } from "../../../lib/utils";
import {
  Pagination as TablePagination,
  SearchInput,
  ErrorMessage,
} from "../../../common/ui/table";
import { postCollection } from "../../../shared/services/api/collection.api";
import { Pagination } from "../../../shared/types/pagination";
import { useToast } from "../../../context/toastContext";
import { usePersistedSearch } from "../../../hooks/usePersistedSearch";
import { Button } from "../../../common/ui/button";
import { useCustomerNavigator } from "../../../hooks/useViewCustomer";
import { RemarksCommentModal } from "../../../common/ui/RemarksCommentModal";
import { NonGetwayPayment } from "../../loanCollection/components/nonGetwayPayment";
import { ClosingWriteOffType } from "../../loanCollection/components/closingWriteOff";
import { ClosingSettlementType } from "../../loanCollection/components/closingSettlement";
import { useQueryParams } from "../../../hooks/useQueryParams";
import { AcefoneClickToDialButton } from "../../acefone";
import { LoanStatusBadge } from "../../../common/ui/LoanStatusBadge";
import {
  addLoanComment,
  getLoanComments,
  LoanComment,
} from "../../../shared/services/api/loanComments.api";
import {
  updateFieldVisit,
  getBulkFieldVisits,
} from "../../../shared/services/api/loan.api";
import {
  getCollectionExecutiveUsers,
  getCollectionSupervisorUsers,
} from "../../../shared/services/api/partner-user.api";
import { useAppSelector } from "../../../shared/redux/store";
import { CollectionReallocationModal } from "../../customerDetails/components/RellocateLoans/collection";

interface CollectionLoan {
  id: string;
  userId: string;
  brandId: string;
  status: string;
  name: string;
  email: string;
  phoneNumber: string;
  formattedLoanId: string | null;
  amount: number;
  applicationDate: string;
  approvalDate: string | null;
  disbursementDate: string | null;
  createdAt: string;
  durationDays: number | null;
  dueDate: string | null;
  allocatedPartners?: Array<{
    id: string;
    partnerUserId: string;
    partnerName: string;
    partnerEmail: string;
    allocatedAt: string;
    remarks?: string;
    amount?: number;
  }>;
}

const ActionMenu = ({
  loan,
  onAddRemarks,
  onAllocatePartner,
  onFieldVisit,
  isFieldVisitEnabled,
  fieldVisitData,
  updatingFieldVisit,
}: {
  loan: CollectionLoan;
  onAddRemarks: (id: string) => void;
  onAllocatePartner: (id: string) => void;
  onFieldVisit: (id: string, status: boolean) => void;
  isFieldVisitEnabled: boolean;
  fieldVisitData: any;
  updatingFieldVisit: string | null;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`px-2 transition-colors ${
          isOpen
            ? "bg-blue-50 border-blue-200 text-blue-600"
            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
        }`}
      >
        <FiMoreVertical size={16} />
      </Button>
      {isOpen && (
        <div className="absolute right-full top-0 mr-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-2">
          <div className="flex flex-col gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddRemarks(loan.id);
                setIsOpen(false);
              }}
              className="flex items-center w-full text-left px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-transparent rounded-md transition-all"
            >
              <FiFileText className="mr-2 h-3.5 w-3.5" />
              Add Remarks
            </button>

            {isFieldVisitEnabled && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const requiresFieldVisit =
                    fieldVisitData[loan.id]?.requireFieldVisit || false;
                  onFieldVisit(loan.id, requiresFieldVisit);
                  setIsOpen(false);
                }}
                disabled={updatingFieldVisit === loan.id}
                className="flex items-center w-full text-left px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-transparent rounded-md transition-all"
              >
                <FaMapMarkerAlt
                  className={`mr-2 h-3.5 w-3.5 ${
                    fieldVisitData[loan.id]?.requireFieldVisit ? "text-red-600" : "text-blue-600"
                  }`}
                />
                {fieldVisitData[loan.id]?.requireFieldVisit
                  ? "Remove Field Visit"
                  : "Add Field Visit"}
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onAllocatePartner(loan.id);
                setIsOpen(false);
              }}
              className="flex items-center w-full text-left px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-transparent rounded-md transition-all"
            >
              Allocate Partner
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export function PostCollection() {
  const brandConfig = useAppSelector((state) => state.brand.brandConfig);
  const auth = useAppSelector((state) => state.auth.data);

  const { brandId } = useParams();
  const { showSuccess, showError } = useToast();
  const { handleView } = useCustomerNavigator();
  const { getQuery } = useQueryParams();
  const writeOffLoanId = getQuery("writeOffLoanId");
  const settlementLoanId = getQuery("settlementLoanId");

  const [collections, setCollections] = useState<CollectionLoan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [nonGetwayPaymentLoanId, setNonGetwayPaymentLoanId] = useState<
    string | null
  >(null);
  const [nonGetwayPaymentUserId, setNonGetwayPaymentUserId] = useState<
    string | null
  >(null);
  const [refresh, setRefresh] = useState(false);

  // Check if current domain is crm.zeptofinance.com
  const isCrmZeptofinanceDomain = typeof globalThis !== "undefined" && 
    globalThis.window?.location?.hostname === "crm.zeptofinance.com";

  // Check if user is a COLLECTION_EXECUTIVE (only for crm.zeptofinance.com domain)
  const isCollectionExecutive = isCrmZeptofinanceDomain && auth?.role?.some(
    (r) =>
      r === "COLLECTION_EXECUTIVE" 
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
  const [selectedCollectionExecutives, setSelectedCollectionExecutives] =
    useState<string[]>(() => {
      // If user is COLLECTION_EXECUTIVE, pre-select their own ID
      return isCollectionExecutive && auth?.id ? [auth.id] : [];
    });
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
  const [selectedCollectionSupervisors, setSelectedCollectionSupervisors] =
    useState<string[]>([]);
  const collectionSupervisorDropdownRef = useRef<HTMLDivElement>(null);

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [, setLoadingComments] = useState<{
    [loanId: string]: boolean;
  }>({});

  // Field visit state
  const [updatingFieldVisit, setUpdatingFieldVisit] = useState<string | null>(
    null,
  );
  const [collectionReallocationLoanId, setCollectionReallocationLoanId] =
    useState<string | null>(null);
  const [fieldVisitData, setFieldVisitData] = useState<
    Record<
      string,
      {
        id: string;
        loanId: string;
        requireFieldVisit: boolean;
        createdAt: string;
        updatedAt: string;
      }
    >
  >({});

  const { searchTerm, setSearchTerm, clearSearch } = usePersistedSearch(
    "collectionV2AllCollection_search",
    "",
  );

  // Initialize pagination from localStorage
  const [pagination, setPagination] = useState<Pagination>(() => {
    const savedLimit = localStorage.getItem(
      "collectionV2AllCollectionPageSize",
    );
    const savedPage = localStorage.getItem("collectionV2AllCollectionPage");
    return {
      page: savedPage ? Number(savedPage) : 1,
      limit: savedLimit ? Number(savedLimit) : 10,
      dateFilter: "",
    };
  });

  // Date filter state
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Memoized calculations
  const totalPages = useMemo(() => {
    return Math.ceil(totalCount / pagination.limit);
  }, [totalCount, pagination.limit]);

  // Fetch collections
  const fetchCollections = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    if (!brandId) {
      setError("Brand ID is required");
      setIsLoading(false);
      return;
    }

    try {
      const dateFilterArray = startDate || endDate ? [startDate, endDate] : [];
      const response = await postCollection(
        brandId,
        {
          page: pagination.page,
          limit: pagination.limit,
          dateFilter: JSON.stringify(dateFilterArray),
        },
        {
          search: searchTerm || "",
          ...(selectedCollectionExecutives.length > 0 && {
            assignedCollectionExecutive: JSON.stringify(
              selectedCollectionExecutives,
            ),
          }),
          ...(selectedCollectionSupervisors.length > 0 && {
            assignedCollectionSupervisor: JSON.stringify(
              selectedCollectionSupervisors,
            ),
          }),
        },
      );

      setCollections(response.loans || []);
      setTotalCount(response.meta?.total || 0);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch collections",
      );
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [
    brandId,
    pagination,
    startDate,
    endDate,
    searchTerm,
    selectedCollectionExecutives,
    selectedCollectionSupervisors,
  ]);

  // Fetch collections when dependencies change
  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  // Handle pagination change
  const handlePaginationChange = useCallback(
    (newPage: number, newLimit: number) => {
      setPagination({ ...pagination, page: newPage, limit: newLimit });
      localStorage.setItem("collectionV2AllCollectionPage", newPage.toString());
      localStorage.setItem(
        "collectionV2AllCollectionPageSize",
        newLimit.toString(),
      );
    },
    [pagination],
  );

  // Copy to clipboard handler
  const copyToClipboard = useCallback(
    (text: string, type: string) => {
      navigator.clipboard.writeText(text);
      showSuccess(`${type} copied to clipboard`);
    },
    [showSuccess],
  );

  // Date filter handlers
  const handleApplyDateFilter = useCallback(() => {
    setPagination({ ...pagination, page: 1 });
  }, [pagination]);

  const handleClearDateFilter = useCallback(() => {
    setStartDate("");
    setEndDate("");
    setPagination({ ...pagination, page: 1 });
  }, [pagination]);

  // Fetch Collection Executive Users
  const fetchCollectionExecutiveUsersData = useCallback(async () => {
    if (!brandId) return;
    setIsLoadingCollectionExecutiveUsers(true);
    try {
      const users = await getCollectionExecutiveUsers(brandId);
      setCollectionExecutiveUsers(users || []);
    } catch (error) {
      console.error("Error fetching collection executives:", error);
      setCollectionExecutiveUsers([]);
    } finally {
      setIsLoadingCollectionExecutiveUsers(false);
    }
  }, [brandId]);

  // Fetch Collection Supervisor Users
  const fetchCollectionSupervisorUsersData = useCallback(async () => {
    if (!brandId) return;
    setIsLoadingCollectionSupervisorUsers(true);
    try {
      const users = await getCollectionSupervisorUsers(brandId);
      setCollectionSupervisorUsers(users || []);
    } catch (error) {
      console.error("Error fetching collection supervisors:", error);
      setCollectionSupervisorUsers([]);
    } finally {
      setIsLoadingCollectionSupervisorUsers(false);
    }
  }, [brandId]);

  // Handle Collection Executive dropdown open
  const handleCollectionExecutiveDropdownOpen = useCallback(async () => {
    setCollectionExecutiveDropdownOpen(true);
    if (collectionExecutiveUsers.length === 0) {
      await fetchCollectionExecutiveUsersData();
    }
  }, [collectionExecutiveUsers.length, fetchCollectionExecutiveUsersData]);

  // Handle Collection Supervisor dropdown open
  const handleCollectionSupervisorDropdownOpen = useCallback(async () => {
    setCollectionSupervisorDropdownOpen(true);
    if (collectionSupervisorUsers.length === 0) {
      await fetchCollectionSupervisorUsersData();
    }
  }, [collectionSupervisorUsers.length, fetchCollectionSupervisorUsersData]);

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
    [brandId, showError],
  );

  // Fetch all field visits for loans
  const fetchAllFieldVisits = useCallback(
    async (loanIds: string[]) => {
      if (!brandId || loanIds.length === 0) return;

      try {
        const response = await getBulkFieldVisits(brandId, loanIds);
        const fieldVisitMap: Record<
          string,
          {
            id: string;
            loanId: string;
            requireFieldVisit: boolean;
            createdAt: string;
            updatedAt: string;
          }
        > = {};

        response.data?.forEach((fv: any) => {
          fieldVisitMap[fv.loanId] = fv;
        });

        setFieldVisitData(fieldVisitMap);
      } catch (error) {
        console.error("Error fetching bulk field visits:", error);
      }
    },
    [brandId],
  );

  // Handle field visit toggle
  const handleFieldVisitToggle = useCallback(
    async (loanId: string, currentStatus: boolean) => {
      if (!brandId) return;

      setUpdatingFieldVisit(loanId);

      try {
        await updateFieldVisit(brandId, loanId, !currentStatus);

        // Update field visit data
        setFieldVisitData((prev) => ({
          ...prev,
          [loanId]: {
            ...prev[loanId],
            requireFieldVisit: !currentStatus,
          },
        }));

        // Update loans array to include field visit
        setCollections((prevLoans) =>
          prevLoans.map((loan) => {
            if (loan.id === loanId) {
              return {
                ...loan,
                fieldVisits: [
                  {
                    id: fieldVisitData[loanId]?.id || "",
                    loanId,
                    requireFieldVisit: !currentStatus,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                ],
              };
            }
            return loan;
          }),
        );

        showSuccess(
          currentStatus ? "Field visit removed" : "Field visit added",
          currentStatus
            ? "Field visit requirement has been removed"
            : "Field visit requirement has been added",
        );
      } catch (error) {
        console.error("Error updating field visit:", error);
        showError("Failed to update field visit", "Please try again later");
      } finally {
        setUpdatingFieldVisit(null);
      }
    },
    [brandId, showSuccess, showError, fieldVisitData],
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
      // Refresh collections to get updated data
      setRefresh(!refresh);
    } catch (error) {
      console.error("Failed to add comment:", error);
      showError("Failed to add comment", "Please try again later.");
    } finally {
      setCommentModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Fetch collections when dependencies change
  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  // Fetch field visits when collections are loaded and brand config is ready
  useEffect(() => {
    if (brandConfig?.field_visit && collections.length > 0) {
      const loanIds = collections.map((loan) => loan.id);
      fetchAllFieldVisits(loanIds);
    }
  }, [brandConfig?.field_visit, collections, fetchAllFieldVisits]);

  const renderCollectionRow = (item: CollectionLoan) => (
    <tr
      key={item.id}
      className="group border-b border-[var(--color-on-muted)] hover:bg-[var(--color-background)] transition-colors duration-200 align-top"
      style={{
        borderBottomWidth: "1px",
        borderColor: "var(--color-background)",
      }}
    >
      {/* 1. APPLICANT DETAILS */}
      <td className="px-2 py-4 w-[22%]">
        <div className="flex items-start gap-3">
          <div className="flex flex-col min-w-0">
            {/* Main Text: On Surface (Dark) */}
            <span className="text-sm font-bold text-[var(--color-on-surface)] truncate">
              {item.name}
            </span>

            {/* Loan ID Badge: Moved from Loan Details */}
            <div className="flex items-center gap-1.5 group/loanId mt-1">
              <span
                className="bg-[var(--color-background)] text-[var(--color-on-surface)] text-[10px] font-mono px-2.5 py-1 rounded-[var(--radius-brand)] border border-[var(--color-on-muted)] font-semibold"
                style={{ borderColor: "rgba(0,0,0,0.08)" }}
              >
                {item.formattedLoanId}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(item.formattedLoanId || "", "Loan ID");
                }}
                className="invisible group-hover/loanId:visible text-[var(--color-on-muted)] hover:text-[var(--color-primary)] transition-colors"
                title="Copy Loan ID"
              >
                <FiCopy size={12} />
              </button>
            </div>

            {/* Subtext: Muted */}
            <div className="flex flex-col gap-0.5 mt-1">
              <div className="flex items-center gap-1.5 text-xs text-[var(--color-on-muted)] group/copy">
                <span className="truncate max-w-[140px]">{item.email}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(item.email, "Email");
                  }}
                  className="invisible group-hover/copy:visible text-[var(--color-on-muted)] hover:text-[var(--color-primary)]"
                >
                  <FiCopy size={10} />
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--color-on-muted)] group/copy">
                {item.id && (
                  <AcefoneClickToDialButton
                    userId={item.userId}
                    loanId={item.id}
                  />
                )}{" "}
                <span>+91XXXXXXXXXX</span>
              </div>
            </div>
          </div>
        </div>
      </td>

      {/* 2. LOAN SNAPSHOT */}
      <td className="px-2 py-4 w-[16%]">
        <div className="flex flex-col items-start gap-2">
          {/* Amount: Primary Brand Color or High Contrast */}
          <span className="text-base font-bold text-[var(--color-on-surface)] tracking-tight">
            BHD{(item.amount || 0).toLocaleString("en-IN")}
          </span>

          {/* Status Badge */}
          <div className="flex items-center gap-1">
            <span
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-full`}
            >
              <LoanStatusBadge status={item.status} />
            </span>
          </div>
        </div>
      </td>

      {/* 3. TIMELINE CARD */}
      <td className="px-2 py-3 w-[32%]">
        {/* Card Container: Distinct from row background */}
        <div className="bg-[var(--color-background)] rounded-[var(--radius-brand)] p-3 text-xs">
          {/* Row A: Active Lifecycle */}
          <div
            className="flex items-center justify-between mb-2 pb-2 border-b border-[var(--color-on-muted)]"
            style={{ borderColor: "rgba(0,0,0,0.05)" }}
          >
            <div className="flex flex-col">
              <span className="text-[10px] text-[var(--color-on-muted)] uppercase font-semibold">
                Disbursed
              </span>
              <span className="font-medium mt-0.5 text-black">
                {item.disbursementDate
                  ? formatDate(item.disbursementDate)
                  : "-"}
              </span>
            </div>

            {/* Visual Arrow / Duration */}
            <div className="flex flex-col items-center px-4 flex-1">
              {/* Duration Badge: Brand Light Background + Brand Text */}
              <span>{item.durationDays} Days</span>
              {/* Connector Line */}
              <div className="w-full h-[1px] bg-[var(--color-on-muted)] opacity-30 relative"></div>
            </div>

            <div className="flex flex-col text-right">
              <span className="text-[10px] text-[var(--color-on-muted)] uppercase font-semibold">
                Due Date
              </span>

              {/* Status Logic: Success vs Error */}
              <span
                className={`font-bold mt-0.5 ${
                  item.dueDate && new Date(item.dueDate) < new Date()
                    ? "text-[var(--color-error)]"
                    : "text-[var(--color-success)]"
                }`}
              >
                {item.dueDate ? formatDate(item.dueDate) : "-"}
              </span>
            </div>
          </div>

          {/* Row B: History Meta Data (Low priority) */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="block text-[var(--color-on-muted)] opacity-70 text-[10px]">
                Applied
              </span>
              <span className="text-[var(--color-on-muted)]">
                {item.applicationDate ? formatDate(item.applicationDate) : "-"}
              </span>
            </div>
            <div className="text-center">
              <span className="block text-[var(--color-on-muted)] opacity-70 text-[10px]">
                Approved
              </span>
              <span className="text-[var(--color-on-muted)]">
                {item.approvalDate ? formatDate(item.approvalDate) : "-"}
              </span>
            </div>
            <div className="text-right">
              <span className="block text-[var(--color-on-muted)] opacity-70 text-[10px]">
                Created
              </span>
              <span className="text-[var(--color-on-muted)]">
                {formatDateWithTime(item.createdAt).split(",")[0]}
              </span>
            </div>
          </div>
        </div>
      </td>

      {/* 4. ALLOCATED PARTNERS */}
      <td className="px-4 py-4 w-[15%]">
        <div className="flex flex-col gap-2">
          {item.allocatedPartners && item.allocatedPartners.length > 0 ? (
            item.allocatedPartners.map((partner) => (
              <div
                key={partner.id}
                className="bg-blue-50 rounded-lg p-2 border border-blue-200"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                    {partner.partnerName?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">
                      {partner.partnerName || "N/A"}
                    </p>
                    <p className="text-[10px] text-gray-600 truncate">
                      {partner.partnerEmail || "N/A"}
                    </p>
                  </div>
                </div>
                {partner.allocatedAt && (
                  <p className="text-[10px] text-gray-500">
                    {formatDate(partner.allocatedAt)}
                  </p>
                )}
                {partner.remarks && (
                  <p className="text-[10px] text-gray-600 mt-1 italic">
                    "{partner.remarks}"
                  </p>
                )}
              </div>
            ))
          ) : (
            <span className="text-xs text-gray-500">Not allocated</span>
          )}
        </div>
      </td>

      {/* 5. ACTIONS */}
      <td className="px-2 py-4 w-[15%] text-right align-middle">
        <div className="relative flex justify-end items-center gap-1 flex-wrap">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setNonGetwayPaymentLoanId(item.id);
              setNonGetwayPaymentUserId(item.userId);
            }}
            size="sm"
          >
            Collect Payment{" "}
          </Button>

          {/* View */}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleView(item.userId, brandId!, "collections");
            }}
            variant="outline"
            size="sm"
          >
            View
          </Button>

          <ActionMenu
            loan={item}
            onAddRemarks={openCommentModal}
            onAllocatePartner={setCollectionReallocationLoanId}
            onFieldVisit={handleFieldVisitToggle}
            isFieldVisitEnabled={!!brandConfig?.field_visit}
            fieldVisitData={fieldVisitData}
            updatingFieldVisit={updatingFieldVisit}
          />
        </div>
      </td>
    </tr>
  );

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
      <CollectionReallocationModal
        isOpen={!!collectionReallocationLoanId}
        onClose={() => setCollectionReallocationLoanId(null)}
        loanId={collectionReallocationLoanId}
        brandId={brandId || ""}
        onSuccess={() => {
          setCollectionReallocationLoanId(null);
          setRefresh(!refresh);
        }}
      />
      {commentModal.isOpen && (
        <RemarksCommentModal
          isOpen={commentModal.isOpen}
          loanId={commentModal.loanId || ""}
          onClose={closeCommentModal}
          loans={loanComments[commentModal.loanId || ""] || []}
          currentComment={commentModal.currentComment}
          isLoading={commentModal.isLoading}
          onCommentChange={(comment) =>
            setCommentModal((prev) => ({ ...prev, currentComment: comment }))
          }
          onSubmit={handleCommentSubmit}
        />
      )}
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold">Post Collections</h1>
          <SearchInput
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={setSearchTerm}
            onClear={clearSearch}
          />

          {/* Date Filter */}
          <div
            className="flex items-end gap-3 p-4 bg-[var(--color-background)] rounded-lg border border-[var(--color-on-muted)]"
            style={{ borderColor: "rgba(0,0,0,0.05)" }}
          >
            <div className="flex-1 flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label
                  htmlFor="startDate"
                  className="text-xs font-semibold text-[var(--color-on-muted)] uppercase"
                >
                  Start Date
                </label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-[var(--color-on-muted)] rounded-md text-sm"
                  style={{ borderColor: "rgba(0,0,0,0.1)" }}
                />
              </div>

              <div className="flex flex-col gap-1 flex-1">
                <label
                  htmlFor="endDate"
                  className="text-xs font-semibold text-[var(--color-on-muted)] uppercase"
                >
                  End Date
                </label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-[var(--color-on-muted)] rounded-md text-sm"
                  style={{ borderColor: "rgba(0,0,0,0.1)" }}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleApplyDateFilter}
                size="sm"
                disabled={!startDate && !endDate}
              >
                Apply Filter
              </Button>

              {(startDate || endDate) && (
                <Button
                  onClick={handleClearDateFilter}
                  variant="outline"
                  size="sm"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Collection Executive and Supervisor Filters */}
          <div className="flex items-center gap-3">
            {/* Collection Executive Filter Dropdown - Hidden for COLLECTION_EXECUTIVE role */}
            {!isCollectionExecutive && (
              <div className="relative" ref={collectionExecutiveDropdownRef}>
                <Button
                  onClick={() => {
                    if (collectionExecutiveDropdownOpen) {
                      setCollectionExecutiveDropdownOpen(false);
                    } else {
                      handleCollectionExecutiveDropdownOpen();
                    }
                  }}
                  variant="surface"
                  className={`flex items-center gap-2 border rounded-xl shadow-sm transition-all duration-150 ${
                    selectedCollectionExecutives.length > 0
                      ? "bg-green-50 border-green-300 hover:bg-green-100"
                      : "bg-white border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <HiChevronDown
                    className={`w-4 h-4 transition-transform ${
                      collectionExecutiveDropdownOpen ? "rotate-180" : ""
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
                          onClick={() => setSelectedCollectionExecutives([])}
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
                            htmlFor={`exec-${user.id}`}
                            className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition"
                          >
                            <input
                              id={`exec-${user.id}`}
                              type="checkbox"
                              checked={selectedCollectionExecutives.includes(
                                user.id,
                              )}
                              onChange={() => {
                                setSelectedCollectionExecutives((prev) => {
                                  return prev.includes(user.id)
                                    ? prev.filter((id) => id !== user.id)
                                    : [...prev, user.id];
                                });
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                              aria-label={`Select ${user.name}`}
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
                  onClick={() => {
                    if (collectionSupervisorDropdownOpen) {
                      setCollectionSupervisorDropdownOpen(false);
                    } else {
                      handleCollectionSupervisorDropdownOpen();
                    }
                  }}
                  variant="surface"
                  className={`flex items-center gap-2 border rounded-xl shadow-sm transition-all duration-150 ${
                    selectedCollectionSupervisors.length > 0
                      ? "bg-teal-50 border-teal-300 hover:bg-teal-100"
                      : "bg-white border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <HiChevronDown
                    className={`w-4 h-4 transition-transform ${
                      collectionSupervisorDropdownOpen ? "rotate-180" : ""
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
                          onClick={() => setSelectedCollectionSupervisors([])}
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
                            htmlFor={`sup-${user.id}`}
                            className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition"
                          >
                            <input
                              id={`sup-${user.id}`}
                              type="checkbox"
                              checked={selectedCollectionSupervisors.includes(
                                user.id,
                              )}
                              onChange={() => {
                                setSelectedCollectionSupervisors((prev) => {
                                  return prev.includes(user.id)
                                    ? prev.filter((id) => id !== user.id)
                                    : [...prev, user.id];
                                });
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                              aria-label={`Select ${user.name}`}
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
                <Button
              onClick={() => setCollectionReallocationLoanId("manual")}
              variant="outline"
              size="sm"
            >
              Allocate Partner
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && <ErrorMessage message={error} />}

        {/* Loading State */}
        {isLoading && (
          <div className="overflow-hidden border border-gray-200 rounded-xl shadow-sm bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-2 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[22%]"
                    >
                      Applicant Details
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[16%]"
                    >
                      Loan Details
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[32%]"
                    >
                      all Dates
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[32%]"
                    >
                      all Dates
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[15%]"
                    >
                      Allocated Partners
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-[15%]"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr
                      key={i}
                      className="border-b border-[var(--color-on-muted)]"
                    >
                      {/* Column 1: Applicant Details */}
                      <td className="px-2 py-4 w-[22%]">
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col min-w-0 w-full">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                            <div className="h-3 bg-gray-100 rounded w-full mb-1 animate-pulse"></div>
                            <div className="h-3 bg-gray-100 rounded w-5/6 animate-pulse"></div>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Loan Details */}
                      <td className="px-2 py-4 w-[16%]">
                        <div className="flex flex-col gap-2">
                          <div className="h-5 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                          <div className="h-6 bg-gray-100 rounded w-3/4 animate-pulse"></div>
                          <div className="h-6 bg-gray-100 rounded-full w-20 animate-pulse"></div>
                        </div>
                      </td>

                      {/* Column 3: Timeline Card */}
                      <td className="px-2 py-3 w-[32%]">
                        <div className="bg-gray-50 rounded p-3 space-y-3">
                          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                            <div className="flex flex-col gap-2 w-1/3">
                              <div className="h-2 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                              <div className="h-3 bg-gray-100 rounded w-full animate-pulse"></div>
                            </div>
                            <div className="flex flex-col items-center px-4 flex-1 gap-1">
                              <div className="h-4 bg-blue-100 rounded-full w-20 animate-pulse"></div>
                              <div className="h-px bg-gray-200 w-full animate-pulse"></div>
                            </div>
                            <div className="flex flex-col gap-2 w-1/3">
                              <div className="h-2 bg-gray-200 rounded w-3/4 animate-pulse ml-auto"></div>
                              <div className="h-3 bg-gray-100 rounded w-full animate-pulse"></div>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {[1, 2, 3].map((j) => (
                              <div key={j} className="space-y-1">
                                <div className="h-2 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                                <div className="h-3 bg-gray-100 rounded w-full animate-pulse"></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* Column 4: Allocated Partners */}
                      <td className="px-4 py-4 w-[15%]">
                        <div className="flex flex-col gap-2">
                          {[1, 2].map((j) => (
                            <div key={j} className="bg-blue-50 rounded-lg p-2 space-y-1">
                              <div className="h-4 bg-blue-200 rounded w-3/4 animate-pulse"></div>
                              <div className="h-3 bg-blue-100 rounded w-full animate-pulse"></div>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Column 5: Actions */}
                      <td className="px-2 py-4 w-[15%]">
                        <div className="flex justify-end gap-1">
                          {[1, 2, 3].map((j) => (
                            <div
                              key={j}
                              className="h-8 w-8 bg-gray-100 rounded animate-pulse"
                            ></div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && collections.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No collections found</p>
          </div>
        )}

        {/* Table */}
        {!isLoading && collections.length > 0 && (
          <>
            <div className="overflow-hidden border border-gray-200 rounded-xl shadow-sm bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {/* Column 1: Matches Name + Email + Phone */}
                      <th
                        scope="col"
                        className="px-2 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[22%]"
                      >
                        Applicant Details
                      </th>

                      {/* Column 2: Matches Amount + Loan ID + Purpose */}
                      <th
                        scope="col"
                        className="px-2 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[16%]"
                      >
                        Loan Details
                      </th>

                      {/* Column 3: Matches The Timeline Card (6 dates combined) */}
                      <th
                        scope="col"
                        className="px-2 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[32%]"
                      >
                        all Dates
                      </th>

                      {/* Column 4: Allocated Partners */}
                      <th
                        scope="col"
                        className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[15%]"
                      >
                        Allocated Partners
                      </th>

                      {/* Column 5: Matches The Action Buttons */}
                      <th
                        scope="col"
                        className="px-2 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-[15%]"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-gray-100">
                    {collections.length > 0 ? (
                      collections.map(renderCollectionRow)
                    ) : (
                      <tr>
                        <td className="px-6 py-10 text-center text-gray-400 text-sm">
                          No loan records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <TablePagination
                currentPage={pagination.page}
                totalPages={totalPages}
                pageSize={pagination.limit}
                totalCount={totalCount}
                onPageChange={(page) =>
                  handlePaginationChange(page, pagination.limit)
                }
                onPageSizeChange={(size) => handlePaginationChange(1, size)}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}