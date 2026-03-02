import React from 'react';

// -------------- Icons -------------- //
const FileUserIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <circle cx="10" cy="13" r="2" />
        <path d="M13.4 17.5A3.5 3.5 0 0 0 6.6 17.5M10 13v-1" />
    </svg>
);

const SplitArrowSVG = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21V12" />
        <path d="M12 12C12 8 8 8 8 5" />
        <path d="M12 12C12 8 16 8 16 5" />
        <polyline points="5 8 8 5 11 8" />
        <polyline points="13 8 16 5 19 8" />
    </svg>
);

const DashedCircleIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="M4.93 4.93l1.41 1.41" />
        <path d="M17.66 17.66l1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="M4.93 19.07l1.41-1.41" />
        <path d="M17.66 6.34l1.41-1.41" />
    </svg>
);

const CheckDocIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <polyline points="9 15 11 17 15 13" />
    </svg>
);


// -------------- Common Card Props -------------- //
export interface CommonCardProps {
    variant: "large" | "mini";
    title: string;
    value: string | number;

    // Large Specific
    icon?: React.ReactNode;
    largeTheme?: "solid-blue" | "light-green" | "light-yellow" | "light-red";

    // Mini Specific
    miniIndicatorColor?: string; // e.g., "bg-blue-500"
    miniPillColor?: string; // e.g., "bg-blue-500"
}

// -------------- Common Card Component -------------- //
export const CommonCard: React.FC<CommonCardProps> = ({
    variant,
    title,
    value,
    icon,
    largeTheme,
    miniIndicatorColor,
    miniPillColor,
}) => {
    if (variant === "large") {
        let containerClass = "p-3 2xl:p-5 rounded-xl border flex flex-col justify-between min-h-[140px] transition-all ";
        let iconClass = "mb-4 ";
        let valueClass = "text-[28px] lg:text-[24px] 2xl:text-[28px] font-bold mb-1 tracking-tight ";
        let titleClass = "text-[13px] lg:text-[11px] 2xl:text-[13px] font-bold tracking-wide ";

        switch (largeTheme) {
            case "solid-blue":
                containerClass += "bg-[#3366ff] border-[#3366ff] text-white shadow-sm";
                iconClass += "text-white";
                break;
            case "light-green":
                containerClass += "bg-[#effcf1] border-[#86efac]";
                iconClass += "text-[#22c55e]";
                valueClass += "text-gray-900";
                titleClass += "text-gray-700";
                break;
            case "light-yellow":
                containerClass += "bg-[#fffdeb] border-[#fde047]";
                iconClass += "text-[#eab308]";
                valueClass += "text-gray-900";
                titleClass += "text-gray-700";
                break;
            case "light-red":
                containerClass += "bg-[#fff0f2] border-[#fca5a5]";
                iconClass += "text-[#ef4444]";
                valueClass += "text-gray-900";
                titleClass += "text-gray-700";
                break;
        }

        return (
            <div className={containerClass}>
                <div className={iconClass}>{icon}</div>
                <div>
                    <div className={valueClass}>{value}</div>
                    <div className={titleClass}>{title}</div>
                </div>
            </div>
        );
    }

    // Mini variant
    return (
        <div className="bg-[#f8fafc] border border-gray-100 rounded-lg p-2 2xl:p-3 flex justify-between items-center w-full shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2">
                <div className={`w-1 h-5 rounded-full ${miniIndicatorColor}`}></div>
                <span className="text-gray-600 text-[10px] 2xl:text-xs font-semibold">{title}</span>
            </div>
            <div className={`text-white text-xs font-bold px-3 py-1 rounded-md ${miniPillColor}`}>
                {value}
            </div>
        </div>
    );
};


// -------------- Data Types -------------- //
export interface AUMData {
    totalLoansDueAmount: string;
    totalAmountCollected: string;
    totalAmountOutstanding: string;
    postDueAmount: string;
    totalLoansIssued: number;
    ongoingLoans: number;
    closedLoans: number;
    overdueLoans: number;
}


// -------------- Main Section Component -------------- //
export default function FirstSection({ data }: { data?: AUMData }) {
    // Mock Dynamic Data fallback
    const currentData = data ?? {
        totalLoansDueAmount: "₹14.8 Cr",
        totalAmountCollected: "₹3.24 Cr",
        totalAmountOutstanding: "82%",
        postDueAmount: "₹1.2 Cr",
        totalLoansIssued: 300,
        ongoingLoans: 224,
        closedLoans: 76,
        overdueLoans: 44,
    };

    return (
        <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm mt-2 2xl:mt-4 w-full">
            {/* Header */}
            <div className="bg-gray-100/70 px-4 2xl:px-6 py-2 2xl:py-3 border-b border-gray-100">
                <h2 className="text-[11px] 2xl:text-[13px] font-bold text-gray-800 tracking-wide uppercase">Loan Collection & Repayment Overview</h2>
            </div>

            <div className="p-3 2xl:p-6">
                {/* Top 4 Large Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 2xl:gap-5 mb-4 2xl:mb-8">
                    <CommonCard
                        variant="large"
                        largeTheme="solid-blue"
                        title="Asset Under Management"
                        value={currentData.totalLoansDueAmount}
                        icon={<FileUserIcon />}
                    />
                    <CommonCard
                        variant="large"
                        largeTheme="light-green"
                        title="Disbursed Amount"
                        value={currentData.totalAmountCollected}
                        icon={<SplitArrowSVG />}
                    />
                    <CommonCard
                        variant="large"
                        largeTheme="light-red"
                        title="Bank Balance"
                        value={currentData.postDueAmount}
                        icon={<CheckDocIcon />}
                    />
                    <CommonCard
                        variant="large"
                        largeTheme="light-yellow"
                        title="MTD collection %"
                        value={currentData.totalAmountOutstanding}
                        icon={<DashedCircleIcon />}
                    />

                </div>

                {/* Bottom 4 Mini Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 2xl:gap-5">
                    <CommonCard
                        variant="mini"
                        title="Total Loans Issued"
                        value={currentData.totalLoansIssued}
                        miniIndicatorColor="bg-[#3366ff]"
                        miniPillColor="bg-[#3366ff]"
                    />
                    <CommonCard
                        variant="mini"
                        title="Ongoing Loans"
                        value={currentData.ongoingLoans}
                        miniIndicatorColor="bg-[#c453f9]"
                        miniPillColor="bg-[#e48eff]"
                    />
                    <CommonCard
                        variant="mini"
                        title="Closed Loans"
                        value={currentData.closedLoans}
                        miniIndicatorColor="bg-[#22c55e]"
                        miniPillColor="bg-[#0bbb43]"
                    />
                    <CommonCard
                        variant="mini"
                        title="Overdue Loans"
                        value={currentData.overdueLoans}
                        miniIndicatorColor="bg-[#ef4444]"
                        miniPillColor="bg-[#ff4444]"
                    />
                </div>
            </div>
        </div>
    );
}
