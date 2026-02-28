import * as crypto from "crypto";
import * as dayjs from "dayjs";



// Access the default function from the namespace import
const _dayjs = dayjs.default;
export function getDateFilter(filter: string[]) {
  // Build date filter
  const dateFilter = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (filter.includes("today")) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    dateFilter["gte"] = today;
    dateFilter["lt"] = tomorrow;
  }
  if (filter.includes("yesterday")) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    dateFilter["gte"] = yesterday;
    dateFilter["lt"] = today;
  }
  if (filter.includes("last_7_days")) {
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);
    dateFilter["gte"] = last7Days;
  }
  if (filter.includes("last_30_days")) {
    const last30Days = new Date(today);
    last30Days.setDate(last30Days.getDate() - 30);
    dateFilter["gte"] = last30Days;
  }
  if (filter.includes("last_90_days")) {
    const last90Days = new Date(today);
    last90Days.setDate(last90Days.getDate() - 90);
    dateFilter["gte"] = last90Days;
  }

  // Handle custom date range [startDate, endDate]
  if (filter.length === 2 && filter[0] && filter[1]) {
    const startDate = new Date(filter[0]);
    const endDate = new Date(filter[1]);
    
    // Validate dates
    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      dateFilter["gte"] = startDate;
      dateFilter["lte"] = endDate;
    }
  }

  return dateFilter;
}

export function generateReceiptId() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const prefix = `${letters.charAt(crypto.randomInt(0, 26))}${letters.charAt(crypto.randomInt(0, 26))}`;
  const randomPart = crypto.randomInt(100000, 999999); // Secure 6-digit random number
  return `${prefix}${randomPart}`;
}
// Default format: "MMMM D, YYYY" (e.g., July 21, 2025)
export function formatDate(
  date: Date | string | null | undefined,
  format: string = "MMMM D, YYYY",
): string {
  // Return empty string for null/undefined dates
  if (!date) return "";
  
  const parsedDate = _dayjs(date);
  
  // Check if date is invalid
  if (!parsedDate.isValid()) return "";
  
  return parsedDate.format(format);
}
