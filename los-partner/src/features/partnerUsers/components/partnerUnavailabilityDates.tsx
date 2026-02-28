import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  HiOutlineCalendar,
  HiOutlineTrash,
  HiOutlinePencil,
} from "react-icons/hi2";
import { FiSave } from "react-icons/fi";
import { Button } from "../../../common/ui/button";
import { Input, Textarea, Select } from "../../../common/ui/input";
import { Spinner } from "../../../common/ui/spinner";
import Dialog from "../../../common/dialog";
import { cn } from "../../../lib/utils";
import dayjs from "dayjs";
import { partnerUnavailabilityDatesApi } from "../../../shared/services/api/settings/partnerUnavailabilityDates.api";
import { getBrandUsers } from "../../../shared/services/api/partner-user.api";

// Types
interface PartnerUnavailabilityDate {
  id: string;
  date: string;
  reason: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PartnerUnavailabilityDateForm {
  date: string;
  reason: string;
}

interface PartnerUser {
  id: string;
  name: string;
  email: string;
}

// Constants
const YEARS_TO_GENERATE = 6;
const MAX_USERS_TO_FETCH = 1000;
const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Utility functions
const formatDateString = (year: string, month: number, day: number): string => {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: YEARS_TO_GENERATE }, (_, i) => {
    const year = currentYear + i;
    return { value: year.toString(), label: year.toString() };
  });
};

const generateCalendarDays = (year: number, month: number): (number | null)[] => {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days: (number | null)[] = new Array(startingDayOfWeek).fill(null);
  
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  return days;
};

export default function PartnerUnavailabilityDates() {
  const { brandId } = useParams<{ brandId: string }>();
  
  // State management
  const [selectedPartnerUserId, setSelectedPartnerUserId] = useState<string>("");
  const [partnerUsers, setPartnerUsers] = useState<PartnerUser[]>([]);
  const [unavailabilityDates, setUnavailabilityDates] = useState<PartnerUnavailabilityDate[]>([]);
  
  const [selectedYear, setSelectedYear] = useState<string>(
    new Date().getFullYear().toString()
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth()
  );
  
  // Loading states
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [form, setForm] = useState<PartnerUnavailabilityDateForm>({
    date: "",
    reason: "",
  });
  const [formErrors, setFormErrors] = useState<Partial<PartnerUnavailabilityDateForm>>({});

  // Memoized values
  const yearOptions = useMemo(() => generateYearOptions(), []);

  const unavailabilityDateMap = useMemo(() => {
    const map = new Map<string, PartnerUnavailabilityDate>();
    for (const date of unavailabilityDates) {
      if (date.isActive) {
        map.set(date.date, date);
      }
    }
    return map;
  }, [unavailabilityDates]);

  const calendarDays = useMemo(
    () => generateCalendarDays(Number.parseInt(selectedYear, 10), selectedMonth),
    [selectedYear, selectedMonth]
  );

  const filteredUnavailabilityDates = useMemo(() => {
    return unavailabilityDates.filter((date) => {
      const dateYear = dayjs(date.date).year().toString();
      return dateYear === selectedYear && date.isActive;
    });
  }, [unavailabilityDates, selectedYear]);

  const sortedUnavailabilityDates = useMemo(() => {
    return [...filteredUnavailabilityDates].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [filteredUnavailabilityDates]);

  const partnerUserOptions = useMemo(() => {
    return partnerUsers.map((user) => ({
      value: user.id,
      label: `${user.name} (${user.email})`,
    }));
  }, [partnerUsers]);

  const selectedUser = useMemo(() => {
    return partnerUsers.find((u) => u.id === selectedPartnerUserId);
  }, [partnerUsers, selectedPartnerUserId]);

  // Callbacks
  const fetchPartnerUsers = useCallback(async () => {
    if (!brandId) return;
    
    setLoadingUsers(true);
    setError(null);
    try {
      const response = await getBrandUsers(brandId, { 
        page: 1, 
        limit: MAX_USERS_TO_FETCH, 
        dateFilter: "" 
      });
      const users = response.users.map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
      }));
      setPartnerUsers(users);
    } catch (err) {
      const errorMessage = "Failed to fetch partner users. Please try again.";
      setError(errorMessage);
      console.error("Error fetching partner users:", err);
    } finally {
      setLoadingUsers(false);
    }
  }, [brandId]);

  const fetchUnavailabilityDates = useCallback(async () => {
    if (!selectedPartnerUserId) {
      setUnavailabilityDates([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await partnerUnavailabilityDatesApi.getUnavailabilityDates(
        selectedPartnerUserId,
        {
          year: Number.parseInt(selectedYear, 10),
          active: "true",
        }
      );
      setUnavailabilityDates(data || []);
    } catch (err) {
      const errorMessage = "Failed to fetch unavailability dates. Please try again.";
      setError(errorMessage);
      console.error("Error fetching unavailability dates:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedPartnerUserId, selectedYear]);

  const isDateUnavailable = useCallback((day: number): boolean => {
    const dateStr = formatDateString(selectedYear, selectedMonth, day);
    return unavailabilityDateMap.has(dateStr);
  }, [selectedYear, selectedMonth, unavailabilityDateMap]);

  const getUnavailabilityDate = useCallback((day: number): PartnerUnavailabilityDate | undefined => {
    const dateStr = formatDateString(selectedYear, selectedMonth, day);
    return unavailabilityDateMap.get(dateStr);
  }, [selectedYear, selectedMonth, unavailabilityDateMap]);

  const validateForm = useCallback((): boolean => {
    const errors: Partial<PartnerUnavailabilityDateForm> = {};

    if (!form.date) {
      errors.date = "Date is required";
    }

    if (!form.reason.trim()) {
      errors.reason = "Reason is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form]);

  const resetForm = useCallback(() => {
    setForm({ date: "", reason: "" });
    setFormErrors({});
    setEditingId(null);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    resetForm();
  }, [resetForm]);

  const handleDateClick = useCallback((day: number) => {
    const dateStr = formatDateString(selectedYear, selectedMonth, day);
    const existingDate = getUnavailabilityDate(day);

    if (existingDate) {
      setModalMode("edit");
      setEditingId(existingDate.id);
      setForm({
        date: existingDate.date,
        reason: existingDate.reason,
      });
    } else {
      setModalMode("add");
      setEditingId(null);
      setForm({
        date: dateStr,
        reason: "",
      });
    }

    setFormErrors({});
    setIsModalOpen(true);
  }, [selectedYear, selectedMonth, getUnavailabilityDate]);

  const handleSave = useCallback(async () => {
    if (!validateForm() || !selectedPartnerUserId) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (modalMode === "add") {
        const newDate = await partnerUnavailabilityDatesApi.createUnavailabilityDate(
          selectedPartnerUserId,
          {
            date: form.date,
            reason: form.reason.trim(),
          }
        );
        setUnavailabilityDates((prev) => [...prev, newDate]);
      } else if (modalMode === "edit" && editingId) {
        const updatedDate = await partnerUnavailabilityDatesApi.updateUnavailabilityDate(
          selectedPartnerUserId,
          editingId,
          {
            date: form.date,
            reason: form.reason.trim(),
          }
        );
        setUnavailabilityDates((prev) =>
          prev.map((d) => (d.id === editingId ? updatedDate : d))
        );
      }

      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      const errorMessage = `Failed to ${modalMode === "add" ? "add" : "update"} unavailability date. Please try again.`;
      setError(errorMessage);
      console.error(`Error ${modalMode === "add" ? "creating" : "updating"} unavailability date:`, err);
    } finally {
      setSaving(false);
    }
  }, [validateForm, selectedPartnerUserId, modalMode, editingId, form, resetForm]);

  const handleDelete = useCallback(async (id: string) => {
    if (!selectedPartnerUserId) return;
    
    if (!globalThis.confirm("Are you sure you want to delete this unavailability date?")) {
      return;
    }

    setDeleting(id);
    setError(null);
    try {
      await partnerUnavailabilityDatesApi.deleteUnavailabilityDate(selectedPartnerUserId, id);
      setUnavailabilityDates((prev) => prev.filter((d) => d.id !== id));
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      const errorMessage = "Failed to delete unavailability date. Please try again.";
      setError(errorMessage);
      console.error("Error deleting unavailability date:", err);
    } finally {
      setDeleting(null);
    }
  }, [selectedPartnerUserId, resetForm]);

  const handleMonthChange = useCallback((direction: "prev" | "next") => {
    setSelectedMonth((prev) => {
      if (direction === "prev") {
        return prev > 0 ? prev - 1 : 11;
      }
      return prev < 11 ? prev + 1 : 0;
    });
  }, []);

  // Effects
  useEffect(() => {
    fetchPartnerUsers();
  }, [fetchPartnerUsers]);

  useEffect(() => {
    fetchUnavailabilityDates();
  }, [fetchUnavailabilityDates]);

  // Memoized button text
  const saveButtonText = useMemo(() => {
    if (saving) {
      return modalMode === "add" ? "Adding..." : "Saving...";
    }
    return modalMode === "add" ? "Add Date" : "Save Changes";
  }, [saving, modalMode]);

  // Render loading state
  if (loadingUsers) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-96 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Dropdown Skeleton */}
        <div className="bg-white rounded-lg border border-[var(--color-muted)] border-opacity-30 p-6">
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Content Skeleton */}
        <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-muted)] border-opacity-30 p-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="h-16 w-16 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-on-background)]">
            Partner Unavailability Dates
          </h2>
          <p className="text-[var(--color-on-surface)] opacity-70 mt-1">
            Manage dates when partner users are unavailable
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-[var(--color-error)] bg-opacity-10 border border-[var(--color-error)] border-opacity-30 rounded-lg p-4">
          <p className="text-[var(--color-on-error)]">{error}</p>
        </div>
      )}

      {/* Partner User Selection */}
      <div className="bg-white rounded-lg border border-[var(--color-muted)] border-opacity-30 p-6">
        <Select
          label="Select Partner User"
          value={selectedPartnerUserId}
          onChange={(e) => setSelectedPartnerUserId(e.target.value)}
          options={partnerUserOptions}
          placeholder="Choose a partner user to manage their unavailability..."
          fullWidth
          disabled={loading}
        />
        {selectedUser && (
          <div className="flex items-center gap-2 mt-2">
            <p className="text-sm text-[var(--color-on-surface)] opacity-70">
              Managing unavailability for: <span className="font-semibold">{selectedUser.name}</span>
            </p>
            {loading && (
              <Spinner />
            )}
          </div>
        )}
      </div>

      {/* No User Selected State */}
      {!selectedPartnerUserId && (
        <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-muted)] border-opacity-30 p-12">
          <div className="text-center">
            <HiOutlineCalendar className="h-16 w-16 text-[var(--color-on-surface)] opacity-30 mx-auto mb-4" />
            <p className="text-[var(--color-on-surface)] opacity-70 text-lg mb-2">
              No Partner User Selected
            </p>
            <p className="text-sm text-[var(--color-on-surface)] opacity-50">
              Please select a partner user from the dropdown above to manage their unavailability dates
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {selectedPartnerUserId && loading && (
        <div className="bg-white rounded-lg border border-[var(--color-muted)] border-opacity-30 p-6">
          {/* Year and Month Selection Skeleton */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-40">
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-7 w-32 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-10 w-10 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>

          {/* Calendar Skeleton */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-[var(--color-muted)] border-opacity-30">
            {/* Days of week */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {Array.from({ length: 7 }, (_, i) => (
                <div key={`dow-${i + 1}`} className="h-12 bg-white rounded-lg animate-pulse"></div>
              ))}
            </div>
            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }, (_, i) => (
                <div key={`cd-${i + 1}`} className="h-12 bg-white rounded-lg animate-pulse"></div>
              ))}
            </div>
          </div>

          {/* Legend Skeleton */}
          <div className="flex items-center gap-6 mt-6 p-4 bg-[var(--color-surface)] rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar and List View */}
      {selectedPartnerUserId && !loading && (
        <>
          {/* Year and Month Selection */}
          <div className="bg-white rounded-lg border border-[var(--color-muted)] border-opacity-30 p-6">
            <div className="flex items-center gap-4 mb-6">
              <Select
                label="Select Year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                options={yearOptions}
                className="w-40"
                disabled={loading || saving}
              />

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleMonthChange("prev")}
                  aria-label="Previous month"
                  disabled={loading || saving}
                >
                  ←
                </Button>
                <span className="text-lg font-semibold min-w-[120px] text-center">
                  {MONTHS[selectedMonth]}
                </span>
                <Button
                  variant="outline"
                  onClick={() => handleMonthChange("next")}
                  aria-label="Next month"
                  disabled={loading || saving}
                >
                  →
                </Button>
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
                {calendarDays.map((day, index) => {
                  if (day === null) {
                    return (
                      <div
                        key={`empty-${selectedYear}-${selectedMonth}-${index}`}
                        className="h-12"
                      />
                    );
                  }

                  const isUnavailable = isDateUnavailable(day);
                  const unavailabilityDate = getUnavailabilityDate(day);

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDateClick(day)}
                      disabled={loading || saving || deleting !== null}
                      className={cn(
                        "h-12 w-full rounded-lg text-sm font-medium transition-all duration-200 relative group",
                        "focus:outline-none focus:ring-2 focus:ring-[#EA5E18] focus:ring-offset-1",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        isUnavailable
                          ? "bg-gradient-to-br from-orange-200 to-orange-300 text-orange-950 border-2 border-orange-500 shadow-lg hover:from-orange-300 hover:to-orange-400 hover:shadow-xl transform hover:scale-105 ring-2 ring-orange-400 ring-opacity-50"
                          : "bg-white text-[var(--color-on-surface)] opacity-80 border border-[var(--color-muted)] border-opacity-30 hover:bg-[var(--color-primary)] bg-opacity-10 hover:border-blue-300 hover:text-[var(--color-on-primary)] hover:shadow-md transform hover:scale-105"
                      )}
                      title={
                        isUnavailable
                          ? `Unavailable: ${unavailabilityDate?.reason} - Click to update`
                          : `Click to mark as unavailable`
                      }
                    >
                      <span
                        className={cn(
                          "relative z-10",
                          isUnavailable && "font-bold"
                        )}
                      >
                        {day}
                      </span>
                      {isUnavailable && (
                        <>
                          <div className="absolute -top-1 -right-1 z-20">
                            <div className="bg-orange-600 text-white rounded-full p-1">
                              <HiOutlineCalendar className="h-3 w-3" />
                            </div>
                          </div>
                          <div className="absolute inset-0 bg-[var(--color-warning)] bg-opacity-100 opacity-10 rounded-lg animate-pulse"></div>
                        </>
                      )}

                      {isUnavailable && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-600 rounded-b-lg opacity-80"></div>
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
                  <span className="text-xs font-medium text-[var(--color-on-surface)] opacity-70">15</span>
                </div>
                <span className="text-[var(--color-on-surface)] opacity-80 font-medium">Available Date</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gradient-to-br from-orange-200 to-orange-300 border-2 border-orange-500 rounded-lg flex items-center justify-center relative ring-2 ring-orange-400 ring-opacity-50">
                  <span className="text-xs font-bold text-orange-950">15</span>
                  <div className="absolute -top-1 -right-1">
                    <div className="bg-orange-600 text-white rounded-full p-0.5">
                      <HiOutlineCalendar className="h-2 w-2" />
                    </div>
                  </div>
                </div>
                <span className="text-[var(--color-on-surface)] opacity-80 font-medium">
                  Unavailable Date (Click to Update)
                </span>
              </div>
              <div className="ml-auto text-xs text-[var(--color-on-surface)] opacity-70">
                Click on any date to mark as unavailable or update
              </div>
            </div>
          </div>

          {/* Unavailability Dates List */}
          <div className="bg-white rounded-lg border border-[var(--color-muted)] border-opacity-30 p-6">
            <h3 className="text-lg font-semibold text-[var(--color-on-background)] mb-4">
              Unavailability Dates for {selectedYear}
            </h3>

            {filteredUnavailabilityDates.length === 0 ? (
              <p className="text-[var(--color-on-surface)] opacity-70 text-center py-8">
                No unavailability dates configured for {selectedYear}. Click on
                calendar dates to add them.
              </p>
            ) : (
              <div className="space-y-3">
                {sortedUnavailabilityDates.map((date) => (
                  <div
                    key={date.id}
                    className="flex items-center justify-between p-4 bg-[var(--color-background)] rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <HiOutlineCalendar className="h-5 w-5 text-[var(--color-warning)]" />
                      <div>
                        <p className="font-medium text-[var(--color-on-background)]">
                          {dayjs(date.date).format("MMMM D, YYYY")}
                        </p>
                        <p className="text-sm text-[var(--color-on-surface)] opacity-70">
                          {date.reason}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDateClick(dayjs(date.date).date())}
                        leftIcon={<HiOutlinePencil className="h-4 w-4" />}
                        disabled={deleting === date.id || saving}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(date.id)}
                        leftIcon={<HiOutlineTrash className="h-4 w-4" />}
                        loading={deleting === date.id}
                        disabled={deleting !== null || saving}
                      >
                        {deleting === date.id ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal for Add/Edit */}
      <Dialog
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title={
          modalMode === "add"
            ? "Add Unavailability Date"
            : "Edit Unavailability Date"
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
            disabled={saving}
          />

          <Textarea
            label="Reason"
            value={form.reason}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, reason: e.target.value }))
            }
            error={formErrors.reason}
            placeholder="Enter reason for unavailability (e.g., Vacation, Medical Leave, Training)"
            required
            fullWidth
            rows={3}
            disabled={saving}
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
                loading={deleting === editingId}
                disabled={saving || deleting !== null}
                leftIcon={<HiOutlineTrash className="h-4 w-4" />}
              >
                {deleting === editingId ? "Deleting..." : "Delete"}
              </Button>
            )}

            <Button
              variant="primary"
              onClick={handleSave}
              loading={saving}
              disabled={deleting !== null}
              leftIcon={<FiSave className="h-4 w-4" />}
            >
              {saveButtonText}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
