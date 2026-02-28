import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthType } from "src/common/decorators/auth.decorator";
import { GetPartnerUser } from "src/common/decorators/get-user.decorator";
import { AuthenticatedPartnerUser } from "src/common/types/partner-user.types";
import { BrandEvaluationItemsService } from "./brand-evaluation-items.service";
import { CreateBrandEvaluationItemDto } from "./dto/create-brand-evaluation-item.dto";
import { UpdateBrandEvaluationItemDto } from "./dto/update-brand-evaluation-item.dto";
import { GetBrandEvaluationItemsQueryDto } from "./dto/get-brand-evaluation-items-query.dto";
import { BulkUploadBrandEvaluationItemsDto } from "./dto/bulk-upload-brand-evaluation-items.dto";

@AuthType("partner")
@Controller("partner/brand/:brandId/settings/brand-evaluation-items")
export class BrandEvaluationItemsController {
  constructor(
    private readonly brandEvaluationItemsService: BrandEvaluationItemsService,
  ) {}

  @Get()
  async getBrandEvaluationItems(
    @Param("brandId") brandId: string,
    @Query() query: GetBrandEvaluationItemsQueryDto,
  ) {
    return this.brandEvaluationItemsService.getBrandEvaluationItems(
      brandId,
      query,
    );
  }

  @Post()
  async createBrandEvaluationItem(
    @Param("brandId") brandId: string,
    @Body() createBrandEvaluationItemDto: CreateBrandEvaluationItemDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.brandEvaluationItemsService.createBrandEvaluationItem(
      brandId,
      createBrandEvaluationItemDto,
      partnerUser.id,
    );
  }

  @Get(":itemId")
  async getBrandEvaluationItem(
    @Param("brandId") brandId: string,
    @Param("itemId") itemId: string,
  ) {
    return this.brandEvaluationItemsService.getBrandEvaluationItem(
      brandId,
      itemId,
    );
  }

  @Put(":itemId")
  async updateBrandEvaluationItem(
    @Param("brandId") brandId: string,
    @Param("itemId") itemId: string,
    @Body() updateBrandEvaluationItemDto: UpdateBrandEvaluationItemDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.brandEvaluationItemsService.updateBrandEvaluationItem(
      brandId,
      itemId,
      updateBrandEvaluationItemDto,
      partnerUser.id,
    );
  }

  @Delete(":itemId")
  async deleteBrandEvaluationItem(
    @Param("brandId") brandId: string,
    @Param("itemId") itemId: string,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.brandEvaluationItemsService.deleteBrandEvaluationItem(
      brandId,
      itemId,
      partnerUser.id,
    );
  }

  @Post("bulk-upload/csv")
  @UseInterceptors(FileInterceptor("file"))
  async bulkUploadFromCsv(
    @Param("brandId") brandId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.brandEvaluationItemsService.bulkUploadFromCsv(brandId, file);
  }

  @Post("bulk-upload/json")
  async bulkUploadFromJson(
    @Param("brandId") brandId: string,
    @Body() bulkUploadDto: BulkUploadBrandEvaluationItemsDto,
  ) {
    return this.brandEvaluationItemsService.bulkUploadFromJson(
      brandId,
      bulkUploadDto,
    );
  }
}
