import { useState, useEffect } from "react";

interface EmployeeData {
  name: string;
  casesHolding: number;
  underFollowup: number;
  casesClosed: number;
  postDueCases: number;
}

const EmployeeBarChart = ({ employee, onHover, onLeave }: { 
  employee: EmployeeData;
  onHover: (e: React.MouseEvent, data: EmployeeData) => void;
  onLeave: () => void;
}) => {
  const [animated, setAnimated] = useState({ casesHolding: 0, underFollowup: 0, casesClosed: 0, postDueCases: 0 });
  const maxValue = 5000;
  const getBarHeight = (value: number) => (value / maxValue) * 286;

  useEffect(() => {
    const duration = 1000;
    const steps = 60;
    const interval = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      setAnimated({
        casesHolding: employee.casesHolding * progress,
        underFollowup: employee.underFollowup * progress,
        casesClosed: employee.casesClosed * progress,
        postDueCases: employee.postDueCases * progress
      });
      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, [employee]);

  return (
    <div 
      className="flex flex-col items-center" 
      style={{ width: '44px', gap: '4px' }}
      onMouseEnter={(e) => onHover(e, employee)}
      onMouseLeave={onLeave}
    >
      <div className="flex items-end gap-1" style={{ height: '286px' }}>
        <div 
          className="rounded-t transition-all hover:opacity-80"
          style={{ width: '8px', height: `${getBarHeight(animated.casesHolding)}px`, background: '#2388FFAB', transition: 'height 0.05s linear' }}
        />
        <div 
          className="rounded-t transition-all hover:opacity-80"
          style={{ width: '8px', height: `${getBarHeight(animated.underFollowup)}px`, background: '#FFDA5F', transition: 'height 0.05s linear' }}
        />
        <div 
          className="rounded-t transition-all hover:opacity-80"
          style={{ width: '8px', height: `${getBarHeight(animated.casesClosed)}px`, background: '#41AF6ABA', transition: 'height 0.05s linear' }}
        />
        <div 
          className="rounded-t transition-all hover:opacity-80"
          style={{ width: '8px', height: `${getBarHeight(animated.postDueCases)}px`, background: '#FFAFAF', transition: 'height 0.05s linear' }}
        />
      </div>
      <div style={{ height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-xs text-gray-700 text-center font-medium">{employee.name}</p>
      </div>
    </div>
  );
};

const HoverTooltip = ({ data, position }: { data: EmployeeData; position: { x: number; y: number } }) => {
  return (
    <div 
      className="absolute bg-white border border-gray-200 shadow-lg z-50"
      style={{ 
        width: '218px',
        borderRadius: '12px',
        padding: '16px',
        left: `${position.x}px`,
        top: `${position.y}px`,
        pointerEvents: 'none'
      }}
    >
      <h4 className="text-sm font-semibold text-gray-900 mb-3">{data.name}</h4>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2388FFAB' }}></div>
            <span className="text-xs text-gray-600">Cases Holding</span>
          </div>
          <span className="text-xs font-semibold text-gray-900">{data.casesHolding}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FFDA5F' }}></div>
            <span className="text-xs text-gray-600">Under Followup</span>
          </div>
          <span className="text-xs font-semibold text-gray-900">{data.underFollowup}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#41AF6ABA' }}></div>
            <span className="text-xs text-gray-600">Cases Closed</span>
          </div>
          <span className="text-xs font-semibold text-gray-900">{data.casesClosed}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FFAFAF' }}></div>
            <span className="text-xs text-gray-600">Post Due Cases</span>
          </div>
          <span className="text-xs font-semibold text-gray-900">{data.postDueCases}</span>
        </div>
      </div>
    </div>
  );
};

export const CollectionPipelineOverview = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredData, setHoveredData] = useState<{ data: EmployeeData; position: { x: number; y: number } } | null>(null);

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

  const handleHover = (e: React.MouseEvent, data: EmployeeData) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = e.currentTarget.closest('div[style*="1396px"]')?.getBoundingClientRect();
    const xPos = rect.right - (containerRect?.left || 0) + 10;
    const yPos = rect.bottom - (containerRect?.top || 0) - 100;
    setHoveredData({ data, position: { x: xPos, y: yPos } });
  };

  if (!isOpen) {
    return (
      <div 
        className="bg-white border border-[#F5F5F5] cursor-pointer w-full max-w-[1396px]"
        style={{ borderRadius: '20px', marginTop: '24px' }}
        onClick={() => setIsOpen(true)}
      >
        <div 
          className="bg-[#F5F5F5] px-4 flex items-center justify-between cursor-pointer"
          style={{ 
            height: '48px',
            paddingTop: '8px',
            paddingBottom: '8px',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px'
          }}
          onClick={() => setIsOpen(true)}
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
      className="bg-white border border-[#F5F5F5] w-full max-w-[1396px]"
      style={{ borderRadius: '20px', marginTop: '24px' }}
    >
      <div 
        className="bg-[#F5F5F5] px-4 flex items-center justify-between cursor-pointer"
        style={{ 
          height: '48px',
          paddingTop: '8px',
          paddingBottom: '8px',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px'
        }}
        onClick={() => setIsOpen(false)}
      >
        <h2 className="text-base font-semibold text-gray-900">Collection Pipeline Overview (Across Employee)</h2>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M15 12.5L10 7.5L5 12.5" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <div style={{ padding: '30px 40px' }}>
        <div className="flex" style={{ marginBottom: '10px' }}>
          <div style={{ width: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '286px', paddingRight: '10px' }}>
            <span className="text-xs text-gray-600 text-right">5K</span>
            <span className="text-xs text-gray-600 text-right">2K</span>
            <span className="text-xs text-gray-600 text-right">1K</span>
            <span className="text-xs text-gray-600 text-right">800</span>
            <span className="text-xs text-gray-600 text-right">400</span>
            <span className="text-xs text-gray-600 text-right">200</span>
            <span className="text-xs text-gray-600 text-right">0</span>
          </div>

          <div className="flex gap-8 items-end" style={{ paddingLeft: '20px', borderLeft: '2px solid #E5E7EB' }}>
            {employees.map((emp) => (
              <EmployeeBarChart 
                key={emp.name} 
                employee={emp}
                onHover={handleHover}
                onLeave={() => setHoveredData(null)}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#2388FFAB' }}></div>
            <span className="text-sm text-gray-700">Cases Holding</span>
          </div>
          <div className="flex items-center gap-2">
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#FFDA5F' }}></div>
            <span className="text-sm text-gray-700">Under Followup</span>
          </div>
          <div className="flex items-center gap-2">
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#41AF6ABA' }}></div>
            <span className="text-sm text-gray-700">Cases Closed</span>
          </div>
          <div className="flex items-center gap-2">
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#FFAFAF' }}></div>
            <span className="text-sm text-gray-700">Post Due Cases</span>
          </div>
        </div>
      </div>

      {hoveredData && <HoverTooltip data={hoveredData.data} position={hoveredData.position} />}
    </div>
  );
};
