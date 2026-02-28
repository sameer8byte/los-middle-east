import { Card, CardContent, CardHeader, CardTitle } from "../../../common/ui/card";

interface CompanyChartProps {
  readonly title: string;
  readonly data: Array<{
    companyName: string;
    userCount: number;
  }>;
  readonly loading?: boolean;
}

export function CompanyChart({ title, data, loading }: CompanyChartProps) {
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
          <div className="text-gray-500 text-sm">No company data available</div>
        </CardContent>
      </Card>
    );
  }

  // Take top 10 companies for the chart to keep it readable
  const chartData = data.slice(0, 10);
  const maxValue = Math.max(...chartData.map(d => d.userCount), 1);
  const minValue = 0;
  const range = maxValue - minValue;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <div className="text-sm text-gray-600">Top 10 companies by user count</div>
      </CardHeader>
      <CardContent>
        {/* Chart Container */}
        <div className="relative h-48 mb-4">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-400 pr-2">
            <span>{maxValue}</span>
            <span>{Math.round(maxValue / 2)}</span>
            <span>0</span>
          </div>
          
          {/* Chart bars */}
          <div className="ml-8 h-full flex items-end gap-1">
            {chartData.map((company, index) => {
              const height = range === 0 ? 0 : ((company.userCount - minValue) / range) * 100;
              
              // Generate different colors for variety - using green tones for companies
              const colors = [
                'bg-gradient-to-t from-emerald-500 to-emerald-400',
                'bg-gradient-to-t from-green-500 to-green-400',
                'bg-gradient-to-t from-teal-500 to-teal-400',
                'bg-gradient-to-t from-cyan-500 to-cyan-400',
                'bg-gradient-to-t from-blue-500 to-blue-400',
                'bg-gradient-to-t from-indigo-500 to-indigo-400',
                'bg-gradient-to-t from-purple-500 to-purple-400',
                'bg-gradient-to-t from-pink-500 to-pink-400',
                'bg-gradient-to-t from-orange-500 to-orange-400',
                'bg-gradient-to-t from-lime-500 to-lime-400'
              ];
              
              const colorClass = colors[index % colors.length];
              
              return (
                <div key={company.companyName} className="flex-1 flex flex-col items-center group">
                  {/* Bar */}
                  <div className="w-full relative" style={{ height: '176px' }}>
                    <div 
                      className={`w-full ${colorClass} rounded-t hover:opacity-80 transition-all duration-300 shadow-sm`}
                      style={{ 
                        height: `${Math.max(height, company.userCount > 0 ? 8 : 0)}%`,
                        minHeight: company.userCount > 0 ? '4px' : '0px'
                      }}
                    />
                    {/* Hover tooltip */}
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                      {company.companyName}: {company.userCount} users
                    </div>
                  </div>
                  
                  {/* Label */}
                  <div className="text-xs text-gray-600 mt-2 text-center min-h-[2rem] flex items-center transform -rotate-45 origin-center">
                    <span className="leading-tight whitespace-nowrap">
                      {company.companyName.length > 12 ? `${company.companyName.substring(0, 12)}...` : company.companyName}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Summary */}
        <div className="flex justify-between items-center text-sm text-gray-600 pt-2 border-t">
          <span>Total Users: {data.reduce((sum, company) => sum + company.userCount, 0)}</span>
          <span>Peak: {maxValue} users</span>
        </div>
      </CardContent>
    </Card>
  );
}
