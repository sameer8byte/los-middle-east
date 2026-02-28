import { useState } from "react";
import { useQueryParams } from "../../../hooks/useQueryParams";
 import { ReloanStatus } from "../../../constant/enum";
import Dialog from "../../../common/dialog";
import { useParams } from "react-router-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { updateUserReloan } from "../../../shared/services/api/customer.api";

export function UserReloan() {
  const { brandId } = useParams();


  // Inside the component
  const navigate = useNavigate();
  const location = useLocation();
  const { getQuery } = useQueryParams();
  const userReloanId = getQuery("userReloanId");
  const userId = getQuery("reloanUserId");
  
  const [status, setStatus] = useState<ReloanStatus>(ReloanStatus.APPROVED);
  const [reason, setRemarks] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reason suggestions based on status
  const getReasonSuggestions = (currentStatus: ReloanStatus) => {
    if (currentStatus === ReloanStatus.APPROVED) {
      return [
        "Customer meets all eligibility criteria for reloan",
        "Previous loan history shows excellent repayment behavior",
        "Current financial status supports additional lending",
        "Credit score and profile meet approval standards",
        "All required documentation verified successfully"
      ];
    } else {
      return [
        "Insufficient credit score for reloan approval",
        "Outstanding dues on previous loan not cleared",
        "Current income insufficient to support additional loan",
        "Recent negative credit history or defaults identified",
        "Required documentation incomplete or invalid"
      ];
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setRemarks(suggestion);
  };

  const resetForm = () => {
    setStatus(ReloanStatus.APPROVED);
    setRemarks("");
    setError(null);
    setSuccess(false);
  };

  
  const handleClose = () => {
    // Remove userReloanId and reloanUserId from the query string
    const searchParams = new URLSearchParams(location.search);
    searchParams.delete("userReloanId");
    searchParams.delete("reloanUserId");
  
    navigate({
      pathname: location.pathname,
      search: searchParams.toString(),
    });
  
    resetForm();
  };
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Validation
    if (!brandId) {
      setError("Brand ID is missing");
      setIsLoading(false);
      return;
    }

    if (!userId || !userReloanId) {
      setError("Missing user information");
      setIsLoading(false);
      return;
    }

    if (!reason.trim()) {
      setError("Remarks are required");
      setIsLoading(false);
      return;
    }

    try {
      await updateUserReloan(brandId, userId, {
        id: userReloanId,
        status,
        reason: reason.trim(),
      });
      
      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to update reloan");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (statusValue: ReloanStatus) => {
    switch (statusValue) {
      case ReloanStatus.APPROVED:
        return "text-[var(--color-on-success)]";
      case ReloanStatus.REJECTED:
        return "text-[var(--color-on-error)]";
      default:
        return "text-[var(--color-on-surface)] opacity-70";
    }
  };

  return (
    <Dialog
      isOpen={!!userReloanId}
      onClose={handleClose}
      title="Reloan Request Management"
    >
      <div className="bg-white">
        {/* Header Section */}
        <div className="border-b border-[var(--color-muted)] border-opacity-30 pb-4 mb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[var(--color-on-background)]">
              Process Reloan Request
            </h3>
            <div className="text-xs text-[var(--color-on-surface)] opacity-70">
              ID: {userReloanId}
            </div>
          </div>
          <p className="text-sm text-[var(--color-on-surface)] opacity-70 mt-1">
            Review and update the reloan request status
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-4 p-3 bg-[var(--color-success)] bg-opacity-10 border border border-[var(--color-success)] border-opacity-30 rounded-md">
            <div className="flex items-center">
              <svg className="w-4 h-4 text-[var(--color-on-success)] mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-[var(--color-on-success)]">
                Reloan request updated successfully
              </span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-[var(--color-error)] bg-opacity-10 border border border-[var(--color-error)] border-opacity-30 rounded-md">
            <div className="flex items-center">
              <svg className="w-4 h-4 text-[var(--color-on-error)] mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-[var(--color-on-error)]">{error}</span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Status Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-on-background)]">
              Decision Status <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ReloanStatus)}
                className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-md shadow-sm bg-white text-[var(--color-on-background)] focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors"
                disabled={isLoading}
              >
                {Object.values(ReloanStatus)
                  .filter((s) => s !== ReloanStatus.PENDING)
                  .map((s) => (
                    <option key={s} value={s} className={getStatusColor(s)}>
                      {s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()}
                    </option>
                  ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--color-on-surface)] opacity-80">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-[var(--color-on-surface)] opacity-70">
              Select the appropriate status for this reloan request
            </p>
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-on-background)]">
              Remarks <span className="text-red-500">*</span>
            </label>
            
            {/* Reason Suggestions */}
            <div className="mb-3">
              <p className="text-xs text-[var(--color-on-surface)] opacity-70 mb-2">Quick suggestions:</p>
              <div className="space-y-1">
                {getReasonSuggestions(status).map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="block w-full text-left px-3 py-2 text-xs bg-[var(--color-background)] hover:bg-[var(--color-surface)] border border-[var(--color-muted)] border-opacity-30 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                    disabled={isLoading}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              name="reason"
              value={reason}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter detailed reason about your decision..."
              rows={4}
              className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-md shadow-sm text-[var(--color-on-background)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors resize-none"
              disabled={isLoading}
              required
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-[var(--color-on-surface)] opacity-70">
                Provide clear reasoning for your decision or use suggestions above
              </p>
              <span className="text-xs text-[var(--color-on-surface)] opacity-50">
                {reason.length}/500
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[var(--color-muted)] border-opacity-30">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-[var(--color-on-surface)] opacity-80 bg-white border border-[var(--color-muted)] border-opacity-50 rounded-md hover:bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !reason.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-black border border-transparent rounded-md hover:bg-[var(--color-on-background)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:bg-[var(--color-muted)] disabled:cursor-not-allowed transition-colors min-w-[100px]"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </div>
              ) : (
                'Update Status'
              )}
            </button>
          </div>
        </form>

        {/* User Info Footer */}
        <div className="mt-6 pt-4 border-t border-[var(--color-muted)] border-opacity-20">
          <div className="text-xs text-[var(--color-on-surface)] opacity-70 space-y-1">
            <div>User ID: {userId}</div>
            <div>Brand ID: {brandId}</div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
