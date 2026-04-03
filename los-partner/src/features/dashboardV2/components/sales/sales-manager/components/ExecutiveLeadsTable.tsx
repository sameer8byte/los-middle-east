import { useState, useMemo, useEffect } from "react";
import { FiChevronDown } from "react-icons/fi";
import { HiOutlineDotsVertical } from "react-icons/hi";

interface ExecutiveLead {
  id: string;
  executive: string;
  leadsAlloted: number;
  currentFollowups: number;
  disbursed: number;
  rejected: number;
  amountSanctioned: number;
  disbursedAmount: number;
  pendingDisbursal: number;
  avgLoanAmount: number;
  performanceScore: number;
  collectionPercentage: number;
}

const mockData: ExecutiveLead[] = Array.from({ length: 10 }, (_, i) => ({
  id: `${i + 1}`,
  executive: ["Kiran M", "Aisha R", "Raj A", "Sofia T", "Liam S", "Emma J", "Noah K", "Olivia B", "James D", "Sophia W"][i],
  leadsAlloted: [720, 680, 640, 600, 560, 620, 580, 500, 540, 600][i],
  currentFollowups: [520, 500, 480, 450, 420, 460, 440, 400, 420, 450][i],
  disbursed: [120, 180, 160, 150, 140, 160, 140, 100, 120, 150][i],
  rejected: [40, 50, 30, 20, 25, 35, 45, 15, 22, 35][i],
  amountSanctioned: [12_00_000, 10_50_000, 9_00_000, 8_00_000, 7_00_000, 8_50_000, 6_50_000, 5_00_000, 5_50_000, 6_00_000][i],
  disbursedAmount: [8_00_000, 7_00_000, 6_50_000, 5_50_000, 4_50_000, 5_00_000, 4_00_000, 3_50_000, 3_00_000, 4_00_000][i],
  pendingDisbursal: [4_00_000, 3_50_000, 2_50_000, 2_50_000, 2_50_000, 3_50_000, 2_50_000, 1_50_000, 2_50_000, 2_00_000][i],
  avgLoanAmount: [3_50_000, 3_00_000, 2_50_000, 2_20_000, 1_80_000, 2_70_000, 1_50_000, 1_00_000, 2_20_000, 1_90_000][i],
  performanceScore: [8.5, 8.0, 7.8, 7.5, 7.2, 7.6, 7.0, 6.5, 6.8, 7.3][i],
  collectionPercentage: [86, 83, 80, 78, 75, 79, 76, 72, 74, 77][i],
}));

interface ExecutiveLeadsTableProps {
  data?: ExecutiveLead[];
  loading?: boolean;
  error?: string | null;
  onToggle?: (isOpen: boolean) => void;
}

const ExecutiveLeadsTable = ({ data, loading, error, onToggle }: ExecutiveLeadsTableProps = {}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const leads = data ?? mockData;

  const totalCount = leads.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return leads.slice(start, start + pageSize);
  }, [currentPage, pageSize, leads]);

  // Trigger API call when table is opened
  useEffect(() => {
    if (isOpen && onToggle) {
      onToggle(true);
    }
  }, [isOpen]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 mb-4">
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
        <h2 className={`font-semibold text-gray-900 ${isOpen ? 'text-base' : 'text-base'}`}>Executive's Leads Summary</h2>
        <div className="flex items-center gap-2">
          {isOpen && (
            <>
              <button 
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50"
              >
                Sort
                <FiChevronDown className="w-4 h-4" />
              </button>
              <button 
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50"
              >
                Filter
                <FiChevronDown className="w-4 h-4" />
              </button>
              <button 
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50"
              >
                Date Filter
                <FiChevronDown className="w-4 h-4" />
              </button>
            </>
          )}
          <FiChevronDown className={`w-5 h-5 transition-transform text-gray-600 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Sr No</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Executive</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Leads Alloted</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Current Followups</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Disbursed</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Rejected</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Amount Sanctioned</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Disbursed</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Pending Disbursal</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Avg Loan Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Performance Score</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Collection %</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={13} className="px-4 py-8">
                  <div className="animate-pulse space-y-2">
                    {[1,2,3].map(i => <div key={i} className="h-8 bg-gray-200 rounded" />)}
                  </div>
                </td>
              </tr>
            ) : paginatedData.map((row, index) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">{(currentPage - 1) * pageSize + index + 1}</td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {row.executive} <span className="text-purple-600 font-medium">• EXEC</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{row.leadsAlloted}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{row.currentFollowups}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{row.disbursed}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{row.rejected}</td>
                <td className="px-4 py-3 text-sm text-gray-900">BHD  {(row.amountSanctioned ?? 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-900">BHD  {(row.disbursedAmount ?? 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-900">BHD  {(row.pendingDisbursal ?? 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-900">BHD  {(row.avgLoanAmount ?? 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{row.performanceScore}</td>
                <td className="px-4 py-3 text-sm">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                    {row.collectionPercentage} %
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <HiOutlineDotsVertical className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
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

export default ExecutiveLeadsTable;
