import React, { useState, useEffect, useCallback, useRef } from "react";
import { HiOutlineUser, HiOutlineCalendar, HiOutlineClipboardList } from "react-icons/hi";
import { CgSpinner } from "react-icons/cg";
import { Button } from "../../../../../common/ui/button";
import { useToast } from "../../../../../context/toastContext";
import Dialog from "../../../../../common/dialog";
import { getCreditExecutiveUsers } from "../../../../../shared/services/api/partner-user.api";
import { searchUserByFormattedId } from "../../../../../shared/services/api/user-search.api";
import { getCustomerLoans } from "../../../../../shared/services/api/customer.api";
import { 
  allocateUser, 
  bulkRelocateUsers, 
  getUsersForAllocation,
  BulkUserAllocationRequest 
} from "../../../../../shared/services/api/user-allocation.api";
import { 
  relocateLoan 
} from "../../../../../shared/services/api/loan.api";

interface PartnerUser {
  id: string;
  name: string;
  email: string;
  reportsToId?: string;
  reportsTo?: { id: string}
}

interface User {
  id: string;
  phoneNumber: string;
  formattedUserId?: string;
  userDetails?: {
    firstName?: string;
    lastName?: string;
  };
  allocatedPartnerUser?: {
    id: string;
    name: string;
  } | null;
  allottedPartners?: Array<{
    partnerUser?: {
      id: string;
      name: string;
    };
  }>;
  loans?: Array<{
    id: string;
    formattedLoanId: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
  createdAt?: string | Date;
}

interface UserReallocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  brandId: string;
  onSuccess: () => void;
}

export const UserReallocationModal: React.FC<UserReallocationModalProps> = ({
  isOpen,
  onClose,
  userId,
  brandId,
  onSuccess,
}) => {
  const [availablePartners, setAvailablePartners] = useState<PartnerUser[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [manualUserId, setManualUserId] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [userError, setUserError] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingLoans, setIsLoadingLoans] = useState(false);
  const [selectedLoanIds, setSelectedLoanIds] = useState<string[]>([]);

  // Bulk allocation states
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkCreatedFrom, setBulkCreatedFrom] = useState("");
  const [bulkCreatedTo, setBulkCreatedTo] = useState("");
  const [bulkSourcePartners, setBulkSourcePartners] = useState<string[]>(["unallocated"]);
  const [bulkTargetPartners, setBulkTargetPartners] = useState<string[]>([]);
  const [previewUsers, setPreviewUsers] = useState<User[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [isAllTime, setIsAllTime] = useState(false);
  const [autoAllocate, setAutoAllocate] = useState(false);
  const [bulkRemarks, setBulkRemarks] = useState("");

  const { showSuccess, showError } = useToast();
  
  // Ref to track current search to prevent race conditions
  const currentSearchRef = useRef<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get the effective user ID - either from props or manual input
  const effectiveUserId = userId || user?.id;

  // Search user by FormattedUserId - stabilized with useCallback
  const searchUserByFormattedIdHandler = useCallback(async (formattedUserId: string) => {
    // Set current search to prevent race conditions
    currentSearchRef.current = formattedUserId;
    
    try {
      setIsSearching(true);
      setUserError("");
      
      const foundUser = await searchUserByFormattedId(brandId, formattedUserId);
      
      // Check if this is still the current search (prevent race conditions)
      if (currentSearchRef.current !== formattedUserId) {
        return;
      }
      
      // Fetch user loans
      let userLoans: any[] = [];
      try {
        setIsLoadingLoans(true);
        const loansResponse = await getCustomerLoans(foundUser.id);
        userLoans = loansResponse.loans || loansResponse || [];
        
        // Filter for pending/active loans only
        userLoans = userLoans.filter(loan => 
          loan.status === 'ACTIVE' || 
          loan.status === 'DISBURSED' || 
          loan.status === 'APPROVED' ||
          loan.status === 'PENDING' ||
          loan.status === 'CREDIT_EXECUTIVE_APPROVED'
        );
      } catch (loanError) {
        console.warn("Could not fetch user loans:", loanError);
        // Continue without loans - non-critical error
      } finally {
        setIsLoadingLoans(false);
      }
      
      setUser({
        id: foundUser.id,
        phoneNumber: foundUser.phoneNumber || '',
        userDetails: {
          firstName: foundUser.userDetails?.firstName || '',
          lastName: foundUser.userDetails?.lastName || '',
        },
        allottedPartners: foundUser.allottedPartner ? [{
          partnerUser: foundUser.allottedPartner
        }] : undefined,
        loans: userLoans.map(loan => ({
          id: loan.id,
          formattedLoanId: loan.formattedLoanId,
          amount: loan.amount,
          status: loan.status,
          createdAt: loan.createdAt || new Date().toISOString(),
        })),
      });
      setUserError("");
    } catch (error: any) {
      // Check if this is still the current search
      if (currentSearchRef.current !== formattedUserId) {
        return;
      }
      
      console.error("Error searching user:", error);
      if (error.response?.status === 404) {
        setUserError("User not found with this ID");
      } else {
        setUserError("Failed to search user");
      }
      setUser(null);
    } finally {
      // Only update loading state if this is still the current search
      if (currentSearchRef.current === formattedUserId) {
        setIsSearching(false);
        currentSearchRef.current = null;
      }
    }
  }, [brandId]);

  // Auto-search when FormattedUserId is entered - optimized to prevent re-renders
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const userId = manualUserId.trim();
    // Only proceed if we have a potentially valid formatted user ID
    if (userId.length >=10) {
      searchTimeoutRef.current = setTimeout(() => {
        // Auto-search when user types a FormattedUserId of correct length (like XXXXXXXXXXX - 15 chars)
        // and it looks like a valid FormattedUserId pattern
        const isValidFormat = /^[A-Z]+\d+$/.test(userId);
        // Don't search if already searching, user exists with same ID, or not valid format
        if (isValidFormat && 
            !isSearching && 
            userId !== user?.id && 
            userId !== currentSearchRef.current && 
            brandId) {
          searchUserByFormattedIdHandler(userId);
        }
      }, 800); // 800ms delay to avoid too many API calls while typing
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [manualUserId, brandId, searchUserByFormattedIdHandler]); // Added searchUserByFormattedIdHandler to dependencies

  // Fetch available partners (credit executives)
  const fetchAvailablePartners = useCallback(async () => {
    if (!brandId) return;

    try {
      const creditExecutives = await getCreditExecutiveUsers(brandId);
      setAvailablePartners(creditExecutives || []);
    } catch (error) {
      console.error("Error fetching available partners:", error);
      showError("Error", "Failed to fetch available partners");
    }
  }, [brandId, showError]);

  // Initialize data when modal opens
  useEffect(() => {
    if (isOpen && brandId) {
      fetchAvailablePartners();
      setSelectedPartnerId("");
    }
  }, [isOpen, brandId, fetchAvailablePartners]);

  // Auto-select single partner for bulk allocation when partners are loaded
  useEffect(() => {
    if (availablePartners.length === 1 && bulkTargetPartners.length === 0) {
      setBulkTargetPartners([availablePartners[0].id]);
    }
  }, [availablePartners, bulkTargetPartners.length]);

  // Implement user allocation API calls
  const handleAllocate = useCallback(async () => {
    if (!effectiveUserId || !selectedPartnerId || !brandId) return;

    setIsLoading(true);
    try {
      // If specific loans are selected, allocate each loan individually
      if (selectedLoanIds.length > 0) {
        let successCount = 0;
        let failedCount = 0;
        const errors: string[] = [];

        // Relocate each selected loan
        for (const loanId of selectedLoanIds) {
          try {
            await relocateLoan(brandId, loanId, selectedPartnerId);
            successCount++;
          } catch (error: any) {
            failedCount++;
            errors.push(`Loan ${loanId}: ${error.response?.data?.message || error.message}`);
            console.error(`Error allocating loan ${loanId}:`, error);
          }
        }

        if (successCount > 0) {
          const failedText = failedCount > 0 ? `, ${failedCount} failed` : '';
          const successMessage = `${successCount} loan(s) allocated successfully${failedText}`;
          showSuccess("Success", successMessage);
        }

        if (failedCount > 0 && successCount === 0) {
          showError("Error", `All ${failedCount} loan allocations failed. ${errors[0] || 'Unknown error'}`);
        } else if (failedCount > 0) {
          showError("Partial Success", `${failedCount} loan(s) failed to allocate. First error: ${errors[0]}`);
        }
      } else {
        // No specific loans selected, allocate the user
        const allocationData: any = {
          newPartnerUserId: selectedPartnerId,
        };

        await allocateUser(effectiveUserId, allocationData);
        showSuccess("Success", "User allocated successfully");
      }

      setSelectedPartnerId("");
      setSelectedLoanIds([]);
      onSuccess();
    } catch (error: any) {
      console.error("Error allocating user:", error);
      showError(
        "Error",
        error.response?.data?.message || "Failed to allocate user"
      );
    } finally {
      setIsLoading(false);
    }
  }, [effectiveUserId, selectedPartnerId, selectedLoanIds, brandId, showSuccess, showError, onSuccess]);

  // Implement bulk user preview
  const fetchUserPreview = useCallback(async () => {
    if (!isAllTime && (!bulkCreatedFrom || !bulkCreatedTo)) return;
    if (!brandId) return;

    setLoadingPreview(true);
    setPreviewUsers([]);
    try {
      const response = await getUsersForAllocation({
        brandId,
        createdFrom: isAllTime ? undefined : bulkCreatedFrom,
        createdTo: isAllTime ? undefined : bulkCreatedTo,
        sourcePartnerUserIds: bulkSourcePartners.length > 0 ? bulkSourcePartners : undefined,
        isAllTime,
        limit: 200,
      });

      const filteredUsers = response.users || [];
      setPreviewUsers(filteredUsers);
    } catch (error: any) {
      console.error("Error fetching user preview:", error);
      showError("Preview Failed", "Failed to fetch user preview");
      setPreviewUsers([]);
    } finally {
      setLoadingPreview(false);
    }
  }, [
    isAllTime,
    bulkCreatedFrom,
    bulkCreatedTo,
    brandId,
    bulkSourcePartners,
    showError,
  ]);

  // Implement bulk user allocation
  const handleBulkAllocate = useCallback(async () => {
    // Validation: dates are required unless it's all time
    if (!isAllTime && (!bulkCreatedFrom || !bulkCreatedTo)) return;
    // Target partner is required unless auto-allocate is on
    if (!autoAllocate && bulkTargetPartners.length === 0) return;

    setBulkLoading(true);
    try {
      const request: BulkUserAllocationRequest = {
        brandId,
        createdFrom: isAllTime ? undefined : bulkCreatedFrom,
        createdTo: isAllTime ? undefined : bulkCreatedTo,
        sourcePartnerUserIds: bulkSourcePartners.length > 0 ? bulkSourcePartners : undefined,
        targetPartnerUserIds: bulkTargetPartners.length > 0 ? bulkTargetPartners : undefined,
        isAllTime,
        remarks: bulkRemarks.trim() || undefined,
      };

      const result = await bulkRelocateUsers(request);
      
      showSuccess("Success", `${result.message}. Allocated: ${result.allocatedCount}, Failed: ${result.failedCount}`);
      
      // Reset form on success
      setBulkCreatedFrom("");
      setBulkCreatedTo("");
      setBulkSourcePartners([]);
      setBulkTargetPartners([]);
      setBulkRemarks("");
      setPreviewUsers([]);
      setIsAllTime(false);
      setAutoAllocate(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error during bulk allocation:", error);
      showError("Error", error.response?.data?.message || "Failed to allocate users in bulk");
    } finally {
      setBulkLoading(false);
    }
  }, [
    isAllTime,
    bulkCreatedFrom,
    bulkCreatedTo,
    autoAllocate,
    bulkTargetPartners,
    brandId,
    bulkSourcePartners,
    bulkRemarks,
    showSuccess,
    showError,
    onSuccess,
  ]);

  // Handle modal close with cleanup
  const handleClose = useCallback(() => {
    // Clear search timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    
    setManualUserId("");
    setUser(null);
    setUserError("");
    setSelectedPartnerId("");
    setIsSearching(false);
    setIsLoadingLoans(false);
    setSelectedLoanIds([]);
    // Clear current search reference
    currentSearchRef.current = null;
    // Reset bulk allocation states
    setBulkMode(false);
    setBulkCreatedFrom("");
    setBulkCreatedTo("");
    setBulkSourcePartners(["unallocated"]); // Default to unallocated users
    setBulkTargetPartners([]);
    setPreviewUsers([]);
    setIsAllTime(false);
    setAutoAllocate(false);
    setBulkRemarks("");
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="User Partner Reallocation"
    >
      <div>
        {/* Mode Selection */}
        <div className="mb-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setBulkMode(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !bulkMode
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <HiOutlineUser className="inline mr-2" />
              Single User
            </button>
            <button
              onClick={() => setBulkMode(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                bulkMode
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <HiOutlineClipboardList className="inline mr-2" />
              Bulk Allocation
            </button>
          </div>
        </div>

        {/* Bulk Allocation Mode */}
        {bulkMode ? (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <div className="flex items-start">
                <HiOutlineCalendar className="text-yellow-600 mr-3 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Bulk User Allocation</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    This will allocate users matching the criteria to selected partners using round-robin distribution.
                    You can filter by registration date and source partners.
                  </p>
                  <p className="text-xs text-yellow-600 mt-2 font-medium">
                    💡 Multi-partner allocation distributes users evenly across selected partners.
                  </p>
                </div>
              </div>
            </div>

            {/* Creation Date Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Registration Date Range {!isAllTime && <span className="text-red-500">*</span>}
                </label>
                <button
                  onClick={() => {
                    setIsAllTime(!isAllTime);
                    if (!isAllTime) {
                      setBulkCreatedFrom("");
                      setBulkCreatedTo("");
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    isAllTime
                      ? "bg-purple-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                  disabled={bulkLoading}
                >
                  All Time
                </button>
              </div>

              {!isAllTime ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="date"
                      value={bulkCreatedFrom}
                      onChange={(e) => setBulkCreatedFrom(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="From Date"
                      disabled={bulkLoading}
                    />
                    <p className="text-xs text-gray-500 mt-1">From Date</p>
                  </div>
                  <div>
                    <input
                      type="date"
                      value={bulkCreatedTo}
                      onChange={(e) => setBulkCreatedTo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="To Date"
                      disabled={bulkLoading}
                    />
                    <p className="text-xs text-gray-500 mt-1">To Date</p>
                  </div>
                </div>
              ) : (
                <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
                  <p className="text-sm text-purple-800 font-medium">
                    ✨ All Time Mode Active
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    This will process all users regardless of their registration date
                  </p>
                </div>
              )}
            </div>

            {/* Source Partner Filter (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Credit Executive(s) (Optional)
              </label>
              <div className="space-y-2">
                {/* Option for All Partners */}
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={bulkSourcePartners.length === 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setBulkSourcePartners([]);
                      }
                    }}
                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={bulkLoading}
                  />
                  <span className="text-sm">All Partners</span>
                </label>

                {/* Option for Unallocated */}
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={bulkSourcePartners.includes("unallocated")}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setBulkSourcePartners(["unallocated"]);
                      } else {
                        setBulkSourcePartners(bulkSourcePartners.filter(id => id !== "unallocated"));
                      }
                    }}
                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={bulkLoading}
                  />
                  <span className="text-sm">Unallocated Users</span>
                </label>

                {/* Individual Partners */}
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2 space-y-1">
                  {availablePartners.map((partner) => (
                    <label key={partner.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={bulkSourcePartners.includes(partner.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBulkSourcePartners([...bulkSourcePartners.filter(id => id !== "unallocated"), partner.id]);
                          } else {
                            setBulkSourcePartners(bulkSourcePartners.filter(id => id !== partner.id));
                          }
                        }}
                        className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={bulkLoading || bulkSourcePartners.includes("unallocated")}
                      />
                      <span className="text-sm">{partner.name} - {partner.email}</span>
                    </label>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {(() => {
                  if (bulkSourcePartners.includes("unallocated")) {
                    return "Only users that are not currently assigned to any partner will be processed";
                  } else if (bulkSourcePartners.length > 0) {
                    return `Selected ${bulkSourcePartners.length} partner(s). Only users currently assigned to these partners will be reallocated`;
                  } else {
                    return "All partners selected. Users from any partner (or unallocated) will be processed";
                  }
                })()}
              </p>
            </div>

            {/* Target Partner Selection */}
            {availablePartners.length > 1 && !autoAllocate && (
              <div>
                <div className="block text-sm font-medium text-gray-700 mb-2">
                  To Credit Executive(s) <span className="text-red-500">*</span>
                </div>
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-1">
                  {availablePartners.map((partner) => (
                    <label key={partner.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={bulkTargetPartners.includes(partner.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBulkTargetPartners([...bulkTargetPartners, partner.id]);
                          } else {
                            setBulkTargetPartners(bulkTargetPartners.filter(id => id !== partner.id));
                          }
                        }}
                        className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={bulkLoading}
                      />
                      <span className="text-sm">{partner.name} - {partner.email}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Select one or more credit executives to assign the users to. 
                  {bulkTargetPartners.length > 0 && ` ${bulkTargetPartners.length} selected.`}
                </p>
              </div>
            )}

            {/* Remarks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remarks (Optional)
              </label>
              <textarea
                value={bulkRemarks}
                onChange={(e) => setBulkRemarks(e.target.value)}
                placeholder="Enter any remarks for this allocation..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                disabled={bulkLoading}
              />
            </div>

            {/* Auto Allocate Toggle */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Auto Allocate
                  </label>
                  <p className="text-xs text-gray-500">
                    When enabled, users will be automatically distributed among all available credit executives
                  </p>
                </div>
                <button
                  onClick={() => setAutoAllocate(!autoAllocate)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    autoAllocate
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                  disabled={bulkLoading}
                >
                  {autoAllocate ? "ON" : "OFF"}
                </button>
              </div>
            </div>

            {/* Preview Button */}
            <div>
              <Button
                onClick={fetchUserPreview}
                disabled={loadingPreview}
                className="w-full"
                variant="outline"
              >
                {loadingPreview ? (
                  <>
                    <CgSpinner className="animate-spin mr-2" />
                    Loading Preview...
                  </>
                ) : (
                  <>
                    <HiOutlineClipboardList className="mr-2" />
                    Refresh Preview
                  </>
                )}
              </Button>
            </div>

            {/* User Preview */}
            {previewUsers.length > 0 ? (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">
                  Preview: {previewUsers.length} users found
                </h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {previewUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded"
                    >
                      <div>
                        <span className="font-mono text-sm">{user.phoneNumber}</span>
                        <span className="ml-2 text-sm text-gray-600">
                          {user.formattedUserId || "N/A"}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">
                          Current: {user.allocatedPartnerUser?.name || "Unassigned"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              (isAllTime || (bulkCreatedFrom && bulkCreatedTo)) && previewUsers.length === 0 && !loadingPreview && (
                <div className="border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-gray-500">
                    <HiOutlineCalendar className="mx-auto text-3xl mb-2" />
                    <p className="text-sm">No users found for the selected criteria</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {isAllTime 
                        ? "Try adjusting the source partner filter"
                        : "Try adjusting the registration date range or source partner filter"
                      }
                    </p>
                  </div>
                </div>
              )
            )}

            {/* Bulk Allocate Button */}
            <Button
              onClick={handleBulkAllocate}
              disabled={(!isAllTime && (!bulkCreatedFrom || !bulkCreatedTo)) || (!autoAllocate && bulkTargetPartners.length === 0) || bulkLoading}
              className="w-full"
              variant="primary"
            >
              {bulkLoading ? (
                <>
                  <CgSpinner className="animate-spin mr-2" />
                  Allocating users...
                </>
              ) : (
                <>
                  {(() => {
                    if (autoAllocate) {
                      return "Auto Allocate Users";
                    }
                    const baseText = "Allocate Users";
                    const partnerSuffix = bulkTargetPartners.length > 1 
                      ? ` to ${bulkTargetPartners.length} Partners`
                      : '';
                    return baseText + partnerSuffix;
                  })()}
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Single User Mode */}
            {!userId && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enter User FormattedUserId <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={manualUserId}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setManualUserId(newValue);
                      
                      // Clear previous results only when user starts typing a significantly different ID
                      if (user && newValue.length < user.id.length - 3) {
                        setUser(null);
                      }
                      // Clear errors when user provides reasonable input
                      if (userError && newValue.length >= 10) {
                        setUserError("");
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 pr-10"
                    placeholder="e.g. XXXXXXXXXXXXX (auto-search when complete)"
                    disabled={isSearching}
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <CgSpinner className="animate-spin text-blue-500" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Search will automatically trigger when you enter a complete FormattedUserId
                </p>

                {/* Loading state removed since we're using props-based userId */}

                {userError && (
                  <div className="mt-2 text-sm text-red-600">{userError}</div>
                )}

                {user && (
                  <div className="mt-3 bg-blue-50 border border-blue-200 p-3 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">User Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Phone:</span>
                        <span className="ml-2 font-mono">{user.phoneNumber}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Name:</span>
                        <span className="ml-2">
                          {[
                            user.userDetails?.firstName,
                            user.userDetails?.lastName,
                          ]
                            .filter(Boolean)
                            .join(" ") || "N/A"}
                        </span>
                      </div>
                    </div>
                    
                    {isLoadingLoans && (
                      <div className="mt-2 text-xs text-blue-600 flex items-center">
                        <CgSpinner className="animate-spin mr-1" />
                        Loading loans...
                      </div>
                    )}
                    
                    {!isLoadingLoans && user.loans && user.loans.length > 0 && (
                      <div className="mt-2 text-xs text-green-600">
                        ✓ Found {user.loans.length} active loan(s)
                      </div>
                    )}
                    
                    {!isLoadingLoans && (!user.loans || user.loans.length === 0) && (
                      <div className="mt-2 text-xs text-gray-500">
                        No active loans found
                      </div>
                    )}
                  </div>
                )}

                {/* Loan Selection Section */}
                {user?.loans?.length && (
                  <div className="bg-white rounded-lg border border-gray-300 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <div className="flex items-center gap-2">
                        <HiOutlineClipboardList className="w-4 h-4 text-blue-600" />
                        <div>
                          <h4 className="text-base font-semibold text-gray-900">
                            Pending Loans ({user.loans.length})
                          </h4>
                          <p className="text-xs text-gray-600">
                            Select specific loans to relocate
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedLoanIds(user.loans?.map(loan => loan.id) || [])}
                            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            Select All
                          </button>
                          <button
                            onClick={() => setSelectedLoanIds([])}
                            className="text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                          >
                            Clear
                          </button>
                        </div>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {selectedLoanIds.length}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
                      {user.loans.map((loan) => {
                        const getStatusColor = (status: string) => {
                          if (status === 'ACTIVE') return 'bg-green-100 text-green-800';
                          if (status === 'DISBURSED') return 'bg-blue-100 text-blue-800';
                          if (status === 'APPROVED') return 'bg-purple-100 text-purple-800';
                          if (status === 'PENDING') return 'bg-yellow-100 text-yellow-800';
                          return 'bg-gray-100 text-gray-800';
                        };

                        return (
                          <label
                            key={loan.id}
                            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:shadow-sm transition ${
                              selectedLoanIds.includes(loan.id)
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                            aria-label={`Select loan ${loan.formattedLoanId}`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedLoanIds.includes(loan.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedLoanIds([...selectedLoanIds, loan.id]);
                                } else {
                                  setSelectedLoanIds(selectedLoanIds.filter(id => id !== loan.id));
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs min-w-0">
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                  #{loan.formattedLoanId}
                                </p>
                                <p className="text-gray-500 truncate">
                                  {new Date(loan.createdAt).toLocaleDateString('en-IN')}
                                </p>
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900">
                                  BHD{loan.amount?.toLocaleString('en-IN') || 'N/A'}
                                </p>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(loan.status)}`}>
                                  {loan.status.split('_').join(' ')}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-gray-700 text-xs">
                                  Current allocation will be transferred
                                </p>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                      <p className="text-xs text-gray-600">
                        <strong>{selectedLoanIds.length}</strong> of <strong>{user.loans.length}</strong> loans selected for reallocation.
                        {selectedLoanIds.length === 0 && " Select loans above or allocate the user without specific loan selection."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Add New Partner Section */}
            {effectiveUserId && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Allocate Partner
                </h3>

                <div className="space-y-4">
                  {/* Partner Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Partner
                    </label>
                    <select
                      value={selectedPartnerId}
                      onChange={(e) => setSelectedPartnerId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isLoading}
                    >
                      <option value="">Choose a partner...</option>
                      {availablePartners.map((partner) => {
                    const role = partner.reportsTo?.id
                          ? "Executive"
                          : "Manager/Head";
                        return (
                          <option key={partner.id} value={partner.id}>
                            {partner.name} ({role}) - {partner.email}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Allocate Button */}
                  <Button
                    onClick={handleAllocate}
                    disabled={!selectedPartnerId || isLoading}
                    className="w-full"
                    variant='primary'
                  >
                    {(() => {
                      if (isLoading) return "Allocating...";
                      if (selectedLoanIds.length > 0) {
                        return `Allocate User & ${selectedLoanIds.length} Selected Loans`;
                      }
                      return "Allocate User";
                    })()}
                  </Button>
                  
                  {selectedLoanIds.length > 0 && (
                    <p className="text-xs text-gray-600 mt-2 text-center">
                      Only selected loans will be transferred to the new partner
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
};

export function Users() {
  return <div>Users Component</div>;
}