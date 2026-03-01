// 🔴 UNCOMMENT BELOW WHEN API IS READY
// import { useState, useEffect } from "react";
// import { getApplications } from "../../services/dashboardApi";
// import type { ApplicationData } from "../../types/dashboard.types";

interface StatusCardProps {
  count: number;
  amount: string;
  title: string;
  fresh: number;
  repeat: number;
  freshAmount: string;
  repeatAmount: string;
  borderColor: string;
}

const StatusCard = ({ count, amount, title, fresh, repeat, freshAmount, repeatAmount, borderColor }: StatusCardProps) => (
  <div 
    className="bg-white flex flex-col justify-between relative overflow-hidden flex-1 min-w-[180px]"
    style={{ height: '153px', padding: '16px', borderRadius: '8px', border: '1px solid #E5E7EB' }}
  >
    {/* Left Border - Half Height */}
    <div 
      style={{ 
        position: 'absolute',
        left: 0,
        top: 0,
        width: '4px',
        height: '50%',
        backgroundColor: borderColor
      }}
    />
    
    <div>
      <div className="flex items-baseline gap-2 mb-1 min-w-0">
        <span className="text-3xl font-bold text-gray-900 break-words">{count}</span>
        <span className="text-gray-500 flex-shrink-0">|</span>
        <span className="text-2xl font-bold text-gray-900 break-words">{amount}</span>
      </div>
      <p className="text-sm text-gray-600">{title}</p>
    </div>
    
    {/* Dashed Divider */}
    <div className="border-t border-dashed border-gray-300"></div>
    
    <div className="flex justify-between text-sm">
      <div className="min-w-0">
        <p className="text-gray-600">Fresh : <span className="font-semibold text-gray-900">{fresh}</span></p>
        <p className="text-gray-900 font-semibold break-words">{freshAmount}</p>
      </div>
      <div className="text-right min-w-0">
        <p className="text-gray-600">Repeat : <span className="font-semibold text-gray-900">{repeat}</span></p>
        <p className="text-gray-900 font-semibold break-words">{repeatAmount}</p>
      </div>
    </div>
  </div>
);

export const Application = () => {
  // 🔴 UNCOMMENT BELOW WHEN API IS READY
  // const [data, setData] = useState<ApplicationData | null>(null);
  // const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       setLoading(true);
  //       const response = await getApplications();
  //       setData(response);
  //     } catch (err) {
  //       console.error(err);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   fetchData();
  // }, []);

  // 🔴 REPLACE MOCK DATA WITH API data
  const totalCases = { closed: 48, total: 120, amount: "₹32 L" };
  const closurePercentage = Math.round((totalCases.closed / totalCases.total) * 100);
  const statusCards = [
    { count: 14, amount: "₹9 L", title: "Pre Closure", fresh: 8, repeat: 6, freshAmount: "₹18,20,000", repeatAmount: "₹4,20,000", borderColor: "#B433EA" },
    { count: 22, amount: "₹15 L", title: "On Time Closure", fresh: 14, repeat: 8, freshAmount: "₹9,50,000", repeatAmount: "₹5,50,000", borderColor: "#00A63E" },
    { count: 12, amount: "₹8 L", title: "Post Due (Current Due + Penalty)", fresh: 8, repeat: 4, freshAmount: "₹4,00,000", repeatAmount: "₹4,00,000", borderColor: "#E21616" },
  ];

  return (
    <div 
      className="bg-white border border-[#F5F5F5] w-full"
      style={{ borderRadius: '20px', gap: '10px' }}
    >
      {/* Header */}
      <div 
        className="bg-[#F5F5F5] px-4"
        style={{ 
          height: '48px',
          paddingTop: '8px',
          paddingBottom: '8px',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <h2 className="text-base font-semibold text-gray-900">Application & Credit Pipeline</h2>
      </div>
      
      {/* Content */}
      <div className="p-4 flex flex-col gap-6">
        {/* Total Cases Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Total Cases Closed :</span>
              <span className="text-lg font-bold text-gray-900">{totalCases.closed}/{totalCases.total}</span>
              <span className="text-lg font-bold text-gray-900">| {totalCases.amount}</span>
            </div>
            <div className="bg-gray-900 text-white text-xs font-semibold px-3 py-1" style={{ borderRadius: '4px' }}>
              {closurePercentage}% Closure
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 h-8 overflow-hidden rounded">
            <div className="h-full bg-blue-500" style={{ width: `${closurePercentage}%` }}></div>
          </div>
          
          {/* Percentage Bar */}
          <div className="flex w-full h-6 rounded overflow-hidden">
            <div className="bg-purple-200 flex items-center justify-center text-xs font-semibold" style={{ width: '28%' }}>28%</div>
            <div className="bg-green-200 flex items-center justify-center text-xs font-semibold" style={{ width: '47%' }}>47%</div>
            <div className="bg-red-200 flex items-center justify-center text-xs font-semibold" style={{ width: '25%' }}>25%</div>
          </div>
        </div>
        
        {/* Status Cards */}
        <div className="flex flex-wrap gap-3">
          {statusCards.map((card, index) => (
            <StatusCard key={index} {...card} />
          ))}
        </div>
      </div>
    </div>
  );
};
