import { IsString, IsNotEmpty, Matches, IsIn } from 'class-validator';

export class InitialDetailsDto {
  @IsString()
  @IsIn(['salaried', 'self_employed'])
  employment_status: string;

  @IsString()
  @IsNotEmpty()
  monthly_salary: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/, { message: 'Invalid PAN card format' })
  pan_card: string;
}