import { 
  IsString, 
  IsNumber, 
  IsArray, 
  ValidateNested, 
  IsDateString
} from 'class-validator';
import { Type } from 'class-transformer';
import { ActivityLogDto } from './activity-log.dto';

export class CreateActivityReportDto {
  @IsString()
  userId: string;

  @IsString()
  sessionId: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsNumber()
  totalEvents: number;

  @IsNumber()
  inactiveTimeMs: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivityLogDto)
  activityLogs: ActivityLogDto[];


  @IsArray()
  @IsString({ each: true })
  pageViews: string[];

  @IsString()
  userAgent: string;

  @IsString()
  screenResolution: string;
}

export class ActivityReportResponseDto {
  success: boolean;

  reportId: string;

  timestamp: number;

  error?: string;
}


