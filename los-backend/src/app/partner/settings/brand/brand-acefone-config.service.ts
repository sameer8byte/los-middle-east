import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

interface BrandAcefoneConfig {
  id: string;
  brand_id: string;
  acefone_token: string;
  allowed_caller_ids: string[];
  metadata?: any;
  is_active: boolean;
  is_disabled: boolean;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class BrandAcefoneConfigService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get brand Acefone configuration
   */
  async getConfig(brandId: string): Promise<BrandAcefoneConfig> {
    const config = await this.prisma.brand_acefone_configs.findUnique({
      where: { brand_id: brandId },
    });

    if (!config) {
      throw new NotFoundException(
        "Acefone configuration not found for this brand"
      );
    }

    return {
      ...config,
      allowed_caller_ids: Array.isArray(config.allowed_caller_ids) 
        ? config.allowed_caller_ids as string[] 
        : [],
    } as BrandAcefoneConfig;
  }

  /**
   * Create or update brand Acefone configuration
   */
  async upsertConfig(
    brandId: string,
    data: {
      acefoneToken: string;
      allowedCallerIds?: string[];
      metadata?: any;
    }
  ): Promise<BrandAcefoneConfig> {
    if (!data.acefoneToken || data.acefoneToken.trim() === "") {
      throw new BadRequestException("Acefone token is required");
    }

    // Validate caller IDs if provided
    if (data.allowedCallerIds && Array.isArray(data.allowedCallerIds)) {
      for (const callerId of data.allowedCallerIds) {
        if (typeof callerId !== 'string' || callerId.trim() === "") {
          throw new BadRequestException(
            "All caller IDs must be non-empty strings"
          );
        }
      }
    }

    // Validate metadata if provided
    if (data.metadata && typeof data.metadata !== "object") {
      throw new BadRequestException("Metadata must be a valid JSON object");
    }

    const config = await this.prisma.brand_acefone_configs.upsert({
      where: { brand_id: brandId },
      update: {
        acefone_token: data.acefoneToken.trim(),
        allowed_caller_ids: data.allowedCallerIds !== undefined ? data.allowedCallerIds : undefined,
        metadata: data.metadata,
        updated_at: new Date(),
      },
      create: {
        brand_id: brandId,
        acefone_token: data.acefoneToken.trim(),
        allowed_caller_ids: data.allowedCallerIds || [],
        metadata: data.metadata,
      },
    });

    return {
      ...config,
      allowed_caller_ids: Array.isArray(config.allowed_caller_ids)
        ? config.allowed_caller_ids as string[]
        : [],
    } as BrandAcefoneConfig;
  }

  /**
   * Add a caller ID to the allowed list
   */
  async addCallerId(
    brandId: string,
    callerId: string
  ): Promise<BrandAcefoneConfig> {
    if (typeof callerId !== 'string' || callerId.trim() === "") {
      throw new BadRequestException("Caller ID must be a non-empty string");
    }

    const config = await this.prisma.brand_acefone_configs.findUnique({
      where: { brand_id: brandId },
    });

    if (!config) {
      throw new NotFoundException(
        "Acefone configuration not found for this brand"
      );
    }

    const currentIds = config.allowed_caller_ids;
    if (currentIds.includes(callerId)) {
      throw new BadRequestException("Caller ID already exists");
    }

    const updatedIds = [...currentIds, callerId];

    const updated = await this.prisma.brand_acefone_configs.update({
      where: { brand_id: brandId },
      data: {
        allowed_caller_ids: updatedIds,
        updated_at: new Date(),
      },
    });

    return updated as unknown as BrandAcefoneConfig;
  }

  /**
   * Remove a caller ID from the allowed list
   */
  async removeCallerId(
    brandId: string,
    callerId: string
  ): Promise<BrandAcefoneConfig> {
    const config = await this.prisma.brand_acefone_configs.findUnique({
      where: { brand_id: brandId },
    });

    if (!config) {
      throw new NotFoundException(
        "Acefone configuration not found for this brand"
      );
    }

    const currentIds = config.allowed_caller_ids;
    const updatedIds = currentIds.filter((id) => id !== callerId);

    const updated = await this.prisma.brand_acefone_configs.update({
      where: { brand_id: brandId },
      data: {
        allowed_caller_ids: updatedIds,
        updated_at: new Date(),
      },
    });

    return updated as unknown as BrandAcefoneConfig;
  }

  /**
   * Update metadata
   */
  async updateMetadata(
    brandId: string,
    metadata: any
  ): Promise<BrandAcefoneConfig> {
    if (metadata && typeof metadata !== "object") {
      throw new BadRequestException("Metadata must be a valid JSON object");
    }

    const config = await this.prisma.brand_acefone_configs.findUnique({
      where: { brand_id: brandId },
    });

    if (!config) {
      throw new NotFoundException(
        "Acefone configuration not found for this brand"
      );
    }

    const updated = await this.prisma.brand_acefone_configs.update({
      where: { brand_id: brandId },
      data: {
        metadata,
        updated_at: new Date(),
      },
    });

    return updated as unknown as BrandAcefoneConfig;
  }

  /**
   * Delete brand Acefone configuration
   */
  async deleteConfig(brandId: string): Promise<void> {
    await this.prisma.brand_acefone_configs.delete({
      where: { brand_id: brandId },
    });
  }
}
