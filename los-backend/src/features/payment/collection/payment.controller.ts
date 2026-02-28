// payment.controller.ts
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  Headers,
  RawBodyRequest,
  InternalServerErrorException,
  Query,
  UseGuards,
} from "@nestjs/common";
import * as dayjs from "dayjs";

// Access the default function from the namespace import
const _dayjs = dayjs.default;
import { PaymentService } from "../services/payment.service";
import {
  CreateManualPaymentDto,
  CreatePaymentDto,
} from "../dto/payment/create-payment.dto";
import { AuthType } from "src/common/decorators/auth.decorator";
import { HandleDisbursementTransactionDto } from "../dto/payment/handle-disbursement-transaction.dto";
import { CreateDisburseLoanRequestDto } from "../dto/payment/create-disburse-loan-request.dto";
import { FilesInterceptor, FileInterceptor } from "@nestjs/platform-express";
import { UpdateOpsApprovalStatusDto } from "../dto/payment/update-ops-approval-status.dto";
import {
  BulkDisbursementDto,
  BulkDisbursementResult,
} from "../dto/payment/bulk-disburse.dto";
import {
  PublicLoanInquiryInitiateDto,
  PublicLoanInquiryVerifyDto,
} from "../dto/payment/public-loan-inquiry.dto";
import { PaymentMethodEnum } from "@prisma/client";
import { Request } from "express";
import { CashfreeService } from "../provider/cashfree.service";
import { RolePermissionGuard } from "src/common/guards/role-permission.guard";
import { RequireRoleOrPermission } from "src/common/decorators/role-permission.decorator";
import { ManualStatusUpdateDto } from "../dto/payment/manual-status-update.dto";

@Controller("payment")
export class PaymentController {
  constructor(
    private readonly payment: PaymentService,
    private readonly cashfree: CashfreeService,
  ) {}

  @AuthType("web")
  @Post("create")
  @HttpCode(HttpStatus.OK)
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
  ): Promise<any> {
    return this.payment.createCollectionPayment(
      createPaymentDto.loanId,
      createPaymentDto.userId,
      createPaymentDto.method,
    );
  }

  @AuthType("public")
  @Post("paytring/callback")
  @HttpCode(HttpStatus.OK)
  async handlePaytringCallback(
    @Body()
    body: {
      order_id: string;
      receipt_id: string;
      key: string;
      hash: string;
    },
  ): Promise<any> {
    return this.payment.handlePaytringCallback(body);
  }

  @AuthType("public")
  @Post("razorpay/callback")
  @HttpCode(HttpStatus.OK)
  async handleRazorpayCallback(
    @Body() body: any,
    @Headers("x-razorpay-signature") signature: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<any> {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new InternalServerErrorException("Webhook secret not configured");
    }

    // Get the raw body for signature verification
    const rawBody = req.rawBody?.toString() || JSON.stringify(body);

    // Use the RAW body string for signature verification
    // const isValidSignature = this.razorpay.verifyRazorpayWebhookSignature(
    //   rawBody,
    //   signature,
    //   webhookSecret
    // );

    // console.log("Signature valid:", isValidSignature);

    // if (!isValidSignature) {
    //   console.log("Invalid webhook signature");
    //   throw new BadRequestException("Invalid webhook signature");
    // }

    return this.payment.handleRazorpayCallback(req.body);
  }

  @AuthType("public")
  @Post("cashfree/callback")
  @HttpCode(HttpStatus.OK)
  async handleCashfreeCallback(
    @Body() body: any,
    @Headers("x-webhook-signature") signature: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<any> {
    const webhookSecret = process.env.CASHFREE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new InternalServerErrorException(
        "Cashfree webhook secret not configured",
      );
    }

    // Get the raw body for signature verification
    const rawBody = req.rawBody?.toString() || JSON.stringify(body);
    // console.log("Received Cashfree webhook with signature:", signature);

    // Verify webhook signature
    const isValidSignature = this.cashfree.verifyWebhookSignature(
      body,
      signature,
      webhookSecret,
    );

    // console.log("Cashfree signature valid:", isValidSignature);

    // if (!isValidSignature) {
    //   console.log("Invalid Cashfree webhook signature");
    //   throw new BadRequestException("Invalid webhook signature");
    // }
    JSON.stringify("body", body, 2);

    // Process the webhook
    return this.cashfree.handleWebhookCallback(body);
  }

  @AuthType("partner")
  @Post("disburse-loan-request")
  @HttpCode(HttpStatus.OK)
  async createDisburseLoanRequest(
    @Body() body: CreateDisburseLoanRequestDto,
  ): Promise<any> {
    return this.payment.createDisburseLoanRequest(body.loanId);
  }

  @AuthType("partner")
  @Post("disburse-transaction")
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN", "ADMIN", "LOAN_OPS"],
    permissions: [
      { permission: "PROCESS_DISBURSEMENT_TRANSACTION_REPORT", type: "ALL" },
      { permission: "ALL", type: "ALL" },
      {
        permission: "LOAN_OPS",
        type: "ALL",
      },
    ],
    operator: "OR",
  })
  async handleDisbursementTransaction(
    @Req() req: any,
    @Body() body: HandleDisbursementTransactionDto,
  ): Promise<any> {
    const partnerUserId = req.partnerUser.id;
    return this.payment.handleDisbursementTransaction(
      partnerUserId,
      body.paymentRequestId,
      body.loanId,
      body.method,
      body.externalRef || null,
      body.disbursementDate || _dayjs().format("YYYY-MM-DD"),
      body.brandBankAccountId || null,
      body.confirmPassword || null,
      req.partnerUser,
      body.transferType,
    );
  }

  @Post("manual-payment")
  @AuthType("partner")
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FilesInterceptor("files"))
  async createManualPayment(
    @Body() body: CreateManualPaymentDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ): Promise<any> {
    const partnerUserId = req.partnerUser.id;
    return this.payment.createManualCollectionPayment(
      partnerUserId,
      body.loanId,
      body.status,
      body.method,
      body.paymentDate,
      body.paymentReference,
      body.paymentNote,
      body.amount,
      body.isReloanApplicable,
      body.reloanRemark || null,
      body.isPaymentComplete,
      body.excessAmount,
      body?.brandBankAccountId || null,
      files,
    );
  }

  @AuthType("partner")
  @Post("manual-partial-payment")
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FilesInterceptor("files"))
  async createManualPartialPayment(
    @Body() body: CreateManualPaymentDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ): Promise<any> {
    const partnerUserId = req.partnerUser.id;
    return this.payment.createPartialCollectionPayment(
      partnerUserId,
      body.loanId,
      body.status,
      body.method,
      body.paymentDate,
      body.paymentReference,
      body.paymentNote,
      body.amount,
      body.paymentRequestStatus,
      body.isReloanApplicable,
      body.reloanRemark || null,
      body.isPaymentComplete,
      body.excessAmount,
      body?.brandBankAccountId || null,
      files,
    );
  }

  @AuthType("partner")
  @Patch("ops-approval-status")
  async updateOpsApprovalStatus(
    @Body() dto: UpdateOpsApprovalStatusDto,
    @Req() req: any,
  ): Promise<{ success: boolean }> {
    const partnerUserId = req.partnerUser.id;

    const result = await this.payment.updateOpsApprovalStatus(
      partnerUserId,
      dto.paymentRequestId,
      dto.reason,
      dto.paymentCollectionTransactionId,
      dto.paymentPartialCollectionTransactionId,
      dto.opsApprovalStatus,
      dto.closingType,
    );

    return { success: result };
  }

  @AuthType("partner")
  @Get("get-payment-request/:loanId")
  @HttpCode(HttpStatus.OK)
  async getPaymentRequestByLoanId(
    @Param("loanId") loanId: string,
  ): Promise<any> {
    return this.payment.getPaymentRequestByLoanId(loanId);
  }

  @AuthType("partner")
  @Post("bulk-disburse")
  @HttpCode(HttpStatus.OK)
  async bulkDisbursement(
    @Req() req: any,
    @Body() body: BulkDisbursementDto,
  ): Promise<BulkDisbursementResult> {
    const partnerUserId = req.partnerUser.id;
    return this.payment.bulkDisbursement(
      partnerUserId,
      body.disbursements,
      req.partnerUser,
    );
  }

  @AuthType("partner")
  @Post("bulk-disburse-csv")
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor("file"))
  async bulkDisbursementFromCsv(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<BulkDisbursementResult> {
    const partnerUserId = req.partnerUser.id;

    if (!file) {
      throw new BadRequestException("CSV file is required");
    }

    const csvContent = file.buffer.toString("utf-8");
    const disbursements = await this.payment.parseDisbursementCsv(csvContent);

    return this.payment.bulkDisbursement(
      partnerUserId,
      disbursements,
      req.partnerUser,
    );
  }

  /**
   * Cashfree Payment Link Management Endpoints
   */
  @AuthType("partner")
  @Get("cashfree/payment-link/:paymentLinkId")
  async getCashfreePaymentLink(
    @Param("paymentLinkId") paymentLinkId: string,
  ): Promise<any> {
    return this.cashfree.fetchPaymentLink(paymentLinkId);
  }

  @AuthType("partner")
  @Post("cashfree/payment-link/:paymentLinkId/cancel")
  async cancelCashfreePaymentLink(
    @Param("paymentLinkId") paymentLinkId: string,
  ): Promise<{ success: boolean }> {
    const result = await this.cashfree.cancelPaymentLink(paymentLinkId);
    return { success: result };
  }

  @AuthType("partner")
  @Get("cashfree/payment-link/:paymentLinkId/orders")
  async getCashfreePaymentLinkOrders(
    @Param("paymentLinkId") paymentLinkId: string,
    @Query("status") status?: string,
  ): Promise<any> {
    return this.cashfree.getPaymentLinkOrders(paymentLinkId, status);
  }

  @AuthType("partner")
  @Get("cashfree/payment-link/:paymentLinkId/has-payment")
  async checkCashfreePaymentStatus(
    @Param("paymentLinkId") paymentLinkId: string,
  ): Promise<{ hasSuccessfulPayment: boolean }> {
    const hasPayment = await this.cashfree.hasSuccessfulPayment(paymentLinkId);
    return { hasSuccessfulPayment: hasPayment };
  }

  /**
   * Public Loan Inquiry Endpoints
   */
  @AuthType("public")
  @Post("public/loan-inquiry/initiate")
  @HttpCode(HttpStatus.OK)
  async initiatePublicLoanInquiry(
    @Body() dto: PublicLoanInquiryInitiateDto,
  ): Promise<{
    success: boolean;
    data: {
      publicLoanInquiriesId: string;
      message: string;
      expiresIn: number;
      rateLimit: { remaining: number; retryAfter: number };
    };
  }> {
    let identifierType: "MOBILE" | "PAN" = "MOBILE";
    let identifier = "";

    if (dto.mobile) {
      identifier = dto.mobile;
      identifierType = "MOBILE";
    } else if (dto.pan) {
      identifier = dto.pan;
      identifierType = "PAN";
    } else {
      throw new BadRequestException("Either mobile or PAN is required");
    }

    const result = await this.payment.initiatePublicLoanInquiry(
      identifier,
      identifierType,
    );

    return {
      success: true,
      data: {
        publicLoanInquiriesId: result.id,
        message: `An OTP has been sent to your registered mobile number ending with ${result.phoneNumber.slice(-4)}.`,
        expiresIn: result.expiresIn,
        rateLimit: result.rateLimit,
      },
    };
  }

  @AuthType("public")
  @Post("public/loan-inquiry/verify")
  @HttpCode(HttpStatus.OK)
  async verifyPublicLoanInquiry(
    @Body() dto: PublicLoanInquiryVerifyDto,
  ): Promise<any> {
    return this.payment.verifyPublicLoanInquiry(
      dto.publicLoanInquiriesId,
      dto.otp,
    );
  }

  @AuthType("public")
  @Post("public/loan-inquiry/repayment")
  @HttpCode(HttpStatus.OK)
  async getPublicLoanRepayment(
    @Body() dto: { publicLoanInquiriesId: string; otp: string; loanId: string },
  ): Promise<any> {
    // First verify the public loan inquiry
    const verifyResult = await this.payment.verifyPublicLoanInquiry(
      dto.publicLoanInquiriesId,
      dto.otp,
    );

    if (!verifyResult.success) {
      throw new BadRequestException("Failed to verify loan inquiry");
    }

    // Find the loan from verified loans
    const loan = verifyResult.data.activeLoans.find((l) => l.id === dto.loanId);
    if (!loan) {
      throw new BadRequestException("Loan not found in verified loans");
    }

    // Get the userId from the inquiry
    const inquiry = await this.payment.getPublicInquiryUser(
      dto.publicLoanInquiriesId,
      dto.loanId,
    );

    const repaymentDate = _dayjs();

    return this.payment.getPublicLoanRepayment(
      inquiry.userId,
      dto.loanId,
      repaymentDate,
    );
  }

  @AuthType("public")
  @Post("public/loan-inquiry/create-payment")
  @HttpCode(HttpStatus.OK)
  async createPublicLoanCollectionPayment(
    @Body()
    dto: {
      publicLoanInquiriesId: string;
      otp: string;
      loanId: string;
      method: PaymentMethodEnum;
    },
  ): Promise<any> {
    // Step 1: Verify the public loan inquiry with OTP
    const verifyResult = await this.payment.verifyPublicLoanInquiry(
      dto.publicLoanInquiriesId,
      dto.otp,
    );

    if (!verifyResult.success) {
      throw new BadRequestException("Failed to verify loan inquiry");
    }

    // Step 2: Validate the loan exists in verified loans
    const loan = verifyResult.data.activeLoans.find((l) => l.id === dto.loanId);
    if (!loan) {
      throw new BadRequestException("Loan not found in verified loans");
    }

    // Step 3: Get userId from the verified inquiry
    const inquiry = await this.payment.getPublicInquiryUser(
      dto.publicLoanInquiriesId,
      dto.loanId,
    );

    // Step 4: Create the collection payment with security verification
    return this.payment.createPublicCollectionPayment(
      inquiry.userId,
      dto.loanId,
      dto.method,
      dto.publicLoanInquiriesId,
    );
  }

  @AuthType("partner")
  @Get("pending-disbursement")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["LOAN_OPS", "ADMIN", "SUPER_ADMIN"],
    operator: "OR",
    permissions: [
      { permission: "ALL", type: "ALL" },
      { permission: "LOAN_OPS", type: "ALL" },
    ],
  })
  async getPendingDisbursementTransactions(
    @Query("brandId") brandId: string,
    @Query("limit") limit: string = "10",
    @Query("offset") offset: string = "0",
    @Query("loanStatus") loanStatus: string = "APPROVED",
    @Query("agreementStatus") agreementStatus: string = "SIGNED",
    @Query("search") search?: string,
  ): Promise<any> {
    const limitNum = Math.min(parseInt(limit) || 10, 100);
    const offsetNum = parseInt(offset) || 0;

    if (!brandId) {
      throw new BadRequestException("brandId is required");
    }

    const filters = {
      brandId,
      limit: limitNum,
      offset: offsetNum,
      loanStatus,
      agreementStatus,
      search: search?.trim() || "",
    };

    return this.payment.getPendingDisbursementTransactions(filters);
  }

  @AuthType("partner")
  @Get("pending-ops-approval")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["LOAN_OPS", "ADMIN", "SUPER_ADMIN"],
    operator: "OR",
    permissions: [
      { permission: "ALL", type: "ALL" },
      { permission: "LOAN_OPS", type: "ALL" },
    ],
  })
  async getPendingOpsApprovalTransactions(
    @Query("brandId") brandId: string,
    @Query("limit") limit: string = "10",
    @Query("offset") offset: string = "0",
    @Query("transactionType") transactionType?: string,
    @Query("search") search?: string,
  ): Promise<any> {
    const limitNum = Math.min(parseInt(limit) || 10, 100);
    const offsetNum = parseInt(offset) || 0;

    if (!brandId) {
      throw new BadRequestException("brandId is required");
    }

    const validTypes = ["collection", "partial_collection", "all"];
    const txnType = (
      transactionType && validTypes.includes(transactionType.toLowerCase())
        ? transactionType.toLowerCase()
        : "all"
    ) as "collection" | "partial_collection" | "all";

    const filters = {
      brandId,
      limit: limitNum,
      offset: offsetNum,
      transactionType: txnType,
      search: search?.trim() || "",
    };

    // Use unified method for all transaction types
    return this.payment.getAllPendingOpsApprovalTransactions(filters);
  }

  @AuthType("partner")
  @Get("rejected-ops-approval")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["LOAN_OPS", "ADMIN", "SUPER_ADMIN"],
    operator: "OR",
    permissions: [
      { permission: "ALL", type: "ALL" },
      { permission: "LOAN_OPS", type: "ALL" },
    ],
  })
  async getRejectedOpsApprovalTransactions(
    @Query("brandId") brandId: string,
    @Query("limit") limit: string = "10",
    @Query("offset") offset: string = "0",
    @Query("transactionType") transactionType?: string,
    @Query("search") search?: string,
  ): Promise<any> {
    const limitNum = Math.min(parseInt(limit) || 10, 100);
    const offsetNum = parseInt(offset) || 0;

    if (!brandId) {
      throw new BadRequestException("brandId is required");
    }

    const validTypes = ["collection", "partial_collection", "all"];
    const txnType = (
      transactionType && validTypes.includes(transactionType.toLowerCase())
        ? transactionType.toLowerCase()
        : "all"
    ) as "collection" | "partial_collection" | "all";

    const filters = {
      brandId,
      limit: limitNum,
      offset: offsetNum,
      transactionType: txnType,
      search: search?.trim() || "",
    };

    // Use unified method for rejected transactions
    return this.payment.getRejectedOpsApprovalTransactions(filters);
  }

  @AuthType("partner")
  @Get("payment-ops-approved")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["LOAN_OPS", "ADMIN", "SUPER_ADMIN"],
    operator: "OR",
    permissions: [
      { permission: "ALL", type: "ALL" },
      { permission: "LOAN_OPS", type: "ALL" },
    ],
  })
  async getpPaymentOpsApprovedTransactions(
    @Query("brandId") brandId: string,
    @Query("limit") limit: string = "10",
    @Query("offset") offset: string = "0",
    @Query("transactionType") transactionType?: string,
    @Query("search") search?: string,
  ): Promise<any> {
    const limitNum = Math.min(parseInt(limit) || 10, 100);
    const offsetNum = parseInt(offset) || 0;

    if (!brandId) {
      throw new BadRequestException("brandId is required");
    }

    const validTypes = ["collection", "partial_collection", "all"];
    const txnType = (
      transactionType && validTypes.includes(transactionType.toLowerCase())
        ? transactionType.toLowerCase()
        : "all"
    ) as "collection" | "partial_collection" | "all";

    const filters = {
      brandId,
      limit: limitNum,
      offset: offsetNum,
      transactionType: txnType,
      search: search?.trim() || "",
    };

    // Use unified method for rejected transactions
    return this.payment.getPaymentOpsApprovedTransactions(filters);
  }

  @AuthType("partner")
  @Post("manual-status-update")
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN", "ADMIN"],
    permissions: [{ permission: "ALL", type: "ALL" }],
    operator: "OR",
  })
  async manualStatusUpdate(
    @Req() req: any,
    @Body() dto: ManualStatusUpdateDto,
  ): Promise<{ success: boolean; message: string }> {
    const partnerUserId = req.partnerUser.id;

    try {
      await this.payment.manualStatusUpdate(
        partnerUserId,
        dto.loanId,
        dto.newStatus as any,
      );

      return {
        success: true,
        message: `Loan status successfully updated to ${dto.newStatus}`,
      };
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "Failed to update loan status",
      );
    }
  }
}
