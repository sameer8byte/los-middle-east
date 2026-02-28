import { IsString, IsNumber, IsDateString } from 'class-validator';
export class CreateInactivityAlertDto {
  @IsString()
  userId: string;

  @IsNumber()
  inactiveTimeSeconds: number;

  @IsDateString()
  lastActivityTimestamp: string;

  @IsString()
  currentPage: string;
}

export class InactivityAlertResponseDto {
  success: boolean;

  alertId: string;

  timestamp: number;
}


