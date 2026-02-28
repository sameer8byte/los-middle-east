import { Button } from "../../../common/ui/button";
import Dialog from "../../../common/dialog";

interface AgreementSignedDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  signedData: string;
}

export const AgreementSignedDetailsDialog: React.FC<
  AgreementSignedDetailsDialogProps
> = ({ isOpen, onClose, signedData }) => {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Agreement Signed Details">
      <div className="overflow-y-auto max-h-[60vh]">
        <div className="space-y-4">
          <div className="bg-[var(--color-surface)] rounded-lg p-4">
            <p className="text-sm text-[var(--color-on-background)] leading-relaxed whitespace-pre-wrap break-words">
              {signedData}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </Dialog>
  );
};
