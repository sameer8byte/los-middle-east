import React from 'react';
import FirstSection from './component/FirstSection/FirstSection';
import Conversion from './component/SecondSection/Conversion';
import SalesPerformance from './component/Sales_Performance/SalesPerformance';
import LeftSection from './component/SecondSection/Conversion_Health/LeftSection';
import RightSection from './component/SecondSection/Conversion_Health/RightSection';

const SalesDashboard: React.FC = () => {
    return (
        <div className="space-y-3 bg-[#f8fafc] min-h-screen" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
            {/* First Section - AUM Snapshot Cards */}
            <FirstSection />

            {/* Second Section - Conversion */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.5fr] gap-3 w-full">
                {/* left part of conversion */}
                <div>
                    <Conversion />
                </div>
                {/* Right part of conversion - Unified Card */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm w-full font-sans flex flex-col h-full overflow-hidden">
                    {/* Unified Header */}
                    <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-100 w-full text-left">
                        <h2 className="text-[15px] font-semibold text-gray-800 tracking-tight">Conversion Conversion Health</h2>
                    </div>

                    {/* Unified Body */}
                    <div className="flex flex-col xl:flex-row items-stretch flex-grow relative">
                        {/* Left Side (Gauge, Pills, Metrics) */}
                        <div className="flex-1 p-6 relative">
                            <LeftSection />
                            {/* Vertical Dashed Divider */}
                            <div className="hidden xl:block absolute right-0 top-6 bottom-6 w-px border-r border-dashed border-gray-200"></div>
                            {/* Horizontal dashed divider on mobile */}
                            <div className="block xl:hidden absolute bottom-0 left-6 right-6 h-px border-b border-dashed border-gray-200"></div>
                        </div>

                        {/* Right Side (Donut Chart, Legend) */}
                        <div className="flex-[1.1] p-2">
                            <RightSection />
                        </div>
                    </div>
                </div>
            </div>

            {/* Third Section - Sales Performance */}
            <SalesPerformance />
        </div>
    );
};

export default SalesDashboard;