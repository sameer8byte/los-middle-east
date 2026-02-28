import { IsString, IsOptional } from "class-validator";

export class CreatePayslipDto {
  @IsString()
  userId: string;

  @IsString()
  employmentId: string;

  @IsString()
  month: string;

  @IsString()
  year: string;

  @IsOptional()
  filePassword: string;
}
