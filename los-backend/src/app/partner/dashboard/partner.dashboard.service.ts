import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { DashboardStatsDto } from "./dto/dashboard-stats.dto";
import { EmailService } from "src/core/communication/services/email.service";
import { Loan, loan_status_enum } from "@prisma/client";
import * as dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { UserStatusEnum } from "src/constant/enum";

// Extend dayjs with UTC and timezone plugins
dayjs.default.extend(utc);
dayjs.default.extend(timezone);

// Access the default function from the namespace import
const _dayjs = dayjs.default;

type PartnerRole = "executive" | "manager" | "head";

@Injectable()
export class PartnerDashboardService {
  private readonly logger = new Logger(PartnerDashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  private getIST() {
    return _dayjs().tz("Asia/Kolkata");
  }

  private getDateRangeIST(date: string | Date | dayjs.Dayjs): {
    gte: Date;
    lt: Date;
  } {
    const dayjsDate = _dayjs(date).tz("Asia/Kolkata");
    const dateStr = dayjsDate.format("YYYY-MM-DD");

    const startUTC = new Date(`${dateStr}T00:00:00Z`);

    const nextDay = _dayjs(dateStr).add(1, "day").format("YYYY-MM-DD");
    const endUTC = new Date(`${nextDay}T00:00:00Z`);

    return {
      gte: startUTC,
      lt: endUTC,
    };
  }

  private calculateDPD(
    dueDate: Date | string | null,
    loanStatus: string,
  ): number {
    if (loanStatus === "PAID" || loanStatus === "COMPLETED") {
      return -1;
    }

    if (!dueDate) return 0;

    const today = this.getIST().startOf("day");
    const due = _dayjs(dueDate).tz("Asia/Kolkata").startOf("day");

    if (due.isAfter(today) || due.isSame(today, "day")) {
      return 0;
    }

    const daysPastDue = today.diff(due, "days");

    return daysPastDue;
  }

  private getDPDRange(dpd: number): string {
    if (dpd === -1) {
      return "EXCLUDE";
    }

    if (dpd === 0) {
      return "Running Case";
    }

    if (dpd >= 1 && dpd <= 30) return "1 To 30";
    if (dpd >= 31 && dpd <= 60) return "31 - 60";
    if (dpd >= 61 && dpd <= 90) return "61 - 90";
    if (dpd >= 91 && dpd <= 120) return "91 - 120";
    if (dpd >= 121 && dpd <= 180) return "121 - 180";
    if (dpd > 180) return "180+";

    return "Running Case";
  }

  async getDashboardStats(brandId: string, query: DashboardStatsDto) {
    try {
      const dateRange = this.getDateRange(query);

      // Get total users count with date filter
      const totalUsers = await this.prisma.user.count({
        where: {
          brandId,
          isActive: true,
          createdAt: dateRange.dateFilter,
        },
      });

      // Get total loans count with date filter (include all loan applications)
      const totalLoans = await this.prisma.loan.count({
        where: {
          brandId,
          isActive: true,
          user: {
            isActive: true,
            // createdAt: dateRange.dateFilter,
          },
          createdAt: dateRange.dateFilter,
          // Include all loan applications, not just active ones
        },
      });

      // Get additional stats for the dashboard
      const additionalStats = await this.getAdditionalStats(brandId, dateRange);

      return {
        summary: {
          totalUsers,
          totalLoans,
          ...additionalStats,
        },
        dateRange: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          period: query.period || "all",
        },
      };
    } catch (error) {
      this.logger.error(
        `Error fetching dashboard stats for brand ${brandId}:`,
        error,
      );
      throw error;
    }
  }

  async getDashboardSummary(brandId: string, query: DashboardStatsDto) {
    try {
      const dateRange = this.getDateRange(query);

      // Get total users count with date filter
      const totalUsers = await this.prisma.user.count({
        where: {
          brandId,
          isActive: true,
          createdAt: dateRange.dateFilter,
        },
      });

      // Get total loans count with date filter
      const totalLoans = await this.prisma.loan.count({
        where: {
          brandId,
          isActive: true,
          user: {
            isActive: true,
          },
          createdAt: dateRange.dateFilter,
        },
      });
      // 1. TOTAL SANCTIONED
      const totalSanctionedData = await this.prisma.loan.aggregate({
        where: {
          brandId,
          isActive: true,
          status: {
            in: [
              "APPROVED",
              "DISBURSED",
              "ACTIVE",
              "POST_ACTIVE",
              "PAID",
              "PARTIALLY_PAID",
              "COMPLETED",
            ],
          },
          createdAt: dateRange.dateFilter, // Filter by when loan was created/sanctioned
        },
        _count: {
          id: true,
        },
        _sum: {
          amount: true,
        },
      });

      const totalSanctioned = totalSanctionedData._count.id || 0;
      const totalSanctionedAmount = totalSanctionedData._sum.amount || 0;

      // 2. TOTAL DISBURSED
      const totalDisbursedData = await this.prisma.loan.aggregate({
        where: {
          brandId,
          isActive: true,
          disbursementDate: {
            not: null,
            ...(dateRange.dateFilter || {}), // Apply date filter to disbursementDate
          },
        },
        _count: {
          id: true,
        },
        _sum: {
          amount: true,
        },
      });

      const totalDisbursed = totalDisbursedData._count.id || 0;
      const totalDisbursedAmount = totalDisbursedData._sum.amount || 0;

      // 3. PF AMOUNT -
      const pfAmountResult = await this.prisma.disbursement.aggregate({
        where: {
          loan: {
            brandId,
            isActive: true,
            disbursementDate: {
              not: null,
              ...(dateRange.dateFilter || {}),
            },
          },
        },
        _sum: {
          totalDeductions: true,
        },
      });

      const pfAmount = pfAmountResult._sum.totalDeductions || 0;

      // Get loans with collection-relevant statuses
      const collectionLoans = await this.prisma.loan.findMany({
        where: {
          brandId,
          isActive: true,
          status: {
            in: [
              "ACTIVE",
              "POST_ACTIVE",

              "PARTIALLY_PAID",
              "COMPLETED",
              "SETTLED",
              "WRITE_OFF",
            ],
          },
          loanDetails: {
            dueDate: dateRange.dateFilter,
          },
        },
        select: {
          id: true,
          status: true,
          user: {
            select: {
              id: true,
            },
          },
          paymentRequests: {
            select: {
              collectionTransactions: {
                where: {
                  status: "SUCCESS",
                  opsApprovalStatus: "APPROVED",
                },
                select: {
                  amount: true,
                },
              },
              partialCollectionTransactions: {
                where: {
                  status: "SUCCESS",
                  opsApprovalStatus: "APPROVED",
                },
                select: {
                  amount: true,
                },
              },
            },
          },
          repayment: {
            select: {
              totalObligation: true,
              totalFees: true,
            },
          },
        },
      });

      let totalCollectionDue = 0;

      // Calculate obligation
      const obligation = collectionLoans.reduce((sum, loan) => {
        const loanObligation = loan.repayment?.totalObligation || 0;
        return sum + loanObligation;
      }, 0);
      totalCollectionDue = obligation;

      // 5. COLLECTION DONE
      const collectionTransactions =
        await this.prisma.paymentCollectionTransaction.aggregate({
          where: {
            status: "SUCCESS",
            opsApprovalStatus: "APPROVED",
            paymentRequest: {
              loan: {
                brandId,
                isActive: true,
                createdAt: dateRange.dateFilter, // Filter by loan creation date
              },
            },
          },
          _sum: {
            amount: true,
          },
        });

      const partialCollectionTransactions =
        await this.prisma.paymentPartialCollectionTransaction.aggregate({
          where: {
            status: "SUCCESS",
            opsApprovalStatus: "APPROVED",
            paymentRequest: {
              loan: {
                brandId,
                isActive: true,
                createdAt: dateRange.dateFilter, // Filter by loan creation date
              },
            },
          },
          _sum: {
            amount: true,
          },
        });
      const totalCollectionDone =
        (Number(collectionTransactions._sum.amount) || 0) +
        (Number(partialCollectionTransactions._sum.amount) || 0);

      // Get additional stats for the dashboard
      const additionalStats = await this.getAdditionalStats(brandId, dateRange);

      return {
        summary: {
          totalUsers,
          totalLoans,
          totalSanctioned,
          totalSanctionedAmount,
          totalDisbursed,
          totalDisbursedAmount,
          pfAmount,
          collectionDue: totalCollectionDue,
          collectionDone: totalCollectionDone,
          ...additionalStats,
        },
        dateRange: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          period: query.period || "all",
        },
      };
    } catch (error) {
      this.logger.error(
        `Error fetching dashboard summary for brand ${brandId}:`,
        error,
      );
      throw error;
    }
  }
  private getDateRange(query: DashboardStatsDto) {
    const now = this.getIST();
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    switch (query.period) {
      case "today": {
        const todayIST = this.getDateRangeIST(now);
        return {
          startDate: now.format("YYYY-MM-DD"),
          endDate: now.format("YYYY-MM-DD"),
          dateFilter: todayIST,
        };
      }

      case "yesterday": {
        const yesterday = now.subtract(1, "day");
        const yesterdayIST = this.getDateRangeIST(yesterday);
        return {
          startDate: yesterday.format("YYYY-MM-DD"),
          endDate: yesterday.format("YYYY-MM-DD"),
          dateFilter: yesterdayIST,
        };
      }

      case "week": {
        const weekAgo = now.subtract(7, "days");
        const weekAgoIST = this.getDateRangeIST(weekAgo);
        const nowIST = this.getDateRangeIST(now);
        return {
          startDate: weekAgo.format("YYYY-MM-DD"),
          endDate: now.format("YYYY-MM-DD"),
          dateFilter: {
            gte: weekAgoIST.gte,
            lt: nowIST.lt,
          },
        };
      }

      case "month": {
        const monthAgo = now.subtract(1, "month");
        const monthAgoIST = this.getDateRangeIST(monthAgo);
        const nowIST2 = this.getDateRangeIST(now);
        return {
          startDate: monthAgo.format("YYYY-MM-DD"),
          endDate: now.format("YYYY-MM-DD"),
          dateFilter: {
            gte: monthAgoIST.gte,
            lt: nowIST2.lt,
          },
        };
      }

      case "year": {
        const yearAgo = now.subtract(1, "year");
        const yearAgoIST = this.getDateRangeIST(yearAgo);
        const nowIST3 = this.getDateRangeIST(now);
        return {
          startDate: yearAgo.format("YYYY-MM-DD"),
          endDate: now.format("YYYY-MM-DD"),
          dateFilter: {
            gte: yearAgoIST.gte,
            lt: nowIST3.lt,
          },
        };
      }

      case "tilldate": {
        // This Month - from start of month to now
        const monthStart = now.startOf("month");
        const monthStartIST = this.getDateRangeIST(monthStart);
        const nowIST4 = this.getDateRangeIST(now);
        return {
          startDate: monthStart.format("YYYY-MM-DD"),
          endDate: now.format("YYYY-MM-DD"),
          dateFilter: {
            gte: monthStartIST.gte,
            lt: nowIST4.lt,
          },
        };
      }

      case "custom": {
        if (query.startDate && query.endDate) {
          const startDateIST = this.getDateRangeIST(query.startDate);
          const endDateIST = this.getDateRangeIST(query.endDate);
          return {
            startDate: _dayjs(query.startDate).format("YYYY-MM-DD"),
            endDate: _dayjs(query.endDate).format("YYYY-MM-DD"),
            dateFilter: {
              gte: startDateIST.gte,
              lt: endDateIST.lt,
            },
          };
        }
        break;
      }

      case "all":
      default:
        return {
          startDate: undefined,
          endDate: undefined,
          dateFilter: undefined,
        };
    }

    // Fallback for incomplete custom range
    return {
      startDate: undefined,
      endDate: undefined,
      dateFilter: undefined,
    };
  }

  private async getAdditionalStats(brandId: string, dateRange: any) {
    try {
      // Get loan status breakdown with count and sum (include all loans for accurate status breakdown)
      const loanStatusStats = await this.prisma.loan.groupBy({
        by: ["status"],
        where: {
          brandId,
          isActive: true,
          user: {
            isActive: true,
            // createdAt: dateRange.dateFilter,
          },
          createdAt: dateRange.dateFilter,
          // Include all loans to show accurate status breakdown
        },
        _count: {
          status: true,
        },
        _sum: {
          amount: true,
        },
      });

      // Get loan type breakdown with count and sum
      const loanTypeStats = await this.prisma.loan.groupBy({
        by: ["loanType"],
        where: {
          brandId,
          isActive: true,
          user: {
            isActive: true,
          },
          createdAt: dateRange.dateFilter,
        },
        _count: {
          loanType: true,
        },
        _sum: {
          amount: true,
        },
      });

      // Get total loan amount (include all loans to match status breakdown totals)
      const loanAmountStats = await this.prisma.loan.aggregate({
        where: {
          brandId,
          isActive: true,
          user: {
            isActive: true,
            // createdAt: dateRange.dateFilter,
          },
          createdAt: dateRange.dateFilter,
          // Include all loans to match the status breakdown
        },
        _sum: {
          amount: true,
        },
        _avg: {
          amount: true,
        },
      });

      // Calculate totals for loan status breakdown
      const totalCount = loanStatusStats.reduce(
        (sum, stat) => sum + stat._count.status,
        0,
      );
      const totalAmount = loanStatusStats.reduce(
        (sum, stat) => sum + (stat._sum.amount || 0),
        0,
      );

      // Calculate totals for loan type breakdown
      const totalCountByType = loanTypeStats.reduce(
        (sum, stat) => sum + stat._count.loanType,
        0,
      );
      const totalAmountByType = loanTypeStats.reduce(
        (sum, stat) => sum + (stat._sum.amount || 0),
        0,
      );

      return {
        loanStatusBreakdown: loanStatusStats.reduce((acc, stat) => {
          acc[stat.status] = {
            count: stat._count.status,
            amount: stat._sum.amount || 0,
          };
          return acc;
        }, {}),
        loanStatusBreakdownTotals: {
          totalCount,
          totalAmount,
        },
        loanTypeBreakdown: loanTypeStats.reduce((acc, stat) => {
          acc[stat.loanType] = {
            count: stat._count.loanType,
            amount: stat._sum.amount || 0,
            percentage:
              totalCountByType > 0
                ? Number(
                    ((stat._count.loanType / totalCountByType) * 100).toFixed(
                      1,
                    ),
                  )
                : 0,
            amountPercentage:
              totalAmountByType > 0
                ? Number(
                    (
                      ((stat._sum.amount || 0) / totalAmountByType) *
                      100
                    ).toFixed(1),
                  )
                : 0,
          };
          return acc;
        }, {}),
        loanTypeBreakdownTotals: {
          totalCount: totalCountByType,
          totalAmount: totalAmountByType,
        },
        totalLoanAmount: loanAmountStats._sum.amount || 0,
        averageLoanAmount: loanAmountStats._avg.amount || 0,
      };
    } catch (error) {
      this.logger.warn("Error fetching additional stats:", error);
      return {
        loanStatusBreakdown: {},
        loanStatusBreakdownTotals: {
          totalCount: 0,
          totalAmount: 0,
        },
        loanTypeBreakdown: {},
        loanTypeBreakdownTotals: {
          totalCount: 0,
          totalAmount: 0,
        },
        totalLoanAmount: 0,
        averageLoanAmount: 0,
      };
    }
  }

  async getUsersBySubdomain(brandId: string, query: DashboardStatsDto) {
    try {
      const dateRange = this.getDateRange(query);
      const loanFilterType = query.loanFilterType || "both";

      // Get all loans with user subdomain information
      let loansWithSubdomain = await this.prisma.loan.findMany({
        where: {
          brandId,
          isActive: true,
          user: {
            isActive: true,
          },
          disbursementDate: dateRange.dateFilter,
        },
        select: {
          id: true,
          status: true,
          amount: true,
          loanType: true,
          createdAt: true,
          disbursementDate: true,
          is_repeat_loan: true,
          userId: true,
          user: {
            select: {
              id: true,
              brandSubDomainId: true,
              createdAt: true,
            },
          },
        },
      });

      // Filter loans based on loanFilterType
      if (loanFilterType !== "both") {
        loansWithSubdomain = loansWithSubdomain.filter((loan) => {
          // Use the is_repeat_loan flag from the database instead of comparing timestamps
          const isRepeatLoan = loan.is_repeat_loan === true;

          if (loanFilterType === "new") {
            return !isRepeatLoan; // New loans have is_repeat_loan = false
          } else if (loanFilterType === "repeat") {
            return isRepeatLoan; // Repeat loans have is_repeat_loan = true
          }
          return true;
        });
      }

      // Get all unique subdomain IDs from loans
      const allSubdomainIds = new Set(
        loansWithSubdomain.map((loan) => loan.user.brandSubDomainId),
      );

      // Get subdomain details for all unique subdomain IDs
      const subdomainIds = Array.from(allSubdomainIds).filter(Boolean);

      const subdomains = await this.prisma.brand_sub_domains.findMany({
        where: {
          id: {
            in: subdomainIds,
          },
          brandId,
        },
        select: {
          id: true,
          subdomain: true,
          marketingSource: true,
          isPrimary: true,
        },
      });

      // Group loans by subdomain ID
      const loansBySubdomainMap = new Map<
        string | null,
        {
          totalLoans: number;
          totalAmount: number;
          disbursedCount: number;
          disbursedAmount: number;
          statusBreakdown: Record<string, { count: number; amount: number }>;
          loanTypeBreakdown: Record<string, { count: number; amount: number }>;
        }
      >();

      // Process loans and group by subdomain
      loansWithSubdomain.forEach((loan) => {
        const subdomainId = loan.user.brandSubDomainId;

        // Ensure we have an entry for this subdomain
        if (!loansBySubdomainMap.has(subdomainId)) {
          loansBySubdomainMap.set(subdomainId, {
            totalLoans: 0,
            totalAmount: 0,
            disbursedCount: 0,
            disbursedAmount: 0,
            statusBreakdown: {},
            loanTypeBreakdown: {},
          });
        }

        const subdomainData = loansBySubdomainMap.get(subdomainId);
        if (subdomainData) {
          subdomainData.totalLoans += 1;
          subdomainData.totalAmount += loan.amount || 0;

          const disbursedStatuses = [
            "DISBURSED",
            "ACTIVE",
            "PARTIALLY_PAID",
            "PAID",
            "COMPLETED",
            "POST_ACTIVE",
            "WRITE_OFF",
            "SETTLED",
            "DEFAULTED",
            "OVERDUE",
          ];

          if (
            loan.disbursementDate &&
            disbursedStatuses.includes(loan.status)
          ) {
            subdomainData.disbursedCount += 1;
            subdomainData.disbursedAmount += loan.amount || 0;
          }

          // Update status breakdown
          if (!subdomainData.statusBreakdown[loan.status]) {
            subdomainData.statusBreakdown[loan.status] = {
              count: 0,
              amount: 0,
            };
          }
          subdomainData.statusBreakdown[loan.status].count += 1;
          subdomainData.statusBreakdown[loan.status].amount += loan.amount || 0;

          // Update loan type breakdown
          const loanType = loan.loanType || "Unknown";
          if (!subdomainData.loanTypeBreakdown[loanType]) {
            subdomainData.loanTypeBreakdown[loanType] = {
              count: 0,
              amount: 0,
            };
          }
          subdomainData.loanTypeBreakdown[loanType].count += 1;
          subdomainData.loanTypeBreakdown[loanType].amount += loan.amount || 0;
        }
      });

      // Build result from loan data only
      const result = Array.from(loansBySubdomainMap.entries()).map(
        ([subdomainId, loanInfo]) => {
          const subdomainInfo = subdomainId
            ? subdomains.find((s) => s.id === subdomainId)
            : null;

          return {
            subdomain:
              subdomainId === null
                ? "No Domain"
                : subdomainInfo?.subdomain || "Unknown",
            marketingSource:
              subdomainId === null
                ? "Direct/No Domain"
                : subdomainInfo?.marketingSource || null,
            isPrimary: subdomainInfo?.isPrimary || false,
            subdomainId: subdomainId,
            totalLoans: loanInfo.totalLoans,
            totalLoanAmount: loanInfo.totalAmount,
            averageLoanAmount:
              loanInfo.totalLoans > 0
                ? loanInfo.totalAmount / loanInfo.totalLoans
                : 0,
            disbursedCount: loanInfo.disbursedCount,
            disbursedAmount: loanInfo.disbursedAmount,
            loanStatusBreakdown: loanInfo.statusBreakdown,
            loanTypeBreakdown: loanInfo.loanTypeBreakdown,
          };
        },
      );

      // Sort by disbursed count (descending)
      result.sort((a, b) => b.disbursedCount - a.disbursedCount);

      // Calculate totals from the processed data
      const totalLoans = result.reduce((sum, item) => sum + item.totalLoans, 0);
      const totalLoanAmount = result.reduce(
        (sum, item) => sum + item.totalLoanAmount,
        0,
      );
      const totalDisbursedCount = result.reduce(
        (sum, item) => sum + item.disbursedCount,
        0,
      );
      const totalDisbursedAmount = result.reduce(
        (sum, item) => sum + item.disbursedAmount,
        0,
      );

      return {
        loansBySubdomain: result,
        totalSubdomains: result.length,
        totalLoans,
        totalLoanAmount,
        averageLoanAmount: totalLoans > 0 ? totalLoanAmount / totalLoans : 0,
        totalDisbursedCount,
        totalDisbursedAmount,
        loanFilterType,
        dateRange: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          period: query.period || "all",
        },
      };
    } catch (error) {
      this.logger.error(
        `Error fetching loans by subdomain for brand ${brandId}:`,
        error,
      );
      throw error;
    }
  }

  async getUsersByLocation(brandId: string, query: DashboardStatsDto) {
    try {
      const dateRange = this.getDateRange(query);

      // Get users grouped by city and state
      const usersByLocation = await this.prisma.user.findMany({
        where: {
          brandId,
          isActive: true,
          createdAt: dateRange.dateFilter,
          userDetails: {
            isNot: null,
          },
        },
        select: {
          id: true,
          userDetails: {
            select: {
              city: true,
              state: true,
            },
          },
        },
      });

      // Group by state and city
      const locationMap = new Map<
        string,
        { state: string; cities: Map<string, number>; totalUsers: number }
      >();

      usersByLocation.forEach((user) => {
        const city = user.userDetails?.city || "Unknown City";
        const state = user.userDetails?.state || "Unknown State";

        if (!locationMap.has(state)) {
          locationMap.set(state, {
            state,
            cities: new Map<string, number>(),
            totalUsers: 0,
          });
        }

        const stateData = locationMap.get(state);
        if (stateData) {
          stateData.totalUsers += 1;
          stateData.cities.set(city, (stateData.cities.get(city) || 0) + 1);
        }
      });

      // Convert to array format
      const result = Array.from(locationMap.entries())
        .map(([state, data]) => ({
          state,
          totalUsers: data.totalUsers,
          cities: Array.from(data.cities.entries())
            .map(([city, count]) => ({
              city,
              userCount: count,
            }))
            .sort((a, b) => b.userCount - a.userCount),
        }))
        .sort((a, b) => b.totalUsers - a.totalUsers);

      return {
        usersByLocation: result,
        totalStates: result.length,
        totalUsers: usersByLocation.length,
        dateRange: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          period: query.period || "all",
        },
      };
    } catch (error) {
      this.logger.error(
        `Error fetching users by location for brand ${brandId}:`,
        error,
      );
      throw error;
    }
  }

  async getUsersByCompany(brandId: string, query: DashboardStatsDto) {
    try {
      const dateRange = this.getDateRange(query);

      // Get employment details for all users
      const employmentData = await this.prisma.employment.findMany({
        where: {
          user: {
            brandId,
            isActive: true,
            createdAt: dateRange.dateFilter,
          },
          companyName: {
            not: null,
          },
        },
        select: {
          companyName: true,
          designation: true,
          salary: true,
          employmenttype: true,
        },
      });

      // Group by company name
      const companyMap = new Map<
        string,
        {
          companyName: string;
          userCount: number;
          designations: Set<string>;
          avgSalary: number;
          totalSalary: number;
          salaryCount: number;
          employmentTypes: Set<string>;
        }
      >();

      employmentData.forEach((emp) => {
        const companyName = emp.companyName || "Unknown Company";

        if (!companyMap.has(companyName)) {
          companyMap.set(companyName, {
            companyName,
            userCount: 0,
            designations: new Set(),
            avgSalary: 0,
            totalSalary: 0,
            salaryCount: 0,
            employmentTypes: new Set(),
          });
        }

        const companyData = companyMap.get(companyName);
        if (companyData) {
          companyData.userCount += 1;

          if (emp.designation) {
            companyData.designations.add(emp.designation);
          }

          if (emp.salary) {
            companyData.totalSalary += emp.salary;
            companyData.salaryCount += 1;
          }

          if (emp.employmenttype) {
            companyData.employmentTypes.add(emp.employmenttype);
          }
        }
      });

      // Convert to array and calculate averages
      const result = Array.from(companyMap.values())
        .map((company) => ({
          companyName: company.companyName,
          userCount: company.userCount,
          uniqueDesignations: Array.from(company.designations),
          averageSalary:
            company.salaryCount > 0
              ? company.totalSalary / company.salaryCount
              : 0,
          employmentTypes: Array.from(company.employmentTypes),
        }))
        .sort((a, b) => b.userCount - a.userCount);

      return {
        usersByCompany: result,
        totalCompanies: result.length,
        totalUsers: result.reduce((sum, company) => sum + company.userCount, 0),
        dateRange: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          period: query.period || "all",
        },
      };
    } catch (error) {
      this.logger.error(
        `Error fetching users by company for brand ${brandId}:`,
        error,
      );
      throw error;
    }
  }

  async getLoanAllocationDetails(brandId: string, query: DashboardStatsDto) {
    try {
      const dateRange = this.getDateRange(query);

      // Get all loans with allocation details
      const loans = await this.prisma.loan.findMany({
        where: {
          brandId,
          isActive: true,
          user: {
            isActive: true,
          },
          createdAt: dateRange.dateFilter,
        },
        select: {
          id: true,
          status: true,
          amount: true,
          loanType: true,
          createdAt: true,
          formattedLoanId: true,
          allottedPartners: {
            select: {
              id: true,
              partnerUserId: true,
              allottedAt: true,
              amount: true,
              partnerUser: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  isActive: true,
                  reportsToId: true,
                  reportsTo: {
                    select: {
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Get all partner users for building hierarchy relationships
      const allPartnerUsers = await this.prisma.partnerUser.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          reportsToId: true,
        },
      });

      // Create hierarchy mapping
      const subordinatesMap = new Map<string, string[]>(); // managerId -> [executiveIds]

      allPartnerUsers.forEach((user) => {
        if (user.reportsToId) {
          if (!subordinatesMap.has(user.reportsToId)) {
            subordinatesMap.set(user.reportsToId, []);
          }
          subordinatesMap.get(user.reportsToId)?.push(user.id);
        }
      });

      // Separate unallocated and allocated loans
      const unallocatedLoans = loans.filter(
        (loan) => loan.allottedPartners.length === 0,
      );
      const allocatedLoans = loans.filter(
        (loan) => loan.allottedPartners.length > 0,
      );

      // Track which loans have been allocated (globally, to avoid double counting)
      const countedLoanIds = new Set<string>();

      // Track allocation statistics by partner user
      const allocationStats = new Map<
        string,
        {
          partnerUser: any;
          role: PartnerRole;
          totalLoans: number;
          totalAmount: number;
          statusBreakdown: Record<string, { count: number; amount: number }>;
          loanTypeBreakdown: Record<string, { count: number; amount: number }>;
          managerName?: string;
          subordinateCount: number;
          loanIds: Set<string>; // Track which loans this user has
        }
      >();

      // Process allocated loans - each user gets their allocated loans with amounts
      allocatedLoans.forEach((loan) => {
        loan.allottedPartners.forEach((allocation) => {
          const partnerUser = allocation.partnerUser;
          if (!partnerUser?.isActive) return;

          // Determine role based on hierarchy
          let role: PartnerRole;
          if (partnerUser.reportsToId) {
            role = "executive";
          } else if (subordinatesMap.has(partnerUser.id)) {
            role = "manager";
          } else {
            role = "head";
          }

          // Initialize stats if not exists
          if (!allocationStats.has(partnerUser.id)) {
            allocationStats.set(partnerUser.id, {
              partnerUser,
              role,
              totalLoans: 0,
              totalAmount: 0,
              statusBreakdown: {},
              loanTypeBreakdown: {},
              managerName: partnerUser.reportsTo?.name || null,
              subordinateCount:
                subordinatesMap.get(partnerUser.id)?.length || 0,
              loanIds: new Set<string>(),
            });
          }

          const stats = allocationStats.get(partnerUser.id);
          if (!stats) return;

          // Always use loan.amount, ignore allocation.amount
          const allocationAmount = loan.amount;

          // Count loan for this user if not already counted for them
          if (!stats.loanIds.has(loan.id)) {
            stats.loanIds.add(loan.id);
            stats.totalLoans += 1;
            stats.totalAmount += allocationAmount;

            // Update status breakdown
            const status = loan.status;
            if (!stats.statusBreakdown[status]) {
              stats.statusBreakdown[status] = { count: 0, amount: 0 };
            }
            stats.statusBreakdown[status].count += 1;
            stats.statusBreakdown[status].amount += allocationAmount;

            // Update loan type breakdown
            const loanType = loan.loanType || "Unknown";
            if (!stats.loanTypeBreakdown[loanType]) {
              stats.loanTypeBreakdown[loanType] = { count: 0, amount: 0 };
            }
            stats.loanTypeBreakdown[loanType].count += 1;
            stats.loanTypeBreakdown[loanType].amount += allocationAmount;
          }
        });

        // Count this loan once globally for hierarchy verification
        countedLoanIds.add(loan.id);
      });

      // Convert to arrays and calculate summaries
      const allocationDetails = Array.from(allocationStats.values()).sort(
        (a, b) => b.totalLoans - a.totalLoans,
      );

      const executives = allocationDetails.filter(
        (detail) => detail.role === "executive",
      );
      const managers = allocationDetails.filter(
        (detail) => detail.role === "manager",
      );
      const heads = allocationDetails.filter(
        (detail) => detail.role === "head",
      );

      // Calculate totals
      const totalLoans = loans.length;
      const totalAmount = loans.reduce((sum, loan) => sum + loan.amount, 0);
      const unallocatedAmount = unallocatedLoans.reduce(
        (sum, loan) => sum + loan.amount,
        0,
      );
      const allocatedAmount = allocatedLoans.reduce(
        (sum, loan) => sum + loan.amount,
        0,
      );

      // Calculate sums from hierarchy for verification
      const executiveTotalLoans = executives.reduce(
        (sum, exec) => sum + exec.totalLoans,
        0,
      );
      const executiveTotalAmount = executives.reduce(
        (sum, exec) => sum + exec.totalAmount,
        0,
      );
      const managerTotalLoans = managers.reduce(
        (sum, mgr) => sum + mgr.totalLoans,
        0,
      );
      const managerTotalAmount = managers.reduce(
        (sum, mgr) => sum + mgr.totalAmount,
        0,
      );
      const headTotalLoans = heads.reduce(
        (sum, head) => sum + head.totalLoans,
        0,
      );
      const headTotalAmount = heads.reduce(
        (sum, head) => sum + head.totalAmount,
        0,
      );

      // Hierarchy totals should match allocated loans (each loan counted once globally)
      const hierarchyTotalLoans = countedLoanIds.size;
      const hierarchyTotalAmount =
        executiveTotalAmount + managerTotalAmount + headTotalAmount;

      // Clean up allocationDetails to remove internal tracking data before returning
      const cleanedAllocationDetails = allocationDetails.map((detail) => ({
        partnerUser: detail.partnerUser,
        role: detail.role,
        totalLoans: detail.totalLoans,
        totalAmount: detail.totalAmount,
        statusBreakdown: detail.statusBreakdown,
        loanTypeBreakdown: detail.loanTypeBreakdown,
        managerName: detail.managerName,
        subordinateCount: detail.subordinateCount,
      }));

      return {
        summary: {
          totalLoans,
          totalAmount,
          unallocatedCount: unallocatedLoans.length,
          allocatedCount: allocatedLoans.length,
          unallocatedAmount,
          allocatedAmount,
          allocationPercentage:
            totalLoans > 0
              ? Number(((allocatedLoans.length / totalLoans) * 100).toFixed(1))
              : 0,
        },
        hierarchy: {
          executives: {
            count: executives.length,
            totalLoans: executiveTotalLoans,
            totalAmount: executiveTotalAmount,
          },
          managers: {
            count: managers.length,
            totalLoans: managerTotalLoans,
            totalAmount: managerTotalAmount,
          },
          heads: {
            count: heads.length,
            totalLoans: headTotalLoans,
            totalAmount: headTotalAmount,
          },
        },
        allocationDetails: cleanedAllocationDetails,
        unallocatedLoans: unallocatedLoans.map((loan) => ({
          id: loan.id,
          formattedLoanId: loan.formattedLoanId,
          amount: loan.amount,
          status: loan.status,
          loanType: loan.loanType,
          createdAt: loan.createdAt,
        })),
        dateRange: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          period: query.period || "all",
        },
      };
    } catch (error) {
      this.logger.error(
        `Error fetching loan allocation details for brand ${brandId}:`,
        error,
      );
      throw error;
    }
  }

  async getLoansByType(brandId: string, query: DashboardStatsDto) {
    try {
      const dateRange = this.getDateRange(query);

      // Get detailed loan type breakdown with status information
      const loansByType = await this.prisma.loan.findMany({
        where: {
          brandId,
          isActive: true,
          user: {
            isActive: true,
          },
          createdAt: dateRange.dateFilter,
        },
        select: {
          id: true,
          loanType: true,
          status: true,
          amount: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              brandSubDomainId: true,
            },
          },
        },
      });

      // Group loans by type and calculate statistics
      const loanTypeMap = new Map<
        string,
        {
          loanType: string;
          totalLoans: number;
          totalAmount: number;
          statusBreakdown: Record<string, { count: number; amount: number }>;
          subdomainBreakdown: Record<string, { count: number; amount: number }>;
        }
      >();

      loansByType.forEach((loan) => {
        const loanType = loan.loanType || "Unknown";

        if (!loanTypeMap.has(loanType)) {
          loanTypeMap.set(loanType, {
            loanType,
            totalLoans: 0,
            totalAmount: 0,
            statusBreakdown: {},
            subdomainBreakdown: {},
          });
        }

        const typeData = loanTypeMap.get(loanType);
        if (typeData) {
          typeData.totalLoans += 1;
          typeData.totalAmount += loan.amount || 0;

          // Status breakdown
          if (!typeData.statusBreakdown[loan.status]) {
            typeData.statusBreakdown[loan.status] = { count: 0, amount: 0 };
          }
          typeData.statusBreakdown[loan.status].count += 1;
          typeData.statusBreakdown[loan.status].amount += loan.amount || 0;

          // Subdomain breakdown
          const subdomainKey = loan.user.brandSubDomainId || "No Domain";
          if (!typeData.subdomainBreakdown[subdomainKey]) {
            typeData.subdomainBreakdown[subdomainKey] = { count: 0, amount: 0 };
          }
          typeData.subdomainBreakdown[subdomainKey].count += 1;
          typeData.subdomainBreakdown[subdomainKey].amount += loan.amount || 0;
        }
      });

      // Convert to array and sort by total loans
      const result = Array.from(loanTypeMap.values())
        .map((typeData) => ({
          ...typeData,
          averageLoanAmount:
            typeData.totalLoans > 0
              ? typeData.totalAmount / typeData.totalLoans
              : 0,
        }))
        .sort((a, b) => b.totalLoans - a.totalLoans);

      // Calculate totals
      const totalLoans = result.reduce((sum, item) => sum + item.totalLoans, 0);
      const totalAmount = result.reduce(
        (sum, item) => sum + item.totalAmount,
        0,
      );

      return {
        loansByType: result,
        totalLoanTypes: result.length,
        totalLoans,
        totalAmount,
        averageLoanAmount: totalLoans > 0 ? totalAmount / totalLoans : 0,
        dateRange: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          period: query.period || "all",
        },
      };
    } catch (error) {
      this.logger.error(
        `Error fetching loans by type for brand ${brandId}:`,
        error,
      );
      throw error;
    }
  }

  async getCollectionAnalysis(brandId: string, query: DashboardStatsDto) {
    try {
      const dateRange = this.getDateRange(query);

      // Fetch all loans for DPD analysis without status filter to avoid bind variable overflow
      // Filter status in code instead
      const dpdLoans: Array<{ id: string; status: string; amount: number }> =
        [];
      let skip = 0;
      let hasMore = true;
      const loanBatchSize = 35000;
      const allowedStatuses = new Set(["ACTIVE", "PARTIALLY_PAID"]);

      while (hasMore) {
        const loansForBatch = await this.prisma.loan.findMany({
          where: {
            brandId,
            isActive: true,
          },
          select: {
            id: true,
            amount: true,
            status: true,
          },
          skip,
          take: loanBatchSize,
        });

        if (loansForBatch.length === 0) {
          hasMore = false;
        } else {
          // Filter status in code to avoid bind variable explosion
          const filteredLoans = loansForBatch.filter((loan) =>
            allowedStatuses.has(loan.status as string),
          );
          dpdLoans.push(...filteredLoans);
          skip += loanBatchSize;
        }
      }
      const dpdLoanIds = dpdLoans.map((loan) => loan.id);
      const dpdLoansWithDetails: Record<string, any> = {};

      if (dpdLoanIds.length > 0) {
        const filterBatchSize = 250;
        for (let i = 0; i < dpdLoanIds.length; i += filterBatchSize) {
          const batch = dpdLoanIds.slice(i, i + filterBatchSize);
          const loansWithDetails = await this.prisma.loanDetails.findMany({
            where: {
              loanId: { in: batch },
            },
            select: {
              loanId: true,
            },
          });
          loansWithDetails.forEach((detail) => {
            dpdLoansWithDetails[detail.loanId] = true;
          });
        }
      }

      // Filter DPD loans based on loanDetails existence
      const dpdLoansFiltered = dpdLoans.filter(
        (loan) => dpdLoansWithDetails[loan.id],
      );

      // Fetch DPD loan details separately in batches
      const dpdLoanIdsFiltered = dpdLoansFiltered.map((loan) => loan.id);
      const dpdLoanDetailsMap: Record<string, any> = {};

      if (dpdLoanIdsFiltered.length > 0) {
        const detailBatchSize = 250;
        for (let i = 0; i < dpdLoanIdsFiltered.length; i += detailBatchSize) {
          const batch = dpdLoanIdsFiltered.slice(i, i + detailBatchSize);

          // Fetch loan details
          const loanDetails = await this.prisma.loanDetails.findMany({
            where: {
              loanId: { in: batch },
            },
            select: {
              loanId: true,
              dueDate: true,
            },
          });

          loanDetails.forEach((detail) => {
            dpdLoanDetailsMap[detail.loanId] = detail;
          });

          // Fetch repayment details
          const repaymentDetails = await this.prisma.repayment.findMany({
            where: {
              loanId: { in: batch },
            },
            select: {
              loanId: true,
              totalObligation: true,
            },
          });

          repaymentDetails.forEach((repay) => {
            if (dpdLoanDetailsMap[repay.loanId]) {
              dpdLoanDetailsMap[repay.loanId].repayment = repay;
            }
          });
        }
      }

      // Fetch payment data separately in batches to avoid bind variable explosion
      const dpdPaymentData: Record<string, number> = {};

      if (dpdLoanIdsFiltered.length > 0) {
        const batchSize = 200; // Reduced from 250 - nested relations use more bind variables
        for (let i = 0; i < dpdLoanIdsFiltered.length; i += batchSize) {
          const batch = dpdLoanIdsFiltered.slice(i, i + batchSize);
          const payments =
            await this.prisma.paymentCollectionTransaction.findMany({
              where: {
                paymentRequest: {
                  loan: {
                    id: { in: batch },
                  },
                },
                status: "SUCCESS",
                opsApprovalStatus: "APPROVED",
              },
              select: {
                amount: true,
                paymentRequest: {
                  select: {
                    loanId: true,
                  },
                },
              },
            });

          const partialPayments =
            await this.prisma.paymentPartialCollectionTransaction.findMany({
              where: {
                paymentRequest: {
                  loan: {
                    id: { in: batch },
                  },
                },
                status: "SUCCESS",
                opsApprovalStatus: "APPROVED",
              },
              select: {
                amount: true,
                paymentRequest: {
                  select: {
                    loanId: true,
                  },
                },
              },
            });

          // Aggregate payment data
          [...payments, ...partialPayments].forEach((payment) => {
            const loanId = payment.paymentRequest.loanId;
            dpdPaymentData[loanId] =
              (dpdPaymentData[loanId] || 0) + Number(payment.amount || 0);
          });
        }
      }

      // Step 1: Get all loans without status filter to avoid bind variable overflow
      // Filter status in code instead
      const collectionLoans: Array<{
        id: string;
        formattedLoanId: string;
        amount: number;
        status: string;
        loanType: string;
        userId: string;
        disbursementDate: Date | null;
        closureDate: Date | null;
      }> = [];
      let skipCollection = 0;
      let hasMoreCollection = true;
      const collectionBatchSize = 5000;
      const collectionAllowedStatuses = new Set([
        "DISBURSED",
        "ACTIVE",
        "PARTIALLY_PAID",
        "PAID",
        "COMPLETED",
        "POST_ACTIVE",
        "WRITE_OFF",
        "SETTLED",
        "DEFAULTED",
        "OVERDUE",
      ]);

      while (hasMoreCollection) {
        const loansForBatch = await this.prisma.loan.findMany({
          where: {
            brandId,
            isActive: true,
          },
          select: {
            id: true,
            formattedLoanId: true,
            amount: true,
            status: true,
            loanType: true,
            userId: true,
            disbursementDate: true,
            closureDate: true,
          },
          skip: skipCollection,
          take: collectionBatchSize,
        });

        if (loansForBatch.length === 0) {
          hasMoreCollection = false;
        } else {
          // Filter status in code to avoid bind variable explosion
          const filteredLoans = loansForBatch.filter((loan) =>
            collectionAllowedStatuses.has(loan.status as string),
          );
          collectionLoans.push(...filteredLoans);
          skipCollection += collectionBatchSize;
        }
      }

      // Step 2: Filter by due date separately to avoid nested relation bind variable issues
      const allCollectionLoanIds = collectionLoans.map((loan) => loan.id);
      const loanDetailsMapFiltered: Record<string, any> = {};

      if (allCollectionLoanIds.length > 0) {
        const detailBatchSize = 250;
        for (let i = 0; i < allCollectionLoanIds.length; i += detailBatchSize) {
          const batch = allCollectionLoanIds.slice(i, i + detailBatchSize);
          const loanDetailsForFilter = await this.prisma.loanDetails.findMany({
            where: {
              loanId: { in: batch },
              dueDate: dateRange.dateFilter,
            },
            select: {
              loanId: true,
            },
          });
          loanDetailsForFilter.forEach((detail) => {
            loanDetailsMapFiltered[detail.loanId] = true;
          });
        }
      }

      // Filter collection loans based on due date
      const collectionLoansFiltered = collectionLoans.filter(
        (loan) => loanDetailsMapFiltered[loan.id],
      );

      // Fetch loan details separately in smaller batches
      const collectionLoanIds = collectionLoansFiltered.map((loan) => loan.id);
      const loanDetailsMap: Record<string, any> = {};
      const userDetailsMap: Record<string, any> = {};

      if (collectionLoanIds.length > 0) {
        const detailBatchSize = 250; // Reduced from 500
        for (let i = 0; i < collectionLoanIds.length; i += detailBatchSize) {
          const batch = collectionLoanIds.slice(i, i + detailBatchSize);

          // Fetch loan details
          const loanDetails = await this.prisma.loanDetails.findMany({
            where: {
              loanId: { in: batch },
            },
            select: {
              loanId: true,
              dueDate: true,
              durationDays: true,
              type: true,
            },
          });

          loanDetails.forEach((detail) => {
            loanDetailsMap[detail.loanId] = detail;
          });

          // Fetch repayment details
          const repaymentDetails = await this.prisma.repayment.findMany({
            where: {
              loanId: { in: batch },
            },
            select: {
              loanId: true,
              totalObligation: true,
              totalFees: true,
            },
          });

          repaymentDetails.forEach((repay) => {
            if (loanDetailsMap[repay.loanId]) {
              loanDetailsMap[repay.loanId].repayment = repay;
            }
          });
        }

        // Fetch user details separately
        const userIds = collectionLoansFiltered
          .map((loan) => loan.userId)
          .filter(Boolean);
        if (userIds.length > 0) {
          const userBatchSize = 250; // Reduced from 500
          for (let i = 0; i < userIds.length; i += userBatchSize) {
            const batch = userIds.slice(i, i + userBatchSize);

            const users = await this.prisma.user.findMany({
              where: {
                id: { in: batch },
              },
              select: {
                id: true,
                formattedUserId: true,
                phoneNumber: true,
                userDetails: {
                  select: {
                    firstName: true,
                    lastName: true,
                    city: true,
                    state: true,
                  },
                },
              },
            });

            users.forEach((user) => {
              userDetailsMap[user.id] = user;
            });
          }
        }
      }

      // Fetch partner allocations separately in batches
      const allottedPartnersByLoanId: Record<string, any[]> = {};
      const collectionPartnersByLoanId: Record<string, any[]> = {};

      if (collectionLoanIds.length > 0) {
        const partnerBatchSize = 200; // Reduced from 500 - nested relations use more bind variables
        for (let i = 0; i < collectionLoanIds.length; i += partnerBatchSize) {
          const batch = collectionLoanIds.slice(i, i + partnerBatchSize);

          // Fetch allotted partners
          const allottedPartners =
            await this.prisma.loanAllottedPartnerUser.findMany({
              where: {
                loanId: { in: batch },
              },
              select: {
                loanId: true,
                partnerUserId: true,
                partnerUser: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    reportsToId: true,
                    reportsTo: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            });

          allottedPartners.forEach((allocation) => {
            if (!allottedPartnersByLoanId[allocation.loanId]) {
              allottedPartnersByLoanId[allocation.loanId] = [];
            }
            allottedPartnersByLoanId[allocation.loanId].push(allocation);
          });

          // Fetch collection partners
          const collectionPartners =
            await this.prisma.loan_collection_allocated_partner.findMany({
              where: {
                loanId: { in: batch },
                isActive: true,
                isDeallocated: false,
              },
              select: {
                loanId: true,
                partnerUserId: true,
                partnerUser: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    reportsToId: true,
                    brandRoles: {
                      select: {
                        role: true,
                      },
                    },
                    userPermissions: {
                      select: {
                        partnerPermission: {
                          select: {
                            name: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            });

          collectionPartners.forEach((allocation) => {
            if (!collectionPartnersByLoanId[allocation.loanId]) {
              collectionPartnersByLoanId[allocation.loanId] = [];
            }
            collectionPartnersByLoanId[allocation.loanId].push(allocation);
          });
        }
      }

      // Fetch payment data separately in batches for collection loans
      const collectionLoanPaymentData: Record<
        string,
        {
          totalCollected: number;
          totalDisbursed: number;
          totalPrincipalPaid: number;
          totalFeesPaid: number;
          totalPenaltiesPaid: number;
          totalTaxesPaid: number;
          totalDiscounts: number;
          paymentTransactions: any[];
          disbursementTransactions: any[];
        }
      > = {};

      if (collectionLoanIds.length > 0) {
        const batchSize = 200; // Reduced from 500 - nested relations use more bind variables
        for (let i = 0; i < collectionLoanIds.length; i += batchSize) {
          const batch = collectionLoanIds.slice(i, i + batchSize);

          // Fetch collection transactions
          const collectionTransactions =
            await this.prisma.paymentCollectionTransaction.findMany({
              where: {
                paymentRequest: {
                  loan: {
                    id: { in: batch },
                  },
                },
                status: "SUCCESS",
                opsApprovalStatus: "APPROVED",
              },
              select: {
                id: true,
                amount: true,
                completedAt: true,
                method: true,
                principalAmount: true,
                totalFees: true,
                totalPenalties: true,
                totalTaxes: true,
                penaltyDiscount: true,
                roundOffDiscount: true,
                closingType: true,
                isPaymentComplete: true,
                paymentRequest: {
                  select: {
                    loanId: true,
                  },
                },
              },
            });

          // Fetch partial collection transactions
          const partialCollectionTransactions =
            await this.prisma.paymentPartialCollectionTransaction.findMany({
              where: {
                paymentRequest: {
                  loan: {
                    id: { in: batch },
                  },
                },
                status: "SUCCESS",
                opsApprovalStatus: "APPROVED",
              },
              select: {
                id: true,
                amount: true,
                completedAt: true,
                method: true,
                principalAmount: true,
                totalFees: true,
                totalPenalties: true,
                totalTaxes: true,
                penaltyDiscount: true,
                roundOffDiscount: true,
                closingType: true,
                isPaymentComplete: true,
                paymentRequest: {
                  select: {
                    loanId: true,
                  },
                },
              },
            });

          // Fetch disbursal transactions
          const disbursalTransactions =
            await this.prisma.paymentDisbursalTransaction.findMany({
              where: {
                paymentRequest: {
                  loan: {
                    id: { in: batch },
                  },
                },
                status: "SUCCESS",
              },
              select: {
                id: true,
                amount: true,
                completedAt: true,
                method: true,
                accountHolderName: true,
                bankName: true,
                paymentRequest: {
                  select: {
                    loanId: true,
                  },
                },
              },
            });

          // Aggregate payment data by loan
          collectionTransactions.forEach((txn) => {
            const loanId = txn.paymentRequest.loanId;
            if (!collectionLoanPaymentData[loanId]) {
              collectionLoanPaymentData[loanId] = {
                totalCollected: 0,
                totalDisbursed: 0,
                totalPrincipalPaid: 0,
                totalFeesPaid: 0,
                totalPenaltiesPaid: 0,
                totalTaxesPaid: 0,
                totalDiscounts: 0,
                paymentTransactions: [],
                disbursementTransactions: [],
              };
            }
            const txnAmount = Number(txn.amount) || 0;
            collectionLoanPaymentData[loanId].totalCollected += txnAmount;
            collectionLoanPaymentData[loanId].totalPrincipalPaid +=
              txn.principalAmount || 0;
            collectionLoanPaymentData[loanId].totalFeesPaid +=
              txn.totalFees || 0;
            collectionLoanPaymentData[loanId].totalPenaltiesPaid +=
              txn.totalPenalties || 0;
            collectionLoanPaymentData[loanId].totalTaxesPaid +=
              txn.totalTaxes || 0;
            collectionLoanPaymentData[loanId].totalDiscounts +=
              (txn.penaltyDiscount || 0) + (txn.roundOffDiscount || 0);
            collectionLoanPaymentData[loanId].paymentTransactions.push({
              id: txn.id,
              type: "COLLECTION",
              amount: txnAmount,
              principalAmount: txn.principalAmount,
              totalFees: txn.totalFees,
              totalPenalties: txn.totalPenalties,
              totalTaxes: txn.totalTaxes,
              penaltyDiscount: txn.penaltyDiscount,
              roundOffDiscount: txn.roundOffDiscount,
              completedAt: txn.completedAt,
              method: txn.method,
              isPaymentComplete: txn.isPaymentComplete,
              closingType: txn.closingType,
            });
          });

          partialCollectionTransactions.forEach((txn) => {
            const loanId = txn.paymentRequest.loanId;
            if (!collectionLoanPaymentData[loanId]) {
              collectionLoanPaymentData[loanId] = {
                totalCollected: 0,
                totalDisbursed: 0,
                totalPrincipalPaid: 0,
                totalFeesPaid: 0,
                totalPenaltiesPaid: 0,
                totalTaxesPaid: 0,
                totalDiscounts: 0,
                paymentTransactions: [],
                disbursementTransactions: [],
              };
            }
            const txnAmount = Number(txn.amount) || 0;
            collectionLoanPaymentData[loanId].totalCollected += txnAmount;
            collectionLoanPaymentData[loanId].totalPrincipalPaid +=
              txn.principalAmount || 0;
            collectionLoanPaymentData[loanId].totalFeesPaid +=
              txn.totalFees || 0;
            collectionLoanPaymentData[loanId].totalPenaltiesPaid +=
              txn.totalPenalties || 0;
            collectionLoanPaymentData[loanId].totalTaxesPaid +=
              txn.totalTaxes || 0;
            collectionLoanPaymentData[loanId].totalDiscounts +=
              (txn.penaltyDiscount || 0) + (txn.roundOffDiscount || 0);
            collectionLoanPaymentData[loanId].paymentTransactions.push({
              id: txn.id,
              type: "PARTIAL_COLLECTION",
              amount: txnAmount,
              principalAmount: txn.principalAmount,
              totalFees: txn.totalFees,
              totalPenalties: txn.totalPenalties,
              totalTaxes: txn.totalTaxes,
              penaltyDiscount: txn.penaltyDiscount,
              roundOffDiscount: txn.roundOffDiscount,
              completedAt: txn.completedAt,
              method: txn.method,
              isPaymentComplete: txn.isPaymentComplete,
              closingType: txn.closingType,
            });
          });

          disbursalTransactions.forEach((txn) => {
            const loanId = txn.paymentRequest.loanId;
            if (!collectionLoanPaymentData[loanId]) {
              collectionLoanPaymentData[loanId] = {
                totalCollected: 0,
                totalDisbursed: 0,
                totalPrincipalPaid: 0,
                totalFeesPaid: 0,
                totalPenaltiesPaid: 0,
                totalTaxesPaid: 0,
                totalDiscounts: 0,
                paymentTransactions: [],
                disbursementTransactions: [],
              };
            }
            const txnAmount = Number(txn.amount) || 0;
            collectionLoanPaymentData[loanId].totalDisbursed += txnAmount;
            collectionLoanPaymentData[loanId].disbursementTransactions.push({
              id: txn.id,
              amount: txnAmount,
              status: "SUCCESS",
              completedAt: txn.completedAt,
              method: txn.method,
              accountHolderName: txn.accountHolderName,
              bankName: txn.bankName,
            });
          });
        }
      }

      // Group by status
      const statusBreakdown = new Map<
        string,
        {
          count: number;
          totalAmount: number;
          totalPrincipal: number;
          totalObligation: number;
          loans: any[];
        }
      >();

      // Group by loan type
      const loanTypeBreakdown = new Map<
        string,
        {
          count: number;
          totalAmount: number;
          totalPrincipal: number;
          totalObligation: number;
          loans: any[];
        }
      >();

      // Group by due date (month)
      const dueDateBreakdown = new Map<
        string,
        {
          count: number;
          totalAmount: number;
          totalCollected: number;
          totalObligation: number;
          loans: any[];
        }
      >();

      // Group by location (state)
      const locationBreakdown = new Map<
        string,
        {
          count: number;
          totalAmount: number;
          totalCollected: number;
          totalObligation: number;
          loans: any[];
        }
      >();

      // Group by partner user
      const partnerUserBreakdown = new Map<
        string,
        {
          partnerUserName: string;
          role: string;
          managerName: string;
          count: number;
          totalAmount: number;
          totalCollected: number;
          totalObligation: number;
          loans: any[];
        }
      >();

      // Group by role
      const roleBreakdown = new Map<
        string,
        {
          count: number;
          totalAmount: number;
          totalCollected: number;
          totalObligation: number;
          partnerUserIds: Set<string>;
        }
      >();

      // Group by collection partner user
      const collectionPartnerUserBreakdown = new Map<
        string,
        {
          partnerUserName: string;
          role: string;
          count: number;
          totalAmount: number;
          totalCollected: number;
          totalObligation: number;
          loans: any[];
        }
      >();

      // Group by collection role
      const collectionRoleBreakdown = new Map<
        string,
        {
          count: number;
          totalAmount: number;
          totalCollected: number;
          totalObligation: number;
          partnerUserIds: Set<string>;
        }
      >();
      const dpdBreakdown = new Map<
        string,
        {
          dpdRange: string;
          count: number;
          totalPrincipal: number;
          totalObligation: number;
          totalCollected: number;
          outstandingAmount: number;
        }
      >();

      const dpdRanges = [
        "Running Case",
        "1 To 30",
        "31 - 60",
        "61 - 90",
        "91 - 120",
        "121 - 180",
        "180+",
      ];

      dpdRanges.forEach((range) => {
        dpdBreakdown.set(range, {
          dpdRange: range,
          count: 0,
          totalPrincipal: 0,
          totalObligation: 0,
          totalCollected: 0,
          outstandingAmount: 0,
        });
      });
      for (const loan of dpdLoansFiltered) {
        const loanDueDate = dpdLoanDetailsMap[loan.id]?.dueDate;
        const loanStatus = loan.status;
        const principal = loan?.amount || 0;
        const obligation =
          dpdLoanDetailsMap[loan.id]?.repayment?.totalObligation || 0;

        // Get total collected from pre-fetched payment data
        const totalCollected = dpdPaymentData[loan.id] || 0;

        const outstandingAmount = obligation - totalCollected;
        const dpd = this.calculateDPD(loanDueDate, loanStatus);
        const dpdRange = this.getDPDRange(dpd);

        // Only add to DPD breakdown if not excluded
        if (dpdRange !== "EXCLUDE") {
          const dpdData = dpdBreakdown.get(dpdRange);
          if (dpdData) {
            dpdData.count += 1;
            dpdData.totalPrincipal += principal;
            dpdData.totalObligation += obligation;
            dpdData.totalCollected += totalCollected;
            dpdData.outstandingAmount += outstandingAmount;
          }
        }
      }
      const dpdBreakdownArray = dpdRanges.map((range) => {
        const data = dpdBreakdown.get(range)!;
        return {
          dpdRange: data.dpdRange,
          count: data.count,
          totalPrincipal: data.totalPrincipal,
          totalObligation: data.totalObligation,
          totalCollected: data.totalCollected,
          outstandingAmount: data.outstandingAmount,
        };
      });

      for (const loan of collectionLoansFiltered) {
        const status = loan.status;
        const loanType = loan.loanType || "Unknown";

        // Get details from maps instead of nested relations
        const loanDetail = loanDetailsMap[loan.id];
        const userDetail = userDetailsMap[loan.userId];

        const state = userDetail?.userDetails?.state || "Unknown";
        const dueDate = loanDetail?.dueDate
          ? _dayjs(loanDetail.dueDate).format("YYYY-MM")
          : "Unknown";

        const principal = loan.amount || 0;

        // Get payment data from pre-fetched collection
        const paymentData = collectionLoanPaymentData[loan.id] || {
          totalCollected: 0,
          totalDisbursed: 0,
          totalPrincipalPaid: 0,
          totalFeesPaid: 0,
          totalPenaltiesPaid: 0,
          totalTaxesPaid: 0,
          totalDiscounts: 0,
          paymentTransactions: [],
          disbursementTransactions: [],
        };

        const totalCollected = paymentData.totalCollected;
        const totalDisbursed = paymentData.totalDisbursed;
        const totalPrincipalPaid = paymentData.totalPrincipalPaid;
        const totalFeesPaid = paymentData.totalFeesPaid;
        const totalPenaltiesPaid = paymentData.totalPenaltiesPaid;
        const totalTaxesPaid = paymentData.totalTaxesPaid;
        const totalDiscounts = paymentData.totalDiscounts;
        const paymentTransactions = paymentData.paymentTransactions;
        const disbursementTransactions = paymentData.disbursementTransactions;

        // Calculate obligation exactly like in reminder service
        let obligation = loanDetail?.repayment?.totalObligation || 0;
        const outstandingAmount = obligation - totalCollected;
        const collectionRate =
          obligation > 0 ? (totalCollected / obligation) * 100 : 0;

        // Status breakdown
        if (!statusBreakdown.has(status)) {
          statusBreakdown.set(status, {
            count: 0,
            totalAmount: 0,
            totalPrincipal: 0,
            totalObligation: 0,
            loans: [],
          });
        }
        const statusData = statusBreakdown.get(status);
        if (statusData) {
          statusData.count += 1;
          statusData.totalAmount += principal;
          statusData.totalPrincipal += principal;
          statusData.totalObligation += obligation;
          statusData.loans.push({
            id: loan.id,
            formattedLoanId: loan.formattedLoanId,
            amount: principal,
            principal,
            obligation,
            dueDate: loanDetail?.dueDate,
            customerName: `${userDetail?.userDetails?.firstName || ""} ${
              userDetail?.userDetails?.lastName || ""
            }`.trim(),
            customerId: userDetail?.formattedUserId,
            phoneNumber: userDetail?.phoneNumber,
            paymentSummary: {
              totalCollected,
              totalDisbursed,
              totalPrincipalPaid,
              totalFeesPaid,
              totalPenaltiesPaid,
              totalTaxesPaid,
              totalDiscounts,
              outstandingAmount,
              collectionRate: Number(collectionRate.toFixed(2)),
              paymentTransactionsCount: paymentTransactions.length,
              disbursementTransactionsCount: disbursementTransactions.length,
            },
            paymentTransactions,
            disbursementTransactions,
          });
        }

        // Loan type breakdown
        if (!loanTypeBreakdown.has(loanType)) {
          loanTypeBreakdown.set(loanType, {
            count: 0,
            totalAmount: 0,
            totalPrincipal: 0,
            totalObligation: 0,
            loans: [],
          });
        }
        const typeData = loanTypeBreakdown.get(loanType);
        if (typeData) {
          typeData.count += 1;
          typeData.totalAmount += principal;
          typeData.totalPrincipal += principal;
          typeData.totalObligation += obligation;
          typeData.loans.push({
            id: loan.id,
            formattedLoanId: loan.formattedLoanId,
            amount: principal,
            principal,
            obligation,
            dueDate: loanDetail?.dueDate,
            customerName: `${userDetail?.userDetails?.firstName || ""} ${
              userDetail?.userDetails?.lastName || ""
            }`.trim(),
            customerId: userDetail?.formattedUserId,
            phoneNumber: userDetail?.phoneNumber,
            paymentSummary: {
              totalCollected,
              totalDisbursed,
              totalPrincipalPaid,
              totalFeesPaid,
              totalPenaltiesPaid,
              totalTaxesPaid,
              totalDiscounts,
              outstandingAmount,
              collectionRate: Number(collectionRate.toFixed(2)),
              paymentTransactionsCount: paymentTransactions.length,
              disbursementTransactionsCount: disbursementTransactions.length,
            },
          });
        }

        // Due date breakdown
        if (!dueDateBreakdown.has(dueDate)) {
          dueDateBreakdown.set(dueDate, {
            count: 0,
            totalAmount: 0,
            totalCollected: 0,
            totalObligation: 0,
            loans: [],
          });
        }
        const dateData = dueDateBreakdown.get(dueDate);
        if (dateData) {
          dateData.count += 1;
          dateData.totalAmount += principal;
          dateData.totalCollected += totalCollected;
          dateData.totalObligation += obligation;
          dateData.loans.push({
            id: loan.id,
            formattedLoanId: loan.formattedLoanId,
            amount: principal,
            principal,
            obligation,
            dueDate: loanDetail?.dueDate,
            customerName: `${userDetail?.userDetails?.firstName || ""} ${
              userDetail?.userDetails?.lastName || ""
            }`.trim(),
            customerId: userDetail?.formattedUserId,
            phoneNumber: userDetail?.phoneNumber,
            paymentSummary: {
              totalCollected,
              totalDisbursed,
              totalPrincipalPaid,
              totalFeesPaid,
              totalPenaltiesPaid,
              totalTaxesPaid,
              totalDiscounts,
              outstandingAmount,
              collectionRate: Number(collectionRate.toFixed(2)),
              paymentTransactionsCount: paymentTransactions.length,
              disbursementTransactionsCount: disbursementTransactions.length,
            },
          });
        }

        // Location breakdown
        if (!locationBreakdown.has(state)) {
          locationBreakdown.set(state, {
            count: 0,
            totalAmount: 0,
            totalCollected: 0,
            totalObligation: 0,
            loans: [],
          });
        }
        const locationData = locationBreakdown.get(state);
        if (locationData) {
          locationData.count += 1;
          locationData.totalAmount += principal;
          locationData.totalCollected += totalCollected;
          locationData.totalObligation += obligation;
          locationData.loans.push({
            id: loan.id,
            formattedLoanId: loan.formattedLoanId,
            amount: principal,
            principal,
            obligation,
            dueDate: loanDetail?.dueDate,
            customerName: `${userDetail?.userDetails?.firstName || ""} ${
              userDetail?.userDetails?.lastName || ""
            }`.trim(),
            customerId: userDetail?.formattedUserId,
            phoneNumber: userDetail?.phoneNumber,
            paymentSummary: {
              totalCollected,
              totalDisbursed,
              totalPrincipalPaid,
              totalFeesPaid,
              totalPenaltiesPaid,
              totalTaxesPaid,
              totalDiscounts,
              outstandingAmount,
              collectionRate: Number(collectionRate.toFixed(2)),
              paymentTransactionsCount: paymentTransactions.length,
              disbursementTransactionsCount: disbursementTransactions.length,
            },
          });
        }

        const loanDueDate = loanDetail?.dueDate;
        const loanStatus = loan.status;
        // Calculate DPD - PAID and COMPLETED loans will return -1
        const dpd = this.calculateDPD(loanDueDate, loanStatus);
        const dpdRange = this.getDPDRange(dpd);

        // Only add to DPD breakdown if not excluded
        if (dpdRange !== "EXCLUDE") {
          const dpdData = dpdBreakdown.get(dpdRange);
          if (dpdData) {
            dpdData.count += 1;
            dpdData.totalPrincipal += principal;
            dpdData.totalObligation += obligation;
            dpdData.totalCollected += totalCollected;
            dpdData.outstandingAmount += outstandingAmount;
          }
        }
        // Partner user breakdown
        // Partner user breakdown
        const allottedPartners = allottedPartnersByLoanId[loan.id] || [];
        if (allottedPartners && allottedPartners.length > 0) {
          allottedPartners.forEach((allottedPartner) => {
            const partnerUserId = allottedPartner.partnerUserId;
            const partnerUserName =
              allottedPartner.partnerUser?.name || "Unknown";

            // Determine role: executive if reportsToId exists, else manager/head
            let role = "manager";
            let managerName: string | undefined = undefined;

            if (allottedPartner.partnerUser?.reportsToId) {
              role = "executive";
              // Get manager name from reportsTo relationship
              managerName =
                allottedPartner.partnerUser.reportsTo?.name || undefined;
            }

            if (!partnerUserBreakdown.has(partnerUserId)) {
              partnerUserBreakdown.set(partnerUserId, {
                partnerUserName,
                role,
                managerName,
                count: 0,
                totalAmount: 0,
                totalCollected: 0,
                totalObligation: 0,
                loans: [],
              });
            }

            // Add to role breakdown
            if (!roleBreakdown.has(role)) {
              roleBreakdown.set(role, {
                count: 0,
                totalAmount: 0,
                totalCollected: 0,
                totalObligation: 0,
                partnerUserIds: new Set<string>(),
              });
            }
            const roleData = roleBreakdown.get(role);
            if (roleData) {
              roleData.partnerUserIds.add(partnerUserId);
            }

            const partnerUserData = partnerUserBreakdown.get(partnerUserId);
            if (partnerUserData) {
              partnerUserData.count += 1;
              partnerUserData.totalAmount += principal;
              partnerUserData.totalCollected += totalCollected;
              partnerUserData.totalObligation += obligation;
              partnerUserData.loans.push({
                id: loan.id,
                formattedLoanId: loan.formattedLoanId,
                amount: principal,
                principal,
                obligation,
                dueDate: loanDetail?.dueDate,
                customerName: `${userDetail?.userDetails?.firstName || ""} ${
                  userDetail?.userDetails?.lastName || ""
                }`.trim(),
                customerId: userDetail?.formattedUserId,
                phoneNumber: userDetail?.phoneNumber,
                paymentSummary: {
                  totalCollected,
                  totalDisbursed,
                  totalPrincipalPaid,
                  totalFeesPaid,
                  totalPenaltiesPaid,
                  totalTaxesPaid,
                  totalDiscounts,
                  outstandingAmount,
                  collectionRate: Number(collectionRate.toFixed(2)),
                  paymentTransactionsCount: paymentTransactions.length,
                  disbursementTransactionsCount:
                    disbursementTransactions.length,
                },
              });
            }

            // Update role breakdown with loan details
            if (roleData) {
              roleData.count += 1;
              roleData.totalAmount += principal;
              roleData.totalCollected += totalCollected;
              roleData.totalObligation += obligation;
            }
          });
        }

        // Collection partner user breakdown
        const collectionPartners = collectionPartnersByLoanId[loan.id] || [];
        if (collectionPartners && collectionPartners.length > 0) {
          collectionPartners.forEach((collectionPartner) => {
            const partnerUserId = collectionPartner.partnerUserId;
            const partnerUserName =
              collectionPartner.partnerUser?.name || "Unknown";
            const role =
              collectionPartner.partnerUser?.brandRoles[0]?.role?.name;
            let collectionRole = "un_assigned";
            if (role === "COLLECTION_EXECUTIVE") {
              collectionRole = "collection_executive";
            } else if (role === "COLLECTION_MANAGER") {
              collectionRole = "collection_manager";
            } else if (role === "COLLECTION_HEAD") {
              collectionRole = "collection_head";
            }

            if (!collectionPartnerUserBreakdown.has(partnerUserId)) {
              collectionPartnerUserBreakdown.set(partnerUserId, {
                partnerUserName,
                role: collectionRole,
                count: 0,
                totalAmount: 0,
                totalCollected: 0,
                totalObligation: 0,
                loans: [],
              });
            }

            // Add to collection role breakdown
            if (!collectionRoleBreakdown.has(collectionRole)) {
              collectionRoleBreakdown.set(collectionRole, {
                count: 0,
                totalAmount: 0,
                totalCollected: 0,
                totalObligation: 0,
                partnerUserIds: new Set<string>(),
              });
            }
            const collectionRoleData =
              collectionRoleBreakdown.get(collectionRole);
            if (collectionRoleData) {
              collectionRoleData.partnerUserIds.add(partnerUserId);
            }

            const collectionPartnerUserData =
              collectionPartnerUserBreakdown.get(partnerUserId);
            if (collectionPartnerUserData) {
              collectionPartnerUserData.count += 1;
              collectionPartnerUserData.totalAmount += principal;
              collectionPartnerUserData.totalCollected += totalCollected;
              collectionPartnerUserData.totalObligation += obligation;
              collectionPartnerUserData.loans.push({
                id: loan.id,
                formattedLoanId: loan.formattedLoanId,
                amount: principal,
                principal,
                obligation,
                dueDate: loanDetail?.dueDate,
                customerName: `${userDetail?.userDetails?.firstName || ""} ${
                  userDetail?.userDetails?.lastName || ""
                }`.trim(),
                customerId: userDetail?.formattedUserId,
                phoneNumber: userDetail?.phoneNumber,
                paymentSummary: {
                  totalCollected,
                  totalDisbursed,
                  totalPrincipalPaid,
                  totalFeesPaid,
                  totalPenaltiesPaid,
                  totalTaxesPaid,
                  totalDiscounts,
                  outstandingAmount,
                  collectionRate: Number(collectionRate.toFixed(2)),
                  paymentTransactionsCount: paymentTransactions.length,
                  disbursementTransactionsCount:
                    disbursementTransactions.length,
                },
              });
            }

            // Update collection role breakdown with loan details
            if (collectionRoleData) {
              collectionRoleData.count += 1;
              collectionRoleData.totalAmount += principal;
              collectionRoleData.totalCollected += totalCollected;
              collectionRoleData.totalObligation += obligation;
            }
          });
        } else {
          // Handle unassigned loans (no collection partner allocated)
          const unassignedPartnerUserId = "unassigned";
          const unassignedPartnerUserName = "Unassigned";
          const unassignedCollectionRole = "un_assigned";

          // Add to collection partner user breakdown for unassigned
          if (!collectionPartnerUserBreakdown.has(unassignedPartnerUserId)) {
            collectionPartnerUserBreakdown.set(unassignedPartnerUserId, {
              partnerUserName: unassignedPartnerUserName,
              role: unassignedCollectionRole,
              count: 0,
              totalAmount: 0,
              totalCollected: 0,
              totalObligation: 0,
              loans: [],
            });
          }

          // Add to collection role breakdown for unassigned
          if (!collectionRoleBreakdown.has(unassignedCollectionRole)) {
            collectionRoleBreakdown.set(unassignedCollectionRole, {
              count: 0,
              totalAmount: 0,
              totalCollected: 0,
              totalObligation: 0,
              partnerUserIds: new Set<string>(),
            });
          }

          const unassignedRoleData = collectionRoleBreakdown.get(
            unassignedCollectionRole,
          );
          if (unassignedRoleData) {
            unassignedRoleData.partnerUserIds.add(unassignedPartnerUserId);
          }

          const unassignedPartnerUserData = collectionPartnerUserBreakdown.get(
            unassignedPartnerUserId,
          );
          if (unassignedPartnerUserData) {
            unassignedPartnerUserData.count += 1;
            unassignedPartnerUserData.totalAmount += principal;
            unassignedPartnerUserData.totalCollected += totalCollected;
            unassignedPartnerUserData.totalObligation += obligation;
            unassignedPartnerUserData.loans.push({
              id: loan.id,
              formattedLoanId: loan.formattedLoanId,
              amount: principal,
              principal,
              obligation,
              dueDate: loanDetail?.dueDate,
              customerName: `${userDetail?.userDetails?.firstName || ""} ${
                userDetail?.userDetails?.lastName || ""
              }`.trim(),
              customerId: userDetail?.formattedUserId,
              phoneNumber: userDetail?.phoneNumber,
              paymentSummary: {
                totalCollected,
                totalDisbursed,
                totalPrincipalPaid,
                totalFeesPaid,
                totalPenaltiesPaid,
                totalTaxesPaid,
                totalDiscounts,
                outstandingAmount,
                collectionRate: Number(collectionRate.toFixed(2)),
                paymentTransactionsCount: paymentTransactions.length,
                disbursementTransactionsCount: disbursementTransactions.length,
              },
            });
          }

          // Update collection role breakdown with unassigned loan details
          if (unassignedRoleData) {
            unassignedRoleData.count += 1;
            unassignedRoleData.totalAmount += principal;
            unassignedRoleData.totalCollected += totalCollected;
            unassignedRoleData.totalObligation += obligation;
          }
        }
      }

      // Calculate totals
      const totalLoans = collectionLoansFiltered.length;
      const totalAmount = collectionLoansFiltered.reduce(
        (sum, loan) => sum + (loan.amount || 0),
        0,
      );
      const totalPrincipal = collectionLoansFiltered.reduce(
        (sum, loan) => sum + (loan.amount || 0),
        0,
      );

      // Calculate payment totals and obligations across all loans
      let portfolioTotalCollected = 0;
      let portfolioTotalDisbursed = 0;
      let portfolioTotalPrincipalPaid = 0;
      let portfolioTotalFeesPaid = 0;
      let portfolioTotalPenaltiesPaid = 0;
      let portfolioTotalTaxesPaid = 0;
      let portfolioTotalDiscounts = 0;
      let portfolioTotalObligation = 0;

      // Calculate totals from status breakdown which has the correct obligations per loan
      statusBreakdown.forEach((statusData) => {
        portfolioTotalObligation += statusData.totalObligation;
      });

      collectionLoans.forEach((loan) => {
        const loanPaymentData = collectionLoanPaymentData[loan.id];
        if (loanPaymentData) {
          portfolioTotalCollected += loanPaymentData.totalCollected;
          portfolioTotalPrincipalPaid += loanPaymentData.totalPrincipalPaid;
          portfolioTotalFeesPaid += loanPaymentData.totalFeesPaid;
          portfolioTotalPenaltiesPaid += loanPaymentData.totalPenaltiesPaid;
          portfolioTotalTaxesPaid += loanPaymentData.totalTaxesPaid;
          portfolioTotalDiscounts += loanPaymentData.totalDiscounts;
          portfolioTotalDisbursed += loanPaymentData.totalDisbursed;
        }
      });

      // Use the sum of all individual loan obligations
      const totalObligation = portfolioTotalObligation;

      const portfolioOutstanding = totalObligation - portfolioTotalCollected;
      const portfolioCollectionRate =
        totalObligation > 0
          ? (portfolioTotalCollected / totalObligation) * 100
          : 0;

      // Convert maps to arrays and sort
      const statusBreakdownArray = Array.from(statusBreakdown.entries())
        .map(([status, data]) => ({
          status,
          ...data,
          averageAmount: data.count > 0 ? data.totalAmount / data.count : 0,
          averageObligation:
            data.count > 0 ? data.totalObligation / data.count : 0,
        }))
        .sort((a, b) => b.totalObligation - a.totalObligation);

      const loanTypeBreakdownArray = Array.from(loanTypeBreakdown.entries())
        .map(([loanType, data]) => ({
          loanType,
          ...data,
          percentage: totalLoans > 0 ? (data.count / totalLoans) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count);

      const dueDateBreakdownArray = Array.from(dueDateBreakdown.entries())
        .map(([month, data]) => ({
          month,
          ...data,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      const locationBreakdownArray = Array.from(locationBreakdown.entries())
        .map(([state, data]) => ({
          state,
          ...data,
        }))
        .sort((a, b) => b.totalCollected - a.totalCollected);

      const partnerUserBreakdownArray = Array.from(
        partnerUserBreakdown.entries(),
      )
        .map(([partnerUserId, data]) => ({
          partnerUserId,
          ...data,
        }))
        .sort((a, b) => b.totalCollected - a.totalCollected);

      const roleBreakdownArray = Array.from(roleBreakdown.entries())
        .map(([role, data]) => ({
          role,
          count: data.count,
          totalAmount: data.totalAmount,
          totalCollected: data.totalCollected,
          totalObligation: data.totalObligation,
          partnerUserCount: data.partnerUserIds.size,
        }))
        .sort((a, b) => b.count - a.count);

      const collectionPartnerUserBreakdownArray = Array.from(
        collectionPartnerUserBreakdown.entries(),
      )
        .map(([partnerUserId, data]) => ({
          partnerUserId,
          ...data,
        }))
        .sort((a, b) => b.totalCollected - a.totalCollected);

      const collectionRoleBreakdownArray = Array.from(
        collectionRoleBreakdown.entries(),
      )
        .map(([role, data]) => ({
          role,
          count: data.count,
          totalAmount: data.totalAmount,
          totalCollected: data.totalCollected,
          totalObligation: data.totalObligation,
          partnerUserCount: data.partnerUserIds.size,
        }))
        .sort((a, b) => b.count - a.count);

      // Batch queries to avoid exceeding bind variable limits for penalties
      const penaltyBatchSize = 250; // Reduced from 500
      let allPenalties: any[] = [];
      for (let i = 0; i < collectionLoanIds.length; i += penaltyBatchSize) {
        const batch = collectionLoanIds.slice(i, i + penaltyBatchSize);
        const penalties = await this.prisma.penalty.findMany({
          where: { loanId: { in: batch } },
          select: { loanId: true, chargeValue: true, valueType: true },
        });
        allPenalties = allPenalties.concat(penalties);
      }

      let totalDuePenalty = 0;
      const penaltiesByLoanId = new Map();
      allPenalties.forEach((p) => {
        if (!penaltiesByLoanId.has(p.loanId))
          penaltiesByLoanId.set(p.loanId, []);
        penaltiesByLoanId.get(p.loanId).push(p);
      });
      collectionLoans.forEach((loan) => {
        const loanPenalties = penaltiesByLoanId.get(loan.id) || [];
        loanPenalties.forEach((penalty) => {
          const principal = loan.amount || 0;
          if (penalty.valueType === "percentage") {
            totalDuePenalty += principal * (penalty.chargeValue / 100);
          } else {
            totalDuePenalty += penalty.chargeValue;
          }
        });
      });

      const totalInterestDue = totalObligation - totalPrincipal;
      // 3. Calculate received interest
      const totalInterestPaid =
        portfolioTotalCollected -
        portfolioTotalPrincipalPaid -
        portfolioTotalPenaltiesPaid;
      // 4. Count loans that have received payments
      const loansWithPayments = collectionLoansFiltered.filter((loan) => {
        const loanPaymentData = collectionLoanPaymentData[loan.id];
        return loanPaymentData && loanPaymentData.totalCollected > 0;
      }).length;

      // 5. Calculate obligation with penalty
      const totalObligationWithPenalty = totalObligation + totalDuePenalty;

      // 6. Calculate outstanding penalty
      const totalOutstandingPenalty =
        totalDuePenalty - portfolioTotalPenaltiesPaid;
      //all outstanding
      const outstandingPrincipal = totalPrincipal - portfolioTotalPrincipalPaid;
      const outstandingInterest = totalInterestDue - totalInterestPaid;
      const outstandingObligation = totalObligation - portfolioTotalCollected;
      const outstandingObligationWithPenalty =
        totalObligationWithPenalty - portfolioTotalCollected;

      return {
        summary: {
          totalLoans,
          totalAmount,
          totalPrincipal,
          totalInterestDue,
          totalDuePenalty,
          totalObligation,
          totalObligationWithPenalty,
          averageLoanAmount: totalLoans > 0 ? totalAmount / totalLoans : 0,
          averageObligation: totalLoans > 0 ? totalObligation / totalLoans : 0,
          paymentSummary: {
            loansWithPayments,
            totalCollected: portfolioTotalCollected,
            totalDisbursed: portfolioTotalDisbursed,
            totalPrincipalPaid: portfolioTotalPrincipalPaid,
            totalInterestPaid,
            totalFeesPaid: portfolioTotalFeesPaid,
            totalPenaltiesPaid: portfolioTotalPenaltiesPaid,
            totalTaxesPaid: portfolioTotalTaxesPaid,
            totalDiscounts: portfolioTotalDiscounts,
            outstandingAmount: portfolioOutstanding,
            outstandingPrincipal,
            outstandingInterest,
            outstandingPenalty: totalOutstandingPenalty,
            outstandingObligation,
            outstandingObligationWithPenalty,
            collectionRate: Number(portfolioCollectionRate.toFixed(2)),
            averageCollectionPerLoan:
              totalLoans > 0 ? portfolioTotalCollected / totalLoans : 0,
            averageOutstandingPerLoan:
              totalLoans > 0 ? portfolioOutstanding / totalLoans : 0,
          },
        },
        dpdBreakdown: dpdBreakdownArray,
        statusBreakdown: statusBreakdownArray,
        loanTypeBreakdown: loanTypeBreakdownArray,
        dueDateBreakdown: dueDateBreakdownArray,
        locationBreakdown: locationBreakdownArray,
        roleBreakdown: roleBreakdownArray,
        partnerUserBreakdown: partnerUserBreakdownArray,
        collectionRoleBreakdown: collectionRoleBreakdownArray,
        collectionPartnerUserBreakdown: collectionPartnerUserBreakdownArray,
        dateRange: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          period: query.period || "all",
        },
      };
    } catch (error) {
      this.logger.error(
        `Error fetching collection analysis for brand ${brandId}:`,
        error,
      );
      throw error;
    }
  }

  async getUsersByOnboardingStep(brandId: string, query: DashboardStatsDto) {
    try {
      const dateRange = this.getDateRange(query);

      // Get users grouped by onboarding step
      const usersByStep = await this.prisma.user.groupBy({
        by: ["onboardingStep"],
        where: {
          brandId,
          isActive: true,
          createdAt: dateRange.dateFilter,
        },
        _count: {
          id: true,
        },
        orderBy: {
          onboardingStep: "asc",
        },
      });

      // Define onboarding step labels (you can customize these based on your app)
      const stepLabels: Record<number, string> = {
        0: "Phone Verification",
        1: "Phone Verification",
        2: "Email Verification",
        3: "Loan Application",
        4: "Current Status",
        5: "KYC",
        6: "Personal Info",
        7: "Bank Details",
        8: "Employment Info",
        9: "Selfie",
        10: "Address Verification",
        11: "Review",
        12: "Loans",
      };

      const result = usersByStep.map((step) => ({
        step: step.onboardingStep,
        stepLabel:
          stepLabels[step.onboardingStep] || `Step ${step.onboardingStep}`,
        userCount: step._count.id,
      }));

      const totalUsers = result.reduce((sum, step) => sum + step.userCount, 0);

      // Calculate completion rates
      // Calculate completion rates and sort by step number
      const resultWithRates = result
        .map((step) => ({
          ...step,
          percentage:
            totalUsers > 0
              ? Number(((step.userCount / totalUsers) * 100).toFixed(1))
              : 0,
        }))
        .sort((a, b) => a.step - b.step); // Ensure proper ordering

      return {
        usersByStep: resultWithRates,
        totalSteps: result.length,
        totalUsers,
        completionRate:
          totalUsers > 0
            ? Number(
                (
                  ((result.find((s) => s.step === 12)?.userCount || 0) /
                    totalUsers) *
                  100
                ).toFixed(1),
              )
            : 0,
        dateRange: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          period: query.period || "all",
        },
      };
    } catch (error) {
      this.logger.error(
        `Error fetching users by onboarding step for brand ${brandId}:`,
        error,
      );
      throw error;
    }
  }

  async sendYesterdayDashboardReport(
    emails: string[],
    brandId: string,
  ): Promise<{ success: boolean; message: string; reportData?: any }> {
    try {
      this.logger.log(
        `Generating yesterday's dashboard report for brand ${brandId}`,
      );

      // Get yesterday's date range
      const yesterday = this.getIST().subtract(1, "day");
      const yesterdayQuery: DashboardStatsDto = {
        period: "custom",
        startDate: yesterday.startOf("day").toISOString(),
        endDate: yesterday.endOf("day").toISOString(),
      };

      // Generate comprehensive dashboard data for yesterday
      const [
        dashboardSummary,
        usersBySubdomain,
        usersByLocation,
        usersByCompany,
        usersByOnboardingStep,
        loansByType,
        collectionAnalysis,
        loanAllocationDetails,
      ] = await Promise.all([
        this.getDashboardSummary(brandId, yesterdayQuery),
        this.getUsersBySubdomain(brandId, yesterdayQuery),
        this.getUsersByLocation(brandId, yesterdayQuery),
        this.getUsersByCompany(brandId, yesterdayQuery),
        this.getUsersByOnboardingStep(brandId, yesterdayQuery),
        this.getLoansByType(brandId, yesterdayQuery),
        this.getCollectionAnalysis(brandId, yesterdayQuery),
        this.getLoanAllocationDetails(brandId, yesterdayQuery),
      ]);

      // Get brand information for the report
      const brandInfo = await this.prisma.brand.findUnique({
        where: { id: brandId },
        select: {
          name: true,
          domain: true,
        },
      });

      // Compile report data
      const reportData = {
        reportDate: yesterday.format("YYYY-MM-DD"),
        reportTitle: `Daily Dashboard Report - ${yesterday.format("MMM DD, YYYY")}`,
        brand: {
          name: brandInfo?.name || "Unknown Brand",
          domain: brandInfo?.domain,
        },
        summary: dashboardSummary.summary,
        subdomainAnalysis: {
          totalSubdomains: usersBySubdomain.totalSubdomains,
          topPerformingSubdomain: usersBySubdomain.loansBySubdomain[0] || null,
          subdomains: usersBySubdomain.loansBySubdomain.slice(0, 10), // Top 10
        },
        locationAnalysis: {
          totalStates: usersByLocation.totalStates,
          topStates: usersByLocation.usersByLocation.slice(0, 5),
          totalUsers: usersByLocation.totalUsers,
        },
        companyAnalysis: {
          totalCompanies: usersByCompany.totalCompanies,
          topCompanies: usersByCompany.usersByCompany.slice(0, 10),
          totalUsers: usersByCompany.totalUsers,
        },
        onboardingAnalysis: {
          totalSteps: usersByOnboardingStep.totalSteps,
          completionRate: usersByOnboardingStep.completionRate,
          stepBreakdown: usersByOnboardingStep.usersByStep,
        },
        loanTypeAnalysis: {
          totalLoanTypes: loansByType.totalLoanTypes,
          totalLoans: loansByType.totalLoans,
          totalAmount: loansByType.totalAmount,
          averageLoanAmount: loansByType.averageLoanAmount,
          loanTypes: loansByType.loansByType,
        },
        collectionAnalysis: {
          summary: collectionAnalysis.summary,
          statusBreakdown: collectionAnalysis.statusBreakdown,
          loanTypeBreakdown: collectionAnalysis.loanTypeBreakdown,
          locationBreakdown: collectionAnalysis.locationBreakdown.slice(0, 10), // Top 10 states
        },
        loanAllocationAnalysis: {
          summary: loanAllocationDetails.summary,
          hierarchy: loanAllocationDetails.hierarchy,
          topAllocations: loanAllocationDetails.allocationDetails.slice(0, 10), // Top 10 allocations
          unallocatedCount: loanAllocationDetails.summary.unallocatedCount,
        },
        generatedAt: new Date().toISOString(),
        period: {
          startDate: yesterdayQuery.startDate,
          endDate: yesterdayQuery.endDate,
        },
      };

      // Generate email content
      const emailContent = this.generateEmailContent(reportData);

      // Skip PDF generation for now
      this.logger.log("Dashboard report will be sent without PDF attachment");

      // Log the email generation for now - integrate with email service later
      this.logger.log(`Dashboard report generated for ${emails.join(", ")}`);
      this.logger.debug("Email content subject:", emailContent.subject);

      for (const email of emails) {
        this.logger.log(`Sending report to: ${email}`);
        await this.emailService.sendEmail({
          to: email,
          name: `Dashboard Report for ${brandInfo?.name || "Unknown Brand"}`,
          subject: emailContent.subject,
          html: emailContent.html,
          attachments: [],
        });
      }

      return {
        success: true,
        message: `Yesterday's dashboard report generated successfully for ${emails.length} recipients`,
        reportData: reportData,
      };
    } catch (error) {
      this.logger.error(
        `Error generating yesterday's dashboard report for brand ${brandId}:`,
        error,
      );

      return {
        success: false,
        message: `Failed to generate dashboard report: ${error.message}`,
      };
    }
  }

  private generateEmailContent(reportData: any) {
    const {
      reportTitle,
      brand,
      summary,
      subdomainAnalysis,
      locationAnalysis,
      companyAnalysis,
      onboardingAnalysis,
      loanTypeAnalysis,
      collectionAnalysis,
      loanAllocationAnalysis,
    } = reportData;

    const subject = `📊 ${reportTitle} - ${brand.name}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>${reportTitle}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.4; color: #333; margin: 0; padding: 15px; background-color: #f5f5f5; }
            .container { max-width: 1000px; margin: 0 auto; background: white; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 5px 0 0; opacity: 0.9; font-size: 14px; }
            .content { padding: 20px; }
            .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin: 15px 0; }
            .metric-card { background: #f8f9ff; border: 1px solid #e1e5f7; border-radius: 6px; padding: 15px; text-align: center; }
            .metric-value { font-size: 1.8em; font-weight: bold; color: #667eea; margin-bottom: 3px; }
            .metric-label { color: #666; font-size: 0.85em; font-weight: 500; }
            .section { margin: 25px 0; }
            .section h2 { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 8px; font-size: 18px; margin-bottom: 15px; }
            .table { width: 100%; border-collapse: collapse; margin: 10px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); font-size: 14px; }
            .table th, .table td { padding: 10px 8px; text-align: left; border-bottom: 1px solid #ddd; }
            .table th { background-color: #f8f9ff; font-weight: bold; color: #667eea; font-size: 13px; }
            .table tr:nth-child(even) { background-color: #f9f9f9; }
            .highlight { background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 12px; margin: 12px 0; font-size: 14px; }
            .footer { background: #f8f9ff; padding: 15px; text-align: center; color: #666; font-size: 0.85em; }
            .progress-bar { background: #e9ecef; height: 8px; border-radius: 4px; overflow: hidden; margin: 5px 0; }
            .progress-fill { background: linear-gradient(90deg, #667eea, #764ba2); height: 100%; border-radius: 4px; }
            .status-badge { padding: 3px 6px; border-radius: 10px; font-size: 0.75em; font-weight: bold; }
            .status-approved { background: #d4edda; color: #155724; }
            .status-pending { background: #fff3cd; color: #856404; }
            .status-rejected { background: #f8d7da; color: #721c24; }
            .two-column { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .summary-box { background: linear-gradient(135deg, #f8f9ff 0%, #e8ecff 100%); border-radius: 6px; padding: 15px; margin: 15px 0; }
            .insight { background: #e7f3ff; border-left: 3px solid #667eea; padding: 10px; margin: 10px 0; font-size: 14px; }
            .compact-list { margin: 8px 0; padding-left: 15px; }
            .compact-list li { margin: 3px 0; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${reportTitle}</h1>
                <p>${brand.name} Dashboard Analytics | Generated ${new Date(reportData.generatedAt).toLocaleDateString()}</p>
                <p style="font-size: 12px; margin-top: 8px;">📈 Daily Business Intelligence Report</p>
            </div>
            
            <div class="content">
                <!-- Executive Summary -->
                <div class="summary-box">
                    <h2 style="margin-top: 0; color: #667eea; font-size: 16px;">📊 Executive Summary</h2>
                    <div class="two-column" style="font-size: 14px;">
                        <div>
                            <p><strong>Users:</strong> ${summary.totalUsers?.toLocaleString() || 0} | <strong>Loans:</strong> ${summary.totalLoans?.toLocaleString() || 0}</p>
                            <p><strong>Conversion:</strong> ${summary.totalUsers > 0 ? ((summary.totalLoans / summary.totalUsers) * 100).toFixed(1) : 0}% | <strong>Portfolio:</strong> ₹${summary.totalLoanAmount?.toLocaleString() || 0}</p>
                        </div>
                        <div>
                            <p><strong>Avg Loan:</strong> ₹${Math.round(summary.averageLoanAmount || 0).toLocaleString()}</p>
                            <p><strong>Domain:</strong> ${brand.domain || "N/A"}</p>
                        </div>
                    </div>
                </div>

                <!-- Key Metrics -->
                <div class="section">
                    <h2>📈 Key Performance Indicators</h2>
                    <div class="metrics-grid">
                        <div class="metric-card">
                            <div class="metric-value">${summary.totalUsers?.toLocaleString() || 0}</div>
                            <div class="metric-label">Total Users</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${summary.totalLoans?.toLocaleString() || 0}</div>
                            <div class="metric-label">Total Loans</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">₹${summary.totalLoanAmount?.toLocaleString() || 0}</div>
                            <div class="metric-label">Total Loan Amount</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">₹${Math.round(summary.averageLoanAmount || 0).toLocaleString()}</div>
                            <div class="metric-label">Average Loan</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${summary.totalUsers > 0 ? ((summary.totalLoans / summary.totalUsers) * 100).toFixed(1) : 0}%</div>
                            <div class="metric-label">Conversion Rate</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${Object.keys(summary.loanStatusBreakdown || {}).length}</div>
                            <div class="metric-label">Active Statuses</div>
                        </div>
                    </div>
                </div>

                <!-- Loan Status Breakdown -->
                <div class="section">
                    <h2>💼 Loan Status Distribution</h2>
                    <div class="highlight">
                        <strong>Portfolio:</strong> ${summary.loanStatusBreakdownTotals?.totalCount || 0} loans, ₹${summary.loanStatusBreakdownTotals?.totalAmount?.toLocaleString() || 0}
                    </div>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Count</th>
                                <th>Amount</th>
                                <th>Count %</th>
                                <th>Amount %</th>
                                <th>Avg Loan Size</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(summary.loanStatusBreakdown || {})
                              .sort(
                                ([, a]: [string, any], [, b]: [string, any]) =>
                                  b.amount - a.amount,
                              )
                              .map(([status, data]: [string, any]) => {
                                const countPercentage =
                                  summary.loanStatusBreakdownTotals
                                    ?.totalCount > 0
                                    ? (
                                        (data.count /
                                          summary.loanStatusBreakdownTotals
                                            .totalCount) *
                                        100
                                      ).toFixed(1)
                                    : 0;
                                const amountPercentage =
                                  summary.loanStatusBreakdownTotals
                                    ?.totalAmount > 0
                                    ? (
                                        (data.amount /
                                          summary.loanStatusBreakdownTotals
                                            .totalAmount) *
                                        100
                                      ).toFixed(1)
                                    : 0;
                                const avgLoanSize =
                                  data.count > 0
                                    ? Math.round(data.amount / data.count)
                                    : 0;

                                return `
                                    <tr>
                                        <td>
                                            <span class="status-badge ${(() => {
                                              const statusLower =
                                                status.toLowerCase();
                                              if (
                                                statusLower.includes("approved")
                                              )
                                                return "status-approved";
                                              if (
                                                statusLower.includes("pending")
                                              )
                                                return "status-pending";
                                              return "status-rejected";
                                            })()}">
                                                ${status}
                                            </span>
                                        </td>
                                        <td><strong>${data.count?.toLocaleString() || 0}</strong></td>
                                        <td><strong>₹${data.amount?.toLocaleString() || 0}</strong></td>
                                        <td>${countPercentage}%</td>
                                        <td>${amountPercentage}%</td>
                                        <td>₹${avgLoanSize.toLocaleString()}</td>
                                    </tr>
                                  `;
                              })
                              .join("")}
                        </tbody>
                    </table>
                    
                    <div class="insight">
                        <strong>💡 Insights:</strong> Top volume: ${
                          Object.entries(
                            summary.loanStatusBreakdown || {},
                          ).sort(
                            ([, a]: [string, any], [, b]: [string, any]) =>
                              b.count - a.count,
                          )[0]?.[0] || "N/A"
                        } | 
                        Top value: ${
                          Object.entries(
                            summary.loanStatusBreakdown || {},
                          ).sort(
                            ([, a]: [string, any], [, b]: [string, any]) =>
                              b.amount - a.amount,
                          )[0]?.[0] || "N/A"
                        } | 
                        ${Object.keys(summary.loanStatusBreakdown || {}).length} statuses
                    </div>
                </div>

                <!-- Loan Type Breakdown -->
                <div class="section">
                    <h2>🏷️ Loan Type Distribution</h2>
                    <div class="highlight">
                        <strong>Types:</strong> ${loanTypeAnalysis.totalLoanTypes} | <strong>Avg:</strong> ₹${Math.round(loanTypeAnalysis.averageLoanAmount).toLocaleString()}
                    </div>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Loan Type</th>
                                <th>Count</th>
                                <th>Total Amount</th>
                                <th>Average Amount</th>
                                <th>Percentage</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${loanTypeAnalysis.loanTypes
                              .map(
                                (loanType: any) => `
                                <tr>
                                    <td><strong>${loanType.loanType}</strong></td>
                                    <td>${loanType.totalLoans.toLocaleString()}</td>
                                    <td>₹${loanType.totalAmount.toLocaleString()}</td>
                                    <td>₹${Math.round(loanType.averageLoanAmount).toLocaleString()}</td>
                                    <td>${
                                      loanTypeAnalysis.totalLoans > 0
                                        ? (
                                            (loanType.totalLoans /
                                              loanTypeAnalysis.totalLoans) *
                                            100
                                          ).toFixed(1)
                                        : 0
                                    }%</td>
                                </tr>
                            `,
                              )
                              .join("")}
                        </tbody>
                    </table>
                </div>

                <!-- Top Performing Subdomains -->
                <div class="section">
                    <h2>🌐 Top Performing Subdomains</h2>
                    <div class="highlight">
                        <strong>Conversion:</strong> ${subdomainAnalysis.overallConversionRate}% (${subdomainAnalysis.totalSubdomains} subdomains)
                    </div>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Subdomain</th>
                                <th>Users</th>
                                <th>Loans</th>
                                <th>Conversion Rate</th>
                                <th>Avg Loan Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${subdomainAnalysis.subdomains
                              .slice(0, 5)
                              .map(
                                (subdomain: any) => `
                                <tr>
                                    <td>
                                        <strong>${subdomain.subdomain}</strong>
                                        ${
                                          Object.keys(
                                            subdomain.loanTypeBreakdown || {},
                                          ).length > 0
                                            ? `<br><small style="color: #666;">Types: ${Object.keys(subdomain.loanTypeBreakdown).join(", ")}</small>`
                                            : ""
                                        }
                                    </td>
                                    <td>${subdomain.userCount.toLocaleString()}</td>
                                    <td>${subdomain.totalLoans.toLocaleString()}</td>
                                    <td>${subdomain.conversionRate}%</td>
                                    <td>₹${Math.round(subdomain.averageLoanAmount).toLocaleString()}</td>
                                </tr>
                            `,
                              )
                              .join("")}
                        </tbody>
                    </table>
                </div>

                <!-- Company Analysis -->
                <div class="section">
                    <h2>🏢 Company & Employment Analysis</h2>
                    <div class="highlight">
                        <strong>Workforce:</strong> ${companyAnalysis.totalCompanies} companies, ${companyAnalysis.totalUsers.toLocaleString()} users
                    </div>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Company</th>
                                <th>Employees</th>
                                <th>Avg Salary</th>
                                <th>Top Designations</th>
                                <th>Employment Types</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${companyAnalysis.topCompanies
                              .slice(0, 10)
                              .map(
                                (company: any) => `
                                <tr>
                                    <td><strong>${company.companyName}</strong></td>
                                    <td>${company.userCount.toLocaleString()}</td>
                                    <td>₹${Math.round(company.averageSalary || 0).toLocaleString()}</td>
                                    <td>${company.uniqueDesignations.slice(0, 2).join(", ")}${company.uniqueDesignations.length > 2 ? "..." : ""}</td>
                                    <td>${company.employmentTypes.join(", ")}</td>
                                </tr>
                            `,
                              )
                              .join("")}
                        </tbody>
                    </table>
                </div>

                <!-- Geographic Distribution -->
                <div class="section">
                    <h2>📍 Geographic Distribution</h2>
                    <div class="highlight">
                        <strong>Geographic:</strong> ${locationAnalysis.totalStates} states, ${locationAnalysis.totalUsers.toLocaleString()} users
                    </div>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>State</th>
                                <th>Total Users</th>
                                <th>Market Share</th>
                                <th>Top Cities</th>
                                <th>City Count</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${locationAnalysis.topStates
                              .map(
                                (state: any) => `
                                <tr>
                                    <td><strong>${state.state}</strong></td>
                                    <td>${state.totalUsers.toLocaleString()}</td>
                                    <td>${locationAnalysis.totalUsers > 0 ? ((state.totalUsers / locationAnalysis.totalUsers) * 100).toFixed(1) : 0}%</td>
                                    <td>${state.cities
                                      .slice(0, 3)
                                      .map(
                                        (city: any) =>
                                          `${city.city} (${city.userCount})`,
                                      )
                                      .join(", ")}</td>
                                    <td>${state.cities.length} cities</td>
                                </tr>
                            `,
                              )
                              .join("")}
                        </tbody>
                    </table>
                    
                    <div class="insight">
                        <strong>🗺️ Top:</strong> ${locationAnalysis.topStates[0]?.state || "N/A"} (${locationAnalysis.topStates[0]?.totalUsers || 0}) | 
                        <strong>Coverage:</strong> ${locationAnalysis.topStates.reduce((sum: number, state: any) => sum + state.cities.length, 0)} cities
                    </div>
                </div>

                <!-- Onboarding Progress -->
                <div class="section">
                    <h2>🎯 User Onboarding Funnel Analysis</h2>
                    <div class="highlight">
                        <strong>Completion:</strong> ${onboardingAnalysis.completionRate}% | <strong>Steps:</strong> ${onboardingAnalysis.totalSteps} | <strong>Pipeline:</strong> ${onboardingAnalysis.stepBreakdown.reduce((sum: number, step: any) => sum + step.userCount, 0).toLocaleString()}
                    </div>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Step</th>
                                <th>Step Name</th>
                                <th>Users</th>
                                <th>Percentage</th>
                                <th>Drop-off</th>
                                <th>Progress Visual</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${onboardingAnalysis.stepBreakdown
                              .map((step: any, index: number) => {
                                const nextStep =
                                  onboardingAnalysis.stepBreakdown[index + 1];
                                const dropoff = nextStep
                                  ? (
                                      ((step.userCount - nextStep.userCount) /
                                        step.userCount) *
                                      100
                                    ).toFixed(1)
                                  : 0;

                                return `
                                    <tr>
                                        <td><strong>Step ${step.step}</strong></td>
                                        <td><strong>${step.stepLabel}</strong></td>
                                        <td>${step.userCount.toLocaleString()}</td>
                                        <td>${step.percentage}%</td>
                                        <td>${dropoff}%</td>
                                        <td>
                                            <div class="progress-bar">
                                                <div class="progress-fill" style="width: ${step.percentage}%"></div>
                                            </div>
                                        </td>
                                    </tr>
                                  `;
                              })
                              .join("")}
                        </tbody>
                    </table>
                    
                    <div class="insight">
                        <strong>🔍 Bottleneck:</strong> ${onboardingAnalysis.stepBreakdown.sort((a: any, b: any) => b.userCount - a.userCount)[0]?.stepLabel || "N/A"} | 
                        <strong>Completed:</strong> ${onboardingAnalysis.stepBreakdown.find((s: any) => s.step === 12)?.userCount || 0} users
                    </div>
                </div>

                <!-- Collection Analysis -->
                <div class="section">
                    <h2>💰 Collection Analysis</h2>
                    <div class="highlight">
                        <strong>Portfolio:</strong> ${collectionAnalysis.summary.totalLoans.toLocaleString()} loans | 
                        <strong>Obligation:</strong> ₹${collectionAnalysis.summary.totalObligation.toLocaleString()} | 
                        <strong>Collection Rate:</strong> ${collectionAnalysis.summary.paymentSummary.collectionRate}%
                    </div>
                    <div class="metrics-grid">
                        <div class="metric-card">
                            <div class="metric-value">₹${collectionAnalysis.summary.paymentSummary.totalCollected.toLocaleString()}</div>
                            <div class="metric-label">Total Collected</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">₹${collectionAnalysis.summary.paymentSummary.outstandingAmount.toLocaleString()}</div>
                            <div class="metric-label">Outstanding</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${collectionAnalysis.summary.paymentSummary.collectionRate}%</div>
                            <div class="metric-label">Collection Rate</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">₹${Math.round(collectionAnalysis.summary.averageObligation).toLocaleString()}</div>
                            <div class="metric-label">Avg Obligation</div>
                        </div>
                    </div>
                    
                    <h3 style="font-size: 16px; margin-top: 20px;">Status Breakdown</h3>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Count</th>
                                <th>Total Obligation</th>
                                <th>Avg Obligation</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${collectionAnalysis.statusBreakdown
                              .slice(0, 8)
                              .map(
                                (status: any) => `
                                <tr>
                                    <td><strong>${status.status}</strong></td>
                                    <td>${status.count.toLocaleString()}</td>
                                    <td>₹${status.totalObligation.toLocaleString()}</td>
                                    <td>₹${Math.round(status.averageObligation).toLocaleString()}</td>
                                </tr>
                            `,
                              )
                              .join("")}
                        </tbody>
                    </table>
                    
                    <h3 style="font-size: 16px; margin-top: 25px;">📋 Detailed Loans by Status (Top 10 per status)</h3>
                    ${collectionAnalysis.statusBreakdown
                      .slice(0, 3)
                      .map(
                        (status: any) => `
                        <div style="margin: 15px 0;">
                            <h4 style="font-size: 14px; color: #667eea; margin: 10px 0;">Status: ${status.status} (${status.count} loans)</h4>
                            <table class="table" style="font-size: 13px;">
                                <thead>
                                    <tr>
                                        <th>Loan ID</th>
                                        <th>Customer</th>
                                        <th>Principal</th>
                                        <th>Obligation</th>
                                        <th>Collected</th>
                                        <th>Outstanding</th>
                                        <th>Rate</th>
                                        <th>Due Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${(status.loans || [])
                                      .slice(0, 10)
                                      .map(
                                        (loan: any) => `
                                        <tr>
                                            <td><strong>${loan.formattedLoanId || "N/A"}</strong></td>
                                            <td>${loan.customerName || "N/A"}<br><small style="color: #666;">${loan.phoneNumber || ""}</small></td>
                                            <td>₹${loan.principal?.toLocaleString() || 0}</td>
                                            <td>₹${loan.obligation?.toLocaleString() || 0}</td>
                                            <td>₹${loan.paymentSummary?.totalCollected?.toLocaleString() || 0}</td>
                                            <td>₹${loan.paymentSummary?.outstandingAmount?.toLocaleString() || 0}</td>
                                            <td>${loan.paymentSummary?.collectionRate || 0}%</td>
                                            <td>${loan.dueDate ? new Date(loan.dueDate).toLocaleDateString() : "N/A"}</td>
                                        </tr>
                                    `,
                                      )
                                      .join("")}
                                </tbody>
                            </table>
                        </div>
                    `,
                      )
                      .join("")}
                    
                    <h3 style="font-size: 16px; margin-top: 25px;">Loan Type Breakdown</h3>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Loan Type</th>
                                <th>Count</th>
                                <th>Total Principal</th>
                                <th>Avg Principal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${collectionAnalysis.loanTypeBreakdown
                              .slice(0, 5)
                              .map(
                                (loanType: any) => `
                                <tr>
                                    <td><strong>${loanType.loanType}</strong></td>
                                    <td>${loanType.count.toLocaleString()}</td>
                                    <td>₹${loanType.totalPrincipal.toLocaleString()}</td>
                                    <td>₹${Math.round(loanType.totalPrincipal / loanType.count).toLocaleString()}</td>
                                </tr>
                            `,
                              )
                              .join("")}
                        </tbody>
                    </table>
                    
                    <h3 style="font-size: 16px; margin-top: 20px;">Top States by Collection</h3>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>State</th>
                                <th>Loan Count</th>
                                <th>Total Amount</th>
                                <th>Total Collected</th>
                                <th>Collection %</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${collectionAnalysis.locationBreakdown
                              .slice(0, 5)
                              .map(
                                (location: any) => `
                                <tr>
                                    <td><strong>${location.state}</strong></td>
                                    <td>${location.count.toLocaleString()}</td>
                                    <td>₹${location.totalAmount.toLocaleString()}</td>
                                    <td>₹${location.totalCollected.toLocaleString()}</td>
                                    <td>${location.totalAmount > 0 ? ((location.totalCollected / location.totalAmount) * 100).toFixed(1) : 0}%</td>
                                </tr>
                            `,
                              )
                              .join("")}
                        </tbody>
                    </table>
                    
                    <h3 style="font-size: 16px; margin-top: 20px;">Due Date Distribution</h3>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Due Month</th>
                                <th>Loan Count</th>
                                <th>Total Amount</th>
                                <th>Total Collected</th>
                                <th>Collection %</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${collectionAnalysis.dueDateBreakdown
                              .slice(0, 6)
                              .map(
                                (dueDate: any) => `
                                <tr>
                                    <td><strong>${dueDate.month}</strong></td>
                                    <td>${dueDate.count.toLocaleString()}</td>
                                    <td>₹${dueDate.totalAmount.toLocaleString()}</td>
                                    <td>₹${dueDate.totalCollected.toLocaleString()}</td>
                                    <td>${dueDate.totalAmount > 0 ? ((dueDate.totalCollected / dueDate.totalAmount) * 100).toFixed(1) : 0}%</td>
                                </tr>
                            `,
                              )
                              .join("")}
                        </tbody>
                    </table>
                    
                    <div class="insight">
                        <strong>💡 Collection Insights:</strong> 
                        Total Principal Paid: ₹${collectionAnalysis.summary.paymentSummary.totalPrincipalPaid.toLocaleString()} | 
                        Total Fees: ₹${collectionAnalysis.summary.paymentSummary.totalFeesPaid.toLocaleString()} | 
                        Total Penalties: ₹${collectionAnalysis.summary.paymentSummary.totalPenaltiesPaid.toLocaleString()} | 
                        Discounts Given: ₹${collectionAnalysis.summary.paymentSummary.totalDiscounts.toLocaleString()}
                    </div>
                    
                    <h3 style="font-size: 16px; margin-top: 25px;">📋 Detailed Loans by Type (Top 10 per type)</h3>
                    ${collectionAnalysis.loanTypeBreakdown
                      .slice(0, 3)
                      .map(
                        (loanType: any) => `
                        <div style="margin: 15px 0;">
                            <h4 style="font-size: 14px; color: #667eea; margin: 10px 0;">Type: ${loanType.loanType} (${loanType.count} loans)</h4>
                            <table class="table" style="font-size: 13px;">
                                <thead>
                                    <tr>
                                        <th>Loan ID</th>
                                        <th>Customer</th>
                                        <th>Principal</th>
                                        <th>Obligation</th>
                                        <th>Collected</th>
                                        <th>Outstanding</th>
                                        <th>Rate</th>
                                        <th>Due Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${(loanType.loans || [])
                                      .slice(0, 10)
                                      .map(
                                        (loan: Loan) => `
                                        <tr>
                                            <td><strong>${loan.formattedLoanId || "N/A"}</strong></td>
                                            <td>₹${loan.amount?.toLocaleString() || 0}</td>
                                        </tr>
                                    `,
                                      )
                                      .join("")}
                                </tbody>
                            </table>
                        </div>
                    `,
                      )
                      .join("")}
                    
                    <h3 style="font-size: 16px; margin-top: 25px;">📋 Detailed Loans by Location (Top 10 per state)</h3>
                    ${collectionAnalysis.locationBreakdown
                      .slice(0, 3)
                      .map(
                        (location: any) => `
                        <div style="margin: 15px 0;">
                            <h4 style="font-size: 14px; color: #667eea; margin: 10px 0;">State: ${location.state} (${location.count} loans)</h4>
                            <table class="table" style="font-size: 13px;">
                                <thead>
                                    <tr>
                                        <th>Loan ID</th>
                                        <th>Customer</th>
                                        <th>Principal</th>
                                        <th>Obligation</th>
                                        <th>Collected</th>
                                        <th>Outstanding</th>
                                        <th>Rate</th>
                                        <th>Due Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${(location.loans || [])
                                      .slice(0, 10)
                                      .map(
                                        (loan: any) => `
                                        <tr>
                                            <td><strong>${loan.formattedLoanId || "N/A"}</strong></td>
                                            <td>${loan.customerName || "N/A"}<br><small style="color: #666;">${loan.phoneNumber || ""}</small></td>
                                            <td>₹${loan.principal?.toLocaleString() || 0}</td>
                                            <td>₹${loan.obligation?.toLocaleString() || 0}</td>
                                            <td>₹${loan.paymentSummary?.totalCollected?.toLocaleString() || 0}</td>
                                            <td>₹${loan.paymentSummary?.outstandingAmount?.toLocaleString() || 0}</td>
                                            <td>${loan.paymentSummary?.collectionRate || 0}%</td>
                                            <td>${loan.dueDate ? new Date(loan.dueDate).toLocaleDateString() : "N/A"}</td>
                                        </tr>
                                    `,
                                      )
                                      .join("")}
                                </tbody>
                            </table>
                        </div>
                    `,
                      )
                      .join("")}
                    
                    <h3 style="font-size: 16px; margin-top: 25px;">📋 Detailed Loans by Due Date (Top 10 per month)</h3>
                    ${collectionAnalysis.dueDateBreakdown
                      .slice(0, 3)
                      .map(
                        (dueDate: any) => `
                        <div style="margin: 15px 0;">
                            <h4 style="font-size: 14px; color: #667eea; margin: 10px 0;">Due Month: ${dueDate.month} (${dueDate.count} loans)</h4>
                            <table class="table" style="font-size: 13px;">
                                <thead>
                                    <tr>
                                        <th>Loan ID</th>
                                        <th>Customer</th>
                                        <th>Principal</th>
                                        <th>Obligation</th>
                                        <th>Collected</th>
                                        <th>Outstanding</th>
                                        <th>Rate</th>
                                        <th>Due Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${(dueDate.loans || [])
                                      .slice(0, 10)
                                      .map(
                                        (loan: any) => `
                                        <tr>
                                            <td><strong>${loan.formattedLoanId || "N/A"}</strong></td>
                                            <td>${loan.customerName || "N/A"}<br><small style="color: #666;">${loan.phoneNumber || ""}</small></td>
                                            <td>₹${loan.principal?.toLocaleString() || 0}</td>
                                            <td>₹${loan.obligation?.toLocaleString() || 0}</td>
                                            <td>₹${loan.paymentSummary?.totalCollected?.toLocaleString() || 0}</td>
                                            <td>₹${loan.paymentSummary?.outstandingAmount?.toLocaleString() || 0}</td>
                                            <td>${loan.paymentSummary?.collectionRate || 0}%</td>
                                            <td>${loan.dueDate ? new Date(loan.dueDate).toLocaleDateString() : "N/A"}</td>
                                        </tr>
                                    `,
                                      )
                                      .join("")}
                                </tbody>
                            </table>
                        </div>
                    `,
                      )
                      .join("")}
                </div>

                <!-- Loan Allocation Analysis -->
                <div class="section">
                    <h2>👥 Loan Allocation Analysis</h2>
                    <div class="highlight">
                        <strong>Total Loans:</strong> ${loanAllocationAnalysis.summary.totalLoans.toLocaleString()} | 
                        <strong>Allocated:</strong> ${loanAllocationAnalysis.summary.allocatedCount.toLocaleString()} (${loanAllocationAnalysis.summary.allocationPercentage}%) | 
                        <strong>Unallocated:</strong> ${loanAllocationAnalysis.summary.unallocatedCount.toLocaleString()}
                    </div>
                    
                    <h3 style="font-size: 16px; margin-top: 15px;">Team Hierarchy Summary</h3>
                    <div class="metrics-grid">
                        <div class="metric-card">
                            <div class="metric-value">${loanAllocationAnalysis.hierarchy.executives.count}</div>
                            <div class="metric-label">Executives</div>
                            <small style="color: #666;">${loanAllocationAnalysis.hierarchy.executives.totalLoans} loans, ₹${loanAllocationAnalysis.hierarchy.executives.totalAmount.toLocaleString()}</small>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${loanAllocationAnalysis.hierarchy.managers.count}</div>
                            <div class="metric-label">Managers</div>
                            <small style="color: #666;">${loanAllocationAnalysis.hierarchy.managers.totalLoans} loans, ₹${loanAllocationAnalysis.hierarchy.managers.totalAmount.toLocaleString()}</small>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${loanAllocationAnalysis.hierarchy.heads.count}</div>
                            <div class="metric-label">Heads</div>
                            <small style="color: #666;">${loanAllocationAnalysis.hierarchy.heads.totalLoans} loans, ₹${loanAllocationAnalysis.hierarchy.heads.totalAmount.toLocaleString()}</small>
                        </div>
                    </div>
                    
                    <h3 style="font-size: 16px; margin-top: 20px;">Top Allocated Partners</h3>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Partner Name</th>
                                <th>Role</th>
                                <th>Total Loans</th>
                                <th>Total Amount</th>
                                <th>Reports To</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${loanAllocationAnalysis.topAllocations
                              .map(
                                (allocation: any) => `
                                <tr>
                                    <td><strong>${allocation.partnerUser.name}</strong><br><small style="color: #666;">${allocation.partnerUser.email}</small></td>
                                    <td>
                                        <span class="status-badge ${
                                          allocation.role === "head"
                                            ? "status-approved"
                                            : allocation.role === "manager"
                                              ? "status-pending"
                                              : "status-rejected"
                                        }">
                                            ${allocation.role.toUpperCase()}
                                        </span>
                                    </td>
                                    <td>${allocation.totalLoans.toLocaleString()}</td>
                                    <td>₹${allocation.totalAmount.toLocaleString()}</td>
                                    <td>${allocation.managerName || "N/A"}</td>
                                </tr>
                            `,
                              )
                              .join("")}
                        </tbody>
                    </table>
                    
                    <div class="insight">
                        <strong>📊 Allocation Insights:</strong> 
                        Allocation Rate: ${loanAllocationAnalysis.summary.allocationPercentage}% | 
                        Allocated Amount: ₹${loanAllocationAnalysis.summary.allocatedAmount.toLocaleString()} | 
                        Unallocated Amount: ₹${loanAllocationAnalysis.summary.unallocatedAmount.toLocaleString()} | 
                        Team Size: ${loanAllocationAnalysis.hierarchy.executives.count + loanAllocationAnalysis.hierarchy.managers.count + loanAllocationAnalysis.hierarchy.heads.count} members
                    </div>
                </div>

                <!-- Performance Summary -->
                <div class="section">
                    <h2>📊 Performance Summary</h2>
                    <div class="two-column">
                        <div>
                            <h3 style="font-size: 16px;">🎯 Key Ratios</h3>
                            <ul class="compact-list">
                                <li><strong>Conversion:</strong> ${summary.totalUsers > 0 ? ((summary.totalLoans / summary.totalUsers) * 100).toFixed(1) : 0}%</li>
                                <li><strong>Loan Types:</strong> ${Object.keys(summary.loanTypeBreakdown || {}).length}</li>
                                <li><strong>Geographic:</strong> ${locationAnalysis.totalStates} states</li>
                                <li><strong>Companies:</strong> ${companyAnalysis.totalCompanies}</li>
                                <li><strong>Onboarding:</strong> ${onboardingAnalysis.completionRate}%</li>
                            </ul>
                        </div>
                        <div>
                            <h3 style="font-size: 16px;">💡 Intelligence</h3>
                            <ul class="compact-list">
                                <li><strong>Avg/User:</strong> ₹${summary.totalUsers > 0 ? Math.round(summary.totalLoanAmount / summary.totalUsers).toLocaleString() : 0}</li>
                                <li><strong>Top State:</strong> ${locationAnalysis.topStates[0] ? ((locationAnalysis.topStates[0].totalUsers / locationAnalysis.totalUsers) * 100).toFixed(1) : 0}%</li>
                                <li><strong>Avg/Company:</strong> ${companyAnalysis.totalUsers > 0 ? (companyAnalysis.totalUsers / companyAnalysis.totalCompanies).toFixed(1) : 0}</li>
                                <li><strong>Subdomains:</strong> ${subdomainAnalysis.totalSubdomains}</li>
                                <li><strong>Statuses:</strong> ${Object.keys(summary.loanStatusBreakdown || {}).length}</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="footer">
                <h3 style="color: #667eea; margin-top: 0; font-size: 16px;">📈 Report Summary</h3>
                <div style="background: #e8ecff; padding: 10px; border-radius: 4px; margin: 10px 0; font-size: 13px;">
                    <strong>📊 ${brand.name}</strong> | ${brand.domain || "N/A"} | ${reportData.reportDate} | 
                    ${summary.totalUsers + summary.totalLoans + locationAnalysis.totalUsers + companyAnalysis.totalUsers} records
                </div>
                <p style="color: #666; font-size: 11px; margin: 10px 0;">
                    Automated daily business intelligence report. Contact analytics team for customizations.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;

    return {
      subject,
      html,
      // Removed JSON attachment as requested
    };
  }
  async getDisbursementAnalysis(brandId: string, query: DashboardStatsDto) {
    try {
      const dateRange = this.getDateRange(query);
      const loanFilterType = query.loanFilterType || "both"; // 'new', 'repeat', or 'both'

      // Get all historical loans first to determine new vs repeat cases
      const allHistoricalLoans = await this.prisma.loan.findMany({
        where: {
          brandId,
          isActive: true,
          disbursementDate: { not: null },
          status: {
            in: [
              loan_status_enum.DISBURSED,
              loan_status_enum.ACTIVE,
              loan_status_enum.PARTIALLY_PAID,
              loan_status_enum.PAID,
              loan_status_enum.COMPLETED,
              loan_status_enum.POST_ACTIVE,
              loan_status_enum.WRITE_OFF,
              loan_status_enum.SETTLED,
              loan_status_enum.DEFAULTED,
              loan_status_enum.OVERDUE,
            ],
          },
        },
        select: {
          id: true,
          userId: true,
          disbursementDate: true,
        },
        orderBy: {
          disbursementDate: "asc",
        },
      });

      // Get all loans with disbursement details
      let loans = await this.prisma.loan.findMany({
        where: {
          brandId,
          isActive: true,
          user: {
            isActive: true,
          },
          ...(dateRange.dateFilter && {
            disbursementDate: dateRange.dateFilter,
          }),
          status: {
            in: [
              loan_status_enum.DISBURSED,
              loan_status_enum.ACTIVE,
              loan_status_enum.PARTIALLY_PAID,
              loan_status_enum.PAID,
              loan_status_enum.COMPLETED,
              loan_status_enum.POST_ACTIVE,
              loan_status_enum.WRITE_OFF,
              loan_status_enum.SETTLED,
              loan_status_enum.DEFAULTED,
              loan_status_enum.OVERDUE,
            ],
          },
        },
        select: {
          id: true,
          formattedLoanId: true,
          amount: true,
          status: true,
          loanType: true,
          disbursementDate: true,
          createdAt: true,
          is_repeat_loan: true,
          userId: true,
          user: {
            select: {
              id: true,
              formattedUserId: true,
              phoneNumber: true,
              userDetails: {
                select: {
                  firstName: true,
                  lastName: true,
                  city: true,
                  state: true,
                },
              },
            },
          },
          disbursement: true,
          repayment: true,
          allottedPartners: {
            select: {
              id: true,
              partnerUserId: true,
              amount: true,
              partnerUser: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  reportsToId: true,
                  reportsTo: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      // Filter loans based on loanFilterType
      if (loanFilterType !== "both") {
        loans = loans.filter((loan) => {
          // Use the is_repeat_loan flag from the database instead of comparing timestamps
          const isRepeatLoan = loan.is_repeat_loan === true;

          if (loanFilterType === "new") {
            return !isRepeatLoan; // New loans have is_repeat_loan = false
          } else if (loanFilterType === "repeat") {
            return isRepeatLoan; // Repeat loans have is_repeat_loan = true
          }
          return true;
        });
      }

      // Fetch all disbursal transactions for the filtered loans
      const loanIds = loans.map((loan) => loan.id);
      const disbursalTransactions =
        await this.prisma.paymentDisbursalTransaction.findMany({
          where: {
            paymentRequest: {
              loanId: {
                in: loanIds,
              },
            },
            status: "SUCCESS",
          },
          select: {
            id: true,
            amount: true,
            completedAt: true,
            paymentRequest: {
              select: {
                loanId: true,
              },
            },
          },
        });

      // Create a map of loan ID to total disbursal amount
      const loanDisbursalMap = new Map<string, number>();
      disbursalTransactions.forEach((txn) => {
        const loanId = txn.paymentRequest.loanId;
        const amount = Number(txn.amount) || 0;
        loanDisbursalMap.set(
          loanId,
          (loanDisbursalMap.get(loanId) || 0) + amount,
        );
      });

      // Group by disbursement date (month)
      const disbursementByDateMap = new Map<
        string,
        {
          month: string;
          count: number;
          totalAmount: number;
          loans: any[];
        }
      >();

      // Group by status
      const disbursementByStatusMap = new Map<
        string,
        {
          status: string;
          count: number;
          totalAmount: number;
        }
      >();

      // Group by loan type
      const disbursementByTypeMap = new Map<
        string,
        {
          loanType: string;
          count: number;
          totalAmount: number;
        }
      >();

      // Group by state
      const disbursementByStateMap = new Map<
        string,
        {
          state: string;
          count: number;
          totalAmount: number;
        }
      >();

      // Group by executive (loan allotted partner user)
      const disbursementByExecutiveMap = new Map<
        string,
        {
          executiveId: string;
          executiveName: string;
          executiveEmail: string;
          role: string;
          managerName?: string;
          count: number;
          totalAmount: number;
        }
      >();

      // First, get all partner users to determine hierarchy relationships
      const allPartnerUsers = await this.prisma.partnerUser.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          reportsToId: true,
        },
      });

      // Create a map of subordinates for each partner user
      const subordinatesMap = new Map<string, string[]>();
      allPartnerUsers.forEach((user) => {
        if (user.reportsToId) {
          if (!subordinatesMap.has(user.reportsToId)) {
            subordinatesMap.set(user.reportsToId, []);
          }
          subordinatesMap.get(user.reportsToId)?.push(user.id);
        }
      });

      // Build map for user first loan ID for daily performance calculation
      const userFirstLoanIdMap = new Map<string, string>();
      allHistoricalLoans.forEach((loan) => {
        if (!userFirstLoanIdMap.has(loan.userId)) {
          userFirstLoanIdMap.set(loan.userId, loan.id);
        }
      });

      const dailyPerformanceMap = new Map<
        string,
        {
          date: string;
          newCase: number;
          repeatCases: number;
          totalCases: number;
          loanAmount: number;
          pfAmount: number;
          disbursalAmount: number;
          repayAmount: number;
        }
      >();

      loans.forEach((loan) => {
        const amount = loan.amount || 0;
        const month = loan.disbursementDate
          ? _dayjs(loan.disbursementDate).tz("Asia/Kolkata").format("YYYY-MM")
          : "No Date";
        const status = loan.status || "Unknown";
        const loanType = loan.loanType || "Unknown";
        const state = loan.user?.userDetails?.state || "Unknown";

        // By date
        if (!disbursementByDateMap.has(month)) {
          disbursementByDateMap.set(month, {
            month,
            count: 0,
            totalAmount: 0,
            loans: [],
          });
        }
        const dateData = disbursementByDateMap.get(month);
        if (dateData) {
          dateData.count += 1;
          dateData.totalAmount += amount;
          dateData.loans.push({
            id: loan.id,
            formattedLoanId: loan.formattedLoanId,
            amount,
            status,
            loanType,
            disbursementDate: loan.disbursementDate,
            customerName: `${loan.user?.userDetails?.firstName || ""} ${
              loan.user?.userDetails?.lastName || ""
            }`.trim(),
            customerId: loan.user?.formattedUserId,
            phoneNumber: loan.user?.phoneNumber,
          });
        }

        // By status
        if (!disbursementByStatusMap.has(status)) {
          disbursementByStatusMap.set(status, {
            status,
            count: 0,
            totalAmount: 0,
          });
        }
        const statusData = disbursementByStatusMap.get(status);
        if (statusData) {
          statusData.count += 1;
          statusData.totalAmount += amount;
        }

        // By type
        if (!disbursementByTypeMap.has(loanType)) {
          disbursementByTypeMap.set(loanType, {
            loanType,
            count: 0,
            totalAmount: 0,
          });
        }
        const typeData = disbursementByTypeMap.get(loanType);
        if (typeData) {
          typeData.count += 1;
          typeData.totalAmount += amount;
        }

        // By state
        if (!disbursementByStateMap.has(state)) {
          disbursementByStateMap.set(state, {
            state,
            count: 0,
            totalAmount: 0,
          });
        }
        const stateData = disbursementByStateMap.get(state);
        if (stateData) {
          stateData.count += 1;
          stateData.totalAmount += amount;
        }

        // By executive (loan allotted partner user)
        if (loan.allottedPartners && loan.allottedPartners.length > 0) {
          loan.allottedPartners.forEach((allottedPartner) => {
            const executiveId = allottedPartner.partnerUserId;
            const executiveName =
              allottedPartner.partnerUser?.name || "Unknown";
            const executiveEmail = allottedPartner.partnerUser?.email || "";
            const loanAmount = loan.amount || 0;

            // Determine role based on hierarchy
            let role = "Unassigned";
            let managerName: string | undefined = undefined;

            if (allottedPartner.partnerUser?.reportsToId) {
              role = "Credit Executive";
              // Get manager name from reportsTo relationship
              managerName =
                allottedPartner.partnerUser.reportsTo?.name || undefined;
            } else if (subordinatesMap.has(executiveId)) {
              // Check if this user has subordinates (manager)
              role = "Section Manager";
            } else {
              role = "Section Head";
            }

            const key = executiveId;
            if (!disbursementByExecutiveMap.has(key)) {
              disbursementByExecutiveMap.set(key, {
                executiveId,
                executiveName,
                executiveEmail,
                role,
                managerName,
                count: 0,
                totalAmount: 0,
              });
            }
            const executiveData = disbursementByExecutiveMap.get(key);
            if (executiveData) {
              executiveData.count += 1;
              executiveData.totalAmount += loanAmount;
            }
          });
        } else {
          // Handle unallocated loans (loans without allottedPartners)
          const unallocatedKey = "UNALLOCATED";
          if (!disbursementByExecutiveMap.has(unallocatedKey)) {
            disbursementByExecutiveMap.set(unallocatedKey, {
              executiveId: unallocatedKey,
              executiveName: "Unallocated",
              executiveEmail: "",
              role: "Unallocated",
              count: 0,
              totalAmount: 0,
            });
          }
          const unallocatedData =
            disbursementByExecutiveMap.get(unallocatedKey);
          if (unallocatedData) {
            unallocatedData.count += 1;
            unallocatedData.totalAmount += amount;
          }
        }

        // Daily performance calculation
        if (loan.disbursementDate) {
          // Convert disbursement date to IST before formatting
          const date = _dayjs(loan.disbursementDate)
            .tz("Asia/Kolkata")
            .format("YYYY-MM-DD");

          // Get the correct disbursal amount from PaymentDisbursalTransaction
          const loanAmount = loan.amount || 0;
          const disbursalAmount = loanDisbursalMap.get(loan.id) || 0;
          const pfAmount = loan.disbursement?.totalDeductions || 0;
          const repayAmount = loan.repayment?.totalObligation || 0;

          if (!dailyPerformanceMap.has(date)) {
            dailyPerformanceMap.set(date, {
              date,
              newCase: 0,
              repeatCases: 0,
              totalCases: 0,
              loanAmount: 0,
              pfAmount: 0,
              disbursalAmount: 0,
              repayAmount: 0,
            });
          }

          const dayData = dailyPerformanceMap.get(date);
          if (dayData) {
            // Check if this is a new case (use is_repeat_loan from database)
            const isNewCase = loan.is_repeat_loan !== true;

            if (isNewCase) {
              dayData.newCase += 1;
            } else {
              dayData.repeatCases += 1;
            }

            dayData.totalCases += 1;
            dayData.loanAmount += loanAmount;
            dayData.pfAmount += pfAmount;
            dayData.disbursalAmount += disbursalAmount;
            dayData.repayAmount += repayAmount;
          }
        }
      });

      // Convert to arrays and sort
      const disbursementByDate = Array.from(
        disbursementByDateMap.values(),
      ).sort((a, b) => a.month.localeCompare(b.month));

      const disbursementByStatus = Array.from(disbursementByStatusMap.values())
        .map((item) => ({
          ...item,
          percentage:
            loans.length > 0
              ? Number(((item.count / loans.length) * 100).toFixed(1))
              : 0,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount);

      const disbursementByType = Array.from(disbursementByTypeMap.values())
        .map((item) => ({
          ...item,
          percentage:
            loans.length > 0
              ? Number(((item.count / loans.length) * 100).toFixed(1))
              : 0,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount);

      const disbursementByState = Array.from(
        disbursementByStateMap.values(),
      ).sort((a, b) => b.totalAmount - a.totalAmount);

      // Calculate totals based on filtered loans
      const totalDisbursements = loans.length;
      const totalAmount = loans.reduce(
        (sum, loan) => sum + (loan.amount || 0),
        0,
      );
      const averageAmount =
        totalDisbursements > 0 ? totalAmount / totalDisbursements : 0;

      const disbursementByExecutive = Array.from(
        disbursementByExecutiveMap.values(),
      )
        .map((item) => ({
          ...item,
          percentage:
            totalDisbursements > 0
              ? Number(((item.count / totalDisbursements) * 100).toFixed(1))
              : 0,
          averageAmount: item.count > 0 ? item.totalAmount / item.count : 0,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount);

      const dailyPerformance = Array.from(dailyPerformanceMap.values()).sort(
        (a, b) => a.date.localeCompare(b.date),
      );

      return {
        summary: {
          totalDisbursements,
          totalAmount,
          averageAmount,
          loanFilterType, // Include the filter type in response
        },
        dailyPerformance,
        disbursementByDate,
        disbursementByStatus,
        disbursementByType,
        disbursementByState,
        disbursementByExecutive: disbursementByExecutive || [],
        dateRange: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          period: query.period || "all",
        },
      };
    } catch (error) {
      this.logger.error(
        `Error fetching disbursement analysis for brand ${brandId}:`,
        error,
      );
      throw error;
    }
  }
  async getPartnerUserLeadsStats(brandId: string, query: DashboardStatsDto) {
    try {
      const dateRange = this.getDateRange(query);
      const users = await this.prisma.user.findMany({
        where: {
          brandId,
          isActive: true,
          createdAt: dateRange.dateFilter,
        },
        select: {
          id: true,
          createdAt: true,
          allocated_partner_user_id: true,
          status_id: true,
          is_terms_accepted: true,
          occupation_type_id: true,
        },
      });
      const allPartnerUsers = await this.prisma.partnerUser.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          reportsToId: true,
          reportsTo: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      const partnerUserMap = new Map<string, any>();
      allPartnerUsers.forEach((pu) => {
        partnerUserMap.set(pu.id, pu);
      });

      interface PartnerStats {
        partnerUserId: string;
        name: string;
        email: string;
        role: PartnerRole;
        managerName?: string;
        managerId?: string;
        totalLeads: number;
        directLeads: number;
        teamLeads: number;
        directPending: number;
        directHold: number;
        directRejected: number;
        directActive: number;
        pending: number;
        hold: number;
        rejected: number;
        active: number;
      }

      const partnerStatsMap = new Map<string, PartnerStats>();
      const subordinatesMap = new Map<string, Set<string>>();
      const unassignedStats = {
        totalLeads: 0,
        pending: 0,
        hold: 0,
        rejected: 0,
        active: 0,
      };

      users.forEach((user) => {
        // Determine user status based on status_id
        // Check if user is BLOCKED or SUSPENDED (rejected statuses)
        const isRejected =
          Number(user?.status_id) === UserStatusEnum.BLOCKED ||
          Number(user?.status_id) === UserStatusEnum.SUSPENDED;
        
        const accountStatus = isRejected ? "REJECTED" : "PENDING";
        const partnerUserId = user.allocated_partner_user_id;

        if (!partnerUserId) {
          // Unassigned user
          unassignedStats.totalLeads++;
          unassignedStats[accountStatus.toLowerCase()] =
            (unassignedStats[accountStatus.toLowerCase()] || 0) + 1;
          return;
        }

        const partner = partnerUserMap.get(partnerUserId);

        // Initialize partner stats if not exists
        if (!partnerStatsMap.has(partnerUserId)) {
          let role: PartnerRole;
          let managerName: string | undefined;
          let managerId: string | undefined;

          if (partner.reportsToId) {
            role = "executive";
            managerName = partner.reportsTo?.name;
            managerId = partner.reportsToId;

            // Track subordinate relationship
            if (!subordinatesMap.has(partner.reportsToId)) {
              subordinatesMap.set(partner.reportsToId, new Set());
            }
            subordinatesMap.get(partner.reportsToId)!.add(partnerUserId);
          } else {
            role = "head";
          }

          partnerStatsMap.set(partnerUserId, {
            partnerUserId,
            name: partner.name,
            email: partner.email,
            role,
            managerName,
            managerId,
            totalLeads: 0,
            directLeads: 0,
            teamLeads: 0,
            pending: 0,
            hold: 0,
            rejected: 0,
            active: 0,
            directPending: 0,
            directHold: 0,
            directRejected: 0,
            directActive: 0,
          });
        }

        // Update stats
        const stats = partnerStatsMap.get(partnerUserId)!;
        stats.directLeads++;
        stats.totalLeads++;

        const statusKey = accountStatus.toLowerCase() as
          | "pending"
          | "hold"
          | "rejected"
          | "active";
        stats[statusKey]++;
        stats[
          `direct${accountStatus.charAt(0) + accountStatus.slice(1).toLowerCase()}`
        ]++;
      });

      partnerStatsMap.forEach((stats, partnerId) => {
        if (stats.role === "head" && subordinatesMap.has(partnerId)) {
          stats.role = "manager";
        }
      });

      const processedManagers = new Set<string>();

      subordinatesMap.forEach((subordinateIds, managerId) => {
        if (processedManagers.has(managerId)) return;

        const managerStats = partnerStatsMap.get(managerId);
        if (!managerStats) return;

        subordinateIds.forEach((subId) => {
          const subStats = partnerStatsMap.get(subId);
          if (subStats) {
            managerStats.teamLeads += subStats.totalLeads;
            managerStats.totalLeads += subStats.totalLeads;
            managerStats.pending += subStats.pending;
            managerStats.hold += subStats.hold;
            managerStats.rejected += subStats.rejected;
            managerStats.active += subStats.active;
          }
        });

        processedManagers.add(managerId);
      });

      const partnerUserStats = Array.from(partnerStatsMap.values())
        .map((stats) => {
          const totalLeads = stats.totalLeads || 1; // Avoid division by zero
          return {
            ...stats,
            conversionRate: Number(
              ((stats.active / totalLeads) * 100).toFixed(1),
            ),
            pendingPercentage: Number(
              ((stats.pending / totalLeads) * 100).toFixed(1),
            ),
            rejectionRate: Number(
              ((stats.rejected / totalLeads) * 100).toFixed(1),
            ),
          };
        })
        .sort((a, b) => b.totalLeads - a.totalLeads);

      // Add unassigned if exists
      const partnerUserStatsWithUnassigned = [...partnerUserStats];
      if (unassignedStats.totalLeads > 0) {
        const total = unassignedStats.totalLeads;
        partnerUserStatsWithUnassigned.push({
          partnerUserId: "NOT_ASSIGNED",
          name: "Not Assigned",
          email: "-",
          role: "executive" as const,
          managerName: undefined,
          managerId: undefined,
          totalLeads: total,
          directLeads: total,
          teamLeads: 0,
          pending: unassignedStats.pending,
          hold: unassignedStats.hold,
          rejected: unassignedStats.rejected,
          active: unassignedStats.active,
          conversionRate: Number(
            ((unassignedStats.active / total) * 100).toFixed(1),
          ),
          pendingPercentage: Number(
            ((unassignedStats.pending / total) * 100).toFixed(1),
          ),
          rejectionRate: Number(
            ((unassignedStats.rejected / total) * 100).toFixed(1),
          ),
          directPending: unassignedStats.pending,
          directHold: unassignedStats.hold,
          directRejected: unassignedStats.rejected,
          directActive: unassignedStats.active,
        });
      }

      let execCount = 0,
        execLeads = 0,
        execPending = 0,
        execHold = 0,
        execRejected = 0,
        execActive = 0;
      let mgrCount = 0,
        mgrLeads = 0,
        mgrPending = 0,
        mgrHold = 0,
        mgrRejected = 0,
        mgrActive = 0;
      let headCount = 0,
        headLeads = 0,
        headPending = 0,
        headHold = 0,
        headRejected = 0,
        headActive = 0;

      let totalDirectPending = unassignedStats.pending;
      let totalDirectHold = unassignedStats.hold;
      let totalDirectRejected = unassignedStats.rejected;
      let totalDirectActive = unassignedStats.active;

      partnerUserStats.forEach((stat) => {
        const directPending = stat.directPending;
        const directHold = stat.directHold;
        const directRejected = stat.directRejected;
        const directActive = stat.directActive;

        totalDirectPending += directPending;
        totalDirectHold += directHold;
        totalDirectRejected += directRejected;
        totalDirectActive += directActive;

        if (stat.role === "executive") {
          execCount++;
          execLeads += stat.totalLeads;
          execPending += stat.pending;
          execHold += stat.hold;
          execRejected += stat.rejected;
          execActive += stat.active;
        } else if (stat.role === "manager") {
          mgrCount++;
          mgrLeads += stat.totalLeads;
          mgrPending += stat.pending;
          mgrHold += stat.hold;
          mgrRejected += stat.rejected;
          mgrActive += stat.active;
        } else {
          headCount++;
          headLeads += stat.totalLeads;
          headPending += stat.pending;
          headHold += stat.hold;
          headRejected += stat.rejected;
          headActive += stat.active;
        }
      });

      const totalLeads = users.length;
      const totalPartnerUsers = partnerStatsMap.size;

      return {
        summary: {
          totalPartnerUsers,
          totalLeads,
          totalPending: totalDirectPending,
          totalHold: totalDirectHold,
          totalRejected: totalDirectRejected,
          totalActive: totalDirectActive,
          unassignedLeads: unassignedStats.totalLeads,
          overallConversionRate:
            totalLeads > 0
              ? Number(((totalDirectActive / totalLeads) * 100).toFixed(1))
              : 0,
          overallRejectionRate:
            totalLeads > 0
              ? Number(((totalDirectRejected / totalLeads) * 100).toFixed(1))
              : 0,
        },
        hierarchyBreakdown: {
          executives: {
            count: execCount,
            totalLeads: execLeads,
            pending: execPending,
            hold: execHold,
            rejected: execRejected,
            active: execActive,
          },
          managers: {
            count: mgrCount,
            totalLeads: mgrLeads,
            pending: mgrPending,
            hold: mgrHold,
            rejected: mgrRejected,
            active: mgrActive,
          },
          heads: {
            count: headCount,
            totalLeads: headLeads,
            pending: headPending,
            hold: headHold,
            rejected: headRejected,
            active: headActive,
          },
        },
        partnerUserStats: partnerUserStatsWithUnassigned,
        dateRange: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          period: query.period || "all",
        },
      };
    } catch (error) {
      this.logger.error(
        `Error fetching partner user leads stats for brand ${brandId}:`,
        error,
      );
      throw error;
    }
  }
  async getPerformanceByCompany(brandId: string, query: DashboardStatsDto) {
    try {
      const dateRange = this.getDateRange(query);

      // Get all disbursed loans with company information
      const loans = await this.prisma.loan.findMany({
        where: {
          brandId,
          isActive: true,
          disbursementDate: dateRange.dateFilter,
          status: {
            in: [
              loan_status_enum.ACTIVE,
              loan_status_enum.POST_ACTIVE,
              loan_status_enum.PAID,
              loan_status_enum.PARTIALLY_PAID,
              loan_status_enum.COMPLETED,
            ],
          },
          user: {
            isActive: true,
            employment: {
              companyName: {
                not: null,
              },
            },
          },
        },
        select: {
          id: true,
          amount: true,
          status: true,
          disbursementDate: true,
          user: {
            select: {
              id: true,
              employment: {
                select: {
                  companyName: true,
                },
              },
            },
          },
          loanDetails: {
            select: {
              dueDate: true,
            },
          },
          paymentRequests: {
            select: {
              collectionTransactions: {
                where: {
                  status: "SUCCESS",
                  opsApprovalStatus: "APPROVED",
                },
                select: {
                  amount: true,
                  principalAmount: true,
                },
              },
              partialCollectionTransactions: {
                where: {
                  status: "SUCCESS",
                  opsApprovalStatus: "APPROVED",
                },
                select: {
                  amount: true,
                  principalAmount: true,
                },
              },
            },
          },
          repayment: {
            select: {
              totalObligation: true,
            },
          },
        },
      });

      interface CompanyPerformance {
        companyName: string;
        totalDisbursed: number;
        disbursedAmount: number;
        totalObligation: number;
        totalCollected: number;
        collectionEfficiency: number;
      }
      const companyPerformanceMap = new Map<string, CompanyPerformance>();

      for (const loan of loans) {
        const companyName =
          loan.user?.employment?.companyName || "Unknown Company";
        const disbursedAmount = loan.amount || 0;

        // Calculate total collected from payment transactions
        let totalCollected = 0;
        loan.paymentRequests?.forEach((paymentRequest) => {
          paymentRequest.collectionTransactions?.forEach((transaction) => {
            totalCollected += Number(transaction.amount) || 0;
          });
          paymentRequest.partialCollectionTransactions?.forEach(
            (transaction) => {
              totalCollected += Number(transaction.amount) || 0;
            },
          );
        });

        // Get obligation from repayment
        const totalObligation = loan.repayment?.totalObligation || 0;

        // Initialize company stats if not exists
        if (!companyPerformanceMap.has(companyName)) {
          companyPerformanceMap.set(companyName, {
            companyName,
            totalDisbursed: 0,
            disbursedAmount: 0,
            totalObligation: 0,
            totalCollected: 0,
            collectionEfficiency: 0,
          });
        }

        // Update stats
        const stats = companyPerformanceMap.get(companyName)!;
        stats.totalDisbursed += 1;
        stats.disbursedAmount += disbursedAmount;
        stats.totalObligation += totalObligation;
        stats.totalCollected += totalCollected;
      }

      // Calculate collection efficiency for each company
      const companyPerformance = Array.from(companyPerformanceMap.values())
        .map((stats) => ({
          ...stats,
          collectionEfficiency:
            stats.totalObligation > 0
              ? Number(
                  (
                    (stats.totalCollected / stats.totalObligation) *
                    100
                  ).toFixed(2),
                )
              : 0,
        }))
        .sort((a, b) => b.disbursedAmount - a.disbursedAmount) // Sort by disbursed amount
        .slice(0, 15); // Top 15 companies

      // Calculate totals
      const totalDisbursed = companyPerformance.reduce(
        (sum, c) => sum + c.totalDisbursed,
        0,
      );
      const totalObligation = companyPerformance.reduce(
        (sum, c) => sum + c.totalObligation,
        0,
      );
      const totalCollected = companyPerformance.reduce(
        (sum, c) => sum + c.totalCollected,
        0,
      );
      const overallCollectionEfficiency =
        totalObligation > 0
          ? Number(((totalCollected / totalObligation) * 100).toFixed(2))
          : 0;

      return {
        summary: {
          totalCompanies: companyPerformance.length,
          totalDisbursed,
          overallCollectionEfficiency,
        },
        companyPerformance,
        dateRange: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          period: query.period || "all",
        },
      };
    } catch (error) {
      this.logger.error(
        `Error fetching performance by company for brand ${brandId}:`,
        error,
      );
      throw error;
    }
  }
}
