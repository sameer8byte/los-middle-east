import React from 'react';
import { HiOutlineFire } from 'react-icons/hi';

interface ExecutiveMetric {
  label: string;
  count: number;
}

interface CreditExecutivesSummaryProps {
  metrics: ExecutiveMetric[];
}

const ExecutiveCard: React.FC<ExecutiveMetric> = ({ label, count }) => (
  <div className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition-all flex-1 min-w-[200px]">
    <div className="flex items-center gap-2">
      <div className="text-blue-600 shrink-0">
        <HiOutlineFire size={18} />
      </div>
      <span className="text-[13px] font-bold text-gray-500">{label}</span>
    </div>
    <div className="bg-[#1D4ED8] text-white text-[11px] font-black px-3 py-1 rounded-lg">
      {count}
    </div>
  </div>
);

const CreditExecutivesSummary: React.FC<CreditExecutivesSummaryProps> = ({ metrics }) => {
  return (
    <section className="w-full bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm mt-6">
      {/* Gray Header Bar */}
      <div className="bg-[#F8F9FA] px-5 py-3 border-b border-gray-100">
        <h2 className="text-[13px] font-bold text-gray-800">
          Credit Executives Summary
        </h2>
      </div>

      {/* Cards Container */}
      <div className="p-5 flex flex-wrap gap-4">
        {metrics.map((item, index) => (
          <ExecutiveCard key={index} label={item.label} count={item.count} />
        ))}
      </div>
    </section>
  );
};

export default CreditExecutivesSummary;