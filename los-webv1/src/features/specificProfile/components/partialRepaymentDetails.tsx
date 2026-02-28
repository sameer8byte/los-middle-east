import { useEffect, useState } from "react";
import { postCurrentPartialRepayment } from "../../../services/api/payment.api";
import { useAppSelector } from "../../../redux/store";
import Dialog from "../../../common/dialog";
import { useQueryParams } from "../../../hooks/useQueryParams";

export interface PartialRepaymentCalculationResponse {
  amount: number;
  totalFees: number;
  principalAmount: number;
  totalPenalties: number;
  discountSummary: {
    roundOffDiscount: {
      interest: number;
      principal: number;
      total: number;
    };
    penalty: number;
  };
  totalDays: number;
  daysBeforeDue: number;
  daysAfterDue: number;
  isOverdue: boolean;
  paymentDetails: {
    totalAmountDueAtPayment: number;
    interestDueAtPayment: number;
    principalDueAtPayment: number;
    penaltyDueAtPayment: number;
    remainingDueAfterPayment: number;
    interestDueAfterPayment: number;
    principalDueAfterPayment: number;
    penaltyDueAfterPayment: number;
  };
  isPrincipalAmountOverridden: boolean;
}
export function PartialRepaymentDetails({
  loanId,
}: {
  readonly loanId: string;
}) {
  const userData = useAppSelector((state) => state.user);
  const [initialPartialPaymentSummary, setInitialPartialPaymentSummary] =
    useState<PartialRepaymentCalculationResponse | null>(null);
  const [paymentSummaryLoading, setPaymentSummaryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { removeQuery } = useQueryParams();

  useEffect(() => {
    if (!loanId || !userData.user.id || !userData?.user?.brandId) {
      return;
    }

    const fetchInitialPartialPaymentSummary = async () => {
      try {
        setPaymentSummaryLoading(true);
        setError(null);
        // Call with amount 0 to get initial details
        const response = await postCurrentPartialRepayment(
          userData.user.id,
          loanId,
          0,
          new Date().toISOString().split("T")[0]
        );
        if (response) {
          setInitialPartialPaymentSummary(response);
        }
      } catch (error) {
        setError(
          (error as Error)?.message || "Failed to calculate payment breakdown"
        );
      } finally {
        setPaymentSummaryLoading(false);
      }
    };

    fetchInitialPartialPaymentSummary();
  }, [loanId, userData.user.id, userData?.user?.brandId]);

  if (paymentSummaryLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-red-800 font-medium">Error</div>
        <div className="text-red-600 text-sm mt-1">{error}</div>
      </div>
    );
  }

  if (!initialPartialPaymentSummary) {
    return (
      <div className="p-4 text-gray-500">
        No partial repayment details available
      </div>
    );
  }
  const { totalDays, isOverdue, paymentDetails } =
    initialPartialPaymentSummary;
  return (
    <Dialog
      isOpen={!!loanId}
      onClose={() => {
        setInitialPartialPaymentSummary(null);
        setError(null);
        removeQuery("partialPaymentLoanId");
      }}
      title="Due Payment Details"
    >
      <div className="space-y-6">
        {/* Timeline Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Timeline Information
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-3 rounded-md shadow-sm">
              <div className="text-gray-600 text-sm font-medium">
                Total Days
              </div>
              <div className="text-xl font-bold text-gray-900 mt-1">
                {totalDays} days
              </div>
            </div>
            {/* Add more timeline stats here if needed */}
          </div>
          {isOverdue && (
            <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-400 rounded-r">
              <div className="flex items-center gap-2 text-red-700">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-semibold">This loan is overdue</span>
              </div>
            </div>
          )}
        </div>
        {/* Payment Details */}
        <div className="bg-blue-50 border border-blue-200 p-5 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            Payment Breakdown
          </h4>

          <div className="bg-white p-4 rounded-md shadow-sm">
            <div className="text-blue-800 font-semibold mb-4 pb-2 border-b border-blue-200">
              Due Payment
            </div>

            {/* Total Amount - Highlighted */}
            <div className="bg-blue-100 p-3 rounded-md mb-4">
              <div className="flex justify-between items-center">
                <span className="text-blue-900 font-semibold">
                  Total Amount Due:
                </span>
                <span className="text-xl font-bold text-blue-900">
                  ₹{paymentDetails.totalAmountDueAtPayment.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Breakdown */}
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                  Interest:
                </span>
                <span className="font-semibold">
                  ₹{paymentDetails.interestDueAtPayment.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  Principal:
                </span>
                <span className="font-semibold">
                  ₹{paymentDetails.principalDueAtPayment.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-700 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                  Penalty:
                </span>
                <span className="font-semibold text-red-600">
                  ₹{paymentDetails.penaltyDueAtPayment.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
