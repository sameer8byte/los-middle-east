'use client';

import { useState } from 'react';

interface ChartData {
    name: string;
    value: number;
    count: number;
    color: string;
}

interface ChartProps {
    data?: ChartData[];
    currentValue?: number | string;
    total?: number | string;
    label?: string;
    dropOffRate?: number;
}

const defaultData: ChartData[] = [
    { name: 'Low Credit Score', count: 82, value: 26, color: '#bde0fe' },
    { name: 'No Response', count: 64, value: 20, color: '#74b1fa' },
    { name: 'High Foir', count: 52, value: 16, color: '#3b82f6' },
    { name: 'Customer Declined', count: 48, value: 15, color: '#2b84fb' },
    // Extra 5 Metrics behind the toggle
    { name: 'Duplicate Leads', count: 20, value: 6, color: '#1e3a8a' },
    { name: 'Invalid Number', count: 18, value: 6, color: '#4338ca' },
    { name: 'Not Interested', count: 15, value: 5, color: '#1d4ed8' },
    { name: 'Area Negative', count: 12, value: 4, color: '#1e40af' },
    { name: 'Other Reasons', count: 9, value: 2, color: '#312e81' },
];

export default function RightSection({
    data = defaultData,
    currentValue = 320,
    total = 1500,
    label = "Lead Lost",
    dropOffRate = 21
}: ChartProps) {
    const [hoverData, setHoverData] = useState<{ index: number, x: number, y: number } | null>(null);
    const [showAll, setShowAll] = useState(false);

    // Compute active Data
    const activeData = showAll || data.length <= 4
        ? data
        : [
            ...data.slice(0, 4),
            {
                name: 'Other',
                count: data.slice(4).reduce((acc, curr) => acc + curr.count, 0),
                value: data.slice(4).reduce((acc, curr) => acc + curr.value, 0),
                color: '#1d4ed8' // Original 'Other' combined color
            }
        ];

    const remainingCount = data.length > 4 ? data.length - 4 : 0;
    const legendItems = showAll ? activeData : activeData.slice(0, 4);

    // SVG Configuration
    const SIZE = 240;
    const CENTER = SIZE / 2;
    const OUTER_RADIUS = 100;
    const INNER_RADIUS = 60; // Thicker donut

    // Mathematical Path Generator for a Donut Sector
    const createDonutSector = (
        cx: number, cy: number,
        innerR: number, outerR: number,
        startAngleDeg: number, endAngleDeg: number
    ) => {
        const RADIAN = Math.PI / 180;

        // Add a small gap between sectors by reducing the drawn angle slightly
        const gap = 2; // 2 degree gap
        const adjustedStart = startAngleDeg + gap / 2;
        const adjustedEnd = endAngleDeg - gap / 2;

        if (adjustedEnd - adjustedStart <= 0) return "";

        const startRad = (adjustedStart - 90) * RADIAN;
        const endRad = (adjustedEnd - 90) * RADIAN;

        const x1Outer = cx + outerR * Math.cos(startRad);
        const y1Outer = cy + outerR * Math.sin(startRad);
        const x2Outer = cx + outerR * Math.cos(endRad);
        const y2Outer = cy + outerR * Math.sin(endRad);

        const x1Inner = cx + innerR * Math.cos(startRad);
        const y1Inner = cy + innerR * Math.sin(startRad);
        const x2Inner = cx + innerR * Math.cos(endRad);
        const y2Inner = cy + innerR * Math.sin(endRad);

        const largeArcFlag = adjustedEnd - adjustedStart <= 180 ? 0 : 1;

        return [
            `M ${x1Outer},${y1Outer}`,
            `A ${outerR},${outerR} 0 ${largeArcFlag},1 ${x2Outer},${y2Outer}`,
            `L ${x2Inner},${y2Inner}`,
            `A ${innerR},${innerR} 0 ${largeArcFlag},0 ${x1Inner},${y1Inner}`,
            `Z`
        ].join(" ");
    };

    // Calculate Paths iteratively
    const totalValue = activeData.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = 0;

    const sectors = activeData.map((item, index) => {
        // Map percentage to 360 degrees
        const angleSize = (item.value / totalValue) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angleSize;
        currentAngle += angleSize;

        const pathData = createDonutSector(CENTER, CENTER, INNER_RADIUS, OUTER_RADIUS, startAngle, endAngle);

        return (
            <path
                key={`sector-${index}`}
                d={pathData}
                fill={item.color}
                onMouseEnter={(e) => setHoverData({ index, x: e.clientX, y: e.clientY })}
                onMouseMove={(e) => setHoverData({ index, x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setHoverData(null)}
                className="transition-opacity duration-200 hover:opacity-80"
                style={{ cursor: 'pointer' }}
            />
        );
    });

    return (
        <div className="flex flex-col h-full font-sans w-full overflow-hidden">

            {/* Header Area */}
            <div className="flex items-center justify-between mb-2 2xl:mb-4 px-2">
                <h3 className="text-[13px] 2xl:text-[15px] font-bold text-gray-800 tracking-tight">Lead Drop Off Analysis</h3>
                <div className="text-[11px] 2xl:text-[13px] font-medium text-gray-500">
                    <span className="text-[#ef4444] font-bold text-[15px] 2xl:text-[18px] mr-1 2xl:mr-1.5">{dropOffRate}%</span>
                    Drop Off Rate
                </div>
            </div>

            {/* Horizontal Dashed Divider */}
            <div className="w-full border-t border-dashed border-gray-200"></div>

            {/* Central Chart Area */}
            <div className="flex-grow flex items-center justify-center relative mt-2 2xl:mt-3">

                <div className="relative w-full max-w-[200px] 2xl:max-w-[240px] aspect-square flex items-center justify-center">
                    <div className="absolute inset-0 z-10 w-full h-full flex justify-center items-center">
                        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-full overflow-visible">
                            {sectors}
                        </svg>
                    </div>

                    {/* Center Text Overlays */}
                    <div className="relative z-0 flex flex-col items-center justify-center pointer-events-none mt-4 2xl:mt-0">
                        <span className="text-[15px] 2xl:text-[18px] font-bold text-[#334155] leading-none mb-1">
                            {currentValue}/{total}
                        </span>
                        <span className="text-[11px] 2xl:text-[13px] font-medium text-[#64748b]">
                            {label}
                        </span>
                    </div>
                </div>

                {/* Custom Tooltip */}
                {hoverData !== null && (
                    <div
                        className="fixed z-50 pointer-events-none bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-md text-[12px]"
                        style={{
                            left: hoverData.x + 10,
                            top: hoverData.y + 10,
                        }}
                    >
                        <span className="font-semibold text-gray-800">
                            {activeData[hoverData.index].name}
                        </span>
                        <div className="text-gray-500 mt-0.5">
                            {activeData[hoverData.index].count} leads ({activeData[hoverData.index].value}%)
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Legend Structure */}
            <div className="flex flex-wrap items-center gap-1.5 2xl:gap-2 mt-2 2xl:mt-0">
                {/* Render active legends */}
                {legendItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1 2xl:gap-1.5 bg-[#f8fafc] border border-gray-100 rounded-full px-2 lg:px-2.5 py-0.5 2xl:py-1 text-[10px] lg:text-[10px] 2xl:text-[11px] font-medium whitespace-nowrap transition-colors duration-300">
                        <span className="w-1.5 h-1.5 2xl:w-2 2xl:h-2 rounded-full shrink-0 transition-colors duration-300" style={{ backgroundColor: item.color }}></span>
                        <span className="text-gray-600">{item.name} - {item.count} <span className="text-gray-300 mx-0.5 lg:mx-1">|</span> {item.value} %</span>
                    </div>
                ))}

                {/* Toggle Buttons */}
                {!showAll && remainingCount > 0 && (
                    <div
                        onClick={() => setShowAll(true)}
                        className="bg-[#3b82f6] text-white rounded-full px-2 lg:px-2.5 py-0.5 2xl:py-1 text-[10px] lg:text-[10px] 2xl:text-[11px] font-bold tracking-wide whitespace-nowrap cursor-pointer hover:bg-blue-600 transition-colors"
                    >
                        + {remainingCount} Metrics
                    </div>
                )}

                {showAll && (
                    <div
                        onClick={() => setShowAll(false)}
                        className="bg-gray-100 text-gray-600 rounded-full px-2 lg:px-2.5 py-0.5 2xl:py-1 text-[10px] lg:text-[10px] 2xl:text-[11px] font-bold tracking-wide whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors"
                    >
                        Show Less
                    </div>
                )}
            </div>

        </div>
    );
}