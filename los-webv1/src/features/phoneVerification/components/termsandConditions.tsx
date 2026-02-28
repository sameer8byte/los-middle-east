import Dialog from "../../../common/dialog";
import { useAppSelector } from "../../../redux/store";

export function TermsAndConditions({
  showTermsDialog,
  setShowTermsDialog,
  handleAcceptTerms,
  handleDeclineTerms,
}: {
  showTermsDialog: boolean;
  setShowTermsDialog: (value: boolean) => void;
  handleAcceptTerms: () => void;
  handleDeclineTerms: () => void;
}) {
  const brand = useAppSelector((state) => state.index);
  return (
    <div>
      <Dialog
        isOpen={showTermsDialog}
        onClose={() => setShowTermsDialog(false)}
        title="Accept Terms to Continue"
      >
        <div className="space-y-3">
          <div className="max-h-80 overflow-y-auto space-y-3 text-xs text-on-surface">
            <p>
              By accepting these terms, you agree to our Terms of Service and
              Privacy Policy. Please review the following important points:
            </p>

            <div className="space-y-2">
              <div>
                <h4 className="font-semibold text-primary text-sm">
                  Data Usage
                </h4>
                <p className="text-on-surface-muted">
                  We will use your phone number for verification and account
                  updates.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-primary text-sm">Privacy</h4>
                <p className="text-on-surface-muted">
                  Your personal information is handled in accordance with our
                  Privacy Policy and data protection laws.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-primary text-sm">
                  Communication
                </h4>
                <p className="text-on-surface-muted">
                  You consent to receive SMS messages for verification and
                  important notifications.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-primary text-sm">
                  Compliance
                </h4>
                <p className="text-on-surface-muted">
                  You agree to provide accurate information and comply with all
                  terms and conditions.
                </p>
              </div>
            </div>

            <p className="text-xs text-on-surface-muted pt-2">
              For complete details, review our{" "}
              <a
                href={brand.brandPolicyLinks.termsConditionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-semibold hover:underline"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href={brand.brandPolicyLinks.privacyPolicyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-semibold hover:underline"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>

          <div className="flex gap-2 pt-3 border-t border-outline">
            <button
              onClick={handleDeclineTerms}
              className="flex-1 px-3 py-2 border border-outline rounded-lg text-on-surface hover:bg-surface-variant transition-colors text-sm font-medium"
            >
              Decline
            </button>
            <button
              onClick={handleAcceptTerms}
              className="flex-1 px-3 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium"
            >
              Accept
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
