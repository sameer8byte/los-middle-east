import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { LoansService } from "../services/loans.services";
import { AuthType } from "src/common/decorators/auth.decorator";
import { CreateLoanDto } from "../dto/create-loan.dto";
import { CurrentRepaymentDto } from "../dto/current-repayment.dto";
import { LoanEmailRemindarService } from "../services/loan.email.remindar.service";
import * as dayjs from "dayjs";

// Access the default function from the namespace import
const _dayjs = dayjs.default;
import { PartialCollectionDto } from "../dto/current-partial-repayment.dto";
import { UpsertClosingTypeDto } from "../dto/upsert-closing-type-dto";
import { AutoAllocationLoanService } from "src/features/autoAllocation/services/loan.autoAllocation.service";
import { RolePermissionGuard } from "src/common/guards/role-permission.guard";
import { RequireRoleOrPermission } from "src/common/decorators/role-permission.decorator";
import { PermissionType } from "@prisma/client";
import {
  SaveCAMCalculatorDto,
} from "../dto/cam-calculator.dto";

@Controller("loans")
export class LoansController {
  constructor(
    private readonly loansService: LoansService,
    private readonly loanEmailRemindarService: LoanEmailRemindarService,
    private readonly autoAllocationLoanService: AutoAllocationLoanService
  ) {}

  @AuthType("web")
  @Get("user/:userId/loans-credibility")
  @HttpCode(HttpStatus.OK)
  async getUserLoansCredibility(@Param("userId") userId: string) {
    return this.loansService.getUserLoansCredibility(userId);
  }

  @AuthType("partner")
  @Get("brand/:brandId/loan-rule-tenures")
  @HttpCode(HttpStatus.OK)
  async getLoanRuleTenures(@Param("brandId") brandId: string) {
    return this.loansService.getLoanRuleTenures(brandId);
  }

  // calculateRepayment
  @AuthType("web")
  @Post("user/:userId/calculate-repayment")
  @HttpCode(HttpStatus.OK)
  async calculateRepayment(
    @Param("userId") userId: string,
    @Body()
    body: {
      userId: string;
      requestAmount: number;
      tenureId: string;
    }
  ) {
    return this.loansService.calculateRepayment({
      userId: body.userId,
      requestAmount: body.requestAmount,
      tenureId: body.tenureId,
      loanId: null, // Assuming loanId is not needed for calculation
      requestedDueDate: null, // Assuming requestedDueDate is not needed for calculation
    });
  }

  // calculateRepayment for partner
  @AuthType("partner")
  @Post("brand/:brandId/calculate-repayment")
  @HttpCode(HttpStatus.OK)
  async calculateRepaymentForPartner(
    @Param("brandId") brandId: string,
    @Body()
    body: {
      userId: string;
      requestAmount: number;
      tenureId: string;
      requestedDueDate: string;
    }
  ) {
    return this.loansService.calculateRepayment({
      userId: body.userId,
      requestAmount: body.requestAmount,
      tenureId: body.tenureId,
      loanId: null,
      requestedDueDate: body.requestedDueDate,
    });
  }

  // create-loan
  @AuthType("web")
  @Post("user/:userId/create-loan")
  @HttpCode(HttpStatus.OK)
  async createLoan(
    @Param("userId") userId: string,
    @Body()
    body: CreateLoanDto
  ) {
    return this.loansService.createLoan(body);
  }

  // get loan
  @AuthType("web")
  @Get("user/:userId/get-loan/:loanId")
  @HttpCode(HttpStatus.OK)
  async getLoan(
    @Param("userId") userId: string,
    @Param("loanId") loanId: string
  ) {
    return this.loansService.getLoan(loanId);
  }

  // get all loans
  @AuthType("partner")
  @Get("brand/:brandId/get-loans")
  @HttpCode(HttpStatus.OK)
  async getLoans(@Param("userId") userId: string) {
    return this.loansService.getAllLoanByBrand(userId);
  }

  // get all loans by user
  @AuthType("public")
  @Get("user/:userId/get-loans")
  @HttpCode(HttpStatus.OK)
  async getLoansByUser(@Param("userId") userId: string) {
    return this.loansService.getAllLoanByUser(userId);
  }

  // get  loan details by loanId
  @AuthType("public")
  @Get("brand/:brandId/get-loan-details/:loanId")
  @HttpCode(HttpStatus.OK)
  async getRepaymentsByLoan(@Param("loanId") loanId: string) {
    return this.loansService.getLoanDetailsByLoanId(loanId);
  }

  // Get loan statement
  @AuthType("public")
  @Get("user/:userId/loan/:loanId/statement")
  @HttpCode(HttpStatus.OK)
  async getLoanStatement(
    @Param("userId") userId: string,
    @Param("loanId") loanId: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string
  ) {
    return this.loansService.getLoanStatement(loanId, fromDate, toDate, userId);
  }

  // currentRepayment
  @AuthType("public")
  @Post("user/:userId/current-repayment")
  @HttpCode(HttpStatus.OK)
  async postCurrentRepayment(@Body() body: CurrentRepaymentDto) {
    const repaymentDate = body.repaymentDate
      ? _dayjs(body.repaymentDate)
      : _dayjs();

    return this.loansService.currentRepayment(
      body.userId,
      body.loanId,
      repaymentDate
    );
  }
  // currentPartialRepayment
  @AuthType("public")
  @Post("user/:userId/current-partial-repayment")
  @HttpCode(HttpStatus.OK)
  async postCurrentPartialRepayment(@Body() body: PartialCollectionDto) {
    const repaymentDate = body.repaymentDate
      ? _dayjs(body.repaymentDate)
      : _dayjs();
    return this.loansService.partialCollection(
      body.userId,
      body.loanId,
      body.amount,
      repaymentDate,
      body.isFinalPaymentPart
      // body.discountAmount
    );
  }

  //relocateLoan
  @AuthType("partner")
  @Post("brand/:brandId/relocate-loan")
  @HttpCode(HttpStatus.OK)
  async relocateLoan(
    @Param("brandId") brandId: string,
    @Body() body: { loanId: string; newPartnerUserId: string }
  ) {
    return this.autoAllocationLoanService.relocateLoan(
      body.loanId,
      body.newPartnerUserId
    );
  }

  @AuthType("partner")
  @Post("brand/:brandId/process-loan-emails")
  @HttpCode(HttpStatus.OK)
  async processLoanEmails(@Param("brandId") brandId: string) {
    return this.loanEmailRemindarService.processLoanEmails(brandId);
  }

  @AuthType("partner")
  @Post("brand/:brandId/upsert-closing-type/:loanId")
  @HttpCode(HttpStatus.OK)
  async upsertClosingType(@Body() dto: UpsertClosingTypeDto) {
    const { loanId } = dto;
    return this.loansService.upsertClosingType(loanId);
  }
  // autoAllocateAllUsers
  @AuthType("partner")
  @Post("auto-allocate-loans")
  @HttpCode(HttpStatus.OK)
  async autoAllocatedLoans() {
    return this.autoAllocationLoanService.autoAllocatedLoans();
  }

  // Bulk relocate loans
  @AuthType("partner")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SANCTION_HEAD", "SANCTION_MANAGER", "ADMIN", "SUPER_ADMIN"],
    permissions: [
      { permission: "LOAN_RELOCATE", type: PermissionType.ALL },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  @Post("brand/:brandId/bulk-relocate-loans")
  @HttpCode(HttpStatus.OK)
  async bulkRelocateLoans(
    @Param("brandId") brandId: string,
    @Body()
    body: {
      loanIds?: string | string[];
      targetPartnerUserIds?: string | string[];
      createdFrom?: string;
      createdTo?: string;
      sourcePartnerUserIds?: string | string[];
      loanStatus?: string[];
      isAllTime?: boolean;
      remarks?: string;
    }
  ) {
    // Handle comma-separated strings or arrays for backward compatibility
    let loanIdsArray: string[];
    let targetPartnerUserIdsArray: string[];

    if (typeof body.loanIds === "string") {
      loanIdsArray = body.loanIds
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
    } else {
      loanIdsArray = body.loanIds || [];
    }

    if (typeof body.targetPartnerUserIds === "string") {
      targetPartnerUserIdsArray = body.targetPartnerUserIds
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
    } else {
      targetPartnerUserIdsArray = body.targetPartnerUserIds || [];
    }
    if (!loanIdsArray.length && !body.createdFrom && !body.isAllTime) {
      throw new BadRequestException(
        "Either loan IDs or date range must be provided"
      );
    }

    // Note: targetPartnerUserIds is optional for auto allocation
    // If empty, the service will auto-allocate to available loan officers

    // If date range or filters are provided, fetch matching loans
    if (
      body.createdFrom ||
      body.isAllTime ||
      body.sourcePartnerUserIds ||
      body.loanStatus
    ) {
      const matchingLoans = await this.loansService.findLoansForBulkAllocation({
        brandId,
        dueDateFrom: body.createdFrom, // Using dueDateFrom parameter for createdFrom
        dueDateTo: body.createdTo, // Using dueDateTo parameter for createdTo
        sourcePartnerUserIds: body.sourcePartnerUserIds,
        loanStatus: body.loanStatus,
        isAllTime: body.isAllTime,
      });

      loanIdsArray = matchingLoans.map((loan) => loan.id);
    }

    if (!loanIdsArray.length) {
      throw new BadRequestException("No loans found matching the criteria");
    }

    return this.autoAllocationLoanService.bulkRelocateLoans(
      loanIdsArray,
      targetPartnerUserIdsArray
    );
  }

  // Get loans for bulk allocation with filters
  @AuthType("partner")
  @Post("brand/:brandId/loans-for-allocation")
  @HttpCode(HttpStatus.OK)
  async getLoansForAllocation(
    @Param("brandId") brandId: string,
    @Body()
    body: {
      createdFrom?: string;
      createdTo?: string;
      sourcePartnerUserIds?: string | string[];
      loanStatus?: string[];
      isAllTime?: boolean;
      page?: number;
      limit?: number;
    }
  ) {
    const filters = {
      brandId,
      dueDateFrom: body.createdFrom, // Using createdFrom for consistency with existing service method
      dueDateTo: body.createdTo, // Using createdTo for consistency with existing service method
      sourcePartnerUserIds: body.sourcePartnerUserIds,
      loanStatus: body.loanStatus || ["PENDING", "CREDIT_EXECUTIVE_APPROVED"],
      isAllTime: body.isAllTime || false,
    };

    const loans = await this.loansService.findLoansForBulkAllocation(filters);

    // Apply pagination if requested
    const page = body.page || 1;
    const limit = body.limit || 200;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedLoans = loans.slice(startIndex, endIndex);

    return {
      loans: paginatedLoans,
      meta: {
        total: loans.length,
        page,
        limit,
        totalPages: Math.ceil(loans.length / limit),
      },
    };
  }


  // unallocated loans
  @AuthType("partner")
  @Get("brand/:brandId/unallocated-loans")
  @HttpCode(HttpStatus.OK)
  async getUnallocatedLoans(
    @Param("brandId") brandId: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("search") search?: string
  ) {
    return this.loansService.getUnallocatedLoans(brandId, page || 1, limit || 10, search);
  }
  

  // CAM Calculator Endpoints
  @AuthType("partner")
  @Post("brand/:brandId/cam-calculator/save")
  @HttpCode(HttpStatus.OK)
  async saveCAMCalculator(
    @Param("brandId") brandId: string,
    @Body() body: SaveCAMCalculatorDto
  ) {
    return this.loansService.saveCAMCalculator({
      ...body,
      brandId,
    });
  }

  @AuthType("partner")
  @Get("cam-calculator/:loanId")
  @HttpCode(HttpStatus.OK)
  async getCAMCalculator(@Param("loanId") loanId: string) {
    return this.loansService.getCAMCalculator(loanId);
  }

  @AuthType("partner")
  @Get("user/:userId/brand/:brandId/cam-calculators")
  @HttpCode(HttpStatus.OK)
  async getCAMCalculatorByUser(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string
  ) {
    return this.loansService.getCAMCalculatorByUserId(userId, brandId);
  }

  @AuthType("partner")
  @Delete("cam-calculator/:loanId")
  @HttpCode(HttpStatus.OK)
  async deleteCAMCalculator(@Param("loanId") loanId: string) {
    return this.loansService.deleteCAMCalculator(loanId);
  }

  // Force update all loans - Admin only
  // @AuthType("public")
  // @Post("admin/force-update-all-loans")
  // @HttpCode(HttpStatus.OK)
  // async forceUpdateAllLoans() {
  //   return this.loansService.forceAllLoans();
  // }

  // Force update specific loan amount
  // @AuthType("public")
  // @Post("force-update-loan-amount")
  // @HttpCode(HttpStatus.OK)
  // async forceUpdateLoanAmount(
  //   @Body()
  //   body: {
  //     userId: string;
  //     loanId: string;
  //     requestAmount: number;
  //     requestedDueDate?: string | null;
  //   }
  // ) {
  //   return this.loansService.forceupdateLoanAmount(
  //     body.userId,
  //     body.requestAmount,
  //     body.loanId,
  //     body.requestedDueDate || null
  //   );
  // }
}
