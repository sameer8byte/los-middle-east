import React, { useState } from 'react';
import { FiAward, FiStar, FiChevronDown, FiChevronUp } from 'react-icons/fi';

interface Executive {
  name: string;
  role: string;
  attributes: number[];
  rank: number;
  score: number;
}

interface ManagerData {
  name: string;
  rank: number;
  score: number;
  teamAvgScore: number;
  executives: Executive[];
}

const CollectionPerformance: React.FC = () => {
  const [expandedManager, setExpandedManager] = useState<string | null>(null);

  // 🔴 API INTEGRATION: Replace mock data with API call
  // const [managers, setManagers] = useState<ManagerData[]>([]);
  // const [loading, setLoading] = useState(true);
  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       setLoading(true);
  //       const response = await getCollectionPerformance();
  //       setManagers(response.data);
  //     } catch (error) {
  //       console.error('Error fetching collection performance:', error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   fetchData();
  // }, []);

  // 🔴 REMOVE MOCK DATA BELOW WHEN API IS READY
  const managers: ManagerData[] = [
    {
      name: 'Manager E',
      rank: 1,
      score: 9.2,
      teamAvgScore: 8.1,
      executives: [
        { name: 'David P', role: 'EXEC', attributes: [9, 9, 8, 9], rank: 1, score: 8.8 },
        { name: 'Emma R', role: 'EXEC', attributes: [8, 8, 9, 8], rank: 4, score: 8.2 },
      ],
    },
    {
      name: 'Manager F',
      rank: 2,
      score: 8.7,
      teamAvgScore: 7.9,
      executives: [],
    },
  ];

  const toggleManager = (managerName: string) => {
    setExpandedManager(expandedManager === managerName ? null : managerName);
  };

  return (
    <div className="space-y-4">
      {/* All Manager Headers */}
      {managers.map((manager) => (
        <div key={manager.name} className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-gray-900">{manager.name}</span>
              <div className="flex items-center gap-1 bg-orange-50 px-2 py-1 rounded">
                <FiAward size={14} className="text-orange-500" />
                <span className="text-xs font-semibold text-orange-700">Rank #{manager.rank}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Overall Score (Manager)</span>
                <div className="flex items-center gap-1 bg-green-100 px-3 py-1 rounded-lg">
                  <span className="font-bold text-green-700">{manager.score}</span>
                  <FiStar size={14} fill="#15803D" stroke="#15803D" />
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Team Avg Score</span>
                <div className="flex items-center gap-1 bg-blue-600 px-3 py-1 rounded-lg">
                  <span className="font-bold text-white">{manager.teamAvgScore}</span>
                  <FiStar size={14} fill="#FFFFFF" stroke="#FFFFFF" />
                </div>
              </div>
            </div>
            <button
              onClick={() => toggleManager(manager.name)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              View Executive Performance
              {expandedManager === manager.name ? (
                <FiChevronUp size={16} className="text-blue-600" />
              ) : (
                <FiChevronDown size={16} />
              )}
            </button>
          </div>
        </div>
      ))}

      {/* Executive Table - Shows below all managers */}
      {expandedManager && managers.find(m => m.name === expandedManager)?.executives.length! > 0 && (
        <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Executive Performance Summary - {expandedManager}</h4>
          <div className="bg-white rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Sr No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Employee & Role</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Attribute 1</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Attribute 2</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Attribute 3</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Attribute 4</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Rank</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Score</th>
                </tr>
              </thead>
              <tbody>
                {managers.find(m => m.name === expandedManager)?.executives.map((exec, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{exec.name}</span>
                        <span className="text-xs font-semibold text-purple-600">• {exec.role}</span>
                      </div>
                    </td>
                    {exec.attributes.map((attr, attrIdx) => (
                      <td key={attrIdx} className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-sm font-semibold text-gray-900">{attr}</span>
                          <FiStar size={12} fill="#FCD34D" stroke="#FCD34D" />
                        </div>
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1 bg-orange-50 px-2 py-1 rounded">
                        <FiAward size={12} className="text-orange-500" />
                        <span className="text-xs font-semibold text-orange-700">Rank #{exec.rank}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1 bg-yellow-100 px-3 py-1 rounded-lg">
                        <span className="text-sm font-bold text-gray-900">{exec.score}</span>
                        <FiStar size={12} fill="#F59E0B" stroke="#F59E0B" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionPerformance;
