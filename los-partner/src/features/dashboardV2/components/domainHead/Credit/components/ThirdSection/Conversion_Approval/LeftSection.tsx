import { Conversion } from "../../../../../../../../utils/conversion";

export default function LeftSection() {
    // Math for the 24% Gauge
    // 180 degrees total. 24% of 180 = 43.2 degrees.
    const percentage = 24;
    const targetAngle = (percentage / 100) * 180;

    // Sample data - Average Converted Loan Amount
    const totalConvertedAmount = 8640000; // Total amount (360 loans)
    const totalLoans = 360;
    const avgConvertedLoanAmount = totalConvertedAmount / totalLoans;
    
    // Target and Gap Calculations
    const achieved = 24; // Current achieved percentage
    const target = 35; // Target percentage
    const gap = target - achieved; // Gap percentage

    const width = 280;
    const height = 150;
    const cx = width / 2;
    const cy = height;
    const radius = 100;
    const strokeWidth = 22;

    const describeArc = (x: number, y: number, r: number, startAngle: number, endAngle: number) => {
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

    // Background arc from 0 to 180
    const backgroundArc = describeArc(cx, cy, radius, 0, 180);
    // Foreground arc (Red) from left (0) to the target angle
    const foregroundArc = describeArc(cx, cy, radius, 0, targetAngle);

    // Marker position
    const markerAngle = targetAngle;
    const angleInRadians = (markerAngle - 180) * Math.PI / 180.0;
    const markerPos = {
        x: cx + (radius * Math.cos(angleInRadians)),
        y: cy + (radius * Math.sin(angleInRadians))
    };

    return (
        <div className="flex flex-col h-full font-sans">

            {/* Top Card Area with Gauge */}
            <div className="bg-[#f8fafc] rounded-2xl w-full flex flex-col items-center justify-center pt-6 pb-4 2xl:pt-8 2xl:pb-6 relative mb-3 2xl:mb-5">

                {/* SVG Gauge */}
                <div className="relative w-[280px] h-[100px] flex justify-center items-end ml-4">
                    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                        <path
                            d={backgroundArc}
                            fill="none"
                            stroke="#eef2f6"
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                        />
                        <path
                            d={foregroundArc}
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                        />
                        <defs>
                            <filter id="marker-shadow-left" x="-50%" y="-50%" width="200%" height="200%">
                                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.15" />
                            </filter>
                        </defs>
                        <circle
                            cx={markerPos.x}
                            cy={markerPos.y}
                            r={14}
                            fill="#ffffff"
                            filter="url(#marker-shadow-left)"
                        />
                        <circle
                            cx={markerPos.x}
                            cy={markerPos.y}
                            r={6}
                            fill="#ef4444"
                        />
                    </svg>

                    {/* Centered Gauge Text Area */}
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex flex-col items-center">
                        <span className="text-[28px] 2xl:text-[32px] font-bold text-[#334155] leading-none tracking-tight">
                            24%
                        </span>
                        <span className="text-[11px] 2xl:text-[13px] text-[#475569] font-medium mt-1">
                            360/1500
                        </span>
                    </div>
                </div>

                <div className="mt-2 2xl:mt-4 text-center text-[11px] 2xl:text-[13px] font-medium text-[#64748b] tracking-wide">
                    Avg Converted Loan Amount : <br />
                    <span className="text-[#334155] font-bold">{Conversion.formatCurrency(avgConvertedLoanAmount)}</span>
                </div>
            </div>

            {/* Middle Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 2xl:gap-3 mb-2">
                <div className="bg-[#f8fafc] border border-gray-100 rounded-lg px-2 py-1 2xl:px-3 2xl:py-1.5 text-[11px] 2xl:text-[12px]">
                    <span className="text-gray-500 font-medium">Fresh Lead : </span>
                    <span className="text-gray-900 font-bold ml-1">210/930</span>
                    <span className="text-gray-300 mx-1 2xl:mx-1.5">|</span>
                    <span className="text-gray-900 font-bold">23%</span>
                </div>
                <div className="bg-[#f8fafc] border border-gray-100 rounded-lg px-2 py-1 2xl:px-3 2xl:py-1.5 text-[11px] 2xl:text-[12px]">
                    <span className="text-gray-500 font-medium">Repeat Lead : </span>
                    <span className="text-gray-900 font-bold ml-1">150/570</span>
                    <span className="text-gray-300 mx-1 2xl:mx-1.5">|</span>
                    <span className="text-gray-900 font-bold">26%</span>
                </div>
            </div>

            {/* Horizontal Dashed Divider */}
            <div className="w-full border-t border-dashed border-gray-200"></div>

            {/* Bottom Metrics Grid */}
            <div className="w-full grid grid-cols-3 gap-2 2xl:gap-4 mt-auto">
                <div className="flex flex-col">
                    <span className="text-[#64748b] text-[11px] 2xl:text-[13px] font-medium mb-1">Target</span>
                    <span className="text-[13px] 2xl:text-[15px] font-bold text-gray-900">{target}%</span>
                </div>
                <div className="flex flex-col text-center items-center">
                    <span className="text-[#64748b] text-[11px] 2xl:text-[13px] font-medium mb-1">Achieved</span>
                    <span className="text-[13px] 2xl:text-[15px] font-bold text-gray-900">{achieved}%</span>
                </div>
                <div className="flex flex-col text-right items-end">
                    <span className="text-[#64748b] text-[11px] 2xl:text-[13px] font-medium mb-1">Gap</span>
                    <span className="text-[13px] 2xl:text-[15px] font-bold text-gray-900">{gap}%</span>
                </div>
            </div>

        </div>
    );
}
