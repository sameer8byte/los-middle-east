import React, { useState } from 'react';

/* =========================
   Interfaces
========================= */
export interface RejectionCategory {
  label: string;
  count: number;
  percentage: number;
  color: string; // MUST be hex like "#3B82F6"
}

export interface ConversionPerformanceData {
  approvalRate: number;
  approvedCount: number;
  totalLeads: number;
  avgConvertedAmount: string;
  freshLeads: { count: number; total: number; percentage: number };
  repeatLeads: { count: number; total: number; percentage: number };
  target: string;
  gap: string;
  rejection: {
    dropOffRate: number;
    totalRejected: number;
    totalAssessed: number;
    categories: RejectionCategory[];
  };
}

interface Props {
  data: ConversionPerformanceData;
}

/* =========================
   Donut Chart Component
========================= */
interface ChartData {
  name: string;
  value: number;
  color: string;
}

interface ChartProps {
  data?: ChartData[];
  currentValue?: number | string;
  total?: number | string;
  label?: string;
}

const DonutChart: React.FC<ChartProps> = ({
  data = [],
  currentValue = 0,
  total = 0,
  label = "Rejected"
}) => {
  const [hoverData, setHoverData] = useState<{
    index: number;
    x: number;
    y: number;
  } | null>(null);

  const totalValue = data.reduce((sum, item) => sum + item.value, 0);

  /* =========================
     SVG CONFIG
  ========================= */
  const SIZE = 190;
  const CENTER = SIZE / 2;
  const STROKE_WIDTH = 3;    
  const OUTER_RADIUS = 85;   
  const INNER_RADIUS = 55;   
  const PUSH_OUT_AMOUNT = 5; 

  const minValue =
    data.length > 0 ? Math.min(...data.map((d) => d.value)) : 0;

  const createDonutSector = (
    cx: number,
    cy: number,
    innerR: number,
    outerR: number,
    startAngleDeg: number,
    endAngleDeg: number
  ) => {
    const RADIAN = Math.PI / 180;

    if (endAngleDeg - startAngleDeg === 360) {
      return `
        M ${cx}, ${cy - outerR}
        A ${outerR},${outerR} 0 1,1 ${cx},${cy + outerR}
        A ${outerR},${outerR} 0 1,1 ${cx},${cy - outerR}
        M ${cx}, ${cy - innerR}
        A ${innerR},${innerR} 0 1,0 ${cx},${cy + innerR}
        A ${innerR},${innerR} 0 1,0 ${cx},${cy - innerR}
        Z
      `;
    }

    const startRad = (startAngleDeg - 90) * RADIAN;
    const endRad = (endAngleDeg - 90) * RADIAN;

    const x1Outer = cx + outerR * Math.cos(startRad);
    const y1Outer = cy + outerR * Math.sin(startRad);
    const x2Outer = cx + outerR * Math.cos(endRad);
    const y2Outer = cy + outerR * Math.sin(endRad);

    const x1Inner = cx + innerR * Math.cos(startRad);
    const y1Inner = cy + innerR * Math.sin(startRad);
    const x2Inner = cx + innerR * Math.cos(endRad);
    const y2Inner = cy + innerR * Math.sin(endRad);

    const largeArcFlag = endAngleDeg - startAngleDeg <= 180 ? 0 : 1;

    return `
      M ${x1Outer},${y1Outer}
      A ${outerR},${outerR} 0 ${largeArcFlag},1 ${x2Outer},${y2Outer}
      L ${x2Inner},${y2Inner}
      A ${innerR},${innerR} 0 ${largeArcFlag},0 ${x1Inner},${y1Inner}
      Z
    `;
  };

  let currentAngle = 0;

  const sectors = data.map((item, index) => {
    const angleSize = totalValue === 0 ? 0 : (item.value / totalValue) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angleSize;
    currentAngle += angleSize;

    const isMinimum = item.value === minValue && data.length > 1;

    let cx = CENTER;
    let cy = CENTER;

    if (isMinimum) {
      const midAngleDeg = startAngle + angleSize / 2;
      const midRad = (midAngleDeg - 90) * (Math.PI / 180);
      cx = CENTER + Math.cos(midRad) * PUSH_OUT_AMOUNT;
      cy = CENTER + Math.sin(midRad) * PUSH_OUT_AMOUNT;
    }

    const pathData = createDonutSector(
      cx,
      cy,
      INNER_RADIUS,
      OUTER_RADIUS,
      startAngle,
      endAngle
    );

    return (
      <path
        key={index}
        d={pathData}
        fill={item.color}
        stroke="#F3F4F6"
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
        className="transition-all duration-300 hover:opacity-90"
        onMouseEnter={(e) =>
          setHoverData({ index, x: e.clientX, y: e.clientY })
        }
        onMouseMove={(e) =>
          setHoverData({ index, x: e.clientX, y: e.clientY })
        }
        onMouseLeave={() => setHoverData(null)}
      />
    );
  });

  return (
    <div className="relative w-[200px] h-[200px] flex items-center justify-center mx-auto shrink-0">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full h-full overflow-visible"
      >
        {sectors}
      </svg>

      {/* Center Text */}
      <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
        <span className="text-lg font-bold text-gray-700 leading-none">
          {currentValue}/{total}
        </span>
        <span className="text-xs text-gray-500">
          {label}
        </span>
      </div>

      {/* Tooltip */}
      {hoverData && (
        <div
          className="fixed z-50 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg border border-gray-700 text-xs"
          style={{
            left: hoverData.x + 10,
            top: hoverData.y + 10
          }}
        >
          {data[hoverData.index].name}: {data[hoverData.index].value}
        </div>
      )}
    </div>
  );
};

/* =========================
   Half Circle Gauge Component
========================= */
const HalfCircleGauge: React.FC<{
  value: number;
  approved: number;
  total: number;
}> = ({ value, approved, total }) => {
  const radius = 45;
  const centerX = 50;
  const centerY = 55;

  const circumference = Math.PI * radius;
  const progress = (value / 100) * circumference;

  const angleInDegrees = 180 - (value / 100) * 180;
  const angleInRadians = (angleInDegrees * Math.PI) / 180;

  const dotX = centerX + radius * Math.cos(angleInRadians);
  const dotY = centerY - radius * Math.sin(angleInRadians);

  const getGaugeColor = (val: number) => {
    if (val >= 80) return '#22C55E';
    if (val >= 60) return '#EAB308';
    if (val >= 40) return '#F97316';
    return '#EF4444';
  };

  const gaugeColor = getGaugeColor(value);

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="relative w-full max-w-xs mx-auto aspect-[2/1]">
        <svg viewBox="0 0 100 65" className="w-full h-full">
          {/* Background */}
          <path
            d={`M${centerX - radius},${centerY} A${radius},${radius} 0 0,1 ${centerX + radius},${centerY}`}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Progress */}
          <path
            d={`M${centerX - radius},${centerY} A${radius},${radius} 0 0,1 ${centerX + radius},${centerY}`}
            fill="none"
            stroke={gaugeColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
            className="transition-all duration-1000 ease-out"
          />

          {/* Dot */}
          <circle
            cx={dotX}
            cy={dotY}
            r="4"
            fill={gaugeColor}
            stroke="white"
            strokeWidth="2"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-4">
          <p className="md:text-[40px] lg:text-[20px] font-black text-gray-800 leading-none">
            {value}%
          </p>
          <p className="text-[9px] font-bold text-gray-400 mt-1 tracking-widest">
            {approved} / {total}
          </p>
        </div>
      </div>
    </div>
  );
};

/* =========================
   Main Component
========================= */
const ConversionPerformance: React.FC<Props> = ({ data }) => {
  // State to track visible metrics
  const [visibleMetrics, setVisibleMetrics] = useState(3);
  
  // Generate additional mock metrics for demonstration
  const generateAdditionalMetrics = (baseCategories: RejectionCategory[]) => {
    const additionalColors = ['#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B', '#6366F1'];
    const additionalLabels = [
      'Credit Score Low',
      'Income Insufficient',
      'Documentation Incomplete',
      'Employment Unverified',
      'Existing Default',
      'Age Criteria',
      'Collateral Insufficient',
      'Business Vintage',
      'BENEFIT Credit Bureau < 650',
      'FOIR > 50%'
    ];
    
    const additionalMetrics: RejectionCategory[] = [];
    
    for (let i = baseCategories.length; i < 10; i++) {
      if (i < baseCategories.length + 5) {
        additionalMetrics.push({
          label: additionalLabels[i] || `Category ${i + 1}`,
          count: Math.floor(Math.random() * 30) + 5,
          percentage: Math.floor(Math.random() * 15) + 2,
          color: additionalColors[i % additionalColors.length]
        });
      }
    }
    
    return additionalMetrics;
  };

  // Get all metrics (base + additional when expanded)
  const getAllMetrics = () => {
    const baseMetrics = data.rejection.categories;
    if (visibleMetrics <= baseMetrics.length) {
      return baseMetrics.slice(0, visibleMetrics);
    } else {
      const additionalMetrics = generateAdditionalMetrics(baseMetrics);
      return [...baseMetrics, ...additionalMetrics].slice(0, visibleMetrics);
    }
  };

  const displayMetrics = getAllMetrics();
  const chartData: ChartData[] = displayMetrics.map(cat => ({
    name: cat.label,
    value: cat.count,
    color: cat.color
  }));

  const handleShowMore = () => {
    setVisibleMetrics(prev => Math.min(prev + 2, 10));
  };

  return (
    <section className="w-full bg-gray-50 rounded-2xl overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 bg-white border-b border-gray-100">
        <h2 className="text-base sm:text-lg font-semibold text-gray-800">
          Conversion Approval Performance
        </h2>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 p-4 sm:p-6">
        {/* LEFT - Approval Section */}
        <div className="flex-1 bg-white rounded-xl p-4 sm:p-6 shadow-sm">
          <HalfCircleGauge
            value={data.approvalRate}
            approved={data.approvedCount}
            total={data.totalLeads}
          />

          <p className="text-xs sm:text-sm text-gray-600 mt-4 text-center sm:text-left">
            Avg Converted Loan Amount :
            <span className="ml-2 font-semibold text-gray-800">
              ₹{data.avgConvertedAmount}
            </span>
          </p>

          <div className="flex flex-wrap gap-2 mt-4 justify-center sm:justify-start">
            <div className="bg-gray-100 px-3 py-1.5 rounded-lg text-xs sm:text-sm">
              <span className="font-medium">Fresh:</span> {data.freshLeads.count}/{data.freshLeads.total} | {data.freshLeads.percentage}%
            </div>
            <div className="bg-gray-100 px-3 py-1.5 rounded-lg text-xs sm:text-sm">
              <span className="font-medium">Repeat:</span> {data.repeatLeads.count}/{data.repeatLeads.total} | {data.repeatLeads.percentage}%
            </div>
          </div>

          <div className="grid grid-cols-3 text-center mt-6 pt-4 border-t border-dashed border-gray-200">
            <div>
              <p className="text-xs text-gray-500">Target</p>
              <p className="text-sm sm:text-base font-bold text-gray-800">{data.target}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Achieved</p>
              <p className="text-sm sm:text-base font-bold text-gray-800">{data.approvalRate}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Gap</p>
              <p className="text-sm sm:text-base font-bold text-gray-800">{data.gap}%</p>
            </div>
          </div>
        </div>

        {/* RIGHT - Rejection Insights Section */}
        <div className="flex-1 bg-white rounded-xl p-4 sm:p-5 shadow-sm flex flex-col">
          
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-800">
              Credit Rejection Insights
            </h3>
            <span className="text-red-500 font-semibold text-xs">
              {data.rejection.dropOffRate}%
              <span className="text-gray-500 font-normal ml-1">
                Drop Off Rate
              </span>
            </span>
          </div>

          {/* Content - Donut on top, metrics below */}
          <div className="flex flex-col gap-6">
            
            {/* Donut Chart - Top */}
            <div className="flex justify-center">
              <DonutChart
                data={chartData}
                currentValue={displayMetrics.reduce((sum, cat) => sum + cat.count, 0)}
                total={data.rejection.totalAssessed}
                label="Rejected"
              />
            </div>

            {/* Metrics - Bottom (Inline Span-like Cards) */}
            <div className="w-full">
              <div className="flex flex-wrap gap-1.5 justify-center">
                {displayMetrics.map((cat, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-full border border-gray-200 text-xs"
                  
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-medium text-gray-700">
                      {cat.label}
                    </span>
                    <span className="text-gray-500 font-medium">
                      {cat.count} | {cat.percentage}%
                    </span>
                  </span>
                ))}

                {visibleMetrics < 10 && (
                  <button 
                    onClick={handleShowMore}
                    className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 px-2 py-1 rounded-full border border-blue-200 text-xs font-medium transition-colors"
                  >
                    <span>+{Math.min(2, 10 - visibleMetrics)}</span>
                    <span>More</span>
                  </button>
                )}
                
                {visibleMetrics >= 10 && (
                  <button 
                    onClick={() => setVisibleMetrics(3)}
                    className="inline-flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-700 px-2 py-1 rounded-full border border-gray-300 text-xs font-medium transition-colors"
                  >
                    Show Less
                  </button>
                )}
              </div>
              
           
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ConversionPerformance;