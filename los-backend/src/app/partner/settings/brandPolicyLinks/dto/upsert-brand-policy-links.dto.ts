import { IsUrl, IsOptional } from "class-validator";

export class UpsertBrandPolicyLinksDto {
  @IsOptional()
  @IsUrl({}, { message: "termsConditionUrl must be a valid URL" })
  termsConditionUrl?: string;

  @IsOptional()
  @IsUrl({}, { message: "privacyPolicyUrl must be a valid URL" })
  privacyPolicyUrl?: string;

  @IsOptional()
  @IsUrl({}, { message: "faqUrl must be a valid URL" })
  faqUrl?: string;

  @IsOptional()
  @IsUrl({}, { message: "brandloanDetailsPolicyUrl must be a valid URL" })
  brandloanDetailsPolicyUrl?: string;
}
