import { IsOptional, IsString, IsEnum } from 'class-validator';

export class LoanReportQueryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsEnum(['today', 'yesterday', 'tomorrow', 'all'])
  dueDateFilter?: 'today' | 'yesterday' | 'tomorrow' | 'all';
}

export interface LoanReportData {
  loanId: string;
  formattedLoanId: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  brandName: string;
  amount: number;
  amountDue: number;
  status: string;
  disbursementDate: string | null;
  dueDate: string;
  daysToDue: number;
  repaymentStatus: string;
  isOverdue: boolean;
  createdAt: string;
}

export interface CombinedReportData {
  loginReport: {
    userEmail: string;
    loginDate: string;
    totalSessions: number;
    firstLoginIST: string;
    lastLoginIST: string;
    sessions: string;
  }[];
  loanReport: LoanReportData[];
  summary: {
    totalLogins: number;
    totalLoans: number;
    todayDueLoans: number;
    yesterdayDueLoans: number;
    tomorrowDueLoans: number;
    overdueLoans: number;
  };
}
