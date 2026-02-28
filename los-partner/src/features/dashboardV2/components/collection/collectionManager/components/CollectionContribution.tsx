// 🔴 API INTEGRATION: Uncomment imports when backend is ready
// import { useState, useEffect } from "react";
import { useState } from "react";
// import { getCollectionContribution } from "../services/dashboardApi";

// 🔴 API INTEGRATION: Type definition (currently inline, move to ../types/dashboard.types.ts)
interface EmployeeRowProps {
  initials: string;
  name: string;
  collection: string;
  target?: string;
  achieved?: string;
  avgLoan?: string;
  gap?: string;
  percentage?: number;
  isExpanded: boolean;
  onToggle: () => void;
}

const EmployeeRow = ({ initials, name, collection, target, achieved, avgLoan, gap, percentage, isExpanded, onToggle }: EmployeeRowProps) => {
  const getPercentageBadgeColor = (val?: number) => {
    if (!val) return '#6B7280';
    if (val > 80) return '#10B981';
    if (val >= 70) return '#3B82F6';
    return '#EF4444';
  };

  return (
    <div className="border-b border-gray-100" style={{ background: '#F8FBFF' }}>
      <div className="flex items-center justify-between py-3 px-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-3">
          <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'linear-gradient(135deg, #FFE3F0 0%, #FFC3DD 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="text-xs font-semibold text-pink-700">{initials}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{name}</p>
            <p className="text-xs text-gray-500">Collection : {collection}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {percentage && (
            <div 
              style={{ 
                width: '70px', 
                height: '20px', 
                borderRadius: '10px',
                background: getPercentageBadgeColor(percentage),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span className="text-xs font-semibold text-white">{percentage}%</span>
            </div>
          )}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            <path d="M4 6L8 10L12 6" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-4 pb-3 flex gap-6 text-sm" style={{ background: '#F8FBFF' }}>
          <div>
            <p className="text-gray-600">Target : <span className="font-semibold text-gray-900">{target}</span></p>
          </div>
          <div>
            <p className="text-gray-600">Achieved : <span className="font-semibold text-gray-900">{achieved}</span></p>
          </div>
          <div>
            <p className="text-gray-600">Avg Loan Collected : <span className="font-semibold text-gray-900">{avgLoan}</span></p>
          </div>
          <div>
            <p className="text-gray-600">Gap : <span className="font-semibold text-gray-900">{gap}</span></p>
          </div>
        </div>
      )}
    </div>
  );
};

export const CollectionContribution = () => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // 🔴 API INTEGRATION: Uncomment state management when backend is ready
  // const [data, setData] = useState<Omit<EmployeeRowProps, 'isExpanded' | 'onToggle'>[]>([]);
  // const [loading, setLoading] = useState(true);

  // 🔴 API INTEGRATION: Uncomment useEffect to fetch data from API
  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       setLoading(true);
  //       const response = await getCollectionContribution();
  //       setData(response.employees);
  //     } catch (err) {
  //       console.error('Error fetching data:', err);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   fetchData();
  // }, []);

  // 🔴 API INTEGRATION: REMOVE this hardcoded data when API is ready
  // API Endpoint: GET /api/collection-contribution
  // Expected Response: { employees: [{ initials, name, collection, target, achieved, avgLoan, gap, percentage }] }
  const employees = [
    { initials: "MR", name: "Mahesh R | #1", collection: "₹7.2 L", target: "XX %", achieved: "95 %", avgLoan: "XX,XXX", gap: "Y/Y", percentage: 85 },
    { initials: "KT", name: "Kiran T | #2", collection: "₹6.8 L", target: "XX %", achieved: "90 %", avgLoan: "XX,XXX", gap: "Y/Y", percentage: 75 },
    { initials: "JL", name: "Jasmine L | #3", collection: "₹5.5 L", target: "XX %", achieved: "85 %", avgLoan: "XX,XXX", gap: "Y/Y", percentage: 55 },
    { initials: "TM", name: "Tariq M | #4", collection: "₹4.2 L", target: "XX %", achieved: "80 %", avgLoan: "XX,XXX", gap: "Y/Y", percentage: 72 },
    { initials: "AS", name: "Anita S | #5", collection: "₹3.9 L", target: "XX %", achieved: "78 %", avgLoan: "XX,XXX", gap: "Y/Y", percentage: 68 },
  ];
  // 🔴 API INTEGRATION: Replace above with: const employees = data;

  return (
    <div 
      className="bg-white border border-[#E5E7EB]"
      style={{ width: '544px', height: '384px', borderRadius: '20px', overflow: 'hidden' }}
    >
      <div className="bg-[#F5F5F5] px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Collection (%) Contribution (Across Executive)</h3>
      </div>
      <div style={{ height: 'calc(384px - 48px)', overflowY: 'auto' }}>
        {employees.map((emp, index) => (
          <EmployeeRow 
            key={index} 
            {...emp} 
            isExpanded={expandedIndex === index}
            onToggle={() => setExpandedIndex(expandedIndex === index ? null : index)}
          />
        ))}
      </div>
    </div>
  );
};
