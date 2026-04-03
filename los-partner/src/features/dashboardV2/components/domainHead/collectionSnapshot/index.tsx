

import FirstSection from './components/FirstSection/FirstSection';
import LeftSection from './components/SecondSection/Collection_Contribution/LeftSection';
import RightSection from './components/SecondSection/Collection_Contribution/RightSection';
import CollectionPerformance from './components/CollectionPerformance/CollectionPerformance';
import Collection from './components/SecondSection/Collection';

export default function CollectionSnapshot() {
    return (
        <div className="space-y-3 bg-gray-50/20 min-h-screen" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
            <FirstSection />

            {/* Second Section - Collection & Performance Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.5fr] gap-3 w-full">

                {/* Left Part - Collection Contribution */}
                <div>
                    <Collection />
                </div>

                {/* Right Part - Performance Cards Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 w-full">
                    {/* Left Card - Collection Performance */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm w-full font-sans flex flex-col h-full overflow-hidden">
                        <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-100 max-h-[50px] flex items-center w-full text-left">
                            <h2 className="text-[14px] font-semibold text-gray-800 tracking-tight">Collection Performance (Across Executive)</h2>
                        </div>
                        <div className="p-3 relative flex flex-col justify-center flex-grow">
                            <LeftSection />
                        </div>
                    </div>

                    {/* Right Card - Conversion Performance */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm w-full font-sans flex flex-col h-full overflow-hidden">
                        <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-100 max-h-[50px] flex items-center w-full text-left">
                            <h2 className="text-[14px] font-semibold text-gray-800 tracking-tight">Conversion Performance (Across Executive)</h2>
                        </div>
                        <div className="p-3 relative flex flex-col justify-center flex-grow">
                            <RightSection />
                        </div>
                    </div>
                </div>
            </div>

            <CollectionPerformance />

        </div>
    );
}
