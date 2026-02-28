export const IndianStatesWithCapitals = [
  { value: "ANDHRA PRADESH", label: "Andhra Pradesh (Amaravati)", code: "AP" },
  {
    value: "ARUNACHAL PRADESH",
    label: "Arunachal Pradesh (Itanagar)",
    code: "AR",
  },
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
  {
    value: "ANDAMAN AND NICOBAR ISLANDS",
    label: "Andaman and Nicobar Islands (Port Blair)",
    code: "AN",
  },
  { value: "CHANDIGARH", label: "Chandigarh (Chandigarh)", code: "CH" },
  {
    value: "DADRA AND NAGAR HAVELI AND DAMAN AND DIU",
    label: "Dadra and Nagar Haveli and Daman and Diu (Daman)",
    code: "DN",
  },
  { value: "DELHI", label: "Delhi (New Delhi)", code: "DL" },
  {
    value: "JAMMU AND KASHMIR",
    label: "Jammu and Kashmir (Srinagar/Jammu)",
    code: "JK",
  },
  { value: "LADAKH", label: "Ladakh (Leh)", code: "LA" },
  { value: "LAKSHADWEEP", label: "Lakshadweep (Kavaratti)", code: "LD" },
  { value: "PUDUCHERRY", label: "Puducherry (Puducherry)", code: "PY" },
];
export function searchState(searchTerm: string): {
  value: string;
  label: string;
  code: string;
} {
  const lowerSearch = searchTerm.trim().toLowerCase();

  if (!lowerSearch) {
    // If search term is empty, return the first state as default
    return IndianStatesWithCapitals[0];
  }

  // 1. Look for exact code match
  const exactCodeMatch = IndianStatesWithCapitals.find(
    (state) => state.code.toLowerCase() === lowerSearch,
  );
  if (exactCodeMatch) {
    return exactCodeMatch;
  }

  // 2. Look for partial match in value, label, or code
  const partialMatch = IndianStatesWithCapitals.find(
    (state) =>
      state.value.toLowerCase().includes(lowerSearch) ||
      state.label.toLowerCase().includes(lowerSearch) ||
      state.code.toLowerCase().includes(lowerSearch),
  );
  if (partialMatch) {
    return partialMatch;
  }

  // 3. Fallback to first state if no match
  return IndianStatesWithCapitals[0];
}
