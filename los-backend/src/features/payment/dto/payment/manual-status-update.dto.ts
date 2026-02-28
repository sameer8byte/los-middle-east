import { IsString, IsNotEmpty } from 'class-validator';

export class ManualStatusUpdateDto {
  @IsString()
  @IsNotEmpty()
  loanId: string;

  @IsString()
  @IsNotEmpty()
  newStatus: string;
}
