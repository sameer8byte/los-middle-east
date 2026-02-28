import React, { useEffect, useState } from "react";
import { FiCopy, FiExternalLink } from "react-icons/fi";
import { getAgreementDetails } from "../../shared/services/api/agreament.api";
import { useToast } from "../../context/toastContext";
import { formatDateWithTime } from "../../lib/utils";
import Dialog from ".";

// Skeleton Loader Component
const SkeletonLoader: React.FC<{ width?: string; height?: string; className?: string }> = ({
  width = "w-full",
  height = "h-4",
  className = "",
}) => (
  <div
    className={`${width} ${height} bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-md animate-pulse ${className}`}
  />
);

interface LoanAgreementReference {
  id: string;
  referenceNumber: string;
  referenceType: string;
  description?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

interface LoanAgreement {
  id: string;
  status: string;
  documentUrl?: string;
  sentAt?: string;
  signedAt?: string;
  expiresAt?: string;
  workflowUrl?: string;
  createdAt: string;
  updatedAt: string;
  loanAgreementReferences?: LoanAgreementReference[];
  [key: string]: any;
}

interface LoanAgreementDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  agreement: LoanAgreement | null;
  loading?: boolean;
}

export const LoanAgreementDetailsDialog: React.FC<LoanAgreementDetailsDialogProps> = ({
  isOpen,
  onClose,
  agreement,
  loading: initialLoading = false,
}) => {
  const [agreementData, setAgreementData] = useState<LoanAgreement | null>(agreement);
  const [isLoading, setIsLoading] = useState(initialLoading);
  const { showSuccess } = useToast();

  useEffect(() => {
    if (isOpen && agreement?.id && !initialLoading) {
      fetchAgreementDetails(agreement.id);
    }
  }, [isOpen, agreement?.id, initialLoading]);

  const fetchAgreementDetails = async (agreementId: string) => {
    try {
      setIsLoading(true);
      const data = await getAgreementDetails(agreementId);
      setAgreementData(data);
    } catch (err) {
      console.error("Error fetching agreement details:", err);
      // Fallback to the passed agreement data
      setAgreementData(agreement);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !agreementData) return null;

  const displayAgreement = agreementData;
  const references = displayAgreement?.loanAgreementReferences || [];

  const getStatusColor = (status: string) => {
    const statusUpper = status?.toUpperCase();
    switch (statusUpper) {
      case "SENT":
        return {
          bg: "bg-gradient-to-br from-blue-50 to-blue-100",
          badge: "bg-blue-100 text-blue-800 border border-blue-300",
          border: "border-blue-300",
          icon: "text-blue-600",
        };
      case "SIGNED":
        return {
          bg: "bg-gradient-to-br from-green-50 to-green-100",
          badge: "bg-green-100 text-green-800 border border-green-300",
          border: "border-green-300",
          icon: "text-green-600",
        };
      case "REJECTED":
        return {
          bg: "bg-gradient-to-br from-red-50 to-red-100",
          badge: "bg-red-100 text-red-800 border border-red-300",
          border: "border-red-300",
          icon: "text-red-600",
        };
      case "EXPIRED":
        return {
          bg: "bg-gradient-to-br from-yellow-50 to-yellow-100",
          badge: "bg-yellow-100 text-yellow-800 border border-yellow-300",
          border: "border-yellow-300",
          icon: "text-yellow-600",
        };
      default:
        return {
          bg: "bg-gradient-to-br from-gray-50 to-gray-100",
          badge: "bg-gray-100 text-gray-800 border border-gray-300",
          border: "border-gray-300",
          icon: "text-gray-600",
        };
    }
  };

 

  const formatFieldLabel = (key: string) => {
    return key.split(/(?=[A-Z])/).join(' ').charAt(0).toUpperCase() + key.split(/(?=[A-Z])/).join(' ').slice(1);
  };

  return (
    <>
      {/* Dialog */}
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        title="Loan Agreement Details"
      >
        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(100vh-220px)]">
          {isLoading ? (
            // ===== SKELETON LOADING STATE =====
            <div className="space-y-4 p-2">
              {/* Skeleton - Agreement Info Card */}
              <div className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-gray-300 rounded-full" />
                  <SkeletonLoader width="w-32" height="h-4" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <SkeletonLoader width="w-24" height="h-3" className="mb-1.5" />
                    <SkeletonLoader width="w-full" height="h-4" />
                  </div>
                  <div>
                    <SkeletonLoader width="w-24" height="h-3" className="mb-1.5" />
                    <SkeletonLoader width="w-full" height="h-4" />
                  </div>
                  <div>
                    <SkeletonLoader width="w-24" height="h-3" className="mb-1.5" />
                    <SkeletonLoader width="w-full" height="h-4" />
                  </div>
                  <div>
                    <SkeletonLoader width="w-24" height="h-3" className="mb-1.5" />
                    <SkeletonLoader width="w-full" height="h-4" />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2">
                  <SkeletonLoader width="w-24" height="h-8" className="rounded" />
                  <SkeletonLoader width="w-24" height="h-8" className="rounded" />
                </div>
              </div>

              {/* Skeleton - References Card */}
              <div className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-gray-300 rounded-full" />
                  <SkeletonLoader width="w-40" height="h-4" />
                </div>
                <div className="space-y-2">
                  <div className="bg-white rounded p-3 border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <SkeletonLoader width="w-20" height="h-2" className="mb-1" />
                        <SkeletonLoader width="w-full" height="h-3" />
                      </div>
                      <div>
                        <SkeletonLoader width="w-20" height="h-2" className="mb-1" />
                        <SkeletonLoader width="w-full" height="h-3" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded p-3 border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <SkeletonLoader width="w-20" height="h-2" className="mb-1" />
                        <SkeletonLoader width="w-full" height="h-3" />
                      </div>
                      <div>
                        <SkeletonLoader width="w-20" height="h-2" className="mb-1" />
                        <SkeletonLoader width="w-full" height="h-3" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded p-3 border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <SkeletonLoader width="w-20" height="h-2" className="mb-1" />
                        <SkeletonLoader width="w-full" height="h-3" />
                      </div>
                      <div>
                        <SkeletonLoader width="w-20" height="h-2" className="mb-1" />
                        <SkeletonLoader width="w-full" height="h-3" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // ===== ACTUAL CONTENT =====
            <div className="space-y-4">
              {/* Main Agreement Details */}
              <div className={`rounded-lg p-4 shadow-sm border-2 transition-all ${getStatusColor(displayAgreement.status).bg} ${getStatusColor(displayAgreement.status).border}`}>
                <h3 className={`text-base font-bold mb-3 flex items-center gap-2 ${getStatusColor(displayAgreement.status).icon}`}>
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(displayAgreement.status).icon}`} />
                  <span className={getStatusColor(displayAgreement.status).icon}>Agreement Info</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Agreement ID */}
                  <div className="bg-white bg-opacity-60 rounded p-3 backdrop-blur-sm border border-white border-opacity-50 hover:shadow-md transition-shadow">
                    <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${getStatusColor(displayAgreement.status).icon}`}>
                      ID
                    </div>
                    <p className="text-xs font-mono text-gray-900 truncate">{displayAgreement.id}</p>
                  </div>

                  {/* Status */}
                  <div className="bg-white bg-opacity-60 rounded p-3 backdrop-blur-sm border border-white border-opacity-50 hover:shadow-md transition-shadow">
                    <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${getStatusColor(displayAgreement.status).icon}`}>
                      Status
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(displayAgreement.status).badge} shadow-sm`}>
                      ● {displayAgreement.status}
                    </span>
                  </div>

                  {/* Created */}
                  <div className="bg-white bg-opacity-60 rounded p-3 backdrop-blur-sm border border-white border-opacity-50 hover:shadow-md transition-shadow">
                    <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${getStatusColor(displayAgreement.status).icon}`}>
                      Created
                    </div>
                    <p className="text-xs text-gray-700">{formatDateWithTime(displayAgreement.createdAt)}</p>
                  </div>

                  {/* Last Updated */}
                  <div className="bg-white bg-opacity-60 rounded p-3 backdrop-blur-sm border border-white border-opacity-50 hover:shadow-md transition-shadow">
                    <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${getStatusColor(displayAgreement.status).icon}`}>
                      Updated
                    </div>
                    <p className="text-xs text-gray-700">{formatDateWithTime(displayAgreement.updatedAt)}</p>
                  </div>

                  {displayAgreement.sentAt && (
                    <div className="bg-white bg-opacity-60 rounded p-3 backdrop-blur-sm border border-white border-opacity-50 hover:shadow-md transition-shadow">
                      <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${getStatusColor(displayAgreement.status).icon}`}>
                        Sent On
                      </div>
                      <p className="text-xs text-gray-700">{formatDateWithTime(displayAgreement.sentAt)}</p>
                    </div>
                  )}

                  {displayAgreement.signedAt && (
                    <div className="bg-white bg-opacity-60 rounded p-3 backdrop-blur-sm border border-white border-opacity-50 hover:shadow-md transition-shadow">
                      <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${getStatusColor(displayAgreement.status).icon}`}>
                        Signed On
                      </div>
                      <p className="text-xs text-gray-700">{formatDateWithTime(displayAgreement.signedAt)}</p>
                    </div>
                  )}

                  {displayAgreement.expiresAt && (
                    <div className="bg-white bg-opacity-60 rounded p-3 backdrop-blur-sm border border-white border-opacity-50 hover:shadow-md transition-shadow">
                      <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${getStatusColor(displayAgreement.status).icon}`}>
                        Expires On
                      </div>
                      <p className="text-xs text-gray-700">{formatDateWithTime(displayAgreement.expiresAt)}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-3 pt-3 border-t border-white border-opacity-30 flex flex-wrap gap-2">
                  {displayAgreement.documentUrl && (
                    <a
                      href={displayAgreement.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded text-xs hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg font-medium"
                    >
                      <FiExternalLink className="h-3 w-3" />
                      Document
                    </a>
                  )}
                  {displayAgreement.workflowUrl && (
                    <div className="flex items-center gap-2">
                      <a
                        href={displayAgreement.workflowUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded text-xs hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md hover:shadow-lg font-medium"
                      >
                        <FiExternalLink className="h-3 w-3" />
                        Workflow
                      </a>

                      <button
                        onClick={() => {
                          if (displayAgreement.workflowUrl) {
                            navigator.clipboard.writeText(displayAgreement.workflowUrl);
                            showSuccess("Copied!", "Workflow URL copied to clipboard");
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 text-gray-800 rounded text-xs hover:bg-gray-200 transition-all border border-gray-300 font-medium"
                      >
                        <FiCopy className="h-3 w-3" />
                        Copy
                      </button>
                    </div>
                  )}

                </div>
              </div>

              {/* Agreement References */}
              {references.length > 0 ? (
                <div className="rounded-lg p-4 shadow-sm border-2 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                  <h3 className="text-base font-bold mb-3 flex items-center gap-2 text-amber-900">
                    <div className="w-2 h-2 rounded-full bg-amber-600" />
                    References
                    <span className="ml-auto inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-200 text-amber-800 text-xs font-bold">
                      {references.length}
                    </span>
                  </h3>
                  <div className="space-y-3">
                    {references.map((reference, index) => {
                      const refStatus = getStatusColor(reference.status || "NOT_SENT");
                      return (
                        <div
                          key={reference.id || index}
                          className={`rounded p-4 border-l-4 shadow-sm hover:shadow-md transition-all bg-white ${refStatus.border}`}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Reference ID */}
                            <div>
                              <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
                                ID
                              </div>
                              <p className="text-xs font-mono text-gray-900 truncate">{reference.id || "N/A"}</p>
                            </div>

                            {/* Reference Number */}
                            <div>
                              <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
                                Ref #
                              </div>
                              <p className="text-xs font-mono text-gray-900 truncate">{reference.referenceNumber || "N/A"}</p>
                            </div>

                            {/* Reference Type */}
                            <div>
                              <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
                                Type
                              </div>
                              <p className="text-xs text-gray-900 font-medium">{reference.referenceType || "N/A"}</p>
                            </div>

                            {/* Status */}
                            {/* {reference.status && (
                              <div>
                                <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
                                  Status
                                </div>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${refStatus.badge}`}>
                                  ● {reference.status}
                                </span>
                              </div>
                            )} */}

                            {/* Created At */}
                            {reference.createdAt && (
                              <div>
                                <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
                                  Created
                                </div>
                                <p className="text-xs text-gray-700">{formatDateWithTime(reference.createdAt)}</p>
                              </div>
                            )}

                            {/* Updated At */}
                            {reference.updatedAt && (
                              <div>
                                <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
                                  Updated
                                </div>
                                <p className="text-xs text-gray-700">{formatDateWithTime(reference.updatedAt)}</p>
                              </div>
                            )}

                            {/* Description - Full width if present */}
                            {reference.description && (
                              <div className="md:col-span-2">
                                <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
                                  Description
                                </div>
                                <p className="text-xs text-gray-900 bg-white bg-opacity-50 rounded px-2 py-1.5">{reference.description}</p>
                              </div>
                            )}

                            {/* Display all other dynamic fields */}
                            {Object.entries(reference).map(([key, value]) => {
                              // Skip already displayed fields
                              if (['id', 'referenceNumber', 'referenceType', 'status', 'createdAt', 'updatedAt', 'description'].includes(key)) {
                                return null;
                              }
                              // Skip null/undefined values
                              if (value === null || value === undefined) {
                                return null;
                              }
                              // Skip complex objects
                              if (typeof value === 'object') {
                                return null;
                              }
                              const displayLabel = formatFieldLabel(key);
                              let displayValue: string;
                              if (typeof value === 'boolean') {
                                displayValue = value ? 'Yes' : 'No';
                              } else {
                                displayValue = String(value);
                              }
                              return (
                                <div key={key}>
                                  <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
                                    {displayLabel}
                                  </div>
                                  <p className="text-xs text-gray-900 break-words">
                                    {displayValue}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg p-4 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 text-center">
                  <p className="text-gray-600 font-medium text-sm">No references available</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 px-6 py-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded text-sm transition-colors font-medium shadow-sm"
          >
            Close
          </button>
        </div>
      </Dialog>
    </>
  );
};
