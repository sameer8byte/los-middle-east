import BoxContainer from "../ui/BoxContainer";
import ColouredBox from "../ui/ColorBox";
import { LuUsers } from "react-icons/lu";

interface LeadOverviewData {
    totalAllocated?: number;
    activeLeads?: number;
    convertedLeads?: number;
    rejectedLeads?: number;
}

interface LeadOverviewProps {
    data?: LeadOverviewData;
    loading?: boolean;
    error?: string | null;
}

const LeadOverview = ({ data, loading, error }: LeadOverviewProps = {}) => {
    if (error) {
        return (
            <BoxContainer title="Lead Overview Snapshot" childrenClassName="w-full">
                <div className="flex items-center justify-center h-40 text-red-500 text-sm">{error}</div>
            </BoxContainer>
        );
    }

    if (loading) {
        return (
            <BoxContainer title="Lead Overview Snapshot" childrenClassName="w-full">
                <div className="animate-pulse grid grid-cols-2 md:grid-cols-4 gap-2 lg:gap-4">
                    {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-200 rounded" />)}
                </div>
            </BoxContainer>
        );
    }    
    return (  
        <div>
        <BoxContainer title="Lead Overview Snapshot" childrenClassName="w-full">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 lg:gap-4">
                <ColouredBox 
                    icon={<LuUsers className="w-6 h-6" />}
                    leadNumber={data?.totalAllocated ?? 150}
                    title="Total Allocated Loans"
                    color="#2563EB"
                    borderColor="#2563EB"
                    statusObj={[
                        { label: "Pending", count: 80, percentage: 53 },
                        { label: "Approved", count: 70, percentage: 47 }
                    ]}
                />
                <ColouredBox 
                    icon={<LuUsers className="w-6 h-6" />}
                    leadNumber={data?.activeLeads ?? 85}
                    title="Active Leads"
                    color="#FFF3E0"
                    borderColor="#FF9800"
                    statusObj={[
                        { label: "Hot", count: 45, percentage: 53 },
                        { label: "Warm", count: 40, percentage: 47 }
                    ]}
                    isLeadPercentage={true}
                    leadPercentage={55}
                />
                <ColouredBox 
                    icon={<LuUsers className="w-6 h-6" />}
                    leadNumber={data?.convertedLeads ?? 65}
                    title="Converted Leads"
                    color="#E8F5E9"
                    borderColor="#4CAF50"
                    statusObj={[
                        { label: "This Month", count: 35, percentage: 54 },
                        { label: "Last Month", count: 30, percentage: 46 }
                    ]}
                    isLeadPercentage={true}
                    leadPercentage={43}
                />
                <ColouredBox 
                    icon={<LuUsers className="w-6 h-6" />}
                    leadNumber={data?.rejectedLeads ?? 20}
                    title="Rejected Leads"
                    color="#FFEBEE"
                    borderColor="#F44336"
                    statusObj={[
                        { label: "Credit", count: 12, percentage: 60 },
                        { label: "Other", count: 8, percentage: 40 }
                    ]}
                    isLeadPercentage={true}
                    leadPercentage={22}
                />
            </div>
        </BoxContainer>
        </div>
    )
}

export default LeadOverview;