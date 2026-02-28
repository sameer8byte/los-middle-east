import {
  Controller,
  Get,
  Param,
  Query,
} from "@nestjs/common";
import { AuthType } from "src/common/decorators/auth.decorator";
import { BrandSettingAuditLogService } from "./brand-setting-audit-log.service";
import { PrismaService } from "src/prisma/prisma.service";

@AuthType("partner")
@Controller("partner/brand/:brandId/settings/brand-setting-audit-logs")
export class BrandSettingAuditLogController {
  constructor(
    private readonly auditLogService: BrandSettingAuditLogService,
    private readonly prisma: PrismaService
  ) {}

  @Get()
  async getBrandSettingAuditLogs(
    @Param("brandId") brandId: string,
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "10",
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
    const pageSize = Math.max(1, Math.min(100, Number.parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * pageSize;

    const where: any = { brand_id: brandId };

    // Add date range filter if provided
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        where.created_at.gte = new Date(startDate);
      }
      if (endDate) {
        // End of the day for endDate
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.created_at.lte = end;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.brand_setting_audit_logs.findMany({
        where,
        orderBy: {
          created_at: "desc",
        },
        skip,
        take: pageSize,
      }),
      this.prisma.brand_setting_audit_logs.count({ where }),
    ]);

    return {
      data: logs.map((log) => ({
        id: log.id,
        brandId: log.brand_id,
        settingType: log.setting_type,
        action: log.action,
        status: log.status,
        changes: log.changes,
        errorMessage: log.error_message,
        performedByPartnerId: log.performed_by_partner_user_id,
        createdAt: log.created_at,
        metadata: log.metadata,
      })),
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }
}
