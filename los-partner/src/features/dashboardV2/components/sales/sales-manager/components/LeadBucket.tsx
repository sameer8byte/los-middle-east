import BoxContainer from "../../sales-executive/ui/BoxContainer";

 
interface LeadStatProps {
    count?: number;
    label: string;
    borderColor: string;
    freshCount?: number;
    repeatCount?: number;
}

const LeadStat = ({ count = 0, label, borderColor, freshCount = 0, repeatCount = 0 }: LeadStatProps) => {
    return (
        <div className="flex-1 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-12 rounded" style={{ backgroundColor: borderColor }}></div>
                <div>
                    <div className="text-2xl font-bold text-gray-900">{count}</div>
                    <div className="text-sm text-gray-500">{label}</div>
                </div>
            </div>
            <div className="border-t border-gray-300 border-dashed mb-4"></div>
            <div className="flex justify-between text-sm text-gray-600">
                <span>Fresh : <span className="font-semibold text-gray-900">{freshCount}</span></span>
                <span>Repeat : <span className="font-semibold text-gray-900">{repeatCount}</span></span>
            </div>
        </div>
    );
};

interface LeadBucketData {
    totalLeads?: { count?: number; fresh?: number; repeat?: number };
    allottedLeads?: { count?: number; fresh?: number; repeat?: number };
    unallottedLeads?: { count?: number; fresh?: number; repeat?: number };
}

interface LeadBucketProps {
    data?: LeadBucketData;
    loading?: boolean;
    error?: string | null;
}

const LeadBucket = ({ data, loading, error }: LeadBucketProps = {}) => {
    if (error) {
        return (
            <BoxContainer title="My Lead Bucket" childrenClassName="w-full">
                <div className="flex items-center justify-center h-32 text-red-500 text-sm">{error}</div>
            </BoxContainer>
        );
    }

    if (loading) {
        return (
            <BoxContainer title="My Lead Bucket" childrenClassName="w-full">
                <div className="animate-pulse flex gap-8 w-full">
                    {[1,2,3].map(i => <div key={i} className="h-32 bg-gray-200 rounded flex-1" />)}
                </div>
            </BoxContainer>
        );
    }

    return (
        <div>
            <BoxContainer title="My Lead Bucket" childrenClassName="w-full">
                <div className="flex gap-8 w-full">
                    <LeadStat
                        count={data?.totalLeads?.count ?? 2000}
                        label="Total Leads In Bucket"
                        borderColor="#3B82F6"
                        freshCount={data?.totalLeads?.fresh ?? 30}
                        repeatCount={data?.totalLeads?.repeat ?? 24}
                    />
                    <LeadStat
                        count={data?.allottedLeads?.count ?? 1500}
                        label="Allotted Leads"
                        borderColor="#A855F7"
                        freshCount={data?.allottedLeads?.fresh ?? 15}
                        repeatCount={data?.allottedLeads?.repeat ?? 11}
                    />
                    <LeadStat
                        count={data?.unallottedLeads?.count ?? 500}
                        label="Lead yet to be allotted"
                        borderColor="#F59E0B"
                        freshCount={data?.unallottedLeads?.fresh ?? 15}
                        repeatCount={data?.unallottedLeads?.repeat ?? 13}
                    />
                </div>
            </BoxContainer>
        </div>
    );
};

export default LeadBucket;
