import { useQueryParams } from "../../../../hooks/useQueryParams";
import Sidebar from "../../../../common/sidebar";
import { FaClipboard } from "react-icons/fa";
import { IoIosDocument } from "react-icons/io";
import { PaymentTransactionsSummary } from "../../../loanCollection/components/PaymentTransactionsSummary";
import { LoanStatusBadge } from "../../../../common/ui/LoanStatusBadge";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getLoanById } from "../../../../shared/services/api/loan.api";
import { Loan } from "../../../../shared/types/loan";
export function TransactionsDetails() {
  const { brandId } = useParams<{ brandId: string }>();
  const { getQuery, removeQuery } = useQueryParams();
  const paymentRequestIdLoanId = getQuery("paymentRequestIdLoanId");
  const [loan, setLoan] = useState<Loan | null>(null);
  // Fetch loan details
  useEffect(() => {
    const fetchLoan = async () => {
      if (!paymentRequestIdLoanId || !brandId) return;
      try {
        const response = await getLoanById(brandId, paymentRequestIdLoanId);
        setLoan(response);
      } catch (error) {
        console.error("Error fetching loan:", error);
      }
    };

    fetchLoan();
  }, [paymentRequestIdLoanId, brandId]);
  return (
    <>
      {loan && (
        <Sidebar
          isOpen={!!loan?.id}
          onClose={() => removeQuery("paymentRequestIdLoanId")}
          title="Payment Details"
        >
          <div className="p-4">
            {/* Loan Header */}
            <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-[var(--color-muted)] border-opacity-20">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xs font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider">
                    Loan ID
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-[var(--color-on-surface)] opacity-70">
                    <span>{loan.formattedLoanId}</span>
                    {loan?.isMigratedloan && (
                      <span className=" inline-flex items-center bg-[var(--color-secondary)] bg-opacity-10 px-2 py-0.5 text-xs font-medium text-[var(--color-on-secondary)]">
                        Migrated ({loan.oldLoanId})
                      </span>
                    )}
                    <button
                      className="ml-2 text-[var(--color-on-surface)] opacity-50 hover:text-[var(--color-on-primary)]"
                      onClick={() =>
                        navigator.clipboard.writeText(loan.formattedLoanId)
                      }
                    >
                      <FaClipboard className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <LoanStatusBadge status={loan.status} />
              </div>
            </div>

            {/* Transactions Section */}
            <div className="mb-4 flex items-center justify-between">
              {Array.isArray(loan?.paymentRequests) &&
              loan.paymentRequests.length > 0 ? (
                <div className="mb-4 grid grid-cols-1 gap-4">
                  <PaymentTransactionsSummary
                    paymentRequests={loan.paymentRequests}
                    loanDetails={loan}
                  />
                </div>
              ) : (
                <div className="text-center py-10 w-full">
                  <IoIosDocument className="mx-auto h-12 w-12 text-[var(--color-muted)]" />
                  <h3 className="mt-4 text-sm font-medium text-[var(--color-on-background)]">
                    No transactions found
                  </h3>
                  <p className="mt-1 text-sm text-[var(--color-on-surface)] opacity-70">
                    This payment request has no associated transactions yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </Sidebar>
      )}
    </>
  );
}
