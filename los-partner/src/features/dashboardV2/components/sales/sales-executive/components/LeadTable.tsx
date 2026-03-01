import { useState, useEffect, useMemo, useRef } from "react";
import { FiChevronDown, FiCalendar } from "react-icons/fi";

interface Lead {
  id: string;
  dateOfAssign: string;
  leadId: string;
  customerName: string;
  phNo: string;
  email: string;
  leadType: string;
  loanAmount: number;
  nextFollowup: string;
  latestRemark: string;
  lastUpdated: string;
  status: "Followups" | "Sanctioned" | "Rejected" | "Disbursed" | "Pending Disbursal";
}

interface LeadTableProps {
  data?: Lead[];
  loading?: boolean;
  error?: string | null;
  onToggle?: (isOpen: boolean) => void;
}

const mockLeads: Lead[] = Array.from({ length: 10 }, (_, i) => ({
  id: `${i + 1}`,
  dateOfAssign: "Jan 20 2025",
  leadId: "L123",
  customerName: "Jinosh D",
  phNo: "9987462735",
  email: "jinosh@gmail.com",
  leadType: "Fresh",
  loanAmount: 8_00_000,
  nextFollowup: "Jan 22 2025",
  latestRemark: "User Need Time",
  lastUpdated: "Jan 21 2025",
  status: ["Followups", "Sanctioned", "Rejected", "Disbursed", "Pending Disbursal"][i % 5] as Lead["status"],
}));

const tabs = ["All", "Current Followup", "Disbursed", "Pending Disbursal", "Rejected"];

const getStatusBadge = (status?: Lead["status"]) => {
  if (!status) return <span className="px-2 py-1 rounded text-xs font-medium bg-gray-50 text-gray-600">-</span>;
  
  const styles = {
    Followups: "bg-blue-50 text-blue-600 border border-blue-200",
    Sanctioned: "bg-purple-50 text-purple-600 border border-purple-200",
    Rejected: "bg-red-50 text-red-600 border border-red-200",
    Disbursed: "bg-green-50 text-green-600 border border-green-200",
    "Pending Disbursal": "bg-yellow-50 text-yellow-600 border border-yellow-200",
  };
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] ?? 'bg-gray-50 text-gray-600'}`}>
      {status}
    </span>
  );
};

const LeadTable = ({ data, loading, error, onToggle }: LeadTableProps = {}) => {
  const leads = data ?? mockLeads;
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const dateFilterRef = useRef<HTMLDivElement>(null);
  const pageSize = 10;
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateFilterRef.current && !dateFilterRef.current.contains(event.target as Node)) {
        setShowDateFilter(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  // Filter leads based on active tab
  const filteredLeads = useMemo(() => {
    if (activeTab === "All") return leads;
    return leads.filter(lead => {
      if (activeTab === "Current Followup") return lead.status === "Followups";
      if (activeTab === "Disbursed") return lead.status === "Disbursed";
      if (activeTab === "Pending Disbursal") return lead.status === "Pending Disbursal";
      if (activeTab === "Rejected") return lead.status === "Rejected";
      return true;
    });
  }, [activeTab, leads]);
  
  const totalCount = filteredLeads.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  
  // Paginate filtered leads
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, currentPage, pageSize]);
  
  // Reset to page 1 when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Trigger API call when table is opened
  useEffect(() => {
    if (isOpen && onToggle) {
      onToggle(true);
    }
  }, [isOpen]);

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      {/* Header */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between p-4 border-b border-gray-200 cursor-pointer transition-colors ${
          isOpen ? 'bg-gray-50 hover:bg-gray-100' : 'bg-blue-50 hover:bg-blue-100'
        }`}
      >
        <h2 className={`font-semibold text-gray-900 ${isOpen ? 'text-lg' : 'text-base'}`}>Lead Table</h2>
        <div className="flex items-center gap-2">
          {isOpen && (
            <div className="relative" ref={dateFilterRef}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDateFilter(!showDateFilter);
                }}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50"
              >
                <FiCalendar className="w-4 h-4" />
                Date Filter
                <FiChevronDown className="w-4 h-4" />
              </button>
              
              {showDateFilter && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => {
                          setStartDate("");
                          setEndDate("");
                        }}
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => setShowDateFilter(false)}
                        className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <FiChevronDown className={`w-5 h-5 transition-transform text-gray-600 ${isOpen ? 'rotate-180' : ''}`} />

        </div>
      </div>

      {isOpen && (
        <>
      {/* Tabs */}
      <div className="flex gap-2 px-4 pt-4 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
              activeTab === tab
                ? "bg-blue-100 text-blue-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Sr No</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date Of Assign</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Lead Id</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Customer Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Ph.No</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Lead Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Loan Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Next Followup</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Latest Remark</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Last Updated</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={12} className="px-4 py-8">
                  <div className="animate-pulse space-y-2">
                    {[1,2,3].map(i => <div key={i} className="h-8 bg-gray-200 rounded" />)}
                  </div>
                </td>
              </tr>
            ) : paginatedLeads.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-gray-500">
                  No leads found
                </td>
              </tr>
            ) : (
              paginatedLeads.map((lead, index) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{(currentPage - 1) * pageSize + index + 1}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{lead.dateOfAssign || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{lead.leadId || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{lead.customerName || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{lead.phNo || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{lead.email || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{lead.leadType || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{lead.loanAmount?.toLocaleString() || 0}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{lead.nextFollowup || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{lead.latestRemark || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{lead.lastUpdated || "-"}</td>
                  <td className="px-4 py-3 text-sm">{getStatusBadge(lead.status)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          {currentPage * pageSize - pageSize + 1} - {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            &lt;
          </button>
          <button
            onClick={() => setCurrentPage((p) => p + 1)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            &gt;
          </button>
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default LeadTable;
