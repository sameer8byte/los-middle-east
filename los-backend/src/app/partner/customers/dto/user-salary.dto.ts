import { IsNumber, IsString, IsDateString, IsOptional, Min, Max } from 'class-validator';

export class CreateUserSalaryDto {
  @IsNumber()
  @Min(1, { message: 'Salary amount must be greater than 0' })
  @Max(10000000, { message: 'Salary amount cannot exceed 10000000' })
  salary_amount: number;

  @IsDateString()
  salary_date: string; // YYYY-MM-DD format

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateUserSalaryDto extends CreateUserSalaryDto {}

export class UserSalaryResponseDto {
  id: string;
  user_id: string;
  partner_user_id: string;
  salary_amount: number;
  salary_date: string;
  salary_month?: number;
  salary_year?: number;
  notes?: string;
  created_at?: Date;
  updated_at?: Date;
}
