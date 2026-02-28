import { useEffect, useState } from "react";
import { useQueryParams } from "../../../hooks/useQueryParams";
import Dialog from "../../../common/dialog";
import { useParams } from "react-router-dom";
import { formatDateWithTime } from "../../../lib/utils";
import { FaRupeeSign, FaCheckCircle } from "react-icons/fa";
import { BiXCircle } from "react-icons/bi";
import { useAwsSignedUrl } from "../../../hooks/useAwsSignedUrl";
import { Loan } from "../../../shared/types/loan";
import { getLoanDetails } from "../../../shared/services/api/loan.api";
import { LoanStatusBadge } from "../../../common/ui/LoanStatusBadge";
import { AcefoneClickToDialButton } from "../../acefone";
import { PaymentTransactionsSummary } from "../../loanCollection/components/PaymentTransactionsSummary";

// Refactored to use theme variables with opacity
const getEvaluationItemStyle = (status: string) => {
  if (status === "ELIGIBLE") {
    return "bg-[var(--color-success)]/5 border-l-[var(--color-success)] border border-[var(--color-success)]/20";
  }
  return "bg-[var(--color-error)]/5 border-l-[var(--color-error)] border border-[var(--color-error)]/20";
};

// Refactored to use theme variables with opacity
const getEvaluationStatusBadgeStyle = (status: string) => {
  if (status === "ELIGIBLE") {
    return "bg-[var(--color-success)]/10 text-[var(--color-success)]";
  }
  return "bg-[var(--color-error)]/10 text-[var(--color-error)]";
};

// Refactored to use theme variables with opacity
const getReasonStatusBadgeStyle = (status: string) => {
  if (status === "REJECTED") {
    return "bg-[var(--color-error)]/10 text-[var(--color-error)]";
  }
  return "bg-[var(--color-success)]/10 text-[var(--color-success)]";
};

// Refactored to use theme variables with opacity
const getUserActiveBadgeStyle = (isActive: boolean) => {
  if (isActive) {
    return "bg-[var(--color-success)]/10 text-[var(--color-success)]";
  }
  return "bg-[var(--color-error)]/10 text-[var(--color-error)]";
};

const getUserActiveText = (isActive: boolean) => {
  if (isActive) {
    return "Active";
  }
  return "Inactive";
};

export function LoanRepaymentDetails() {
  const { customerId, brandId } = useParams();
  const [loading, setLoading] = useState(true);
  const { getQuery, removeQuery } = useQueryParams();
  const { fetchSignedUrl } = useAwsSignedUrl();

  const loanId = getQuery("loanId");
  const [loanDetails, setLoanDetails] = useState<Loan | null>(null);
  console.log(loanDetails);
  useEffect(() => {
    if (!loanId || loanId === "") return;
    if (!customerId || customerId === "") return;
    if (!brandId || brandId === "") return;

    const fetchLoanHistory = async () => {
      try {
        setLoading(true);
        const response = await getLoanDetails(brandId, loanId);
        setLoanDetails(response);
      } catch (error) {
        console.error("Error fetching loan:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLoanHistory();
  }, [loanId, customerId, brandId]);
  if (!customerId || !brandId) return null;

  if (!loanId) return null;

  return (
    <Dialog
      isOpen={!!loanId}
      onClose={() => {
        removeQuery("loanId");
        setLoanDetails(null);
      }}
      title={`Loan Details ${
        loanDetails?.formattedLoanId ? `(${loanDetails.formattedLoanId})` : ""
      }`}
      size="xl"
    >
      <div>
        {loading || !loanDetails ? (
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-muted)] border-t-[var(--color-primary)]"></div>
              <p className="text-[var(--color-muted)] text-sm">
                Loading loan details...
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Borrower Contact */}
            {customerId && (
              <div className="mb-4 pb-4 border-b border-[var(--color-muted)]/20">
                <p className="text-[10px] text-[var(--color-on-surface)] opacity-60 mb-3 uppercase tracking-wide font-medium">
                  BORROWER CONTACT
                </p>
                <div className="space-y-3">
                  {/* Primary Phone with Click to Dial */}
                  <div className="flex items-center gap-3 bg-[var(--color-background)] px-3 py-2 rounded-lg border border-[var(--color-muted)]/20">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-[var(--color-on-surface)] opacity-60 mb-0.5">
                        Primary Phone
                      </p>
                      <span className="text-sm font-medium text-[var(--color-on-background)] block truncate">
                        {loanDetails.user?.phoneNumber}
                      </span>
                    </div>
                    {customerId && (
                      <div className="flex-shrink-0">
                        <AcefoneClickToDialButton
                          userId={customerId}
                          loanId={loanId}
                        />
                      </div>
                    )}
                  </div>

                  {/* Alternate Phone Numbers */}
                  {(loanDetails?.user as any)?.alternatePhoneNumbers && 
                    (loanDetails.user as any).alternatePhoneNumbers.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-[var(--color-on-surface)] opacity-60">
                        Alternate Phones
                      </p>
                      <div className="space-y-2 
                      
                       grid grid-cols-1 md:grid-cols-3 gap-2">
                      
                        {(loanDetails.user as any).alternatePhoneNumbers.map(
                          (phone: any) => (
                            <div
                              key={phone.id}
                              className="flex items-center gap-3 bg-[var(--color-background)] px-3 py-2 rounded-lg border border-[var(--color-muted)]/20 hover:border-[var(--color-muted)]/40 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-[var(--color-on-background)] truncate">
                                  {phone.phone}
                                </p>
                                {(phone.name || phone.relationship) && (
                                  <p className="text-[10px] text-[var(--color-on-surface)] opacity-60 truncate">
                                    {phone.name}
                                    {phone.name && phone.relationship && " - "}
                                    {phone.relationship}
                                  </p>
                                )}
                              </div>
                              {customerId && (
                                <div className="flex-shrink-0">
                                  <AcefoneClickToDialButton
                                    alternatePhoneNumberId={phone.id}
                                    userId={customerId}
                                    loanId={loanId}
                                  />
                                </div>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Header Card - Compact */}
            <div className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-active)] text-[var(--color-on-primary)] rounded-lg p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--color-on-primary)]/20 rounded-lg flex items-center justify-center">
                    <FaRupeeSign className=" text-[var(--color-on-primary)] text-lg" />
                  </div>
                  <div>
                    <p className="text-[var(--color-on-primary)]/80 text-xs mb-0.5">
                      Loan Amount
                    </p>
                    <h2 className="text-2xl font-bold">
                      ₹{loanDetails.amount?.toLocaleString()}
                    </h2>
                  </div>
                </div>
                <LoanStatusBadge status={loanDetails.status} />
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[var(--color-on-primary)]/20">
                <div className="text-center">
                  <p className="text-[var(--color-on-primary)]/70 text-xs mb-0.5">
                    Applied
                  </p>
                  <p className="text-xs font-medium">
                    {formatDateWithTime(loanDetails.applicationDate)}
                  </p>
                </div>
                {loanDetails.approvalDate && (
                  <div className="text-center border-l border-[var(--color-on-primary)]/20">
                    <p className="text-[var(--color-on-primary)]/70 text-xs mb-0.5">
                      Approved
                    </p>
                    <p className="text-xs font-medium">
                      {formatDateWithTime(loanDetails.approvalDate)}
                    </p>
                  </div>
                )}
                {loanDetails.loanDetails?.dueDate && (
                  <div className="text-center border-l border-[var(--color-on-primary)]/20">
                    <p className="text-[var(--color-on-primary)]/70 text-xs mb-0.5">
                      Due Date
                    </p>
                    <p className="text-xs font-medium">
                      {formatDateWithTime(loanDetails.loanDetails.dueDate)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Loan Details */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-muted)] border-opacity-20 rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-gradient-to-r from-[var(--color-secondary)] to-[var(--color-secondary-active)] rounded flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-[var(--color-on-secondary)]"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold text-[var(--color-on-background)]">
                  Loan Information
                </h2>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                <div className="bg-[var(--color-background)] rounded p-2 border border-[var(--color-muted)]/50">
                  <p className="text-[10px] text-[var(--color-on-surface)] opacity-60 mb-0.5">
                    Loan ID
                  </p>
                  <p className="font-medium text-[var(--color-on-background)] text-xs">
                    {loanDetails.formattedLoanId}
                  </p>
                </div>
                <div className="bg-[var(--color-background)] rounded p-2 border border-[var(--color-muted)]/50">
                  <p className="text-[10px] text-[var(--color-on-surface)] opacity-60 mb-0.5">
                    Amount
                  </p>
                  <p className="font-medium text-[var(--color-on-background)] text-xs">
                    ₹{loanDetails.amount?.toLocaleString()}
                  </p>
                </div>
                <div className="bg-[var(--color-background)] rounded p-2 border border-[var(--color-muted)]/50">
                  <p className="text-[10px] text-[var(--color-on-surface)] opacity-60 mb-0.5">
                    Purpose
                  </p>
                  <p className="font-medium text-[var(--color-on-background)] text-xs truncate">
                    {loanDetails.purpose}
                  </p>
                </div>
                <div className="bg-[var(--color-background)] rounded p-2 border border-[var(--color-muted)]/50">
                  <p className="text-[10px] text-[var(--color-on-surface)] opacity-60 mb-0.5">
                    Status
                  </p>

                  <LoanStatusBadge status={loanDetails.status} />
                </div>
              </div>
            </div>

            {/* success payment transaction */}
            <PaymentTransactionsSummary
              paymentRequests={loanDetails.paymentRequests}
              loanDetails={loanDetails}
            />

            {/* Loan Terms & Repayment Details - Enhanced */}
            {(loanDetails.loanDetails ||
              loanDetails.repayment ||
              loanDetails.costSummary) && (
              <div className="bg-[var(--color-surface)] border border-[var(--color-muted)] border-opacity-20 rounded-lg shadow-sm overflow-hidden">
                {/* Section Header */}
                <div className="bg-gradient-to-r from-[var(--color-secondary)]/10 to-transparent px-4 py-3 border-b border-[var(--color-muted)]/20">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-[var(--color-secondary)] to-[var(--color-secondary-active)] rounded flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-[var(--color-on-secondary)]"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                      </svg>
                    </div>
                    <h2 className="text-sm font-semibold text-[var(--color-on-background)]">
                      Loan Terms & Repayment
                    </h2>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* Loan Terms Grid */}
                  {loanDetails.loanDetails && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="bg-[var(--color-background)] rounded-lg p-2.5 border border-[var(--color-muted)]/30">
                        <p className="text-[10px] text-[var(--color-on-surface)] opacity-60 mb-0.5 uppercase tracking-wide">
                          Principal
                        </p>
                        <p className="font-semibold text-[var(--color-on-background)] text-sm">
                          ₹{loanDetails.amount?.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-[var(--color-background)] rounded-lg p-2.5 border border-[var(--color-muted)]/30">
                        <p className="text-[10px] text-[var(--color-on-surface)] opacity-60 mb-0.5 uppercase tracking-wide">
                          Duration
                        </p>
                        <p className="font-semibold text-[var(--color-on-background)] text-sm">
                          {loanDetails.loanDetails.durationDays} days
                        </p>
                      </div>
                      <div className="bg-[var(--color-background)] rounded-lg p-2.5 border border-[var(--color-muted)]/30">
                        <p className="text-[10px] text-[var(--color-on-surface)] opacity-60 mb-0.5 uppercase tracking-wide">
                          Loan Type
                        </p>
                        <p className="font-semibold text-[var(--color-on-background)] text-sm">
                          {loanDetails.loanDetails.type ||
                            loanDetails.loanType ||
                            "N/A"}
                        </p>
                      </div>
                      <div className="bg-[var(--color-background)] rounded-lg p-2.5 border border-[var(--color-muted)]/30">
                        <p className="text-[10px] text-[var(--color-on-surface)] opacity-60 mb-0.5 uppercase tracking-wide">
                          Due Date
                        </p>
                        <p className="font-semibold text-[var(--color-on-background)] text-sm">
                          {loanDetails.loanDetails.dueDate
                            ? formatDateWithTime(
                                loanDetails.loanDetails.dueDate,
                              )
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Repayment Summary Cards */}
                  {loanDetails.repayment && (
                    <>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                        <div className="bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-primary)]/5 rounded-lg p-3 border border-[var(--color-primary)]/20">
                          <p className="text-[10px] text-[var(--color-primary)] opacity-80 mb-1 uppercase tracking-wide font-medium">
                            Total Obligation
                          </p>
                          <p className="text-lg font-bold text-[var(--color-primary)]">
                            ₹
                            {loanDetails.repayment.totalObligation?.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-[var(--color-background)] rounded-lg p-3 border border-[var(--color-muted)]/30">
                          <p className="text-[10px] text-[var(--color-on-surface)] opacity-60 mb-1 uppercase tracking-wide">
                            Total Fees
                          </p>
                          <p className="text-lg font-semibold text-[var(--color-on-background)]">
                            ₹{loanDetails.repayment.totalFees?.toLocaleString()}
                          </p>
                        </div>
                        {loanDetails.costSummary && (
                          <>
                            <div className="bg-[var(--color-background)] rounded-lg p-3 border border-[var(--color-muted)]/30">
                              <p className="text-[10px] text-[var(--color-on-surface)] opacity-60 mb-1 uppercase tracking-wide">
                                Total Taxes
                              </p>
                              <p className="text-lg font-semibold text-[var(--color-on-background)]">
                                ₹
                                {loanDetails.costSummary.totalTaxes?.toLocaleString()}
                              </p>
                            </div>
                            <div className="bg-[var(--color-warning)]/10 rounded-lg p-3 border border-[var(--color-warning)]/20">
                              <p className="text-[10px] text-[var(--color-warning)] opacity-80 mb-1 uppercase tracking-wide font-medium">
                                Effective APR
                              </p>
                              <p className="text-lg font-bold text-[var(--color-warning)]">
                                {loanDetails.costSummary.effectiveAPR?.toFixed(
                                  2,
                                )}
                                %
                              </p>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Fee Breakdown - Collapsible Style */}
                      {loanDetails.repayment.feeBreakdowns &&
                        loanDetails.repayment.feeBreakdowns.length > 0 && (
                          <div className="border border-[var(--color-muted)]/20 rounded-lg overflow-hidden">
                            <div className="bg-[var(--color-background)] px-3 py-2 border-b border-[var(--color-muted)]/20">
                              <h4 className="font-medium text-[var(--color-on-background)] text-xs uppercase tracking-wide flex items-center gap-2">
                                <svg
                                  className="w-3.5 h-3.5 opacity-60"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                Fee Breakdown
                                <span className="ml-auto text-[10px] font-normal opacity-60">
                                  ({loanDetails.repayment.feeBreakdowns.length}{" "}
                                  items)
                                </span>
                              </h4>
                            </div>
                            <div className="divide-y divide-[var(--color-muted)]/10">
                              {loanDetails.repayment.feeBreakdowns.map(
                                (fee) => (
                                  <div
                                    key={fee.id}
                                    className="p-3 hover:bg-[var(--color-background)]/50 transition-colors"
                                  >
                                    <div className="flex justify-between items-start mb-1.5">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-[var(--color-on-background)] text-sm">
                                            {fee.type}
                                          </span>
                                          <span
                                            className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                                              fee.chargeMode === "EXCLUSIVE"
                                                ? "bg-blue-100 text-blue-700"
                                                : "bg-purple-100 text-purple-700"
                                            }`}
                                          >
                                            {fee.chargeMode}
                                          </span>
                                          {fee.isRecurringDaily && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                                              DAILY
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-[10px] text-[var(--color-on-surface)] opacity-60">
                                          <span>Rate: {fee.chargeValue}%</span>
                                          <span>•</span>
                                          <span>
                                            Base: ₹
                                            {fee.calculationBaseAmount?.toLocaleString()}
                                          </span>
                                        </div>
                                      </div>
                                      <span className="font-bold text-[var(--color-on-background)] text-base">
                                        ₹{fee.total?.toLocaleString()}
                                      </span>
                                    </div>
                                    {fee.taxes && fee.taxes.length > 0 && (
                                      <div className="mt-2 pl-3 border-l-2 border-[var(--color-muted)]/30 space-y-1">
                                        {fee.taxes.map((tax) => (
                                          <div
                                            key={tax.id}
                                            className="flex justify-between text-[10px]"
                                          >
                                            <span className="text-[var(--color-on-surface)] opacity-70 flex items-center gap-1">
                                              <span className="w-1 h-1 rounded-full bg-[var(--color-muted)]"></span>
                                              {tax.type} @ {tax.chargeValue}%
                                              {tax.isInclusive && (
                                                <span className="text-[8px] px-1 py-0.5 rounded bg-gray-100 text-gray-600">
                                                  incl.
                                                </span>
                                              )}
                                            </span>
                                            <span className="text-[var(--color-on-background)] font-medium">
                                              ₹{tax.amount?.toLocaleString()}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Early Repayment & Penalties - Enhanced */}
            {(loanDetails.earlyRepayment ||
              (loanDetails.penalties && loanDetails.penalties.length > 0)) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Early Repayment Discount */}
                {loanDetails.earlyRepayment && (
                  <div className="bg-[var(--color-surface)] border border-[var(--color-success)]/30 rounded-lg overflow-hidden">
                    <div className="bg-[var(--color-success)]/10 px-3 py-2 border-b border-[var(--color-success)]/20 flex items-center gap-2">
                      <div className="w-5 h-5 bg-[var(--color-success)] rounded-full flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <h3 className="text-sm font-semibold text-[var(--color-success)]">
                        Early Repayment Benefit
                      </h3>
                    </div>
                    <div className="p-4">
                      <div className="text-center">
                        <p className="text-[10px] text-[var(--color-on-surface)] opacity-60 uppercase tracking-wide mb-1">
                          Daily Discount Rate
                        </p>
                        <p className="text-2xl font-bold text-[var(--color-success)]">
                          ₹
                          {loanDetails.earlyRepayment.totalAmount?.toLocaleString()}
                        </p>
                        <p className="text-xs text-[var(--color-on-surface)] opacity-70 mt-1">
                          per day of early repayment
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Penalties Configuration */}
                {loanDetails.penalties && loanDetails.penalties.length > 0 && (
                  <div className="bg-[var(--color-surface)] border border-[var(--color-error)]/30 rounded-lg overflow-hidden">
                    <div className="bg-[var(--color-error)]/10 px-3 py-2 border-b border-[var(--color-error)]/20 flex items-center gap-2">
                      <div className="w-5 h-5 bg-[var(--color-error)] rounded-full flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <h3 className="text-sm font-semibold text-[var(--color-error)]">
                        Late Payment Penalties
                      </h3>
                      <span className="ml-auto text-[10px] bg-[var(--color-error)]/20 text-[var(--color-error)] px-1.5 py-0.5 rounded-full font-medium">
                        {loanDetails.penalties.length} penalty
                        {loanDetails.penalties.length > 1 ? " rules" : " rule"}
                      </span>
                    </div>
                    <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
                      {loanDetails.penalties.map((penalty) => (
                        <div
                          key={penalty.id}
                          className="bg-[var(--color-background)] rounded-lg p-2.5 border border-[var(--color-muted)]/20"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-[var(--color-on-background)] flex items-center gap-1.5">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                                  penalty.type === "SIMPLE"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-purple-100 text-purple-700"
                                }`}
                              >
                                {penalty.type}
                              </span>
                            </span>
                            <span className="text-sm font-bold text-[var(--color-error)]">
                              {penalty.chargeValue}
                              {penalty.valueType === "percentage" ? "%" : ""}
                              <span className="text-[10px] font-normal opacity-70 ml-0.5">
                                {penalty.valueType === "percentage"
                                  ? "rate"
                                  : "fixed"}
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-[var(--color-on-surface)] opacity-60">
                            <span className="flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-[var(--color-muted)]"></span>
                              Tax: {penalty.taxType} @ {penalty.taxChargeValue}%
                            </span>
                            {penalty.isTaxInclusive && (
                              <span className="px-1 py-0.5 rounded bg-gray-100 text-gray-600 text-[8px]">
                                Tax Inclusive
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Disbursement Details - Enhanced */}
            {loanDetails.disbursement && (
              <div className="bg-[var(--color-surface)] border border-[var(--color-muted)] border-opacity-20 rounded-lg shadow-sm overflow-hidden">
                {/* Section Header */}
                <div className="bg-gradient-to-r from-[var(--color-success)]/10 to-transparent px-4 py-3 border-b border-[var(--color-muted)]/20">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-[var(--color-success)] to-[var(--color-success-active)] rounded flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                      </svg>
                    </div>
                    <h2 className="text-sm font-semibold text-[var(--color-on-background)]">
                      Disbursement Details
                    </h2>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* Disbursement Summary */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-[var(--color-background)] rounded-lg p-3 border border-[var(--color-muted)]/30 text-center">
                      <p className="text-[10px] text-[var(--color-on-surface)] opacity-60 mb-1 uppercase tracking-wide">
                        Gross Amount
                      </p>
                      <p className="text-lg font-semibold text-[var(--color-on-background)]">
                        ₹
                        {loanDetails.disbursement.grossAmount?.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-[var(--color-success)]/10 to-[var(--color-success)]/5 rounded-lg p-3 border border-[var(--color-success)]/30 text-center">
                      <p className="text-[10px] text-[var(--color-success)] mb-1 uppercase tracking-wide font-medium">
                        Net Disbursed
                      </p>
                      <p className="text-lg font-bold text-[var(--color-success)]">
                        ₹{loanDetails.disbursement.netAmount?.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-[var(--color-error)]/5 rounded-lg p-3 border border-[var(--color-error)]/30 text-center">
                      <p className="text-[10px] text-[var(--color-error)] mb-1 uppercase tracking-wide font-medium">
                        Total Deducted
                      </p>
                      <p className="text-lg font-bold text-[var(--color-error)]">
                        -₹
                        {loanDetails.disbursement.totalDeductions?.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Deductions Breakdown */}
                  {loanDetails.disbursement.deductions &&
                    loanDetails.disbursement.deductions.length > 0 && (
                      <div className="border border-[var(--color-muted)]/20 rounded-lg overflow-hidden">
                        <div className="bg-[var(--color-background)] px-3 py-2 border-b border-[var(--color-muted)]/20">
                          <h4 className="font-medium text-[var(--color-on-background)] text-xs uppercase tracking-wide flex items-center gap-2">
                            <svg
                              className="w-3.5 h-3.5 opacity-60"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Deductions Breakdown
                            <span className="ml-auto text-[10px] font-normal opacity-60">
                              ({loanDetails.disbursement.deductions.length}{" "}
                              items)
                            </span>
                          </h4>
                        </div>
                        <div className="divide-y divide-[var(--color-muted)]/10">
                          {loanDetails.disbursement.deductions.map(
                            (deduction) => (
                              <div
                                key={deduction.id}
                                className="p-3 hover:bg-[var(--color-background)]/50 transition-colors"
                              >
                                <div className="flex justify-between items-start mb-1.5">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-[var(--color-on-background)] text-sm">
                                        {deduction.type}
                                      </span>
                                      <span
                                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                                          deduction.chargeMode === "EXCLUSIVE"
                                            ? "bg-blue-100 text-blue-700"
                                            : "bg-purple-100 text-purple-700"
                                        }`}
                                      >
                                        {deduction.chargeMode}
                                      </span>
                                      {deduction.isRecurringDaily && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                                          DAILY
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-[10px] text-[var(--color-on-surface)] opacity-60">
                                      <span>
                                        Rate: {deduction.chargeValue}%
                                      </span>
                                      <span>•</span>
                                      <span>
                                        Base: ₹
                                        {deduction.calculationBaseAmount?.toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="font-bold text-[var(--color-error)] text-base">
                                    -₹{deduction.total?.toLocaleString()}
                                  </span>
                                </div>
                                {deduction.taxes &&
                                  deduction.taxes.length > 0 && (
                                    <div className="mt-2 pl-3 border-l-2 border-[var(--color-muted)]/30 space-y-1">
                                      {deduction.taxes.map((tax) => (
                                        <div
                                          key={tax.id}
                                          className="flex justify-between text-[10px]"
                                        >
                                          <span className="text-[var(--color-on-surface)] opacity-70 flex items-center gap-1">
                                            <span className="w-1 h-1 rounded-full bg-[var(--color-muted)]"></span>
                                            {tax.type} @ {tax.chargeValue}%
                                            {tax.isInclusive && (
                                              <span className="text-[8px] px-1 py-0.5 rounded bg-gray-100 text-gray-600">
                                                incl.
                                              </span>
                                            )}
                                          </span>
                                          <span className="text-[var(--color-on-background)] font-medium">
                                            ₹{tax.amount?.toLocaleString()}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Agreement - Compact */}
            {loanDetails.agreement && (
              <div className="bg-[var(--color-surface)] border border-[var(--color-muted)] border-opacity-30 rounded-lg p-4">
                <h3 className="text-base font-semibold text-[var(--color-on-background)] mb-3">
                  Agreement Details
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  {/* Agreement Info */}
                  <div className="bg-[var(--color-background)] rounded-lg p-3 border border-[var(--color-muted)] border-opacity-20">
                    <h4 className="text-xs font-medium text-[var(--color-on-surface)] opacity-70 mb-2">
                      Agreement Info
                    </h4>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[var(--color-on-surface)] opacity-80">
                          ID
                        </span>
                        <span
                          className="font-medium text-[var(--color-on-background)] truncate ml-2"
                          title={loanDetails.agreement.id || ""}
                        >
                          {loanDetails.agreement.id
                            ? `${loanDetails.agreement.id.slice(0, 8)}...`
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--color-on-surface)] opacity-80">
                          Status
                        </span>
                        <span className="font-semibold text-[var(--color-warning)]">
                          {loanDetails.agreement.status || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--color-on-surface)] opacity-80">
                          Signed
                        </span>
                        <span
                          className={`font-semibold ${
                            loanDetails.agreement.signedByUser
                              ? "text-[var(--color-success)]"
                              : "text-[var(--color-error)]"
                          }`}
                        >
                          {loanDetails.agreement.signedByUser ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Reference Info */}
                  <div className="bg-[var(--color-background)] rounded-lg p-3 border border-[var(--color-muted)] border-opacity-20">
                    <h4 className="text-xs font-medium text-[var(--color-on-surface)] opacity-70 mb-2">
                      Reference Info
                    </h4>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[var(--color-on-surface)] opacity-80">
                          Doc ID
                        </span>
                        <span
                          className="font-medium text-[var(--color-on-background)] truncate ml-2"
                          title={loanDetails.agreement.referenceDocId || ""}
                        >
                          {loanDetails.agreement.referenceDocId
                            ? `${loanDetails.agreement.referenceDocId.slice(
                                0,
                                8,
                              )}...`
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--color-on-surface)] opacity-80">
                          Ref ID
                        </span>
                        <span
                          className="font-medium text-[var(--color-on-background)] truncate ml-2"
                          title={loanDetails.agreement.referenceId || ""}
                        >
                          {loanDetails.agreement.referenceId
                            ? `${loanDetails.agreement.referenceId.slice(
                                0,
                                8,
                              )}...`
                            : "N/A"}
                        </span>
                      </div>
                      {!!loanDetails.agreement?.signedFilePrivateKey && (
                        <button
                          onClick={() => {
                            if (loanDetails.agreement.signedFilePrivateKey)
                              fetchSignedUrl(
                                loanDetails.agreement.signedFilePrivateKey,
                              );
                          }}
                          className="text-xs font-medium text-[var(--color-primary)] hover:underline mt-1"
                        >
                          Download Signed File
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Status History - Compact */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-muted)] border-opacity-30 rounded-lg p-4">
              <h3 className="text-base font-semibold text-[var(--color-on-background)] mb-4 flex items-center gap-2">
                <div className="w-5 h-5 bg-[var(--color-primary)] rounded-full flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-[var(--color-on-primary)]"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                Status History
              </h3>

              <div className="space-y-3">
                {loanDetails.loanStatusHistory.map((history, index) => (
                  <div key={`history-${index}`} className="relative">
                    <div className="flex gap-3">
                      {/* Content */}
                      <div className="flex-1 bg-[var(--color-background)] rounded-lg p-3 border border-[var(--color-muted)] border-opacity-30">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <LoanStatusBadge status={history.status} />
                            {history.message && (
                              <p className="text-xs text-[var(--color-on-surface)] opacity-80 mt-0.5">
                                {history.message}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-[var(--color-on-surface)] opacity-60 ml-2">
                            {formatDateWithTime(history.createdAt)}
                          </span>
                        </div>

                        {/* Partner User Info - Compact */}
                        {history.partnerUser && (
                          <div className="bg-[var(--color-surface)] rounded-md p-2 border border-[var(--color-muted)] border-opacity-20 mb-2">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-6 h-6 bg-[var(--color-primary)] rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-[var(--color-on-primary)] text-xs font-medium">
                                  {history.partnerUser.name?.charAt(0) || "U"}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-[var(--color-on-background)] text-xs truncate">
                                  {history.partnerUser.name || "N/A"}
                                </p>
                                <p className="text-xs text-[var(--color-on-surface)] opacity-70 truncate">
                                  {history.partnerUser.email || "No email"}
                                </p>
                              </div>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${getUserActiveBadgeStyle(
                                  history.partnerUser.isActive,
                                )}`}
                              >
                                {getUserActiveText(
                                  history.partnerUser.isActive,
                                )}
                              </span>
                            </div>

                            {/* Manager Info - Inline */}
                            {history.partnerUser.reportsTo && (
                              <div className="pl-8 text-xs text-[var(--color-on-surface)] opacity-70">
                                Reports to:{" "}
                                <span className="font-medium">
                                  {history.partnerUser.reportsTo.name || "N/A"}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Brand Status Reasons - Compact */}
                        {history.loan_status_brand_reasons &&
                          history.loan_status_brand_reasons.length > 0 && (
                            <div className="bg-[var(--color-error)]/5 border border-[var(--color-error)]/20 rounded-md p-2">
                              <div className="flex items-center gap-1.5 mb-2">
                                <svg
                                  className="w-3.5 h-3.5 text-[var(--color-error)]"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                <h5 className="font-medium text-[var(--color-error)] text-xs">
                                  Reasons (
                                  {history.loan_status_brand_reasons.length})
                                </h5>
                              </div>

                              <div className="space-y-1.5">
                                {history.loan_status_brand_reasons.map(
                                  (reasonLink) => (
                                    <div
                                      key={reasonLink.id}
                                      className="flex items-center gap-2 bg-[var(--color-surface)]/70 rounded p-2 border border-[var(--color-error)]/10"
                                    >
                                      <div className="w-1.5 h-1.5 bg-[var(--color-error)] rounded-full flex-shrink-0"></div>
                                      <p className="text-xs text-[var(--color-error)] flex-1">
                                        {reasonLink.brandStatusReason.reason}
                                      </p>
                                      <span
                                        className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${getReasonStatusBadgeStyle(
                                          reasonLink.brandStatusReason.status,
                                        )}`}
                                      >
                                        {reasonLink.brandStatusReason.status}
                                      </span>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Evaluation Summary */}
            {loanDetails?.evaluations && loanDetails.evaluations.length > 0 && (
              <div className="bg-[var(--color-surface)] border border-[var(--color-muted)] border-opacity-20 rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-active)] rounded flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-[var(--color-on-primary)]"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <h2 className="text-sm font-semibold text-[var(--color-on-background)]">
                    Evaluation Results
                  </h2>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {loanDetails.evaluations.map((evalItem) => (
                    <div key={evalItem.id} className="space-y-1">
                      <p className="text-[10px] font-medium text-[var(--color-on-surface)] opacity-70 bg-[var(--color-background)] px-2 py-0.5 rounded inline-block">
                        Eval: {evalItem.id}
                      </p>
                      <div className="space-y-1">
                        {evalItem.evaluation_item.map((item) => (
                          <div
                            key={item.id}
                            className={`p-2 rounded-lg border-l-4 ${getEvaluationItemStyle(
                              item.status,
                            )} hover:shadow-sm transition`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1 min-w-0 space-y-0.5">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <h4 className="font-medium text-[var(--color-on-background)] text-xs truncate">
                                    {item.parameter}
                                  </h4>
                                  {item.override && (
                                    <span className="text-[10px] px-1 py-0.5 bg-[var(--color-warning)]/20 text-[var(--color-warning)] rounded-full font-semibold">
                                      OVERRIDDEN
                                    </span>
                                  )}
                                  {item.status === "ELIGIBLE" ? (
                                    <FaCheckCircle className="text-[var(--color-success)] w-3 h-3 shrink-0" />
                                  ) : (
                                    <BiXCircle className="text-[var(--color-error)] w-3 h-3 shrink-0" />
                                  )}
                                </div>
                                <div className="text-[10px] text-[var(--color-on-surface)] opacity-70 grid grid-cols-2 gap-1">
                                  <p>
                                    <span className="font-medium">Req:</span>{" "}
                                    {item.requiredValue}
                                  </p>
                                  <p>
                                    <span className="font-medium">Act:</span>{" "}
                                    {item.actualValue}
                                  </p>
                                  <p>
                                    <span className="font-medium">Src:</span>{" "}
                                    {item.source}
                                  </p>
                                  <p>
                                    <span className="font-medium">
                                      Comments:
                                    </span>{" "}
                                    <span className="italic">
                                      {item.comments || "-"}
                                    </span>
                                  </p>
                                </div>
                              </div>
                              <span
                                className={`px-1.5 py-0.5 text-[10px] font-medium rounded shrink-0 ${getEvaluationStatusBadgeStyle(
                                  item.status,
                                )}`}
                              >
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
          </div>
        )}
      </div>
    </Dialog>
  );
}
