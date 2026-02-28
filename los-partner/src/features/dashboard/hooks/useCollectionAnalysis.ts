import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { getCollectionAnalysis } from "../../../shared/services/api/dashboard.api";
import { DashboardQuery } from "../types/dashboard.types";

export interface CollectionAnalysisResponse {
  summary: {
    totalInterestDue: number;
    totalDuePenalty: number;
    totalObligationWithPenalty: number;
    totalLoans: number;
    totalAmount: number;
    totalPrincipal: number;
    totalObligation: number;
    averageLoanAmount: number;
    averageObligation: number;
    paymentSummary: {
      loansWithPayments: number;
      totalInterestPaid: number;
      outstandingPrincipal: number;
      outstandingInterest: number;
      outstandingPenalty: number;
      outstandingObligation: number;
      outstandingObligationWithPenalty: number;
      totalCollected: number;
      totalDisbursed: number;
      totalPrincipalPaid: number;
      totalFeesPaid: number;
      totalPenaltiesPaid: number;
      totalTaxesPaid: number;
      totalDiscounts: number;
      outstandingAmount: number;
      collectionRate: number;
      averageCollectionPerLoan: number;
      averageOutstandingPerLoan: number;
    };
  };

  dpdBreakdown: Array<{
    dpdRange: string;
    count: number;
    totalPrincipal: number;
    totalObligation: number;
    totalCollected: number;
    outstandingAmount: number;
  }>;
  
  statusBreakdown: Array<{
    status: string;
    count: number;
    totalAmount: number;
    totalPrincipal: number;
    totalObligation: number;
    averageAmount: number;
    averageObligation: number;
    loans: Array<{
      id: string;
      formattedLoanId: string;
      amount: number;
      principal: number;
      obligation: number;
      dueDate: string;
      customerName: string;
      customerId: string;
      phoneNumber: string;
      paymentSummary: {
        totalCollected: number;
        totalDisbursed: number;
        totalPrincipalPaid: number;
        totalFeesPaid: number;
        totalPenaltiesPaid: number;
        totalTaxesPaid: number;
        totalDiscounts: number;
        outstandingAmount: number;
        collectionRate: number;
        paymentTransactionsCount: number;
        disbursementTransactionsCount: number;
      };
      paymentTransactions: Array<any>;
      disbursementTransactions: Array<any>;
    }>;
  }>;
  loanTypeBreakdown: Array<{
    loanType: string;
    count: number;
    totalAmount: number;
    totalPrincipal: number;
    totalObligation: number;
    percentage: number;
    loans: Array<{
      id: string;
      formattedLoanId: string;
      amount: number;
      principal: number;
      obligation: number;
      dueDate: string;
      customerName: string;
      customerId: string;
      phoneNumber: string;
      paymentSummary: {
        totalCollected: number;
        totalDisbursed: number;
        totalPrincipalPaid: number;
        totalFeesPaid: number;
        totalPenaltiesPaid: number;
        totalTaxesPaid: number;
        totalDiscounts: number;
        outstandingAmount: number;
        collectionRate: number;
        paymentTransactionsCount: number;
        disbursementTransactionsCount: number;
      };
    }>;
  }>;
  dueDateBreakdown: Array<{
    month: string;
    count: number;
    totalAmount: number;
    totalCollected: number;
    totalObligation: number;
    loans: Array<{
      id: string;
      formattedLoanId: string;
      amount: number;
      principal: number;
      obligation: number;
      dueDate: string;
      customerName: string;
      customerId: string;
      phoneNumber: string;
      paymentSummary: {
        totalCollected: number;
        totalDisbursed: number;
        totalPrincipalPaid: number;
        totalFeesPaid: number;
        totalPenaltiesPaid: number;
        totalTaxesPaid: number;
        totalDiscounts: number;
        outstandingAmount: number;
        collectionRate: number;
        paymentTransactionsCount: number;
        disbursementTransactionsCount: number;
      };
    }>;
  }>;
  locationBreakdown: Array<{
    state: string;
    count: number;
    totalAmount: number;
    totalCollected: number;
    totalObligation: number;
    loans: Array<{
      id: string;
      formattedLoanId: string;
      amount: number;
      principal: number;
      obligation: number;
      dueDate: string;
      customerName: string;
      customerId: string;
      phoneNumber: string;
      paymentSummary: {
        totalCollected: number;
        totalDisbursed: number;
        totalPrincipalPaid: number;
        totalFeesPaid: number;
        totalPenaltiesPaid: number;
        totalTaxesPaid: number;
        totalDiscounts: number;
        outstandingAmount: number;
        collectionRate: number;
        paymentTransactionsCount: number;
        disbursementTransactionsCount: number;
      };
    }>;
  }>;
  partnerUserBreakdown: Array<{
    partnerUserId: string;
    partnerUserName: string;
    role: string;
    managerName?: string;
    count: number;
    totalAmount: number;
    totalCollected: number;
    totalObligation: number;
    loans: Array<{
      id: string;
      formattedLoanId: string;
      amount: number;
      principal: number;
      obligation: number;
      dueDate: string;
      customerName: string;
      customerId: string;
      phoneNumber: string;
      paymentSummary: {
        totalCollected: number;
        totalDisbursed: number;
        totalPrincipalPaid: number;
        totalFeesPaid: number;
        totalPenaltiesPaid: number;
        totalTaxesPaid: number;
        totalDiscounts: number;
        outstandingAmount: number;
        collectionRate: number;
        paymentTransactionsCount: number;
        disbursementTransactionsCount: number;
      };
    }>;
  }>;
    
  roleBreakdown: Array<{
    role: string;
    count: number;
    totalAmount: number;
    totalCollected: number;
    totalObligation: number;
    partnerUserCount: number;
  }>;
  collectionRoleBreakdown: Array<{
    role: string;
    count: number;
    totalAmount: number;
    totalCollected: number;
    totalObligation: number;
    partnerUserCount: number;
  }>;
  collectionPartnerUserBreakdown: Array<{
    partnerUserId: string;
    partnerUserName: string;
    role: string;
    count: number;
    totalAmount: number;
    totalCollected: number;
    totalObligation: number;
    loans: Array<{
      id: string;
      formattedLoanId: string;
      amount: number;
      principal: number;
      obligation: number;
      dueDate: string;
      customerName: string;
      customerId: string;
      phoneNumber: string;
      paymentSummary: {
        totalCollected: number;
        totalDisbursed: number;
        totalPrincipalPaid: number;
        totalFeesPaid: number;
        totalPenaltiesPaid: number;
        totalTaxesPaid: number;
        totalDiscounts: number;
        outstandingAmount: number;
        collectionRate: number;
        paymentTransactionsCount: number;
        disbursementTransactionsCount: number;
      };
    }>;
  }>;
  dateRange: {
    startDate?: string;
    endDate?: string;
    period: string;
  };
}

export const useCollectionAnalysis = (query: DashboardQuery | null) => {
  const { brandId } = useParams();
  const [data, setData] = useState<CollectionAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCollectionAnalysis = useCallback(async () => {
    if (!brandId || !query) return;

    setLoading(true);
    setError(null);
    
    try {
      const params = {
        period: query.period,
        startDate: query.startDate,
        endDate: query.endDate,
      };
      
      const response = await getCollectionAnalysis(brandId, params);
      setData(response);
    } catch (err) {
      console.error("Error fetching collection analysis:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch collection analysis");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [brandId, query?.period, query?.startDate, query?.endDate]);;

  useEffect(() => {
    if(!query) return;
    fetchCollectionAnalysis();
  }, [fetchCollectionAnalysis]);

  return {
    data,
    loading,
    error,
    refetch: fetchCollectionAnalysis,
  };
};

