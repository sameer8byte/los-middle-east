import { Injectable } from "@nestjs/common";
import { EmailType } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class LoanRemindarEmailLogService {
  constructor(private readonly prisma: PrismaService) {}

  async logEmail(data: {
    loanId: string;
    emailType: EmailType;
    success: boolean;
    error?: string;
    recipient?: string;
  }): Promise<void> {
    try {
      await this.prisma.loanEmailLog.create({
        data: {
          loanId: data.loanId,
          emailType: data.emailType,
          success: data.success,
          error: data.error,
          recipient: data.recipient,
        },
      });
    } catch (error) {
      console.error("Failed to log email:", error);
    }
  }

  async getLogs(
    brandId: string,
    filters?: {
      loanId?: string;
      success?: boolean;
      limit?: number;
      page?: number;
      dateFrom?: Date;
      dateTo?: Date;
      all?: boolean;
      search?: string;
    },
  ) {
    const where: any = {
      loan: { brandId },
    };

    if (filters?.loanId) where.loanId = filters.loanId;
    if (filters?.success !== undefined) where.success = filters.success;

    // Date filtering
    if (filters?.dateFrom || filters?.dateTo) {
      where.sentAt = {};
      if (filters.dateFrom) {
        where.sentAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        // Set time to end of day for dateTo
        const endOfDay = new Date(filters.dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        where.sentAt.lte = endOfDay;
      }
    }

    // Search filtering - search across loan ID, customer name, email
    if (filters?.search) {
      const searchTerm = filters.search.trim();
      const searchConditions: any[] = [
        // Search by formatted loan ID
        {
          loan: {
            formattedLoanId: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
        },
        // Search by user email
        {
          loan: {
            user: {
              email: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
          },
        },
        // Search by user first name
        {
          loan: {
            user: {
              userDetails: {
                firstName: {
                  contains: searchTerm,
                  mode: 'insensitive',
                },
              },
            },
          },
        },
        // Search by user last name
        {
          loan: {
            user: {
              userDetails: {
                lastName: {
                  contains: searchTerm,
                  mode: 'insensitive',
                },
              },
            },
          },
        },
      ];

      where.OR = searchConditions;
    }

    // If requesting all records, don't apply pagination
    if (filters?.all) {
      const logs = await this.prisma.loanEmailLog.findMany({
        where,
        include: {
          loan: {
            select: {
              formattedLoanId: true,
              user: {
                select: {
                  email: true,
                  userDetails: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { sentAt: "desc" },
      });

      return { data: logs };
    }

    // Pagination logic
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const total = await this.prisma.loanEmailLog.count({ where });
    const totalPages = Math.ceil(total / limit);

    const logs = await this.prisma.loanEmailLog.findMany({
      where,
      include: {
        loan: {
          select: {
            formattedLoanId: true,
            user: {
              select: {
                email: true,
                userDetails: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { sentAt: "desc" },
      skip,
      take: limit,
    });

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getStats(brandId: string) {
    const where = {
      loan: { brandId },
    };

    const [total, successful, failed] = await Promise.all([
      this.prisma.loanEmailLog.count({ where }),
      this.prisma.loanEmailLog.count({ where: { ...where, success: true } }),
      this.prisma.loanEmailLog.count({ where: { ...where, success: false } }),
    ]);

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
    };
  }
}
