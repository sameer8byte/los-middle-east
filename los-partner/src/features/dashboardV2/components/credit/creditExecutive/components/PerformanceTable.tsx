import React, { useState } from 'react';
import { FiEye, FiChevronLeft, FiChevronRight, FiFilter, FiMoreVertical, FiEdit, FiDownload, FiChevronDown } from 'react-icons/fi';
import { LuArrowUpDown } from "react-icons/lu";

export interface TableRowData {
  srNo: number;
  month: string;
  employee: string;
  totalCaseCount: number;
  totalLoanAmount: string;
  closedLoans: number;
  collectedLoanAmount: string;
  closedLoanAmountIpc: string;
  collectionPercentage: number;
}

interface PerformanceTableProps {
  data: TableRowData[];
  onActionClick?: (actionType: string, row: TableRowData) => void;
}

const PerformanceTable: React.FC<PerformanceTableProps> = ({ data, onActionClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const rowsPerPage = 5;

  // Pagination logic
  const totalPages = Math.ceil(data.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const getCollectionStyle = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-50 border-green-200 text-green-600';
    if (percentage >= 50) return 'bg-yellow-50 border-yellow-200 text-yellow-600';
    return 'bg-red-50 border-red-200 text-red-600';
  };

  return (
    <section className="w-full bg-white rounded-md overflow-hidden shadow-sm border border-gray-200 mt-6">
      {/* Simple Header with Dropdown */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer bg-[#F8F9FA] px-4 py-3 flex items-center justify-between border-b border-gray-100"
      >
        <h2 className="text-sm font-bold text-gray-800 tracking-tight">
          Performance Summary
        </h2>

        <FiChevronDown
          size={20}
          className={`transition-transform duration-300 text-gray-600 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* Dropdown Content - Shows when isOpen is true */}
      {isOpen && (
        <div className="w-full">
          {/* Filter Options Bar */}
          <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center justify-end gap-2">
            <button className="flex items-center gap-1.5 bg-white border border-gray-300 rounded px-3 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              <LuArrowUpDown size={14} /> Sort
            </button>
            <button className="flex items-center gap-1.5 bg-white border border-gray-300 rounded px-3 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              <FiFilter size={14} /> Filter
            </button>
            <div className="relative">
              <select className="appearance-none bg-white border border-gray-300 rounded px-3 py-1.5 text-[11px] font-medium text-gray-600 outline-none pr-8 cursor-pointer">
                <option>Date Filter</option>
                <option>Last Month</option>
                <option>Last Quarter</option>
                <option>Last Year</option>
                <option>Custom Range</option>
              </select>
              <FiChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[10px]" />
            </div>
          </div>

          {/* Table Container */}
          <div className="w-full relative">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-auto">
                <thead>
                  <tr className="bg-[#F8F9FA] text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <th className="px-3 py-3 text-center">Sr No</th>
                    <th className="px-3 py-3">Month</th>
                    <th className="px-3 py-3">Employee</th>
                    <th className="px-3 py-3 text-center">Total Case Count</th>
                    <th className="px-3 py-3">Total Loan Amount</th>
                    <th className="px-3 py-3 text-center">Closed Loans (N)</th>
                    <th className="px-3 py-3">Collected Amount</th>
                    <th className="px-3 py-3">Closed Amount (IPC)</th>
                    <th className="px-3 py-3 text-center">Collection %</th>
                    <th className="px-3 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-[11px]">
                  {currentData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-3 text-center text-gray-600 font-medium">{row.srNo}</td>
                      <td className="px-3 py-3 text-gray-700 font-semibold">{row.month}</td>
                      <td className="px-3 py-3 text-gray-700 font-medium">{row.employee}</td>
                      <td className="px-3 py-3 text-center font-bold text-gray-800">{row.totalCaseCount}</td>
                      <td className="px-3 py-3 font-bold text-gray-800">₹{row.totalLoanAmount}</td>
                      <td className="px-3 py-3 text-center font-bold text-gray-800">{row.closedLoans}</td>
                      <td className="px-3 py-3 font-bold text-gray-800">₹{row.collectedLoanAmount}</td>
                      <td className="px-3 py-3 font-bold text-gray-800">₹{row.closedLoanAmountIpc}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block px-3 py-0.5 rounded-md border font-bold text-[9px] ${getCollectionStyle(row.collectionPercentage)}`}>
                          {row.collectionPercentage}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center relative">
                        <button 
                          onClick={() => setActiveMenu(activeMenu === idx ? null : idx)}
                          className="p-1 hover:bg-gray-200 rounded-full text-gray-400"
                        >
                          <FiMoreVertical />
                        </button>
                        
                        {/* Action Dropdown */}
                        {activeMenu === idx && (
                          <div className="absolute right-8 top-0 mt-2 w-40 bg-white border border-gray-100 rounded-md shadow-lg z-50 py-1">
                            <button 
                              onClick={() => { onActionClick?.('view', row); setActiveMenu(null); }}
                              className="w-full text-left px-4 py-2 text-[10px] text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <FiEye size={12} /> View Details
                            </button>
                            <button 
                              onClick={() => { onActionClick?.('export', row); setActiveMenu(null); }}
                              className="w-full text-left px-4 py-2 text-[10px] text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <FiDownload size={12} /> Export Data
                            </button>
                            <button 
                              onClick={() => { onActionClick?.('edit', row); setActiveMenu(null); }}
                              className="w-full text-left px-4 py-2 text-[10px] text-gray-600 hover:bg-gray-50 flex items-center gap-2 border-t border-gray-50"
                            >
                              <FiEdit size={12} /> Edit Record
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="bg-white px-4 py-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-medium">
              <div className="flex items-center gap-3">
                <span>Showing {startIndex + 1}–{Math.min(endIndex, data.length)} of {data.length} records</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-400">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className={`p-1.5 rounded border border-gray-50 transition-all active:scale-90 ${
                      currentPage === 1 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <FiChevronLeft size={16} />
                  </button>
                  <button 
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className={`p-1.5 rounded border border-gray-50 transition-all active:scale-90 ${
                      currentPage === totalPages 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <FiChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default PerformanceTable;