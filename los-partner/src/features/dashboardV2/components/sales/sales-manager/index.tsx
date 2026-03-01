import { useState, useRef, useEffect } from "react";
import { FiCalendar, FiChevronDown } from "react-icons/fi";
import ExecutiveSummary from "./components/ExecutiveSummary";
import LeadBucket from "./components/LeadBucket";
import LeadOverviewManager from "./components/LeadOverviewManager";
import LeadFunnelManager from "./components/LeadFunnelManager";
import TeamPerformance from "./components/TeamPerformance/index";
import ExecutiveLeadsTable from "./components/ExecutiveLeadsTable";
import LeadDistributionTable from "./components/LeadDistributionTable";
import LeadFunnelOverview from "./components/LeadFunnelOverview";
import ConversionContribution from "./components/ConversionContribution";
import ConversionHealth from "./components/ConversionHealth";

const SalesManagerDashboard = () => {
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [isConversionOpen, setIsConversionOpen] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const dateFilterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateFilterRef.current && !dateFilterRef.current.contains(event.target as Node)) {
        setShowDateFilter(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="p-4 bg-white overflow-x-auto">
      <div className="flex gap-4 mb-4 items-stretch min-w-[1200px]">
        <div className="w-[65%] flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
              <p className="text-sm text-[#888888]">
                Overview of loans, disbursements, and collections
              </p>
            </div>
            <div className="relative" ref={dateFilterRef}>
              <button 
                onClick={() => setShowDateFilter(!showDateFilter)}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50"
              >
                <FiCalendar className="w-4 h-4" />
                Today
                <FiChevronDown className="w-4 h-4" />
              </button>
              {showDateFilter && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => {
                          setStartDate("");
                          setEndDate("");
                        }}
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => setShowDateFilter(false)}
                        className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1">
            <ExecutiveSummary />
            <LeadBucket />
            <LeadOverviewManager />
            <LeadFunnelManager />
          </div>
          {/* Add more components here similar to sales-executive */}
        </div>
        <div className="w-[35%] flex">
          <TeamPerformance />
        </div>
      </div>
      <div className="mb-4">
        {/* Conversion Contribution & Health */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div 
            onClick={() => setIsConversionOpen(!isConversionOpen)}
            className={`flex items-center justify-between p-4 border-b border-gray-200 cursor-pointer transition-colors ${
              isConversionOpen ? 'bg-gray-50 hover:bg-gray-100' : 'bg-blue-50 hover:bg-blue-100'
            }`}
          >
            <h2 className="font-semibold text-gray-900">Conversion Analysis</h2>
            <FiChevronDown className={`w-5 h-5 transition-transform text-gray-600 ${isConversionOpen ? 'rotate-180' : ''}`} />
          </div>
          {isConversionOpen && (
            <div className="p-4 space-y-4">
              <div className="flex gap-4 items-stretch min-h-[400px] md:min-h-[450px] lg:min-h-[500px]">
                <div className="w-[40%]">
                  <ConversionContribution />
                </div>
                <div className="w-[60%]">
                  <ConversionHealth />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <ExecutiveLeadsTable />
      <LeadDistributionTable />
      <LeadFunnelOverview />
    </div>
  );
};

export default SalesManagerDashboard;
