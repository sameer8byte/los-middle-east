import { Card, CardContent, CardHeader, CardTitle } from "../../../common/ui/card";

interface LocationChartProps {
  readonly title: string;
  readonly data: Array<{
    state: string;
    totalUsers: number;
  }>;
  readonly loading?: boolean;
}

export function LocationChart({ title, data, loading }: LocationChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-40 bg-gray-200 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 text-sm">No location data available</div>
        </CardContent>
      </Card>
    );
  }

  const maxValue = Math.max(...data.map(d => d.totalUsers), 1);
  const colors = [
    'from-blue-500 to-blue-400',
    'from-green-500 to-green-400',
    'from-purple-500 to-purple-400',
    'from-orange-500 to-orange-400',
    'from-red-500 to-red-400',
    'from-indigo-500 to-indigo-400',
    'from-pink-500 to-pink-400',
    'from-teal-500 to-teal-400',
    'from-yellow-500 to-yellow-400',
    'from-cyan-500 to-cyan-400',
    'from-emerald-500 to-emerald-400',
    'from-violet-500 to-violet-400',
    'from-rose-500 to-rose-400',
    'from-amber-500 to-amber-400',
    'from-lime-500 to-lime-400',
    'from-sky-500 to-sky-400',
    'from-fuchsia-500 to-fuchsia-400',
    'from-slate-500 to-slate-400',
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <div className="text-sm text-gray-600">All {data.length} states by user count</div>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-x-auto border border-gray-200 rounded-lg bg-gray-50 p-4">
          <div className="flex" style={{ minWidth: `${Math.max(data.length * 60, 600)}px` }}>
            {/* Y-axis labels */}
            <div className="flex flex-col justify-between h-48 text-xs text-gray-500 pr-3 py-2 min-w-[40px]">
              <span>{maxValue.toLocaleString()}</span>
              <span>{Math.round(maxValue * 0.75).toLocaleString()}</span>
              <span>{Math.round(maxValue * 0.5).toLocaleString()}</span>
              <span>{Math.round(maxValue * 0.25).toLocaleString()}</span>
              <span>0</span>
            </div>
            
            {/* Chart container */}
            <div className="flex-1 relative">
              {/* Grid lines */}
              <div className="absolute inset-0 h-48 flex flex-col justify-between pointer-events-none">
                {[0, 25, 50, 75, 100].map((percent) => (
                  <div 
                    key={`gridline-${percent}`}
                    className="border-t border-gray-300/20 w-full"
                  />
                ))}
              </div>
              
              {/* Bars container - FIXED HEIGHT CALCULATION */}
              <div className="flex items-end h-48 gap-2 relative z-10 pb-16">
                {data.map((item, index) => {
                  // Calculate height in PIXELS - Leave space for labels (64px padding)
                  const availableHeight = 192 - 64; // h-48 minus pb-16 = 128px available for bars
                  const barHeightPx = Math.max((item.totalUsers / maxValue) * availableHeight, item.totalUsers > 0 ? 4 : 0);
                  const color = colors[index % colors.length];

                  return (
                    <div
                      key={item.state}
                      className="flex flex-col items-center group relative"
                      style={{ width: '45px' }}
                    >
                      {/* Tooltip */}
                      <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
                        <div className="font-semibold">{item.state}</div>
                        <div>{item.totalUsers.toLocaleString()} users</div>
                        <div className="text-gray-400">Rank #{index + 1}</div>
                        <div className="text-xs">Bar: {Math.round(barHeightPx)}px</div>
                      </div>

                      {/* Bar - USING PIXELS NOT PERCENTAGE */}
                      <div
                        className={`w-full bg-gradient-to-t ${color} rounded-t-md transition-all duration-300 border border-white/20 hover:scale-105 hover:opacity-80 cursor-pointer shadow-sm`}
                        style={{ 
                          height: `${barHeightPx}px`
                        }}
                      />

                      {/* State label */}
                      <div className="absolute -bottom-14 left-1/2 transform -translate-x-1/2 text-center w-full">
                        <div
                          className="text-xs font-medium text-gray-700 truncate"
                          title={item.state}
                        >
                          {item.state.length > 8
                            ? item.state.slice(0, 8) + '…'
                            : item.state}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {item.totalUsers.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="flex justify-between items-center text-sm mt-4 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-4">
            <span className="text-gray-600">
              <span className="font-semibold text-gray-800">
                {data.reduce((sum, item) => sum + item.totalUsers, 0).toLocaleString()}
              </span>{' '}
              Total Users
            </span>
            <span className="text-gray-600">
              <span className="font-semibold text-gray-800">
                {maxValue.toLocaleString()}
              </span>{' '}
              Peak Users
            </span>
          </div>
          <span className="text-gray-500 text-xs">{data.length} states shown</span>
        </div>
      </CardContent>
    </Card>
  );
}
