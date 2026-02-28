import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateNonRepaymentDateDto } from "./dto/create-non-repayment-date.dto";
import { UpdateNonRepaymentDateDto } from "./dto/update-non-repayment-date.dto";
import { GetNonRepaymentDatesQueryDto } from "./dto/get-non-repayment-dates-query.dto";
import { BrandSettingAuditLogService } from "../common/brand-setting-audit-log.service";

@Injectable()
export class BrandNonRepaymentDatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: BrandSettingAuditLogService,
  ) {}

  async createNonRepaymentDate(
    brandId: string,
    createDto: CreateNonRepaymentDateDto,
    performedByUserId: string,
  ) {
    try {
      // Check if brand exists
      const brand = await this.prisma.brand.findUnique({
        where: { id: brandId },
      });

      if (!brand) {
        throw new NotFoundException("Brand not found");
      }

      // Check if date already exists for this brand with the same type
      const existingDate = await this.prisma.brandNonRepaymentDate.findUnique({
        where: {
          brandId_date_type: {
            brandId,
            date: new Date(createDto.date),
            type: createDto.type || 'BRAND_NON_REPAYMENT',
          },
        },
      });

      if (existingDate) {
        throw new BadRequestException(
          "Non-repayment date already exists for this date and type",
        );
      }

      const nonRepaymentDate = await this.prisma.brandNonRepaymentDate.create({
        data: {
          brandId,
          date: new Date(createDto.date),
          reason: createDto.reason,
          state: createDto.state,
          type: createDto.type || 'BRAND_NON_REPAYMENT',
        },
      });

      // Audit logging
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_NON_REPAYMENT_DATES",
        performedByPartnerId: performedByUserId,
        action: "CREATE",
        changes: createDto,
        status: "SUCCESS",
      });

      return nonRepaymentDate;
    } catch (error) {
      // Audit failure logging
      if (!(error instanceof NotFoundException || error instanceof BadRequestException)) {
        await this.auditLogService.createAuditLog({
          brandId,
          settingType: "BRAND_NON_REPAYMENT_DATES",
          performedByPartnerId: performedByUserId,
          action: "CREATE",
          status: "FAILURE",
          errorMessage: error.message,
        });
      }
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException("Failed to create non-repayment date");
    }
  }

  async getNonRepaymentDates(
    brandId: string,
    query: GetNonRepaymentDatesQueryDto,
  ) {
    try {
      const { year, state, active, type } = query;

      // Build where clause
      const whereClause: any = {
        brandId,
      };

      if (year) {
        whereClause.date = {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        };
      }

      if (state) {
        whereClause.state = state;
      }

      if (active !== undefined) {
        whereClause.isActive = active;
      }

      if (type) {
        whereClause.type = type;
      }

      const nonRepaymentDates =
        await this.prisma.brandNonRepaymentDate.findMany({
          where: whereClause,
          orderBy: {
            date: "asc",
          },
        });

      return nonRepaymentDates;
    } catch (error) {
      throw new BadRequestException("Failed to fetch non-repayment dates");
    }
  }

  async getNonRepaymentDateById(brandId: string, id: string) {
    try {
      const nonRepaymentDate =
        await this.prisma.brandNonRepaymentDate.findFirst({
          where: {
            id,
            brandId,
          },
        });

      if (!nonRepaymentDate) {
        throw new NotFoundException("Non-repayment date not found");
      }

      return nonRepaymentDate;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException("Failed to fetch non-repayment date");
    }
  }

  async updateNonRepaymentDate(
    brandId: string,
    id: string,
    updateDto: UpdateNonRepaymentDateDto,
    performedByUserId: string,
  ) {
    try {
      // Check if the record exists
      const existingDate = await this.prisma.brandNonRepaymentDate.findFirst({
        where: {
          id,
          brandId,
        },
      });

      if (!existingDate) {
        throw new NotFoundException("Non-repayment date not found");
      }

      // If updating date, check for conflicts
      if (
        updateDto.date &&
        updateDto.date !== existingDate.date.toISOString().split("T")[0]
      ) {
        const conflictingDate =
          await this.prisma.brandNonRepaymentDate.findUnique({
            where: {
              brandId_date_type: {
                brandId,
                date: new Date(updateDto.date),
                type: updateDto.type || existingDate.type,
              },
            },
          });

        if (conflictingDate && conflictingDate.id !== id) {
          throw new BadRequestException(
            "Another non-repayment date already exists for this date and type",
          );
        }
      }

      const updateData: any = {};

      if (updateDto.date) {
        updateData.date = new Date(updateDto.date);
      }
      if (updateDto.reason !== undefined) {
        updateData.reason = updateDto.reason;
      }
      if (updateDto.state !== undefined) {
        updateData.state = updateDto.state;
      }
      if (updateDto.type !== undefined) {
        updateData.type = updateDto.type;
      }
      if (updateDto.isActive !== undefined) {
        updateData.isActive = updateDto.isActive;
      }

      const updatedDate = await this.prisma.brandNonRepaymentDate.update({
        where: { id },
        data: updateData,
      });

      // Audit logging
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_NON_REPAYMENT_DATES",
        performedByPartnerId: performedByUserId,
        action: "UPDATE",
        changes: updateDto,
        status: "SUCCESS",
      });

      return updatedDate;
    } catch (error) {
      // Audit failure logging
      if (!(error instanceof NotFoundException || error instanceof BadRequestException)) {
        await this.auditLogService.createAuditLog({
          brandId,
          settingType: "BRAND_NON_REPAYMENT_DATES",
          performedByPartnerId: performedByUserId,
          action: "UPDATE",
          status: "FAILURE",
          errorMessage: error.message,
        });
      }
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException("Failed to update non-repayment date");
    }
  }

  async deleteNonRepaymentDate(brandId: string, id: string, performedByUserId: string) {
    try {
      // Check if the record exists
      const existingDate = await this.prisma.brandNonRepaymentDate.findFirst({
        where: {
          id,
          brandId,
        },
      });

      if (!existingDate) {
        throw new NotFoundException("Non-repayment date not found");
      }

      await this.prisma.brandNonRepaymentDate.delete({
        where: { id },
      });

      // Audit logging
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_NON_REPAYMENT_DATES",
        performedByPartnerId: performedByUserId,
        action: "DELETE",
        changes: {
          id,
          date: existingDate.date,
        },
        status: "SUCCESS",
      });

      return { message: "Non-repayment date deleted successfully" };
    } catch (error) {
      // Audit failure logging
      if (!(error instanceof NotFoundException)) {
        await this.auditLogService.createAuditLog({
          brandId,
          settingType: "BRAND_NON_REPAYMENT_DATES",
          performedByPartnerId: performedByUserId,
          action: "DELETE",
          status: "FAILURE",
          errorMessage: error.message,
        });
      }
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException("Failed to delete non-repayment date");
    }
  }

  async checkIsRepaymentAllowed(brandId: string, date: Date, state?: string) {
    try {
      const dateOnly = new Date(date.toISOString().split("T")[0]);

      const nonRepaymentDate =
        await this.prisma.brandNonRepaymentDate.findFirst({
          where: {
            brandId,
            date: dateOnly,
            isActive: true,
            OR: [{ state: "all" }, ...(state ? [{ state }] : [])],
          },
        });

      return {
        isRepaymentAllowed: !nonRepaymentDate,
        reason: nonRepaymentDate?.reason || null,
        state: nonRepaymentDate?.state || null,
      };
    } catch (error) {
      throw new BadRequestException("Failed to check repayment allowance");
    }
  }
}
