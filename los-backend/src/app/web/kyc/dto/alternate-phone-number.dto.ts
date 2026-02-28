import { IsString, IsOptional, IsEnum } from "class-validator";
import { RelationshipEnum } from "@prisma/client";

export class CreateAlternatePhoneNumberDto {
  @IsString()
  userId: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  label: string;

  @IsOptional()
  @IsString()
  name: string;

  //RelationshipEnum
  @IsEnum(RelationshipEnum)
  relationship: RelationshipEnum;
}
export class UpdateAlternatePhoneNumberDto extends CreateAlternatePhoneNumberDto {}
