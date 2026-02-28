import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Query,
  UseGuards,
  BadRequestException
} from "@nestjs/common";
import { PermissionType } from "@prisma/client";
import { AuthType } from "src/common/decorators/auth.decorator";
import {
  RequireRoleOrPermission,
} from "src/common/decorators/role-permission.decorator";
import { RolePermissionGuard } from "src/common/guards/role-permission.guard";
import { GetPartnerUser } from "src/common/decorators/get-user.decorator";
import { AuthenticatedPartnerUser } from "src/common/types/partner-user.types";
import { PartnerLoansService } from "./partner.loans.service";
import { UpdateLoanStatusDto } from "./dto/update-loan.dto";
import { UpdateLoanWithReasonsDto } from "./dto/update-loan-with-reasons.dto";
import { GetLoansXlsxDto } from "./dto/get-loans-xlsx.dto";
import { GetLoansDto } from "./dto/get-loans.dto";
import { GenerateLoanNoDueCertificateDto } from "./dto/generate-loan-no-due-certificate.dto";
import { SendNoDueCertificateEmailDto } from "./dto/send-no-due-certificate-email.dto";
import { SendBackToCeDto } from "./dto/send-back-to-ce.dto";
import { ReactivateLoanDto } from "./dto/reactivate-loan.dto";
import { ForceBypassReportsDto } from "./dto/force-bypass-reports.dto";
import { ChangeLoanRuleTypeDto } from "./dto/change-loan-rule-type.dto";
import { SendBackToCeSmDto } from "./dto/send-back-to-ce-sm.dto"
import { LoansService } from "src/features/loans/services/loans.services";
import { PartnerTabsEnum } from "src/constant/enum";
import { CollectionService } from "src/features/autoAllocation/services/collection.autoAllocation.service";
import { FieldVisitDto } from "./dto/create-field-visit.dto";

@AuthType("partner")
@Controller("partner/brand/:brandId/loans")
export class PartnerLoansController {
  constructor(
    private readonly partnerLoansService: PartnerLoansService,
    private readonly loansService: LoansService,
    private readonly collectionService: CollectionService
  ) { }

    @Get('disbursed-amount')
    async getDisbursedAmount(
      @Param('brandId') brandId: string,
      @Query('disbursementDateFrom') disbursementDateFrom?: string,
      @Query('disbursementDateTo') disbursementDateTo?: string,
    ) {
      if (!disbursementDateFrom) {
        throw new BadRequestException('disbursementDateFrom parameter is required');
      }

      // If only start date is provided, treat as single date
      const endDate = disbursementDateTo || disbursementDateFrom;

      const result = await this.partnerLoansService.getDisbursedAmountByDateAndBrand(
        brandId,
        disbursementDateFrom,
        endDate,
      );

      return {
        success: true,
        data: result,
      };
    }

  @AuthType("partner")
  @Get("no-due-pending")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["LOAN_OPS", "ADMIN", "SUPER_ADMIN"],
    operator: "OR",
    permissions: [
      { permission: "ALL", type: "ALL" },
      { permission: "LOAN_OPS", type: "ALL" },
    ],
  })
  async getNoDuePendingLoans(
    @Param("brandId") brandId: string,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "10",
    @Query("search") search?: string,
  ) {
    return this.partnerLoansService.getNoDuePendingLoans(
      brandId,
      partnerUser.id,
      {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        search: search?.trim() || "",
      }
    );
  }

  @Get(":loanId")
  async getLoan(
    @Param("loanId") loanId: string,
    @Param("brandId") brandId: string
  ) {
    return this.partnerLoansService.getLoan(loanId, brandId);
  }

  @Get("role/:partnerRole")
  async getLoans(
    @Param("brandId") brandId: string,
    @Param("partnerRole") partnerRole: PartnerTabsEnum,
    @Query() query: GetLoansDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser
  ) {
    return this.partnerLoansService.getLoans(
      brandId,
      partnerRole,
      partnerUser.id,
      {
        page: query.page || 1,
        limit: query.limit || 10,
        dateFilter: query.dateFilter || "[]",
      },
      {
        status: query.status || "[]",
        pSenctionStatus: query.pSenctionStatus || "[]",
        search: query.search || "",
        loanAgreementStatus: query.loanAgreementStatus || "[]",
        opsStatus: query.opsStatus || "",
        assignedExecutive: query.assignedExecutive || "[]",
        assignedSupervisor: query.assignedSupervisor || "[]",
        assignedCollectionExecutive: query.assignedCollectionExecutive || "[]",
        assignedCollectionSupervisor: query.assignedCollectionSupervisor || "[]",
        loanType: query.loanType || "",
        customDateFrom: query.customDateFrom || "",
        customDateTo: query.customDateTo || "",
        salaryMin: query.salaryMin || "",
        salaryMax: query.salaryMax || "",
      }
    );
  }

  @Get("role/:partnerRole/signed-agreements")
  async getLoansWithSignedAgreements(
    @Param("brandId") brandId: string,
    @Param("partnerRole") partnerRole: string,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser
  ) {
    return this.partnerLoansService.getSignedAgreementLoans(
      brandId,
      partnerRole,
      partnerUser.id
    );
  }

  @Post("xlsx")
  async postLoansXlsx(@Body() data: GetLoansXlsxDto) {
    const { loanIds, brandId, brandBankAccountId, fileType } = data;
    return this.partnerLoansService.generateLoanXlsx(
      brandId,
      loanIds,
      brandBankAccountId,
      fileType
    );
  }
  //csv
  @Post("csv")
  async postLoansCsv(@Body() data: GetLoansXlsxDto) {
    const { loanIds, brandId, brandBankAccountId, fileType } = data;
    return this.partnerLoansService.generateLoanCSV(
      brandId,
      loanIds,
      brandBankAccountId,       
      fileType
    );
  } 
  //getTenuresByRuleId
  @Get("tenures")
  async getTenuresByRuleId(
    @Param("brandId") brandId: string,
    @Query("loanRuleId") loanRuleId: string
  ) {
    return this.partnerLoansService.getTenuresByRuleId(loanRuleId, brandId);
  }
  //loan_no_due_certificates
  @Post("loan-no-due-certificate")
  async generateLoanNoDueCertificate(
    @Body() generateLoanNoDueCertificateDto: GenerateLoanNoDueCertificateDto
  ) {
    return this.partnerLoansService.generateLoanNoDueCertificate(
      generateLoanNoDueCertificateDto.brandId,
      generateLoanNoDueCertificateDto.loanId
    );
  }
  //sendNoDueCertificateEmail
  @Post("send-no-due-certificate-email")
  async sendNoDueCertificateEmail(
    @Param("brandId") brandId: string,
    @Body() body: SendNoDueCertificateEmailDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser
  ) {
    return this.partnerLoansService.sendNoDueCertificateEmail(
      brandId,
      body.loanId,
      partnerUser.id
    );
  }

  @Post("update-loan-amount")
  async updateLoanAmount(
    @Param("brandId") brandId: string,
    @Body()
    body: {
      userId: string;
      amount: number;
      loanId: string;

    }
  ) {
    return this.loansService.updateLoanAmount(
      body.userId,
      body.amount,
      body.loanId
    );
  }

  @Post("loan-evaluation-details")
  async postLoanDetailsEvaluations(
    @Body() body: { formattedLoanId: string; brandId: string; userId: string }
  ) {
    const { formattedLoanId, brandId, userId } = body;
    return this.partnerLoansService.getLoanDetailsEvaluations(
      formattedLoanId,
      brandId,
      userId
    );
  }

  @Post("send-back-to-ce")
  @RequireRoleOrPermission({
    roles: ['SANCTION_HEAD', 'SANCTION_MANAGER', 'SUPER_ADMIN', 'ADMIN'],
    permissions: [
      {
        permission: 'LOAN_SEND_BACK',
        type: PermissionType.ALL
      },
      { permission: 'ALL', type: PermissionType.ALL },
    ],
    operator: 'OR',
  })
  async sendBackToCe(
    @Param("brandId") brandId: string,
    @Body() body: SendBackToCeDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser
  ) {
    return this.partnerLoansService.sendBackToCreditExecutive(
      partnerUser.id,
      brandId,
      body
    );
  }
  @Post('send-back-to-ce-sm')
  @RequireRoleOrPermission({
    roles: ['LOAN_OPS', 'SUPER_ADMIN', 'ADMIN'],
    permissions: [
      { permission: 'LOAN_SEND_BACK', type: PermissionType.ALL },
      { permission: 'ALL', type: PermissionType.ALL },
    ],
    operator: 'OR',
  })
  async sendBackToCESM(
    @Param("brandId") brandId: string,
    @Req() req: any,
    @Body() sendBackDto: SendBackToCeSmDto
  ): Promise<any> {
    const partnerUserId = req.partnerUser.id;
    return this.partnerLoansService.sendBackToCreditExecutiveAndSanctionManager(
      partnerUserId,
      brandId,
      sendBackDto
    );
  }

  @Post(":loanId/skip-autopay-consent")
  @RequireRoleOrPermission({
    roles: ["SANCTION_HEAD", "SANCTION_MANAGER", "ADMIN", "SUPER_ADMIN"],
    permissions: [
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  async skipAutopayConsent(
    @Param("brandId") brandId: string,
    @Param("loanId") loanId: string,
    @Body() body: { reason?: string },
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser
  ) {
    return this.partnerLoansService.skipAutopayConsent(
      brandId,
      loanId,
      body.reason
    );
  }

  @Post(":loanId/with-reasons")
  async updateLoanWithReasons(
    @Param("loanId") loanId: string,
    @Param("brandId") brandId: string,
    @Body() body: UpdateLoanWithReasonsDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser
  ) {
    return this.partnerLoansService.updateStatusLoanWithReasons(
      partnerUser.id,
      body
    );
  }

  @Post(":loanId")
  async updateLoan(
    @Param("loanId") loanId: string,
    @Param("brandId") brandId: string,
    @Body() body: UpdateLoanStatusDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser
  ) {
    return this.partnerLoansService.updateLoanStatus(partnerUser.id, body);
  }

  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SANCTION_HEAD", 'SANCTION_MANAGER', "ADMIN", "SUPER_ADMIN"],
    permissions: [
      { permission: 'LOAN_REACTIVATE', type: PermissionType.ALL },
      { permission: 'ALL', type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  @Post(":loanId/reactivate")
  async reactivateLoan(
    @Param("loanId") loanId: string,
    @Param("brandId") brandId: string,
    @Body() body: ReactivateLoanDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser
  ) {
    return this.partnerLoansService.reactivateLoan(
      partnerUser.id,
      loanId,
      body.reason
    );
  }

  @AuthType("partner")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SANCTION_HEAD", 'SANCTION_MANAGER', "ADMIN", "SUPER_ADMIN"],
    permissions: [
      { permission: "LOAN_FORCE_BYPASS", type: PermissionType.ALL },
      { permission: 'ALL', type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  @Post(":loanId/force-bypass-reports")
  async forceBypassReports(
    @Param("loanId") loanId: string,
    @Param("brandId") brandId: string,
    @Body() body: ForceBypassReportsDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser
  ) {
    return this.partnerLoansService.forceBypassReports(
      partnerUser.id,
      loanId,
      body.reason
    );
  }

  @AuthType("partner")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: [
      "SANCTION_HEAD",
      "SANCTION_MANAGER",
      "CREDIT_EXECUTIVE",
      "ADMIN",
      "SUPER_ADMIN",
    ],
    permissions: [
      { permission: "LOAN_RULE_TYPE", type: PermissionType.WRITE },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  @Post(":loanId/change-rule-type")
  async changeRuleType(
    @Param("loanId") loanId: string,
    @Param("brandId") brandId: string,
    @Body() body: ChangeLoanRuleTypeDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser
  ) {
    return this.partnerLoansService.changeRuleType(
      partnerUser.id,
      loanId,
      brandId,
      body.ruleType,
      body.reason
    );
  }

  @Post("cache/clear")
  async clearLoansCache(
    @Param("brandId") brandId: string,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser
  ) {
    await this.partnerLoansService.invalidateLoansCacheForBrand(brandId);

    return {
      success: true,
      message: `Loans cache cleared for brand `,
      clearedBy: partnerUser.email,
      timestamp: new Date().toISOString()
    };
  }

  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["COLLECTION_HEAD", "COLLECTION_MANAGER", "ADMIN", "SUPER_ADMIN"],
    permissions: [
      {
        permission: "COLLECTION_REALLOCATE_LOANS",
        type: PermissionType.WRITE,
      },
      { permission: 'ALL', type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  @Post(":loanId/collection-partners")
  async allocateCollectionPartner(
    @Param("loanId") loanId: string,
    @Body()
    body: {
      partnerUserId: string;
      remarks?: string;
    },
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser
  ) {
    return this.collectionService.allocateCollectionPartner(
      loanId,
      body.partnerUserId,
      body.remarks || null,
      partnerUser.id
    );
  }

  @Post(":loanId/comments")
  async addLoanStatusHistory(
    @Param("loanId") loanId: string,
    @Param("brandId") brandId: string,
    @Body()
    createLoanCommentDto: {
      comment: string;
      brandId: string;
    },
    @GetPartnerUser() user: AuthenticatedPartnerUser
  ) {
    return this.partnerLoansService.addLoanStatusHistory(
      loanId,
      createLoanCommentDto.comment,
      user.id,
      brandId
    );
  }

  @Get(":loanId/comments")
  async getLoanStatusHistory(
    @Param("loanId") loanId: string,
    @Param("brandId") brandId: string,
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "10"
  ) {
    const pagination = {
      page: Number.parseInt(page) || 1,
      limit: Number.parseInt(limit) || 10,
    };
    return this.partnerLoansService.getLoanStatusHistory(
      loanId,
      brandId,
      pagination
    );
  }

  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["COLLECTION_HEAD", "ADMIN", "SUPER_ADMIN"],
    permissions: [
      {
        permission: "COLLECTION_REALLOCATE_LOANS",
        type: PermissionType.WRITE,
      },
      { permission: 'ALL', type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  @Get("collection-partners/by-due-date-and-partner")
  async getLoansByDueDateAndPartner(
    @Param("brandId") brandId: string,
    @Query("dueDateFrom") dueDateFrom?: string,
    @Query("dueDateTo") dueDateTo?: string,
    @Query("sourcePartnerUserIds") sourcePartnerUserIds?: string,
    @Query("sourcePartnerUserId") sourcePartnerUserId?: string, // Keep for backward compatibility
    @Query("loanCurrentStatus") loanCurrentStatus?: string
  ) {
    // Parse sourcePartnerUserIds if provided as comma-separated string
    let sourcePartnerIdsArray: string[] | undefined;

    if (sourcePartnerUserIds) {
      sourcePartnerIdsArray = sourcePartnerUserIds.split(',').map(id => id.trim()).filter(Boolean);
    } else if (sourcePartnerUserId) {
      sourcePartnerIdsArray = [sourcePartnerUserId];
    } else {
      sourcePartnerIdsArray = undefined;
    }

    return this.partnerLoansService.getLoansByDueDateAndPartner(
      brandId,
      dueDateFrom,
      dueDateTo,
      sourcePartnerIdsArray,
      loanCurrentStatus
    );
  }

  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["COLLECTION_HEAD", "ADMIN", "SUPER_ADMIN"],
    permissions: [
      {
        permission: "COLLECTION_REALLOCATE_LOANS",
        type: PermissionType.WRITE,
      },
      { permission: 'ALL', type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  @Post("collection-partners/bulk-allocate-by-due-date")
  async bulkAllocateCollectionPartnersByDueDate(
    @Param("brandId") brandId: string,
    @Body()
    body: {
      targetPartnerUserIds?: string[];
      targetPartnerUserId?: string; // Keep for backward compatibility
      dueDateFrom?: string;
      dueDateTo?: string;
      sourcePartnerUserIds?: string[];
      sourcePartnerUserId?: string; // Keep for backward compatibility
      loanCurrentStatus?: string;
      remarks?: string;
    },
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser
  ) {
    return this.collectionService.bulkAllocateCollectionPartnersByDueDate(
      brandId,
      body.targetPartnerUserIds || (body.targetPartnerUserId ? [body.targetPartnerUserId] : undefined),
      body.dueDateFrom,
      body.dueDateTo,
      body.sourcePartnerUserIds || (body.sourcePartnerUserId ? [body.sourcePartnerUserId] : undefined),
      body.loanCurrentStatus,
      body.remarks
    );
  }

  @AuthType('public')
  @Post("collection-partners/bulk-allocate-loans")
  async bulkAllocateCollectionPartners(
    @Param("brandId") brandId: string,
    @Body()
    body: {},
    // @GetPartnerUser() partnerUser: AuthenticatedPartnerUser
  ) {
    return this.collectionService.autoAllocateToAllUnallocatedLoans(
      brandId,
      "ATTENDANCE"
    );
  }

  @Post(':loanId/field-visit')
  async createOrUpdateFieldVisit(
    @Param('loanId') loanId: string,
    @Param('brandId') brandId: string,
    @Body() fieldVisitDto: FieldVisitDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser
  ) {
    return this.partnerLoansService.createOrUpdateFieldVisit(
      loanId,
      brandId,
      fieldVisitDto.requireFieldVisit
    );
  }

  @Get(':loanId/field-visit')
  async getFieldVisit(
    @Param('loanId') loanId: string,
    @Param('brandId') brandId: string,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser
  ) {
    return this.partnerLoansService.getFieldVisit(loanId, brandId);
  }

  @Get('field-visits/bulk')
  async getBulkFieldVisits(
    @Param('brandId') brandId: string,
    @Query('loanIds') loanIds: string,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser
  ) {
    const loanIdsArray = loanIds.split(',');
    return this.partnerLoansService.getBulkFieldVisits(brandId, loanIdsArray);
  }
}

