import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

export interface BrandSettingAuditLogInput {
  brandId: string;
  settingType: string;
  performedByPartnerId: string; // Mandatory - Partner user ID
  action: string;
  changes?: any;
  status?: string;
  errorMessage?: string | null;
  metadata?: any;
}

@Injectable()
export class BrandSettingAuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an audit log for brand settings
   * @param input - Audit log input data (performedByPartnerId is mandatory)
   */
  async createAuditLog(input: BrandSettingAuditLogInput): Promise<void> {
    try {
      // Validate mandatory fields
      if (!input.performedByPartnerId) {
        throw new Error("performedByPartnerId is mandatory");
      }

      await this.prisma.brand_setting_audit_logs.create({
        data: {
          brand_id: input.brandId,
          setting_type: input.settingType,
          performed_by_partner_user_id: input.performedByPartnerId,
          action: input.action,
          changes: input.changes || null,
          status: input.status || "SUCCESS",
          error_message: input.errorMessage || null,
          metadata: input.metadata || {
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      // Log audit creation failure but don't throw to avoid disrupting main flow
      console.error("Failed to create setting audit log:", error);
    }
  }

  /**
   * Get audit logs for a specific setting
   */
  async getSettingAuditLogs(
    brandId: string,
    settingType?: string,
    limit: number = 100
  ) {
    const where: any = { brand_id: brandId };
    if (settingType) {
      where.setting_type = settingType;
    }

    return await this.prisma.brand_setting_audit_logs.findMany({
      where,
      orderBy: {
        created_at: "desc",
      },
      take: limit,
    });
  }

  /**
   * Get audit logs for a specific brand
   */
  async getBrandAuditLogs(brandId: string, limit: number = 100) {
    return await this.prisma.brand_setting_audit_logs.findMany({
      where: { brand_id: brandId },
      orderBy: {
        created_at: "desc",
      },
      take: limit,
    });
  }
}
