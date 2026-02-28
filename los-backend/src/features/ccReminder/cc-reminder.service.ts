import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { EmailService } from "src/core/communication/services/email.service";
import { LoansService } from "src/features/loans/services/loans.services";
import { loan_status_enum } from "@prisma/client";
import {
  CcReminderQueryDto,
  CcReminderReportData,
  CcReminderEmailData,
} from "./dto/cc-reminder.dto";
import {
  LoanReportQueryDto,
  LoanReportData,
  CombinedReportData,
} from "./dto/loan-report.dto";
import {
  PaymentReportQueryDto,
  PaymentReportData,
  DisbursedLoanReportQueryDto,
  DisbursedLoanReportData,
} from "./dto/payment-report.dto";
import * as dayjs from "dayjs";

const _dayjs = dayjs.default;
@Injectable()
export class CcReminderService {
  private readonly logger = new Logger(CcReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly loansService: LoansService
  ) {}

  private buildDateCondition(
    startDate?: string,
    endDate?: string,
    dateFilter?: string
  ): {
    gte?: Date;
    lte?: Date;
    lt?: Date;
  } {
    if (dateFilter) {
      const today = _dayjs().format("YYYY-MM-DD");

      switch (dateFilter) {
        case "today": {
          return {
            gte: new Date(today + "T00:00:00.000Z"),
            lt: new Date(
              _dayjs(today).add(1, "day").format("YYYY-MM-DD") +
                "T00:00:00.000Z"
            ),
          };
        }
        case "yesterday": {
          const yesterday = _dayjs().subtract(1, "day").format("YYYY-MM-DD");
          return {
            gte: new Date(yesterday + "T00:00:00.000Z"),
            lt: new Date(today + "T00:00:00.000Z"),
          };
        }
        case "last7days": {
          return {
            gte: new Date(
              _dayjs().subtract(7, "days").format("YYYY-MM-DD") +
                "T00:00:00.000Z"
            ),
          };
        }
        case "last30days": {
          return {
            gte: new Date(
              _dayjs().subtract(30, "days").format("YYYY-MM-DD") +
                "T00:00:00.000Z"
            ),
          };
        }
        default: {
          // Return empty condition for unrecognized filter
          return {};
        }
      }
    } else if (startDate || endDate) {
      const condition: { gte?: Date; lte?: Date } = {};

      if (startDate && endDate) {
        condition.gte = new Date(startDate + "T00:00:00.000Z");
        condition.lte = new Date(endDate + "T23:59:59.999Z");
      } else if (startDate) {
        condition.gte = new Date(startDate + "T00:00:00.000Z");
      } else if (endDate) {
        condition.lte = new Date(endDate + "T23:59:59.999Z");
      }

      return condition;
    }

    return {};
  }

  private buildLoginWhereClause(query: CcReminderQueryDto) {
    const { startDate, endDate, userEmail, brandId } = query;

    interface LoginWhereClause {
      partner_user: {
        email: {
          notIn: string[];
          equals?: string;
        };
        brandRoles?: {
          some: {
            brandId: string;
          };
        };
      };
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
    }

    const whereClause: LoginWhereClause = {
      partner_user: {
        email: {
          notIn: ['super@8byte.ai', 'ab@8byte.ai'],
        },
      },
    };

    if (userEmail) {
      whereClause.partner_user.email.equals = userEmail;
    }

    if (brandId) {
      whereClause.partner_user.brandRoles = {
        some: {
          brandId: brandId,
        },
      };
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      
      if (startDate && endDate) {
        whereClause.createdAt.gte = new Date(startDate + "T00:00:00.000Z");
        whereClause.createdAt.lte = new Date(endDate + "T23:59:59.999Z");
      } else if (startDate) {
        whereClause.createdAt.gte = new Date(startDate + "T00:00:00.000Z");
      } else if (endDate) {
        whereClause.createdAt.lte = new Date(endDate + "T23:59:59.999Z");
      }
    }

    return whereClause;
  }

  private convertToIST(date: Date) {
    return _dayjs(date).add(5, 'hour').add(30, 'minute');
  }

  private groupLoginTokens(loginTokens: any[]) {
    const groupedData = new Map<string, {
      userEmail: string;
      loginDate: string;
      logins: Array<{
        createdAt: Date;
        isLogoutAt: Date | null;
        deviceId: string | null;
      }>;
    }>();

    for (const token of loginTokens) {
      const loginDateIST = this.convertToIST(token.createdAt);
      const loginDate = loginDateIST.format('YYYY-MM-DD');
      const key = `${token.partner_user.email}_${loginDate}`;

      if (!groupedData.has(key)) {
        groupedData.set(key, {
          userEmail: token.partner_user.email,
          loginDate,
          logins: [],
        });
      }

      const existingData = groupedData.get(key);
      if (existingData) {
        existingData.logins.push({
          createdAt: token.createdAt,
          isLogoutAt: token.isLogoutAt,
          deviceId: token.deviceId,
        });
      }
    }

    return groupedData;
  }

  private formatLoginData(groupedData: Map<string, any>): CcReminderReportData[] {
    const result: CcReminderReportData[] = [];
    
    for (const [_, data] of groupedData) {
      if (data.logins.length === 0) continue;

      const loginTimes = data.logins.map(login => this.convertToIST(login.createdAt));
      const firstLogin = loginTimes.reduce((earliest, current) => 
        current.isBefore(earliest) ? current : earliest, loginTimes[0]
      );
      const lastLogin = loginTimes.reduce((latest, current) => 
        current.isAfter(latest) ? current : latest, loginTimes[0]
      );

      const sessions = data.logins.map(login => {
        const loginTimeIST = this.convertToIST(login.createdAt);
        const logoutTimeIST = login.isLogoutAt ? this.convertToIST(login.isLogoutAt) : null;

        return `Login: ${loginTimeIST.format('hh:mm:ss A')} | Logout: ${
          logoutTimeIST ? logoutTimeIST.format('hh:mm:ss A') : 'N/A'
        } | Device: ${login.deviceId || 'N/A'}`;
      }).join('\n');

      result.push({
        userEmail: data.userEmail,
        loginDate: data.loginDate,
        totalSessions: data.logins.length,
        firstLoginIST: firstLogin.format('hh:mm:ss A'),
        lastLoginIST: lastLogin.format('hh:mm:ss A'),
        sessions,
      });
    }

    return result.sort((a, b) => {
      if (a.userEmail !== b.userEmail) {
        return a.userEmail.localeCompare(b.userEmail);
      }
      return b.loginDate.localeCompare(a.loginDate);
    });
  }

  async getLoginReport(query: CcReminderQueryDto = {}): Promise<CcReminderReportData[]> {
    try {
      this.logger.log("Executing CC reminder login report query using Prisma");

      const whereClause = this.buildLoginWhereClause(query);

      const loginTokens = await this.prisma.partnerLoginToken.findMany({
        where: whereClause,
        include: {
          partner_user: {
            select: {
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const groupedData = this.groupLoginTokens(loginTokens);
      const result = this.formatLoginData(groupedData);

      this.logger.log(`Successfully generated login report with ${result.length} records`);
      return result;

    } catch (error) {
      this.logger.error("Error executing CC reminder login report query:", error);
      throw new Error(`Failed to generate CC reminder login report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getTodayLoginReport(): Promise<CcReminderReportData[]> {
    const today = _dayjs().format("YYYY-MM-DD");
    return this.getLoginReport({
      startDate: today,
      endDate: today,
    });
  }

  async getYesterdayLoginReport(): Promise<CcReminderReportData[]> {
    const yesterday = _dayjs().subtract(1, "day").format("YYYY-MM-DD");
    return this.getLoginReport({
      startDate: yesterday,
      endDate: yesterday,
    });
  }

  async getLoanReport(
    query: LoanReportQueryDto = {}
  ): Promise<LoanReportData[]> {
    const { startDate, endDate, brandId, dueDateFilter } = query;

    try {
      this.logger.log("Executing loan report query using Prisma");

      // Build where conditions
      interface LoanWhereClause {
        isActive: boolean;
        status: {
          in: (
            | "DISBURSED"
            | "ACTIVE"
            | "POST_ACTIVE"
            | "OVERDUE"
            | "PARTIALLY_PAID"
            | "DEFAULTED"
          )[];
        };
        brandId: string;
        loanDetails?: {
          dueDate?: {
            gte?: Date;
            lte?: Date;
            lt?: Date;
          };
        };
      }

      const whereClause: LoanWhereClause = {
        isActive: true,
        status: {
          in: [
            "DISBURSED",
            "ACTIVE",
            "POST_ACTIVE",
            "OVERDUE",
            "PARTIALLY_PAID",
            "DEFAULTED",
          ],
        },
        brandId: brandId || "",
      };

      // Due date filtering using loan_details.dueDate
      if (dueDateFilter) {
        const today = _dayjs().format("YYYY-MM-DD");
        let filterDate: string;

        switch (dueDateFilter) {
          case "today":
            filterDate = today;
            break;
          case "yesterday":
            filterDate = _dayjs().subtract(1, "day").format("YYYY-MM-DD");
            break;
          case "tomorrow":
            filterDate = _dayjs().add(1, "day").format("YYYY-MM-DD");
            break;
          default:
            filterDate = today;
        }

        whereClause.loanDetails = {
          dueDate: {
            gte: new Date(filterDate + "T00:00:00.000Z"),
            lt: new Date(
              _dayjs(filterDate).add(1, "day").format("YYYY-MM-DD") +
                "T00:00:00.000Z"
            ),
          },
        };
      } else if (startDate || endDate) {
        whereClause.loanDetails = {};

        if (startDate && endDate) {
          whereClause.loanDetails.dueDate = {
            gte: new Date(startDate + "T00:00:00.000Z"),
            lte: new Date(endDate + "T23:59:59.999Z"),
          };
        } else if (startDate) {
          whereClause.loanDetails.dueDate = {
            gte: new Date(startDate + "T00:00:00.000Z"),
          };
        } else if (endDate) {
          whereClause.loanDetails.dueDate = {
            lte: new Date(endDate + "T23:59:59.999Z"),
          };
        }
      }

      const loans = await this.prisma.loan.findMany({
        where: whereClause,
        include: {
          user: {
            include: {
              userDetails: true,
            },
          },
          brand: true,
          loanDetails: true,
          repayment: true,
          penalties: true,
        },
        orderBy: [{ createdAt: "desc" }, { loanDetails: { dueDate: "asc" } }],
      });

      const loanReports = await Promise.all(
        loans.map(async (loan) => {
          const now = new Date();
          const dueDate = loan.loanDetails?.dueDate;
          const daysToDue = dueDate
            ? Math.ceil(
                (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
              )
            : 0;
          const isOverdue = dueDate
            ? dueDate < now && loan.status !== "PAID"
            : false;

          let repaymentStatus = loan.status;

          const penaltyAmount = loan.penalties.reduce(
            (sum, penalty) => sum + penalty.chargeValue,
            0
          );
          const userName = loan.user.userDetails
            ? `${loan.user.userDetails.firstName || ""} ${loan.user.userDetails.lastName || ""}`.trim() ||
              loan.user.email ||
              ""
            : loan.user.email || "";

          // Calculate amount due exactly like in normal flow
          let amountDue = 0;

          if (this.loansService) {
            // Use the loans service if available
            if (
              loan.status === loan_status_enum.ACTIVE ||
              loan.status === loan_status_enum.DISBURSED ||
              loan.status === loan_status_enum.OVERDUE ||
              loan.status === loan_status_enum.POST_ACTIVE ||
              loan.status === loan_status_enum.DEFAULTED
            ) {
              const currentRepayment = await this.loansService.currentRepayment(
                loan.user.id,
                loan.id,
                _dayjs()
              );
              amountDue = Number(currentRepayment?.totalRepayment) || 0;
            } else if (loan.status === loan_status_enum.PARTIALLY_PAID) {
              const partialCollection =
                await this.loansService.partialCollection(
                  loan.userId,
                  loan.id,
                  0,
                  _dayjs()
                );
              amountDue = Number(partialCollection?.amount) || 0;
            }
          } else if (
            loan.status === loan_status_enum.ACTIVE ||
            loan.status === loan_status_enum.OVERDUE
          ) {
            // Fallback: Calculate amount due directly using Prisma
            // Use the total obligation from repayment table, or calculate basic amount + interest + penalty
            amountDue = loan.repayment?.totalObligation
              ? Number(loan.repayment.totalObligation)
              : Number(loan.amount) + penaltyAmount;
          } else if (loan.status === loan_status_enum.PARTIALLY_PAID) {
            // For partially paid loans, calculate remaining amount after payments
            const paidAmount =
              await this.prisma.paymentCollectionTransaction.aggregate({
                where: {
                  paymentRequest: {
                    loanId: loan.id,
                  },
                  status: "SUCCESS",
                },
                _sum: {
                  amount: true,
                },
              });

            const partialPaidAmount =
              await this.prisma.paymentPartialCollectionTransaction.aggregate({
                where: {
                  paymentRequest: {
                    loanId: loan.id,
                  },
                  status: "SUCCESS",
                },
                _sum: {
                  amount: true,
                },
              });

            const totalPaid =
              Number(paidAmount._sum.amount || 0) +
              Number(partialPaidAmount._sum.amount || 0);
            const totalObligation = loan.repayment?.totalObligation
              ? Number(loan.repayment.totalObligation)
              : Number(loan.amount) + penaltyAmount;

            amountDue = Math.max(0, totalObligation - totalPaid);
          } else {
            // For other statuses, use total obligation or loan amount
            amountDue = loan.repayment?.totalObligation
              ? Number(loan.repayment.totalObligation)
              : Number(loan.amount);
          }

          return {
            loanId: loan.id,
            formattedLoanId: loan.formattedLoanId,
            userId: loan.userId,
            userEmail: loan.user.email,
            userName,
            userPhone: loan.user.phoneNumber,
            brandName: loan.brand.name,
            amount: Number(loan.amount),
            amountDue,
            status: loan.status,
            disbursementDate: loan.disbursementDate
              ? _dayjs(loan.disbursementDate).format("YYYY-MM-DD")
              : null,
            dueDate: dueDate ? _dayjs(dueDate).format("YYYY-MM-DD") : null,
            daysToDue,
            repaymentStatus,
            isOverdue,
            createdAt: _dayjs(loan.createdAt).format("YYYY-MM-DD HH:mm:ss"),
          };
        })
      );

      return loanReports;
    } catch (error) {
      this.logger.error("Error executing loan report query:", error);
      throw new Error("Failed to generate loan report");
    }
  }

  async getTodayDueLoansReport(): Promise<LoanReportData[]> {
    return this.getLoanReport({ dueDateFilter: "today" });
  }

  async getYesterdayDueLoansReport(): Promise<LoanReportData[]> {
    return this.getLoanReport({ dueDateFilter: "yesterday" });
  }

  async getTomorrowDueLoansReport(): Promise<LoanReportData[]> {
    return this.getLoanReport({ dueDateFilter: "tomorrow" });
  }

  async getPaymentReport(
    query: PaymentReportQueryDto = {}
  ): Promise<PaymentReportData[]> {
    const { startDate, endDate, brandId, dateFilter } = query;

    try {
      this.logger.log("Executing payment report query using Prisma");

      // Build date filter conditions
      const dateCondition = this.buildDateCondition(
        startDate,
        endDate,
        dateFilter
      );

      // Get Payment Collection Transactions with APPROVED ops status
      const collectionTransactions =
        await this.prisma.paymentCollectionTransaction.findMany({
          where: {
            opsApprovalStatus: "APPROVED",
            ...(Object.keys(dateCondition).length > 0 && {
              createdAt: dateCondition,
            }),
            paymentRequest: {
              loan: {
                isActive: true,
                ...(brandId && { brandId }),
              },
            },
          },
          include: {
            paymentRequest: {
              include: {
                loan: {
                  include: {
                    user: {
                      include: {
                        userDetails: true,
                      },
                    },
                    brand: true,
                    loanDetails: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

      // Get Payment Partial Collection Transactions with APPROVED ops status
      const partialCollectionTransactions =
        await this.prisma.paymentPartialCollectionTransaction.findMany({
          where: {
            opsApprovalStatus: "APPROVED",
            ...(Object.keys(dateCondition).length > 0 && {
              createdAt: dateCondition,
            }),
            paymentRequest: {
              loan: {
                isActive: true,
                ...(brandId && { brandId }),
              },
            },
          },
          include: {
            paymentRequest: {
              include: {
                loan: {
                  include: {
                    user: {
                      include: {
                        userDetails: true,
                      },
                    },
                    brand: true,
                    loanDetails: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

      // Combine and format results
      const allPayments: PaymentReportData[] = [];

      // Process collection transactions
      collectionTransactions.forEach((transaction) => {
        const loan = transaction.paymentRequest.loan;
        const user = loan.user;
        const userName = user.userDetails
          ? `${user.userDetails.firstName || ""} ${user.userDetails.lastName || ""}`.trim() ||
            user.email ||
            ""
          : user.email || "";

        allPayments.push({
          paymentId: transaction.id,
          loanId: loan.id,
          formattedLoanId: loan.formattedLoanId,
          userId: loan.userId,
          userEmail: user.email,
          userName,
          userPhone: user.phoneNumber,
          brandName: loan.brand.name,
          loanAmount: Number(loan.amount),
          paymentAmount: Number(transaction.amount),
          paymentDate: _dayjs(transaction.createdAt).format("YYYY-MM-DD"),
          paymentMethod: transaction.method,
          paymentStatus: transaction.status,
          transactionId: transaction.receiptId,
          gatewayResponse: transaction.paymentDetails,
          loanStatus: loan.status,
          disbursementDate: loan.disbursementDate
            ? _dayjs(loan.disbursementDate).format("YYYY-MM-DD")
            : null,
          dueDate: loan.loanDetails?.dueDate
            ? _dayjs(loan.loanDetails.dueDate).format("YYYY-MM-DD")
            : null,
          createdAt: _dayjs(transaction.createdAt).format(
            "YYYY-MM-DD HH:mm:ss"
          ),
        });
      });

      // Process partial collection transactions
      partialCollectionTransactions.forEach((transaction) => {
        const loan = transaction.paymentRequest.loan;
        const user = loan.user;
        const userName = user.userDetails
          ? `${user.userDetails.firstName || ""} ${user.userDetails.lastName || ""}`.trim() ||
            user.email ||
            ""
          : user.email || "";

        allPayments.push({
          paymentId: transaction.id,
          loanId: loan.id,
          formattedLoanId: loan.formattedLoanId,
          userId: loan.userId,
          userEmail: user.email,
          userName,
          userPhone: user.phoneNumber,
          brandName: loan.brand.name,
          loanAmount: Number(loan.amount),
          paymentAmount: Number(transaction.amount),
          paymentDate: _dayjs(transaction.createdAt).format("YYYY-MM-DD"),
          paymentMethod: transaction.method,
          paymentStatus: transaction.status,
          transactionId: transaction.receiptId,
          gatewayResponse: transaction.paymentDetails,
          loanStatus: loan.status,
          disbursementDate: loan.disbursementDate
            ? _dayjs(loan.disbursementDate).format("YYYY-MM-DD")
            : null,
          dueDate: loan.loanDetails?.dueDate
            ? _dayjs(loan.loanDetails.dueDate).format("YYYY-MM-DD")
            : null,
          createdAt: _dayjs(transaction.createdAt).format(
            "YYYY-MM-DD HH:mm:ss"
          ),
        });
      });

      // Sort by creation date descending
      return allPayments.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      this.logger.error("Error executing payment report query:", error);
      throw new Error("Failed to generate payment report");
    }
  }

  async getYesterdayPaymentReport(): Promise<PaymentReportData[]> {
    return this.getPaymentReport({ dateFilter: "yesterday" });
  }

  async getTodayPaymentReport(): Promise<PaymentReportData[]> {
    return this.getPaymentReport({ dateFilter: "today" });
  }

  async getDisbursedLoanReport(
    query: DisbursedLoanReportQueryDto = {}
  ): Promise<DisbursedLoanReportData[]> {
    const { startDate, endDate, brandId, dateFilter } = query;

    try {
      this.logger.log("Executing disbursed loan report query using Prisma");

      // Build where conditions
      interface DisbursedLoanWhereClause {
        isActive: boolean;
        status: {
          in: (
            | "ACTIVE"
            | "POST_ACTIVE"
            | "PAID"
            | "OVERDUE"
            | "PARTIALLY_PAID"
            | "DEFAULTED"
            | "DISBURSED"
          )[];
        };
        brandId: string;
        disbursementDate?: {
          not: null;
          gte?: Date;
          lte?: Date;
          lt?: Date;
        };
        paymentRequests?: {
          some: {
            type: "DISBURSEMENT";
            disbursalTransactions: {
              some: {
                status: "SUCCESS";
              };
            };
          };
        };
      }

      const whereClause: DisbursedLoanWhereClause = {
        isActive: true,
        status: {
          in: [
            "ACTIVE",
            "POST_ACTIVE",
            "PAID",
            "OVERDUE",
            "PARTIALLY_PAID",
            "DEFAULTED",
            "DISBURSED",
          ],
        },
        disbursementDate: {
          not: null,
        },
        brandId: brandId || "",
        // Check for successful payment disbursement transaction
        paymentRequests: {
          some: {
            type: "DISBURSEMENT",
            disbursalTransactions: {
              some: {
                status: "SUCCESS",
              },
            },
          },
        },
      };

      // if (brandId) {
      //   whereClause.brandId = brandId;
      // }

      // Date filtering for disbursement
      const dateCondition = this.buildDateCondition(
        startDate,
        endDate,
        dateFilter
      );
      if (Object.keys(dateCondition).length > 0) {
        whereClause.disbursementDate = {
          not: null,
          ...dateCondition,
        };
      }

      const loans = await this.prisma.loan.findMany({
        where: whereClause,
        include: {
          user: {
            include: {
              userDetails: true,
            },
          },
          brand: true,
          loanDetails: true,
        },
        orderBy: [{ disbursementDate: "desc" }, { createdAt: "desc" }],
      });

      return loans.map((loan) => {
        const userName = loan.user.userDetails
          ? `${loan.user.userDetails.firstName || ""} ${loan.user.userDetails.lastName || ""}`.trim() ||
            loan.user.email ||
            ""
          : loan.user.email || "";

        return {
          loanId: loan.id,
          formattedLoanId: loan.formattedLoanId,
          userId: loan.userId,
          userEmail: loan.user.email,
          userName,
          userPhone: loan.user.phoneNumber,
          brandName: loan.brand.name,
          amount: Number(loan.amount),
          status: loan.status,
          disbursementDate: loan.disbursementDate
            ? _dayjs(loan.disbursementDate).format("YYYY-MM-DD")
            : null,
          disbursementTime: loan.disbursementDate
            ? _dayjs(loan.disbursementDate).format("HH:mm:ss")
            : null,
          dueDate: loan.loanDetails?.dueDate
            ? _dayjs(loan.loanDetails.dueDate).format("YYYY-MM-DD")
            : null,
          purpose: loan.purpose,
          createdAt: _dayjs(loan.createdAt).format("YYYY-MM-DD HH:mm:ss"),
        };
      });
    } catch (error) {
      this.logger.error("Error executing disbursed loan report query:", error);
      throw new Error("Failed to generate disbursed loan report");
    }
  }

  async getYesterdayDisbursedLoanReport(): Promise<DisbursedLoanReportData[]> {
    return this.getDisbursedLoanReport({ dateFilter: "yesterday" });
  }

  async getTodayDisbursedLoanReport(): Promise<DisbursedLoanReportData[]> {
    return this.getDisbursedLoanReport({ dateFilter: "today" });
  }

  async getCombinedReport(
    query: {
      loginQuery?: CcReminderQueryDto;
      loanQuery?: LoanReportQueryDto;
    } = {}
  ): Promise<CombinedReportData> {
    const { loginQuery = {}, loanQuery = {} } = query;

    try {
      this.logger.log("Generating combined login and loan report");

      // Get login and loan reports in parallel
      const [loginReport, loanReport] = await Promise.all([
        this.getLoginReport(loginQuery),
        this.getLoanReport(loanQuery),
      ]);

      // Calculate additional loan reports for summary
      const [todayDueLoans, yesterdayDueLoans, tomorrowDueLoans] =
        await Promise.all([
          this.getTodayDueLoansReport(),
          this.getYesterdayDueLoansReport(),
          this.getTomorrowDueLoansReport(),
        ]);

      const summary = {
        totalLogins: loginReport.length,
        totalLoans: loanReport.length,
        todayDueLoans: todayDueLoans.length,
        yesterdayDueLoans: yesterdayDueLoans.length,
        tomorrowDueLoans: tomorrowDueLoans.length,
        overdueLoans: loanReport.filter((loan) => loan.isOverdue).length,
      };

      return {
        loginReport,
        loanReport,
        summary,
      };
    } catch (error) {
      this.logger.error("Error generating combined report:", error);
      throw new Error("Failed to generate combined report");
    }
  }

  private generateEmailContent(data: CcReminderEmailData): {
    html: string;
    text: string;
  } {
    const { reportData, generatedAt, dateRange } = data;

    let dateRangeText = "All Time";
    if (dateRange?.startDate && dateRange?.endDate) {
      if (dateRange.startDate === dateRange.endDate) {
        dateRangeText = `Date: ${dateRange.startDate}`;
      } else {
        dateRangeText = `Date Range: ${dateRange.startDate} to ${dateRange.endDate}`;
      }
    } else if (dateRange?.startDate) {
      dateRangeText = `From: ${dateRange.startDate}`;
    } else if (dateRange?.endDate) {
      dateRangeText = `Until: ${dateRange.endDate}`;
    }

    // HTML Content
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { background-color: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .report-info { margin-bottom: 20px; }
          .user-report { margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
          .user-email { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 10px; }
          .summary { display: flex; gap: 20px; margin-bottom: 15px; }
          .summary-item { background-color: #f9f9f9; padding: 10px; border-radius: 3px; }
          .sessions-detail { background-color: #f5f5f5; padding: 10px; border-radius: 3px; font-family: monospace; white-space: pre-line; font-size: 12px; }
          .no-data { color: #666; font-style: italic; text-align: center; padding: 40px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔐 Partner User Login Report</h1>
          <div class="report-info">
            <strong>Generated:</strong> ${generatedAt}<br>
            <strong>Period:</strong> ${dateRangeText}<br>
            <strong>Total Records:</strong> ${reportData.length}
          </div>
        </div>

        ${
          reportData.length === 0
            ? `
          <div class="no-data">
            <h3>No login data found for the specified period.</h3>
          </div>
        `
            : reportData
                .map(
                  (user) => `
          <div class="user-report">
            <div class="user-email">👤 ${user.userEmail}</div>
            
            <div class="summary">
              <div class="summary-item">
                <strong>📅 Login Date:</strong><br>${user.loginDate}
              </div>
              <div class="summary-item">
                <strong>🔄 Total Sessions:</strong><br>${user.totalSessions}
              </div>
              <div class="summary-item">
                <strong>🌅 First Login:</strong><br>${user.firstLoginIST}
              </div>
              <div class="summary-item">
                <strong>🌙 Last Login:</strong><br>${user.lastLoginIST}
              </div>
            </div>

            <div>
              <strong>📊 Session Details:</strong>
              <div class="sessions-detail">${user.sessions}</div>
            </div>
          </div>
        `
                )
                .join("")
        }

        <div style="margin-top: 30px; padding: 15px; background-color: #e7f3ff; border-radius: 5px;">
          <small>
            <strong>Note:</strong> This report excludes system accounts (super@8byte.ai, ab@8byte.ai).
            All times are displayed in IST (Asia/Kolkata timezone).
          </small>
        </div>
      </body>
      </html>
    `;

    // Text Content
    const text = `
PARTNER USER LOGIN REPORT
=========================

Generated: ${generatedAt}
Period: ${dateRangeText}
Total Records: ${reportData.length}

${
  reportData.length === 0
    ? "No login data found for the specified period."
    : reportData
        .map(
          (user) => `
USER: ${user.userEmail}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Login Date: ${user.loginDate}
Total Sessions: ${user.totalSessions}
First Login (IST): ${user.firstLoginIST}
Last Login (IST): ${user.lastLoginIST}

Session Details:
${user.sessions}

`
        )
        .join("\n")
}

Note: This report excludes system accounts (super@8byte.ai, ab@8byte.ai).
All times are displayed in IST (Asia/Kolkata timezone).
    `.trim();

    return { html, text };
  }

  async sendCcReminderEmail(
    recipientEmails: string[],
    query: CcReminderQueryDto = {},
    customSubject?: string
  ): Promise<{
    success: boolean;
    reportData: CcReminderReportData[];
    message: string;
  }> {
    try {
      this.logger.log(
        `Generating CC reminder report for ${recipientEmails.length} recipients`
      );

      const reportData = await this.getLoginReport(query);

      const emailData: CcReminderEmailData = {
        subject:
          customSubject ||
          `🔐 Partner Login Report - ${_dayjs().format("DD/MM/YYYY")}`,
        recipientEmails,
        reportData,
        generatedAt: _dayjs().format("DD/MM/YYYY HH:mm:ss"),
        dateRange: {
          startDate: query.startDate,
          endDate: query.endDate,
        },
      };

      const { html, text } = this.generateEmailContent(emailData);

      for (const email of recipientEmails) {
        this.logger.log(`Sending CC reminder email to: ${email}`);

        const emailMessage = {
          to: email,
          name: "CC Reminder Report",
          subject: emailData.subject,
          html,
          text,
        };

        const success = await this.emailService.sendEmail(emailMessage);

        if (!success) {
          this.logger.error(`Failed to send CC reminder email to: ${email}`);
          throw new Error(`Failed to send email to ${email}`);
        }

        this.logger.log(`Successfully sent CC reminder email to: ${email}`);
      }

      const message = `Successfully sent CC reminder emails to ${recipientEmails.length} recipients with ${reportData.length} login records`;
      this.logger.log(message);

      return {
        success: true,
        reportData,
        message,
      };
    } catch (error) {
      this.logger.error("Error sending CC reminder email:", error);
      return {
        success: false,
        reportData: [],
        message: `Failed to send CC reminder email: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  async sendTodayCcReminderEmail(recipientEmails: string[]): Promise<{
    success: boolean;
    reportData: CcReminderReportData[];
    message: string;
  }> {
    const today = _dayjs().format("YYYY-MM-DD");
    const subject = `🔐 Today's Partner Login Report - ${_dayjs().format("DD/MM/YYYY")}`;

    return this.sendCcReminderEmail(
      recipientEmails,
      { startDate: today, endDate: today },
      subject
    );
  }

  async sendYesterdayCcReminderEmail(recipientEmails: string[], brandId: string): Promise<{
    success: boolean;
    reportData: CcReminderReportData[];
    message: string;
  }> {
    const yesterday = _dayjs().subtract(1, "day");
    const yesterdayStr = yesterday.format("YYYY-MM-DD");
    const subject = `🔐 Yesterday's Partner Login Report - ${yesterday.format("DD/MM/YYYY")}`;

    return this.sendCcReminderEmail(
      recipientEmails,
      { startDate: yesterdayStr, endDate: yesterdayStr, brandId },
      subject
    );
  }

  async sendCombinedReminderEmail(
    recipientEmails: string[],
    query: {
      loginQuery?: CcReminderQueryDto;
      loanQuery?: LoanReportQueryDto;
    } = {},
    customSubject?: string
  ): Promise<{
    success: boolean;
    combinedData: CombinedReportData;
    message: string;
  }> {
    try {
      this.logger.log(
        `Generating combined report for ${recipientEmails.length} recipients`
      );

      const combinedData = await this.getCombinedReport(query);

      const subject =
        customSubject ||
        `🔐📊 Combined Partner & Loan Report - ${_dayjs().format("DD/MM/YYYY")}`;

      const { html, text } = this.generateCombinedEmailContent({
        subject,
        recipientEmails,
        combinedData,
        generatedAt: _dayjs().format("DD/MM/YYYY HH:mm:ss"),
        query,
      });

      for (const email of recipientEmails) {
        this.logger.log(`Sending combined report email to: ${email}`);

        const emailMessage = {
          to: email,
          name: "Combined Report",
          subject,
          html,
          text,
        };

        const success = await this.emailService.sendEmail(emailMessage);

        if (!success) {
          this.logger.error(
            `Failed to send combined report email to: ${email}`
          );
          throw new Error(`Failed to send email to ${email}`);
        }

        this.logger.log(`Successfully sent combined report email to: ${email}`);
      }

      const message = `Successfully sent combined reports to ${recipientEmails.length} recipients with ${combinedData.loginReport.length} login records and ${combinedData.loanReport.length} loan records`;
      this.logger.log(message);

      return {
        success: true,
        combinedData,
        message,
      };
    } catch (error) {
      this.logger.error("Error sending combined report email:", error);
      return {
        success: false,
        combinedData: {
          loginReport: [],
          loanReport: [],
          summary: {
            totalLogins: 0,
            totalLoans: 0,
            todayDueLoans: 0,
            yesterdayDueLoans: 0,
            tomorrowDueLoans: 0,
            overdueLoans: 0,
          },
        },
        message: `Failed to send combined report email: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  private generateCombinedEmailContent(data: {
    subject: string;
    recipientEmails: string[];
    combinedData: CombinedReportData;
    generatedAt: string;
    query?: any;
  }): { html: string; text: string } {
    const { combinedData, generatedAt } = data;
    const { loginReport, loanReport, summary } = combinedData;

    // HTML Content
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { background-color: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
          .summary-card { background-color: #f9f9f9; padding: 15px; border-radius: 5px; text-align: center; }
          .summary-number { font-size: 24px; font-weight: bold; color: #2c5282; }
          .section { margin-bottom: 40px; }
          .section-title { font-size: 20px; font-weight: bold; margin-bottom: 15px; color: #333; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
          .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .table th, .table td { padding: 8px; border: 1px solid #ddd; text-align: left; font-size: 12px; }
          .table th { background-color: #f8f9fa; font-weight: bold; }
          .status-active { color: #10b981; font-weight: bold; }
          .status-overdue { color: #ef4444; font-weight: bold; }
          .status-paid { color: #6b7280; font-weight: bold; }
          .login-detail { background-color: #f5f5f5; padding: 8px; border-radius: 3px; font-family: monospace; white-space: pre-line; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔐📊 Combined Partner & Loan Report</h1>
          <p><strong>Generated:</strong> ${generatedAt}</p>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-number">${summary.totalLogins}</div>
            <div>Partner Logins</div>
          </div>
          <div class="summary-card">
            <div class="summary-number">${summary.totalLoans}</div>
            <div>Total Loans</div>
          </div>
          <div class="summary-card">
            <div class="summary-number" style="color: #f59e0b;">${summary.todayDueLoans}</div>
            <div>Due Today</div>
          </div>
          <div class="summary-card">
            <div class="summary-number" style="color: #8b5cf6;">${summary.tomorrowDueLoans}</div>
            <div>Due Tomorrow</div>
          </div>
          <div class="summary-card">
            <div class="summary-number" style="color: #ef4444;">${summary.overdueLoans}</div>
            <div>Overdue</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">💳 Loan Due Report</div>
          ${
            loanReport.length === 0
              ? "<p>No loan data found.</p>"
              : `
            <table class="table">
              <thead>
                <tr>
                  <th>Loan ID</th>
                  <th>User</th>
                  <th>Brand</th>
                  <th>Amount</th>
                  <th>Amount Due</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Repayment Status</th>
                </tr>
              </thead>
              <tbody>
                ${loanReport
                  .map(
                    (loan) => `
                  <tr>
                    <td>${loan.formattedLoanId || loan.loanId}</td>
                    <td>${loan.userName}<br><small>${loan.userEmail}</small></td>
                    <td>${loan.brandName}</td>
                    <td>₹${loan.amount.toLocaleString()}</td>
                    <td><strong>₹${loan.amountDue.toLocaleString()}</strong></td>
                    <td class="status-${loan.status.toLowerCase()}">${loan.status}</td>
                    <td>${loan.dueDate}</td>
                    <td class="status-${loan.repaymentStatus.toLowerCase().replace("_", "-")}">${loan.repaymentStatus}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          `
          }
        </div>

        <div class="section">
          <div class="section-title">🔐 Partner Login Activity</div>
          ${
            loginReport.length === 0
              ? "<p>No login data found.</p>"
              : loginReport
                  .map(
                    (user) => `
            <div style="margin-bottom: 20px; border: 1px solid #ddd; padding: 15px; border-radius: 5px;">
              <div style="font-weight: bold; margin-bottom: 10px;">👤 ${user.userEmail}</div>
              <div style="margin-bottom: 10px;">
                <strong>📅 Date:</strong> ${user.loginDate} | 
                <strong>🔄 Sessions:</strong> ${user.totalSessions} | 
                <strong>🌅 First:</strong> ${user.firstLoginIST} | 
                <strong>🌙 Last:</strong> ${user.lastLoginIST}
              </div>
              <div class="login-detail">${user.sessions}</div>
            </div>
          `
                  )
                  .join("")
          }
        </div>

        <div style="margin-top: 30px; padding: 15px; background-color: #e7f3ff; border-radius: 5px;">
          <small>
            <strong>Note:</strong> Login report excludes system accounts. 
            Loan due dates are calculated as disbursement date + 30 days (configurable).
            All times are in IST (Asia/Kolkata timezone).
          </small>
        </div>
      </body>
      </html>
    `;

    // Text Content
    const text = `
COMBINED PARTNER & LOAN REPORT
==============================

Generated: ${generatedAt}

SUMMARY
-------
Partner Logins: ${summary.totalLogins}
Total Loans: ${summary.totalLoans}
Due Today: ${summary.todayDueLoans}
Due Tomorrow: ${summary.tomorrowDueLoans}
Overdue: ${summary.overdueLoans}

LOAN DUE REPORT
===============
${
  loanReport.length === 0
    ? "No loan data found."
    : loanReport
        .map(
          (loan) => `
Loan ID: ${loan.formattedLoanId || loan.loanId}
User: ${loan.userName} (${loan.userEmail})
Brand: ${loan.brandName}
Amount: ₹${loan.amount.toLocaleString()}
Amount Due: ₹${loan.amountDue.toLocaleString()}
Status: ${loan.status}
Due Date: ${loan.dueDate}
Repayment Status: ${loan.repaymentStatus}
---
`
        )
        .join("")
}

PARTNER LOGIN ACTIVITY
======================
${
  loginReport.length === 0
    ? "No login data found."
    : loginReport
        .map(
          (user) => `
USER: ${user.userEmail}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Date: ${user.loginDate}
Total Sessions: ${user.totalSessions}
First Login: ${user.firstLoginIST}
Last Login: ${user.lastLoginIST}

Session Details:
${user.sessions}

`
        )
        .join("")
}

Note: Login report excludes system accounts. Loan due dates are calculated as disbursement date + 30 days.
All times are in IST (Asia/Kolkata timezone).
    `.trim();

    return { html, text };
  }

  async sendLoanDueEmail(
    recipientEmails: string[],
    query: LoanReportQueryDto = {},
    customSubject?: string
  ): Promise<{
    success: boolean;
    reportData: LoanReportData[];
    message: string;
  }> {
    try {
      this.logger.log(
        `Generating loan due report for ${recipientEmails.length} recipients`
      );

      const reportData = await this.getLoanReport(query);

      const subject =
        customSubject ||
        `💳 Loan Due Report - ${_dayjs().format("DD/MM/YYYY")}`;

      const { html, text } = this.generateLoanEmailContent({
        subject,
        recipientEmails,
        reportData,
        generatedAt: _dayjs().format("DD/MM/YYYY HH:mm:ss"),
        query,
      });

      for (const email of recipientEmails) {
        this.logger.log(`Sending loan due report email to: ${email}`);

        const emailMessage = {
          to: email,
          name: "Loan Due Report",
          subject,
          html,
          text,
        };

        const success = await this.emailService.sendEmail(emailMessage);

        if (!success) {
          this.logger.error(
            `Failed to send loan due report email to: ${email}`
          );
          throw new Error(`Failed to send email to ${email}`);
        }

        this.logger.log(`Successfully sent loan due report email to: ${email}`);
      }

      const message = `Successfully sent loan due reports to ${recipientEmails.length} recipients with ${reportData.length} loan records`;
      this.logger.log(message);

      return {
        success: true,
        reportData,
        message,
      };
    } catch (error) {
      this.logger.error("Error sending loan due report email:", error);
      return {
        success: false,
        reportData: [],
        message: `Failed to send loan due report email: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  private generateLoanEmailContent(data: {
    subject: string;
    recipientEmails: string[];
    reportData: LoanReportData[];
    generatedAt: string;
    query?: any;
  }): { html: string; text: string } {
    const { reportData, generatedAt } = data;

    // Calculate summary stats
    const todayDue = reportData.filter((loan) => {
      const today = _dayjs().format("YYYY-MM-DD");
      return loan.dueDate === today;
    });
    const overdue = reportData.filter((loan) => loan.isOverdue);
    const tomorrow = _dayjs().add(1, "day").format("YYYY-MM-DD");
    const tomorrowDue = reportData.filter((loan) => loan.dueDate === tomorrow);

    // HTML Content
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { background-color: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px; }
          .summary-card { background-color: #f9f9f9; padding: 15px; border-radius: 5px; text-align: center; }
          .summary-number { font-size: 20px; font-weight: bold; color: #2c5282; }
          .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
          .table th, .table td { padding: 8px; border: 1px solid #ddd; text-align: left; }
          .table th { background-color: #f8f9fa; font-weight: bold; }
          .status-active { color: #10b981; font-weight: bold; }
          .status-overdue { color: #ef4444; font-weight: bold; }
          .status-paid { color: #6b7280; font-weight: bold; }
          .status-pending { color: #f59e0b; font-weight: bold; }
          .status-calculated { color: #8b5cf6; font-weight: bold; }
          .status-partially-paid { color: #06b6d4; font-weight: bold; }
          .no-data { color: #666; font-style: italic; text-align: center; padding: 40px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>💳 Loan Due Report</h1>
          <p><strong>Generated:</strong> ${generatedAt}</p>
          <p><strong>Total Loans:</strong> ${reportData.length}</p>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-number" style="color: #f59e0b;">${todayDue.length}</div>
            <div>Due Today</div>
          </div>
          <div class="summary-card">
            <div class="summary-number" style="color: #8b5cf6;">${tomorrowDue.length}</div>
            <div>Due Tomorrow</div>
          </div>
          <div class="summary-card">
            <div class="summary-number" style="color: #ef4444;">${overdue.length}</div>
            <div>Overdue</div>
          </div>
          <div class="summary-card">
            <div class="summary-number" style="color: #10b981;">${reportData.filter((loan) => loan.repaymentStatus === "PAID").length}</div>
            <div>Paid</div>
          </div>
        </div>

        ${
          reportData.length === 0
            ? '<div class="no-data">No loan data found.</div>'
            : `
          <table class="table">
            <thead>
              <tr>
                <th>Loan ID</th>
                <th>User Details</th>
                <th>Brand</th>
                <th>Amount</th>
                <th>Amount Due</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Repayment Status</th>
              </tr>
            </thead>
            <tbody>
              ${reportData
                .map((loan) => {
                  return `
                  <tr>
                    <td><strong>${loan.formattedLoanId || loan.loanId.substring(0, 8)}</strong></td>
                    <td>
                      <strong>${loan.userName}</strong><br>
                      <small>${loan.userEmail}</small><br>
                      <small>${loan.userPhone}</small>
                    </td>
                    <td>${loan.brandName}</td>
                    <td><strong>₹${loan.amount.toLocaleString()}</strong></td>
                    <td><strong>₹${loan.amountDue.toLocaleString()}</strong></td>
                    <td><span class="status-${loan.status.toLowerCase()}">${loan.status}</span></td>
                    <td>${loan.dueDate}</td>
                    <td><span class="status-${loan.repaymentStatus.toLowerCase().replace("_", "-")}">${loan.repaymentStatus}</span></td>
                  </tr>
                `;
                })
                .join("")}
            </tbody>
          </table>
        `
        }

        <div style="margin-top: 30px; padding: 15px; background-color: #e7f3ff; border-radius: 5px;">
          <small>
            <strong>Note:</strong> Due dates are calculated as disbursement date + 30 days (configurable).
            All times are in IST (Asia/Kolkata timezone).
          </small>
        </div>
      </body>
      </html>
    `;

    // Text Content
    const text = `
LOAN DUE REPORT
===============

Generated: ${generatedAt}
Total Loans: ${reportData.length}

SUMMARY
-------
Due Today: ${todayDue.length}
Due Tomorrow: ${tomorrowDue.length}
Overdue: ${overdue.length}
Paid: ${reportData.filter((loan) => loan.repaymentStatus === "PAID").length}

LOAN DETAILS
============
${
  reportData.length === 0
    ? "No loan data found."
    : reportData
        .map(
          (loan) => `
Loan ID: ${loan.formattedLoanId || loan.loanId}
User: ${loan.userName} (${loan.userEmail})
Phone: ${loan.userPhone}
Brand: ${loan.brandName}
Amount: ₹${loan.amount.toLocaleString()}
Amount Due: ₹${loan.amountDue.toLocaleString()}
Status: ${loan.status}
Due Date: ${loan.dueDate}
Repayment Status: ${loan.repaymentStatus}
Disbursement Date: ${loan.disbursementDate || "N/A"}
---
`
        )
        .join("")
}

Note: Due dates are calculated as disbursement date + 30 days. All times are in IST timezone.
    `.trim();

    return { html, text };
  }

  async sendPaymentReminderEmail(
    recipientEmails: string[],
    query: PaymentReportQueryDto = {},
    customSubject?: string
  ): Promise<{
    success: boolean;
    reportData: PaymentReportData[];
    message: string;
  }> {
    try {
      this.logger.log(
        `Generating payment report for ${recipientEmails.length} recipients`
      );

      const reportData = await this.getPaymentReport(query);

      const subject =
        customSubject || `💳 Payment Report - ${_dayjs().format("DD/MM/YYYY")}`;

      const { html, text } = this.generatePaymentEmailContent({
        subject,
        recipientEmails,
        reportData,
        generatedAt: _dayjs().format("DD/MM/YYYY HH:mm:ss"),
        query,
      });

      for (const email of recipientEmails) {
        this.logger.log(`Sending payment report email to: ${email}`);

        const emailMessage = {
          to: email,
          name: "Payment Report",
          subject,
          html,
          text,
        };

        const success = await this.emailService.sendEmail(emailMessage);

        if (!success) {
          this.logger.error(`Failed to send payment report email to: ${email}`);
          throw new Error(`Failed to send email to ${email}`);
        }

        this.logger.log(`Successfully sent payment report email to: ${email}`);
      }

      const message = `Successfully sent payment reports to ${recipientEmails.length} recipients with ${reportData.length} payment records`;
      this.logger.log(message);

      return {
        success: true,
        reportData,
        message,
      };
    } catch (error) {
      this.logger.error("Error sending payment report email:", error);
      return {
        success: false,
        reportData: [],
        message: `Failed to send payment report email: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  async sendYesterdayPaymentEmail(recipientEmails: string[], brandId: string): Promise<{
    success: boolean;
    reportData: PaymentReportData[];
    message: string;
  }> {
    const yesterday = _dayjs().subtract(1, "day");
    const subject = `💳 Yesterday's Payment Report - ${yesterday.format("DD/MM/YYYY")}`;

    return this.sendPaymentReminderEmail(
      recipientEmails,
      { dateFilter: "yesterday", brandId },
      subject
    );
  }

  private generatePaymentEmailContent(data: {
    subject: string;
    recipientEmails: string[];
    reportData: PaymentReportData[];
    generatedAt: string;
    query?: any;
  }): { html: string; text: string } {
    const { reportData, generatedAt } = data;

    // Calculate summary stats
    const totalPayments = reportData.length;
    const totalAmount = reportData.reduce(
      (sum, payment) => sum + payment.paymentAmount,
      0
    );
    const successfulPayments = reportData.filter(
      (payment) => payment.paymentStatus === "SUCCESS"
    );
    const failedPayments = reportData.filter(
      (payment) => payment.paymentStatus === "FAILED"
    );
    const pendingPayments = reportData.filter(
      (payment) => payment.paymentStatus === "PENDING"
    );

    // HTML Content
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { background-color: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px; }
          .summary-card { background-color: #f9f9f9; padding: 15px; border-radius: 5px; text-align: center; }
          .summary-number { font-size: 20px; font-weight: bold; color: #2c5282; }
          .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
          .table th, .table td { padding: 8px; border: 1px solid #ddd; text-align: left; }
          .table th { background-color: #f8f9fa; font-weight: bold; }
          .status-success { color: #10b981; font-weight: bold; }
          .status-failed { color: #ef4444; font-weight: bold; }
          .status-pending { color: #f59e0b; font-weight: bold; }
          .no-data { color: #666; font-style: italic; text-align: center; padding: 40px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>💳 Payment Report</h1>
          <p><strong>Generated:</strong> ${generatedAt}</p>
          <p><strong>Total Payments:</strong> ${totalPayments}</p>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-number" style="color: #10b981;">${successfulPayments.length}</div>
            <div>Successful</div>
          </div>
          <div class="summary-card">
            <div class="summary-number" style="color: #ef4444;">${failedPayments.length}</div>
            <div>Failed</div>
          </div>
          <div class="summary-card">
            <div class="summary-number" style="color: #f59e0b;">${pendingPayments.length}</div>
            <div>Pending</div>
          </div>
          <div class="summary-card">
            <div class="summary-number" style="color: #2c5282;">₹${totalAmount.toLocaleString()}</div>
            <div>Total Amount</div>
          </div>
        </div>

        ${
          reportData.length === 0
            ? '<div class="no-data">No payment data found.</div>'
            : `
          <table class="table">
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Loan ID</th>
                <th>User Details</th>
                <th>Brand</th>
                <th>Payment Amount</th>
                <th>Payment Date</th>
                <th>Status</th>
                <th>Method</th>
                <th>Transaction ID</th>
              </tr>
            </thead>
            <tbody>
              ${reportData
                .map(
                  (payment) => `
                <tr>
                  <td>${payment.paymentId.substring(0, 8)}...</td>
                  <td><strong>${payment.formattedLoanId || payment.loanId.substring(0, 8)}</strong></td>
                  <td>
                    <strong>${payment.userName}</strong><br>
                    <small>${payment.userEmail}</small><br>
                    <small>${payment.userPhone}</small>
                  </td>
                  <td>${payment.brandName}</td>
                  <td><strong>₹${payment.paymentAmount.toLocaleString()}</strong></td>
                  <td>${payment.paymentDate}</td>
                  <td><span class="status-${payment.paymentStatus.toLowerCase()}">${payment.paymentStatus}</span></td>
                  <td>${payment.paymentMethod || "N/A"}</td>
                  <td>${payment.transactionId ? payment.transactionId.substring(0, 12) + "..." : "N/A"}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        `
        }

        <div style="margin-top: 30px; padding: 15px; background-color: #e7f3ff; border-radius: 5px;">
          <small>
            <strong>Note:</strong> All times are in IST (Asia/Kolkata timezone).
          </small>
        </div>
      </body>
      </html>
    `;

    // Text Content
    const text = `
PAYMENT REPORT
==============

Generated: ${generatedAt}
Total Payments: ${totalPayments}

SUMMARY
-------
Successful: ${successfulPayments.length}
Failed: ${failedPayments.length}
Pending: ${pendingPayments.length}
Total Amount: ₹${totalAmount.toLocaleString()}

PAYMENT DETAILS
===============
${
  reportData.length === 0
    ? "No payment data found."
    : reportData
        .map(
          (payment) => `
Payment ID: ${payment.paymentId}
Loan ID: ${payment.formattedLoanId || payment.loanId}
User: ${payment.userName} (${payment.userEmail})
Phone: ${payment.userPhone}
Brand: ${payment.brandName}
Payment Amount: ₹${payment.paymentAmount.toLocaleString()}
Payment Date: ${payment.paymentDate}
Status: ${payment.paymentStatus}
Method: ${payment.paymentMethod || "N/A"}
Transaction ID: ${payment.transactionId || "N/A"}
---
`
        )
        .join("")
}

Note: All times are in IST timezone.
    `.trim();

    return { html, text };
  }

  async sendDisbursedLoanEmail(
    recipientEmails: string[],
    query: DisbursedLoanReportQueryDto = {},
    customSubject?: string
  ): Promise<{
    success: boolean;
    reportData: DisbursedLoanReportData[];
    message: string;
  }> {
    try {
      this.logger.log(
        `Generating disbursed loan report for ${recipientEmails.length} recipients`
      );

      const reportData = await this.getDisbursedLoanReport(query);

      const subject =
        customSubject ||
        `🏦 Disbursed Loan Report - ${_dayjs().format("DD/MM/YYYY")}`;

      const { html, text } = this.generateDisbursedLoanEmailContent({
        subject,
        recipientEmails,
        reportData,
        generatedAt: _dayjs().format("DD/MM/YYYY HH:mm:ss"),
        query,
      });

      for (const email of recipientEmails) {
        this.logger.log(`Sending disbursed loan report email to: ${email}`);

        const emailMessage = {
          to: email,
          name: "Disbursed Loan Report",
          subject,
          html,
          text,
        };

        const success = await this.emailService.sendEmail(emailMessage);

        if (!success) {
          this.logger.error(
            `Failed to send disbursed loan report email to: ${email}`
          );
          throw new Error(`Failed to send email to ${email}`);
        }

        this.logger.log(
          `Successfully sent disbursed loan report email to: ${email}`
        );
      }

      const message = `Successfully sent disbursed loan reports to ${recipientEmails.length} recipients with ${reportData.length} loan records`;
      this.logger.log(message);

      return {
        success: true,
        reportData,
        message,
      };
    } catch (error) {
      this.logger.error("Error sending disbursed loan report email:", error);
      return {
        success: false,
        reportData: [],
        message: `Failed to send disbursed loan report email: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  async sendYesterdayDisbursedLoanEmail(recipientEmails: string[], brandId: string): Promise<{
    success: boolean;
    reportData: DisbursedLoanReportData[];
    message: string;
  }> {
    const yesterday = _dayjs().subtract(1, "day");
    const subject = `🏦 Yesterday's Disbursed Loan Report - ${yesterday.format("DD/MM/YYYY")}`;

    return this.sendDisbursedLoanEmail(
      recipientEmails,
      { dateFilter: "yesterday", brandId },
      subject
    );
  }

  private generateDisbursedLoanEmailContent(data: {
    subject: string;
    recipientEmails: string[];
    reportData: DisbursedLoanReportData[];
    generatedAt: string;
    query?: any;
  }): { html: string; text: string } {
    const { reportData, generatedAt } = data;

    // Calculate summary stats
    const totalLoans = reportData.length;
    const totalAmount = reportData.reduce((sum, loan) => sum + loan.amount, 0);
    const activeLoans = reportData.filter((loan) => loan.status === "ACTIVE");
    const paidLoans = reportData.filter((loan) => loan.status === "PAID");
    const overdueLoans = reportData.filter((loan) => loan.status === "OVERDUE");
    const partiallyPaidLoans = reportData.filter(
      (loan) => loan.status === "PARTIALLY_PAID"
    );

    // HTML Content
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { background-color: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px; }
          .summary-card { background-color: #f9f9f9; padding: 15px; border-radius: 5px; text-align: center; }
          .summary-number { font-size: 20px; font-weight: bold; color: #2c5282; }
          .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
          .table th, .table td { padding: 6px; border: 1px solid #ddd; text-align: left; }
          .table th { background-color: #f8f9fa; font-weight: bold; }
          .status-active { color: #10b981; font-weight: bold; }
          .status-paid { color: #6b7280; font-weight: bold; }
          .status-overdue { color: #ef4444; font-weight: bold; }
          .status-partially-paid { color: #f59e0b; font-weight: bold; }
          .no-data { color: #666; font-style: italic; text-align: center; padding: 40px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏦 Disbursed Loan Report</h1>
          <p><strong>Generated:</strong> ${generatedAt}</p>
          <p><strong>Total Loans:</strong> ${totalLoans}</p>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-number" style="color: #10b981;">${activeLoans.length}</div>
            <div>Active</div>
          </div>
          <div class="summary-card">
            <div class="summary-number" style="color: #6b7280;">${paidLoans.length}</div>
            <div>Paid</div>
          </div>
          <div class="summary-card">
            <div class="summary-number" style="color: #ef4444;">${overdueLoans.length}</div>
            <div>Overdue</div>
          </div>
          <div class="summary-card">
            <div class="summary-number" style="color: #f59e0b;">${partiallyPaidLoans.length}</div>
            <div>Partial Paid</div>
          </div>
          <div class="summary-card">
            <div class="summary-number" style="color: #2c5282;">₹${totalAmount.toLocaleString()}</div>
            <div>Total Amount</div>
          </div>
        </div>

        ${
          reportData.length === 0
            ? '<div class="no-data">No disbursed loan data found.</div>'
            : `
          <table class="table">
            <thead>
              <tr>
                <th>Loan ID</th>
                <th>User Details</th>
                <th>Brand</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Disbursement</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              ${reportData
                .map(
                  (loan) => `
                <tr>
                  <td><strong>${loan.formattedLoanId || loan.loanId.substring(0, 8)}</strong></td>
                  <td>
                    <strong>${loan.userName}</strong><br>
                    <small>${loan.userEmail}</small><br>
                    <small>${loan.userPhone}</small>
                  </td>
                  <td>${loan.brandName}</td>
                  <td><strong>₹${loan.amount.toLocaleString()}</strong></td>
                  <td><span class="status-${loan.status.toLowerCase().replace("_", "-")}">${loan.status}</span></td>
                  <td>
                    ${loan.disbursementDate}<br>
                    <small>${loan.disbursementTime}</small>
                  </td>
                  <td>${loan.dueDate}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        `
        }

        <div style="margin-top: 30px; padding: 15px; background-color: #e7f3ff; border-radius: 5px;">
          <small>
            <strong>Note:</strong> Due dates are calculated as disbursement date + 30 days (configurable).
            All times are in IST (Asia/Kolkata timezone).
          </small>
        </div>
      </body>
      </html>
    `;

    // Text Content
    const text = `
DISBURSED LOAN REPORT
====================

Generated: ${generatedAt}
Total Loans: ${totalLoans}

SUMMARY
-------
Active: ${activeLoans.length}
Paid: ${paidLoans.length}
Overdue: ${overdueLoans.length}
Partially Paid: ${partiallyPaidLoans.length}
Total Amount: ₹${totalAmount.toLocaleString()}

LOAN DETAILS
============
${
  reportData.length === 0
    ? "No disbursed loan data found."
    : reportData
        .map(
          (loan) => `
Loan ID: ${loan.formattedLoanId || loan.loanId}
User: ${loan.userName} (${loan.userEmail})
Phone: ${loan.userPhone}
Brand: ${loan.brandName}
Amount: ₹${loan.amount.toLocaleString()}
Status: ${loan.status}
Disbursement: ${loan.disbursementDate} ${loan.disbursementTime}
Due Date: ${loan.dueDate}
Purpose: ${loan.purpose || "N/A"}
---
`
        )
        .join("")
}

Note: Due dates are calculated as disbursement date + 30 days. All times are in IST timezone.
    `.trim();

    return { html, text };
  }
}
