import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { BrandSettingAuditLogService } from "../common/brand-setting-audit-log.service";

@Injectable()
export class BrandPolicyLinksSettingService {
  constructor(
    private prisma: PrismaService,
    private readonly auditLogService: BrandSettingAuditLogService,
  ) {}

  async getBrandPolicyLinks(brandId: string) {
    const brandPolicy = await this.prisma.brandPolicyLinks.findUnique({
      where: {
        brandId: brandId,
      },
    });
    return brandPolicy;
  }

  // upsert brand policy links
  async upsertBrandPolicyLinks(
    brandId: string,
    policyLinks: {
      termsConditionUrl: string;
      privacyPolicyUrl: string;
      faqUrl: string;
      brandloanDetailsPolicyUrl: string;
    },
    performedByUserId: string,
  ) {
    try {
      const brandPolicy = await this.prisma.brandPolicyLinks.upsert({
        where: {
          brandId: brandId,
        },
        update: {
          termsConditionUrl: policyLinks.termsConditionUrl,
          privacyPolicyUrl: policyLinks.privacyPolicyUrl,
          faqUrl: policyLinks.faqUrl,
          brandloanDetailsPolicyUrl: policyLinks.brandloanDetailsPolicyUrl,
        },
        create: {
          brandId: brandId,
          termsConditionUrl: policyLinks.termsConditionUrl,
          privacyPolicyUrl: policyLinks.privacyPolicyUrl,
          faqUrl: policyLinks.faqUrl,
          brandloanDetailsPolicyUrl: policyLinks.brandloanDetailsPolicyUrl,
        },
      });

      // Audit logging
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_POLICY_LINKS",
        performedByPartnerId: performedByUserId,
        action: "UPSERT",
        changes: policyLinks,
        status: "SUCCESS",
      });

      return brandPolicy;
    } catch (error) {
      // Audit failure logging
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_POLICY_LINKS",
        performedByPartnerId: performedByUserId,
        action: "UPSERT",
        status: "FAILURE",
        errorMessage: error.message,
      });
      throw error;
    }
  }
}
