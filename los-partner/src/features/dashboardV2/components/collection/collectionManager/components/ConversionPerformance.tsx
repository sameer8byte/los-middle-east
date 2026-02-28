export const ConversionPerformance = () => {
  const conversionData = {
    totalDue: 6,
    collected: { percentage: 63, amount: 3.8 },
    pending: { percentage: 20, amount: 1.2 },
    overdue: { percentage: 17, amount: 1 }
  };
  return (
    <div 
      className="bg-white border border-[#E5E7EB]"
      style={{ width: '402px', height: '384px', borderRadius: '20px', overflow: 'hidden' }}
    >
      <div className="bg-[#F5F5F5] px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Conversion Performance (Across Executive)</h3>
      </div>
      <div style={{ padding: '30px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        {/* Donut Chart */}
        <div style={{ position: 'relative', width: '210px', height: '210px' }}>
          <svg width="210" height="210" viewBox="0 0 210 210">
            {/* Collected - Green - Dynamic based on percentage */}
            <circle
              cx="105"
              cy="105"
              r="80"
              fill="none"
              stroke="#10B981"
              strokeWidth="40"
              strokeDasharray="316 500"
              strokeDashoffset="0"
              transform="rotate(-90 105 105)"
            />
            {/* 🔴 API INTEGRATION: strokeDasharray first value = (conversionData.collected.percentage / 100) * 502 */}
            {/* Pending - Pink/Red - Dynamic based on percentage */}
            <circle
              cx="105"
              cy="105"
              r="80"
              fill="none"
              stroke="#EC4899"
              strokeWidth="40"
              strokeDasharray="100 500"
              strokeDashoffset="-316"
              transform="rotate(-90 105 105)"
            />
            {/* 🔴 API INTEGRATION: strokeDasharray first value = (conversionData.pending.percentage / 100) * 502 */}
            {/* Overdue - Yellow - Dynamic based on percentage */}
            <circle
              cx="105"
              cy="105"
              r="80"
              fill="none"
              stroke="#EAB308"
              strokeWidth="40"
              strokeDasharray="85 500"
              strokeDashoffset="-416"
              transform="rotate(-90 105 105)"
            />
            {/* 🔴 API INTEGRATION: strokeDasharray first value = (conversionData.overdue.percentage / 100) * 502 */}
          </svg>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
            <div className="text-xl font-bold text-gray-900">₹{conversionData.totalDue} Cr</div>
            <div className="text-xs text-gray-600">Total Due</div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-gray-300 w-full"></div>

        {/* Legend */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
          <div>
            <div className="flex items-center justify-center gap-1 mb-1">
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }}></div>
              <span className="text-xs text-gray-600">Collected</span>
            </div>
            <p className="text-sm font-bold text-gray-900">{conversionData.collected.percentage} % | ₹{conversionData.collected.amount} Cr</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 mb-1">
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EC4899' }}></div>
              <span className="text-xs text-gray-600">Pending</span>
            </div>
            <p className="text-sm font-bold text-gray-900">{conversionData.pending.percentage} % | ₹{conversionData.pending.amount} Cr</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 mb-1">
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EAB308' }}></div>
              <span className="text-xs text-gray-600">Overdue</span>
            </div>
            <p className="text-sm font-bold text-gray-900">{conversionData.overdue.percentage} % | ₹{conversionData.overdue.amount} Cr</p>
          </div>
        </div>
      </div>
    </div>
  );
};
