import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import dayjs from "dayjs";
import Dialog from "../../../common/dialog";
import { useQueryParams } from "../../../hooks/useQueryParams";
import {
  postCurrentRepayment,
  getLoanDetails,
} from "../../../shared/services/api/loan.api";
import { LoanRepaymentCalculationResponse } from "../../loanCollection/components/nonGetwayPayment";
import { TodayCalculations } from "../../loanCollection/components/todayCalculations";
import { Loan } from "../../../shared/types/loan";
import { LoanStatusEnum } from "../../../constant/enum";

const formatCurrency = (value: string | number): string => {
  const numericValue = typeof value === "string" ? parseFloat(value) : value;
  return `₹${numericValue.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
  })}`;
};

export function LoanPayNow() {
  const { customerId, brandId } = useParams<{
    customerId: string;
    brandId: string;
  }>();
  const { getQuery, removeQuery, setQuery } = useQueryParams();
  const loanId = getQuery("payNowLoanId");

  const [loading, setLoading] = useState(true);
  const [loanDetails, setLoanDetails] = useState<Loan | null>(null);
  const [paymentSummary, setPaymentSummary] =
    useState<LoanRepaymentCalculationResponse | null>(null);
  const [paymentSummaryLoading, setPaymentSummaryLoading] = useState(false);

  const closeDialog = () => {
    setLoanDetails(null);
    setPaymentSummary(null);
    removeQuery("payNowLoanId");
  };

  // Step 1: Fetch Loan Details First
  useEffect(() => {
    if (!loanId || !brandId || !customerId) return;

    const fetchLoanDetails = async () => {
      try {
        setLoading(true);
        const response = await getLoanDetails(brandId, loanId);
        setLoanDetails(response);

        // Step 2: Only fetch repayment summary if NOT partially paid
        if (response.status !== LoanStatusEnum.PARTIALLY_PAID) {
          setPaymentSummaryLoading(true);
          const repaymentResponse = await postCurrentRepayment(
            customerId,
            loanId,
            dayjs().format("YYYY-MM-DD")
          );
          setQuery("payNowLoanId", loanId);
          setPaymentSummary(repaymentResponse);
        }
      } catch (error) {
        console.error("Error fetching loan or repayment:", error);
      } finally {
        setLoading(false);
        setPaymentSummaryLoading(false);
      }
    };

    fetchLoanDetails();
  }, [loanId, brandId, customerId]);

  const renderLoading = () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500"></div>
    </div>
  );

  let content: React.ReactNode = null;

  if (loading || paymentSummaryLoading) {
    content = renderLoading();
  } else if (loanDetails?.status === LoanStatusEnum.PARTIALLY_PAID) {
    content = <TodayCalculations loanId={loanId as string} />;
  } else if (paymentSummary) {
    content = (
      <div className="space-y-6">
        {/* Repayment Summary UI — same as previous code */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-[var(--color-success)] border-opacity-30">
          <div className="text-center">
            <p className="text-sm font-medium opacity-70">
              Total Amount to Pay
            </p>
            <h2 className="text-4xl font-bold text-[var(--color-on-success)]">
              {formatCurrency(paymentSummary.totalRepayment)}
            </h2>
            <p className="text-xs opacity-70">
              Principal: {formatCurrency(paymentSummary.principalAmount)}
            </p>
          </div>
        </div>

        {/* Total Days / Overdue */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-[var(--color-primary)] bg-opacity-10 rounded-xl">
            <p className="text-xs opacity-70">Total Days</p>
            <p className="font-bold text-[var(--color-on-primary)]">
              {paymentSummary.totalDays}
            </p>
          </div>
          <div className="text-center p-3 bg-[var(--color-secondary)] bg-opacity-10 rounded-xl">
            <p className="text-xs text-[var(--color-on-secondary)] opacity-70">
              Days Overdue
            </p>
            <p className="font-bold text-[var(--color-on-secondary)]">
              {paymentSummary.daysAfterDue}
            </p>
          </div>
        </div>

        {/* Fee Breakdown */}
        <div>
          <h4 className="font-semibold">Fee Breakdown</h4>
          <div className="bg-[var(--color-background)] rounded-2xl p-4 space-y-3">
            {paymentSummary.feeBreakdowns.map((fee, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-sm font-medium">
                  <span className="capitalize opacity-80">{fee.type}</span>
                  <span>{formatCurrency(fee.totalAmount)}</span>
                </div>
                <div className="text-xs opacity-70 flex justify-between">
                  <span>Charge Mode:</span>
                  <span>{fee.chargeMode}</span>
                </div>
                <div className="text-xs opacity-70 flex justify-between">
                  <span>Value Type:</span>
                  <span>
                    {fee.valueType === "percentage"
                      ? `${fee.chargeValue}%`
                      : formatCurrency(fee.chargeValue)}
                  </span>
                </div>
                <div className="text-xs opacity-70 flex justify-between">
                  <span>Recurring Daily:</span>
                  <span>{fee.isRecurringDaily ? "Yes" : "No"}</span>
                </div>
                {fee.taxes.length > 0 && (
                  <div className="pl-2">
                    <div className="text-sm font-semibold mt-1">Taxes:</div>
                    {fee.taxes.map((tax, taxIdx) => (
                      <div
                        key={taxIdx}
                        className="flex justify-between text-xs opacity-70"
                      >
                        <span>
                          {tax.type} ({tax.chargeValue}%)
                        </span>
                        <span>{formatCurrency(tax.taxAmount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {paymentSummary.penaltyBreakdown.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-[var(--color-on-background)]">
              Penalty Breakdown
            </h4>
            <div className="bg-[var(--color-background)] rounded-2xl p-4 space-y-3">
              {paymentSummary.penaltyBreakdown.map((penalty, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Penalty ({penalty.penaltyValueType})</span>
                    <span>
                      {formatCurrency(penalty.summary.totalPenaltyAmount)}
                    </span>
                  </div>

                  <div className="text-xs text-[var(--color-on-surface)] opacity-70 flex justify-between">
                    <span>Rate:</span>
                    <span>
                      {penalty.penaltyRate}{" "}
                      {penalty.penaltyValueType === "percentage" ? "%" : "₹"} /
                      day
                    </span>
                  </div>

                  <div className="text-xs text-[var(--color-on-surface)] opacity-70 flex justify-between">
                    <span>Days Overdue:</span>
                    <span>{penalty.penaltyCalculation.overdueDays}</span>
                  </div>

                  <div className="text-xs text-[var(--color-on-surface)] opacity-70 flex justify-between">
                    <span>Penalty:</span>
                    <span>
                      {formatCurrency(
                        penalty.penaltyCalculation.penaltyInterest
                      )}
                    </span>
                  </div>

                  <div className="pl-2">
                    <div className="text-sm font-semibold mt-1">Tax:</div>
                    <div className="flex justify-between text-xs text-[var(--color-on-surface)] opacity-70">
                      <span>
                        {penalty.tax.taxType} ({penalty.tax.taxRate}%)
                      </span>
                      <span>{formatCurrency(penalty.tax.taxAmount)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Totals */}
        <div className="space-y-3">
          <h4 className="font-semibold text-[var(--color-on-background)]">
            Total Summary
          </h4>
          <div className="bg-[var(--color-surface)] rounded-2xl p-4 space-y-2 text-sm text-[var(--color-on-surface)] opacity-80">
            <div className="flex justify-between">
              <span>Principal Amount</span>
              <span>
                {formatCurrency(paymentSummary.totals.principalAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Total Fees</span>
              <span>{formatCurrency(paymentSummary.totals.totalFees)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Taxes</span>
              <span>{formatCurrency(paymentSummary.totals.totalTaxes)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Penalties</span>
              <span>
                {formatCurrency(paymentSummary.totals.totalPenalties)}
              </span>
            </div>
          </div>
        </div>
        <div className="bg-[var(--color-success)] bg-opacity-10 text-[var(--color-on-success)] font-bold text-lg rounded-2xl p-4 flex justify-between items-center">
          <span>Total Repayment</span>
          <span>{formatCurrency(paymentSummary.totalRepayment)}</span>
        </div>
      </div>
    );
  }

  return (
    <Dialog
      isOpen={!!loanId}
      onClose={closeDialog}
      title="Loan Repayment Details"
    >
      {content}
    </Dialog>
  );
}
