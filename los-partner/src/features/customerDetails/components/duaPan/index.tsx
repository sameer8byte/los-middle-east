import { useState } from "react";
import { useParams } from "react-router-dom";
import Dialog from "../../../../common/dialog";
import { Button } from "../../../../common/ui/button";
import api from "../../../../shared/services/axios";
import { TbFileText, TbShieldCheck, TbAlertTriangle } from "react-icons/tb";

interface PanVerificationResult {
  success: boolean;
  dob: string | null;
  name: string | null;
  address: string | null;
  fathersName: string | null;
  message: string;
  provider: "DIGITAP" | "SCOREME";
  raw: any;
}

export function DuaPan() {
  const { brandId, customerId: userId } = useParams<{
    brandId: string;
    customerId: string;
  }>();

  const [pan, setPan] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<PanVerificationResult | null>(null);
  const [error, setError] = useState<string>("");

  // PAN validation regex
  const panRegex = /^[A-Z]{5}\d{4}[A-Z]$/;

  const verifyPanWithFallback = async () => {
    if (!panRegex.exec(pan)) {
      setError("Invalid PAN format. Expected format: ABCDE1234F");
      return;
    }

    if (!userId || !brandId) {
      setError("Missing required parameters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.post(
        `/partner/brand/${brandId}/pan-details-plus/with-fallback`,
        {
          pan: pan.toUpperCase(),
          userId: userId,
          shouldUpsert: false, // Set to false if you don't want to update user details
        }
      );

      setVerificationResult(response.data);
      setIsDialogOpen(true);
    } catch (err: any) {
      console.error("PAN verification error:", err);
      setError(
        err?.response?.data?.message || 
        err?.message || 
        "Failed to verify PAN. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setVerificationResult(null);
  };

  return (
    <section className="space-y-4">
      <div className="border rounded-lg p-4 bg-[var(--background)]">
        <div className="flex items-center gap-2 mb-3">
          <TbShieldCheck className="text-[var(--primary)] text-lg" />
          <h3 className="text-base font-semibold text-[var(--on-background)]">
           Dual PAN Verification
          </h3>
        </div>
        
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              id="pan"
              type="text"
              value={pan}
              onChange={(e) => {
                setPan(e.target.value.toUpperCase());
                setError("");
              }}
              placeholder="ABCDE1234F"
              maxLength={10}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary-focus)] focus:border-[var(--primary)] text-sm ${
                error ? 'border-[var(--error)]' : 'border-[var(--muted)] border-opacity-50'
              }`}
              disabled={loading}
            />
          </div>
          <Button
            onClick={verifyPanWithFallback}
            disabled={loading || !pan}
            variant={loading || !pan ? "outline" : "primary"}
            className="px-4 py-2 min-w-[100px]"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </Button>
        </div>
        
        {error && (
          <div className="flex items-start gap-2 mt-2 p-2 bg-[var(--error)] bg-opacity-10 border border-[var(--error)] border-opacity-30 rounded">
            <TbAlertTriangle className="text-[var(--on-error)] flex-shrink-0 mt-0.5 w-4 h-4" />
            <p className="text-sm text-[var(--on-error)]">{error}</p>
          </div>
        )}
      </div>

      {/* PAN Verification Results Dialog */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        title="PAN Verification Results"
      >
        {verificationResult && (
          <div className="space-y-4">
            {/* Success/Failure Status */}
            <div className={`p-4 rounded-lg border ${
              verificationResult.success 
                ? 'bg-[var(--success)] bg-opacity-10 border-[var(--success)] border-opacity-30' 
                : 'bg-[var(--error)] bg-opacity-10 border-[var(--error)] border-opacity-30'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {verificationResult.success ? (
                    <TbShieldCheck className="text-[var(--on-success)] w-5 h-5" />
                  ) : (
                    <TbAlertTriangle className="text-[var(--on-error)] w-5 h-5" />
                  )}
                  <span className={`font-semibold ${
                    verificationResult.success ? 'text-[var(--on-success)]' : 'text-[var(--on-error)]'
                  }`}>
                    {verificationResult.success ? 'Verification Successful' : 'Verification Failed'}
                  </span>
                </div>
                <span className="px-2 py-1 bg-[var(--surface)] rounded-full text-xs font-medium text-[var(--on-surface)]">
                  {verificationResult.provider}
                </span>
              </div>
              <p className={`mt-2 text-sm ${
                verificationResult.success ? 'text-[var(--on-success)]' : 'text-[var(--on-error)]'
              }`}>
                {verificationResult.message}
              </p>
            </div>

            {/* Personal Information */}
            {verificationResult.success && (
              <div className="bg-[var(--surface)] bg-opacity-30 rounded-lg p-4">
                <h4 className="font-medium text-[var(--on-background)] mb-3 flex items-center gap-2">
                  <TbFileText className="w-4 h-4 text-[var(--primary)]" />
                  Personal Details
                </h4>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: 'Name', value: verificationResult.name },
                    { label: 'Date of Birth', value: verificationResult.dob },
                    { label: "Father's Name", value: verificationResult.fathersName },
                    { label: 'Address', value: verificationResult.address }
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <dt className="text-xs font-medium text-[var(--on-surface)] opacity-70 mb-1">
                        {label}
                      </dt>
                      <dd className="text-sm text-[var(--on-background)] bg-[var(--background)] px-2 py-1 rounded border border-[var(--muted)] border-opacity-30">
                        {value || 'N/A'}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Raw Response (Collapsible) */}
            <details className="border border-[var(--muted)] border-opacity-30 rounded">
              <summary className="cursor-pointer p-3 text-sm font-medium text-[var(--on-surface)] hover:bg-[var(--surface)] hover:bg-opacity-20 rounded-t">
                View Raw Response
              </summary>
              <div className="border-t border-[var(--muted)] border-opacity-30 p-3">
                <pre className="text-xs bg-[var(--background)] p-3 rounded overflow-auto max-h-40 text-[var(--on-surface)] opacity-80">
                  {JSON.stringify(verificationResult.raw, null, 2)}
                </pre>
              </div>
            </details>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--muted)] border-opacity-30">
              <Button
                onClick={handleCloseDialog}
                variant="outline"
              >
                Close
              </Button>
              {verificationResult.success && (
                <Button
                  onClick={() => {
                    handleCloseDialog();
                  }}
                  variant="primary"
                >
                  Proceed
                </Button>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </section>
  );
}
