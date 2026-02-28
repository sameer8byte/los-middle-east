import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import dayjs from "dayjs";
export function formatDate(date: Date | string): string {
  return dayjs(date).format("MMMM D, YYYY");
}
export function formatDateWithTime(date: Date | string |null): string {
  if (!date) return "N/A"; 
  return dayjs(date).format("MMMM D, YYYY h:mm A");
}

export function formatDocumentType(type: string) {
  return type
    ?.split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

export function maskAadhaar(aadhaar: string | number): string {
  const aadhaarStr = String(aadhaar).replace(/\D/g, ""); // Remove non-digits

  if (aadhaarStr.length !== 12) {
    return ""; // Invalid Aadhaar length
  }

  return `XXXX-XXXX-${aadhaarStr.slice(-4)}`;
}
export function maskPan(pan: string): string {
  if (!pan) return "";
  const panStr = String(pan).toUpperCase().trim();
  if (panStr.length !== 10) {
    return ""; 
  }
  const firstTwo = panStr.slice(0, 2); 
  const lastChar = panStr.slice(-1); 
  const maskedPart = "X".repeat(panStr.length - 3); 
  return `${firstTwo}${maskedPart}${lastChar}`;
}
