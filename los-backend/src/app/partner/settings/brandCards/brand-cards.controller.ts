import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthType } from "src/common/decorators/auth.decorator";
import { GetPartnerUser } from "src/common/decorators/get-user.decorator";
import { AuthenticatedPartnerUser } from "src/common/types/partner-user.types";
import { BrandCardsService } from "./brand-cards.service";
import { CreateBrandCardDto } from "./dto/create-brand-card.dto";
import { UpdateBrandCardDto } from "./dto/update-brand-card.dto";

@AuthType("partner")
@Controller("partner/brand/:brandId/settings/brand-cards")
export class BrandCardsController {
  constructor(private readonly brandCardsService: BrandCardsService) {}

  @Get()
  async getBrandCards(@Param("brandId") brandId: string) {
    return this.brandCardsService.getBrandCards(brandId);
  }

  @Post()
  @UseInterceptors(FileInterceptor("image"))
  async createBrandCard(
    @Param("brandId") brandId: string,
    @Body() createBrandCardDto: CreateBrandCardDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
    @UploadedFile() imageFile?: Express.Multer.File,
  ) {
    return this.brandCardsService.createBrandCard(
      brandId,
      createBrandCardDto,
      partnerUser.id,
      imageFile,
    );
  }

  @Get(":cardId")
  async getBrandCard(
    @Param("brandId") brandId: string,
    @Param("cardId") cardId: string,
  ) {
    return this.brandCardsService.getBrandCard(brandId, cardId);
  }

  @Put(":cardId")
  @UseInterceptors(FileInterceptor("image"))
  async updateBrandCard(
    @Param("brandId") brandId: string,
    @Param("cardId") cardId: string,
    @Body() updateBrandCardDto: UpdateBrandCardDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
    @UploadedFile() imageFile?: Express.Multer.File,
  ) {
    return this.brandCardsService.updateBrandCard(
      brandId,
      cardId,
      updateBrandCardDto,
      partnerUser.id,
      imageFile,
    );
  }

  @Delete(":cardId")
  async deleteBrandCard(
    @Param("brandId") brandId: string,
    @Param("cardId") cardId: string,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.brandCardsService.deleteBrandCard(brandId, cardId, partnerUser.id);
  }
}
