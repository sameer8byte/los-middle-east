import React from 'react';
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

export interface CollectionDataPoint {
    month: string;
    tLoan: number;
    collected: number;
    collectionPct: number;
}

export interface CollectionProps {
    title?: string;
    subTitle?: string;
    currentRate?: string;
    variance?: string;
    isPositiveVariance?: boolean;
    data?: CollectionDataPoint[];
}

// Mock Data
const MOCK_DATA: CollectionDataPoint[] = [
    { month: "OCT '24", tLoan: 48, collected: 36, collectionPct: 84 },
    { month: "NOV '24", tLoan: 34, collected: 28, collectionPct: 72 },
    { month: "DEC '24", tLoan: 42, collected: 32, collectionPct: 84.25 }
];

// Helper to render label above the bar
const renderCustomBarLabel = (props: any) => {
    const { x, y, width, value } = props;
    return (
        <text
            x={x + width / 2}
            y={y - 8}
            fill="#334155"
            textAnchor="middle"
            fontSize="9"
            fontWeight="500"
        >
            {value} M
        </text>
    );
};

// Helper to render label above the line dot
const renderCustomLineLabel = (props: any) => {
    const { x, y, value } = props;
    return (
        <text
            x={x}
            y={y - 10}
            fill="#475569"
            textAnchor="middle"
            fontSize="9"
            fontWeight="500"
        >
            {value} %
        </text>
    );
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-gray-100 p-3 rounded-lg shadow-xl text-sm flex flex-col gap-2 min-w-[120px] font-medium tracking-wide z-50">
                <span className="text-gray-500 font-semibold mb-1">{label}</span>
                {payload.map((entry: any, index: number) => (
                    <div key={`item-${index}`} className="flex justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
                            <span className="text-gray-600">{entry.name}</span>
                        </div>
                        <span className="text-gray-900 font-bold">
                            {entry.value} {entry.name === 'Collection %' ? '%' : 'M'}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const Collection: React.FC<CollectionProps> = ({
    title = "Collection % (Last 3 Months)",
    subTitle = "Collection Rate",
    currentRate = "84 %",
    variance = "- 16.75 %",
    isPositiveVariance = false,
    data = MOCK_DATA,
}) => {
    return (
        <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm w-full h-full font-sans flex flex-col">
            {/* Header */}
            <div className="bg-gray-50/80 px-3 py-2 2xl:px-5 2xl:py-3 border-b border-gray-100">
                <h2 className="text-[11px] 2xl:text-[13px] font-semibold text-gray-900 tracking-tight">{title}</h2>
            </div>

            <div className="p-2 2xl:p-4 flex-grow flex flex-col">
                {/* Top Metrics & Legend */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-2 gap-2 lg:gap-0">
                    <div className="text-gray-500 text-[10px] 2xl:text-[11px] font-medium tracking-tight whitespace-nowrap">{subTitle}</div>

                    {/* Legend Pills */}
                    <div className="flex flex-wrap gap-1 2xl:gap-1.5">
                        <div className="flex items-center gap-1 bg-[#f8fafc] border border-gray-100 px-1.5 py-0.5 2xl:px-2 2xl:py-1 rounded-md shadow-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#93c5fd]"></div> {/* Light Blue */}
                            <span className="text-[#334155] text-[9px] 2xl:text-[10px] font-medium tracking-tight">T.Loan</span>
                        </div>
                        <div className="flex items-center gap-1 bg-[#f8fafc] border border-gray-100 px-1.5 py-0.5 2xl:px-2 2xl:py-1 rounded-md shadow-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]"></div> {/* Solid Blue */}
                            <span className="text-[#334155] text-[9px] 2xl:text-[10px] font-medium tracking-tight">Collected</span>
                        </div>
                        <div className="flex items-center gap-1 bg-[#f8fafc] border border-gray-100 px-1.5 py-0.5 2xl:px-2 2xl:py-1 rounded-md shadow-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#fb923c]"></div> {/* Orange */}
                            <span className="text-[#334155] text-[9px] 2xl:text-[10px] font-medium tracking-tight">Collection %</span>
                        </div>
                    </div>
                </div>

                {/* Big Number and Variance badge */}
                <div className="flex items-center gap-1.5 2xl:gap-2 mb-1.5 2xl:mb-4 mt-0.5 2xl:mt-0">
                    <span className="text-gray-900 text-[18px] 2xl:text-[26px] font-semibold tracking-tight leading-none">{currentRate}</span>
                    <span className={`text-white text-[9px] 2xl:text-[10px] font-semibold px-1 py-0.5 2xl:px-1.5 2xl:py-0.5 rounded-md self-center mt-0.5 2xl:mt-1 ${isPositiveVariance ? 'bg-green-500' : 'bg-[#ef4444]'}`}>
                        {variance}
                    </span>
                </div>

                {/* Chart Area */}
                <div className="w-full flex-grow min-h-[130px] 2xl:min-h-[170px] relative -ml-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            data={data}
                            margin={{ top: 30, right: 20, left: 0, bottom: 0 }}
                            barCategoryGap="20%"
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
                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                                dy={8}
                            />

                            {/* Left Y Axis for numeric values (e.g. 10M, 20M...) */}
                            <YAxis
                                yAxisId="left"
                                orientation="left"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#0f172a', fontSize: 11, fontWeight: 500 }}
                                tickFormatter={(val) => `${val} M`}
                                domain={[0, 60]}
                                ticks={[10, 20, 30, 40, 50]}
                            />

                            {/* Right Y Axis ONLY for % line to scale it. Hide it visually */}
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                domain={[0, 100]}
                                hide={true} // Hidden!
                            />

                            <Tooltip
                                content={<CustomTooltip />}
                                cursor={{ fill: 'transparent' }}
                            />

                            {/* T.Loan Bar (Light Blue) mapped to left axis */}
                            <Bar
                                yAxisId="left"
                                dataKey="tLoan"
                                name="T.Loan"
                                fill="#93c5fd"
                                label={renderCustomBarLabel}
                                maxBarSize={25}
                            />

                            {/* Collected Bar (Solid Blue) mapped to left axis */}
                            <Bar
                                yAxisId="left"
                                dataKey="collected"
                                name="Collected"
                                fill="#3b82f6"
                                label={renderCustomBarLabel}
                                maxBarSize={25}
                            />

                            {/* Collection % Line mapped to right axis */}
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="collectionPct"
                                name="Collection %"
                                stroke="#fb923c"
                                strokeWidth={2}
                                dot={{ stroke: '#fb923c', strokeWidth: 2, fill: '#fb923c', r: 3 }}
                                activeDot={{ r: 5 }}
                                label={renderCustomLineLabel}
                            />

                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

            </div>
        </div>
    );
};

export default Collection;
