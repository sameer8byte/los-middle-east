import React from "react";
import { useParams } from "react-router-dom";
import { Spinner } from "../../common/ui/spinner";
import { Button } from "../../common/ui/button";
import Dialog from "../../common/dialog";
import { syncAgreementStatus } from "../../shared/services/api/agreament.api";

interface SyncResponse {
  message: string;
  processedLoanIds: string[];
  formattedLoanIds: string[]; // Optional field for formatted loan IDs
}

export function SyncEsignStatus() {
  const { brandId } = useParams<{ brandId: string }>();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [responsek, setResponsek] = React.useState<SyncResponse | null>(null);
  const [showErrorModal, setShowErrorModal] = React.useState(false);

  const handleSync = async () => {
    if (!brandId) {
      setError("Brand ID is missing in the URL");
      setShowErrorModal(true);
      return;
    }
    setIsOpen(true);
    setIsLoading(true);
    setError(null);
    setResponsek(null);
    setShowErrorModal(false);

    try {
      const response = await syncAgreementStatus(brandId);
      setResponsek(response);
    } catch (err) {
      console.error("Error syncing e-signature status:", err);
      setError((err as Error)?.message || "Unexpected error occurred");
      setShowErrorModal(true);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div >

      <Button
        onClick={handleSync}
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="flex items-center gap-2 ">
            <Spinner />
            <span>Syncing...</span>
          </div>
        ) : (
          "Sync E-Sign Status"
        )}
      </Button>


      {/* Results Dialog */}
      <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)}
        title="Sync E-Signature Status">
        <div className="p-0">
          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[var(--color-surface)] rounded-full mb-4">
                <Spinner />
              </div>
              <h3 className="text-lg font-medium text-[var(--color-on-background)] mb-2">
                Syncing in Progress
              </h3>
              <p className="text-[var(--color-on-surface)] opacity-70">
                Please wait while we update the e-signature statuses...
              </p>
            </div>
          )}

          {/* Success State */}
          {responsek && !isLoading && (
            <div>
              {/* Header */}
              <div className="border-b border-[var(--color-muted)] border-opacity-30 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[var(--color-success)] bg-opacity-10 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-[var(--color-on-success)]"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-[var(--color-on-background)]">
                      Sync Completed
                    </h3>
                    <p className="text-sm text-[var(--color-on-surface)] opacity-70">{responsek.message}</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6">
                {responsek.formattedLoanIds &&
                responsek.formattedLoanIds.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium text-[var(--color-on-background)]">
                        Processed Loan IDs
                      </h4>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-primary)] text-[var(--color-on-primary)]">
                        {responsek.formattedLoanIds.length} processed
                      </span>
                    </div>

                    <div className="bg-[var(--color-background)] rounded-md p-4 max-h-60 overflow-y-auto">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {responsek.formattedLoanIds.map((loanId) => (
                          <div
                            key={loanId}
                            className="bg-white border border-[var(--color-muted)] border-opacity-30 rounded px-3 py-2 text-sm font-mono text-[var(--color-on-background)]"
                          >
                            {loanId}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-[var(--color-surface)] rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg
                        className="w-6 h-6 text-[var(--color-on-surface)] opacity-50"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <p className="text-[var(--color-on-surface)] opacity-70">No loan IDs were processed</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-[var(--color-muted)] border-opacity-30 px-6 py-4">
                <Button
                  onClick={() => setIsOpen(false)}
                  className="w-full bg-[var(--color-surface)] hover:bg-[var(--color-muted)] bg-opacity-30 text-[var(--color-on-background)] py-2 rounded-md font-medium transition-colors"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </Dialog>

      {/* Error Modal */}
      <Dialog 
        isOpen={showErrorModal} 
        onClose={() => {
          setShowErrorModal(false);
          setError(null);
        }}
        title="Sync Failed"
      >
        <div className="p-4">
          {/* Error Icon and Message */}
          <div className="flex flex-col items-center justify-center py-6">
            <div className="w-12 h-12 bg-[var(--color-error)] bg-opacity-10 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-[var(--color-on-error)]"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-[var(--foreground)] mb-2">
              Synchronization Failed
            </h3>
            <p className="text-sm text-[var(--muted-foreground)] text-center max-w-md">
              {error || "An unexpected error occurred while syncing e-signature status."}
            </p>
          </div>

          {/* Error Details Card */}
          <div className="bg-[var(--color-error)] bg-opacity-5 border border-[var(--color-error)] border-opacity-20 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <svg 
                className="w-4 h-4 text-[var(--color-on-error)] mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-medium text-[var(--color-on-error)] mb-1">Error Details</h4>
                <p className="text-xs text-[var(--foreground)] font-mono break-words">
                  {error}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setShowErrorModal(false);
                setError(null);
              }}
              className="flex-1 bg-[var(--secondary-bg)] hover:bg-[var(--border)] text-[var(--foreground)]"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setShowErrorModal(false);
                setError(null);
                handleSync();
              }}
              className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:opacity-90 text-[var(--color-on-primary)]"
            >
              Try Again
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
