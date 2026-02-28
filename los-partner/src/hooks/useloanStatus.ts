// hooks/useLoanStatusInfo.ts
import { useMemo } from "react";
import { LoanStatusEnum } from "../constant/enum";
 
type ColorIntent = "success" | "danger" | "warning" | "info" | "neutral";
type StatusGroup = "pending" | "active" | "closed" | "rejected";

export type LoanStatusInfo = {
  /** A human-readable label for the status. */
  label: string;
  /** A semantic color category to map to your theme. */
  colorIntent: ColorIntent;
  /** A high-level group for filtering or logic. */
  group: StatusGroup;
};

const STATUS_MAP: Record<string, LoanStatusInfo> = {
  // Pending Group
  [LoanStatusEnum.PENDING]: { label: "Pending", colorIntent: "warning", group: "pending" },
  [LoanStatusEnum.CREDIT_EXECUTIVE_APPROVED]: { label: "Credit Exec. Approved", colorIntent: "warning", group: "pending" },
  [LoanStatusEnum.SANCTION_MANAGER_APPROVED]: { label: "Sanction Mgr. Approved", colorIntent: "warning", group: "pending" },
  [LoanStatusEnum.APPROVED]: { label: "Approved", colorIntent: "success", group: "pending" },

  // Active Group
  [LoanStatusEnum.DISBURSED]: { label: "Disbursed", colorIntent: "info", group: "active" },
  [LoanStatusEnum.ACTIVE]: { label: "Active", colorIntent: "info", group: "active" },
  [LoanStatusEnum.PARTIALLY_PAID]: { label: "Partially Paid", colorIntent: "info", group: "active" },
  [LoanStatusEnum.POST_ACTIVE]: { label: "Post Active", colorIntent: "info", group: "active" },

  // Active Problem Group
  // [LoanStatusEnum.OVERDUE]: { label: "Overdue", colorIntent: "warning", group: "active" },
  // [LoanStatusEnum.DEFAULTED]: { label: "Defaulted", colorIntent: "danger", group: "active" },
  [LoanStatusEnum.SETTLED]: { label: "Settled", colorIntent: "success", group: "closed" },
  [LoanStatusEnum.WRITE_OFF]: { label: "Write Off", colorIntent: "danger", group: "closed" },

  // Closed Good Group
  [LoanStatusEnum.PAID]: { label: "Paid", colorIntent: "success", group: "closed" },
  [LoanStatusEnum.COMPLETED]: { label: "Completed", colorIntent: "success", group: "closed" },

  // Rejected/Cancelled Group
  [LoanStatusEnum.REJECTED]: { label: "Rejected", colorIntent: "danger", group: "rejected" },
  [LoanStatusEnum.CANCELLED]: { label: "Cancelled", colorIntent: "neutral", group: "rejected" },
};

/**
 * Returns structured info about a loan status.
 */
export const useLoanStatusInfo = (status: LoanStatusEnum | string): LoanStatusInfo => {
  return useMemo(() => {
    if (status && STATUS_MAP[status]) return STATUS_MAP[status];

    // Fallback for unknown statuses
    const label = status ? String(status).replace(/_/g, " ").toLowerCase() : "Unknown";
    return {
      label: label.charAt(0).toUpperCase() + label.slice(1),
      colorIntent: "neutral",
      group: "closed",
    };
  }, [status]);
};
