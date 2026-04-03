import React, { useState } from "react";
import { CollectionAnalysisResponse } from "../hooks/useCollectionAnalysis";

// Utility functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-IN').format(num);
};

const getStatusClass = (status: string) => {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('paid')) return 'bg-green-100 text-green-800';
  if (statusLower.includes('active')) return 'bg-blue-100 text-blue-800';
  if (statusLower.includes('disbursed')) return 'bg-purple-100 text-purple-800';
  if (statusLower.includes('completed')) return 'bg-gray-100 text-gray-800';
  return 'bg-yellow-100 text-yellow-800';
};
const getCollectionRateClass = (rate: number) => {
  if (rate >= 100) return 'bg-green-100 text-green-800';
  if (rate >= 50) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};

interface CollectionAnalysisCardProps {
  data: CollectionAnalysisResponse | null;
  loading: boolean;
  error: string | null;
}

const getDpdRangeColor = (dpdRange: string) => {
  if (dpdRange === "Running Case") return 'bg-green-100 text-green-800';
  if (dpdRange === "1 To 30") return 'bg-blue-100 text-blue-800';
  if (dpdRange === "31 - 60") return 'bg-yellow-100 text-yellow-800';
  if (dpdRange === "61 - 90") return 'bg-orange-100 text-orange-800';
  if (dpdRange === "91 - 120") return 'bg-red-100 text-red-800';
  if (dpdRange === "121 - 180") return 'bg-purple-100 text-purple-800';
  return 'bg-gray-700 text-white';
};

export const CollectionAnalysisCard: React.FC<CollectionAnalysisCardProps> = ({
  data,
  loading,
  error,
}) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedStatus, setExpandedStatus] = useState<string | null>(null);
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null);
  const [expandedDueDate, setExpandedDueDate] = useState<string | null>(null);
  const [showAllLoans, setShowAllLoans] = useState<Record<string, boolean>>({});
  const [expandedDpdRange, setExpandedDpdRange] = useState<string | null>(null);

  const toggleShowAllLoans = (status: string) => {
    setShowAllLoans(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Collection Analysis</h3>
        <div className="text-center py-6 text-gray-500">
          {error || "No data available"}
        </div>
      </div>
    );
  }

  const tabCategories = [
    { name: "Overview", count: data?.summary?.totalLoans || 0 },
    { name: "Aum Report Analysis", count: data?.dpdBreakdown?.length || 0 }, 
    { name: "By Credit Executive", count: data?.partnerUserBreakdown?.length || 0 },
    { name: "By Collection Executive/Manager", count: data?.collectionPartnerUserBreakdown?.length || 0 },
    { name: "By Status", count: data?.statusBreakdown?.length || 0 },
    { name: "By Type", count: data?.loanTypeBreakdown?.length || 0 },
    { name: "By Location", count: data?.locationBreakdown?.length || 0 },
    { name: "By Due Date", count: data?.dueDateBreakdown?.length || 0 },
  ];

  const renderSummaryStats = () => {
    const totalDueLoans = data.summary.totalLoans;
    const duePrincipal = data.summary.totalPrincipal;
    const dueInterest = data.summary.totalInterestDue || 0;
    const dueObligation = data.summary.totalObligation;
    
    const receivedLoans = data.summary.paymentSummary.loansWithPayments || 0;
    const receivedPrincipal = data.summary.paymentSummary.totalPrincipalPaid || 0;
    const receivedInterest = data.summary.paymentSummary.totalInterestPaid || 0;
    const receivedObligation = data.summary.paymentSummary.totalCollected || 0;
    
    const outstandingLoans = totalDueLoans - receivedLoans;
    const outstandingPrincipal = data.summary.paymentSummary.outstandingPrincipal || 0;
    const outstandingInterest = data.summary.paymentSummary.outstandingInterest || 0;
    const outstandingObligation = data.summary.paymentSummary.outstandingObligation || data.summary.paymentSummary.outstandingAmount || 0;
    
    // Calculate efficiency percentages
    const overallCollectionRate = data.summary.paymentSummary.collectionRate || 0;
    const loanEfficiency = totalDueLoans > 0 ? ((receivedLoans / totalDueLoans) * 100).toFixed(2) : 0;
    const principalEfficiency = duePrincipal > 0 ? ((receivedPrincipal / duePrincipal) * 100).toFixed(2) : 0;
    const interestEfficiency = dueInterest > 0 ? ((receivedInterest / dueInterest) * 100).toFixed(2) : 0;
    const obligationEfficiency = dueObligation > 0 ? ((receivedObligation / dueObligation) * 100).toFixed(2) : 0;
  
    return (
      <div className="space-y-4">
        {/* Collection Overview Table - Enhanced */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Collection Overview</h3>
            <p className="text-sm text-gray-600 mt-1">Detailed breakdown of collections and efficiency metrics</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Particulars
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Loans
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Principal
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Murabaha margin
                  </th>
  
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Obligation (P+I)
                  </th>
 
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {/* Collection Due Row */}
                <tr className="bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 transition-all duration-200">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-1 h-8 bg-red-500 rounded-r mr-3"></div>
                      <span className="text-sm font-bold text-red-900">Collection Due</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold text-gray-900">
                    {formatNumber(totalDueLoans)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold text-gray-900">
                    {formatCurrency(duePrincipal)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold text-gray-900">
                    {formatCurrency(dueInterest)}
                  </td>
      
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold text-gray-900">
                    {formatCurrency(dueObligation)}
                  </td>
              
                </tr>
  
                {/* Collection Received Row */}
                <tr className="bg-gradient-to-r from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 transition-all duration-200">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-1 h-8 bg-green-500 rounded-r mr-3"></div>
                      <span className="text-sm font-bold text-green-900">Collection Received</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold text-gray-900">
                    {formatNumber(receivedLoans)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold text-gray-900">
                    {formatCurrency(receivedPrincipal)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold text-gray-900">
                    {formatCurrency(receivedInterest)}
                  </td>
          
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold text-gray-900">
                    {formatCurrency(data.summary.paymentSummary.totalCollected)}
                  </td>
         
                </tr>
  
                {/* Collection Efficiency Row */}
                <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-1 h-8 bg-blue-500 rounded-r mr-3"></div>
                      <span className="text-sm font-bold text-blue-900">Collection Efficiency</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm ${getCollectionRateClass(Number(loanEfficiency))}`}>
                      {loanEfficiency}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm ${getCollectionRateClass(Number(principalEfficiency))}`}>
                      {principalEfficiency}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm ${getCollectionRateClass(Number(interestEfficiency))}`}>
                      {interestEfficiency}%
                    </span>
                  </td>
         
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm ${getCollectionRateClass(Number(obligationEfficiency))}`}>
                      {obligationEfficiency}%
                    </span>
                  </td>
     
                </tr>
  
                {/* Outstanding Row */}
                <tr className="bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 transition-all duration-200 border-t-2 border-orange-200">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-1 h-8 bg-orange-500 rounded-r mr-3"></div>
                      <span className="text-sm font-bold text-orange-900">Outstanding</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold text-gray-900">
                    {formatNumber(outstandingLoans)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold text-gray-900">
                    {formatCurrency(outstandingPrincipal)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold text-gray-900">
                    {formatCurrency(outstandingInterest)}
                  </td>
       
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold text-gray-900">
                    {formatCurrency(outstandingObligation)}
                  </td>
             
                </tr>
              </tbody>
            </table>
          </div>
        </div>
  
        {/* Overall Collection Rate Indicator */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-900">Overall Collection Rate</div>
            <div className="text-2xl font-bold text-green-600">{overallCollectionRate}%</div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(overallCollectionRate, 100)}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-gray-600">
            Average per loan: {formatCurrency(data.summary.paymentSummary.averageCollectionPerLoan || 0)}
          </div>
        </div>
      </div>
    );
  };
  const getDpdLoanTypeBreakdown = (dpdItem: any) => {
    // Use the DPD breakdown's total count and the loan type breakdown to estimate
    // Get loan types from loanTypeBreakdown
    const loanTypes = data.loanTypeBreakdown || [];
    
    if (loanTypes.length === 0) return [];
    
    // Calculate the proportion for this DPD range
    const dpdPercentage = data.summary.totalLoans > 0 
      ? (dpdItem.count / data.summary.totalLoans) * 100
      : 0;
    
    // Estimate breakdown based on loan type distribution
    const breakdown = loanTypes.map(typeData => {
      // Estimate how many loans of this type are in this DPD range
      const estimatedCount = Math.round((typeData.count * dpdPercentage) / 100);
      const estimatedAmount = (typeData.totalAmount * dpdPercentage) / 100;
      
      return {
        type: typeData.loanType,
        count: estimatedCount,
        amount: estimatedAmount
      };
    }).filter(item => item.count > 0); // Only show types with at least 1 loan
    
    console.log('DPD Range:', dpdItem.dpdRange, 'Breakdown:', breakdown);
    
    return breakdown.sort((a, b) => b.count - a.count);
  };
  

  const renderDpdAnalysis = () => {
    if (!data.dpdBreakdown || data.dpdBreakdown.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No DPD data available
        </div>
      );
    }
  
    const grandTotal = data.dpdBreakdown.reduce((acc, item) => ({
      count: acc.count + item.count,
      totalPrincipal: acc.totalPrincipal + item.totalPrincipal,
      totalObligation: acc.totalObligation + item.totalObligation,
      totalCollected: acc.totalCollected + item.totalCollected,
      outstandingAmount: acc.outstandingAmount + item.outstandingAmount,
    }), { count: 0, totalPrincipal: 0, totalObligation: 0, totalCollected: 0, outstandingAmount: 0 });
  
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Assets Under Management (AUM) Analysis</h4>
          <p className="text-xs text-gray-600">
            Breakdown of loan portfolio by days past due, showing collection performance across different aging buckets
          </p>
        </div>
  
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  DPD Range
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Total Cases
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Loan Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Obligation
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Collected
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Outstanding
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Collection Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.dpdBreakdown.map((item, index) => {
                const collectionRate = item.totalObligation > 0 
                  ? ((item.totalCollected / item.totalObligation) * 100).toFixed(1)
                  : '0';
                const loanBreakdown = getDpdLoanTypeBreakdown(item);
                const isExpanded = expandedDpdRange === item.dpdRange;
                
                return (
                  <React.Fragment key={index}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getDpdRangeColor(item.dpdRange)}`}>
                          {item.dpdRange}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                        <button
                          onClick={() => setExpandedDpdRange(isExpanded ? null : item.dpdRange)}
                          className="inline-flex items-center gap-1 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                        >
                          {formatNumber(item.count)}
                          <svg 
                            className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(item.totalPrincipal)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-600">
                        {formatCurrency(item.totalObligation)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-600">
                        {formatCurrency(item.totalCollected)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-600">
                        {formatCurrency(item.outstandingAmount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-bold rounded ${getCollectionRateClass(Number(collectionRate))}`}>
                          {collectionRate}%
                        </span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} className="px-4 py-1 bg-gray-50">
                          <div className="ml-4 space-y-0.5">
                            <div className="text-xs font-bold text-gray-700 mb-1">
                              Loan Type Breakdown: {loanBreakdown.length > 0 ? `${loanBreakdown.length} types` : 'No data'}
                            </div>
                            {loanBreakdown.length > 0 ? (
                              loanBreakdown.map((typeData) => (
                                <div key={typeData.type} className="flex items-center justify-between bg-white border border-gray-200 rounded px-2 py-0.5 text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                      {typeData.type}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="font-semibold text-gray-900">
                                      {typeData.count} {typeData.count === 1 ? 'loan' : 'loans'}
                                    </span>
                                    <span className="font-bold text-gray-900">
                                      {formatCurrency(typeData.amount)}
                                    </span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-xs text-gray-500 italic">
                                No loan details available for this DPD range
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              
              {/* Grand Total Row */}
              <tr className="bg-gradient-to-r from-green-50 to-blue-50 border-t-2 border-green-300">
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="inline-flex px-3 py-1 text-xs font-bold rounded-full bg-green-600 text-white">
                    Grand Total
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                  {formatNumber(grandTotal.count)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                  {formatCurrency(grandTotal.totalPrincipal)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-600">
                  {formatCurrency(grandTotal.totalObligation)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-600">
                  {formatCurrency(grandTotal.totalCollected)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-600">
                  {formatCurrency(grandTotal.outstandingAmount)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex px-3 py-1 text-xs font-bold rounded ${getCollectionRateClass(
                    grandTotal.totalObligation > 0 
                      ? Number(((grandTotal.totalCollected / grandTotal.totalObligation) * 100).toFixed(1))
                      : 0
                  )}`}>
                    {grandTotal.totalObligation > 0 
                      ? ((grandTotal.totalCollected / grandTotal.totalObligation) * 100).toFixed(1)
                      : '0'}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
  
        {/* DPD Distribution Cards */}
        {data.dpdBreakdown.length >= 7 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-xs text-gray-500 mb-1">Current (Running)</div>
              <div className="text-xl font-bold text-green-600">
                {((data.dpdBreakdown[0].count / grandTotal.count) * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">{formatNumber(data.dpdBreakdown[0].count)} loans</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-xs text-gray-500 mb-1">1-90 Days</div>
              <div className="text-xl font-bold text-yellow-600">
                {(((data.dpdBreakdown[1].count + data.dpdBreakdown[2].count + data.dpdBreakdown[3].count) / grandTotal.count) * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {formatNumber(data.dpdBreakdown[1].count + data.dpdBreakdown[2].count + data.dpdBreakdown[3].count)} loans
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-xs text-gray-500 mb-1">91-180 Days</div>
              <div className="text-xl font-bold text-orange-600">
                {(((data.dpdBreakdown[4].count + data.dpdBreakdown[5].count) / grandTotal.count) * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {formatNumber(data.dpdBreakdown[4].count + data.dpdBreakdown[5].count)} loans
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-xs text-gray-500 mb-1">180+ Days</div>
              <div className="text-xl font-bold text-red-600">
                {((data.dpdBreakdown[6].count / grandTotal.count) * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">{formatNumber(data.dpdBreakdown[6].count)} loans</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderStatusBreakdown = () => (
    <div className="space-y-3">
      {data.statusBreakdown.map((statusGroup) => (
        <div key={statusGroup.status} className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedStatus(expandedStatus === statusGroup.status ? null : statusGroup.status)}
            className="w-full bg-gray-50 px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusClass(statusGroup.status)}`}>
                {statusGroup.status}
              </span>
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">
                  {formatNumber(statusGroup.count)} loans • {formatCurrency(statusGroup.totalAmount)}
                </div>
                <div className="text-xs text-gray-500">
                  {(() => {
                    const totalCollected = statusGroup.loans?.reduce((sum, loan) => sum + loan.paymentSummary.totalCollected, 0) || 0;
                    return `Principal: ${formatCurrency(statusGroup.totalPrincipal)} • Obligation: ${formatCurrency(statusGroup.totalObligation)} • Collected: ${formatCurrency(totalCollected)} • Avg: ${formatCurrency(statusGroup.averageAmount)} `;
                  })()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {(() => {
                const totalCollected = statusGroup.loans?.reduce((sum, loan) => sum + loan.paymentSummary.totalCollected, 0) || 0;
                const collectionRate = statusGroup.totalObligation > 0 ? ((totalCollected / statusGroup.totalObligation) * 100).toFixed(0) : 0;
                return (
                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded ${getCollectionRateClass(Number(collectionRate))}`}>
                    Collection Rate: {collectionRate}%
                  </span>
                );
              })()}
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform ${expandedStatus === statusGroup.status ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          
          {expandedStatus === statusGroup.status && (
            <div className="p-4 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Loan ID</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Principal</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Obligation</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Collected</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(showAllLoans[statusGroup.status] ? statusGroup.loans : statusGroup.loans.slice(0, 20)).map((loan) => (
                      <tr key={loan.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs font-medium text-gray-900">
                          {loan.formattedLoanId || loan.id.slice(0, 8)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-xs font-medium text-gray-900">{loan.customerName}</div>
                          <div className="text-xs text-gray-500">{loan.phoneNumber}</div>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-900">{formatCurrency(loan.principal)}</td>
                        <td className="px-3 py-2 text-xs font-semibold text-indigo-600">{formatCurrency(loan.obligation)}</td>
                        <td className="px-3 py-2 text-xs font-semibold text-green-600">
                          {formatCurrency(loan.paymentSummary.totalCollected)}
                        </td>
                        <td className="px-3 py-2 text-xs font-semibold text-orange-600">
                          {formatCurrency(loan.paymentSummary.outstandingAmount)}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded ${getCollectionRateClass(loan.paymentSummary.collectionRate)}`}>
                            {loan.paymentSummary.collectionRate}%
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          {new Date(loan.dueDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {statusGroup.loans.length > 20 && (
                  <div className="p-3 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Showing {showAllLoans[statusGroup.status] ? statusGroup.loans.length : 20} of {statusGroup.loans.length} loans
                      </div>
                      <button
                        onClick={() => toggleShowAllLoans(statusGroup.status)}
                        className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        {showAllLoans[statusGroup.status] ? 'Show Less' : `Show All ${statusGroup.loans.length} Loans`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderLoanTypeBreakdown = () => (
    <div className="space-y-3">
      {data.loanTypeBreakdown.map((typeGroup) => (
        <div key={typeGroup.loanType} className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedType(expandedType === typeGroup.loanType ? null : typeGroup.loanType)}
            className="w-full bg-gray-50 px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                {typeGroup.loanType}
              </span>
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">
                  {formatNumber(typeGroup.count)} loans • {formatCurrency(typeGroup.totalAmount)}
                </div>
                <div className="text-xs text-gray-500">
                  {(() => {
                    const totalCollected = typeGroup.loans?.reduce((sum, loan) => sum + loan.paymentSummary.totalCollected, 0) || 0;
          
                    return `Principal: ${formatCurrency(typeGroup.totalPrincipal)} • Obligation: ${formatCurrency(typeGroup.totalObligation)} • Collected: ${formatCurrency(totalCollected)} • Avg: ${formatCurrency(typeGroup.count > 0 ? typeGroup.totalObligation / typeGroup.count : 0)}`;
                  })()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {(() => {
                const totalCollected = typeGroup.loans?.reduce((sum, loan) => sum + loan.paymentSummary.totalCollected, 0) || 0;
                const collectionRate = typeGroup.totalObligation > 0 ? ((totalCollected / typeGroup.totalObligation) * 100).toFixed(0) : 0;
                return (
                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded ${getCollectionRateClass(Number(collectionRate))}`}>
                    Collection Rate: {collectionRate}%
                  </span>
                );
              })()}
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform ${expandedType === typeGroup.loanType ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          
          {expandedType === typeGroup.loanType && typeGroup.loans && typeGroup.loans.length > 0 && (
            <div className="p-4 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Loan ID</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Principal</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Obligation</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Collected</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(showAllLoans[typeGroup.loanType] ? typeGroup.loans : typeGroup.loans.slice(0, 20)).map((loan) => (
                      <tr key={loan.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs font-medium text-gray-900">
                          {loan.formattedLoanId || loan.id.slice(0, 8)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-xs font-medium text-gray-900">{loan.customerName}</div>
                          <div className="text-xs text-gray-500">{loan.phoneNumber}</div>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-900">{formatCurrency(loan.principal)}</td>
                        <td className="px-3 py-2 text-xs font-semibold text-indigo-600">{formatCurrency(loan.obligation)}</td>
                        <td className="px-3 py-2 text-xs font-semibold text-green-600">
                          {formatCurrency(loan.paymentSummary.totalCollected)}
                        </td>
                        <td className="px-3 py-2 text-xs font-semibold text-orange-600">
                          {formatCurrency(loan.paymentSummary.outstandingAmount)}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded ${getCollectionRateClass(loan.paymentSummary.collectionRate)}`}>
                            {loan.paymentSummary.collectionRate}%
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          {new Date(loan.dueDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {typeGroup.loans.length > 20 && (
                  <div className="p-3 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Showing {showAllLoans[typeGroup.loanType] ? typeGroup.loans.length : 20} of {typeGroup.loans.length} loans
                      </div>
                      <button
                        onClick={() => toggleShowAllLoans(typeGroup.loanType)}
                        className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        {showAllLoans[typeGroup.loanType] ? 'Show Less' : `Show All ${typeGroup.loans.length} Loans`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderLocationBreakdown = () => (
    <div className="space-y-3">
      {data.locationBreakdown.map((locationGroup) => (
        <div key={locationGroup.state} className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedLocation(expandedLocation === locationGroup.state ? null : locationGroup.state)}
            className="w-full bg-gray-50 px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                {locationGroup.state}
              </span>
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">
                  {formatNumber(locationGroup.count)} loans • {formatCurrency(locationGroup.totalAmount)}
                </div>
                <div className="text-xs text-gray-500">
                  Obligation: {formatCurrency(locationGroup.totalObligation)} • Collected: {formatCurrency(locationGroup.totalCollected)} • Avg: {formatCurrency(locationGroup.count > 0 ? locationGroup.totalObligation / locationGroup.count : 0)} 
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {(() => {
                const totalCollected = locationGroup.totalCollected || 0;
                const collectionRate = locationGroup.totalObligation > 0 ? ((totalCollected / locationGroup.totalObligation) * 100).toFixed(0) : 0;
                return (
                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded gap--3 ${getCollectionRateClass(Number(collectionRate))}`}>
                    Collection Rate: {collectionRate}%
                  </span>
                );
              })()}
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform ${expandedLocation === locationGroup.state ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          
          {expandedLocation === locationGroup.state && locationGroup.loans && locationGroup.loans.length > 0 && (
            <div className="p-4 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Loan ID</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Principal</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Obligation</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Collected</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(showAllLoans[locationGroup.state] ? locationGroup.loans : locationGroup.loans.slice(0, 20)).map((loan) => (
                      <tr key={loan.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs font-medium text-gray-900">
                          {loan.formattedLoanId || loan.id.slice(0, 8)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-xs font-medium text-gray-900">{loan.customerName}</div>
                          <div className="text-xs text-gray-500">{loan.phoneNumber}</div>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-900">{formatCurrency(loan.principal)}</td>
                        <td className="px-3 py-2 text-xs font-semibold text-indigo-600">{formatCurrency(loan.obligation)}</td>
                        <td className="px-3 py-2 text-xs font-semibold text-green-600">
                          {formatCurrency(loan.paymentSummary.totalCollected)}
                        </td>
                        <td className="px-3 py-2 text-xs font-semibold text-orange-600">
                          {formatCurrency(loan.paymentSummary.outstandingAmount)}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded ${getCollectionRateClass(loan.paymentSummary.collectionRate)}`}>
                            {loan.paymentSummary.collectionRate}%
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          {new Date(loan.dueDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {locationGroup.loans.length > 20 && (
                  <div className="p-3 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Showing {showAllLoans[locationGroup.state] ? locationGroup.loans.length : 20} of {locationGroup.loans.length} loans
                      </div>
                      <button
                        onClick={() => toggleShowAllLoans(locationGroup.state)}
                        className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        {showAllLoans[locationGroup.state] ? 'Show Less' : `Show All ${locationGroup.loans.length} Loans`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderDueDateBreakdown = () => (
    <div className="space-y-3">
      {data.dueDateBreakdown.map((dateGroup) => (
        <div key={dateGroup.month} className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedDueDate(expandedDueDate === dateGroup.month ? null : dateGroup.month)}
            className="w-full bg-gray-50 px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                {dateGroup.month}
              </span>
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">
                  {formatNumber(dateGroup.count)} loans • {formatCurrency(dateGroup.totalAmount)}
                </div>
                <div className="text-xs text-gray-500">
                  Obligation: {formatCurrency(dateGroup.totalObligation)} • Collected: {formatCurrency(dateGroup.totalCollected)} • Collection Rate: {dateGroup.totalObligation > 0 ? ((dateGroup.totalCollected / dateGroup.totalObligation) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {(() => {
                const collectionRate = dateGroup.totalObligation > 0 ? ((dateGroup.totalCollected / dateGroup.totalObligation) * 100).toFixed(0) : 0;
                return (
                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded ${getCollectionRateClass(Number(collectionRate))}`}>
                    Collection Rate: {collectionRate}%
                  </span>
                );
              })()}
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform ${expandedDueDate === dateGroup.month ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          
          {expandedDueDate === dateGroup.month && dateGroup.loans && dateGroup.loans.length > 0 && (
            <div className="p-4 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Loan ID</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Principal</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Obligation</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Collected</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(showAllLoans[dateGroup.month] ? dateGroup.loans : dateGroup.loans.slice(0, 20)).map((loan) => (
                      <tr key={loan.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs font-medium text-gray-900">
                          {loan.formattedLoanId || loan.id.slice(0, 8)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-xs font-medium text-gray-900">{loan.customerName}</div>
                          <div className="text-xs text-gray-500">{loan.phoneNumber}</div>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-900">{formatCurrency(loan.principal)}</td>
                        <td className="px-3 py-2 text-xs font-semibold text-indigo-600">{formatCurrency(loan.obligation)}</td>
                        <td className="px-3 py-2 text-xs font-semibold text-green-600">
                          {formatCurrency(loan.paymentSummary.totalCollected)}
                        </td>
                        <td className="px-3 py-2 text-xs font-semibold text-orange-600">
                          {formatCurrency(loan.paymentSummary.outstandingAmount)}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded ${getCollectionRateClass(loan.paymentSummary.collectionRate)}`}>
                            {loan.paymentSummary.collectionRate}%
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          {new Date(loan.dueDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {dateGroup.loans.length > 20 && (
                  <div className="p-3 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Showing {showAllLoans[dateGroup.month] ? dateGroup.loans.length : 20} of {dateGroup.loans.length} loans
                      </div>
                      <button
                        onClick={() => toggleShowAllLoans(dateGroup.month)}
                        className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        {showAllLoans[dateGroup.month] ? 'Show Less' : `Show All ${dateGroup.loans.length} Loans`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // const renderRoleBreakdown = () => (
  //   <div className="space-y-3">
  //     {data.roleBreakdown.map((roleGroup) => (
  //       <div key={roleGroup.role} className="border border-gray-200 rounded-lg overflow-hidden">
  //         <button
  //           onClick={() => setExpandedStatus(expandedStatus === roleGroup.role ? null : roleGroup.role)}
  //           className="w-full bg-gray-50 px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
  //         >
  //           <div className="flex items-center gap-3">
  //             <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
  //               roleGroup.role === 'executive' ? 'bg-blue-100 text-blue-800' :
  //               roleGroup.role === 'manager' ? 'bg-purple-100 text-purple-800' :
  //               'bg-green-100 text-green-800'
  //             }`}>
  //               {roleGroup.role.charAt(0).toUpperCase() + roleGroup.role.slice(1)}
  //             </span>
  //             <div className="text-left">
  //               <div className="text-sm font-medium text-gray-900">
  //                 {formatNumber(roleGroup.partnerUserCount)} users • {formatNumber(roleGroup.count)} loans • {formatCurrency(roleGroup.totalAmount)}
  //               </div>
  //               <div className="text-xs text-gray-500">
  //                 Obligation: {formatCurrency(roleGroup.totalObligation)} • Collected: {formatCurrency(roleGroup.totalCollected)} • Avg: {formatCurrency(roleGroup.count > 0 ? roleGroup.totalObligation / roleGroup.count : 0)} 
  //               </div>
  //             </div>
  //           </div>
  //           <div className="flex items-center gap-3">
  //             {(() => {
  //               const totalCollected = roleGroup.totalCollected || 0;
  //               const collectionRate = roleGroup.totalObligation > 0 ? ((totalCollected / roleGroup.totalObligation) * 100).toFixed(0) : 0;
  //               return (
  //                 <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded ${getCollectionRateClass(Number(collectionRate))}`}>
  //                   Collection Rate: {collectionRate}%
  //                 </span>
  //               );
  //             })()}
  //             <svg
  //               className={`w-5 h-5 text-gray-500 transition-transform ${expandedStatus === roleGroup.role ? 'rotate-180' : ''}`}
  //               fill="none"
  //               viewBox="0 0 24 24"
  //               stroke="currentColor"
  //             >
  //               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  //             </svg>
  //           </div>
  //         </button>
          
  //         {expandedStatus === roleGroup.role && (
  //           <div className="p-4 bg-gray-50 border-t">
  //             <div className="text-sm font-medium text-gray-700 mb-3">Summary Metrics</div>
  //             <div className="grid grid-cols-4 gap-3 mb-4">
  //               <div className="bg-white p-3 rounded border border-gray-200">
  //                 <div className="text-xs text-gray-500">Total Users</div>
  //                 <div className="text-lg font-bold text-gray-900">{formatNumber(roleGroup.partnerUserCount)}</div>
  //               </div>
  //               <div className="bg-white p-3 rounded border border-gray-200">
  //                 <div className="text-xs text-gray-500">Total Loans</div>
  //                 <div className="text-lg font-bold text-gray-900">{formatNumber(roleGroup.count)}</div>
  //               </div>
  //               <div className="bg-white p-3 rounded border border-gray-200">
  //                 <div className="text-xs text-gray-500">Total Amount</div>
  //                 <div className="text-lg font-bold text-gray-900">{formatCurrency(roleGroup.totalAmount)}</div>
  //               </div>
  //               <div className="bg-white p-3 rounded border border-gray-200">
  //                 <div className="text-xs text-gray-500">Avg per Loan</div>
  //                 <div className="text-lg font-bold text-gray-900">{formatCurrency(roleGroup.count > 0 ? roleGroup.totalAmount / roleGroup.count : 0)}</div>
  //               </div>
  //             </div>
  //             <div className="text-sm text-gray-600 italic">Role: {roleGroup.role.toUpperCase()}</div>
  //           </div>
  //         )}
  //       </div>
  //     ))}
  //   </div>
  // );

  const renderPartnerUserBreakdown = () => {
    // Debug: Log the data to see if managerName exists
    console.log('Partner User Breakdown Data:', data.partnerUserBreakdown);
    console.log('Sample Executive:', data.partnerUserBreakdown.find(u => u.role === 'executive'));
    
    // Group partner users hierarchically: heads, then managers with their executives
    const groupedPartnerUsers: typeof data.partnerUserBreakdown = [];
    
    // Separate by role
    const heads = data.partnerUserBreakdown.filter(u => u.role === 'head');
    const managers = data.partnerUserBreakdown.filter(u => u.role === 'manager');
    const executives = data.partnerUserBreakdown.filter(u => u.role === 'executive');
    
    // Add heads first
    heads.forEach(head => {
      groupedPartnerUsers.push(head);
    });
    
    // Then add each manager followed by their executives
    managers.forEach(manager => {
      groupedPartnerUsers.push(manager);
      // Find executives under this manager
      const subordinates = executives.filter(
        exec => exec.managerName === manager.partnerUserName
      );
      groupedPartnerUsers.push(...subordinates);
    });
    
    // Add any executives without a manager at the end
    const unmanagedExecutives = executives.filter(
      exec => !exec.managerName || !managers.some(m => m.partnerUserName === exec.managerName)
    );
    groupedPartnerUsers.push(...unmanagedExecutives);

    return (
      <div className="space-y-2">
        {groupedPartnerUsers.map((partnerUserGroup) => {
          const isExecutive = partnerUserGroup.role === 'executive';
          const isManager = partnerUserGroup.role === 'manager';
          const isHead = partnerUserGroup.role === 'head';

          return (
            <div 
              key={partnerUserGroup.partnerUserId} 
              className={`border border-gray-200 rounded-lg overflow-hidden ${
                isExecutive ? 'ml-12 border-l-4 border-l-cyan-400' : ''
              }`}
            >
              <button
                onClick={() => setExpandedStatus(expandedStatus === partnerUserGroup.partnerUserId ? null : partnerUserGroup.partnerUserId)}
                className={`w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors bg-white`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center gap-3">
                    {isExecutive && (
                      <span className="text-gray-400 text-lg leading-none">↳</span>
                    )}
                    {(isManager || isHead) && (
                      <span className="text-green-600 text-base leading-none font-semibold">✓</span>
                    )}
                    <div className="flex flex-col gap-1 items-start">
                      <span className="text-sm font-semibold text-cyan-700">
                        {partnerUserGroup.partnerUserName}
                      </span>
                      <span className={`text-xs font-semibold ${
                        isExecutive ? 'text-blue-600' :
                        isManager ? 'text-purple-600' :
                        'text-green-600'
                      }`}>
                        {partnerUserGroup.role.charAt(0).toUpperCase() + partnerUserGroup.role.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div className="text-left ml-4">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatNumber(partnerUserGroup.count)} loans • {formatCurrency(partnerUserGroup.totalAmount)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(() => {
                        const totalCollected = partnerUserGroup.totalCollected || 0;
                        return `Principal: ${formatCurrency(partnerUserGroup.totalAmount)} • Obligation: ${formatCurrency(partnerUserGroup.totalObligation)} • Collected: ${formatCurrency(totalCollected)} • Avg: ${formatCurrency(partnerUserGroup.count > 0 ? partnerUserGroup.totalObligation / partnerUserGroup.count : 0)}`;
                      })()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {(() => {
                    const totalCollected = partnerUserGroup.totalCollected || 0;
                    const collectionRate = partnerUserGroup.totalObligation > 0 ? ((totalCollected / partnerUserGroup.totalObligation) * 100).toFixed(0) : 0;
                    return (
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded ${getCollectionRateClass(Number(collectionRate))}`}>
                        {collectionRate}%
                      </span>
                    );
                  })()}
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${expandedStatus === partnerUserGroup.partnerUserId ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              
              {expandedStatus === partnerUserGroup.partnerUserId && (
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Loan ID</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Principal</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Obligation</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Collected</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(showAllLoans[partnerUserGroup.partnerUserId] ? partnerUserGroup.loans : partnerUserGroup.loans.slice(0, 20)).map((loan) => (
                          <tr key={loan.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-xs font-medium text-gray-900">
                              {loan.formattedLoanId || loan.id.slice(0, 8)}
                            </td>
                            <td className="px-3 py-2">
                              <div className="text-xs font-medium text-gray-900">{loan.customerName}</div>
                              <div className="text-xs text-gray-500">{loan.phoneNumber}</div>
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-900">{formatCurrency(loan.principal)}</td>
                            <td className="px-3 py-2 text-xs font-semibold text-indigo-600">{formatCurrency(loan.obligation)}</td>
                            <td className="px-3 py-2 text-xs font-semibold text-green-600">
                              {formatCurrency(loan.paymentSummary.totalCollected)}
                            </td>
                            <td className="px-3 py-2 text-xs font-semibold text-orange-600">
                              {formatCurrency(loan.paymentSummary.outstandingAmount)}
                            </td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded ${getCollectionRateClass(loan.paymentSummary.collectionRate)}`}>
                                {loan.paymentSummary.collectionRate}%
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-500">
                              {new Date(loan.dueDate).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {partnerUserGroup.loans.length > 20 && (
                      <div className="p-3 border-t border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600">
                            Showing {showAllLoans[partnerUserGroup.partnerUserId] ? partnerUserGroup.loans.length : 20} of {partnerUserGroup.loans.length} loans
                          </div>
                          <button
                            onClick={() => toggleShowAllLoans(partnerUserGroup.partnerUserId)}
                            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            {showAllLoans[partnerUserGroup.partnerUserId] ? 'Show Less' : `Show All ${partnerUserGroup.loans.length} Loans`}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // const renderCollectionRoleBreakdown = () => {
  //   if (!data.collectionRoleBreakdown || data.collectionRoleBreakdown.length === 0) {
  //     return (
  //       <div className="text-center py-8 text-gray-500">
  //         No collection role data available
  //       </div>
  //     );
  //   }
    
  //   return (
  //     <div className="space-y-3">
  //       {data.collectionRoleBreakdown.map((roleGroup) => (
  //       <div key={roleGroup.role} className="border border-gray-200 rounded-lg overflow-hidden">
  //         <button
  //           onClick={() => setExpandedStatus(expandedStatus === roleGroup.role ? null : roleGroup.role)}
  //           className="w-full bg-gray-50 px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
  //         >
  //           <div className="flex items-center gap-3">
  //             <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
  //               roleGroup.role === 'collection_executive' ? 'bg-blue-100 text-blue-800' :
  //               roleGroup.role === 'collection_manager' ? 'bg-purple-100 text-purple-800' :
  //               roleGroup.role === 'collection_head' ? 'bg-indigo-100 text-indigo-800' :
  //               'bg-green-100 text-green-800'
  //             }`}>
  //               {roleGroup.role.replace('_', ' ').charAt(0).toUpperCase() + roleGroup.role.replace('_', ' ').slice(1)}
  //             </span>
  //             <div className="text-left">
  //               <div className="text-sm font-medium text-gray-900">
  //                 {formatNumber(roleGroup.partnerUserCount)} users • {formatNumber(roleGroup.count)} loans • {formatCurrency(roleGroup.totalAmount)}
  //               </div>
  //               <div className="text-xs text-gray-500">
  //                 Obligation: {formatCurrency(roleGroup.totalObligation)} • Collected: {formatCurrency(roleGroup.totalCollected)} • Avg: {formatCurrency(roleGroup.count > 0 ? roleGroup.totalObligation / roleGroup.count : 0)} 
  //               </div>
  //             </div>
  //           </div>
  //           <div className="flex items-center gap-3">
  //             {(() => {
  //               const totalCollected = roleGroup.totalCollected || 0;
  //               const collectionRate = roleGroup.totalObligation > 0 ? ((totalCollected / roleGroup.totalObligation) * 100).toFixed(0) : 0;
  //               return (
  //                 <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded ${getCollectionRateClass(Number(collectionRate))}`}>
  //                   Collection Rate: {collectionRate}%
  //                 </span>
  //               );
  //             })()}
  //             <svg
  //               className={`w-5 h-5 text-gray-500 transition-transform ${expandedStatus === roleGroup.role ? 'rotate-180' : ''}`}
  //               fill="none"
  //               viewBox="0 0 24 24"
  //               stroke="currentColor"
  //             >
  //               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  //             </svg>
  //           </div>
  //         </button>
          
  //         {expandedStatus === roleGroup.role && (
  //           <div className="p-4 bg-gray-50 border-t">
  //             <div className="text-sm font-medium text-gray-700 mb-3">Summary Metrics</div>
  //             <div className="grid grid-cols-4 gap-3 mb-4">
  //               <div className="bg-white p-3 rounded border border-gray-200">
  //                 <div className="text-xs text-gray-500">Total Users</div>
  //                 <div className="text-lg font-bold text-gray-900">{formatNumber(roleGroup.partnerUserCount)}</div>
  //               </div>
  //               <div className="bg-white p-3 rounded border border-gray-200">
  //                 <div className="text-xs text-gray-500">Total Loans</div>
  //                 <div className="text-lg font-bold text-gray-900">{formatNumber(roleGroup.count)}</div>
  //               </div>
  //               <div className="bg-white p-3 rounded border border-gray-200">
  //                 <div className="text-xs text-gray-500">Total Amount</div>
  //                 <div className="text-lg font-bold text-gray-900">{formatCurrency(roleGroup.totalAmount)}</div>
  //               </div>
  //               <div className="bg-white p-3 rounded border border-gray-200">
  //                 <div className="text-xs text-gray-500">Avg per Loan</div>
  //                 <div className="text-lg font-bold text-gray-900">{formatCurrency(roleGroup.count > 0 ? roleGroup.totalAmount / roleGroup.count : 0)}</div>
  //               </div>
  //             </div>
  //             <div className="text-sm text-gray-600 italic">Collection Role: {roleGroup.role.replace('_', ' ').toUpperCase()}</div>
  //           </div>
  //         )}
  //       </div>
  //     ))}
  //   </div>
  //   );
  // };

  const renderCollectionPartnerUserBreakdown = () => {
    if (!data.collectionPartnerUserBreakdown || data.collectionPartnerUserBreakdown.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No collection partner user data available
        </div>
      );
    }
    
    // Group collection partner users hierarchically: heads, then managers with their executives
    const groupedCollectionPartnerUsers: typeof data.collectionPartnerUserBreakdown = [];
    
    // Separate by role and sort by count (highest to lowest)
    const heads = data.collectionPartnerUserBreakdown
      .filter(u => u.role === 'head' || u.role === 'collection_head')
      .sort((a, b) => b.count - a.count);
    
    const managers = data.collectionPartnerUserBreakdown
      .filter(u => u.role === 'manager' || u.role === 'collection_manager')
      .sort((a, b) => b.count - a.count);
    
    const executives = data.collectionPartnerUserBreakdown
      .filter(u => u.role === 'executive' || u.role === 'collection_executive')
      .sort((a, b) => b.count - a.count);
    
    // Add heads first (already sorted by count)
    heads.forEach(head => {
      groupedCollectionPartnerUsers.push(head);
    });
    
    // Then add each manager followed by their executives (sorted)
    managers.forEach(manager => {
      groupedCollectionPartnerUsers.push(manager);
      // Find executives under this manager and sort by count
      const subordinates = executives
        .filter(exec => (exec as any).managerName === manager.partnerUserName)
        .sort((a, b) => b.count - a.count);
      groupedCollectionPartnerUsers.push(...subordinates);
    });
    
    // Add any executives without a manager at the end (sorted)
    const unmanagedExecutives = executives
      .filter(exec => !(exec as any).managerName || !managers.some(m => m.partnerUserName === (exec as any).managerName))
      .sort((a, b) => b.count - a.count);
    groupedCollectionPartnerUsers.push(...unmanagedExecutives);
    
    return (
      <div className="space-y-2">
        {groupedCollectionPartnerUsers.map((partnerUserGroup) => {
          const isExecutive = partnerUserGroup.role === 'executive' || partnerUserGroup.role === 'collection_executive';
          const isManager = partnerUserGroup.role === 'manager' || partnerUserGroup.role === 'collection_manager';
          const isHead = partnerUserGroup.role === 'head' || partnerUserGroup.role === 'collection_head';
  
          return (
            <div 
              key={partnerUserGroup.partnerUserId} 
              className={`border border-gray-200 rounded-lg overflow-hidden ${
                isExecutive ? 'ml-12 border-l-4 border-l-cyan-400' : ''
              }`}
            >
              <button
                onClick={() => setExpandedStatus(expandedStatus === partnerUserGroup.partnerUserId ? null : partnerUserGroup.partnerUserId)}
                className={`w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors bg-white`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center gap-3">
                    {isExecutive && (
                      <span className="text-gray-400 text-lg leading-none">↳</span>
                    )}
                    {(isManager || isHead) && (
                      <span className="text-green-600 text-base leading-none font-semibold">✓</span>
                    )}
                    <div className="flex flex-col gap-1 items-start">
                      <span className="text-sm font-semibold text-cyan-700">
                        {partnerUserGroup.partnerUserName}
                      </span>
                      <span className={`text-xs font-semibold ${
                        isExecutive ? 'text-blue-600' :
                        isManager ? 'text-purple-600' :
                        'text-green-600'
                      }`}>
                        {partnerUserGroup.role.replace('_', ' ').charAt(0).toUpperCase() + partnerUserGroup.role.replace('_', ' ').slice(1)}
                      </span>
                    </div>
                  </div>
                  <div className="text-left ml-4">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatNumber(partnerUserGroup.count)} loans • {formatCurrency(partnerUserGroup.totalAmount)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(() => {
                        const totalCollected = partnerUserGroup.totalCollected || 0;
                        return `Principal: ${formatCurrency(partnerUserGroup.totalAmount)} • Obligation: ${formatCurrency(partnerUserGroup.totalObligation)} • Collected: ${formatCurrency(totalCollected)} • Avg: ${formatCurrency(partnerUserGroup.count > 0 ? partnerUserGroup.totalObligation / partnerUserGroup.count : 0)}`;
                      })()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {(() => {
                    const totalCollected = partnerUserGroup.totalCollected || 0;
                    const collectionRate = partnerUserGroup.totalObligation > 0 ? ((totalCollected / partnerUserGroup.totalObligation) * 100).toFixed(0) : 0;
                    return (
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded ${getCollectionRateClass(Number(collectionRate))}`}>
                        {collectionRate}%
                      </span>
                    );
                  })()}
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${expandedStatus === partnerUserGroup.partnerUserId ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
          
              {expandedStatus === partnerUserGroup.partnerUserId && (
                <div className="p-4 bg-white">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Loan ID</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Principal</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Obligation</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Collected</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(showAllLoans[partnerUserGroup.partnerUserId] ? partnerUserGroup.loans : partnerUserGroup.loans.slice(0, 20)).map((loan) => (
                          <tr key={loan.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-xs font-medium text-gray-900">
                              {loan.formattedLoanId || loan.id.slice(0, 8)}
                            </td>
                            <td className="px-3 py-2">
                              <div className="text-xs font-medium text-gray-900">{loan.customerName}</div>
                              <div className="text-xs text-gray-500">{loan.phoneNumber}</div>
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-900">{formatCurrency(loan.principal)}</td>
                            <td className="px-3 py-2 text-xs font-semibold text-indigo-600">{formatCurrency(loan.obligation)}</td>
                            <td className="px-3 py-2 text-xs font-semibold text-green-600">
                              {formatCurrency(loan.paymentSummary.totalCollected)}
                            </td>
                            <td className="px-3 py-2 text-xs font-semibold text-orange-600">
                              {formatCurrency(loan.paymentSummary.outstandingAmount)}
                            </td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded ${getCollectionRateClass(loan.paymentSummary.collectionRate)}`}>
                                {loan.paymentSummary.collectionRate}%
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-500">
                              {new Date(loan.dueDate).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {partnerUserGroup.loans.length > 20 && (
                      <div className="p-3 border-t border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600">
                            Showing {showAllLoans[partnerUserGroup.partnerUserId] ? partnerUserGroup.loans.length : 20} of {partnerUserGroup.loans.length} loans
                          </div>
                          <button
                            onClick={() => toggleShowAllLoans(partnerUserGroup.partnerUserId)}
                            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            {showAllLoans[partnerUserGroup.partnerUserId] ? 'Show Less' : `Show All ${partnerUserGroup.loans.length} Loans`}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

const renderTabContent = () => {
  switch (selectedTab) {
    case 0: // "Overview"
      return renderSummaryStats();
    case 1: // "DPD Analysis"
      return renderDpdAnalysis();
    case 2: // "By Credit Executive"
      return renderPartnerUserBreakdown();
    case 3: // "By Collection Executive/Manager"
      return renderCollectionPartnerUserBreakdown();
    case 4: // "By Status"
      return renderStatusBreakdown();
    case 5: // "By Type"
      return renderLoanTypeBreakdown();
    case 6: // "By Location"
      return renderLocationBreakdown();
    case 7: // "By Due Date"
      return renderDueDateBreakdown();
    // case 8: // "By Role"
    //   return renderRoleBreakdown();
    default:
      return null;
  }
};

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
    <div className="flex justify-between items-center px-3 py-2 bg-gray-50 border-b">
      <h3 className="text-sm font-semibold text-gray-900">
        Collection Analysis <span className="text-xs font-normal text-gray-600">({data?.dateRange?.period || 'No period'})</span>
      </h3>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-gray-500 hover:text-gray-700 p-1"
      >
        {isExpanded ? (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>
    </div>
    
    {isExpanded && (
      <div className="p-3">
        {/* Tab Navigation - Compact */}
        <div className="flex space-x-0.5 rounded-lg bg-gray-100 p-0.5 mb-3 overflow-x-auto text-xs">
          {tabCategories.map((category, index) => (
            <button
              key={category.name}
              onClick={() => setSelectedTab(index)}
              className={`px-2 py-1 text-xs font-medium leading-4 whitespace-nowrap rounded transition-colors ${
                selectedTab === index
                  ? 'bg-white text-green-700 shadow'
                  : 'text-gray-700 hover:bg-white hover:text-gray-900'
              }`}
            >
              <span>{category.name}</span>
              {(category.count || 0) > 0 && (
                <span className="ml-1 bg-gray-200 text-gray-700 text-xs px-1.5 py-0.5 rounded-full">
                  {category.count}
                </span>
              )}
            </button>
          ))}
        </div>
          
          {/* Tab Content */}
          <div>
            {renderTabContent()}
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionAnalysisCard;