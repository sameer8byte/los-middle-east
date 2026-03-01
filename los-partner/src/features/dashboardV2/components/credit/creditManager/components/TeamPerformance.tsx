import React, { useState } from 'react';
import {
  FiSearch,
  FiFilter,
  FiChevronDown,
  FiChevronUp,
  FiChevronLeft,
  FiChevronRight,
  FiPlus
} from 'react-icons/fi';
import { MdOutlineSort } from 'react-icons/md';
import { HiOutlineUserGroup } from 'react-icons/hi';
import { LuTicketSlash } from "react-icons/lu";

// Import your fixed modal component
import { AddRatingModal } from './AddRatingModal';

interface ExecutivePerformance {
  id: string;
  name: string;
  initials: string;
  rank: number;
  score: number;
  isExpanded: boolean;
  metrics: { label: string; value: number; color: string; starColor: string }[];
}

const TeamPerformance: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  
  // State to control the modal's visibility
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);

  const [executives, setExecutives] = useState<ExecutivePerformance[]>([
    {
      id: '1',
      name: 'Mahesh R',
      initials: 'MR',
      rank: 3,
      score: 8.25,
      isExpanded: true,
      metrics: [
        { label: 'Leads worked', value: 8, color: 'bg-green-100 text-green-700', starColor: 'text-green-600' },
        { label: 'Fresh conversion', value: 7.5, color: 'bg-yellow-100 text-yellow-700', starColor: 'text-yellow-600' },
        { label: 'Repeat conversion', value: 6, color: 'bg-yellow-100 text-yellow-700', starColor: 'text-yellow-600' },
        { label: 'Productivity', value: 5, color: 'bg-red-100 text-red-700', starColor: 'text-red-600' },
      ]
    },
    { id: '2', name: 'Kiran T', initials: 'KR', rank: 6, score: 7.60, isExpanded: false, metrics: [] },
    { id: '3', name: 'Jasmine L', initials: 'JL', rank: 7, score: 7.45, isExpanded: false, metrics: [] },
    { id: '4', name: 'Tariq M', initials: 'TM', rank: 8, score: 7.30, isExpanded: false, metrics: [] },
    { id: '5', name: 'Anita S', initials: 'AS', rank: 9, score: 7.10, isExpanded: false, metrics: [] },
    { id: '6', name: 'Rajesh K', initials: 'RK', rank: 10, score: 6.90, isExpanded: false, metrics: [] },
    { id: '7', name: 'Rajesh K', initials: 'RK', rank: 10, score: 6.90, isExpanded: false, metrics: [] },
    { id: '8', name: 'Anita S', initials: 'AS', rank: 9, score: 7.10, isExpanded: false, metrics: [] },
    { id: '9', name: 'Rajesh K', initials: 'RK', rank: 10, score: 6.90, isExpanded: false, metrics: [] },
    { id: '10', name: 'Rajesh K', initials: 'RK', rank: 10, score: 6.90, isExpanded: false, metrics: [] },
    { id: '11', name: 'Rajesh K', initials: 'RK', rank: 10, score: 6.90, isExpanded: false, metrics: [] },
    { id: '12', name: 'Anita S', initials: 'AS', rank: 9, score: 7.10, isExpanded: false, metrics: [] },
    { id: '13', name: 'Rajesh K', initials: 'RK', rank: 10, score: 6.90, isExpanded: false, metrics: [] },
  ]);

  const toggleExpand = (id: string) => {
    setExecutives(execs =>
      execs.map(e =>
        e.id === id ? { ...e, isExpanded: !e.isExpanded } : { ...e, isExpanded: false }
      )
    );
  };

  return (
    <aside className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col relative h-[1100px] lg:h-[1250px] xl:h-[1200px]">
      {/* Header - Fixed at top */}
      <div className="p-4 flex items-center justify-between shrink-0 bg-white border-b border-gray-100 rounded-t-2xl">
        <div className="flex items-center gap-2 cursor-pointer group">
          <div className="w-8 h-8 bg-orange-100 rounded-md flex items-center justify-center">
            <HiOutlineUserGroup className="text-orange-500" size={18} />
          </div>
          <h2 className="font-semibold text-gray-700 text-[15px]">
            Team Performance
          </h2>
          <FiChevronDown className="text-gray-400 group-hover:text-gray-600 transition-colors" />
        </div>

        {/* Button that opens the Modal */}
        <button 
          onClick={() => setIsRatingModalOpen(true)}
          className="flex items-center gap-1.5 border border-gray-200 rounded-md px-3 py-2 text-[12px] font-semibold text-gray-700 hover:bg-gray-50 transition-all active:scale-95"
        >
          Add Rating <FiPlus size={16} className="text-gray-500" />
        </button>
      </div>

      {/* Reporting Manager - Fixed below header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          Reporting Manager
        </span>

        <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-md border border-gray-200">
          <div className="w-6 h-6 bg-pink-100 rounded-md text-pink-600 flex items-center justify-center text-[10px] font-semibold">
            RK
          </div>
          <p className="text-[12px] font-semibold text-gray-800">
            Rajesh K
            <span className="font-medium text-gray-400 ml-2 border-l pl-2 border-gray-200">
              Sales Head
            </span>
          </p>
        </div>
      </div>

      {/* Search & Filters - Fixed below reporting manager */}
      <div className="p-4 flex items-center gap-2 shrink-0 bg-white border-b border-gray-100">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by Executive Name"
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-md text-[13px] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <button className="p-2 border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600 transition-colors">
          <FiFilter size={18} />
        </button>

        <button className="p-2 border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600 transition-colors">
          <MdOutlineSort size={18} />
        </button>
      </div>

      {/* Executive List (Scrollable Area) */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 custom-scrollbar">
        {executives.map((exec) => (
          <div
            key={exec.id}
            className={`border rounded-xl transition-all duration-300 bg-white ${
              exec.isExpanded ? 'border-blue-100 shadow-sm' : 'border-gray-100 hover:border-gray-200'
            }`}
          >
            {/* Summary Row */}
            <div
              className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 rounded-xl"
              onClick={() => toggleExpand(exec.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-pink-100 rounded-md flex items-center justify-center text-xs font-semibold text-pink-600">
                  {exec.initials}
                </div>
                <span className="text-[14px] font-semibold text-gray-800">
                  {exec.name}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="bg-orange-50 border border-orange-100 rounded-md px-2 py-1 flex items-center gap-1">
                  <span className="text-xs">🥉</span>
                  <span className="text-[11px] font-semibold text-orange-700 whitespace-nowrap">
                    Rank #{exec.rank}
                  </span>
                </div>

                <div className="bg-blue-600 text-white px-3 py-1 rounded-md text-[13px] font-semibold min-w-[48px] text-center shadow-sm">
                  {exec.score.toFixed(2)}
                </div>

                <div className="text-gray-400 w-5 flex justify-center">
                  {exec.isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                </div>
              </div>
            </div>

            {/* Expanded Details Section */}
            {exec.isExpanded && (
              <div className="px-4 pb-4">
                <div className="border-t border-dashed border-gray-200 pt-4 space-y-3">
                  {/* Metrics List */}
                  {exec.metrics.map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 flex items-center justify-center text-gray-500 bg-gray-50 rounded-md border border-gray-100">
                          <LuTicketSlash size={12} />
                        </div>
                        <span className="text-[13px] font-medium text-gray-600">
                          {m.label}
                        </span>
                      </div>

                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[12px] ${m.color}`}>
                        {m.value}
                        <span className={`${m.starColor} text-[10px]`}>★</span>
                      </div>
                    </div>
                  ))}

                  {/* Qualitative Feedback Block */}
                  <div className="mt-4 bg-[#F8FAFC] rounded-xl p-4 border border-blue-100/50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                        Qualitative Feedback
                      </h4>
                      <div className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-200 cursor-pointer shadow-sm hover:bg-gray-50 transition-colors">
                        <span className="text-[10px] font-semibold text-gray-600">Today</span>
                        <FiChevronDown size={12} className="text-gray-400" />
                      </div>
                    </div>

                    <div className="mb-4">
                      <h5 className="text-[13px] font-bold text-gray-800">
                        Lead Conversion
                      </h5>
                      <p className="text-[13px] text-gray-600 leading-relaxed mt-1">
                        Good follow-ups today. Improve hot lead conversion with faster response and clarity.
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-200/60">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-pink-100 rounded text-pink-600 flex items-center justify-center text-[10px] font-bold">
                          RK
                        </div>
                        <div>
                          <p className="text-[12px] font-bold text-gray-800 leading-tight">
                            Rajesh K
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium">
                            Sales Manager
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-gray-400 bg-white px-2 py-1 rounded border border-gray-100">
                        2 mins ago
                      </span>
                    </div>

                    {/* Feedback Pagination */}
                    <div className="flex items-center justify-center gap-6 mt-4">
                      <button className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                        <FiChevronLeft size={18} />
                      </button>
                      <span className="text-[12px] font-bold text-gray-600 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                        1 / 2
                      </span>
                      <button className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                        <FiChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Render the modal component */}
      <AddRatingModal 
        isOpen={isRatingModalOpen} 
        onClose={() => setIsRatingModalOpen(false)} 
      />
    </aside>
  );
};

export default TeamPerformance;