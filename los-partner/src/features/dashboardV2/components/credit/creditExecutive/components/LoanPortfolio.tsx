import React from "react";
import { IconType } from "react-icons";

/* =========================
   Types
========================= */

export interface PortfolioStatus {
  label: string;
  count: number | string;
  icon: IconType;
}

export interface PortfolioMetric {
  amount: string;
  label: string;
  accentColor: string;
  percentage?: string;
}

interface LoanPortfolioProps {
  title?: string;
  statuses: PortfolioStatus[];
  metrics: PortfolioMetric[];
}

/* =========================
   Status Badge Component
========================= */

const StatusBadge: React.FC<PortfolioStatus> = ({
  label,
  count,
  icon: Icon,
}) => {
  return (
    <div className="flex items-center justify-between p-2.5 bg-white border border-blue-50 rounded-lg hover:shadow-sm transition-all duration-200 w-full gap-2">
      
      {/* Left Section */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="text-blue-600 bg-blue-50 p-1 rounded-lg shrink-0">
          <Icon size={14} />
        </div>

        <span className="text-xs font-semibold text-gray-500 leading-snug">
          {label}
        </span>
      </div>

      {/* Count */}
      <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-md shrink-0">
        {count}
      </span>
    </div>
  );
};

/* =========================
   Metric Card Component
========================= */

const MetricCard: React.FC<PortfolioMetric> = ({
  amount,
  label,
  accentColor,
  percentage,
}) => {
  return (
    <div className="flex items-center p-3 bg-white border border-gray-100 rounded-lg w-full relative hover:shadow-sm transition-all duration-200">
      
      {/* Accent Bar */}
      <div
        className="w-1 h-12 rounded-full mr-3 shrink-0"
        style={{ backgroundColor: accentColor }}
      />

      {/* Content */}
      <div className="flex flex-col justify-center min-w-0 flex-1">
        <div className="font-extrabold text-gray-800">
          BHD {amount}
        </div>

        <div className="text-xs font-medium text-gray-400 mt-0.5 leading-snug whitespace-normal">
          {label}
        </div>
      </div>

      {/* Optional Percentage Badge */}
      {percentage && (
        <div className="ml-2 bg-[#22C55E] text-white text-[9px] font-bold px-2 py-0.5 rounded-md shrink-0">
          {percentage}
        </div>
      )}
    </div>
  );
};

/* =========================
   Main Component
========================= */

const LoanPortfolio: React.FC<LoanPortfolioProps> = ({
  title = "Loan Portfolio & Repayment Overview",
  statuses,
  metrics,
}) => {
  return (
    <section className="w-full bg-white rounded-2xl border border-gray-200 mt-6 overflow-hidden">
      
      {/* Header */}
      <div className="bg-[#F8F9FA] px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-700 tracking-tight">
          {title}
        </h2>
      </div>

      <div className="p-4 space-y-6">
        

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-3">
          {statuses.map((item, index) => (
            <StatusBadge key={index} {...item} />
          ))}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {metrics.map((item, index) => (
            <MetricCard key={index} {...item} />
          ))}
        </div>

      </div>
    </section>
  );
};

export default LoanPortfolio;