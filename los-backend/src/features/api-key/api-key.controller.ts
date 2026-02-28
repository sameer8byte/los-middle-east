import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { ApiKeyService } from "./api-key.service";
import { AuthGuard } from "../../common/guards/auth.guard";
import { AuthType } from "../../common/decorators/auth.decorator";
import { GetBrand } from "../../common/decorators/get-brand.decorator";

@Controller("partner/brand/:brandId/api-keys")
@UseGuards(AuthGuard)
@AuthType("partner")
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  /**
   * Create a new API key for the authenticated brand
   * POST /partner/brand/:brandId/api-keys
   */
  @Post()
  async createApiKey(
    @Param("brandId") paramBrandId: string,
    @GetBrand() brandId: string,
    @Body()
    createApiKeyDto: {
      name: string;
      description?: string;
      expiresAt?: string;
    },
  ) {
    const finalBrandId = brandId || paramBrandId;
    if (!finalBrandId) {
      throw new BadRequestException("Brand ID is required");
    }

    const expiresAt = createApiKeyDto.expiresAt
      ? new Date(createApiKeyDto.expiresAt)
      : undefined;

    return this.apiKeyService.createApiKey(
      finalBrandId,
      createApiKeyDto.name,
      createApiKeyDto.description,
      expiresAt,
    );
  }

  /**
   * Get all API keys for the authenticated brand (without exposing actual keys)
   * GET /partner/brand/:brandId/api-keys
   */
  @Get()
  async getApiKeys(
    @Param("brandId") paramBrandId: string,
    @GetBrand() brandId: string,
  ) {
    const finalBrandId = brandId || paramBrandId;
    if (!finalBrandId) {
      throw new BadRequestException("Brand ID is required");
    }

    return this.apiKeyService.getApiKeysByBrand(finalBrandId);
  }

  /**
   * Get a single API key by ID
   * GET /partner/brand/:brandId/api-keys/:apiKeyId
   */
  @Get(":apiKeyId")
  async getApiKey(
    @Param("brandId") paramBrandId: string,
    @GetBrand() brandId: string,
    @Param("apiKeyId") apiKeyId: string,
  ) {
    const finalBrandId = brandId || paramBrandId;
    if (!finalBrandId) {
      throw new BadRequestException("Brand ID is required");
    }

    const apiKey = await this.apiKeyService.getApiKeyById(apiKeyId);

    // Verify the API key belongs to the authenticated brand
    if (apiKey.brand_id !== finalBrandId) {
      throw new BadRequestException("Unauthorized access to this API key");
    }

    return apiKey;
  }

  /**
   * Revoke/disable an API key
   * PATCH /partner/brand/:brandId/api-keys/:apiKeyId/revoke
   */
  @Patch(":apiKeyId/revoke")
  async revokeApiKey(
    @Param("brandId") paramBrandId: string,
    @GetBrand() brandId: string,
    @Param("apiKeyId") apiKeyId: string,
  ) {
    const finalBrandId = brandId || paramBrandId;
    if (!finalBrandId) {
      throw new BadRequestException("Brand ID is required");
    }

    const apiKey = await this.apiKeyService.getApiKeyById(apiKeyId);

    // Verify the API key belongs to the authenticated brand
    if (apiKey.brand_id !== finalBrandId) {
      throw new BadRequestException("Unauthorized access to this API key");
    }

    return this.apiKeyService.revokeApiKey(apiKeyId);
  }

  /**
   * Rotate an API key (create new, disable old)
   * PATCH /partner/brand/:brandId/api-keys/:apiKeyId/rotate
   */
  @Patch(":apiKeyId/rotate")
  async rotateApiKey(
    @Param("brandId") paramBrandId: string,
    @GetBrand() brandId: string,
    @Param("apiKeyId") apiKeyId: string,
    @Body() body: { newKeyName?: string },
  ) {
    const finalBrandId = brandId || paramBrandId;
    if (!finalBrandId) {
      throw new BadRequestException("Brand ID is required");
    }

    const apiKey = await this.apiKeyService.getApiKeyById(apiKeyId);

    // Verify the API key belongs to the authenticated brand
    if (apiKey.brand_id !== finalBrandId) {
      throw new BadRequestException("Unauthorized access to this API key");
    }

    return this.apiKeyService.rotateApiKey(apiKeyId, body.newKeyName);
  }

  /**
   * Delete an API key permanently
   * DELETE /partner/brand/:brandId/api-keys/:apiKeyId
   */
  @Delete(":apiKeyId")
  async deleteApiKey(
    @Param("brandId") paramBrandId: string,
    @GetBrand() brandId: string,
    @Param("apiKeyId") apiKeyId: string,
  ) {
    const finalBrandId = brandId || paramBrandId;
    if (!finalBrandId) {
      throw new BadRequestException("Brand ID is required");
    }

    const apiKey = await this.apiKeyService.getApiKeyById(apiKeyId);

    // Verify the API key belongs to the authenticated brand
    if (apiKey.brand_id !== finalBrandId) {
      throw new BadRequestException("Unauthorized access to this API key");
    }

    return this.apiKeyService.deleteApiKey(apiKeyId);
  }

  /**
   * Get API key usage statistics for the authenticated brand
   * GET /partner/brand/:brandId/api-keys/stats/usage
   */
  @Get("stats/usage")
  async getApiKeyStats(
    @Param("brandId") paramBrandId: string,
    @GetBrand() brandId: string,
  ) {
    const finalBrandId = brandId || paramBrandId;
    if (!finalBrandId) {
      throw new BadRequestException("Brand ID is required");
    }

    return this.apiKeyService.getApiKeyStats(finalBrandId);
  }
}
