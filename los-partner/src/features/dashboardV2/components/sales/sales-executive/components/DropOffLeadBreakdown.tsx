import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import BoxContainer from "../ui/BoxContainer";

ChartJS.register(ArcElement, Tooltip, Legend);

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

const DropOffLeadBreakdown = ({
  data,
  loading,
  error,
}: DropOffLeadBreakdownProps = {}) => {
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

  const donutChartData = {
    labels: factors.map((factor) => factor.name),
    datasets: [
      {
        data: factors.map((factor) => factor.value),
        backgroundColor: factors.map((factor) => factor.color),
        borderWidth: 0,
      },
    ],
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const factor = factors[context.dataIndex];
            const totalValue = factors.reduce((sum, f) => sum + f.value, 0);
            const percentage = Math.round((factor.value / totalValue) * 100);
            return `${factor.name}: ${factor.value} (${percentage}%)`;
          },
        },
      },
    },
  };

  if (error) {
    return (
      <BoxContainer title="Drop off Lead Breakdown" className="w-full h-full">
        <div className="flex items-center justify-center h-40 text-red-500 text-sm">
          {error}
        </div>
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
        <div className="flex items-center justify-center h-40 text-gray-500">
          No data available
        </div>
      </BoxContainer>
    );
  }

  return (
    <BoxContainer title="Drop off Lead Breakdown" className="w-full h-full">
      <div className="flex flex-col items-center w-full">
        {/* Donut Chart */}
        <div className="relative w-full h-54 mb-6 bg-[#f8faff] rounded-lg p-4">
          <Doughnut data={donutChartData} options={donutOptions} />
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
      <div className="flex flex-wrap gap-y-2 justify-between text-sm w-full">
  {factors.map((factor, index) => (
    <div
      key={index}
      className="flex items-center gap-2 pr-4"
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: factor.color }}
        />
        <span className="text-gray-700 truncate">{factor.name}</span>
      </div>

      <span className="text-gray-500 whitespace-nowrap">
        {factor.value}% | Count
      </span>
    </div>
  ))}
</div>
      </div>
    </BoxContainer>
  );
};

export default DropOffLeadBreakdown;
