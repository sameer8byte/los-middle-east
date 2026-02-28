 import { LuFlame } from "react-icons/lu";
import BoxContainer from "../../sales-executive/ui/BoxContainer";

interface VariableCardProps {
    label: string;
    value?: number;
}

const VariableCard = ({ label, value = 0 }: VariableCardProps) => {
    return (
        <div className="flex items-center  justify-between rounded-lg px-4 py-3 flex-1" style={{ backgroundColor: '#F8FAFF', border: '1px solid #F1F3F7' }}>
            <div className="flex items-center gap-2">
                <LuFlame className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-700">{label}</span>
            </div>
            <div className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-semibold">
                {value}
            </div>
        </div>
    )
}

interface ExecutiveSummaryData {
    variableA?: number;
    variableB?: number;
    variableC?: number;
}

interface ExecutiveSummaryProps {
    data?: ExecutiveSummaryData;
    loading?: boolean;
    error?: string | null;
}

const ExecutiveSummary = ({ data, loading, error }: ExecutiveSummaryProps = {}) => {
    if (error) {
        return (
            <BoxContainer title="Executives Summary" childrenClassName="w-full">
                <div className="flex items-center justify-center h-20 text-red-500 text-sm">{error}</div>
            </BoxContainer>
        );
    }

    if (loading) {
        return (
            <BoxContainer title="Executives Summary" childrenClassName="w-full">
                <div className="animate-pulse flex gap-4 w-full">
                    {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-200 rounded flex-1" />)}
                </div>
            </BoxContainer>
        );
    }

    return (
        <div>
            <BoxContainer title="Executives Summary" childrenClassName="w-full">
                <div className="flex gap-4 w-full">
                    <VariableCard label="Variable A" value={data?.variableA ?? 30} />
                    <VariableCard label="Variable B" value={data?.variableB ?? 30} />
                    <VariableCard label="Variable C" value={data?.variableC ?? 30} />
                </div>
            </BoxContainer>
        </div>
    )
}

export default ExecutiveSummary;