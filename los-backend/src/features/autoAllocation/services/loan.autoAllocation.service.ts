import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  loan_status_enum,
  PartnerUser,
  Prisma,
  notification_priority_enum,
  platform_type,
} from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { NotificationService } from "src/features/notification/notification.service";
import { PermissionsEnum } from "src/constant/permissions";
import { RoleEnum } from "src/constant/roles";

@Injectable()
export class AutoAllocationLoanService {
  private readonly logger = new Logger(AutoAllocationLoanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Get current date/time in Indian timezone (Asia/Kolkata)
   * @returns Current date in Indian timezone
   */
  private getIndianTime(): Date {
    const now = new Date();
    const istTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
    );
    return istTime;
  }

  /**
   * Get start of day in Indian timezone
   * @returns Start of today (00:00:00) in IST
   */
  private getIndianDayStart(): Date {
    const now = this.getIndianTime();
    now.setHours(0, 0, 0, 0);
    return now;
  }

  /**
   * Get end of day in Indian timezone
   * @returns End of today (23:59:59.999) in IST
   */
  private getIndianDayEnd(): Date {
    const now = this.getIndianTime();
    now.setHours(23, 59, 59, 999);
    return now;
  }

  async autoAllocatedLoans() {
    const unallocatedLoans = await this.prisma.loan.findMany({
      where: {
        AND: [
          { status: loan_status_enum.PENDING },
          {
            allottedPartners: {
              some: { partnerUserId: "d11f6c18-bab9-4095-97c8-a171a54ba069" },
            },
          },
        ],
        // today (in Indian timezone)
        createdAt: {
          gte: this.getIndianDayStart(),
          lte: this.getIndianDayEnd(),
        },
      },
      select: {
        id: true,
        brandId: true,
        is_repeat_loan: true,
        userId: true,
        amount: true,
      },
    });
    const brand = await this.prisma.brand.findUnique({
      where: { id: unallocatedLoans[0]?.brandId || "" },
      select: {
        id: true,
        name: true,
        brandConfig: true,
      },
    });

    for (const loan of unallocatedLoans) {
      const nextPartnerUser = await this.nextCreditExecutivePartnerUser(
        loan.userId,
        loan.brandId,
        loan.is_repeat_loan,
        brand.brandConfig?.autoAllocationType as "LOGIN" | "ATTENDANCE",
      );
      if (nextPartnerUser) {
        await this.relocateLoan(loan.id, nextPartnerUser.id);
      }
    }
  }

  async nextCreditExecutivePartnerUser(
    userId: string,
    brandId: string,
    isReloan: boolean,
    autoAllocationType: "LOGIN" | "ATTENDANCE" = "ATTENDANCE",
  ): Promise<PartnerUser | null> {
    if (!brandId) {
      throw new BadRequestException("Brand ID is required");
    }
    if (!["LOGIN", "ATTENDANCE"].includes(autoAllocationType)) {
      throw new BadRequestException(
        "Invalid allocation type. Must be 'LOGIN' or 'ATTENDANCE'",
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const partnerUser = await this.prisma.partnerUser.findFirst({
      where: {
        id: user?.id,
        isActive: true,
        ...(isReloan
          ? { isReloanSupport: true }
          : { is_fresh_loan_support: true }),
        brandRoles: {
          some: {
            brandId,
            role: { name: RoleEnum.CREDIT_EXECUTIVE },
          },
        },
        userPermissions: {
          some: {
            partnerPermission: { name: PermissionsEnum.ONBOARDING_COMPLETED },
          },
        },
      },
      include: {
        brandRoles: { include: { role: true } },
        userPermissions: { include: { partnerPermission: true } },
      },
    });

    if (partnerUser) return partnerUser;

    let query: any;

    if (autoAllocationType === "LOGIN") {
      [query] = await this.prisma.$queryRaw<
        (PartnerUser & {
          total_allocations: number;
          total_amount: number;
        })[]
      >`
SELECT
    pu.*,
    COUNT(lapu.id) AS total_allocations,
    COALESCE(SUM(lapu.amount), 0) AS total_amount
FROM
    "partner_users" pu
LEFT JOIN
    loan_allotted_partner_user lapu
    ON pu.id = lapu."partnerUserId"
    AND DATE(lapu."allottedAt") = CURRENT_DATE
INNER JOIN
    partner_user_permissions lup
    ON pu.id = lup."partnerUserId"
INNER JOIN
    partner_permissions pp
    ON lup."partnerPermissionId" = pp.id
INNER JOIN
    partner_user_brand_roles pubr
    ON pu.id = pubr."partnerUserId"
INNER JOIN
    partner_roles pr
    ON pubr."roleId" = pr.id
LEFT JOIN
    partner_unavailability_dates pud
    ON pu.id = pud."partnerUserId"
    AND pud.date = CURRENT_DATE
    AND pud."isActive" = true
WHERE
    pu."isActive" = true
    ${isReloan ? Prisma.sql`AND pu."isReloanSupport" = true` : Prisma.empty}
    AND pp.name = 'ONBOARDING_COMPLETED'
    AND pubr."brandId" = ${brandId}
    AND pr.name = 'CREDIT_EXECUTIVE'
    AND pud.id IS NULL
    AND pu.id NOT IN (
        SELECT lapu2."partnerUserId"
        FROM loan_allotted_partner_user lapu2
        INNER JOIN loans l ON lapu2."loanId" = l.id
        WHERE lapu2."partnerUserId" IS NOT NULL
        AND l."brandId" = ${brandId}
        ORDER BY lapu2."allottedAt" DESC
        LIMIT 2
    )
GROUP BY
    pu.id
ORDER BY
    total_allocations ASC,
    total_amount ASC
LIMIT 1;
`;
    } else if (isReloan) {
      [query] = await this.prisma.$queryRaw<
        (PartnerUser & {
          total_allocations: number;
          total_amount: number;
        })[]
      >`SELECT
    pu.*,
    COUNT(lapu.id) AS total_allocations
FROM
    "partner_users" pu
LEFT JOIN
    loan_allotted_partner_user lapu
        ON pu.id = lapu."partnerUserId"
        AND DATE(lapu."allottedAt") = CURRENT_DATE
INNER JOIN
    partner_user_permissions lup
        ON pu.id = lup."partnerUserId"
INNER JOIN
    partner_permissions pp
        ON lup."partnerPermissionId" = pp.id
INNER JOIN
    partner_user_brand_roles pubr
        ON pu.id = pubr."partnerUserId"
INNER JOIN
    partner_roles pr
        ON pubr."roleId" = pr.id
LEFT JOIN
    partner_unavailability_dates pud
        ON pu.id = pud."partnerUserId"
        AND pud.date = CURRENT_DATE
        AND pud."isActive" = true
WHERE
    pu."isActive" = true
    AND pu."isReloanSupport" = true
    AND pp.name = 'ONBOARDING_COMPLETED'
    AND pr.name = 'CREDIT_EXECUTIVE'
    AND pud.id IS NULL
GROUP BY
    pu.id
ORDER BY
    total_allocations ASC
LIMIT 1;`;
    } else {
      [query] = await this.prisma.$queryRaw<
        (PartnerUser & {
          total_allocations: number;
          total_amount: number;
        })[]
      >`SELECT
    pu.*,
    COUNT(lapu.id) AS total_allocations
FROM
    "partner_users" pu
LEFT JOIN
    loan_allotted_partner_user lapu
        ON pu.id = lapu."partnerUserId"
        AND DATE(lapu."allottedAt") = CURRENT_DATE
INNER JOIN
    partner_user_permissions lup
        ON pu.id = lup."partnerUserId"
INNER JOIN
    partner_permissions pp
        ON lup."partnerPermissionId" = pp.id
INNER JOIN
    partner_user_brand_roles pubr
        ON pu.id = pubr."partnerUserId"
INNER JOIN
    partner_roles pr
        ON pubr."roleId" = pr.id
LEFT JOIN
    partner_unavailability_dates pud
        ON pu.id = pud."partnerUserId"
        AND pud.date = CURRENT_DATE
        AND pud."isActive" = true
WHERE
    pu."isActive" = true
    AND pu."is_fresh_loan_support" = true
    AND pp.name = 'ONBOARDING_COMPLETED'
    AND pr.name = 'CREDIT_EXECUTIVE'
    AND pud.id IS NULL
GROUP BY
    pu.id
ORDER BY
    total_allocations ASC
LIMIT 1;`;
    }
    return query || null;
  }

  async relocateLoan(loanId: string, newPartnerUserId: string) {
    if (!loanId || !newPartnerUserId) {
      throw new BadRequestException("All parameters are required.");
    }

    // Fetch loan and new partner in parallel for efficiency
    const [loan, newPartnerUser] = await Promise.all([
      this.prisma.loan.findUnique({
        where: { id: loanId },
        select: {
          id: true,
          amount: true,
          status: true,
          formattedLoanId: true,
          userId: true,
          user: {
            select: {
              id: true,
              formattedUserId: true,
              phoneNumber: true,
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
      }),
      this.prisma.partnerUser.findUnique({
        where: { id: newPartnerUserId },
        select: { id: true, reportsToId: true, name: true },
      }),
    ]);

    if (!loan) {
      throw new NotFoundException("Loan not found.");
    }
    if (
      loan.status !== loan_status_enum.PENDING &&
      loan.status !== loan_status_enum.ONBOARDING
    ) {
      throw new BadRequestException(
        "Only loans in PENDING status can be relocated.",
      );
    }

    if (!newPartnerUser) {
      throw new NotFoundException("New partner user not found.");
    }

    const partnerIds = [newPartnerUser.id, newPartnerUser.reportsToId].filter(
      Boolean,
    );

    // Transaction to ensure all-or-nothing behavior
    await this.prisma.$transaction(async (tx) => {
      await tx.loanAllottedPartnerUser.deleteMany({
        where: { loanId },
      });

      await tx.loanStatusHistory.deleteMany({
        where: { loanId },
      });

      await tx.loan.update({
        where: { id: loanId },
        data: {
          status:
            loan.status === loan_status_enum.ONBOARDING
              ? loan_status_enum.ONBOARDING
              : loan_status_enum.PENDING,
          updatedAt: this.getIndianTime(),
        },
      });

      const createAllotments = partnerIds.map((partnerId) =>
        tx.loanAllottedPartnerUser.create({
          data: {
            loanId,
            partnerUserId: partnerId,
            allottedAt: this.getIndianTime(),
            amount: loan.amount,
          },
        }),
      );

      await Promise.all(createAllotments);
    });

    // Create notification for loan relocation
    try {
      const userDetails = loan.user;
      const userName =
        userDetails?.userDetails?.firstName &&
        userDetails?.userDetails?.lastName
          ? `${userDetails.userDetails.firstName} ${userDetails.userDetails.lastName}`
          : userDetails?.formattedUserId || "Unknown User";

      const contactInfo =
        userDetails?.phoneNumber || userDetails?.email || "No contact";
      const loanId_display = loan.formattedLoanId || loan.id;

      // Get allocated partner user IDs (new partner and their supervisor)
      const allocatedPartnerIds = partnerIds;

      if (allocatedPartnerIds.length > 0) {
        await this.notificationService.create({
          title: "Loan Relocated",
          message: `Loan ${loanId_display} has been relocated to ${newPartnerUser.name}. Customer: ${userName} (${contactInfo}), Amount: ₹${loan.amount}`,
          priority: notification_priority_enum.MEDIUM,
          loanId: loan.id,
          userId: userDetails?.id,
          targets: allocatedPartnerIds.map((partnerId) => ({
            partnerUserId: partnerId,
            platform: platform_type.PARTNER,
          })),
        });
      }
    } catch (notificationError) {
      console.error(
        `Failed to send loan relocation notification for loan ${loan.id}: ${notificationError.message}`,
        notificationError.stack,
      );
      // Don't fail the entire loan relocation if notification fails
    }

    return { message: "Loan successfully relocated." };
  }

  // Bulk loan relocation with round-robin distribution
  async bulkRelocateLoans(loanIds: string[], targetPartnerUserIds?: string[]) {
    if (!loanIds?.length) {
      throw new BadRequestException("Loan IDs are required.");
    }

    // Validate loans exist and are in PENDING status
    const loans = await this.prisma.loan.findMany({
      where: {
        id: { in: loanIds },
        status: loan_status_enum.PENDING,
      },
      select: {
        id: true,
        amount: true,
        userId: true,
        is_repeat_loan: true,
        brandId: true,
      },
    });

    if (loans.length !== loanIds.length) {
      throw new BadRequestException(
        "One or more loans not found or not in PENDING status.",
      );
    }

    // Get brand configuration for auto allocation type
    const brandId = loans[0]?.brandId;
    if (!brandId) {
      throw new BadRequestException("Unable to determine brand context.");
    }

    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
      select: {
        brandConfig: {
          select: { autoAllocationType: true },
        },
      },
    });

    const autoAllocationType =
      (brand?.brandConfig?.autoAllocationType as "LOGIN" | "ATTENDANCE") ||
      "LOGIN";

    let finalTargetPartnerIds = targetPartnerUserIds;

    // If no target partners provided, use nextCreditExecutivePartnerUser for auto-allocation
    if (!targetPartnerUserIds || targetPartnerUserIds.length === 0) {
      this.logger.log(
        "Auto-allocation mode: using nextCreditExecutivePartnerUser for distribution",
      );

      // For auto allocation, we'll allocate each loan individually using the smart allocation logic
      const allocationResults: any[] = [];

      for (const loan of loans) {
        try {
          const nextPartnerUser = await this.nextCreditExecutivePartnerUser(
            loan.userId,
            loan.brandId,
            loan.is_repeat_loan,
            autoAllocationType,
          );

          if (nextPartnerUser) {
            await this.relocateLoan(loan.id, nextPartnerUser.id);
            allocationResults.push({
              loanId: loan.id,
              partnerId: nextPartnerUser.id,
              partnerName: nextPartnerUser.name,
              status: "success",
            });
            this.logger.log(
              `Auto-allocated loan ${loan.id} to partner ${nextPartnerUser.name} (${nextPartnerUser.id})`,
            );
          } else {
            allocationResults.push({
              loanId: loan.id,
              status: "failed",
              error: "No available partner found",
            });
            this.logger.warn(`No available partner found for loan ${loan.id}`);
          }
        } catch (error) {
          allocationResults.push({
            loanId: loan.id,
            status: "failed",
            error: error.message,
          });
          this.logger.error(
            `Failed to allocate loan ${loan.id}: ${error.message}`,
          );
        }
      }

      const successfulAllocations = allocationResults.filter(
        (r) => r.status === "success",
      );
      const failedAllocations = allocationResults.filter(
        (r) => r.status === "failed",
      );

      return {
        message: `Auto-allocation completed. ${successfulAllocations.length} loans allocated successfully, ${failedAllocations.length} failed.`,
        loansAllocated: successfulAllocations.length,
        loansTotal: loans.length,
        allocationResults,
        mode: "auto",
      };
    }

    // Manual allocation with specific target partners (existing logic)
    // Validate target partner users exist
    const targetPartners = await this.prisma.partnerUser.findMany({
      where: { id: { in: finalTargetPartnerIds } },
      select: { id: true, reportsToId: true, name: true },
    });

    if (targetPartners.length !== finalTargetPartnerIds.length) {
      throw new NotFoundException(
        "One or more target partner users not found.",
      );
    }

    // Prepare all partner IDs (including supervisors) for manual allocation
    // Transaction to ensure atomicity
    await this.prisma.$transaction(async (tx) => {
      // Remove existing allocations for all loans
      await tx.loanAllottedPartnerUser.deleteMany({
        where: { loanId: { in: loanIds } },
      });

      // Remove existing status history for all loans
      await tx.loanStatusHistory.deleteMany({
        where: { loanId: { in: loanIds } },
      });

      // Reset all loan statuses to PENDING
      await tx.loan.updateMany({
        where: { id: { in: loanIds } },
        data: {
          status: loan_status_enum.PENDING,
          updatedAt: this.getIndianTime(),
        },
      });

      // Create new allocations using round-robin distribution
      const allocationPromises: any[] = [];

      for (let index = 0; index < loans.length; index++) {
        const loan = loans[index];
        const targetPartnerIndex = index % targetPartners.length;
        const targetPartner = targetPartners[targetPartnerIndex];

        const partnerIds = [targetPartner.id, targetPartner.reportsToId].filter(
          Boolean,
        );

        for (const partnerId of partnerIds) {
          allocationPromises.push(
            tx.loanAllottedPartnerUser.create({
              data: {
                loanId: loan.id,
                partnerUserId: partnerId,
                allottedAt: this.getIndianTime(),
                amount: loan.amount,
              },
            }),
          );
        }
      }

      // Execute all allocation creations
      await Promise.all(allocationPromises);
    });

    return {
      message: `Successfully allocated ${loans.length} loans to ${targetPartners.length} partner(s) using round-robin distribution`,
      loansAllocated: loans.length,
      partnersCount: targetPartners.length,
      mode: "manual",
    };
  }
}
