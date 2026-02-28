import {
  Controller,
  Get,
  Query,
  Param,
  Res,
  Post,
  Body,
  Req,
  BadRequestException,
  UseGuards,
} from "@nestjs/common";
import { AuthType } from "src/common/decorators/auth.decorator";
import { GetPartnerUser } from "src/common/decorators/get-user.decorator";
import { AuthenticatedPartnerUser } from "src/common/types/partner-user.types";
import { ReportService } from "./report.services";
import { SendReportEmailDto } from "./dto/send-report-email.dto";
import { ReportLogService } from "./report-log.service";
import { Response, Request } from "express";
import * as fs from "fs";
import * as path from "path";
import { RolePermissionGuard } from "src/common/guards/role-permission.guard";
import { RequireRoleOrPermission } from "src/common/decorators/role-permission.decorator";
import { PermissionType } from "@prisma/client";

@AuthType("partner")
@Controller("partner/brand/:brandId/report")
export class ReportController {
  constructor(
    private readonly reportService: ReportService,
    private readonly reportLogService: ReportLogService
  ) {}

  // Helper method to extract request context
  private getRequestContext(req: Request, partnerUserId?: string) {
    return {
      ipAddress:
        req.ip ||
        req.connection.remoteAddress ||
        (req.headers["x-forwarded-for"] as string),
      userAgent: req.headers["user-agent"],
      partnerUserId: partnerUserId,
    };
  }

  @Get("master-report")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
    permissions: [
      { permission: "MASTER_REPORTS", type: "ALL" },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  async getMasterReport(
    @Param("brandId") brandId: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Req() req?: Request,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ): Promise<unknown[]> {
    const defaultFromDate =
      fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultToDate = toDate || new Date().toISOString();

    const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(
      req,
      partnerUser?.id
    );

    return this.reportService.getReport(
      "master-report",
      defaultFromDate,
      defaultToDate,
      brandId,
      partnerUserId,
      ipAddress,
      userAgent
    );
  }

  @Get("disbursed-loan-report")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
    permissions: [
      { permission: "DISBURSED_LOAN_REPORT", type: "READ" },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  async getDisbursedLoanReport(
    @Param("brandId") brandId: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Req() req?: Request,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ): Promise<unknown[]> {
    const defaultFromDate =
      fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultToDate = toDate || new Date().toISOString();

    const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(
      req,
      partnerUser?.id
    );

    return this.reportService.getReport(
      "disbursed-loan-report",
      defaultFromDate,
      defaultToDate,
      brandId,
      partnerUserId,
      ipAddress,
      userAgent
    );
  }

  @Get("non-disbursed-loan-report")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
    permissions: [
      { permission: "NON_DISBURSED_LOAN_REPORT", type: "READ" },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  async getNonDisbursedLoanReport(
    @Param("brandId") brandId: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Req() req?: Request,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ): Promise<unknown[]> {
    const defaultFromDate =
      fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultToDate = toDate || new Date().toISOString();

    const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(
      req,
      partnerUser?.id
    );

    return this.reportService.getReport(
      "non-disbursed-loan-report",
      defaultFromDate,
      defaultToDate,
      brandId,
      partnerUserId,
      ipAddress,
      userAgent
    );
  }

  @Get("master-collection-report")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
    permissions: [
      { permission: "MASTER_COLLECTION_REPORT", type: "READ" },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  async getMasterCollectionReport(
    @Param("brandId") brandId: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Req() req?: Request,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ): Promise<unknown[]> {
    const defaultFromDate =
      fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultToDate = toDate || new Date().toISOString();

    const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(
      req,
      partnerUser?.id
    );

    return this.reportService.getReport(
      "master-collection-report",
      defaultFromDate,
      defaultToDate,
      brandId,
      partnerUserId,
      ipAddress,
      userAgent
    );
  }

  @Get("collection-loan-report")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
    permissions: [
      { permission: "COLLECTION_LOAN_REPORT", type: "READ" },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  async getCollectionLoanReport(
    @Param("brandId") brandId: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Req() req?: Request,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ): Promise<unknown[]> {
    const defaultFromDate =
      fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultToDate = toDate || new Date().toISOString();

    const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(
      req,
      partnerUser?.id
    );

    return this.reportService.getReport(
      "collection-loan-report",
      defaultFromDate,
      defaultToDate,
      brandId,
      partnerUserId,
      ipAddress,
      userAgent
    );
  }

  @Get("collection-due-report")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
    permissions: [
      { permission: "COLLECTION_DUE_REPORT", type: "READ" },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  async getCollectionDueReport(
    @Param("brandId") brandId: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Req() req?: Request,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ): Promise<unknown[]> {
    const defaultFromDate =
      fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultToDate = toDate || new Date().toISOString();

    const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(
      req,
      partnerUser?.id
    );

    return this.reportService.getReport(
      "collection-due-report",
      defaultFromDate,
      defaultToDate,
      brandId,
      partnerUserId,
      ipAddress,
      userAgent
    );
  }

  @Get("cic-report")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
    permissions: [
      { permission: "CIC_REPORT", type: "READ" },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  async getCicReport(
    @Param("brandId") brandId: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Req() req?: Request,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ): Promise<unknown[]> {
    const defaultFromDate =
      fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultToDate = toDate || new Date().toISOString();

    const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(
      req,
      partnerUser?.id
    );

    return this.reportService.getReport(
      "cic-report",
      defaultFromDate,
      defaultToDate,
      brandId,
      partnerUserId,
      ipAddress,
      userAgent
    );
  }

  @Get("marketing-report")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
    permissions: [
      { permission: "MARKETING_REPORT", type: "READ" },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  async getMarketingReport(
    @Param("brandId") brandId: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Req() req?: Request,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ): Promise<unknown[]> {
    const defaultFromDate =
      fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultToDate = toDate || new Date().toISOString();

    const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(
      req,
      partnerUser?.id
    );

    return this.reportService.getReport(
      "marketing-report",
      defaultFromDate,
      defaultToDate,
      brandId,
      partnerUserId,
      ipAddress,
      userAgent
    );
  }

  @Get("reject-report")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
    permissions: [
      { permission: "REJECT_REASON_REPORT", type: "READ" },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  async getRejectReport(
    @Param("brandId") brandId: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Req() req?: Request,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ): Promise<unknown[]> {
    const defaultFromDate =
      fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultToDate = toDate || new Date().toISOString();

    const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(
      req,
      partnerUser?.id
    );

    return this.reportService.getReport(
      "reject-report",
      defaultFromDate,
      defaultToDate,
      brandId,
      partnerUserId,
      ipAddress,
      userAgent
    );
  }

  @Get("completed-loan-with-no-repet-report")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
    permissions: [
      { permission: "COMPLETED_LOAN_WITH_NO_REPET_REPORT", type: "READ" },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  async getCompletedLoanWithNoRepetReport(
    @Param("brandId") brandId: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Req() req?: Request,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ): Promise<unknown[]> {
    const defaultFromDate =
      fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultToDate = toDate || new Date().toISOString();

    const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(
      req,
      partnerUser?.id
    );

    return this.reportService.getReport(
      "completed-loan-with-no-repet-report",
      defaultFromDate,
      defaultToDate,
      brandId,
      partnerUserId,
      ipAddress,
      userAgent
    );
  }

  @Get("active-loans-by-due-date-report")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
    permissions: [
      { permission: "ACTIVE_LOANS_BY_DUE_DATE_REPORT", type: "READ" },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  async getActiveLoansByDueDateReport(
    @Param("brandId") brandId: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Req() req?: Request,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ): Promise<unknown[]> {
    const defaultFromDate =
      fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultToDate = toDate || new Date().toISOString();

    const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(
      req,
      partnerUser?.id
    );

    return this.reportService.getReport(
      "active-loans-by-due-date-report",
      defaultFromDate,
      defaultToDate,
      brandId,
      partnerUserId,
      ipAddress,
      userAgent
    );
  }

  @Get("master-report/csv")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
    permissions: [
      { permission: "MASTER_REPORTS", type: "READ" },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  async exportMasterReportToCSV(
    @Param("brandId") brandId: string,
    @Res() res: Response,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Req() req?: Request,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ) {
    const defaultFromDate =
      fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultToDate = toDate || new Date().toISOString();

    const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(
      req,
      partnerUser?.id
    );

    const filePath = await this.reportService.exportReportToCSV(
      "master-report",
      defaultFromDate,
      defaultToDate,
      brandId,
      partnerUserId,
      ipAddress,
      userAgent
    );

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException("File not found");
    }

    if (partnerUserId) {
      const stats = fs.statSync(filePath);
      await this.reportLogService.logReportActivity({
        partnerUserId,
        brandId,
        reportType: "master-report",
        action: "DOWNLOAD",
        reportFormat: "CSV",
        dateRange: { fromDate: defaultFromDate, toDate: defaultToDate },
        fileSize: stats.size,
        ipAddress,
        userAgent,
        success: true,
        metadata: {
          endpoint: "exportMasterReportToCSV",
          fileName: path.basename(filePath),
          downloadMethod: "stream",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const fileName = path.basename(filePath);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on("end", () => {
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 5000);
    });
  }

  @Get("disbursed-loan-report/csv")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
    permissions: [
      { permission: "DISBURSED_LOAN_REPORT", type: "READ" },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  async exportDisbursedLoanReportToCSV(
    @Param("brandId") brandId: string,
    @Res() res: Response,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Req() req?: Request,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ) {
    const defaultFromDate =
      fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultToDate = toDate || new Date().toISOString();

    const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(
      req,
      partnerUser?.id
    );

    const filePath = await this.reportService.exportReportToCSV(
      "disbursed-loan-report",
      defaultFromDate,
      defaultToDate,
      brandId,
      partnerUserId,
      ipAddress,
      userAgent
    );

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException("File not found");
    }

    if (partnerUserId) {
      const stats = fs.statSync(filePath);
      await this.reportLogService.logReportActivity({
        partnerUserId,
        brandId,
        reportType: "disbursed-loan-report",
        action: "DOWNLOAD",
        reportFormat: "CSV",
        dateRange: { fromDate: defaultFromDate, toDate: defaultToDate },
        fileSize: stats.size,
        ipAddress,
        userAgent,
        success: true,
        metadata: {
          endpoint: "exportDisbursedLoanReportToCSV",
          fileName: path.basename(filePath),
          downloadMethod: "stream",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const fileName = path.basename(filePath);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on("end", () => {
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 5000);
    });
  }

  @Get("non-disbursed-loan-report/csv")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
    permissions: [
      { permission: "NON_DISBURSED_LOAN_REPORT", type: "READ" },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  async exportNonDisbursedLoanReportToCSV(
    @Param("brandId") brandId: string,
    @Res() res: Response,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Req() req?: Request,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ) {
    const defaultFromDate =
      fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultToDate = toDate || new Date().toISOString();

    const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(
      req,
      partnerUser?.id
    );

    const filePath = await this.reportService.exportReportToCSV(
      "non-disbursed-loan-report",
      defaultFromDate,
      defaultToDate,
      brandId,
      partnerUserId,
      ipAddress,
      userAgent
    );

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException("File not found");
    }

    if (partnerUserId) {
      const stats = fs.statSync(filePath);
      await this.reportLogService.logReportActivity({
        partnerUserId,
        brandId,
        reportType: "non-disbursed-loan-report",
        action: "DOWNLOAD",
        reportFormat: "CSV",
        dateRange: { fromDate: defaultFromDate, toDate: defaultToDate },
        fileSize: stats.size,
        ipAddress,
        userAgent,
        success: true,
        metadata: {
          endpoint: "exportNonDisbursedLoanReportToCSV",
          fileName: path.basename(filePath),
          downloadMethod: "stream",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const fileName = path.basename(filePath);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on("end", () => {
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 5000);
    });
  }

  @Get("master-collection-report/csv")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
    permissions: [
      { permission: "MASTER_COLLECTION_REPORT", type: "READ" },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  async exportMasterCollectionReportToCSV(
    @Param("brandId") brandId: string,
    @Res() res: Response,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Req() req?: Request,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ) {
    const defaultFromDate =
      fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultToDate = toDate || new Date().toISOString();

    const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(
      req,
      partnerUser?.id
    );

    const filePath = await this.reportService.exportReportToCSV(
      "master-collection-report",
      defaultFromDate,
      defaultToDate,
      brandId,
      partnerUserId,
      ipAddress,
      userAgent
    );

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException("File not found");
    }

    if (partnerUserId) {
      const stats = fs.statSync(filePath);
      await this.reportLogService.logReportActivity({
        partnerUserId,
        brandId,
        reportType: "master-collection-report",
        action: "DOWNLOAD",
        reportFormat: "CSV",
        dateRange: { fromDate: defaultFromDate, toDate: defaultToDate },
        fileSize: stats.size,
        ipAddress,
        userAgent,
        success: true,
        metadata: {
          endpoint: "exportMasterCollectionReportToCSV",
          fileName: path.basename(filePath),
          downloadMethod: "stream",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const fileName = path.basename(filePath);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on("end", () => {
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 5000);
    });
  }

  @Get("collection-loan-report/csv")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
    permissions: [
      { permission: "COLLECTION_LOAN_REPORT", type: "READ" },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  async exportCollectionLoanReportToCSV(
    @Param("brandId") brandId: string,
    @Res() res: Response,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Req() req?: Request,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ) {
    const defaultFromDate =
      fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultToDate = toDate || new Date().toISOString();

    const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(
      req,
      partnerUser?.id
    );

    const filePath = await this.reportService.exportReportToCSV(
      "collection-loan-report",
      defaultFromDate,
      defaultToDate,
      brandId,
      partnerUserId,
      ipAddress,
      userAgent
    );

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException("File not found");
    }

    if (partnerUserId) {
      const stats = fs.statSync(filePath);
      await this.reportLogService.logReportActivity({
        partnerUserId,
        brandId,
        reportType: "collection-loan-report",
        action: "DOWNLOAD",
        reportFormat: "CSV",
        dateRange: { fromDate: defaultFromDate, toDate: defaultToDate },
        fileSize: stats.size,
        ipAddress,
        userAgent,
        success: true,
        metadata: {
          endpoint: "exportCollectionLoanReportToCSV",
          fileName: path.basename(filePath),
          downloadMethod: "stream",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const fileName = path.basename(filePath);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on("end", () => {
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 5000);
    });
  }

  @Get("collection-due-report/csv")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
    permissions: [
      { permission: "COLLECTION_DUE_REPORT", type: "READ" },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  async exportCollectionDueReportToCSV(
    @Param("brandId") brandId: string,
    @Res() res: Response,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Req() req?: Request,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ) {
    const defaultFromDate =
      fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultToDate = toDate || new Date().toISOString();

    const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(
      req,
      partnerUser?.id
    );

    const filePath = await this.reportService.exportReportToCSV(
      "collection-due-report",
      defaultFromDate,
      defaultToDate,
      brandId,
      partnerUserId,
      ipAddress,
      userAgent
    );

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException("File not found");
    }

    if (partnerUserId) {
      const stats = fs.statSync(filePath);
      await this.reportLogService.logReportActivity({
        partnerUserId,
        brandId,
        reportType: "collection-due-report",
        action: "DOWNLOAD",
        reportFormat: "CSV",
        dateRange: { fromDate: defaultFromDate, toDate: defaultToDate },
        fileSize: stats.size,
        ipAddress,
        userAgent,
        success: true,
        metadata: {
          endpoint: "exportCollectionDueReportToCSV",
          fileName: path.basename(filePath),
          downloadMethod: "stream",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const fileName = path.basename(filePath);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on("end", () => {
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 5000);
    });
  }

  @Get("cic-report/csv")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
    permissions: [
      { permission: "CIC_REPORT", type: "READ" },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  async exportCicReportToCSV(
    @Param("brandId") brandId: string,
    @Res() res: Response,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Req() req?: Request,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ) {
    const defaultFromDate =
      fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultToDate = toDate || new Date().toISOString();

    const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(
      req,
      partnerUser?.id
    );

    const filePath = await this.reportService.exportReportToCSV(
      "cic-report",
      defaultFromDate,
      defaultToDate,
      brandId,
      partnerUserId,
      ipAddress,
      userAgent
    );

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException("File not found");
    }

    if (partnerUserId) {
      const stats = fs.statSync(filePath);
      await this.reportLogService.logReportActivity({
        partnerUserId,
        brandId,
        reportType: "cic-report",
        action: "DOWNLOAD",
        reportFormat: "CSV",
        dateRange: { fromDate: defaultFromDate, toDate: defaultToDate },
        fileSize: stats.size,
        ipAddress,
        userAgent,
        success: true,
        metadata: {
          endpoint: "exportCicReportToCSV",
          fileName: path.basename(filePath),
          downloadMethod: "stream",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const fileName = path.basename(filePath);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on("end", () => {
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 5000);
    });
  }

  @Get("marketing-report/csv")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
    permissions: [{ permission: "MARKETING_REPORT", type: "READ" }],
    operator: "OR",
  })
  async exportMarketingReportToCSV(
    @Param("brandId") brandId: string,
    @Res() res: Response,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Req() req?: Request,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ) {
    const defaultFromDate =
      fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultToDate = toDate || new Date().toISOString();

    const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(
      req,
      partnerUser?.id
    );

    const filePath = await this.reportService.exportReportToCSV(
      "marketing-report",
      defaultFromDate,
      defaultToDate,
      brandId,
      partnerUserId,
      ipAddress,
      userAgent
    );

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException("File not found");
    }

    if (partnerUserId) {
      const stats = fs.statSync(filePath);
      await this.reportLogService.logReportActivity({
        partnerUserId,
        brandId,
        reportType: "marketing-report",
        action: "DOWNLOAD",
        reportFormat: "CSV",
        dateRange: { fromDate: defaultFromDate, toDate: defaultToDate },
        fileSize: stats.size,
        ipAddress,
        userAgent,
        success: true,
        metadata: {
          endpoint: "exportMarketingReportToCSV",
          fileName: path.basename(filePath),
          downloadMethod: "stream",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const fileName = path.basename(filePath);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on("end", () => {
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 5000);
    });
  }

  @Get("reject-report/csv")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
    permissions: [
      { permission: "REJECT_REASON_REPORT", type: "READ" },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  async exportRejectReportToCSV(
    @Param("brandId") brandId: string,
    @Res() res: Response,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Req() req?: Request,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ) {
    const defaultFromDate =
      fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultToDate = toDate || new Date().toISOString();

    const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(
      req,
      partnerUser?.id
    );

    const filePath = await this.reportService.exportReportToCSV(
      "reject-report",
      defaultFromDate,
      defaultToDate,
      brandId,
      partnerUserId,
      ipAddress,
      userAgent
    );

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException("File not found");
    }

    if (partnerUserId) {
      const stats = fs.statSync(filePath);
      await this.reportLogService.logReportActivity({
        partnerUserId,
        brandId,
        reportType: "reject-report",
        action: "DOWNLOAD",
        reportFormat: "CSV",
        dateRange: { fromDate: defaultFromDate, toDate: defaultToDate },
        fileSize: stats.size,
        ipAddress,
        userAgent,
        success: true,
        metadata: {
          endpoint: "exportRejectReportToCSV",
          fileName: path.basename(filePath),
          downloadMethod: "stream",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const fileName = path.basename(filePath);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on("end", () => {
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 5000);
    });
  }

  @Get("completed-loan-with-no-repet-report/csv")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
    permissions: [

      { permission: "COMPLETED_LOAN_WITH_NO_REPET_REPORT", type: "READ" },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  async exportCompletedLoanWithNoRepetReportToCSV(
    @Param("brandId") brandId: string,
    @Res() res: Response,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Req() req?: Request,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ) {
    const defaultFromDate =
      fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultToDate = toDate || new Date().toISOString();

    const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(
      req,
      partnerUser?.id
    );

    const filePath = await this.reportService.exportReportToCSV(
      "completed-loan-with-no-repet-report",
      defaultFromDate,
      defaultToDate,
      brandId,
      partnerUserId,
      ipAddress,
      userAgent
    );

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException("File not found");
    }

    if (partnerUserId) {
      const stats = fs.statSync(filePath);
      await this.reportLogService.logReportActivity({
        partnerUserId,
        brandId,
        reportType: "completed-loan-with-no-repet-report",
        action: "DOWNLOAD",
        reportFormat: "CSV",
        dateRange: { fromDate: defaultFromDate, toDate: defaultToDate },
        fileSize: stats.size,
        ipAddress,
        userAgent,
        success: true,
        metadata: {
          endpoint: "exportCompletedLoanWithNoRepetReportToCSV",
          fileName: path.basename(filePath),
          downloadMethod: "stream",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const fileName = path.basename(filePath);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on("end", () => {
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 5000);
    });
  }

  @Get("active-loans-by-due-date-report/csv")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
    permissions: [
      { permission: "ACTIVE_LOANS_BY_DUE_DATE_REPORT", type: "READ" },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  async exportActiveLoansByDueDateReportToCSV(
    @Param("brandId") brandId: string,
    @Res() res: Response,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Req() req?: Request,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ) {
    const defaultFromDate =
      fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultToDate = toDate || new Date().toISOString();

    const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(
      req,
      partnerUser?.id
    );

    const filePath = await this.reportService.exportReportToCSV(
      "active-loans-by-due-date-report",
      defaultFromDate,
      defaultToDate,
      brandId,
      partnerUserId,
      ipAddress,
      userAgent
    );

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException("File not found");
    }

    if (partnerUserId) {
      const stats = fs.statSync(filePath);
      await this.reportLogService.logReportActivity({
        partnerUserId,
        brandId,
        reportType: "active-loans-by-due-date-report",
        action: "DOWNLOAD",
        reportFormat: "CSV",
        dateRange: { fromDate: defaultFromDate, toDate: defaultToDate },
        fileSize: stats.size,
        ipAddress,
        userAgent,
        success: true,
        metadata: {
          endpoint: "exportActiveLoansByDueDateReportToCSV",
          fileName: path.basename(filePath),
          downloadMethod: "stream",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const fileName = path.basename(filePath);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on("end", () => {
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 5000);
    });
  }
  @Get("collection-allocation-executive-report")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
    permissions: [
      { permission: "COLLECTION_ALLOCATION_EXECUTIVE_REPORT", type: "READ" },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  async getCollectionAllocationExecutiveReport(
    @Param("brandId") brandId: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Req() req?: Request,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ) {
    const defaultFromDate =
      fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultToDate = toDate || new Date().toISOString();

    const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(
      req,
      partnerUser?.id
    );

    const report = await this.reportService.getReport(
      "collection-allocation-executive-report",
      defaultFromDate,
      defaultToDate,
      brandId,
      partnerUserId,
      ipAddress,
      userAgent
    );

    return report;
  }
  @Get("collection-allocation-executive-report/csv")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
    permissions: [
      { permission: "COLLECTION_ALLOCATION_EXECUTIVE_REPORT", type: "READ" },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  async exportCollectionAllocationExecutiveReportToCSV(
    @Param("brandId") brandId: string,
    @Res() res: Response,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Req() req?: Request,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ) {
    const defaultFromDate =
      fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultToDate = toDate || new Date().toISOString();

    const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(
      req,
      partnerUser?.id
    );

    const filePath = await this.reportService.exportReportToCSV(
      "collection-allocation-executive-report",
      defaultFromDate,
      defaultToDate,
      brandId,
      partnerUserId,
      ipAddress,
      userAgent
    );

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException("File not found");
    }

    if (partnerUserId) {
      const stats = fs.statSync(filePath);
      await this.reportLogService.logReportActivity({
        partnerUserId,
        brandId,
        reportType: "collection-allocation-executive-report",
        action: "DOWNLOAD",
        reportFormat: "CSV",
        dateRange: { fromDate: defaultFromDate, toDate: defaultToDate },
        fileSize: stats.size,
        ipAddress,
        userAgent,
        success: true,
        metadata: {
          endpoint: "exportCollectionAllocationExecutiveReportToCSV",
          fileName: path.basename(filePath),
          downloadMethod: "stream",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const fileName = path.basename(filePath);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on("end", () => {
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 5000);
    });
  }
  @Get("disburse-non-disburse-report")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
    permissions: [{ permission: "DISBURSED_LOAN_REPORT", type: "READ" }],
    operator: "OR",
  })
  async getDisburseNonDisburseReport(
    @Param("brandId") brandId: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Req() req?: Request,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ) {
    const defaultFromDate =
      fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultToDate = toDate || new Date().toISOString();
    const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(
      req,
      partnerUser?.id
    );
    const report = await this.reportService.getReport(
      "disburse-non-disburse-report",
      defaultFromDate,
      defaultToDate,
      brandId,
      partnerUserId,
      ipAddress,
      userAgent
    );
    return report;
  }
  @Get("disburse-non-disburse-report/csv")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
    permissions: [{ permission: "DISBURSED_LOAN_REPORT", type: "READ" }],
    operator: "OR",
  })
  async exportDisburseNonDisburseReportToCSV(
    @Param("brandId") brandId: string,
    @Res() res: Response,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Req() req?: Request,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ) {
    const defaultFromDate =
      fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultToDate = toDate || new Date().toISOString();

    const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(
      req,
      partnerUser?.id
    );

    const filePath = await this.reportService.exportReportToCSV(
      "disburse-non-disburse-report",
      defaultFromDate,
      defaultToDate,
      brandId,
      partnerUserId,
      ipAddress,
      userAgent
    );

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException("File not found");
    }

    if (partnerUserId) {
      const stats = fs.statSync(filePath);
      await this.reportLogService.logReportActivity({
        partnerUserId,
        brandId,
        reportType: "disburse-non-disburse-report",
        action: "DOWNLOAD",
        reportFormat: "CSV",
        dateRange: { fromDate: defaultFromDate, toDate: defaultToDate },
        fileSize: stats.size,
        ipAddress,
        userAgent,
        success: true,
        metadata: {
          endpoint: "exportDisburseNonDisburseReportToCSV",
          fileName: path.basename(filePath),
          downloadMethod: "stream",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const fileName = path.basename(filePath);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on("end", () => {
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 5000);
    });
  }
  @Get("equifax-credit-report")
@UseGuards(RolePermissionGuard)
@RequireRoleOrPermission({
  roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
  permissions: [{ permission: "CIC_REPORT", type: "READ" }],
  operator: "OR",
})
async getEquifaxCreditReport(
  @Param("brandId") brandId: string,
  @Query("fromDate") fromDate?: string,
  @Query("toDate") toDate?: string,
  @Req() req?: Request,
  @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser,
) {
  const defaultFromDate =
    fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const defaultToDate = toDate || new Date().toISOString();

  const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(req, partnerUser?.id);

  const report = await this.reportService.getReport(
    "equifax-credit-report",
    defaultFromDate,
    defaultToDate,
    brandId,
    partnerUserId,
    ipAddress,
    userAgent,
  );

  return report;
}

@Get("equifax-credit-report/csv")
@UseGuards(RolePermissionGuard)
@RequireRoleOrPermission({
  roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
  permissions: [{ permission: "CIC_REPORT", type: "READ" }],
  operator: "OR",
})
async exportEquifaxCreditReportToCSV(
  @Param("brandId") brandId: string,
  @Res() res: Response,
  @Query("fromDate") fromDate?: string,
  @Query("toDate") toDate?: string,
  @Req() req?: Request,
  @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser,
) {
  const defaultFromDate =
    fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const defaultToDate = toDate || new Date().toISOString();

  const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(req, partnerUser?.id);

  const filePath = await this.reportService.exportReportToCSV(
    "equifax-credit-report",
    defaultFromDate,
    defaultToDate,
    brandId,
    partnerUserId,
    ipAddress,
    userAgent,
  );

  if (!fs.existsSync(filePath)) {
    throw new BadRequestException("File not found");
  }

  if (partnerUserId) {
    const stats = fs.statSync(filePath);
    await this.reportLogService.logReportActivity({
      partnerUserId,
      brandId,
      reportType: "equifax-credit-report",
      action: "DOWNLOAD",
      reportFormat: "CSV",
      dateRange: { fromDate: defaultFromDate, toDate: defaultToDate },
      fileSize: stats.size,
      ipAddress,
      userAgent,
      success: true,
      metadata: {
        endpoint: "exportEquifaxCreditReportToCSV",
        fileName: path.basename(filePath),
        downloadMethod: "stream",
        timestamp: new Date().toISOString(),
      },
    });
  }

  const fileName = path.basename(filePath);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);

  fileStream.on("end", () => {
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }, 5000);
  });
}
@Get("field-visit-report")
@UseGuards(RolePermissionGuard)
@RequireRoleOrPermission({
  roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
  permissions: [{ permission: "FIELD_VISIT_REPORT", type: "READ" }],
  operator: "OR",
})
async getFieldVisitReport(
  @Param("brandId") brandId: string,
  @Query("fromDate") fromDate?: string,
  @Query("toDate") toDate?: string,
  @Req() req?: Request,
  @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser,
) {
  const defaultFromDate =
    fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const defaultToDate = toDate || new Date().toISOString();

  const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(req, partnerUser?.id);

  const report = await this.reportService.getReport(
    "field-visit-report",
    defaultFromDate,
    defaultToDate,
    brandId,
    partnerUserId,
    ipAddress,
    userAgent,
  );

  return report;
}

@Get("field-visit-report/csv")
@UseGuards(RolePermissionGuard)
@RequireRoleOrPermission({
  roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
  permissions: [{ permission: "FIELD_VISIT_REPORT", type: "READ" }],
  operator: "OR",
})
async exportFieldVisitReportToCSV(
  @Param("brandId") brandId: string,
  @Res() res: Response,
  @Query("fromDate") fromDate?: string,
  @Query("toDate") toDate?: string,
  @Req() req?: Request,
  @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser,
) {
  const defaultFromDate =
    fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const defaultToDate = toDate || new Date().toISOString();

  const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(req, partnerUser?.id);

  const filePath = await this.reportService.exportReportToCSV(
    "field-visit-report",
    defaultFromDate,
    defaultToDate,
    brandId,
    partnerUserId,
    ipAddress,
    userAgent,
  );

  if (!fs.existsSync(filePath)) {
    throw new BadRequestException("File not found");
  }

  if (partnerUserId) {
    const stats = fs.statSync(filePath);
    await this.reportLogService.logReportActivity({
      partnerUserId,
      brandId,
      reportType: "field-visit-report",
      action: "DOWNLOAD",
      reportFormat: "CSV",
      dateRange: { fromDate: defaultFromDate, toDate: defaultToDate },
      fileSize: stats.size,
      ipAddress,
      userAgent,
      success: true,
      metadata: {
        endpoint: "exportFieldVisitReportToCSV",
        fileName: path.basename(filePath),
        downloadMethod: "stream",
        timestamp: new Date().toISOString(),
      },
    });
  }

  const fileName = path.basename(filePath);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);

  fileStream.on("end", () => {
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }, 5000);
  });
}
@Get("daily-marketing-mis-report")
@UseGuards(RolePermissionGuard)
@RequireRoleOrPermission({
  roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
  permissions: [{ permission: "DAILY_MARKETING_REPORT", type: "READ" }],
  operator: "OR",
})
async getDailyMarketingMISReport(
  @Param("brandId") brandId: string,
  @Query("fromDate") fromDate?: string,
  @Query("toDate") toDate?: string,
  @Req() req?: Request,
  @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser,
) {
  const defaultFromDate =
    fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const defaultToDate = toDate || new Date().toISOString();

  const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(req, partnerUser?.id);

  const report = await this.reportService.getReport(
    "daily-marketing-mis-report",
    defaultFromDate,
    defaultToDate,
    brandId,
    partnerUserId,
    ipAddress,
    userAgent,
  );

  return report;
}

@Get("daily-marketing-mis-report/csv")
@UseGuards(RolePermissionGuard)
@RequireRoleOrPermission({
  roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
  permissions: [{ permission: "DAILY_MARKETING_REPORT", type: "READ" }],
  operator: "OR",
})
async exportDailyMarketingMISReportToCSV(
  @Param("brandId") brandId: string,
  @Res() res: Response,
  @Query("fromDate") fromDate?: string,
  @Query("toDate") toDate?: string,
  @Req() req?: Request,
  @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser,
) {
  const defaultFromDate =
    fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const defaultToDate = toDate || new Date().toISOString();

  const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(req, partnerUser?.id);

  const filePath = await this.reportService.exportReportToCSV(
    "daily-marketing-mis-report",
    defaultFromDate,
    defaultToDate,
    brandId,
    partnerUserId,
    ipAddress,
    userAgent,
  );

  if (!fs.existsSync(filePath)) {
    throw new BadRequestException("File not found");
  }

  if (partnerUserId) {
    const stats = fs.statSync(filePath);
    await this.reportLogService.logReportActivity({
      partnerUserId,
      brandId,
      reportType: "daily-marketing-mis-report",
      action: "DOWNLOAD",
      reportFormat: "CSV",
      dateRange: { fromDate: defaultFromDate, toDate: defaultToDate },
      fileSize: stats.size,
      ipAddress,
      userAgent,
      success: true,
      metadata: {
        endpoint: "exportDailyMarketingMISReportToCSV",
        fileName: path.basename(filePath),
        downloadMethod: "stream",
        timestamp: new Date().toISOString(),
      },
    });
  }

  const fileName = path.basename(filePath);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);

  fileStream.on("end", () => {
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }, 5000);
  });
}

@Get("transunion-report")
@UseGuards(RolePermissionGuard)
@RequireRoleOrPermission({
  roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
  permissions: [{ permission: "TRANSUNION_REPORT", type: "READ" }],
  operator: "OR",
})
async getTransUnionReport(
  @Param("brandId") brandId: string,
  @Query("fromDate") fromDate?: string,
  @Query("toDate") toDate?: string,
  @Req() req?: Request,
  @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser,
) {
  const defaultFromDate =
    fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const defaultToDate = toDate || new Date().toISOString();

  const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(req, partnerUser?.id);

  const report = await this.reportService.getReport(
    "transunion-report",
    defaultFromDate,
    defaultToDate,
    brandId,
    partnerUserId,
    ipAddress,
    userAgent,
  );

  return report;
}

@Get("transunion-report/csv")
@UseGuards(RolePermissionGuard)
@RequireRoleOrPermission({
  roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
  permissions: [{ permission: "TRANSUNION_REPORT", type: "READ" }],
  operator: "OR",
})
async exportTransUnionReportToCSV(
  @Param("brandId") brandId: string,
  @Res() res: Response,
  @Query("fromDate") fromDate?: string,
  @Query("toDate") toDate?: string,
  @Req() req?: Request,
  @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser,
) {
  const defaultFromDate =
    fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const defaultToDate = toDate || new Date().toISOString();

  const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(req, partnerUser?.id);

  const filePath = await this.reportService.exportReportToCSV(
    "transunion-report",
    defaultFromDate,
    defaultToDate,
    brandId,
    partnerUserId,
    ipAddress,
    userAgent,
  );

  if (!fs.existsSync(filePath)) {
    throw new BadRequestException("File not found");
  }

  if (partnerUserId) {
    const stats = fs.statSync(filePath);
    await this.reportLogService.logReportActivity({
      partnerUserId,
      brandId,
      reportType: "transunion-report",
      action: "DOWNLOAD",
      reportFormat: "CSV",
      dateRange: { fromDate: defaultFromDate, toDate: defaultToDate },
      fileSize: stats.size,
      ipAddress,
      userAgent,
      success: true,
      metadata: {
        endpoint: "exportTransUnionReportToCSV",
        fileName: path.basename(filePath),
        downloadMethod: "stream",
        timestamp: new Date().toISOString(),
      },
    });
  }

  const fileName = path.basename(filePath);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);

  fileStream.on("end", () => {
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }, 5000);
  });
}
@Get("internal-marketing-report")
@UseGuards(RolePermissionGuard)
@RequireRoleOrPermission({
  roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
  permissions: [{ permission: "INTERNAL_MARKETING_REPORT", type: "READ" }],
  operator: "OR",
})
async getInternalMarketingReport(
  @Param("brandId") brandId: string,
  @Query("fromDate") fromDate?: string,
  @Query("toDate") toDate?: string,
  @Req() req?: Request,
  @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser,
) {
  const defaultFromDate =
    fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const defaultToDate = toDate || new Date().toISOString();

  const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(req, partnerUser?.id);

  const report = await this.reportService.getReport(
    "internal-marketing-report",
    defaultFromDate,
    defaultToDate,
    brandId,
    partnerUserId,
    ipAddress,
    userAgent,
  );

  return report;
}

@Get("internal-marketing-report/csv")
@UseGuards(RolePermissionGuard)
@RequireRoleOrPermission({
  roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
  permissions: [{ permission: "INTERNAL_MARKETING_REPORT", type: "READ" }],
  operator: "OR",
})
async exportInternalMarketingReportToCSV(
  @Param("brandId") brandId: string,
  @Res() res: Response,
  @Query("fromDate") fromDate?: string,
  @Query("toDate") toDate?: string,
  @Req() req?: Request,
  @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser,
) {
  const defaultFromDate =
    fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const defaultToDate = toDate || new Date().toISOString();

  const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(req, partnerUser?.id);

  const filePath = await this.reportService.exportReportToCSV(
    "internal-marketing-report",
    defaultFromDate,
    defaultToDate,
    brandId,
    partnerUserId,
    ipAddress,
    userAgent,
  );

  if (!fs.existsSync(filePath)) {
    throw new BadRequestException("File not found");
  }

  if (partnerUserId) {
    const stats = fs.statSync(filePath);
    await this.reportLogService.logReportActivity({
      partnerUserId,
      brandId,
      reportType: "internal-marketing-report",
      action: "DOWNLOAD",
      reportFormat: "CSV",
      dateRange: { fromDate: defaultFromDate, toDate: defaultToDate },
      fileSize: stats.size,
      ipAddress,
      userAgent,
      success: true,
      metadata: {
        endpoint: "exportInternalMarketingReportToCSV",
        fileName: path.basename(filePath),
        downloadMethod: "stream",
        timestamp: new Date().toISOString(),
      },
    });
  }

  const fileName = path.basename(filePath);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);

  fileStream.on("end", () => {
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }, 5000);
  });
}
@Get("collection-remarks-report")
@UseGuards(RolePermissionGuard)
@RequireRoleOrPermission({
  roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
  permissions: [{ permission: "COLLECTION_REMARKS_REPORT", type: "READ" }],
  operator: "OR",
})
async getCollectionRemarksReport(
  @Param("brandId") brandId: string,
  @Query("fromDate") fromDate?: string,
  @Query("toDate") toDate?: string,
  @Req() req?: Request,
  @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser,
) {
  const defaultFromDate =
    fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const defaultToDate = toDate || new Date().toISOString();

  const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(req, partnerUser?.id);

  const report = await this.reportService.getReport(
    "collection-remarks-report",
    defaultFromDate,
    defaultToDate,
    brandId,
    partnerUserId,
    ipAddress,
    userAgent,
  );

  return report;
}

@Get("collection-remarks-report/csv")
@UseGuards(RolePermissionGuard)
@RequireRoleOrPermission({
  roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
  permissions: [{ permission: "COLLECTION_REMARKS_REPORT", type: "READ" }],
  operator: "OR",
})
async exportCollectionRemarksReportToCSV(
  @Param("brandId") brandId: string,
  @Res() res: Response,
  @Query("fromDate") fromDate?: string,
  @Query("toDate") toDate?: string,
  @Req() req?: Request,
  @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser,
) {
  const defaultFromDate =
    fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const defaultToDate = toDate || new Date().toISOString();

  const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(req, partnerUser?.id);

  const filePath = await this.reportService.exportReportToCSV(
    "collection-remarks-report",
    defaultFromDate,
    defaultToDate,
    brandId,
    partnerUserId,
    ipAddress,
    userAgent,
  );

  if (!fs.existsSync(filePath)) {
    throw new BadRequestException("File not found");
  }

  if (partnerUserId) {
    const stats = fs.statSync(filePath);
    await this.reportLogService.logReportActivity({
      partnerUserId,
      brandId,
      reportType: "collection-remarks-report",
      action: "DOWNLOAD",
      reportFormat: "CSV",
      dateRange: { fromDate: defaultFromDate, toDate: defaultToDate },
      fileSize: stats.size,
      ipAddress,
      userAgent,
      success: true,
      metadata: {
        endpoint: "exportCollectionRemarksReportToCSV",
        fileName: path.basename(filePath),
        downloadMethod: "stream",
        timestamp: new Date().toISOString(),
      },
    });
  }

  const fileName = path.basename(filePath);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);

  fileStream.on("end", () => {
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }, 5000);
  });
}

@Get("outstanding-data-report")
@UseGuards(RolePermissionGuard)
@RequireRoleOrPermission({
  roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
  permissions: [{ permission: "OUTSTANDING_DATA_REPORT", type: "READ" }],
  operator: "OR",
})
async getOutstandingDataReport(
  @Param("brandId") brandId: string,
  @Query("fromDate") fromDate?: string,
  @Query("toDate") toDate?: string,
  @Req() req?: Request,
  @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser,
) {
  const defaultFromDate =
    fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const defaultToDate = toDate || new Date().toISOString();

  const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(req, partnerUser?.id);

  const report = await this.reportService.getReport(
    "outstanding-data-report",
    defaultFromDate,
    defaultToDate,
    brandId,
    partnerUserId,
    ipAddress,
    userAgent,
  );

  return report;
}

@Get("outstanding-data-report/csv")
@UseGuards(RolePermissionGuard)
@RequireRoleOrPermission({
  roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
  permissions: [{ permission: "OUTSTANDING_DATA_REPORT", type: "READ" }],
  operator: "OR",
})
async exportOutstandingDataReportToCSV(
  @Param("brandId") brandId: string,
  @Res() res: Response,
  @Query("fromDate") fromDate?: string,
  @Query("toDate") toDate?: string,
  @Req() req?: Request,
  @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser,
) {
  const defaultFromDate =
    fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const defaultToDate = toDate || new Date().toISOString();

  const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(req, partnerUser?.id);

  const filePath = await this.reportService.exportReportToCSV(
    "outstanding-data-report",
    defaultFromDate,
    defaultToDate,
    brandId,
    partnerUserId,
    ipAddress,
    userAgent,
  );

  if (!fs.existsSync(filePath)) {
    throw new BadRequestException("File not found");
  }

  if (partnerUserId) {
    const stats = fs.statSync(filePath);
    await this.reportLogService.logReportActivity({
      partnerUserId,
      brandId,
      reportType: "outstanding-data-report",
      action: "DOWNLOAD",
      reportFormat: "CSV",
      dateRange: { fromDate: defaultFromDate, toDate: defaultToDate },
      fileSize: stats.size,
      ipAddress,
      userAgent,
      success: true,
      metadata: {
        endpoint: "exportOutstandingDataReportToCSV",
        fileName: path.basename(filePath),
        downloadMethod: "stream",
        timestamp: new Date().toISOString(),
      },
    });
  }

  const fileName = path.basename(filePath);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);

  fileStream.on("end", () => {
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }, 5000);
  });
}
@Get("loan-close-report")
@UseGuards(RolePermissionGuard)
@RequireRoleOrPermission({
  roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
  permissions: [{ permission: "LOAN_CLOSE_REPORT", type: "READ" }],
  operator: "OR",
})
async getLoanCloseReport(
  @Param("brandId") brandId: string,
  @Query("fromDate") fromDate?: string,
  @Query("toDate") toDate?: string,
  @Req() req?: Request,
  @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser,
) {
  const defaultFromDate =
    fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const defaultToDate = toDate || new Date().toISOString();

  const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(req, partnerUser?.id);

  const report = await this.reportService.getReport(
    "loan-close-report",
    defaultFromDate,
    defaultToDate,
    brandId,
    partnerUserId,
    ipAddress,
    userAgent,
  );

  return report;
}

@Get("loan-close-report/csv")
@UseGuards(RolePermissionGuard)
@RequireRoleOrPermission({
  roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
  permissions: [{ permission: "LOAN_CLOSE_REPORT", type: "READ" }],
  operator: "OR",
})
async exportLoanCloseReportToCSV(
  @Param("brandId") brandId: string,
  @Res() res: Response,
  @Query("fromDate") fromDate?: string,
  @Query("toDate") toDate?: string,
  @Req() req?: Request,
  @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser,
) {
  const defaultFromDate =
    fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const defaultToDate = toDate || new Date().toISOString();

  const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(req, partnerUser?.id);

  const filePath = await this.reportService.exportReportToCSV(
    "loan-close-report",
    defaultFromDate,
    defaultToDate,
    brandId,
    partnerUserId,
    ipAddress,
    userAgent,
  );

  if (!fs.existsSync(filePath)) {
    throw new BadRequestException("File not found");
  }

  if (partnerUserId) {
    const stats = fs.statSync(filePath);
    await this.reportLogService.logReportActivity({
      partnerUserId,
      brandId,
      reportType: "loan-close-report",
      action: "DOWNLOAD",
      reportFormat: "CSV",
      dateRange: { fromDate: defaultFromDate, toDate: defaultToDate },
      fileSize: stats.size,
      ipAddress,
      userAgent,
      success: true,
      metadata: {
        endpoint: "exportLoanCloseReportToCSV",
        fileName: path.basename(filePath),
        downloadMethod: "stream",
        timestamp: new Date().toISOString(),
      },
    });
  }

  const fileName = path.basename(filePath);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);

  fileStream.on("end", () => {
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }, 5000);
  });
}

@Get("total-recovery-report")
@UseGuards(RolePermissionGuard)
@RequireRoleOrPermission({
  roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
  permissions: [{ permission: "TOTAL_RECOVERY_REPORT", type: "READ" }],
  operator: "OR",
})
async getTotalRecoveryReport(
  @Param("brandId") brandId: string,
  @Query("fromDate") fromDate?: string,
  @Query("toDate") toDate?: string,
  @Req() req?: Request,
  @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser,
) {
  const defaultFromDate =
    fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const defaultToDate = toDate || new Date().toISOString();

  const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(req, partnerUser?.id);

  const report = await this.reportService.getReport(
    "total-recovery-report",
    defaultFromDate,
    defaultToDate,
    brandId,
    partnerUserId,
    ipAddress,
    userAgent,
  );

  return report;
}

@Get("total-recovery-report/csv")
@UseGuards(RolePermissionGuard)
@RequireRoleOrPermission({
  roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
  permissions: [{ permission: "TOTAL_RECOVERY_REPORT", type: "READ" }],
  operator: "OR",
})
async exportTotalRecoveryReportToCSV(
  @Param("brandId") brandId: string,
  @Res() res: Response,
  @Query("fromDate") fromDate?: string,
  @Query("toDate") toDate?: string,
  @Req() req?: Request,
  @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser,
) {
  const defaultFromDate =
    fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const defaultToDate = toDate || new Date().toISOString();

  const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(req, partnerUser?.id);

  const filePath = await this.reportService.exportReportToCSV(
    "total-recovery-report",
    defaultFromDate,
    defaultToDate,
    brandId,
    partnerUserId,
    ipAddress,
    userAgent,
  );

  if (!fs.existsSync(filePath)) {
    throw new BadRequestException("File not found");
  }

  if (partnerUserId) {
    const stats = fs.statSync(filePath);
    await this.reportLogService.logReportActivity({
      partnerUserId,
      brandId,
      reportType: "total-recovery-report",
      action: "DOWNLOAD",
      reportFormat: "CSV",
      dateRange: { fromDate: defaultFromDate, toDate: defaultToDate },
      fileSize: stats.size,
      ipAddress,
      userAgent,
      success: true,
      metadata: {
        endpoint: "exportTotalRecoveryReportToCSV",
        fileName: path.basename(filePath),
        downloadMethod: "stream",
        timestamp: new Date().toISOString(),
      },
    });
  }

  const fileName = path.basename(filePath);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);

  fileStream.on("end", () => {
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }, 5000);
  });
}

@Get("total-approve-sanction-report")
@UseGuards(RolePermissionGuard)
@RequireRoleOrPermission({
  roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
  permissions: [{ permission: "TOTAL_APPROVE_SANCTION_REPORT", type: "READ" }],
  operator: "OR",
})
async getTotalApproveSanctionReport(
  @Param("brandId") brandId: string,
  @Query("fromDate") fromDate?: string,
  @Query("toDate") toDate?: string,
  @Req() req?: Request,
  @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser,
) {
  const defaultFromDate =
    fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const defaultToDate = toDate || new Date().toISOString();

  const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(req, partnerUser?.id);

  const report = await this.reportService.getReport(
    "total-approve-sanction-report",
    defaultFromDate,
    defaultToDate,
    brandId,
    partnerUserId,
    ipAddress,
    userAgent,
  );

  return report;
}

@Get("total-approve-sanction-report/csv")
@UseGuards(RolePermissionGuard)
@RequireRoleOrPermission({
  roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
  permissions: [{ permission: "TOTAL_APPROVE_SANCTION_REPORT", type: "READ" }],
  operator: "OR",
})
async exportTotalApproveSanctionReportToCSV(
  @Param("brandId") brandId: string,
  @Res() res: Response,
  @Query("fromDate") fromDate?: string,
  @Query("toDate") toDate?: string,
  @Req() req?: Request,
  @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser,
) {
  const defaultFromDate =
    fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const defaultToDate = toDate || new Date().toISOString();

  const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(req, partnerUser?.id);

  const filePath = await this.reportService.exportReportToCSV(
    "total-approve-sanction-report",
    defaultFromDate,
    defaultToDate,
    brandId,
    partnerUserId,
    ipAddress,
    userAgent,
  );

  if (!fs.existsSync(filePath)) {
    throw new BadRequestException("File not found");
  }

  if (partnerUserId) {
    const stats = fs.statSync(filePath);
    await this.reportLogService.logReportActivity({
      partnerUserId,
      brandId,
      reportType: "total-approve-sanction-report",
      action: "DOWNLOAD",
      reportFormat: "CSV",
      dateRange: { fromDate: defaultFromDate, toDate: defaultToDate },
      fileSize: stats.size,
      ipAddress,
      userAgent,
      success: true,
      metadata: {
        endpoint: "exportTotalApproveSanctionReportToCSV",
        fileName: path.basename(filePath),
        downloadMethod: "stream",
        timestamp: new Date().toISOString(),
      },
    });
  }

  const fileName = path.basename(filePath);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);

  fileStream.on("end", () => {
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }, 5000);
  });
}
@Get("lead-total-report")
@UseGuards(RolePermissionGuard)
@RequireRoleOrPermission({
  roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
  permissions: [{ permission: "LEAD_TOTAL_REPORT", type: "READ" }],
  operator: "OR",
})
async getLeadTotalReport(
  @Param("brandId") brandId: string,
  @Query("fromDate") fromDate?: string,
  @Query("toDate") toDate?: string,
  @Req() req?: Request,
  @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser,
) {
  const defaultFromDate =
    fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const defaultToDate = toDate || new Date().toISOString();

  const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(req, partnerUser?.id);

  const report = await this.reportService.getReport(
    "lead-total-report",
    defaultFromDate,
    defaultToDate,
    brandId,
    partnerUserId,
    ipAddress,
    userAgent,
  );

  return report;
}

@Get("lead-total-report/csv")
@UseGuards(RolePermissionGuard)
@RequireRoleOrPermission({
  roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
  permissions: [{ permission: "LEAD_TOTAL_REPORT", type: "READ" }],
  operator: "OR",
})
async exportLeadTotalReportToCSV(
  @Param("brandId") brandId: string,
  @Res() res: Response,
  @Query("fromDate") fromDate?: string,
  @Query("toDate") toDate?: string,
  @Req() req?: Request,
  @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser,
) {
  const defaultFromDate =
    fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const defaultToDate = toDate || new Date().toISOString();

  const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(req, partnerUser?.id);

  const filePath = await this.reportService.exportReportToCSV(
    "lead-total-report",
    defaultFromDate,
    defaultToDate,
    brandId,
    partnerUserId,
    ipAddress,
    userAgent,
  );

  if (!fs.existsSync(filePath)) {
    throw new BadRequestException("File not found");
  }

  if (partnerUserId) {
    const stats = fs.statSync(filePath);
    await this.reportLogService.logReportActivity({
      partnerUserId,
      brandId,
      reportType: "lead-total-report",
      action: "DOWNLOAD",
      reportFormat: "CSV",
      dateRange: { fromDate: defaultFromDate, toDate: defaultToDate },
      fileSize: stats.size,
      ipAddress,
      userAgent,
      success: true,
      metadata: {
        endpoint: "exportLeadTotalReportToCSV",
        fileName: path.basename(filePath),
        downloadMethod: "stream",
        timestamp: new Date().toISOString(),
      },
    });
  }

  const fileName = path.basename(filePath);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);

  fileStream.on("end", () => {
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }, 5000);
  });
}

@Get("login-sessions-report")
@UseGuards(RolePermissionGuard)
@RequireRoleOrPermission({
  roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
  permissions: [{ permission: "LOGIN_SESSIONS_REPORT", type: "READ" }],
  operator: "OR",
})
async getLoginSessionsReport(
  @Param("brandId") brandId: string,
  @Query("fromDate") fromDate?: string,
  @Query("toDate") toDate?: string,
  @Req() req?: Request,
  @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser,
) {
  const defaultFromDate =
    fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const defaultToDate = toDate || new Date().toISOString();

  const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(req, partnerUser?.id);

  const report = await this.reportService.getReport(
    "login-sessions-report",
    defaultFromDate,
    defaultToDate,
    brandId,
    partnerUserId,
    ipAddress,
    userAgent,
  );

  return report;
}

@Get("login-sessions-report/csv")
@UseGuards(RolePermissionGuard)
@RequireRoleOrPermission({
  roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
  permissions: [{ permission: "LOGIN_SESSIONS_REPORT", type: "READ" }],
  operator: "OR",
})
async exportLoginSessionsReportToCSV(
  @Param("brandId") brandId: string,
  @Res() res: Response,
  @Query("fromDate") fromDate?: string,
  @Query("toDate") toDate?: string,
  @Req() req?: Request,
  @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser,
) {
  const defaultFromDate =
    fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const defaultToDate = toDate || new Date().toISOString();

  const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(req, partnerUser?.id);

  const filePath = await this.reportService.exportReportToCSV(
    "login-sessions-report",
    defaultFromDate,
    defaultToDate,
    brandId,
    partnerUserId,
    ipAddress,
    userAgent,
  );

  if (!fs.existsSync(filePath)) {
    throw new BadRequestException("File not found");
  }

  if (partnerUserId) {
    const stats = fs.statSync(filePath);
    await this.reportLogService.logReportActivity({
      partnerUserId,
      brandId,
      reportType: "login-sessions-report",
      action: "DOWNLOAD",
      reportFormat: "CSV",
      dateRange: { fromDate: defaultFromDate, toDate: defaultToDate },
      fileSize: stats.size,
      ipAddress,
      userAgent,
      success: true,
      metadata: {
        endpoint: "exportLoginSessionsReportToCSV",
        fileName: path.basename(filePath),
        downloadMethod: "stream",
        timestamp: new Date().toISOString(),
      },
    });
  }

  const fileName = path.basename(filePath);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);

  fileStream.on("end", () => {
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }, 5000);
  });
}

@Get("collection-loan-report-by-approved-date")
@UseGuards(RolePermissionGuard)
@RequireRoleOrPermission({
  roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
  permissions: [{ permission: "COLLECTION_LOAN_REPORT_BY_APPROVED_DATE", type: "READ" }],
  operator: "OR",
})
async getCollectionLoanReportByApprovedDate(
  @Param("brandId") brandId: string,
  @Query("fromDate") fromDate?: string,
  @Query("toDate") toDate?: string,
  @Req() req?: Request,
  @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser,
) {
  const defaultFromDate =
    fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const defaultToDate = toDate || new Date().toISOString();

  const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(req, partnerUser?.id);

  const report = await this.reportService.getReport(
    "collection-loan-report-by-approved-date",
    defaultFromDate,
    defaultToDate,
    brandId,
    partnerUserId,
    ipAddress,
    userAgent,
  );

  return report;
}

@Get("collection-loan-report-by-approved-date/csv")
@UseGuards(RolePermissionGuard)
@RequireRoleOrPermission({
  roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
  permissions: [{ permission: "COLLECTION_LOAN_REPORT_BY_APPROVED_DATE", type: "READ" }],
  operator: "OR",
})
async exportCollectionLoanReportByApprovedDateToCSV(
  @Param("brandId") brandId: string,
  @Res() res: Response,
  @Query("fromDate") fromDate?: string,
  @Query("toDate") toDate?: string,
  @Req() req?: Request,
  @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser,
) {
  const defaultFromDate =
    fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const defaultToDate = toDate || new Date().toISOString();

  const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(req, partnerUser?.id);

  const filePath = await this.reportService.exportReportToCSV(
    "collection-loan-report-by-approved-date",
    defaultFromDate,
    defaultToDate,
    brandId,
    partnerUserId,
    ipAddress,
    userAgent,
  );

  if (!fs.existsSync(filePath)) {
    throw new BadRequestException("File not found");
  }

  if (partnerUserId) {
    const stats = fs.statSync(filePath);
    await this.reportLogService.logReportActivity({
      partnerUserId,
      brandId,
      reportType: "collection-loan-report-by-approved-date",
      action: "DOWNLOAD",
      reportFormat: "CSV",
      dateRange: { fromDate: defaultFromDate, toDate: defaultToDate },
      fileSize: stats.size,
      ipAddress,
      userAgent,
      success: true,
      metadata: {
        endpoint: "exportCollectionLoanReportByApprovedDateToCSV",
        fileName: path.basename(filePath),
        downloadMethod: "stream",
        timestamp: new Date().toISOString(),
      },
    });
  }

  const fileName = path.basename(filePath);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);

  fileStream.on("end", () => {
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }, 5000);
  });
}
  // Download endpoints with specific permissions for each report type
  @Get("master-report/download")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
    permissions: [
      { permission: "MASTER_REPORTS", type: "READ" },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  async downloadMasterReport(
    @Param("brandId") brandId: string,
    @Res() res: Response,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Req() req?: Request,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ) {
    const defaultFromDate =
      fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultToDate = toDate || new Date().toISOString();

    const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(
      req,
      partnerUser?.id
    );

    const filePath = await this.reportService.exportReportToCSV(
      "master-report",
      defaultFromDate,
      defaultToDate,
      brandId,
      partnerUserId,
      ipAddress,
      userAgent
    );

    if (partnerUserId && fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      await this.reportLogService.logReportActivity({
        partnerUserId,
        brandId,
        reportType: "master-report",
        action: "DOWNLOAD",
        reportFormat: "CSV",
        dateRange: { fromDate: defaultFromDate, toDate: defaultToDate },
        fileSize: stats.size,
        ipAddress,
        userAgent,
        success: true,
        metadata: {
          endpoint: "downloadMasterReport",
          fileName: path.basename(filePath),
          downloadMethod: "direct",
          timestamp: new Date().toISOString(),
        },
      });
    }

    return res.download(filePath, (err) => {
      if (err) {
        console.error("Error downloading file:", err);
        res.status(500).send("Error downloading file");
      } else {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    });
  }

  @Get("disbursed-loan-report/download")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
    permissions: [
      { permission: "DISBURSED_LOAN_REPORT", type: "READ" },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  async downloadDisbursedLoanReport(
    @Param("brandId") brandId: string,
    @Res() res: Response,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Req() req?: Request,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ) {
    const defaultFromDate =
      fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultToDate = toDate || new Date().toISOString();

    const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(
      req,
      partnerUser?.id
    );

    const filePath = await this.reportService.exportReportToCSV(
      "disbursed-loan-report",
      defaultFromDate,
      defaultToDate,
      brandId,
      partnerUserId,
      ipAddress,
      userAgent
    );

    if (partnerUserId && fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      await this.reportLogService.logReportActivity({
        partnerUserId,
        brandId,
        reportType: "disbursed-loan-report",
        action: "DOWNLOAD",
        reportFormat: "CSV",
        dateRange: { fromDate: defaultFromDate, toDate: defaultToDate },
        fileSize: stats.size,
        ipAddress,
        userAgent,
        success: true,
        metadata: {
          endpoint: "downloadDisbursedLoanReport",
          fileName: path.basename(filePath),
          downloadMethod: "direct",
          timestamp: new Date().toISOString(),
        },
      });
    }

    return res.download(filePath, (err) => {
      if (err) {
        console.error("Error downloading file:", err);
        res.status(500).send("Error downloading file");
      } else {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    });
  }

  // Email endpoints with specific permissions for each report type
  @Post("master-report/email")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
    permissions: [
      { permission: "MASTER_REPORTS", type: "READ" },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  async sendMasterReportViaEmail(
    @Param("brandId") brandId: string,
    @Body() emailDto: SendReportEmailDto,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Req() req?: Request,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ) {
    const defaultFromDate =
      fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultToDate = toDate || new Date().toISOString();

    const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(
      req,
      partnerUser?.id
    );

    return this.reportService.sendReportViaEmail(
      "master-report",
      defaultFromDate,
      defaultToDate,
      brandId,
      emailDto.recipientEmail,
      emailDto.recipientName,
      partnerUserId,
      ipAddress,
      userAgent
    );
  }

  @Post("disbursed-loan-report/email")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN", "ADMIN", "REPORT"],
    permissions: [
      { permission: "DISBURSED_LOAN_REPORT", type: "READ" },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  async sendDisbursedLoanReportViaEmail(
    @Param("brandId") brandId: string,
    @Body() emailDto: SendReportEmailDto,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Req() req?: Request,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ) {
    const defaultFromDate =
      fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultToDate = toDate || new Date().toISOString();

    const { ipAddress, userAgent, partnerUserId } = this.getRequestContext(
      req,
      partnerUser?.id
    );

    return this.reportService.sendReportViaEmail(
      "disbursed-loan-report",
      defaultFromDate,
      defaultToDate,
      brandId,
      emailDto.recipientEmail,
      emailDto.recipientName,
      partnerUserId,
      ipAddress,
      userAgent
    );
  }

  @Get("logs")
  async getReportLogs(
    @Param("brandId") brandId: string,
    @Query("partnerUserId") partnerUserId?: string,
    @Query("reportType") reportType?: string,
    @Query("action") action?: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.reportLogService.getReportLogs(
      brandId,
      partnerUserId,
      reportType,
      action,
      fromDate,
      toDate,
      limit ? parseInt(limit) : 100,
      offset ? parseInt(offset) : 0
    );
  }

  @Get("logs/statistics")
  async getReportStatistics(
    @Param("brandId") brandId: string,
    @Query("partnerUserId") partnerUserId?: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string
  ) {
    return this.reportLogService.getReportStatistics(
      brandId,
      partnerUserId,
      fromDate,
      toDate
    );
  }
}