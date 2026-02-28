import { useState } from "react";
import { useParams } from "react-router-dom";
import { CreateUser } from "./components/createUser";
import UserList from "./components/usersList";
import ViewDetails from "./components/viewDetails";
import { DialerConfigModal } from "./components/dialerConfigModal";
import { DialerConfigsList } from "./components/dialerConfigsList";

export { PartnerUserDialerConfigService } from "../../shared/services/api/partner-user-dialer-config.api";

export function PartnerUserComponent() {
  const { brandId } = useParams<{ brandId: string }>();
  const [isDialerConfigOpen, setIsDialerConfigOpen] = useState(false);
  const [selectedPartnerUserId, setSelectedPartnerUserId] = useState<
    string | null
  >(null);
  const [activeTab, setActiveTab] = useState<"users" | "dialer-configs">("users");

  const handleOpenDialerConfig = (userId: string) => {
    setSelectedPartnerUserId(userId);
    setIsDialerConfigOpen(true);
  };

  return (
    <div>
      <ViewDetails />

      {/* Tabs */}
      <div className="flex gap-4 px-4 py-3 border-b border-gray-200 bg-white">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 font-medium transition-colors rounded-t-lg ${
            activeTab === "users"
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Partner Users
        </button>
        <button
          onClick={() => setActiveTab("dialer-configs")}
          className={`px-4 py-2 font-medium transition-colors rounded-t-lg ${
            activeTab === "dialer-configs"
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Dialer Configurations
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "users" && (
        <>
          <CreateUser />
          <UserList onOpenDialerConfig={handleOpenDialerConfig} />
        </>
      )}

      {activeTab === "dialer-configs" && <DialerConfigsList />}

      {/* Modal for editing config */}
      {selectedPartnerUserId && brandId && (
        <DialerConfigModal
          isOpen={isDialerConfigOpen}
          onClose={() => setIsDialerConfigOpen(false)}
          partnerUserId={selectedPartnerUserId}
          brandId={brandId}
          onSuccess={() => {
            setIsDialerConfigOpen(false);
            setSelectedPartnerUserId(null);
          }}
        />
      )}
    </div>
  );
}
