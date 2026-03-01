import React from 'react';
import { FiStar } from 'react-icons/fi';

const SystemAttribute: React.FC = () => {
  // 🔴 API INTEGRATION: Replace mock data with API call
  // const [data, setData] = useState<{ categories: any[], overallRating: number } | null>(null);
  // const [loading, setLoading] = useState(true);
  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       setLoading(true);
  //       const response = await getSystemAttributes();
  //       setData(response.data);
  //     } catch (error) {
  //       console.error('Error fetching system attributes:', error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   fetchData();
  // }, []);

  // 🔴 REMOVE MOCK DATA BELOW WHEN API IS READY
  const categories = [
    { name: 'Sales', rating: 7.8, color: '#2563EB', percentage: 78 },
    { name: 'Credit', rating: 7.2, color: '#60A5FA', percentage: 72 },
    { name: 'Collection', rating: 6.8, color: '#93C5FD', percentage: 68 },
  ];

  const overallRating = 7.2;

  return (
    <div 
      className="bg-white border border-[#E5E7EB]"
      style={{ width: '402px', height: '384px', borderRadius: '20px', overflow: 'hidden' }}
    >
      <div className="bg-[#F5F5F5] px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">System Generated Attributes (Metric)</h3>
      </div>
      
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        {/* Donut Chart - Increased size */}
        <div style={{ position: 'relative', width: '220px', height: '220px' }}>
          <svg width="220" height="220" viewBox="0 0 220 220">
            {/* Sales - Blue */}
            <circle
              cx="110"
              cy="110"
              r="85"
              fill="none"
              stroke="#2563EB"
              strokeWidth="40"
              strokeDasharray={`${(categories[0].percentage / 100) * 534} 534`}
              strokeDashoffset="0"
              transform="rotate(-90 110 110)"
            />
            {/* Credit - Light Blue */}
            <circle
              cx="110"
              cy="110"
              r="85"
              fill="none"
              stroke="#60A5FA"
              strokeWidth="40"
              strokeDasharray={`${(categories[1].percentage / 100) * 534} 534`}
              strokeDashoffset={`-${(categories[0].percentage / 100) * 534}`}
              transform="rotate(-90 110 110)"
            />
            {/* Collection - Lightest Blue */}
            <circle
              cx="110"
              cy="110"
              r="85"
              fill="none"
              stroke="#93C5FD"
              strokeWidth="40"
              strokeDasharray={`${(categories[2].percentage / 100) * 534} 534`}
              strokeDashoffset={`-${((categories[0].percentage + categories[1].percentage) / 100) * 534}`}
              transform="rotate(-90 110 110)"
            />
          </svg>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
            <div className="flex items-center justify-center gap-1">
              <span className="text-3xl font-bold text-gray-900">{overallRating}</span>
              <FiStar size={18} fill="#F59E0B" stroke="#F59E0B" />
            </div>
            <div className="text-xs text-gray-600">Out Of 10</div>
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

export default SystemAttribute;
