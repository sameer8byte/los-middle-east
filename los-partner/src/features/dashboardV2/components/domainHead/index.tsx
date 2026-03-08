import { useState } from "react";
import BusinessSnapshot from "./businessSnapshot";
import TeamPerformance from "./TeamPerformance";
import SalesDashboard from "./Sales";
import CreditDashboard from "./Credit";
import CollectionSnapshot from "./collectionSnapshot";

// Inline SVG icons (no external dependency needed)
// const CalendarIcon = () => (
//     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//         <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
//         <line x1="16" y1="2" x2="16" y2="6" />
//         <line x1="8" y1="2" x2="8" y2="6" />
//         <line x1="3" y1="10" x2="21" y2="10" />
//     </svg>
// );

// const ChevronDownIcon = () => (
//     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//         <polyline points="6 9 12 15 18 9" />
//     </svg>
// );


// Tab definitions
const TABS = [
    { key: "business-snapshot", label: "Business Snapshot" },
    { key: "sales", label: "Sales" },
    { key: "credit", label: "Credit" },
    { key: "collection", label: "Collection" },
    { key: "team-performance", label: "Team & Performance" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// Placeholder components for tabs not yet implemented
// function PlaceholderTab({ label }: { label: string }) {
//     return (
//         <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
//             {label} — coming soon
//         </div>
//     );
// }

// Render the content for the active tab
function TabContent({ activeTab }: { activeTab: TabKey }) {
    switch (activeTab) {
        case "business-snapshot":
            return <BusinessSnapshot />;
        case "collection":
            return <CollectionSnapshot />;
        case "sales":
            return <SalesDashboard />;
        case "credit":
            return <CreditDashboard />;
        case "team-performance":
            return <TeamPerformance />;
        default:
            return null;
    }
}

function DomainHeadDashboard() {
    const [activeTab, setActiveTab] = useState<TabKey>("business-snapshot");
    // const [dateRange, setDateRange] = useState("Select Date Range");

    return (
        <div className="min-h-screen bg-gray-50 p-3">
            {/* Header */}
            <div className="mb-4">
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-500">
                    Overview of loans, disbursements, and collections
                </p>
            </div>

            {/* Tab Bar + Date Range Picker */}
            <div className="flex items-center justify-between mb-6">
                {/* Tabs */}
                <div className="flex items-center gap-1">
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`
                  px-4 py-2 text-sm font-medium rounded-md transition-colors
                  ${isActive
                                        ? "bg-blue-50 text-blue-600"
                                        : "text-gray-500 hover:text-gray-700"
                                    }
                `}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Date Range Selector */}
                {/* <button
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    onClick={() => setDateRange("Select Date Range")}
                >
                    <CalendarIcon />
                    <span>{dateRange}</span>
                    <ChevronDownIcon />
                </button> */}
            </div>

            {/* Tab Content */}
            <TabContent activeTab={activeTab} />
        </div>
    );
}

export default DomainHeadDashboard;
