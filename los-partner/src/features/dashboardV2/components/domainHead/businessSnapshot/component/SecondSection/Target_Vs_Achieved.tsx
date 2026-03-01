import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

export interface TargetAchievedDataPoint {
    month: string;
    achieved: number;
    target: number;
}

export interface TargetVsAchievedProps {
    title?: string;
    subTitle?: string;
    achievedPercentage?: string;
    variance?: string;
    isPositiveVariance?: boolean;
    data?: TargetAchievedDataPoint[];
}

// Mock Data
const MOCK_DATA: TargetAchievedDataPoint[] = [
    { month: 'NOV ‘24', achieved: 30, target: 48 },
    { month: 'DEC ‘24', achieved: 58, target: 72 },
    { month: 'JAN ‘25', achieved: 51, target: 58 },
    { month: 'FEB ‘25', achieved: 93, target: 100 },
];

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        // payload for a stacked bar chart has multiple items (achieved, target)
        // We know [0] is achieved and [1] is target (or vice versa depending on rendering order).
        // Let's find them by dataKey.
        const achievedPayload = payload.find((p: any) => p.dataKey === 'achieved');
        const targetPayload = payload.find((p: any) => p.dataKey === 'target');

        const achievedValue = achievedPayload?.value ?? 0;
        // since they are stacked or not staked, Recharts sometimes bundles them. 
        // Here we aren't using stacked `stackId`, we are just layering them in SVG with two overlapping bars to get the exact rounded look,
        // or actually `stackId="a"` works, but `target` value needs to be `target_total - achieved` if truly stacked.
        // Assuming we pass raw values and use no stackId (overlaying them), the values are raw.
        // Let's just use the payload values directly.
        const targetValue = targetPayload?.value ?? 0;

        return (
            <div className="bg-[#1e293b] text-white p-3 rounded-lg shadow-xl relative mt-2 text-sm flex flex-col gap-1.5 min-w-[90px] font-medium tracking-wide z-50">
                {/* Little triangle pointing down */}
                <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-[#1e293b]"></div>

                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]"></div>
                    <span>{achievedValue}%</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#93c5fd]"></div>
                    <span>{targetValue}%</span>
                </div>
            </div>
        );
    }
    return null;
};

// Custom shape for the target (background) bar to have rounded tops ONLY
const CustomTargetBarShape = (props: any) => {
    const { fill, x, y, width, height } = props;
    const radius = 6;
    return (
        <path
            d={`M${x},${y + height} L${x},${y + radius} Q${x},${y} ${x + radius},${y} L${x + width - radius},${y} Q${x + width},${y} ${x + width},${y + radius} L${x + width},${y + height} Z`}
            fill={fill}
        />
    );
};


const TargetVsAchieved: React.FC<TargetVsAchievedProps> = ({
    title = "Target Vs Achieved",
    subTitle = "Target Achieved",
    achievedPercentage = "85 %",
    variance = "- 5 %",
    isPositiveVariance = false,
    data = MOCK_DATA,
}) => {
    return (
        <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm w-full h-full font-sans flex flex-col">
            {/* Header */}
            <div className="bg-gray-50/80 px-3 py-2 2xl:px-5 2xl:py-3 border-b border-gray-100">
                <h2 className="text-[11px] 2xl:text-[13px] font-semibold text-gray-900 tracking-tight">{title}</h2>
            </div>

            <div className="p-3 2xl:p-5 flex-grow flex flex-col">

                {/* Top Metrics & Legend */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-2 2xl:mb-4 gap-2 lg:gap-0">
                    <div>
                        <div className="text-gray-500 text-[10px] 2xl:text-[12px] font-medium mb-0.5 2xl:mb-1">{subTitle}</div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-900 text-[18px] 2xl:text-[22px] font-bold tracking-tight leading-none truncate">{achievedPercentage}</span>
                            <span className={`text-white text-[9px] 2xl:text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isPositiveVariance ? 'bg-green-500' : 'bg-[#ef4444]'}`}>
                                {variance}
                            </span>
                        </div>
                    </div>

                    {/* Legend Pills */}
                    <div className="flex gap-1.5">
                        <div className="flex items-center gap-1.5 bg-[#f8fafc] border border-gray-100 px-2 py-1 rounded-md shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-[#dbeafe]"></div>
                            <span className="text-[#334155] text-[9px] 2xl:text-[10px] font-medium">Target</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-[#f8fafc] border border-gray-100 px-2 py-1 rounded-md shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-[#3b82f6]"></div>
                            <span className="text-[#334155] text-[9px] 2xl:text-[10px] font-medium">Achieved</span>
                        </div>
                    </div>
                </div>

                {/* Chart Area */}
                <div className="w-full flex-grow min-h-[140px] 2xl:min-h-[180px] relative -ml-1">
                    <ResponsiveContainer width="100%" height="100%">
                        {/* We use a BarChart but we will OVERLAY the bars instead of stacking them to avoid math. 
                            Recharts overlays bars if they don't have a stackId and share the same XAxis.
                            We render the Target (taller/lighter) FIRST, then Achieved (shorter/darker) SECOND so it sits on top.
                            Technically we need Achieved as a percentage of Target or just raw percentage. 
                            The Y-axis goes 0 to 100%. */}
                        <BarChart
                            data={data}
                            margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
                            barCategoryGap="25%"
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="#e2e8f0" // Light gray dashed lines
                            />

                            {/* In Recharts, if you want bars to perfectly overlap instead of sitting side-by-side, 
                                you assign them to DIFFERENT XAxes that share the same dataKey. */}
                            <XAxis
                                dataKey="month"
                                axisLine={true} // Enabled native Recharts axis line instead of tricky absolute CSS division line
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                                dy={10}
                                xAxisId={0}
                            />
                            <XAxis
                                dataKey="month"
                                hide={true}
                                xAxisId={1}
                            />

                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#0f172a', fontSize: 11, fontWeight: 500 }}
                                tickFormatter={(val) => `${val}%`}
                                domain={[0, 100]}
                                ticks={[20, 40, 60, 80, 100]} // Explicit ticks matching UI
                            />
                            <Tooltip
                                content={<CustomTooltip />}
                                cursor={{ fill: 'transparent' }} // Removes the grey hover background on the bar
                                position={{ y: -30 }} // Bump it up above the bar slightly
                            />

                            {/* Target Bar (Background, Light Blue) */}
                            <Bar
                                dataKey="target"
                                fill="#dbeafe"
                                shape={<CustomTargetBarShape />}
                                xAxisId={0}
                            />

                            {/* Achieved Bar (Foreground, Solid Blue) */}
                            {/* We don't need a custom shape here if it's always flush with the bottom, 
                                but Recharts default bar shape is rectangle. 
                                In the screenshot, the Achieved bar doesn't have rounded corners UNLESS it reaches the top (like FEB). 
                                We will just use the standard rectangle, or the custom shape to be safe if it hits 100%. */}
                            <Bar
                                dataKey="achieved"
                                fill="#3b82f6"
                                xAxisId={1}
                                /* We use the same custom shape so if it hits 100% it rounds the top corners nicely */
                                shape={<CustomTargetBarShape />}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

            </div>
        </div>
    );
};

export default TargetVsAchieved;
