import { IsNumber } from "class-validator";

export class UpdateGeolocationDto {
  @IsNumber()
  geoLatitude: number;

  @IsNumber()
  geoLongitude: number;
}
