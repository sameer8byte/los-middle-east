import { IsOptional, IsString, IsBoolean, IsNumber } from "class-validator";
import { Transform, Type } from "class-transformer";

export class GetServiceRequestLogsQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  partnerUserId?: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @Transform(({ value }) => value === "true")
  @IsBoolean()
  success?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  take?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  skip?: number = 0;
}

export class GetServiceRequestLogStatsQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  partnerUserId?: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
