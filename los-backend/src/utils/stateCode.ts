export function stateCode(state: string): string | null {
  let lowerState = state.toUpperCase();

  const code = {
    "ANDHRA PRADESH": "AP",
    "ARUNACHAL PRADESH": "AR",
    ASSAM: "AS",
    BIHAR: "BR",
    CHHATTISGARH: "CG",
    GOA: "GA",
    GUJARAT: "GJ",
    HARYANA: "HR",
    "HIMACHAL PRADESH": "HP",
    JHARKHAND: "JH",
    KARNATAKA: "KA",
    KERALA: "KL",
    "MADHYA PRADESH": "MP",
    MAHARASHTRA: "MH",
    MANIPUR: "MN",
    MEGHALAYA: "ML",
    MIZORAM: "MZ",
    NAGALAND: "NL",
    ODISHA: "OR",
    PUNJAB: "PB",
    RAJASTHAN: "RJ",
    SIKKIM: "SK",
    "TAMIL NADU": "TN",
    TELANGANA: "TG",
    TRIPURA: "TR",
    "UTTAR PRADESH": "UP",
    UTTARAKHAND: "UK",
    "WEST BENGAL": "WB",

    // Union Territories
    "ANDAMAN AND NICOBAR ISLANDS": "AN",
    CHANDIGARH: "CH",
    "DADRA AND NAGAR HAVELI AND DAMAN AND DIU": "DN",
    DELHI: "DL",
    "JAMMU AND KASHMIR": "JK",
    LADAKH: "LA",
    LAKSHADWEEP: "LD",
    PUDUCHERRY: "PY",
  };

  return code[lowerState] || null;
}
