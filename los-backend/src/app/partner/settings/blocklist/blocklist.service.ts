// services/blocklist.service.ts
import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { BrandSettingAuditLogService } from "../common/brand-setting-audit-log.service";
import { UpsertBlocklistDto } from "./dto/upsert-blocklist.dto";

@Injectable()
export class BlocklistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: BrandSettingAuditLogService
  ) {}

  async upsertPan(data: UpsertBlocklistDto, performedByUserId: string) {  // MANDATORY
    try {
      if (!data.pancard) throw new BadRequestException("PAN is required");

      const result = await this.prisma.brandBlocklistedPan.upsert({
        where: {
          pancard_brandId: {
            pancard: data.pancard,
            brandId: data.brandId,
          },
        },
        update: {
          customer_name: data.customerName,
          reason: data.reason,
          dpd: data.dpd,
          partnerUserName: data.partnerUserName,
        },
        create: {
          pancard: data.pancard,
          customer_name: data.customerName,
          reason: data.reason,
          dpd: data.dpd,
          partnerUserName: data.partnerUserName,
          brandId: data.brandId,
        },
      });

      // Audit log
      await this.auditLogService.createAuditLog({
        brandId: data.brandId,
        settingType: "BLOCKLIST_PAN",
        performedByPartnerId: performedByUserId,
        action: "UPSERT",
        changes: data,
        status: "SUCCESS",
      });

      return result;
    } catch (error) {
      // Audit log failure
      await this.auditLogService.createAuditLog({
        brandId: data.brandId,
        settingType: "BLOCKLIST_PAN",
        performedByPartnerId: performedByUserId,
        action: "UPSERT",
        status: "FAILURE",
        errorMessage: error.message,
      });
      throw error;
    }
  }

  async upsertMobile(data: UpsertBlocklistDto, performedByUserId: string) {  // MANDATORY
    try {
      if (!data.mobile) throw new BadRequestException("Mobile is required");

      const result = await this.prisma.brandBlocklistedMobile.upsert({
        where: {
          mobile_brandId: {
            mobile: data.mobile,
            brandId: data.brandId,
          },
        },
        update: {
          customerName: data.customerName,
          reason: data.reason,
          dpd: data.dpd,
          partnerUserName: data.partnerUserName,
        },
        create: {
          mobile: data.mobile,
          customerName: data.customerName,
          reason: data.reason,
          dpd: data.dpd,
          partnerUserName: data.partnerUserName,
          brandId: data.brandId,
        },
      });

      // Audit log
      await this.auditLogService.createAuditLog({
        brandId: data.brandId,
        settingType: "BLOCKLIST_MOBILE",
        performedByPartnerId: performedByUserId,
        action: "UPSERT",
        changes: data,
        status: "SUCCESS",
      });

      return result;
    } catch (error) {
      // Audit log failure
      await this.auditLogService.createAuditLog({
        brandId: data.brandId,
        settingType: "BLOCKLIST_MOBILE",
        performedByPartnerId: performedByUserId,
        action: "UPSERT",
        status: "FAILURE",
        errorMessage: error.message,
      });
      throw error;
    }
  }

  async upsertAadhar(data: UpsertBlocklistDto, performedByUserId: string) {  // MANDATORY
    try {
      if (!data.aadharNumber)
        throw new BadRequestException("Aadhaar Number is required");

      const result = await this.prisma.brandBlocklistedAadhar.upsert({
        where: {
          aadharNumber_brandId: {
            aadharNumber: data.aadharNumber,
            brandId: data.brandId,
          },
        },
        update: {
          customerName: data.customerName,
          reason: data.reason,
          dpd: data.dpd,
          partnerUserName: data.partnerUserName,
        },
        create: {
          aadharNumber: data.aadharNumber,
          customerName: data.customerName,
          reason: data.reason,
          dpd: data.dpd,
          partnerUserName: data.partnerUserName,
          brandId: data.brandId,
        },
      });

      // Audit log
      await this.auditLogService.createAuditLog({
        brandId: data.brandId,
        settingType: "BLOCKLIST_AADHAR",
        performedByPartnerId: performedByUserId,
        action: "UPSERT",
        changes: data,
        status: "SUCCESS",
      });

      return result;
    } catch (error) {
      // Audit log failure
      await this.auditLogService.createAuditLog({
        brandId: data.brandId,
        settingType: "BLOCKLIST_AADHAR",
        performedByPartnerId: performedByUserId,
        action: "UPSERT",
        status: "FAILURE",
        errorMessage: error.message,
      });
      throw error;
    }
  }

  async upsertAccountNumber(
    data: UpsertBlocklistDto,
    performedByUserId: string  // MANDATORY
  ) {
    try {
      if (!data.accountNumber)
        throw new BadRequestException("Account Number is required");

      const result = await this.prisma.brandBlocklistedAccountNumber.upsert({
        where: {
          accountNumber_brandId: {
            accountNumber: data.accountNumber,
            brandId: data.brandId,
          },
        },
        update: {
          customerName: data.customerName,
          reason: data.reason,
          dpd: data.dpd,
          partnerUserName: data.partnerUserName,
        },
        create: {
          accountNumber: data.accountNumber,
          customerName: data.customerName,
          reason: data.reason,
          dpd: data.dpd,
          partnerUserName: data.partnerUserName,
          brandId: data.brandId,
        },
      });

      // Audit log
      await this.auditLogService.createAuditLog({
        brandId: data.brandId,
        settingType: "BLOCKLIST_ACCOUNT_NUMBER",
        performedByPartnerId: performedByUserId,
        action: "UPSERT",
        changes: data,
        status: "SUCCESS",
      });

      return result;
    } catch (error) {
      // Audit log failure
      await this.auditLogService.createAuditLog({
        brandId: data.brandId,
        settingType: "BLOCKLIST_ACCOUNT_NUMBER",
        performedByPartnerId: performedByUserId,
        action: "UPSERT",
        status: "FAILURE",
        errorMessage: error.message,
      });
      throw error;
    }
  }
}
