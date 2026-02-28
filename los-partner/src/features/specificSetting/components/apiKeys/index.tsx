import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { HiPlus, HiTrash, HiArrowPathRoundedSquare, HiEye, HiEyeSlash, HiCheckCircle, HiXCircle } from "react-icons/hi2";
import apiKeyService from "../../../../shared/services/api/apiKey.api";
import type { ApiKeyResponse } from "../../../../shared/services/api/apiKey.api";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error";
}

interface ExpandedKey {
  [key: string]: boolean;
}

export function ApiKeysSetting() {
  const { brandId } = useParams<{ brandId: string }>();
  const [apiKeys, setApiKeys] = useState<ApiKeyResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showKey, setShowKey] = useState<ExpandedKey>({});
  const [expandedKey, setExpandedKey] = useState<ExpandedKey>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    expiresAt: "",
  });

  // Toast notification
  const addToast = (message: string, type: "success" | "error") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
  };

  // Fetch API keys
  const fetchApiKeys = async () => {
    if (!brandId) return;
    setLoading(true);
    setError(null);
    try {
      const keys = await apiKeyService.getApiKeys(brandId);
      setApiKeys(keys);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to fetch API keys";
      setError(errorMessage);
      addToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, [brandId]);

  // Create API key
  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!brandId) {
      const errMsg = "Brand ID is required";
      setError(errMsg);
      addToast(errMsg, "error");
      return;
    }
    try {
      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : undefined,
      };

      const response = await apiKeyService.createApiKey(brandId, payload);

      setApiKeys([response, ...apiKeys]);
      setFormData({ name: "", description: "", expiresAt: "" });
      setShowCreateForm(false);
      addToast("API key created successfully!", "success");
    } catch (err: any) {
      const errorMessage = err.message || "Failed to create API key";
      setError(errorMessage);
      addToast(errorMessage, "error");
    }
  };

  // Revoke API key
  const handleRevokeApiKey = async (apiKeyId: string) => {
    if (!confirm("Are you sure you want to revoke this API key?")) return;
    if (!brandId) {
      const errMsg = "Brand ID is required";
      setError(errMsg);
      addToast(errMsg, "error");
      return;
    }

    try {
      await apiKeyService.revokeApiKey(brandId, apiKeyId);

      setApiKeys(apiKeys.map((key) =>
        key.id === apiKeyId ? { ...key, is_active: false } : key
      ));
      addToast("API key revoked successfully", "success");
    } catch (err: any) {
      const errorMessage = err.message || "Failed to revoke API key";
      setError(errorMessage);
      addToast(errorMessage, "error");
    }
  };

  // Rotate API key
  const handleRotateApiKey = async (apiKeyId: string) => {
    if (!confirm("This will create a new key and disable the old one. Continue?")) return;
    if (!brandId) {
      const errMsg = "Brand ID is required";
      setError(errMsg);
      addToast(errMsg, "error");
      return;
    }

    try {
      const response = await apiKeyService.rotateApiKey(brandId, apiKeyId);

      // Remove old key and add new key
      setApiKeys([response, ...apiKeys.filter((key) => key.id !== apiKeyId)]);
      addToast("API key rotated successfully", "success");
    } catch (err: any) {
      const errorMessage = err.message || "Failed to rotate API key";
      setError(errorMessage);
      addToast(errorMessage, "error");
    }
  };

  // Delete API key
  const handleDeleteApiKey = async (apiKeyId: string) => {
    if (!confirm("This will permanently delete this API key. Continue?")) return;
    if (!brandId) {
      const errMsg = "Brand ID is required";
      setError(errMsg);
      addToast(errMsg, "error");
      return;
    }

    try {
      await apiKeyService.deleteApiKey(brandId, apiKeyId);

      setApiKeys(apiKeys.filter((key) => key.id !== apiKeyId));
      addToast("API key deleted successfully", "success");
    } catch (err: any) {
      const errorMessage = err.message || "Failed to delete API key";
      setError(errorMessage);
      addToast(errorMessage, "error");
    }
  };

  const toggleShowKey = (keyId: string) => {
    setShowKey((prev) => ({
      ...prev,
      [keyId]: !prev[keyId],
    }));
  };

  const toggleExpandKey = (keyId: string) => {
    setExpandedKey((prev) => ({
      ...prev,
      [keyId]: !prev[keyId],
    }));
  };

  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    addToast("API key copied to clipboard", "success");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-white py-4 px-3 sm:px-4 min-h-screen">
      <div className="max-w-5xl mx-auto">
        {/* Toast Notifications */}
        <div className="fixed top-2 right-2 sm:top-4 sm:right-4 z-50 space-y-2 pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-xs sm:text-sm animate-in slide-in-from-top fade-in ${
                toast.type === "success"
                  ? "bg-green-50 text-green-900 border border-green-200"
                  : "bg-red-50 text-red-900 border border-red-200"
              }`}
            >
              {toast.type === "success" ? (
                <HiCheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              ) : (
                <HiXCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              )}
              <span className="font-medium">{toast.message}</span>
            </div>
          ))}
        </div>

        {/* Compact Header */}
        <div className="mb-4 sm:mb-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">API Keys</h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">Manage secure access credentials</p>
            </div>
            {!showCreateForm && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-1 px-3 sm:px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                <HiPlus className="w-4 h-4" />
                <span>New Key</span>
              </button>
            )}
          </div>
        </div>

        {/* Error Alert - Compact */}
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-900 flex gap-2 text-xs sm:text-sm animate-in fade-in">
            <HiXCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-700 font-semibold flex-shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        {/* Create Form - Compact Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-40 z-40 flex items-center justify-center p-4 sm:p-6">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">New API Key</h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleCreateApiKey} className="p-4 space-y-4">
                <div>
                  <label htmlFor="key-name" className="block text-xs font-semibold text-slate-900 mb-1.5">
                    Key Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="key-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Production Key"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="key-description" className="block text-xs font-semibold text-slate-900 mb-1.5">
                    Description
                  </label>
                  <textarea
                    id="key-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Purpose..."
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm resize-none"
                  />
                </div>

                <div>
                  <label htmlFor="key-expiry" className="block text-xs font-semibold text-slate-900 mb-1.5">
                    Expires
                  </label>
                  <input
                    id="key-expiry"
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm flex items-center gap-1"
                  >
                    <HiPlus className="w-4 h-4" />
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* API Keys List */}
        <div className="space-y-2">
          {loading && (
            <div className="flex justify-center py-8">
              <div className="text-center">
                <div className="relative w-10 h-10 mx-auto mb-3">
                  <div className="absolute inset-0 rounded-full border-3 border-slate-200"></div>
                  <div className="absolute inset-0 rounded-full border-3 border-blue-600 border-t-transparent animate-spin"></div>
                </div>
                <p className="text-sm text-slate-600">Loading...</p>
              </div>
            </div>
          )}

          {!loading && apiKeys.length === 0 && (
            <div className="text-center py-8 bg-white rounded-lg border border-slate-200">
              <p className="text-3xl mb-2">🔑</p>
              <p className="text-sm font-semibold text-slate-900">No API Keys</p>
              <p className="text-xs text-slate-600 mt-1">Create one to get started</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-1 mt-3 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium"
              >
                <HiPlus className="w-4 h-4" />
                Create Key
              </button>
            </div>
          )}

          {!loading && apiKeys.length > 0 && (
            apiKeys.map((apiKey) => (
              <div
                key={apiKey.id}
                className="bg-white border border-slate-200 rounded-lg overflow-hidden transition-all hover:border-slate-300 hover:shadow-md"
              >
                {/* Compact Header - Always Visible */}
                <button
                  onClick={() => toggleExpandKey(apiKey.id)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        apiKey.is_active ? "bg-green-600" : "bg-slate-400"
                      }`}
                    ></span>
                    <div className="flex-1 min-w-0 text-left">
                      <h3 className="text-sm font-semibold text-slate-900 truncate">
                        {apiKey.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {apiKey.created_at ? new Date(apiKey.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                        {apiKey.expires_at && ` • Exp: ${new Date(apiKey.expires_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded flex-shrink-0 ${
                      apiKey.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {apiKey.is_active ? "Active" : "Revoked"}
                    </span>
                  </div>
                  <span className="text-slate-400 ml-2 flex-shrink-0">
                    {expandedKey[apiKey.id] ? "▼" : "▶"}
                  </span>
                </button>

                {/* Expandable Content */}
                {expandedKey[apiKey.id] && (
                  <div className="border-t border-slate-200 px-4 py-3 space-y-3 bg-slate-50">
                    {/* API Key Display */}
                    {apiKey.key && (
                      <div>
                        <p className="text-xs font-semibold text-slate-600 mb-2">API Key</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs break-all bg-white border border-slate-300 rounded px-2 py-1.5 font-mono text-slate-800 overflow-hidden">
                            {showKey[apiKey.id]
                              ? apiKey.key
                              : apiKey.key.substring(0, 8) + "••••••••" + apiKey.key.slice(-4)}
                          </code>
                          <button
                            onClick={() => toggleShowKey(apiKey.id)}
                            className="p-1.5 hover:bg-slate-200 rounded text-slate-600 flex-shrink-0"
                            title={showKey[apiKey.id] ? "Hide" : "Show"}
                          >
                            {showKey[apiKey.id] ? (
                              <HiEyeSlash className="w-4 h-4" />
                            ) : (
                              <HiEye className="w-4 h-4" />
                            )}
                          </button>
                          {apiKey.key && (
                            <button
                              onClick={() => apiKey.key && copyToClipboard(apiKey.key, apiKey.id)}
                              className={`px-2 py-1.5 rounded text-xs font-medium flex-shrink-0 transition-all ${
                                copiedKey === apiKey.id
                                  ? "bg-green-100 text-green-700"
                                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                              }`}
                            >
                              {copiedKey === apiKey.id ? "✓" : "Copy"}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    {apiKey.description && (
                      <div>
                        <p className="text-xs font-semibold text-slate-600 mb-1">Description</p>
                        <p className="text-xs text-slate-700">{apiKey.description}</p>
                      </div>
                    )}

                    {/* Last Used */}
                    {apiKey.last_used_at && (
                      <p className="text-xs text-slate-600">
                        <span className="font-semibold">Last Used:</span> {new Date(apiKey.last_used_at).toLocaleDateString()}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-slate-200 flex-wrap">
                      {apiKey.is_active && (
                        <>
                          <button
                            onClick={() => handleRotateApiKey(apiKey.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200"
                          >
                            <HiArrowPathRoundedSquare className="w-4 h-4" />
                            Rotate
                          </button>
                          <button
                            onClick={() => handleRevokeApiKey(apiKey.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200"
                          >
                            <HiEyeSlash className="w-4 h-4" />
                            Revoke
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDeleteApiKey(apiKey.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
                      >
                        <HiTrash className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Quick Tips - Collapsible */}
        {!loading && apiKeys.length > 0 && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs sm:text-sm text-blue-900">
            <p className="font-semibold">💡 Tips: Keep keys secret • Rotate regularly • Revoke when unused</p>
          </div>
        )}
      </div>
    </div>
  );
}
