import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  HiOutlineCalendar,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineLockClosed,
  HiOutlineCurrencyRupee,
} from "react-icons/hi2";
import { FiSave } from "react-icons/fi";
import { Button } from "../../../common/ui/button";
import { Input, Select, Textarea } from "../../../common/ui/input";
import { Spinner } from "../../../common/ui/spinner";
import Dialog from "../../../common/dialog";
import { cn } from "../../../lib/utils";
import dayjs from "dayjs";
import {
  nonRepaymentDatesApi,
  NonRepaymentDateType,
} from "../../../shared/services/api/settings/nonRepaymentDates.api";
import { indianStatesWithCapitals } from "../../../constant/stateCode";
import { getLoansByDueDateAndPartner, getDisbursedAmountByDate } from "../../../shared/services/api/loan.api";
import { getBrandConfig } from "../../../shared/services/api/settings/general.setting.api";

interface NonRepaymentDate {
  id: string;
  date: string;
  reason: string;
  state: string;
  type: NonRepaymentDateType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NonRepaymentDateForm {
  date: string;
  reason: string;
  state: string;
}

interface LoanData {
  date: string;
  totalCases: number;
  totalAmount: number;
}

interface DisbursementData {
  date: string;
  totalCases: number;
  totalDisbursedAmount: number;
}

interface BrandConfig {
  id: string;
  brandId: string;
  sunday_off: boolean;
  // ... other config properties
  [key: string]: any;
}

// Generate years from current year to next 5 years
const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = -2; i < 6; i++) {
    const year = currentYear + i;
    years.push({ value: year.toString(), label: year.toString() });
  }
  return years;
};

// Generate calendar days for a given month and year
const generateCalendarDays = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }

  // Add days of the month with their day of week
  for (let day = 1; day <= daysInMonth; day++) {
    const dayOfWeek = new Date(year, month, day).getDay();
    days.push({ day, dayOfWeek });
  }

  return days;
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Helper function to format currency in Indian format
const formatIndianCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(amount);
};

// Enum for data view type
enum DataViewType {
  DUE_AMOUNT = 'DUE_AMOUNT',
  DISBURSED_AMOUNT = 'DISBURSED_AMOUNT'
}

export default function BrandNonRepaymentDates() {
  const { brandId } = useParams<{ brandId: string }>();
  const [selectedYear, setSelectedYear] = useState<string>(
    new Date().getFullYear().toString()
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth()
  );
  const [nonRepaymentDates, setNonRepaymentDates] = useState<
    NonRepaymentDate[]
  >([]);
  const [loanData, setLoanData] = useState<LoanData[]>([]);
  const [disbursementData, setDisbursementData] = useState<DisbursementData[]>([]);
  const [brandConfig, setBrandConfig] = useState<BrandConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(false);
  const [loanDataLoading, setLoanDataLoading] = useState(false);
  const [disbursementDataLoading, setDisbursementDataLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataViewType, setDataViewType] = useState<DataViewType>(DataViewType.DUE_AMOUNT);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [form, setForm] = useState<NonRepaymentDateForm>({
    date: "",
    reason: "",
    state: "",
  });
  const [formErrors, setFormErrors] = useState<Partial<NonRepaymentDateForm>>(
    {}
  );

  const yearOptions = generateYearOptions();

  useEffect(() => {
    if (brandId) {
      fetchBrandConfig();
      fetchNonRepaymentDates();
      if (dataViewType === DataViewType.DUE_AMOUNT) {
        fetchLoanData();
      } else {
        fetchDisbursementData();
      }
    }
  }, [brandId, selectedYear, selectedMonth, dataViewType]);

  const fetchBrandConfig = async () => {
    if (!brandId) return;
    
    setConfigLoading(true);
    try {
      const config = await getBrandConfig(brandId);
      setBrandConfig(config);
    } catch (err) {
      console.error("Failed to fetch brand config:", err);
      // Set default config with sunday_off as true if API fails
      setBrandConfig({
        id: "",
        brandId: brandId,
        sunday_off: true,
      });
    } finally {
      setConfigLoading(false);
    }
  };

  const fetchNonRepaymentDates = async () => {
    if (!brandId) {
      setError("Brand ID is required");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await nonRepaymentDatesApi.getNonRepaymentDates(brandId, {
        year: Number.parseInt(selectedYear),
        active: "true",
      });
      setNonRepaymentDates(data);
    } catch (err) {
      setError("Failed to fetch non-repayment dates");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLoanData = async () => {
    if (!brandId) return;

    setLoanDataLoading(true);
    try {
      // Calculate start and end dates for the current month
      const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
      const endDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${new Date(Number.parseInt(selectedYear), selectedMonth + 1, 0).getDate()}`;

      const loans = await getLoansByDueDateAndPartner(brandId, {
        dueDateFrom: startDate,
        dueDateTo: endDate,
        loanCurrentStatus: "both",
      });

      // Group loans by due date and calculate totals
      const groupedData: Record<string, { totalCases: number; totalAmount: number }> = {};

      loans.forEach((loan: any) => {
        if (loan.loanDetails?.dueDate) {
          const dateKey = dayjs(loan.loanDetails.dueDate).format("YYYY-MM-DD");
          
          if (!groupedData[dateKey]) {
            groupedData[dateKey] = {
              totalCases: 0,
              totalAmount: 0,
            };
          }
          
          groupedData[dateKey].totalCases += 1;
          groupedData[dateKey].totalAmount += loan.amount || 0;
        }
      });

      // Convert to array
      const loanDataArray = Object.entries(groupedData).map(([date, data]) => ({
        date,
        ...data,
      }));

      setLoanData(loanDataArray);
    } catch (err) {
      console.error("Failed to fetch loan data:", err);
    } finally {
      setLoanDataLoading(false);
    }
  };

  const fetchDisbursementData = async () => {
    if (!brandId) return;

    setDisbursementDataLoading(true);
    try {
      // Calculate start and end dates for the current month
      const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
      const endDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${new Date(Number.parseInt(selectedYear), selectedMonth + 1, 0).getDate()}`;

      const disbursements = await getDisbursedAmountByDate(brandId, {
        disbursementDateFrom: startDate,
        disbursementDateTo: endDate,
      });

      setDisbursementData(disbursements);
    } catch (err) {
      console.error("Failed to fetch disbursement data:", err);
    } finally {
      setDisbursementDataLoading(false);
    }
  };

  const formatDateForComparison = (dateString: string) => {
    return dayjs(dateString).format("YYYY-MM-DD");
  };

  const isDateNonRepayment = (day: number) => {
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`;
    
    return nonRepaymentDates.some((d) => 
      formatDateForComparison(d.date) === dateStr && d.isActive
    );
  };

  const getNonRepaymentDate = (day: number) => {
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`;
    
    return nonRepaymentDates.find((d) => 
      formatDateForComparison(d.date) === dateStr && d.isActive
    );
  };

  const getLoanDataForDate = (day: number) => {
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`;
    
    return loanData.find((data) => data.date === dateStr);
  };

  const getDisbursementDataForDate = (day: number) => {
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`;
    
    return disbursementData.find((data) => data.date === dateStr);
  };

  const isSunday = (dayOfWeek: number) => {
    return dayOfWeek === 0; // Sunday is 0 in JavaScript
  };

  const handlePreviousMonth = () => {
    let newYear = Number.parseInt(selectedYear);
    let newMonth = selectedMonth - 1;
    
    if (newMonth < 0) {
      newMonth = 11; // December
      newYear = newYear - 1;
      
      // Check if new year exists in year options
      const yearExists = yearOptions.some(option => 
        Number.parseInt(option.value) === newYear
      );
      
      if (yearExists) {
        setSelectedYear(newYear.toString());
      }
    }
    
    setSelectedMonth(newMonth);
  };

  const handleNextMonth = () => {
    let newYear = Number.parseInt(selectedYear);
    let newMonth = selectedMonth + 1;
    
    if (newMonth > 11) {
      newMonth = 0; // January
      newYear = newYear + 1;
      
      // Check if new year exists in year options
      const yearExists = yearOptions.some(option => 
        Number.parseInt(option.value) === newYear
      );
      
      if (yearExists) {
        setSelectedYear(newYear.toString());
      }
    }
    
    setSelectedMonth(newMonth);
  };

  const handleDateClick = (day: number, dayOfWeek: number) => {
    // Check if it's Sunday and sunday_off is true
    if (isSunday(dayOfWeek) && brandConfig?.sunday_off) {
      return;
    }

    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`;
    const existingDate = getNonRepaymentDate(day);

    if (existingDate) {
      // Edit existing date
      setModalMode("edit");
      setEditingId(existingDate.id);
      setForm({
        date: existingDate.date,
        reason: existingDate.reason,
        state: existingDate.state,
      });
    } else {
      // Add new date
      setModalMode("add");
      setEditingId(null);
      setForm({
        date: dateStr,
        reason: "",
        state: "",
      });
    }

    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Partial<NonRepaymentDateForm> = {};

    if (!form.date) {
      errors.date = "Date is required";
    }

    if (!form.reason.trim()) {
      errors.reason = "Reason is required";
    }

    if (!form.state) {
      errors.state = "State selection is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm() || !brandId) {
      return;
    }

    // Check if it's Sunday and sunday_off is true
    if (brandConfig?.sunday_off && dayjs(form.date).day() === 0) {
      setError("Sundays cannot be selected as non-repayment dates when Sunday Off is enabled");
      return;
    }

    setSaving(true);
    try {
      if (modalMode === "add") {
        const newDate = await nonRepaymentDatesApi.createNonRepaymentDate(
          brandId,
          {
            date: form.date,
            reason: form.reason,
            state: form.state,
            type: "BRAND_NON_REPAYMENT",
          }
        );
        setNonRepaymentDates((prev) => [...prev, newDate]);
      } else if (modalMode === "edit" && editingId) {
        const updatedDate = await nonRepaymentDatesApi.updateNonRepaymentDate(
          brandId,
          editingId,
          {
            date: form.date,
            reason: form.reason,
            state: form.state,
            type: "BRAND_NON_REPAYMENT",
          }
        );
        setNonRepaymentDates((prev) =>
          prev.map((d) => (d.id === editingId ? updatedDate : d))
        );
      }

      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      setError((err as Error).message || "Failed to save non-repayment date");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm("Are you sure you want to delete this non-repayment date?") ||
      !brandId
    ) {
      return;
    }

    setSaving(true);
    try {
      await nonRepaymentDatesApi.deleteNonRepaymentDate(brandId, id);
      setNonRepaymentDates((prev) => prev.filter((d) => d.id !== id));
      setIsModalOpen(false);
    } catch (err) {
      setError("Failed to delete non-repayment date");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({ date: "", reason: "", state: "" });
    setFormErrors({});
    setEditingId(null);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const calendarDays = generateCalendarDays(
    Number.parseInt(selectedYear),
    selectedMonth
  );

  const filteredNonRepaymentDates = nonRepaymentDates.filter((date) => {
    const dateYear = dayjs(date.date).year().toString();
    return dateYear === selectedYear && date.isActive;
  });

  const sortedNonRepaymentDates = [...filteredNonRepaymentDates].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  if (loading || configLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  const isSundayOff = brandConfig?.sunday_off ?? true;

  // Calculate totals based on current view type
  const currentData = dataViewType === DataViewType.DUE_AMOUNT ? loanData : disbursementData;
  const totalCases = currentData.reduce((sum, data) => sum + data.totalCases, 0);
  const totalAmount = currentData.reduce((sum, data) => 
    sum + (dataViewType === DataViewType.DUE_AMOUNT ? 
      (data as LoanData).totalAmount : 
      (data as DisbursementData).totalDisbursedAmount
    ), 0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-on-background)]">
            Non-Repayment Dates
          </h2>
          <p className="text-[var(--color-on-surface)] opacity-70 mt-1">
            Configure dates when loan repayments are not allowed
          </p>
          {isSundayOff && (
            <p className="text-sm text-blue-600 mt-1">
              <HiOutlineLockClosed className="inline h-4 w-4 mr-1" />
              Sundays are automatically blocked for repayments (Sunday Off is enabled)
            </p>
          )}
          {!isSundayOff && (
            <p className="text-sm text-amber-600 mt-1">
              <HiOutlineCalendar className="inline h-4 w-4 mr-1" />
              Sundays are available for selection (Sunday Off is disabled)
            </p>
          )}
        </div>

        {/* Data View Toggle Buttons */}
        <div className="flex gap-2">
          <Button
            variant={dataViewType === DataViewType.DUE_AMOUNT ? "primary" : "outline"}
            onClick={() => setDataViewType(DataViewType.DUE_AMOUNT)}
            leftIcon={<HiOutlineCurrencyRupee className="h-4 w-4" />}
          >
            Due Amount
          </Button>
          <Button
            variant={dataViewType === DataViewType.DISBURSED_AMOUNT ? "primary" : "outline"}
            onClick={() => setDataViewType(DataViewType.DISBURSED_AMOUNT)}
            leftIcon={<HiOutlineCurrencyRupee className="h-4 w-4" />}
          >
            Disbursed Amount
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-[var(--color-error)] bg-opacity-10 border border-[var(--color-error)] border-opacity-30 rounded-lg p-4">
          <p className="text-[var(--color-on-error)]">{error}</p>
        </div>
      )}

      {/* Year Selection */}
      <div className="bg-white rounded-lg border border-[var(--color-muted)] border-opacity-30 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Select
              label="Select Year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              options={yearOptions}
              className="w-40"
            />

            <div className="flex items-center gap-2 mt-6">
              <Button
                variant="outline"
                onClick={handlePreviousMonth}
              >
                ←
              </Button>
              <span className="text-lg font-semibold min-w-[120px] text-center">
                {MONTHS[selectedMonth]} {selectedYear}
              </span>
              <Button
                variant="outline"
                onClick={handleNextMonth}
              >
                →
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {dataViewType === DataViewType.DUE_AMOUNT ? (
              loanDataLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Spinner />
                  <span>Loading due loan data...</span>
                </div>
              )
            ) : (
              disbursementDataLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Spinner />
                  <span>Loading disbursement data...</span>
                </div>
              )
            )}
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-[var(--color-muted)] border-opacity-30 shadow-sm">
          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {DAYS_OF_WEEK.map((day) => (
              <div
                key={day}
                className="text-center text-sm font-bold text-[var(--color-on-surface)] opacity-80 py-3 bg-white rounded-lg shadow-sm border border-[var(--color-muted)] border-opacity-20"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((dayData, index) => {
              if (dayData === null) {
                return (
                  <div
                    key={`empty-${selectedYear}-${selectedMonth}-${index}`}
                    className="h-16"
                  />
                );
              }

              const { day, dayOfWeek } = dayData;
              const isNonRepayment = isDateNonRepayment(day);
              const nonRepaymentDate = getNonRepaymentDate(day);
              const isSunday = dayOfWeek === 0;
              const isSundayBlocked = isSunday && isSundayOff;
              
              // Get data based on current view type
              let dataForDate: LoanData | DisbursementData | undefined;
              let hasData = false;

              if (dataViewType === DataViewType.DUE_AMOUNT) {
                dataForDate = getLoanDataForDate(day);
                hasData = !!(dataForDate && (dataForDate as LoanData).totalCases > 0);
              } else {
                dataForDate = getDisbursementDataForDate(day);
                hasData = !!(dataForDate && (dataForDate as DisbursementData).totalCases > 0);
              }

              const getTooltipText = () => {
                if (isSundayBlocked) {
                  return "Sundays are automatically blocked for repayments (Sunday Off is enabled)";
                }
                
                if (isNonRepayment) {
                  return `Non-repayment date: ${nonRepaymentDate?.reason} (${nonRepaymentDate?.state}) - Click to update`;
                }
                
                if (hasData) {
                  if (dataViewType === DataViewType.DUE_AMOUNT) {
                    const loanData = dataForDate as LoanData;
                    return `Due loans: ${loanData.totalCases} cases, ₹${formatIndianCurrency(loanData.totalAmount)} - Click to add non-repayment date`;
                  } else {
                    const disbursementData = dataForDate as DisbursementData;
                    return `Disbursed loans: ${disbursementData.totalCases} cases, ₹${formatIndianCurrency(disbursementData.totalDisbursedAmount)} - Click to add non-repayment date`;
                  }
                }
                
                return "Click to add non-repayment date";
              };

              return (
                <button
                  key={day}
                  onClick={() => !isSundayBlocked && handleDateClick(day, dayOfWeek)}
                  disabled={isSundayBlocked}
                  className={cn(
                    "h-16 w-full rounded-lg transition-all duration-200 relative group flex flex-col items-center justify-center",
                    "focus:outline-none focus:ring-2 focus:ring-[#EA5E18] focus:ring-offset-1",
                    isSundayBlocked
                      ? "bg-gradient-to-br from-gray-300 to-gray-400 border-2 border-gray-500 cursor-not-allowed opacity-60"
                      : isNonRepayment
                      ? "bg-gradient-to-br from-red-200 to-red-300 border-2 border-red-500 shadow-lg hover:from-red-300 hover:to-red-400 hover:shadow-xl transform hover:scale-105 ring-2 ring-red-400 ring-opacity-50"
                      : "bg-white text-[var(--color-on-surface)] opacity-80 border border-[var(--color-muted)] border-opacity-30 hover:bg-[var(--color-primary)] bg-opacity-10 hover:border-blue-300 hover:text-[var(--color-on-primary)] hover:shadow-md transform hover:scale-105"
                  )}
                  title={getTooltipText()}
                >
                  {/* Day number */}
                  <span
                    className={cn(
                      "text-sm font-medium relative z-10 group-hover:text-[var(--color-on-primary)]",
                      isNonRepayment
                        ? "text-red-950 font-bold"
                        : isSundayBlocked
                        ? "text-gray-700 font-bold"
                        : hasData
                        ? "text-[var(--color-on-surface)] font-bold"
                        : "text-[var(--color-on-surface)] opacity-80"
                    )}
                  >
                    {day}
                  </span>

                  {/* Data summary based on view type */}
                  {hasData && dataForDate && (
  <div className="text-[10px] font-medium mt-0.5 z-10">
    <div className="leading-tight">
      <span className={dataViewType === DataViewType.DUE_AMOUNT ? "text-[var(--color-primary)]" : "text-blue-600"}>
        {dataForDate.totalCases} case{dataForDate.totalCases !== 1 ? 's' : ''}
      </span>
    </div>
    <div className="leading-tight">
      <span className={dataViewType === DataViewType.DUE_AMOUNT ? "text-green-600" : "text-purple-600"}>
        ₹{dataViewType === DataViewType.DUE_AMOUNT 
          ? formatIndianCurrency((dataForDate as LoanData).totalAmount)
          : formatIndianCurrency((dataForDate as DisbursementData).totalDisbursedAmount)
        }
      </span>
    </div>
  </div>
)}

                  {/* No data indicator */}
                  {!hasData && !isSundayBlocked && !isNonRepayment && (
                    <div className="text-[10px] text-gray-500 mt-0.5 z-10">
                      {dataViewType === DataViewType.DUE_AMOUNT ? "No due loans" : "No disbursements"}
                    </div>
                  )}

                  {/* Sunday lock icon - only show if sunday_off is true */}
                  {isSundayBlocked && (
                    <>
                      <div className="absolute -top-1 -right-1 z-20">
                        <div className="bg-gray-600 text-white rounded-full p-1">
                          <HiOutlineLockClosed className="h-3 w-3" />
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-gray-500 bg-opacity-100 opacity-10 rounded-lg"></div>
                    </>
                  )}

                  {/* Non-repayment date icons */}
                  {isNonRepayment && !isSundayBlocked && (
                    <>
                      <div className="absolute -top-1 -right-1 z-20">
                        <div className="bg-red-600 text-white rounded-full p-1">
                          <HiOutlineCalendar className="h-3 w-3" />
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-[var(--color-error)] bg-opacity-100 opacity-10 rounded-lg animate-pulse"></div>
                    </>
                  )}

                  {/* Hover effect for non-repayment dates */}
                  {isNonRepayment && !isSundayBlocked && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-600 rounded-b-lg opacity-80"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-6 p-4 bg-[var(--color-surface)] rounded-lg text-sm">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-white border border-[var(--color-muted)] border-opacity-30 rounded-lg flex items-center justify-center">
              <span className="text-xs font-medium text-[var(--color-on-surface)] opacity-70">
                15
              </span>
            </div>
            <span className="text-[var(--color-on-surface)] opacity-80 font-medium">
              Regular Date
            </span>
          </div>
          {isSundayOff && (
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-gradient-to-br from-gray-300 to-gray-400 border-2 border-gray-500 rounded-lg flex items-center justify-center relative">
                <span className="text-xs font-bold text-gray-700">15</span>
                <div className="absolute -top-1 -right-1">
                  <div className="bg-gray-600 text-white rounded-full p-0.5">
                    <HiOutlineLockClosed className="h-2 w-2" />
                  </div>
                </div>
              </div>
              <span className="text-[var(--color-on-surface)] opacity-80 font-medium">
                Sunday (Auto Blocked)
              </span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-gradient-to-br from-red-200 to-red-300 border-2 border-red-500 rounded-lg flex items-center justify-center relative ring-2 ring-red-400 ring-opacity-50">
              <span className="text-xs font-bold text-red-950">15</span>
              <div className="absolute -top-1 -right-1">
                <div className="bg-red-600 text-white rounded-full p-0.5">
                  <HiOutlineCalendar className="h-2 w-2" />
                </div>
              </div>
            </div>
            <span className="text-[var(--color-on-surface)] opacity-80 font-medium">
              Non-Repayment Date
            </span>
          </div>
          <div className="ml-auto text-xs text-[var(--color-on-surface)] opacity-70">
            {isSundayOff 
              ? "Click on any non-Sunday date to add or edit non-repayment settings" 
              : "Click on any date to add or edit non-repayment settings"}
          </div>
        </div>
      </div>

      {/* Data View Summary */}
      <div className="bg-white rounded-lg border border-[var(--color-muted)] border-opacity-30 p-6">
        <h3 className="text-lg font-semibold text-[var(--color-on-background)] mb-4">
          {dataViewType === DataViewType.DUE_AMOUNT 
            ? `Due Loan Summary for ${MONTHS[selectedMonth]} ${selectedYear}`
            : `Disbursement Summary for ${MONTHS[selectedMonth]} ${selectedYear}`
          }
        </h3>
        
        {currentData.length === 0 ? (
          <p className="text-[var(--color-on-surface)] opacity-70 text-center py-8">
            {dataViewType === DataViewType.DUE_AMOUNT 
              ? `No due loans found for ${MONTHS[selectedMonth]} ${selectedYear}`
              : `No disbursements found for ${MONTHS[selectedMonth]} ${selectedYear}`
            }
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`${dataViewType === DataViewType.DUE_AMOUNT ? 'bg-blue-50 border-blue-200' : 'bg-purple-50 border-purple-200'} border rounded-lg p-4`}>
              <p className={`text-sm ${dataViewType === DataViewType.DUE_AMOUNT ? 'text-blue-700' : 'text-purple-700'} font-medium`}>
                Total Days with {dataViewType === DataViewType.DUE_AMOUNT ? 'Due Loans' : 'Disbursements'}
              </p>
              <p className={`text-2xl font-bold ${dataViewType === DataViewType.DUE_AMOUNT ? 'text-blue-900' : 'text-purple-900'} mt-1`}>
                {currentData.length} days
              </p>
            </div>
            <div className={`${dataViewType === DataViewType.DUE_AMOUNT ? 'bg-green-50 border-green-200' : 'bg-indigo-50 border-indigo-200'} border rounded-lg p-4`}>
              <p className={`text-sm ${dataViewType === DataViewType.DUE_AMOUNT ? 'text-green-700' : 'text-indigo-700'} font-medium`}>
                Total {dataViewType === DataViewType.DUE_AMOUNT ? 'Due' : 'Disbursed'} Cases
              </p>
              <p className={`text-2xl font-bold ${dataViewType === DataViewType.DUE_AMOUNT ? 'text-green-900' : 'text-indigo-900'} mt-1`}>
                {formatIndianCurrency(totalCases)}
              </p>
            </div>
            <div className={`${dataViewType === DataViewType.DUE_AMOUNT ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4`}>
              <p className={`text-sm ${dataViewType === DataViewType.DUE_AMOUNT ? 'text-purple-700' : 'text-blue-700'} font-medium`}>
                Total {dataViewType === DataViewType.DUE_AMOUNT ? 'Due' : 'Disbursed'} Amount
              </p>
              <p className={`text-2xl font-bold ${dataViewType === DataViewType.DUE_AMOUNT ? 'text-purple-900' : 'text-blue-900'} mt-1`}>
                ₹{formatIndianCurrency(totalAmount)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Non-Repayment Dates List */}
      <div className="bg-white rounded-lg border border-[var(--color-muted)] border-opacity-30 p-6">
        <h3 className="text-lg font-semibold text-[var(--color-on-background)] mb-4">
          Non-Repayment Dates for {selectedYear} {isSundayOff && "(Excluding Sundays)"}
        </h3>

        {filteredNonRepaymentDates.length === 0 ? (
          <p className="text-[var(--color-on-surface)] opacity-70 text-center py-8">
            {isSundayOff 
              ? `No non-repayment dates configured for ${selectedYear}. Click on calendar dates (except Sundays) to add them.`
              : `No non-repayment dates configured for ${selectedYear}. Click on calendar dates to add them.`}
          </p>
        ) : (
          <div className="space-y-3">
            {sortedNonRepaymentDates.map((date) => {
              const isSunday = dayjs(date.date).day() === 0;
              const dateKey = dayjs(date.date).format("YYYY-MM-DD");
              
              // Get data based on current view type
              let dataForDate;
              if (dataViewType === DataViewType.DUE_AMOUNT) {
                dataForDate = loanData.find(d => d.date === dateKey);
              } else {
                dataForDate = disbursementData.find(d => d.date === dateKey);
              }
              
              return (
                <div
                  key={date.id}
                  className={`flex items-center justify-between p-4 bg-[var(--color-background)] rounded-lg border ${isSunday && isSundayOff ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <HiOutlineCalendar className={`h-5 w-5 ${isSunday && isSundayOff ? 'text-gray-500' : 'text-[var(--color-on-error)]'}`} />
                    <div>
                      <p className="font-medium text-[var(--color-on-background)] flex items-center gap-2">
                        {dayjs(date.date).format("MMMM D, YYYY")}
                        {isSunday && isSundayOff && (
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full flex items-center gap-1">
                            <HiOutlineLockClosed className="h-3 w-3" />
                            Sunday
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-[var(--color-on-surface)] opacity-70">
                        {date.reason} •{" "}
                        {date.state === "all" 
                          ? "All States" 
                          : indianStatesWithCapitals.find((s) => s.value === date.state)?.label || date.state
                        }
                        {dataForDate && (
                          <span className="ml-2 text-xs">
                            • <span className={`${dataViewType === DataViewType.DUE_AMOUNT ? 'text-blue-600' : 'text-indigo-600'} font-medium`}>
                              {dataForDate.totalCases} {dataViewType === DataViewType.DUE_AMOUNT ? 'due' : 'disbursed'}
                            </span>
                            {" "}• <span className={`${dataViewType === DataViewType.DUE_AMOUNT ? 'text-green-600' : 'text-purple-600'} font-medium`}>
                              ₹{dataViewType === DataViewType.DUE_AMOUNT 
                                ? formatIndianCurrency((dataForDate as LoanData).totalAmount)
                                : formatIndianCurrency((dataForDate as DisbursementData).totalDisbursedAmount)
                              }
                            </span>
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(!isSunday || !isSundayOff) && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setModalMode("edit");
                            setEditingId(date.id);
                            setForm({
                              date: date.date,
                              reason: date.reason,
                              state: date.state,
                            });
                            setFormErrors({});
                            setIsModalOpen(true);
                          }}
                          leftIcon={<HiOutlinePencil className="h-4 w-4" />}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(date.id)}
                          leftIcon={<HiOutlineTrash className="h-4 w-4" />}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal for Add/Edit */}
      <Dialog
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title={
          modalMode === "add"
            ? "Add Non-Repayment Date"
            : "Edit Non-Repayment Date"
        }
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, date: e.target.value }))
            }
            error={formErrors.date}
            required
            fullWidth
            disabled={isSundayOff && dayjs(form.date).day() === 0}
            helperText={
              form.date && isSundayOff && dayjs(form.date).day() === 0
                ? "Sundays are automatically blocked for repayments when Sunday Off is enabled. Please select a different day."
                : ""
            }
          />

          <Textarea
            label="Reason"
            value={form.reason}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, reason: e.target.value }))
            }
            error={formErrors.reason}
            placeholder="Enter reason for non-repayment (e.g., National Holiday, Regional Festival)"
            required
            fullWidth
            rows={3}
          />

          <Select
            label="Applicable State"
            value={form.state}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, state: e.target.value }))
            }
            options={[
              { value: "all", label: "All States" },
              ...indianStatesWithCapitals,
            ]}
            error={formErrors.state}
            placeholder="Select applicable state"
            required
            fullWidth
          />

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleModalClose}
              disabled={saving}
            >
              Cancel
            </Button>

            {modalMode === "edit" && (
              <Button
                variant="danger"
                onClick={() => editingId && handleDelete(editingId)}
                disabled={saving}
                leftIcon={<HiOutlineTrash className="h-4 w-4" />}
              >
                Delete
              </Button>
            )}

            <Button
              variant="primary"
              onClick={handleSave}
              loading={saving}
              disabled={!!(form.date && isSundayOff && dayjs(form.date).day() === 0)}
              leftIcon={<FiSave className="h-4 w-4" />}
            >
              {modalMode === "add" ? "Add Date" : "Save Changes"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}