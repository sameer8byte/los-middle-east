import React from "react";
import { IconType } from "react-icons";

/* =========================
   Types
========================= */

export type SummaryVariant =
  | "blue"
  | "indigo"
  | "yellow"
  | "orange"
  | "green"
  | "red";

export interface SummaryItem {
  icon: IconType;
  number: string | number;
  label: string;
  percentage?: string | number;
  variant: SummaryVariant;
}

interface CreditSummaryProps {
  title?: string;
  data: SummaryItem[];
}

/* =========================
   Style Configuration
========================= */

const CARD_STYLES: Record<SummaryVariant, string> = {
  blue: "bg-[#3B66F5] border-[#3B66F5] text-white",
  indigo: "bg-[#EEF2FF] border-[#C7D2FE] text-[#3730A3]",
  yellow: "bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]",
  orange: "bg-[#FFF7ED] border-[#FFEDD5] text-[#9A3412]",
  green: "bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]",
  red: "bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]",
};

const BADGE_STYLES: Record<SummaryVariant, string> = {
  blue: "bg-white/20 text-white",
  indigo: "bg-gray-600 text-white",
  yellow: "bg-gray-600 text-white",
  orange: "bg-gray-600 text-white",
  green: "bg-green-500 text-white",
  red: "bg-red-500 text-white",
};

/* =========================
   Summary Card
========================= */

const SummaryCard: React.FC<SummaryItem> = ({
  icon: Icon,
  number,
  label,
  percentage,
  variant,
}) => {
  const isPrimary = variant === "blue";

  return (
    <div
      className={`flex flex-col p-2.5 rounded-lg border transition-all min-h-[110px] w-full ${CARD_STYLES[variant]}`}
    >
      <div className="flex justify-between items-start mb-2">
        <Icon size={18} className={isPrimary ? "text-white" : "text-current"} />

        {percentage !== undefined && (
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${BADGE_STYLES[variant]}`}
          >
            {percentage}%
          </span>
        )}
      </div>

      <div
        className={`text-xl font-extrabold tracking-tight ${
          isPrimary ? "text-white" : "text-gray-900"
        }`}
      >
        {number}
      </div>

      <div
        className={`text-xs mt-1 font-medium leading-snug whitespace-normal ${
          isPrimary ? "text-white/90" : "text-gray-500"
        }`}
      >
        {label}
      </div>
    </div>
  );
};

/* =========================
   Main Component
========================= */

const CreditSummary: React.FC<CreditSummaryProps> = ({
  title = "Credit Intake Summary",
  data,
}) => {
  return (
    <section className="w-full bg-white rounded-2xl overflow-hidden  border border-gray-200 ">
      {/* Header */}
      <div className="bg-[#F8F9FA] px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-700 tracking-tight">
          {title}
        </h2>
      </div>

      {/* Grid */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
        {data.map((item, index) => (
          <SummaryCard key={index} {...item} />
        ))}
      </div>
    </section>
  );
};

export default CreditSummary;