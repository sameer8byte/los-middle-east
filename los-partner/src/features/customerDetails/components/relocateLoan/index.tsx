import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

import {
  HiOutlineSearch,
  HiOutlineRefresh,
  HiOutlineCheckCircle,
  HiOutlineArrowRight,
  HiOutlineClipboardList,
} from "react-icons/hi";
import { HiOutlineExclamationTriangle } from "react-icons/hi2";
import Dialog from "../../../../common/dialog";
import { toast } from "react-toastify";
import {
  PartnerTabsEnum,
} from "../../../../constant/enum";
import {
  getAllLoans,
  relocateLoan,
} from "../../../../shared/services/api/loan.api";
import { getCreditExecutiveUsers } from "../../../../shared/services/api/partner-user.api";
import { Loan } from "../../../../shared/types/loan";
import { Button } from "../../../../common/ui/button";
import { LoanStatusBadge } from "../../../../common/ui/LoanStatusBadge";

interface CreditExecutive {
  id: string;
  name: string;
  email: string;
  reportsToId: {
    id: string;
    name: string;
    email: string;
  };
}

// Skeleton Components
const LoanCardSkeleton = () => (
  <div className="p-4 border border-[var(--color-muted)] border-opacity-30 rounded-xl animate-pulse">
    <div className="flex items-center space-x-4">
      <div className="w-4 h-4 bg-[var(--color-muted)] bg-opacity-30 rounded"></div>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <div className="h-3 bg-[var(--color-muted)] bg-opacity-30 rounded w-16"></div>
          <div className="h-4 bg-[var(--color-muted)] bg-opacity-30 rounded w-24"></div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-[var(--color-muted)] bg-opacity-30 rounded w-16"></div>
          <div className="h-4 bg-[var(--color-muted)] bg-opacity-30 rounded w-20"></div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-[var(--color-muted)] bg-opacity-30 rounded w-12"></div>
          <div className="h-5 bg-[var(--color-muted)] bg-opacity-30 rounded w-16"></div>
        </div>
      </div>
    </div>
  </div>
);

const ExecutiveSelectSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm border border-[var(--color-muted)] border-opacity-20 p-6 animate-pulse">
    <div className="h-6 bg-[var(--color-muted)] bg-opacity-30 rounded w-48 mb-4"></div>
    <div className="h-12 bg-[var(--color-muted)] bg-opacity-30 rounded-lg w-full"></div>
  </div>
);

export function RelocateLoan({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}) {
  const pathname = window.location.pathname;
  const { brandId } = useParams<{ brandId: string }>();

  // State management
  const [creditExecutives, setCreditExecutives] = useState<CreditExecutive[]>(
    []
  );
  const [loans, setLoans] = useState<Loan[]>([]);
  const [filteredLoans, setFilteredLoans] = useState<Loan[]>([]);
  const [selectedLoans, setSelectedLoans] = useState<Set<string>>(new Set());
  const [selectedExecutive, setSelectedExecutive] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "allocated" | "unallocated"
  >("all");
  const [refresh] = useState(false);

  // Loading and error states
  const [isLoadingLoans, setIsLoadingLoans] = useState(false);
  const [isLoadingExecutives, setIsLoadingExecutives] = useState(false);
  const [isRelocating, setIsRelocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch credit executives
  useEffect(() => {
    if (!brandId) {
      setError("Brand ID is required to fetch credit executives.");
      return;
    }

    const fetchCreditExecutives = async () => {
      setIsLoadingExecutives(true);
      try {
        const response = await getCreditExecutiveUsers(brandId);
        setCreditExecutives(response);
      } catch (error) {
        console.error("Error fetching credit executives:", error);
        setError("Failed to fetch credit executives");
      } finally {
        setIsLoadingExecutives(false);
      }
    };

    fetchCreditExecutives();
  }, [brandId]);

  // Fetch loans with debounced search
  useEffect(() => {
    const fetchLoans = async () => {
      if (!brandId) {
        setError("Brand ID is required");
        return;
      }

      setIsLoadingLoans(true);
      setError(null);

      try {
        const response = await getAllLoans(
          brandId,
          PartnerTabsEnum.LOANS,
          {
            page: 1,
            limit: 200,
            dateFilter: "",
          },
          {
            status: '["PENDING","CREDIT_EXECUTIVE_APPROVED"]',
            search: searchTerm || "",
          }
        );
        const filteredLoansByPath = response.loans.filter((loan: Loan) =>
          pathname.includes("sanction-manager") ? loan.amount <= 50000 : true
        );
        setLoans(filteredLoansByPath);
      } catch (err) {
        setError(
          err instanceof Error ? err.message :
          "Failed to fetch loans");
        console.error(err);
      } finally {
        setIsLoadingLoans(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      if (brandId) fetchLoans();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [brandId, searchTerm, refresh]);

  // Filter loans based on active filter
  useEffect(() => {
    let filtered = [...loans];

    switch (activeFilter) {
      case "allocated":
        filtered = loans.filter(
          (loan) => loan.allottedPartners && loan.allottedPartners.length > 0
        );
        break;
      case "unallocated":
        filtered = loans.filter(
          (loan) => !loan.allottedPartners || loan.allottedPartners.length === 0
        );
        break;
      case "all":
      default:
        filtered = loans;
        break;
    }

    setFilteredLoans(filtered);
    // Clear selected loans when filter changes
    setSelectedLoans(new Set());
  }, [loans, activeFilter]);

  // Handle loan selection
  const handleLoanSelection = (loanId: string, checked: boolean) => {
    const newSelected = new Set(selectedLoans);
    if (checked) {
      newSelected.add(loanId);
    } else {
      newSelected.delete(loanId);
    }
    setSelectedLoans(newSelected);
  };

  // Handle select all loans
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLoans(new Set(filteredLoans.map((loan) => loan.id)));
    } else {
      setSelectedLoans(new Set());
    }
  };

  // Handle loan relocation
  const handleRelocateLoans = async () => {
    if (selectedLoans.size === 0) {
      setError("Please select at least one loan to relocate");
      return;
    }

    if (!selectedExecutive) {
      setError("Please select a credit executive");
      return;
    }

    if (!brandId) {
      setError("Brand ID is required");
      return;
    }

    setIsRelocating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const relocatePromises = Array.from(selectedLoans).map((loanId) =>
        relocateLoan(brandId, loanId, selectedExecutive)
      );

      await Promise.all(relocatePromises);

      setSuccessMessage(
        `Successfully relocated ${selectedLoans.size} loan${
          selectedLoans.size > 1 ? "s" : ""
        }`
      );
      toast.success(
        `Successfully relocated ${selectedLoans.size} loan${
          selectedLoans.size > 1 ? "s" : ""
        }`
      );
      setSelectedLoans(new Set());
    } catch (error) {
      console.error("Error relocating loans:", error);
      setError("Failed to relocate loans. Please try again.");
      toast.error("Failed to relocate loans. Please try again.");
      setSuccessMessage(null);
    } finally {
      setIsRelocating(false);
    }
  };

  // Clear messages after timeout
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  return (
    <div>
      <Dialog
        title="Relocate Loans"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      >
        <div className="flex flex-col gap-6 text-[var(--color-on-background)] bg-white">
          {/* Search Bar */}
          <div className="relative">
            <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-on-surface)] opacity-50 w-5 h-5" />
            <input
              type="text"
              placeholder="Search loans by ID, customer name, or amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-[var(--color-muted)] border-opacity-50 bg-[var(--color-background)] rounded-xl focus:ring-2 focus:ring-[#EA5E18] focus:border-[#EA5E18] text-[var(--color-on-background)] placeholder-gray-500 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-on-surface)] opacity-50 hover:text-[var(--color-on-surface)] hover:opacity-70"
              >
                ×
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex space-x-1 p-1 bg-[var(--color-surface)] rounded-xl border border-[var(--color-muted)] border-opacity-30">
            {[
              { key: "all", label: "All", count: loans.length },
              {
                key: "allocated",
                label: "Allocated",
                count: loans.filter(
                  (loan) =>
                    loan.allottedPartners && loan.allottedPartners.length > 0
                ).length,
              },
              {
                key: "unallocated",
                label: "Unallocated",
                count: loans.filter(
                  (loan) =>
                    !loan.allottedPartners || loan.allottedPartners.length === 0
                ).length,
              },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() =>
                  setActiveFilter(
                    tab.key as "all" | "allocated" | "unallocated"
                  )
                }
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeFilter === tab.key
                    ? "bg-[#EA5E18] text-white shadow-sm"
                    : "text-[var(--color-on-surface)] hover:bg-[var(--color-background)] hover:text-[var(--color-on-background)]"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    activeFilter === tab.key
                      ? "bg-white/20 text-white"
                      : "bg-[var(--color-muted)] bg-opacity-30 text-[var(--color-on-surface)] opacity-70"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Success/Error */}
          {successMessage && (
            <div className="flex items-center gap-3 p-4 border border-[var(--color-success)] border-opacity-30 bg-[var(--color-success)] bg-opacity-10 rounded-xl shadow-sm">
              <HiOutlineCheckCircle className="w-5 h-5 text-[var(--color-on-success)]" />
              <p className="text-[var(--color-on-success)] font-medium">
                {successMessage}
              </p>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-3 p-4 border  border-[var(--color-error)] border-opacity-30 bg-[var(--color-error)] bg-opacity-10 rounded-xl shadow-sm">
              <HiOutlineExclamationTriangle className="w-5 h-5 text-[var(--color-on-error)]" />
              <p className="text-[var(--color-on-error)] font-medium">
                {error}
              </p>
            </div>
          )}

          {/* Credit Executive Select */}
          {isLoadingExecutives ? (
            <ExecutiveSelectSkeleton />
          ) : (
            <select
              value={selectedExecutive}
              onChange={(e) => setSelectedExecutive(e.target.value)}
              className="w-full p-3 border border-[var(--color-muted)] border-opacity-50 rounded-xl bg-[var(--color-background)] focus:ring-2 focus:ring-[#EA5E18] text-[var(--color-on-background)] transition"
            >
              <option value="">Choose a credit executive</option>
              {creditExecutives.map((exec) => (
                <option key={exec.id} value={exec.id}>
                  {exec.name} ({exec.email})
                </option>
              ))}
            </select>
          )}

          {/* Loans List */}
          <div className="bg-white rounded-xl border border-[var(--color-muted)] border-opacity-30 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-[var(--color-background)] border-b border-[var(--color-muted)] border-opacity-30">
              <div className="flex items-center gap-3">
                <HiOutlineClipboardList className="w-5 h-5 text-[#EA5E18]" />
                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-on-background)]">
                    Pending Loans
                  </h3>
                  <p className="text-sm text-[var(--color-on-surface)] opacity-70">
                    {isLoadingLoans
                      ? "Loading..."
                      : `${filteredLoans.length} loans available`}
                  </p>
                </div>
              </div>

              {filteredLoans.length > 0 && !isLoadingLoans && (
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-on-surface)] opacity-80">
                    <input
                      type="checkbox"
                      checked={selectedLoans.size === filteredLoans.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-5 h-5 text-[#EA5E18] border-[var(--color-muted)] border-opacity-50 rounded focus:ring-[#EA5E18]"
                    />
                    Select All
                  </label>
                  <span className="px-2 py-1 bg-[#EA5E18]/10 text-[#EA5E18] rounded-full text-xs font-medium">
                    {selectedLoans.size} selected
                  </span>
                </div>
              )}
            </div>

            <div className="p-6 space-y-4 max-h-[250px] overflow-y-auto">
              {isLoadingLoans ? (
                [...Array(5)].map((_: any, i) => <LoanCardSkeleton key={i} />)
              ) : filteredLoans.length > 0 ? (
                filteredLoans.map((loan) => (
                  <div
                    key={loan.id}
                    onClick={() =>
                      handleLoanSelection(loan.id, !selectedLoans.has(loan.id))
                    }
                    className={`p-4 border rounded-xl cursor-pointer hover:shadow-md transition ${
                      selectedLoans.has(loan.id)
                        ? "border-[#EA5E18] bg-[#EA5E18]/5"
                        : "border-[var(--color-muted)] border-opacity-30 hover:border-[var(--color-muted)] border-opacity-50"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={selectedLoans.has(loan.id)}
                        onChange={(e) =>
                          handleLoanSelection(loan.id, e.target.checked)
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="w-5 h-5 text-[#EA5E18] border-[var(--color-muted)] border-opacity-50 rounded focus:ring-[#EA5E18]"
                      />
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-[var(--color-on-surface)] opacity-70">
                            Loan ID
                          </p>
                          <p className="font-mono font-semibold text-[var(--color-on-background)]">
                            {loan.formattedLoanId || "N/A"}
                          </p>
                          <p className="text-xs text-[var(--color-on-surface)] opacity-70">
                            <LoanStatusBadge status={loan.status} />
                          </p>
                          <p>
                            {loan.user?.userDetails.firstName || "N/A"}
                            {loan.user?.userDetails.middleName
                              ? ` ${loan.user.userDetails.middleName}`
                              : ""}
                            {loan.user?.userDetails.lastName
                              ? ` ${loan.user.userDetails.lastName}`
                              : ""}
                          </p>
                          <p>{loan.user.phoneNumber}</p>
                          {loan.user.email && (
                            <p className="lowercase">{loan.user.email}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-[var(--color-on-surface)] opacity-70">
                            Amount
                          </p>
                          <p className="font-semibold text-[var(--color-on-background)]">
                            BHD{loan.amount?.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[var(--color-on-surface)] opacity-70">
                            Assigned To
                          </p>
                          <p className="text-[var(--color-on-background)]">
                            {loan.allottedPartners
                              .map(
                                (p) =>
                                  `${p.partnerUser.reportsToId ? "SE" : "SM"} ${
                                    p.partnerUser.name
                                  } (${p.partnerUser.email})`
                              )
                              .join(", ") || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="mx-auto mb-4 w-16 h-16 flex items-center justify-center bg-[var(--color-surface)] rounded-full">
                    <HiOutlineClipboardList className="w-8 h-8 text-[var(--color-on-surface)] opacity-50" />
                  </div>
                  <p className="text-[var(--color-on-surface)] opacity-70 text-lg font-medium">
                    {activeFilter === "all"
                      ? "No pending loans found"
                      : activeFilter === "allocated"
                      ? "No allocated loans found"
                      : "No unallocated loans found"}
                  </p>
                  <p className="text-[var(--color-on-surface)] opacity-50 text-sm mb-4">
                    {loans.length > 0
                      ? "Try switching to a different filter or adjusting your search"
                      : "Try adjusting your search"}
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center gap-2 px-4 py-2 text-[#EA5E18] hover:text-orange-600 text-sm font-medium"
                  >
                    <HiOutlineRefresh className="w-4 h-4" />
                    Refresh
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          {selectedLoans.size > 0 && (
            <div className="flex items-center justify-between bg-white rounded-xl border border-[var(--color-muted)] border-opacity-30 shadow-sm p-6">
              <div>
                <p className="text-sm text-[var(--color-on-background)] font-medium">
                  Ready to relocate {selectedLoans.size} loan
                  {selectedLoans.size > 1 ? "s" : ""}
                </p>
                {selectedExecutive && (
                  <p className="text-sm text-[var(--color-on-surface)] opacity-70">
                    Target:{" "}
                    <span className="font-medium text-[#EA5E18]">
                      {
                        creditExecutives.find(
                          (exec) => exec.id === selectedExecutive
                        )?.name
                      }
                    </span>
                  </p>
                )}
              </div>

              <Button
                variant="primary"
                onClick={handleRelocateLoans}
                disabled={isRelocating || !selectedExecutive}
                loading={isRelocating}
              >
                <HiOutlineArrowRight className="w-4 h-4" />
                Relocate Loans
              </Button>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}
