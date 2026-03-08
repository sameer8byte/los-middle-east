import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  HiOutlineUser,
  HiOutlineCalendar,
  HiOutlineClipboardList,
  HiOutlineSearch,
} from "react-icons/hi";
import { CgSpinner } from "react-icons/cg";
import { Button } from "../../../../../common/ui/button";
import { useToast } from "../../../../../context/toastContext";
import Dialog from "../../../../../common/dialog";
import {
  getLoanById,
  relocateLoan,
  bulkRelocateLoans,
  getLoansForAllocation,
} from "../../../../../shared/services/api/loan.api";
import { getCreditExecutiveUsers } from "../../../../../shared/services/api/partner-user.api";
import { Loan } from "../../../../../shared/types/loan";
import { PartnerUser } from "../../../../../shared/types/partnerUser";

interface LoanReallocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanId: string | null;
  brandId: string;
  onSuccess: () => void;
}

export const LoanReallocationModal: React.FC<LoanReallocationModalProps> = ({
  isOpen,
  onClose,
  loanId,
  brandId,
  onSuccess,
}) => {
  const [availablePartners, setAvailablePartners] = useState<PartnerUser[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [manualLoanId, setManualLoanId] = useState("");
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loadingLoan, setLoadingLoan] = useState(false);
  const [loanError, setLoanError] = useState<string>("");
  const [displayedLoans, setDisplayedLoans] = useState<Loan[]>([]);
  const [selectedLoans, setSelectedLoans] = useState<Set<string>>(new Set());

  // Bulk allocation states
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkCreatedFrom, setBulkCreatedFrom] = useState("");
  const [bulkCreatedTo, setBulkCreatedTo] = useState("");
  const [bulkSourcePartners, setBulkSourcePartners] = useState<string[]>([
    "unallocated",
  ]);
  const [bulkTargetPartners, setBulkTargetPartners] = useState<string[]>([]);
  const [previewLoans, setPreviewLoans] = useState<Loan[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [isAllTime, setIsAllTime] = useState(false);
  const [autoAllocate, setAutoAllocate] = useState(false);
  const [bulkRemarks, setBulkRemarks] = useState("");

  const { showSuccess, showError } = useToast();

  // Ref to track current search to prevent race conditions
  const currentSearchRef = useRef<string | null>(null);

  // Search loan function with race condition protection
  const searchLoanById = useCallback(
    async (searchLoanId: string) => {
      const input = searchLoanId.trim();

      // Mobile formats allowed:
      const isMobile = /^(\+91|91)?[6-9][0-9]{9}$/.test(input);

      // PAN format
      const isPan = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(input);

      // Loan ID (anything > 11 chars)
      const isLoanId = input.length > 11;

      if (!isMobile && !isPan && !isLoanId) {
        return;
      }
      if (!brandId || !isOpen || loanId) return;

      // Set current search to prevent race conditions
      currentSearchRef.current = searchLoanId;

      setLoadingLoan(true);
      setLoanError("");

      try {
        const response = await getLoanById(brandId, searchLoanId.trim());

        // Check if this is still the current search (prevent race conditions)
        if (currentSearchRef.current !== searchLoanId) {
          return;
        }

        if (response) {
          setLoan(response);
          setDisplayedLoans([response]);
          setLoanError("");
          // Auto-check the found loan
          setSelectedLoans(new Set([response.id]));
        } else {
          setLoanError("Loan not found");
          setLoan(null);
          setDisplayedLoans([]);
          setSelectedLoans(new Set());
        }
      } catch (err: any) {
        // Check if this is still the current search
        if (currentSearchRef.current !== searchLoanId) {
          return;
        }

        if (err.response?.status === 404) {
          setLoanError("Loan not found");
        } else {
          setLoanError("Failed to fetch loan details");
        }
        setLoan(null);
        setDisplayedLoans([]);
        setSelectedLoans(new Set());
        console.error("Error fetching loan:", err);
      } finally {
        // Only update loading state if this is still the current search
        if (currentSearchRef.current === searchLoanId) {
          setLoadingLoan(false);
          currentSearchRef.current = null;
        }
      }
    },
    [brandId, isOpen, loanId]
  );

  // Auto-search with debounce when loan ID is entered
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const searchId = manualLoanId.trim();

      // Only search if ID is long enough and different from current loan
      if (
        // searchId.length > 11 &&
        searchId !== loan?.formattedLoanId &&
        searchId !== currentSearchRef.current &&
        brandId &&
        isOpen &&
        !loanId
      ) {
        searchLoanById(searchId);
      }
    }, 800); // 800ms delay to avoid too many API calls while typing

    return () => clearTimeout(timeoutId);
  }, [
    manualLoanId,
    loan?.formattedLoanId,
    brandId,
    isOpen,
    loanId,
    searchLoanById,
  ]);

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
      setSelectedLoans(new Set(displayedLoans.map((l) => l.id)));
    } else {
      setSelectedLoans(new Set());
    }
  };

  // Fetch all pending loans by default
  const fetchPendingLoans = useCallback(async () => {
    if (!brandId || bulkMode) return;

    try {
      setLoadingLoan(true);
      const response = await getLoansForAllocation(brandId, {
        loanStatus: ["PENDING"],
        limit: 200,
      });

      const loans = response.loans || [];
      setDisplayedLoans(loans);

      // Do NOT auto-select loans - let user select manually
      setSelectedLoans(new Set());
    } catch (error) {
      console.error("Error fetching pending loans:", error);
      setDisplayedLoans([]);
    } finally {
      setLoadingLoan(false);
    }
  }, [brandId, bulkMode]);

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
      // Fetch pending loans by default in single loan mode
      if (!bulkMode && !loanId) {
        fetchPendingLoans();
      }
      // Auto-select single partner for bulk allocation
      if (availablePartners.length === 1) {
        setBulkTargetPartners([availablePartners[0].id]);
      }
    }
  }, [
    isOpen,
    brandId,
    availablePartners.length,
    bulkMode,
    loanId,
    fetchPendingLoans,
  ]);

  // Handle partner allocation
  const handleAllocate = useCallback(async () => {
    if (selectedLoans.size === 0 || !selectedPartnerId) return;

    setIsLoading(true);
    try {
      // Allocate all selected loans to the same partner
      const allocationPromises = Array.from(selectedLoans).map((loanId) =>
        relocateLoan(brandId, loanId, selectedPartnerId)
      );

      await Promise.all(allocationPromises);

      const loanCount = selectedLoans.size;
      showSuccess(
        "Success",
        `${loanCount} loan${
          loanCount === 1 ? " was" : "s were"
        } allocated successfully`
      );

      setSelectedPartnerId("");
      setSelectedLoans(new Set());
      onSuccess();
    } catch (error: any) {
      console.error("Error allocating loans:", error);
      showError(
        "Error",
        error.response?.data?.message || "Failed to allocate loans"
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedLoans,
    selectedPartnerId,
    brandId,
    showSuccess,
    showError,
    onSuccess,
  ]);

  // Fetch loan preview for bulk allocation
  const fetchLoanPreview = useCallback(async () => {
    if (!isAllTime && (!bulkCreatedFrom || !bulkCreatedTo)) return;
    if (!brandId) return;

    setLoadingPreview(true);
    setPreviewLoans([]);
    try {
      // Only pending loans can be reallocated
      const statusFilter = ["PENDING"];

      const response = await getLoansForAllocation(brandId, {
        createdFrom: isAllTime ? undefined : bulkCreatedFrom,
        createdTo: isAllTime ? undefined : bulkCreatedTo,
        sourcePartnerUserIds:
          bulkSourcePartners.length > 0 ? bulkSourcePartners : undefined,
        loanStatus: statusFilter,
        isAllTime,
        limit: 200,
      });

      const filteredLoans = response.loans || [];
      setPreviewLoans(filteredLoans);

      if (filteredLoans.length === 0) {
        showError("No Loans Found", "No loans found for the selected criteria");
      } else {
        showSuccess(
          "Preview Loaded",
          `Found ${filteredLoans.length} loans matching your criteria`
        );
      }
    } catch (error: any) {
      console.error("Error fetching loan preview:", error);
      showError("Preview Failed", "Failed to fetch loan preview");
      setPreviewLoans([]);
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
    showSuccess,
  ]);

  // Handle bulk allocation
  const handleBulkAllocate = useCallback(async () => {
    // Validation: dates are required unless it's all time
    if (!isAllTime && (!bulkCreatedFrom || !bulkCreatedTo)) return;
    // Target partner is required unless auto-allocate is on
    if (!autoAllocate && bulkTargetPartners.length === 0) return;

    setBulkLoading(true);
    try {
      // Only pending loans can be reallocated
      const statusFilter = ["PENDING"];

      const result = await bulkRelocateLoans(brandId, {
        createdFrom: isAllTime ? undefined : bulkCreatedFrom,
        createdTo: isAllTime ? undefined : bulkCreatedTo,
        sourcePartnerUserIds:
          bulkSourcePartners.length > 0 ? bulkSourcePartners : undefined,
        targetPartnerUserIds:
          bulkTargetPartners.length > 0 ? bulkTargetPartners : undefined,
        loanStatus: statusFilter,
        isAllTime,
        remarks: bulkRemarks.trim() || undefined,
      });

      let successMessage = `${result.loansAllocated} loans allocated successfully to ${result.partnersCount} partner(s)!`;

      // Add allocation summary if available
      if (result.allocationSummary && result.allocationSummary.length > 0) {
        const summaryText = result.allocationSummary
          .map(
            (summary: any) =>
              `${summary.partnerName}: ${summary.allocatedLoans} loans`
          )
          .join(", ");
        successMessage += `\n\nDistribution: ${summaryText}`;
      }

      showSuccess("Success", successMessage);

      setBulkCreatedFrom("");
      setBulkCreatedTo("");
      setBulkSourcePartners([]);
      setBulkTargetPartners([]);
      setBulkRemarks("");
      setPreviewLoans([]);
      setIsAllTime(false);
      setAutoAllocate(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error during bulk allocation:", error);
      showError(
        "Error",
        error.response?.data?.message || "Failed to allocate loans in bulk"
      );
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
    setManualLoanId("");
    setLoan(null);
    setLoanError("");
    setSelectedPartnerId("");
    setDisplayedLoans([]);
    setSelectedLoans(new Set());
    // Reset bulk allocation states
    setBulkMode(false);
    setBulkCreatedFrom("");
    setBulkCreatedTo("");
    setBulkSourcePartners([]);
    setBulkTargetPartners([]);
    setPreviewLoans([]);
    setIsAllTime(false);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Loan Partner Reallocation"
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
              Single Loan
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
                  <h4 className="font-medium text-yellow-800">
                    Bulk Loan Allocation
                  </h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    This will allocate pending loans matching the criteria to
                    selected partners using round-robin distribution. You can
                    filter by creation date and source partners.
                  </p>
                  <p className="text-xs text-yellow-600 mt-2 font-medium">
                    💡 Only pending loans can be reallocated. Multi-partner
                    allocation distributes loans evenly across selected
                    partners.
                  </p>
                </div>
              </div>
            </div>

            {/* Creation Date Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Creation Date Range{" "}
                  {!isAllTime && <span className="text-red-500">*</span>}
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
                    This will process all loans regardless of their creation
                    date
                  </p>
                </div>
              )}
            </div>

            {/* Source Partner Filter (Optional) */}
            <div>
              <h4 className="block text-sm font-medium text-gray-700 mb-2">
                From Credit Executive(s) (Optional)
              </h4>
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
                        setBulkSourcePartners(
                          bulkSourcePartners.filter(
                            (id) => id !== "unallocated"
                          )
                        );
                      }
                    }}
                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={bulkLoading}
                  />
                  <span className="text-sm">Unallocated Loans</span>
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
                            setBulkSourcePartners([
                              ...bulkSourcePartners.filter(
                                (id) => id !== "unallocated"
                              ),
                              partner.id,
                            ]);
                          } else {
                            setBulkSourcePartners(
                              bulkSourcePartners.filter(
                                (id) => id !== partner.id
                              )
                            );
                          }
                        }}
                        className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={
                          bulkLoading ||
                          bulkSourcePartners.includes("unallocated")
                        }
                      />
                      <span className="text-sm">
                        {partner.name} - {partner.email}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {(() => {
                  if (bulkSourcePartners.includes("unallocated")) {
                    return "Only loans that are not currently assigned to any partner will be processed";
                  } else if (bulkSourcePartners.length > 0) {
                    return `Selected ${bulkSourcePartners.length} partner(s). Only loans currently assigned to these partners will be reallocated`;
                  } else {
                    return "All partners selected. Loans from any partner (or unallocated) will be processed";
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
                            setBulkTargetPartners([
                              ...bulkTargetPartners,
                              partner.id,
                            ]);
                          } else {
                            setBulkTargetPartners(
                              bulkTargetPartners.filter(
                                (id) => id !== partner.id
                              )
                            );
                          }
                        }}
                        className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={bulkLoading}
                      />
                      <span className="text-sm">
                        {partner.name} - {partner.email}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Select one or more credit executives to assign the loans to.
                  {bulkTargetPartners.length > 0 &&
                    ` ${bulkTargetPartners.length} selected.`}
                </p>
              </div>
            )}

            {/* Remarks */}
            <div>
              <label
                htmlFor="bulk-remarks"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Remarks (Optional)
              </label>
              <textarea
                id="bulk-remarks"
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
                  <div className="block text-sm font-medium text-gray-700 mb-1">
                    Auto Allocate
                  </div>
                  <p className="text-xs text-gray-500">
                    When enabled, loans will be automatically distributed among
                    all available loan officers
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
                onClick={fetchLoanPreview}
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

            {/* Loan Preview */}
            {previewLoans.length > 0 ? (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">
                  Preview: {previewLoans.length} loans found
                </h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {previewLoans.map((loan) => (
                    <div
                      key={loan.id}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">
                            {loan.formattedLoanId}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              (loan as any)?.is_repeat_loan
                                ? "bg-blue-100 text-blue-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {(loan as any)?.is_repeat_loan ? "Repeat" : "Fresh"}
                          </span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {[
                            loan.user?.userDetails?.firstName,
                            loan.user?.userDetails?.lastName,
                          ]
                            .filter(Boolean)
                            .join(" ") || "N/A"}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          BHD{loan.amount?.toLocaleString("en-IN")}
                        </div>
                        <div className="text-xs text-gray-500">
                          Status: {loan.status}
                        </div>
                        <div className="text-xs text-gray-500">
                          Current:{" "}
                          {loan.allottedPartners?.[0]?.partnerUser?.name ||
                            "Unassigned"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              (isAllTime || (bulkCreatedFrom && bulkCreatedTo)) &&
              previewLoans.length === 0 &&
              !loadingPreview && (
                <div className="border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-gray-500">
                    <HiOutlineCalendar className="mx-auto text-3xl mb-2" />
                    <p className="text-sm">
                      No loans found for the selected criteria
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {isAllTime
                        ? "Try adjusting the source partner filter or loan status"
                        : "Try adjusting the creation date range or source partner filter"}
                    </p>
                  </div>
                </div>
              )
            )}

            {/* Bulk Allocate Button */}
            <Button
              onClick={handleBulkAllocate}
              disabled={
                (!isAllTime && (!bulkCreatedFrom || !bulkCreatedTo)) ||
                (!autoAllocate && bulkTargetPartners.length === 0) ||
                bulkLoading
              }
              className="w-full"
              variant="primary"
            >
              {bulkLoading ? (
                <>
                  <CgSpinner className="animate-spin mr-2" />
                  Allocating loans...
                </>
              ) : (
                <>
                  {(() => {
                    if (autoAllocate) {
                      return "Auto Allocate Loans";
                    }
                    const baseText = "Allocate Loans";
                    const partnerSuffix =
                      bulkTargetPartners.length > 1
                        ? ` to ${bulkTargetPartners.length} Partners`
                        : "";
                    return baseText + partnerSuffix;
                  })()}
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Single Loan Mode */}
            {!loanId && (
              <div className="mb-6">
                {/* Info Message */}
                {displayedLoans.length > 0 && !manualLoanId && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium">
                      ℹ️ {displayedLoans.length} pending loan
                      {displayedLoans.length === 1 ? "" : "s"} available. Select
                      loans to allocate.
                    </p>
                  </div>
                )}

                {/* Enhanced Search Bar */}
                <div className="relative mb-4">
                  <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={manualLoanId}
                    onChange={(e) => setManualLoanId(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500 transition"
                    placeholder="Search loans by ID, customer name..."
                    disabled={loadingLoan || isLoading}
                  />
                  {manualLoanId && (
                    <button
                      onClick={() => {
                        setManualLoanId("");
                        setLoan(null);
                        setLoanError("");
                        // Reload default pending loans
                        fetchPendingLoans();
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                    >
                      ✕
                    </button>
                  )}
                </div>

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

                {loan && (
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-4 rounded-lg shadow-sm">
                    <h4 className="font-semibold text-blue-900 mb-3">
                      Loan Details
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs text-blue-700 opacity-80">
                            Loan ID
                          </p>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              (loan as any)?.is_repeat_loan
                                ? "bg-blue-100 text-blue-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {(loan as any)?.is_repeat_loan ? "Repeat" : "Fresh"}
                          </span>
                        </div>
                        <p className="font-mono font-semibold text-blue-900">
                          {loan.formattedLoanId}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-700 opacity-80 mb-1">
                          Amount
                        </p>
                        <p className="font-semibold text-blue-900">
                          BHD{loan.amount?.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-700 opacity-80 mb-1">
                          Status
                        </p>
                        <span className="inline-block px-2.5 py-1 bg-blue-200 text-blue-800 rounded-full text-xs font-medium">
                          {loan.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-blue-700 opacity-80 mb-1">
                          Customer
                        </p>
                        <p className="text-blue-900">
                          {[
                            loan.user?.userDetails?.firstName,
                            loan.user?.userDetails?.lastName,
                          ]
                            .filter(Boolean)
                            .join(" ") || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Add New Partner Section - MOVED UP */}
                {selectedLoans.size > 0 && (
                  <div className="border-t pt-6 mt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      Allocate Partner ({selectedLoans.size} loan
                      {selectedLoans.size === 1 ? "" : "s"} selected)
                    </h3>

                    <div className="space-y-4">
                      {/* Partner Selection */}
                      <div>
                        <label
                          htmlFor="partner-select"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Select Partner <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="partner-select"
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
                        variant="primary"
                      >
                        {isLoading ? (
                          <>
                            <CgSpinner className="animate-spin mr-2" />
                            Allocating...
                          </>
                        ) : (
                          `Allocate ${selectedLoans.size} Loan${
                            selectedLoans.size === 1 ? "" : "s"
                          }`
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Display Searched Loans */}
                {displayedLoans.length > 0 && (
                  <div className="border border-gray-300 rounded-lg p-4 mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">
                        Available Loans: {displayedLoans.length}
                      </h4>
                      {displayedLoans.length > 0 && (
                        <div className="flex items-center gap-3">
                          <label className="flex items-center text-sm font-medium text-gray-700">
                            <input
                              type="checkbox"
                              checked={
                                selectedLoans.size === displayedLoans.length &&
                                displayedLoans.length > 0
                              }
                              onChange={(e) =>
                                handleSelectAll(e.target.checked)
                              }
                              className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>Select All</span>
                          </label>
                          {selectedLoans.size > 0 && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                              {selectedLoans.size} selected
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {displayedLoans.map((displayLoan) => (
                        <div
                          key={displayLoan.id}
                          className={`flex items-center p-4 border rounded-lg hover:shadow-md transition ${
                            selectedLoans.has(displayLoan.id)
                              ? "border-blue-600 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <label className="flex items-center cursor-pointer flex-1 gap-4">
                            <input
                              type="checkbox"
                              checked={selectedLoans.has(displayLoan.id)}
                              onChange={(e) =>
                                handleLoanSelection(
                                  displayLoan.id,
                                  e.target.checked
                                )
                              }
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                              aria-label={`Select loan ${displayLoan.formattedLoanId}`}
                            />
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-gray-600 text-xs">
                                    Loan ID
                                  </p>
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                      (displayLoan as any).is_repeat_loan
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-green-100 text-green-800"
                                    }`}
                                  >
                                    {(displayLoan as any).is_repeat_loan ? "Repeat" : "Fresh"}
                                  </span>
                                </div>
                                <p className="font-mono font-semibold text-gray-900">
                                  {displayLoan.formattedLoanId}
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                  {[
                                    displayLoan.user?.userDetails?.firstName,
                                    displayLoan.user?.userDetails?.lastName,
                                  ]
                                    .filter(Boolean)
                                    .join(" ") || "N/A"}
                                </p>
                                {displayLoan.user?.phoneNumber && (
                                  <p className="text-xs text-gray-500">
                                    {displayLoan.user.phoneNumber}
                                  </p>
                                )}
                              </div>
                              <div>
                                <p className="text-gray-600 text-xs mb-1">
                                  Amount
                                </p>
                                <p className="font-semibold text-gray-900">
                                  BHD{displayLoan.amount?.toLocaleString("en-IN")}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600 text-xs mb-1">
                                  Status
                                </p>
                                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                  {displayLoan.status}
                                </span>
                              </div>
                              <div>
                                <p className="text-gray-600 text-xs mb-1">
                                  Assigned To
                                </p>
                                <p className="text-gray-900 text-sm">
                                  {displayLoan.allottedPartners &&
                                  displayLoan.allottedPartners.length > 0
                                    ? displayLoan.allottedPartners
                                        .map((p) => p.partnerUser?.name)
                                        .join(", ")
                                    : "Unassigned"}
                                </p>
                              </div>
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
};

export function Loans() {
  return <div>Loans Component</div>;
}
