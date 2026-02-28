import { IsDateString, IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreatePartnerUnavailabilityDateDto {
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason: string;
}
