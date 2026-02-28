import { Button } from "../ui/button";
 import {
  BrandProviderName,
  BrandProviderType,
 } from "../../constant/enum";
import { useAppSelector } from "../../shared/redux/store";
import { selectProvidersByType } from "../../shared/redux/slices/brand.slice";
import Dialog from ".";
 interface ResendConfirmationDialogProps {
  readonly isOpen: boolean;
  readonly customerName: string;
  readonly selectedProvider?: BrandProviderName | null;
  readonly onProviderChange?: (provider: BrandProviderName) => void;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly loading?: boolean;
}

export function ResendConfirmationDialog({
  isOpen,
  customerName,
  selectedProvider = null,
  onProviderChange,
  onConfirm,
  onCancel,
  loading = false,
}: ResendConfirmationDialogProps) {
  const apiProviders = useAppSelector((state) =>
    selectProvidersByType(state, BrandProviderType.LOAN_AGREEMENT)
  );
  const signdeskProvider = apiProviders.find(
    (p) => p.provider === BrandProviderName.SIGNDESK
  );
  const signzyProvider = apiProviders.find(
    (p) => p.provider === BrandProviderName.SIGNZY
  );
  const digitapProvider = apiProviders.find(
    (p) => p.provider === BrandProviderName.DIGITAP
  );  

  return (
    <Dialog
      isOpen={isOpen}
      title="Resend Agreement Confirmation"
      onClose={onCancel}
    >
      <div className="flex items-center mb-4">
        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-[var(--color-secondary)] bg-opacity-10">
          <svg
            className="h-6 w-6 text-[var(--color-warning)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
      </div>
      <div className="text-center">
        <h3 className="text-lg font-medium text-[var(--color-on-background)] mb-2">
          Resend Agreement Confirmation
        </h3>
        <p className="text-sm text-[var(--color-on-surface)] opacity-70 mb-4">
          Are you sure you want to resend the loan agreement for{" "}
          <span className="font-semibold">{customerName}</span>?
        </p>
        <div className="bg-[var(--color-secondary)] bg-opacity-10 border border-[var(--color-warning)] border-opacity-30 rounded-md p-3 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-[var(--color-warning)]">
                <strong>Warning:</strong> This will reset the current agreement
                status and send a new agreement. The customer will receive a new
                e-signature request.
              </p>
            </div>
          </div>
        </div>

        {/* Provider Selection */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-[var(--color-on-background)] mb-3">
            Select Signing Provider
          </h4>
          <div className="space-y-2">
            {signdeskProvider && (
              <label
                htmlFor="signdesk-provider"
                aria-label="Select SignDesk as contract signing provider"
                className="flex items-center gap-3 p-3 rounded-lg border border-[var(--color-muted)] border-opacity-50 cursor-pointer hover:bg-[var(--color-surface)] hover:bg-opacity-50 transition-colors"
              >
                <input
                  id="signdesk-provider"
                  type="radio"
                  name="provider"
                  value={BrandProviderName.SIGNDESK}
                  checked={
                    selectedProvider === BrandProviderName.SIGNDESK
                  }
                  onChange={(e) =>
                    onProviderChange?.(
                      e.target.value as BrandProviderName
                    )
                  }
                  className="text-[#EA5E18] focus:ring-[#EA5E18] focus:ring-2"
                />
                <div>
                  <div className="text-[var(--color-on-background)] font-medium">
                    SignDesk
                  </div>
                  <div className="text-[var(--color-on-surface)] opacity-70 text-sm">
                    Traditional e-signature platform
                  </div>
                </div>
              </label>
            )}
            {signzyProvider && (
              <label
                htmlFor="signzy-provider"
                aria-label="Select Signzy as contract signing provider"
                className="flex items-center gap-3 p-3 rounded-lg border border-[var(--color-muted)] border-opacity-50 cursor-pointer hover:bg-[var(--color-surface)] hover:bg-opacity-50 transition-colors"
              >
                <input
                  id="signzy-provider"
                  type="radio"
                  name="provider"
                  value={BrandProviderName.SIGNZY}
                  checked={selectedProvider === BrandProviderName.SIGNZY}
                  onChange={(e) =>
                    onProviderChange?.(
                      e.target.value as BrandProviderName
                    )
                  }
                  className="text-[#EA5E18] focus:ring-[#EA5E18] focus:ring-2"
                />
                <div>
                  <div className="text-[var(--color-on-background)] font-medium">
                    Signzy
                  </div>
                  <div className="text-[var(--color-on-surface)] opacity-70 text-sm">
                    Modern digital verification
                  </div>
                </div>
              </label>
            )}
            {
              digitapProvider && (
              <label
                htmlFor="digitap-provider"
                aria-label="Select Digitap as contract signing provider"
                className="flex items-center gap-3 p-3 rounded-lg border border-[var(--color-muted)] border-opacity-50 cursor-pointer hover:bg-[var(--color-surface)] hover:bg-opacity-50 transition-colors"      
              >
                <input
                  id="digitap-provider"
                  type="radio"
                  name="provider"   
                  value={BrandProviderName.DIGITAP} 
                  checked={selectedProvider === BrandProviderName.DIGITAP}
                  onChange={(e) =>
                    onProviderChange?.(   
                      e.target.value as BrandProviderName
                    )
                  }
                  className="text-[#EA5E18] focus:ring-[#EA5E18] focus:ring-2"
                />    
                <div>
                  <div className="text-[var(--color-on-background)] font-medium">
                    Digitap
                  </div>
                  <div className="text-[var(--color-on-surface)] opacity-70 text-sm">
                    Advanced e-signature solution
                  </div>
                </div>
              </label>
            )   
            }
          </div>
        </div>
      </div>
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          loading={loading}
          disabled={loading}
          variant="danger"
          // className="bg-red-600 hover:bg-red-700 text-white"
        >
          Yes, Resend via {selectedProvider}
        </Button>
      </div>
    </Dialog>
  );
}
