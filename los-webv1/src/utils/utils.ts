import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import stringSimilarity from "string-similarity";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function maskAadhaar(aadhaarNumber: string): string {
  const clean = aadhaarNumber.replace(/\D/g, ''); // Remove non-digits
  if (clean.length !== 12) return 'Invalid Aadhaar';
  return `XXXX-XXXX-${clean.slice(-4)}`;
}
export function maskPAN(panNumber: string): string {
  const clean = panNumber?.trim()?.toUpperCase();
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(clean)) return 'Invalid PAN';
  return `XXXXX${clean.slice(5)}`;
}
// mask Account number
export function maskAccountNumber(accountNumber: string): string {
  const clean = accountNumber.replace(/\D/g, ''); // Remove non-digits
  if (clean.length < 4) return 'Invalid Account Number';  
  return `XXXX-XXXX-${clean.slice(-4)}`;
}


export const IndianStatesWithCapitals = [
  { value: "ANDHRA PRADESH", label: "Andhra Pradesh (Amaravati)", code: "AP" },
  { value: "ARUNACHAL PRADESH", label: "Arunachal Pradesh (Itanagar)", code: "AR" },
  { value: "ASSAM", label: "Assam (Dispur)", code: "AS" },
  { value: "BIHAR", label: "Bihar (Patna)", code: "BR" },
  { value: "CHHATTISGARH", label: "Chhattisgarh (Raipur)", code: "CG" },
  { value: "GOA", label: "Goa (Panaji)", code: "GA" },
  { value: "GUJARAT", label: "Gujarat (Gandhinagar)", code: "GJ" },
  { value: "HARYANA", label: "Haryana (Chandigarh)", code: "HR" },
  { value: "HIMACHAL PRADESH", label: "Himachal Pradesh (Shimla)", code: "HP" },
  { value: "JHARKHAND", label: "Jharkhand (Ranchi)", code: "JH" },
  { value: "KARNATAKA", label: "Karnataka (Bengaluru)", code: "KA" },
  { value: "KERALA", label: "Kerala (Thiruvananthapuram)", code: "KL" },
  { value: "MADHYA PRADESH", label: "Madhya Pradesh (Bhopal)", code: "MP" },
  { value: "MAHARASHTRA", label: "Maharashtra (Mumbai)", code: "MH" },
  { value: "MANIPUR", label: "Manipur (Imphal)", code: "MN" },
  { value: "MEGHALAYA", label: "Meghalaya (Shillong)", code: "ML" },
  { value: "MIZORAM", label: "Mizoram (Aizawl)", code: "MZ" },
  { value: "NAGALAND", label: "Nagaland (Kohima)", code: "NL" },
  { value: "ODISHA", label: "Odisha (Bhubaneswar)", code: "OR" },
  { value: "PUNJAB", label: "Punjab (Chandigarh)", code: "PB" },
  { value: "RAJASTHAN", label: "Rajasthan (Jaipur)", code: "RJ" },
  { value: "SIKKIM", label: "Sikkim (Gangtok)", code: "SK" },
  { value: "TAMIL NADU", label: "Tamil Nadu (Chennai)", code: "TN" },
  { value: "TELANGANA", label: "Telangana (Hyderabad)", code: "TS" },
  { value: "TRIPURA", label: "Tripura (Agartala)", code: "TR" },
  { value: "UTTAR PRADESH", label: "Uttar Pradesh (Lucknow)", code: "UP" },
  { value: "UTTARAKHAND", label: "Uttarakhand (Dehradun)", code: "UK" },
  { value: "WEST BENGAL", label: "West Bengal (Kolkata)", code: "WB" },

  // Union Territories
  { value: "ANDAMAN AND NICOBAR ISLANDS", label: "Andaman and Nicobar Islands (Port Blair)", code: "AN" },
  { value: "CHANDIGARH", label: "Chandigarh (Chandigarh)", code: "CH" },
  { value: "DADRA AND NAGAR HAVELI AND DAMAN AND DIU", label: "Dadra and Nagar Haveli and Daman and Diu (Daman)", code: "DN" },
  { value: "DELHI", label: "Delhi (New Delhi)", code: "DL" },
  { value: "JAMMU AND KASHMIR", label: "Jammu and Kashmir (Srinagar/Jammu)", code: "JK" },
  { value: "LADAKH", label: "Ladakh (Leh)", code: "LA" },
  { value: "LAKSHADWEEP", label: "Lakshadweep (Kavaratti)", code: "LD" },
  { value: "PUDUCHERRY", label: "Puducherry (Puducherry)", code: "PY" },
];


export type State = { value: string; capital?: string }; // Adjust to your type


export function findBestMatchingState(
  userState: string | undefined,
  states: State[],
  threshold = 0.6
): State | null {
  if (!userState) return null;

  const userStateUpper = userState.toUpperCase();
  const stateValues = states.map((s) => s.value.toUpperCase());

  const bestMatch = stringSimilarity.findBestMatch(userStateUpper, stateValues);

  if (bestMatch.bestMatch.rating >= threshold) {
    const matchedValue = bestMatch.bestMatch.target;
    return states.find((s) => s.value.toUpperCase() === matchedValue) || null;
  }

  return null;
}

type CustomParams = {
  platformType?: 'mobile-app' | 'web';
  lat?: string;
  lng?: string;
  [key: string]: string | undefined;
};

export function extractCustomParams(): CustomParams {
  const match = navigator.userAgent.match(/QuaLoanApp\/[\d\.]+ \(([^)]+)\)/);
  if (!match) return {};

  const paramsString = match[1]; 
  const params: CustomParams = {};

  paramsString.split(';').forEach(part => {
    const [key, value] = part.split('=').map(s => s.trim());
    if (key && value) {
      params[key] = value;
    }
  });

  return params;
}