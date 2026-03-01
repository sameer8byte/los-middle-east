import React, { useState } from 'react';
import { FiChevronDown, FiAward } from 'react-icons/fi';

interface Executive {
  name: string;
  initials: string;
  rank: number;
  score: number;
  collection: string;
  target?: string;
  achieved?: string;
  avgLoan?: string;
  gap?: string;
}

const TopExecutives: React.FC = () => {
  const [selectedTeam, setSelectedTeam] = useState('Sales Team');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // 🔴 API INTEGRATION: Replace mock data with API call
  // const [executives, setExecutives] = useState<Executive[]>([]);
  // const [loading, setLoading] = useState(true);
  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       setLoading(true);
  //       const response = await getTopPerformers(selectedTeam);
  //       setExecutives(response.data);
  //     } catch (error) {
  //       console.error('Error fetching top performers:', error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   fetchData();
  // }, [selectedTeam]);

  // 🔴 REMOVE MOCK DATA BELOW WHEN API IS READY
  const executives: Executive[] = [
    { name: 'Kiran T', initials: 'KT', rank: 1, score: 7.60, collection: '₹7.2 L', target: 'XX %', achieved: '95 %', avgLoan: 'XX,XXX', gap: 'Y/Y' },
    { name: 'Maya S', initials: 'MS', rank: 2, score: 7.45, collection: '₹6.8 L', target: 'XX %', achieved: '90 %', avgLoan: 'XX,XXX', gap: 'Y/Y' },
    { name: 'Amit N', initials: 'AN', rank: 3, score: 7.30, collection: '₹5.5 L', target: 'XX %', achieved: '85 %', avgLoan: 'XX,XXX', gap: 'Y/Y' },
    { name: 'Raj A', initials: 'RA', rank: 4, score: 7.25, collection: '₹4.2 L', target: 'XX %', achieved: '80 %', avgLoan: 'XX,XXX', gap: 'Y/Y' },
    { name: 'Lina I', initials: 'LI', rank: 5, score: 7.20, collection: '₹3.9 L', target: 'XX %', achieved: '78 %', avgLoan: 'XX,XXX', gap: 'Y/Y' },
  ];

  return (
    <div 
      className="bg-white border border-[#E5E7EB]"
      style={{ width: '544px', height: '384px', borderRadius: '20px', overflow: 'hidden' }}
    >
      <div className="bg-[#F5F5F5] px-4 py-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Top 5 Performers (Executives)</h3>
        <div className="relative">
          <select 
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>Sales Team</option>
            <option>Credit Team</option>
            <option>Collection Team</option>
          </select>
          <FiChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>
      </div>

      <div style={{ height: 'calc(384px - 48px)', overflowY: 'auto' }}>
        {executives.map((exec, index) => (
          <div key={index} className="border-b border-gray-100" style={{ background: '#F8FBFF' }}>
            <div className="flex items-center justify-between py-3 px-4 cursor-pointer" onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}>
              <div className="flex items-center gap-3">
                <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#FFC8F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="text-xs font-semibold" style={{ color: '#1F2937' }}>{exec.initials}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{exec.name}</p>
                  <p className="text-xs text-gray-500">Collection : {exec.collection}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-orange-50 px-2 py-1 rounded">
                  <FiAward size={14} className="text-orange-500" />
                  <span className="text-xs font-semibold text-orange-700">Rank #{exec.rank}</span>
                </div>
                <div 
                  style={{ 
                    width: '70px', 
                    height: '24px', 
                    borderRadius: '6px',
                    background: 'linear-gradient(270deg, #2388FF 0%, #155299 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <span className="text-xs font-semibold text-white">{exec.score}</span>
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={`transform transition-transform ${expandedIndex === index ? 'rotate-180' : ''}`}>
                  <path d="M4 6L8 10L12 6" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            
            {expandedIndex === index && (
              <div className="px-4 pb-3 flex gap-6 text-sm" style={{ background: '#F8FBFF' }}>
                <div>
                  <p className="text-gray-600">Target : <span className="font-semibold text-gray-900">{exec.target}</span></p>
                </div>
                <div>
                  <p className="text-gray-600">Achieved : <span className="font-semibold text-gray-900">{exec.achieved}</span></p>
                </div>
                <div>
                  <p className="text-gray-600">Avg Loan Collected : <span className="font-semibold text-gray-900">{exec.avgLoan}</span></p>
                </div>
                <div>
                  <p className="text-gray-600">Gap : <span className="font-semibold text-gray-900">{exec.gap}</span></p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopExecutives;
