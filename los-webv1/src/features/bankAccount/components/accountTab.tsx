import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const tabs = [
  { id: "UPI", label: "UPI" },
  { id: "MANUAL", label: "Manual" },
];

export default function AccountTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "UPI";
  const [activeTab, setActiveTab] = useState<string | null>(initialTab);

  // Sync tab state with URL parameters
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const isValidTab = tabs.some((tab) => tab.id === tabParam);
    const newTab = isValidTab ? tabParam : "UPI";
    setActiveTab(newTab);

    // Update URL if invalid tab was present
    if (!isValidTab && tabParam !== null) {
      setSearchParams({ tab: newTab || "UPI" });
    }
  }, [searchParams, setSearchParams]);

  const handleTabChange = (tabId: string) => {
    setSearchParams({ tab: tabId || "UPI" });
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      {/* Tabs */}
      <div className="flex space-x-4 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`py-2 px-4 -mb-px border-b-2 text-sm font-medium ${
              activeTab === tab.id
                ? "border-primary text-on-primary"
                : "border-transparent text-gray-500 hover:text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "UPI" && <div>Your profile info here.</div>}
        {activeTab === "MANUAL" && <div>Settings content goes here.</div>}
      </div>
    </div>
  );
}
