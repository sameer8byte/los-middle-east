import { Controller, Get, Query, Post, Body, Logger } from "@nestjs/common";
import { CcReminderService } from "./cc-reminder.service";
import { CcReminderQueryDto } from "./dto/cc-reminder.dto";
import { LoanReportQueryDto } from "./dto/loan-report.dto";
import {
  PaymentReportQueryDto,
  DisbursedLoanReportQueryDto,
} from "./dto/payment-report.dto";

@Controller("cc-reminder")
export class CcReminderController {
  private readonly logger = new Logger(CcReminderController.name);

  constructor(private readonly ccReminderService: CcReminderService) {}

  @Get("report")
  async getLoginReport(@Query() query: CcReminderQueryDto) {
    this.logger.log("Fetching CC reminder login report", query);

    try {
      const reportData = await this.ccReminderService.getLoginReport(query);

      return {
        success: true,
        data: reportData,
        count: reportData.length,
        query,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("Error fetching CC reminder login report:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: [],
        count: 0,
      };
    }
  }

  @Get("report/today")
  async getTodayLoginReport() {
    this.logger.log("Fetching today's CC reminder login report");

    try {
      const reportData = await this.ccReminderService.getTodayLoginReport();

      return {
        success: true,
        data: reportData,
        count: reportData.length,
        date: new Date().toISOString().split("T")[0],
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        "Error fetching today's CC reminder login report:",
        error
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: [],
        count: 0,
      };
    }
  }

  @Get("report/yesterday")
  async getYesterdayLoginReport() {
    this.logger.log("Fetching yesterday's CC reminder login report");

    try {
      const reportData = await this.ccReminderService.getYesterdayLoginReport();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      return {
        success: true,
        data: reportData,
        count: reportData.length,
        date: yesterday.toISOString().split("T")[0],
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        "Error fetching yesterday's CC reminder login report:",
        error
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: [],
        count: 0,
      };
    }
  }

  @Post("send-email")
  async sendCcReminderEmail(
    @Body()
    body: {
      recipientEmails: string[];
      query?: CcReminderQueryDto;
      customSubject?: string;
    }
  ) {
    const { recipientEmails, query = {}, customSubject } = body;

    this.logger.log(
      `Sending CC reminder email to ${recipientEmails.length} recipients`,
      { recipientEmails, query }
    );

    if (!recipientEmails || recipientEmails.length === 0) {
      return {
        success: false,
        message: "No recipient emails provided",
      };
    }

    return await this.ccReminderService.sendCcReminderEmail(
      recipientEmails,
      query,
      customSubject
    );
  }

  @Post("send-today-email")
  async sendTodayCcReminderEmail(@Body() body: { recipientEmails: string[] }) {
    const { recipientEmails } = body;

    this.logger.log(
      `Sending today's CC reminder email to ${recipientEmails.length} recipients`,
      { recipientEmails }
    );

    if (!recipientEmails || recipientEmails.length === 0) {
      return {
        success: false,
        message: "No recipient emails provided",
      };
    }

    return await this.ccReminderService.sendTodayCcReminderEmail(
      recipientEmails
    );
  }

  @Post("send-yesterday-email")
  async sendYesterdayCcReminderEmail(
    @Body() body: { recipientEmails: string[]; brandId: string }
  ) {
    const { recipientEmails, brandId } = body;

    this.logger.log(
      `Sending yesterday's CC reminder email to ${recipientEmails.length} recipients`,
      { recipientEmails }
    );

    if (!recipientEmails || recipientEmails.length === 0) {
      return {
        success: false,
        message: "No recipient emails provided",
      };
    }

    return await this.ccReminderService.sendYesterdayCcReminderEmail(
      recipientEmails,
      brandId
    );
  }

  @Get("loan-report")
  async getLoanReport(@Query() query: LoanReportQueryDto) {
    this.logger.log("Fetching loan report", query);

    try {
      const reportData = await this.ccReminderService.getLoanReport(query);

      return {
        success: true,
        data: reportData,
        count: reportData.length,
        query,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("Error fetching loan report:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: [],
        count: 0,
      };
    }
  }

  @Get("loan-report/today-due")
  async getTodayDueLoansReport() {
    this.logger.log("Fetching today due loans report");

    try {
      const reportData = await this.ccReminderService.getTodayDueLoansReport();

      return {
        success: true,
        data: reportData,
        count: reportData.length,
        date: new Date().toISOString().split("T")[0],
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("Error fetching today due loans report:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: [],
        count: 0,
      };
    }
  }

  @Get("loan-report/yesterday-due")
  async getYesterdayDueLoansReport() {
    this.logger.log("Fetching yesterday due loans report");

    try {
      const reportData =
        await this.ccReminderService.getYesterdayDueLoansReport();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      return {
        success: true,
        data: reportData,
        count: reportData.length,
        date: yesterday.toISOString().split("T")[0],
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("Error fetching yesterday due loans report:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: [],
        count: 0,
      };
    }
  }

  @Get("loan-report/tomorrow-due")
  async getTomorrowDueLoansReport() {
    this.logger.log("Fetching tomorrow due loans report");

    try {
      const reportData =
        await this.ccReminderService.getTomorrowDueLoansReport();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      return {
        success: true,
        data: reportData,
        count: reportData.length,
        date: tomorrow.toISOString().split("T")[0],
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("Error fetching tomorrow due loans report:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: [],
        count: 0,
      };
    }
  }

  @Get("combined-report")
  async getCombinedReport(
    @Query()
    query: {
      // Login query params
      loginStartDate?: string;
      loginEndDate?: string;
      userEmail?: string;
      // Loan query params
      loanStartDate?: string;
      loanEndDate?: string;
      brandId?: string;
      dueDateFilter?: "today" | "yesterday" | "tomorrow" | "all";
    }
  ) {
    this.logger.log("Fetching combined login and loan report", query);

    try {
      const {
        loginStartDate,
        loginEndDate,
        userEmail,
        loanStartDate,
        loanEndDate,
        brandId,
        dueDateFilter,
      } = query;

      const combinedData = await this.ccReminderService.getCombinedReport({
        loginQuery: {
          startDate: loginStartDate,
          endDate: loginEndDate,
          userEmail,
        },
        loanQuery: {
          startDate: loanStartDate,
          endDate: loanEndDate,
          brandId,
          dueDateFilter,
        },
      });

      return {
        success: true,
        data: combinedData,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("Error fetching combined report:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: null,
      };
    }
  }

  @Post("send-combined-email")
  async sendCombinedReminderEmail(
    @Body()
    body: {
      recipientEmails: string[];
      loginQuery?: CcReminderQueryDto;
      loanQuery?: LoanReportQueryDto;
      customSubject?: string;
    }
  ) {
    const {
      recipientEmails,
      loginQuery = {},
      loanQuery = {},
      customSubject,
    } = body;

    this.logger.log(
      `Sending combined report email to ${recipientEmails.length} recipients`,
      {
        recipientEmails,
        loginQuery,
        loanQuery,
      }
    );

    if (!recipientEmails || recipientEmails.length === 0) {
      return {
        success: false,
        message: "No recipient emails provided",
      };
    }

    return await this.ccReminderService.sendCombinedReminderEmail(
      recipientEmails,
      { loginQuery, loanQuery },
      customSubject
    );
  }

  @Post("send-loan-email")
  async sendLoanDueEmail(
    @Body()
    body: {
      recipientEmails: string[];
      query?: LoanReportQueryDto;
      customSubject?: string;
    }
  ) {
    const { recipientEmails, query = {}, customSubject } = body;

    this.logger.log(
      `Sending loan due report email to ${recipientEmails.length} recipients`,
      {
        recipientEmails,
        query,
      }
    );

    if (!recipientEmails || recipientEmails.length === 0) {
      return {
        success: false,
        message: "No recipient emails provided",
      };
    }

    return await this.ccReminderService.sendLoanDueEmail(
      recipientEmails,
      query,
      customSubject
    );
  }

  // Payment Report Endpoints
  @Get("payment-report")
  async getPaymentReport(@Query() query: PaymentReportQueryDto) {
    this.logger.log("Fetching payment report", query);

    try {
      const reportData = await this.ccReminderService.getPaymentReport(query);

      return {
        success: true,
        data: reportData,
        count: reportData.length,
        query,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("Error fetching payment report:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: [],
        count: 0,
      };
    }
  }

  @Get("payment-report/yesterday")
  async getYesterdayPaymentReport() {
    this.logger.log("Fetching yesterday's payment report");

    try {
      const reportData =
        await this.ccReminderService.getYesterdayPaymentReport();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      return {
        success: true,
        data: reportData,
        count: reportData.length,
        date: yesterday.toISOString().split("T")[0],
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("Error fetching yesterday's payment report:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: [],
        count: 0,
      };
    }
  }

  @Get("payment-report/today")
  async getTodayPaymentReport() {
    this.logger.log("Fetching today's payment report");

    try {
      const reportData = await this.ccReminderService.getTodayPaymentReport();

      return {
        success: true,
        data: reportData,
        count: reportData.length,
        date: new Date().toISOString().split("T")[0],
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("Error fetching today's payment report:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: [],
        count: 0,
      };
    }
  }

  @Post("send-payment-email")
  async sendPaymentReminderEmail(
    @Body()
    body: {
      recipientEmails: string[];
      query?: PaymentReportQueryDto;
      customSubject?: string;
    }
  ) {
    const { recipientEmails, query = {}, customSubject } = body;

    this.logger.log(
      `Sending payment report email to ${recipientEmails.length} recipients`,
      {
        recipientEmails,
        query,
      }
    );

    if (!recipientEmails || recipientEmails.length === 0) {
      return {
        success: false,
        message: "No recipient emails provided",
      };
    }

    return await this.ccReminderService.sendPaymentReminderEmail(
      recipientEmails,
      query,
      customSubject
    );
  }

  @Post("send-yesterday-payment-email")
  async sendYesterdayPaymentEmail(
    @Body() body: { recipientEmails: string[]; brandId: string }
  ) {
    const { recipientEmails, brandId } = body;

    this.logger.log(
      `Sending yesterday's payment report email to ${recipientEmails.length} recipients`,
      { recipientEmails }
    );

    if (!recipientEmails || recipientEmails.length === 0) {
      return {
        success: false,
        message: "No recipient emails provided",
      };
    }

    return await this.ccReminderService.sendYesterdayPaymentEmail(
      recipientEmails,
      brandId
    );
  }

  // Disbursed Loan Report Endpoints
  @Get("disbursed-loan-report")
  async getDisbursedLoanReport(@Query() query: DisbursedLoanReportQueryDto) {
    this.logger.log("Fetching disbursed loan report", query);

    try {
      const reportData =
        await this.ccReminderService.getDisbursedLoanReport(query);

      return {
        success: true,
        data: reportData,
        count: reportData.length,
        query,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("Error fetching disbursed loan report:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: [],
        count: 0,
      };
    }
  }

  @Get("disbursed-loan-report/yesterday")
  async getYesterdayDisbursedLoanReport() {
    this.logger.log("Fetching yesterday's disbursed loan report");

    try {
      const reportData =
        await this.ccReminderService.getYesterdayDisbursedLoanReport();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      return {
        success: true,
        data: reportData,
        count: reportData.length,
        date: yesterday.toISOString().split("T")[0],
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        "Error fetching yesterday's disbursed loan report:",
        error
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: [],
        count: 0,
      };
    }
  }

  @Get("disbursed-loan-report/today")
  async getTodayDisbursedLoanReport() {
    this.logger.log("Fetching today's disbursed loan report");

    try {
      const reportData =
        await this.ccReminderService.getTodayDisbursedLoanReport();

      return {
        success: true,
        data: reportData,
        count: reportData.length,
        date: new Date().toISOString().split("T")[0],
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("Error fetching today's disbursed loan report:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: [],
        count: 0,
      };
    }
  }

  @Post("send-disbursed-loan-email")
  async sendDisbursedLoanEmail(
    @Body()
    body: {
      recipientEmails: string[];
      query?: DisbursedLoanReportQueryDto;
      customSubject?: string;
    }
  ) {
    const { recipientEmails, query = {}, customSubject } = body;

    this.logger.log(
      `Sending disbursed loan report email to ${recipientEmails.length} recipients`,
      {
        recipientEmails,
        query,
      }
    );

    if (!recipientEmails || recipientEmails.length === 0) {
      return {
        success: false,
        message: "No recipient emails provided",
      };
    }

    return await this.ccReminderService.sendDisbursedLoanEmail(
      recipientEmails,
      query,
      customSubject
    );
  }

  @Post("send-yesterday-disbursed-loan-email")
  async sendYesterdayDisbursedLoanEmail(
    @Body() body: { recipientEmails: string[],
      brandId: string
     }
  ) {
    const { recipientEmails 
      ,
      brandId
    } = body;

    this.logger.log(
      `Sending yesterday's disbursed loan report email to ${recipientEmails.length} recipients`,
      { recipientEmails }
    );

    if (!recipientEmails || recipientEmails.length === 0) {
      return {
        success: false,
        message: "No recipient emails provided",
      };
    }

    return await this.ccReminderService.sendYesterdayDisbursedLoanEmail(
      recipientEmails,
      brandId
    );
  }
}
