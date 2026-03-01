import React, { useState } from 'react';

// Icon SVG
const ChevronDown = ({ className }: { className?: string }) => (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
);

export interface ManagerConversion {
    id: string;
    initials: string;
    name: string;
    rank: number;
    conversionCurrent: number;
    conversionTotal: number;
    percentage: number;
    freshCount: number;
    freshPercent: number;
    repeatCount: number;
    repeatPercent: number;
    targetPercent: string;
    achievedPercent: number;
    gap: string;
    avgLoan: string;
}

interface ConversionProps {
    data?: ManagerConversion[];
}

const MOCK_DATA: ManagerConversion[] = [
    {
        id: '1', initials: 'MR', name: 'Manager A', rank: 1,
        conversionCurrent: 720, conversionTotal: 1000, percentage: 95,
        freshCount: 210, freshPercent: 23, repeatCount: 150, repeatPercent: 26,
        targetPercent: "'XX'", achievedPercent: 95, gap: "'YY'", avgLoan: "'XX,XXX'"
    },
    {
        id: '2', initials: 'MR', name: 'Manager B', rank: 2,
        conversionCurrent: 610, conversionTotal: 900, percentage: 80,
        freshCount: 0, freshPercent: 0, repeatCount: 0, repeatPercent: 0,
        targetPercent: "'XX'", achievedPercent: 80, gap: "'YY'", avgLoan: "'XX,XXX'"
    },
    {
        id: '3', initials: 'MR', name: 'Manager C', rank: 3,
        conversionCurrent: 546, conversionTotal: 750, percentage: 55,
        freshCount: 0, freshPercent: 0, repeatCount: 0, repeatPercent: 0,
        targetPercent: "'XX'", achievedPercent: 55, gap: "'YY'", avgLoan: "'XX,XXX'"
    },
    {
        id: '4', initials: 'MR', name: 'Manager D', rank: 4,
        conversionCurrent: 400, conversionTotal: 600, percentage: 45,
        freshCount: 0, freshPercent: 0, repeatCount: 0, repeatPercent: 0,
        targetPercent: "'XX'", achievedPercent: 45, gap: "'YY'", avgLoan: "'XX,XXX'"
    },
    {
        id: '5', initials: 'MR', name: 'Manager D', rank: 5,
        conversionCurrent: 400, conversionTotal: 600, percentage: 45,
        freshCount: 0, freshPercent: 0, repeatCount: 0, repeatPercent: 0,
        targetPercent: "'XX'", achievedPercent: 45, gap: "'YY'", avgLoan: "'XX,XXX'"
    },
    {
        id: '6', initials: 'MR', name: 'Manager D', rank: 6,
        conversionCurrent: 400, conversionTotal: 600, percentage: 45,
        freshCount: 0, freshPercent: 0, repeatCount: 0, repeatPercent: 0,
        targetPercent: "'XX'", achievedPercent: 45, gap: "'YY'", avgLoan: "'XX,XXX'"
    },

];

const Conversion: React.FC<ConversionProps> = ({ data = MOCK_DATA }) => {
    const [expandedId, setExpandedId] = useState<string | null>('1');

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const getPillColor = (percentage: number) => {
        if (percentage >= 90) return 'bg-[#059669]'; // green
        if (percentage >= 70) return 'bg-[#3b82f6]'; // blue
        return 'bg-[#dc2626]'; // red
    };

    return (
        <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm w-full font-sans">
            <div className="bg-[#f8fafc] px-4 py-3 2xl:px-6 2xl:py-4 border-b border-gray-100">
                <h2 className="text-[14px] 2xl:text-[16px] font-semibold text-gray-900 tracking-tight">Conversion (%) Contribution</h2>
            </div>

            <div className="p-3 2xl:p-6">

                {/* Custom scrollbar styling block */}
                <style>{`
                    .conversion-scrollbar::-webkit-scrollbar {
                        width: 6px;
                    }
                    .conversion-scrollbar::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .conversion-scrollbar::-webkit-scrollbar-thumb {
                        background-color: #e2e8f0;
                        border-radius: 10px;
                    }
                    .conversion-scrollbar::-webkit-scrollbar-thumb:hover {
                        background-color: #cbd5e1;
                    }
                `}</style>

                {/* Scrollable container for the items */}
                <div className="space-y-3 2xl:space-y-4 max-h-[365px] overflow-y-auto pr-2 conversion-scrollbar">
                    {data.map((item) => {
                        const isExpanded = expandedId === item.id;
                        return (
                            <div
                                key={item.id}
                                className="bg-[#f8fafc] rounded-lg border border-gray-100 hover:border-gray-200 overflow-hidden transition-all duration-200"
                            >
                                <div
                                    className="px-3 py-3 2xl:px-5 2xl:py-4 flex flex-col md:flex-row md:items-center gap-2 2xl:gap-3 md:gap-4 cursor-pointer hover:bg-gray-50/50"
                                    onClick={() => toggleExpand(item.id)}
                                >
                                    <div className="flex items-center gap-2 2xl:gap-4 w-full md:w-1/3">
                                        <div className="w-8 h-8 2xl:w-10 2xl:h-10 rounded-md bg-[#ffe4f6] text-[#c026d3] font-bold text-[13px] 2xl:text-[15px] flex items-center justify-center shrink-0">
                                            {item.initials}
                                        </div>
                                        <div className="text-[13px] 2xl:text-[15px] font-medium text-gray-800 truncate">
                                            {item.name} <span className="text-gray-400 mx-1">|</span> <span className="text-gray-600">#{item.rank}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center md:justify-center w-full md:w-1/3 text-[12px] 2xl:text-[14px] text-gray-600 font-medium">
                                        Conversion : <span className="text-gray-900 font-bold ml-1">{item.conversionCurrent} / {item.conversionTotal}</span>
                                    </div>

                                    <div className="flex items-center justify-between md:justify-end gap-2 2xl:gap-4 w-full md:w-1/3">
                                        <div className={`px-3 py-1 2xl:px-4 2xl:py-1 rounded-full text-white text-[11px] 2xl:text-[13px] font-bold tracking-wide ${getPillColor(item.percentage)}`}>
                                            {item.percentage}%
                                        </div>
                                        <ChevronDown className={`text-gray-900 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} w-4 h-4 2xl:w-5 2xl:h-5`} />
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="px-3 pb-3 pt-1 2xl:px-5 2xl:pb-5 2xl:pt-1">
                                        <div className="border-t border-dashed border-gray-200 pt-3 mt-1 2xl:pt-5 2xl:mt-1">
                                            <div className="flex flex-wrap gap-2 2xl:gap-3">
                                                {/* Details Pills */}
                                                <div className="flex items-center gap-1 bg-white border border-gray-200/80 px-2 py-1.5 2xl:px-4 2xl:py-2 rounded-md text-[11px] 2xl:text-[13px] text-gray-600">
                                                    <span>Fresh : </span><span className="font-semibold text-gray-900 ml-1">{item.freshCount}</span><span className="text-gray-300 mx-1">|</span><span className="font-semibold text-gray-900">{item.freshPercent}%</span>
                                                </div>
                                                <div className="flex items-center gap-1 bg-white border border-gray-200/80 px-2 py-1.5 2xl:px-4 2xl:py-2 rounded-md text-[11px] 2xl:text-[13px] text-gray-600">
                                                    <span>Repeat : </span><span className="font-semibold text-gray-900 ml-1">{item.repeatCount}</span><span className="text-gray-300 mx-1">|</span><span className="font-semibold text-gray-900">{item.repeatPercent}%</span>
                                                </div>
                                                <div className="flex items-center gap-1 bg-white border border-gray-200/80 px-2 py-1.5 2xl:px-4 2xl:py-2 rounded-md text-[11px] 2xl:text-[13px] text-gray-600">
                                                    <span>Target : </span><span className="font-semibold text-gray-900 ml-1">{item.targetPercent} %</span>
                                                </div>
                                                <div className="flex items-center gap-1 bg-white border border-gray-200/80 px-2 py-1.5 2xl:px-4 2xl:py-2 rounded-md text-[11px] 2xl:text-[13px] text-gray-600">
                                                    <span>Achieved : </span><span className="font-semibold text-gray-900 ml-1">{item.achievedPercent} %</span>
                                                </div>
                                                <div className="flex items-center gap-1 bg-white border border-gray-200/80 px-2 py-1.5 2xl:px-4 2xl:py-2 rounded-md text-[11px] 2xl:text-[13px] text-gray-600">
                                                    <span>Gap : </span><span className="font-semibold text-gray-900 ml-1">{item.gap}</span>
                                                </div>
                                                <div className="flex items-center gap-1 bg-white border border-gray-200/80 px-2 py-1.5 2xl:px-4 2xl:py-2 rounded-md text-[11px] 2xl:text-[13px] text-gray-600">
                                                    <span>Avg Loan : </span><span className="font-semibold text-gray-900 ml-1">{item.avgLoan}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Conversion;