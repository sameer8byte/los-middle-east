import { LuTrophy, LuTarget, LuStar } from "react-icons/lu";
import { FiChevronDown, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { useState } from "react";
import BoxContainer from "../../../sales-executive/ui/BoxContainer";
 
interface ExecutiveCardProps {
  name: string;
  initials: string;
  rank: number;
  score: number;
  bgColor: string;
  expanded?: boolean;
}

const ExecutivePerformanceCard = ({
  name,
  initials,
  rank,
  score,
  bgColor,
  expanded = false,
}: ExecutiveCardProps) => {
  const [isExpanded, setIsExpanded] = useState(expanded);

  return (
    <div
      className={`border border-gray-200 rounded-lg mb-3 transition-all ${isExpanded ? "px-4 py-4" : "px-3 py-2"}`}
    >
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 ">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
            style={{ backgroundColor: bgColor }}
          >
            {initials}
          </div>
          <span className="font-medium text-gray-900">{name}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 rounded text-xs w-20 justify-center">
            <LuTrophy className="w-3 h-3 text-orang e-500" />
            <span className="font-medium">Rank #{rank}</span>
          </div>
          <div className="px-3 py-1 bg-blue-600 text-white rounded font-semibold text-sm w-14 text-center">
            {score}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <FiChevronDown
              className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm mt-4">
            <div className="flex items-center gap-2 text-gray-600">
              <LuTarget className="w-4 h-4" />
              <span>Leads worked</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded font-semibold">
              8 <LuStar className="w-3 h-3" />
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <LuTarget className="w-4 h-4" />
              <span>Fresh conversion</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded font-semibold">
              7.5 <LuStar className="w-3 h-3" />
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <LuTarget className="w-4 h-4" />
              <span>Repeat conversion</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded font-semibold">
              6 <LuStar className="w-3 h-3" />
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <LuTarget className="w-4 h-4" />
              <span>Productivity</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded font-semibold">
              5 <LuStar className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* Qualitative Feedback */}
        <BoxContainer
          title="Qualitative Feedback"
          titleBgColor="bg-blue-50"
          className=""
        >
          <div className="mb-3">
            <div className="font-semibold text-sm text-gray-900 mb-1">
              Lead Conversion
            </div>
            <p className="text-xs text-gray-600">
              Good follow-ups today. Improve hot lead conversion with faster
              response and clarity.
            </p>
          </div>
          <div className="flex items-center justify-between w-full text-xs text-gray-500 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold bg-pink-500">
                RK
              </div>
              <span>Rajesk K | Sales Manager</span>
            </div>
            <span>2 mins ago</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <button>
              <FiChevronLeft className="w-4 h-4" />
            </button>
            <span>1/2</span>
            <button>
              <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        </BoxContainer>
      </div>
      {/* </div> */}
    </div>
  );
};

export default ExecutivePerformanceCard;
