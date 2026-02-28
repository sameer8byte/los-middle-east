import BoxContainer from "../ui/BoxContainer";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";

interface ConversionData {
  percentage?: number;
  converted?: number;
  total?: number;
  freshLead?: { count?: number; total?: number; percentage?: number };
  repeatLead?: { count?: number; total?: number; percentage?: number };
  target?: string;
  achieved?: string;
  gap?: string;
}

interface ConversionPerformanceProps {
  data?: ConversionData;
  loading?: boolean;
  error?: string | null;
}

const ConversionPerformance = ({ data, loading, error }: ConversionPerformanceProps = {}) => {
  const percentage = data?.percentage ?? 24;
  const converted = data?.converted ?? 360;
  const total = data?.total ?? 1500;
  const freshLead = { 
    count: data?.freshLead?.count ?? 210, 
    total: data?.freshLead?.total ?? 930, 
    percentage: data?.freshLead?.percentage ?? 23 
  };
  const repeatLead = { 
    count: data?.repeatLead?.count ?? 150, 
    total: data?.repeatLead?.total ?? 720, 
    percentage: data?.repeatLead?.percentage ?? 26 
  };
  const target = data?.target ?? "X %";
  const achieved = data?.achieved ?? "24%";
  const gap = data?.gap ?? "Y %";

  const chartData = [
    {
      name: "Conversion",
      value: percentage,
      fill: "#EF4444",
    },
  ];

  if (error) {
    return (
      <BoxContainer title="Conversion Performance" className="h-full">
        <div className="flex items-center justify-center h-40 text-red-500 text-sm">{error}</div>
      </BoxContainer>
    );
  }

  if (loading) {
    return (
      <BoxContainer title="Conversion Performance" className="h-full">
        <div className="animate-pulse space-y-3 p-4">
          <div className="h-32 bg-gray-200 rounded" />
          <div className="h-8 bg-gray-200 rounded" />
        </div>
      </BoxContainer>
    );
  }

  return (
    <BoxContainer title="Conversion Performance" className="h-full">
      <div className="flex flex-col items-center w-full">
        {/* Gauge Chart */}
        <div className="relative w-full mb-4 min-h-42 bg-[#f8faff] rounded-lg ">
          <ResponsiveContainer width="100%" height="100%" className={""}>
            <RadialBarChart
              cx="50%"
              cy="45%"
              innerRadius="70%"
              outerRadius="90%"
              startAngle={180}
              endAngle={0}
              data={chartData}
            >
              <RadialBar
                background={{ fill: "#E5E7EB" }}
                dataKey="value"
                cornerRadius={100}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          {/* Center text */}
          <div className="absolute inset-0  flex flex-col items-center justify-center pb-8">
            <div className="text-2xl font-semibold text-gray-900">
              {percentage ?? 0}%
            </div>
            <div className="text-xs text-gray-500">
              {converted ?? 0}/{total ?? 0}
            </div>
          </div>
          {/* Description */}
          <div className="text-sm text-gray-600 -mt-20 mb-4 text-center">
            Avg Converted Loan Amount :<br />
            <span className="font-semibold">₹X.XX*</span>
          </div>
        </div>

        {/* Lead breakdown */}
        <div className="flex gap-8 mb-4 text-xs">
          <div className="border border-gray-100 p-0.5 bg-[#F8FAFF] rounded-md">
            <span className="text-gray-700">Fresh Lead : </span>
            <span className="font-semibold">
              {freshLead.count ?? 0}/{freshLead.total ?? 0}
            </span>
            <span className="text-gray-500"> | {freshLead.percentage ?? 0}%</span>
          </div>
          <div className="border border-gray-100 p-0.5 bg-[#f8faff] rounded-md">
            <span className="text-gray-700">Repeat Lead : </span>
            <span className="font-semibold">
              {repeatLead.count ?? 0}/{repeatLead.total ?? 0}
            </span>
            <span className="text-gray-500"> | {repeatLead.percentage ?? 0}%</span>
          </div>
        </div>

        {/* make a dotted line */}
        <div className="border-t border-gray-300 border-dashed w-full mb-4"></div>

        {/* Metrics */}
        <div className="flex text-sm justify-between w-full px-2">
          <div className="text-center">
            <div className="text-gray-500 mb-1">Target</div>
            <div className="font-semibold text-gray-900">{target ?? "-"}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500 mb-1">Achieved</div>
            <div className="font-semibold text-gray-900">{achieved ?? "-"}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500 mb-1">Gap</div>
            <div className="font-semibold text-gray-900">{gap ?? "-"}</div>
          </div>
        </div>
      </div>
    </BoxContainer>
  );
};

export default ConversionPerformance;
