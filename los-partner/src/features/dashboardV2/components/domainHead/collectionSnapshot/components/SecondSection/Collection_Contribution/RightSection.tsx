'use client';

import { useState } from 'react';
import { Conversion as ConversionUtil } from '../../../../../../../../utils/conversion';

interface ChartData {
    name: string;
    value: number;
    amount: number;
    color: string;
}

interface ChartProps {
    data?: ChartData[];
    totalAmount?: number;
    label?: string;
}

const defaultData: ChartData[] = [
    { name: 'Collected', value: 63, amount: 38000000, color: '#ecfccb' }, // Light green
    { name: 'Pending', value: 20, amount: 12000000, color: '#fde047' },   // Yellow
    { name: 'Overdue', value: 17, amount: 10000000, color: '#fca5a5' },     // Light red
];

export default function RightSection({
    data = defaultData,
    totalAmount = 60000000,
    label = "Total Due"
}: ChartProps) {
    const [hoverData, setHoverData] = useState<{ index: number, x: number, y: number } | null>(null);

    // SVG Configuration
    const SIZE = 170;
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
    const totalValue = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = 0;

    const sectors = data.map((item, index) => {
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

            {/* Central Chart Area */}
            <div className="flex-grow flex items-center justify-center relative pt-2 pb-3 2xl:pt-4 2xl:pb-6">

                <div className="relative w-full max-w-[150px] 2xl:max-w-[240px] aspect-square flex items-center justify-center">
                    <div className="absolute inset-0 z-10 w-full h-full flex justify-center items-center">
                        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-full overflow-visible">
                            {sectors}
                        </svg>
                    </div>

                    {/* Center Text Overlays */}
                    <div className="relative z-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[12px] font-bold text-[#334155] leading-none mb-0.5 2xl:mb-1">
                            {ConversionUtil.formatCurrency(totalAmount)}
                        </span>
                        <span className="text-[11px] 2xl:text-[14px] font-medium text-[#64748b]">
                            {label}
                        </span>
                    </div>
                </div>

                {/* Custom Tooltip */}
                {hoverData !== null && (
                    <div
                        className="fixed z-50 pointer-events-none bg-white p-3 rounded-xl border border-gray-100 shadow-xl text-[13px] min-w-[120px]"
                        style={{
                            left: hoverData.x + 10,
                            top: hoverData.y + 10,
                        }}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-2.5 h-2.5 rounded hover:opacity-80" style={{ backgroundColor: data[hoverData.index].color }}></span>
                            <span className="font-bold text-gray-800">
                                {data[hoverData.index].name}
                            </span>
                        </div>
                        <div className="text-gray-500 font-medium ml-4.5">
                            {data[hoverData.index].value} % <span className="mx-1 text-gray-300">|</span> {ConversionUtil.formatCurrency(data[hoverData.index].amount)}
                        </div>
                    </div>
                )}
            </div>

            {/* Horizontal Dashed Divider */}
            <div className="w-full border-t border-dashed border-gray-200 mt-2 mb-3 2xl:mb-6"></div>

            {/* Bottom Metrics Structure (3 Columns) */}
            <div className="grid grid-cols-3 gap-2 2xl:gap-4 w-full px-1 2xl:px-2">
                {data.map((item, idx) => (
                    <div key={idx} className="flex flex-col">
                        <span className="text-[#64748b] text-[10px] 2xl:text-[13px] font-medium mb-0.5 2xl:mb-1.5">{item.name}</span>
                        <div className="flex flex-col 2xl:flex-row 2xl:items-center text-[11px] 2xl:text-[14px]">
                            <span className="font-bold text-gray-900">{item.value} %</span>
                            <span className="hidden 2xl:inline mx-1.5 text-gray-300">|</span>
                            <span className="font-medium text-gray-700">{ConversionUtil.formatCurrency(item.amount)}</span>
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
}