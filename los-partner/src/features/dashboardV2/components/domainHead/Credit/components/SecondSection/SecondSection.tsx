

// --- Icons ---
const BlueDocIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M9 15l2 2 4-4" />
    </svg>
);

// --- Types ---
export interface TopCardData {
    title: string;
    value: number;
}

export interface BottomCardData {
    title: string;
    value: string;
    percentage?: string;
    themeColor: string;
}

export interface LoanPortfolioData {
    topCards: TopCardData[];
    bottomCards: BottomCardData[];
}

// --- Mock Data ---
const MOCK_DATA: LoanPortfolioData = {
    topCards: [
        { title: 'T.Active Loans', value: 520 },
        { title: 'Ongoing Loans', value: 410 },
        { title: 'Overdue Loans', value: 96 },
        { title: 'Closed Loans', value: 224 },
    ],
    bottomCards: [
        { title: 'Total Loan Amount', value: '₹12.6 Cr', themeColor: '#3b82f6' },        // Blue
        { title: 'Total Repayment Amount', value: '₹4.20 Cr', percentage: '33 %', themeColor: '#c084fc' }, // Purple
        { title: 'Total Amount Collected', value: '₹3.32 Cr', percentage: '79 %', themeColor: '#059669' }, // Green
        { title: 'Closed Loan Amount', value: '₹5.10 Cr', percentage: '30 %', themeColor: '#f472b6' },     // Pink
        { title: 'Outstanding Amount', value: '₹3.48 Cr', percentage: '27 %', themeColor: '#eab308' },     // Yellow
        { title: 'Overdue Amount', value: '₹72 L', percentage: '5.7 %', themeColor: '#ef4444' },         // Red
    ]
};

// --- Components ---
const TopBannerCard = ({ data }: { data: TopCardData }) => (
    <div className="bg-[#fbfcff] border border-blue-50/50 rounded-xl p-2.5 2xl:p-3 flex justify-between items-center w-full shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 2xl:gap-3">
            <BlueDocIcon />
            <span className="text-gray-500 text-[11px] 2xl:text-[13px] font-medium tracking-tight truncate">{data.title}</span>
        </div>
        <div className="bg-[#2563eb] text-white text-[10px] 2xl:text-[12px] font-bold px-2 py-0.5 2xl:px-3 2xl:py-1 rounded-md shrink-0">
            {data.value}
        </div>
    </div>
);

const BottomMetricCard = ({ data }: { data: BottomCardData }) => (
    <div className="bg-white border border-gray-100 rounded-xl p-3 2xl:p-4 flex flex-col justify-center relative shadow-sm overflow-hidden h-full hover:shadow-md transition-shadow">
        {/* Left Color Bar */}
        <div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/5 rounded-r-md"
            style={{ backgroundColor: data.themeColor }}
        ></div>

        <div className="pl-3">
            <div className="flex justify-between items-center mb-0.5 2xl:mb-1">
                <div className="text-[14px] lg:text-[12px] 2xl:text-[17px] font-bold text-gray-800 tracking-tight">{data.value}</div>
                {data.percentage && (
                    <div
                        className="text-white text-[9px] 2xl:text-[10px] font-bold px-1.5 py-0.5 2xl:px-2 rounded-md"
                        style={{ backgroundColor: data.themeColor }}
                    >
                        {data.percentage}
                    </div>
                )}
            </div>
            <div className="text-[9px] 2xl:text-[11px] text-gray-500 font-medium tracking-wide leading-tight mt-0.5">{data.title}</div>
        </div>
    </div>
);


export default function SecondSection({ data = MOCK_DATA }: { data?: LoanPortfolioData }) {
    return (
        <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm mt-4 2xl:mt-6 w-full font-sans">
            {/* Header */}
            <div className="bg-[#fbfcfcf0] px-4 py-3 2xl:px-6 2xl:py-4 border-b border-gray-100">
                <h2 className="text-[12px] 2xl:text-[14px] font-semibold text-gray-800 tracking-wide">Loan Portfolio & Repayment Overview (Across Executive)</h2>
            </div>

            <div className="p-4 2xl:p-6 flex flex-col gap-4 2xl:gap-6">

                {/* Top Row: 4 Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 2xl:gap-4">
                    {data.topCards.map((card, idx) => (
                        <TopBannerCard key={idx} data={card} />
                    ))}
                </div>

                {/* Bottom Row: 6 Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3 2xl:gap-4">
                    {data.bottomCards.map((card, idx) => (
                        <BottomMetricCard key={idx} data={card} />
                    ))}
                </div>

            </div>
        </div>
    );
}
