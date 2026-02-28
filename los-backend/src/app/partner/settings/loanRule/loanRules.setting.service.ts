import { BadRequestException, Injectable } from "@nestjs/common";
import {
  ChargeMode,
  FeeType,
  FeeValueType,
  LoanRiskCategory,
  LoanTypeEnum,
  PenaltyType,
  TaxType,
} from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { BrandSettingAuditLogService } from "../common/brand-setting-audit-log.service";
import { v4 as uuid } from "uuid";

@Injectable()
export class LoanRulesSettingService {
  constructor(
    private prisma: PrismaService,
    private readonly auditLogService: BrandSettingAuditLogService
  ) {}

  async getLoanRules(brandId: string) {
    if (!brandId) {
      throw new BadRequestException("brandId is required");
    }
    const loanRules = await this.prisma.loanRule.findMany({
      where: {
        brandId: brandId,
      },
    });
    return loanRules;
  }

  async getTenuresByRuleId(loanRuleId: string) {
    if (!loanRuleId) {
      throw new BadRequestException("ruleId is required");
    }
    const tenures = await this.prisma.tenure.findMany({
      where: {
        loanRuleId: loanRuleId,
      },
      include: {
        loanPenalty: true, // Include penalties associated with the tenure
        loan_charge_config: {
          include: {
            loan_charge_taxes: true, // Include taxes associated with the charge configuration
          },
        }, // Include charge configurations associated with the tenure
      },
    });
    return tenures;
  }

  async getPenaltiesByTenureIdId(loanRuleId: string, tenureId: string) {
    if (!loanRuleId || !tenureId) {
      throw new BadRequestException("loanRuleId and tenureId are required");
    }
    const penalties = await this.prisma.loanPenalty.findMany({
      where: {
        loanRuleId: loanRuleId,
        tenureId: tenureId,
      },
    });
    return penalties;
  }

  async patchLoanRules(
    brandId: string,
    performedByUserId: string,  // MANDATORY - moved to position 2
    rules: {
      id: string | null; // Optional field, if not provided a new rule will be created
      isActive: boolean;
      maxAmount: number;
      minAmount: number;
      ruleType: LoanRiskCategory; // Assuming ruleType is a string
      maxCompleteLoanCount: number; // Assuming this is optional
    }
  ) {
    try {
      if (!brandId || !rules) {
        throw new BadRequestException("Brand ID and rules are required.");
      }

      if (
        !rules.ruleType ||
        rules.maxAmount === undefined ||
        rules.minAmount === undefined
      ) {
        throw new BadRequestException(
          "ruleType, isActive, maxAmount, minAmount are required.",
        );
      }
      if (!rules.id) {
        // Check if record exists
        const existingRule = await this.prisma.loanRule.findUnique({
          where: {
            brandId_ruleType: {
              brandId: brandId,
              ruleType: rules.ruleType,
            },
          },
        });

        if (existingRule) {
          throw new BadRequestException(
            `Loan rule with type ${rules.ruleType} already exists for this brand.`,
          );
        }
      }

      const result = await this.prisma.loanRule.upsert({
        where: {
          brandId_ruleType: {
            brandId: brandId,
            ruleType: rules.ruleType,
          },
        },
        update: {
          isActive: rules.isActive,
          updatedAt: new Date(),
          maxAmount: rules.maxAmount,
          minAmount: rules.minAmount,
          maxCompleteLoanCount: rules.maxCompleteLoanCount || 0, // Default to 0 if not provided
        },
        create: {
          brandId: brandId,
          isActive: rules.isActive,
          updatedAt: new Date(),
          maxAmount: rules.maxAmount,
          minAmount: rules.minAmount,
          ruleType: rules.ruleType,
          maxCompleteLoanCount: rules.maxCompleteLoanCount || 0, // Default to 0 if not provided
        },
      });

      // Audit log
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "LOAN_RULES",
        performedByPartnerId: performedByUserId,
        action: rules.id ? "UPDATE" : "CREATE",
        changes: rules,
        status: "SUCCESS",
      });

      return result;
    } catch (error) {
      // Audit log failure
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "LOAN_RULES",
        performedByPartnerId: performedByUserId,
        action: "UPSERT",
        status: "FAILURE",
        errorMessage: error.message,
      });
      throw error;
    }
  }

  async patchLoanRuleTenures(
    brandId: string,
    data: {
      loanRuleId: string;
      isActive: boolean; // Whether the tenure is active
      loan_type: LoanTypeEnum; // Assuming loan_type is a string
      maxTermDays: number; // New field added
      minTermDays: number; // Duration in months
      minRepaymentDays: number; // Optional field for minimum repayment days
      minPostActiveTermDays: number; // Optional field for post-active term days
      allowPrepayment: boolean; // Optional field for prepayment
      gracePeriod: number; // Optional field for grace period
    },
  ) {
    const {
      loanRuleId,
      minTermDays,
      minRepaymentDays,
      maxTermDays,
      isActive,
      loan_type,
    } = data;
    if (!loanRuleId || !minTermDays || !maxTermDays || !loan_type) {
      throw new BadRequestException(
        "Loan Rule ID, duration, isActive, and loan_type are required.",
      );
    }
    return this.prisma.tenure.upsert({
      where: {
        loanRuleId,
      },
      update: {
        isActive: isActive,
        updatedAt: new Date(),
        minTermDays: minTermDays,
        minRepaymentDays: minRepaymentDays,
        loan_type: loan_type,
        maxTermDays: maxTermDays, // New field added
        // Optional fields
        minPostActiveTermDays: data.minPostActiveTermDays || 0,
        allowPrepayment: data.allowPrepayment || false,
        gracePeriod: data.gracePeriod || 0, // Default to 0 if not provided
      },
      create: {
        loanRuleId: loanRuleId,
        minTermDays: minTermDays,
        minRepaymentDays: minRepaymentDays,
        maxTermDays: maxTermDays, // New field added
        isActive: isActive,
        loan_type: loan_type,
        updatedAt: new Date(),
        // Optional fields
        minPostActiveTermDays: data.minPostActiveTermDays || 0,
        allowPrepayment: data.allowPrepayment || true,
        gracePeriod: data.gracePeriod || 0, // Default to 0 if not
      },
    });
  }

  async patchLoanPenalty(
    brandId: string,
    penalty: {
      id?: string; // Make id optional
      type: PenaltyType;
      valueType: FeeValueType;
      chargeValue: number;
      taxType?: TaxType;
      taxRate?: number;
      isTaxInclusive?: boolean;
      loanRuleId: string;
      taxChargeValue?: number;
      tenureId: string;
      taxValueType?: FeeValueType;
    },
  ) {
    if (!brandId || !penalty) {
      throw new BadRequestException("Brand ID and penalty are required.");
    }

    // If ID is provided, try to update existing penalty
    if (penalty.id) {
      const existingPenalty = await this.prisma.loanPenalty.findUnique({
        where: { id: penalty.id },
      });

      if (existingPenalty) {
        return this.prisma.loanPenalty.update({
          where: { id: penalty.id },
          data: {
            type: penalty.type,
            valueType: penalty.valueType,
            chargeValue: penalty.chargeValue,
            taxType: penalty.taxType || null,
            isTaxInclusive: penalty.isTaxInclusive || false,
            taxValueType: penalty.taxValueType,
            taxChargeValue: penalty.taxChargeValue || 0,
            updatedAt: new Date(),
          },
        });
      }
    }

    // Create new penalty if no ID provided or existing penalty not found
    return this.prisma.loanPenalty.create({
      data: {
        id: uuid(),
        type: penalty.type,
        valueType: penalty.valueType,
        chargeValue: penalty.chargeValue,
        taxType: penalty.taxType || null,
        isTaxInclusive: penalty.isTaxInclusive || false,
        loanRuleId: penalty.loanRuleId,
        tenureId: penalty.tenureId,
        taxValueType: penalty.taxValueType,
        taxChargeValue: penalty.taxChargeValue || 0,
        updatedAt: new Date(),
      },
    });
  }

  async patchLoanChargeConfig(
    brandId: string,
    chargeConfig: {
      id: string | null;
      type: FeeType;
      valueType: FeeValueType;
      chargeValue: number;
      isActive: boolean;
      loanRuleId: string;
      tenureId: string;
      chargeMode: ChargeMode; // Optional field
      isRecurringDaily: boolean; // Optional field, default to false
    },
  ) {
    if (!brandId || !chargeConfig) {
      throw new BadRequestException("Brand ID and chargeConfig are required.");
    }

    if (chargeConfig.id) {
      // Check if record exists
      const existingConfig = await this.prisma.loan_charge_config.findUnique({
        where: { id: chargeConfig.id },
      });

      if (existingConfig) {
        // Update existing
        return this.prisma.loan_charge_config.update({
          where: { id: chargeConfig.id },
          data: {
            type: chargeConfig.type,
            valueType: chargeConfig.valueType,
            chargeValue: chargeConfig.chargeValue,
            isActive: chargeConfig.isActive,
            updatedAt: new Date(),
            chargeMode: chargeConfig.chargeMode || null,
            isRecurringDaily: chargeConfig.isRecurringDaily,
          },
        });
      }
    }

    // Create new if id not provided or not found
    return this.prisma.loan_charge_config.create({
      data: {
        id: uuid(), // Generate a new UUID if id is not provided
        type: chargeConfig.type,
        valueType: chargeConfig.valueType,
        chargeValue: chargeConfig.chargeValue,
        isActive: chargeConfig.isActive,
        updatedAt: new Date(),
        loanRuleId: chargeConfig.loanRuleId,
        tenureId: chargeConfig.tenureId || null, // Optional field
        chargeMode: chargeConfig.chargeMode || null,
        isRecurringDaily: chargeConfig.isRecurringDaily || false, // Default to false if not provided
      },
    });
  }

  async patchLoanChargeTaxes(
    brandId: string,
    {
      id = null,
      loanChargeConfigId,
      type = TaxType.GST,
      isInclusive,
      chargeValue = 0,
      valueType,
    }: {
      id?: string | null;
      loanChargeConfigId: string;
      type?: TaxType;
      chargeValue?: number;
      valueType: FeeValueType; // Always percentage for tax
      isInclusive: boolean;
    },
  ) {
    if (!loanChargeConfigId || isInclusive === undefined) {
      throw new BadRequestException(
        "loanChargeConfigId and isInclusive are required.",
      );
    }

    const data = {
      loanChargeConfigId,
      type,
      chargeValue,
      isInclusive,
      valueType, // Always percentage for tax
      updatedAt: new Date(),
    };

    if (id) {
      const existingRecord = await this.prisma.loan_charge_taxes.findUnique({
        where: { id },
      });

      if (existingRecord) {
        return this.prisma.loan_charge_taxes.update({
          where: { id },
          data,
        });
      }
    }

    return this.prisma.loan_charge_taxes.create({
      data: {
        id: uuid(),
        ...data,
        createdAt: new Date(),
      },
    });
  }
}
