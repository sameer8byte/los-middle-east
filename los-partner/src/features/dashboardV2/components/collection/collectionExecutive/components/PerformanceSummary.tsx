// 🔴 UNCOMMENT BELOW WHEN API IS READY
// import { useState, useEffect } from "react";
// import { getPerformanceSummary } from "../../services/dashboardApi";
// import type { PerformanceSummaryData } from "../../types/dashboard.types";

import { useState, useEffect } from "react";

export const PerformanceSummary = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState("Today");
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 53; // 2619 / 50

  // 🔴 This useEffect will trigger when dateFilter changes
  useEffect(() => {
    console.log('Date filter changed to:', dateFilter);
    // When API is ready, fetch data here based on dateFilter
    // fetchPerformanceSummary({ dateFilter, page: currentPage });
  }, [dateFilter]);

  useEffect(() => {
    console.log('Page changed to:', currentPage);
    // When API is ready, fetch data here based on currentPage
    // fetchPerformanceSummary({ dateFilter, page: currentPage });
  }, [currentPage]);

  // 🔴 UNCOMMENT BELOW WHEN API IS READY
  // const [data, setData] = useState<PerformanceSummaryData | null>(null);
  // const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       setLoading(true);
  //       const response = await getPerformanceSummary();
  //       setData(response);
  //     } catch (err) {
  //       console.error(err);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   fetchData();
  // }, []);

  // 🔴 REPLACE MOCK DATA WITH API data
  const tableData = [
    { srNo: 1, month: "Jan 2025", caseCount: 420, sanctionedAmount: "₹24,00,000", repaymentAmount: "₹20,00,000", closedLoans: 320, closedLoanAmount: "₹21,00,000", closedRepaymentAmount: "₹21,00,000", collection: "86 %" },
    { srNo: 2, month: "Feb 2025", caseCount: 450, sanctionedAmount: "₹25,50,000", repaymentAmount: "₹21,50,000", closedLoans: 340, closedLoanAmount: "₹22,50,000", closedRepaymentAmount: "₹22,50,000", collection: "88 %" },
    { srNo: 3, month: "Mar 2025", caseCount: 480, sanctionedAmount: "₹27,00,000", repaymentAmount: "₹23,00,000", closedLoans: 360, closedLoanAmount: "₹23,00,000", closedRepaymentAmount: "₹23,00,000", collection: "80 %" },
    { srNo: 4, month: "Apr 2025", caseCount: 500, sanctionedAmount: "₹28,50,000", repaymentAmount: "₹24,00,000", closedLoans: 380, closedLoanAmount: "₹24,50,000", closedRepaymentAmount: "₹24,50,000", collection: "92 %" },
    { srNo: 5, month: "May 2025", caseCount: 520, sanctionedAmount: "₹30,00,000", repaymentAmount: "₹25,00,000", closedLoans: 400, closedLoanAmount: "₹25,00,000", closedRepaymentAmount: "₹25,00,000", collection: "93 %" },
    { srNo: 6, month: "Jun 2025", caseCount: 550, sanctionedAmount: "₹31,50,000", repaymentAmount: "₹26,00,000", closedLoans: 420, closedLoanAmount: "₹26,00,000", closedRepaymentAmount: "₹26,00,000", collection: "95 %" },
    { srNo: 7, month: "Jul 2025", caseCount: 570, sanctionedAmount: "₹33,00,000", repaymentAmount: "₹27,00,000", closedLoans: 440, closedLoanAmount: "₹27,00,000", closedRepaymentAmount: "₹27,00,000", collection: "65 %" },
    { srNo: 8, month: "Aug 2025", caseCount: 600, sanctionedAmount: "₹34,50,000", repaymentAmount: "₹28,00,000", closedLoans: 460, closedLoanAmount: "₹28,00,000", closedRepaymentAmount: "₹28,00,000", collection: "97 %" },
    { srNo: 9, month: "Sep 2025", caseCount: 620, sanctionedAmount: "₹36,00,000", repaymentAmount: "₹29,00,000", closedLoans: 480, closedLoanAmount: "₹29,00,000", closedRepaymentAmount: "₹29,00,000", collection: "98 %" },
    { srNo: 10, month: "Oct 2025", caseCount: 640, sanctionedAmount: "₹37,50,000", repaymentAmount: "₹30,00,000", closedLoans: 500, closedLoanAmount: "₹30,00,000", closedRepaymentAmount: "₹30,00,000", collection: "99 %" },
  ];

  if (!isOpen) {
    return (
      <div 
        className="bg-white border border-[#F5F5F5] cursor-pointer"
        style={{ width: '1396px', borderRadius: '20px' }}
        onClick={() => setIsOpen(true)}
      >
        <div 
          className="bg-[#F5F5F5] px-4 flex items-center justify-between"
          style={{ 
            height: '48px',
            paddingTop: '8px',
            paddingBottom: '8px',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px'
          }}
        >
          <h2 className="text-base font-semibold text-gray-900">Performance Summary</h2>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 7.5L10 12.5L15 7.5" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-white border border-[#F5F5F5]"
      style={{ width: '1396px', height: '650px', borderRadius: '20px', gap: '10px' }}
    >
      {/* Header */}
      <div 
        className="bg-[#F5F5F5] px-4 flex items-center justify-between"
        style={{ 
          height: '48px',
          paddingTop: '8px',
          paddingBottom: '8px',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px'
        }}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-gray-900">Performance Summary</h2>
          <span className="text-xs text-gray-500">({dateFilter})</span>
          <button onClick={() => setIsOpen(false)}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 12.5L10 7.5L5 12.5" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        
        {/* Date Filter */}
        <select 
          value={dateFilter}
          onChange={(e) => {
            console.log('Filter changing from', dateFilter, 'to', e.target.value);
            setDateFilter(e.target.value);
          }}
          className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          style={{ zIndex: 10, position: 'relative' }}
        >
          <option value="Today">Today</option>
          <option value="Yesterday">Yesterday</option>
          <option value="Last 7 Days">Last 7 Days</option>
          <option value="Last 30 Days">Last 30 Days</option>
          <option value="Last Year">Last Year</option>
        </select>
      </div>
      
      {/* Content */}
      <div style={{ width: '1396px', height: '602px', padding: '20px 15px', gap: '28px' }}>
        {/* Table */}
        <div style={{ width: '1366px', height: '513px', overflowY: 'auto' }}>
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr style={{ height: '47px', fontFamily: 'Inter', fontSize: '12px', fontWeight: 500, lineHeight: '18px' }}>
                <th className="text-left px-4 py-3 text-gray-700">Sr Number</th>
                <th className="text-left px-4 py-3 text-gray-700">Month</th>
                <th className="text-left px-4 py-3 text-gray-700">Case Count</th>
                <th className="text-left px-4 py-3 text-gray-700">Sanctioned Amount</th>
                <th className="text-left px-4 py-3 text-gray-700">Repayment Amount</th>
                <th className="text-left px-4 py-3 text-gray-700">Closed Loans (N)</th>
                <th className="text-left px-4 py-3 text-gray-700">Closed Loan Amount (IPC)</th>
                <th className="text-left px-4 py-3 text-gray-700">Closed Repayment Amount</th>
                <th className="text-left px-4 py-3 text-gray-700">Collection %</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.srNo} className="border-b border-gray-100" style={{ height: '43px', fontFamily: 'Inter', fontSize: '12px', fontWeight: 500, lineHeight: '18px' }}>
                  <td className="px-4 py-2 text-gray-900">{row.srNo}</td>
                  <td className="px-4 py-2 text-gray-900">{row.month}</td>
                  <td className="px-4 py-2 text-gray-900">{row.caseCount}</td>
                  <td className="px-4 py-2 text-gray-900">{row.sanctionedAmount}</td>
                  <td className="px-4 py-2 text-gray-900">{row.repaymentAmount}</td>
                  <td className="px-4 py-2 text-gray-900">{row.closedLoans}</td>
                  <td className="px-4 py-2 text-gray-900">{row.closedLoanAmount}</td>
                  <td className="px-4 py-2 text-gray-900">{row.closedRepaymentAmount}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      parseInt(row.collection) > 80 ? 'bg-green-100 text-green-700' :
                      parseInt(row.collection) === 80 ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {row.collection}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-600">{(currentPage - 1) * 50 + 1}-{Math.min(currentPage * 50, 2619)} of 2,619</span>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12.5 15L7.5 10L12.5 5" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button 
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7.5 5L12.5 10L7.5 15" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
