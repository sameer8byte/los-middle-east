// 🔴 STEP 1: UNCOMMENT THESE IMPORTS WHEN API IS READY
// import { useState, useEffect } from "react";
// import { getCollectionExecutiveSummary } from "../services/dashboardApi";
// import type { VariableData } from "../types/dashboard.types";

import { HiOutlineFire } from "react-icons/hi";

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
  // 🔴 STEP 2: UNCOMMENT STATE MANAGEMENT WHEN API IS READY
  // const [data, setData] = useState<VariableData[]>([]);
  // const [loading, setLoading] = useState(true);
  // const [error, setError] = useState<string | null>(null);

  // 🔴 STEP 3: UNCOMMENT useEffect TO FETCH DATA FROM API
  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       setLoading(true);
  //       const response = await getCollectionExecutiveSummary();
  //       setData(response.variables);
  //     } catch (err) {
  //       setError(err instanceof Error ? err.message : 'Failed to fetch data');
  //       console.error('Error fetching collection executive summary:', err);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   fetchData();
  // }, []);

  // 🔴 STEP 4: UNCOMMENT LOADING/ERROR STATES
  // if (loading) {
  //   return (
  //     <div style={{ width: '834px', height: '125px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
  //       <span className="text-gray-600">Loading...</span>
  //     </div>
  //   );
  // }

  // if (error) {
  //   return (
  //     <div style={{ width: '834px', height: '125px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
  //       <span className="text-red-600">Error: {error}</span>
  //     </div>
  //   );
  // }

  // 🔴 STEP 5: REMOVE THIS HARDCODED DATA WHEN API IS READY
  // This is mock data for development/testing purposes
  const variables = [
    { label: "Variable A", value: 20 },
    { label: "Variable B", value: 20 },
    { label: "Variable C", value: 20 },
  ];
  // 🔴 REPLACE ABOVE WITH: const variables = data;

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

// 🔴 API INTEGRATION NOTES:
// 
// API Endpoint: GET /api/collection-executive-summary
// 
// Expected Response Format:
// {
//   "variables": [
//     { "label": "Variable A", "value": 20 },
//     { "label": "Variable B", "value": 20 },
//     { "label": "Variable C", "value": 20 }
//   ]
// }
//
// Type Definition (create in ../types/dashboard.types.ts):
// export interface VariableData {
//   label: string;
//   value: number;
// }
//
// Service Function (create in ../services/dashboardApi.ts):
// export const getCollectionExecutiveSummary = async () => {
//   const response = await fetch('/api/collection-executive-summary');
//   if (!response.ok) throw new Error('Failed to fetch');
//   return response.json();
// };
