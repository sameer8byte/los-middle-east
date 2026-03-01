
import FirstSection from './components/FirstSection/FirstSecion';

import SecondSection from './components/SecondSection/SecondSection';
import Approval from './components/ThirdSection/Approval';
import LeftSection from './components/ThirdSection/Conversion_Approval/LeftSection';
import RightSection from './components/ThirdSection/Conversion_Approval/RightSection';
import CreditPerformance from './components/Credit_Performance/CreditPerformance';

export default function CreditDashboard() {
    return (
        <div className="space-y-3 bg-gray-50/20 min-h-screen" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
            <FirstSection />
            <SecondSection />

            {/* Second Section - Conversion */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.5fr] gap-3 w-full">
                {/* left part of conversion */}
                <div>
                    <Approval/>
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
                        <div className="flex-[1.1] p-6 lg:pl-10">
                            <RightSection />
                        </div>
                    </div>
                </div>
            </div>

            <CreditPerformance/>

        </div>
    );
}
