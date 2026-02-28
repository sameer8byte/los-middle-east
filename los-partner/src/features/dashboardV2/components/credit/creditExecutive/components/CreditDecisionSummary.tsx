import React, { useState } from 'react';
import { FiChevronDown } from 'react-icons/fi';

/* =========================
   Types
========================= */

export interface RemarkDetail {
  label: string;
  count: number;
}

export interface RiskCategory {
  title: string;
  totalCases: number;
  color: string;
  borderColor?: string;
  remarks: RemarkDetail[];
}

interface CreditDecisionSummaryProps {
  sanctionRate: {
    ratio: string;
    percentage: number;
  };
  distribution: {
    successPercent: number;
    pendingPercent: number;
    rejectedPercent: number;
  };
  categories: RiskCategory[];
}

/* =========================
   Sub-Components
========================= */

const RemarkTag: React.FC<RemarkDetail> = ({ label, count }) => (
  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-100 rounded-lg shadow-sm">
    <span className="text-[11px] font-medium text-gray-500 whitespace-nowrap">{label}</span>
    <span className="text-[11px] font-bold text-gray-700 border-l pl-1.5 border-gray-200">| {count}</span>
  </div>
);

/* =========================
   Main Component
========================= */

const CreditDecisionSummary: React.FC<CreditDecisionSummaryProps> = ({ 
  sanctionRate, 
  distribution, 
  categories 
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <section className="w-full bg-white rounded-md overflow-hidden shadow-sm border border-gray-200 mt-6">
      {/* Header with Dropdown Icon */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer bg-[#F8F9FA] px-4 py-3 flex items-center justify-between border-b border-gray-100"
      >
        <h2 className="text-sm font-bold text-gray-800 tracking-tight">Credit Decision Summary</h2>
        
        <FiChevronDown
          size={20}
          className={`transition-transform duration-300 text-gray-600 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="p-5 space-y-6">
          {/* Risk & Remark Distribution Header */}
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-[13px] font-bold text-gray-800">Risk & Remark Distribution</h3>
              <p className="text-[11px] text-gray-400">Case quality and verification status breakdown</p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-gray-500">Sanction Rate :</span>
              <span className="text-sm font-bold text-gray-800">{sanctionRate.ratio}</span>
              <span className="bg-green-50 text-green-600 border border-green-200 text-[10px] font-bold px-2 py-0.5 rounded">
                {sanctionRate.percentage}%
              </span>
            </div>
          </div>

          {/* Horizontal Stacked Bar */}
          <div className="flex w-full h-9 md:h-11 gap-1 overflow-hidden rounded-lg">
            {/* Success */}
            <div
              style={{ flex: distribution.successPercent }}
              className="relative bg-[#D1FAE5] border border-green-300 flex items-center transition-all duration-500 min-w-[6%]"
            >
              <span className="absolute right-1 md:right-2 bg-gray-800 text-white text-[8px] md:text-[9px] px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap">
                {distribution.successPercent}%
              </span>
            </div>

            {/* Pending */}
            <div
              style={{ flex: distribution.pendingPercent }}
              className="relative bg-[#FEF3C7] border border-yellow-300 flex items-center transition-all duration-500 min-w-[6%]"
            >
              <span className="absolute right-1 md:right-2 bg-gray-800 text-white text-[8px] md:text-[9px] px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap">
                {distribution.pendingPercent}%
              </span>
            </div>

            {/* Rejected */}
            <div
              style={{ flex: distribution.rejectedPercent }}
              className="relative bg-[#FEE2E2] border border-red-300 flex items-center transition-all duration-500 min-w-[6%]"
            >
              <span className="absolute right-1 md:right-2 bg-gray-800 text-white text-[8px] md:text-[9px] px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap">
                {distribution.rejectedPercent}%
              </span>
            </div>
          </div>

          {/* Detailed Remark Groups */}
          <div className="space-y-4">
            {categories.map((cat, idx) => (
              <div key={idx} className="flex bg-[#F8FAFC] border border-gray-100 rounded-xl p-4 gap-6 items-center">
                {/* Category Title Card */}
                <div className="flex gap-3 items-center min-w-[120px] border-r border-dashed border-gray-300 pr-6">
                  <div className={`w-1 h-10 rounded-full ${cat.color}`} />
                  <div>
                    <h4 className="text-[12px] font-bold text-gray-800 leading-tight">{cat.title}</h4>
                    <p className="text-[11px] text-gray-500">{cat.totalCases} Cases</p>
                  </div>
                </div>

                {/* Remark Tags */}
                <div className="flex flex-wrap gap-2">
                  {cat.remarks.map((rem, rIdx) => (
                    <RemarkTag key={rIdx} label={rem.label} count={rem.count} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default CreditDecisionSummary;