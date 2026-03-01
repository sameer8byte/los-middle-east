import React from 'react';

export interface ProfitabilityData {
    netProfit: {
        value: string;
        percentage: string;
        targetProfitability: string;
    };
    metrics: {
        totalRevenue: string;
        netRevenue: string;
        opnLoss: string;
        netProfit: string;
    };
    breakdown: {
        interestAmount: {
            value: string;
            percentage: number; // For the pill bar width
        };
        processingFee: {
            value: string;
            percentage: number; // For the pill bar width
        };
        penalties: {
            value: string;
            percentage: number; // For the pill bar width
        };
    };
}

interface ProfitabilitySnapshotProps {
    data?: ProfitabilityData;
}

const ProfitabilitySnapshot: React.FC<ProfitabilitySnapshotProps> = ({ data }) => {
    // Mock dynamic data fallback
    const currentData = data ?? {
        netProfit: {
            value: "₹ 1.9 Cr",
            percentage: "42%",
            targetProfitability: "50%",
        },
        metrics: {
            totalRevenue: "₹ 6.8 Cr",
            netRevenue: "₹ 6.2 Cr",
            opnLoss: "₹ 0.6 Cr",
            netProfit: "₹ 1.9 Cr",
        },
        breakdown: {
            interestAmount: {
                value: "₹5.2 Cr",
                percentage: 55, // 55% width
            },
            processingFee: {
                value: "₹1.1 Cr",
                percentage: 35, // 35% width
            },
            penalties: {
                value: "₹0.5 Cr",
                percentage: 10, // 10% width
            },
        },
    };

    // Calculate the integer percentage for the main bar (e.g. 42)
    const mainPercentageProgress = parseInt(currentData.netProfit.percentage.replace('%', '')) || 42;

    return (
        <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm w-full font-sans">
            {/* Header */}
            <div className="bg-gray-50/80 px-3 py-2 2xl:px-5 2xl:py-3 border-b border-gray-100">
                <h2 className="text-[11px] 2xl:text-[13px] font-semibold text-gray-900 tracking-tight">Profitability Snapshot</h2>
            </div>

            <div className="p-3 2xl:p-4">
                {/* 1. Net Profit Section */}
                <div className="mb-2">
                    <div className="text-gray-500 text-[10px] 2xl:text-xs font-semibold mb-0.5">Net Profit</div>
                    <div className="text-gray-900 text-[18px] 2xl:text-[22px] font-bold tracking-tight leading-none mb-2 2xl:mb-4 line-clamp-1">
                        {currentData.netProfit.value}
                    </div>
                </div>

                {/* Main Progress Bar with Tooltip Marker */}
                <div className="relative mb-6">
                    {/* Background Bar */}
                    <div className="w-full h-5 bg-[#f1f5f9] rounded-full overflow-hidden relative">
                        {/* We need the dashed line effect across the green portion */}
                    </div>

                    {/* Active Green Bar positioned absolutely over the background */}
                    <div
                        className="absolute top-0 left-0 h-5 bg-[#16a34a] rounded-full flex items-center overflow-hidden"
                        style={{ width: `${mainPercentageProgress}%` }}
                    >
                        {/* Inner dashed line across the green bar */}
                        <div className="w-full border-t-2 border-dashed border-white/50 absolute top-1/2 -translate-y-1/2"></div>
                    </div>

                    {/* The Dot Marker & Tooltip */}
                    <div
                        className="absolute top-1/2 -translate-y-1/2 flex items-center z-10"
                        style={{ left: `calc(${mainPercentageProgress}% - 8px)` }} // Center dot on the edge
                    >
                        {/* White dot with green border */}
                        <div className="w-4 h-4 bg-white border-4 border-[#16a34a] rounded-full shadow-sm ring-2 ring-white"></div>

                        {/* Tooltip bubble (positioned right next to the dot) */}
                        <div className="ml-2 relative">
                            {/* Triangle pointer */}
                            <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-white z-20"></div>
                            {/* The Bubble */}
                            <div className="bg-white border border-gray-200 shadow-sm px-1.5 py-0.5 2xl:px-2 2xl:py-1 rounded-md relative z-10">
                                <span className="text-[10px] 2xl:text-xs font-bold text-gray-800 tracking-tight whitespace-nowrap">
                                    {currentData.netProfit.percentage} Net Profit
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Target Profitability Text */}
                <div className="text-gray-500 text-[11px] 2xl:text-[13px] mb-2 2xl:mb-4 font-medium">
                    Target Profitability : <span className="text-[#3b82f6] font-bold">{currentData.netProfit.targetProfitability}</span>
                </div>

                {/* Divider */}
                <div className="border-t-[1.5px] border-dashed border-gray-100 w-full mb-3"></div>

                {/* 2. Middle Metrics Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 2xl:gap-3 mb-2 w-full">
                    <div className="flex flex-col min-w-0">
                        <div className="text-[#64748b] text-[9px] 2xl:text-[11px] font-medium mb-0.5 truncate">Total Revenue</div>
                        <div className="text-gray-900 text-[10px] 2xl:text-[11px] font-semibold tracking-tight truncate">{currentData.metrics.totalRevenue}</div>
                    </div>
                    <div className="flex flex-col min-w-0">
                        <div className="text-[#64748b] text-[9px] 2xl:text-[11px] font-medium mb-0.5 truncate">Net Revenue</div>
                        <div className="text-gray-900 text-[10px] 2xl:text-[11px] font-semibold tracking-tight truncate">{currentData.metrics.netRevenue}</div>
                    </div>
                    <div className="flex flex-col min-w-0">
                        <div className="text-[#64748b] text-[9px] 2xl:text-[11px] font-medium mb-0.5 truncate">Opn Loss</div>
                        <div className="text-gray-900 text-[10px] 2xl:text-[11px] font-semibold tracking-tight truncate">{currentData.metrics.opnLoss}</div>
                    </div>
                    <div className="flex flex-col min-w-0">
                        <div className="text-[#64748b] text-[9px] 2xl:text-[11px] font-medium mb-0.5 truncate">Net Profit</div>
                        <div className="text-gray-900 text-[10px] 2xl:text-[11px] font-semibold tracking-tight truncate">{currentData.metrics.netProfit}</div>
                    </div>
                </div>

                {/* 3. Bottom Pill Bar breakdown */}
                {/* The Pill container */}
                <div className="w-full flex gap-1 h-6 mb-2">
                    {/* Segment 1: Blue */}
                    <div
                        className="bg-[#2f8cf8] rounded-l-full h-full"
                        style={{ width: `${currentData.breakdown.interestAmount.percentage}%` }}
                    ></div>
                    {/* Segment 2: Light Blue */}
                    <div
                        className="bg-[#99c9fc] h-full"
                        style={{ width: `${currentData.breakdown.processingFee.percentage}%` }}
                    ></div>
                    {/* Segment 3: Very Light Blue (almost grey) */}
                    <div
                        className="bg-[#d2e7fe] h-full"
                        style={{ width: `${currentData.breakdown.penalties.percentage}%` }}
                    ></div>
                    {/* Remainder to fill 100% implicitly visually is empty white/gray space rounded on right */}
                    <div className="bg-[#f8fafc] flex-grow rounded-r-full h-full"></div>
                </div>

                {/* Breakdown Labels */}
                <div className="flex w-full mt-1.5 gap-1">
                    {/* Column 1 matches segment 1 width roughly, but we can just flex them out */}
                    <div style={{ width: `${currentData.breakdown.interestAmount.percentage}%` }} className="flex flex-col min-w-0 pr-1">
                        <span className="text-gray-900 font-bold text-[10px] 2xl:text-[12px] truncate">{currentData.breakdown.interestAmount.value}</span>
                        <span className="text-gray-500 text-[9px] 2xl:text-[10px] truncate">Murabaha margin Amount</span>
                    </div>
                    <div style={{ width: `${currentData.breakdown.processingFee.percentage}%` }} className="flex flex-col min-w-0 pr-1">
                        <span className="text-gray-900 font-bold text-[10px] 2xl:text-[12px] truncate">{currentData.breakdown.processingFee.value}</span>
                        <span className="text-gray-500 text-[9px] 2xl:text-[10px] truncate">Processing Fixed</span>
                    </div>
                    <div style={{ width: `${currentData.breakdown.penalties.percentage}%` }} className="flex flex-col min-w-0">
                        <span className="text-gray-900 font-bold text-[10px] 2xl:text-[12px] truncate">{currentData.breakdown.penalties.value}</span>
                        <span className="text-gray-500 text-[9px] 2xl:text-[10px] truncate">Penalties</span>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ProfitabilitySnapshot;
