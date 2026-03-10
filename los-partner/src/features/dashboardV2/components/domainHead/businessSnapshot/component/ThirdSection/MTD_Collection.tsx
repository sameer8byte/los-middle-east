import React from 'react';

export interface MTDCollectionProps {
    title?: string;
    percentage?: number;
    variance?: string;
    lastUpdated?: string;
}

const MTD_Collection: React.FC<MTDCollectionProps> = ({
    title = "MTD Collection %",
    percentage = 82,
    variance = "-18%",
    lastUpdated = "Last Updated “Time Stamp”",
}) => {
    // Gauge Configuration - SCALED UP
    const width = 450;
    const height = 270;
    const cx = width / 2;
    const cy = height - 40; // Center Y is raised to fit labels below
    const radius = 175;
    const strokeWidth = 14; // Thinner lines

    // Helper to calculate SVG arc path
    const describeArc = (x: number, y: number, r: number, startAngle: number, endAngle: number) => {
        const polarToCartesian = (centerX: number, centerY: number, r: number, angleInDegrees: number) => {
            const angleInRadians = (angleInDegrees - 180) * Math.PI / 180.0;
            return {
                x: centerX + (r * Math.cos(angleInRadians)),
                y: centerY + (r * Math.sin(angleInRadians))
            };
        };

        const startParams = polarToCartesian(x, y, r, endAngle);
        const endParams = polarToCartesian(x, y, r, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

        return [
            "M", startParams.x, startParams.y,
            "A", r, r, 0, largeArcFlag, 0, endParams.x, endParams.y
        ].join(" ");
    };

    // Gauge Segments (0 to 100 mapped to 0 to 180 degrees)
    const segments = [
        { start: 0, end: 40, color: '#de6b6b' },       // Red
        { start: 40, end: 60, color: '#f3d07e' },      // Yellow
        { start: 60, end: 80, color: '#e69138' },      // Orange
        { start: 80, end: 100, color: '#68c67c' },     // Green
    ];

    // Marker Position mapping
    const markerAngle = (percentage / 100) * 180;

    // The angle in radians for pure math (0 deg is left, 180 is right)
    const angleInRadians = (markerAngle - 180) * Math.PI / 180.0;
    const markerPos = {
        x: cx + (radius * Math.cos(angleInRadians)),
        y: cy + (radius * Math.sin(angleInRadians))
    };

    // Ticks (0, 20, 40, 60, 80, 100)
    const ticks = [0, 20, 40, 60, 80, 100];

    // Dotted inner arc is smaller than the main arc
    const innerRadius = radius - 30; // Scaled gap 
    const dottedArcPath = describeArc(cx, cy, innerRadius, 0, 180);

    return (
        <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm w-full h-full font-sans flex flex-col justify-between">
            {/* Header */}
            <div className="bg-gray-50/80 px-3 py-2 2xl:px-5 2xl:py-3 border-b border-gray-100 w-full text-left">
                <h2 className="text-[11px] 2xl:text-[13px] font-semibold text-gray-800 tracking-tight">{title}</h2>
            </div>

            <div className="p-3 2xl:p-5 flex flex-col items-center justify-center flex-grow w-full relative">

                {/* SVG Gauge Container */}
                <div className="relative flex flex-col justify-center items-center w-full mt-1 lg:mt-2 max-w-[200px] 2xl:max-w-[300px] mx-auto">
                    <svg width="100%" height="auto" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">

                        {/* 1. Draw Segments */}
                        {segments.map((seg, i) => {
                            const startAngle = (seg.start / 100) * 180;
                            const endAngle = (seg.end / 100) * 180;

                            // Tiny gap between segments
                            const gap = 1.5;
                            const adjustedStart = i === 0 ? startAngle : startAngle + gap;
                            const adjustedEnd = i === segments.length - 1 ? endAngle : endAngle - gap;

                            return (
                                <path
                                    key={i}
                                    d={describeArc(cx, cy, radius, adjustedStart, adjustedEnd)}
                                    fill="none"
                                    stroke={seg.color}
                                    strokeWidth={strokeWidth}
                                    strokeLinecap="round"
                                />
                            );
                        })}

                        {/* 2. Dotted Inner Arc */}
                        <path
                            d={dottedArcPath}
                            fill="none"
                            stroke="#64748b" // Darker slate line
                            strokeWidth="2.5"
                            strokeDasharray="4 16" // Scaled dotted effect
                            strokeLinecap="round"
                        />

                        {/* 3. Ticks and Labels outside the dotted arc but inside the main arc visually */}
                        {ticks.map((tick) => {
                            const tickAngle = (tick / 100) * 180;
                            // The screenshot shows them hovering outside the dotted line but not completely outside the main arc.
                            const labelRadius = radius - 3; // scaled offset

                            const labelInRadians = (tickAngle - 180) * Math.PI / 180.0;
                            const labelPos = {
                                x: cx + ((labelRadius) * Math.cos(labelInRadians)),
                                y: cy + ((labelRadius) * Math.sin(labelInRadians))
                            };

                            let textAnchor: "inherit" | "end" | "start" | "middle" | undefined = "middle";
                            let dx = 0;
                            let dy = 0;

                            // Custom scaled offsets for perfect positioning like the image
                            if (tick === 0) {
                                textAnchor = "end";
                                dx = -20;
                                dy = 10;
                            } else if (tick === 100) {
                                textAnchor = "start";
                                dx = 20;
                                dy = 10;
                            } else if (tick === 20 || tick === 80) {
                                dy = -14;
                                dx = tick === 20 ? -18 : 18;
                            } else if (tick === 40 || tick === 60) {
                                dy = -35;
                            }

                            return (
                                <text
                                    key={`tick-${tick}`}
                                    x={labelPos.x}
                                    y={labelPos.y}
                                    dx={dx}
                                    dy={dy}
                                    fill="#7f8ea3" // Slate-500 light
                                    fontSize="18"
                                    fontWeight="500"
                                    textAnchor={textAnchor}
                                >
                                    {tick}
                                </text>
                            );
                        })}

                        {/* 4. The Marker Dot on the active segment (Orange for 82%) */}
                        <defs>
                            <filter id="marker-shadow" x="-50%" y="-50%" width="200%" height="200%">
                                <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#e69138" floodOpacity="0.4" />
                            </filter>
                        </defs>

                        <circle
                            cx={markerPos.x}
                            cy={markerPos.y}
                            r={12} // Scaled up dot
                            fill="#ffffff"
                            stroke="#e69138" // Orange outline matching the 82% spot
                            strokeWidth={7}
                            filter="url(#marker-shadow)"
                        />

                        {/* Centered Typography inside the half-donut cavity */}
                        <text
                            x={cx}
                            y={cy - 10}
                            textAnchor="middle"
                            fill="#1e293b"
                            fontSize="74"
                            fontWeight="bold"
                            className="tracking-tight"
                        >
                            {percentage}%
                        </text>
                    </svg>
                </div>

                {/* Bottom stats pinned below the arc baseline */}
                <div className="flex flex-col items-center mt-2 2xl:mt-4 w-full text-center">
                    <span className="text-[#ef4444] font-bold text-[13px] 2xl:text-[16px] mb-0.5 2xl:mb-1.5 tracking-wide">
                        {variance}
                    </span>
                    {/* <span className="text-[#64748b] text-[10px] 2xl:text-[12px] font-medium tracking-wide">
                        {lastUpdated}
                    </span> */}
                </div>

            </div>
        </div>
    );
};

export default MTD_Collection;
