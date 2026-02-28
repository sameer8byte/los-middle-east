import { Transform } from "class-transformer";
import {
  IsInt,
  IsOptional,
  Min,
  Max,
  IsBoolean,
} from "class-validator";

export class GetPartnerUnavailabilityDatesQueryDto {
  @IsOptional()
  @IsInt()
  @Min(2020)
  @Max(2030)
  @Transform(({ value }) => Number.parseInt(value, 10))
  year?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return value.toLowerCase() === "true";
    }
    return value;
  })
  active?: boolean;
}
