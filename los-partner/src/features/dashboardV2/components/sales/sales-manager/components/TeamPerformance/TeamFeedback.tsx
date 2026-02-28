import { FiChevronDown, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import BoxContainer from "../../../sales-executive/ui/BoxContainer";
 
const TeamFeedback = () => {
    const feedbacks = [
        {
            title: "Lead Conversion",
            description: "Good follow-ups today. Improve hot lead conversion with faster response and clarity.",
            author: "Rajesk K",
            role: "Sales Manager",
            initials: "RK",
            time: "2 mins ago",
        },
    ];

    const currentPage = 1;
    const totalPages = 2;

    return (
        <div className="bg-blue-50 rounded-lg p-3">
            <BoxContainer title="Team Feedback" className="mb-4" titleBgColor="bg-blue-100" autoWidth>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-900">Qualitative Feedback</span>
                <button className="flex items-center gap-1 text-xs text-gray-600">
                    Today <FiChevronDown className="w-3 h-3" />
                </button>
            </div>
            </BoxContainer>
            <div className="mb-3">
                <div className="font-semibold text-sm text-gray-900 mb-1">{feedbacks[0].title}</div>
                <p className="text-xs text-gray-600">{feedbacks[0].description}</p>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <div className="flex items-center gap-2">
                    <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold bg-pink-500"
                    >
                        {feedbacks[0].initials}
                    </div>
                    <span>{feedbacks[0].author} | {feedbacks[0].role}</span>
                </div>
                <span>{feedbacks[0].time}</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
                <button><FiChevronLeft className="w-4 h-4" /></button>
                <span>{currentPage}/{totalPages}</span>
                <button><FiChevronRight className="w-4 h-4" /></button>
            </div>
        </div>
    );
};

export default TeamFeedback;
