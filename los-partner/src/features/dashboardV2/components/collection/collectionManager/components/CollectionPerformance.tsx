import { useState, useEffect } from "react";

export const CollectionPerformance = () => {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  
  const performanceData = {
    percentage: 72,
    collected: 3.6,
    total: 5,
    target: "X %",
    achieved: "72%",
    gap: "Y %",
    avgLoanAmount: "XX,XXX"
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setAnimatedPercentage(prev => {
          if (prev >= performanceData.percentage) {
            clearInterval(interval);
            return performanceData.percentage;
          }
          return prev + 1;
        });
      }, 20);
      return () => clearInterval(interval);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className="bg-white border border-[#E5E7EB] w-full lg:w-[402px]"
      style={{ height: '384px', borderRadius: '20px', overflow: 'hidden' }}
    >
      <div className="bg-[#F5F5F5] px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Collection Performance (Across Executive)</h3>
      </div>
      <div style={{ padding: '30px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '17px' }}>
        <div style={{ width: '372px', height: '239px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '17px' }}>
          <div style={{ position: 'relative', width: '210px', height: '105px' }}>
            <svg width="210" height="105" viewBox="0 0 210 105">
              <path 
                d="M 10 105 A 95 95 0 0 1 200 105" 
                fill="none" 
                stroke="#E5E7EB" 
                strokeWidth="20"
                strokeLinecap="round"
              />
              <path 
                d="M 10 105 A 95 95 0 0 1 160 30" 
                fill="none" 
                stroke="#10B981" 
                strokeWidth="20"
                strokeLinecap="round"
                strokeDasharray="300"
                strokeDashoffset={300 - (animatedPercentage / 100) * 300}
                style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
              />
            </svg>
            <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
              <div className="text-3xl font-bold text-gray-900">{animatedPercentage}%</div>
              <div className="text-xs text-gray-600">₹{performanceData.collected}Cr / ₹{performanceData.total}Cr</div>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-300 w-full"></div>

          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            <div>
              <p className="text-xs text-gray-600 mb-1">Target</p>
              <p className="text-base font-bold text-gray-900">{performanceData.target}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Achieved</p>
              <p className="text-base font-bold text-gray-900">{performanceData.achieved}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Gap</p>
              <p className="text-base font-bold text-gray-900">{performanceData.gap}</p>
            </div>
          </div>
        </div>

        <div style={{ width: '100%', textAlign: 'center', paddingTop: '10px' }}>
          <p className="text-xs text-gray-600 mb-1">Avg Collection Loan Amount</p>
          <p className="text-lg font-bold text-gray-900">{performanceData.avgLoanAmount}</p>
        </div>
      </div>
    </div>
  );
};
