import { useEffect, useState, useCallback } from "react";
import { useLocation, useParams } from "react-router-dom";
import { FiCopy } from "react-icons/fi";
import { HiOutlineUser, HiOutlineChevronDown } from "react-icons/hi2";
import { useToast } from "../../../context/toastContext";
import { formatDateWithTime } from "../../../lib/utils";
import { SearchInput } from "../../../common/ui/table";
import {
  getUnallocatedCustomers,
  allocateCustomersToPartnerUser,
} from "../../../shared/services/api/customer.api";
import { getCreditExecutiveUsers } from "../../../shared/services/api/partner-user.api";
import { Customer } from "../../../shared/types/customers";
import { Button } from "../../../common/ui/button";
import Dialog from "../../../common/dialog";
import { AcefoneClickToDialButton } from "../../acefone";

interface PartnerUser {
  id: string;
  name: string;
  email: string;
  reportsToId?: string;
  reportsTo?: { id: string };
}

export default function UnallocatedCustomersList() {
  const { brandId } = useParams();
  const { search } = useLocation();
  const { showSuccess } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partnerUsers, setPartnerUsers] = useState<PartnerUser[]>([]);
  const [isLoadingPartners, setIsLoadingPartners] = useState(false);

  // Initialize pagination from localStorage
  const [pagination, setPagination] = useState(() => {
    const savedLimit = localStorage.getItem("unallocatedCustomersListPageSize");
    const savedPage = localStorage.getItem("unallocatedCustomersListPage");
    return {
      page: savedPage ? Number(savedPage) : 1,
      limit: savedLimit ? Number(savedLimit) : 10,
    };
  });

  const [totalCount, setTotalCount] = useState(0);

  // State for selected customers
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(
    new Set(),
  );
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [selectedPartnerUserId, setSelectedPartnerUserId] =
    useState<string>("");
  const [partnerSearchQuery, setPartnerSearchQuery] = useState<string>("");
  const [showPartnerDropdown, setShowPartnerDropdown] = useState(false);
  const [isAllocating, setIsAllocating] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const queryParams = new URLSearchParams(search);
  const [filters, setFilters] = useState<any>({
    search: queryParams.get("search") || "",
  });

  // Fetch unallocated customers (customers with onboardingStep < 12)
  const fetchUnallocatedCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!brandId) return;

      const response = await getUnallocatedCustomers(
        brandId,
        pagination.page,
        pagination.limit,
        filters.search || "",
      );

      setCustomers(response.users || []);
      setTotalCount(response.meta?.total || 0);
    } catch (err: any) {
      console.error("Error fetching unallocated customers:", err);
      setError(
        err?.response?.data?.message || "Failed to fetch unallocated customers",
      );
    } finally {
      setIsLoading(false);
    }
  }, [brandId, filters, pagination]);

  // Initial fetch and when filters/pagination change
  useEffect(() => {
    fetchUnallocatedCustomers();
  }, [fetchUnallocatedCustomers]);

  // Handle pagination change
  const handlePaginationChange = useCallback(
    (newPage: number, newLimit: number) => {
      setPagination({ ...pagination, page: newPage, limit: newLimit });
      localStorage.setItem("unallocatedCustomersListPage", newPage.toString());
      localStorage.setItem(
        "unallocatedCustomersListPageSize",
        newLimit.toString(),
      );
    },
    [pagination],
  );

  // Handle filter change
  const handleFilterChange = useCallback(
    (newFilters: any) => {
      setFilters(newFilters);
      setPagination({ ...pagination, page: 1 });
    },
    [pagination],
  );

  // Copy customer ID to clipboard
  const copyToClipboard = useCallback(
    (customerId: string) => {
      navigator.clipboard.writeText(customerId);
      showSuccess("Customer ID copied to clipboard");
    },
    [showSuccess],
  );

  // Fetch partner users for allocation
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

  // Handle individual checkbox toggle (max 5 selections)
  const toggleCustomerSelection = useCallback(
    (customerId: string) => {
      setSelectedCustomers((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(customerId)) {
          newSet.delete(customerId);
        } else if (newSet.size < 5) {
          newSet.add(customerId);
        } else {
          showSuccess("Maximum 5 customers can be selected at a time");
        }
        return newSet;
      });
    },
    [showSuccess],
  );

  // Handle select all checkbox (max 5)
  const toggleSelectAll = useCallback(() => {
    if (selectedCustomers.size === customers.length) {
      setSelectedCustomers(new Set());
    } else {
      // Select only up to 5 customers
      const customersToSelect = customers.slice(0, 5);
      setSelectedCustomers(new Set(customersToSelect.map((c) => c.id)));
      if (customers.length > 5) {
        showSuccess("Selected first 5 customers (maximum limit)");
      }
    }
  }, [customers, selectedCustomers.size, showSuccess]);

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
        .includes(partnerSearchQuery.toLowerCase()),
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
              className={`w-full text-left px-4 py-3 border-b border-[var(--color-muted)] border-opacity-10 hover:bg-[var(--color-muted)] hover:bg-opacity-10 transition ${
                selectedPartnerUserId === partner.id
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

  // Handle allocate button click
  const handleAllocate = useCallback(() => {
    if (selectedCustomers.size === 0) {
      showSuccess("Please select at least one customer");
      return;
    }
    // Reset modal states
    setSelectedPartnerUserId("");
    setPartnerSearchQuery("");
    setShowPartnerDropdown(false);
    setModalError(null);
    // Fetch partner users
    fetchPartnerUsers();
    // Show allocation modal with selected customers
    setShowAllocationModal(true);
  }, [selectedCustomers, showSuccess, fetchPartnerUsers]);

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-on-background)]">
          Unallocated Customers
        </h1>
        <p className="text-sm text-[var(--color-on-surface)] opacity-70 mt-1">
          Customers with onboarding in progress waiting for allocation
        </p>
      </div>

      {/* Search */}
      <SearchInput
        placeholder="Search by customer ID, name, email..."
        onChange={(value) => handleFilterChange({ ...filters, search: value })}
        value={filters?.search || ""}
      />

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-[var(--color-on-surface)] opacity-70">
              Loading unallocated customers...
            </p>
          </div>
        </div>
      )}

      {/* Customers Table */}
      {!isLoading && (
        <div className="overflow-x-auto rounded-lg border border-[var(--color-muted)] border-opacity-20 bg-[var(--color-background)]">
          {customers.length > 0 ? (
            <>
              {/* Allocate Button */}
              {selectedCustomers.size > 0 && (
                <div className="p-4 border-b border-[var(--color-muted)] border-opacity-20 flex justify-between items-center bg-blue-50">
                  <span className="text-sm font-medium">
                    {selectedCustomers.size} customer(s) selected
                  </span>
                  <Button
                    onClick={handleAllocate}
                    variant="primary"
                    size="sm"
                    className="text-xs"
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
                          customers.length > 0 &&
                          selectedCustomers.size === customers.length
                        }
                        onChange={toggleSelectAll}
                        className="w-4 h-4 cursor-pointer"
                        title="Select all customers on this page"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">
                      Customer ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">
                      Created Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">
                      Onboarding Step
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-muted)] divide-opacity-20">
                  {customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="hover:bg-[var(--color-muted)] hover:bg-opacity-5 transition"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedCustomers.has(customer.id)}
                          onChange={() => toggleCustomerSelection(customer.id)}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() =>
                            copyToClipboard(customer.formattedUserId)
                          }
                          className="flex items-center gap-1 text-primary hover:opacity-70 font-medium"
                          title="Copy Customer ID"
                        >
                          <span>{customer.formattedUserId}</span>
                          <FiCopy className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm">
                          {customer.id && (
                            <AcefoneClickToDialButton userId={customer.id} />
                          )}{" "}
                          {customer.phoneNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatDateWithTime(customer.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Step {customer.onboardingStep || 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <HiOutlineUser className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-[var(--color-on-surface)] opacity-70">
                  No unallocated customers found
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && customers.length > 0 && (
        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-[var(--color-on-surface)] opacity-70">
            Showing {Math.min(pagination.limit, customers.length)} of{" "}
            {totalCount} unallocated customers
          </div>
          <div className="flex gap-2 items-center">
            <Button
              onClick={() =>
                handlePaginationChange(
                  Math.max(1, pagination.page - 1),
                  pagination.limit,
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
                handlePaginationChange(pagination.page + 1, pagination.limit)
              }
              disabled={
                pagination.page >= Math.ceil(totalCount / pagination.limit)
              }
              variant="outline"
              size="sm"
            >
              Next
            </Button>
            <select
              value={pagination.limit}
              onChange={(e) =>
                handlePaginationChange(1, Number(e.target.value))
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

      {/* Allocation Modal */}
      {showAllocationModal && (
        <Dialog
          onClose={() => setShowAllocationModal(false)}
          isOpen={showAllocationModal}
          title="Allocate Customers"
        >
          {/* Modal Body */}
          <div className="space-y-6">
            {/* Error Message */}
            {modalError && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
                {modalError}
              </div>
            )}

            {/* Selected Customers List */}
            <div>
              {/* Partner User Selection */}
              <div>
                <label
                  htmlFor="partner-user-select"
                  className="block text-sm font-medium text-[var(--color-on-background)] mb-2"
                >
                  Assign to Partner User *
                </label>
                <div className="relative">
                  <button
                    id="partner-user-select"
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
                        ? partnerUsers.find(
                            (p) => p.id === selectedPartnerUserId,
                          )?.name || "Select a partner..."
                        : "Select a partner..."}
                    </span>
                    <HiOutlineChevronDown
                      className={`w-5 h-5 transition-transform ${
                        showPartnerDropdown ? "rotate-180" : ""
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
                          onChange={(e) =>
                            setPartnerSearchQuery(e.target.value)
                          }
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
                  Select a partner user to allocate the {selectedCustomers.size}{" "}
                  selected customer(s)
                </p>
              </div>
              <p className="text-sm font-medium text-[var(--color-on-background)] mb-3">
                Selected Customers ({selectedCustomers.size})
              </p>

              <div className="space-y-2">
                {customers
                  .filter((c) => selectedCustomers.has(c.id))
                  .map((customer: any) => (
                    <div
                      key={customer.id}
                      className="flex items-center justify-between border border-[var(--color-muted)] border-opacity-20 rounded p-3 bg-[var(--color-muted)] bg-opacity-5"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-[var(--color-on-background)]">
                            {customer.name}
                          </p>
                          <p className="text-xs text-[var(--color-on-surface)] opacity-70">
                            ID: {customer.formattedUserId}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const newSet = new Set(selectedCustomers);
                          newSet.delete(customer.id);
                          setSelectedCustomers(newSet);
                          showSuccess("Customer unselected");
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

            {/* Current Allocations Info */}
            {customers
              .filter((c) => selectedCustomers.has(c.id))
              .some((c) => c.allocatedPartner) && (
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <p className="text-xs font-semibold text-blue-900 uppercase mb-3">
                  Current Allocations
                </p>
                <div className="space-y-2">
                  {customers
                    .filter(
                      (c) => selectedCustomers.has(c.id) && c.allocatedPartner,
                    )
                    .map((customer: any) => (
                      <div key={customer.id} className="text-sm">
                        <p className="font-medium text-blue-900">
                          {customer.name}
                        </p>
                        <p className="text-blue-800 text-xs">
                          Currently assigned to:{" "}
                          <span className="font-semibold">
                            {customer.allocatedPartner.name || "Unknown"}
                          </span>{" "}
                          ({customer.allocatedPartner.email})
                        </p>
                      </div>
                    ))}
                </div>
                <p className="text-xs text-blue-800 mt-3 italic">
                  Note: Confirming will reassign these customers to the selected
                  partner user.
                </p>
              </div>
            )}
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
                  setModalError("Please enter a partner user");
                  return;
                }

                try {
                  setIsAllocating(true);
                  setModalError(null);

                  // Call the allocation API
                  const response = await allocateCustomersToPartnerUser(
                    brandId!,
                    Array.from(selectedCustomers),
                    selectedPartnerUserId,
                  );

                  if (response.success) {
                    showSuccess(response.message);
                    setShowAllocationModal(false);
                    setSelectedCustomers(new Set());
                    setSelectedPartnerUserId("");
                    // Refresh the customers list
                    await fetchUnallocatedCustomers();
                  }
                } catch (err: any) {
                  console.error("Allocation error:", err);
                  setModalError(
                    err?.response?.data?.message ||
                      "Failed to allocate customers",
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
}
