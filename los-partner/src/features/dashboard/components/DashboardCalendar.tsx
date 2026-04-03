import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  HiOutlineCalendar,
  HiOutlineLockClosed,
  HiOutlineCurrencyRupee,
} from "react-icons/hi";
import { Card, CardContent, CardHeader, CardTitle } from "../../../common/ui/card";
import { Spinner } from "../../../common/ui/spinner";
import { cn } from "../../../lib/utils";
import dayjs from "dayjs";
import { nonRepaymentDatesApi, NonRepaymentDateType } from "../../../shared/services/api/settings/nonRepaymentDates.api";
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

interface DashboardCalendarProps {
  query?: {
    period?: string;
    startDate?: string;
    endDate?: string;
  };
  loading?: boolean;
}

export function DashboardCalendar({ loading: externalLoading }: DashboardCalendarProps) {
  const { brandId } = useParams<{ brandId: string }>();
  const [selectedYear, setSelectedYear] = useState<string>(
    new Date().getFullYear().toString()
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth()
  );
  const [nonRepaymentDates, setNonRepaymentDates] = useState<NonRepaymentDate[]>([]);
  const [loanData, setLoanData] = useState<LoanData[]>([]);
  const [disbursementData, setDisbursementData] = useState<DisbursementData[]>([]);
  const [brandConfig, setBrandConfig] = useState<BrandConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(false);
  const [loanDataLoading, setLoanDataLoading] = useState(false);
  const [disbursementDataLoading, setDisbursementDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataViewType, setDataViewType] = useState<DataViewType>(DataViewType.DUE_AMOUNT);

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

  // const getNonRepaymentDate = (day: number) => {
  //   const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(
  //     2,
  //     "0"
  //   )}-${String(day).padStart(2, "0")}`;
    
  //   return nonRepaymentDates.find((d) => 
  //     formatDateForComparison(d.date) === dateStr && d.isActive
  //   );
  // };

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

  // const isSunday = (dayOfWeek: number) => {
  //   return dayOfWeek === 0; // Sunday is 0 in JavaScript
  // };

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

  const calendarDays = generateCalendarDays(
    Number.parseInt(selectedYear),
    selectedMonth
  );

  const filteredNonRepaymentDates = nonRepaymentDates.filter((date) => {
    const dateYear = dayjs(date.date).year().toString();
    return dateYear === selectedYear && date.isActive;
  });

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

  if (externalLoading || loading || configLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calendar View</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <Spinner />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            <div className="flex items-center gap-2">
              <HiOutlineCalendar className="w-5 h-5" />
              Calendar View
            </div>
          </CardTitle>
          <div className="flex gap-2">
            <button
              onClick={() => setDataViewType(DataViewType.DUE_AMOUNT)}
              className={`px-3 py-1 text-sm rounded-lg flex items-center gap-1 ${
                dataViewType === DataViewType.DUE_AMOUNT
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
              }`}
            >
              <HiOutlineCurrencyRupee className="w-4 h-4" />
              Due Amount
            </button>
            <button
              onClick={() => setDataViewType(DataViewType.DISBURSED_AMOUNT)}
              className={`px-3 py-1 text-sm rounded-lg flex items-center gap-1 ${
                dataViewType === DataViewType.DISBURSED_AMOUNT
                  ? 'bg-purple-100 text-purple-700 border border-purple-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
              }`}
            >
              <HiOutlineCurrencyRupee className="w-4 h-4" />
              Disbursed Amount
            </button>
          </div>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
            <div className="text-red-800 text-sm">{error}</div>
          </div>
        )}
        {isSundayOff && (
          <p className="text-sm text-blue-600 mt-1">
            <HiOutlineLockClosed className="inline h-4 w-4 mr-1" />
            Sundays are automatically blocked for repayments
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Month/Year Navigation */}
        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center gap-4">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {yearOptions.map((year) => (
                <option key={year.value} value={year.value}>
                  {year.label}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePreviousMonth}
                className="p-1 hover:bg-gray-200 rounded"
              >
                ←
              </button>
              <span className="text-md font-semibold min-w-[120px] text-center">
                {MONTHS[selectedMonth]} {selectedYear}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1 hover:bg-gray-200 rounded"
              >
                →
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(dataViewType === DataViewType.DUE_AMOUNT ? loanDataLoading : disbursementDataLoading) && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Spinner />
                <span>Loading data...</span>
              </div>
            )}
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 mb-3">
            {DAYS_OF_WEEK.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-bold text-gray-700 py-2 bg-white rounded-md border border-gray-200"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
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
                  return "Sundays are automatically blocked for repayments";
                }
                
                if (isNonRepayment) {
                  return `Non-repayment date`;
                }
                
                if (hasData) {
                  if (dataViewType === DataViewType.DUE_AMOUNT) {
                    const loanData = dataForDate as LoanData;
                    return `Due loans: ${loanData.totalCases} cases, BHD${formatIndianCurrency(loanData.totalAmount)}`;
                  } else {
                    const disbursementData = dataForDate as DisbursementData;
                    return `Disbursed loans: ${disbursementData.totalCases} cases, BHD${formatIndianCurrency(disbursementData.totalDisbursedAmount)}`;
                  }
                }
                
                return "No data";
              };

              return (
                <div
                  key={day}
                  className={cn(
                    "h-16 w-full rounded-md relative flex flex-col items-center justify-center",
                    isSundayBlocked
                      ? "bg-gradient-to-br from-gray-300 to-gray-400 border border-gray-500 opacity-60"
                      : isNonRepayment
                      ? "bg-gradient-to-br from-red-100 to-red-200 border border-red-400 ring-1 ring-red-300"
                      : hasData
                      ? dataViewType === DataViewType.DUE_AMOUNT
                        ? "bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-300 hover:bg-blue-200"
                        : "bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-300 hover:bg-purple-200"
                      : "bg-white border border-gray-200 hover:bg-gray-50"
                  )}
                  title={getTooltipText()}
                >
                  {/* Day number */}
                  <span
                    className={cn(
                      "text-xs font-medium relative z-10",
                      isNonRepayment
                        ? "text-red-900 font-bold"
                        : isSundayBlocked
                        ? "text-gray-700"
                        : hasData
                        ? "text-gray-900 font-bold"
                        : "text-gray-700"
                    )}
                  >
                    {day}
                  </span>

                  {/* Data summary based on view type */}
                  {hasData && dataForDate && (
                    <div className="text-[9px] font-medium mt-0.5 z-10 px-1 text-center">
                      <div className="leading-tight truncate w-full">
                        <span className={dataViewType === DataViewType.DUE_AMOUNT ? "text-blue-600" : "text-purple-600"}>
                          {dataForDate.totalCases}
                        </span>
                      </div>
                      <div className="leading-tight truncate w-full">
                        <span className={dataViewType === DataViewType.DUE_AMOUNT ? "text-green-600" : "text-indigo-600"}>
                          BHD{dataViewType === DataViewType.DUE_AMOUNT 
                            ? formatIndianCurrency((dataForDate as LoanData).totalAmount)
                            : formatIndianCurrency((dataForDate as DisbursementData).totalDisbursedAmount)
                          }
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Sunday lock icon */}
                  {isSundayBlocked && (
                    <div className="absolute top-0 right-0 z-20">
                      <div className="bg-gray-600 text-white rounded-bl-md rounded-tr-md p-0.5">
                        <HiOutlineLockClosed className="h-2 w-2" />
                      </div>
                    </div>
                  )}

                  {/* Non-repayment date icon */}
                  {isNonRepayment && !isSundayBlocked && (
                    <div className="absolute top-0 right-0 z-20">
                      <div className="bg-red-600 text-white rounded-bl-md rounded-tr-md p-0.5">
                        <HiOutlineCalendar className="h-2 w-2" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border border-gray-300 rounded-sm" />
            <span className="text-gray-700">Regular Date</span>
          </div>
          {isSundayOff && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-br from-gray-300 to-gray-400 border border-gray-500 rounded-sm" />
              <span className="text-gray-700">Sunday (Blocked)</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-br from-red-100 to-red-200 border border-red-400 rounded-sm" />
            <span className="text-gray-700">Non-Repayment Date</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-300 rounded-sm" />
            <span className="text-gray-700">Due Loans</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-300 rounded-sm" />
            <span className="text-gray-700">Disbursed Loans</span>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className={`${dataViewType === DataViewType.DUE_AMOUNT ? 'bg-blue-50 border-blue-200' : 'bg-purple-50 border-purple-200'} border rounded-lg p-3`}>
            <p className={`text-xs ${dataViewType === DataViewType.DUE_AMOUNT ? 'text-blue-700' : 'text-purple-700'} font-medium`}>
              Days with Data
            </p>
            <p className={`text-lg font-bold ${dataViewType === DataViewType.DUE_AMOUNT ? 'text-blue-900' : 'text-purple-900'} mt-1`}>
              {currentData.length}
            </p>
          </div>
          <div className={`${dataViewType === DataViewType.DUE_AMOUNT ? 'bg-green-50 border-green-200' : 'bg-indigo-50 border-indigo-200'} border rounded-lg p-3`}>
            <p className={`text-xs ${dataViewType === DataViewType.DUE_AMOUNT ? 'text-green-700' : 'text-indigo-700'} font-medium`}>
              Total Cases
            </p>
            <p className={`text-lg font-bold ${dataViewType === DataViewType.DUE_AMOUNT ? 'text-green-900' : 'text-indigo-900'} mt-1`}>
              {formatIndianCurrency(totalCases)}
            </p>
          </div>
          <div className={`${dataViewType === DataViewType.DUE_AMOUNT ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'} border rounded-lg p-3`}>
            <p className={`text-xs ${dataViewType === DataViewType.DUE_AMOUNT ? 'text-purple-700' : 'text-blue-700'} font-medium`}>
              Total Amount
            </p>
            <p className={`text-lg font-bold ${dataViewType === DataViewType.DUE_AMOUNT ? 'text-purple-900' : 'text-blue-900'} mt-1`}>
              BHD{formatIndianCurrency(totalAmount)}
            </p>
          </div>
        </div>

        {/* Non-Repayment Dates List */}
        {filteredNonRepaymentDates.length > 0 && (
          <div className="border rounded-lg p-3">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              Non-Repayment Dates ({filteredNonRepaymentDates.length})
            </h4>
            <div className="space-y-2">
              {filteredNonRepaymentDates.slice(0, 3).map((date) => {
                const isSunday = dayjs(date.date).day() === 0;
                return (
                  <div
                    key={date.id}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs"
                  >
                    <div className={`w-2 h-2 rounded-full ${isSunday ? 'bg-gray-500' : 'bg-red-500'}`} />
                    <span className="text-gray-700">
                      {dayjs(date.date).format("MMM D")}: {date.reason}
                    </span>
                  </div>
                );
              })}
              {filteredNonRepaymentDates.length > 3 && (
                <div className="text-xs text-gray-500 text-center">
                  + {filteredNonRepaymentDates.length - 3} more non-repayment dates
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}