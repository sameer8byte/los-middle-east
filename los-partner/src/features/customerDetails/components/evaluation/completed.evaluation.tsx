import { useState } from "react";
import { useParams } from "react-router-dom";
import { BiXCircle } from "react-icons/bi";
import { FaCheckCircle } from "react-icons/fa";
import { postLoanDetailsEvaluations } from "../../../../shared/services/api/loan.api";
import {
  Customer,
  Evaluation,
  AllottedPartner,
  UserDetails,
} from "../../../../shared/types/customers";
import { Loan, LoanStatusHistory } from "../../../../shared/types/loan";
import { Button } from "../../../../common/ui/button";

const getStatusStyle = (status: string) => {
  if (status === 'APPROVED') return 'bg-green-100 text-green-800';
  if (status === 'REJECTED') return 'bg-red-100 text-red-800';
  return 'bg-yellow-100 text-yellow-800';
};

export function CompletedEvaluate() {
  const { brandId, customerId } = useParams<{
    brandId: string;
    customerId: string;
  }>();

  const [loanId, setLoanId] = useState<string>("");
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

  const handleLoanIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoanId(e.target.value);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!loanId.trim()) {
      setError("Please enter a valid Loan ID.");
      return;
    }

    setLoading(true);
    setError(null);
    setLoanData(null);

    try {
      const response = await postLoanDetailsEvaluations(
        brandId || "",
        loanId,
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

  return (
    <div className="space-y-6">
      {/* Info Notice */}
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <div>
          <h3 className="text-sm font-medium text-blue-900 mb-1">Quick Access</h3>
          <p className="text-sm text-blue-800">
            You can also access loan evaluation details directly from the <strong>Personal Details</strong> tab using the "Search Loan" button.
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white border border-[var(--color-muted)] border-opacity-20 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-on-background)]">
              Loan Evaluation Details
            </h1>
            <p className="text-sm text-[var(--color-on-surface)] opacity-70 mt-1">
              Enter a loan ID to view detailed evaluation information
            </p>
          </div>
        </div>

        {/* Search Form */}
        <div className="space-y-4">
          <div>
            <label
              htmlFor="loanId"
              className="block text-[var(--color-on-surface)] opacity-80 font-medium mb-2"
            >
              Loan ID
            </label>
            <div className="relative">
              <input
                type="text"
                id="loanId"
                name="loanId"
                value={loanId}
                onChange={handleLoanIdChange}
                placeholder="e.g., L25060000061"
                className="w-full px-4 py-3 border border-[var(--color-muted)] border-opacity-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pr-12"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <Button
            loading={loading}
            variant="primary"
            onClick={handleSubmit}
            disabled={loading || !loanId.trim()}
            className="w-full"
          >
            {loading ? "Searching..." : "Search Loan"}
          </Button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-red-800 text-sm font-medium">{error}</span>
            </div>
          )}
        </div>
      </div>

      {loanData && (
        <div className="mt-8 space-y-6">
          {/* User Details */}
          <div className="bg-white border border-[var(--color-muted)] border-opacity-20 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[var(--color-on-background)]">
                Customer Information
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-xs text-[var(--color-on-surface)] opacity-60 mb-1">Full Name</p>
                <p className="font-medium text-[var(--color-on-background)]">
                  {(loanData.user.userDetails as UserDetails).firstName}{" "}
                  {(loanData.user.userDetails as UserDetails).lastName}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-xs text-[var(--color-on-surface)] opacity-60 mb-1">Email Address</p>
                <p className="font-medium text-[var(--color-on-background)]">{loanData.user.email}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-xs text-[var(--color-on-surface)] opacity-60 mb-1">Phone Number</p>
                <p className="font-medium text-[var(--color-on-background)]">{loanData.user.phoneNumber}</p>
              </div>
            </div>
          </div>

          {/* Loan Details */}
          <div className="bg-white border border-[var(--color-muted)] border-opacity-20 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[var(--color-on-background)]">
                Loan Information
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-xs text-[var(--color-on-surface)] opacity-60 mb-1">Loan ID</p>
                <p className="font-medium text-[var(--color-on-background)]">{loanData.formattedLoanId}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-xs text-[var(--color-on-surface)] opacity-60 mb-1">Amount</p>
                <p className="font-medium text-[var(--color-on-background)]">₹{loanData.amount?.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-xs text-[var(--color-on-surface)] opacity-60 mb-1">Purpose</p>
                <p className="font-medium text-[var(--color-on-background)]">{loanData.purpose}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-xs text-[var(--color-on-surface)] opacity-60 mb-1">Status</p>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusStyle(loanData.status)}`}>
                  {loanData.status.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          </div>

          {/* Evaluation Summary */}
          {loanData.evaluations?.length > 0 && (
            <div className="bg-white border border-[var(--color-muted)] border-opacity-20 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-[var(--color-on-background)]">
                  Evaluation Results
                </h2>
              </div>
              
              <div className="space-y-6">
                {loanData.evaluations.map((evalItem) => (
                  <div key={evalItem.id} className="space-y-3">
                    <p className="text-sm font-medium text-[var(--color-on-surface)] opacity-70 bg-gray-100 px-3 py-1 rounded-full inline-block">
                      Evaluation ID: {evalItem.id}
                    </p>
                    <div className="grid gap-3">
                      {evalItem.evaluation_item.map((item) => (
                        <div
                          key={item.id}
                          className={`p-4 rounded-lg border-l-4 ${
                            item.status === "ELIGIBLE"
                              ? "bg-green-50 border-l-green-500 border border-green-200"
                              : "bg-red-50 border-l-red-500 border border-red-200"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium text-[var(--color-on-background)]">
                                  {item.parameter}
                                </h4>
                                {item.status === "ELIGIBLE" ? (
                                  <FaCheckCircle className="text-green-600 w-4 h-4" />
                                ) : (
                                  <BiXCircle className="text-red-600 w-4 h-4" />
                                )}
                              </div>
                              <div className="space-y-1 text-sm text-[var(--color-on-surface)] opacity-70">
                                <p><span className="font-medium">Required:</span> {item.requiredValue}</p>
                                <p><span className="font-medium">Actual:</span> {item.actualValue}</p>
                                <p><span className="font-medium">Source:</span> {item.source}</p>
                              </div>
                            </div>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
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
            <div className="bg-white border border-[var(--color-muted)] border-opacity-20 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-[var(--color-on-background)]">
                  Assigned Partners
                </h2>
              </div>
              
              <div className="grid gap-3">
                {loanData.allottedPartners.map((partner) => (
                  <div
                    key={partner.partnerUser.id}
                    className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-100"
                  >
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="text-orange-600 text-sm font-medium">
                        {partner.partnerUser.name?.charAt(0) || "P"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-[var(--color-on-background)]">
                        {partner.partnerUser.name}
                      </p>
                      <p className="text-sm text-[var(--color-on-surface)] opacity-70">
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
            <div className="bg-white border border-[var(--color-muted)] border-opacity-20 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-[var(--color-on-background)]">
                  Status History
                </h2>
              </div>
              
              <div className="space-y-4">
                {loanData.loanStatusHistory.map((status, index) => (
                  <div key={status.id} className="relative">
                    {/* Timeline connector */}
                    {index !== loanData.loanStatusHistory.length - 1 && (
                      <div className="absolute left-5 top-10 w-0.5 h-16 bg-gradient-to-b from-blue-300 to-gray-200"></div>
                    )}
                    
                    <div className="flex gap-4">
                      {/* Status indicator */}
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 bg-gray-50 rounded-lg p-4 border border-gray-100">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-[var(--color-on-background)] text-lg">
                              {status.status.replace(/_/g, " ")}
                            </h3>
                            {status.message && (
                              <p className="text-sm text-[var(--color-on-surface)] opacity-70 mt-1">
                                {status.message}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-[var(--color-on-surface)] opacity-60 bg-white px-3 py-1 rounded-full border">
                            {new Date(status.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>

                        {/* Partner User */}
                        {status.partnerUser && (
                          <div className="bg-white rounded-md p-3 border border-gray-100 mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 text-xs font-medium">
                                  {status.partnerUser.name?.charAt(0) || "U"}
                                </span>
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-[var(--color-on-background)] text-sm">
                                  {status.partnerUser.name || "Not Assigned"}
                                </p>
                                <p className="text-xs text-[var(--color-on-surface)] opacity-70">
                                  {status.partnerUser.email || "No email"}
                                </p>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
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
                          <div className="bg-red-50 border border-red-200 rounded-md p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm font-medium text-red-800">
                                Rejection Reasons ({status.loan_status_brand_reasons.length})
                              </span>
                            </div>
                            
                            <div className="space-y-1">
                              {status.loan_status_brand_reasons.map((reasonLink, idx) => (
                                <div
                                  key={reasonLink.id}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <span className="text-red-600 font-medium">
                                    {idx + 1}.
                                  </span>
                                  <span className="text-red-800 flex-1">
                                    {reasonLink.brandStatusReason.reason}
                                  </span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
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
  );
}
