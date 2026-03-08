import React, { useState } from 'react';
import { Conversion } from '../../../../../../../utils/conversion';
import { ErrorMessage } from '../../../../../../../common/ui/table';

// --- Icons ---
const ChevronDownIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

const ChevronLeftIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
    </svg>
);

const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const StarIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
);

// --- Types ---
export interface ExecutivePerformance {
    id: number;
    name: string;
    role: string;
    leads: number;
    followup: number;
    disbursed: number;
    rejected: number;
    sanctionedAmount: number;
    disbursedAmount: number;
    pendingDisbursalAmt: number;
    conversionPercent: number;
    dropoffRatePercent: number;
    performanceScore: number;
}

export interface SalesPerformanceData {
    managerName: string;
    activeExecutives: number;
    teamAvgRating: number;
    managerRating: number;
    leadBucket: {
        totalInBucket: number;
        allotted: number;
        yetToAllot: number;
    };
    teamAndPerformance: {
        allotted: number;
        underFollowup: number;
        disbursed: number;
        rejected: number;
    };
    leadFunnel: {
        followupLeads: number;
        sanctionedCount: number;
        sanctionedAmt: number;
        disbursedCount: number;
        disbursedAmt: number;
        pendingCount: number;
        pendingAmt: number;
        rejected: number;
        avgLoan: number;
    };
    executives: ExecutivePerformance[];
}

// --- Mock Data ---
const MOCK_DATA: SalesPerformanceData = {
    managerName: 'Manager A',
    activeExecutives: 24,
    teamAvgRating: 8.5,
    managerRating: 8,
    leadBucket: {
        totalInBucket: 1200,
        allotted: 800,
        yetToAllot: 400
    },
    teamAndPerformance: {
        allotted: 800,
        underFollowup: 820,
        disbursed: 400,
        rejected: 220
    },
    leadFunnel: {
        followupLeads: 820,
        sanctionedCount: 600,
        sanctionedAmt: 38000000,
        disbursedCount: 400,
        disbursedAmt: 31000000,
        pendingCount: 200,
        pendingAmt: 5200000,
        rejected: 220,
        avgLoan: 46300
    },
    executives: [
        { id: 1, name: 'Sofia T', role: 'EXEC', leads: 200, followup: 100, disbursed: 50, rejected: 50, sanctionedAmount: 800000, disbursedAmount: 600000, pendingDisbursalAmt: 200000, conversionPercent: 80, dropoffRatePercent: 21, performanceScore: 7.5 },
        { id: 2, name: 'Liam A', role: 'EXEC', leads: 180, followup: 90, disbursed: 45, rejected: 45, sanctionedAmount: 720000, disbursedAmount: 540000, pendingDisbursalAmt: 180000, conversionPercent: 75, dropoffRatePercent: 20, performanceScore: 6.5 },
        { id: 3, name: 'Emma J', role: 'EXEC', leads: 160, followup: 80, disbursed: 40, rejected: 40, sanctionedAmount: 640000, disbursedAmount: 480000, pendingDisbursalAmt: 160000, conversionPercent: 70, dropoffRatePercent: 18, performanceScore: 5.5 },
        { id: 4, name: 'Noah R', role: 'EXEC', leads: 140, followup: 70, disbursed: 35, rejected: 35, sanctionedAmount: 560000, disbursedAmount: 420000, pendingDisbursalAmt: 140000, conversionPercent: 65, dropoffRatePercent: 15, performanceScore: 4.5 },
        { id: 5, name: 'Olivia K', role: 'EXEC', leads: 120, followup: 60, disbursed: 30, rejected: 30, sanctionedAmount: 480000, disbursedAmount: 360000, pendingDisbursalAmt: 120000, conversionPercent: 60, dropoffRatePercent: 12, performanceScore: 4.0 },
        { id: 6, name: 'Mason H', role: 'EXEC', leads: 100, followup: 50, disbursed: 25, rejected: 25, sanctionedAmount: 400000, disbursedAmount: 300000, pendingDisbursalAmt: 100000, conversionPercent: 55, dropoffRatePercent: 10, performanceScore: 3.5 },
        { id: 7, name: 'Ava M', role: 'EXEC', leads: 200, followup: 100, disbursed: 50, rejected: 50, sanctionedAmount: 800000, disbursedAmount: 600000, pendingDisbursalAmt: 200000, conversionPercent: 80, dropoffRatePercent: 21, performanceScore: 7.5 },
        { id: 8, name: 'Lucas B', role: 'EXEC', leads: 180, followup: 90, disbursed: 45, rejected: 45, sanctionedAmount: 720000, disbursedAmount: 540000, pendingDisbursalAmt: 180000, conversionPercent: 75, dropoffRatePercent: 20, performanceScore: 6.5 },
        { id: 9, name: 'Bella C', role: 'EXEC', leads: 160, followup: 80, disbursed: 40, rejected: 40, sanctionedAmount: 640000, disbursedAmount: 480000, pendingDisbursalAmt: 160000, conversionPercent: 70, dropoffRatePercent: 18, performanceScore: 5.5 },
        { id: 10, name: 'Ethan D', role: 'EXEC', leads: 140, followup: 70, disbursed: 35, rejected: 35, sanctionedAmount: 560000, disbursedAmount: 420000, pendingDisbursalAmt: 140000, conversionPercent: 65, dropoffRatePercent: 15, performanceScore: 4.5 },
    ]
};

// --- Components ---

const StatBox = ({ label, value }: { label: React.ReactNode, value: React.ReactNode }) => (
    <div className="flex items-baseline gap-2">
        <span className="text-gray-500 text-[13px] font-medium">{label}</span>
        <span className="text-gray-900 text-[14px] font-semibold">{value}</span>
    </div>
);

export default function CollectionPerformance({ data = MOCK_DATA }: { data?: SalesPerformanceData }) {
    const [isExpanded, setIsExpanded] = useState(true);

    if (!data) {
        return (
            <div className="p-4">
                <ErrorMessage message="Sales performance data could not be loaded." />
            </div>
        );
    }

    return (
        <div className="bg-[#fafafa] rounded-2xl overflow-hidden border border-gray-100 shadow-sm w-full font-sans">
            {/* --- Top Header --- */}
            <div
                className="px-4 2xl:px-6 py-3 2xl:py-4 flex justify-between items-center border-b border-gray-200/60 bg-white cursor-pointer select-none"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <h2 className="text-[14px] 2xl:text-[16px] font-semibold text-gray-800 tracking-tight">Sales Performance Analysis</h2>
                <div className="flex items-center">
                    <div className={`text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                        <ChevronDownIcon />
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div className="p-3 2xl:p-6 space-y-3 2xl:space-y-5">
                    {/* --- Manager Banner Row --- */}
                    <div className="bg-white rounded-xl border border-gray-200 px-3 2xl:px-5 py-3 2xl:py-4 flex flex-wrap gap-3 2xl:gap-4 justify-between items-center">
                        <div className="flex flex-wrap items-center gap-4 2xl:gap-6">
                            <div className="text-[14px] 2xl:text-[16px] font-bold text-gray-900 border-r border-gray-200 pr-4 2xl:pr-6">
                                {data.managerName}
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-gray-500 text-[12px] 2xl:text-[14px] font-medium">Active Executives</span>
                                <span className="bg-[#3b82f6] text-white text-[11px] 2xl:text-[13px] font-bold px-2 py-0.5 rounded-md flex items-center justify-center">
                                    {data.activeExecutives}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-gray-500 text-[12px] 2xl:text-[14px] font-medium">Team Avg Rating</span>
                                <span className="bg-[#dcfce7] text-[#166534] text-[11px] 2xl:text-[13px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                    {data.teamAvgRating} <StarIcon />
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-gray-500 text-[12px] 2xl:text-[14px] font-medium">Manager Rating</span>
                                <span className="bg-[#dcfce7] text-[#166534] text-[11px] 2xl:text-[13px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                    {data.managerRating} <StarIcon />
                                </span>
                            </div>
                        </div>

                        <button className="flex items-center gap-2 px-3 2xl:px-4 py-1.5 2xl:py-2 border border-gray-200 rounded-lg text-[12px] 2xl:text-sm font-semibold text-gray-700 hover:bg-gray-50 bg-white">
                            View Executive Performance
                            <div className="w-5 h-5 bg-[#3b82f6] rounded flex items-center justify-center shrink-0">
                                <CheckIcon />
                            </div>
                        </button>
                    </div>

                    {/* --- Middle Summary Cards --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-3 2xl:gap-5">
                        {/* Lead Bucket */}
                        <div className="bg-white rounded-xl border border-gray-200 p-3 2xl:p-5">
                            <h3 className="text-[12px] 2xl:text-[14px] font-semibold text-gray-800 mb-2 2xl:mb-4">Lead Bucket</h3>
                            <div className="flex flex-wrap items-center justify-between gap-2 2xl:gap-4">
                                <StatBox label="Total Leads In Bucket :" value={data.leadBucket.totalInBucket} />
                                <StatBox label="Allotted Leads :" value={data.leadBucket.allotted} />
                                <StatBox label="Yet To Allot :" value={data.leadBucket.yetToAllot} />
                            </div>
                        </div>

                        {/* Team & Performance */}
                        <div className="bg-white rounded-xl border border-gray-200 p-3 2xl:p-5">
                            <h3 className="text-[12px] 2xl:text-[14px] font-semibold text-gray-800 mb-2 2xl:mb-4">Team & Performance :</h3>
                            <div className="flex flex-wrap items-center justify-between gap-2 2xl:gap-4">
                                <StatBox label="Allotted Leads :" value={data.teamAndPerformance.allotted} />
                                <StatBox label="Under Followup" value={data.teamAndPerformance.underFollowup} />
                                <StatBox label="Disbursed :" value={data.teamAndPerformance.disbursed} />
                                <StatBox label="Rejected :" value={data.teamAndPerformance.rejected} />
                            </div>
                        </div>
                    </div>

                    {/* --- Lead Funnel Overview --- */}
                    <div className="bg-white rounded-xl border border-gray-200 p-3 2xl:p-5">
                        <h3 className="text-[12px] 2xl:text-[14px] font-semibold text-gray-800 mb-2 2xl:mb-4">Lead Funnel Overview</h3>
                        <div className="flex flex-wrap items-center justify-between gap-2 2xl:gap-4 w-full">
                            <StatBox label="Followup Leads :" value={data.leadFunnel.followupLeads} />
                            <StatBox label="Sanctioned :" value={<>{data.leadFunnel.sanctionedCount} <span className="text-gray-300 mx-1 font-normal">|</span> {Conversion.formatCurrency(data.leadFunnel.sanctionedAmt)}</>} />
                            <StatBox label="Disbursed :" value={<>{data.leadFunnel.disbursedCount} <span className="text-gray-300 mx-1 font-normal">|</span> {Conversion.formatCurrency(data.leadFunnel.disbursedAmt)}</>} />
                            <StatBox label="Pending Disbursal :" value={<>{data.leadFunnel.pendingCount} <span className="text-gray-300 mx-1 font-normal">|</span> {Conversion.formatCurrency(data.leadFunnel.pendingAmt)}</>} />
                            <StatBox label="Rejected :" value={data.leadFunnel.rejected} />
                            <StatBox label="Avg Loan :" value={Conversion.formatCurrency(data.leadFunnel.avgLoan)} />
                        </div>
                    </div>

                    {/* --- Data Table Section --- */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-3 2xl:px-5 py-3 2xl:py-4 bg-[#f8fafc] border-b border-gray-200">
                            <h3 className="text-[12px] 2xl:text-[14px] font-bold text-gray-800">Executive Performance Summary</h3>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[11px] 2xl:text-[13px]">
                                <thead className="bg-white border-b border-gray-200 text-gray-600 font-semibold sticky top-0">
                                    <tr>
                                        <th className="px-2 2xl:px-4 py-2 2xl:py-4 font-semibold whitespace-nowrap text-center">Sr No</th>
                                        <th className="px-2 2xl:px-4 py-2 2xl:py-4 font-semibold whitespace-nowrap">Executive</th>
                                        <th className="px-2 2xl:px-4 py-2 2xl:py-4 font-semibold whitespace-nowrap text-center">Leads</th>
                                        <th className="px-2 2xl:px-4 py-2 2xl:py-4 font-semibold whitespace-nowrap text-center">Followup</th>
                                        <th className="px-2 2xl:px-4 py-2 2xl:py-4 font-semibold whitespace-nowrap text-center">Disbursed</th>
                                        <th className="px-2 2xl:px-4 py-2 2xl:py-4 font-semibold whitespace-nowrap text-center">Rejected</th>
                                        <th className="px-2 2xl:px-4 py-2 2xl:py-4 font-semibold whitespace-nowrap text-center">Sanctioned Amount</th>
                                        <th className="px-2 2xl:px-4 py-2 2xl:py-4 font-semibold whitespace-nowrap text-center">Disbursed Amount</th>
                                        <th className="px-2 2xl:px-4 py-2 2xl:py-4 font-semibold whitespace-nowrap text-center">Pending Disbursal</th>
                                        <th className="px-2 2xl:px-4 py-2 2xl:py-4 font-semibold whitespace-nowrap text-center">Conversion %</th>
                                        <th className="px-2 2xl:px-4 py-2 2xl:py-4 font-semibold whitespace-nowrap text-center">Drop off rate</th>
                                        <th className="px-2 2xl:px-4 py-2 2xl:py-4 font-semibold whitespace-nowrap text-center">Performance Score</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {data.executives.map((exec, idx) => (
                                        <tr key={exec.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-2 2xl:px-4 py-2 2xl:py-4 text-gray-500 font-medium text-center">{idx + 1}</td>
                                            <td className="px-2 2xl:px-4 py-2 2xl:py-4 text-gray-800 font-medium whitespace-nowrap">
                                                {exec.name} <span className="text-[#a855f7] font-bold ml-1">• {exec.role}</span>
                                            </td>
                                            <td className="px-2 2xl:px-4 py-2 2xl:py-4 text-gray-600 text-center">{exec.leads}</td>
                                            <td className="px-2 2xl:px-4 py-2 2xl:py-4 text-gray-600 text-center">{exec.followup}</td>
                                            <td className="px-2 2xl:px-4 py-2 2xl:py-4 text-gray-600 text-center">{exec.disbursed}</td>
                                            <td className="px-2 2xl:px-4 py-2 2xl:py-4 text-gray-600 text-center">{exec.rejected}</td>
                                            <td className="px-2 2xl:px-4 py-2 2xl:py-4 text-gray-800 font-medium text-center">{Conversion.formatCurrency(exec.sanctionedAmount)}</td>
                                            <td className="px-2 2xl:px-4 py-2 2xl:py-4 text-gray-800 font-medium text-center">{Conversion.formatCurrency(exec.disbursedAmount)}</td>
                                            <td className="px-2 2xl:px-4 py-2 2xl:py-4 text-gray-800 font-medium text-center">{Conversion.formatCurrency(exec.pendingDisbursalAmt)}</td>
                                            <td className="px-2 2xl:px-4 py-2 2xl:py-4 text-[#3b82f6] font-semibold text-center">{exec.conversionPercent}%</td>
                                            <td className="px-2 2xl:px-4 py-2 2xl:py-4 text-[#ef4444] font-semibold text-center">{exec.dropoffRatePercent}%</td>
                                            <td className="px-2 2xl:px-4 py-2 2xl:py-4 text-center">
                                                <div className="inline-flex items-center gap-1 bg-[#fef08a] text-[#854d0e] font-bold px-1.5 py-0.5 rounded-md text-[11px] 2xl:text-[13px]">
                                                    {exec.performanceScore.toFixed(1)}
                                                    <StarIcon />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        <div className="px-4 2xl:px-6 py-2 2xl:py-4 flex items-center justify-between border-t border-gray-200">
                            <div className="text-[12px] 2xl:text-[13px] text-gray-500 font-medium">
                                1–50 of 2,619
                            </div>
                            <div className="flex gap-4">
                                <button className="text-gray-400 hover:text-gray-700 transition-colors">
                                    <ChevronLeftIcon />
                                </button>
                                <button className="text-gray-800 hover:text-black transition-colors">
                                    <ChevronRightIcon />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
