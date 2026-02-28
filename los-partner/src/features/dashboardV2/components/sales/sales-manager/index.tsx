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
  return (
    <div className="p-4 bg-white overflow-x-auto">
      <div className="flex gap-4 mb-4 items-stretch min-w-[1200px]">
        <div className="w-[65%] flex flex-col">
          <div className="mb-4">
            <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
            <p className="text-sm text-[#888888]">
              Overview of loans, disbursements, and collections
            </p>
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
      <div className="flex gap-4 mb-4 items-stretch">
        <div className="w-[40%]">
          <ConversionContribution />
        </div>
        <div className="w-[60%]">
          <ConversionHealth />
        </div>
      </div>
      <ExecutiveLeadsTable />
      <LeadDistributionTable />
      <LeadFunnelOverview />
    </div>
  );
};

export default SalesManagerDashboard;
