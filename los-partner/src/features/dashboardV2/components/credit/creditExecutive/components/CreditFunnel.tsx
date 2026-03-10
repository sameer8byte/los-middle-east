import React from "react";

/* =========================
   Types
========================= */

export type FunnelVariant = "blue" | "orange" | "green" | "yellow" | "red";

export interface FunnelMetric {
  count: number | string;
  label: string;
  variant: FunnelVariant;
}

export interface AmountMetric {
  amount: string;
  label: string;
  accentColor: string; // e.g., "#3B66F5"
}

interface CreditFunnelProps {
  title?: string;
  metrics: FunnelMetric[];
  amounts: AmountMetric[];
}

/* =========================
   Style Configuration
========================= */

const METRIC_STYLES: Record<FunnelVariant, string> = {
  blue: "bg-[#EEF2FF] border-[#3B66F5] text-[#3B66F5]",
  orange: "bg-[#FFF7ED] border-[#F97316] text-[#F97316]",
  green: "bg-[#F0FDF4] border-[#22C55E] text-[#22C55E]",
  yellow: "bg-[#FFFBEB] border-[#EAB308] text-[#EAB308]",
  red: "bg-[#FEF2F2] border-[#EF4444] text-[#EF4444]",
};

const BADGE_STYLES: Record<FunnelVariant, string> = {
  blue: "bg-[#3B66F5] text-white",
  orange: "bg-[#F97316] text-white",
  green: "bg-[#22C55E] text-white",
  yellow: "bg-[#EAB308] text-white",
  red: "bg-[#EF4444] text-white",
};

/* =========================
   Sub-Components
========================= */

const MetricCard: React.FC<FunnelMetric> = ({ count, label, variant }) => (
  <div className={`flex flex-col p-2.5 rounded-lg border w-full min-h-[75px] ${METRIC_STYLES[variant]}`}>
    <div className="mb-1.5">
      <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${BADGE_STYLES[variant]}`}>
        {count}
      </span>
    </div>
    <div className="text-xs font-semibold text-gray-700 leading-snug whitespace-normal">
      {label}
    </div>
  </div>
);

const AmountCard: React.FC<AmountMetric> = ({ amount, label, accentColor }) => (
  <div className="flex items-center p-2.5 bg-white border border-gray-100 rounded-lg w-full min-h-[75px]">
    <div 
      className="w-1 h-8 rounded-full mr-2.5 shrink-0" 
      style={{ backgroundColor: accentColor }}
    />
    <div className="flex flex-col min-w-0">
      <div className="text-sm font-bold text-gray-800 leading-none">
        BHD {amount}
      </div>
      <div className="text-xs font-medium text-gray-400 mt-0.5 leading-tight whitespace-normal">
        {label}
      </div>
    </div>
  </div>
);

/* =========================
   Main Component
========================= */

const CreditFunnel: React.FC<CreditFunnelProps> = ({
  title = "Credit Lead Funnel",
  metrics,
  amounts,
}) => {
  return (
    <section className="w-full bg-white rounded-2xl overflow-hidden  border border-gray-200 mt-6">
      {/* Header */}
      <div className="bg-[#F8F9FA] px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-700 tracking-tight">
          {title}
        </h2>
      </div>

      <div className="p-4 space-y-6">
        {/* Top row: Funnel Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {metrics.map((item, index) => (
            <MetricCard key={index} {...item} />
          ))}
        </div>

        {/* Bottom row: Financial Amounts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {amounts.map((item, index) => (
            <AmountCard key={index} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default CreditFunnel;