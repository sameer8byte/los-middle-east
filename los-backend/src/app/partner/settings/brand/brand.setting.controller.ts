import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Delete,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { AnyFilesInterceptor, FileInterceptor } from "@nestjs/platform-express";
import { AuthType } from "src/common/decorators/auth.decorator";
import { GetPartnerUser } from "src/common/decorators/get-user.decorator";
import { AuthenticatedPartnerUser } from "src/common/types/partner-user.types";
import { BrandService } from "./brand.setting.service";
import { UpdateBrandDto } from "./dto/update-brand.dto";
import { UpdateBrandConfigDto } from "./dto/update-brand-config.dto";
import { UpdateBrandDetailsDto } from "./dto/update-brand-details.dto";
import { UpdateBrandLoanAgreementConfigDto } from "./dto/update-brand-loan-agreement-config.dto";
import {
  CreateBrandSubDomainDto,
  UpdateBrandSubDomainDto,
} from "./dto/brand-sub-domain.dto";
import {
  CreateBrandPathDto,
  UpdateBrandPathDto,
  UpdateBrandPathsOrderDto,
} from "./dto/brand-paths.dto";

@AuthType("partner")
@Controller("partner/brand/:brandId/settings/brand")
export class BrandController {
  constructor(private readonly partnerBrandService: BrandService) {}

  @Get()
  async getBrand(@Param("brandId") brandId: string) {
    return this.partnerBrandService.getBrand(brandId);
  }

  @Post("update")
  @UseInterceptors(FileInterceptor("logo"))
  async updateBrand(
    @Body() body: UpdateBrandDto,
    @Param("brandId") brandId: string,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
    @UploadedFile() logoFile?: Express.Multer.File,
  ) {
    return this.partnerBrandService.updateBrand(
      brandId,
      body.name,
      body.logoUrl,
      // body.domain,
      body.defaultLoanRiskCategory,
      partnerUser.id,
      logoFile,
    );
  }

  @Get("details")
  async getBrandDetails(@Param("brandId") brandId: string) {
    return this.partnerBrandService.getBrandDetails(brandId);
  }

  @Post("details/update")
  async upsertBrand(
    @Param("brandId") brandId: string,
    @Body() body: UpdateBrandDetailsDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.partnerBrandService.updateBrandDetails(brandId, body, partnerUser.id);
  }

  @Get("config")
  async getBrandConfig(@Param("brandId") brandId: string) {
    return this.partnerBrandService.getBrandConfig(brandId);
  }

  @Post("config/update")
  @UseInterceptors(
    AnyFilesInterceptor({
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
          cb(null, true);
        } else {
          cb(new Error("Only image files are allowed"), false);
        }
      },
    })
  )
  async updateBrandConfig(
    @Param("brandId") brandId: string,
    @Body() body: any,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const fileMap: Record<string, Express.Multer.File> = {};
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        fileMap[file.fieldname] = file;
      }
    }
    const brandConfig: UpdateBrandConfigDto = {
      salaryThresholdAmount: Number(body.salaryThresholdAmount),
      rejectionDuration: Number(body.rejectionDuration),
      bankStatementHistoryMonths: Number(body.bankStatementHistoryMonths),
      minLoanAmountRequired: Number(body.minLoanAmountRequired),
      esignFinalCopyRecipients: body.esignFinalCopyRecipients || '',
      esignNotificationEmailList: body.esignNotificationEmailList || '',
      esignDocketTitle: body.esignDocketTitle || '',
      esignExpiryDayCount: Number(body.esignExpiryDayCount),
      sectionManagerName: body.sectionManagerName || '',
      sectionManagerPhoneNumber: body.sectionManagerPhoneNumber || '',
      sectionManagerEmail: body.sectionManagerEmail || '',
      sectionManagerAddress: body.sectionManagerAddress || '',
      noDueCopyRecipients: body.noDueCopyRecipients || '',
      isAA: body.isAA === 'true' || body.isAA === true,
      isAlternateNumber: body.isAlternateNumber === 'true' || body.isAlternateNumber === true,
      loanAgreementVersion: Number(body.loanAgreementVersion),
      isCCReminderEmail: body.isCCReminderEmail === 'true' || body.isCCReminderEmail === true,
      ccReminderEmail: body.ccReminderEmail || '',
      loanAgreementHeader: body.loanAgreementHeader || '',
      loanAgreementFooter: body.loanAgreementFooter || '',
      isTestReminderEmail: body.isTestReminderEmail === 'true' || body.isTestReminderEmail === true,
      isUserReminderEmail: body.isUserReminderEmail === 'true' || body.isUserReminderEmail === true,
      forceEmployment: body.forceEmployment === 'true' || body.forceEmployment === true,
      isAadharImageRequired: body.isAadharImageRequired === 'true' || body.isAadharImageRequired === true,
      isAadhaarNumberRequired: body.isAadhaarNumberRequired === 'true' || body.isAadhaarNumberRequired === true,
      loanNoDueCertificateHeader: body.loanNoDueCertificateHeader || '',
      loanNoDueCertificateFooter: body.loanNoDueCertificateFooter || '',
      autoAllocationType: body.autoAllocationType || 'LOGIN',
      evaluationVersion: body.evaluationVersion || 'V1',
      signUpVersion: body.signUpVersion || 'V1',
      fmsBlockStatus: body.fmsBlockStatus === 'true' || body.fmsBlockStatus === true,
      autoGenerateNOC: body.autoGenerateNOC === 'true' || body.autoGenerateNOC === true,
      enable_central_dedup: body.enable_central_dedup === 'true' || body.enable_central_dedup === true,
      sunday_off: body.sunday_off === 'true' || body.sunday_off === true,
      field_visit: body.field_visit === 'true' || body.field_visit === true,
      min_age: Number(body.min_age),
      max_age: Number(body.max_age),
      loan_ops_version: body.loan_ops_version || 'V1',
      loan_collection_version: body.loan_collection_version || 'V1',
    };

    return this.partnerBrandService.updateBrandConfig(brandId, brandConfig, partnerUser.id, fileMap);
  }

  @Get("sub-domains")
  async getBrandSubDomains(@Param("brandId") brandId: string) {
    return this.partnerBrandService.getBrandSubDomains(brandId);
  }

  @Post("sub-domains")
  async createBrandSubDomain(
    @Param("brandId") brandId: string,
    @Body() dto: CreateBrandSubDomainDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.partnerBrandService.createBrandSubDomain(brandId, dto, partnerUser.id);
  }

  @Post("sub-domains/:id")
  async updateBrandSubDomain(
    @Param("brandId") brandId: string,
    @Param("id") id: string,
    @Body() dto: UpdateBrandSubDomainDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.partnerBrandService.updateBrandSubDomain(brandId, id, dto, partnerUser.id);
  }

  @Post("sub-domains/:id/delete")
  async deleteBrandSubDomain(
    @Param("brandId") brandId: string,
    @Param("id") id: string,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.partnerBrandService.deleteBrandSubDomain(brandId, id, partnerUser.id);
  }

  @Get("loan-agreement-config")
  async getBrandLoanAgreementConfig(@Param("brandId") brandId: string) {
    return this.partnerBrandService.getBrandLoanAgreementConfig(brandId);
  }

  @Post("loan-agreement-config/update")
  async updateBrandLoanAgreementConfig(
    @Param("brandId") brandId: string,
    @Body() body: UpdateBrandLoanAgreementConfigDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.partnerBrandService.updateBrandLoanAgreementConfig(brandId, body, partnerUser.id);
  }

  // Brand Paths endpoints
  @Get("paths")
  async getBrandPaths(@Param("brandId") brandId: string) {
    return this.partnerBrandService.getBrandPaths(brandId);
  }

  @Post("paths")
  async createBrandPath(
    @Param("brandId") brandId: string,
    @Body() dto: CreateBrandPathDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.partnerBrandService.createBrandPath(brandId, dto, partnerUser.id);
  }

  @Post("paths/reorder")
  async reorderBrandPaths(
    @Param("brandId") brandId: string,
    @Body() dto: UpdateBrandPathsOrderDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.partnerBrandService.reorderBrandPaths(brandId, dto.paths, partnerUser.id);
  }

  @Post("paths/:id")
  async updateBrandPath(
    @Param("brandId") brandId: string,
    @Param("id") id: string,
    @Body() dto: UpdateBrandPathDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.partnerBrandService.updateBrandPath(brandId, id, dto, partnerUser.id);
  }

  @Delete("paths/:id")
  async deleteBrandPath(
    @Param("brandId") brandId: string,
    @Param("id") id: string,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.partnerBrandService.deleteBrandPath(brandId, id, partnerUser.id);
  }

  // Brand Adoption endpoints
  @Get("adoption-status")
  async getBrandAdoptionStatus(@Param("brandId") brandId: string) {
    return this.partnerBrandService.getBrandAdoptionStatus(brandId);
  }

  @Post("mark-adopted")
  async markBrandAsAdopted(@Param("brandId") brandId: string) {
    return this.partnerBrandService.markBrandAsAdopted(brandId);
  }
}
