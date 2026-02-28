import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
} from "class-validator";

/**
 * Signzy DigiLocker Callback DTO
 * Received when user completes Signzy DigiLocker verification
 */
export class SignzyCallbackDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  event?: string;

  @IsString()
  @IsNotEmpty()
  requestId?: string;

  @IsString()
  @IsNotEmpty()
  status: string; // "success" or "failure"

  @IsString()
  @IsOptional()
  timestamp?: number;

  @IsString()
  @IsOptional()
  internalId?: string;

  @IsArray()
  @IsOptional()
  documents?: any[];

  @IsString()
  @IsOptional()
  error?: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsOptional()
  aadharDetail?: {
    name?: string;
    uid?: string;
    dob?: string;
    gender?: string;
    address?: string;
    photo?: string;
    splitAddress?: {
      district?: string[];
      state?: Array<string[]>;
      city?: string[];
      pincode?: string;
      landmark?: string;
      country?: string[];
      addressLine?: string;
    };
    x509Data?: {
      certificate?: string;
      validAadhaarDSC?: string;
      details?: any;
    };
    xmlFileLink?: string;
    signatureData?: any;
  };

  @IsOptional()
  details?: {
    userDetails?: {
      digilockerid?: string;
      name?: string;
      dob?: string;
      gender?: string;
      eaadhaar?: string;
      mobile?: string;
    };
    files?: Array<{
      name?: string;
      type?: string;
      size?: string;
      date?: string;
      parent?: string;
      mime?: string[];
      doctype?: string;
      description?: string;
      issuerid?: string;
      issuer?: string;
      id?: string;
    }>;
  };
}

