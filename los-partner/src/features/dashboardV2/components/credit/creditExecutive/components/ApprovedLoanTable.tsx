import React, { useState } from 'react';
import { FiEye, FiChevronLeft, FiChevronRight, FiFilter, FiMoreVertical, FiEdit, FiTrash2, FiChevronDown } from 'react-icons/fi';
import { LuArrowUpDown } from "react-icons/lu";
import { Conversion } from "../../../../../../utils/conversion";

/* =========================
   Types
========================= */

export interface ApprovedLoanRow {
  srNo: number;
  loanId: string;
  name: string;
  loanType: 'New' | 'Repeat';
  loanAmount: string;
  amountDisbursed: string;
  pendingDisbursal: string;
  totalRepayment: string;
  amountCollected: string;
  outstanding: string;
  loanStatus: 'Ongoing' | 'Closed' | 'Overdue';
}

interface ApprovedLoanTableProps {
  data: ApprovedLoanRow[];
  onActionClick?: (actionType: string, row: ApprovedLoanRow) => void;
}

/* =========================
   Main Component
========================= */

const ApprovedLoanTable: React.FC<ApprovedLoanTableProps> = ({ data, onActionClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const rowsPerPage = 5;

  // Pagination logic
  const totalPages = Math.ceil(data.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Ongoing':
        return 'bg-blue-50 border-blue-200 text-blue-600';
      case 'Closed':
        return 'bg-green-50 border-green-200 text-green-600';
      case 'Overdue':
        return 'bg-red-50 border-red-200 text-red-600';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-600';
    }
  };

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  return (
    <section className="w-full bg-white rounded-md overflow-hidden shadow-sm border border-gray-200 mt-6">
      {/* Simple Header with Dropdown */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer bg-[#F8F9FA] px-4 py-3 flex items-center justify-between border-b border-gray-100"
      >
        <h2 className="text-sm font-bold text-gray-800 tracking-tight">
          Approved Loan Table
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
                <option>This Week</option>
                <option>This Month</option>
                <option>This Quarter</option>
                <option>This Year</option>
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
                    <th className="px-3 py-3">Loan ID</th>
                    <th className="px-3 py-3">Name</th>
                    <th className="px-3 py-3">Loan Type</th>
                    <th className="px-3 py-3">Loan Amount</th>
                    <th className="px-3 py-3">Amount Disbursed</th>
                    <th className="px-3 py-3">Pending Disbursal</th>
                    <th className="px-3 py-3">Total Repayment</th>
                    <th className="px-3 py-3">Amount Collected</th>
                    <th className="px-3 py-3">Outstanding</th>
                    <th className="px-3 py-3 text-center">Loan Status</th>
                    <th className="px-3 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-[11px]">
                  {currentData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-3 text-center text-gray-600 font-medium">{row.srNo}</td>
                      <td className="px-3 py-3 text-gray-700 font-bold">{row.loanId}</td>
                      <td className="px-3 py-3 text-gray-700 font-semibold">{row.name}</td>
                      <td className="px-3 py-3 text-gray-600">{row.loanType}</td>
                      <td className="px-3 py-3 font-bold text-gray-800">{Conversion.formatCurrency(row.loanAmount)}</td>
                      <td className="px-3 py-3 font-bold text-gray-800">{Conversion.formatCurrency(row.amountDisbursed)}</td>
                      <td className="px-3 py-3 font-bold text-gray-800">{Conversion.formatCurrency(row.pendingDisbursal)}</td>
                      <td className="px-3 py-3 font-bold text-gray-800">{Conversion.formatCurrency(row.totalRepayment)}</td>
                      <td className="px-3 py-3 font-bold text-gray-800">{Conversion.formatCurrency(row.amountCollected)}</td>
                      <td className="px-3 py-3 font-bold text-gray-800">{Conversion.formatCurrency(row.outstanding)}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block px-3 py-0.5 rounded-md border font-bold text-[9px] ${getStatusStyle(row.loanStatus)}`}>
                          {row.loanStatus}
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
                          <div className="absolute right-8 top-0 mt-2 w-32 bg-white border border-gray-100 rounded-md shadow-lg z-50 py-1">
                            <button 
                              onClick={() => { onActionClick?.('edit', row); setActiveMenu(null); }}
                              className="w-full text-left px-4 py-2 text-[10px] text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <FiEdit size={12} /> Edit Loan
                            </button>
                            <button 
                              onClick={() => { onActionClick?.('view', row); setActiveMenu(null); }}
                              className="w-full text-left px-4 py-2 text-[10px] text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <FiEye size={12} /> View Details
                            </button>
                            <button 
                              onClick={() => { onActionClick?.('delete', row); setActiveMenu(null); }}
                              className="w-full text-left px-4 py-2 text-[10px] text-red-500 hover:bg-red-50 flex items-center gap-2 border-t border-gray-50"
                            >
                              <FiTrash2 size={12} /> Delete
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

export default ApprovedLoanTable;