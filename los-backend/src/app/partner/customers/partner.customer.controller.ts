import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { AuthType } from "src/common/decorators/auth.decorator";
import { GetPartnerUser } from "src/common/decorators/get-user.decorator";
import { AuthenticatedPartnerUser } from "src/common/types/partner-user.types";
import { PartnerCustomerService } from "./partner.customer.service";
import { AutoAllocationUserService } from "src/features/autoAllocation/services/user.autoAllocation.service";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { CreateVerifiedDocumentUploadDto } from "./dto/add-verified-docs.dto";
import { GetCustomersDto } from "./dto/get-customers.dto";
import { CreateBankAccountStatementDto } from "src/app/web/bank/dto/create-bank-statement";
import { ReloanStatus } from "@prisma/client";
import { UpsertDocumentUploadDto } from "./dto/upsert-other-docs.dto";
import { UpsertEmploymentDto } from "./dto/employment.dto";
import { UpdateUserBankAccountDto } from "src/shared/user-bank-account/dto/update-user-bank-account.dto";
import { AddAlternatePhoneNumberDto } from "./dto/add-alternate-phone-number.dto";
import { VerifyAlternatePhoneNumberDto } from "./dto/verify-alternate-phone-number.dto";
import { AddCustomerAddressDto } from "./dto/add-customer-address.dto";
import { UpdateDocumentNumberDto } from "./dto/update-document-number.dto";
import {
  CreateUserSalaryDto,
  UpdateUserSalaryDto,
} from "./dto/user-salary.dto";

@AuthType("partner")
@Controller("partner/brand/:brandId/customers")
export class PartnerCustomerController {
  constructor(
    private readonly partnerCustomerService: PartnerCustomerService,
    private readonly autoAllocationUserService: AutoAllocationUserService,
  ) {}

  @Get()
  async getAllCustomers(
    @Param("brandId") brandId: string,
    @Query() query: GetCustomersDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.partnerCustomerService.findAllUsers(
      brandId,
      partnerUser,
      {
        page: query.page || 1,
        limit: query.limit || 10,
        dateFilter: query.dateFilter || "[]",
      },
      {
        status: query.status || "[]",
        kycStatus: query.kycStatus || "[]",
        search: query.search || "",
        userReloanStatus: query.userReloanStatus || "PENDING", // Default to "PENDING" if not provided
        allottedPartnerUserIds: query.allottedPartnerUserIds || "[]",
        allottedSupervisorIds: query.allottedSupervisorIds || "[]",
        loanCount: query.loanCount || "[]",
        salaryMin: query.salaryMin || null,
        salaryMax: query.salaryMax || null,
      },
    );
  }

  @Get("unallocated/list")
  async getUnallocatedCustomers(
    @Param("brandId") brandId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("search") search: string = "",
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.partnerCustomerService.findUnallocatedCustomers(
      brandId,
      partnerUser,
      {
        page: page || 1,
        limit: limit || 10,
        search: search || "",
      },
    );
  }

  @Post("unallocated/allocate")
  @HttpCode(HttpStatus.OK)
  async allocateCustomers(
    @Param("brandId") brandId: string,
    @Body() body: { customerIds: string[]; partnerUserId: string },
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.autoAllocationUserService.allocateCustomersToPartnerUser(
      brandId,
      body.customerIds,
      body.partnerUserId,
    );
  }

  @Get(":userId/profile")
  async getCustomerById(@Param("userId") userId: string) {
    return this.partnerCustomerService.findUserById(userId);
  }

  @Get(":userId/device-info")
  async getUserDeviceInfo(@Param("userId") userId: string) {
    return this.partnerCustomerService.getUserDeviceInfo(userId);
  }

  @Get(":userId/documents")
  async getCustomerDocuments(@Param("userId") userId: string) {
    return this.partnerCustomerService.getUserDocuments(userId);
  }

  @Get(":userId/signed-documents")
  async getCustomerSignedDocuments(@Param("userId") userId: string) {
    return this.partnerCustomerService.getUserSignedDocuments(userId);
  }

  @Get(":userId/no-due-certificates")
  async getCustomerNoDueCertificates(@Param("userId") userId: string) {
    return this.partnerCustomerService.getUserNoDueCertificates(userId);
  }
  @Get(":userId/repayment-timeline")
  async getCustomerRepaymentTimeline(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
  ) {
    return this.partnerCustomerService.getUserRepaymentTimeline(
      userId,
      brandId,
    );
  }
  @Get(":userId/user-details")
  async getCustomerDetails(@Param("userId") userId: string) {
    return this.partnerCustomerService.getUserDetails(userId);
  }

  @Get("search/:formattedUserId")
  async searchUserByFormattedId(
    @Param("brandId") brandId: string,
    @Param("formattedUserId") formattedUserId: string,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.partnerCustomerService.searchUserByFormattedId(
      brandId,
      formattedUserId,
      partnerUser,
    );
  }

  @Get(":userId/bank-accounts")
  async getCustomerBankAccounts(@Param("userId") userId: string) {
    return this.partnerCustomerService.getUserBankAccount(userId);
  }
  @Get(":userId/employment")
  async getCustomerEmployment(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
  ) {
    return this.partnerCustomerService.getUserEmploymentDetails(
      userId,
      brandId,
    );
  }
  //setPrimaryBankAccount
  @Post(":userId/primary-bank-account")
  async setPrimaryBankAccount(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,

    @Body()
    {
      userBankAccountId,
    }: {
      userBankAccountId: string;
    },
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    const partnerUserId = partnerUser.id;

    return this.partnerCustomerService.setPrimaryBankAccount(
      brandId,
      userId,
      userBankAccountId,
      partnerUserId,
    );
  }

  @Post(":userId/employment")
  async upsertCustomerEmployment(
    @Param("userId") userId: string,
    @Body() data: UpsertEmploymentDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    const partnerUserId = partnerUser.id;

    return this.partnerCustomerService.upsertUserEmployment(
      userId,
      data,
      partnerUserId,
    );
  }

  @Get(":userId/alternate-phone-numbers")
  async getCustomerAlternatePhoneNumbers(
    @Param("userId") userId: string,
    // @GetPartnerUser() partnerUser: AuthenticatedPartnerUser
  ) {
    // const partnerUserId = partnerUser.id;

    return this.partnerCustomerService.getAlternatePhoneNumber(userId);
  }

  @Get(":userId/alternate-phone-numbers-loans")
  async getCustomerAlternatePhoneLoans(@Param("userId") userId: string) {
    return this.partnerCustomerService.getAlternatePhoneLoans(userId);
  }

  @Post(":userId/alternate-phone-numbers")
  async addAlternatePhoneNumber(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
    @Body() data: AddAlternatePhoneNumberDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    const partnerUserId = partnerUser.id;

    return this.partnerCustomerService.addAlternatePhoneNumber(
      userId,
      brandId,
      partnerUserId,
      data,
    );
  }

  @Post(":userId/alternate-phone-numbers/:alternatePhoneId/verify")
  async verifyAlternatePhoneNumber(
    @Param("userId") userId: string,
    @Param("alternatePhoneId") alternatePhoneId: string,
    @Body() data: VerifyAlternatePhoneNumberDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    const partnerUserId = partnerUser.id;

    return this.partnerCustomerService.verifyAlternatePhoneNumber(
      userId,
      alternatePhoneId,
      data.otp,
    );
  }

  @Post(":userId/alternate-phone-numbers/:alternatePhoneId/resend-otp")
  async resendAlternatePhoneOtp(
    @Param("userId") userId: string,
    @Param("alternatePhoneId") alternatePhoneId: string,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    const partnerUserId = partnerUser.id;

    return this.partnerCustomerService.resendAlternatePhoneOtp(
      userId,
      alternatePhoneId,
    );
  }

  @Delete(":userId/alternate-phone-numbers/:alternatePhoneId")
  async deleteAlternatePhoneNumber(
    @Param("userId") userId: string,
    @Param("alternatePhoneId") alternatePhoneId: string,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    const partnerUserId = partnerUser.id;

    return this.partnerCustomerService.deleteAlternatePhoneNumber(
      userId,
      alternatePhoneId,
      partnerUserId,
    );
  }

  @Post(":userId/bank-account/:bankAccountId/statement")
  @UseInterceptors(FileInterceptor("file")) // 'file' is the name of the form field
  async uploadBankAccountStatement(
    @UploadedFile() file: Express.Multer.File,
    @Body() data: CreateBankAccountStatementDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    const partnerUserId = partnerUser.id;

    return this.partnerCustomerService.createBankStatement(partnerUserId, {
      ...data,
      file,
    });
  }

  @Get(":userId/summary")
  async getCustomerSummary(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
    // @GetPartnerUser() partnerUser: AuthenticatedPartnerUser
  ) {
    // const partnerUserId = partnerUser.id;

    return this.partnerCustomerService.getUserSummary(userId, brandId);
  }

  // get bsa report
  @Get(":userId/bsa-report")
  async getBsaReport(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
    @Query("bankAccountStatementId") bankAccountStatementId: string,
    @Query("userBankAccountId") userBankAccountId: string,
    // @GetPartnerUser() partnerUser: AuthenticatedPartnerUser
  ) {
    // const partnerUserId = partnerUser.id;

    return this.partnerCustomerService.getBsaReport(
      brandId,
      userId,
      userBankAccountId,
      bankAccountStatementId,
    );
  }

  // Get all bank accounts for a user
  @Get(":userId/bank-accounts")
  async getAllBankAccounts(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
    // @GetPartnerUser() partnerUser: AuthenticatedPartnerUser
  ) {
    // const partnerUserId = partnerUser.id;

    return this.partnerCustomerService.getAllBankAccounts(brandId, userId);
  }

  // Get single bank account by ID
  @Get(":userId/bank-account/:bankAccountId")
  async getBankAccount(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
    @Param("bankAccountId") bankAccountId: string,
    // @GetPartnerUser() partnerUser: AuthenticatedPartnerUser
  ) {
    // const partnerUserId = partnerUser.id;

    return this.partnerCustomerService.getBankAccountById(
      brandId,
      userId,
      bankAccountId,
    );
  }

  // Create new bank account
  @Post(":userId/bank-accounts")
  async createBankAccount(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
    @Body() dto: UpdateUserBankAccountDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    const partnerUserId = partnerUser.id;

    return this.partnerCustomerService.createBankAccount(
      brandId,
      userId,
      dto,
      partnerUserId,
    );
  }

  // Update existing bank account
  @Post(":userId/bank-account/:bankAccountId")
  async updateBankAccount(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
    @Param("bankAccountId") bankAccountId: string,
    @Body() dto: UpdateUserBankAccountDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    const partnerUserId = partnerUser.id;

    return this.partnerCustomerService.updateBankAccount(
      brandId,
      userId,
      bankAccountId,
      dto,
      partnerUserId,
    );
  }

  // Delete bank account
  @Delete(":userId/bank-account/:bankAccountId")
  async deleteBankAccount(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
    @Param("bankAccountId") bankAccountId: string,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    const partnerUserId = partnerUser.id;

    return this.partnerCustomerService.deleteBankAccount(
      brandId,
      userId,
      bankAccountId,
      partnerUserId,
    );
  }
  @Post(":userId/upload-verification-documents")
  @UseInterceptors(FilesInterceptor("files", 2))
  @HttpCode(HttpStatus.OK)
  async aadhaarDocumentUpload(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body()
    data: Omit<
      CreateVerifiedDocumentUploadDto,
      "userId" | "frontDocument" | "backDocument"
    >,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    const partnerUserId = partnerUser.id;

    return this.partnerCustomerService.addVerifiedDocument(
      userId,
      brandId,
      partnerUserId,
      { ...data, userId },
      files,
    );
  }

  @Post(":userId/upsert-other-documents")
  @UseInterceptors(FilesInterceptor("files", 2))
  @HttpCode(HttpStatus.OK)
  async otherDocumentUpload(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body()
    data: Omit<UpsertDocumentUploadDto, "frontDocument" | "backDocument">,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    const partnerUserId = partnerUser.id;

    return this.partnerCustomerService.upsertOtherDocument(
      userId,
      brandId,
      partnerUserId,
      { ...data, userId },
      files,
    );
  }

  @Patch(":userId/update-document-number")
  @HttpCode(HttpStatus.OK)
  async updateDocumentNumber(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
    @Body() dto: UpdateDocumentNumberDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    const partnerUserId = partnerUser.id;

    return this.partnerCustomerService.updateDocumentNumber(
      userId,
      brandId,
      partnerUserId,
      dto,
    );
  }

  @AuthType("public")
  @Get(":userId/get-addresses")
  async updateCustomerAddress(@Param("userId") userId: string) {
    return this.partnerCustomerService.getUserAddresses(userId);
  }

  @AuthType("partner")
  @Post(":userId/generate-aadhaar-link")
  async postGenerateAadhaarLink(
    @Param("userId") userId: string,
    @Body()
    body: {
      userId: string;
      brandId: string;
    },
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    const partnerUserId = partnerUser.id;

    return this.partnerCustomerService.getAadhaarLink(
      userId,
      body.brandId,
      partnerUserId,
    );
  }
  // getRecentDigiLockerUrls
  @Get(":userId/recent-digilocker-urls")
  async getRecentDigiLockerUrls(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
    // @GetPartnerUser() partnerUser: AuthenticatedPartnerUser
  ) {
    // const partnerUserId = partnerUser.id;

    return this.partnerCustomerService.getRecentDigiLockerUrls(userId, brandId);
  }

  //addCustomerAddress

  @Post(":userId/alternate-addresses")
  async addCustomerAddress(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
    @Body() data: AddCustomerAddressDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    const partnerUserId = partnerUser.id;

    return this.partnerCustomerService.upsertAlternateAddress(
      userId,
      brandId,
      partnerUserId,
      data,
    );
  }

  //getManualVerificationDetails
  @Get(":userId/manual-verification-details")
  async getManualVerificationDetails(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
    // @GetPartnerUser() partnerUser: AuthenticatedPartnerUser
  ) {
    // const partnerUserId = partnerUser.id;

    return this.partnerCustomerService.getManualVerificationDetails(
      userId,
      brandId,
    );
  }

  // Skip onboarding step
  // @Post(":userId/skip-onboarding-step")
  // @HttpCode(HttpStatus.OK)
  // async skipOnboardingStep(
  //   @Param("userId") userId: string,
  //   @Param("brandId") brandId: string,
  //   @Body()
  //   data: {
  //     stepNumber: number;
  //     reason?: string;
  //   },
  //   @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  // ) {
  //   const partnerUserId = partnerUser.id;

  //   return this.partnerCustomerService.skipOnboardingStep(
  //     userId,
  //     brandId,
  //     partnerUserId,
  //     data.stepNumber,
  //     data.reason || "Manually skipped by partner admin",
  //   );
  // }

  //updateUserReloan
  @Post(":userId/reloan")
  async updateUserReloan(
    @Param("userId") userId: string,
    @Body()
    data: {
      id: string; // This is the userReloanId
      status: ReloanStatus; // Ideally ReloanStatus
      reason?: string;
    },
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    const partnerUserId = partnerUser.id;

    return this.partnerCustomerService.updateUserReloan(
      data.id,
      data.status,
      partnerUserId,
      data.reason,
    );
  }

  @Post(":userId/upload-profile-media")
  @UseInterceptors(
    FilesInterceptor("files", 2, {
      fileFilter: (req, file, callback) => {
        // Allow images and videos
        if (
          file.mimetype.startsWith("image/") ||
          file.mimetype.startsWith("video/")
        ) {
          callback(null, true);
        } else {
          callback(new Error("Only image and video files are allowed"), false);
        }
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  )
  @HttpCode(HttpStatus.OK)
  async uploadProfileMedia(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    const partnerUserId = partnerUser.id;

    return this.partnerCustomerService.uploadProfileMedia(
      userId,
      brandId,
      partnerUserId,
      files,
    );
  }

  // Save user status brand reasons
  @Post(":userId/user-status-brand-reasons")
  @HttpCode(HttpStatus.OK)
  async saveUserStatusBrandReasons(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
    @Body()
    data: {
      brandStatusReasonIds: string[];
      status_id: bigint;
    },
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    const partnerUserId = partnerUser.id;

    return this.partnerCustomerService.saveUserStatusBrandReasons(
      userId,
      brandId,
      partnerUserId,
      data.brandStatusReasonIds,
      data.status_id,
    );
  }

  @Patch(":userId/update-residence-type")
  @HttpCode(HttpStatus.OK)
  async updateResidenceType(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
    @Body() data: { residenceType: string },
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    const partnerUserId = partnerUser.id;

    return this.partnerCustomerService.updateResidenceType(
      userId,
      data.residenceType,
      partnerUserId,
    );
  }

  @Patch(":userId/update-gender")
  @HttpCode(HttpStatus.OK)
  async updateGender(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
    @Body() data: { gender: string },
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    const partnerUserId = partnerUser.id;

    return this.partnerCustomerService.updateGender(
      userId,
      data.gender,
      partnerUserId,
    );
  }

  @Patch(":userId/update-religion")
  @HttpCode(HttpStatus.OK)
  async updateReligion(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
    @Body() data: { religion: string },
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    const partnerUserId = partnerUser.id;

    return this.partnerCustomerService.updateReligion(
      userId,
      data.religion,
      partnerUserId,
    );
  }

  @Patch(":userId/update-marital-status")
  @HttpCode(HttpStatus.OK)
  async updateMaritalStatus(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
    @Body() data: { maritalStatus: string },
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    const partnerUserId = partnerUser.id;

    return this.partnerCustomerService.updateMaritalStatus(
      userId,
      data.maritalStatus,
      partnerUserId,
    );
  }

  @Patch(":userId/update-date-of-birth")
  @HttpCode(HttpStatus.OK)
  async updateDateOfBirth(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
    @Body() data: { dateOfBirth: string },
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    const partnerUserId = partnerUser.id;

    return this.partnerCustomerService.updateDateOfBirth(
      userId,
      data.dateOfBirth,
      partnerUserId,
    );
  }

  @Patch(":userId/update-alternate-phone-1")
  @HttpCode(HttpStatus.OK)
  async updateAlternatePhone1(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
    @Body() data: { alternatePhone1: string },
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser
  ) {
    const partnerUserId = partnerUser.id;

    return this.partnerCustomerService.updateAlternatePhone1(
      userId,
      data.alternatePhone1,
      partnerUserId
    );
  }

  @Patch(":userId/update-alternate-phone-2")
  @HttpCode(HttpStatus.OK)
  async updateAlternatePhone2(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
    @Body() data: { alternatePhone2: string },
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser
  ) {
    const partnerUserId = partnerUser.id;

    return this.partnerCustomerService.updateAlternatePhone2(
      userId,
      data.alternatePhone2,
      partnerUserId
    );
  }

  // ==================== User Salaries Management ====================

  @Get(":userId/salaries")
  async getUserSalaries(@Param("userId") userId: string) {
    return this.partnerCustomerService.getUserSalaries(userId);
  }

  @Post(":userId/salaries")
  async createUserSalary(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
    @Body() data: CreateUserSalaryDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.partnerCustomerService.createUserSalary(
      userId,
      partnerUser.id,
      data,
    );
  }

  @Patch(":userId/salaries/:salaryId")
  async updateUserSalary(
    @Param("userId") userId: string,
    @Param("salaryId") salaryId: string,
    @Body() data: UpdateUserSalaryDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.partnerCustomerService.updateUserSalary(userId, salaryId, data);
  }

  @Delete(":userId/salaries/:salaryId")
  @HttpCode(HttpStatus.OK)
  async deleteUserSalary(
    @Param("userId") userId: string,
    @Param("salaryId") salaryId: string,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.partnerCustomerService.deleteUserSalary(userId, salaryId);
  }

  @Get(":userId/ip-check")
  @HttpCode(HttpStatus.OK)
  async checkIpAddressAssociation(@Param("userId") userId: string) {
    return this.partnerCustomerService.checkIpAddressAssociation(userId);
  }

  @Get(":userId/bureau-summary")
  @HttpCode(HttpStatus.OK)
  async getBureauSummary(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
  ) {
    // You could also verify if the user belongs to the brandId here
    return this.partnerCustomerService.getBureauLoanSummary(userId);
  }
}
