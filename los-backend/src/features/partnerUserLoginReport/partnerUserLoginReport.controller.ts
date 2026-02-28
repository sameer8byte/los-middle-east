import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
  UseGuards,
  ValidationPipe,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import {
  PartnerUserLoginReportService,
  PartnerUserLoginReportData,
} from "./partnerUserLoginReport.service";
import {
  PartnerUserLoginReportQueryDto,
  LoginSummaryStatsDto,
  ApiResponseDto,
} from "./dto/partnerUserLoginReport.dto";
import { AuthType } from "src/common/decorators/auth.decorator";

// You can add authentication guards here based on your existing auth system
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller("partner-user-login-reports")
@AuthType("partner") // Assuming you have a decorator for partner authentication
// @UseGuards(JwtAuthGuard) // Uncomment if you have authentication
export class PartnerUserLoginReportController {
  constructor(
    private readonly partnerUserLoginReportService: PartnerUserLoginReportService,
  ) {}

  @Get()
  async getPartnerUserLoginReport(
    @Query(ValidationPipe) query: PartnerUserLoginReportQueryDto,
  ): Promise<ApiResponseDto<PartnerUserLoginReportData[]>> {
    try {
      const data =
        await this.partnerUserLoginReportService.getPartnerUserLoginReport(
          query,
        );

      return {
        success: true,
        data,
        meta: {
          totalRecords: data.length,
          filters: query,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error("Error in getPartnerUserLoginReport:", error);
      throw new HttpException(
        {
          success: false,
          message: "Failed to generate partner user login report",
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("today")
  async getTodayLoginReport(): Promise<
    ApiResponseDto<PartnerUserLoginReportData[]>
  > {
    try {
      const data =
        await this.partnerUserLoginReportService.getTodayLoginReport();

      return {
        success: true,
        data,
        meta: {
          totalRecords: data.length,
          reportDate: new Date().toISOString().split("T")[0], // YYYY-MM-DD format
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error("Error in getTodayLoginReport:", error);
      throw new HttpException(
        {
          success: false,
          message: "Failed to generate today's login report",
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("stats")
  async getLoginSummaryStats(
    @Query(ValidationPipe) query: PartnerUserLoginReportQueryDto,
  ): Promise<ApiResponseDto<LoginSummaryStatsDto>> {
    try {
      const data =
        await this.partnerUserLoginReportService.getLoginSummaryStats(query);

      return {
        success: true,
        data,
        meta: {
          filters: query,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error("Error in getLoginSummaryStats:", error);
      throw new HttpException(
        {
          success: false,
          message: "Failed to generate login summary statistics",
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("export/csv")
  async exportLoginReportCsv(
    @Query(ValidationPipe) query: PartnerUserLoginReportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const data =
        await this.partnerUserLoginReportService.getPartnerUserLoginReport(
          query,
        );

      // Generate CSV content
      const headers = [
        "User Email",
        "Login Date",
        "Total Sessions",
        "First Login (IST)",
        "Last Login (IST)",
        "Sessions",
      ];
      const csvRows = [
        headers.join(","),
        ...data.map((row) =>
          [
            `"${row.userEmail}"`,
            `"${row.loginDate}"`,
            row.totalSessions,
            `"${row.firstLoginIST}"`,
            `"${row.lastLoginIST}"`,
            `"${row.sessions.replace(/"/g, '""')}"`, // Escape quotes in sessions data
          ].join(","),
        ),
      ];

      const csvContent = csvRows.join("\n");
      const filename = `partner-user-login-report-${new Date().toISOString().split("T")[0]}.csv`;

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.send(csvContent);
    } catch (error) {
      console.error("Error in exportLoginReportCsv:", error);
      throw new HttpException(
        {
          success: false,
          message: "Failed to export login report as CSV",
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
