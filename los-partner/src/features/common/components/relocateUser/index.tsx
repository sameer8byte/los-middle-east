import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

import {
  HiOutlineSearch,
  HiOutlineRefresh,
  HiOutlineCheckCircle,
  HiOutlineArrowRight,
  HiOutlineUsers,
} from "react-icons/hi";
import { HiOutlineExclamationTriangle } from "react-icons/hi2";
import Dialog from "../../../../common/dialog";
import { toast } from "react-toastify";
import {
  getAllCustomers,
  relocateUser,
  getCustomerLoans,
} from "../../../../shared/services/api/customer.api";
import { relocateLoan } from "../../../../shared/services/api/loan.api";
import { getCreditExecutiveUsers } from "../../../../shared/services/api/partner-user.api";
import { Customer } from "../../../../shared/types/customers";
import { Loan } from "../../../../shared/types/loan";
import { Button } from "../../../../common/ui/button";

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
const CustomerCardSkeleton = () => (
  <div className="p-3 border border-[var(--color-muted)] border-opacity-30 rounded-lg animate-pulse">
    <div className="flex items-center space-x-3">
      <div className="w-4 h-4 bg-[var(--color-muted)] bg-opacity-30 rounded"></div>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <div className="h-3 bg-[var(--color-muted)] bg-opacity-30 rounded w-12"></div>
          <div className="h-4 bg-[var(--color-muted)] bg-opacity-30 rounded w-20"></div>
        </div>
        <div className="space-y-1">
          <div className="h-3 bg-[var(--color-muted)] bg-opacity-30 rounded w-12"></div>
          <div className="h-4 bg-[var(--color-muted)] bg-opacity-30 rounded w-16"></div>
        </div>
        <div className="space-y-1">
          <div className="h-3 bg-[var(--color-muted)] bg-opacity-30 rounded w-10"></div>
          <div className="h-4 bg-[var(--color-muted)] bg-opacity-30 rounded w-14"></div>
        </div>
      </div>
    </div>
  </div>
);

const ExecutiveSelectSkeleton = () => (
  <div className="bg-white rounded-lg shadow-sm border border-[var(--color-muted)] border-opacity-20 p-4 animate-pulse">
    <div className="h-5 bg-[var(--color-muted)] bg-opacity-30 rounded w-40 mb-3"></div>
    <div className="h-10 bg-[var(--color-muted)] bg-opacity-30 rounded-lg w-full"></div>
  </div>
);

interface RelocateUserProps {
  readonly isOpen: boolean;
  readonly setIsOpen: (isOpen: boolean) => void;
  readonly selectedCustomerId?: string;
}

export function RelocateUser({
  isOpen,
  setIsOpen,
  selectedCustomerId,
}: RelocateUserProps) {
  const { brandId } = useParams<{ brandId: string }>();

  // State management
  const [creditExecutives, setCreditExecutives] = useState<CreditExecutive[]>(
    []
  );
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(
    new Set()
  );
  const [selectedExecutive, setSelectedExecutive] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Loan-related state
  const [customerLoans, setCustomerLoans] = useState<Record<string, Loan[]>>(
    {}
  );
  const [selectedLoansToRelocate, setSelectedLoansToRelocate] = useState<
    Set<string>
  >(new Set());

  // Loading and error states
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [isLoadingExecutives, setIsLoadingExecutives] = useState(false);
  const [isRelocating, setIsRelocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Set selected customer if passed as prop
  useEffect(() => {
    if (selectedCustomerId) {
      setSelectedCustomers(new Set([selectedCustomerId]));
    }
  }, [selectedCustomerId]);

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

  // Fetch customers with debounced search
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!brandId) {
        setError("Brand ID is required");
        return;
      }

      setIsLoadingCustomers(true);
      setError(null);

      try {
        const response = await getAllCustomers(
          brandId,
          {
            page: 1,
            limit: 200,
            dateFilter: "",
          },
          {
            search: searchTerm || "",
          }
        );
        setCustomers(response.users);
      } catch (err) {
        setError("Failed to fetch customers");
        console.error(err);
      } finally {
        setIsLoadingCustomers(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      if (brandId) fetchCustomers();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [brandId, searchTerm]);

  // Handle customer selection
  const handleCustomerSelection = (
    customerId: string,
    shouldSelect: boolean
  ) => {
    const newSelected = new Set(selectedCustomers);
    if (shouldSelect) {
      newSelected.add(customerId);
    } else {
      newSelected.delete(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  // Handle select all customers
  const handleSelectAllToggle = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const shouldSelectAll = event.target.checked;
    const newSelection = shouldSelectAll
      ? new Set(customers.map((customer) => customer.id))
      : new Set<string>();
    setSelectedCustomers(newSelection);
  };

  // Handle loan selection
  const handleLoanSelection = (loanId: string, shouldSelect: boolean) => {
    const newSelected = new Set(selectedLoansToRelocate);
    if (shouldSelect) {
      newSelected.add(loanId);
    } else {
      newSelected.delete(loanId);
    }
    setSelectedLoansToRelocate(newSelected);
  };

  // Fetch loans for selected customers
  useEffect(() => {
    const filterPendingLoans = (loans: Loan[]) => {
      return loans.filter(
        (loan: Loan) =>
          loan.status === "PENDING" ||
          loan.status === "CREDIT_EXECUTIVE_APPROVED"
      );
    };

    const fetchLoansForCustomers = async () => {
      if (selectedCustomers.size === 0) {
        setCustomerLoans({});
        return;
      }

      const processCustomerLoans = async (customerId: string) => {
        try {
          const response = await getCustomerLoans(customerId);
          const pendingLoans = filterPendingLoans(response);
          return { customerId, loans: pendingLoans };
        } catch (error) {
          console.error(
            `Error fetching loans for customer ${customerId}:`,
            error
          );
          return { customerId, loans: [] };
        }
      };

      const loansPromises = Array.from(selectedCustomers).map(processCustomerLoans);

      const results = await Promise.all(loansPromises);
      const loansMap = results.reduce((acc, { customerId, loans }) => {
        acc[customerId] = loans;
        return acc;
      }, {} as Record<string, Loan[]>);

      setCustomerLoans(loansMap);
    };

    fetchLoansForCustomers();
  }, [selectedCustomers]);

  // Handle customer relocation
  const handleRelocateCustomers = async () => {
    if (selectedCustomers.size === 0) {
      setError("Please select at least one customer to relocate");
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
      const customerRelocatePromises = Array.from(selectedCustomers).map(
        (customerId) => relocateUser(customerId, selectedExecutive)
      );

      // Relocate selected loans
      const loanRelocatePromises = Array.from(selectedLoansToRelocate).map(
        (loanId) => relocateLoan(brandId, loanId, selectedExecutive)
      );

      // Execute all relocations in parallel
      await Promise.all([...customerRelocatePromises, ...loanRelocatePromises]);

      const customerCount = selectedCustomers.size;
      const loanCount = selectedLoansToRelocate.size;

      let successMsg = `Successfully relocated ${customerCount} customer${
        customerCount > 1 ? "s" : ""
      }`;
      if (loanCount > 0) {
        successMsg += ` and ${loanCount} loan${loanCount > 1 ? "s" : ""}`;
      }

      setSuccessMessage(successMsg);
      toast.success(successMsg);

      setSelectedCustomers(new Set());
      setSelectedLoansToRelocate(new Set());

      // Refresh the parent component by closing and showing success
      setTimeout(() => {
        setIsOpen(false);
        window.location.reload(); // Simple way to refresh the customer list
      }, 1500);
    } catch (error: any) {
      console.error("Error relocating customers/loans:", error);
      
      // Extract specific error message from API response
      let errorMessage = "Failed to relocate customers/loans. Please try again.";
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
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
        title="Relocate Customers"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      >
        <div className="flex flex-col gap-4 text-[var(--color-on-background)] bg-white">
          {/* Search Bar */}
          {!selectedCustomerId && (
            <div className="relative">
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface)] opacity-50 w-4 h-4" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-[var(--color-muted)] border-opacity-50 bg-[var(--color-background)] rounded-lg focus:ring-2 focus:ring-[#EA5E18] focus:border-[#EA5E18] text-[var(--color-on-background)] placeholder-gray-500 transition"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface)] opacity-50 hover:opacity-70 text-sm"
                >
                  ×
                </button>
              )}
            </div>
          )}

          {/* Success/Error */}
          {successMessage && (
            <div className="flex items-center gap-2 p-3 border border-[var(--color-success)] border-opacity-30 bg-[var(--color-success)] bg-opacity-10 rounded-lg">
              <HiOutlineCheckCircle className="w-4 h-4 text-[var(--color-on-success)] flex-shrink-0" />
              <p className="text-[var(--color-on-success)] font-medium text-sm">
                {successMessage}
              </p>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-3 border border-[var(--color-error)] border-opacity-30 bg-[var(--color-error)] bg-opacity-10 rounded-lg">
              <HiOutlineExclamationTriangle className="w-4 h-4 text-[var(--color-on-error)] flex-shrink-0" />
              <p className="text-[var(--color-on-error)] font-medium text-sm">
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
              className="w-full p-2 text-sm border border-[var(--color-muted)] border-opacity-50 rounded-lg bg-[var(--color-background)] focus:ring-2 focus:ring-[#EA5E18] text-[var(--color-on-background)] transition"
            >
              <option value="">Choose a credit executive</option>
              {creditExecutives.map((exec) => (
                <option key={exec.id} value={exec.id}>
                  {exec?.name} ({exec?.email})
                </option>
              ))}
            </select>
          )}

          {/* Customers List */}
          {!selectedCustomerId && (
            <div className="bg-white rounded-lg border border-[var(--color-muted)] border-opacity-30 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-[var(--color-background)] border-b border-[var(--color-muted)] border-opacity-30">
                <div className="flex items-center gap-2">
                  <HiOutlineUsers className="w-4 h-4 text-[#EA5E18]" />
                  <div>
                    <h3 className="text-base font-semibold text-[var(--color-on-background)]">
                      Customers
                    </h3>
                    <p className="text-xs text-[var(--color-on-surface)] opacity-70">
                      {isLoadingCustomers
                        ? "Loading..."
                        : `${customers.length} available`}
                    </p>
                  </div>
                </div>

                {customers.length > 0 && !isLoadingCustomers && (
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-medium text-[var(--color-on-surface)] opacity-80">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.size === customers.length}
                        onChange={handleSelectAllToggle}
                        className="w-4 h-4 text-[#EA5E18] border-[var(--color-muted)] border-opacity-50 rounded focus:ring-[#EA5E18]"
                      />
                      <span>Select All</span>
                    </label>
                    <span className="px-2 py-0.5 bg-[#EA5E18]/10 text-[#EA5E18] rounded-full text-xs font-medium">
                      {selectedCustomers.size}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-4 space-y-3 max-h-[350px] overflow-y-auto">
                {isLoadingCustomers && (
                  <>
                    {Array.from({ length: 4 }, (_, i) => (
                      <CustomerCardSkeleton key={`skeleton-${i}`} />
                    ))}
                  </>
                )}
                {!isLoadingCustomers && customers.length > 0 && (
                  <>
                    {customers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() =>
                          handleCustomerSelection(
                            customer.id,
                            !selectedCustomers.has(customer.id)
                          )
                        }
                        className={`w-full p-3 border rounded-lg cursor-pointer hover:shadow-sm transition text-left ${
                          selectedCustomers.has(customer.id)
                            ? "border-[#EA5E18] bg-[#EA5E18]/5"
                            : "border-[var(--color-muted)] border-opacity-30 hover:border-[var(--color-muted)] border-opacity-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedCustomers.has(customer.id)}
                            onChange={(e) =>
                              handleCustomerSelection(
                                customer.id,
                                e.target.checked
                              )
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 text-[#EA5E18] border-[var(--color-muted)] border-opacity-50 rounded focus:ring-[#EA5E18]"
                          />
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            <div className="min-w-0">
                              <p className="text-[var(--color-on-surface)] opacity-70 truncate">
                                {customer.name || "N/A"}
                              </p>
                              <p className="text-[var(--color-on-surface)] opacity-50 truncate">
                                {customer.email}
                              </p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-[var(--color-on-background)] font-medium">
                                Step {customer.onboardingStep}
                              </p>
                              <p className="text-[var(--color-on-surface)] opacity-50">
                                KYC: {customer.kycCompleted ? "✓" : "○"}
                              </p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-[var(--color-on-background)] truncate">
                                {customer.allocatedPartner &&
                                customer.allocatedPartner
                                  ? customer.allocatedPartner.name
                                  : "Unassigned"}
                              </p>

                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </>
                )}
                {!isLoadingCustomers && customers.length === 0 && (
                  <div className="text-center py-8">
                    <div className="mx-auto mb-3 w-12 h-12 flex items-center justify-center bg-[var(--color-surface)] rounded-full">
                      <HiOutlineUsers className="w-6 h-6 text-[var(--color-on-surface)] opacity-50" />
                    </div>
                    <p className="text-[var(--color-on-surface)] opacity-70 text-sm font-medium mb-1">
                      No customers found
                    </p>
                    <p className="text-[var(--color-on-surface)] opacity-50 text-xs mb-3">
                      Try adjusting your search
                    </p>
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-[#EA5E18] hover:text-orange-600 text-xs font-medium"
                    >
                      <HiOutlineRefresh className="w-3 h-3" />
                      Refresh
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Single Customer Info */}
          {selectedCustomerId && (
            <div className="bg-white rounded-lg border border-[var(--color-muted)] border-opacity-30 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <HiOutlineUsers className="w-4 h-4 text-[#EA5E18]" />
                <h3 className="text-base font-semibold text-[var(--color-on-background)]">
                  Selected Customer
                </h3>
              </div>
              <div className="bg-[var(--color-background)] rounded p-3">
                <p className="text-xs text-[var(--color-on-surface)] opacity-70 mb-1">
                  ID: {selectedCustomerId.slice(0, 8)}...
                </p>
                <p className="text-xs text-[var(--color-on-background)]">
                  Will be relocated to selected executive
                </p>
              </div>
            </div>
          )}

          {/* Pending Loans Section */}
          {selectedCustomers.size > 0 &&
            Object.keys(customerLoans).length > 0 && (
              <div className="bg-white rounded-lg border border-[var(--color-muted)] border-opacity-30 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-[var(--color-background)] border-b border-[var(--color-muted)] border-opacity-30">
                  <div className="flex items-center gap-2">
                    <HiOutlineUsers className="w-4 h-4 text-[#EA5E18]" />
                    <div>
                      <h3 className="text-base font-semibold text-[var(--color-on-background)]">
                        Pending Loans
                      </h3>
                      <p className="text-xs text-[var(--color-on-surface)] opacity-70">
                        Select loans to relocate
                      </p>
                    </div>
                  </div>
                  {Object.values(customerLoans).flat().length > 0 && (
                    <span className="px-2 py-0.5 bg-[#EA5E18]/10 text-[#EA5E18] rounded-full text-xs font-medium">
                      {selectedLoansToRelocate.size}
                    </span>
                  )}
                </div>

                <div className="p-4 space-y-3 max-h-[250px] overflow-y-auto">
                  {Object.entries(customerLoans).map(([customerId, loans]) => {
                    const customer = customers.find((c) => c.id === customerId);
                    if (!loans || loans.length === 0) return null;

                    return (
                      <div
                        key={customerId}
                        className="border border-[var(--color-muted)] border-opacity-30 rounded p-3"
                      >
                        <div className="mb-2">
                          <h4 className="font-medium text-[var(--color-on-background)] text-sm">
                            {customer?.name || "Unknown"}
                          </h4>
                          <p className="text-xs text-[var(--color-on-surface)] opacity-70">
                            {loans.length} loan{loans.length > 1 ? "s" : ""}
                          </p>
                        </div>

                        <div className="space-y-2">
                          {loans.map((loan) => (
                            <label
                              key={loan.id}
                              className="flex items-start gap-2 p-2 border border-[var(--color-muted)] border-opacity-20 rounded hover:bg-[var(--color-background)] cursor-pointer"
                              aria-label={`Select loan ${loan.formattedLoanId || loan.id}`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedLoansToRelocate.has(loan.id)}
                                onChange={(e) =>
                                  handleLoanSelection(loan.id, e.target.checked)
                                }
                                className="w-3 h-3 text-[#EA5E18] border-[var(--color-muted)] border-opacity-50 rounded focus:ring-[#EA5E18] mt-0.5"
                              />
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs min-w-0">
                                <div className="min-w-0">
                                  <p className="font-medium text-[var(--color-on-background)] truncate">
                                    {loan.formattedLoanId || "N/A"}
                                  </p>
                                  <p className="text-[var(--color-on-surface)] opacity-50 truncate">
                                    {loan.status}
                                  </p>
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-[var(--color-on-background)]">
                                    BHD{loan.amount?.toLocaleString()}
                                  </p>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[var(--color-on-background)] truncate">
                                    {loan.allottedPartners &&
                                    loan.allottedPartners?.length > 0
                                      ? loan.allottedPartners
                                          .map((ap) => ap?.partnerUser?.name)
                                          .join(", ")
                                      : "Unassigned"}
                                  </p>
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {Object.values(customerLoans).flat().length === 0 && (
                    <div className="text-center py-6">
                      <p className="text-[var(--color-on-surface)] opacity-70 text-sm">
                        No pending loans found
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* Action Button */}
          {selectedCustomers.size > 0 && (
            <div className="flex items-center justify-between bg-white rounded-lg border border-[var(--color-muted)] border-opacity-30 shadow-sm p-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-[var(--color-on-background)] font-medium truncate">
                  Relocate {selectedCustomers.size} customer{selectedCustomers.size > 1 ? "s" : ""}
                  {selectedLoansToRelocate.size > 0 && (
                    <span> + {selectedLoansToRelocate.size} loan{selectedLoansToRelocate.size > 1 ? "s" : ""}</span>
                  )}
                </p>
                {selectedExecutive && (
                  <p className="text-xs text-[var(--color-on-surface)] opacity-70 truncate">
                    To: {creditExecutives.find((exec) => exec.id === selectedExecutive)?.name}
                  </p>
                )}
              </div>

              <Button
                variant="primary"
                onClick={handleRelocateCustomers}
                disabled={isRelocating || !selectedExecutive}
                loading={isRelocating}
                className="ml-3 flex-shrink-0"
              >
                <HiOutlineArrowRight className="w-3 h-3" />
                <span className="text-xs">Relocate</span>
              </Button>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}
