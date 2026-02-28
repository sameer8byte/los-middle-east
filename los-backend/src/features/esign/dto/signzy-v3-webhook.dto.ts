import { IsString, IsOptional, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class SignzyV3SignerDetailDto {
  @IsString()
  signerName: string;

  @IsOptional()
  @IsString()
  signerEmail?: string;

  @IsOptional()
  @IsString()
  signerMobile?: string;

  @IsOptional()
  @IsString()
  esignUrl?: string;

  @IsOptional()
  @IsString()
  signedAt?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class SignzyV3ContractWebhookDto {
  @IsString()
  contractId: string;

  @IsString()
  contractName: string;

  @IsString()
  contractStatus: string;

  @IsOptional()
  @IsString()
  contractCompletionTime?: string;

  @IsOptional()
  @IsString()
  eSignProvider?: string;

  @IsOptional()
  @IsString()
  contractTtl?: string;

  @IsOptional()
  @IsString()
  successRedirectUrl?: string;

  @IsOptional()
  @IsString()
  failureRedirectUrl?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SignzyV3SignerDetailDto)
  signerdetail?: SignzyV3SignerDetailDto[];

  @IsOptional()
  signedDocument?: {
    fileKey?: string;
    fileUrl?: string;
    [key: string]: any;
  };
}
