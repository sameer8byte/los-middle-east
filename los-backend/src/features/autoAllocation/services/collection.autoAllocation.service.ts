import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { NotificationService } from "src/features/notification/notification.service";
import {
  loan_status_enum,
  PartnerUser,
  notification_priority_enum,
  platform_type,
} from "@prisma/client";

@Injectable()
export class CollectionService {
  private readonly logger = new Logger(CollectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService
  ) {}

  /**
   * Get current date/time in Indian timezone (Asia/Kolkata)
   * @returns Current date in Indian timezone
   */
  private getIndianTime(): Date {
    const now = new Date();
    const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
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

  /**
   * Parse a date string in Indian timezone
   * @param dateString - Date string to parse (YYYY-MM-DD format)
   * @param isEndOfDay - If true, set time to 23:59:59.999 (end of day), otherwise 00:00:00 (start of day)
   * @returns Parsed date adjusted for IST timezone offset
   */
  private parseIndianDate(dateString: string, isEndOfDay: boolean = false): Date {
    // Create a date from the input string (assuming it's in YYYY-MM-DD format or ISO format)
    const date = new Date(dateString);
    
    // If end of day, set time to 23:59:59.999
    if (isEndOfDay) {
      date.setHours(23, 59, 59, 999);
    } else {
      // Otherwise set to start of day (00:00:00)
      date.setHours(0, 0, 0, 0);
    }
    
    // Get the offset between UTC and IST (IST is UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
    
    // Adjust the date by subtracting the IST offset to get the correct UTC time
    // This ensures that when the server stores it, it stores the correct IST time
    const adjustedDate = new Date(date.getTime() - istOffset);
    
    return adjustedDate;
  }

  async allocateCollectionPartner(
    loanId: string,
    newPartnerUserId: string,
    remarks: string,
    partnerUserId: string
  ) {
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

    if (!newPartnerUser) {
      throw new NotFoundException("New partner user not found.");
    }

    const partnerIds = [newPartnerUser.id, newPartnerUser.reportsToId].filter(
      Boolean
    );

    // Transaction to ensure all-or-nothing behavior
    await this.prisma.$transaction(async (tx) => {
      // Deallocate existing active partners instead of deleting
      await tx.loan_collection_allocated_partner.updateMany({
        where: {
          loanId,
          isActive: true,
        },
        data: {
          deallocatedAt: this.getIndianTime(),
          isDeallocated: true,
          isActive: false,
          updatedAt: this.getIndianTime(),
        },
      });

      // Create new allocations for the new partner and their supervisor
      // Check if active allocation already exists to avoid duplicates
      for (const partnerId of partnerIds) {
        const existingActiveAllocation =
          await tx.loan_collection_allocated_partner.findFirst({
            where: {
              loanId,
              partnerUserId: partnerId,
              isActive: true,
            },
          });

        if (!existingActiveAllocation) {
          await tx.loan_collection_allocated_partner.create({
            data: {
              loanId,
              remarks: remarks || null,
              partnerUserId: partnerId,
              allocatedAt: this.getIndianTime(),
              amount: loan.amount || 0,
              isActive: true,
            },
          });
        }
      }
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
          title: "Loan collection relocated",
          message: `Loan ${loanId_display} has been relocated to ${newPartnerUser.name}. Customer: ${userName} (${contactInfo}), Amount: ₹${loan.amount}`,
          priority: notification_priority_enum.HIGH,
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
        notificationError.stack
      );
      // Don't fail the entire loan relocation if notification fails
    }

    return { message: "Loan successfully relocated." };
  }

  async bulkAllocateCollectionPartnersByDueDate(
    brandId: string,
    targetPartnerUserIds: string[] | undefined,
    dueDateFrom?: string,
    dueDateTo?: string,
    sourcePartnerUserIds?: string[],
    loanCurrentStatus?: string,
    remarks?: string
  ) {
    try {
      // If no target partners specified, use auto-allocation logic with filters
      if (!targetPartnerUserIds || targetPartnerUserIds.length === 0) {
        return this.autoAllocateToAllUnallocatedLoans(
          brandId,
          "ATTENDANCE",
          dueDateFrom,
          dueDateTo,
          sourcePartnerUserIds,
          loanCurrentStatus,
          remarks
        );
      }

      // Validate all target partner users exist
      const partnerUsers = await this.prisma.partnerUser.findMany({
        where: { id: { in: targetPartnerUserIds } },
      });

      if (partnerUsers.length !== targetPartnerUserIds.length) {
        const foundIds = partnerUsers.map(p => p.id);
        const missingIds = targetPartnerUserIds.filter(id => !foundIds.includes(id));
        throw new BadRequestException(`Target partner users not found: ${missingIds.join(', ')}`);
      }

      const whereClause: any = {
        brandId,
        status: {
          in: [
            loan_status_enum.ACTIVE,
            loan_status_enum.POST_ACTIVE,
            loan_status_enum.PARTIALLY_PAID,
          ],
        },
      };

      // Only add date filter if both dates are provided
      if (dueDateFrom && dueDateTo) {
        const dueDateFromObj = this.parseIndianDate(dueDateFrom, false);
        const dueDateToObj = this.parseIndianDate(dueDateTo, true);

        // Validate date range
        if (dueDateFromObj > dueDateToObj) {
          throw new BadRequestException(
            "Start date must be before or equal to end date"
          );
        }

        whereClause.loanDetails = {
          dueDate: {
            gte: dueDateFromObj,
            lte: dueDateToObj,
          },
        };

        // Handle loan current status filter (overdue vs not overdue)
        if (loanCurrentStatus && loanCurrentStatus !== "both") {
          const today = this.getIndianDayStart();

          if (loanCurrentStatus === "overdue") {
            // Overdue: due date is before today
            whereClause.loanDetails.dueDate.lt = today;
          } else if (loanCurrentStatus === "not-overdue") {
            // Not overdue: due date is today or in the future
            whereClause.loanDetails.dueDate.gte = today;
          }
        }
      } else if (loanCurrentStatus && loanCurrentStatus !== "both") {
        // If no date range provided but loan current status filter is present
        const today = this.getIndianDayStart();

        whereClause.loanDetails = {
          dueDate:
            loanCurrentStatus === "overdue" ? { lt: today } : { gte: today },
        };
      }

      // Handle source partner filter
      if (sourcePartnerUserIds && sourcePartnerUserIds.length > 0) {
        if (sourcePartnerUserIds.includes("unallocated")) {
          // Filter for loans that have no active collection partner allocation
          whereClause.loan_collection_allocated_partner = {
            none: {
              isDeallocated: false,
              isActive: true,
            },
          };
        } else {
          // Filter by specific partners
          whereClause.loan_collection_allocated_partner = {
            some: {
              partnerUserId: { in: sourcePartnerUserIds },
              isDeallocated: false,
            },
          };
        }
      }

      const loans = await this.prisma.loan.findMany({
        where: whereClause,
        select: {
          id: true,
          formattedLoanId: true,
          amount: true,
        },
      });

      if (loans.length === 0) {
        return {
          success: false,
          message: "No loans found for the specified criteria",
          allocatedCount: 0,
        };
      }

      // Use transaction to ensure atomicity
      const result = await this.prisma.$transaction(async (tx) => {
        // Handle deallocating existing allocations based on source filter
        if (sourcePartnerUserIds && sourcePartnerUserIds.length > 0) {
          if (!sourcePartnerUserIds.includes("unallocated")) {
            // Get all partner users to find their supervisors/managers
            const sourcePartnerUsers = await tx.partnerUser.findMany({
              where: { id: { in: sourcePartnerUserIds } },
              select: { id: true, reportsToId: true }
            });

            // Create array of all partner IDs to deallocate (executives + their supervisors)
            const allPartnerIdsToDeallocation = new Set<string>();
            
            for (const partner of sourcePartnerUsers) {
              allPartnerIdsToDeallocation.add(partner.id);
              if (partner.reportsToId) {
                allPartnerIdsToDeallocation.add(partner.reportsToId);
              }
            }

            // Deallocate from specific partners and their supervisors
            await tx.loan_collection_allocated_partner.updateMany({
              where: {
                loan: {
                  id: {
                    in: loans.map((loan) => loan.id),
                  },
                },
                partnerUserId: { in: Array.from(allPartnerIdsToDeallocation) },
                isDeallocated: false,
              },
              data: {
                isDeallocated: true,
                isActive: false,
                deallocatedAt: this.getIndianTime(),
              },
            });
          }
        } else {
          // Deallocate all existing active allocations for these loans
          await tx.loan_collection_allocated_partner.updateMany({
            where: {
              loan: {
                id: {
                  in: loans.map((loan) => loan.id),
                },
              },
              isDeallocated: false,
            },
            data: {
              isDeallocated: true,
              isActive: false,
              deallocatedAt: this.getIndianTime(),
            },
          });
        }

        // Create new allocations using round-robin distribution
        const allocationData: any[] = [];
        let partnerIndex = 0;

        for (let i = 0; i < loans.length; i++) {
          const loan = loans[i];
          const targetPartner = partnerUsers[partnerIndex];
          
          // Allocate to the target partner
          allocationData.push({
            loanId: loan.id,
            partnerUserId: targetPartner.id,
            allocatedAt: this.getIndianTime(),
            amount: loan.amount || 0,
            remarks,
            isDeallocated: false,
            isActive: true,
          });

          // Also allocate to supervisor if exists
          if (targetPartner.reportsToId) {
            allocationData.push({
              loanId: loan.id,
              partnerUserId: targetPartner.reportsToId,
              allocatedAt: this.getIndianTime(),
              amount: loan.amount || 0,
              remarks: `Supervisor allocation for ${remarks || "N/A"}`,
              isDeallocated: false,
              isActive: true,
            });
          }

          // Move to next partner (round-robin)
          partnerIndex = (partnerIndex + 1) % targetPartnerUserIds.length;
        }

        await tx.loan_collection_allocated_partner.createMany({
          data: allocationData,
        });

        return loans.length;
      });

      // Create summary of allocations per partner
      const allocationSummary = targetPartnerUserIds.map(partnerId => {
        const partner = partnerUsers.find(p => p.id === partnerId);
        const loansPerPartner = Math.floor(loans.length / targetPartnerUserIds.length);
        const extraLoans = loans.length % targetPartnerUserIds.length;
        const targetIndex = targetPartnerUserIds.indexOf(partnerId);
        const actualLoans = loansPerPartner + (targetIndex < extraLoans ? 1 : 0);
        
        return {
          partnerId,
          partnerName: partner?.name || 'Unknown',
          allocatedLoans: actualLoans
        };
      });

      return {
        success: true,
        message: `Successfully allocated ${result} loans to ${targetPartnerUserIds.length} collection partner(s)`,
        allocatedCount: result,
        allocationSummary,
      };
    } catch (error) {
      console.error("Error allocating loans in bulk:", error);
      throw new BadRequestException("Failed to allocate loans in bulk");
    }
  }

  async nextPartnerCollectionUserId(
    brandId: string,
    autoAllocationType: "LOGIN" | "ATTENDANCE" = "LOGIN"
  ): Promise<PartnerUser | null> {
    if (!brandId) {
      throw new BadRequestException("Brand ID is required");
    }

    if (!["LOGIN", "ATTENDANCE"].includes(autoAllocationType)) {
      throw new BadRequestException(
        "Invalid allocation type. Must be 'LOGIN' or 'AVAILABILITY'"
      );
    }

    try {
      const [nextPartnerUser] =
        autoAllocationType === "LOGIN"
          ? await this.prisma.$queryRaw<
              (PartnerUser & {
                total_allocations: number;
                total_amount: number;
              })[]
            >`
      SELECT 
        pu.*, 
        COUNT(lcap.id) AS total_allocations, 
        COALESCE(SUM(lcap.amount), 0) AS total_amount
      FROM 
        "partner_users" pu
      LEFT JOIN 
        loan_collection_allocated_partner lcap 
        ON pu.id = lcap."partnerUserId" 
        AND lcap."isDeallocated" = false
        AND lcap."isActive" = true
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
      INNER JOIN 
        partner_user_login_logs pull 
        ON pu.id = pull."partnerUserId"
      WHERE 
        pu."isActive" = true
        AND pu."reportsToId" IS NOT NULL
        AND pr.name = 'COLLECTION_EXECUTIVE'
        AND pubr."brandId" = ${brandId}
        AND pull.date = CURRENT_DATE
        AND pull."firstLogin" <= CURRENT_TIMESTAMP
        AND (
          pull."lastLogout" IS NULL 
          OR CURRENT_TIMESTAMP <= pull."lastLogout"
        )
      GROUP BY 
        pu.id
      ORDER BY 
        total_allocations ASC, 
        total_amount ASC
      LIMIT 1;
    `
          : await this.prisma.$queryRaw<
              (PartnerUser & {
                total_allocations: number;
                total_amount: number;
              })[]
            >`
      SELECT
        pu.*,
        COUNT(lcap.id) AS total_allocations,
        COALESCE(SUM(lcap.amount), 0) AS total_amount
      FROM
        "partner_users" pu
      LEFT JOIN
        loan_collection_allocated_partner lcap
        ON pu.id = lcap."partnerUserId"
        AND lcap."isDeallocated" = false
        AND lcap."isActive" = true
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
        AND pu."reportsToId" IS NOT NULL
        AND pr.name = 'COLLECTION_EXECUTIVE'
        AND pubr."brandId" = ${brandId}
        AND pud.id IS NULL
      GROUP BY
        pu.id
      ORDER BY
        total_allocations ASC,
        total_amount ASC
      LIMIT 1;
    `;
      return nextPartnerUser || null;
    } catch (error) {
      console.error(
        `Error finding next collection partner for brand ${brandId}:`,
        error.message
      );
    }
  }

  async autoAllocateToAllUnallocatedLoans(
    brandId: string,
    autoAllocationType: "LOGIN" | "ATTENDANCE" = "LOGIN",
    dueDateFrom?: string,
    dueDateTo?: string,
    sourcePartnerUserIds?: string[],
    loanCurrentStatus?: string,
    remarks?: string
  ): Promise<{
    success: boolean;
    message: string;
    allocatedCount: number;
    failedCount: number;
    details: Array<{
      loanId: string;
      formattedLoanId: string;
      status: "success" | "failed";
      partnerUserId?: string;
      error?: string;
    }>;
  }> {
    if (!brandId) {
      throw new BadRequestException("Brand ID is required");
    }
    try {
      // Build the where clause with filters
      const whereClause: any = {
        brandId,
        status: {
          in: [
            loan_status_enum.ACTIVE,
            loan_status_enum.POST_ACTIVE,
            loan_status_enum.PARTIALLY_PAID,
          ],
        },
        loan_collection_allocated_partner: {
          none: {
            isDeallocated: false,
            isActive: true,
          },
        },
      };

      // Add date range filter if provided
      if (dueDateFrom && dueDateTo) {
        const dueDateFromObj = this.parseIndianDate(dueDateFrom, false);
        const dueDateToObj = this.parseIndianDate(dueDateTo, true);

        if (dueDateFromObj > dueDateToObj) {
          throw new BadRequestException(
            "Start date must be before or equal to end date"
          );
        }

        whereClause.loanDetails = {
          dueDate: {
            gte: dueDateFromObj,
            lte: dueDateToObj,
          },
        };

        // Handle loan current status filter (overdue vs not overdue)
        if (loanCurrentStatus && loanCurrentStatus !== "both") {
          const today = this.getIndianDayStart();

          if (loanCurrentStatus === "overdue") {
            // Overdue: due date is before today
            whereClause.loanDetails.dueDate.lt = today;
          } else if (loanCurrentStatus === "not-overdue") {
            // Not overdue: due date is today or in the future
            whereClause.loanDetails.dueDate.gte = today;
          }
        }
      }

      // Handle source partner filter
      if (sourcePartnerUserIds && sourcePartnerUserIds.length > 0) {
        if (sourcePartnerUserIds.includes("unallocated")) {
          // For "unallocated" filter, ensure loans have no active collection partner allocation
          // This is already handled by the default whereClause.loan_collection_allocated_partner.none condition
          // So we don't need to add anything additional here
        } else {
          // Filter by specific partners - only get loans currently allocated to these partners
          whereClause.loan_collection_allocated_partner = {
            some: {
              partnerUserId: { in: sourcePartnerUserIds },
              isDeallocated: false,
            },
          };
        }
      }

      // Step 1: Find all unallocated loans matching the filters
      const unallocatedLoans = await this.prisma.loan.findMany({
        where: whereClause,
        select: {
          id: true,
          formattedLoanId: true,
          amount: true,
          userId: true,
          user: {
            select: {
              userDetails: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });
      if (unallocatedLoans.length === 0) {
        return {
          success: true,
          message: "No unallocated loans found",
          allocatedCount: 0,
          failedCount: 0,
          details: [],
        };
      }

      // Step 2: Process each unallocated loan
      const details: Array<{
        loanId: string;
        formattedLoanId: string;
        status: "success" | "failed";
        partnerUserId?: string;
        error?: string;
      }> = [];
      let allocatedCount = 0;
      let failedCount = 0;

      for (const loan of unallocatedLoans) {
        try {
          // Get next available collection partner
          const nextPartnerUser = await this.nextPartnerCollectionUserId(
            brandId,
            autoAllocationType
          );

          if (!nextPartnerUser) {
            console.warn(
              `⚠️ No available collection partner for loan ${loan.formattedLoanId}`
            );
            details.push({
              loanId: loan.id,
              formattedLoanId: loan.formattedLoanId,
              status: "failed",
              error: "No available collection partner",
            });
            failedCount++;
            continue;
          }

          // Step 3: Create allocation records in transaction
          await this.prisma.$transaction(async (tx) => {
            const partnerIds = [
              nextPartnerUser.id,
              nextPartnerUser.reportsToId,
            ].filter(Boolean);

            // Create allocations for the partner and their supervisor
            for (const partnerId of partnerIds) {
              const existingActiveAllocation =
                await tx.loan_collection_allocated_partner.findFirst({
                  where: {
                    loanId: loan.id,
                    partnerUserId: partnerId,
                    isActive: true,
                  },
                });

              if (!existingActiveAllocation) {
                await tx.loan_collection_allocated_partner.create({
                  data: {
                    loanId: loan.id,
                    partnerUserId: partnerId,
                    allocatedAt: this.getIndianTime(),
                    amount: loan.amount || 0,
                    remarks: remarks || null,
                    isDeallocated: false,
                    isActive: true,
                  },
                });
              }
            }
          });
          details.push({
            loanId: loan.id,
            formattedLoanId: loan.formattedLoanId,
            status: "success",
            partnerUserId: nextPartnerUser.id,
          });
          allocatedCount++;

          // Send notification about allocation
          try {
            const userName =
              loan.user?.userDetails?.firstName &&
              loan.user?.userDetails?.lastName
                ? `${loan.user.userDetails.firstName} ${loan.user.userDetails.lastName}`
                : "Unknown User";

            await this.notificationService.create({
              title: "Loan Auto-Allocated for Collection",
              message: `Loan ${loan.formattedLoanId} has been auto-allocated to collection. Customer: ${userName}, Amount: ₹${loan.amount}`,
              priority: notification_priority_enum.MEDIUM,
              loanId: loan.id,
              userId: loan.userId,
              targets: [
                {
                  partnerUserId: nextPartnerUser.id,
                  platform: platform_type.PARTNER,
                },
              ],
            });
          } catch (notificationError) {
            console.error(
              `Failed to send allocation notification for loan ${loan.id}:`,
              notificationError
            );
            // Don't fail the allocation if notification fails
          }
        } catch (error) {
          console.error(
            `❌ Failed to allocate loan ${loan.formattedLoanId}:`,
            error.message
          );
          details.push({
            loanId: loan.id,
            formattedLoanId: loan.formattedLoanId,
            status: "failed",
            error: error.message || "Unknown error",
          });
          failedCount++;
        }
      }
      return {
        success: allocatedCount > 0 || failedCount === 0,
        message: `Auto-allocation completed. ${allocatedCount} loans allocated, ${failedCount} failed.`,
        allocatedCount,
        failedCount,
        details,
      };
    } catch (error) {
      console.error(
        `Error in autoAllocateToAllUnallocatedLoans for brand ${brandId}:`,
        error.message
      );
      throw new BadRequestException(
        `Failed to auto-allocate loans: ${error.message}`
      );
    }
  }
}
