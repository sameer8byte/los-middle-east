 
export const CollectionPerformance = () => {
  
  const performanceData = {
    percentage: 72,
    collected: 3.6,
    total: 5,
    target: "X %",
    achieved: "72%",
    gap: "Y %",
    avgLoanAmount: "XX,XXX"
  };

  return (
    <div 
      className="bg-white border border-[#E5E7EB]"
      style={{ width: '402px', height: '384px', borderRadius: '20px', overflow: 'hidden' }}
    >
      <div className="bg-[#F5F5F5] px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Collection Performance (Across Executive)</h3>
      </div>
      <div style={{ padding: '30px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '17px' }}>
        {/* Speedometer Container */}
        <div style={{ width: '372px', height: '239px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '17px' }}>
          {/* Half Circle Speedometer */}
          <div style={{ position: 'relative', width: '210px', height: '105px' }}>
            <svg width="210" height="105" viewBox="0 0 210 105">
              {/* Background arc */}
              <path 
                d="M 10 105 A 95 95 0 0 1 200 105" 
                fill="none" 
                stroke="#E5E7EB" 
                strokeWidth="20"
                strokeLinecap="round"
              />
              {/* Colored arc - Dynamic based on percentage */}
              <path 
                d="M 10 105 A 95 95 0 0 1 160 30" 
                fill="none" 
                stroke="#10B981" 
                strokeWidth="20"
                strokeLinecap="round"
              />
              {/* 🔴 API INTEGRATION: Calculate arc path dynamically based on performanceData.percentage */}
            </svg>
            <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
              <div className="text-3xl font-bold text-gray-900">{performanceData.percentage}%</div>
              <div className="text-xs text-gray-600">₹{performanceData.collected}Cr / ₹{performanceData.total}Cr</div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-gray-300 w-full"></div>

          {/* Stats */}
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

        {/* Additional Info */}
        <div style={{ width: '100%', textAlign: 'center', paddingTop: '10px' }}>
          <p className="text-xs text-gray-600 mb-1">Avg Collection Loan Amount</p>
          <p className="text-lg font-bold text-gray-900">{performanceData.avgLoanAmount}</p>
        </div>
      </div>
    </div>
  );
};
