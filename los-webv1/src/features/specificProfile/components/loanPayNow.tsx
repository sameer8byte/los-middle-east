import {  useState } from "react";
import { useQueryParams } from "../../../hooks/useQueryParams";
import { useAppSelector } from "../../../redux/store";
import Dialog from "../../../common/dialog";
import { FaReceipt, FaCheckCircle } from "react-icons/fa";
import { createPayment } from "../../../services/api/payment.api";
import { LoanRepaymentCalculationResponse } from "../../../types/loans";


export function LoanPayNow({
  paymentSummary,
  setPaymentSummary,
}: {
  paymentSummary: LoanRepaymentCalculationResponse; // Replace with actual type if available
  setPaymentSummary: (summary: LoanRepaymentCalculationResponse | null) => void;
}) {
  const userData = useAppSelector((state) => state.user);
  const { getQuery, removeQuery } = useQueryParams();
  const [createPaymentLoading, setCreatePaymentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const payNowLoanId = getQuery("payNowLoanId");
  const [orderId, setOrderId] = useState<string | null>(null);
  const formatCurrency = (value: string | number): string => {
    const numericValue = typeof value === "string" ? parseFloat(value) : value;
    return `BHD${numericValue.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
    })}`;
  };

 
  const handelCreatePayment = async () => {
    if (!payNowLoanId) return;
    try {
      setCreatePaymentLoading(true);
      setError(null);
      // Call API with the determined payment method
      const response = await createPayment(
        payNowLoanId,
        userData.user.id,
         import.meta.env.VITE_REPAYMENT_PAYMENT_METHOD ,
      );
      if (!response || !response.externalRef) {
        setOrderId(null);
        setError("Failed to create payment, no order ID returned.");
        return;
      }
      if (response && response.externalRef) {
        setOrderId(response.externalRef);

        if (response.paymentLink) {
          // Redirect to payment link
          window.location.href = response.paymentLink;
        }
      } else {
        setOrderId(null);
        setError("Failed to create payment. Please try again.");
      }
    } catch (error) {
      console.error("Error creating payment:", error);
      setError("Error creating payment. Please try again.");
    } finally {
      setCreatePaymentLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={!!payNowLoanId}
      onClose={() => {
        setPaymentSummary(null);
        setError(null);
        setOrderId(null);
        removeQuery("payNowLoanId");
      }}
      title="Loan Repayment Details"
    >
      {payNowLoanId && paymentSummary ? (
        <div className="bg-background text-on-background font-brand space-y-3">
          {/* Header Section - Compact & Modern */}
          <div className="flex items-center gap-3 p-3 bg-surface rounded-lg border border-muted">
            <div className="bg-primary w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
              <FaReceipt className=" text-base" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-secondary leading-tight">
                Payment Summary
              </h3>
              <p className="text-xs text-secondary leading-tight">
                Review repayment details
              </p>
            </div>
          </div>

          {/* Payment Amount Highlight - Enhanced */}
          <div className="rounded-lg p-4 border bg-primary  border-primary shadow-sm">
            <div className="text-center space-y-1.5">
              <p className="text-xs font-bold text-on-primary uppercase tracking-widest">
                Amount Due
              </p>
              <h2 className="text-3xl font-bold text-on-primary leading-tight">
                {formatCurrency(paymentSummary.totalRepayment)}
              </h2>
              <p className="text-xs text-secondary leading-tight opacity-65">
                Principal:{" "}
                <span className="font-semibold text-secondary">
                  {formatCurrency(paymentSummary.principalAmount)}
                </span>
              </p>
            </div>
          </div>

          {/* Summary Grid - Modern */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="text-center p-3 rounded-lg border text-on-success bg-success border-success shadow-xs">
              <p className="text-xs font-semibold mb-1 uppercase">Days</p>
              <p className="font-bold text-xl">{paymentSummary.totalDays}</p>
            </div>
            <div className="text-center p-3 rounded-lg border bg-warning text-on-warning border-warning shadow-xs">
              <p className="text-xs  font-semibold mb-1 uppercase">Overdue</p>
              <p className="font-bold text-xl ">
                {paymentSummary.daysAfterDue}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-muted opacity-10"></div>

          {/* Breakdown Sections - Enhanced */}
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {/* Fees Section */}
            {paymentSummary.feeBreakdowns.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-5 h-5 bg-primary rounded flex items-center justify-center flex-shrink-0 text-xs">
                    💰
                  </div>
                  <h4 className="font-bold text-sm text-secondary">
                    Fees ({paymentSummary.feeBreakdowns.length})
                  </h4>
                </div>
                <div className="space-y-1.5">
                  {paymentSummary.feeBreakdowns.map((fee, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-surface rounded-lg border border-muted text-xs transition-all hover:shadow-sm opacity-80"
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="capitalize font-semibold text-secondary">
                          {fee.type}
                        </span>
                        <span className="font-bold text-primary text-sm">
                          {formatCurrency(fee.totalAmount)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-xs text-secondary">
                        <span>{fee.chargeMode}</span>
                        <span>
                          {fee.valueType === "percentage"
                            ? `${fee.chargeValue}%`
                            : formatCurrency(fee.chargeValue)}
                        </span>
                      </div>
                      {fee.taxes.length > 0 && (
                        <div className="mt-1.5 pt-1.5 border-t border-muted opacity-50 text-xs space-y-0.5">
                          {fee.taxes.map((tax, taxIdx) => (
                            <div
                              key={taxIdx}
                              className="flex justify-between text-secondary"
                            >
                              <span>
                                {tax.type} ({tax.chargeValue}%)
                              </span>
                              <span className="font-semibold text-secondary">
                                {formatCurrency(tax.taxAmount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Penalties Section */}
            {paymentSummary.penaltyBreakdown.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-5 h-5 bg-error rounded flex items-center justify-center flex-shrink-0 text-xs">
                    ⚠️
                  </div>
                  <h4 className="font-bold text-sm text-secondary">
                    Penalties ({paymentSummary.penaltyBreakdown.length})
                  </h4>
                </div>
                <div className="space-y-1.5">
                  {paymentSummary.penaltyBreakdown.map((penalty, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border bg-error/5 border-error text-xs transition-all hover:shadow-sm"
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-semibold text-secondary">
                          Penalty
                        </span>
                        <span className="font-bold text-error text-sm">
                          {formatCurrency(penalty.summary.totalPenaltyAmount)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-xs text-secondary mb-1.5">
                        <span>
                          {penalty.penaltyRate}
                          {penalty.penaltyValueType === "percentage"
                            ? "%"
                            : "BHD"}
                          /day
                        </span>
                        <span>
                          Overdue: {penalty.penaltyCalculation.overdueDays}d
                        </span>
                      </div>
                      <div className="pt-1.5 border-t border-error opacity-50 flex justify-between text-xs">
                        <span className="text-secondary">
                          {penalty.tax.taxType} ({penalty.tax.taxRate}%)
                        </span>
                        <span className="font-semibold text-secondary">
                          {formatCurrency(penalty.tax.taxAmount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Total Summary - Enhanced */}
          <div className="bg-surface rounded-lg p-3 border border-muted space-y-1.5 opacity-90">
            <div className="flex justify-between text-xs">
              <span className="text-secondary font-medium">Principal</span>
              <span className="font-bold text-secondary">
                {formatCurrency(paymentSummary.totals.principalAmount)}
              </span>
            </div>
            <div className="flex justify-between text-xs border-t border-muted pt-1.5 opacity-70">
              <span className="text-secondary font-medium">Fees</span>
              <span className="font-bold text-primary">
                {formatCurrency(paymentSummary.totals.totalFees)}
              </span>
            </div>
            <div className="flex justify-between text-xs border-t border-muted pt-1.5 opacity-70">
              <span className="text-secondary font-medium">Taxes</span>
              <span className="font-bold text-success">
                {formatCurrency(paymentSummary.totals.totalTaxes)}
              </span>
            </div>
            <div className="flex justify-between text-xs border-t border-muted pt-1.5 opacity-70">
              <span className="text-secondary font-medium">Penalties</span>
              <span className="font-bold text-error">
                {formatCurrency(paymentSummary.totals.totalPenalties)}
              </span>
            </div>
          </div>

          {/* Error Display - Enhanced */}
          {error && (
            <div className="border rounded-lg p-2.5 flex items-start gap-2.5 bg-error/5 border-error">
              <span className="text-error font-bold text-sm flex-shrink-0 mt-0.5">
                ⚠️
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-error">Error</p>
                <p className="text-xs line-clamp-2 leading-tight text-error opacity-85">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Payment Button - Modern & Enhanced */}
          {!orderId && (
            <button
              onClick={handelCreatePayment}
              disabled={createPaymentLoading}
              className={`
                w-full bg-primary text-white py-2.5 px-4 rounded-lg font-bold text-sm
                shadow-md hover:shadow-lg active:shadow-sm
                transition-all duration-200 flex items-center justify-center gap-2.5
                disabled:opacity-60 disabled:cursor-not-allowed
              `}
              style={{
                backgroundColor: createPaymentLoading
                  ? "var(--primary-active)"
                  : undefined,
              }}
            >
              {createPaymentLoading ? (
                <>
                  <div className="w-4 h-4 border-2 rounded-full animate-spin border-white border-t-transparent"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <FaCheckCircle className="text-sm" />
                  <span>Pay Now</span>
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        <div className="text-center py-6 px-3">
          <div className="w-14 h-14 bg-surface rounded-lg flex items-center justify-center mx-auto mb-2.5 border border-muted">
            <span className="text-2xl">💳</span>
          </div>
          <h3 className="text-sm font-bold text-secondary mb-1">
            No Loan Selected
          </h3>
          <p className="text-xs text-secondary mb-2.5 leading-tight">
            Select a loan to view repayment details
          </p>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium bg-primary/5 border-primary text-primary">
            <span className="w-1 h-1 bg-primary rounded-full animate-pulse"></span>
            <span>Waiting...</span>
          </div>
        </div>
      )}
    </Dialog>
  );
}
