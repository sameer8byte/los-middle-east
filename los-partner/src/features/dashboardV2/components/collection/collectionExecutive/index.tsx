import { useState } from "react";
import { CollectionOverview } from "./components/CollectionOverview";
import { CollectionSummary } from "./components/CollectionSummary";
import { Application } from "./components/Application";
import { PerformanceScore } from "./components/PerformanceScore";
import { PerformanceSummary } from "./components/PerformanceSummary";

export const CollectionExecutiveDashboard = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  return (
    <div className="min-h-screen bg-gray-50 p-2">
      <div className="w-full mx-auto @container">
        {/* Main Layout */}
        <div className="flex gap-2">
          {/* Left Section */}
          <div className="flex-1 min-w-0">
            {/* Dashboard Header with Filters */}
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-xs text-gray-500">Overview of Collection</p>
              </div>
              
              {/* Date Filters */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="flex items-center gap-1">
                  <label className="text-xs text-gray-600 whitespace-nowrap">Start:</label>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 w-28"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <label className="text-xs text-gray-600 whitespace-nowrap">End:</label>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 w-28"
                  />
                </div>
              </div>
            </div>

            {/* Content Sections */}
            <div className="flex flex-col gap-3">
              <CollectionOverview />
              <CollectionSummary />
              <Application />
            </div>
          </div>

          {/* Right Section - Performance Score */}
          <div className="w-[420px] flex-shrink-0">
            <PerformanceScore />
          </div>
        </div>

        {/* Performance Summary - Full Width */}
        <div className="mt-3">
          <PerformanceSummary />
        </div>
      </div>
    </div>
  );
};
