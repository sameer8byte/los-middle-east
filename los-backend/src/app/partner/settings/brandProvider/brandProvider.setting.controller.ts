import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { AuthType } from "src/common/decorators/auth.decorator";
import { GetPartnerUser } from "src/common/decorators/get-user.decorator";
import { AuthenticatedPartnerUser } from "src/common/types/partner-user.types";
import { BrandProviderService } from "./brandProvider.setting.service";
import { CreateBrandProviderDto } from "./dto/create-brand-provider.dto";
import { UpdateBrandProviderDto } from "./dto/update-brand-provider.dto";

@AuthType("partner")
@Controller("partner/brand/:brandId/settings/brand-provider")
export class BrandProviderController {
  constructor(
    private readonly brandProviderService: BrandProviderService,
  ) {}

  @Get()
  async getBrandProviders(
    @Param("brandId") brandId: string,
    @Query("includeInactive") includeInactive?: string,
    @Query("type") type?: string,
  ) {
    const includeInactiveFlag = includeInactive === "true";
    return this.brandProviderService.getBrandProviders(brandId, includeInactiveFlag, type);
  }

  @Get(":providerId")
  async getBrandProvider(
    @Param("brandId") brandId: string,
    @Param("providerId") providerId: string,
  ) {
    return this.brandProviderService.getBrandProvider(brandId, providerId);
  }

  @Post()
  async createBrandProvider(
    @Param("brandId") brandId: string,
    @Body() providerData: CreateBrandProviderDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.brandProviderService.createBrandProvider(brandId, providerData, partnerUser.id);
  }

  @Put(":providerId")
  async updateBrandProvider(
    @Param("brandId") brandId: string,
    @Param("providerId") providerId: string,
    @Body() providerData: UpdateBrandProviderDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.brandProviderService.updateBrandProvider(
      brandId,
      providerId,
      providerData,
      partnerUser.id,
    );
  }

  @Delete(":providerId")
  async deleteBrandProvider(
    @Param("brandId") brandId: string,
    @Param("providerId") providerId: string,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.brandProviderService.deleteBrandProvider(brandId, providerId, partnerUser.id);
  }

  @Delete(":providerId/permanent")
  async permanentlyDeleteBrandProvider(
    @Param("brandId") brandId: string,
    @Param("providerId") providerId: string,
  ) {
    return this.brandProviderService.permanentlyDeleteBrandProvider(brandId, providerId);
  }
}
