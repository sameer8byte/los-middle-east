import React from 'react';
import { FiStar, FiUser } from 'react-icons/fi';

const EmployeeAttribute: React.FC = () => {
  // 🔴 API INTEGRATION: Replace mock data with API call
  // const [data, setData] = useState<{ categories: any[], overallRating: number } | null>(null);
  // const [loading, setLoading] = useState(true);
  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       setLoading(true);
  //       const response = await getEmployeeAttributes();
  //       setData(response.data);
  //     } catch (error) {
  //       console.error('Error fetching employee attributes:', error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   fetchData();
  // }, []);

  // 🔴 REMOVE MOCK DATA BELOW WHEN API IS READY
  const categories = [
    { name: 'Sales', rating: 8.2, color: '#2563EB', percentage: 82 },
    { name: 'Credit', rating: 7.5, color: '#60A5FA', percentage: 75 },
    { name: 'Collection', rating: 6.8, color: '#93C5FD', percentage: 68 },
  ];

  const overallRating = 7.45;

  return (
    <div 
      className="bg-white border border-[#E5E7EB]"
      style={{ width: '402px', height: '384px', borderRadius: '20px', overflow: 'hidden' }}
    >
      <div className="bg-[#F5F5F5] px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Employee Attributes (Metrics)</h3>
      </div>
      
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        {/* Concentric Circles - Increased size */}
        <div style={{ position: 'relative', width: '220px', height: '220px' }}>
          <svg width="220" height="220" viewBox="0 0 220 220">
            {/* Outer circle - Sales */}
            <circle
              cx="110"
              cy="110"
              r="92"
              fill="none"
              stroke="#DBEAFE"
              strokeWidth="12"
            />
            <circle
              cx="110"
              cy="110"
              r="92"
              fill="none"
              stroke="#2563EB"
              strokeWidth="12"
              strokeDasharray={`${(categories[0].percentage / 100) * 578} 578`}
              strokeDashoffset="0"
              transform="rotate(-90 110 110)"
              strokeLinecap="round"
            />
            {/* Middle circle - Credit */}
            <circle
              cx="110"
              cy="110"
              r="70"
              fill="none"
              stroke="#DBEAFE"
              strokeWidth="12"
            />
            <circle
              cx="110"
              cy="110"
              r="70"
              fill="none"
              stroke="#60A5FA"
              strokeWidth="12"
              strokeDasharray={`${(categories[1].percentage / 100) * 440} 440`}
              strokeDashoffset="0"
              transform="rotate(-90 110 110)"
              strokeLinecap="round"
            />
            {/* Inner circle - Collection */}
            <circle
              cx="110"
              cy="110"
              r="48"
              fill="none"
              stroke="#DBEAFE"
              strokeWidth="12"
            />
            <circle
              cx="110"
              cy="110"
              r="48"
              fill="none"
              stroke="#93C5FD"
              strokeWidth="12"
              strokeDasharray={`${(categories[2].percentage / 100) * 302} 302`}
              strokeDashoffset="0"
              transform="rotate(-90 110 110)"
              strokeLinecap="round"
            />
          </svg>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
            <FiUser size={18} className="text-gray-400 mb-1 mx-auto" />
            <div className="flex items-center justify-center gap-1">
              <span className="text-xl font-bold text-gray-900">{overallRating}</span>
              <FiStar size={12} fill="#F59E0B" stroke="#F59E0B" />
            </div>
            <div className="text-xs text-gray-600">Out of 10</div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-gray-300 w-full"></div>

        {/* Legend */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-around', textAlign: 'center', paddingTop: '4px' }}>
          {categories.map((cat, idx) => (
            <div key={idx}>
              <div className="flex items-center justify-center gap-1 mb-1">
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat.color }}></div>
                <span className="text-xs text-gray-600">{cat.name}</span>
              </div>
              <p className="text-xs font-bold text-gray-900">{cat.rating} / 10</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmployeeAttribute;
