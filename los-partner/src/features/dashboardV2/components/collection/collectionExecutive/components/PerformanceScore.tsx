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
    <div className="w-full max-w-[420px] rounded-2xl border border-gray-200 bg-white">
      {/* Header */}
      <div className="w-full h-[60px] px-4 py-2.5 rounded-t-2xl bg-gray-100 flex items-center justify-between">
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
      <div className="w-full h-[62px] px-4 border-b border-gray-200 flex items-center gap-3">
        <span className="text-sm text-gray-600">Reporting Manager:</span>
        <div className="flex items-center gap-2">
          <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'linear-gradient(135deg, #FFE3F0 0%, #FFC3DD 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="text-xs font-semibold text-pink-700">RK</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">{data.reportingManager}</span>
        </div>
      </div>

      {/* Performance Score Section */}
      <div className="w-full px-4 mt-6 flex flex-col gap-4">
        {/* Performance Heading */}
        <div className="w-full h-12 px-4 rounded-t-xl bg-blue-50">
          <h3 className="text-sm font-semibold text-gray-900 leading-[48px]">Performance Score</h3>
        </div>

        {/* Rating Card */}
        <div className="w-full h-[76px] px-5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-800 flex justify-between items-center">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.factors.map((factor, i) => {
            const getScoreColor = (score: number) => {
              if (score >= 8) return { bg: 'bg-green-100', text: 'text-green-700' };
              if (score >= 7) return { bg: 'bg-yellow-100', text: 'text-yellow-700' };
              if (score >= 6) return { bg: 'bg-orange-100', text: 'text-orange-700' };
              return { bg: 'bg-red-100', text: 'text-red-700' };
            };
            const colors = getScoreColor(factor.score);
            
            return (
              <div key={i} className="w-full h-14 px-4 rounded-xl border border-gray-200 flex justify-between items-center">
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
        <div className="border-t border-dashed border-gray-300 my-2"></div>

        {/* Employee Performance */}
        <div className="w-full flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Employees</h3>
            <span className="text-sm text-gray-500">Performance Position</span>
          </div>
          {data.employees.map((emp, i) => {
            const barWidth = (emp.score / 10) * 100;
            
            return (
              <div key={i} className="w-full h-[38px] flex items-center gap-2.5">
                {/* Progress Bar Container */}
                <div className="flex-1 h-[38px] relative rounded overflow-hidden bg-gray-50">
                  {/* Filled Bar */}
                  <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-100 to-blue-200 rounded-r" style={{ width: `${barWidth}%` }} />
                  
                  {/* Content */}
                  <div className="relative h-full px-3.5 flex items-center justify-between">
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
      <div className="w-full px-4 mt-6 mb-4 rounded-xl border border-gray-100">
        {/* Feedback Heading */}
        <div className="w-full h-12 px-4 rounded-t-xl bg-blue-50 flex justify-between items-center">
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
        <div className="w-full p-5 bg-white rounded-b-xl">
          <div className="w-full flex flex-col gap-4">
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
