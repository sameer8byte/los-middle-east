import FirstSection from "./component/FirstSection/FirstSection";
import RevenuePerformance from "./component/SecondSection/Revenue_Performance";
import ProfitabilitySnapshot from "./component/SecondSection/Profitability_Snapshot";
import TargetVsAchieved from "./component/SecondSection/Target_Vs_Achieved";
import Collection from "./component/ThirdSection/Collection";
import MTDCollection from "./component/ThirdSection/MTD_Collection";
import DeficitCollection from "./component/ThirdSection/Deficit_Collection";
import ReLoanRetention from "./component/FourthSection/ReLoan_Retention";
import MarketConversion from "./component/FourthSection/Market_Conversion";

function BusinessSnapshot() {
    return (
        <div className="w-full flex flex-col gap-3">
            <FirstSection />
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                <RevenuePerformance />
                <ProfitabilitySnapshot />
                <TargetVsAchieved />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                <Collection />
                <MTDCollection />
                <DeficitCollection />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="lg:col-span-1">
                    <ReLoanRetention />
                </div>
                <div className="lg:col-span-2">
                    <MarketConversion />
                </div>
            </div>
        </div>
    );
}

export default BusinessSnapshot;
