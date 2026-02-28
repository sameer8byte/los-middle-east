import { Injectable } from "@nestjs/common";
import { platform_type, UserLogType } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class UserLogsService {
  constructor(private readonly prisma: PrismaService) {}

  // Create a log
  async create(data: {
    userId: string;
    loanId: string | null;
    brandId: string;
    partnerUserId: string;
    message: string;
    type: UserLogType;
    platformType: platform_type;
    context?: any;
  }) {
    return this.prisma.$transaction(async (tx) => {
      // Step 1: Find last serialNumber for the user
      const lastLog = await tx.user_audit_logs.findFirst({
        where: { userId: data.userId },
        orderBy: { serialNumber: "desc" },
        select: { serialNumber: true },
      });

      const nextSerialNumber = (lastLog?.serialNumber || 0) + 1;
      // Step 2: Create the new log with serialNumber
      return tx.user_audit_logs.create({
        data: {
          id: uuidv4(),
          userId: data.userId,
          brandId: data.brandId,
          loanId: null,

          partnerUserId: data.partnerUserId || null,
          message: data.message,
          type: data.type,
          platformType: data.platformType,
          context: data.context || {},

          serialNumber: nextSerialNumber,
          updatedAt: new Date(),
        },
      });
    });
  }

  // Get logs with filters and pagination
  async findAllWithFilters(
    brandId: string,
    filters: {
      page: number;
      limit: number;
      userId?: string;
      partnerUserId?: string;
      type?: UserLogType;
      search?: string;
      fromDate?: string;
      toDate?: string;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    },
  ) {
    const {
      page,
      limit,
      userId,
      partnerUserId,
      type,
      search,
      fromDate,
      toDate,
      sortBy = "timestamp",
      sortOrder = "desc",
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      brandId,
    };

    if (userId) {
      where.userId = userId;
    }

    if (partnerUserId) {
      where.partnerUserId = partnerUserId;
    }

    if (type) {
      where.type = type;
    }

    if (search) {
      where.message = {
        contains: search,
        mode: "insensitive",
      };
    }

    if (fromDate || toDate) {
      where.timestamp = {};
      if (fromDate) {
        where.timestamp.gte = new Date(fromDate);
      }
      if (toDate) {
        where.timestamp.lte = new Date(toDate);
      }
    }

    // Execute queries in parallel
    const [logs, total] = await Promise.all([
      this.prisma.user_audit_logs.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.user_audit_logs.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get logs by userId
  async findByUserId(userId: string) {
    return this.prisma.user_audit_logs.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  // Get log by ID
  async findById(id: string) {
    return this.prisma.user_audit_logs.findUnique({
      where: { id },
    });
  }

  // Get available log types
  async getLogTypes() {
    const types = [
      { value: "Home", label: "Home" },
      { value: "PhoneVerification", label: "Phone Verification" },
      { value: "EmailVerification", label: "Email Verification" },
      { value: "LoanApplication", label: "Loan Application" },
      { value: "CurrentStatus", label: "Current Status" },
      { value: "LoanApplicationKyc", label: "Loan Application KYC" },
      {
        value: "LoanApplicationPersonalInfo",
        label: "Loan Application Personal Info",
      },
      {
        value: "LoanApplicationBankDetails",
        label: "Loan Application Bank Details",
      },
      {
        value: "LoanApplicationEmploymentInfo",
        label: "Loan Application Employment Info",
      },
      { value: "LoanApplicationSelfie", label: "Loan Application Selfie" },
      {
        value: "LoanApplicationAddressVerification",
        label: "Loan Application Address Verification",
      },
      { value: "LoanApplicationReview", label: "Loan Application Review" },
      { value: "LoanApplicationSubmit", label: "Loan Application Submit" },
    ];
    return types;
  }

  // Get statistics
  async getStats(
    brandId: string,
    userId?: string,
    fromDate?: string,
    toDate?: string,
  ) {
    const where: any = { brandId };

    if (userId) {
      where.userId = userId;
    }

    if (fromDate || toDate) {
      where.timestamp = {};
      if (fromDate) {
        where.timestamp.gte = new Date(fromDate);
      }
      if (toDate) {
        where.timestamp.lte = new Date(toDate);
      }
    }

    // Get total logs count
    const totalLogs = await this.prisma.user_audit_logs.count({ where });

    // Get logs by type
    const logsByType = await this.prisma.user_audit_logs.groupBy({
      by: ["type"],
      where,
      _count: {
        id: true,
      },
    });

    // Get unique users count
    const uniqueUsers = await this.prisma.user_audit_logs.findMany({
      where,
      select: {
        userId: true,
      },
      distinct: ["userId"],
    });

    // Get logs over time (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const logsOverTime = await this.prisma.$queryRaw<
      Array<{ date: Date; count: bigint }>
    >`
      SELECT DATE(timestamp) as date, COUNT(*)::int as count
      FROM user_logs
      WHERE "brandId" = ${brandId}
        ${userId ? this.prisma.$queryRaw`AND "userId" = ${userId}` : this.prisma.$queryRaw``}
        AND timestamp >= ${sevenDaysAgo}
      GROUP BY DATE(timestamp)
      ORDER BY DATE(timestamp) ASC
    `;

    return {
      totalLogs,
      uniqueUsers: uniqueUsers.length,
      logsByType: logsByType.map((item) => ({
        type: item.type,
        count: item._count.id,
      })),
      logsOverTime: logsOverTime.map((item) => ({
        date: item.date,
        count: Number(item.count),
      })),
    };
  }

  // Update a log
  async update(
    id: string,
    data: Partial<{ message: string; type: UserLogType; context: any }>,
  ) {
    return this.prisma.user_audit_logs.update({
      where: { id },
      data,
    });
  }

  // Delete a log
  async delete(id: string) {
    return this.prisma.user_audit_logs.delete({
      where: { id },
    });
  }
}
