import { IsUUID, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateLoanDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsNumber()
  @IsNotEmpty()
  requestAmount: number;

  @IsUUID()
  @IsNotEmpty()
  tenureId: string;

  @IsNotEmpty()
  purpose: string;

  // optional date
  @IsOptional()
  dueDate?: string;
}
