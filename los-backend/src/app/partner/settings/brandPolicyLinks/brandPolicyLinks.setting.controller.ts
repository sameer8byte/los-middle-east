import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { AuthType } from "src/common/decorators/auth.decorator";
import { GetPartnerUser } from "src/common/decorators/get-user.decorator";
import { AuthenticatedPartnerUser } from "src/common/types/partner-user.types";
import { BrandPolicyLinksSettingService } from "./brandPolicyLinks.setting.service";
import { UpsertBrandPolicyLinksDto } from "./dto/upsert-brand-policy-links.dto";

@AuthType("partner")
@Controller("partner/brand/:brandId/settings/brand-policy-links")
export class BrandPolicyLinksController {
  constructor(
    private readonly brandPolicyLinksService: BrandPolicyLinksSettingService,
  ) {}

  @Get()
  async getBrandPolicyLinks(@Param("brandId") brandId: string) {
    return this.brandPolicyLinksService.getBrandPolicyLinks(brandId);
  }
  @Post("upsert")
  async upsertBrandPolicyLinks(
    @Param("brandId") brandId: string,
    @Body() dto: UpsertBrandPolicyLinksDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.brandPolicyLinksService.upsertBrandPolicyLinks(
      brandId,
      {
        termsConditionUrl: dto.termsConditionUrl,
        privacyPolicyUrl: dto.privacyPolicyUrl,
        brandloanDetailsPolicyUrl: dto.brandloanDetailsPolicyUrl,
        faqUrl: dto.faqUrl,
      },
      partnerUser.id,
    );
  }
}

