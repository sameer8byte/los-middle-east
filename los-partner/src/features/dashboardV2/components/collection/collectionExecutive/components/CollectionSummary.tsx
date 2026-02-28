// 🔴 UNCOMMENT BELOW WHEN API IS READY
// import { useState, useEffect } from "react";
// import { getCollectionSummary } from "../../services/dashboardApi";
// import type { CollectionSummaryData } from "../../types/dashboard.types";

interface SummaryCardProps {
  amount: string;
  title: string;
  percentage?: string;
  fresh: number;
  repeat: number;
  freshAmount: string;
  repeatAmount: string;
  borderColor: string;
}

const SummaryCard = ({ 
  amount, 
  title, 
  percentage, 
  fresh, 
  repeat, 
  freshAmount, 
  repeatAmount, 
  borderColor 
}: SummaryCardProps) => (
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
        <span className="text-3xl font-bold text-gray-900">{amount}</span>
        {percentage && <span className="text-red-500 text-sm font-semibold">{percentage}</span>}
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

export const CollectionSummary = () => {
  // 🔴 UNCOMMENT BELOW WHEN API IS READY
  // const [data, setData] = useState<CollectionSummaryData | null>(null);
  // const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       setLoading(true);
  //       const response = await getCollectionSummary();
  //       setData(response);
  //     } catch (err) {
  //       console.error(err);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   fetchData();
  // }, []);

  // 🔴 REPLACE MOCK DATA WITH: data.totalLoanDueAmount, data.totalLoanAmountCollected, etc.
  const summaryData = [
    { 
      amount: "₹50 L", 
      title: "Total Loan Due Amount", 
      fresh: 80, 
      repeat: 40,
      freshAmount: "₹6,00,000",
      repeatAmount: "₹14,00,000",
      borderColor: "#2388FF" 
    },
    { 
      amount: "₹32 L", 
      title: "Total Loan Amount Collected", 
      percentage: "64 %",
      fresh: 15, 
      repeat: 17,
      freshAmount: "₹25,00,000",
      repeatAmount: "₹7,00,000",
      borderColor: "#D882FC" 
    },
    { 
      amount: "₹18 L", 
      title: "Total Amount Outstanding", 
      fresh: 15, 
      repeat: 3,
      freshAmount: "₹9,50,000",
      repeatAmount: "₹8,50,000",
      borderColor: "#DEA513" 
    },
  ];

  return (
    <div 
      className="bg-white border border-[#F5F5F5]"
      style={{ width: '828px', borderRadius: '20px' }}
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
        <h2 className="text-base font-semibold text-gray-900">Collection Summary</h2>
      </div>
      
      {/* Cards Container */}
      <div 
        className="flex"
        style={{ 
          width: '100%',
          height: '193px',
          paddingTop: '20px',
          paddingRight: '15px',
          paddingBottom: '20px',
          paddingLeft: '15px',
          gap: '20px',
          justifyContent: 'space-between'
        }}
      >
        {summaryData.map((item, index) => (
          <SummaryCard key={index} {...item} />
        ))}
      </div>
    </div>
  );
};
