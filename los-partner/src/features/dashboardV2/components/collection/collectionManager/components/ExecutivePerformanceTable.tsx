// 🔴 API INTEGRATION: Uncomment imports when backend is ready
// import { useState, useEffect } from "react";
import { useState } from "react";
// import { getExecutivePerformance } from "../services/dashboardApi";

// 🔴 API INTEGRATION: Type definition (currently inline, move to ../types/dashboard.types.ts)
interface ExecutivePerformanceData {
  srNo: number;
  employee: string;
  casesHolding: number;
  closed: number;
  underFollowup: number;
  postDueCases: number;
  totalCollectionAmount: string;
  amountCollected: string;
  pendingAmount: string;
  collection: string;
  empScore: number;
}

export const ExecutivePerformanceTable = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState("Today");

  // 🔴 API INTEGRATION: Uncomment state management when backend is ready
  // const [data, setData] = useState<ExecutivePerformanceData[]>([]);
  // const [loading, setLoading] = useState(true);
  // const [totalRecords, setTotalRecords] = useState(0);

  // 🔴 API INTEGRATION: Uncomment useEffect to fetch data from API
  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       setLoading(true);
  //       const response = await getExecutivePerformance({ page: currentPage, filter: dateFilter });
  //       setData(response.data);
  //       setTotalRecords(response.total);
  //     } catch (err) {
  //       console.error('Error fetching data:', err);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   fetchData();
  // }, [currentPage, dateFilter]);

  // 🔴 API INTEGRATION: REMOVE this hardcoded data when API is ready
  // API Endpoint: GET /api/executive-performance?page={page}&filter={filter}
  // Expected Response: { data: [...], total: number }
  const totalPages = Math.ceil(2619 / 50);
  const tableData: ExecutivePerformanceData[] = [
    { srNo: 1, employee: "Akshaya S", casesHolding: 120, closed: 70, underFollowup: 20, postDueCases: 30, totalCollectionAmount: "BHD 10,00,000", amountCollected: "BHD 8,00,000", pendingAmount: "BHD 2,00,000", collection: "97 %", empScore: 8.5 },
    { srNo: 2, employee: "Akshaya S", casesHolding: 120, closed: 70, underFollowup: 20, postDueCases: 30, totalCollectionAmount: "BHD 10,00,000", amountCollected: "BHD 8,00,000", pendingAmount: "BHD 2,00,000", collection: "97 %", empScore: 8.5 },
    { srNo: 3, employee: "Akshaya S", casesHolding: 120, closed: 70, underFollowup: 20, postDueCases: 30, totalCollectionAmount: "BHD 10,00,000", amountCollected: "BHD 8,00,000", pendingAmount: "BHD 2,00,000", collection: "97 %", empScore: 8.5 },
    { srNo: 4, employee: "Akshaya S", casesHolding: 120, closed: 70, underFollowup: 20, postDueCases: 30, totalCollectionAmount: "BHD 10,00,000", amountCollected: "BHD 8,00,000", pendingAmount: "BHD 2,00,000", collection: "97 %", empScore: 8.5 },
    { srNo: 5, employee: "Akshaya S", casesHolding: 120, closed: 70, underFollowup: 20, postDueCases: 30, totalCollectionAmount: "BHD 10,00,000", amountCollected: "BHD 8,00,000", pendingAmount: "BHD 2,00,000", collection: "97 %", empScore: 8.5 },
    { srNo: 6, employee: "Akshaya S", casesHolding: 120, closed: 70, underFollowup: 20, postDueCases: 30, totalCollectionAmount: "BHD 10,00,000", amountCollected: "BHD 8,00,000", pendingAmount: "BHD 2,00,000", collection: "97 %", empScore: 8.5 },
    { srNo: 7, employee: "Akshaya S", casesHolding: 120, closed: 70, underFollowup: 20, postDueCases: 30, totalCollectionAmount: "BHD 10,00,000", amountCollected: "BHD 8,00,000", pendingAmount: "BHD 2,00,000", collection: "97 %", empScore: 8.5 },
    { srNo: 8, employee: "Akshaya S", casesHolding: 120, closed: 70, underFollowup: 20, postDueCases: 30, totalCollectionAmount: "BHD 10,00,000", amountCollected: "BHD 8,00,000", pendingAmount: "BHD 2,00,000", collection: "97 %", empScore: 8.5 },
    { srNo: 9, employee: "Akshaya S", casesHolding: 120, closed: 70, underFollowup: 20, postDueCases: 30, totalCollectionAmount: "BHD 10,00,000", amountCollected: "BHD 8,00,000", pendingAmount: "BHD 2,00,000", collection: "97 %", empScore: 8.5 },
    { srNo: 10, employee: "Akshaya S", casesHolding: 120, closed: 70, underFollowup: 20, postDueCases: 30, totalCollectionAmount: "BHD 10,00,000", amountCollected: "BHD 8,00,000", pendingAmount: "BHD 2,00,000", collection: "97 %", empScore: 8.5 },
  ];
  // 🔴 API INTEGRATION: Replace above with: const tableData = data;

  if (!isOpen) {
    return (
      <div 
        className="bg-white border border-[#F5F5F5] cursor-pointer w-full max-w-[1396px]"
        style={{ borderRadius: '20px', marginTop: '24px' }}
        onClick={() => setIsOpen(true)}
      >
        <div 
          className="bg-[#F5F5F5] px-4 flex items-center justify-between cursor-pointer"
          style={{ 
            height: '48px',
            paddingTop: '8px',
            paddingBottom: '8px',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px'
          }}
          onClick={() => setIsOpen(true)}
        >
          <h2 className="text-base font-semibold text-gray-900">Executives Performance Table</h2>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 7.5L10 12.5L15 7.5" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-white border border-[#F5F5F5] w-full max-w-[1396px]"
      style={{ borderRadius: '20px', marginTop: '24px' }}
    >
      {/* Header */}
      <div 
        className="bg-[#F5F5F5] px-4 flex items-center justify-between cursor-pointer"
        style={{ 
          height: '48px',
          paddingTop: '8px',
          paddingBottom: '8px',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px'
        }}
        onClick={() => setIsOpen(false)}
      >
        <h2 className="text-base font-semibold text-gray-900">Executives Performance Table</h2>
        <div className="flex items-center gap-3">
          <select 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none"
          >
            <option>Today</option>
            <option>Yesterday</option>
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>Last Month</option>
            <option>Last Year</option>
          </select>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M15 12.5L10 7.5L5 12.5" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      
      {/* Table */}
      <div className="w-full h-[550px] overflow-x-auto overflow-y-auto p-4">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0">
            <tr style={{ height: '47px', fontFamily: 'Inter', fontSize: '12px', fontWeight: 500, lineHeight: '18px' }}>
              <th className="text-left px-4 py-3 text-gray-700">Sr No</th>
              <th className="text-left px-4 py-3 text-gray-700">Employee</th>
              <th className="text-left px-4 py-3 text-gray-700">Cases Holding</th>
              <th className="text-left px-4 py-3 text-gray-700">Closed</th>
              <th className="text-left px-4 py-3 text-gray-700">Under Followup</th>
              <th className="text-left px-4 py-3 text-gray-700">Post Due Cases</th>
              <th className="text-left px-4 py-3 text-gray-700">Total Collection Amount</th>
              <th className="text-left px-4 py-3 text-gray-700">Amount Collected</th>
              <th className="text-left px-4 py-3 text-gray-700">Pending Amount</th>
              <th className="text-left px-4 py-3 text-gray-700">Collection %</th>
              <th className="text-left px-4 py-3 text-gray-700">Emp Score</th>
              <th className="text-left px-4 py-3 text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row) => (
              <tr key={row.srNo} className="border-b border-gray-100" style={{ height: '43px', fontFamily: 'Inter', fontSize: '12px', fontWeight: 500, lineHeight: '18px' }}>
                <td className="px-4 py-2 text-gray-900">{row.srNo}</td>
                <td className="px-4 py-2 text-gray-900">{row.employee}</td>
                <td className="px-4 py-2 text-gray-900">{row.casesHolding}</td>
                <td className="px-4 py-2 text-gray-900">{row.closed}</td>
                <td className="px-4 py-2 text-gray-900">{row.underFollowup}</td>
                <td className="px-4 py-2 text-gray-900">{row.postDueCases}</td>
                <td className="px-4 py-2 text-gray-900">{row.totalCollectionAmount}</td>
                <td className="px-4 py-2 text-gray-900">{row.amountCollected}</td>
                <td className="px-4 py-2 text-gray-900">{row.pendingAmount}</td>
                <td className="px-4 py-2">
                  <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700">
                    {row.collection}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-900">{row.empScore}</td>
                <td className="px-4 py-2">
                  <button className="text-gray-400 hover:text-gray-600">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="4" r="1" fill="currentColor"/>
                      <circle cx="8" cy="8" r="1" fill="currentColor"/>
                      <circle cx="8" cy="12" r="1" fill="currentColor"/>
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
        <span className="text-sm text-gray-600">1-50 of 2,619</span>
        <div className="flex gap-2">
          <button 
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <button 
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="p-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M7.5 5L12.5 10L7.5 15" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
