import { IsOptional, IsString, IsDateString, IsEmail } from "class-validator";

export class PartnerUserLoginReportQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEmail()
  userEmail?: string;
}

export class PartnerUserLoginReportResponseDto {
  userEmail: string;
  loginDate: string;
  totalSessions: number;
  firstLoginIST: string;
  lastLoginIST: string;
  sessions: string;
}

export class LoginSummaryStatsDto {
  totalUsers: number;
  totalSessions: number;
  uniqueLoginDates: number;
  dateRange: { start: string; end: string } | null;
}

export class ApiResponseDto<T> {
  success: boolean;
  data: T;
  meta: {
    totalRecords?: number;
    filters?: PartnerUserLoginReportQueryDto;
    reportDate?: string;
    generatedAt: string;
  };
}
