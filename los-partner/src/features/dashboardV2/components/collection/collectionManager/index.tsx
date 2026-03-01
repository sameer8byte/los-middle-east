import { useState } from "react";
import { CollectionExecutiveSummary } from "./components/CollectionExecutiveSummary";
import { MyCollectionBucket } from "./components/MyCollectionBucket";
import { CollectionSummary } from "./components/CollectionSummary";
import { LoanClosure } from "./components/LoanClosure";
import { TeamPerformance } from "./components/TeamPerformance";
import { PerformanceTabs } from "./components/PerformanceTabs";
import { ExecutivePerformanceTable } from "./components/ExecutivePerformanceTable";
import { CollectionPipelineOverview } from "./components/CollectionPipelineOverview";

export const CollectionManagerDashboard = () => {
  const [dateFilter, setDateFilter] = useState("Today");

  return (
    <div className="min-h-screen bg-gray-50 p-2">
      <div className="w-full mx-auto">
        {/* Main Layout */}
        <div className="flex gap-2 items-stretch">
          {/* Left Section */}
          <div className="flex-1 min-w-0">
            {/* Dashboard Header with Filters */}
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-xs text-gray-500">Overview of loans, disbursements, and collections</p>
              </div>
              
              {/* Filters */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <select 
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Today">Today</option>
                  <option value="Yesterday">Yesterday</option>
                  <option value="This Week">This Week</option>
                  <option value="This Month">This Month</option>
                </select>
              </div>
            </div>

            {/* Content Sections */}
            <div className="flex flex-col gap-2 h-full">
              <CollectionExecutiveSummary />
              <MyCollectionBucket />
              <CollectionSummary />
              <LoanClosure />
            </div>
          </div>

          {/* Right Section - Team Performance */}
          <div className="w-[420px] flex-shrink-0">
            <TeamPerformance />
          </div>
        </div>

        {/* Full Width Sections */}
        <div className="mt-3">
          <PerformanceTabs />
          <ExecutivePerformanceTable />
          <CollectionPipelineOverview />
        </div>
      </div>
    </div>
  );
};
