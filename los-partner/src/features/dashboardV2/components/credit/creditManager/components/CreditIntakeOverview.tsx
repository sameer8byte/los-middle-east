import React, { useState } from "react";
import { FiChevronDown } from "react-icons/fi";

/* =========================
   Interfaces
========================= */
export interface EmployeeCreditData {
  name: string;
  totalApplication: number;
  assessed: number;
  inQueue: number;
  onHold: number;
  approved: number;
  rejected: number;
}

interface Props {
  data: EmployeeCreditData[];
}

/* =========================
   Component Constants
========================= */
const METRICS = [
  { key: "totalApplication", label: "Total Application", color: "#60A5FA" },
  { key: "assessed", label: "Assessed", color: "#818CF8" },
  { key: "inQueue", label: "In Queue", color: "#FBBF24" },
  { key: "onHold", label: "On Hold", color: "#FCA5A5" },
  { key: "approved", label: "Approved", color: "#34D399" },
  { key: "rejected", label: "Rejected", color: "#F87171" },
] as const;

const Y_AXIS_LABELS = ["5K", "2K", "1K", "800", "400", "200", "0"];
const MAX_VAL = 5000;
const CHART_HEIGHT = 220;

/* =========================
   Main Component
========================= */
export const CreditIntakeOverview: React.FC<Props> = ({ data }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const getBarHeight = (value: number) => (value / MAX_VAL) * CHART_HEIGHT;

  return (
    <div className="w-full bg-white border border-gray-100 rounded-xl shadow-sm mt-6 overflow-hidden">
      {/* Header with Dropdown Icon */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer bg-[#F5F5F5] px-6 h-12 flex items-center justify-between border-b border-gray-100"
      >
        <h2 className="text-sm font-semibold text-gray-900">
          Credit Intake Data (Across Employee)
        </h2>

        <FiChevronDown
          size={20}
          className={`transition-transform duration-300 text-gray-600 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* Collapsible Chart Section */}
      {isOpen && (
        <div className="p-8 pb-4">
          <div className="relative flex">
            {/* Y-Axis labels */}
            <div 
              className="flex flex-col justify-between pr-4 text-right h-[220px]" 
              style={{ width: "60px" }}
            >
              {Y_AXIS_LABELS.map((label) => (
                <span key={label} className="text-[11px] font-bold text-gray-400">
                  {label}
                </span>
              ))}
            </div>

            {/* Chart Bars Area */}
            <div className="relative flex-1 flex items-end justify-around border-l border-gray-100 pl-4 h-[220px]">
              {/* Horizontal Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {Y_AXIS_LABELS.map((_, i) => (
                  <div key={i} className="w-full border-t border-dashed border-gray-100 h-0" />
                ))}
              </div>

              {/* Individual Employee Bar Groups */}
              {data.map((emp, idx) => {
                const isRightSide = idx >= data.length - 2; // last 2 items flip left

                return (
                  <div
                    key={emp.name}
                    className="relative flex flex-col items-center group px-2"
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    {/* Tooltip */}
                    {hoveredIndex === idx && (
                      <div
                        className="absolute z-50 bg-white shadow-xl rounded-xl border border-gray-100 p-4 w-52 animate-in fade-in zoom-in duration-150"
                        style={{
                          top: "50%",
                          transform: "translateY(-50%)",
                          ...(isRightSide
                            ? { right: "110%" }
                            : { left: "110%" }),
                        }}
                      >
                        <p className="font-black text-gray-900 text-xs mb-3 uppercase tracking-tight">
                          {emp.name}
                        </p>

                        <div className="space-y-2">
                          {METRICS.map((m) => (
                            <div key={m.key} className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: m.color }}
                                />
                                <span className="text-[11px] font-medium text-gray-500">
                                  {m.label}
                                </span>
                              </div>
                              <span className="text-[11px] font-black text-gray-800">
                                {emp[m.key as keyof EmployeeCreditData]}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Arrow */}
                        {isRightSide ? (
                          <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-0 h-0 
                            border-t-[8px] border-t-transparent 
                            border-l-[10px] border-l-white 
                            border-b-[8px] border-b-transparent drop-shadow-sm" />
                        ) : (
                          <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 
                            border-t-[8px] border-t-transparent 
                            border-r-[10px] border-r-white 
                            border-b-[8px] border-b-transparent drop-shadow-sm" />
                        )}
                      </div>
                    )}

                    {/* Bars */}
                    <div className="flex items-end gap-[3px] cursor-pointer">
                      {METRICS.map((m) => (
                        <div
                          key={m.key}
                          className="w-2 rounded-t-sm transition-all duration-300 group-hover:brightness-95"
                          style={{
                            height: `${getBarHeight(
                              Number(emp[m.key as keyof EmployeeCreditData])
                            )}px`,
                            backgroundColor: m.color,
                          }}
                        />
                      ))}
                    </div>

                    <p className="absolute top-full mt-3 text-[10px] font-bold text-gray-400 whitespace-nowrap uppercase tracking-wider">
                      {emp.name}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend Section */}
          <div className="mt-16 flex flex-wrap justify-center gap-4">
            {METRICS.map((m) => (
              <div key={m.key} className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                <span 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: m.color }} 
                />
                <span className="text-[11px] font-bold text-gray-600 uppercase tracking-tighter">
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditIntakeOverview;