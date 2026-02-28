import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

export interface ReportLogData {
  partnerUserId: string;
  brandId: string;
  reportType: string;
  action: string;
  reportFormat?: string;
  dateRange?: {
    fromDate: string;
    toDate: string;
  };
  recipientEmail?: string;
  fileSize?: number;
  duration?: number;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
  recordCount?: number;
  metadata?: any;
}

@Injectable()
export class ReportLogService {
  constructor(private readonly prisma: PrismaService) {}

  async logReportActivity(data: ReportLogData): Promise<void> {
    try {
      await this.prisma.partnerUserReportLog.create({
        data: {
          partnerUserId: data.partnerUserId,
          brandId: data.brandId,
          reportType: data.reportType,
          action: data.action,
          reportFormat: data.reportFormat,
          dateRange: data.dateRange ? JSON.stringify(data.dateRange) : null,
          recipientEmail: data.recipientEmail,
          fileSize: data.fileSize,
          duration: data.duration,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          success: data.success ?? true,
          errorMessage: data.errorMessage,
          recordCount: data.recordCount,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        },
      });
    } catch (error) {
      console.error("Failed to log report activity:", error);
      // Don't throw error to avoid breaking the main functionality
    }
  }

  async getReportLogs(
    brandId: string,
    partnerUserId?: string,
    reportType?: string,
    action?: string,
    fromDate?: string,
    toDate?: string,
    limit: number = 100,
    offset: number = 0,
  ) {
    const whereClause: any = {
      brandId,
    };

    if (partnerUserId) {
      whereClause.partnerUserId = partnerUserId;
    }

    if (reportType) {
      whereClause.reportType = reportType;
    }

    if (action) {
      whereClause.action = action;
    }

    if (fromDate || toDate) {
      whereClause.createdAt = {};
      if (fromDate) {
        whereClause.createdAt.gte = new Date(fromDate);
      }
      if (toDate) {
        whereClause.createdAt.lte = new Date(toDate);
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.partnerUserReportLog.findMany({
        where: whereClause,
        include: {
          partnerUser: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          brand: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
        skip: offset,
      }),
      this.prisma.partnerUserReportLog.count({
        where: whereClause,
      }),
    ]);

    return {
      logs: logs.map((log) => ({
        ...log,
        dateRange: log.dateRange ? JSON.parse(log.dateRange as string) : null,
        metadata: log.metadata ? JSON.parse(log.metadata as string) : null,
      })),
      total,
      limit,
      offset,
    };
  }

  async getReportStatistics(
    brandId: string,
    partnerUserId?: string,
    fromDate?: string,
    toDate?: string,
  ) {
    const whereClause: any = {
      brandId,
    };

    if (partnerUserId) {
      whereClause.partnerUserId = partnerUserId;
    }

    if (fromDate || toDate) {
      whereClause.createdAt = {};
      if (fromDate) {
        whereClause.createdAt.gte = new Date(fromDate);
      }
      if (toDate) {
        whereClause.createdAt.lte = new Date(toDate);
      }
    }

    const [
      totalReports,
      successfulReports,
      failedReports,
      reportsByType,
      reportsByAction,
      topUsers,
    ] = await Promise.all([
      // Total reports
      this.prisma.partnerUserReportLog.count({
        where: whereClause,
      }),
      // Successful reports
      this.prisma.partnerUserReportLog.count({
        where: {
          ...whereClause,
          success: true,
        },
      }),
      // Failed reports
      this.prisma.partnerUserReportLog.count({
        where: {
          ...whereClause,
          success: false,
        },
      }),
      // Reports by type
      this.prisma.partnerUserReportLog.groupBy({
        by: ["reportType"],
        where: whereClause,
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
      }),
      // Reports by action
      this.prisma.partnerUserReportLog.groupBy({
        by: ["action"],
        where: whereClause,
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
      }),
      // Top users by report generation
      this.prisma.partnerUserReportLog.groupBy({
        by: ["partnerUserId"],
        where: whereClause,
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
        take: 10,
      }),
    ]);

    // Get partner user details for top users
    const topUsersWithDetails = await Promise.all(
      topUsers.map(async (user) => {
        const partnerUser = await this.prisma.partnerUser.findUnique({
          where: { id: user.partnerUserId },
          select: { email: true, name: true },
        });
        return {
          partnerUserId: user.partnerUserId,
          email: partnerUser?.email,
          name: partnerUser?.name,
          reportCount: user._count.id,
        };
      }),
    );

    return {
      totalReports,
      successfulReports,
      failedReports,
      successRate:
        totalReports > 0 ? (successfulReports / totalReports) * 100 : 0,
      reportsByType: reportsByType.map((item) => ({
        reportType: item.reportType,
        count: item._count.id,
      })),
      reportsByAction: reportsByAction.map((item) => ({
        action: item.action,
        count: item._count.id,
      })),
      topUsers: topUsersWithDetails,
    };
  }
}
