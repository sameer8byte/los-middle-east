import React, { useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

/* =========================
   Interfaces
========================= */

/**
 * Detailed breakdown metrics for an executive
 */
export interface ContributionDetail {
  fresh: { count: number; percentage: number };
  repeat: { count: number; percentage: number };
  target: string; // Represented as 'XX' %
  achieved: number;
  avgTicketSize: string; // Represented as 'XX,XXX'
  gap: string; // Represented as 'YY'
}

/**
 * Main data structure for a single contribution row
 */
export interface ContributionData {
  id: string;
  name: string;
  initials: string;
  rank: number;
  approvedCount: number;
  totalAssessed: number;
  percentage: number;
  colorVariant: "green" | "blue" | "red";
  details?: ContributionDetail;
}

interface ApprovalContributionProps {
  title?: string;
  data: ContributionData[];
}

/* =========================
   Style Mapping
========================= */

const VARIANT_MAP: Record<string, string> = {
  green: "bg-[#22C55E]",
  blue: "bg-[#3B66F5]",
  red: "bg-[#EF4444]",
};

/* =========================
   Sub-Component: ContributionRow
========================= */

const ContributionRow: React.FC<{ data: ContributionData }> = ({ data }) => {
  // Expand the first rank by default as seen in the screenshots
  const [isOpen, setIsOpen] = useState(data.rank === 1);

  return (
    <div className="bg-[#F8F9FA] border border-gray-100 rounded-2xl overflow-hidden mb-3 transition-all duration-200">
      {/* Main Header Row */}
      <div 
        className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-white transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-pink-100 rounded-xl flex items-center justify-center text-[11px] font-black text-pink-600 shadow-sm">
            {data.initials}
          </div>
          <span className="text-[14px] font-bold text-gray-800 tracking-tight">
            {data.name} <span className="text-gray-400 font-medium ml-1">| #{data.rank}</span>
          </span>
        </div>

        <div className="flex items-center gap-6">
          <span className="text-[12px] font-semibold text-gray-500">
            Approved : <span className="text-gray-800 font-bold">{data.approvedCount}/{data.totalAssessed}</span>
          </span>
          <div className={`text-white text-[11px] font-black px-2.5 py-1 rounded-lg min-w-[50px] text-center shadow-sm ${VARIANT_MAP[data.colorVariant]}`}>
            {data.percentage}%
          </div>
          <div className="text-gray-400">
            {isOpen ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
          </div>
        </div>
      </div>

      {/* Expandable Details Section */}
      {isOpen && data.details && (
        <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-1 duration-300">
          <div className="border-t border-dashed border-gray-200 pt-4 flex flex-wrap gap-2">
            {/* Detail Pills */}
            <div className="bg-white border border-gray-100 px-3 py-2 rounded-xl text-[11px] font-semibold text-gray-500 shadow-sm">
              Fresh : <span className="text-gray-800">{data.details.fresh.count}</span> | <span className="text-gray-800">{data.details.fresh.percentage}%</span>
            </div>
            
            <div className="bg-white border border-gray-100 px-3 py-2 rounded-xl text-[11px] font-semibold text-gray-500 shadow-sm">
              Repeat : <span className="text-gray-800">{data.details.repeat.count}</span> | <span className="text-gray-800">{data.details.repeat.percentage}%</span>
            </div>
            
            <div className="bg-white border border-gray-100 px-3 py-2 rounded-xl text-[11px] font-semibold text-gray-500 shadow-sm">
              Target : <span className="text-gray-800">'{data.details.target}' %</span>
            </div>
            
            <div className="bg-white border border-gray-100 px-3 py-2 rounded-xl text-[11px] font-semibold text-gray-500 shadow-sm">
              Achieved : <span className="text-gray-800">{data.details.achieved} %</span>
            </div>
            
            <div className="bg-white border border-gray-100 px-3 py-2 rounded-xl text-[11px] font-semibold text-gray-500 shadow-sm">
              Avg Ticket Size : <span className="text-blue-600 font-bold underline cursor-pointer">'{data.details.avgTicketSize}'</span>
            </div>
            
            <div className="bg-white border border-gray-100 px-3 py-2 rounded-xl text-[11px] font-semibold text-gray-500 shadow-sm">
              Gap : <span className="text-gray-800">'{data.details.gap}'</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* =========================
   Main Component: ApprovalContribution
========================= */

const ApprovalContribution: React.FC<ApprovalContributionProps> = ({ 
  title = "Approval (%) Contribution", 
  data 
}) => {
  return (
    <section className="w-full bg-white rounded-2xl border border-gray-200 flex flex-col h-72 sm:h-[420px] md:h-[450px] lg:h-[500px] overflow-hidden shadow-sm">
      {/* Fixed Header */}
      <div className="p-4 border-b border-gray-50 shrink-0 bg-white">
        <h2 className="font-black text-gray-800 text-[15px] tracking-tight">{title}</h2>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {data.length > 0 ? (
          data.map((item) => (
            <ContributionRow key={item.id} data={item} />
          ))
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm italic">
            No contribution data available
          </div>
        )}
      </div>
    </section>
  );
};

export default ApprovalContribution;