import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { BrandProviderType, BrandProviderName } from "@prisma/client";
import { BrandSettingAuditLogService } from "../common/brand-setting-audit-log.service";

@Injectable()
export class BrandProviderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: BrandSettingAuditLogService,
  ) {}

  async getBrandProvider(brandId: string, providerId: string) {
    const brandProvider = await this.prisma.brandProvider.findFirst({
      where: {
        id: providerId,
        brandId: brandId,
      },
    });

    if (!brandProvider) {
      throw new NotFoundException("Brand provider not found");
    }

    return brandProvider;
  }

  async getBrandProviders(brandId: string, includeInactive = false, type?: string) {
    const whereClause: any = {
      brandId: brandId,
    };

    // By default, only return active providers
    if (!includeInactive) {
      whereClause.isActive = true;
    }

    // Filter by type if provided
    if (type) {
      whereClause.type = type;
    }

    const brandProviders = await this.prisma.brandProvider.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
    });

    return brandProviders;
  }

  async createBrandProvider(
    brandId: string,
    providerData: {
      type: BrandProviderType;
      provider: BrandProviderName;
      isActive?: boolean;
      isDisabled?: boolean;
      isPrimary?: boolean;
    },
    performedByUserId: string,
  ) {
    try {
      if (!brandId) {
        throw new BadRequestException(
          "Brand ID is required to create a provider."
        );
      }

      if (!providerData) {
        throw new BadRequestException("Provider data must be provided.");
      }

      const { type, provider, isPrimary = false } = providerData;

      if (!type || !provider) {
        throw new BadRequestException(
          "Missing required fields: type and provider are mandatory."
        );
      }

      // Check if this exact provider already exists for this brand
      const existingProvider = await this.prisma.brandProvider.findUnique({
        where: {
          brandId_type_provider: {
            brandId,
            type,
            provider,
          },
        },
      });
      // If provider exists and is inactive, reactivate it instead of creating new one
      if (existingProvider) {
        if (!existingProvider.isActive) {
          // Reactivate the existing provider
          const reactivatedProvider = await this.prisma.brandProvider.update({
            where: { id: existingProvider.id },
            data: {
              isActive: true,
              isDisabled: providerData.isDisabled ?? false,
              isPrimary: isPrimary,
              updatedAt: new Date(),
            },
          });

          // Handle primary flag if needed
          if (isPrimary) {
            await this.prisma.brandProvider.updateMany({
              where: {
                brandId,
                type,
                isPrimary: true,
                id: { not: existingProvider.id },
              },
              data: {
                isPrimary: false,
              },
            });
          }

          // Audit logging
          await this.auditLogService.createAuditLog({
            brandId,
            settingType: "BRAND_PROVIDER",
            performedByPartnerId: performedByUserId,
            action: "CREATE",
            changes: providerData,
            status: "SUCCESS",
          });

          return reactivatedProvider;
        } else {
          // Provider exists and is active
          throw new BadRequestException(
            `Provider ${provider} of type ${type} already exists and is active for this brand.`
          );
        }
      }

      // If isPrimary is true, unset existing primary for this type
      if (isPrimary) {
        await this.prisma.brandProvider.updateMany({
          where: {
            brandId,
            type,
            isPrimary: true,
          },
          data: {
            isPrimary: false,
          },
        });
      }

      const brandProvider = await this.prisma.brandProvider.create({
        data: {
          brandId,
          type,
          provider,
          isActive: providerData.isActive ?? true,
          isDisabled: providerData.isDisabled ?? false,
          isPrimary,
        },
      });

      // Audit logging
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_PROVIDER",
        performedByPartnerId: performedByUserId,
        action: "CREATE",
        changes: providerData,
        status: "SUCCESS",
      });

      return brandProvider;
    } catch (error) {
      // Audit failure logging
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_PROVIDER",
        performedByPartnerId: performedByUserId,
        action: "CREATE",
        status: "FAILURE",
        errorMessage: error.message,
      });
      throw error;
    }
  }

  async updateBrandProvider(
    brandId: string,
    providerId: string,
    providerData: {
      type?: BrandProviderType;
      provider?: BrandProviderName;
      isActive?: boolean;
      isDisabled?: boolean;
      isPrimary?: boolean;
    },
    performedByUserId: string,
  ) {
    try {
      if (!brandId || !providerId) {
        throw new BadRequestException(
          "Both Brand ID and Provider ID are required."
        );
      }

      const existingProvider = await this.getBrandProvider(brandId, providerId);

      if (!existingProvider) {
        throw new NotFoundException("Brand provider not found.");
      }

      // If type or provider is being changed, check for conflicts
      const newType = providerData.type ?? existingProvider.type;
      const newProvider = providerData.provider ?? existingProvider.provider;

      if (
        (providerData.type && providerData.type !== existingProvider.type) ||
        (providerData.provider &&
          providerData.provider !== existingProvider.provider)
      ) {
        const conflictingProvider = await this.prisma.brandProvider.findFirst({
          where: {
            brandId,
            type: newType,
            provider: newProvider,
            id: { not: providerId },
          },
        });

        if (conflictingProvider) {
          throw new BadRequestException(
            `Provider ${newProvider} of type ${newType} already exists for this brand.`
          );
        }
      }

      // If isPrimary is being set to true, unset existing primary for this type
      if (providerData.isPrimary === true) {
        await this.prisma.brandProvider.updateMany({
          where: {
            brandId,
            type: newType,
            isPrimary: true,
            id: { not: providerId },
          },
          data: {
            isPrimary: false,
          },
        });
      }

      const updatedProvider = await this.prisma.brandProvider.update({
        where: { id: providerId },
        data: {
          type: newType,
          provider: newProvider,
          isActive: providerData.isActive ?? existingProvider.isActive,
          isDisabled: providerData.isDisabled ?? existingProvider.isDisabled,
          isPrimary: providerData.isPrimary ?? existingProvider.isPrimary,
          updatedAt: new Date(),
        },
      });

      // Audit logging
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_PROVIDER",
        performedByPartnerId: performedByUserId,
        action: "UPDATE",
        changes: providerData,
        status: "SUCCESS",
      });

      return updatedProvider;
    } catch (error) {
      // Audit failure logging
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_PROVIDER",
        performedByPartnerId: performedByUserId,
        action: "UPDATE",
        status: "FAILURE",
        errorMessage: error.message,
      });
      throw error;
    }
  }

  async deleteBrandProvider(brandId: string, providerId: string, performedByUserId: string) {
    try {
      if (!brandId || !providerId) {
        throw new BadRequestException(
          "Both Brand ID and Provider ID are required."
        );
      }

      const existingProvider = await this.getBrandProvider(brandId, providerId);

      if (!existingProvider) {
        throw new NotFoundException("Brand provider not found.");
      }

      // Soft delete by setting isActive to false
      await this.prisma.brandProvider.update({
        where: { id: providerId },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      // Audit logging
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_PROVIDER",
        performedByPartnerId: performedByUserId,
        action: "DELETE",
        changes: {
          providerId,
          provider: existingProvider.provider,
        },
        status: "SUCCESS",
      });

      return { message: "Brand provider deactivated successfully" };
    } catch (error) {
      // Audit failure logging
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_PROVIDER",
        performedByPartnerId: performedByUserId,
        action: "DELETE",
        status: "FAILURE",
        errorMessage: error.message,
      });
      throw error;
    }
  }

  async permanentlyDeleteBrandProvider(brandId: string, providerId: string) {
    if (!brandId || !providerId) {
      throw new BadRequestException(
        "Both Brand ID and Provider ID are required."
      );
    }

    const existingProvider = await this.getBrandProvider(brandId, providerId);

    if (!existingProvider) {
      throw new NotFoundException("Brand provider not found.");
    }

    // Hard delete - permanently remove from database
    await this.prisma.brandProvider.delete({
      where: { id: providerId },
    });

    return { message: "Brand provider permanently deleted successfully" };
  }
}
