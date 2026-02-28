import React, { useRef, useEffect } from "react";
import { HiOutlineUser, HiOutlineXCircle } from "react-icons/hi2";

interface TableColumn {
  key: string;
  label: string | React.ReactNode;
  render?: (value: any, row: any) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

interface TableProps {
  columns: TableColumn[];
  data: any[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: any) => void;
  className?: string;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  showPageSizeOptions?: boolean;
  storageKey?: string;
  centerContent?: React.ReactNode;
}

const TableSkeleton = ({}: { columns: TableColumn[] }) => (
  <div className="space-y-4">
    {Array.from({ length: 5 }, (_, idx) => (
      <div
        key={idx}
        className="animate-pulse flex items-center justify-between p-4 bg-[var(--color-background)] rounded-lg"
      >
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-[var(--color-muted)] bg-opacity-30 rounded w-1/4" />
          <div className="h-3 bg-[var(--color-muted)] bg-opacity-30 rounded w-1/3" />
        </div>
        <div className="h-8 bg-[var(--color-muted)] bg-opacity-30 rounded w-24" />
      </div>
    ))}
  </div>
);

// Empty state component - Credit Executive style
const EmptyState = ({ message = "No data found" }: { message?: string }) => (
  <div className="text-center py-12">
    <div className="text-[var(--color-on-surface)] opacity-50 mb-4">
      {message}
    </div>
    <HiOutlineUser className="h-12 w-12 text-[var(--color-muted)] mx-auto" />
  </div>
);
export const Table: React.FC<TableProps> = ({
  columns,
  data,
  loading = false,
  emptyMessage = "No data found",
  onRowClick,
  className = "",
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const el = scrollRef.current;
      if (!el) return;
      const atTop = el.scrollTop === 0 && e.deltaY < 0;
      const atBottom =
        el.scrollTop + el.clientHeight >= el.scrollHeight - 1 && e.deltaY > 0;
      if (atTop || atBottom) {
        e.preventDefault();
      }
    };
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("wheel", handleWheel, { passive: false });
    }
    return () => {
      if (el) {
        el.removeEventListener("wheel", handleWheel);
      }
    };
  }, []);
  const columnRefs = useRef<(HTMLTableCellElement | null)[]>([]);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);
  const currentIndex = useRef<number>(-1);

  const handleMouseDown = (e: React.MouseEvent, index: number) => {
    startX.current = e.clientX;
    currentIndex.current = index;
    const col = columnRefs.current[index];
    if (!col) return;
    startWidth.current = col.offsetWidth;

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    const col = columnRefs.current[currentIndex.current];
    if (!col) return;
    const delta = e.clientX - startX.current;
    const newWidth = startWidth.current + delta;
    if (newWidth > 50) {
      col.style.width = `${newWidth}px`;
    }
  };

  const handleMouseUp = () => {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };
  if (loading) {
    return (
      <div className={`bg-[var(--color-surface)] ${className}`}>
        <div className="p-6">
          <TableSkeleton columns={columns} />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`bg-[var(--color-surface)]  ${className}`}>
        <EmptyState message={emptyMessage} />
      </div>
    );
  }

  

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* SCROLLABLE TABLE CONTENT - Credit Executive styling */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-[var(--color-surface)]"
      >
        <div className="lg:block border border-[var(--color-muted)] border-opacity-30 ">
          <table
            className="w-full border-collapse"
            style={{ borderSpacing: "0" }}
          >
            {/* STICKY TABLE HEADER - Credit Executive style with reduced spacing */}
            <thead className="bg-[var(--color-background)] border-b border-[var(--color-muted)] border-opacity-30 whitespace-nowrap sticky top-0 z-20">
              <tr>
                <th className="sticky top-0 bg-[var(--color-background)]  text-left text-sm font-light text-[var(--color-on-surface)] opacity-70 z-20" />
                {columns.map((column, index) => (
                  <th
                    key={column.key}
                    ref={(el) => {
                      columnRefs.current[index] = el;
                    }}
                    className={`relative group px-2 py-3 text-left text-md border-r border-[var(--color-muted)] border-opacity-30 font-normal text-[var(--color-on-surface)]  z-20 shadow-sm ${
                      column.className || ""
                    }`}
                  >
                    {column.label}
                    {/* Resizer handle */}
                    <div
                      className="absolute top-0 right-0 h-full w-[6px] cursor-col-resize select-none group-hover:bg-[var(--color-muted)] group-hover:bg-opacity-30"
                      onMouseDown={(e) => handleMouseDown(e, index)}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-muted)] divide-opacity-20 bg-[var(--color-surface)]">
              {data.map((row, index) => (
                <tr
                  key={row.id || index}
                  onClick={() => onRowClick?.(row)}
                  className={`hover:bg-[var(--color-background)] transition-colors duration-150 ${
                    onRowClick ? "cursor-pointer" : ""
                  }`}
                >
                  <td className="text-left text-sm border-[var(--color-muted)] border-opacity-30 font-light text-[var(--color-on-surface)] opacity-70" />
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-2 py-3 align-top ${
                        column.className || ""
                      }`}
                    >
                      {column.render
                        ? column.render(row[column.key], row)
                        : row[column.key] || "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Rest of the components remain the same...
export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  showPageSizeOptions = true,
  storageKey = "table",
  centerContent,
}) => {
  // Remove the initial load effect to prevent double renders
  // Parent component should initialize from localStorage instead
  useEffect(() => {
    localStorage.setItem(`${storageKey}PageSize`, pageSize.toString());
    localStorage.setItem(`${storageKey}Page`, currentPage.toString());
  }, [pageSize, currentPage, storageKey]);

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="bg-[var(--color-surface)] border-t border-[var(--color-muted)] border-opacity-30 px-6 ">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          {showPageSizeOptions && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--color-on-surface)] opacity-70">
                Show
              </span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="text-sm border border-[var(--color-muted)] border-opacity-50 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] bg-[var(--color-surface)]"
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span className="text-sm text-[var(--color-on-surface)] opacity-70">
                entries
              </span>
            </div>
          )}
        </div>

        {centerContent && <div>{centerContent}</div>}

        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-sm font-medium  rounded-md  disabled:opacity-50 disabled:cursor-not-allowedtext-[var(--color-on-surface)] opacity-70 border border-[var(--color-muted)] hover:bg-[var(--color-background)] border-opacity-50 disabled:hover:bg-[var(--color-surface)] transition-colors"
          >
            Previous
          </button>

          <footer className="sticky bottom-0 z-20">
            <span className="text-sm text-gray-600 px-3">
              {totalCount > 0
                ? `${start}–${end} of ${totalCount}`
                : "No results"}
            </span>
          </footer>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1.5 text-sm font-medium text-[var(--color-on-surface)] opacity-70 border border-[var(--color-muted)] border-opacity-50  hover:bg-[var(--color-background)] disabled:hover:bg-[var(--color-surface)] rounded-md  disabled:opacity-50 disabled:cursor-not-allowed  transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

interface SearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
}

export const SearchInput: React.FC<SearchProps> = ({
  value,
  onChange,
  placeholder = "Search...",
  onClear,
}) => {
  const [isFocused, setIsFocused] = React.useState(false);
  
  return (
    <div className="relative group">
      {/* Input Field */}
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`
          w-full pl-11 pr-11 py-3
          border-2 rounded-xl
          text-sm font-medium
          text-[var(--color-on-background)]
          placeholder-[var(--color-on-surface)] placeholder-opacity-40
          bg-[var(--color-surface)]
          transition-all duration-200 ease-in-out
          focus:outline-none
          ${
            isFocused || value
              ? "border-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/10"
              : "border-[var(--color-muted)] border-opacity-30 hover:border-[var(--color-muted)] hover:border-opacity-50"
          }
        `}
      />
      
      {/* Search Icon */}
      <div
        className={`
          absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none
          transition-all duration-200
          ${isFocused || value ? "text-[var(--color-primary)]" : "text-[var(--color-on-surface)] opacity-40"}
        `}
      >
        <svg
          className="h-5 w-5 transition-transform duration-200"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{
            transform: isFocused ? "scale(1.1)" : "scale(1)",
          }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      
      {/* Clear Button */}
      {value && onClear && (
        <button
          onClick={onClear}
          className="
            absolute inset-y-0 right-0 pr-4 flex items-center
            text-[var(--color-on-surface)] opacity-40
            hover:opacity-70 hover:text-[var(--color-error)]
            transition-all duration-200
            focus:outline-none
            group/clear
          "
          aria-label="Clear search"
        >
          <HiOutlineXCircle 
            className="h-5 w-5 transition-all duration-200 group-hover/clear:scale-110" 
          />
        </button>
      )}
      
      {/* Active Indicator (Bottom Border Animation) */}
      <div
        className={`
          absolute bottom-0 left-0 right-0 h-0.5
          bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)]
          transition-all duration-300 ease-out
          ${isFocused ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"}
        `}
      />
      
      {/* Result Count Badge (Optional - shows when there's a value) */}
      {value && (
        <div className="absolute -top-2 -right-2 bg-[var(--color-primary)] text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-md animate-in fade-in zoom-in duration-200">
          <svg
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}
    </div>
  );
};

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  onRetry,
}) => (
  <div className="mb-4 p-4 bg-[var(--color-error)] bg-opacity-10 text-[var(--color-on-error)] rounded-lg flex items-center gap-2">
    <HiOutlineXCircle className="h-5 w-5" />
    {message}
    {onRetry && (
      <button
        onClick={onRetry}
        className="ml-auto text-[var(--color-on-primary)] hover:text-[var(--color-on-primary)] text-sm font-semibold transition-colors"
      >
        Retry
      </button>
    )}
  </div>
);