import { IsString, IsNumber, IsOptional, IsObject } from 'class-validator';

export class SaveCAMCalculatorDto {
  @IsString()
  loanId: string;

  @IsString()
  userId: string;

  @IsString()
  partnerUserId: string;

  // Salary Information
  @IsOptional()
  @IsString()
  salaryCreditDate1?: string;

  @IsOptional()
  @IsString()
  salaryCreditDate2?: string;

  @IsOptional()
  @IsString()
  salaryCreditDate3?: string;

  @IsOptional()
  @IsNumber()
  salaryAmount1?: number;

  @IsOptional()
  @IsNumber()
  salaryAmount2?: number;

  @IsOptional()
  @IsNumber()
  salaryAmount3?: number;

  @IsOptional()
  @IsString()
  nextPayDate?: string;

  @IsOptional()
  @IsNumber()
  salaryVariance?: number;

  @IsOptional()
  @IsNumber()
  actualSalary?: number;

  @IsOptional()
  @IsNumber()
  eligibleFoir?: number;

  @IsOptional()
  @IsNumber()
  loanApplied?: number;

  @IsOptional()
  @IsNumber()
  eligibleLoan?: number;

  @IsOptional()
  @IsNumber()
  loanRecommended?: number;

  // Repayment Details
  @IsOptional()
  @IsString()
  disbursalDate?: string;

  @IsOptional()
  @IsString()
  repayDate?: string;

  @IsOptional()
  @IsString()
  tenure?: string;

  @IsOptional()
  @IsString()
  tenureId?: string;

  // Calculations
  @IsOptional()
  @IsNumber()
  avgSalary?: number;

  @IsOptional()
  @IsNumber()
  foirAchieved?: number;

  @IsOptional()
  @IsNumber()
  proposedFoir?: number;

  @IsOptional()
  @IsNumber()
  roi?: number;

  @IsOptional()
  @IsNumber()
  obligations?: number;

  // Repayment Data (JSON)
  @IsOptional()
  @IsObject()
  repaymentData?: any;

  // Calculated Repayment Details (JSON)
  @IsOptional()
  @IsObject()
  repaymentDetails?: any;
}

export class GetCAMCalculatorDto {
  @IsString()
  loanId: string;
}
