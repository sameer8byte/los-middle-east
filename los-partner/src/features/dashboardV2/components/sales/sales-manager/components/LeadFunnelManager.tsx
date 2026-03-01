import BoxContainer from "../../sales-executive/ui/BoxContainer";

 
interface FunnelCardProps {
    className?: string;
    number?: number;
    title: string;
    bgColor: string;
    borderColor: string;
}

const FunnelCard = ({ className = "", number = 0, title, bgColor, borderColor }: FunnelCardProps) => {
    return (
        <div 
            className={`rounded-lg px-2 py-2 lg:px-3 lg:py-3 border ${className}`}
            style={{ backgroundColor: bgColor, borderColor: borderColor }}
        >
            <div 
                className="text-white text-xs lg:text-sm font-medium px-1.5 py-0.5 lg:py-1 rounded-md inline-block mb-1.5 lg:mb-2"
                style={{ backgroundColor: borderColor }}
            >
                {number}
            </div>
            <div className="text-xs lg:text-sm text-gray-700">{title}</div>
        </div>
    )
}

const DetailsCard = ({
    amount = "",
    title,
    borderColor,
    className = ""
}: {
    amount?: string;
    title: string;
    borderColor: string;
    className?: string;
}) => {
    return (
        <div className={`p-3 lg:p-4 relative border shadow-sm border-[#fafafa] rounded-lg ${className}`}>
            <div className="absolute left-1.5 top-0 w-1 h-8 lg:h-10 mt-4 lg:mt-6 rounded" style={{ backgroundColor: borderColor }}></div>
            <div className="text-lg lg:text-xl font-bold text-gray-900">{amount}</div>
            <div className="text-xs lg:text-sm mt-1.5 lg:mt-2 font-light text-gray-500">{title}</div>
        </div>
    )
}

interface LeadFunnelManagerProps {
    data?: any;
    loading?: boolean;
    error?: string | null;
}

const LeadFunnelManager = ({ data, loading, error }: LeadFunnelManagerProps = {}) => {
    if (error) {
        return (
            <BoxContainer title="Lead Funnel (Overall Executive)" childrenClassName="block w-full">
                <div className="flex items-center justify-center h-40 text-red-500 text-sm">{error}</div>
            </BoxContainer>
        );
    }

    if (loading) {
        return (
            <BoxContainer title="Lead Funnel (Overall Executive)" childrenClassName="block w-full">
                <div className="animate-pulse space-y-3">
                    <div className="grid grid-cols-5 gap-2 lg:gap-4">
                        {[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-gray-200 rounded" />)}
                    </div>
                    <div className="grid grid-cols-4 gap-2 lg:gap-4">
                        {[1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-200 rounded" />)}
                    </div>
                </div>
            </BoxContainer>
        );
    }
    return (
        <div>
            <BoxContainer title="Lead Funnel (Overall Executive)" childrenClassName="block w-full">
                <div className="grid grid-cols-5 gap-2 lg:gap-4">
                    <FunnelCard
                        number={data?.followupLeads ?? 820}
                        title="Followup Leads"
                        bgColor="#EEF2FF"
                        borderColor="#6366F1"
                    />
                    <FunnelCard
                        number={data?.sanctioned ?? 410}
                        title="Sanctioned"
                        bgColor="#EDE9FE"
                        borderColor="#8B5CF6"
                    />
                    <FunnelCard
                        number={data?.disbursed ?? 520}
                        title="Disbursed"
                        bgColor="#DCFCE7"
                        borderColor="#22C55E"
                    />
                    <FunnelCard
                        number={data?.pendingDisbursal ?? 70}
                        title="Pending Disbursal"
                        bgColor="#FEF3C7"
                        borderColor="#F59E0B"
                    />
                    <FunnelCard
                        number={data?.rejected ?? 300}
                        title="Rejected"
                        bgColor="#FEE2E2"
                        borderColor="#EF4444"
                    />
                </div>
                <div className="grid grid-cols-4 gap-2 lg:gap-4 mt-4">
                    <DetailsCard
                        amount={data?.totalSanctioned ?? "₹3.8 Cr"}
                        title="Total Amount Sanctioned"
                        borderColor="#6366F1"
                    />
                    <DetailsCard
                        amount={data?.amountDisbursed ?? "₹3.1 Cr"}
                        title="Amount Disbursed"
                        borderColor="#22C55E"
                    />
                    <DetailsCard
                        amount={data?.pendingAmount ?? "₹0.52 Cr"}
                        title="Pending For Disbursal"
                        borderColor="#F59E0B"
                    />
                    <DetailsCard
                        amount={data?.avgTicketSize ?? "₹46,300"}
                        title="Avg Loan Ticket Size"
                        borderColor="#8B5CF6"
                    />
                </div>
            </BoxContainer>
        </div>
    );
};

export default LeadFunnelManager;
