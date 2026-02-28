import { IsString, IsNumber, IsOptional, IsDateString, IsIn } from 'class-validator';

export class ActivityLogDto {
  @IsDateString()
  timestamp: string;

  @IsString()
  @IsIn(['mouse', 'scroll', 'keyboard', 'click'])
  eventType: 'mouse' | 'scroll' | 'keyboard' | 'click';

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  pageUrl: string;

  @IsNumber()
  @IsOptional()
  scrollPosition?: number;

  @IsNumber()
  @IsOptional()
  mouseX?: number;

  @IsNumber()
  @IsOptional()
  mouseY?: number;
}


