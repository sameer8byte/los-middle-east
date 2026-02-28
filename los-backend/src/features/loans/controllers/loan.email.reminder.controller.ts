import { Controller, Get, Query, Param, Post, Req, Body } from "@nestjs/common";
import { AuthType } from "src/common/decorators/auth.decorator";
import { LoanEmailRemindarService } from "../services/loan.email.remindar.service";
import { Request } from "express";
import { EmailLogsQueryDto } from "../dto/email-logs-query.dto";
import { SendTestEmailDto } from "../dto/send-test-email.dto";

@AuthType("partner")
@Controller("partner/brand/:brandId/loans/email-reminders")
export class LoanEmailReminderController {
  constructor(
    private readonly loanEmailReminderService: LoanEmailRemindarService,
  ) {}

  // Helper method to extract request context
  private getRequestContext(req: Request) {
    return {
      ipAddress:
        req.ip ||
        req.connection.remoteAddress ||
        (req.headers["x-forwarded-for"] as string),
      userAgent: req.headers["user-agent"],
      partnerUserId: (req as any).partnerUser?.id,
    };
  }

  @Post("process")
  async processEmailReminders(
    @Param("brandId") brandId: string,
    @Query("loanId") loanId?: string,
    @Query("triggerType") triggerType?: string,
    @Query("campaignId") campaignId?: string,
    @Req() req?: Request,
  ) {
    const context = this.getRequestContext(req);

    return this.loanEmailReminderService.processLoanEmails(brandId, loanId, {
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      triggerType: triggerType || "manual",
      campaignId,
    });
  }

  @Get("logs")
  async getEmailLogs(
    @Param("brandId") brandId: string,
    @Query() queryDto: EmailLogsQueryDto,
  ) {
    const filters = {
      loanId: queryDto.loanId,
      success: queryDto.success,
      limit: queryDto.limit ? parseInt(queryDto.limit, 10) : undefined,
      page: queryDto.page ? parseInt(queryDto.page, 10) : undefined,
      dateFrom: queryDto.dateFrom ? new Date(queryDto.dateFrom) : undefined,
      dateTo: queryDto.dateTo ? new Date(queryDto.dateTo) : undefined,
      all: queryDto.all || false,
      search: queryDto.search,
    };

    return this.loanEmailReminderService.getEmailLogs(brandId, filters);
  }

  @Get("stats")
  async getEmailStats(@Param("brandId") brandId: string) {
    return this.loanEmailReminderService.getEmailStats(brandId);
  }

  @Post("test")
  async sendTestEmail(
    @Param("brandId") brandId: string,
    @Body() sendTestEmailDto: SendTestEmailDto,
  ) {
    return this.loanEmailReminderService.sendTestEmail(brandId, {
      loanId: sendTestEmailDto.loanId,
      email: sendTestEmailDto.email,
      emailType: sendTestEmailDto.emailType,
    });
  }
}
