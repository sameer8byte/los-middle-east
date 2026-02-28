import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { AuthType } from "src/common/decorators/auth.decorator";
import { GetPartnerUser } from "src/common/decorators/get-user.decorator";
import { AuthenticatedPartnerUser } from "src/common/types/partner-user.types";
import { AppearanceService } from "./appearance.setting.service";
import { UpdateAppearanceDto } from "./dto/update-appearance.dto";

@AuthType("partner")
@Controller("partner/brand/:brandId/settings/appearance")
export class AppearanceController {
  constructor(private readonly appearanceService: AppearanceService) {}

  // getAppearance
  @Get()
  async getAppearance(@Param("brandId") brandId: string) {
    return this.appearanceService.getAppearance(brandId);
  }
  // updateAppearance
  @Post("update")
  async updateAppearance(
    @Body() body: UpdateAppearanceDto,
    @Param("brandId") brandId: string,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.appearanceService.updateAppearance(
      brandId,
      partnerUser.id,
      body.primaryColor,
      body.secondaryColor,
      body.backgroundColor,
      body.surfaceColor,
      body.primaryTextColor,
      body.secondaryTextColor,
      body.successColor,
      body.warningColor,
      body.errorColor,
      body.fontFamily,
      body.baseFontSize,
      body.roundedCorners,
      body.darkMode,
      body.primaryHoverColor,
      body.primaryFocusColor,
      body.primaryActiveColor,
      body.primaryLightColor,
      body.primaryContrastColor,
      body.secondaryHoverColor,
      body.secondaryFocusColor,
      body.secondaryActiveColor,
      body.secondaryLightColor,
      body.secondaryContrastColor,
      body.surfaceTextColor,
      body.backgroundTextColor,
    );
  }
}
