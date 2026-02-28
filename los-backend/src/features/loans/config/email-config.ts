import { Loan, loan_status_enum } from "@prisma/client";
import * as dayjs from "dayjs";

// Access the default function from the namespace import
const _dayjs = dayjs.default;

type EmailRule = {
  statuses: loan_status_enum[];
  condition: (dueDate: Date) => boolean;
  frequency: "once" | "daily";
  emailType: string;
  getSubject: (loan: Loan) => string;
  getBody: (loan: Loan) => string;
};

const emailRules: EmailRule[] = [
  {
    statuses: [loan_status_enum.ACTIVE, loan_status_enum.POST_ACTIVE],
    condition: (dueDate) => {
      const targetDate = _dayjs().add(7, "day").startOf("day");
      const dueDateDay = _dayjs(dueDate).startOf("day");
      return dueDateDay.isSame(targetDate, "day");
    },
    frequency: "once",
    emailType: "SEVEN_DAY_REMINDER",
    getSubject: (loan) => `Payment Due Soon - Loan ${loan.formattedLoanId}`,
    getBody: (loan) =>
      `Your payment for loan ${loan.formattedLoanId} is due in 7 days. Please ensure timely payment to avoid penalties.`,
  },
  {
    statuses: [loan_status_enum.ACTIVE, loan_status_enum.POST_ACTIVE],
    condition: (dueDate) => {
      const targetDate = _dayjs().add(3, "day").startOf("day");
      const dueDateDay = _dayjs(dueDate).startOf("day");
      return dueDateDay.isSame(targetDate, "day");
    },
    frequency: "once",
    emailType: "THREE_DAY_REMINDER",
    getSubject: (loan) => `Payment Due Soon - Loan ${loan.formattedLoanId}`,
    getBody: (loan) =>
      `Your payment for loan ${loan.formattedLoanId} is due in 3 days. Please ensure timely payment to avoid penalties.`,
  },
  {
    statuses: [loan_status_enum.ACTIVE, loan_status_enum.POST_ACTIVE],
    condition: (dueDate) => {
      const targetDate = _dayjs().add(1, "day").startOf("day");
      const dueDateDay = _dayjs(dueDate).startOf("day");
      return dueDateDay.isSame(targetDate, "day");
    },
    frequency: "once",
    emailType: "ONE_DAY_REMINDER",
    getSubject: (loan) => `Payment Due Soon - Loan ${loan.formattedLoanId}`,
    getBody: (loan) =>
      `Your payment for loan ${loan.formattedLoanId} is due in 1 day. Please ensure timely payment to avoid penalties.`,
  },
  {
    statuses: [loan_status_enum.ACTIVE, loan_status_enum.POST_ACTIVE],
    condition: (dueDate) => {
      return _dayjs().isAfter(_dayjs(dueDate), "day");
    },
    frequency: "daily",
    emailType: "DAILY_OVERDUE",
    getSubject: (loan) =>
      `URGENT: Overdue Payment - Loan ${loan.formattedLoanId}`,
    getBody: (loan) =>
      `Your payment for loan ${loan.formattedLoanId} is overdue. Please pay immediately to avoid penalties.`,
  },
];

export { emailRules };
