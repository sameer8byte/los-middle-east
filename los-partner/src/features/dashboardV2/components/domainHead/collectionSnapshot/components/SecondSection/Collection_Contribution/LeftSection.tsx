import { Conversion as ConversionUtil } from '../../../../../../../../utils/conversion';

export default function LeftSection() {
    // Math for the 72% Gauge
    // 180 degrees total. 72% of 180 = 129.6 degrees.
    const percentage = 72;
    const targetAngle = (percentage / 100) * 180;

    const width = 280;
    const height = 130;
    const cx = width / 2;
    const cy = height; // Set bottom anchor
    const radius = 130;
    const strokeWidth = 20;

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
    // Foreground arc (Green) from left (0) to the target angle
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
            <div className="bg-[#f8fafc] rounded-2xl w-full flex flex-col items-center justify-center pt-6 2xl:pt-8 pb-4 2xl:pb-6 relative mb-3 2xl:mb-5">

                {/* SVG Gauge */}
                <div className="relative w-full max-w-[160px] 2xl:max-w-[240px] h-auto flex justify-center items-end mt-2">
                    <svg width="100%" height="auto" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
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
                            stroke="#16a34a"  // Green color
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
                            r={12}
                            fill="#ffffff"
                            filter="url(#marker-shadow-left)"
                        />
                        <circle
                            cx={markerPos.x}
                            cy={markerPos.y}
                            r={6}
                            fill="#16a34a" // Green color
                        />

                        {/* Centered Gauge Text Area Native inside SVG */}
                        <text x={cx} y={cy - 10} textAnchor="middle" fill="#334155" fontSize="42" fontWeight="bold">
                            72%
                        </text>
                        <text x={cx} y={cy + 40} textAnchor="middle" fill="#475569" fontSize="16" fontWeight="500">
                            {ConversionUtil.formatCurrency(36000000)} / {ConversionUtil.formatCurrency(50000000)}
                        </text>
                    </svg>

                </div>

                <div className="mt-8 2xl:mt-10 text-center text-[11px] 2xl:text-[13px] font-medium text-[#64748b] tracking-wide">
                    Avg Collection Loan Amount : <br />
                    <span className="text-[#334155] font-bold">{ConversionUtil.formatCurrency(45000)}</span>
                </div>
            </div>

            {/* Horizontal Dashed Divider */}
            <div className="w-full border-t border-dashed border-gray-200 mt-12 mb-2"></div>

            {/* Bottom Metrics Grid */}
            <div className="w-full grid grid-cols-3 gap-2 mt-auto">
                <div className="flex flex-col">
                    <span className="text-[#64748b] text-[10px] 2xl:text-[13px] font-medium mb-0.5 2xl:mb-1">Target</span>
                    <span className="text-[12px] 2xl:text-[15px] font-bold text-gray-900">90 %</span>
                </div>
                <div className="flex flex-col text-center items-center">
                    <span className="text-[#64748b] text-[10px] 2xl:text-[13px] font-medium mb-0.5 2xl:mb-1">Achieved</span>
                    <span className="text-[12px] 2xl:text-[15px] font-bold text-gray-900">72%</span>
                </div>
                <div className="flex flex-col text-right items-end">
                    <span className="text-[#64748b] text-[10px] 2xl:text-[13px] font-medium mb-0.5 2xl:mb-1">Gap</span>
                    <span className="text-[12px] 2xl:text-[15px] font-bold text-gray-900">18%</span>
                </div>
            </div>

        </div>
    );
}
