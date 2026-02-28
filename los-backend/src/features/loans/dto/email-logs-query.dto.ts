import { IsOptional, IsString, IsBoolean, IsNumberString, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class EmailLogsQueryDto {
  @IsOptional()
  @IsString()
  loanId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  success?: boolean;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  all?: boolean;

  @IsOptional()
  @IsString()
  search?: string;
}
