import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { loan_status_enum } from "@prisma/client";

@Injectable()
export class CompletedLoansService {
  constructor(private readonly prisma: PrismaService) {}

  // In CompletedLoansService
  async getCompletedLoans(
    brandId: string,
    partnerUserId: string,
    options: {
      page: number;
      limit: number;
      status: string;
      search: string;
      dateFilter?: string;
    }
  ) {
    const { page, limit, status, search, dateFilter } = options;
    const skip = (page - 1) * limit;

    // Parse status filter
    let statusFilter: loan_status_enum[] = [
      loan_status_enum.COMPLETED,
      loan_status_enum.SETTLED,
      loan_status_enum.WRITE_OFF,
    ];

    try {
      if (status && status !== "[]" && status !== "") {
        let parsedStatus: any = status;

        try {
          if (typeof parsedStatus === "string") {
            parsedStatus = JSON.parse(parsedStatus);
          }
        } catch (e) {}

        try {
          if (typeof parsedStatus === "string") {
            parsedStatus = JSON.parse(parsedStatus);
          }
        } catch (e) {
          parsedStatus = null;
        }

        if (Array.isArray(parsedStatus) && parsedStatus.length > 0) {
          statusFilter = parsedStatus;
        }
      }
    } catch (error) {
      console.warn("Failed to parse status filter, using defaults:", error);
    }

    // Parse dateFilter if it comes as an array
    let parsedDateFilter = dateFilter;
    try {
      if (
        dateFilter &&
        dateFilter.startsWith("[") &&
        dateFilter.endsWith("]")
      ) {
        const parsed = JSON.parse(dateFilter);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsedDateFilter = parsed[0]; // Take the first element
        }
      }
    } catch (error) {
      console.warn("Failed to parse dateFilter, using as-is:", error);
    }

    // Build search filter
    const whereClause: any = {
      brandId,
      status: {
        in: statusFilter,
      },
      // Make sure closureDate exists
      closureDate: {
        not: null,
      },
    };

    // Add date filter if specified
    if (
      parsedDateFilter &&
      parsedDateFilter !== "all" &&
      parsedDateFilter !== ""
    ) {
      const now = new Date();
      let startDate = new Date();

      switch (parsedDateFilter) {
        case "today":
          startDate.setHours(0, 0, 0, 0);
          whereClause.closureDate = {
            gte: startDate,
          };
          break;
        case "yesterday":
          startDate.setDate(now.getDate() - 1);
          startDate.setHours(0, 0, 0, 0);
          const yesterdayEnd = new Date(startDate);
          yesterdayEnd.setHours(23, 59, 59, 999);
          whereClause.closureDate = {
            gte: startDate,
            lte: yesterdayEnd,
          };
          break;
        case "last_7_days":
          startDate.setDate(now.getDate() - 7);
          startDate.setHours(0, 0, 0, 0);
          whereClause.closureDate = {
            gte: startDate,
          };
          break;
        case "last_30_days":
          startDate.setDate(now.getDate() - 30);
          startDate.setHours(0, 0, 0, 0);
          whereClause.closureDate = {
            gte: startDate,
          };
          break;
        case "last_90_days":
          startDate.setDate(now.getDate() - 90);
          startDate.setHours(0, 0, 0, 0);
          whereClause.closureDate = {
            gte: startDate,
          };
          break;
      }
    }

    if (search) {
      whereClause.OR = [
        {
          user: {
            userDetails: {
              firstName: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
          },
        },
        {
          user: {
            userDetails: {
              lastName: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
          },
        },
        {
          formattedLoanId: {
            contains: search,
            mode: "insensitive" as const,
          },
        },
        {
          oldLoanId: {
            contains: search,
            mode: "insensitive" as const,
          },
        },
        {
          user: {
            formattedUserId: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
        },
        {
          user: {
            documents: {
              some: {
                documentNumber: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            },
          },
        },
      ];
    }

    const [loans, total] = await Promise.all([
      this.prisma.loan.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phoneNumber: true,
              formattedUserId: true,
              userDetails: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          repayment: {
            select: {
              id: true,
              totalObligation: true,
            },
          },
          loanDetails: {
            select: {
              dueDate: true,
              durationDays: true,
            },
          },
          loanStatusHistory: {
            where: {
              status: {
                in: statusFilter,
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
            select: {
              createdAt: true,
              status: true,
            },
          },
        },
        orderBy: {
          closureDate: "desc",
        },
        skip,
        take: limit,
      }),
      this.prisma.loan.count({
        where: whereClause,
      }),
    ]);

    return {
      success: true,
      data: loans.map((loan) => ({
        id: loan.id,
        userId: loan.user.id,
        formattedLoanId: loan.formattedLoanId,
        oldLoanId: loan.oldLoanId,
        formattedUserId: loan.user.formattedUserId,
        customerName: `${loan.user.userDetails?.firstName || ""} ${
          loan.user.userDetails?.lastName || ""
        }`.trim(),
        customerEmail: loan.user.email,
        customerPhone: loan.user.phoneNumber,
        loanAmount: loan.amount,
        status: loan.status,
        closureDate: loan.closureDate,
        approvalDate: loan.approvalDate,
        disbursementDate: loan.disbursementDate,
        totalObligation: loan.repayment?.totalObligation || 0,
        lastStatusUpdate: loan.loanStatusHistory[0]?.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
