import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Matches,
} from "class-validator";

/**
 * Unified DTO for DigiLocker operations
 * Used by both Signzy and Digitap providers
 */
export class CreateDigiLockerUrlDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  brandId: string;


  // optiona defaults false isCallbackRequired
  @IsOptional()
  isSkipRedirection?: boolean; 
  
  // @IsString()
  // @IsNotEmpty()
  // @Matches(/^\d{12}$/, {
  //   message: "Aadhaar number must be exactly 12 digits",
  // })
  // aadhaarNumber: string;
}

