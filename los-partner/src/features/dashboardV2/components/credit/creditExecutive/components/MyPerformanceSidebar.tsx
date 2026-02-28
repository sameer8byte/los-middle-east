import React from 'react';
import { FiChevronDown, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { HiOutlineFire } from 'react-icons/hi';

const MyPerformanceSidebar: React.FC = () => {
    return (
        /* Removed gaps by ensuring h-full and using flex-col to fill space */
        <aside className="h-full w-full border border-gray-200 rounded-xl flex flex-col overflow-hidden">
            {/* Top Header - Reduced padding */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-[#F8F9FA]">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-[10px]">📊</span>
                    </div>
                    <h2 className="font-bold text-gray-800 text-xs lg:text-sm whitespace-nowrap">My Performance</h2>
                </div>
                <div className="flex items-center gap-1 border border-gray-200 rounded-md px-2 py-0.5 bg-gray-50 cursor-pointer shrink-0">
                    <span className="text-[10px] font-bold text-gray-700 whitespace-nowrap">Rajesh K</span>
                    <FiChevronDown className="text-gray-400 text-[10px]" />
                </div>
            </div>

            {/* Main Scrollable Content - flex-1 expands to fill bottom gaps */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4 bg-white custom-scrollbar">

                {/* Reporting Manager Section - Increased height */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-2 px-2 border-b border-gray-50 bg-gray-50/30 rounded-lg gap-2">
                    <span className="text-[11px] lg:text-xs font-bold text-gray-500 uppercase tracking-tight">Reporting Manager</span>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-pink-100 rounded text-pink-600 flex items-center justify-center text-[10px] font-bold shrink-0">RK</div>
                        <p className="text-[11px] lg:text-xs font-bold text-gray-800">Rajesh K</p>
                    </div>
                </div>

                {/* Performance Score Main Card - Increased height */}
                <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm bg-white">
                    <div className="bg-[#F8F9FA] px-4 py-5 border-b border-gray-100">
                        <h3 className="text-[11px] lg:text-xs font-bold text-gray-600 uppercase tracking-wider">Performance Score</h3>
                    </div>

                    <div className="p-4 space-y-5">
                        {/* Rating Display - Gradient Theme */}
                        <div
                            style={{ background: 'linear-gradient(270deg, #2388FF 0%, #155299 100%)' }}
                            className="rounded-xl p-5 text-white relative shadow-md"
                        >
                            <div className="flex flex-col">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl lg:text-2xl font-black tracking-tight">8.25</span>
                                    <span className="text-lg lg:text-lg font-medium opacity-60">/ 10</span>
                                </div>
                                <span className="text-[10px] lg:text-xs font-bold uppercase tracking-widest opacity-80 mt-1">Overall Rating</span>
                            </div>

                            <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-white rounded-lg px-3 py-2 flex items-center gap-1.5 shadow-md border border-white/20">
                                <span className="text-base">🥉</span>
                                <div className="flex flex-col">
                                    <span className="text-[11px] lg:text-xs font-black text-gray-800 leading-none">Rank #3</span>
                                    <span className="text-[9px] lg:text-xs font-bold text-gray-400 mt-1 leading-none whitespace-nowrap">of 24</span>
                                </div>
                            </div>
                        </div>

                        {/* Factors Grid - Increased height */}
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'Factor 1', score: '8', color: 'bg-[#22C55E]' },
                                { label: 'Factor 2', score: '7.5', color: 'bg-[#EAB308]' },
                                { label: 'Factor 3', score: '6', color: 'bg-[#EAB308]' },
                                { label: 'Factor 4', score: '5', color: 'bg-[#EF4444]', active: true },
                            ].map((f, i) => (
                                <div
                                    key={i}
                                    className={`flex flex-col lg:flex-row lg:items-center lg:justify-between p-3 lg:p-4 rounded-lg border transition-all gap-2 ${f.active
                                            ? 'border-[#2388FF] bg-blue-50/50 ring-1 ring-[#2388FF]'
                                            : 'border-gray-100 bg-gray-50/20'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="p-1 bg-blue-100 rounded-sm shrink-0">
                                            <HiOutlineFire className="text-[#155299] text-[12px]" />
                                        </div>
                                        <span className="text-[10px] lg:text-xs font-bold text-gray-600">{f.label}</span>
                                    </div>
                                    <div className={`flex items-center gap-0.5 px-1 py-1 lg:px-1 lg:py-1.5 rounded text-white ${f.color} shrink-0`}>
                                        <span className="text-[10px] lg:text-xs font-black">{f.score}</span>
                                        <span className="text-[8px] lg:text-xs">★</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Employee Comparison - Increased height */}
                        <div className="space-y-3 pt-4">
                            <div className="flex justify-between text-[10px] lg:text-xs font-bold text-gray-500 uppercase tracking-tighter">
                                <span>Employee Comparison</span>
                                <span>Position</span>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex-1 bg-gray-100 rounded-lg h-8 relative overflow-hidden">
                                    <div className="absolute inset-y-0 left-0 bg-indigo-100/60" style={{ width: '92.5%' }} />
                                    <span className="relative z-10 px-2 flex items-center h-full text-[10px] lg:text-xs text-gray-600 font-bold">
                                        Top performer | <span className="ml-1 text-gray-800">9.25</span>
                                    </span>
                                </div>
                                <span className="w-5 text-right font-bold text-gray-400 text-[11px] lg:text-xs">#6</span>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex-1 rounded-lg h-10 relative border border-blue-100 overflow-hidden shadow-sm">
                                    <div
                                        className="absolute inset-y-0 left-0 bg-indigo-100/90"
                                        style={{
                                            width: '82.5%',
                                           
                                        }}
                                    />
                                    <span className="relative z-10 px-2 flex items-center h-full text-[10px] lg:text-xs text-black font-black">
                                        You | 8.25
                                    </span>
                                </div>
                                <span className="w-5 text-right font-black text-[#155299] text-[13px] lg:text-base">#7</span>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex-1 bg-gray-50 rounded-lg h-8 relative overflow-hidden">
                                    <div className="absolute inset-y-0 left-0 bg-indigo-50/60" style={{ width: '62.5%' }} />
                                    <span className="relative z-10 px-2 flex items-center h-full text-[10px] lg:text-xs text-gray-500 font-bold">
                                        Bottom performer | <span className="ml-1 text-gray-700">6.25</span>
                                    </span>
                                </div>
                                <span className="w-5 text-right font-bold text-gray-400 text-[11px] lg:text-xs">#8</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Qualitative Feedback - Increased height */}
                <div className="border border-blue-100 rounded-xl overflow-hidden bg-white shadow-sm shrink-0">
                    <div className="bg-[#F8F9FA] px-4 py-5 flex flex-col lg:flex-row lg:items-center lg:justify-between border-b border-gray-100 gap-2">
                        <h3 className="text-[11px] lg:text-xs font-bold text-gray-600 uppercase">Qualitative Feedback</h3>
                        <div className="flex items-center gap-1 border border-gray-200 rounded px-2 py-1 bg-white cursor-pointer">
                            <span className="text-[10px] lg:text-xs font-bold text-gray-600">Today</span>
                            <FiChevronDown className="text-gray-400 text-[10px]" />
                        </div>
                    </div>

                    <div className="p-4 space-y-4">
                        <h4 className="text-[11px] lg:text-xs font-bold text-gray-800">Lead Conversion</h4>
                        <p className="text-[11px] lg:text-xs text-gray-500 leading-relaxed">
                            Good follow-ups today. Improve hot lead conversion with faster response and clarity.
                        </p>

                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between pt-3 border-t border-gray-100 gap-2">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 bg-pink-100 rounded text-pink-600 flex items-center justify-center text-[9px] font-bold shrink-0">RK</div>
                                <span className="text-[10px] lg:text-xs font-bold text-gray-700">Rajesh K <span className="font-normal text-gray-400">| Mgr</span></span>
                            </div>
                            <span className="text-[9px] lg:text-xs text-gray-400">2 mins ago</span>
                        </div>

                        <div className="flex items-center justify-center gap-6 pt-2">
                            <button className="p-1.5 hover:bg-gray-100 rounded-full border border-gray-100 text-gray-400 transition-transform active:scale-90"><FiChevronLeft size={14}/></button>
                            <span className="text-[10px] lg:text-xs font-bold text-gray-600 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">1 / 2</span>
                            <button className="p-1.5 hover:bg-gray-100 rounded-full border border-gray-100 text-gray-400 transition-transform active:scale-90"><FiChevronRight size={14}/></button>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default MyPerformanceSidebar;