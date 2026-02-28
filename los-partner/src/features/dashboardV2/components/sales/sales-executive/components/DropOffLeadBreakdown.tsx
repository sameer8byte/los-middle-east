import BoxContainer from "../ui/BoxContainer";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface FactorData {
  name: string;
  value: number;
  color: string;
}

interface DropOffData {
  percentage?: number;
  count?: number;
  total?: number;
  factors?: FactorData[];
}

interface DropOffLeadBreakdownProps {
  data?: DropOffData;
  loading?: boolean;
  error?: string | null;
}

const DropOffLeadBreakdown = ({ data, loading, error }: DropOffLeadBreakdownProps = {}) => {
  const percentage = data?.percentage ?? 21;
  const count = data?.count ?? 320;
  const total = data?.total ?? 1500;

  const factors = data?.factors ?? [
    { name: "Factor A", value: 20, color: "#60A5FA" },
    { name: "Factor B", value: 15, color: "#93C5FD" },
    { name: "Factor C", value: 25, color: "#3B82F6" },
    { name: "Factor D", value: 10, color: "#BFDBFE" },
    { name: "Factor E", value: 20, color: "#2563EB" },
    { name: "Factor F", value: 10, color: "#DBEAFE" },
  ];

  if (error) {
    return (
      <BoxContainer title="Drop off Lead Breakdown" className="w-full h-full">
        <div className="flex items-center justify-center h-40 text-red-500 text-sm">{error}</div>
      </BoxContainer>
    );
  }

  if (loading) {
    return (
      <BoxContainer title="Drop off Lead Breakdown" className="w-full h-full">
        <div className="animate-pulse space-y-3 p-4">
          <div className="h-32 bg-gray-200 rounded-full mx-auto w-32" />
          <div className="h-8 bg-gray-200 rounded" />
        </div>
      </BoxContainer>
    );
  }

  if (!factors || factors.length === 0) {
    return (
      <BoxContainer title="Drop off Lead Breakdown" className="w-full h-full">
        <div className="flex items-center justify-center h-40 text-gray-500">No data available</div>
      </BoxContainer>
    );
  }

  return (

    <BoxContainer title="Drop off Lead Breakdown" className="w-full h-full">
      <div className="flex flex-col items-center w-full">
        {/* Donut Chart */}
        <div className="relative w-full h-48 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={factors}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                dataKey="value"
              >
                {factors.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.5rem",
                  fontSize: "12px",
                  zIndex: 1000,
                }}
                wrapperStyle={{ zIndex: 1000 }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-2xl font-bold text-gray-900">
              {percentage ?? 0}%
            </div>
            <div className="text-xs text-gray-500">
              {count ?? 0}/{total ?? 0}
            </div>
          </div>
        </div>

        {/* dotted line */}
        <div className="border-t border-gray-300 border-dashed w-full mb-6"></div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm w-full">
          {factors.map((factor, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full "
                style={{ backgroundColor: factor.color }}
              />
              <div className="flex items-center">
                <span className="text-gray-700">{factor.name}</span>
                <span className="text-gray-500">: X % | Count</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </BoxContainer>
  );
};

export default DropOffLeadBreakdown;
