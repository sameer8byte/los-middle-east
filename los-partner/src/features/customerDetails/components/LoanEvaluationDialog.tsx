import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { BiXCircle } from "react-icons/bi";
import { FaCheckCircle } from "react-icons/fa";
import { postLoanDetailsEvaluations } from "../../../shared/services/api/loan.api";
import { getCustomerLoans } from "../../../shared/services/api/customer.api";
import {
  Customer,
  Evaluation,
  AllottedPartner,
  UserDetails,
} from "../../../shared/types/customers";
import { Loan, LoanStatusHistory } from "../../../shared/types/loan";
import { AcefoneClickToDialButton } from "../../acefone";
import { Button } from "../../../common/ui/button";
import Dialog from "../../../common/dialog";

const getStatusStyle = (status: string) => {
  if (status === 'APPROVED') return 'bg-green-100 text-green-800';
  if (status === 'REJECTED') return 'bg-red-100 text-red-800';
  return 'bg-yellow-100 text-yellow-800';
};

interface LoanEvaluationDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoanEvaluationDialog({ isOpen, onClose }: Readonly<LoanEvaluationDialogProps>) {
  const { brandId, customerId } = useParams<{
    brandId: string;
    customerId: string;
  }>();

  const [selectedLoanId, setSelectedLoanId] = useState<string>("");
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loadingLoans, setLoadingLoans] = useState<boolean>(false);
  const [loanData, setLoanData] = useState<
    | (Loan & {
        user: Customer & {
          userDetails: {
            firstName: string;
            lastName: string;
          };
        };
        evaluations: Evaluation[];
        allottedPartners: AllottedPartner[];
        loanStatusHistory: LoanStatusHistory[];
      })
    | null
  >(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch customer loans when dialog opens
  useEffect(() => {
    const fetchLoans = async () => {
      if (isOpen && customerId && loans.length === 0) {
        setLoadingLoans(true);
        setError(null);
        try {
          const response = await getCustomerLoans(customerId);
          setLoans(response || []);
        } catch (err) {
          console.error("Error fetching loans:", err);
          setError("Failed to load loans. Please try again.");
        } finally {
          setLoadingLoans(false);
        }
      }
    };
    fetchLoans();
  }, [isOpen, customerId, loans.length]);

  const handleLoanSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLoanId(e.target.value);
    setError(null);
    setLoanData(null);
  };

  const handleSubmit = async () => {
    if (!selectedLoanId.trim()) {
      setError("Please select a loan.");
      return;
    }

    setLoading(true);
    setError(null);
    setLoanData(null);

    try {
      const response = await postLoanDetailsEvaluations(
        brandId || "",
        selectedLoanId,
        customerId || ""
      );
      if (response) {
        setLoanData(response);
      } else {
        setError("No details found for this Loan ID.");
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedLoanId("");
    setLoanData(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Loan Evaluation Details"
      size="xl"
      height="full"
    >
      <div className="space-y-3">
        {/* Loan Selection Form */}
        <div className="space-y-2">
          <div>
            <label
              htmlFor="loanSelect"
              className="block text-[var(--color-on-surface)] opacity-80 font-medium mb-1.5 text-sm"
            >
              Select Loan
            </label>
            {loadingLoans && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                <span className="ml-2 text-xs text-[var(--color-on-surface)] opacity-70">Loading loans...</span>
              </div>
            )}
            
            {!loadingLoans && loans.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2.5 flex items-center gap-2">
                <svg className="w-4 h-4 text-yellow-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-yellow-800 text-xs font-medium">No loans found for this customer</span>
              </div>
            )}
            
            {!loadingLoans && loans.length > 0 && (
              <div className="relative">
                <select
                  id="loanSelect"
                  name="loanSelect"
                  value={selectedLoanId}
                  onChange={handleLoanSelect}
                  className="w-full px-3 py-2 text-sm border border-[var(--color-muted)] border-opacity-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white pr-8"
                >
                  <option value="">Select a loan...</option>
                  {loans.map((loan) => (
                    <option key={loan.id} value={loan.formattedLoanId}>
                      {loan.formattedLoanId} - ₹{loan.amount?.toLocaleString()} ({loan.status.replace(/_/g, " ")})
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {loans.length > 0 && (
            <Button
              loading={loading}
              variant="primary"
              onClick={handleSubmit}
              disabled={loading || !selectedLoanId.trim()}
              className="w-full text-sm py-2"
            >
              {loading ? "Loading..." : "View Details"}
            </Button>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-red-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-red-800 text-xs font-medium">{error}</span>
            </div>
          )}
        </div>

        {loanData && (
          <div className="space-y-3">
            {/* User Details */}
            <div className="bg-white border border-[var(--color-muted)] border-opacity-20 rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-green-600 rounded flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold text-[var(--color-on-background)]">
                  Customer Information
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="bg-gray-50 rounded p-2 border border-gray-100">
                  <p className="text-[10px] text-[var(--color-on-surface)] opacity-60 mb-0.5">Full Name</p>
                  <p className="font-medium text-[var(--color-on-background)] text-xs">
                    {(loanData.user.userDetails as UserDetails).firstName}{" "}
                    {(loanData.user.userDetails as UserDetails).lastName}
                  </p>
                </div>
                <div className="bg-gray-50 rounded p-2 border border-gray-100">
                  <p className="text-[10px] text-[var(--color-on-surface)] opacity-60 mb-0.5">Email Address</p>
                  <p className="font-medium text-[var(--color-on-background)] text-xs truncate">{loanData.user.email}</p>
                </div>
                <div className="bg-gray-50 rounded p-2 border border-gray-100">
                  <p className="text-[10px] text-[var(--color-on-surface)] opacity-60 mb-0.5">Phone Number</p>
                  <div className="flex items-center gap-2 justify-between">
                    <p className="font-medium text-[var(--color-on-background)] text-xs">{loanData.user.phoneNumber}</p>
                    {loanData.user.id && (
                      <AcefoneClickToDialButton userId={loanData.user.id} />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Loan Details */}
            <div className="bg-white border border-[var(--color-muted)] border-opacity-20 rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold text-[var(--color-on-background)]">
                  Loan Information
                </h2>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                <div className="bg-gray-50 rounded p-2 border border-gray-100">
                  <p className="text-[10px] text-[var(--color-on-surface)] opacity-60 mb-0.5">Loan ID</p>
                  <p className="font-medium text-[var(--color-on-background)] text-xs">{loanData.formattedLoanId}</p>
                </div>
                <div className="bg-gray-50 rounded p-2 border border-gray-100">
                  <p className="text-[10px] text-[var(--color-on-surface)] opacity-60 mb-0.5">Amount</p>
                  <p className="font-medium text-[var(--color-on-background)] text-xs">₹{loanData.amount?.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 rounded p-2 border border-gray-100">
                  <p className="text-[10px] text-[var(--color-on-surface)] opacity-60 mb-0.5">Purpose</p>
                  <p className="font-medium text-[var(--color-on-background)] text-xs truncate">{loanData.purpose}</p>
                </div>
                <div className="bg-gray-50 rounded p-2 border border-gray-100">
                  <p className="text-[10px] text-[var(--color-on-surface)] opacity-60 mb-0.5">Status</p>
                  <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded-full ${getStatusStyle(loanData.status)}`}>
                    {loanData.status.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            </div>

            {/* Evaluation Summary */}
            {loanData.evaluations?.length > 0 && (
              <div className="bg-white border border-[var(--color-muted)] border-opacity-20 rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-purple-600 rounded flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h2 className="text-sm font-semibold text-[var(--color-on-background)]">
                    Evaluation Results
                  </h2>
                </div>
                
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {loanData.evaluations.map((evalItem) => (
                    <div key={evalItem.id} className="space-y-2">
                      <p className="text-[10px] font-medium text-[var(--color-on-surface)] opacity-70 bg-gray-100 px-2 py-0.5 rounded inline-block">
                        Eval: {evalItem.id}
                      </p>
                      <div className="grid gap-2">
                        {evalItem.evaluation_item.map((item) => (
                          <div
                            key={item.id}
                            className={`p-2 rounded-lg border-l-2 ${
                              item.status === "ELIGIBLE"
                                ? "bg-green-50 border-l-green-500 border border-green-200"
                                : "bg-red-50 border-l-red-500 border border-red-200"
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <h4 className="font-medium text-[var(--color-on-background)] text-xs truncate">
                                    {item.parameter}
                                  </h4>
                                  {item.status === "ELIGIBLE" ? (
                                    <FaCheckCircle className="text-green-600 w-3 h-3 shrink-0" />
                                  ) : (
                                    <BiXCircle className="text-red-600 w-3 h-3 shrink-0" />
                                  )}
                                </div>
                                <div className="space-y-0.5 text-[10px] text-[var(--color-on-surface)] opacity-70">
                                  <p><span className="font-medium">Req:</span> {item.requiredValue}</p>
                                  <p><span className="font-medium">Act:</span> {item.actualValue}</p>
                                  <p><span className="font-medium">Src:</span> {item.source}</p>
                                </div>
                              </div>
                              <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded shrink-0 ${
                                item.status === "ELIGIBLE"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}>
                                {item.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Allotted Partners */}
            {loanData.allottedPartners?.length > 0 && (
              <div className="bg-white border border-[var(--color-muted)] border-opacity-20 rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-orange-600 rounded flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                    </svg>
                  </div>
                  <h2 className="text-sm font-semibold text-[var(--color-on-background)]">
                    Assigned Partners
                  </h2>
                </div>
                
                <div className="grid gap-2">
                  {loanData.allottedPartners.map((partner) => (
                    <div
                      key={partner.partnerUser.id}
                      className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-100"
                    >
                      <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-orange-600 text-xs font-medium">
                          {partner.partnerUser.name?.charAt(0) || "P"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[var(--color-on-background)] text-xs truncate">
                          {partner.partnerUser.name}
                        </p>
                        <p className="text-[10px] text-[var(--color-on-surface)] opacity-70 truncate">
                          {partner.partnerUser.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loan Status History */}
            {loanData.loanStatusHistory?.length > 0 && (
              <div className="bg-white border border-[var(--color-muted)] border-opacity-20 rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h2 className="text-sm font-semibold text-[var(--color-on-background)]">
                    Status History
                  </h2>
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {loanData.loanStatusHistory.map((status, index) => (
                    <div key={status.id} className="relative">
                      {/* Timeline connector */}
                      {index !== loanData.loanStatusHistory.length - 1 && (
                        <div className="absolute left-3 top-7 w-0.5 h-full bg-gradient-to-b from-blue-300 to-gray-200"></div>
                      )}
                      
                      <div className="flex gap-2">
                        {/* Status indicator */}
                        <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm z-10">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 bg-gray-50 rounded-lg p-2 border border-gray-100 mb-2">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-[var(--color-on-background)] text-xs">
                                {status.status.replace(/_/g, " ")}
                              </h3>
                              {status.message && (
                                <p className="text-[10px] text-[var(--color-on-surface)] opacity-70 mt-0.5">
                                  {status.message}
                                </p>
                              )}
                            </div>
                            <span className="text-[9px] text-[var(--color-on-surface)] opacity-60 bg-white px-1.5 py-0.5 rounded border shrink-0 ml-2">
                              {new Date(status.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>

                          {/* Partner User */}
                          {status.partnerUser && (
                            <div className="bg-white rounded p-1.5 border border-gray-100 mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                                  <span className="text-blue-600 text-[9px] font-medium">
                                    {status.partnerUser.name?.charAt(0) || "U"}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-[var(--color-on-background)] text-[10px] truncate">
                                    {status.partnerUser.name || "Not Assigned"}
                                  </p>
                                  <p className="text-[9px] text-[var(--color-on-surface)] opacity-70 truncate">
                                    {status.partnerUser.email || "No email"}
                                  </p>
                                </div>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                                  status.partnerUser.isActive
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}>
                                  {status.partnerUser.isActive ? "Active" : "Inactive"}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Brand Status Reasons */}
                          {status.loan_status_brand_reasons && status.loan_status_brand_reasons.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded p-2">
                              <div className="flex items-center gap-1.5 mb-1">
                                <svg className="w-3 h-3 text-red-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <span className="text-[10px] font-medium text-red-800">
                                  Reasons ({status.loan_status_brand_reasons.length})
                                </span>
                              </div>
                              
                              <div className="space-y-0.5">
                                {status.loan_status_brand_reasons.map((reasonLink, idx) => (
                                  <div
                                    key={reasonLink.id}
                                    className="flex items-center gap-1.5 text-[10px]"
                                  >
                                    <span className="text-red-600 font-medium shrink-0">
                                      {idx + 1}.
                                    </span>
                                    <span className="text-red-800 flex-1 truncate">
                                      {reasonLink.brandStatusReason.reason}
                                    </span>
                                    <span className={`text-[9px] px-1 py-0.5 rounded font-medium shrink-0 ${
                                      reasonLink.brandStatusReason.status === 'REJECTED'
                                        ? "bg-red-200 text-red-800"
                                        : "bg-green-200 text-green-800"
                                    }`}>
                                      {reasonLink.brandStatusReason.status}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
