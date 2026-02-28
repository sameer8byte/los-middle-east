import { IsOptional, IsString, IsEmail } from 'class-validator';

export class CcReminderQueryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsEmail()
  userEmail?: string;

  @IsOptional()
  @IsString()
  brandId?: string;
}

export interface CcReminderReportData {
  userEmail: string;
  loginDate: string;
  totalSessions: number;
  firstLoginIST: string;
  lastLoginIST: string;
  sessions: string;
}

export interface CcReminderEmailData {
  subject: string;
  recipientEmails: string[];
  reportData: CcReminderReportData[];
  generatedAt: string;
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
}
