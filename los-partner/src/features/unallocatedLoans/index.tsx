import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { HiOutlineUser } from "react-icons/hi";
import { CgSpinner } from "react-icons/cg";
import { Button } from "../../common/ui/button";
import { SearchInput } from "../../common/ui/table";
import { useToast } from "../../context/toastContext";
import {
  relocateLoan,
  getUnallocatedLoans,
} from "../../shared/services/api/loan.api";
import { getCreditExecutiveUsers } from "../../shared/services/api/partner-user.api";
import { Loan } from "../../shared/types/loan";
import { PartnerUser } from "../../shared/types/partnerUser";
import { FiCopy } from "react-icons/fi";
import { HiOutlineChevronDown } from "react-icons/hi2";
import Dialog from "../../common/dialog";
import { Conversion } from "../../utils/conversion";

const UnallocatedLoansComponent = () => {
  const { brandId } = useParams<{ brandId: string }>();
  const [manualLoanId, setManualLoanId] = useState("");
  const [loadingLoan, setLoadingLoan] = useState(false);
  const [loanError, setLoanError] = useState<string>("");
  const [displayedLoans, setDisplayedLoans] = useState<Loan[]>([]);
  const [selectedLoans, setSelectedLoans] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState(() => {
    const savedLimit = localStorage.getItem("unallocatedLoansPageSize");
    const savedPage = localStorage.getItem("unallocatedLoansPage");
    return {
      page: savedPage ? Number(savedPage) : 1,
      limit: savedLimit ? Number(savedLimit) : 10,
    };
  });
  const [totalCount, setTotalCount] = useState(0);

  // Modal states
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [selectedPartnerUserId, setSelectedPartnerUserId] =
    useState<string>("");
  const [partnerSearchQuery, setPartnerSearchQuery] = useState<string>("");
  const [showPartnerDropdown, setShowPartnerDropdown] = useState(false);
  const [isAllocating, setIsAllocating] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [partnerUsers, setPartnerUsers] = useState<PartnerUser[]>([]);
  const [isLoadingPartners, setIsLoadingPartners] = useState(false);

  const { showSuccess, showError } = useToast();
  // Ref to track current search to prevent race conditions
  const currentSearchRef = useRef<string | null>(null);

  // Fetch all pending loans by default
  const fetchUnallocatedLoans = useCallback(async () => {
    if (!brandId) return;

    try {
      setLoadingLoan(true);
      const response = await getUnallocatedLoans(brandId, {
        page: pagination.page,
        limit: pagination.limit,
        search: currentSearchRef.current?.trim() || undefined,
      });

      const loans = response.loans || [];
      setDisplayedLoans(loans);
      setTotalCount(response.meta?.total || 0);

      // Do NOT auto-select loans - let user select manually
      setSelectedLoans(new Set());
    } catch (error) {
      console.error("Error fetching pending loans:", error);
      setDisplayedLoans([]);
      showError("Error", "Failed to load loans. Please try again.");
    } finally {
      setLoadingLoan(false);
    }
  }, [brandId, pagination, showError]);

  // Copy loan ID to clipboard
  const copyToClipboard = useCallback(
    (customerId: string) => {
      navigator.clipboard.writeText(customerId);
      showSuccess("Loan ID copied to clipboard");
    },
    [showSuccess]
  );
  // Auto-search with debounce when loan ID is entered
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (brandId) {
        fetchUnallocatedLoans();
      }
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [manualLoanId, brandId, fetchUnallocatedLoans]);

  // Handle loan selection (max 5 selections)
  const handleLoanSelection = (loanId: string, checked: boolean) => {
    const newSelected = new Set(selectedLoans);
    if (checked) {
      if (newSelected.size < 5) {
        newSelected.add(loanId);
      } else {
        showSuccess("Maximum 5 loans can be selected at a time");
      }
    } else {
      newSelected.delete(loanId);
    }
    setSelectedLoans(newSelected);
  };

  // Handle select all loans (max 5)
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select only up to 5 loans
      const loansToSelect = displayedLoans.slice(0, 5);
      setSelectedLoans(new Set(loansToSelect.map((l) => l.id)));
      if (displayedLoans.length > 5) {
        showSuccess("Selected first 5 loans (maximum limit)");
      }
    } else {
      setSelectedLoans(new Set());
    }
  };



  // Fetch partner users for allocation modal
  const fetchPartnerUsers = useCallback(async () => {
    if (!brandId) return;

    try {
      setIsLoadingPartners(true);
      const creditExecutives = await getCreditExecutiveUsers(brandId);
      setPartnerUsers(creditExecutives || []);
    } catch (error) {
      console.error("Error fetching partner users:", error);
      setModalError("Failed to fetch partner users");
    } finally {
      setIsLoadingPartners(false);
    }
  }, [brandId]);

  // Render partner options helper
  const renderPartnerOptions = () => {
    if (isLoadingPartners) {
      return (
        <div className="p-4 text-center text-sm text-[var(--color-on-surface)] opacity-70">
          Loading partners...
        </div>
      );
    }

    if (partnerUsers.length === 0) {
      return (
        <div className="p-4 text-center text-sm text-[var(--color-on-surface)] opacity-70">
          No partners available
        </div>
      );
    }

    const filteredPartners = partnerUsers.filter((partner) =>
      `${partner.name} ${partner.email}`
        .toLowerCase()
        .includes(partnerSearchQuery.toLowerCase())
    );

    if (filteredPartners.length === 0) {
      return (
        <div className="p-4 text-center text-sm text-[var(--color-on-surface)] opacity-70">
          No matching partners found
        </div>
      );
    }

    return (
      <div>
        {filteredPartners.map((partner) => {
          const role = partner.reportsTo?.id ? "Executive" : "Manager/Head";
          return (
            <button
              key={partner.id}
              onClick={() => {
                setSelectedPartnerUserId(partner.id);
                setShowPartnerDropdown(false);
                setPartnerSearchQuery("");
                setModalError(null);
              }}
              className={`w-full text-left px-4 py-3 border-b border-[var(--color-muted)] border-opacity-10 hover:bg-[var(--color-muted)] hover:bg-opacity-10 transition ${selectedPartnerUserId === partner.id
                  ? "bg-blue-50 border-l-4 border-l-blue-500"
                  : ""
                }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm text-[var(--color-on-background)]">
                    {partner.name}
                  </p>
                  <p className="text-xs text-[var(--color-on-surface)] opacity-70 mt-0.5">
                    {partner.email}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 bg-[var(--color-muted)] bg-opacity-20 rounded-full text-[var(--color-on-surface)] opacity-70 whitespace-nowrap ml-2">
                  {role}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  // Handle allocate button click - opens modal
  const handleAllocateClick = useCallback(() => {
    if (selectedLoans.size === 0) {
      showSuccess("Please select at least one loan");
      return;
    }
    // Reset modal states
    setSelectedPartnerUserId("");
    setPartnerSearchQuery("");
    setShowPartnerDropdown(false);
    setModalError(null);
    // Fetch partner users
    fetchPartnerUsers();
    // Show allocation modal
    setShowAllocationModal(true);
  }, [selectedLoans, showSuccess, fetchPartnerUsers]);

  // Initialize data on mount
  useEffect(() => {
    if (brandId) {
      fetchUnallocatedLoans();
    }
  }, [brandId, fetchUnallocatedLoans]);

  // Add this useEffect after currentSearchRef declaration
  useEffect(() => {
    currentSearchRef.current = manualLoanId;
  }, [manualLoanId]);

  // Handle pagination change
  const handlePaginationChange = useCallback(
    (newPage: number, newLimit: number) => {
      setPagination({ page: newPage, limit: newLimit });
      localStorage.setItem("unallocatedLoansPage", newPage.toString());
      localStorage.setItem("unallocatedLoansPageSize", newLimit.toString());
    },
    []
  );



  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Unallocated Loans</h1>
        <p className="text-sm text-gray-600 mt-1">
          Allocate pending loans to credit executives
        </p>
      </div>
      <div>
        <div className="space-y-6">
          <div className="mb-6">

            {/* Enhanced Search Bar */}
            <SearchInput
              placeholder="Search loans by ID, customer name..."
              value={manualLoanId}
              onChange={setManualLoanId}
              onClear={() => {
                setManualLoanId("");
                setLoanError("");
              }}
            />

            {loadingLoan && (
              <div className="flex items-center justify-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <CgSpinner className="animate-spin text-blue-600 mr-2" />
                <span className="text-sm text-blue-700 font-medium">
                  Loading loan details...
                </span>
              </div>
            )}

            {loanError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 font-medium">
                  {loanError}
                </p>
              </div>
            )}

            {/* Display Searched Loans */}
            {displayedLoans.length > 0 ? (
              <div className="rounded-lg mt-4">
                <div className="overflow-x-auto rounded-lg border border-[var(--color-muted)] border-opacity-20 bg-[var(--color-background)]">
                  <>
                    {selectedLoans.size > 0 && (
                      <div className="p-4 border-b border-[var(--color-muted)] border-opacity-20 flex justify-between items-center bg-blue-50">
                        <span className="text-sm font-medium">
                          {selectedLoans.size} loan
                          {selectedLoans.size !== 1 ? "s" : ""} selected for
                          allocation
                        </span>
                        <Button
                          onClick={handleAllocateClick}
                          variant="primary"
                          size="sm"
                        >
                          Allocate Selected
                        </Button>
                      </div>
                    )}
                    <table className="w-full">
                      <thead className="bg-[var(--color-muted)] bg-opacity-10 border-b border-[var(--color-muted)] border-opacity-20">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase w-12">
                            <input
                              type="checkbox"
                              checked={
                                displayedLoans.length > 0 &&
                                selectedLoans.size === displayedLoans.length
                              }
                              onChange={(e) =>
                                handleSelectAll(e.target.checked)
                              }
                              className="w-4 h-4 cursor-pointer"
                            />
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase">
                            Loan ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase">
                            Customer Name
                          </th>

                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase">
                            Status
                          </th>

                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-muted)] divide-opacity-20">
                        {displayedLoans.map((displayLoan) => (
                          <tr
                            key={displayLoan.id}
                            className="hover:bg-[var(--color-muted)] hover:bg-opacity-5 transition"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedLoans.has(displayLoan.id)}
                                onChange={(e) =>
                                  handleLoanSelection(
                                    displayLoan.id,
                                    e.target.checked
                                  )
                                }
                                className="w-4 h-4 cursor-pointer"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() =>
                                  copyToClipboard(
                                    displayLoan.formattedLoanId
                                  )
                                }
                                className="flex items-center gap-1 text-primary hover:opacity-70 font-medium"
                                title="Copy Loan Id"
                              >
                                <span className="font-mono font-medium text-primary">
                                  {displayLoan.formattedLoanId}
                                </span>
                                <FiCopy className="w-4 h-4" />
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {[
                                displayLoan.user?.userDetails?.firstName,
                                displayLoan.user?.userDetails?.lastName,
                              ]
                                .filter(Boolean)
                                .join(" ") || "N/A"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                              {displayLoan.amount ? Conversion.formatCurrency(displayLoan.amount) : "N/A"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {displayLoan.status}
                              </span>
                            </td>

                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {/* Pagination */}
                    {!loadingLoan && displayedLoans.length > 0 && (
                      <div className="flex items-center justify-between pt-4 p-8">
                        <div className="text-sm text-[var(--color-on-surface)] opacity-70">
                          Showing{" "}
                          {Math.min(pagination.limit, displayedLoans.length)}{" "}
                          of {totalCount} unallocated loans
                        </div>
                        <div className="flex gap-2 items-center">
                          <Button
                            onClick={() =>
                              handlePaginationChange(
                                Math.max(1, pagination.page - 1),
                                pagination.limit
                              )
                            }
                            disabled={pagination.page === 1}
                            variant="outline"
                            size="sm"
                          >
                            Previous
                          </Button>
                          <span className="text-sm px-3">
                            Page {pagination.page} of{" "}
                            {Math.ceil(totalCount / pagination.limit) || 1}
                          </span>
                          <Button
                            onClick={() =>
                              handlePaginationChange(
                                pagination.page + 1,
                                pagination.limit
                              )
                            }
                            disabled={
                              pagination.page >=
                              Math.ceil(totalCount / pagination.limit)
                            }
                            variant="outline"
                            size="sm"
                          >
                            Next
                          </Button>
                          <select
                            value={pagination.limit}
                            onChange={(e) =>
                              handlePaginationChange(
                                1,
                                Number(e.target.value)
                              )
                            }
                            className="px-3 py-2 border border-[var(--color-muted)] border-opacity-20 rounded text-sm"
                          >
                            <option value={10}>10 per page</option>
                            <option value={25}>25 per page</option>
                            <option value={50}>50 per page</option>
                            <option value={100}>100 per page</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </>
                </div>
              </div>
            ) : (
              !loadingLoan && (
                <div className="flex items-center justify-center py-12 border border-[var(--color-muted)] border-opacity-20 rounded-lg mt-4">
                  <div className="text-center">
                    <HiOutlineUser className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-[var(--color-on-surface)] opacity-70">
                      No unallocated loans found
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Allocation Modal */}
      {showAllocationModal && (
        <Dialog
          onClose={() => setShowAllocationModal(false)}
          isOpen={showAllocationModal}
          title="Allocate Loans"
        >
          {/* Modal Body */}
          <div className="space-y-6">
            {/* Error Message */}
            {modalError && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
                {modalError}
              </div>
            )}

            {/* Partner User Selection */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-on-background)] mb-2">
                Assign to Partner User *
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowPartnerDropdown(!showPartnerDropdown)}
                  className="w-full px-4 py-2.5 border border-[var(--color-muted)] border-opacity-20 rounded-lg text-sm bg-[var(--color-background)] hover:bg-[var(--color-muted)] hover:bg-opacity-5 transition flex justify-between items-center"
                  disabled={isAllocating || isLoadingPartners}
                >
                  <span
                    className={
                      selectedPartnerUserId
                        ? "text-[var(--color-on-background)]"
                        : "text-[var(--color-on-surface)] opacity-70"
                    }
                  >
                    {selectedPartnerUserId
                      ? partnerUsers.find((p) => p.id === selectedPartnerUserId)
                        ?.name || "Select a partner..."
                      : "Select a partner..."}
                  </span>
                  <HiOutlineChevronDown
                    className={`w-5 h-5 transition-transform ${showPartnerDropdown ? "rotate-180" : ""
                      }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {showPartnerDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-background)] border border-[var(--color-muted)] border-opacity-20 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                    {/* Search Input */}
                    <div className="sticky top-0 p-2 border-b border-[var(--color-muted)] border-opacity-20 bg-[var(--color-background)]">
                      <input
                        type="text"
                        placeholder="Search partner..."
                        value={partnerSearchQuery}
                        onChange={(e) => setPartnerSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-20 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    {/* Partner Options */}
                    {renderPartnerOptions()}
                  </div>
                )}
              </div>
              <p className="text-xs text-[var(--color-on-surface)] opacity-70 mt-2">
                Select a partner user to allocate the {selectedLoans.size}{" "}
                selected loan(s)
              </p>
            </div>

            {/* Selected Loans List */}
            <div>
              <p className="text-sm font-medium text-[var(--color-on-background)] mb-3">
                Selected Loans ({selectedLoans.size})
              </p>
              <div className="space-y-2">
                {displayedLoans
                  .filter((l) => selectedLoans.has(l.id))
                  .map((loan) => (
                    <div
                      key={loan.id}
                      className="flex items-center justify-between border border-[var(--color-muted)] border-opacity-20 rounded p-3 bg-[var(--color-muted)] bg-opacity-5"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-[var(--color-on-background)]">
                            {loan.formattedLoanId}
                          </p>
                          <p className="text-xs text-[var(--color-on-surface)] opacity-70">
                            {[
                              loan.user?.userDetails?.firstName,
                              loan.user?.userDetails?.lastName,
                            ]
                              .filter(Boolean)
                              .join(" ") || "N/A"}{" "}
                            - {loan.amount ? Conversion.formatCurrency(loan.amount) : "N/A"}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const newSet = new Set(selectedLoans);
                          newSet.delete(loan.id);
                          setSelectedLoans(newSet);
                          if (newSet.size === 0) {
                            setShowAllocationModal(false);
                          }
                        }}
                        className="text-red-500 hover:text-red-700 font-bold text-lg p-1"
                        title="Remove from selection"
                      >
                        ×
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="sticky bottom-0 bg-[var(--color-background)] border-t border-[var(--color-muted)] border-opacity-20 p-6 flex gap-3 justify-end">
            <Button
              onClick={() => {
                setShowAllocationModal(false);
                setSelectedPartnerUserId("");
                setModalError(null);
              }}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!selectedPartnerUserId.trim()) {
                  setModalError("Please select a partner user");
                  return;
                }

                try {
                  setIsAllocating(true);
                  setModalError(null);

                  const allocationPromises = Array.from(selectedLoans).map(
                    (loanId) =>
                      relocateLoan(brandId!, loanId, selectedPartnerUserId)
                  );

                  await Promise.all(allocationPromises);

                  showSuccess(
                    "Success",
                    `${selectedLoans.size} loan(s) allocated successfully`
                  );
                  setShowAllocationModal(false);
                  setSelectedLoans(new Set());
                  setSelectedPartnerUserId("");
                  await fetchUnallocatedLoans();
                } catch (err: any) {
                  console.error("Allocation error:", err);
                  setModalError(
                    err?.response?.data?.message || "Failed to allocate loans"
                  );
                } finally {
                  setIsAllocating(false);
                }
              }}
              variant="primary"
              size="sm"
              disabled={isAllocating || !selectedPartnerUserId.trim()}
            >
              {isAllocating ? "Allocating..." : "Confirm Allocation"}
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default UnallocatedLoansComponent;
