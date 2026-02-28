import { IsOptional, IsBoolean } from "class-validator";
import { CreatePartnerUnavailabilityDateDto } from "./create-partner-unavailability-date.dto";

export class UpdatePartnerUnavailabilityDateDto extends CreatePartnerUnavailabilityDateDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
