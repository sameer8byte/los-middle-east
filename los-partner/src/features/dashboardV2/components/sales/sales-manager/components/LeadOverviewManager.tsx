import { LuClipboardList, LuFileText } from "react-icons/lu";
import BoxContainer from "../../sales-executive/ui/BoxContainer";
import ColouredBox from "../../sales-executive/ui/ColorBox";

interface LeadOverviewManagerProps {
    data?: any;
    loading?: boolean;
    error?: string | null;
}

const LeadOverviewManager = ({ data, loading, error }: LeadOverviewManagerProps = {}) => {
    if (error) {
        return (
            <BoxContainer title="Lead Overview (Overall Executives)" childrenClassName="w-full">
                <div className="flex items-center justify-center h-32 text-red-500 text-sm">{error}</div>
            </BoxContainer>
        );
    }

    if (loading) {
        return (
            <BoxContainer title="Lead Overview (Overall Executives)" childrenClassName="w-full">
                <div className="animate-pulse grid grid-cols-2 md:grid-cols-4 gap-2 lg:gap-4 w-full">
                    {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-200 rounded" />)}
                </div>
            </BoxContainer>
        );
    }
    return (
        <div>
            <BoxContainer title="Lead Overview (Overall Executives)" childrenClassName="w-full">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 lg:gap-4 w-full">
                    <ColouredBox
                        icon={<LuClipboardList className="w-6 h-6" />}
                        leadNumber={data?.totalAllotted ?? 1500}
                        title="Total Allotted Leads"
                        color="#2563EB"
                        borderColor="#3B82F6"
                        statusObj={[
                            { label: "Fresh", count: 930, percentage: 62 },
                            { label: "Repeat", count: 570, percentage: 38 }
                        ]}
                    />
                    <ColouredBox
                        icon={<LuFileText className="w-6 h-6" />}
                        leadNumber={data?.currentFollowup ?? 520}
                        title="Current Followup"
                        color="#FEF3C7"
                        borderColor="#F59E0B"
                        statusObj={[
                            { label: "Fresh", count: 300, percentage: 58 },
                            { label: "Repeat", count: 220, percentage: 42 }
                        ]}
                        isLeadPercentage={true}
                        leadPercentage={35}
                    />
                    <ColouredBox
                        icon={<LuFileText className="w-6 h-6" />}
                        leadNumber={data?.disbursed ?? 360}
                        title="Disbursed"
                        color="#D1FAE5"
                        borderColor="#10B981"
                        statusObj={[
                            { label: "Fresh", count: 210, percentage: 58 },
                            { label: "Repeat", count: 150, percentage: 42 }
                        ]}
                        isLeadPercentage={true}
                        leadPercentage={24}
                    />
                    <ColouredBox
                        icon={<LuFileText className="w-6 h-6" />}
                        leadNumber={data?.rejected ?? 620}
                        title="Rejected"
                        color="#FEE2E2"
                        borderColor="#EF4444"
                        statusObj={[
                            { label: "Fresh", count: 360, percentage: 60 },
                            { label: "Repeat", count: 260, percentage: 40 }
                        ]}
                        isLeadPercentage={true}
                        leadPercentage={41}
                    />
                </div>
            </BoxContainer>
        </div>
    );
};

export default LeadOverviewManager;
