import { useState } from "react";
import { BiCopy, BiCheck, BiError, BiLoader } from "react-icons/bi";
import { generateSecureCode } from "../../../shared/services/api/partner-user.api";

interface GenerateSecureCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userEmail: string;
  brandId: string;
}

export function GenerateSecureCodeModal({
  isOpen,
  onClose,
  userId,
  userName,
  userEmail,
  brandId,
}: GenerateSecureCodeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerateCode = async () => {
    setIsLoading(true);
    setError(null);
    setCopied(false);

    try {
      const response = await generateSecureCode(brandId, userId);
      setGeneratedCode(response.code);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate secure code. Please try again."
      );
      console.error("Error generating secure code:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setGeneratedCode(null);
    setError(null);
    setCopied(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-on-background)]">
            Generate Secure Code
          </h2>
          <button
            onClick={handleClose}
            className="text-[var(--color-on-surface)] opacity-60 hover:opacity-100 transition-opacity"
          >
            ✕
          </button>
        </div>

        {/* User Info */}
        <div className="bg-[var(--color-muted)] bg-opacity-10 rounded-lg p-3 mb-4">
          <div className="text-sm mb-2">
            <span className="font-medium text-[var(--color-on-background)]">
              User:
            </span>
            <span className="text-[var(--color-on-surface)] ml-2">{userName}</span>
          </div>
          <div className="text-sm">
            <span className="font-medium text-[var(--color-on-background)]">
              Email:
            </span>
            <span className="text-[var(--color-on-surface)] ml-2">{userEmail}</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
            <BiError className="text-red-600 mt-0.5 flex-shrink-0" size={18} />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* Code Display */}
        {generatedCode && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="text-sm font-medium text-green-900 mb-2">
              ✓ Code Generated Successfully
            </div>
            <div className="bg-white border border-green-300 rounded p-3 flex items-center justify-between mb-3">
              <code className="text-sm font-mono text-[var(--color-on-background)] break-all">
                {generatedCode}
              </code>
              <button
                onClick={handleCopyCode}
                className="ml-2 p-1 hover:bg-[var(--color-muted)] rounded transition-colors flex-shrink-0"
                title="Copy code"
              >
                {copied ? (
                  <BiCheck size={18} className="text-green-600" />
                ) : (
                  <BiCopy size={18} className="text-[var(--color-primary)]" />
                )}
              </button>
            </div>
            <div className="text-xs text-green-700">
              📧 Code has been sent to {userEmail}
            </div>
          </div>
        )}

        {/* Content - Before Generation */}
        {!generatedCode && !error && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <div className="text-sm text-amber-800">
              <strong>⚠️ Important:</strong> Generating a secure code will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Create a unique encrypted code for this user</li>
                <li>Send the code to their email ({userEmail})</li>
                <li>Enable secure authentication</li>
              </ul>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-[var(--color-muted)] text-[var(--color-on-background)] rounded-lg hover:bg-[var(--color-muted)] hover:bg-opacity-10 disabled:opacity-50 transition-colors"
          >
            {generatedCode ? "Done" : "Cancel"}
          </button>
          {!generatedCode && (
            <button
              onClick={handleGenerateCode}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <BiLoader size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Code"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
