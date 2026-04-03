import React, { useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiFilter, FiMoreVertical, FiChevronDown } from 'react-icons/fi';
import { MdOutlineSort } from 'react-icons/md';
import { Conversion } from "../../../../../../utils/conversion";

export interface ApprovedLoanData {
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
  data: ApprovedLoanData[];
}

const ApprovedLoanTable: React.FC<ApprovedLoanTableProps> = ({ data }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  // Pagination logic
  const totalPages = Math.ceil(data.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Ongoing':
        return 'bg-blue-50 text-blue-600 border border-blue-200';
      case 'Closed':
        return 'bg-green-50 text-green-600 border border-green-200';
      case 'Overdue':
        return 'bg-red-50 text-red-600 border border-red-200';
      default:
        return 'bg-gray-50 text-gray-600 border border-gray-200';
    }
  };

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  return (
    <section className="w-full bg-white rounded-xl overflow-hidden border border-gray-200 mt-6 font-sans antialiased shadow-sm">
      {/* Header with Dropdown Icon */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer bg-[#F8F9FA] px-5 py-4 flex items-center justify-between border-b border-gray-100"
      >
        <h2 className="text-[14px] font-semibold text-gray-800 tracking-tight">
          Approved Loan Table
        </h2>

        <FiChevronDown
          size={20}
          className={`transition-transform duration-300 text-gray-600 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="w-full">
          {/* Sort/Filter Bar */}
          <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-gray-100 bg-white">
            <div></div> {/* Empty div for spacing */}
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[11px] font-medium text-gray-600 hover:bg-gray-50 transition-all">
                Sort <MdOutlineSort size={16} className="text-black" />
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[11px] font-medium text-gray-600 hover:bg-gray-50 transition-all">
                Filter <FiFilter size={14} className="text-black" />
              </button>
              <div className="relative">
                <select className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-[11px] font-medium text-gray-600 outline-none pr-9 cursor-pointer shadow-sm">
                  <option>Date Filter</option>
                </select>
                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-black pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="w-full relative">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1300px]">
                <thead>
                  <tr className="bg-[#F9FAFB] text-[10px] font-semibold text-gray-500 uppercase tracking-widest border-b border-gray-100">
                    <th className="px-4 py-4 text-center w-16 border-r border-gray-100">Sr No</th>
                    <th className="px-4 py-4 border-r border-gray-100">Loan ID</th>
                    <th className="px-4 py-4 border-r border-gray-100">Name</th>
                    <th className="px-4 py-4 border-r border-gray-100 text-center">Loan Type</th>
                    <th className="px-4 py-4 border-r border-gray-100">Loan Amount</th>
                    <th className="px-4 py-4 border-r border-gray-100">Amount Disbursed</th>
                    <th className="px-4 py-4 border-r border-gray-100 text-center">Pending Disbursal</th>
                    <th className="px-4 py-4 border-r border-gray-100">Total Repayment</th>
                    <th className="px-4 py-4 border-r border-gray-100">Amount Collected</th>
                    <th className="px-4 py-4 border-r border-gray-100 text-center">Outstanding</th>
                    <th className="px-4 py-4 border-r border-gray-100 text-center">Loan Status</th>
                    <th className="px-4 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {currentData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 py-4 text-center text-gray-400 font-normal border-r border-gray-50">{row.srNo}</td>
                      <td className="px-4 py-4 text-gray-600 font-medium border-r border-gray-50">{row.loanId}</td>
                      <td className="px-4 py-4 text-gray-800 font-semibold border-r border-gray-50">{row.name}</td>
                      <td className="px-4 py-4 text-center border-r border-gray-50">
                        <span className="text-[11px] text-gray-600 px-3 py-1 rounded">
                          {row.loanType}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-800 border-r border-gray-50">{Conversion.formatCurrency(row.loanAmount)}</td>
                      <td className="px-4 py-4 text-gray-800 border-r border-gray-50">{Conversion.formatCurrency(row.amountDisbursed)}</td>
                      <td className="px-4 py-4 text-center text-gray-800 border-r border-gray-50">{Conversion.formatCurrency(row.pendingDisbursal)}</td>
                      <td className="px-4 py-4 text-gray-800 border-r border-gray-50">{Conversion.formatCurrency(row.totalRepayment)}</td>
                      <td className="px-4 py-4 text-gray-800 border-r border-gray-50">{Conversion.formatCurrency(row.amountCollected)}</td>
                      <td className="px-4 py-4 text-center text-gray-800 border-r border-gray-50">{Conversion.formatCurrency(row.outstanding)}</td>
                      <td className="px-4 py-4 text-center border-r border-gray-50">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${getStatusStyle(row.loanStatus)}`}>
                          {row.loanStatus}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button className="text-gray-300 hover:text-gray-500">
                          <FiMoreVertical size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="bg-white px-6 py-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 font-semibold">
              <div className="flex items-center gap-4">
                <span>Showing {startIndex + 1}–{Math.min(endIndex, data.length)} of {data.length}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className={`p-1.5 rounded border border-gray-100 transition-all active:scale-90 ${
                      currentPage === 1 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <FiChevronLeft size={18} />
                  </button>
                  <button 
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className={`p-1.5 rounded border border-gray-100 transition-all active:scale-90 ${
                      currentPage === totalPages 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <FiChevronRight size={18} />
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