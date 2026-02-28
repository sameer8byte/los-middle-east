import React, { useCallback } from "react";
import Dialog from "../dialog";
import { Button } from "./button";
import { Textarea } from "./input";
import { formatDateWithTime } from "../../lib/utils";
import { Spinner } from "./spinner";

export interface CommentModalState {
  isOpen: boolean;
  loanId: string | null;
  currentComment: string;
  isLoading: boolean;
}

// Predefined comments that executives can select from
const PREDEFINED_COMMENTS = [
  "Customer didn't pick call",
  "Customer Phone switched off",
  "Invalid phone number",
  "Customer asked for more time",
  "Customer busy, will call back later",
  "Others",
];

interface RemarksCommentModalProps {
  isOpen: boolean;
  loanId: string | null;
  currentComment: string;
  isLoading: boolean;
  loans: any[]; // Array of loans with loanStatusHistory
  onClose: () => void;
  onCommentChange: (comment: string) => void;
  onSubmit: () => Promise<void>;
  loanComments?: { [loanId: string]: any[] }; // Optional separate comments state
  loadingComments?: { [loanId: string]: boolean }; // Optional loading state for comments
}

export const RemarksCommentModal: React.FC<RemarksCommentModalProps> = ({
  isOpen,
  loanId,
  currentComment,
  isLoading,
  loans,
  onClose,
  onCommentChange,
  onSubmit,
  loanComments,
  loadingComments,
}) => {
  const currentLoan = loans.find((loan) => loan.id === loanId);
  
  // Try to get remarks from loanComments state first, then fall back to loanStatusHistory
  let remarksHistory = [];
  
  if (loanComments && loanId && loanComments[loanId]) {
    // Use comments from separate API call
    remarksHistory = loanComments[loanId];
  } else if (currentLoan?.loanStatusHistory) {
    // Fall back to loanStatusHistory from loan object
    remarksHistory = currentLoan.loanStatusHistory
      .filter((history: any) => history.message?.startsWith("COMMENT:"))
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }

  const handleSubmit = useCallback(async () => {
    await onSubmit();
  }, [onSubmit]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Add Remarks"
    >
      <div className="space-y-4">
        {/* Predefined Comments Dropdown */}
        <div>
          <label
            htmlFor="predefined-comments"
            className="block text-sm font-medium text-[var(--color-on-background)] mb-2"
          >
            Quick Select
          </label>
          <select
            id="predefined-comments"
            className="w-full px-3 py-2 text-sm border border-[var(--color-muted)] rounded-lg bg-[var(--color-surface)] text-[var(--color-on-background)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
            onChange={(e) => {
              if (e.target.value) {
                onCommentChange(e.target.value);
              }
            }}
            value=""
            disabled={isLoading}
          >
            <option value="">-- Select a predefined remark --</option>
            {PREDEFINED_COMMENTS.map((comment, index) => (
              <option key={index} value={comment}>
                {comment}
              </option>
            ))}
          </select>
        </div>

        {/* Comment Input */}
        <div>
          <label
            htmlFor="comment-textarea"
            className="block text-sm font-medium text-[var(--color-on-background)] mb-2"
          >
            Remarks<span className="text-red-500">*</span>
          </label>
          <Textarea
            id="comment-textarea"
            value={currentComment}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onCommentChange(e.target.value)}
            placeholder="Enter your Remarks here or select from above..."
            rows={4}
            fullWidth
            required
            disabled={isLoading}
          />
        </div>

        {/* Remarks History Section */}
        {loanId && (
          <div className="border-t border-[var(--color-muted)] border-opacity-30 pt-4">
            <h3 className="text-sm font-medium text-[var(--color-on-background)] mb-3">
              Remarks History
            </h3>
            
            {/* Loading State */}
            {loadingComments && loadingComments[loanId] ? (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-[var(--color-on-surface)] opacity-70">
                <Spinner />
                Loading remarks...
              </div>
            ) : remarksHistory.length > 0 ? (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {remarksHistory.map((history: any) => (
                  <div
                    key={history.id}
                    className="p-3 bg-[var(--color-surface)] bg-opacity-50 rounded-lg border border-[var(--color-muted)] border-opacity-30"
                  >
                    {/* Partner User Info */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-white text-xs font-medium">
                        {history.partnerUser?.name?.charAt(0) || "U"}
                      </div>
                      <span className="text-sm font-medium text-[var(--color-on-background)]">
                        {history.partnerUser?.name || "Unknown User"}
                      </span>
                    </div>

                    {/* Comment Text - Handle both API format (comment field) and loanStatusHistory format (message field) */}
                    <p className="text-sm text-[var(--color-on-background)] mb-2">
                      {history.comment || history.message?.replace("COMMENT: ", "") || ""}
                    </p>

                    {/* Timestamp */}
                    <div className="text-xs text-[var(--color-on-surface)] opacity-70">
                      {formatDateWithTime(new Date(history.createdAt))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-[var(--color-on-surface)] opacity-50 text-sm">
                No Remarks yet
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!currentComment.trim() || isLoading}
            loading={isLoading}
          >
            Add Remarks
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
