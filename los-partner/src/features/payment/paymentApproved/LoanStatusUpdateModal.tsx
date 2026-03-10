import { useState } from "react";
import {
  HiMagnifyingGlass,
  HiCheckCircle,
  HiExclamationTriangle,
} from "react-icons/hi2";

import { getLoanById, manualStatusUpdate } from "../../../shared/services/api/loan.api";
import { canUpdateLoanStatus } from "../../../lib/canUpdateLoanStatus";
import Dialog from "../../../common/dialog";
import { LoanStatusEnum } from "../../../constant/enum";

interface LoanSearchResult {
  id: string;
  formattedLoanId: string;
  amount: number;
  status: string;
  user: {
    userDetails: {
      firstName: string;
      lastName: string;
    };
  };
}

interface LoanStatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandId?: string;
}

const LoanStatusUpdateModal = ({
  isOpen,
  onClose,
  brandId,
}: LoanStatusUpdateModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LoanSearchResult[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<LoanSearchResult | null>(
    null,
  );
  const [newStatus, setNewStatus] = useState<LoanStatusEnum | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Helper function to get status display text
  const getStatusDisplayText = (status: string): string => {
    switch (status) {
      case "WRITE_OFF":
        return "Write Off";
      case "SETTLED":
        return "Settled";
      case "COMPLETED":
        return "Completed";
      default:
        return status;
    }
  };

  // Helper function to get status description
  const getStatusDescription = (status: string): string => {
    switch (status) {
      case "WRITE_OFF":
        return "Mark loan as written off";
      case "SETTLED":
        return "Mark loan as settled";
      case "COMPLETED":
        return "Mark loan as completed";
      default:
        return "";
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      setErrorMessage("");
      return;
    }

    try {
      setIsSearching(true);
      setErrorMessage("");
      setSearchResults([]);

      if (!brandId) {
        setErrorMessage("Brand ID is required");
        setIsSearching(false);
        return;
      }

      // Try to fetch loan by ID using getLoanById
      const loan = await getLoanById(brandId, query);

      if (loan?.id) {
        // Map the response to LoanSearchResult format
        const result: LoanSearchResult = {
          id: loan.id,
          formattedLoanId: loan.formattedLoanId || loan.id,
          amount: loan.amount || 0,
          status: loan.status || "N/A",
          user: {
            userDetails: {
              firstName: loan.user?.userDetails?.firstName || "",
              lastName: loan.user?.userDetails?.lastName || "",
            },
          },
        };
        setSearchResults([result]);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error("Error searching loan:", err);
      setSearchResults([]);
      setErrorMessage(
        err instanceof Error && err.message
          ? err.message
          : "Loan not found. Please check the loan ID and try again.",
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectLoan = (loan: LoanSearchResult) => {
    setSelectedLoan(loan);
    setSearchResults([]);
    setSearchQuery("");
    setNewStatus(null);
    setErrorMessage("");
  };

  const handleStatusChange = async () => {
    if (!selectedLoan || !newStatus) {
      setErrorMessage("Please select a status");
      return;
    }

    // Validate status transition
    if (!canUpdateLoanStatus(selectedLoan.status as any, newStatus as any)) {
      setErrorMessage(
        `Cannot change status from ${selectedLoan.status} to ${getStatusDisplayText(newStatus)}. This transition is not allowed.`,
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      // Call the backend API to update loan status
      await manualStatusUpdate(selectedLoan.id, newStatus);

      setSuccessMessage(
        `✓ Loan status successfully updated to ${getStatusDisplayText(newStatus)}`,
      );
      setTimeout(() => {
        setSelectedLoan(null);
        setNewStatus(null);
        setSuccessMessage("");
        setSearchQuery("");
        setSearchResults([]);
        setShowConfirmation(false);
      }, 2500);
    } catch (err) {
      const errorMsg =
        err instanceof Error && err.message
          ? err.message
          : "Failed to update loan status. Please try again.";
      setErrorMessage(errorMsg);
      console.error("Error updating loan status:", err);
      setShowConfirmation(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyClick = () => {
    if (!newStatus) {
      setErrorMessage("Please select a status");
      return;
    }
    setShowConfirmation(true);
  };

  if (!isOpen) return null;

  const hasSelectedLoan = selectedLoan !== null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Update Loan Status">
      <div>
        {/* Content */}
        <div className="space-y-4">
          {/* Success Message */}
          {successMessage && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
              <HiCheckCircle className="w-4 h-4" />
              {successMessage}
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <HiExclamationTriangle className="w-4 h-4" />
              {errorMessage}
            </div>
          )}

          {hasSelectedLoan ? (
            <>
              {/* Selected Loan */}
              <div className="p-3 bg-[var(--muted)]/5 border border-[var(--muted)]/15 rounded-lg">
                <div className="text-sm font-semibold text-[var(--on-surface)]">
                  {selectedLoan.formattedLoanId}
                </div>
                <div className="text-xs text-[var(--on-surface)]/60 mt-1">
                  {selectedLoan.user.userDetails.firstName}{" "}
                  {selectedLoan.user.userDetails.lastName}
                </div>
                <div className="text-xs text-[var(--on-surface)]/60 mt-1">
                  BHD {selectedLoan.amount.toLocaleString("en-IN")} • Current
                  Status:{" "}
                  <span className="font-semibold">{selectedLoan.status}</span>
                </div>
                <button
                  onClick={() => {
                    setSelectedLoan(null);
                    setNewStatus(null);
                    setErrorMessage("");
                  }}
                  className="text-xs text-[var(--primary)] hover:underline mt-2"
                >
                  ← Change Loan
                </button>
              </div>

              {/* Status Options */}
              <div>
                <label
                  htmlFor="status-select"
                  className="block text-sm font-semibold text-[var(--on-surface)] mb-2"
                >
                  New Status
                </label>
                <select
                  id="status-select"
                  value={newStatus || ""}
                  onChange={(e) => {
                    setNewStatus(e.target.value as LoanStatusEnum);
                    setErrorMessage("");
                  }}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2.5 border border-[var(--muted)]/30 rounded-lg bg-[var(--background)] text-[var(--on-surface)] font-medium focus:outline-none focus:border-[var(--primary)] disabled:opacity-60 transition-all appearance-none cursor-pointer"
                >
                  <option value="">-- Select Status --</option>
                  {canUpdateLoanStatus(
                    selectedLoan.status as any,
                    "WRITE_OFF" as any,
                  ) && <option value="WRITE_OFF">Write Off</option>}
                  {canUpdateLoanStatus(
                    selectedLoan.status as any,
                    "SETTLED" as any,
                  ) && <option value="SETTLED">Settled</option>}
                  {canUpdateLoanStatus(
                    selectedLoan.status as any,
                    "COMPLETED" as any,
                  ) && <option value="COMPLETED">Completed</option>}
                </select>
              </div>

              {/* Selected Status Info */}
              {newStatus && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700">
                    <span className="font-semibold">Selected Status:</span>{" "}
                    {getStatusDisplayText(newStatus)}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {getStatusDescription(newStatus)}
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Search Input */}
              <div>
                <label
                  htmlFor="loan-search"
                  className="block text-sm font-semibold text-[var(--on-surface)] mb-2"
                >
                  Search Loan by ID
                </label>
                <div className="relative">
                  <input
                    id="loan-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Enter loan ID (e.g., LN123456)..."
                    disabled={isSearching}
                    className={`w-full px-3 py-2 pl-9 border border-[var(--muted)]/30 rounded-lg bg-[var(--background)] text-[var(--on-surface)] placeholder-[var(--on-surface)]/40 focus:outline-none focus:border-[var(--primary)] disabled:opacity-60 transition-all ${
                      isSearching ? "pr-9" : "pr-3"
                    }`}
                  />
                  {isSearching ? (
                    <div className="absolute right-3 top-2.5">
                      <div className="w-4 h-4 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
                    </div>
                  ) : (
                    <HiMagnifyingGlass className="absolute left-3 top-2.5 w-4 h-4 text-[var(--on-surface)]/40" />
                  )}
                </div>
                {searchQuery.length > 0 && searchQuery.length < 2 && (
                  <p className="text-xs text-[var(--on-surface)]/50 mt-2">
                    Enter at least 2 characters to search
                  </p>
                )}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[var(--on-surface)]/60 px-1">
                    Found {searchResults.length} loan(s)
                  </p>
                  {searchResults.map((loan) => (
                    <button
                      key={loan.id}
                      onClick={() => handleSelectLoan(loan)}
                      disabled={isSearching}
                      className="w-full p-3 text-left bg-[var(--muted)]/5 hover:bg-[var(--muted)]/10 border border-[var(--muted)]/15 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <div className="font-semibold text-[var(--on-surface)]">
                        {loan.formattedLoanId}
                      </div>
                      <div className="text-xs text-[var(--on-surface)]/60">
                        {loan.user.userDetails.firstName}{" "}
                        {loan.user.userDetails.lastName}
                      </div>
                      <div className="text-xs text-[var(--on-surface)]/60 mt-1 flex justify-between">
                        <span>BHD {loan.amount.toLocaleString("en-IN")}</span>
                        <span className="px-2 py-0.5 bg-[var(--primary)]/10 text-[var(--primary)] rounded text-[10px] font-semibold">
                          {loan.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* No results state */}
              {searchQuery.length >= 2 && isSearching && (
                <div className="p-4 flex flex-col items-center gap-2">
                  <div className="w-5 h-5 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
                  <p className="text-xs text-[var(--on-surface)]/60">
                    Searching loan...
                  </p>
                </div>
              )}

              {searchQuery.length >= 2 &&
                !isSearching &&
                searchResults.length === 0 &&
                !errorMessage && (
                  <div className="p-4 text-center">
                    <p className="text-sm text-[var(--on-surface)]/60">
                      No loan found with ID:{" "}
                      <span className="font-semibold">{searchQuery}</span>
                    </p>
                    <p className="text-xs text-[var(--on-surface)]/40 mt-1">
                      Please check and try again
                    </p>
                  </div>
                )}
            </>
          )}
        </div>

        {/* Footer */}
        {hasSelectedLoan && (
          <div className="sticky bottom-0 flex gap-2 p-6 border-t border-[var(--muted)]/15 bg-[var(--surface)]">
            <button
              onClick={() => {
                setSelectedLoan(null);
                setNewStatus(null);
                setErrorMessage("");
              }}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 rounded-lg border border-[var(--muted)]/30 text-[var(--on-surface)] font-semibold hover:bg-[var(--muted)]/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyClick}
              disabled={!newStatus || isSubmitting}
              className="flex-1 px-4 py-2 rounded-lg bg-[var(--primary)] text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <HiCheckCircle className="w-4 h-4" />
                  <span>Apply</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmation && selectedLoan && newStatus && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[var(--surface)] rounded-lg shadow-xl w-full max-w-sm mx-4 p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-[var(--on-surface)]">
                  Confirm Status Change
                </h3>
                <p className="text-sm text-[var(--on-surface)]/60 mt-1">
                  Are you sure you want to update the loan status?
                </p>
              </div>

              <div className="p-4 bg-[var(--muted)]/5 border border-[var(--muted)]/15 rounded-lg space-y-2">
                <div>
                  <p className="text-xs text-[var(--on-surface)]/60 font-semibold">
                    Loan ID
                  </p>
                  <p className="text-sm font-semibold text-[var(--on-surface)]">
                    {selectedLoan.formattedLoanId}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--on-surface)]/60 font-semibold">
                    Current Status
                  </p>
                  <p className="text-sm text-[var(--on-surface)]">
                    {selectedLoan.status}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--on-surface)]/60 font-semibold">
                    New Status
                  </p>
                  <p className="text-sm font-semibold text-[var(--primary)]">
                    {getStatusDisplayText(newStatus)}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs flex gap-2">
                <HiExclamationTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>This action cannot be undone.</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowConfirmation(false)}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 rounded-lg border border-[var(--muted)]/30 text-[var(--on-surface)] font-semibold hover:bg-[var(--muted)]/5 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusChange}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Confirming...</span>
                    </>
                  ) : (
                    <>
                      <HiCheckCircle className="w-4 h-4" />
                      <span>Confirm</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};

export default LoanStatusUpdateModal;
