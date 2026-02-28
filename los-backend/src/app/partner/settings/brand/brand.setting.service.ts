import { BadRequestException, Injectable } from "@nestjs/common";
import { LoanRiskCategory } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { BrandSettingAuditLogService } from "../common/brand-setting-audit-log.service";
import { UpdateBrandConfigDto } from "./dto/update-brand-config.dto";

@Injectable()
export class BrandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly awsS3Service: AwsPublicS3Service,
    private readonly auditLogService: BrandSettingAuditLogService,
  ) {}
  async getBrand(brandId: string) {
    const brand = await this.prisma.brand.findUnique({
      where: {
        id: brandId,
      },
      include: {
        brandDetails: true,
        brand_themes: true,
        brandConfig: true,
        brand_paths: true,
        brandProviders: true,
        loanRules: {

          select: {
            id: true,
            ruleType: true,
            loan_charge_config: true,
            tenures: true,
          },
        },
      },
    });
    return brand;
  }

  // upsert brand policy links
  async upsertBrand(brandId: string, brand: any, performedByUserId: string) {
    try {
      const brandData = await this.prisma.brand.upsert({
        where: {
          id: brandId,
        },
        update: {
          name: brand.name,
          logoUrl: brand.logoUrl,
        },
        create: {
          id: brandId,
          name: brand.name,
          logoUrl: brand.logoUrl,
        },
      });

      // Audit log
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND",
        performedByPartnerId: performedByUserId,
        action: "UPSERT",
        changes: brand,
        status: "SUCCESS",
      });

      return brandData;
    } catch (error) {
      // Audit log failure
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND",
        performedByPartnerId: performedByUserId,
        action: "UPSERT",
        status: "FAILURE",
        errorMessage: error.message,
      });
      throw error;
    }
  }

  //update brand
  async updateBrand(
    brandId: string,
    name: string,
    logoUrl: string,
    // domain: string,
    defaultLoanRiskCategory: LoanRiskCategory,
    performedByUserId: string, // MANDATORY - moved before optional params
    logoFile?: Express.Multer.File | undefined,
  ) {
    try {
      let finalLogoUrl = logoUrl;

      // If a file is uploaded, upload it to S3 and use the S3 URL
      if (logoFile) {
        const uploadedUrl = await this.awsS3Service.uploadPublicFile(
          logoFile,
          brandId,
          "system", // userId - using system for brand logos
          "other-documents",
        );
        finalLogoUrl = uploadedUrl;
      }

      const updatedBrand = await this.prisma.brand.update({
        where: {
          id: brandId,
        },
        data: {
          name,
          logoUrl: finalLogoUrl,
          // domain,
          defaultLoanRiskCategory,
        },
      });

      // Audit log
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND",
        performedByPartnerId: performedByUserId,
        action: "UPDATE",
        changes: {
          name,
          logoUrl: finalLogoUrl,
          defaultLoanRiskCategory,
        },
        status: "SUCCESS",
      });

      return updatedBrand;
    } catch (error) {
      // Audit log failure
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND",
        performedByPartnerId: performedByUserId,
        action: "UPDATE",
        status: "FAILURE",
        errorMessage: error.message,
      });
      throw error;
    }
  }

  //getBrandDetails
  async getBrandDetails(brandId: string) {
    const brandDetails = await this.prisma.brandDetails.findUnique({
      where: {
        brandId: brandId,
      },
    });
    if (!brandDetails) {
      throw new BadRequestException("Brand details not found");
    }
    return brandDetails;
  }

  // upsertBrandDetails
  async updateBrandDetails(
    brandId: string,
    brandDetails: {
      address: string;
      contactEmail: string;
      contactPhone: string;
      website: string;
      gstNumber: string;
      cinNumber: string;
      rbiRegistrationNo?: string;
      lenderName?: string;
      description?: string;
      title?: string;
    },
    performedByUserId: string,
  ) {
    try {
      const updatedBrandDetails = await this.prisma.brandDetails.update({
        where: {
          brandId: brandId,
        },
        data: {
          address: brandDetails.address,
          contactEmail: brandDetails.contactEmail,
          contactPhone: brandDetails.contactPhone,
          website: brandDetails.website,
          gstNumber: brandDetails.gstNumber,
          cinNumber: brandDetails.cinNumber,
          rbiRegistrationNo: brandDetails.rbiRegistrationNo || "",
          lenderName: brandDetails.lenderName || "",
          description: brandDetails.description || "",
          title: brandDetails.title || "",
        },
      });
      if (!updatedBrandDetails) {
        throw new BadRequestException("Failed to update brand details");
      }

      // Audit log
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_DETAILS",
        performedByPartnerId: performedByUserId,
        action: "UPDATE",
        changes: brandDetails,
        status: "SUCCESS",
      });

      return updatedBrandDetails;
    } catch (error) {
      // Audit log failure
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_DETAILS",
        performedByPartnerId: performedByUserId,
        action: "UPDATE",
        status: "FAILURE",
        errorMessage: error.message,
      });
      throw error;
    }
  }
  // brand config
  async getBrandConfig(brandId: string) {
    const brandConfig = await this.prisma.brandConfig.findUnique({
      where: {
        brandId: brandId,
      },
    });
    return brandConfig;
  }

  async updateBrandConfig(
    brandId: string,
    brandConfig: UpdateBrandConfigDto,
    performedByUserId: string,
    fileMap?: Record<string, Express.Multer.File>,
  ) {
    try {
      let finalLoanAgreementHeader = brandConfig.loanAgreementHeader;
      let finalLoanAgreementFooter = brandConfig.loanAgreementFooter;
      let finalLoanNoDueCertificateHeader =
        brandConfig.loanNoDueCertificateHeader;
      let finalLoanNoDueCertificateFooter =
        brandConfig.loanNoDueCertificateFooter;

      // Process file uploads if provided
      if (fileMap) {
        // Process Loan Agreement Header
        if (fileMap["loanAgreementHeaderFile"]) {
          const headerUrl = await this.awsS3Service.uploadPublicFile(
            fileMap["loanAgreementHeaderFile"],
            brandId,
            "system",
            "other-documents",
          );
          finalLoanAgreementHeader = headerUrl;
        }

        // Process Loan Agreement Footer
        if (fileMap["loanAgreementFooterFile"]) {
          const footerUrl = await this.awsS3Service.uploadPublicFile(
            fileMap["loanAgreementFooterFile"],
            brandId,
            "system",
            "other-documents",
          );
          finalLoanAgreementFooter = footerUrl;
        }

        // Process No Due Certificate Header
        if (fileMap["loanNoDueCertificateHeaderFile"]) {
          const noDueHeaderUrl = await this.awsS3Service.uploadPublicFile(
            fileMap["loanNoDueCertificateHeaderFile"],
            brandId,
            "system",
            "other-documents",
          );
          finalLoanNoDueCertificateHeader = noDueHeaderUrl;
        }

        // Process No Due Certificate Footer
        if (fileMap["loanNoDueCertificateFooterFile"]) {
          const noDueFooterUrl = await this.awsS3Service.uploadPublicFile(
            fileMap["loanNoDueCertificateFooterFile"],
            brandId,
            "system",
            "other-documents",
          );
          finalLoanNoDueCertificateFooter = noDueFooterUrl;
        }
      }

      const updatedBrandConfig = await this.prisma.brandConfig.update({
        where: {
          brandId: brandId,
        },
        data: {
          salaryThresholdAmount: brandConfig.salaryThresholdAmount,
          rejectionDuration: brandConfig.rejectionDuration,
          bankStatementHistoryMonths: brandConfig.bankStatementHistoryMonths,
          minLoanAmountRequired: brandConfig.minLoanAmountRequired,
          loanAgreementVersion: brandConfig.loanAgreementVersion,
          esignFinalCopyRecipients: brandConfig.esignFinalCopyRecipients,
          esignNotificationEmailList: brandConfig.esignNotificationEmailList,
          esignDocketTitle: brandConfig.esignDocketTitle,
          esignExpiryDayCount: brandConfig.esignExpiryDayCount,
          sectionManagerName: brandConfig.sectionManagerName,
          sectionManagerPhoneNumber: brandConfig.sectionManagerPhoneNumber,
          sectionManagerEmail: brandConfig.sectionManagerEmail,
          sectionManagerAddress: brandConfig.sectionManagerAddress,
          noDueCopyRecipients: brandConfig.noDueCopyRecipients,
          isAA: brandConfig.isAA,
          isAlternateNumber: brandConfig.isAlternateNumber,
          isCCReminderEmail: brandConfig.isCCReminderEmail,
          ccReminderEmail: brandConfig.ccReminderEmail,
          loanAgreementHeader: finalLoanAgreementHeader,
          loanAgreementFooter: finalLoanAgreementFooter,
          isTestReminderEmail: brandConfig.isTestReminderEmail,
          isUserReminderEmail: brandConfig.isUserReminderEmail,
          forceEmployment: brandConfig.forceEmployment,
          isAadharImageRequired: brandConfig.isAadharImageRequired,
          isAadhaarNumberRequired: brandConfig.isAadhaarNumberRequired,
          loanNoDueCertificateHeader: finalLoanNoDueCertificateHeader,
          loanNoDueCertificateFooter: finalLoanNoDueCertificateFooter,
          autoAllocationType: brandConfig.autoAllocationType,
          evaluationVersion: brandConfig.evaluationVersion,
          signUpVersion: brandConfig.signUpVersion,
          loan_ops_version: brandConfig.loan_ops_version,
          fmsBlockStatus: brandConfig.fmsBlockStatus,
          autoGenerateNOC: brandConfig.autoGenerateNOC,
          enable_central_dedup: brandConfig.enable_central_dedup,
          sunday_off: brandConfig.sunday_off,
          field_visit: brandConfig.field_visit,
          min_age: brandConfig.min_age,
          max_age: brandConfig.max_age,
        },
      });

      // Audit log
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_CONFIG",
        performedByPartnerId: performedByUserId,
        action: "UPDATE",
        changes: brandConfig,
        status: "SUCCESS",
      });

      return updatedBrandConfig;
    } catch (error) {
      // Audit log failure
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_CONFIG",
        performedByPartnerId: performedByUserId,
        action: "UPDATE",
        status: "FAILURE",
        errorMessage: error.message,
      });
      throw error;
    }
  }

  // Brand Sub Domain CRUD
  async getBrandSubDomains(brandId: string) {
    return this.prisma.brand_sub_domains.findMany({
      where: { brandId },
      orderBy: { createdAt: "desc" },
    });
  }

  async createBrandSubDomain(
    brandId: string,
    dto: {
      subdomain: string;
      marketingSource?: string;
      isPrimary?: boolean;
      isDisabled?: boolean;
    },
    performedByUserId: string,
  ) {
    try {
      const result = await this.prisma.brand_sub_domains.create({
        data: {
          brandId,
          subdomain: dto.subdomain,
          marketingSource: dto.marketingSource,
          isPrimary: dto.isPrimary || false,
          isDisabled: dto.isDisabled || false,
        },
      });

      // Audit log
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_SUBDOMAIN",
        performedByPartnerId: performedByUserId,
        action: "CREATE",
        changes: dto,
        status: "SUCCESS",
      });

      return result;
    } catch (error) {
      // Audit log failure
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_SUBDOMAIN",
        performedByPartnerId: performedByUserId,
        action: "CREATE",
        status: "FAILURE",
        errorMessage: error.message,
      });
      throw error;
    }
  }

  async updateBrandSubDomain(
    brandId: string,
    id: string,
    dto: {
      subdomain?: string;
      marketingSource?: string;
      isPrimary?: boolean;
      isDisabled?: boolean;
    },
    performedByUserId: string,
  ) {
    try {
      const result = await this.prisma.brand_sub_domains.update({
        where: { id },
        data: {
          subdomain: dto.subdomain,
          marketingSource: dto.marketingSource,
          isPrimary: dto.isPrimary || false,
          isDisabled: dto.isDisabled || false,
        },
      });

      // Audit log
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_SUBDOMAIN",
        performedByPartnerId: performedByUserId,
        action: "UPDATE",
        changes: dto,
        status: "SUCCESS",
      });

      return result;
    } catch (error) {
      // Audit log failure
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_SUBDOMAIN",
        performedByPartnerId: performedByUserId,
        action: "UPDATE",
        status: "FAILURE",
        errorMessage: error.message,
      });
      throw error;
    }
  }

  async deleteBrandSubDomain(
    brandId: string,
    id: string,
    performedByUserId: string,
  ) {
    try {
      // Check if sub-domain exists and belongs to the brand
      const existingSubDomain = await this.prisma.brand_sub_domains.findFirst({
        where: { id, brandId },
      });

      if (!existingSubDomain) {
        throw new BadRequestException(
          "Sub-domain not found or does not belong to this brand",
        );
      }

      // Delete the sub-domain
      const result = await this.prisma.brand_sub_domains.delete({
        where: { id },
      });

      // Audit log
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_SUBDOMAIN",
        performedByPartnerId: performedByUserId,
        action: "DELETE",
        changes: existingSubDomain,
        status: "SUCCESS",
      });

      return result;
    } catch (error) {
      // Audit log failure
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_SUBDOMAIN",
        performedByPartnerId: performedByUserId,
        action: "DELETE",
        status: "FAILURE",
        errorMessage: error.message,
      });
      throw error;
    }
  }

  // Brand Loan Agreement Config
  async getBrandLoanAgreementConfig(brandId: string) {
    const config = await this.prisma.brand_loan_agreement_configs.findUnique({
      where: {
        brandId: brandId,
      },
    });
    return config;
  }

  async updateBrandLoanAgreementConfig(
    brandId: string,
    config: {
      lenderName: string;
      lenderAddress?: string;
      nameOfDigitalLendingApplication?: string;
      nameOfLendingServiceProvider?: string;
      nameOfLoanServiceProviderRecoveryAgent?: string;
      sectionManagerName?: string;
      sectionManagerAddress?: string;
      sectionManagerEmail?: string;
      grievanceOfficerName?: string;
      grievanceOfficerAddress?: string;
      grievanceOfficerEmail?: string;
      grievanceOfficerPhone?: string;
      sectionManagerPhone?: string;
      nodalOfficerName?: string;
      nodalOfficerAddress?: string;
      nodalOfficerEmail?: string;
      nodalOfficerPhone?: string;
    },
    performedByUserId: string,
  ) {
    try {
      // Check if config already exists
      const existingConfig =
        await this.prisma.brand_loan_agreement_configs.findUnique({
          where: { brandId },
        });

      let result;
      if (existingConfig) {
        // Update existing config
        result = await this.prisma.brand_loan_agreement_configs.update({
          where: { brandId },
          data: {
            lenderName: config.lenderName,
            lenderAddress: config.lenderAddress || "",
            nameOfDigitalLendingApplication:
              config.nameOfDigitalLendingApplication || "",
            nameOfLendingServiceProvider:
              config.nameOfLendingServiceProvider || "",
            nameOfLoanServiceProviderRecoveryAgent:
              config.nameOfLoanServiceProviderRecoveryAgent || "",
            sectionManagerName: config.sectionManagerName || "",
            sectionManagerAddress: config.sectionManagerAddress || "",
            sectionManagerEmail: config.sectionManagerEmail || "",
            grievanceOfficerName: config.grievanceOfficerName || "",
            grievanceOfficerAddress: config.grievanceOfficerAddress || "",
            grievanceOfficerEmail: config.grievanceOfficerEmail || "",
            grievanceOfficerPhone: config.grievanceOfficerPhone || "",
            sectionManagerPhone: config.sectionManagerPhone || "",
            nodalOfficerName: config.nodalOfficerName || "",
            nodalOfficerAddress: config.nodalOfficerAddress || "",
            nodalOfficerEmail: config.nodalOfficerEmail || "",
            nodalOfficerPhone: config.nodalOfficerPhone || "",
          },
        });
      } else {
        // Create new config
        result = await this.prisma.brand_loan_agreement_configs.create({
          data: {
            brandId,
            lenderName: config.lenderName,
            lenderAddress: config.lenderAddress || "",
            nameOfDigitalLendingApplication:
              config.nameOfDigitalLendingApplication || "",
            nameOfLendingServiceProvider:
              config.nameOfLendingServiceProvider || "",
            nameOfLoanServiceProviderRecoveryAgent:
              config.nameOfLoanServiceProviderRecoveryAgent || "",
            sectionManagerName: config.sectionManagerName || "",
            sectionManagerAddress: config.sectionManagerAddress || "",
            sectionManagerEmail: config.sectionManagerEmail || "",
            grievanceOfficerName: config.grievanceOfficerName || "",
            grievanceOfficerAddress: config.grievanceOfficerAddress || "",
            grievanceOfficerEmail: config.grievanceOfficerEmail || "",
            grievanceOfficerPhone: config.grievanceOfficerPhone || "",
            sectionManagerPhone: config.sectionManagerPhone || "",
            nodalOfficerName: config.nodalOfficerName || "",
            nodalOfficerAddress: config.nodalOfficerAddress || "",
            nodalOfficerEmail: config.nodalOfficerEmail || "",
            nodalOfficerPhone: config.nodalOfficerPhone || "",
          },
        });
      }

      // Audit log
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_LOAN_AGREEMENT_CONFIG",
        performedByPartnerId: performedByUserId,
        action: existingConfig ? "UPDATE" : "CREATE",
        changes: config,
        status: "SUCCESS",
      });

      return result;
    } catch (error) {
      // Audit log failure
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_LOAN_AGREEMENT_CONFIG",
        performedByPartnerId: performedByUserId,
        action: "UPSERT",
        status: "FAILURE",
        errorMessage: error.message,
      });
      throw error;
    }
  }

  // Brand Paths CRUD
  async getBrandPaths(brandId: string) {
    return this.prisma.brand_paths.findMany({
      where: { brandId },
      orderBy: { createdAt: "desc" },
    });
  }

  async createBrandPath(
    brandId: string,
    dto: {
      path: string;
      label: string;
      icon?: string;
      isActive?: boolean;
      isDisabled?: boolean;
      sortIndex?: number;
    },
    performedByUserId: string,
  ) {
    try {
      // Check for duplicate path
      const existingPath = await this.prisma.brand_paths.findFirst({
        where: { brandId, path: dto.path },
      });

      if (existingPath) {
        throw new BadRequestException(
          `Path "${dto.path}" already exists for this brand`,
        );
      }

      // Get max sort_index if not provided
      let sortIndex = dto.sortIndex;
      if (sortIndex === undefined) {
        const maxSortIndex = await this.prisma.brand_paths.aggregate({
          where: { brandId },
          _max: { sort_index: true },
        });
        sortIndex = (maxSortIndex._max.sort_index ?? 0) + 1;
      }

      const result = await this.prisma.brand_paths.create({
        data: {
          brandId,
          path: dto.path,
          label: dto.label,
          icon: dto.icon,
          isActive: dto.isActive !== false,
          isDisabled: dto.isDisabled ?? false,
          sort_index: sortIndex,
        },
      });

      // Audit log
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_PATH",
        performedByPartnerId: performedByUserId,
        action: "CREATE",
        changes: dto,
        status: "SUCCESS",
      });

      return result;
    } catch (error) {
      // Audit log failure
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_PATH",
        performedByPartnerId: performedByUserId,
        action: "CREATE",
        status: "FAILURE",
        errorMessage: error.message,
      });
      throw error;
    }
  }

  async updateBrandPath(
    brandId: string,
    id: string,
    dto: {
      path?: string;
      label?: string;
      icon?: string;
      isActive?: boolean;
      isDisabled?: boolean;
      sortIndex?: number;
    },
    performedByUserId: string,
  ) {
    try {
      // Check if path exists and belongs to the brand
      const existingPath = await this.prisma.brand_paths.findFirst({
        where: { id, brandId },
      });

      if (!existingPath) {
        throw new BadRequestException(
          "Path not found or does not belong to this brand",
        );
      }

      // If updating path, check for duplicates
      if (dto.path && dto.path !== existingPath.path) {
        const duplicatePath = await this.prisma.brand_paths.findFirst({
          where: { brandId, path: dto.path },
        });

        if (duplicatePath) {
          throw new BadRequestException(
            `Path "${dto.path}" already exists for this brand`,
          );
        }
      }

      const result = await this.prisma.brand_paths.update({
        where: { id },
        data: {
          path: dto.path,
          label: dto.label,
          icon: dto.icon,
          isActive: dto.isActive,
          isDisabled: dto.isDisabled,
          sort_index: dto.sortIndex,
        },
      });

      // Audit log
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_PATH",
        performedByPartnerId: performedByUserId,
        action: "UPDATE",
        changes: dto,
        status: "SUCCESS",
      });

      return result;
    } catch (error) {
      // Audit log failure
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_PATH",
        performedByPartnerId: performedByUserId,
        action: "UPDATE",
        status: "FAILURE",
        errorMessage: error.message,
      });
      throw error;
    }
  }

  async deleteBrandPath(
    brandId: string,
    id: string,
    performedByUserId: string,
  ) {
    try {
      // Check if path exists and belongs to the brand
      const existingPath = await this.prisma.brand_paths.findFirst({
        where: { id, brandId },
      });

      if (!existingPath) {
        throw new BadRequestException(
          "Path not found or does not belong to this brand",
        );
      }

      const result = await this.prisma.brand_paths.delete({
        where: { id },
      });

      // Audit log
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_PATH",
        performedByPartnerId: performedByUserId,
        action: "DELETE",
        changes: existingPath,
        status: "SUCCESS",
      });

      return result;
    } catch (error) {
      // Audit log failure
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_PATH",
        performedByPartnerId: performedByUserId,
        action: "DELETE",
        status: "FAILURE",
        errorMessage: error.message,
      });
      throw error;
    }
  }

  async reorderBrandPaths(
    brandId: string,
    paths: { id: string; sortIndex: number }[],
    performedByUserId: string,
  ) {
    try {
      // Verify all paths belong to this brand
      const existingPaths = await this.prisma.brand_paths.findMany({
        where: { brandId },
        select: { id: true },
      });

      const existingIds = new Set(existingPaths.map((p: any) => p.id));
      const invalidIds = paths.filter((p) => !existingIds.has(p.id));

      if (invalidIds.length > 0) {
        throw new BadRequestException("Some paths do not belong to this brand");
      }

      // Update all paths in a transaction
      await this.prisma.$transaction(
        paths.map((p) =>
          this.prisma.brand_paths.update({
            where: { id: p.id },
            data: { sort_index: p.sortIndex },
          }),
        ),
      );

      const result = await this.prisma.brand_paths.findMany({
        where: { brandId },
        orderBy: { sort_index: "asc" },
      });

      // Audit log
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_PATH",
        performedByPartnerId: performedByUserId,
        action: "REORDER",
        changes: paths,
        status: "SUCCESS",
      });

      return result;
    } catch (error) {
      // Audit log failure
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_PATH",
        performedByPartnerId: performedByUserId,
        action: "REORDER",
        status: "FAILURE",
        errorMessage: error.message,
      });
      throw error;
    }
  }

  // Brand Adoption tracking
  async getBrandAdoptionStatus(brandId: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
      include: {
        brandDetails: true,
        brandConfig: true,
        brand_themes: true,
        brandPolicyLinks: true,
        brandProviders: true,
      },
    });

    if (!brand) {
      throw new BadRequestException("Brand not found");
    }

    // Get brand paths separately
    const brandPaths = await this.prisma.brand_paths.findMany({
      where: { brandId },
    });

    // Get loan agreement configs separately
    const loanAgreementConfig =
      await this.prisma.brand_loan_agreement_configs.findUnique({
        where: { brandId },
      });

    // Calculate adoption status based on configured features
    const adoptionStatus = {
      brandId: brand.id,
      brandName: brand.name,
      overallAdoption: 0,
      features: {
        details: Boolean((brand as any).brandDetails),
        config: Boolean((brand as any).brandConfig),
        theme: Boolean((brand as any).brand_themes),
        policyLinks: Boolean((brand as any).brandPolicyLinks),
        paths: brandPaths.length > 0,
        providers: Boolean(
          (brand as any).brandProviders &&
            (brand as any).brandProviders.length > 0,
        ),
        loanAgreementConfig: Boolean(loanAgreementConfig),
      },
    };

    // Calculate overall adoption percentage
    const featuresCount = Object.values(adoptionStatus.features).filter(
      (v) => v === true,
    ).length;
    adoptionStatus.overallAdoption = Math.round(
      (featuresCount / Object.keys(adoptionStatus.features).length) * 100,
    );

    return adoptionStatus;
  }

  async markBrandAsAdopted(brandId: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
    });

    if (!brand) {
      throw new BadRequestException("Brand not found");
    }

    // Update brand to mark as adopted (if you have an isAdopted field)
    // For now, we'll just return the adoption status
    return this.getBrandAdoptionStatus(brandId);
  }
}
