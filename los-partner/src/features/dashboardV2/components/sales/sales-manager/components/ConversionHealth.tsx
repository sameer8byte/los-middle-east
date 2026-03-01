import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import BoxContainer from "../../sales-executive/ui/BoxContainer";

ChartJS.register(ArcElement, Tooltip, Legend);

interface ConversionHealthProps {
  data?: any;
  loading?: boolean;
  error?: string | null;
}

const ConversionHealth = ({ data, loading, error }: ConversionHealthProps = {}) => {
  const conversionPercentage = data?.conversionPercentage ?? 24;
  const converted = data?.converted ?? 360;
  const total = data?.total ?? 1500;
  const freshLead = { 
    count: data?.freshLead?.count ?? 210, 
    total: data?.freshLead?.total ?? 930, 
    percentage: data?.freshLead?.percentage ?? 23 
  };
  const repeatLead = { 
    count: data?.repeatLead?.count ?? 150, 
    total: data?.repeatLead?.total ?? 570, 
    percentage: data?.repeatLead?.percentage ?? 26 
  };
  const target = data?.target ?? "X %";
  const achieved = data?.achieved ?? "24%";
  const gap = data?.gap ?? "Y %";

  const dropOffPercentage = data?.dropOffPercentage ?? 21;
  const dropOffCount = data?.dropOffCount ?? 320;
  const dropOffTotal = data?.dropOffTotal ?? 1500;

  const donutData = data?.donutData ?? [
    { name: "Low Cibil", value: 82, percentage: 26, color: "#93C5FD" },
    { name: "No Response", value: 64, percentage: 20, color: "#3B82F6" },
    { name: "High For", value: 52, percentage: 16, color: "#60A5FA" },
    { name: "Customer Declined", value: 48, percentage: 15, color: "#BFDBFE" },
    { name: "+5 More", value: 74, percentage: 23, color: "#2563EB" },
  ];

  const gaugeData = {
    datasets: [
      {
        data: [conversionPercentage, 100 - conversionPercentage],
        backgroundColor: ["#EF4444", "#E5E7EB"],
        borderWidth: 0,
        circumference: 180,
        rotation: 270,
        borderRadius: 10,
      },
    ],
  };

  const gaugeOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "80%",
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
  };

  const donutChartData = {
    labels: donutData.map((item: any) => item.name),
    datasets: [
      {
        data: donutData.map((item: any) => item.value),
        backgroundColor: donutData.map((item: any) => item.color),
        borderWidth: 0,
      },
    ],
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "60%",
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const item = donutData[context.dataIndex];
            return `${item.name}: ${item.value} (${item.percentage}%)`;
          },
        },
      },
    },
  };

  if (error) {
    return (
      <BoxContainer title="Conversion Health" childrenClassName="w-full block">
        <div className="flex items-center justify-center h-40 text-red-500 text-sm">{error}</div>
      </BoxContainer>
    );
  }

  if (loading) {
    return (
      <BoxContainer title="Conversion Health" childrenClassName="w-full block">
        <div className="animate-pulse flex gap-4 w-full">
          <div className="flex-1 h-64 bg-gray-200 rounded" />
          <div className="flex-1 h-64 bg-gray-200 rounded" />
        </div>
      </BoxContainer>
    );
  }

  return (
    <BoxContainer title="Conversion Health" childrenClassName="w-full block">
      <div className="flex gap-4 w-full ">
        {/* Left: Conversion Performance */}
        <div className="flex-1 flex flex-col">
          <div className="relative w-full mb-4 min-h-42 bg-[#f8faff] rounded-lg">
            <div className="w-full h-[140px] mt-4 flex items-center justify-center">
              <div className="w-full h-full">
                <Doughnut data={gaugeData} options={gaugeOptions} />
              </div>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center pb-8 pointer-events-none">
              <div className="text-2xl font-semibold text-gray-900">
                {conversionPercentage}%
              </div>
              <div className="text-xs text-gray-500">
                {converted}/{total}
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-4 text-center">
              Avg Converted Loan Amount :<br />
              <span className="font-semibold">'XX,XXX'</span>
            </div>
          </div>

          <div className="flex gap-4 justify-between px-2 mb-4 text-xs">
            <div className="border border-gray-100 p-1 bg-[#F8FAFF] rounded-md">
              <span className="text-gray-700">Fresh Lead : </span>
              <span className="font-semibold">
                {freshLead.count}/{freshLead.total}
              </span>
              <span className="text-gray-500"> | {freshLead.percentage}%</span>
            </div>
            <div className="border border-gray-100 p-1 bg-[#f8faff] rounded-md">
              <span className="text-gray-700">Repeat Lead : </span>
              <span className="font-semibold">
                {repeatLead.count}/{repeatLead.total}
              </span>
              <span className="text-gray-500"> | {repeatLead.percentage}%</span>
            </div>
          </div>

          <div className="border-t border-gray-300 border-dashed w-full mb-4"></div>

          <div className="flex text-sm justify-between w-full">
            <div className="text-center">
              <div className="text-gray-500 mb-1">Target</div>
              <div className="font-semibold text-gray-900">{target}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-500 mb-1">Achieved</div>
              <div className="font-semibold text-gray-900">{achieved}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-500 mb-1">Gap</div>
              <div className="font-semibold text-gray-900">{gap}</div>
            </div>
          </div>
        </div>

        {/* left border */}
        <div className="border-l border-gray-200" />

        {/* Right: Lead Drop Off Analysis */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Lead Drop Off Analysis</h3>
            <div className="text-right">
              <span className="text-2xl font-bold text-red-500">{dropOffPercentage}%</span>
              <span className="text-xs text-gray-500 ml-2">Drop Off Rate</span>
            </div>
          </div>
          <div className="border-t border-gray-300 border-dashed w-full mb-4"></div>

          <div className="relative w-full h-48 mb-4 px-4">
            <Doughnut data={donutChartData} options={donutOptions} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-xl font-bold text-gray-900">
                {dropOffCount}/{dropOffTotal}
              </div>
              <div className="text-xs text-gray-500">Lead Lost</div>
            </div>
          </div>

          <div className="text-xs flex flex-wrap gap-2">
            {donutData.map((item: any, index: number) => (
              <div key={index} className="flex gap-2 items-center bg-[#f8faff] p-1 rounded-md">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-gray-700">{item.name}</span>
                </div>
                <span className="text-gray-500">
                  {item.value} | {item.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BoxContainer>
  );
};

export default ConversionHealth;
