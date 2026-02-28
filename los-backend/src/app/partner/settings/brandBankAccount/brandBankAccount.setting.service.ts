import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { BadRequestException } from "@nestjs/common";
import { BrandBankAccountType } from "@prisma/client";
import { BrandSettingAuditLogService } from "../common/brand-setting-audit-log.service";

@Injectable()
export class BrandBankAccountService {
  constructor(
    private prisma: PrismaService,
    private readonly auditLogService: BrandSettingAuditLogService,
  ) {}
  async getBrandBankAccount(brandId: string, bankAccountId: string) {
    const brandBankAccount = await this.prisma.brandBankAccount.findFirst({
      where: {
        id: bankAccountId,
        brandId: brandId,
      },
    });
    if (!brandBankAccount) {
      throw new BadRequestException("Brand bank account not found");
    }
    return brandBankAccount;
  }
  async getBrandBankAccounts(brandId: string) {
    const brandBankAccounts = await this.prisma.brandBankAccount.findMany({
      where: {
        brandId: brandId,
        isActive: true,
      },
    });

    return brandBankAccounts;
  }

  async createBrandBankAccount(
    brandId: string,
    bankAccountData: {
      bankName: string;
      accountNumber: string;
      ifscCode: string;
      branchName?: string;
      upiId?: string;
      type?: BrandBankAccountType;
      isPrimaryAccount?: boolean;
      isActive?: boolean;
    },
    performedByUserId: string,
  ) {
    try {
      if (!brandId) {
        throw new BadRequestException(
          "Brand ID is required to create a bank account.",
        );
      }

      if (!bankAccountData) {
        throw new BadRequestException("Bank account data must be provided.");
      }

      const { bankName, accountNumber, ifscCode, type } = bankAccountData;

      if (!bankName || !accountNumber || !ifscCode || !type) {
        throw new BadRequestException(
          "Missing required bank account fields: bankName, accountNumber,type and ifscCode are mandatory.",
        );
      }

      // Ensure only one primary account per brand
      if (bankAccountData.isPrimaryAccount) {
        await this.prisma.brandBankAccount.updateMany({
          where: {
            brandId,
            isPrimaryAccount: true,
          },
          data: {
            isPrimaryAccount: false,
          },
        });
      }

      const brandBankAccount = await this.prisma.brandBankAccount.create({
        data: {
          brandId,
          bankName,
          accountNumber,
          type: type || null,
          ifscCode,
          branchName: bankAccountData.branchName || null,
          upiId: bankAccountData.upiId || null,
          isPrimaryAccount: bankAccountData.isPrimaryAccount || false,
          isActive:
            bankAccountData.isActive !== undefined
              ? bankAccountData.isActive
              : true,
          updatedAt: new Date(),
        },
      });

      // Audit logging
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_BANK_ACCOUNT",
        performedByPartnerId: performedByUserId,
        action: "CREATE",
        changes: bankAccountData,
        status: "SUCCESS",
      });

      return brandBankAccount;
    } catch (error) {
      // Audit failure logging
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_BANK_ACCOUNT",
        performedByPartnerId: performedByUserId,
        action: "CREATE",
        status: "FAILURE",
        errorMessage: error.message,
      });
      throw error;
    }
  }

  async updateBrandBankAccount(
    brandId: string,
    bankAccountId: string,
    bankAccountData: {
      bankName?: string;
      accountNumber?: string;
      ifscCode?: string;
      branchName?: string;
      type?: BrandBankAccountType;
      upiId?: string;
      isPrimaryAccount?: boolean;
      isActive?: boolean;
    },
    performedByUserId: string,
  ) {
    try {
      if (!brandId || !bankAccountId) {
        throw new BadRequestException(
          "Both Brand ID and Bank Account ID are required.",
        );
      }

      const existingBankAccount = await this.getBrandBankAccount(
        brandId,
        bankAccountId,
      );

      if (!existingBankAccount) {
        throw new NotFoundException("Brand bank account not found.");
      }

      // If setting this account as primary, unset previous primary account
      if (bankAccountData.isPrimaryAccount) {
        await this.prisma.brandBankAccount.updateMany({
          where: {
            brandId,
            isPrimaryAccount: true,
            id: { not: bankAccountId }, // Avoid unsetting itself if it's already primary
          },
          data: {
            isPrimaryAccount: false,
          },
        });
      }

      const updatedBankAccount = await this.prisma.brandBankAccount.update({
        where: { id: bankAccountId },
        data: {
          bankName: bankAccountData.bankName ?? existingBankAccount.bankName,
          accountNumber:
            bankAccountData.accountNumber ?? existingBankAccount.accountNumber,
          ifscCode: bankAccountData.ifscCode ?? existingBankAccount.ifscCode,
          branchName:
            bankAccountData.branchName ?? existingBankAccount.branchName,
          type: bankAccountData.type ?? existingBankAccount.type,
          upiId: bankAccountData.upiId ?? existingBankAccount.upiId,
          isPrimaryAccount:
            bankAccountData.isPrimaryAccount ??
            existingBankAccount.isPrimaryAccount,
          isActive: bankAccountData.isActive ?? existingBankAccount.isActive,
          updatedAt: new Date(),
        },
      });

      // Audit logging
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_BANK_ACCOUNT",
        performedByPartnerId: performedByUserId,
        action: "UPDATE",
        changes: bankAccountData,
        status: "SUCCESS",
      });

      return updatedBankAccount;
    } catch (error) {
      // Audit failure logging
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_BANK_ACCOUNT",
        performedByPartnerId: performedByUserId,
        action: "UPDATE",
        status: "FAILURE",
        errorMessage: error.message,
      });
      throw error;
    }
  }
}
