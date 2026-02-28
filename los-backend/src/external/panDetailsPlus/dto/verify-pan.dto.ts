import {
  IsString,
  IsNotEmpty,
  Matches,
  IsOptional,
  IsUUID,
  IsBoolean,
} from "class-validator";

export class VerifyPanDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, {
    message: "Invalid PAN format. Expected format: ABCDE1234F",
  })
  pan: string;

  @IsUUID()
  // @IsOptional()
  userId: string;

  @IsBoolean()
  @IsOptional()
  shouldUpsert?: boolean = true;
}

export class VerifyPanWithFallbackDto extends VerifyPanDto {
  @IsString()
  @IsOptional()
  primaryProvider?: "digitap" | "scoreMe";


  @IsBoolean()
  @IsOptional()
  shouldUpsert?: boolean = true;
}
