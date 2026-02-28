import React, { useState } from "react";
import { FiChevronDown, FiChevronLeft, FiChevronRight, FiFilter, FiMoreVertical } from "react-icons/fi";
import { MdOutlineSort } from "react-icons/md";

export interface CreditApplicationData {
  srNo: number;
  dateOfAssign: string;
  leadId: string;
  customerName: string;
  phNo: string;
  email: string;
  leadType: "Fresh" | "In Progress" | "Pending" | "Completed";
  loanAmount: string;
  assignedTo: string;
  lastUpdated: string;
  status: "Followups" | "Rejected" | "Approved";
}

interface PerformanceTableProps {
  data: CreditApplicationData[];
}

const CreditApplicationTable: React.FC<PerformanceTableProps> = ({
  data,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  const tabs = ['All', 'Under Assessment', 'In Queue', 'On Hold', 'Approved', 'Rejected'];

  // Pagination logic
  const totalPages = Math.ceil(data.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]";
      case "Rejected":
        return "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]";
      default:
        return "bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]";
    }
  };

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  return (
    <section className="w-full bg-white rounded-xl border border-gray-200 shadow-sm mt-6 overflow-hidden">
      
      {/* 🔹 Header with Dropdown Icon */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer bg-[#F8F9FA] px-5 py-4 flex items-center justify-between border-b border-gray-100"
      >
        <h2 className="text-[14px] font-semibold text-gray-800">
          Credit Application Table
        </h2>

        <FiChevronDown
          size={20}
          className={`transition-transform duration-300 text-gray-600 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* 🔹 Collapsible Content */}
      {isOpen && (
        <div className="w-full">
          {/* Pill Tab Switcher */}
          <div className="px-5 py-3 flex items-center gap-2 bg-white border-b border-gray-100">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-[12px] font-medium transition-all rounded-lg ${
                  activeTab === tab 
                  ? 'bg-[#EBF2FF] text-[#3B66F5]' 
                  : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Sort/Filter Bar */}
          <div className="px-5 py-3 flex items-center justify-end gap-3 bg-white border-b border-gray-100">
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
              <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-black pointer-events-none" size={14} />
            </div>
          </div>

          {/* Table Container */}
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              
              <thead>
                <tr className="bg-[#F9FAFB] text-[10px] font-semibold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                  <th className="px-5 py-4 text-center w-16 border-r border-gray-100">Sr No</th>
                  <th className="px-5 py-4 border-r border-gray-100">Date Of Assign</th>
                  <th className="px-5 py-4 border-r border-gray-100">Lead Id</th>
                  <th className="px-5 py-4 border-r border-gray-100">Customer Name</th>
                  <th className="px-5 py-4 border-r border-gray-100">Ph.No</th>
                  <th className="px-5 py-4 border-r border-gray-100">Email</th>
                  <th className="px-5 py-4 border-r border-gray-100">Lead Type</th>
                  <th className="px-5 py-4 border-r border-gray-100">Loan Amount</th>
                  <th className="px-5 py-4 border-r border-gray-100">Assigned To</th>
                  <th className="px-5 py-4 border-r border-gray-100">Last Updated</th>
                  <th className="px-5 py-4 text-center border-r border-gray-100">Status</th>
                  <th className="px-5 py-4 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-100">
                {currentData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-5 py-4 text-center text-gray-400 font-normal border-r border-gray-100">{row.srNo}</td>
                    <td className="px-5 py-4 text-gray-600 font-medium whitespace-nowrap border-r border-gray-100">{row.dateOfAssign}</td>
                    <td className="px-5 py-4 text-[#3B66F5] font-semibold border-r border-gray-100">{row.leadId}</td>
                    <td className="px-5 py-4 text-gray-800 font-semibold border-r border-gray-100">{row.customerName}</td>
                    <td className="px-5 py-4 text-gray-600 font-normal border-r border-gray-100">{row.phNo}</td>
                    <td className="px-5 py-4 text-gray-400 font-normal text-[11px] border-r border-gray-100">{row.email}</td>
                    <td className="px-5 py-4 text-gray-600 font-medium border-r border-gray-100">{row.leadType}</td>
                    <td className="px-5 py-4 text-gray-800 font-bold tracking-tight border-r border-gray-100">₹{row.loanAmount}</td>
                    <td className="px-5 py-4 border-r border-gray-100">
                      <div className="flex items-center gap-1.5 font-semibold text-gray-700 whitespace-nowrap">
                        {row.assignedTo}
                        <span className="text-[9px] text-purple-600 font-bold tracking-widest ml-1 uppercase">
                          ● EXEC
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-500 font-medium whitespace-nowrap border-r border-gray-100">
                      {row.lastUpdated}
                    </td>
                    <td className="px-5 py-4 text-center border-r border-gray-100">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider ${getStatusStyle(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
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
              <span className="text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
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
      )}
    </section>
  );
};

export default CreditApplicationTable;