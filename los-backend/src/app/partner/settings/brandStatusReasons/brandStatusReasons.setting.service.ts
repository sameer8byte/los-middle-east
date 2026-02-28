import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateBrandStatusReasonDto } from "./dto/create-brand-status-reason.dto";
import { UpdateBrandStatusReasonDto } from "./dto/update-brand-status-reason.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { BrandSettingAuditLogService } from "../common/brand-setting-audit-log.service";

@Injectable()
export class BrandStatusReasonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: BrandSettingAuditLogService,
  ) {}

  create(dto: CreateBrandStatusReasonDto, performedByUserId: string) {
    try {
      const result = this.prisma.brand_status_reasons.create({
        data: {
          type: dto.type,
          reason: dto.reason,
          brandId: dto.brandId,
          isDisabled: dto.isDisabled ?? false,
          isActive: dto.isActive ?? true,
          status: dto.status ?? 'REJECTED', // Default to REJECTED for backward compatibility
          updatedAt: new Date(),
        },
      });

      // Audit logging
      this.auditLogService.createAuditLog({
        brandId: dto.brandId,
        settingType: "BRAND_STATUS_REASONS",
        performedByPartnerId: performedByUserId,
        action: "CREATE",
        changes: dto,
        status: "SUCCESS",
      }).catch(err => console.error("Audit log failed:", err));

      return result;
    } catch (error) {
      // Audit failure logging
      this.auditLogService.createAuditLog({
        brandId: dto.brandId,
        settingType: "BRAND_STATUS_REASONS",
        performedByPartnerId: performedByUserId,
        action: "CREATE",
        status: "FAILURE",
        errorMessage: error.message,
      }).catch(err => console.error("Audit log failed:", err));
      throw error;
    }
  }

  findAll() {
    return this.prisma.brand_status_reasons.findMany({
      include: { brands: true },
    });
  }

  findAllByBrand(brandId: string) {
    return this.prisma.brand_status_reasons.findMany({
      where: { brandId },
      include: { brands: true },
    });
  }

  findOne(id: string) {
    return this.prisma.brand_status_reasons.findUnique({
      where: { id },
      include: { brands: true },
    });
  }

  async update(id: string, dto: UpdateBrandStatusReasonDto, performedByUserId: string) {
    try {
      const exists = await this.prisma.brand_status_reasons.findUnique({
        where: { id },
      });
      if (!exists) throw new NotFoundException("Status reason not found");

      const result = await this.prisma.brand_status_reasons.update({
        where: { id },
        data: {
          ...dto,
          updatedAt: new Date(),
        },
      });

      // Audit logging
      await this.auditLogService.createAuditLog({
        brandId: exists.brandId,
        settingType: "BRAND_STATUS_REASONS",
        performedByPartnerId: performedByUserId,
        action: "UPDATE",
        changes: dto,
        status: "SUCCESS",
      });

      return result;
    } catch (error) {
      // Audit failure logging
      if (!(error instanceof NotFoundException)) {
        await this.auditLogService.createAuditLog({
          brandId: (await this.prisma.brand_status_reasons.findUnique({ where: { id } }))?.brandId || 'unknown',
          settingType: "BRAND_STATUS_REASONS",
          performedByPartnerId: performedByUserId,
          action: "UPDATE",
          status: "FAILURE",
          errorMessage: error.message,
        });
      }
      throw error;
    }
  }

  async remove(id: string, performedByUserId: string) {
    try {
      const exists = await this.prisma.brand_status_reasons.findUnique({
        where: { id },
      });
      if (!exists) throw new NotFoundException("Status reason not found");

      const result = await this.prisma.brand_status_reasons.delete({
        where: { id },
      });

      // Audit logging
      await this.auditLogService.createAuditLog({
        brandId: exists.brandId,
        settingType: "BRAND_STATUS_REASONS",
        performedByPartnerId: performedByUserId,
        action: "DELETE",
        changes: {
          id,
          reason: exists.reason,
        },
        status: "SUCCESS",
      });

      return result;
    } catch (error) {
      // Audit failure logging
      if (!(error instanceof NotFoundException)) {
        const brandId = await this.prisma.brand_status_reasons.findUnique({ where: { id } }).then(r => r?.brandId).catch(() => 'unknown');
        await this.auditLogService.createAuditLog({
          brandId: brandId || 'unknown',
          settingType: "BRAND_STATUS_REASONS",
          performedByPartnerId: performedByUserId,
          action: "DELETE",
          status: "FAILURE",
          errorMessage: error.message,
        });
      }
      throw error;
    }
  }
}
