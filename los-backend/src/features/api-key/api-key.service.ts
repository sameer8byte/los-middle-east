import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import * as crypto from "node:crypto";

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a secure API key with a prefix
   * @param prefix - Key prefix (e.g., 'lw' for Loanwalle)
   * @returns Generated API key
   */
  private generateApiKey(prefix: string = "lw"): string {
    const randomBytes = crypto.randomBytes(32).toString("hex");
    const timestamp = Date.now().toString(36);
    return `${prefix}_${timestamp}${randomBytes}`;
  }

  /**
   * Create a new API key for a brand
   * @param brandId - Brand ID
   * @param name - Human-readable name for the API key
   * @param description - Optional description
   * @param expiresAt - Optional expiration date
   * @returns Created API key object
   */
  async createApiKey(
    brandId: string,
    name: string,
    description?: string,
    expiresAt?: Date,
  ) {
    try {
      // Validate brand exists
      const brand = await this.prisma.brand.findUnique({
        where: { id: brandId },
      });

      if (!brand) {
        throw new BadRequestException("Brand not found");
      }

      const key = this.generateApiKey();

      const createdKey = await this.prisma.brand_api_keys.create({
        data: {
          brand_id: brandId,
          name,
          key,
          description,
          expires_at: expiresAt,
          is_active: true,
        },
      });

      this.logger.log(
        `API key created: ${name} for brand: ${brand.name}`,
      );

      return createdKey;
    } catch (error) {
      this.logger.error(`Failed to create API key: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all API keys for a brand (without exposing the actual keys)
   * @param brandId - Brand ID
   * @returns List of API keys (keys are masked)
   */
  async getApiKeysByBrand(brandId: string) {
    return await this.prisma.brand_api_keys.findMany({
      where: { brand_id: brandId },
      select: {
        id: true,
        name: true,
        description: true,
        is_active: true,
        last_used_at: true,
        expires_at: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { created_at: "desc" },
    });
  }

  /**
   * Get a single API key by ID (for admin/details view)
   * @param apiKeyId - API Key ID
   * @returns API key object with masked key
   */
  async getApiKeyById(apiKeyId: string) {
    const apiKey = await this.prisma.brand_api_keys.findUnique({
      where: { id: apiKeyId },
      include: { brand: true },
    });

    if (!apiKey) {
      throw new BadRequestException("API key not found");
    }

    return {
      ...apiKey,
      key: this.maskApiKey(apiKey.key),
    };
  }

  /**
   * Mask API key for display (show only last 4 characters)
   * @param key - API key to mask
   * @returns Masked API key
   */
  private maskApiKey(key: string): string {
    if (!key || key.length < 4) return "****";
    return `${key.substring(0, key.lastIndexOf("_") + 1)}****${key.slice(-4)}`;
  }

  /**
   * Revoke/disable an API key
   * @param apiKeyId - API Key ID
   * @returns Updated API key
   */
  async revokeApiKey(apiKeyId: string) {
    const apiKey = await this.prisma.brand_api_keys.findUnique({
      where: { id: apiKeyId },
    });

    if (!apiKey) {
      throw new BadRequestException("API key not found");
    }

    const updated = await this.prisma.brand_api_keys.update({
      where: { id: apiKeyId },
      data: { is_active: false },
    });

    this.logger.log(
      `API key revoked: ${apiKey.name}`,
    );

    return updated;
  }

  /**
   * Delete an API key permanently
   * @param apiKeyId - API Key ID
   * @returns Deleted API key
   */
  async deleteApiKey(apiKeyId: string) {
    const apiKey = await this.prisma.brand_api_keys.findUnique({
      where: { id: apiKeyId },
      include: { brand: true },
    });

    if (!apiKey) {
      throw new BadRequestException("API key not found");
    }

    const deleted = await this.prisma.brand_api_keys.delete({
      where: { id: apiKeyId },
    });

    this.logger.log(
      `API key deleted: ${apiKey.name} for brand: ${apiKey.brand.name}`,
    );

    return deleted;
  }

  /**
   * Rotate an API key (create new, disable old)
   * @param oldKeyId - Old API Key ID
   * @param newKeyName - Name for the new key
   * @returns New API key
   */
  async rotateApiKey(oldKeyId: string, newKeyName?: string) {
    // Get old key details
    const oldKey = await this.prisma.brand_api_keys.findUnique({
      where: { id: oldKeyId },
      include: { brand: true },
    });

    if (!oldKey) {
      throw new BadRequestException("API key not found");
    }

    // Disable old key
    await this.prisma.brand_api_keys.update({
      where: { id: oldKeyId },
      data: { is_active: false },
    });

    // Create new key
    const newKey = await this.createApiKey(
      oldKey.brand_id,
      newKeyName || `${oldKey.name} (rotated)`,
      `Rotated from key: ${oldKeyId}`,
      oldKey.expires_at,
    );

    this.logger.log(
      `API key rotated: ${oldKey.name} → ${newKey.name} for brand: ${oldKey.brand.name}`,
    );

    return newKey;
  }

  /**
   * Check if an API key is valid and active
   * @param key - API key string
   * @returns API key object if valid, null if invalid/inactive/expired
   */
  async validateApiKey(key: string) {
    const apiKey = await this.prisma.brand_api_keys.findUnique({
      where: { key },
      include: { brand: true },
    });

    if (!apiKey) {
      return null;
    }

    // Check if active
    if (!apiKey.is_active) {
      return null;
    }

    // Check if expired
    if (apiKey.expires_at && apiKey.expires_at < new Date()) {
      return null;
    }

    return apiKey;
  }

  /**
   * Update last used timestamp for an API key
   * @param apiKeyId - API Key ID
   */
  async updateLastUsed(apiKeyId: string) {
    await this.prisma.brand_api_keys.update({
      where: { id: apiKeyId },
      data: { last_used_at: new Date() },
    }).catch(() => {
      this.logger.warn(`Failed to update last_used_at for key: ${apiKeyId}`);
    });
  }

  /**
   * Get API key usage statistics
   * @param brandId - Brand ID
   * @returns Usage statistics
   */
  async getApiKeyStats(brandId: string) {
    const keys = await this.prisma.brand_api_keys.findMany({
      where: { brand_id: brandId },
    });

    const totalKeys = keys.length;
    const activeKeys = keys.filter((k) => k.is_active).length;
    const expiredKeys = keys.filter(
      (k) => k.expires_at && k.expires_at < new Date(),
    ).length;
    const unusedKeys = keys.filter((k) => k.last_used_at === null).length;

    const lastUsedKey = keys
      .filter((k) => k.last_used_at)
      .sort((a, b) => b.last_used_at.getTime() - a.last_used_at.getTime())
      .at(0);

    return {
      totalKeys,
      activeKeys,
      expiredKeys,
      unusedKeys,
      lastUsedKey: lastUsedKey
        ? {
            name: lastUsedKey.name,
            lastUsedAt: lastUsedKey.last_used_at,
          }
        : null,
    };
  }
}
