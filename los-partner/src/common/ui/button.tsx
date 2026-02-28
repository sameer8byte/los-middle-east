import React from "react";
import { cn } from "../../lib/utils";
import { getBorderRadius } from "../../lib/theme";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "ghost"
    | "outline"
    | "danger"
    | "surface";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      "inline-flex cursor-pointer items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
    const variantClasses = {
      primary:
        "bg-[var(--primary)] text-[var(--primary-contrast)] shadow-sm hover:bg-[var(--primary-hover)] focus:ring-[var(--primary-focus)]",
      secondary:
        "bg-[var(--secondary)] text-[var(--secondary-contrast)] hover:bg-[var(--secondary-hover)] focus:ring-[var(--secondary-focus)]",
      ghost:
        "bg-transparent text-[var(--on-surface)] hover:bg-[var(--secondary-light)] focus:ring-[var(--secondary-focus)]",
      outline:
        "border border-[var(--muted)] text-[var(--on-surface)] hover:bg-[var(--surface)] focus:ring-[var(--secondary-focus)]",
      danger:
        "bg-[var(--error)] text-white hover:bg-[var(--error)] focus:ring-[var(--error)] shadow-sm",
      surface:
        "bg-[var(--surface)] text-[var(--on-surface)] hover:bg-[var(--surface)] focus:ring-[var(--secondary-focus)]",
    };

    const sizeClasses = {
      sm: `px-3 py-1.5 text-sm gap-1.5`,
      md: `px-4 py-2 text-sm gap-2`,
      lg: `px-6 py-3 text-base gap-2`,
    };

    // Dynamic border radius based on theme
    const borderRadiusStyle = {
      borderRadius: getBorderRadius(size === "lg" ? "lg" : "md"),
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && "w-full",
          className
        )}
        style={borderRadiusStyle}
        {...props}
      >
        {loading ? (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          leftIcon && <span className="flex-shrink-0">{leftIcon}</span>
        )}
        {children}
        {rightIcon && !loading && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps };
