import { IsString, IsNotEmpty, IsDateString, IsOptional } from 'class-validator';

export class PersonalDetailsDto {
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsString()
  @IsOptional()
  middle_name?: string;

  @IsString()
  @IsNotEmpty()
  last_name: string;

  @IsDateString()
  @IsNotEmpty()
  dob: string;

  @IsString()
  @IsNotEmpty()
  father_name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  pincode: string;
}
