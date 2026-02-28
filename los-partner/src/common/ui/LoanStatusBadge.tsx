import React from "react";
import { LoanStatusInfo, useLoanStatusInfo } from "../../hooks/useloanStatus";
import { LoanStatusEnum } from "../../constant/enum";

type LoanStatusBadgeProps = {
  status: LoanStatusEnum | string;
  className?: string; // optional extra styles
};

const COLOR_CLASSES: Record<LoanStatusInfo["colorIntent"], string> = {
  success: "bg-green-100 text-green-800",
  danger: "bg-red-100 text-red-800",
  warning: "bg-yellow-100 text-yellow-800",
  info: "bg-blue-100 text-blue-800",
  neutral: "bg-gray-100 text-gray-800",
};

export const LoanStatusBadge: React.FC<LoanStatusBadgeProps> = ({
  status,
  className,
}) => {
  const statusInfo = useLoanStatusInfo(status);

  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
        COLOR_CLASSES[statusInfo.colorIntent]
      } ${className ?? ""}`}
    >
      {statusInfo.label}
    </span>
  );
};
