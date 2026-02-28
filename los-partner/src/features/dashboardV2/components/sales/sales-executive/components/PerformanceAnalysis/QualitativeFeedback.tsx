import { HiChevronLeft, HiChevronRight, HiChevronDown } from "react-icons/hi";
import BoxContainer from "../../ui/BoxContainer";

interface Feedback {
    title: string;
    description: string;
    author: string;
    role: string;
    initials: string;
    time: string;
}

interface QualitativeFeedbackProps {
    data?: { feedbacks?: Feedback[]; currentPage?: number; totalPages?: number };
    loading?: boolean;
    error?: string | null;
}

const QualitativeFeedback = ({ data, loading, error }: QualitativeFeedbackProps = {}) => {
    const feedbacks = data?.feedbacks ?? [
        {
            title: "Lead Conversion",
            description: "Good follow-ups today.\nImprove hot lead conversion with faster response and clarity.",
            author: "Rajesk K",
            role: "Sales Manager",
            initials: "RK",
            time: "2 mins ago",
        },
    ];

    const currentPage = data?.currentPage ?? 1;
    const totalPages = data?.totalPages ?? 2;

    if (error) {
        return (
            <BoxContainer 
                title="Qualitative Feedback"
                className="w-full"
                titleBgColor="bg-[#EAF2FF]"
                dropdown={
                    <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                        Today
                        <HiChevronDown className="w-4 h-4" />
                    </button>
                }
                childrenClassName="flex-col"
            >
                <div className="flex items-center justify-center h-40 text-red-500 text-sm">{error}</div>
            </BoxContainer>
        );
    }

    if (loading) {
        return (
            <BoxContainer 
                title="Qualitative Feedback"
                className="w-full"
                titleBgColor="bg-[#EAF2FF]"
                dropdown={
                    <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                        Today
                        <HiChevronDown className="w-4 h-4" />
                    </button>
                }
                childrenClassName="flex-col"
            >
                <div className="animate-pulse space-y-3">
                    <div className="h-20 bg-gray-200 rounded" />
                    <div className="h-20 bg-gray-200 rounded" />
                </div>
            </BoxContainer>
        );
    }

    return (
        <BoxContainer 
            title="Qualitative Feedback"
            className="w-full"
            titleBgColor="bg-[#EAF2FF]"
            dropdown={
                <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                    Today
                    <HiChevronDown className="w-4 h-4" />
                </button>
            }
            childrenClassName="flex-col"
        >
            <div className="space-y-4 w-full">
                {!feedbacks || feedbacks.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">No feedback available</div>
                ) : (
                    feedbacks.map((feedback, index) => (
                        <div key={index} className="space-y-3">
                            <h3 className="font-semibold text-gray-900">{feedback.title ?? ""}</h3>
                            <p className="text-sm text-gray-600 whitespace-pre-line">
                                {feedback.description ?? ""}
                            </p>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-pink-200 flex items-center justify-center text-xs font-semibold text-pink-700">
                                        {feedback.initials ?? ""}
                                    </div>
                                    <span className="text-sm text-gray-700">
                                        {feedback.author ?? ""} | {feedback.role ?? ""}
                                    </span>
                                </div>
                                <span className="text-xs text-gray-500">{feedback.time ?? ""}</span>
                            </div>
                        </div>
                    ))
                )}

                {/* Pagination */}
                <div className="flex items-center gap-3 pt-2">
                    <button className="p-1 hover:bg-gray-100 rounded">
                        <HiChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-medium">
                        {currentPage}/{totalPages}
                    </span>
                    <button className="p-1 hover:bg-gray-100 rounded">
                        <HiChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </BoxContainer>
    );
};

export default QualitativeFeedback;
