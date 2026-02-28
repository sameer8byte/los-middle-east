// 🔴 API INTEGRATION: Uncomment imports when backend is ready
// import { useState, useEffect } from "react";
// import { getCollectionExecutiveSummary } from "../services/dashboardApi";

import { HiOutlineFire } from "react-icons/hi";

// 🔴 API INTEGRATION: Type definition (currently inline, move to ../types/dashboard.types.ts)
interface VariableCardProps {
  label: string;
  value: number;
}

const VariableCard = ({ label, value }: VariableCardProps) => (
  <div 
    className="bg-[#F8FAFF] border border-[#F1F3F7] flex items-center gap-2"
    style={{ width: '250px', height: '50px', borderRadius: '12px', padding: '12px 15px' }}
  >
    <HiOutlineFire className="text-blue-600" size={20} />
    <span className="text-sm text-gray-700">{label}</span>
    <div className="ml-auto bg-blue-600 text-white px-3 py-1 rounded text-sm font-semibold">
      {value}
    </div>
  </div>
);

export const CollectionExecutiveSummary = () => {
  // 🔴 API INTEGRATION: Uncomment state management when backend is ready
  // const [data, setData] = useState<VariableCardProps[]>([]);
  // const [loading, setLoading] = useState(true);

  // 🔴 API INTEGRATION: Uncomment useEffect to fetch data from API
  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       setLoading(true);
  //       const response = await getCollectionExecutiveSummary();
  //       setData(response.variables); // API should return { variables: [...] }
  //     } catch (err) {
  //       console.error('Error fetching data:', err);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   fetchData();
  // }, []);

  // 🔴 API INTEGRATION: REMOVE this hardcoded data when API is ready
  // API Endpoint: GET /api/collection-executive-summary
  // Expected Response: { variables: [{ label: string, value: number }] }
  const variables = [
    { label: "Variable A", value: 20 },
    { label: "Variable B", value: 20 },
    { label: "Variable C", value: 20 },
  ];
  // 🔴 API INTEGRATION: Replace above with: const variables = data;

  return (
    <div 
      className="bg-white border border-[#F5F5F5]"
      style={{ width: '834px', height: '125px', borderRadius: '20px', gap: '10px' }}
    >
      {/* Header */}
      <div 
        className="bg-[#F5F5F5] px-4"
        style={{ 
          width: '834px',
          height: '48px',
          paddingTop: '8px',
          paddingBottom: '8px',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <h2 className="text-base font-semibold text-gray-900">Collection Executives Summary</h2>
      </div>
      
      {/* Content */}
      <div style={{ padding: '15px', display: 'flex', gap: '8px' }}>
        {variables.map((variable, index) => (
          <VariableCard key={index} {...variable} />
        ))}
      </div>
    </div>
  );
};
