import React, { useState, useCallback, useMemo, useEffect } from "react";
import { FiArrowLeft, FiAlertTriangle, FiCheck } from "react-icons/fi";
import { Button } from "../../../common/ui/button";
import Dialog from "../../../common/dialog";

interface SendBackConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (targetRole: "CREDIT_MANAGER" | "SM_SH", reason: string) => void;
  loanId: string;
  customerName: string;
}

// Enhanced Loading spinner with pulse effect
const LoadingSpinner: React.FC<{ size?: "sm" | "md" | "lg" }> = ({ 
  size = "md" 
}) => {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4", 
    lg: "h-5 w-5"
  };
  
  return (
    <div className="flex items-center justify-center">
      <div 
        className={`animate-spin rounded-full border-2 border-current border-t-transparent ${sizeClasses[size]}`}
        aria-label="Loading"
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
};

// Progress bar component
const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
  return (
    <div className="w-full bg-gray-200 rounded-full h-1 overflow-hidden">
      <div 
        className="h-full bg-orange-500 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

// Enhanced submit button with better loading states
const SubmitButton: React.FC<{
  isSubmitting: boolean;
  disabled: boolean;
  selectedRole: string;
  onClick: () => void;
  getRoleDisplayName: (role: string) => string;
  progress: number;
}> = ({ isSubmitting, disabled, selectedRole, onClick, getRoleDisplayName, progress }) => {
  if (isSubmitting) {
    return (
      <Button
        disabled
        className="bg-orange-600 text-white cursor-not-allowed relative overflow-hidden min-w-[160px]"
      >
        <div className="flex items-center justify-center gap-2">
          <LoadingSpinner size="sm" />
          <span className="animate-pulse">Processing...</span>
        </div>
        {/* Animated progress bar */}
        <div className="absolute bottom-0 left-0 right-0">
          <ProgressBar progress={progress} />
        </div>
      </Button>
    );
  }

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={`transition-all duration-200 min-w-[160px] ${
        disabled
          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
          : "bg-orange-600 hover:bg-orange-700 text-white hover:shadow-lg hover:scale-105 active:scale-95"
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        <FiArrowLeft className="h-4 w-4" />
        <span>Send Back{selectedRole ? ` to ${getRoleDisplayName(selectedRole)}` : ""}</span>
      </div>
    </Button>
  );
};

export const SendBackConfirmationDialog: React.FC<
  SendBackConfirmationDialogProps
> = ({ isOpen, onClose, onConfirm, loanId, customerName }) => {
  const [selectedRole, setSelectedRole] = useState<
    "CREDIT_MANAGER" | "SM_SH" | ""
  >("");
  const [selectedReasonType, setSelectedReasonType] = useState<string>("");
  const [customReason, setCustomReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [progress, setProgress] = useState(0);

  // Default reasons for sending back
  const defaultReasons = [
    { id: "incomplete_docs", label: "Incomplete Documents", description: "Missing or incomplete documentation" },
    { id: "verification_failed", label: "Verification Failed", description: "KYC/Identity verification issues" },
    { id: "income_mismatch", label: "Income Mismatch", description: "Income documents don't match declared income" },
    { id: "credit_issues", label: "Credit Score Issues", description: "Credit score below threshold or discrepancies" },
    { id: "bank_statement_issues", label: "Bank Statement Issues", description: "Irregularities in bank statements" },
    { id: "employment_verification", label: "Employment Verification", description: "Unable to verify employment details" },
    { id: "address_verification", label: "Address Verification", description: "Address proof verification failed" },
    { id: "other", label: "Other", description: "Specify custom reason" },
  ];

  // Memoized role display function for better performance
  const getRoleDisplayName = useCallback((role: string) => {
    switch (role) {
      case "CREDIT_MANAGER":
        return "Credit Executive";
      case "SM_SH":
        return "Sanction Manager/Head";
      default:
        return "";
    }
  }, []);

  // Memoized validation
  const isFormValid = useMemo(() => {
    if (!selectedRole) return false;
    if (selectedReasonType === "other") {
      return customReason.trim().length >= 10;
    }
    return selectedReasonType !== "";
  }, [selectedRole, selectedReasonType, customReason]);

  // Get the final reason text
  const getFinalReason = useCallback(() => {
    if (selectedReasonType === "other") {
      return customReason.trim();
    }
    const selectedDefault = defaultReasons.find(r => r.id === selectedReasonType);
    return selectedDefault ? `${selectedDefault.label}: ${selectedDefault.description}` : "";
  }, [selectedReasonType, customReason, defaultReasons]);

  // Enhanced submit handler with progress tracking
  const handleSubmit = useCallback(async () => {
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setProgress(0);
    
    try {
      // Simulate progress updates for better UX
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Complete progress
      setProgress(100);
      
      const finalReason = getFinalReason();
      onConfirm(selectedRole as "CREDIT_MANAGER" | "SM_SH", finalReason);
      
      // Show success state briefly
      setShowSuccess(true);
      
      // Close after showing success
      setTimeout(() => {
        handleClose();
      }, 1500);
      
    } catch (error) {
      console.error("Error sending back loan:", error);
      setIsSubmitting(false);
      setProgress(0);
    }
  }, [isFormValid, isSubmitting, selectedRole, getFinalReason, onConfirm]);

  // Enhanced close handler
  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    
    // Reset all states
    setSelectedRole("");
    setSelectedReasonType("");
    setCustomReason("");
    setShowSuccess(false);
    setIsSubmitting(false);
    setProgress(0);
    onClose();
  }, [isSubmitting, onClose]);

  // Helper functions for custom reason validation styles
  const getCustomReasonBorderClass = useCallback(() => {
    const len = customReason.trim().length;
    if (len > 0 && len < 10) return "border-red-300 bg-red-50";
    if (len >= 10) return "border-green-300 bg-green-50";
    return "border-gray-300 hover:border-gray-400";
  }, [customReason]);

  const getCustomReasonTextClass = useCallback(() => {
    const len = customReason.trim().length;
    if (len > 0 && len < 10) return "text-red-500";
    if (len >= 10) return "text-green-600";
    return "text-gray-500";
  }, [customReason]);

  const getCustomReasonMessage = useCallback(() => {
    const len = customReason.trim().length;
    if (len > 0 && len < 10) return `Need ${10 - len} more characters`;
    if (len >= 10) return "✓ Minimum length met";
    return "Minimum 10 characters required";
  }, [customReason]);

  // Auto-close on successful submission
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        handleClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [showSuccess, handleClose]);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedRole("");
      setSelectedReasonType("");
      setCustomReason("");
      setShowSuccess(false);
      setIsSubmitting(false);
      setProgress(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Success state overlay with enhanced animations
  if (showSuccess) {
    return (
      <Dialog title="Success" onClose={() => {}} isOpen={isOpen}>
        <div className="text-center py-8">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6 animate-bounce">
            <FiCheck className="h-8 w-8 text-green-600 animate-pulse" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3 animate-fade-in">
            Loan Sent Back Successfully!
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            The loan has been sent back to <span className="font-semibold text-orange-700">{getRoleDisplayName(selectedRole)}</span> for review.
          </p>
          <div className="space-y-2 text-xs text-gray-500">
            <p>Loan ID: <span className="font-mono">{loanId}</span></p>
            <p>Customer: <span className="font-medium">{customerName}</span></p>
          </div>
          <div className="mt-6 flex justify-center">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog title="Send Back Loan" onClose={handleClose} isOpen={isOpen}>
      <div className="animate-in fade-in-0 duration-200">
        {/* Content */}
        <div className="space-y-6">
          {/* Enhanced Warning Section */}
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg shadow-sm">
            <div className="flex-shrink-0 mt-0.5">
              <div className="h-6 w-6 rounded-full bg-orange-100 flex items-center justify-center">
                <FiAlertTriangle className="h-4 w-4 text-orange-600" />
              </div>
            </div>
            <div className="text-sm space-y-2">
              <p className="font-semibold text-orange-800">
                Are you sure you want to send back this loan?
              </p>
              <div className="grid grid-cols-1 gap-2 text-orange-700">
                <p className="flex items-center gap-2">
                  <span className="font-medium">Customer:</span>
                  <span className="px-2 py-1 bg-orange-100 rounded text-xs font-medium">{customerName}</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="font-medium">Loan ID:</span>
                  <span className="px-2 py-1 bg-orange-100 rounded text-xs font-mono">#{loanId}</span>
                </p>
              </div>
              <p className="text-orange-600 text-xs italic">
                This action will move the loan back to the selected role for review.
              </p>
            </div>
          </div>

          {/* Enhanced Role Selection */}
          <div className="space-y-3">
            <div className="block text-sm font-semibold text-gray-700">
              Send back to <span className="text-red-500">*</span>
            </div>
            <div className="grid gap-3">
              <div className={`group relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                selectedRole === "CREDIT_MANAGER" 
                  ? "border-orange-500 bg-orange-50 shadow-md scale-[1.02]" 
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              } ${isSubmitting ? "opacity-50 cursor-not-allowed" : "hover:shadow-sm"}`}>
                <input
                  id="credit-manager"
                  type="radio"
                  name="targetRole"
                  value="CREDIT_MANAGER"
                  checked={selectedRole === "CREDIT_MANAGER"}
                  onChange={(e) =>
                    !isSubmitting && setSelectedRole(e.target.value as "CREDIT_MANAGER")
                  }
                  className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300"
                  disabled={isSubmitting}
                />
                <label
                  htmlFor="credit-manager"
                  className="ml-4 cursor-pointer flex-1"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900">Credit Executive</span>
                    {selectedRole === "CREDIT_MANAGER" && (
                      <span className="px-2 py-0.5 bg-orange-200 text-orange-800 text-xs rounded-full font-medium">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Send back to credit executive for initial review and assessment
                  </p>
                </label>
              </div>

              <div className={`group relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                selectedRole === "SM_SH" 
                  ? "border-orange-500 bg-orange-50 shadow-md scale-[1.02]" 
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              } ${isSubmitting ? "opacity-50 cursor-not-allowed" : "hover:shadow-sm"}`}>
                <input
                  id="sanction-manager"
                  type="radio"
                  name="targetRole"
                  value="SM_SH"
                  checked={selectedRole === "SM_SH"}
                  onChange={(e) => 
                    !isSubmitting && setSelectedRole(e.target.value as "SM_SH")
                  }
                  className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300"
                  disabled={isSubmitting}
                />
                <label
                  htmlFor="sanction-manager"
                  className="ml-4 cursor-pointer flex-1"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900">Sanction Manager/Head</span>
                    {selectedRole === "SM_SH" && (
                      <span className="px-2 py-0.5 bg-orange-200 text-orange-800 text-xs rounded-full font-medium">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Send back to sanction manager for higher level review and approval
                  </p>
                </label>
              </div>
            </div>
          </div>

          {/* Enhanced Reason Section with Default Options */}
          <div className="space-y-4">
            <div className="block text-sm font-semibold text-gray-700">
              Reason for sending back <span className="text-red-500">*</span>
            </div>
            
            {/* Default Reason Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {defaultReasons.map((reasonOption) => (
                <div
                  key={reasonOption.id}
                  onClick={() => !isSubmitting && setSelectedReasonType(reasonOption.id)}
                  className={`relative flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedReasonType === reasonOption.id
                      ? "border-orange-500 bg-orange-50 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <input
                    type="radio"
                    name="reasonType"
                    value={reasonOption.id}
                    checked={selectedReasonType === reasonOption.id}
                    onChange={() => !isSubmitting && setSelectedReasonType(reasonOption.id)}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300"
                    disabled={isSubmitting}
                  />
                  <div className="ml-3 flex-1">
                    <span className={`text-sm font-medium ${
                      selectedReasonType === reasonOption.id ? "text-orange-800" : "text-gray-900"
                    }`}>
                      {reasonOption.label}
                    </span>
                    {reasonOption.id !== "other" && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                        {reasonOption.description}
                      </p>
                    )}
                  </div>
                  {selectedReasonType === reasonOption.id && (
                    <FiCheck className="h-4 w-4 text-orange-600 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>

            {/* Custom Reason Input - Only shown when "Other" is selected */}
            {selectedReasonType === "other" && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                <label
                  htmlFor="custom-reason-textarea"
                  className="block text-sm font-medium text-gray-700"
                >
                  Please specify your reason
                  <span className="text-xs text-gray-500 font-normal ml-2">
                    (minimum 10 characters)
                  </span>
                </label>
                <div className="relative">
                  <textarea
                    id="custom-reason-textarea"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Please provide a detailed reason for sending back this loan..."
                    className={`w-full px-4 py-3 border-2 rounded-lg shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50 disabled:text-gray-500 resize-none ${getCustomReasonBorderClass()}`}
                    rows={3}
                    maxLength={500}
                  />
                  <div className="absolute top-3 right-3 text-xs text-gray-400 pointer-events-none">
                    {customReason.length}/500
                  </div>
                </div>
                
                {/* Validation feedback for custom reason */}
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-2 text-xs font-medium ${getCustomReasonTextClass()}`}>
                    {customReason.trim().length >= 10 && <FiCheck className="h-3 w-3" />}
                    {getCustomReasonMessage()}
                  </div>
                </div>
              </div>
            )}

            {/* Selected reason preview */}
            {selectedReasonType && selectedReasonType !== "other" && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Selected reason:</p>
                <p className="text-sm text-gray-800 font-medium">
                  {defaultReasons.find(r => r.id === selectedReasonType)?.label}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {defaultReasons.find(r => r.id === selectedReasonType)?.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
          <Button
            onClick={handleClose}
            variant="outline"
            disabled={isSubmitting}
            className="transition-all duration-200 hover:shadow-md"
          >
            Cancel
          </Button>
          <SubmitButton
            isSubmitting={isSubmitting}
            disabled={!isFormValid}
            selectedRole={selectedRole}
            onClick={handleSubmit}
            getRoleDisplayName={getRoleDisplayName}
            progress={progress}
          />
        </div>
      </div>
    </Dialog>
  );
};
