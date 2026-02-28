import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
} from "class-validator";

export class DigiLockerCallbackDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsString()
  @IsOptional()
  internalId?: string;

  @IsArray()
  @IsOptional()
  documents?: any[];

  @IsString()
  @IsOptional()
  error?: string;
}

