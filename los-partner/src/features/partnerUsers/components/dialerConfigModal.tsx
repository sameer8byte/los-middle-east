import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  PartnerUserDialerConfigService,
  DialerConfig,
  CreateDialerConfigPayload,
} from "../../../shared/services/api/partner-user-dialer-config.api";
import { getBrandUserById } from "../../../shared/services/api/partner-user.api";
import { BrandAcefoneSettingService } from "../../../shared/services/api/settings/brandAcefone.setting.api";
import { BiCheckCircle, BiErrorCircle } from "react-icons/bi";
import { FiCopy } from "react-icons/fi";
import Dialog from "../../../common/dialog";

interface DialerConfigModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly partnerUserId: string;
  readonly brandId: string;
  readonly onSuccess: () => void;
}

export function DialerConfigModal({
  isOpen,
  onClose,
  partnerUserId,
  brandId,
  onSuccess,
}: DialerConfigModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [dialerConfig, setDialerConfig] = useState<DialerConfig | null>(null);
  const [agentUserId, setAgentUserId] = useState("");
  const [agentUserNumber, setAgentUserNumber] = useState("");
  const [agentUserEmail, setAgentUserEmail] = useState("");
  const [agentAllowedCallerId, setAgentAllowedCallerId] = useState("");
  const [agentSkillId, setAgentSkillId] = useState("");
  const [isDisabled, setIsDisabled] = useState(false);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [allowedCallerIds, setAllowedCallerIds] = useState<string[]>([]); 

  // Load existing dialer config when modal opens
  useEffect(() => {
    if (isOpen && partnerUserId) {
      loadData();
    }
  }, [isOpen, partnerUserId]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Fetch user details
      const userInfo = await getBrandUserById(partnerUserId, brandId);
      setUserDetails(userInfo);

      // Fetch brand acefone config to get allowed caller IDs
      const brandConfig = await BrandAcefoneSettingService.getConfig(brandId).catch(
        () => null
      );

      if (brandConfig?.allowed_caller_ids) {
        setAllowedCallerIds(brandConfig.allowed_caller_ids);
      }

      // Fetch dialer config
      const config = await PartnerUserDialerConfigService.getDialerConfig(
        partnerUserId
      );
      setDialerConfig(config);
      setAgentUserId(config.agent_user_id);
      setAgentUserNumber(config.agent_user_number);
      setAgentUserEmail(config.agent_user_email || "");
      setAgentAllowedCallerId(config.agent_allowed_caller_id || "");
      setAgentSkillId(config.agent_skill_id || "");
      setIsDisabled(config.is_disabled);
    } catch {
      // Config might not exist yet, which is fine
      console.log("No existing dialer config found");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success(`${fieldName} copied to clipboard`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error: any) {
      console.error("Copy error:", error);
      toast.error(`Failed to copy ${fieldName}`);
    }
  };

const handleCreateOrUpdate = async () => {
  if (!agentUserId.trim() || !agentUserNumber.trim() || !agentSkillId.trim()) {
    toast.error("Please fill in all required fields");
    return;
  }

    setIsLoading(true);

    try {
      if (dialerConfig) {
        // Update existing config
        await PartnerUserDialerConfigService.updateDialerConfig(partnerUserId, {
          agent_user_id: agentUserId,
          agent_user_number: agentUserNumber,
          agent_skill_id: agentSkillId, 
          agent_allowed_caller_id: agentAllowedCallerId || undefined,
          is_disabled: isDisabled,
        });
        toast.success("Dialer configuration updated successfully");
      } else {
        // Create new config
        const payload: CreateDialerConfigPayload = {
          agentUserId,
          agentUserNumber,
          agentSkillId, 
          agentUserEmail: agentUserEmail || undefined,
          agentAllowedCallerId: agentAllowedCallerId || undefined,
        };
        await PartnerUserDialerConfigService.createDialerConfig(
          partnerUserId,
          payload
        );
        toast.success("Dialer configuration created successfully");
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error managing dialer config:", error);
      toast.error(error.message || "Failed to manage dialer configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!dialerConfig) return;

    setIsLoading(true);

    try {
      if (isDisabled) {
        await PartnerUserDialerConfigService.enableDialer(partnerUserId);
        setIsDisabled(false);
        toast.success("Dialer enabled successfully");
      } else {
        await PartnerUserDialerConfigService.disableDialer(partnerUserId);
        setIsDisabled(true);
        toast.success("Dialer disabled successfully");
      }
      onSuccess();
    } catch (error: any) {
      console.error("Error toggling dialer:", error);
      toast.error(error.message || "Failed to toggle dialer status");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const createUpdateButtonLabel = isLoading
    ? "Processing..."
    : (dialerConfig && "Update") || "Create";

  const toggleButtonLabel = isLoading
    ? "Processing..."
    : (isDisabled && "Enable") || "Disable";

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Dialer Configuration">
      <div className="space-y-4">
        {/* User Details Section */}
        {userDetails && (
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">
              User Details
            </h3>
            <div className="space-y-2">
              {/* Phone Number */}
              {userDetails.phone_number && (
                <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500">Phone Number</p>
                    <p className="text-sm font-medium text-gray-700">
                      {userDetails.phone_number}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleCopyToClipboard(userDetails.phone_number, "Phone")
                    }
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    title="Copy phone number"
                  >
                    {copiedField === "Phone" ? (
                      <span className="text-xs text-green-600 font-semibold">
                        ✓
                      </span>
                    ) : (
                      <FiCopy size={16} />
                    )}
                  </button>
                </div>
              )}

              {/* Email */}
              {userDetails.email && (
                <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-700">
                      {userDetails.email}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleCopyToClipboard(userDetails.email, "Email")
                    }
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    title="Copy email"
                  >
                    {copiedField === "Email" ? (
                      <span className="text-xs text-green-600 font-semibold">
                        ✓
                      </span>
                    ) : (
                      <FiCopy size={16} />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status Badge */}
        {dialerConfig && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50">
            {isDisabled ? (
              <>
                <BiErrorCircle className="text-red-600" size={20} />
                <span className="text-sm font-medium text-red-700">
                  Dialer Disabled
                </span>
              </>
            ) : (
              <>
                <BiCheckCircle className="text-green-600" size={20} />
                <span className="text-sm font-medium text-green-700">
                  Dialer Enabled
                </span>
              </>
            )}
          </div>
        )}

        {/* Agent User ID */}
        <div>
          <label
            htmlFor="agent-user-id"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Agent User ID *
            {' '}
            <small className="text-gray-500 ml-1 font-normal">
              (As provided by the dialer service)
            </small>
          </label>
          <input
            id="agent-user-id"
            type="text"
            value={agentUserId}
            onChange={(e) => setAgentUserId(e.target.value)}
            placeholder="Enter agent user ID"
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>

        {/* Agent User Number */}
        <div>
          <label
            htmlFor="agent-user-number"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Agent User Number *
          </label>
          <div className="flex gap-2">
            <input
              id="agent-user-number"
              type="tel"
              value={agentUserNumber}
              onChange={(e) => setAgentUserNumber(e.target.value)}
              placeholder="Enter agent phone number"
              disabled={isLoading}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
            {userDetails?.phone_number && (
              <button
                onClick={() => setAgentUserNumber(userDetails.phone_number)}
                disabled={isLoading}
                className="px-3 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors font-medium text-xs whitespace-nowrap"
                title="Use user's phone number"
              >
                Use Phone
              </button>
            )}
          </div>
        </div>

        {/* Agent User Email */}
        <div>
          <label
            htmlFor="agent-user-email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Agent User Email
          </label>
          <div className="flex gap-2">
            <input
              id="agent-user-email"
              type="email"
              value={agentUserEmail}
              onChange={(e) => setAgentUserEmail(e.target.value)}
              placeholder="Enter agent email address"
              disabled={isLoading}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
            {userDetails?.email && (
              <button
                onClick={() => setAgentUserEmail(userDetails.email)}
                disabled={isLoading}
                className="px-3 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors font-medium text-xs whitespace-nowrap"
                title="Use user's email"
              >
                Use Email
              </button>
            )}
          </div>
        </div>

        {/* Agent Allowed Caller ID */}
        <div>
          <label
            htmlFor="agent-allowed-caller-id"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Agent Allowed Caller ID
          </label>
          {allowedCallerIds.length > 0 ? (
            <select
              id="agent-allowed-caller-id"
              value={agentAllowedCallerId}
              onChange={(e) => setAgentAllowedCallerId(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">-- Select Caller ID --</option>
              {allowedCallerIds.map((callerId) => (
                <option key={callerId} value={callerId}>
                  {callerId}
                </option>
              ))}
            </select>
          ) : (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
              No allowed caller IDs configured in brand Acefone settings
            </div>
          )}
        </div>

        <div>
  <label
    htmlFor="agent-skill-id"
    className="block text-sm font-medium text-gray-700 mb-1"
  >
    Agent Skill ID *
    <small className="text-gray-500 ml-1 font-normal">
      (Skill ID from dialer system)
    </small>
  </label>
  <input
    id="agent-skill-id"
    type="text"
    value={agentSkillId}
    onChange={(e) => setAgentSkillId(e.target.value)}
    placeholder="Enter skill ID"
    disabled={isLoading}
    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
  />
</div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <button
            onClick={handleCreateOrUpdate}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          >
            {createUpdateButtonLabel}
          </button>

          {dialerConfig && (
            <button
              onClick={handleToggleActive}
              disabled={isLoading}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors font-medium ${
                isDisabled
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-green-600 text-white hover:bg-green-700"
              } disabled:opacity-50`}
            >
              {toggleButtonLabel}
            </button>
          )}

          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 disabled:opacity-50 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </Dialog>
  );
}
