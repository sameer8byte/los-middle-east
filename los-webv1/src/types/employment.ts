export interface Employment {
  id: string;
  userId: string;
  companyName: string;
  officialEmail: string | null;
  designation: string | null;
  joiningDate: Date | null;
  salary: number | null;
  companyAddress: string | null;
  pinCode: string | null;
  uanNumber: string | null;
  expectedDateOfSalary: number | null;
  modeOfSalary: ModeOfSalary | null;
  salaryExceedsBase: boolean;
}

export interface SalarySlipEntry {
  id: boolean;
  userId: boolean;
  employmentId: boolean;
  month: boolean;
  year: boolean;
  filePrivateKey: boolean;
  fileName: boolean;
  uploadedAt: boolean;
  createdAt: boolean;
  updatedAt: boolean;
}

export enum ModeOfSalary {
  BANK_TRANSFER = "BANK_TRANSFER",
  CASH = "CASH",
  CHEQUE = "CHEQUE",
  OTHER = "OTHER",
}
