import React from 'react';

export interface DeficitCollectionData {
    deficitPercentage: number; // e.g., 2
    totalObligation: string;   // e.g., "₹'XX,XXX'"
    targetDeficit: {
        percentage: string;    // e.g., "85 %"
        value: string;         // e.g., "₹7.86 Cr"
    };
    actualCollection: {
        percentage: string;    // e.g., "83 %"
        value: string;         // e.g., "₹7.67 Cr"
    };
    deficit: {
        percentage: string;    // e.g., "83 %"
        value: string;         // e.g., "₹18.5 L"
    };
}

export interface DeficitCollectionProps {
    title?: string;
    data?: DeficitCollectionData;
}

const Deficit_Collection: React.FC<DeficitCollectionProps> = ({
    title = "Deficit Collection",
    data
}) => {
    // Fallback Mock Data
    const currentData = data ?? {
        deficitPercentage: 2, // 2% 
        totalObligation: "₹'XX,XXX'",
        targetDeficit: { percentage: "85 %", value: "₹7.86 Cr" },
        actualCollection: { percentage: "83 %", value: "₹7.67 Cr" },
        deficit: { percentage: "83 %", value: "₹18.5 L" },
    };

    // Gauge Configuration
    const width = 280;
    const height = 150;
    const cx = width / 2;
    const cy = height; // Bottom anchor for the half circle
    const radius = 150;
    const strokeWidth = 20; // Thinner stroke

    // SVG Arc Path helper (0 degrees is right, 180 degrees is left)
    const describeArc = (x: number, y: number, r: number, startAngle: number, endAngle: number) => {
        // Angles from 0 (right) to 180 (left). We want to draw from left to right normally, 
        // so startAngle is usually 180, and it progresses towards 0.
        const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
            const angleInRadians = (angleInDegrees - 180) * Math.PI / 180.0;
            return {
                x: centerX + (radius * Math.cos(angleInRadians)),
                y: centerY + (radius * Math.sin(angleInRadians))
            };
        };

        const start = polarToCartesian(x, y, r, endAngle);
        const end = polarToCartesian(x, y, r, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

        return [
            "M", start.x, start.y,
            "A", r, r, 0, largeArcFlag, 0, end.x, end.y
        ].join(" ");
    };

    // Calculate Gauge Angles based on percentage (max 100%).
    // Note: The UI screenshot shows a huge red bar even for 2%. 
    // It's possible the logic maps Target vs Actual. A 2% deficit mapped visually to a near 80% circle is odd,
    // usually indicating that the RED is the Actual Collection (83%) and the unfilled blue is the Deficit (2%? Math: 85-83=2).
    // Let's assume the red bar is representing Actual Collection (83% of Target) and the tooltip/pin is on the 83% mark.
    const actualCollectionPercentage = parseInt(currentData.actualCollection.percentage.replace('%', '').trim()) || 83;
    const percentageAngle = (actualCollectionPercentage / 100) * 180;

    // Background Arc (Light Blue/Gray) - covers the whole 180 degrees
    const backgroundArc = describeArc(cx, cy, radius, 0, 180);
    // Foreground Arc (Red) - from left (0) to target (percentageAngle)
    const foregroundArc = describeArc(cx, cy, radius, 0, percentageAngle);

    // Marker position calculation
    // Left edge is angle 0, right edge is 180.
    // If percentage is 0%, marker is at 0. If 100%, marker is at 180.
    const markerAngle = percentageAngle;
    const angleInRadians = (markerAngle - 180) * Math.PI / 180.0;
    const markerPos = {
        x: cx + (radius * Math.cos(angleInRadians)),
        y: cy + (radius * Math.sin(angleInRadians))
    };

    return (
        <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm w-full h-full font-sans flex flex-col justify-between">
            {/* Header */}
            <div className="bg-gray-50/80 px-3 py-2 2xl:px-5 2xl:py-3 border-b border-gray-100 w-full text-left">
                <h2 className="text-[11px] 2xl:text-[13px] font-semibold text-gray-800 tracking-tight">{title}</h2>
            </div>

            <div className="p-3 2xl:p-5 flex flex-col flex-grow items-center">

                {/* Center Grey Card for Gauge Container */}
                <div className="bg-[#f8fafc] rounded-2xl w-full flex flex-col items-center justify-center pt-4 2xl:pt-8 pb-3 2xl:pb-5 relative mb-3 2xl:mb-5">

                    {/* SVG Gauge */}
                    <div className="relative w-full max-w-[150px] 2xl:max-w-[210px] h-auto flex justify-center items-end mt-1">
                        <svg width="100%" height="auto" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">

                            {/* Background Arc */}
                            <path
                                d={backgroundArc}
                                fill="none"
                                stroke="#eef2f6" // Light grey/blue
                                strokeWidth={strokeWidth}
                                strokeLinecap="round"
                            />

                            {/* Foreground Arc (Red) */}
                            <path
                                d={foregroundArc}
                                fill="none"
                                stroke="#ef4444" // Red line
                                strokeWidth={strokeWidth}
                                strokeLinecap="round"
                            />

                            {/* Drop shadow for the floating marker */}
                            <defs>
                                <filter id="marker-shadow" x="-50%" y="-50%" width="200%" height="200%">
                                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.15" />
                                </filter>
                            </defs>

                            {/* The Floating Circular Marker */}
                            {/* White outer circle */}
                            <circle
                                cx={markerPos.x}
                                cy={markerPos.y}
                                r={12}
                                fill="#ffffff"
                                filter="url(#marker-shadow)"
                            />
                            {/* Red inner circle */}
                            <circle
                                cx={markerPos.x}
                                cy={markerPos.y}
                                r={6}
                                fill="#ef4444"
                            />

                            {/* Centered Gauge Text Inside SVG so it scales ratio-perfectly */}
                            <text x={cx} y={cy - 20} textAnchor="middle" fill="#334155" fontSize="38" fontWeight="bold">
                                {currentData.deficitPercentage}%
                            </text>
                            <text x={cx} y={cy + 4} textAnchor="middle" fill="#475569" fontSize="16" fontWeight="500">
                                Deficit
                            </text>

                        </svg>
                    </div>

                    {/* Bottom label under gauge inside the grey card */}
                    <div className="mt-3 2xl:mt-5 text-center text-[10px] 2xl:text-[12px] font-medium text-[#475569] tracking-wide w-4/5 2xl:w-3/4 mx-auto leading-relaxed">
                        Against Total Obligation of : <br />
                        <span className="text-[#334155] font-bold">{currentData.totalObligation}</span>
                    </div>

                </div>

                {/* Divider Line */}
                <div className="w-full border-t border-dashed border-gray-200 mb-2 2xl:mb-4"></div>

                {/* Bottom Metrics Grid */}
                <div className="w-full grid grid-cols-3 gap-1.5 2xl:gap-3">

                    {/* Column 1 */}
                    <div className="flex flex-col">
                        <span className="text-[#64748b] text-[9px] 2xl:text-[11px] font-medium mb-0.5 truncate">Target Deficit</span>
                        <div className="flex flex-col text-[10px] 2xl:text-[12px] font-bold text-gray-900 tracking-tight leading-snug">
                            <span>{currentData.targetDeficit.percentage}</span>
                            <span className="text-gray-500 font-semibold">{currentData.targetDeficit.value}</span>
                        </div>
                    </div>

                    {/* Column 2 */}
                    <div className="flex flex-col text-center items-center">
                        <span className="text-[#64748b] text-[9px] 2xl:text-[11px] font-medium mb-0.5 truncate">Actual Collection</span>
                        <div className="flex flex-col text-[10px] 2xl:text-[12px] font-bold text-gray-900 tracking-tight leading-snug">
                            <span>{currentData.actualCollection.percentage}</span>
                            <span className="text-gray-500 font-semibold">{currentData.actualCollection.value}</span>
                        </div>
                    </div>

                    {/* Column 3 */}
                    <div className="flex flex-col text-right items-end">
                        <span className="text-[#64748b] text-[9px] 2xl:text-[11px] font-medium mb-0.5 truncate">Deficit</span>
                        <div className="flex flex-col text-[10px] 2xl:text-[12px] font-bold text-gray-900 tracking-tight leading-snug">
                            <span>{currentData.deficit.percentage}</span>
                            <span className="text-gray-500 font-semibold">{currentData.deficit.value}</span>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Deficit_Collection;
