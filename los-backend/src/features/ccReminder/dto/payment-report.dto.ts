import { IsOptional, IsString, IsEnum } from 'class-validator';

export class PaymentReportQueryDto {
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
  @IsEnum(['yesterday', 'today', 'last7days', 'last30days', 'all'])
  dateFilter?: 'yesterday' | 'today' | 'last7days' | 'last30days' | 'all';
}

export interface PaymentReportData {
  paymentId: string;
  loanId: string;
  formattedLoanId: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  brandName: string;
  loanAmount: number;
  paymentAmount: number;
  paymentDate: string;
  paymentMethod: string;
  paymentStatus: string;
  transactionId: string | null;
  gatewayResponse: any;
  loanStatus: string;
  disbursementDate: string;
  dueDate: string;
  createdAt: string;
}

export class DisbursedLoanReportQueryDto {
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
  @IsEnum(['yesterday', 'today', 'last7days', 'last30days', 'all'])
  dateFilter?: 'yesterday' | 'today' | 'last7days' | 'last30days' | 'all';
}

export interface DisbursedLoanReportData {
  loanId: string;
  formattedLoanId: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  brandName: string;
  amount: number;
  status: string;
  disbursementDate: string;
  disbursementTime: string;
  dueDate: string;
  purpose: string | null;
  createdAt: string;
}
