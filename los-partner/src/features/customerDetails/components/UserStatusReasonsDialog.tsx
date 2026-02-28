import { useEffect, useState } from "react";
import Dialog from "../../../common/dialog";
import { useToast } from "../../../context/toastContext";
import {
  getUserStatusBrandReasons,
  saveUserStatusBrandReasons,
} from "../../../shared/services/api/customer.api";
import { Customer } from "../../../shared/types/customers";
import { UserStatusEnum } from "../../../constant/enum";

type UserStatusId = 1 | 2 | 3 | 4 | 5;

interface UserStatusReasonsDialogProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly brandId: string;
  readonly customerId: string;
  readonly customer: Customer | null;
  readonly onSuccess?: () => void;
}

interface BrandReason {
  id: string;
  brandId: string;
  reason: string;
  isDisabled: boolean;
  isActive: boolean;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
export function UserStatusReasonsDialog({
  isOpen,
  onClose,
  brandId,
  customerId,
  customer,
  onSuccess,
}: UserStatusReasonsDialogProps) {
  const [selectedBrandReasons, setSelectedBrandReasons] = useState<string[]>([]);
  const [brandReasons, setBrandReasons] = useState<BrandReason[]>([]);
  const [isLoadingReasons, setIsLoadingReasons] = useState(false);
  const [isSavingReasons, setIsSavingReasons] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState<UserStatusId>(UserStatusEnum.BLOCKED);
  
  const { showSuccess, showError } = useToast();

  // Handle status change
  const handleStatusChange = (newStatusId: UserStatusId) => {
    setSelectedStatusId(newStatusId);
    setSelectedBrandReasons([]); // Clear selected reasons when status changes
  };

  // Map status_id to UserStatusEnum value
  const getStatusEnumValue = (statusId: UserStatusId): string => {
    const statusMap: Record<UserStatusId, string> = {
      [UserStatusEnum.PENDING]: "PENDING",
      [UserStatusEnum.ACTIVE]: "ACTIVE",
      [UserStatusEnum.ON_HOLD]: "HOLD",
      [UserStatusEnum.SUSPENDED]: "REJECTED",
      [UserStatusEnum.BLOCKED]: "REJECTED",
    };
    return statusMap[statusId] || "REJECTED";
  };

  // Fetch brand reasons for user status based on selected status id
  const fetchBrandReasons = async () => {
    if (!brandId) return;

    setIsLoadingReasons(true);
    try {
      const reasons = await getUserStatusBrandReasons(brandId);
      const statusEnumValue = getStatusEnumValue(selectedStatusId);
      // Filter for USER type and selected status reasons
      const filteredReasons = reasons.filter(
        (reason: BrandReason) => reason.type === 'USER' && reason.status === statusEnumValue && reason.isActive && !reason.isDisabled
      );
      setBrandReasons(filteredReasons);

      // Load existing selected reasons for this user only if they match the current status
      if (customer?.user_status_brand_reasons) {
        const currentStatusId = customer.status_id ? Number(customer.status_id) : null;

        if (currentStatusId === selectedStatusId) {
          const existingReasons = customer.user_status_brand_reasons
            .filter((reason) => {
              // Only include reasons that match current status and are in the filtered reasons
              return filteredReasons.some((fr: BrandReason) => fr.id === reason.brandStatusReasonId);
            })
            .map((reason: any) => reason.brandStatusReasonId);
          setSelectedBrandReasons(existingReasons);
        } else {
          // Clear selected reasons if status changed or no existing reasons
          setSelectedBrandReasons([]);
        }
      } else {
        // Clear selected reasons if no existing reasons
        setSelectedBrandReasons([]);
      }
    } catch (error) {
      console.error("Error fetching brand reasons:", error);
      showError("Error", "Failed to load user status reasons");
    } finally {
      setIsLoadingReasons(false);
    }
  };

  const handleReasonToggle = (reasonId: string) => {
    setSelectedBrandReasons(prev => {
      if (prev.includes(reasonId)) {
        // Remove if already selected
        return prev.filter(id => id !== reasonId);
      } else {
        // Add if not selected and under max limit
        if (prev.length < 3) {
          return [...prev, reasonId];
        }
        return prev;
      }
    });
  };

  const saveUserStatusReasons = async () => {
    // Only require reasons for BLOCKED and ON_HOLD statuses
    const requiresReasons = [UserStatusEnum.BLOCKED, UserStatusEnum.ON_HOLD].includes(selectedStatusId);
    
    if (requiresReasons && selectedBrandReasons.length < 1) {
      showError("Validation Error", "Please select at least 1 reason");
      return;
    }

    if (selectedBrandReasons.length > 3) {
      showError("Validation Error", "Maximum 3 reasons allowed");
      return;
    }

    if (!customerId || !brandId) {
      showError("Error", "Customer or brand information missing");
      return;
    }

    setIsSavingReasons(true);
    try {
      const statusId = String(selectedStatusId);

      await saveUserStatusBrandReasons(brandId, customerId, selectedBrandReasons, statusId);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }

      handleClose();
      const statusLabel = getStatusEnumValue(selectedStatusId).toLowerCase();
      showSuccess("Success", `User ${statusLabel} reasons updated successfully`);
    } catch (error) {
      console.error("Error saving user status reasons:", error);
      showError("Error", 
        error instanceof Error && error.message ? error.message :
        "Failed to save user status reasons");
    } finally {
      setIsSavingReasons(false);
    }
  };

  const handleClose = () => {
    setSelectedBrandReasons([]);
    setBrandReasons([]);
    onClose();
  };

  const getSelectionStatusText = () => {
    const requiresReasons = [UserStatusEnum.BLOCKED, UserStatusEnum.ON_HOLD].includes(selectedStatusId);
    
    if (selectedBrandReasons.length === 0) {
      return requiresReasons ? "Select at least 1 reason" : "No reasons selected";
    }
    if (selectedBrandReasons.length > 3) return "Too many selected";
    return "Valid selection";
  };

  const getSelectionStatusColor = () => {
    const requiresReasons = [UserStatusEnum.BLOCKED, UserStatusEnum.ON_HOLD].includes(selectedStatusId);
    
    if (selectedBrandReasons.length > 3) {
      return "text-[var(--color-error)]";
    }
    if (selectedBrandReasons.length === 0 && requiresReasons) {
      return "text-[var(--color-error)]";
    }
    if (selectedBrandReasons.length === 0 && !requiresReasons) {
      return "text-[var(--color-on-surface)] opacity-60";
    }
    return "text-[var(--color-success)]";
  };

  const renderBrandReasonsContent = () => {
    if (isLoadingReasons) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-[var(--color-muted)] rounded-lg p-4 animate-pulse">
              <div className="flex items-start">
                <div className="w-4 h-4 bg-[var(--color-muted)] rounded mr-3 mt-0.5"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[var(--color-muted)] rounded w-3/4"></div>
                  <div className="h-3 bg-[var(--color-muted)] rounded w-1/2 opacity-60"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (brandReasons.length === 0) {
      return (
        <div className="text-center py-12 px-4">
          <div className="w-16 h-16 mx-auto mb-4 bg-[var(--color-muted)] bg-opacity-50 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--color-on-surface)] opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-[var(--color-on-surface)] opacity-60 font-medium">
            No user {getStatusEnumValue(selectedStatusId).toLowerCase()} reasons configured
          </p>
          <p className="text-xs mt-2 text-[var(--color-on-surface)] opacity-50">
            Contact administrator to add user {getStatusEnumValue(selectedStatusId).toLowerCase()} reasons for this brand.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
        {brandReasons.map((reason) => {
          const isSelected = selectedBrandReasons.includes(reason.id);
          const isDisabled = !isSelected && selectedBrandReasons.length >= 3;
          
          // Determine the CSS classes based on state
          const getContainerClasses = () => {
            if (isSelected) {
              return "border-[var(--color-primary)] bg-[var(--color-primary)] bg-opacity-10 shadow-sm";
            }
            if (isDisabled) {
              return "border-[var(--color-muted)] bg-[var(--color-surface)] opacity-50 cursor-not-allowed";
            }
            return "border-[var(--color-muted)] bg-[var(--color-surface)] hover:border-[var(--color-primary)] hover:bg-[var(--color-muted)] hover:bg-opacity-50 cursor-pointer";
          };
          
          return (
            <label
              key={reason.id}
              className={`group relative border rounded-lg transition-all duration-200 block ${getContainerClasses()}`}
            >
              <div className="flex items-start p-4">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isDisabled}
                    onChange={() => handleReasonToggle(reason.id)}
                    className={`h-4 w-4 rounded border-2 focus:ring-2 focus:ring-offset-0 transition-colors ${
                      isSelected
                        ? "text-[var(--color-primary)] bg-[var(--color-primary)] border-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                        : "text-[var(--color-primary)] bg-[var(--color-surface)] border-[var(--color-muted)] focus:ring-[var(--color-primary)]"
                    } ${isDisabled ? "opacity-50" : ""}`}
                  />
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <div className={`text-sm font-medium leading-5 ${
                    isDisabled ? "text-[var(--color-on-surface)] opacity-50" : "text-[var(--color-on-surface)]"
                  }`}>
                    {reason.reason}
                  </div>
                  <div className={`text-xs mt-1 ${
                    isDisabled ? "text-[var(--color-on-surface)] opacity-30" : "text-[var(--color-on-surface)] opacity-60"
                  }`}>
                    Type: {reason.type} • Status: {reason.status}
                  </div>
                </div>
                {isSelected && (
                  <div className="ml-2 flex-shrink-0">
                    <div className="w-2 h-2 bg-[var(--color-primary)] rounded-full"></div>
                  </div>
                )}
              </div>
            </label>
          );
        })}
      </div>
    );
  };

  // Initialize status when dialog opens with fresh customer data
  useEffect(() => {
    if (isOpen && customer) {
      const statusId = customer?.status_id ? Number(customer.status_id) : UserStatusEnum.BLOCKED;
      setSelectedStatusId(statusId as UserStatusId);
    }
  }, [isOpen, customer]);

  // Fetch reasons when dialog opens or status changes
  useEffect(() => {
    if (isOpen) {
      fetchBrandReasons();
    }
  }, [isOpen, brandId, selectedStatusId]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Manage Customer Status Reasons"
    
    >
      <div >
        <div className="text-sm text-[var(--color-on-surface)]">
          {/* Account Status Selector */}
          <div className="mb-6">
            <label htmlFor="accountStatus" className="block text-sm font-semibold text-[var(--color-on-surface)] mb-3">
              user status
            </label>
            <select
              id="accountStatus"
              value={selectedStatusId}
              onChange={(e) => handleStatusChange(Number(e.target.value) as UserStatusId)}
              className="w-full px-3 py-2 border border-[var(--color-muted)] rounded-[var(--radius-brand)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-[var(--color-surface)] text-[var(--color-on-surface)] transition-colors"
            >
              <option value={UserStatusEnum.BLOCKED}>Blocked</option>
              <option value={UserStatusEnum.ON_HOLD}>On Hold</option>
              <option value={UserStatusEnum.PENDING}>Pending</option>
              <option value={UserStatusEnum.ACTIVE}>Active</option>
            </select>
          </div>

          <div className="mb-4">
            <h3 className="text-sm font-semibold text-[var(--color-on-surface)] mb-2">
              Select Reasons
            </h3>
            <p className="text-sm text-[var(--color-on-surface)] opacity-70">
              {[UserStatusEnum.BLOCKED, UserStatusEnum.ON_HOLD].includes(selectedStatusId) 
                ? `Select user ${getStatusEnumValue(selectedStatusId).toLowerCase()} reasons for this customer (minimum 1, maximum 3)`
                : `Optionally select user ${getStatusEnumValue(selectedStatusId).toLowerCase()} reasons for this customer (maximum 3)`
              }
            </p>
          </div>
          
          {renderBrandReasonsContent()}
          
          <div className="mt-4 p-4 bg-[var(--color-muted)] bg-opacity-30 rounded-lg border border-[var(--color-muted)] border-opacity-50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-on-surface)] opacity-70 font-medium">
                Selected: {selectedBrandReasons.length}/3
              </span>
              <span className={`font-semibold ${getSelectionStatusColor()}`}>
                {getSelectionStatusText()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex space-x-3 pt-6 border-t border-[var(--color-muted)] border-opacity-30">
          <button
            onClick={handleClose}
            disabled={isSavingReasons}
            className="flex-1 px-6 py-3 text-sm font-medium text-[var(--color-on-surface)] bg-[var(--color-muted)] hover:bg-[var(--color-muted)] hover:opacity-80 rounded-lg transition-all duration-200 disabled:opacity-50 border border-[var(--color-muted)]"
          >
            Cancel
          </button>
          <button
            onClick={saveUserStatusReasons}
            disabled={
              isSavingReasons || 
              selectedBrandReasons.length > 3 ||
              ([UserStatusEnum.BLOCKED, UserStatusEnum.ON_HOLD].includes(selectedStatusId) && selectedBrandReasons.length === 0)
            }
            className="flex-1 px-6 py-3 text-sm font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:opacity-90 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
          >
            {isSavingReasons ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              "Save Reasons"
            )}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
