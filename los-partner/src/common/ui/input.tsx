import React from "react";
import { cn } from "../../lib/utils";
import { getBorderRadius } from "../../lib/theme";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: boolean | string;
  variant?: "default" | "filled";
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error = false,
      variant = "default",
      leftIcon,
      rightIcon,
      fullWidth = false,
      helperText,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`;
    const hasError = Boolean(error);
    const errorMessage = typeof error === 'string' ? error : '';

    const baseClasses = "block w-full text-sm text-[var(--foreground)] bg-[var(--background)] border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:bg-[var(--secondary-bg)] disabled:cursor-not-allowed";

    const variantClasses = {
      default: hasError 
        ? "border-[var(--destructive)] focus:border-[var(--destructive)] focus:ring-[var(--destructive)]" 
        : "border-[var(--border)] focus:border-[var(--primary)] focus:ring-[var(--primary)]",
      filled: hasError 
        ? "border-[var(--destructive)] bg-[var(--secondary-bg)] focus:border-[var(--destructive)] focus:ring-[var(--destructive)] focus:bg-[var(--background)]" 
        : "border-[var(--border)] bg-[var(--secondary-bg)] focus:border-[var(--primary)] focus:ring-[var(--primary)] focus:bg-[var(--background)]",
    };

    const paddingClasses = leftIcon && rightIcon 
      ? "px-10 py-2.5" 
      : leftIcon 
        ? "pl-10 pr-3 py-2.5" 
        : rightIcon 
          ? "pl-3 pr-10 py-2.5" 
          : "px-3 py-2.5";

    const borderRadiusStyle = {
      borderRadius: getBorderRadius('md')
    };

    return (
      <div className={cn("space-y-1.5", fullWidth && "w-full")}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[var(--foreground)]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-[var(--muted-foreground)]">{leftIcon}</span>
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              baseClasses,
              variantClasses[variant],
              paddingClasses,
              className
            )}
            style={borderRadiusStyle}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <span className="text-[var(--muted-foreground)]">{rightIcon}</span>
            </div>
          )}
        </div>
        {(errorMessage || helperText) && (
          <p className={cn(
            "text-xs flex items-center gap-1",
            hasError ? "text-[var(--destructive)]" : "text-[var(--muted-foreground)]"
          )}>
            {hasError && (
              <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            {errorMessage || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

// Textarea Component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: boolean | string;
  variant?: "default" | "filled";
  fullWidth?: boolean;
  helperText?: string;
  required?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      error = false,
      variant = "default",
      fullWidth = false,
      helperText,
      required = false,
      id,
      ...props
    },
    ref
  ) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substring(2, 9)}`;
    const hasError = Boolean(error);
    const errorMessage = typeof error === 'string' ? error : '';

    const baseClasses = "block w-full text-sm text-[var(--foreground)] bg-[var(--background)] border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:bg-[var(--secondary-bg)] disabled:cursor-not-allowed resize-none";

    const variantClasses = hasError 
      ? "border-[var(--destructive)] focus:border-[var(--destructive)] focus:ring-[var(--destructive)]" 
      : "border-[var(--border)] focus:border-[var(--primary)] focus:ring-[var(--primary)]";

    const borderRadiusStyle = {
      borderRadius: getBorderRadius('md')
    };

    return (
      <div className={cn("space-y-1.5", fullWidth && "w-full")}>
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-[var(--foreground)]"
          >
            {label}
            {required && <span className="text-[var(--destructive)] ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            baseClasses,
            variantClasses,
            "px-3 py-2.5 min-h-[80px]",
            className
          )}
          style={borderRadiusStyle}
          {...props}
        />
        {(errorMessage || helperText) && (
          <p className={cn(
            "text-xs flex items-center gap-1",
            hasError ? "text-[var(--destructive)]" : "text-[var(--muted-foreground)]"
          )}>
            {hasError && (
              <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            {errorMessage || helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

// Select Component
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: boolean | string;
  variant?: "default" | "filled";
  fullWidth?: boolean;
  helperText?: string;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
  required?: boolean;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error = false,
      variant = "default",
      fullWidth = false,
      helperText,
      options,
      placeholder,
      required = false,
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || `select-${Math.random().toString(36).substring(2, 9)}`;
    const hasError = Boolean(error);
    const errorMessage = typeof error === 'string' ? error : '';

    const baseClasses = "block w-full text-sm text-[var(--foreground)] bg-[var(--background)] border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:bg-[var(--secondary-bg)] disabled:cursor-not-allowed";

    const variantClasses = hasError 
      ? "border-[var(--destructive)] focus:border-[var(--destructive)] focus:ring-[var(--destructive)]" 
      : "border-[var(--border)] focus:border-[var(--primary)] focus:ring-[var(--primary)]";

    const borderRadiusStyle = {
      borderRadius: getBorderRadius('md')
    };

    return (
      <div className={cn("space-y-1.5", fullWidth && "w-full")}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-[var(--foreground)]"
          >
            {label}
            {required && <span className="text-[var(--destructive)] ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            baseClasses,
            variantClasses,
            "px-3 py-2.5 pr-10",
            className
          )}
          style={borderRadiusStyle}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        {(errorMessage || helperText) && (
          <p className={cn(
            "text-xs flex items-center gap-1",
            hasError ? "text-[var(--destructive)]" : "text-[var(--muted-foreground)]"
          )}>
            {hasError && (
              <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            {errorMessage || helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export { Input, Textarea, Select };
export type { InputProps, TextareaProps, SelectProps };