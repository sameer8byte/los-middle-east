import React, { useState, useEffect, useCallback } from "react";
import { HiOutlineUser, HiOutlineCalendar, HiOutlineClipboardList, HiOutlineSearch } from "react-icons/hi";
import { CgSpinner } from "react-icons/cg";
import { Button } from "../../../../../common/ui/button";
import { useToast } from "../../../../../context/toastContext";
import {
  allocateCollectionPartner,
  bulkAllocateCollectionPartnersByDueDate,
  getLoansByDueDateAndPartner,
  BulkAllocationRequest,
  LoanPreview,
} from "../../../../../shared/services/api/loan.api";
import { getCollectionExecutiveUsers } from "../../../../../shared/services/api/partner-user.api";
import { getCollection } from "../../../../../shared/services/api/collection.api";
import Dialog from "../../../../../common/dialog";
import dayjs from "dayjs";
import { PartnerUser } from "../../../../../shared/types/partnerUser";

interface CollectionPartner {
  id: string;
  partnerUserId: string;
  allocatedAt: string;
  isActive: boolean;
  remarks?: string;
  partnerUser: {
    id: string;
    name: string;
    email: string;
    reportsToId?: string;
  };
}

interface CollectionReallocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanId: string | null;
  brandId: string;
  onSuccess: () => void;
}

export const CollectionReallocationModal: React.FC<
  CollectionReallocationModalProps
> = ({ isOpen, onClose, loanId, brandId, onSuccess }) => {
  const [currentPartners, setCurrentPartners] = useState<CollectionPartner[]>(
    []
  );
  const [availablePartners, setAvailablePartners] = useState<PartnerUser[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [displayedLoans, setDisplayedLoans] = useState<any[]>([]);
  const [selectedLoans, setSelectedLoans] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [totalLoansCount, setTotalLoansCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Bulk allocation states
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkDueDateFrom, setBulkDueDateFrom] = useState("");
  const [bulkDueDateTo, setBulkDueDateTo] = useState("");
  const [bulkSourcePartners, setBulkSourcePartners] = useState<string[]>(["unallocated"]);
  const [bulkTargetPartners, setBulkTargetPartners] = useState<string[]>([]);
  const [bulkRemarks, setBulkRemarks] = useState("");
  const [previewLoans, setPreviewLoans] = useState<LoanPreview[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [autoAllocate, setAutoAllocate] = useState(false);
  const [loanCurrentStatus, setLoanCurrentStatus] = useState<"both" | "overdue" | "not-overdue">("both");
  const [isAllTime, setIsAllTime] = useState(false);

  const { showSuccess, showError } = useToast();

  // Fetch loans for list
  const fetchLoansList = useCallback(async (search: string = "", pageNum: number = 1) => {
    if (!brandId) return;
    
    const isLoadMore = pageNum > 1;
    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setIsSearching(true);
    }

    try {
      const limit = 20;
      const response = await getCollection(
        brandId,
        { page: pageNum, limit, dateFilter: "" },
        { 
          search,
          assignedCollectionExecutive: "",
          assignedCollectionSupervisor: ""
        }
      );
      
      const newLoans = response.loans || [];

      if (isLoadMore) {
        setDisplayedLoans(prev => [...prev, ...newLoans]);
      } else {
        setDisplayedLoans(newLoans);
      }

      setTotalLoansCount(response.meta?.total || 0);
      setHasMore(newLoans.length === limit);
    } catch (error) {
      console.error("Error fetching loans:", error);
    } finally {
      setIsSearching(false);
      setIsLoadingMore(false);
    }
  }, [brandId]);

  // Initial fetch & Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen && !bulkMode) {
        if (searchTerm) {
          setPage(1);
          fetchLoansList(searchTerm, 1);
        } else {
          setDisplayedLoans([]);
          setTotalLoansCount(0);
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, isOpen, loanId, bulkMode, fetchLoansList]);

  // Scroll handler
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 20 && hasMore && !isLoadingMore && !isSearching) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchLoansList(searchTerm, nextPage);
    }
  };

  // Fetch available partners (collection executives)
  const fetchAvailablePartners = async () => {
    if (!brandId) return;

    try {
      const collectionExecutives = await getCollectionExecutiveUsers(brandId);
      setAvailablePartners(collectionExecutives || []);
    } catch (error) {
      console.error("Error fetching available partners:", error);
      showError("Error", "Failed to fetch available partners");
    }
  };

  // Initialize data when modal opens
  useEffect(() => {
    if (isOpen && brandId) {
      fetchAvailablePartners();
      setSelectedPartnerId("");
      setRemarks("");
      // Auto-select single partner for bulk allocation
      if (availablePartners.length === 1) {
        setBulkTargetPartners([availablePartners[0].id]);
      }
    }
  }, [isOpen, brandId, availablePartners.length]);

  // Handle partner allocation
  const handleAllocate = async () => {
    const loansToProcess = selectedLoans.size > 0 ? Array.from(selectedLoans) : (loanId ? [loanId] : []);
    if (loansToProcess.length === 0 || !selectedPartnerId) return;

    setIsLoading(true);
    try {
      await Promise.all(loansToProcess.map(id => 
        allocateCollectionPartner(brandId, id, {
          partnerUserId: selectedPartnerId,
          remarks: remarks.trim() || undefined,
        })
      ));

      showSuccess("Success", `${loansToProcess.length} loan(s) allocated successfully`);
      setSelectedPartnerId("");
      setRemarks("");
      setSelectedLoans(new Set());
      onSuccess();
    } catch (error: any) {
      console.error("Error allocating partner:", error);
      showError(
        "Error",
        error.response?.data?.message || "Failed to allocate collection partner"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle selection
  const handleLoanSelection = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedLoans);
    if (checked) newSelected.add(id);
    else newSelected.delete(id);
    setSelectedLoans(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLoans(new Set(displayedLoans.map(l => l.id)));
    } else {
      setSelectedLoans(new Set());
    }
  };

  // Get available partners (excluding currently allocated ones)
  const getAvailableOptions = () => {
    const currentPartnerIds = currentPartners
      .filter((p) => p.isActive)
      .map((p) => p.partnerUserId);
    return availablePartners.filter(
      (partner) => !currentPartnerIds.includes(partner.id)
    );
  };

  // Fetch loan preview for bulk allocation
  const fetchLoanPreview = async () => {
    if (!isAllTime && (!bulkDueDateFrom || !bulkDueDateTo)) return;
    if (!brandId) return;

    setLoadingPreview(true);
    setPreviewLoans([]); // Clear previous results
    try {
      const loans = await getLoansByDueDateAndPartner(brandId, {
        dueDateFrom: isAllTime ? undefined : bulkDueDateFrom,
        dueDateTo: isAllTime ? undefined : bulkDueDateTo,
        sourcePartnerUserIds: bulkSourcePartners.length > 0 ? bulkSourcePartners : undefined,
        loanCurrentStatus: loanCurrentStatus,
      });
      setPreviewLoans(loans || []);
      
      if (!loans || loans.length === 0) {
        showError("No Loans Found", "No loans found for the selected criteria");
      } else {
        showSuccess("Preview Loaded", `Found ${loans.length} loans matching your criteria`);
      }
    } catch (error: any) {
      console.error("Error fetching loan preview:", error);
      showError(
        "Preview Failed", 
        error.response?.data?.message || "Failed to fetch loan preview. The backend endpoint may not be implemented yet."
      );
      setPreviewLoans([]);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Handle bulk allocation
  const handleBulkAllocate = async () => {
    // Validation: dates are required unless it's all time
    if (!isAllTime && (!bulkDueDateFrom || !bulkDueDateTo)) return;
    // Target partner is required unless auto-allocate is on
    if (!autoAllocate && bulkTargetPartners.length === 0) return;

    setBulkLoading(true);
    try {
      const request: BulkAllocationRequest = {
        targetPartnerUserIds: bulkTargetPartners.length > 0 ? bulkTargetPartners : undefined,
        dueDateFrom: isAllTime ? undefined : bulkDueDateFrom,
        dueDateTo: isAllTime ? undefined : bulkDueDateTo,
        sourcePartnerUserIds: bulkSourcePartners.length > 0 ? bulkSourcePartners : undefined,
        loanCurrentStatus: loanCurrentStatus,
        remarks: bulkRemarks.trim() || undefined,
      };

      const result = await bulkAllocateCollectionPartnersByDueDate(brandId, request);
      
      if (result.success) {
        let successMessage = `${result.allocatedCount} loans allocated successfully`;
        
        // Add allocation summary if available
        if (result.allocationSummary && result.allocationSummary.length > 0) {
          const summaryText = result.allocationSummary
            .map(summary => `${summary.partnerName}: ${summary.allocatedLoans} loans`)
            .join(', ');
          successMessage += `\n\nDistribution: ${summaryText}`;
        }
        
        showSuccess("Success", successMessage);
        setBulkDueDateFrom("");
        setBulkDueDateTo("");
        setBulkSourcePartners([]);
        setBulkTargetPartners([]);
        setBulkRemarks("");
        setPreviewLoans([]);
        setLoanCurrentStatus("both");
        setIsAllTime(false);
        onSuccess();
      } else {
        showError("Error", result.message);
      }
    } catch (error: any) {
      showError(
        "Error",
        error.response?.data?.message || "Failed to allocate loans in bulk"
      );
    } finally {
      setBulkLoading(false);
    }
  };

  // Handle modal close with cleanup
  const handleClose = () => {
    setSearchTerm("");
    setSelectedPartnerId("");
    setTotalLoansCount(0);
    setPage(1);
    setHasMore(true);
    setIsLoadingMore(false);
    setSelectedLoans(new Set());
    setRemarks("");
    setCurrentPartners([]);
    // Reset bulk allocation states
    setBulkMode(false);
    setBulkDueDateFrom("");
    setBulkDueDateTo("");
    setBulkSourcePartners([]);
    setBulkTargetPartners([]);
    setBulkRemarks("");
    setPreviewLoans([]);
    setAutoAllocate(false);
    setLoanCurrentStatus("both");
    setIsAllTime(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Collection Partner Reallocation"
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
              Bulk by Due Date
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
                  <h4 className="font-medium text-yellow-800">Bulk Allocation by Due Date</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    This will allocate loans matching the criteria to selected partners using round-robin distribution.
                    You can optionally filter by source partners to only reallocate from specific users.
                  </p>
                  <p className="text-xs text-yellow-600 mt-2 font-medium">
                    💡 Multi-partner allocation distributes loans evenly across selected partners.
                  </p>
                </div>
              </div>
            </div>

            {/* Due Date Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Due Date Range {!isAllTime && <span className="text-red-500">*</span>}
                </label>
                <button
                  onClick={() => {
                    setIsAllTime(!isAllTime);
                    if (!isAllTime) {
                      setBulkDueDateFrom("");
                      setBulkDueDateTo("");
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
                      value={bulkDueDateFrom}
                      onChange={(e) => setBulkDueDateFrom(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="From Date"
                      disabled={bulkLoading}
                    />
                    <p className="text-xs text-gray-500 mt-1">From Date</p>
                  </div>
                  <div>
                    <input
                      type="date"
                      value={bulkDueDateTo}
                      onChange={(e) => setBulkDueDateTo(e.target.value)}
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
                    This will process all loans regardless of their due date
                  </p>
                </div>
              )}
            </div>

            {/* Source Partner Filter (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Collection Executive(s)
                 (Optional)
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
                    return "Only loans that are not currently assigned to any collection partner will be processed";
                  } else if (bulkSourcePartners.length > 0) {
                    return `Selected ${bulkSourcePartners.length} partner(s). Only loans currently assigned to these partners will be reallocated`;
                  } else {
                    return "All partners selected. Loans from any partner (or unallocated) will be processed";
                  }
                })()}
              </p>
            </div>

            {/* Loan Current Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loan Current Status
              </label>
              <select
                value={loanCurrentStatus}
                onChange={(e) => setLoanCurrentStatus(e.target.value as "both" | "overdue" | "not-overdue")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={bulkLoading}
              >
                <option value="both">Both (Overdue & Not Overdue)</option>
                <option value="overdue">Overdue</option>
                <option value="not-overdue">Not Overdue</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Filter loans based on whether their due date has passed
              </p>
            </div>

            {/* Target Partner Selection - Only show if more than 1 partner */}
            {availablePartners.length > 1
            && !autoAllocate
            && (
              <div>
                <div className="block text-sm font-medium text-gray-700 mb-2">
                  To Collection Executive(s)
                  <span className="text-red-500">*</span>
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
                  Select one or more collection executives to assign the loans to. 
                  {bulkTargetPartners.length > 0 && ` ${bulkTargetPartners.length} selected.`}
                </p>
              </div>
            )}

            {/* Bulk Remarks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remarks (Optional)
              </label>
              <textarea
                value={bulkRemarks}
                onChange={(e) => setBulkRemarks(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Add bulk allocation remarks..."
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
            {(isAllTime || (bulkDueDateFrom && bulkDueDateTo)) && (
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
            )}

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
                        <span className="font-mono text-sm">{loan.formattedLoanId}</span>
                        <span className="ml-2 text-sm text-gray-600">
                          {[
                            loan.user?.userDetails?.firstName,
                            loan.user?.userDetails?.lastName,
                          ]
                            .filter(Boolean)
                            .join(" ") || "N/A"}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">₹{loan.amount.toLocaleString("en-IN")}</div>
                        <div>
                          Due Date: {
                dayjs(
                          loan.loanDetails.dueDate  
                        ).format("DD MMM YYYY")
                        }
                        </div>
                        <div className="text-xs text-gray-500">
                          Current: {loan.loan_collection_allocated_partner?.[0]?.partnerUser?.name || "Unassigned"}
                        </div>
                      </div>
               
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Show message after preview attempt if no loans found
              (isAllTime || (bulkDueDateFrom && bulkDueDateTo)) && previewLoans.length === 0 && !loadingPreview && (
                <div className="border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-gray-500">
                    <HiOutlineCalendar className="mx-auto text-3xl mb-2" />
                    <p className="text-sm">No loans found for the selected criteria</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {isAllTime 
                        ? "Try adjusting the source partner filter or loan status"
                        : "Try adjusting the due date range or source partner filter"
                      }
                    </p>
                  </div>
                </div>
              )
            )}

            {/* Bulk Allocate Button */}
            <Button
              onClick={handleBulkAllocate}
              disabled={(!isAllTime && (!bulkDueDateFrom || !bulkDueDateTo)) || (!autoAllocate && bulkTargetPartners.length === 0) || bulkLoading}
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
                  {autoAllocate ? (
                    "Auto Allocate Loans"
                  ) : (() => {
                    const baseText = previewLoans.length > 0 
                      ? `Allocate ${previewLoans.length} Loans`
                      : "Allocate Loans";
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
            {/* Single Loan Mode */}
            {/* Search & List */}
          <div className="mb-6">
            {/* Search Bar */}
            <div className="relative mb-4">
              <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500 transition"
                placeholder="Search loans by ID, name, email..."
                disabled={isLoading}
              />
            </div>

            {/* Loading State */}
            {isSearching && (
              <div className="flex items-center justify-center p-4">
                <CgSpinner className="animate-spin text-blue-600 mr-2" />
                <span className="text-sm text-gray-600">Loading loans...</span>
              </div>
            )}

            {/* Loans List */}
            {!isSearching && displayedLoans.length > 0 && (
              <div className="border border-gray-300 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900">
                    {searchTerm
                      ? `Found ${displayedLoans.length} loans`
                      : `Total Loans: ${totalLoansCount}`}
                  </h4>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center text-sm font-medium text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedLoans.size === displayedLoans.length && displayedLoans.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
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
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2" onScroll={handleScroll}>
                  {displayedLoans.map((loan) => {
                    const customerName = loan.name || [
                      loan.user?.userDetails?.firstName,
                      loan.user?.userDetails?.lastName,
                    ].filter(Boolean).join(" ") || "N/A";

                    return (
                      <div
                        key={loan.id}
                        className={`flex items-center p-3 border rounded-lg hover:shadow-sm transition ${
                          selectedLoans.has(loan.id) ? "border-blue-600 bg-blue-50" : "border-gray-200"
                        }`}
                      >
                        <label className="flex items-center cursor-pointer flex-1 gap-3">
                          <input
                            type="checkbox"
                            checked={selectedLoans.has(loan.id)}
                            onChange={(e) => handleLoanSelection(loan.id, e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                          />
                          <div className="flex-1 grid grid-cols-2 gap-2 text-sm items-center">
                            <div className="flex flex-col">
                              <div className="font-mono font-medium text-gray-900">{loan.formattedLoanId}</div>
                              <div className="text-xs text-gray-500 truncate" title={customerName}>{customerName}</div>
                            </div>
                            <div className="flex flex-col items-center">
                              <div className="font-medium">₹{loan.amount?.toLocaleString("en-IN")}</div>
                              <div className="text-xs text-gray-500">{loan.status}</div>
                            </div>
                          </div>
                        </label>
                      </div>
                    );
                  })}
                  {isLoadingMore && (
                    <div className="text-center py-2 text-xs text-gray-500">
                      Loading more loans...
                    </div>
                  )}
                </div>
              </div>
            )}

            {!isSearching && displayedLoans.length === 0 && searchTerm && (
              <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
                No loans found
              </div>
            )}
          </div>

        {/* Add New Partner Section - Show if loanId prop exists OR loans are selected in list */}
        {(loanId || selectedLoans.size > 0) && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Allocate Partner {selectedLoans.size > 0 && `(${selectedLoans.size} selected)`}
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
                  {getAvailableOptions().map((partner) => {
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

              {/* Remarks */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks (Optional)
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Add any remarks for this allocation..."
                  disabled={isLoading}
                />
              </div>

              {/* Allocate Button */}
              <Button
                onClick={handleAllocate}
                disabled={!selectedPartnerId || isLoading}
                className="w-full"
                variant='primary'
              >
                {isLoading ? "Allocating..." : `Allocate ${selectedLoans.size > 0 ? selectedLoans.size : ""} Partner`}
              </Button>
            </div>
          </div>
        )}
          </div>
        )}
      </div>
    </Dialog>
  );
};