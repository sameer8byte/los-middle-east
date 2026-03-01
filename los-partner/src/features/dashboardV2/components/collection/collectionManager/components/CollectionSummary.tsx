// 🔴 API INTEGRATION: Uncomment imports when backend is ready
// import { useState, useEffect } from "react";
// import { getCollectionSummary } from "../services/dashboardApi";

// 🔴 API INTEGRATION: Type definition (currently inline, move to ../types/dashboard.types.ts)
interface SummaryCardProps {
  amount: string;
  title: string;
  percentage?: string;
  borderColor: string;
}

const SummaryCard = ({ amount, title, percentage, borderColor }: SummaryCardProps) => (
  <div 
    className="bg-white flex flex-col justify-between relative overflow-hidden"
    style={{ height: '110px', padding: '16px', borderRadius: '8px', border: '1px solid #E5E7EB', flex: 1, minWidth: '180px' }}
  >
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
        <span className="text-2xl font-bold text-gray-900">{amount}</span>
        {percentage && (
          <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded">
            {percentage}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-600">{title}</p>
    </div>
  </div>
);

export const CollectionSummary = () => {
  // 🔴 API INTEGRATION: Uncomment state management when backend is ready
  // const [data, setData] = useState<SummaryCardProps[]>([]);
  // const [loading, setLoading] = useState(true);

  // 🔴 API INTEGRATION: Uncomment useEffect to fetch data from API
  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       setLoading(true);
  //       const response = await getCollectionSummary();
  //       setData(response.summary); // API should return { summary: [...] }
  //     } catch (err) {
  //       console.error('Error fetching data:', err);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   fetchData();
  // }, []);

  // 🔴 API INTEGRATION: REMOVE this hardcoded data when API is ready
  // API Endpoint: GET /api/collection-summary
  // Expected Response: { summary: [{ amount, title, percentage? }] }
  // Note: borderColor values are UI constants, keep them hardcoded
  const summaryData = [
    { amount: "₹4 Cr", title: "Total Loan Due Amount", borderColor: "#3B82F6" },
    { amount: "₹3 Cr", title: "Total Loan Amount Collected", percentage: "75 %", borderColor: "#10B981" },
    { amount: "₹1 Cr", title: "Total Amount Outstanding", borderColor: "#F59E0B" },
  ];
  // 🔴 API INTEGRATION: Replace above with: const summaryData = data.map((item, idx) => ({ ...item, borderColor: colors[idx] }));

  return (
    <div 
      className="bg-white border border-[#F5F5F5] w-full"
      style={{ borderRadius: '20px' }}
    >
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
        <h2 className="text-base font-semibold text-gray-900">Collection Summary (Across Executive)</h2>
      </div>
      
      <div 
        className="flex"
        style={{ 
          width: '100%',
          padding: '18px 15px',
          gap: '15px',
          flexWrap: 'wrap'
        }}
      >
        {summaryData.map((item, index) => (
          <SummaryCard key={index} {...item} />
        ))}
      </div>
    </div>
  );
};
