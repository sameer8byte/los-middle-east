import React, { useState } from 'react';
import { FiChevronDown } from 'react-icons/fi';

const Manager: React.FC = () => {
  const [selectedTeam, setSelectedTeam] = useState('Sales');

  // 🔴 API INTEGRATION: Replace mock data with API call
  // const [managers, setManagers] = useState<{ name: string; score: number; highlight?: boolean }[]>([]);
  // const [loading, setLoading] = useState(true);
  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       setLoading(true);
  //       const response = await getManagerPerformance(selectedTeam);
  //       setManagers(response.data);
  //     } catch (error) {
  //       console.error('Error fetching manager performance:', error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   fetchData();
  // }, [selectedTeam]);

  // 🔴 REMOVE MOCK DATA BELOW WHEN API IS READY
  const managers: { name: string; score: number; highlight?: boolean }[] = [
    { name: 'MANAGER A', score: 8.5, highlight: true },
    { name: 'MANAGER B', score: 5.2 },
    { name: 'MANAGER C', score: 6.0 },
    { name: 'MANAGER D', score: 9.0 },
    { name: 'MANAGER E', score: 9.2 },
    { name: 'MANAGER F', score: 9.0 },
    { name: 'MANAGER G', score: 9.3 },
    { name: 'MANAGER H', score: 6.5 },
  ];

  const maxScore = 10;

  return (
    <div 
      className="bg-white border border-[#E5E7EB]"
      style={{ width: '662px', height: '384px', borderRadius: '20px', overflow: 'hidden' }}
    >
      <div className="bg-[#F5F5F5] px-4 py-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Manager Performance</h3>
        <div className="relative">
          <select 
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>Sales</option>
            <option>Credit</option>
            <option>Collection</option>
          </select>
          <FiChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Bar Chart */}
      <div className="relative p-6" style={{ height: 'calc(384px - 48px)' }}>
        {/* Y-axis labels */}
        <div className="absolute left-2 top-6 bottom-12 flex flex-col justify-between text-xs text-gray-500">
          <span>10</span>
          <span>8</span>
          <span>6</span>
          <span>4</span>
          <span>2</span>
          <span>0</span>
        </div>

        {/* Chart area */}
        <div className="ml-8 h-full flex items-end justify-between pb-8" style={{ gap: '4px' }}>
          {managers.map((manager, idx) => (
            <div key={idx} className="flex flex-col items-center" style={{ width: '30px', gap: '8px' }}>
              {/* Bar */}
              <div className="relative flex flex-col items-center justify-end" style={{ height: '220px', width: '30px' }}>
                {manager.highlight && (
                  <div 
                    className="absolute bg-gray-900 text-white px-2 py-1 rounded flex items-center gap-1 text-xs font-semibold whitespace-nowrap"
                    style={{ bottom: `${(manager.score / maxScore) * 100}%`, marginBottom: '4px' }}
                  >
                    <span>⭐</span>
                    <span>{manager.score}</span>
                  </div>
                )}
                <div 
                  className="bg-blue-600 rounded-t transition-all"
                  style={{ 
                    width: '30px',
                    height: `${(manager.score / maxScore) * 100}%`,
                    minHeight: '20px'
                  }}
                />
              </div>
              {/* Label */}
              <span className="text-xs text-gray-600 whitespace-nowrap" style={{ fontSize: '9px' }}>{manager.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Manager;
