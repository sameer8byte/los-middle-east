import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

import {
  getLoanById,
  postCurrentPartialRepayment,
} from "../../../shared/services/api/loan.api";
import { Loan } from "../../../shared/types/loan";
import { toast } from "react-toastify";
import { FaCheckCircle } from "react-icons/fa";
import dayjs from "dayjs";

interface ClosingTypeProps {
  loanId: string;
}

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

// Currency formatter
const formatCurrency = (value: number | string) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// Skeleton Loader Component
const SkeletonLoader = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    {/* Header Skeleton */}
    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 bg-gray-200 rounded-full animate-pulse"></div>
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-3 w-12 bg-gray-200 rounded animate-pulse"></div>
      </div>
    </div>

    {/* Stats Grid Skeleton */}
    <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 border-b border-gray-100 bg-white">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-3">
          <div className="h-2.5 w-16 bg-gray-200 rounded animate-pulse mb-2 mx-auto"></div>
          <div className="h-5 w-20 bg-gray-300 rounded animate-pulse mx-auto"></div>
        </div>
      ))}
    </div>

    {/* Table Skeleton */}
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="px-4 py-2"><div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div></th>
            <th className="px-4 py-2"><div className="h-3 w-16 bg-gray-200 rounded animate-pulse ml-auto"></div></th>
            <th className="px-4 py-2"><div className="h-3 w-16 bg-gray-200 rounded animate-pulse ml-auto"></div></th>
            <th className="px-4 py-2"><div className="h-3 w-16 bg-gray-200 rounded animate-pulse ml-auto"></div></th>
            <th className="px-4 py-2"><div className="h-3 w-16 bg-gray-200 rounded animate-pulse ml-auto"></div></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {[1, 2, 3, 4].map((i) => (
            <tr key={i} className="hover:bg-gray-50/50">
              <td className="px-4 py-2.5"><div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div></td>
              <td className="px-4 py-2.5"><div className="h-3 w-20 bg-gray-200 rounded animate-pulse ml-auto"></div></td>
              <td className="px-4 py-2.5"><div className="h-3 w-20 bg-gray-200 rounded animate-pulse ml-auto"></div></td>
              <td className="px-4 py-2.5"><div className="h-3 w-20 bg-gray-200 rounded animate-pulse ml-auto"></div></td>
              <td className="px-4 py-2.5"><div className="h-3 w-20 bg-gray-200 rounded animate-pulse ml-auto"></div></td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-50 border-t border-gray-200">
          <tr>
            <td className="px-4 py-2.5"><div className="h-3 w-12 bg-gray-300 rounded animate-pulse"></div></td>
            <td className="px-4 py-2.5"><div className="h-3 w-20 bg-gray-300 rounded animate-pulse ml-auto"></div></td>
            <td className="px-4 py-2.5"><div className="h-3 w-20 bg-gray-300 rounded animate-pulse ml-auto"></div></td>
            <td className="px-4 py-2.5"><div className="h-3 w-20 bg-gray-300 rounded animate-pulse ml-auto"></div></td>
            <td className="px-4 py-2.5"><div className="h-3 w-20 bg-gray-300 rounded animate-pulse ml-auto"></div></td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
);

export function TodayCalculations({ loanId }: ClosingTypeProps) {
  const { brandId } = useParams<{ brandId: string }>();

  const [loan, setLoan] = useState<Loan | null>(null);
  const [initialPartialPaymentSummary, setInitialPartialPaymentSummary] =
    useState<PartialRepaymentCalculationResponse | null>(null);
  const [, setPaymentSummaryLoading] = useState(false);
  const [, setError] = useState<string | null>(null);

  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Auto dismiss message
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Fetch loan details
  useEffect(() => {
    const fetchLoan = async () => {
      if (!loanId || !brandId) return;
      try {
        const response = await getLoanById(brandId, loanId);
        setLoan(response);
      } catch (error) {
        console.error("Error fetching loan:", error);
      }
    };

    fetchLoan();
  }, [loanId, brandId]);

  // Fetch initial partial payment summary
  useEffect(() => {
    const fetchInitialPartialPaymentSummary = async () => {
      if (!loan?.userId || !brandId || !loanId) return;

      try {
        setPaymentSummaryLoading(true);
        const response = await postCurrentPartialRepayment(
          loan.userId,
          loanId,
          0,
          dayjs().format("YYYY-MM-DD")
        );
        if (response) {
          setInitialPartialPaymentSummary(response);
        }
      } catch (error) {
        const msg =
          (error as Error)?.message || "Failed to calculate payment breakdown";
        setError(msg);
        toast.error(msg);
      } finally {
        setPaymentSummaryLoading(false);
      }
    };

    fetchInitialPartialPaymentSummary();
  }, [loan?.userId, brandId, loanId]);

  // --- Payment Totals ---
  const successDisbursement = loan?.paymentRequests?.filter(
    (pr) => pr?.type === "DISBURSEMENT" && pr.status === "SUCCESS"
  );
  const totalDisbursedAmount =
    successDisbursement?.reduce((sum, pr) => {
      const disbursementSum =
        pr.disbursalTransactions?.reduce(
          (dSum, dt) => dSum + Number(dt.amount),
          0
        ) || 0;
      return sum + disbursementSum;
    }, 0) || 0;

  const successPartialPayment = loan?.paymentRequests?.filter(
    (pr) => pr?.type === "PARTIAL_COLLECTION"
  );
  const totalReceivedAmount =
    successPartialPayment?.reduce((sum, pr) => {
      const partialCollectionSum =
        pr.partialCollectionTransactions
          .filter(
            (pct) =>
              pct.opsApprovalStatus === "APPROVED" && pct.status === "SUCCESS"
          )
          ?.reduce((pcSum, pct) => pcSum + Number(pct.amount), 0) || 0;
      return sum + partialCollectionSum;
    }, 0) || 0;

  const totalInterestAmount =
    successPartialPayment?.reduce((sum, pr) => {
      const partialCollectionSum =
        pr.partialCollectionTransactions
          .filter(
            (pct) =>
              pct.opsApprovalStatus === "APPROVED" && pct.status === "SUCCESS"
          )
          ?.reduce((pcSum, pct) => pcSum + Number(pct.totalFees || 0), 0) || 0;
      return sum + partialCollectionSum;
    }, 0) || 0;

  const totalPrincipalAmount =
    successPartialPayment?.reduce((sum, pr) => {
      const partialCollectionSum =
        pr.partialCollectionTransactions
          .filter(
            (pct) =>
              pct.opsApprovalStatus === "APPROVED" && pct.status === "SUCCESS"
          )
          ?.reduce(
            (pcSum, pct) => pcSum + Number(pct.principalAmount || 0),
            0
          ) || 0;
      return sum + partialCollectionSum;
    }, 0) || 0;

  const totalPenaltyAmount =
    successPartialPayment?.reduce((sum, pr) => {
      const partialCollectionSum =
        pr.partialCollectionTransactions
          .filter(
            (pct) =>
              pct.opsApprovalStatus === "APPROVED" && pct.status === "SUCCESS"
          )
          ?.reduce(
            (pcSum, pct) => pcSum + Number(pct.totalPenalties || 0),
            0
          ) || 0;
      return sum + partialCollectionSum;
    }, 0) || 0;

  const totalPenaltyDiscount =
    successPartialPayment?.reduce((sum, pr) => {
      const partialCollectionSum =
        pr.partialCollectionTransactions
          .filter(
            (pct) =>
              pct.opsApprovalStatus === "APPROVED" && pct.status === "SUCCESS"
          )
          ?.reduce(
            (pcSum, pct) => pcSum + Number(pct.penaltyDiscount || 0),
            0
          ) || 0;
      return sum + partialCollectionSum;
    }, 0) || 0;

  const totalRoundOffDiscount =
    successPartialPayment?.reduce((sum, pr) => {
      const partialCollectionSum =
        pr.partialCollectionTransactions
          .filter(
            (pct) =>
              pct.opsApprovalStatus === "APPROVED" && pct.status === "SUCCESS"
          )
          ?.reduce(
            (pcSum, pct) => pcSum + Number(pct.roundOffDiscount || 0),
            0
          ) || 0;
      return sum + partialCollectionSum;
    }, 0) || 0;

  const totalPrincipalPayable =
    (initialPartialPaymentSummary?.paymentDetails.principalDueAfterPayment ||
      0) + totalPrincipalAmount;

  const totalInterestPayable =
    (initialPartialPaymentSummary?.paymentDetails.interestDueAfterPayment ||
      0) + totalInterestAmount;

  const totalPenaltyPayable =
    (initialPartialPaymentSummary?.paymentDetails.penaltyDueAfterPayment || 0) +
    totalPenaltyAmount +
    totalPenaltyDiscount;

  const OverallTotalPayable =
    (initialPartialPaymentSummary?.paymentDetails.remainingDueAfterPayment ||
      0) + totalReceivedAmount;

  // --- Eligibility Check ---
  const isLoanSettled =
    typeof totalReceivedAmount === "number" &&
    typeof totalDisbursedAmount === "number" &&
    totalReceivedAmount >= totalDisbursedAmount;

  // Show skeleton while loading
  if (!loan || !initialPartialPaymentSummary) {
    return <SkeletonLoader />;
  }

  return (
 <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
  
  {/* ───── Header ───── */}
  <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
    <div className="flex items-center gap-2">
      <div className="w-1 h-4 bg-[#EA5E18] rounded-full"></div>
      <h3 className="text-sm font-semibold text-gray-800">
        Loan Calculation Summary
      </h3>
      <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-medium">Today</span>
    </div>
    
    {isLoanSettled && (
       <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-2 py-1 rounded text-xs border border-green-100">
          <FaCheckCircle className="w-3 h-3" />
          <span className="font-semibold">Eligible for Settlement</span>
       </div>
    )}
  </div>

  {/* ───── High-Level Stats Grid ───── */}
  <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 border-b border-gray-100 bg-white">
     <div className="p-3 text-center">
        <div className="text-[10px] text-gray-500 uppercase tracking-wide font-medium mb-1">Disbursed</div>
        <div className="text-sm font-bold text-gray-800">{formatCurrency(totalDisbursedAmount)}</div>
     </div>
     <div className="p-3 text-center">
        <div className="text-[10px] text-amber-600 uppercase tracking-wide font-medium mb-1">Total Payable</div>
        <div className="text-sm font-bold text-amber-700">{formatCurrency(OverallTotalPayable)}</div>
     </div>
     <div className="p-3 text-center">
        <div className="text-[10px] text-green-600 uppercase tracking-wide font-medium mb-1">Total Received</div>
        <div className="text-sm font-bold text-green-700">{formatCurrency(totalReceivedAmount)}</div>
     </div>
     <div className="p-3 text-center bg-red-50/30">
        <div className="text-[10px] text-red-600 uppercase tracking-wide font-medium mb-1">Outstanding</div>
        <div className="text-sm font-bold text-red-700">
           {formatCurrency(initialPartialPaymentSummary?.paymentDetails.remainingDueAfterPayment || 0)}
        </div>
     </div>
  </div>

  {/* ───── Detailed Breakdown Table ───── */}
  <div className="overflow-x-auto">
    <table className="w-full text-xs text-left">
      <thead className="text-[10px] text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
        <tr>
          <th className="px-4 py-2 font-semibold">Component</th>
          <th className="px-4 py-2 text-right font-semibold">Payable</th>
          <th className="px-4 py-2 text-right font-semibold">Received</th>
          <th className="px-4 py-2 text-right font-semibold">Discount</th>
          <th className="px-4 py-2 text-right font-semibold">Outstanding</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50 text-gray-700">
        
        {/* Principal */}
        <tr className="hover:bg-gray-50/50 transition-colors">
          <td className="px-4 py-2.5 font-medium">Principal</td>
          <td className="px-4 py-2.5 text-right font-mono text-gray-600">{formatCurrency(totalPrincipalPayable)}</td>
          <td className="px-4 py-2.5 text-right font-mono text-green-600">{formatCurrency(totalPrincipalAmount)}</td>
          <td className="px-4 py-2.5 text-right font-mono text-gray-300">-</td>
          <td className="px-4 py-2.5 text-right font-mono font-semibold text-red-600">
             {formatCurrency(initialPartialPaymentSummary?.paymentDetails.principalDueAtPayment || 0)}
          </td>
        </tr>

        {/* Interest */}
        <tr className="hover:bg-gray-50/50 transition-colors">
          <td className="px-4 py-2.5 font-medium">Murabaha margin</td>
          <td className="px-4 py-2.5 text-right font-mono text-gray-600">{formatCurrency(totalInterestPayable)}</td>
          <td className="px-4 py-2.5 text-right font-mono text-green-600">{formatCurrency(totalInterestAmount)}</td>
          <td className="px-4 py-2.5 text-right font-mono text-gray-300">-</td>
          <td className="px-4 py-2.5 text-right font-mono font-semibold text-red-600">
             {formatCurrency(initialPartialPaymentSummary?.paymentDetails.interestDueAtPayment || 0)}
          </td>
        </tr>

        {/* Penalty */}
        <tr className="hover:bg-gray-50/50 transition-colors">
          <td className="px-4 py-2.5 font-medium">Penalty</td>
          <td className="px-4 py-2.5 text-right font-mono text-gray-600">{formatCurrency(totalPenaltyPayable)}</td>
          <td className="px-4 py-2.5 text-right font-mono text-green-600">{formatCurrency(totalPenaltyAmount)}</td>
          <td className="px-4 py-2.5 text-right font-mono text-blue-600">{formatCurrency(totalPenaltyDiscount)}</td>
          <td className="px-4 py-2.5 text-right font-mono font-semibold text-red-600">
             {formatCurrency(initialPartialPaymentSummary?.paymentDetails.penaltyDueAtPayment || 0)}
          </td>
        </tr>

        {/* Round Off Discount (Special Row) */}
        {totalRoundOffDiscount > 0 && (
          <tr className="bg-purple-50/30">
             <td className="px-4 py-2.5">
                <div className="font-medium text-purple-700">Round Off Discount</div>
             </td>
             <td className="px-4 py-2.5 text-right text-gray-300 font-mono">-</td>
             <td className="px-4 py-2.5 text-right font-mono font-bold text-purple-600">
                {formatCurrency(totalRoundOffDiscount)}
             </td>
             <td className="px-4 py-2.5 text-right text-gray-300 font-mono">-</td>
             <td className="px-4 py-2.5 text-right text-gray-300 font-mono">-</td>
          </tr>
        )}
      </tbody>
      
      {/* ───── Footer / Total Row ───── */}
      <tfoot className="bg-gray-50 border-t border-gray-200">
        <tr>
          <td className="px-4 py-2.5 font-bold text-gray-800">Total</td>
          <td className="px-4 py-2.5 text-right font-mono font-bold text-gray-800">{formatCurrency(OverallTotalPayable)}</td>
          <td className="px-4 py-2.5 text-right font-mono font-bold text-green-700">{formatCurrency(totalReceivedAmount)}</td>
          <td className="px-4 py-2.5 text-right font-mono font-bold text-blue-700">{formatCurrency(totalPenaltyDiscount)}</td>
          <td className="px-4 py-2.5 text-right font-mono font-bold text-red-700">
             {formatCurrency(initialPartialPaymentSummary?.paymentDetails.remainingDueAfterPayment || 0)}
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</div>
  );
}
