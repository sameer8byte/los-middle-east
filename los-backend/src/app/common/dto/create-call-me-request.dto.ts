// src/dto/create-call-me-request.dto.ts
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from "class-validator";

export class CreateCallMeRequestDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsPhoneNumber("IN") // Replace 'IN' with the appropriate locale
  phoneNumber: string;

  @IsBoolean()
  @IsOptional()
  isResolved?: boolean = false;
}

export class UpdateCallMeRequestDto {
  @IsString()
  @IsNotEmpty()
  callMeRequestId: string;

  @IsBoolean()
  @IsOptional()
  isResolved?: boolean = false;
}
