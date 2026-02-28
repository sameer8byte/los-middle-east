type LoanStatus =
  | "PENDING"
  | "APPROVED"
  | "DISBURSED"
  | "ACTIVE"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "DEFAULTED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED"
  | "POST_ACTIVE"
  | "CREDIT_EXECUTIVE_APPROVED"
  | "SANCTION_MANAGER_APPROVED"
  | "SETTLED"
  | "WRITE_OFF"
  | "ONBOARDING";

const validStatusTransitions: Record<LoanStatus, LoanStatus[]> = {
  PENDING: ["CREDIT_EXECUTIVE_APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["DISBURSED", "ACTIVE", "CANCELLED"],
  DISBURSED: ["ACTIVE"],
  ACTIVE: ["PARTIALLY_PAID", "PAID", "WRITE_OFF", "COMPLETED"],
  PARTIALLY_PAID: [
    "PAID",
    "PARTIALLY_PAID",
    "COMPLETED",
    "SETTLED",
    "WRITE_OFF",
  ],
  PAID: ["COMPLETED"],
  OVERDUE: ["PAID", "DEFAULTED"],
  DEFAULTED: [],
  REJECTED: ["PENDING"],
  CANCELLED: [],
  COMPLETED: [],
  POST_ACTIVE: ["PARTIALLY_PAID", "PAID", "WRITE_OFF", "COMPLETED"],
  CREDIT_EXECUTIVE_APPROVED: [
    "SANCTION_MANAGER_APPROVED",
    "APPROVED",
    "REJECTED",
  ],
  SANCTION_MANAGER_APPROVED: ["DISBURSED", "ACTIVE", "APPROVED"], // Allow sending back to CE
  SETTLED: [],
  WRITE_OFF: [],
  ONBOARDING: ["PENDING"],
};

export function canUpdateLoanStatus(
  currentStatus: LoanStatus,
  newStatus: LoanStatus
): boolean {
  const allowedNextStatuses = validStatusTransitions[currentStatus];
  return allowedNextStatuses.includes(newStatus);
}
