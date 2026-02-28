import { useState } from "react";
interface EmployeeData {
  name: string;
  casesHolding: number;
  underFollowup: number;
  casesClosed: number;
  postDueCases: number;
}

const EmployeeBarChart = ({ employee }: { employee: EmployeeData }) => {
  const maxValue = 5000;
  const getBarHeight = (value: number) => (value / maxValue) * 200;

  return (
    <div className="flex flex-col items-center" style={{ width: '80px' }}>
      {/* Bars */}
      <div className="flex items-end gap-1" style={{ height: '220px' }}>
        {/* Cases Holding - Blue */}
        <div 
          className="bg-blue-500 rounded-t"
          style={{ width: '16px', height: `${getBarHeight(employee.casesHolding)}px` }}
        />
        {/* Under Followup - Yellow */}
        <div 
          className="bg-yellow-500 rounded-t"
          style={{ width: '16px', height: `${getBarHeight(employee.underFollowup)}px` }}
        />
        {/* Cases Closed - Green */}
        <div 
          className="bg-green-500 rounded-t"
          style={{ width: '16px', height: `${getBarHeight(employee.casesClosed)}px` }}
        />
        {/* Post Due Cases - Red */}
        <div 
          className="bg-red-400 rounded-t"
          style={{ width: '16px', height: `${getBarHeight(employee.postDueCases)}px` }}
        />
      </div>
      
      {/* Employee Name */}
      <p className="text-xs text-gray-700 mt-2 text-center font-medium">{employee.name}</p>
    </div>
  );
};

export const CollectionPipelineOverview = () => {
  const [isOpen, setIsOpen] = useState(false);
  const employees: EmployeeData[] = [
    { name: "RAJESH R", casesHolding: 2000, underFollowup: 800, casesClosed: 1800, postDueCases: 600 },
    { name: "ANITA S", casesHolding: 1800, underFollowup: 600, casesClosed: 2200, postDueCases: 400 },
    { name: "MICHAEL T", casesHolding: 2200, underFollowup: 700, casesClosed: 1600, postDueCases: 500 },
    { name: "EMMA L", casesHolding: 1900, underFollowup: 650, casesClosed: 2000, postDueCases: 450 },
    { name: "LIAM J", casesHolding: 2100, underFollowup: 750, casesClosed: 1700, postDueCases: 550 },
    { name: "SOFIA P", casesHolding: 1700, underFollowup: 600, casesClosed: 2300, postDueCases: 400 },
    { name: "CARLOS M", casesHolding: 2000, underFollowup: 700, casesClosed: 1900, postDueCases: 500 },
    { name: "OLIVIA W", casesHolding: 1850, underFollowup: 620, casesClosed: 2100, postDueCases: 430 },
    { name: "ZOE K", casesHolding: 1950, underFollowup: 680, casesClosed: 1950, postDueCases: 470 },
  ];
  if (!isOpen) {
    return (
      <div 
        className="bg-white border border-[#F5F5F5] cursor-pointer"
        style={{ width: '1396px', borderRadius: '20px', marginTop: '24px' }}
        onClick={() => setIsOpen(true)}
      >
        <div 
          className="bg-[#F5F5F5] px-4 flex items-center justify-between"
          style={{ 
            height: '48px',
            paddingTop: '8px',
            paddingBottom: '8px',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px'
          }}
        >
          <h2 className="text-base font-semibold text-gray-900">Collection Pipeline Overview (Across Employee)</h2>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 7.5L10 12.5L15 7.5" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-white border border-[#F5F5F5]"
      style={{ width: '1396px', borderRadius: '20px', marginTop: '24px' }}
    >
      {/* Header */}
      <div 
        className="bg-[#F5F5F5] px-4 flex items-center justify-between"
        style={{ 
          height: '48px',
          paddingTop: '8px',
          paddingBottom: '8px',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px'
        }}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-gray-900">Collection Pipeline Overview (Across Employee)</h2>
          <button onClick={() => setIsOpen(false)}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 12.5L10 7.5L5 12.5" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '30px 40px' }}>
        {/* Y-axis labels */}
        <div className="flex" style={{ marginBottom: '10px' }}>
          <div style={{ width: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '220px', paddingRight: '10px' }}>
            <span className="text-xs text-gray-600 text-right">5K</span>
            <span className="text-xs text-gray-600 text-right">2K</span>
            <span className="text-xs text-gray-600 text-right">1K</span>
            <span className="text-xs text-gray-600 text-right">800</span>
            <span className="text-xs text-gray-600 text-right">400</span>
            <span className="text-xs text-gray-600 text-right">200</span>
            <span className="text-xs text-gray-600 text-right">0</span>
          </div>

          {/* Charts */}
          <div className="flex gap-8 items-end" style={{ paddingLeft: '20px', borderLeft: '2px solid #E5E7EB' }}>
            {employees.map((emp) => (
              <EmployeeBarChart key={emp.name} employee={emp} />
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3B82F6' }}></div>
            <span className="text-sm text-gray-700">Cases Holding</span>
          </div>
          <div className="flex items-center gap-2">
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#EAB308' }}></div>
            <span className="text-sm text-gray-700">Under Followup</span>
          </div>
          <div className="flex items-center gap-2">
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10B981' }}></div>
            <span className="text-sm text-gray-700">Cases Closed</span>
          </div>
          <div className="flex items-center gap-2">
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#F87171' }}></div>
            <span className="text-sm text-gray-700">Post Due Cases</span>
          </div>
        </div>
      </div>
    </div>
  );
};
