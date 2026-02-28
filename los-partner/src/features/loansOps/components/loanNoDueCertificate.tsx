import { useParams } from "react-router-dom";
import Dialog from "../../../common/dialog";
import { useQueryParams } from "../../../hooks/useQueryParams";
import { Button } from "../../../common/ui/button";
 
import { useState, useCallback, useMemo } from "react";
import {
  FaCheckCircle,
  FaEnvelope,
  FaFileAlt,
  FaExclamationTriangle,
  FaCopy,
  FaDownload,
  FaEye,
  FaClock,
} from "react-icons/fa";
import { generateLoanNoDueCertificate, sendNoDueCertificateEmail } from "../../../shared/services/api/loan.api";

interface NoDueCertificate {
  id: string;
  loanId: string;
  issuedDate: string;
  issuedBy: string;
  recipientEmail: string;
  remarks: string;
  certificateFileUrl: string;
  createdAt: string;
  updatedAt: string;
  sentAt: string;
}

export function LoanNoDueCertificate({
  refresh,
  setRefresh,
}: {
  refresh: boolean;
  setRefresh: (value: boolean) => void;
}) {
  const { brandId } = useParams();
  const { getQuery, removeQuery } = useQueryParams();

  const [noDueCertificate, setNoDueCertificate] = useState<NoDueCertificate | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const noDueCertificateLoanId = getQuery("noDueCertificateLoanId");

  // Memoized formatted dates
  const formattedDates = useMemo(() => {
    if (!noDueCertificate) return {};
    
    return {
      issuedDate: new Date(noDueCertificate.issuedDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      sentDate: noDueCertificate.sentAt 
        ? new Date(noDueCertificate.sentAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : null
    };
  }, [noDueCertificate]);

  const handleNoDueCertificate = useCallback(async (loanId: string) => {
    try {
      setIsGenerating(true);
      setError(null);
      setEmailSuccess(false);

      if (!loanId || !brandId) {
        setError("Required information is missing. Please try again.");
        return;
      }

      const response = await generateLoanNoDueCertificate(brandId, loanId);
      if (response) {
        setNoDueCertificate(response);
      } else {
        setError("Failed to generate No Due Certificate for this loan.");
      }
    } catch (error) {
      setError(
        (error as Error).message ||
          "Error generating No Due Certificate. Please try again."
      );
    } finally {
      setIsGenerating(false);
    }
  }, [brandId]);

  const sendNoDueCertificate = useCallback(async (loanId: string) => {
    try {
      setIsSending(true);
      setError(null);
      setEmailSuccess(false);

      if (!loanId || !brandId) {
        setError("Required information is missing. Please try again.");
        return;
      }

      await sendNoDueCertificateEmail(brandId, loanId);
      setEmailSuccess(true);
      setRefresh(!refresh);

      // Update the certificate state to reflect it's been sent
      if (noDueCertificate) {
        setNoDueCertificate({
          ...noDueCertificate,
          sentAt: new Date().toISOString()
        });
      }

      setTimeout(() => setEmailSuccess(false), 4000);
    } catch (error) {
      setError(
        (error as Error).message ||
          "Error sending No Due Certificate. Please try again."
      );
    } finally {
      setIsSending(false);
    }
  }, [brandId, refresh, setRefresh, noDueCertificate]);

  const copyToClipboard = useCallback(async () => {
    if (noDueCertificate?.certificateFileUrl) {
      try {
        await navigator.clipboard.writeText(noDueCertificate.certificateFileUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  }, [noDueCertificate?.certificateFileUrl]);

  const downloadCertificate = useCallback(() => {
    if (noDueCertificate?.certificateFileUrl) {
      const link = document.createElement('a');
      link.href = noDueCertificate.certificateFileUrl;
      link.download = `no-due-certificate-${noDueCertificate.loanId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [noDueCertificate]);

  const handleClose = useCallback(() => {
    setNoDueCertificate(null);
    setError(null);
    setEmailSuccess(false);
    setIsPreviewExpanded(false);
    removeQuery("noDueCertificateLoanId");
  }, [removeQuery]);

  return (
    <Dialog
      title="Send Certificate"
      isOpen={!!noDueCertificateLoanId}
      onClose={handleClose}
      size={isPreviewExpanded ? "xl" : "lg"}
    >
      <div className="min-h-[400px] bg-white">
        {/* Success Notification */}
        {emailSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-[var(--color-success)] bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FaCheckCircle className="text-[var(--color-on-success)] h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-on-background)] mb-1">Sent Successfully</h3>
                <p className="text-sm text-[var(--color-on-surface)] opacity-70">Certificate delivered to recipient</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-[var(--color-error)] bg-opacity-10 border border border-[var(--color-error)] border-opacity-30 rounded-md">
            <div className="flex items-start">
              <FaExclamationTriangle className="text-red-500 h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <p className="text-sm text-[var(--color-on-error)]">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Initial State */}
        {!noDueCertificate && !isGenerating && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-[var(--color-background)] rounded-lg flex items-center justify-center mx-auto mb-4">
              <FaFileAlt className="text-[var(--color-on-surface)] opacity-50 h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--color-on-background)] mb-2">
               Certificate
            </h3>
            <p className="text-[var(--color-on-surface)] opacity-70 text-sm max-w-md mx-auto mb-6">
              Create an official certificate confirming all outstanding dues have been cleared.
            </p>
            <div className="p-3 bg-[var(--color-background)] rounded-md border border-[var(--color-muted)] border-opacity-30">
              <p className="text-xs text-[var(--color-on-surface)] opacity-80">
                Certificate will be sent to the registered email address 
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[var(--color-muted)] border-opacity-30 border-t-[#EA5E18] rounded-full animate-spin mb-4"></div>
            <h4 className="font-medium text-[var(--color-on-background)] mb-1">Generating Certificate</h4>
            <p className="text-sm text-[var(--color-on-surface)] opacity-70">Please wait...</p>
          </div>
        )}

        {/* Certificate Generated */}
        {noDueCertificate && (
          <div>
            {/* Status Header */}
            <div className="bg-[var(--color-background)] border border-[var(--color-muted)] border-opacity-30 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[var(--color-success)] bg-opacity-10 rounded-full flex items-center justify-center">
                    <FaCheckCircle className="text-[var(--color-on-success)] h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-medium text-[var(--color-on-background)]">Certificate Ready</h3>
                    <p className="text-sm text-[var(--color-on-surface)] opacity-70">
                      {noDueCertificate.sentAt ? "Sent successfully" : "Ready to send"}
                    </p>
                  </div>
                </div>
                {noDueCertificate.sentAt && (
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-[var(--color-on-surface)] opacity-70 text-sm">
                      <FaClock className="h-3 w-3" />
                      <span>Sent</span>
                    </div>
                    <p className="text-xs text-[var(--color-on-surface)] opacity-70">{formattedDates.sentDate}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Certificate Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-3">
                <div className="border border-[var(--color-muted)] border-opacity-30 rounded-lg p-3">
                  <label className="text-xs font-medium text-[var(--color-on-surface)] opacity-70 uppercase tracking-wide block mb-1">
                    Issued Date
                  </label>
                  <p className="text-sm text-[var(--color-on-background)] font-medium">{formattedDates.issuedDate}</p>
                </div>
                
                <div className="border border-[var(--color-muted)] border-opacity-30 rounded-lg p-3">
                  <label className="text-xs font-medium text-[var(--color-on-surface)] opacity-70 uppercase tracking-wide block mb-1">
                    Issued By
                  </label>
                  <p className="text-sm text-[var(--color-on-background)] font-medium">{noDueCertificate.issuedBy}</p>
                </div>
                
                <div className="border border-[var(--color-muted)] border-opacity-30 rounded-lg p-3">
                  <label className="text-xs font-medium text-[var(--color-on-surface)] opacity-70 uppercase tracking-wide block mb-1">
                    Recipient Email
                  </label>
                  <p className="text-sm text-[var(--color-on-background)] font-medium break-all">
                    {noDueCertificate.recipientEmail || "N/A"}
                  </p>
                </div>

                {noDueCertificate.remarks && (
                  <div className="border border-[var(--color-muted)] border-opacity-30 rounded-lg p-3">
                    <label className="text-xs font-medium text-[var(--color-on-surface)] opacity-70 uppercase tracking-wide block mb-1">
                      Remarks
                    </label>
                    <p className="text-sm text-[var(--color-on-background)]">{noDueCertificate.remarks}</p>
                  </div>
                )}
              </div>

              {/* Preview Section */}
              <div className="border border-[var(--color-muted)] border-opacity-30 rounded-lg overflow-hidden">
                <div className="bg-[var(--color-background)] px-3 py-2 border-b border-[var(--color-muted)] border-opacity-30 flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--color-on-surface)] opacity-80">Preview</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
                      title={isPreviewExpanded ? "Collapse" : "Expand"}
                      leftIcon={<FaEye className="h-3 w-3" />}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={downloadCertificate}
                      title="Download"
                      leftIcon={<FaDownload className="h-3 w-3" />}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyToClipboard}
                      title="Copy URL"
                      leftIcon={<FaCopy className="h-3 w-3" />}
                    />
                  </div>
                </div>
                <div className={`${isPreviewExpanded ? 'h-96' : 'h-48'} transition-all duration-200`}>
                  <iframe
                    src={noDueCertificate.certificateFileUrl}
                    className="w-full h-full border-0"
                    title="Certificate Preview"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>

            {/* Copy Success Feedback */}
            {copied && (
              <div className="fixed top-4 right-4 bg-[var(--color-on-background)] text-white px-3 py-2 rounded-md shadow-lg text-sm">
                URL copied to clipboard
              </div>
            )}

            {/* Send Action */}
            {!noDueCertificate.sentAt && (
              <div className="mb-4">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={isSending}
                  onClick={() => sendNoDueCertificate(noDueCertificate.loanId)}
                  leftIcon={<FaEnvelope className="h-4 w-4" />}
                >
                  {isSending ? "Sending..." : "Send via Email"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Generate Button */}
        {!noDueCertificate && noDueCertificateLoanId && !isGenerating && (
          <div className="pt-4 border-t border-[var(--color-muted)] border-opacity-30">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={isGenerating || isSending}
              onClick={() => handleNoDueCertificate(noDueCertificateLoanId)}
              leftIcon={<FaFileAlt className="h-4 w-4" />}
            >
              Generate Certificate
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
