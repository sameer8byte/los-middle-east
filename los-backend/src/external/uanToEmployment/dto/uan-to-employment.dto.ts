import { IsString, IsNotEmpty, IsOptional, Matches, Length, IsUUID, IsDateString } from 'class-validator';

export class UanToEmploymentDto {
  @IsString()
  @IsOptional()
  @Length(12, 12, {
    message: 'UAN must be exactly 12 digits',
  })
  @Matches(/^\d{12}$/, {
    message: 'UAN must contain only 12 digits',
  })
  uan: string;

  @IsString()
  @IsOptional()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, {
    message: 'Invalid PAN format. It should be 10 characters (e.g., ABCDE1234F)',
  })
  pan?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Invalid mobile number format. It should be 10 digits starting with 6-9',
  })
  mobile?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{2}-\d{2}-\d{4}$/, {
    message: 'Date of birth should be in DD-MM-YYYY format',
  })
  dob?: string;

  @IsString()
  @IsOptional()
  employeeName?: string;

  @IsString()
  @IsOptional()
  groupId?: string;

  @IsString()
  @IsOptional()
  checkId?: string;

  @IsUUID()
  @IsOptional()
  userId?: string;
}
