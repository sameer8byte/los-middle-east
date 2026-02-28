import { IsString, IsNotEmpty, Matches, IsOptional } from 'class-validator';

export class BankAccountDto {
  @IsString()
  @IsNotEmpty()
  account_name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{9,18}$/, { message: 'Account number must be 9-18 digits' })
  account_number: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/, { message: 'Invalid IFSC code format' })
  ifsc_code: string;

  @IsString()
  @IsOptional()
  bank_name?: string;

  @IsString()
  @IsNotEmpty()
  account_type: string;
}
