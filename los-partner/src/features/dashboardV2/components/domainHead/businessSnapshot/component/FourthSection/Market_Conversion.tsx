import React, { useState } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    ResponsiveContainer,
    Cell,
    Tooltip
} from 'recharts';

export interface MarketConversionDataPoint {
    month: string;
    rate: number; // e.g. 81
    isCurrent?: boolean; // If true, make it solid blue and show tooltip label
}

export interface MarketConversionProps {
    title?: string;
    subTitle?: string;
    currentRate?: string;
    variance?: string;
    isPositiveVariance?: boolean;
    data?: MarketConversionDataPoint[];
}

// Mock Data matching screenshot approximately
const MOCK_DATA: MarketConversionDataPoint[] = [
    { month: "SEP '25", rate: 35 },
    { month: "OCT '25", rate: 80 },
    { month: "NOV '25", rate: 36 },
    { month: "DEC '25", rate: 92 },
    { month: "JAN '26", rate: 58 },
    { month: "FEB '26", rate: 81, isCurrent: true },
];

// Custom shape for bars to have rounded top corners
const CustomBarShape = (props: any) => {
    const { fill, x, y, width, height } = props;
    const radius = 6; // To match visual rounding

    // If height is very small, don't draw weird negative radius shapes
    if (height < radius) {
        return <rect x={x} y={y} width={width} height={height} fill={fill} />;
    }

    // Path drawing rounded top corners, sharp bottom corners
    const path = `
        M ${x},${y + height}
        L ${x},${y + radius}
        Q ${x},${y} ${x + radius},${y}
        L ${x + width - radius},${y}
        Q ${x + width},${y} ${x + width},${y + radius}
        L ${x + width},${y + height}
        Z
    `;

    return <path d={path} fill={fill} />;
};

// Custom Label applied to every bar, but only renders on the hovered or current one
const renderCustomBarLabel = (props: any) => {
    const { x, y, width, value, index, data, hoveredIndex } = props;
    const item = data && data[index];

    // Show label if this bar is hovered.
    // If no bar is hovered at all, fallback to showing it on the 'isCurrent' bar.
    const isHovered = hoveredIndex === index;
    const shouldShow = isHovered || (item?.isCurrent && hoveredIndex === null);

    if (!shouldShow) return <g></g>;

    // We want to render a dark blue tooltip bubble floating above the top
    const bubbleWidth = 44;
    const bubbleHeight = 28;
    const arrowSize = 6;

    // Center it horizontally over the bar
    const cx = x + width / 2;
    // Position it slightly above the bar
    const cy = y - bubbleHeight - arrowSize - 2;

    return (
        <g>
            {/* The main rounded rectangle bubble */}
            <rect
                x={cx - bubbleWidth / 2}
                y={cy}
                width={bubbleWidth}
                height={bubbleHeight}
                fill="#1e293b" // slate-800
                rx={6}
            />
            {/* The little downward facing triangle/arrow pointing at the bar */}
            <path
                d={`M ${cx - arrowSize},${cy + bubbleHeight} L ${cx + arrowSize},${cy + bubbleHeight} L ${cx},${cy + bubbleHeight + arrowSize} Z`}
                fill="#1e293b"
            />
            {/* The Text inside the bubble */}
            <text
                x={cx}
                y={cy + bubbleHeight / 2 + 3} // vertical alignment
                fill="#ffffff"
                fontSize="10"
                fontWeight="500"
                textAnchor="middle"
            >
                {value}%
            </text>
        </g>
    );
};

const Market_Conversion: React.FC<MarketConversionProps> = ({
    title = "Marketing Conversion",
    subTitle = "Conversion Rate",
    currentRate = "81 %",
    variance = "+5%",
    isPositiveVariance = true,
    data = MOCK_DATA,
}) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    return (
        <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm w-full h-full font-sans flex flex-col">
            {/* Header */}
            <div className="bg-gray-50/80 px-3 py-2 2xl:px-4 2xl:py-3 border-b border-gray-100">
                <h2 className="text-[10px] 2xl:text-[12px] font-semibold text-gray-900 tracking-tight">{title}</h2>
            </div>

            <div className="p-2.5 2xl:p-4 flex-grow flex flex-col">
                {/* Top Metrics */}
                <div className="text-gray-500 text-[10px] 2xl:text-[11px] font-medium tracking-tight mb-0.5 2xl:mb-1.5">{subTitle}</div>

                {/* Big Number and Variance badge */}
                <div className="flex items-center gap-1.5 mb-2 2xl:mb-4 mt-0.5 2xl:mt-0">
                    <span className="text-gray-900 text-[20px] 2xl:text-[26px] font-bold tracking-tight leading-none">{currentRate}</span>
                    <span className={`text-white text-[9px] 2xl:text-[10px] font-bold px-1 py-0.5 2xl:px-1.5 rounded-md self-center mt-0.5 ${isPositiveVariance ? 'bg-[#059669]' : 'bg-[#ef4444]'}`}>
                        {variance}
                    </span>
                </div>

                {/* Chart Area */}
                <div className="w-full flex-grow min-h-[220px] 2xl:min-h-[260px] relative -ml-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{ top: 40, right: 20, left: 0, bottom: 0 }}
                            maxBarSize={30}
                            onMouseMove={(state: any) => {
                                if (state.isTooltipActive && state.activeTooltipIndex !== undefined) {
                                    setHoveredIndex(state.activeTooltipIndex);
                                } else {
                                    setHoveredIndex(null);
                                }
                            }}
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="#e2e8f0" // Light gray dashed lines
                            />

                            <XAxis
                                dataKey="month"
                                axisLine={true}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 9, fontWeight: 500 }}
                                dy={8}
                            />

                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 9, fontWeight: 500 }}
                                tickFormatter={(val) => `${val}%`}
                                domain={[0, 100]}
                                ticks={[0, 20, 40, 60, 80, 100]}
                            />

                            {/* Need a dummy tooltip to trigger state.isTooltipActive and activeTooltipIndex */}
                            <Tooltip cursor={{ fill: 'transparent' }} content={<></>} />

                            <Bar
                                dataKey="rate"
                                shape={<CustomBarShape />}
                                label={(props) => renderCustomBarLabel({ ...props, data, hoveredIndex })} // pass data & hoveredIndex into label
                            >
                                {data.map((_, index) => {
                                    const isHovered = hoveredIndex === index;
                                    const baseColor = '#93c5fd';
                                    const hoverColor = '#60a5fa';

                                    return (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={isHovered ? hoverColor : baseColor}
                                            className="cursor-pointer transition-colors duration-200"
                                        />
                                    );
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>

                    {/* The solid gray line at the very bottom (0% baseline) */}
                    <div className="absolute bottom-[27px] left-[52px] right-0 border-b border-gray-200"></div>
                </div>

            </div>
        </div>
    );
};

export default Market_Conversion;
