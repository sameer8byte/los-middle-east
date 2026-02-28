import { IsString, IsNotEmpty, IsOptional, Matches, Length, IsUUID } from 'class-validator';

export class PhoneToUanDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Invalid mobile number format. It should be 10 digits starting with 6-9',
  })
  mobileNumber: string;

  @IsString()
  @IsOptional()
  checkId?: string;

  @IsString()
  @IsOptional()
  groupId?: string;

  @IsUUID()
  @IsOptional()
  userId?: string;
}
