import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../ui/button";
import { useAppSelector } from "../../shared/redux/store";

type FilterOption = {
  label: string;
  value: string;
  count: number | null;
};

export type FilterGroup = {
  id: string;
  title: string;
  type: "radio" | "checkbox";
  options: FilterOption[];
  onExpand?: () => void; // Callback when filter group is expanded
  isCollapsible?: boolean; // Whether the filter can be collapsed
};

type DateRangeFilter = {
  fromDate: string;
  toDate: string;
};

type Props = {
  filterGroups: FilterGroup[];
  resetText?: string;
  storageKey?: string;
  showDateRange?: boolean;
  dateRangeTitle?: string;
};

export default function DynamicFilters({ filterGroups, resetText, storageKey, showDateRange = false, dateRangeTitle = "Customer Date" }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const isFiltersVisible = useAppSelector(
    (state) => state.common.isFiltersVisible
  );

  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, string[]>
  >({});
  
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  
  const [dateRange, setDateRange] = useState<DateRangeFilter>({
    fromDate: "",
    toDate: "",
  });
  
  const isInitialized = useRef(false);

  // Memoized function to update URL and sessionStorage
  const updateURLParams = useCallback((filters: Record<string, string[]>, dateRangeData?: DateRangeFilter) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach((key) => {
      if (filters[key].length > 0) {
        params.set(key, JSON.stringify(filters[key]));
      }
    });
    
    // Add date range params if provided
    if (dateRangeData) {
      if (dateRangeData.fromDate) {
        params.set("customDateFrom", dateRangeData.fromDate);
      }
      if (dateRangeData.toDate) {
        params.set("customDateTo", dateRangeData.toDate);
      }
    }
    
    navigate({ search: params.toString() }, { replace: true });
    
    // Update sessionStorage if storageKey is provided
    if (storageKey) {
      try {
        const dataToStore = {
          filters: Object.keys(filters).length > 0 ? filters : null,
          dateRange: dateRangeData || null,
        };
        if (dataToStore.filters || dataToStore.dateRange) {
          sessionStorage.setItem(storageKey, JSON.stringify(dataToStore));
        } else {
          sessionStorage.removeItem(storageKey);
        }
      } catch (error) {
        console.error("Error saving filters to sessionStorage:", error);
      }
    }
  }, [navigate, storageKey]);

  // Initialize filters only once on mount
  useEffect(() => {
    if (isInitialized.current) return;
    
    let initialFilters: Record<string, string[]> = {};
    let initialDateRange: DateRangeFilter = { fromDate: "", toDate: "" };
    
    // Priority 1: Read from sessionStorage if storageKey is provided
    if (storageKey) {
      try {
        const storedData = sessionStorage.getItem(storageKey);
        if (storedData) {
          const parsed = JSON.parse(storedData);
          // Check if it's the new format with filters and dateRange
          if (parsed && typeof parsed === 'object') {
            if (parsed.filters) {
              initialFilters = parsed.filters;
            } else if (!parsed.dateRange) {
              // Legacy format - just filters object
              initialFilters = parsed;
            }
            if (parsed.dateRange) {
              initialDateRange = parsed.dateRange;
            }
          }
        }
      } catch (error) {
        console.error("Error reading filters from sessionStorage:", error);
      }
    }
    
    // Priority 2: If no stored filters, read from URL params
    if (Object.keys(initialFilters).length === 0 && !initialDateRange.fromDate && !initialDateRange.toDate) {
      const params = new URLSearchParams(location.search);
      if (params.size > 0) {
        params.forEach((value, key) => {
          if (key === "customDateFrom") {
            initialDateRange.fromDate = value;
          } else if (key === "customDateTo") {
            initialDateRange.toDate = value;
          } else {
            try {
              const parsed = JSON.parse(value);
              initialFilters[key] = Array.isArray(parsed) ? parsed : [value];
            } catch {
              initialFilters[key] = [value];
            }
          }
        });
      }
    }
    
    // Set state and update URL if we have filters or date range
    if (Object.keys(initialFilters).length > 0 || initialDateRange.fromDate || initialDateRange.toDate) {
      setSelectedFilters(initialFilters);
      setDateRange(initialDateRange);
      updateURLParams(initialFilters, initialDateRange);
    }
    
    isInitialized.current = true;
  }, [storageKey, location.search, updateURLParams]);

  // Handle filter changes
  const handleFilterChange = useCallback((
    groupId: string,
    value: string,
    type: "radio" | "checkbox"
  ) => {
    setSelectedFilters((prev) => {
      const updatedFilters = { ...prev };

      if (type === "radio") {
        // For radio buttons, replace the entire array with new value
        updatedFilters[groupId] = [value];
      } else {
        // For checkboxes, toggle the value in the array
        const values = new Set(updatedFilters[groupId] || []);
        if (values.has(value)) {
          values.delete(value);
        } else {
          values.add(value);
        }
        updatedFilters[groupId] = Array.from(values);
      }

      // Remove the key if no values are selected
      if (updatedFilters[groupId].length === 0) {
        delete updatedFilters[groupId];
      }

      // If dateFilter is selected, clear the custom date range
      if (groupId === "dateFilter" && updatedFilters[groupId]?.length > 0) {
        setDateRange({ fromDate: "", toDate: "" });
        updateURLParams(updatedFilters, { fromDate: "", toDate: "" });
      } else {
        updateURLParams(updatedFilters, dateRange);
      }
      
      return updatedFilters;
    });
  }, [updateURLParams, dateRange]);

  // Handle date range apply - clears preset dateFilter when custom range is applied
  const handleDateRangeApply = useCallback(() => {
    // Clear preset dateFilter when applying custom date range
    const updatedFilters = { ...selectedFilters };
    if (dateRange.fromDate || dateRange.toDate) {
      delete updatedFilters["dateFilter"];
      setSelectedFilters(updatedFilters);
    }
    updateURLParams(updatedFilters, dateRange);
  }, [updateURLParams, selectedFilters, dateRange]);

  // Handle clearing all filters
  const handleClearFilters = useCallback(() => {
    const clearedFilters = {};
    const clearedDateRange = { fromDate: "", toDate: "" };
    setSelectedFilters(clearedFilters);
    setDateRange(clearedDateRange);
    updateURLParams(clearedFilters, clearedDateRange);
  }, [updateURLParams]);

  // Handle toggle group expansion
  const handleToggleGroup = useCallback((groupId: string, onExpand?: () => void) => {
    setExpandedGroups((prev) => {
      const isCurrentlyExpanded = prev[groupId];
      
      // If expanding and onExpand callback exists, call it
      if (!isCurrentlyExpanded && onExpand) {
        onExpand();
      }
      
      return {
        ...prev,
        [groupId]: !isCurrentlyExpanded,
      };
    });
  }, []);

  return (
    <div>
      {isFiltersVisible && (
        <div className="w-50">
          {resetText && (
            <div className="flex flex-col gap-3 mb-4 pb-4 p-5">
              <span className="text-[var(--foreground)] font-medium">
                {resetText}
              </span>
              <Button
                variant="ghost"
                onClick={handleClearFilters}
              >
                Clear Filters
              </Button>
            </div>
          )}
          
          {/* Date Range Filter */}
          {showDateRange && (
            <div className="pb-4 p-5 border-b border-[var(--border)]">
              <p className="font-bold text-[var(--foreground)] mb-3">
                {dateRangeTitle}
              </p>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="customDateFrom" className="text-sm text-[var(--foreground)]">From</label>
                  <input
                    id="customDateFrom"
                    type="date"
                    value={dateRange.fromDate}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, fromDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="customDateTo" className="text-sm text-[var(--foreground)]">To</label>
                  <input
                    id="customDateTo"
                    type="date"
                    value={dateRange.toDate}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, toDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDateRangeApply}
                  className="w-full mt-2"
                >
                  Apply
                </Button>
              </div>
            </div>
          )}
          
          {filterGroups.map((group) => {
            const isExpanded = expandedGroups[group.id] ?? true; // Default to expanded
            
            return (
              <div key={group.id} className="pb-4 p-5">
                <div 
                  className={`flex items-center justify-between mb-2 ${group.isCollapsible ? 'cursor-pointer' : ''}`}
                  onClick={() => group.isCollapsible && handleToggleGroup(group.id, group.onExpand)}
                >
                  <p className="font-bold text-[var(--foreground)]">
                    {group.title}
                  </p>
                  {group.isCollapsible && (
                    <svg
                      className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </div>
                {isExpanded && group.options.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center justify-between gap-4 py-1"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type={group.type}
                        name={group.id}
                        value={option.value}
                        checked={
                          selectedFilters[group.id]?.includes(option.value) ||
                          false
                        }
                        onChange={() =>
                          handleFilterChange(group.id, option.value, group.type)
                        }
                        className="h-4 w-4 accent-gray-900 rounded text-[var(--color-on-background)] flex-shrink-0"
                      />
                      <span className="font-medium text-[var(--foreground)] break-words">
                        {option.label
                          .replace(/_/g, " ")
                          .toLowerCase()
                          .replace(/\b\w/g, (char) => char.toUpperCase())}
                      </span>
                    </div>

                    {option.count !== null && (
                      <div className="rounded-lg  py-0.5 px-2.5 flex justify-center items-center">
                        <span className="text-xs font-bold text-[var(--foreground)]">
                          {option.count}
                        </span>
                      </div>
                    )}
                  </label>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}