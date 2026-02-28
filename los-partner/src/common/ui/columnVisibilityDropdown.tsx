import { useState, useRef, useEffect } from "react";
import { Button } from "./button";
import { HiOutlineAdjustmentsHorizontal } from "react-icons/hi2";

interface Column {
  key: string;
  label: string | React.ReactNode;
}

interface ColumnVisibilityDropdownProps {
  columns: Column[];
  visibleColumns: string[];
  setVisibleColumns: (keys: string[]) => void;
  compulsoryColumns?: string[];
}

export const ColumnVisibilityDropdown = ({
  columns,
  visibleColumns,
  setVisibleColumns,
  compulsoryColumns = [],
}: ColumnVisibilityDropdownProps) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        onClick={() => setOpen(!open)}
        variant="surface"
        className="flex items-center gap-2 border rounded-xl shadow-sm hover:bg-gray-50 transition bg-white border-gray-300"
      >
        <HiOutlineAdjustmentsHorizontal className="w-4 h-4" />
        <span>View</span>
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-65 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2">
          {columns.map((col) => {
           
            const labelText = typeof col.label === "string" 
            ? col.label 
            : col.key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());

            const isCompulsory = compulsoryColumns.includes(labelText);
            return (
              <label
                key={col.key}
                className="flex items-center justify-between p-2 rounded cursor-pointer hover:bg-gray-100 transition"
              >
                <span className="text-gray-700 text-sm">{labelText}</span>
                <input
                  type="checkbox"
                  checked={visibleColumns.includes(col.key)}
                  disabled={isCompulsory}
                  onChange={(e) => {
                    if (isCompulsory) return;
                    setVisibleColumns(
                      e.target.checked
                        ? [...visibleColumns, col.key]
                        : visibleColumns.filter((k) => k !== col.key)
                    );
                  }}
                  className={`w-4 h-4 rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary accent-primary ${
                    isCompulsory
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                />
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};
