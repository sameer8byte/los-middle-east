 import { FiChevronDown, FiPlus, FiSearch, FiFilter } from "react-icons/fi";
import ExecutivePerformanceCard from "./ExecutivePerformanceCard";
import BoxContainer from "../../../sales-executive/ui/BoxContainer";

const TeamPerformance = () => {
    return (
        <BoxContainer 
            title="" 
            className="mb-0 min-h-[500px] overflow-auto"
            childrenClassName="flex-col"
                dropdown={
                    <button className="flex items-center gap-2 py-2 rounded-lg font-medium">
                        Team Performance
                        <FiChevronDown className="w-4 h-4" />
                    </button>
                }
                button={
                    <button 
                        onClick={() => console.log('Add Rating clicked')}
                        className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 cursor-pointer"
                    >
                        Add Rating <FiPlus className="w-4 h-4" />
                    </button>
                }
            >
                <div className="w-full h-[880px] overflow-y-auto scrollbar-hide">
                    {/* Reporting Manager */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 -mx-4 px-4">
                        <span className="text-sm font-medium text-gray-600">Reporting Manager</span>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-pink-300 flex items-center justify-center text-white text-xs font-semibold">
                                RK
                            </div>
                            <div className="text-sm">
                                <span className="font-semibold">Rajesh K</span>
                                <span className="text-gray-500"> | Sales Head</span>
                            </div>
                        </div>
                    </div>

                    {/* Search and Filters */}
                    <div className="flex gap-2 mb-4">
                        <div className="flex-1 relative">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by Executive Name"
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                        </div>
                        <button className="p-2 border border-gray-300 rounded-lg">
                            <FiFilter className="w-5 h-5 text-gray-600" />
                        </button>
                        <button className="p-2 border border-gray-300 rounded-lg">
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                            </svg>
                        </button>
                    </div>

                    {/* Executive Cards */}
                    <div className="space-y-2">
                        <ExecutivePerformanceCard
                            name="Mahesh R"
                            initials="MR"
                            rank={3}
                            score={8.25}
                            bgColor="#E91E63"
                            expanded={true}
                        />
                        <ExecutivePerformanceCard
                            name="Kiran T"
                            initials="KR"
                            rank={6}
                            score={7.60}
                            bgColor="#9C27B0"
                        />
                        <ExecutivePerformanceCard
                            name="Jasmine L"
                            initials="JR"
                            rank={7}
                            score={7.45}
                            bgColor="#FF5722"
                        />
                        <ExecutivePerformanceCard
                            name="Tariq M"
                            initials="TR"
                            rank={8}
                            score={7.30}
                            bgColor="#E91E63"
                        />
                    </div>
                </div>
            </BoxContainer>
    );
};

export default TeamPerformance;
