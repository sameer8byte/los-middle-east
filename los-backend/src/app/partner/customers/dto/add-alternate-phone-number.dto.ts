import { IsString, IsEnum, IsOptional } from "class-validator";
import { RelationshipEnum, VerificationType } from "@prisma/client";

export class AddAlternatePhoneNumberDto {
  @IsString()
  phone: string;

  @IsString()
  label: string;

  @IsString()
  name: string;

  @IsEnum(RelationshipEnum)
  relationship: RelationshipEnum;

  @IsOptional()
  @IsEnum(VerificationType)
  verificationType?: VerificationType;
}
