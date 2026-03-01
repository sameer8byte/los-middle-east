// 🔴 API INTEGRATION: Uncomment imports when backend is ready
// import { useState, useEffect } from "react";
import { useState } from "react";
import { FaChartPie } from "react-icons/fa";
import { AddRatingModal } from "./AddRatingModal";
// import { getTeamPerformance } from "../services/dashboardApi";

// 🔴 API INTEGRATION: Type definition (currently inline, move to ../types/dashboard.types.ts)
interface TeamMemberProps {
  initials: string;
  name: string;
  role: string;
  rank: number;
  score: number;
  isExpanded: boolean;
  onToggle: () => void;
  metrics?: {
    leadsWorked: number;
    freshConversion: number;
    repeatConversion: number;
    productivity: number;
  };
}

const getMedalIcon = (rank: number) => {
  if (rank === 1) return <span className="text-yellow-500">🥇</span>;
  if (rank === 2) return <span className="text-gray-400">🥈</span>;
  if (rank === 3) return <span className="text-orange-600">🥉</span>;
  return <span className="text-yellow-500">🏅</span>;
};

const TeamMemberCard = ({ initials, name, role, rank, score, isExpanded, onToggle, metrics }: TeamMemberProps) => {
  const [feedbackFilter, setFeedbackFilter] = useState("Today");
  
  const getScoreColor = (val: number) => {
    if (val >= 8) return { bg: 'bg-green-100', text: 'text-green-700' };
    if (val >= 7) return { bg: 'bg-yellow-100', text: 'text-yellow-700' };
    if (val >= 6) return { bg: 'bg-orange-100', text: 'text-orange-700' };
    return { bg: 'bg-red-100', text: 'text-red-700' };
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="p-3 flex items-center justify-between cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-3">
          <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'linear-gradient(135deg, #FFE3F0 0%, #FFC3DD 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="text-xs font-semibold text-pink-700">{initials}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{name}</p>
            <p className="text-xs text-gray-500">{role}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border border-gray-300 rounded-lg px-2 py-1" style={{ width: '99px', height: '32px' }}>
            {getMedalIcon(rank)}
            <span className="text-xs text-gray-700">Rank #{rank}</span>
          </div>
          <div className="text-white px-3 py-1 rounded text-xs font-semibold" style={{ background: 'linear-gradient(270deg, #2388FF 0%, #155299 100%)' }}>
            {score}
          </div>
          <button>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
              <path d="M4 6L8 10L12 6" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {isExpanded && metrics && (
        <div className="bg-[#FBFCFF] border-t border-[#E3EFFF] rounded-lg p-4 w-full">
          {/* Metrics */}
          <div className="flex flex-col gap-2 mb-4">
            {[
              { label: 'Leads worked', value: metrics.leadsWorked },
              { label: 'Fresh conversion', value: metrics.freshConversion },
              { label: 'Repeat conversion', value: metrics.repeatConversion },
              { label: 'Productivity', value: metrics.productivity }
            ].map((metric, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <svg width="6" height="6" viewBox="0 0 6 6" fill="none">
                    <circle cx="3" cy="3" r="3" fill="#3B82F6"/>
                  </svg>
                  <span>{metric.label}</span>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${getScoreColor(metric.value).bg} ${getScoreColor(metric.value).text} flex items-center gap-1`}>
                  {metric.value}
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1L10.163 5.38L15 6.12L11.5 9.545L12.326 14.36L8 12.09L3.674 14.36L4.5 9.545L1 6.12L5.837 5.38L8 1Z"/>
                  </svg>
                </span>
              </div>
            ))}
          </div>

          {/* Qualitative Feedback Section */}
          <div className="w-full max-w-[484px] h-[247px] rounded-xl border border-gray-100 mb-4">
            <div className="w-full h-12 px-4 rounded-t-xl bg-blue-50 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-gray-900">Qualitative Feedback</h3>
              <select 
                value={feedbackFilter}
                onChange={(e) => setFeedbackFilter(e.target.value)}
                className="text-xs text-gray-600 bg-transparent border border-gray-300 rounded px-2 py-1 focus:outline-none cursor-pointer"
              >
                <option value="Today">Today</option>
                <option value="Yesterday">Yesterday</option>
                <option value="Tomorrow">Tomorrow</option>
                <option value="Last 30 Days">Last 30 Days</option>
                <option value="Last Month">Last Month</option>
              </select>
            </div>

            <div className="p-4 bg-white rounded-b-xl">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-1">Lead Conversion</h4>
                <p className="text-xs text-gray-600 mb-2">Good follow-ups today. Improve hot lead conversion with faster response and clarity.</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div style={{ width: '24px', height: '24px', borderRadius: '4px', background: 'linear-gradient(135deg, #FFE3F0 0%, #FFC3DD 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="text-xs font-semibold text-pink-700">RK</span>
                    </div>
                    <span className="text-xs text-gray-600">Rajesh K | Sales Manager</span>
                  </div>
                  <span className="text-xs text-gray-400">2 mins ago</span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button className="text-blue-600 text-xs flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    1/2
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const TeamPerformance = () => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);

  // 🔴 API INTEGRATION: Uncomment state management when backend is ready
  // const [data, setData] = useState<TeamMemberProps[]>([]);
  // const [loading, setLoading] = useState(true);
  // const [reportingManager, setReportingManager] = useState({ initials: "", name: "" });

  // 🔴 API INTEGRATION: Uncomment useEffect to fetch data from API
  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       setLoading(true);
  //       const response = await getTeamPerformance();
  //       setData(response.teamMembers);
  //       setReportingManager(response.reportingManager);
  //     } catch (err) {
  //       console.error('Error fetching data:', err);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   fetchData();
  // }, []);

  // 🔴 API INTEGRATION: REMOVE this hardcoded data when API is ready
  // API Endpoint: GET /api/team-performance
  // Expected Response: { teamMembers: [...], reportingManager: { initials, name, role } }
  const allMembers = [
    { initials: "MR", name: "Mahesh R", role: "Credit Executive", rank: 3, score: 8.25, metrics: { leadsWorked: 8, freshConversion: 7.5, repeatConversion: 6, productivity: 5 } },
    { initials: "KT", name: "Kiran T", role: "Credit Executive", rank: 6, score: 7.60, metrics: { leadsWorked: 7, freshConversion: 7, repeatConversion: 6, productivity: 6 } },
    { initials: "JL", name: "Jasmine L", role: "Credit Executive", rank: 7, score: 7.45, metrics: { leadsWorked: 7, freshConversion: 6, repeatConversion: 7, productivity: 7 } },
    { initials: "TM", name: "Tariq M", role: "Credit Executive", rank: 8, score: 7.30, metrics: { leadsWorked: 6, freshConversion: 7, repeatConversion: 7, productivity: 6 } },
    { initials: "AS", name: "Anita S", role: "Credit Executive", rank: 9, score: 7.20, metrics: { leadsWorked: 6, freshConversion: 6, repeatConversion: 7, productivity: 7 } },
    { initials: "RK", name: "Rajesh K", role: "Credit Manager", rank: 1, score: 9.10, metrics: { leadsWorked: 9, freshConversion: 9, repeatConversion: 8, productivity: 9 } },
  ];
  // 🔴 API INTEGRATION: Replace above with: const allMembers = data;

  return (
    <div className="w-full h-[1007px] rounded-2xl border border-gray-200 bg-white flex flex-col">
      {/* Header */}
      <div className="w-full h-[60px] px-4 py-2.5 rounded-t-2xl bg-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FaChartPie className="text-blue-600" size={20} />
          <h2 className="text-lg font-semibold text-gray-900">Team Performance</h2>
        </div>
        <button 
          onClick={() => setIsRatingModalOpen(true)}
          className="bg-white border border-gray-300 rounded px-3 py-1 text-sm hover:bg-gray-50"
        >
          Add Rating +
        </button>
      </div>

      {/* Reporting Manager */}
      <div className="w-full h-[62px] px-4 border-b border-gray-200 flex items-center gap-3">
        <span className="text-sm text-gray-600">Reporting Manager:</span>
        <div className="flex items-center gap-2">
          <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'linear-gradient(135deg, #FFE3F0 0%, #FFC3DD 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="text-xs font-semibold text-pink-700">RK</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">Rajesh K | Credit Manager</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by Executive Name"
            className="w-full border border-gray-300 rounded-lg px-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg className="absolute left-3 top-2.5" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="#9CA3AF" strokeWidth="2"/>
            <path d="M11 11L14 14" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      {/* Team Members List - Scrollable */}
      <div className="px-4 pb-4 flex-1 overflow-y-auto flex flex-col gap-3">
        {allMembers.map((member, index) => (
          <TeamMemberCard 
            key={index} 
            {...member} 
            isExpanded={expandedIndex === index}
            onToggle={() => setExpandedIndex(expandedIndex === index ? null : index)}
          />
        ))}
      </div>

      {/* Add Rating Modal */}
      <AddRatingModal 
        isOpen={isRatingModalOpen} 
        onClose={() => setIsRatingModalOpen(false)} 
      />
    </div>
  );
};
