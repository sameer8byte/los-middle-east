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
    className="bg-white flex flex-col justify-between relative overflow-hidden"
    style={{ width: '250px', height: '153px', padding: '16px', borderRadius: '8px', border: '1px solid #E5E7EB' }}
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
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-3xl font-bold text-gray-900">{count}</span>
        <span className="text-gray-500">|</span>
        <span className="text-2xl font-bold text-gray-900">{amount}</span>
      </div>
      <p className="text-sm text-gray-600">{title}</p>
    </div>
    
    {/* Dashed Divider */}
    <div className="border-t border-dashed border-gray-300"></div>
    
    <div className="flex justify-between text-sm">
      <div>
        <p className="text-gray-600">Fresh : <span className="font-semibold text-gray-900">{fresh}</span></p>
        <p className="text-gray-900 font-semibold">{freshAmount}</p>
      </div>
      <div className="text-right">
        <p className="text-gray-600">Repeat : <span className="font-semibold text-gray-900">{repeat}</span></p>
        <p className="text-gray-900 font-semibold">{repeatAmount}</p>
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
  const totalCases = { closed: 48, total: 120, amount: "₹32 L", closure: "40%" };
  const statusCards = [
    { count: 14, amount: "₹9 L", title: "Pre Closure", fresh: 8, repeat: 6, freshAmount: "₹18,20,000", repeatAmount: "₹4,20,000", borderColor: "#B433EA" },
    { count: 22, amount: "₹15 L", title: "On Time Closure", fresh: 14, repeat: 8, freshAmount: "₹9,50,000", repeatAmount: "₹5,50,000", borderColor: "#00A63E" },
    { count: 12, amount: "₹8 L", title: "Post Due (Current Due + Penalty)", fresh: 8, repeat: 4, freshAmount: "₹4,00,000", repeatAmount: "₹4,00,000", borderColor: "#E21616" },
  ];

  return (
    <div 
      className="bg-white border border-[#F5F5F5]"
      style={{ width: '828px', height: '360px', borderRadius: '20px', gap: '10px' }}
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
      <div style={{ width: '828px', height: '312px', padding: '20px 15px', gap: '24px', display: 'flex', flexDirection: 'column' }}>
        {/* Total Cases Section */}
        <div style={{ width: '798px', height: '95px', gap: '17px', display: 'flex', flexDirection: 'column' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Total Cases Closed :</span>
              <span className="text-lg font-bold text-gray-900">{totalCases.closed}/{totalCases.total}</span>
              <span className="text-lg font-bold text-gray-900">| {totalCases.amount}</span>
            </div>
            <div className="bg-gray-900 text-white text-xs font-semibold px-3 py-1" style={{ borderRadius: '4px' }}>
              {totalCases.closure} Closure
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 h-8 overflow-hidden" style={{ borderRadius: '4px' }}>
            <div className="h-full bg-blue-500" style={{ width: '40%' }}></div>
          </div>
          
          {/* Percentage Bar */}
          <div className="flex" style={{ width: '798px', height: '24px', borderRadius: '4px', overflow: 'hidden' }}>
            <div className="bg-purple-200 flex items-center justify-center text-xs font-semibold" style={{ width: '28%' }}>28%</div>
            <div className="bg-green-200 flex items-center justify-center text-xs font-semibold" style={{ width: '47%' }}>47%</div>
            <div className="bg-red-200 flex items-center justify-center text-xs font-semibold" style={{ width: '25%' }}>25%</div>
          </div>
        </div>
        
        {/* Status Cards */}
        <div className="flex" style={{ width: '798px', height: '153px', gap: '20px', justifyContent: 'space-between' }}>
          {statusCards.map((card, index) => (
            <StatusCard key={index} {...card} />
          ))}
        </div>
      </div>
    </div>
  );
};
