// 🔴 UNCOMMENT BELOW WHEN API IS READY
// import { useState, useEffect } from "react";
// import { getPerformanceScore } from "../../services/dashboardApi";
// import type { PerformanceScoreData } from "../../types/dashboard.types";

import { useState } from "react";
import { HiOutlineFire } from "react-icons/hi";

export const PerformanceScore = () => {
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [dateFilter, setDateFilter] = useState("Today");

  // 🔴 REPLACE WITH API DATA
  const data = {
    reportingManager: "Rajesh K",
    score: 8.25,
    maxScore: 10,
    rank: 3,
    totalExecutives: 24,
    factors: [
      { name: "Factor 1", score: 8 },
      { name: "Factor 2", score: 7.5 },
      { name: "Factor 3", score: 6 },
      { name: "Factor 4", score: 5 },
    ],
    employees: [
      { name: "Top performer", score: 9.25, rank: 1 },
      { name: "You", score: 8.25, rank: 3 },
      { name: "Bottom Performer", score: 6.25, rank: 9 },
    ],
    feedback: [
      { title: "Lead Conversion", message: "Good follow-ups today. Maintain consistency with folder response and clarity.", author: "Rajesh K | Sales Manager", time: "2 mins ago" }
    ]
  };

  return (
    <div style={{ width: '544px', minHeight: '975px', borderRadius: '16px', border: '1px solid #E5E7EB', background: '#FFFFFF' }}>
      {/* Header */}
      <div style={{ width: '544px', height: '60px', padding: '10px 15px', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 12L22 12A10 10 0 1 1 7 3.34L12 12Z" fill="#8B4513" />
            <path d="M12 12L7 3.34A10 10 0 0 1 17 3.34L12 12Z" fill="#87CEEB" />
            <path d="M12 12L17 3.34A10 10 0 0 1 22 12L12 12Z" fill="#FDE047" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">My Performance</h2>
        </div>
      </div>

      {/* Reporting Manager */}
      <div style={{ width: '544px', height: '62px', padding: '15px', borderBottom: '1px solid #F0F0F7', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span className="text-sm text-gray-600">Reporting Manager:</span>
        <div className="flex items-center gap-2">
          <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'linear-gradient(135deg, #FFE3F0 0%, #FFC3DD 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="text-xs font-semibold text-pink-700">RK</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">{data.reportingManager}</span>
        </div>
      </div>

      {/* Performance Score Section */}
      <div style={{ width: '514px', margin: '24px 15px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Performance Heading */}
        <div style={{ width: '514px', height: '48px', padding: '15px', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', background: '#EAF2FF' }}>
          <h3 className="text-sm font-semibold text-gray-900">Performance Score</h3>
        </div>

        {/* Rating Card */}
        <div style={{ width: '484px', height: '76px', padding: '20px', borderRadius: '8px', background: 'linear-gradient(270deg, #2388FF 0%, #155299 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 15px' }}>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white">{data.score}</span>
            <span className="text-white/80">/ {data.maxScore}</span>
            <span className="text-sm text-white/70">Overall Rating</span>
          </div>
          <div className="bg-white px-3 py-1 rounded">
            <span className="text-sm font-semibold text-blue-600">Rank #{data.rank} of {data.totalExecutives}</span>
          </div>
        </div>

        {/* Factors */}
        <div className="grid grid-cols-2 gap-3" style={{ padding: '0 15px' }}>
          {data.factors.map((factor, i) => {
            const getScoreColor = (score: number) => {
              if (score >= 8) return { bg: 'bg-green-100', text: 'text-green-700' };
              if (score >= 7) return { bg: 'bg-yellow-100', text: 'text-yellow-700' };
              if (score >= 6) return { bg: 'bg-orange-100', text: 'text-orange-700' };
              return { bg: 'bg-red-100', text: 'text-red-700' };
            };
            const colors = getScoreColor(factor.score);
            
            return (
              <div key={i} style={{ width: '235px', height: '56px', padding: '15px', borderRadius: '12px', border: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="flex items-center gap-2">
                  <HiOutlineFire className="text-blue-600" size={18} />
                  <span className="text-sm text-gray-700">{factor.name}</span>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${colors.bg} ${colors.text} flex items-center gap-1`}>
                  {factor.score}
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1L10.163 5.38L15 6.12L11.5 9.545L12.326 14.36L8 12.09L3.674 14.36L4.5 9.545L1 6.12L5.837 5.38L8 1Z"/>
                  </svg>
                </span>
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-gray-300" style={{ margin: '8px 15px' }}></div>

        {/* Employee Performance */}
        <div style={{ width: '484px', margin: '0 15px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Employees</h3>
            <span className="text-sm text-gray-500">Performance Position</span>
          </div>
          {data.employees.map((emp, i) => {
            const barWidth = (emp.score / 10) * 100;
            
            return (
              <div key={i} style={{ width: '484px', height: '38px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Progress Bar Container */}
                <div style={{ flex: 1, height: '38px', position: 'relative', borderRadius: '4px', overflow: 'hidden', background: '#F9FAFB' }}>
                  {/* Filled Bar */}
                  <div style={{ 
                    width: `${barWidth}%`, 
                    height: '100%', 
                    background: 'linear-gradient(135deg, #E3EFFF 0%, #C3DDFF 100%)',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    borderTopRightRadius: '4px',
                    borderBottomRightRadius: '4px'
                  }} />
                  
                  {/* Content */}
                  <div style={{ position: 'relative', height: '100%', padding: '0 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="text-sm font-medium text-gray-900">{emp.name} | {emp.score}</span>
                    <span className="text-sm font-semibold text-gray-600">#{emp.rank}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Qualitative Feedback */}
      <div style={{ width: '514px', margin: '24px 15px 15px', borderRadius: '12px', border: '1px solid #F4F5FB' }}>
        {/* Feedback Heading */}
        <div style={{ width: '514px', height: '48px', padding: '15px', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', background: '#EAF2FF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="text-sm font-semibold text-gray-900">Qualitative Feedback</h3>
          <select 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="text-xs text-gray-600 bg-transparent border-none focus:outline-none cursor-pointer"
          >
            <option value="Today">Today</option>
            <option value="Yesterday">Yesterday</option>
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="Last 30 Days">Last 30 Days</option>
          </select>
        </div>

        {/* Feedback Content */}
        <div style={{ width: '514px', padding: '20px 15px', background: '#FFFFFF', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
          <div style={{ width: '484px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {data.feedback.map((fb, i) => (
              <div key={i}>
                <h4 className="text-sm font-medium text-gray-900 mb-1">{fb.title}</h4>
                <p className="text-xs text-gray-600 mb-2">{fb.message}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{fb.author}</span>
                  <span>•</span>
                  <span>{fb.time}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Navigation */}
          <button 
            onClick={() => setFeedbackPage(feedbackPage === 1 ? 2 : 1)}
            className="mt-4 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            {feedbackPage}/2
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
