import { IsString, IsInt, IsOptional } from "class-validator";

export class CreatePayslipDto {
  @IsString()
  userId: string;

  @IsString()
  employmentId: string;

  @IsInt()
  month: number;

  @IsInt()
  year: number;

  @IsString()
  filePrivateKey: string;

  @IsOptional()
  @IsString()
  fileName: string;

  @IsOptional()
  @IsString()
  filePassword: string;
}
