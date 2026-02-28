import React, { useState, useEffect } from 'react';
import { FaExclamationTriangle, FaCheck, FaTimes, FaSpinner } from 'react-icons/fa';
import { cn } from '../../../../lib/utils';
import { BrandRejectionReason, BrandRejectionReasonApi } from '../../../../shared/services/api/settings/brandRejectionReaons.setting.api';

interface RejectionReasonsSelectorProps {
  brandId: string;
  selectedReasons: string[];
  onReasonsChange: (reasons: string[]) => void;
  onValidationChange: (isValid: boolean) => void;
  disabled?: boolean;
}

export const RejectionReasonsSelector: React.FC<RejectionReasonsSelectorProps> = ({
  brandId,
  selectedReasons,
  onReasonsChange,
  onValidationChange,
  disabled = false,
}) => {
  const [reasons, setReasons] = useState<BrandRejectionReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const MIN_REQUIRED_REASONS = 1;
  const MAX_REQUIRED_REASONS = 3;

  useEffect(() => {
    const fetchReasons = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await BrandRejectionReasonApi.getLoanRejectionReasons(brandId);
        // Filter for active, non-disabled reasons
        const activeReasons = data.filter(reason => 
          reason.isActive && 
          !reason.isDisabled && 
          reason.type === 'LOAN' && 
          reason.status === 'REJECTED'
        );
        setReasons(activeReasons);
      } catch (err) {
        console.error('Error fetching rejection reasons:', err);
        setError('Failed to load rejection reasons. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (brandId) {
      fetchReasons();
    }
  }, [brandId]);

  useEffect(() => {
    const isValid = selectedReasons.length >= MIN_REQUIRED_REASONS && selectedReasons.length <= MAX_REQUIRED_REASONS;
    onValidationChange(isValid);
  }, [selectedReasons, onValidationChange]);

  const handleReasonToggle = (reasonId: string) => {
    if (disabled) return;

    if (selectedReasons.includes(reasonId)) {
      // Remove reason
      const newSelectedReasons = selectedReasons.filter(id => id !== reasonId);
      onReasonsChange(newSelectedReasons);
    } else if (selectedReasons.length < MAX_REQUIRED_REASONS) {
      // Add reason only if under max limit
      const newSelectedReasons = [...selectedReasons, reasonId];
      onReasonsChange(newSelectedReasons);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <FaSpinner className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
        <span className="ml-2 text-[var(--color-on-surface)] opacity-70">Loading rejection reasons...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-[var(--color-error)] bg-opacity-10 border border-[var(--color-error)] border-opacity-30 rounded-lg">
        <div className="flex items-center gap-3">
          <FaExclamationTriangle className="w-5 h-5 text-[var(--color-error)] flex-shrink-0" />
          <div>
            <h4 className="font-medium text-[var(--color-on-error)]">Error Loading Reasons</h4>
            <p className="text-sm text-[var(--color-on-error)] mt-1 opacity-80">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (reasons.length === 0) {
    return (
      <div className="p-6 bg-[var(--color-surface)] border border-[var(--color-muted)] border-opacity-30 rounded-lg text-center">
        <FaExclamationTriangle className="w-8 h-8 mx-auto mb-3 text-[var(--color-muted)]" />
        <h4 className="font-medium text-[var(--color-on-surface)] mb-2">No Rejection Reasons Available</h4>
        <p className="text-sm text-[var(--color-on-surface)] opacity-70">
          Please contact your administrator to configure loan rejection reasons.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with validation status */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-[var(--color-on-background)] flex items-center gap-2">
            <FaExclamationTriangle className="w-4 h-4 text-[var(--color-error)]" />
            Select Rejection Reasons
            <span className="text-[var(--color-error)]">*</span>
          </h4>
          <p className="text-sm text-[var(--color-on-surface)] opacity-70 mt-1">
            Choose {MIN_REQUIRED_REASONS}-{MAX_REQUIRED_REASONS} reasons for rejecting this loan application
          </p>
        </div>
        <div className={cn(
          "px-3 py-1 rounded-lg text-xs font-medium border",
          selectedReasons.length >= MIN_REQUIRED_REASONS && selectedReasons.length <= MAX_REQUIRED_REASONS
            ? "bg-[var(--color-success)] bg-opacity-10 border-[var(--color-success)] border-opacity-30 text-[var(--color-success)]"
            : "bg-[var(--color-error)] bg-opacity-10 border-[var(--color-error)] border-opacity-30 text-[var(--color-error)]"
        )}>
          {selectedReasons.length >= MIN_REQUIRED_REASONS && selectedReasons.length <= MAX_REQUIRED_REASONS ? (
            <>
              <FaCheck className="w-3 h-3 inline mr-1" />
              Valid ({selectedReasons.length} selected)
            </>
          ) : selectedReasons.length < MIN_REQUIRED_REASONS ? (
            <>
              <FaTimes className="w-3 h-3 inline mr-1" />
              Need {MIN_REQUIRED_REASONS - selectedReasons.length} more
            </>
          ) : (
            <>
              <FaTimes className="w-3 h-3 inline mr-1" />
              Too many ({selectedReasons.length}/{MAX_REQUIRED_REASONS})
            </>
          )}
        </div>
      </div>

      {/* Reasons Grid */}
      <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto">
        {reasons.map((reason) => {
          const isSelected = selectedReasons.includes(reason.id);
          
          return (
            <button
              key={reason.id}
              type="button"
              disabled={disabled || (!isSelected && selectedReasons.length >= MAX_REQUIRED_REASONS)}
              className={cn(
                "w-full p-4 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-opacity-50 text-left",
                disabled || (!isSelected && selectedReasons.length >= MAX_REQUIRED_REASONS)
                  ? "opacity-50 cursor-not-allowed" 
                  : "hover:shadow-md hover:-translate-y-0.5",
                isSelected
                  ? "bg-[var(--color-primary)] bg-opacity-10 border-[var(--color-primary)] border-opacity-50 shadow-md"
                  : "bg-[var(--color-background)] border-[var(--color-muted)] border-opacity-30 hover:border-[var(--color-primary)] hover:border-opacity-30"
              )}
              onClick={() => handleReasonToggle(reason.id)}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <div className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-200",
                  isSelected
                    ? "bg-[var(--color-primary)] border-[var(--color-primary)]"
                    : "border-[var(--color-muted)] border-opacity-50"
                )}>
                  {isSelected && (
                    <FaCheck className="w-3 h-3 text-[var(--color-primary-contrast)]" />
                  )}
                </div>

                {/* Reason Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className={cn(
                      "text-sm font-medium leading-relaxed",
                      isSelected 
                        ? "text-[var(--color-primary)]" 
                        : "text-[var(--color-on-background)]"
                    )}>
                      {reason.reason}
                    </p>
                    
                    {/* Type Badge */}
                    <span className={cn(
                      "px-2 py-1 text-xs font-medium rounded-full flex-shrink-0",
                      isSelected
                        ? "bg-[var(--color-primary)] bg-opacity-20 text-[var(--color-primary)]"
                        : "bg-[var(--color-surface)] text-[var(--color-on-surface)] opacity-70"
                    )}>
                      {reason.type}
                    </span>
                  </div>
                  
                  {/* Metadata */}
                  <div className="flex items-center gap-4 mt-2 text-xs text-[var(--color-on-surface)] opacity-60">
                    <span>Status: {reason.status}</span>
                    <span>•</span>
                    <span>Active</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer with selection summary */}
      <div className="pt-4 border-t border-[var(--color-muted)] border-opacity-20">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--color-on-surface)] opacity-70">
            {selectedReasons.length} of {reasons.length} reasons selected
          </span>
          
          {selectedReasons.length >= MIN_REQUIRED_REASONS && selectedReasons.length <= MAX_REQUIRED_REASONS ? (
            <span className="text-[var(--color-success)] font-medium flex items-center gap-1">
              <FaCheck className="w-3 h-3" />
              Ready to proceed
            </span>
          ) : selectedReasons.length < MIN_REQUIRED_REASONS ? (
            <span className="text-[var(--color-error)] font-medium">
              Select {MIN_REQUIRED_REASONS - selectedReasons.length} more reason{MIN_REQUIRED_REASONS - selectedReasons.length !== 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-[var(--color-error)] font-medium">
              Remove {selectedReasons.length - MAX_REQUIRED_REASONS} reason{selectedReasons.length - MAX_REQUIRED_REASONS !== 1 ? 's' : ''} (max {MAX_REQUIRED_REASONS})
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
