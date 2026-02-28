import { useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import BoxContainer from "../../sales-executive/ui/BoxContainer";

interface ExecutiveData {
  id: string;
  name: string;
  initials: string;
  conversion: string;
  percentage: number;
  fresh: { count: number; percentage: number };
  repeat: { count: number; percentage: number };
  target: string;
  achieved: string;
  avgLoan: string;
  gap: string;
  bgColor: string;
}

interface ConversionContributionProps {
  data?: ExecutiveData[];
  loading?: boolean;
  error?: string | null;
}

const mockData: ExecutiveData[] = [
  {
    id: "1",
    name: "Mahesh R",
    initials: "MR",
    conversion: "720/1000",
    percentage: 95,
    fresh: { count: 210, percentage: 23 },
    repeat: { count: 150, percentage: 26 },
    target: "XX %",
    achieved: "95 %",
    avgLoan: "XX,XXX",
    gap: "YY",
    bgColor: "#E91E63",
  },
  {
    id: "2",
    name: "Mahesh R",
    initials: "MR",
    conversion: "720/1000",
    percentage: 80,
    fresh: { count: 210, percentage: 23 },
    repeat: { count: 150, percentage: 26 },
    target: "XX %",
    achieved: "80 %",
    avgLoan: "XX,XXX",
    gap: "YY",
    bgColor: "#9C27B0",
  },
  {
    id: "3",
    name: "Mahesh R",
    initials: "MR",
    conversion: "720/1000",
    percentage: 55,
    fresh: { count: 210, percentage: 23 },
    repeat: { count: 150, percentage: 26 },
    target: "XX %",
    achieved: "55 %",
    avgLoan: "XX,XXX",
    gap: "YY",
    bgColor: "#FF5722",
  },
  {
    id: "4",
    name: "Mahesh R",
    initials: "MR",
    conversion: "720/1000",
    percentage: 55,
    fresh: { count: 210, percentage: 23 },
    repeat: { count: 150, percentage: 26 },
    target: "XX %",
    achieved: "55 %",
    avgLoan: "XX,XXX",
    gap: "YY",
    bgColor: "#3F51B5",
  },
];

const ConversionContribution = ({ data, loading, error }: ConversionContributionProps = {}) => {
  const [expandedId, setExpandedId] = useState<string | null>("1");
  const executives = data ?? mockData;

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 90) return "bg-green-500";
    if (percentage >= 70) return "bg-blue-500";
    return "bg-red-500";
  };

  if (error) {
    return (
      <BoxContainer title="Conversion (%) Contribution" childrenClassName="flex-col w-full">
        <div className="flex items-center justify-center h-40 text-red-500 text-sm">{error}</div>
      </BoxContainer>
    );
  }

  if (loading) {
    return (
      <BoxContainer title="Conversion (%) Contribution" childrenClassName="flex-col w-full">
        <div className="animate-pulse space-y-3 w-full">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-200 rounded" />)}
        </div>
      </BoxContainer>
    );
  }

  return (
    <BoxContainer title="Conversion (%) Contribution" childrenClassName="flex-col w-full">
      <div className="space-y-3 w-full ">
        {executives.map((exec) => (
          <div
            key={exec.id}
            className="border border-gray-200 rounded-lg overflow-hidden bg-[#F8FBFF]"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpandedId(expandedId === exec.id ? null : exec.id)}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                  style={{ backgroundColor: exec.bgColor }}
                >
                  {exec.initials}
                </div>
                <div>
                  <div className="font-medium text-sm">{exec.name} | #1</div>
                  <div className="text-xs text-gray-500">Conversion : {exec.conversion}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-white text-sm font-semibold ${getPercentageColor(exec.percentage)}`}
                >
                  {exec.percentage}%
                </span>
                <FiChevronDown
                  className={`w-5 h-5 text-gray-600 transition-transform ${
                    expandedId === exec.id ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>

            {/* Expanded Content */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
              expandedId === exec.id ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
            }`}>
              <div className="px-3 pb-3 pt-2  border-t border-gray-200">
                <div className="flex gap-4 text-xs mb-3">
                  <div className="flex-1">
                    <div className="bg-white p-0.5 rounded inline-block border border-gray-100">
                      <span className="text-gray-600">Fresh : </span>
                      <span className="font-semibold">{exec.fresh.count} | {exec.fresh.percentage}%</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="bg-white p-0.5 rounded inline-block border border-gray-100">
                      <span className="text-gray-600">Target : </span>
                      <span className="font-semibold">{exec.target}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="bg-white p-0.5 rounded inline-block border border-gray-100">
                      <span className="text-gray-600">Achieved : </span>
                      <span className="font-semibold">{exec.achieved}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 text-xs">
                  <div className="flex-1">
                    <div className="bg-white p-0.5 rounded inline-block border border-gray-100">
                      <span className="text-gray-600">Repeat : </span>
                      <span className="font-semibold">{exec.repeat.count} | {exec.repeat.percentage}%</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="bg-white p-0.5 rounded inline-block border border-gray-100">
                      <span className="text-gray-600">Avg Loan : </span>
                      <span className="font-semibold">{exec.avgLoan}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="bg-white p-0.5 rounded inline-block border border-gray-100">
                      <span className="text-gray-600">Gap : </span>
                      <span className="font-semibold">{exec.gap}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </BoxContainer>
  );
};

export default ConversionContribution;
