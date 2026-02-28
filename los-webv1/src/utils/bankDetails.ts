export const Brand = {
  QUALOAN: 'qualoan',
  PAISAPOP: 'paisapop',
  MINUTESLOAN: 'minutesloan',
  FASTSALARY: 'fastsalary',
  ZEPTOFINANCE: 'zeptofinance',
  SALARY4SURE: 'salary4sure',
  DEFAULT: 'default'
} as const;

export type Brand = (typeof Brand)[keyof typeof Brand];

export interface BankDetails {
  bankName: string;
  companyName: string;
  accountNo: string;
  ifsc: string;
  branchAddress: string;
  accountType: string;
  upiId: string;
}

export const BANK_DETAILS_MAP: Record<Brand, BankDetails[]> = {
  [Brand.QUALOAN]: [
    {
      bankName: "HDFC BANK",
      companyName: "Naman Finlease Private Limited",
      accountNo: "50200105867815",
      ifsc: "HDFC0001203",
      branchAddress: "Greater Noida Branch, Gautam Buddha Nagar, 201308",
      accountType: "Current Account",
      upiId: "Pos.11360864@indus",
    },
  ],
  [Brand.PAISAPOP]: [
    {
      bankName: "ICICI BANK LTD",
      companyName: "M/S.IDF FINANCIAL SERVICES PRIVATE LIMITED",
      accountNo: "473205000225",
      ifsc: "ICIC0004732",
      branchAddress:
        "Chandra Mansion, 75 Vasavi Circle, Vv Puram, Basavangudi, Bangalore, Karnataka, 560004",
      accountType: "Current Account",
      upiId: "msidffinancialservicesprivatelimitedcollectionaccount.eazypay@icici",
    },
  ],
  [Brand.MINUTESLOAN]: [
    {
      bankName: "IDFC First Bank",
      companyName: "Minutes Loan Private Limited",
      accountNo: "51981198415",
      ifsc: "IDFB0020159",
      branchAddress: "UPPER GRND FLOOR, UNIT NO. 11,12,12A,14, PLOT NO. GH-001, CONVENIO-121, SECTOR 121, GBD NAGAR, NOIDA, UTTAR PRADESH 201301",
      accountType: "Current Account",
      upiId: "pawansutholding@idfcbank",
    },
  ],
  [Brand.FASTSALARY]: [
    {
      bankName: "",
      companyName: "",
      accountNo: "",
      ifsc: "",
      branchAddress: "",
      accountType: "",
      upiId: "",
    },
  ],
  [Brand.ZEPTOFINANCE]: [
    {
      bankName: "HDFC BANK",
      companyName: "Naman Finlease Private Limited",
      accountNo: "50200109628611",
      ifsc: "HDFC0001203",
      branchAddress: "MG Road, Near Dronacharya Metro Station, Sector 26, Gurgaon-122002, Haryana",
      accountType: "Current",
      upiId: " yespay.ypbsm000010976@yesbankltd",
    },
    {
      bankName: "IDFC BANK",
      companyName: "Naman Finlease Private Limited",
      accountNo: "10245891800",
      ifsc: "IDFB0020159",
      branchAddress: "Sector 121 Branch, Upper Ground Floor, Gautam Buddha Nagar - 201301",
      accountType: "Current",
      upiId: "nfpl@idfcbank",
    },
  ],
  [Brand.SALARY4SURE]: [
    {
      bankName: "IDFC First Bank",
      companyName: "Salary4Sure",
      accountNo: "10203973883",
      ifsc: "IDFB0020154",
      branchAddress: "Greater Noida Branch, Gautam Buddha Nagar, 201308",
      accountType: "Current",
      upiId: "pawansut3883@idfcbank",
    },
  ],
  [Brand.DEFAULT]: [
    {
      bankName: "",
      companyName: "",
      accountNo: "",
      ifsc: "",
      branchAddress: "",
      accountType: "",
      upiId: "",
    },
  ],
};

export const getCurrentBrand = (): Brand => {
  const domain = window.location.hostname;
  // Extract main domain by removing subdomains
  const domainParts = domain.split('.');
  const mainDomain = domainParts.slice(-2).join('.');

  if (mainDomain === "qualoan.com") return Brand.QUALOAN;
  if (mainDomain === "paisapop.com") return Brand.PAISAPOP;
  if (mainDomain === "minutesloan.com") return Brand.MINUTESLOAN;
  if (mainDomain === "fastsalary.com") return Brand.FASTSALARY;
  if (mainDomain === "salary4sure.com") return Brand.SALARY4SURE;
  if (mainDomain === "zeptofinance.com") return Brand.ZEPTOFINANCE;
  // if (mainDomain === "localhost") return Brand.ZEPTOFINANCE;

  return Brand.DEFAULT;
};

export const getBankDetails = (): BankDetails[] => {
  const brand = getCurrentBrand();
  return BANK_DETAILS_MAP[brand];
};
