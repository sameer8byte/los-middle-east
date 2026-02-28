import { IsString } from "class-validator";

export class GoogleLoginDto {
  @IsString()
  credentials: string;

  @IsString()
  brandId: string;

  @IsString()
  deviceId: string;

  @IsString()
  userId: string;
}
