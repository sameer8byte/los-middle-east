import { FiMessageSquare } from "react-icons/fi";
import { Button } from "./button";

interface AddRemarksButtonProps {
  loanId: string;
  onOpenModal: (loanId: string) => void;
  variant?: "outline" | "ghost" | "surface" | "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
}

export const AddRemarksButton: React.FC<AddRemarksButtonProps> = ({
  loanId,
  onOpenModal,
  variant = "outline",
  size = "sm",
  className = "flex items-center gap-1",
  disabled = false,
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onOpenModal(loanId);
  };

  return (
    <Button
      onClick={handleClick}
      variant={variant}
      size={size}
      className={className}
      disabled={disabled}
    >
      <FiMessageSquare className="h-3 w-3" />
      Add Remarks
    </Button>
  );
};
