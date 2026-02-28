import React from "react";
import { cn } from "../../lib/utils";
import { getBorderRadius } from "../../lib/theme";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "secondary" | "success" | "warning" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    const baseClasses = "inline-flex items-center font-medium transition-colors";
    
    const variantClasses = {
      default: "bg-[var(--color-muted)] text-[var(--color-on-surface)]",
      primary: "bg-[var(--color-primary)] text-[var(--color-primary-contrast)]",
      secondary: "bg-[var(--color-secondary)] text-[var(--color-secondary-contrast)]",
      success: "bg-[var(--color-success)] text-white",
      warning: "bg-[var(--color-secondary)] text-white",
      danger: "bg-[var(--color-error)] text-white",
      outline: "border border-[var(--color-muted)] text-[var(--color-on-surface)] bg-[var(--color-background)]",
    };

    const sizeClasses = {
      sm: "px-2 py-0.5 text-xs",
      md: "px-2.5 py-1 text-sm",
      lg: "px-3 py-1.5 text-base",
    };

    const borderRadiusStyle = {
      borderRadius: getBorderRadius('full')
    };

    return (
      <span
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        style={borderRadiusStyle}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";

// Status Badge Component for CRM
interface StatusBadgeProps {
  status: "active" | "inactive" | "pending" | "approved" | "rejected" | "processing";
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const statusConfig = {
    active: { label: "Active", variant: "success" as const },
    inactive: { label: "Inactive", variant: "default" as const },
    pending: { label: "Pending", variant: "warning" as const },
    approved: { label: "Approved", variant: "success" as const },
    rejected: { label: "Rejected", variant: "danger" as const },
    processing: { label: "Processing", variant: "primary" as const },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
};

export { Badge, StatusBadge };
export type { BadgeProps, StatusBadgeProps };