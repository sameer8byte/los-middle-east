import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { Conversion } from "../../../../../../../utils/conversion";

export interface RevenueDataPoint {
    date: string;
    value: number;
    percentageChange: string;
}

export interface RevenuePerformanceProps {
    title?: string;
    totalRevenueLabel?: string;
    totalRevenueValue?: string | number;
    data?: RevenueDataPoint[];
}

// Mock Data
const MOCK_DATA: RevenueDataPoint[] = [
    { date: '25 July 2024', value: 10000000, percentageChange: '+1.2%' },
    { date: '26 July 2024', value: 30000000, percentageChange: '+2.1%' },
    { date: '27 July 2024', value: 45000000, percentageChange: '+5.4%' },
    { date: '28 July 2024', value: 35000000, percentageChange: '-1.2%' },
    { date: '29 July 2024', value: 860000000, percentageChange: '+3.4%' },
    { date: '30 July 2024', value: 860000000, percentageChange: '0.0%' },
    { date: '31 July 2024', value: 950000000, percentageChange: '+4.1%' },
];

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 flex flex-col gap-1 min-w-[180px]">
                <span className="text-gray-500 text-sm font-medium">{data.date}</span>
                <div className="flex items-center gap-2">
                    <span className="text-gray-900 text-xl font-semibold">
                        {Conversion.formatCurrency(data.value)}
                    </span>
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-md">
                        {data.percentageChange}
                    </span>
                </div>
            </div>
        );
    }
    return null;
};

// Custom Active Dot with the vertical line
const CustomActiveDot = (props: any) => {
    const { cx, cy } = props;

    // We need to draw the line down to the X axis.
    // We don't have the exact bottom coordinate easily handed to us in standard recharts, 
    // but we can draw a line with a large fixed height that gets clipped by charting area,
    // or a height based on the SVG container, but normally the tooltip line is handled by Tooltip's cursor.
    // Since Recharts AreaChart handles the active dot, we'll configure Tooltip cursor separately.

    return (
        <g>
            <circle cx={cx} cy={cy} r={6} fill="#ffffff" stroke="#3b82f6" strokeWidth={3} />
        </g>
    );
};

const CustomCursor = (props: any) => {
    const { points, height } = props;
    const { x, y } = points[0];
    // Recharts provides points array for the cursor.
    return (
        <line
            x1={x}
            y1={y}
            x2={x}
            // Recharts passes height of the chart area, we can draw line up to the height
            y2={height + 20}
            stroke="#3b82f6"
            strokeWidth={3}
        />
    );
};


const RevenuePerformance: React.FC<RevenuePerformanceProps> = ({
    title = "Revenue Performance",
    totalRevenueLabel = "Total Revenue Generated",
    totalRevenueValue = 86000000,  // BHD 8.6 Cr
    data = MOCK_DATA,
}) => {
    // Format total revenue value
    const formattedTotalRevenue = Conversion.formatCurrency(totalRevenueValue);

    return (
        <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm w-full">
            {/* Header */}
            <div className="bg-gray-50/80 px-3 py-2 2xl:px-5 2xl:py-3 border-b border-gray-100">
                <h2 className="text-[11px] 2xl:text-[13px] font-semibold text-gray-900 tracking-tight">{title}</h2>
            </div>

            <div className="p-3 2xl:p-4">
                {/* Total Revenue Overview */}
                <div className="mb-2 2xl:mb-4">
                    <div className="text-gray-500 text-[10px] 2xl:text-xs font-medium mb-0.5">{totalRevenueLabel}</div>
                    <div className="text-gray-900 text-xl 2xl:text-2xl font-bold tracking-tight">{formattedTotalRevenue}</div>
                </div>

                {/* Chart */}
                <div className="h-[150px] 2xl:h-[200px] w-full -ml-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={data}
                            margin={{ top: 20, right: 10, left: 10, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                                {/* Pattern for the vertical striped grid if desired, but CartesianGrid handles vertical lines */}
                            </defs>

                            <CartesianGrid
                                strokeDasharray="0"
                                vertical={true}
                                horizontal={true}
                                stroke="#f3f4f6"
                                verticalPoints={undefined} // Standard evenly spaced
                            />

                            <XAxis
                                dataKey="date"
                                hide={true} // Hidden as per screenshot 
                            />

                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6b7280', fontSize: 12 }}
                                tickFormatter={(value) => Conversion.formatCurrency(value)}
                                width={60}
                            />

                            <Tooltip
                                content={<CustomTooltip />}
                                cursor={<CustomCursor />}
                                isAnimationActive={false} // Prevents tooltip positioning lag
                            />

                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#60a5fa"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorValue)"
                                activeDot={<CustomActiveDot />}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default RevenuePerformance;
