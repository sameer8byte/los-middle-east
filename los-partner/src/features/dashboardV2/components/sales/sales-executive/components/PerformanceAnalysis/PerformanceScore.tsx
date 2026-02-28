import { FaTrophy, FaStar } from "react-icons/fa";
import BoxContainer from "../../ui/BoxContainer";

interface PerformanceScoreData {
    overallScore?: number;
    maxScore?: number;
    rank?: number;
    totalRanks?: number;
    factors?: Array<{ name: string; score: number; color: string; icon: string }>;
    employees?: Array<{ name: string; score: number; position: string; highlight?: boolean }>;
}

interface PerformanceScoreProps {
    data?: PerformanceScoreData;
    loading?: boolean;
    error?: string | null;
}

const PerformanceScore = ({ data, loading, error }: PerformanceScoreProps = {}) => {
    const overallScore = data?.overallScore ?? 8.25;
    const maxScore = data?.maxScore ?? 10;
    const rank = data?.rank ?? 3;
    const totalRanks = data?.totalRanks ?? 24;

    const factors = data?.factors ?? [
        { name: "Factor 1", score: 8, color: "#86EFAC", icon: "+" },
        { name: "Factor 2", score: 7.5, color: "#FEF08A", icon: "★" },
        { name: "Factor 3", score: 6, color: "#FDE047", icon: "★" },
        { name: "Factor 4", score: 5, color: "#FCA5A5", icon: "★" },
    ];

    const employees = data?.employees ?? [
        { name: "Top performer", score: 9.25, position: "#6" },
        { name: "You", score: 8.25, position: "#7", highlight: true },
        { name: "Bottom Performer", score: 6.25, position: "#8" },
    ];

    if (error) {
        return (
            <BoxContainer title="Performance Score" titleBgColor="bg-[#EAF2FF]">
                <div className="flex items-center justify-center h-40 text-red-500 text-sm">{error}</div>
            </BoxContainer>
        );
    }

    if (loading) {
        return (
            <BoxContainer title="Performance Score" titleBgColor="bg-[#EAF2FF]">
                <div className="animate-pulse space-y-3">
                    <div className="h-20 bg-gray-200 rounded" />
                    <div className="h-32 bg-gray-200 rounded" />
                </div>
            </BoxContainer>
        );
    }
    return (
        <BoxContainer title="Performance Score" titleBgColor="bg-[#EAF2FF]">
            {/* Overall Rating */}
            <div className="bg-gradient-to-l from-[#2388FF] to-[#155299] rounded-xl p-4 mb-6 flex items-center justify-between w-full">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-4xl font-bold text-white">{overallScore}</span>
                    <span className="text-white text-sm">/ {maxScore}</span>
                    <span className="text-white text-sm ml-2">Overall Rating</span>
                </div>
                <div className="bg-white rounded-lg px-3 py-2 flex items-center gap-2">
                    <FaTrophy className="text-yellow-500" />
                    <span className="text-sm font-semibold">Rank #{rank} of {totalRanks}</span>
                </div>
            </div>
            <div className="w-full my-2">
            {/* Factors Grid */}
            <div className="grid grid-cols-2 gap-6 mb-6">
                {factors.map((factor, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <span className="text-blue-600 text-lg">🔥</span>
                        <span className="text-sm text-gray-700">{factor.name ?? ""}</span>
                        <div 
                            className="ml-auto px-3 py-1 rounded-md flex items-center gap-1 font-semibold text-sm"
                            style={{ backgroundColor: factor.color }}
                        >
                            {factor.score ?? 0}
                            {factor.icon === "★" ? <FaStar className="text-yellow-600 text-xs" /> : <span className="text-green-600">{factor.icon}</span>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Employee Performance */}
            <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-2">
                    <span>Employee</span>
                    <span>Performance Position</span>
                </div>
                <div className="space-y-2">
                    {employees.map((employee, index) => (
                        <div 
                            key={index} 
                            className={`flex items-center justify-between p-3 rounded-lg ${
                                employee.highlight ? "bg-blue-100" : "bg-gray-100"
                            }`}
                        >
                            <span className="text-sm font-medium">
                                {employee.name ?? ""} | {employee.score ?? 0}
                            </span>
                            <span className={`text-sm font-bold ${
                                employee.highlight ? "text-blue-600" : "text-gray-700"
                            }`}>
                                {employee.position ?? ""}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
            </div>
        </BoxContainer>
    );
};

export default PerformanceScore;
