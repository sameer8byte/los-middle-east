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
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Main Layout */}
      <div className="flex gap-4" style={{ width: '1396px' }}>
        {/* Left Section */}
        <div className="flex-1" style={{ width: '828px' }}>
          {/* Dashboard Header with Filters */}
          <div className="mb-4" style={{ height: '57px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500">Overview of Collection</p>
            </div>
            
            {/* Date Filters */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Start Date:</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">End Date:</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Content Sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <CollectionOverview />
            <CollectionSummary />
            <Application />
            <PerformanceSummary />
          </div>
        </div>

        {/* Right Section - Performance Score */}
        <div style={{ width: '544px' }}>
          <PerformanceScore />
        </div>
      </div>
    </div>
  );
};
