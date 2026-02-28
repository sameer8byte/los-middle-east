import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { BrandSettingAuditLogService } from "../common/brand-setting-audit-log.service";

@Injectable()
export class AppearanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: BrandSettingAuditLogService
  ) {}
  async getAppearance(brandId: string) {
    const appearance = await this.prisma.brandTheme.findUnique({
      where: {
        brandId: brandId,
      },
    });
    return appearance;
  }

  async updateAppearance(
    brandId: string,
    performedByUserId: string,  // MANDATORY - moved to position 2
    primaryColor: string,
    secondaryColor: string,
    backgroundColor: string,
    surfaceColor: string,
    primaryTextColor: string,
    secondaryTextColor: string,
    successColor: string,
    warningColor: string,
    errorColor: string,
    fontFamily: string,
    baseFontSize: number,
    roundedCorners: boolean,
    darkMode: boolean,
    primaryHoverColor: string,
    primaryFocusColor: string,
    primaryActiveColor: string,
    primaryLightColor: string,
    primaryContrastColor: string,
    secondaryHoverColor: string,
    secondaryFocusColor: string,
    secondaryActiveColor: string,
    secondaryLightColor: string,
    secondaryContrastColor: string,
    surfaceTextColor: string,
    backgroundTextColor: string
  ) {
    try {
      const updatedAppearance = await this.prisma.brandTheme.update({
        where: {
          brandId: brandId,
        },
        data: {
          primaryColor,
          secondaryColor,
          backgroundColor,
          surfaceColor,
          primaryTextColor,
          secondaryTextColor,
          successColor,
          warningColor,
          errorColor,
          fontFamily,
          baseFontSize,
          roundedCorners,
          darkMode,
          primaryHoverColor,
          primaryFocusColor,
          primaryActiveColor,
          primaryLightColor,
          primaryContrastColor,
          secondaryHoverColor,
          secondaryFocusColor,
          secondaryActiveColor,
          secondaryLightColor,
          secondaryContrastColor,
          surfaceTextColor,
          backgroundTextColor,
        },
      });

      // Audit log
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "APPEARANCE",
        performedByPartnerId: performedByUserId,
        action: "UPDATE",
        changes: {
          primaryColor,
          secondaryColor,
          backgroundColor,
          surfaceColor,
          primaryTextColor,
          secondaryTextColor,
          successColor,
          warningColor,
          errorColor,
          fontFamily,
          baseFontSize,
          roundedCorners,
          darkMode,
        },
        status: "SUCCESS",
      });

      return updatedAppearance;
    } catch (error) {
      // Audit log failure
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "APPEARANCE",
        performedByPartnerId: performedByUserId,
        action: "UPDATE",
        status: "FAILURE",
        errorMessage: error.message,
      });
      throw error;
    }
  }
}
