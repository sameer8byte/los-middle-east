import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { FiPlus, FiTrash2, FiRefreshCw } from "react-icons/fi";
import { BiCheckCircle, BiErrorCircle } from "react-icons/bi";
import {
  BrandAcefoneSettingService,
  BrandAcefoneConfig,
  UpdateAcefoneConfigPayload,
} from "../../../shared/services/api/settings/brandAcefone.setting.api";

export function BrandAcefoneConfigSetting() {
  const { brandId } = useParams<{ brandId: string }>();
  const [config, setConfig] = useState<BrandAcefoneConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    acefoneToken: "",
    newCallerId: "",
    metadata: "",
  });

  useEffect(() => {
    fetchConfig();
  }, [brandId]);

  const fetchConfig = async () => {
    if (!brandId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await BrandAcefoneSettingService.getConfig(brandId);

      setConfig(response);
      setFormData((prev) => ({
        ...prev,
        acefoneToken: response.acefone_token || "",
        metadata: response.metadata
          ? JSON.stringify(response.metadata, null, 2)
          : "",
      }));
    } catch (err: any) {
      console.error("Error fetching Acefone config:", err);
      if (err.response?.status === 404) {
        setConfig(null);
      } else {
        setError(err.message || "Failed to fetch Acefone configuration");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async () => {
    if (!brandId) return;
    if (!formData.acefoneToken.trim()) {
      toast.error("Acefone token is required");
      return;
    }

    try {
      setIsSaving(true);
      const payload: UpdateAcefoneConfigPayload = {
        acefoneToken: formData.acefoneToken.trim(),
      };

      if (formData.metadata.trim()) {
        try {
          payload.metadata = JSON.parse(formData.metadata);
        } catch {
          toast.error("Invalid JSON format for metadata");
          return;
        }
      }

      if (config?.allowed_caller_ids) {
        payload.allowedCallerIds = config.allowed_caller_ids;
      }

      const response = await BrandAcefoneSettingService.updateConfig(
        brandId,
        payload
      );

      setConfig(response);
      toast.success("Acefone configuration updated successfully");
    } catch (err: any) {
      console.error("Error updating config:", err);
      toast.error(
        err.response?.data?.message || "Failed to update configuration"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCallerId = async () => {
    if (!brandId) return;
    const callerIdTrimmed = formData.newCallerId.trim();
    if (!callerIdTrimmed) {
      toast.error("Please enter a caller ID");
      return;
    }

    if (callerIdTrimmed.length === 0) {
      toast.error("Caller ID must be a non-empty string");
      return;
    }

    try {
      setIsSaving(true);
      const response = await BrandAcefoneSettingService.addCallerId(brandId, {
        callerId: callerIdTrimmed,
      });

      setConfig(response);
      setFormData((prev) => ({ ...prev, newCallerId: "" }));
      toast.success("Caller ID added successfully");
    } catch (err: any) {
      console.error("Error adding caller ID:", err);
      toast.error(
        err.response?.data?.message || "Failed to add caller ID"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveCallerId = async (callerId: string) => {
    if (!brandId) return;

    try {
      setIsSaving(true);
      const response = await BrandAcefoneSettingService.removeCallerId(
        brandId,
        callerId
      );

      setConfig(response);
      toast.success("Caller ID removed successfully");
    } catch (err: any) {
      console.error("Error removing caller ID:", err);
      toast.error(
        err.response?.data?.message || "Failed to remove caller ID"
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin">
          <FiRefreshCw size={24} className="text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Acefone Configuration
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Manage Acefone dialer settings, tokens, and allowed caller IDs
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <BiErrorCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={fetchConfig}
              className="text-sm text-red-600 hover:text-red-700 mt-2 underline"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        {/* Acefone Token Section */}
        <div className="space-y-3">
          <label htmlFor="acefoneToken" className="block text-sm font-medium text-gray-700">
            Acefone API Token *
          </label>
          <textarea
            id="acefoneToken"
            value={formData.acefoneToken}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, acefoneToken: e.target.value }))
            }
            disabled={isSaving}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="Enter your Acefone API token"
          />
          <p className="text-xs text-gray-500">
            This token is used to authenticate API calls to Acefone
          </p>
        </div>

        {/* Metadata Section */}
        <div className="space-y-3">
          <label htmlFor="metadata" className="block text-sm font-medium text-gray-700">
            Metadata (JSON)
          </label>
          <textarea
            id="metadata"
            value={formData.metadata}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, metadata: e.target.value }))
            }
            disabled={isSaving}
            rows={4}
            className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder='{"key": "value"}'
          />
          <p className="text-xs text-gray-500">
            Optional metadata for Acefone integration
          </p>
        </div>

        {/* Update Button */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleUpdateConfig}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isSaving ? "Saving..." : "Save Configuration"}
          </button>
          <button
            onClick={fetchConfig}
            disabled={isSaving}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FiRefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Allowed Caller IDs Section */}
        <div className="border-t border-gray-200 pt-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Allowed Caller IDs
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Add or remove phone numbers that are allowed to be used as caller IDs
            </p>
          </div>

          {/* Add Caller ID */}
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.newCallerId}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, newCallerId: e.target.value }))
              }
              disabled={isSaving}
              placeholder="Enter caller ID (e.g., 9876543210)"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleAddCallerId}
              disabled={isSaving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
            >
              <FiPlus className="w-4 h-4" />
              Add
            </button>
          </div>

          {/* Caller IDs List */}
          {config?.allowed_caller_ids && config.allowed_caller_ids.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {config.allowed_caller_ids.map((callerId: string) => (
                <div
                  key={callerId}
                  className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <BiCheckCircle className="text-green-600" size={18} />
                    <span className="text-sm font-medium text-gray-900">
                      {callerId}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveCallerId(callerId)}
                    disabled={isSaving}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Remove caller ID"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
              <p className="text-sm text-gray-500">No caller IDs added yet</p>
            </div>
          )}
        </div>

        {/* Configuration Info */}
        {config && (
          <div className="border-t border-gray-200 pt-4 text-xs text-gray-500 space-y-1">
            <p>Created: {new Date(config.created_at).toLocaleString()}</p>
            <p>Last Updated: {new Date(config.updated_at).toLocaleString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}
