import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, Tooltip } from 'recharts';

export interface ReLoanDataProps {
    totalApplications: number; // e.g. 1200
    fresh: {
        percentage: number; // e.g. 76
        value: number; // e.g. 912
    };
    repeat: {
        percentage: number; // e.g. 24
        value: number; // e.g. 288
    };
    overallRetentionPct: number; // e.g. 24
    variance: string; // e.g. "+5%"
    isPositiveVariance: boolean; // e.g. true makes it green
}

export interface ReLoanRetentionProps {
    title?: string;
    subTitle?: string;
    data?: ReLoanDataProps;
}

const ReLoan_Retention: React.FC<ReLoanRetentionProps> = ({
    title = "Re-loan Retention %",
    subTitle = "Re-loan Retention",
    data
}) => {
    // Fallback Mock Data
    const currentData = data ?? {
        totalApplications: 1200,
        fresh: { percentage: 76, value: 912 },
        repeat: { percentage: 24, value: 288 },
        overallRetentionPct: 24,
        variance: "+5%",
        isPositiveVariance: true,
    };
    const chartData = [
        { name: 'T.Loan Appl', value: currentData.totalApplications, fill: '#60a5fa' }, // Blue
        { name: 'Fresh', value: currentData.fresh.value, fill: '#fbbf24', percentage: currentData.fresh.percentage }, // Yellow
        { name: 'Repeat', value: currentData.repeat.value, fill: '#f97316', percentage: currentData.repeat.percentage }, // Orange
    ];

    const renderCustomLabel = (props: any) => {
        const { x, y, width, value, index } = props;
        const entry = chartData[index];
        const percentageText = entry.percentage ? `(${entry.percentage}%)` : '';

        return (
            <text x={x + width / 2} y={y - 8} fill="#475569" textAnchor="middle" fontSize="9" fontWeight="bold">
                {value} <tspan fill="#94a3b8" fontWeight="500">{percentageText}</tspan>
            </text>
        );
    };

    return (
        <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm w-full h-full font-sans flex flex-col justify-between">
            {/* Header */}
            <div className="bg-gray-50/80 px-3 py-2 2xl:px-4 2xl:py-3 border-b border-gray-100 w-full text-left">
                <h2 className="text-[10px] 2xl:text-[12px] font-semibold text-gray-800 tracking-tight">{title}</h2>
            </div>

            <div className="p-2.5 2xl:p-4 flex flex-col flex-grow">
                {/* Top Metrics & Legend */}
                <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center mb-1.5 gap-1.5 2xl:gap-0">
                    <div className="text-gray-500 text-[10px] 2xl:text-[11px] font-medium tracking-tight mb-0.5 2xl:mb-0">{subTitle}</div>

                    {/* Legend Pills */}
                    <div className="flex flex-wrap gap-1 2xl:gap-1.5">
                        <div className="flex items-center gap-1 2xl:gap-1.5 bg-[#f8fafc] border border-gray-100 px-1.5 py-0.5 2xl:px-2 2xl:py-1 rounded-md shadow-sm">
                            <div className="w-1.5 h-1.5 2xl:w-2 2xl:h-2 rounded-full bg-[#60a5fa]"></div> {/* Blue */}
                            <span className="text-[#334155] text-[9px] 2xl:text-[11px] font-medium tracking-tight whitespace-nowrap">T.Loan Appl</span>
                        </div>
                        <div className="flex items-center gap-1 2xl:gap-1.5 bg-[#f8fafc] border border-gray-100 px-1.5 py-0.5 2xl:px-2 2xl:py-1 rounded-md shadow-sm">
                            <div className="w-1.5 h-1.5 2xl:w-2 2xl:h-2 rounded-full bg-[#fbbf24]"></div> {/* Yellow */}
                            <span className="text-[#334155] text-[9px] 2xl:text-[11px] font-medium tracking-tight whitespace-nowrap">Fresh</span>
                        </div>
                        <div className="flex items-center gap-1 2xl:gap-1.5 bg-[#f8fafc] border border-gray-100 px-1.5 py-0.5 2xl:px-2 2xl:py-1 rounded-md shadow-sm">
                            <div className="w-1.5 h-1.5 2xl:w-2 2xl:h-2 rounded-full bg-[#f97316]"></div> {/* Orange */}
                            <span className="text-[#334155] text-[9px] 2xl:text-[11px] font-medium tracking-tight whitespace-nowrap">Repeat</span>
                        </div>
                    </div>
                </div>

                {/* Big Number and Variance badge */}
                <div className="flex items-center gap-1.5 mb-2.5 2xl:mb-5 mt-1 2xl:mt-0">
                    <span className="text-gray-900 text-[20px] 2xl:text-[26px] font-bold tracking-tight leading-none flex items-baseline">
                        {currentData.overallRetentionPct} <span className="text-[13px] 2xl:text-[17px] ml-1 text-gray-400 font-semibold">%</span>
                    </span>
                    <span className={`text-white text-[9px] 2xl:text-[10px] font-bold px-1 py-0.5 2xl:px-1.5 rounded-md self-center mt-0.5 ${currentData.isPositiveVariance ? 'bg-[#10b981]' : 'bg-[#ef4444]'}`}>
                        {currentData.variance}
                    </span>
                </div>

                {/* Visual Diagram Area (Bar Chart) */}
                <div className="w-full flex-grow min-h-[220px] 2xl:min-h-[260px] relative -ml-4 mt-2 2xl:mt-6">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            margin={{ top: 30, right: 10, left: 10, bottom: 0 }}
                            maxBarSize={45}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis
                                dataKey="name"
                                axisLine={true}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 9, fontWeight: 500 }}
                                dy={8}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 9, fontWeight: 500 }}
                            />
                            <Tooltip
                                cursor={{ fill: 'transparent', stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '3 3' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]} label={renderCustomLabel}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
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

export default ReLoan_Retention;
