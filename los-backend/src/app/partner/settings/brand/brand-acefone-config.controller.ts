import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Patch,
} from "@nestjs/common";
import { AuthType } from "src/common/decorators/auth.decorator";
import { BrandAcefoneConfigService } from "./brand-acefone-config.service";

@AuthType("partner")
@Controller("partner/brand/:brandId/acefone-config")
export class BrandAcefoneConfigController {
  constructor(
    private readonly brandAcefoneConfigService: BrandAcefoneConfigService
  ) {}

  @Get()
  async getConfig(@Param("brandId") brandId: string): Promise<any> {
    return this.brandAcefoneConfigService.getConfig(brandId);
  }

  @Put()
  async upsertConfig(
    @Param("brandId") brandId: string,
    @Body()
    body: {
      acefoneToken: string;
      allowedCallerIds?: string[];
      metadata?: any;
    }
  ): Promise<any> {
    return this.brandAcefoneConfigService.upsertConfig(brandId, body);
  }

  @Post("caller-ids")
  async addCallerId(
    @Param("brandId") brandId: string,
    @Body() body: { callerId: string }
  ): Promise<any> {
    return this.brandAcefoneConfigService.addCallerId(
      brandId,
      body.callerId
    );
  }

  @Delete("caller-ids/:callerId")
  async removeCallerId(
    @Param("brandId") brandId: string,
    @Param("callerId") callerId: string
  ): Promise<any> {
    return this.brandAcefoneConfigService.removeCallerId(
      brandId,
      callerId
    );
  }

  @Patch("metadata")
  async updateMetadata(
    @Param("brandId") brandId: string,
    @Body() body: { metadata: any }
  ): Promise<any> {
    return this.brandAcefoneConfigService.updateMetadata(
      brandId,
      body.metadata
    );
  }

  @Delete()
  async deleteConfig(@Param("brandId") brandId: string): Promise<{ success: boolean }> {
    await this.brandAcefoneConfigService.deleteConfig(brandId);
    return { success: true };
  }
}
