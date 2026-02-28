import { IsString, IsNotEmpty, IsOptional, Matches, Length, IsUUID } from 'class-validator';

export class PennyDropDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, {
    message: 'Invalid IFSC code format. It should be 11 characters (e.g., HDFC0001234)',
  })
  ifsc: string;

  @IsString()
  @IsNotEmpty()
  @Length(5, 20, {
    message: 'Account number must be between 5 and 20 characters',
  })
  accountNumber: string;

  @IsString()
  @IsOptional()
  beneficiaryName?: string;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsUUID()
  @IsOptional()
  userBankAccountId?: string;

  // @IsString()
  // @IsNotEmpty()
  // email: string;
}
