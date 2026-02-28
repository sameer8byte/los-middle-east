import React, { useState, useRef, useEffect } from "react";
import { cn } from "../../lib/utils";
import { HiOutlineChevronDown, HiOutlineEllipsisVertical } from "react-icons/hi2";

interface DropdownItem {
  label: string;
  value: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onClick?: () => void;
}

interface DropdownProps {
  items: DropdownItem[];
  trigger?: React.ReactNode;
  placeholder?: string;
  className?: string;
  align?: "left" | "right";
  size?: "sm" | "md" | "lg";
}

const Dropdown: React.FC<DropdownProps> = ({
  items,
  trigger,
  placeholder = "Select option",
  className,
  align = "left",
  size = "md",
}) => {
  console.log("Dropdown items:", trigger, size);

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // const sizeClasses = {
  //   sm: "text-sm",
  //   md: "text-sm",
  //   lg: "text-base",
  // };

  const alignClasses = {
    left: "left-0",
    right: "right-0",
  };

  const handleItemClick = (item: DropdownItem) => {
    if (!item.disabled) {
      item.onClick?.();
      setIsOpen(false);
    }
  };

  return (
    <div className={cn("relative inline-block", className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "inline-flex items-center justify-between w-full px-4 py-2 text-left bg-white border border-[var(--border)] rounded-md hover:bg-[var(--secondary-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-colors"
        )}
      >
        <span className="text-[var(--foreground)]">{placeholder}</span>
        <HiOutlineChevronDown className="h-4 w-4 text-[var(--muted-foreground)]" />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute z-50 w-full mt-1 bg-white border border-[var(--border)] rounded-md shadow-lg",
            alignClasses[align]
          )}
        >
          <div className="py-1 max-h-60 overflow-auto">
            {items.map((item) => (
              <button
                key={item.value}
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
                className={cn(
                  "flex items-center w-full px-4 py-2 text-sm text-left hover:bg-[var(--secondary-bg)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
                  item.danger ? "text-[var(--color-on-error)] hover:bg-[var(--color-error)] bg-opacity-10" : "text-[var(--foreground)]"
                )}
              >
                {item.icon && (
                  <span className="mr-3 flex-shrink-0">{item.icon}</span>
                )}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Action Menu Component (3-dot menu)
interface ActionMenuProps {
  items: DropdownItem[];
  className?: string;
  align?: "left" | "right";
}

const ActionMenu: React.FC<ActionMenuProps> = ({
  items,
  className,
  align = "right",
}) => {
  return (
    <Dropdown
      items={items}
      align={align}
      className={className}
      trigger={
        <div className="p-2 hover:bg-[var(--secondary-bg)] rounded-md transition-colors">
          <HiOutlineEllipsisVertical className="h-5 w-5 text-[var(--muted-foreground)]" />
        </div>
      }
    />
  );
};

export { Dropdown, ActionMenu };
export type { DropdownProps, DropdownItem, ActionMenuProps };