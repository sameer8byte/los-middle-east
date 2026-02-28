import {
  Injectable,
  NotFoundException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { BrandSettingAuditLogService } from "../common/brand-setting-audit-log.service";
import { CreateBrandCardDto } from "./dto/create-brand-card.dto";
import { UpdateBrandCardDto } from "./dto/update-brand-card.dto";
import { BrandCard } from "@prisma/client";

@Injectable()
export class BrandCardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly awsS3Service: AwsPublicS3Service,
    private readonly auditLogService: BrandSettingAuditLogService,
  ) {}

  async getBrandCards(brandId: string) {
    const brandCards = await this.prisma.brandCard.findMany({
      where: {
        brandId: brandId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return brandCards;
  }

  async createBrandCard(
    brandId: string,
    data: CreateBrandCardDto,
    performedByUserId: string,
    image?: Express.Multer.File,
  ): Promise<BrandCard> {
    try {
      let imageUrl = data.imageUrl;

      // If a file is uploaded, upload it to S3 and use the S3 URL
      if (image) {
        const uploadedUrl = await this.awsS3Service.uploadPublicFile(
          image,
          brandId,
          performedByUserId,
          "other-documents",
        );
        imageUrl = uploadedUrl;
      }

      const result = await this.prisma.brandCard.create({
        data: {
          title: data.title,
          description: data.description,
          imageUrl,
          brandId,
        },
      });

      // Audit logging
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_CARD",
        performedByPartnerId: performedByUserId,
        action: "CREATE",
        changes: {
          title: data.title,
          description: data.description,
          imageUrl,
        },
        status: "SUCCESS",
      });

      return result;
    } catch (error) {
      // Audit failure logging
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_CARD",
        performedByPartnerId: performedByUserId,
        action: "CREATE",
        status: "FAILURE",
        errorMessage: error.message,
      });
      console.error("Error creating brand card:", error);
      throw new HttpException(
        "Failed to create brand card",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateBrandCard(
    brandId: string,
    cardId: string,
    updateBrandCardDto: UpdateBrandCardDto,
    performedByUserId: string,
    image?: Express.Multer.File,
  ): Promise<BrandCard> {
    try {
      // Verify that the card exists and belongs to the brand
      const existingCard = await this.prisma.brandCard.findFirst({
        where: {
          id: cardId,
          brandId: brandId,
        },
      });

      if (!existingCard) {
        throw new NotFoundException(
          `Brand card with ID ${cardId} not found for brand ${brandId}`,
        );
      }

      let imageUrl = updateBrandCardDto.imageUrl;

      // If a file is uploaded, upload it to S3 and use the S3 URL
      if (image) {
        const uploadedUrl = await this.awsS3Service.uploadPublicFile(
          image,
          brandId,
          performedByUserId,
          "other-documents",
        );
        imageUrl = uploadedUrl;
      }

      const updatedCard = await this.prisma.brandCard.update({
        where: {
          id: cardId,
        },
        data: {
          ...(imageUrl && { imageUrl }),
          ...(updateBrandCardDto.title && { title: updateBrandCardDto.title }),
          ...(updateBrandCardDto.description && {
            description: updateBrandCardDto.description,
          }),
        },
      });

      // Audit logging
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_CARD",
        performedByPartnerId: performedByUserId,
        action: "UPDATE",
        changes: {
          title: updateBrandCardDto.title,
          description: updateBrandCardDto.description,
          imageUrl,
        },
        status: "SUCCESS",
      });

      return updatedCard;
    } catch (error) {
      // Audit failure logging
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_CARD",
        performedByPartnerId: performedByUserId,
        action: "UPDATE",
        status: "FAILURE",
        errorMessage: error.message,
      });
      throw error;
    }
  }

  async deleteBrandCard(brandId: string, cardId: string, performedByUserId: string) {
    try {
      // Verify that the card exists and belongs to the brand
      const existingCard = await this.prisma.brandCard.findFirst({
        where: {
          id: cardId,
          brandId: brandId,
        },
      });

      if (!existingCard) {
        throw new NotFoundException(
          `Brand card with ID ${cardId} not found for brand ${brandId}`,
        );
      }

      await this.prisma.brandCard.delete({
        where: {
          id: cardId,
        },
      });

      // Audit logging
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_CARD",
        performedByPartnerId: performedByUserId,
        action: "DELETE",
        changes: {
          cardId,
          title: existingCard.title,
        },
        status: "SUCCESS",
      });

      return { message: "Brand card deleted successfully" };
    } catch (error) {
      // Audit failure logging
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_CARD",
        performedByPartnerId: performedByUserId,
        action: "DELETE",
        status: "FAILURE",
        errorMessage: error.message,
      });
      throw error;
    }
  }

  async getBrandCard(brandId: string, cardId: string) {
    const brandCard = await this.prisma.brandCard.findFirst({
      where: {
        id: cardId,
        brandId: brandId,
      },
    });

    if (!brandCard) {
      throw new NotFoundException(
        `Brand card with ID ${cardId} not found for brand ${brandId}`,
      );
    }

    return brandCard;
  }
}
