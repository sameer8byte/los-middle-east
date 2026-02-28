import { useState, useEffect } from "react";
import { generateAadhaarLink, getRecentDigiLockerUrls } from "../../../shared/services/api/customer.api";
import { FiCopy, FiExternalLink, FiRefreshCw, FiShield, FiClock } from "react-icons/fi";
import { useToast } from "../../../context/toastContext";

interface DigiLockerUrl {
  id: string;
  url: string | null;
  provider: string;
  createdAt: string;
  digiLockerId: string | null;
  expiresAt: string | null;
  isValid: boolean;
}

interface RecentUrlsResponse {
  success: boolean;
  urls: DigiLockerUrl[];
  hasValidUrls: boolean;
  error?: string;
}

interface GenerateAadhaarResponse {
  success: boolean;
  message: string;
  url?: string;
  id?: string;
  uniqueId?: string;
  expiresAt?: string;
  provider?: string;
}

interface GenerateAadhaarLinkProps {
  readonly userId: string;
  readonly brandId: string;
}

export function GenerateAadhaarLink({ userId, brandId }: GenerateAadhaarLinkProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [urls, setUrls] = useState<DigiLockerUrl[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  const loadUrls = async () => {
    try {
      setIsLoading(true);
      const response: RecentUrlsResponse = await getRecentDigiLockerUrls(userId, brandId);
      setUrls(response.success ? response.urls : []);
      setError(null);
    } catch (err) {
      console.error("Error loading URLs:", err);
      setError("Failed to load URLs");
      setUrls([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUrls();
  }, [userId, brandId]);

  const generateLink = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const response: GenerateAadhaarResponse = await generateAadhaarLink(userId, brandId);

      if (response.success && response.url) {
        showSuccess("Link Generated!", "Aadhaar verification link created successfully");
        await loadUrls(); // Refresh the list
      } else {
        const message = response.message || "Failed to generate link";
        setError(message);
        showError("Generation Failed", message);
      }
    } catch (err) {
      console.error("Error generating link:", err);
      const message = "An error occurred while generating the link";
      setError(message);
      showError("Error", message);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      showSuccess("Copied!", "Link copied to clipboard");
    } catch (err) {
      console.error("Failed to copy:", err);
      showError("Copy Failed", "Failed to copy link to clipboard");
    }
  };

  const openUrl = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const activeUrls = urls.filter(url => url.isValid);
  const expiredUrls = urls.filter(url => !url.isValid);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <FiRefreshCw className="animate-spin text-blue-500 w-5 h-5 mr-2" />
        <span className="text-gray-600">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Generate Button */}
      <div className="space-y-4">
        <button
          onClick={generateLink}
          disabled={isGenerating}
          className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? (
            <>
              <FiRefreshCw className="animate-spin w-4 h-4 mr-2" />
              Generating...
            </>
          ) : (
            <>
              <FiExternalLink className="w-4 h-4 mr-2" />
              Generate New Link
            </>
          )}
        </button>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">⚠️ {error}</p>
          </div>
        )}
      </div>

      {/* Active URLs */}
      {activeUrls.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Active Links</h4>
          <div className="space-y-3">
            {activeUrls.map((urlData) => (
              <div key={urlData.id} className="border border-green-200 bg-green-50 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      {urlData.provider} • {formatDate(urlData.createdAt)}
                    </p>
                    <p className="text-xs text-green-600">
                      Active {urlData.expiresAt && `• Expires: ${formatDate(urlData.expiresAt)}`}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Valid
                  </span>
                </div>
                
                {urlData.url && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white border rounded p-2">
                      <p className="text-sm font-mono text-gray-700 break-all">{urlData.url}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(urlData.url!)}
                      className="p-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                      title="Copy"
                    >
                      <FiCopy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openUrl(urlData.url!)}
                      className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      title="Open"
                    >
                      <FiExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expired URLs */}
      {expiredUrls.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-2">
            <FiClock className="w-4 h-4" />
            History ({expiredUrls.length} expired)
          </summary>
          <div className="mt-3 space-y-2">
            {expiredUrls.map((urlData) => (
              <div key={urlData.id} className="border border-gray-200 bg-gray-50 rounded p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      {urlData.provider} • {formatDate(urlData.createdAt)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Expired {urlData.expiresAt && `on ${formatDate(urlData.expiresAt)}`}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    Expired
                  </span>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* No URLs */}
      {urls.length === 0 && (
        <div className="text-center py-8">
          <FiExternalLink className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Links Found</h4>
          <p className="text-gray-600 mb-4">Generate your first verification link</p>
          <button
            onClick={generateLink}
            disabled={isGenerating}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isGenerating ? (
              <>
                <FiRefreshCw className="animate-spin w-4 h-4 mr-2" />
                Generating...
              </>
            ) : (
              <>
                <FiExternalLink className="w-4 h-4 mr-2" />
                Generate Link
              </>
            )}
          </button>
        </div>
      )}

      {/* Security Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-3">
          <FiShield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-900 font-medium">Secured by DigiLocker</p>
            <p className="text-xs text-blue-700 mt-1">
              Official Government of India platform. Data is processed securely.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
