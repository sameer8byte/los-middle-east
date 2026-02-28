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
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Main Layout */}
      <div className="flex gap-4" style={{ width: '1396px' }}>
        {/* Left Section */}
        <div className="flex-1" style={{ width: '834px' }}>
          {/* Dashboard Header with Filters */}
          <div className="mb-4" style={{ height: '57px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500">Overview of loans, disbursements, and collections</p>
            </div>
            
            {/* Filters */}
            <div className="flex items-center gap-3">
              <select 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Today">Today</option>
                <option value="Yesterday">Yesterday</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
              </select>
            </div>
          </div>

          {/* Content Sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '17px' }}>
            <CollectionExecutiveSummary />
            <MyCollectionBucket />
            <CollectionSummary />
            <LoanClosure />
          </div>
        </div>

        {/* Right Section - Team Performance */}
        <div style={{ width: '544px' }}>
          <TeamPerformance />
        </div>
      </div>

      {/* Full Width Sections */}
      <div style={{ width: '1396px', marginTop: '24px' }}>
        <PerformanceTabs />
        <ExecutivePerformanceTable />
        <CollectionPipelineOverview />
      </div>
    </div>
  );
};
