import { useState } from "react";
import { Button } from "../../../common/ui/button";
import { DashboardQuery } from "../types/dashboard.types";

interface DateRangePickerProps {
  onPeriodChange: (query: DashboardQuery) => void;
  currentPeriod: string;
  loading?: boolean;
}

export function DateRangePicker({ 
  onPeriodChange, 
  currentPeriod, 
  loading = false 
}: Readonly<DateRangePickerProps>) {
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  
  // Store the last applied custom dates
  const [lastAppliedStart, setLastAppliedStart] = useState("");
  const [lastAppliedEnd, setLastAppliedEnd] = useState("");

  const periods = [
    { key: "today", label: "Today" },
    { key: "tilldate", label: "This Month" },
    { key: "yesterday", label: "Yesterday" },
    { key: "week", label: "Last 7 Days" },
    { key: "month", label: "Last 30 Days" },
    { key: "year", label: "Last Year" },
    {key: "all", label: "All Time" },
    { key: "custom", label: "Custom Range" },
  ] as const;

  const getIndianTime = () => {
    const now = new Date();
    // Convert to IST (UTC+5:30)
    const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000) - (now.getTimezoneOffset() * 60 * 1000));
    return istTime;
  };

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = getIndianTime();
  const lastMonth = new Date(today);
  lastMonth.setMonth(today.getMonth() - 1);

  const handlePeriodClick = (period: string) => {
  if (period === "custom") {
    setShowCustomRange(true);
    // Use last applied dates if they exist, otherwise use defaults
    if (lastAppliedStart && lastAppliedEnd) {
      setCustomStart(lastAppliedStart);
      setCustomEnd(lastAppliedEnd);
    } else {
      setCustomStart(formatDateForInput(lastMonth));
      setCustomEnd(formatDateForInput(today));
    }
    return;
  }
  
  setShowCustomRange(false);

  if (period === "tilldate") {
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    onPeriodChange({
      period: "tilldate", // Keep as "tilldate", not "custom"
      startDate: formatDateForInput(firstDayOfMonth),
      endDate: formatDateForInput(today),
    });
  } else {
    onPeriodChange({ period: period as DashboardQuery["period"] });
  }
};

  const handleCustomRangeApply = () => {
    if (customStart && customEnd) {
      // Store the applied dates
      setLastAppliedStart(customStart);
      setLastAppliedEnd(customEnd);
      
      onPeriodChange({
        period: "custom",
        startDate: customStart,
        endDate: customEnd,
      });
      setShowCustomRange(false);
    }
  };

  const handleCancel = () => {
    setShowCustomRange(false);
    // Don't clear the dates, just hide the picker
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {periods.map((period) => (
          <Button
            key={period.key}
            variant={currentPeriod === period.key ? "primary" : "outline"}
            size="sm"
            onClick={() => handlePeriodClick(period.key)}
            disabled={loading}
            className="text-xs"
          >
            {period.label}
          </Button>
        ))}
      </div>

      {showCustomRange && (
        <div className="flex flex-col gap-3 p-4 border rounded-lg bg-gray-50">
          <div className="text-sm font-medium text-gray-700">Custom Date Range</div>
          <div className="flex gap-3 items-center">
            <div className="flex flex-col gap-1">
              <label htmlFor="start-date" className="text-xs text-gray-600">Start Date</label>
              <input
                id="start-date"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-2 border rounded text-sm"
                max={formatDateForInput(today)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="end-date" className="text-xs text-gray-600">End Date</label>
              <input
                id="end-date"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-2 border rounded text-sm"
                // max={formatDateForInput(today)}
                min={customStart}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                onClick={handleCustomRangeApply}
                disabled={!customStart || !customEnd || loading}
              >
                Apply
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}