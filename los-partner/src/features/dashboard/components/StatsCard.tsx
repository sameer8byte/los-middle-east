import { Card, CardContent, CardHeader, CardTitle } from "../../../common/ui/card";
import { StatsCardProps } from "../types/dashboard.types";

export function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend, 
  loading = false 
}: Readonly<StatsCardProps>) {
  const formatValue = (val: number | string) => {
    if (typeof val === "number") {
      // Format large numbers
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      } else if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-20 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">
          {formatValue(value)}
        </div>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
        {trend && (
          <div className={`text-sm mt-2 flex items-center gap-1 ${
            trend.isPositive ? "text-green-600" : "text-red-600"
          }`}>
            <span className={trend.isPositive ? "↗️" : "↘️"}>
              {trend.isPositive ? "+" : ""}{trend.value}%
            </span>
            <span className="text-gray-500">vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
