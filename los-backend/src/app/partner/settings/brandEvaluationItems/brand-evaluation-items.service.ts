import {
  Injectable,
  NotFoundException,
  HttpException,
  HttpStatus,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateBrandEvaluationItemDto } from "./dto/create-brand-evaluation-item.dto";
import { UpdateBrandEvaluationItemDto } from "./dto/update-brand-evaluation-item.dto";
import { GetBrandEvaluationItemsQueryDto } from "./dto/get-brand-evaluation-items-query.dto";
import { BulkUploadBrandEvaluationItemsDto } from "./dto/bulk-upload-brand-evaluation-items.dto";
import { brand_evaluation_items } from "@prisma/client";
import { BrandSettingAuditLogService } from "../common/brand-setting-audit-log.service";


@Injectable()
export class BrandEvaluationItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: BrandSettingAuditLogService,
  ) {}

  async getBrandEvaluationItems(
    brandId: string,
    query: GetBrandEvaluationItemsQueryDto,
  ) {
    const whereClause: any = {
      brandId: brandId,
    };

    if (query.stage) {
      whereClause.stage = query.stage;
    }

    if (query.isActive !== undefined) {
      whereClause.isActive = query.isActive;
    }

    if (query.parameter) {
      whereClause.parameter = {
        contains: query.parameter,
        mode: "insensitive",
      };
    }

    const items = await this.prisma.brand_evaluation_items.findMany({
      where: whereClause,
      orderBy: [
        { priority: "asc" },
        { createdAt: "desc" },
      ],
    });

    return items;
  }

  async createBrandEvaluationItem(
    brandId: string,
    data: CreateBrandEvaluationItemDto,
    performedByUserId: string,
  ): Promise<brand_evaluation_items> {
    try {
      // Check if parameter already exists for this brand
      const existingItem = await this.prisma.brand_evaluation_items.findUnique({
        where: {
          brandId_parameter: {
            brandId,
            parameter: data.parameter,
          },
        },
      });

      if (existingItem) {
        throw new ConflictException(
          `Evaluation item with parameter '${data.parameter}' already exists for this brand`,
        );
      }

      const result = await this.prisma.brand_evaluation_items.create({
        data: {
          brandId,
          parameter: data.parameter,
          requiredValue: data.requiredValue,
          sources: data.sources,
          stage: data.stage || "ONE",
          isActive: data.isActive ?? true,
          priority: data.priority ?? 0,
          description: data.description,
        },
      });

      // Audit logging
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_EVALUATION_ITEMS",
        performedByPartnerId: performedByUserId,
        action: "CREATE",
        changes: data,
        status: "SUCCESS",
      });

      return result;
    } catch (error) {
      // Audit failure logging
      if (!(error instanceof ConflictException)) {
        await this.auditLogService.createAuditLog({
          brandId,
          settingType: "BRAND_EVALUATION_ITEMS",
          performedByPartnerId: performedByUserId,
          action: "CREATE",
          status: "FAILURE",
          errorMessage: error.message,
        });
      }
      if (error instanceof ConflictException) {
        throw error;
      }
      console.error("Error creating brand evaluation item:", error);
      throw new HttpException(
        "Failed to create brand evaluation item",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateBrandEvaluationItem(
    brandId: string,
    itemId: string,
    data: UpdateBrandEvaluationItemDto,
    performedByUserId: string,
  ): Promise<brand_evaluation_items> {
    try {
      // Verify that the item exists and belongs to the brand
      const existingItem = await this.prisma.brand_evaluation_items.findFirst({
        where: {
          id: itemId,
          brandId: brandId,
        },
      });

      if (!existingItem) {
        throw new NotFoundException(
          `Brand evaluation item with ID ${itemId} not found for brand ${brandId}`,
        );
      }

      // Check for parameter uniqueness if parameter is being updated
      if (data.parameter && data.parameter !== existingItem.parameter) {
        const duplicateItem = await this.prisma.brand_evaluation_items.findUnique({
          where: {
            brandId_parameter: {
              brandId,
              parameter: data.parameter,
            },
          },
        });

        if (duplicateItem) {
          throw new ConflictException(
            `Evaluation item with parameter '${data.parameter}' already exists for this brand`,
          );
        }
      }

      const result = await this.prisma.brand_evaluation_items.update({
        where: {
          id: itemId,
        },
        data: {
          ...data,
        },
      });

      // Audit logging
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_EVALUATION_ITEMS",
        performedByPartnerId: performedByUserId,
        action: "UPDATE",
        changes: data,
        status: "SUCCESS",
      });

      return result;
    } catch (error) {
      // Audit failure logging
      if (!(error instanceof NotFoundException || error instanceof ConflictException)) {
        await this.auditLogService.createAuditLog({
          brandId,
          settingType: "BRAND_EVALUATION_ITEMS",
          performedByPartnerId: performedByUserId,
          action: "UPDATE",
          status: "FAILURE",
          errorMessage: error.message,
        });
      }
      throw error;
    }
  }

  async deleteBrandEvaluationItem(brandId: string, itemId: string, performedByUserId: string) {
    try {
      // Verify that the item exists and belongs to the brand
      const existingItem = await this.prisma.brand_evaluation_items.findFirst({
        where: {
          id: itemId,
          brandId: brandId,
        },
      });

      if (!existingItem) {
        throw new NotFoundException(
          `Brand evaluation item with ID ${itemId} not found for brand ${brandId}`,
        );
      }

      await this.prisma.brand_evaluation_items.delete({
        where: {
          id: itemId,
        },
      });

      // Audit logging
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_EVALUATION_ITEMS",
        performedByPartnerId: performedByUserId,
        action: "DELETE",
        changes: {
          itemId,
          parameter: existingItem.parameter,
        },
        status: "SUCCESS",
      });

      return { message: "Brand evaluation item deleted successfully" };
    } catch (error) {
      // Audit failure logging
      if (!(error instanceof NotFoundException)) {
        await this.auditLogService.createAuditLog({
          brandId,
          settingType: "BRAND_EVALUATION_ITEMS",
          performedByPartnerId: performedByUserId,
          action: "DELETE",
          status: "FAILURE",
          errorMessage: error.message,
        });
      }
      throw error;
    }
  }

  async getBrandEvaluationItem(brandId: string, itemId: string) {
    const item = await this.prisma.brand_evaluation_items.findFirst({
      where: {
        id: itemId,
        brandId: brandId,
      },
    });

    if (!item) {
      throw new NotFoundException(
        `Brand evaluation item with ID ${itemId} not found for brand ${brandId}`,
      );
    }

    return item;
  }

  async bulkUploadFromCsv(
    brandId: string,
    csvFile: Express.Multer.File,
  ) {
    try {
      // Simple CSV parsing - convert buffer to string and split by lines
      const csvContent = csvFile.buffer.toString('utf8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new HttpException(
          "CSV file must contain at least a header row and one data row",
          HttpStatus.BAD_REQUEST,
        );
      }

      // Parse header row
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const dataRows = lines.slice(1);

      const createdItems: brand_evaluation_items[] = [];
      const skippedItems: string[] = [];
      const errors: string[] = [];

      for (const [index, line] of dataRows.entries()) {
        try {
          if (!line.trim()) continue; // Skip empty lines

          // Parse CSV row (simple parsing - doesn't handle complex CSV cases)
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row: any = {};
          
          headers.forEach((header, i) => {
            row[header] = values[i] || '';
          });

          // Validate required fields
          if (!row.parameter || !row.requiredValue || !row.sources) {
            errors.push(`Row ${index + 2}: Missing required fields (parameter, requiredValue, sources)`);
            continue;
          }

          // Parse sources (assuming semicolon-separated in CSV to avoid conflict with comma delimiter)
          const sources = row.sources.split(';').map((s: string) => s.trim()).filter(s => s);

          // Check if item already exists
          const existingItem = await this.prisma.brand_evaluation_items.findUnique({
            where: {
              brandId_parameter: {
                brandId,
                parameter: row.parameter,
              },
            },
          });

          if (existingItem) {
            skippedItems.push(`Row ${index + 2}: Parameter '${row.parameter}' already exists`);
            continue;
          }

          const createdItem = await this.prisma.brand_evaluation_items.create({
            data: {
              brandId,
              parameter: row.parameter,
              requiredValue: row.requiredValue,
              sources,
              stage: row.stage || "ONE",
              isActive: row.isActive !== undefined ? row.isActive.toLowerCase() === 'true' : true,
              priority: row.priority ? parseInt(row.priority) : 0,
              description: row.description || null,
            },
          });

          createdItems.push(createdItem);
        } catch (itemError) {
          errors.push(`Row ${index + 2}: ${itemError.message}`);
        }
      }

      return {
        success: true,
        created: createdItems.length,
        skipped: skippedItems.length,
        errors: errors.length,
        details: {
          createdItems,
          skippedItems,
          errors,
        },
      };
    } catch (error) {
      console.error("Error processing CSV upload:", error);
      throw new HttpException(
        "Failed to process CSV upload",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async bulkUploadFromJson(
    brandId: string,
    data: BulkUploadBrandEvaluationItemsDto,
  ) {
    try {
      const createdItems: brand_evaluation_items[] = [];
      const skippedItems: string[] = [];
      const errors: string[] = [];

      for (const [index, item] of data.items.entries()) {
        try {
          // Check if item already exists
          const existingItem = await this.prisma.brand_evaluation_items.findUnique({
            where: {
              brandId_parameter: {
                brandId,
                parameter: item.parameter,
              },
            },
          });

          if (existingItem) {
            skippedItems.push(`Item ${index + 1}: Parameter '${item.parameter}' already exists`);
            continue;
          }

          const createdItem = await this.prisma.brand_evaluation_items.create({
            data: {
              brandId,
              parameter: item.parameter,
              requiredValue: item.requiredValue,
              sources: item.sources,
              stage: item.stage || "ONE",
              isActive: item.isActive ?? true,
              priority: item.priority ?? 0,
              description: item.description,
            },
          });

          createdItems.push(createdItem);
        } catch (itemError) {
          errors.push(`Item ${index + 1}: ${itemError.message}`);
        }
      }

      return {
        success: true,
        created: createdItems.length,
        skipped: skippedItems.length,
        errors: errors.length,
        details: {
          createdItems,
          skippedItems,
          errors,
        },
      };
    } catch (error) {
      console.error("Error processing bulk upload:", error);
      throw new HttpException(
        "Failed to process bulk upload",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
