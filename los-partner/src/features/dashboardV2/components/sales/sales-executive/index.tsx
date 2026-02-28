import ConversionPerformance from "./components/ConversionPerformance";
import DropOffLeadBreakdown from "./components/DropOffLeadBreakdown";
import LeadFunnel from "./components/LeadFunnel";
import LeadOverview from "./components/LeadOverview";
import LeadTable from "./components/LeadTable";
import PerformanceAnalysis from "./components/PerformanceAnalysis";

const SalesExecutive = () => {
  return (
    <div className="p-4 bg-white overflow-x-auto">
      <div className="flex gap-4 mb-4 items-stretch min-w-[1200px]">
        <div className="w-[65%]">
          <div className="mb-4">
            <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
            <p className="text-sm text-[#888888]">
              Overview of loans, disbursements, and collections
            </p>
          </div>
          <LeadOverview />
          <LeadFunnel />
          <div className="flex gap-4 items-stretch">
            <div className="w-1/2">
              <ConversionPerformance />
            </div>
            <div className="w-1/2">
              <DropOffLeadBreakdown />
            </div>
          </div>
        </div>
        <div className="w-[35%]">
          <PerformanceAnalysis />
        </div>
      </div> 
      <LeadTable />
    </div>
  );
};

export default SalesExecutive;
