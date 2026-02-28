import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { NotificationService } from "src/features/notification/notification.service";
import { AwsAuditLogsSqsService } from "src/core/aws/sqs/aws-audit-logs-sqs.service";
import { AuthenticatedPartnerUser } from "src/common/types/partner-user.types";
import { getRoleId, RoleEnum } from "src/constant/roles";
import { notification_priority_enum, platform_type } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
@Injectable()
export class AutoAllocationUserService {
  private readonly logger = new Logger(AutoAllocationUserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    @Optional() private readonly awsAuditLogsSqsService: AwsAuditLogsSqsService,
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
   * Parse a date string in Indian timezone
   * @param dateString - Date string to parse (YYYY-MM-DD format)
   * @param isEndOfDay - If true, set time to 23:59:59.999 (end of day), otherwise 00:00:00 (start of day)
   * @returns Parsed date adjusted for IST timezone offset
   */
  private parseIndianDate(
    dateString: string,
    isEndOfDay: boolean = false,
  ): Date {
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

  async autoAllocateAllUsers(
    brandId: string,
    autoAllocationType: string = "LOGIN",
  ): Promise<{ userId: string; partnerUserId: string }[]> {
    this.logger.log(
      `[AutoAllocation] Starting allocation for brandId: ${brandId}`,
    );
    const users = await this.prisma.user.findMany({
      where: {
        brandId: brandId,
        allocated_partner_user_id: null,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (users.length === 0) {
      this.logger.log(
        `[AutoAllocation] No unallocated users found for brandId: ${brandId}`,
      );
      return [];
    }
    const allocations: { userId: string; partnerUserId: string }[] = [];

    for (const user of users) {
      const partnerUser = await this.getNextPartnerUserForAllocation(
        brandId,
        autoAllocationType,
      );

      if (!partnerUser) {
        this.logger.warn(
          `[AutoAllocation] No more partner users available for allocation.`,
        );
        break; // Stop if no partner user is available
      }

      await this.allotUserToPartner(user.id, partnerUser.id);

      this.logger.log(
        `[AutoAllocation] Allotted user ${user.id} to partner user ${partnerUser.id}`,
      );

      allocations.push({
        userId: user.id,
        partnerUserId: partnerUser.id,
      });
    }

    return allocations;
  }

  async getNextPartnerUserForAllocation(
    brandId: string,
    autoAllocationType: string = "ATTENDANCE",
  ): Promise<any> {
    this.logger.log(
      `Finding next partner user for allocation in brandId: ${brandId} with type: ${autoAllocationType}`,
    );

    try {
      let query: any;

      if (autoAllocationType === "LOGIN") {
        [query] = await this.prisma.$queryRaw<any[]>`
    WITH valid_users AS (
  SELECT pu.id
  FROM partner_users pu
  INNER JOIN partner_user_permissions pup 
      ON pu.id = pup."partnerUserId"
  INNER JOIN partner_permissions pp 
      ON pup."partnerPermissionId" = pp.id
  INNER JOIN partner_user_brand_roles pubr 
      ON pu.id = pubr."partnerUserId"
  INNER JOIN partner_roles pr 
      ON pubr."roleId" = pr.id
  LEFT JOIN partner_user_login_logs pull 
      ON pu.id = pull."partnerUserId" 
      AND pull.date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
  WHERE 
      pu."isActive" = true
      AND pp.name = 'ONBOARDING_IN_PROGRESS'
      AND pr.name = 'CREDIT_EXECUTIVE'
      AND pubr."brandId" = ${brandId}
      AND (
        pull.id IS NULL 
        OR (
          pull."firstLogin" <= CURRENT_TIMESTAMP
          AND (
            pull."lastLogout" IS NULL 
            OR CURRENT_TIMESTAMP <= pull."lastLogout"
          )
        )
      )
)

SELECT 
  pu.*, 
  COUNT(CASE WHEN (u."allocated_at" AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date THEN u.id END) AS total_user_allocations
FROM valid_users vu
JOIN partner_users pu 
    ON vu.id = pu.id

LEFT JOIN users u 
    ON pu.id::uuid = u."allocated_partner_user_id"
    AND u."isActive" = true
    AND u."brandId" = ${brandId}
    AND u."status_id" NOT IN (4, 5)

WHERE 
    u.id IS NULL OR (u."status_id" NOT IN (4, 5))

GROUP BY pu.id
ORDER BY total_user_allocations ASC, pu."createdAt" ASC
LIMIT 1;
  `;
      } else {
        [query] = await this.prisma.$queryRaw<any[]>`
   WITH valid_users AS (
  SELECT pu.id
  FROM partner_users pu
  INNER JOIN partner_user_permissions pup 
      ON pu.id = pup."partnerUserId"
  INNER JOIN partner_permissions pp 
      ON pup."partnerPermissionId" = pp.id
  INNER JOIN partner_user_brand_roles pubr 
      ON pu.id = pubr."partnerUserId"
  INNER JOIN partner_roles pr 
      ON pubr."roleId" = pr.id
  LEFT JOIN partner_unavailability_dates pud 
      ON pu.id = pud."partnerUserId"
      AND pud.date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
      AND pud."isActive" = true
  WHERE 
      pu."isActive" = true
      AND pp.name = 'ONBOARDING_IN_PROGRESS'
      AND pr.name = 'CREDIT_EXECUTIVE'
      AND pud.id IS NULL
      AND pubr."brandId" = ${brandId}
)
SELECT 
  pu.*, 
  COUNT(u.id) AS total_user_allocations,
  MAX(u."allocated_at") AS last_allocated_at
FROM valid_users vu
JOIN partner_users pu 
    ON vu.id = pu.id
LEFT JOIN (
    SELECT u.id, u."allocated_partner_user_id", u."allocated_at"
    FROM users u
    WHERE 
        u."isActive" = true
        AND u."brandId" = ${brandId}
        AND (u."allocated_at" AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
        AND u."status_id" NOT IN (4, 5)
) u ON pu.id::uuid = u."allocated_partner_user_id"
GROUP BY pu.id
ORDER BY 
    total_user_allocations ASC,
    last_allocated_at ASC NULLS FIRST
LIMIT 1;
        `;
      }
      return query || null;
    } catch (error) {
      this.logger.error(
        `Error finding next partner user for allocation: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  async allotUserToPartner(userId: string, partnerUserId: string) {
    this.logger.log(
      `Allotting user ${userId} to partner user ${partnerUserId}`,
    );

    try {
      // Validate user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Validate partner user exists
      const partnerUser = await this.prisma.partnerUser.findUnique({
        where: { id: partnerUserId },
        select: { id: true, reportsToId: true },
      });

      if (!partnerUser) {
        throw new NotFoundException(
          `Partner user with ID ${partnerUserId} not found`,
        );
      }

      const primaryPartnerId = partnerUser.id;

      // Transaction to ensure all-or-nothing behavior
      const result = await this.prisma.$transaction(async (tx) => {
        // Update user with allocated partner ID
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            allocated_partner_user_id: primaryPartnerId,
            allocated_at: this.getIndianTime(),
          },
        });

        // Create log entry
        const logEntry = await tx.user_allotted_partner_user_logs.create({
          data: {
            id: uuidv4(),
            userId,
            partnerUserId: primaryPartnerId,
            allottedAt: this.getIndianTime(),
          },
        });

        return { updatedUser, logEntry };
      });
      return result;
    } catch (error) {
      this.logger.error(
        `Error allotting user ${userId} to partner ${partnerUserId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Relocate user to a different partner user
   * @param currentUser - Current authenticated partner user
   * @param userId - User ID
   * @param newPartnerUserId - New Partner User ID
   * @returns Updated user allotment record
   */
  async relocateUser(
    currentUser: AuthenticatedPartnerUser,
    userId: string,
    newPartnerUserId: string,
  ) {
    if (!userId || !newPartnerUserId) {
      throw new BadRequestException("All parameters are required.");
    }

    this.logger.log(
      `Relocating user ${userId} to new partner user ${newPartnerUserId}`,
    );

    try {
      // Fetch user with current assignment and new partner in parallel for efficiency
      const [user, newPartnerUser] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            brandId: true,
            formattedUserId: true,
            phoneNumber: true,
            email: true,
            allocated_partner_user_id: true,
            status_id: true,
          },
        }),
        this.prisma.partnerUser.findUnique({
          where: { id: newPartnerUserId },
          select: { id: true, name: true, email: true, reportsToId: true },
        }),
      ]);

      if (!user) {
        throw new NotFoundException("User not found.");
      }

      if (!newPartnerUser) {
        throw new NotFoundException("New partner user not found.");
      }

      const primaryPartnerId = newPartnerUser.id;

      // Transaction to ensure all-or-nothing behavior
      const result = await this.prisma.$transaction(async (tx) => {
        // Update user with new allocated partner ID
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            allocated_partner_user_id: primaryPartnerId,
            allocated_at: this.getIndianTime(),
          },
        });

        // Create log entry for the new allocation
        const logEntry = await tx.user_allotted_partner_user_logs.create({
          data: {
            id: uuidv4(),
            userId,
            partnerUserId: primaryPartnerId,
            allottedAt: this.getIndianTime(),
          },
        });

        return { updatedUser, logEntry };
      });

      try {
        // Get previous partner info for notification context
        const previousPartnerName = user.allocated_partner_user_id
          ? await this.prisma.partnerUser.findUnique({
              where: { id: user.allocated_partner_user_id },
              select: { name: true },
            })
          : null;

        await this.notificationService.create({
          title: "User Reallocated",
          message: `User ${user.formattedUserId || user.id} (${user.phoneNumber || user.email || "No contact"}) has been reallocated from ${previousPartnerName?.name || "None"} to ${newPartnerUser.name || "Unknown Partner"}.`,
          userId: userId,
          partnerRoleId: getRoleId(RoleEnum.CREDIT_EXECUTIVE),
          priority: notification_priority_enum.LOW,
          targets: [
            {
              partnerUserId: primaryPartnerId,
              platform: platform_type.PARTNER,
            },
          ],
          createdByPartnerId: currentUser.id,
        });

        this.logger.log(
          `Notification sent for user reallocation: ${userId} to partner ${newPartnerUserId}`,
        );
      } catch (notificationError) {
        this.logger.error(
          `Failed to send notification for user reallocation: ${notificationError.message}`,
          notificationError.stack,
        );
        // Don't fail the entire operation if notification fails
      }
      return result;
    } catch (error) {
      this.logger.error(
        `Error relocating user ${userId} to partner ${newPartnerUserId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Bulk relocate users with round-robin distribution
   * @param brandId - Brand ID
   * @param createdFrom - Start date for user creation filter
   * @param createdTo - End date for user creation filter
   * @param sourcePartnerUserIds - Source partner user IDs to filter from
   * @param targetPartnerUserIds - Target partner user IDs to allocate to
   * @param isAllTime - If true, ignore date range
   * @param remarks - Optional remarks for the allocation
   * @returns Allocation result summary
   */
  async bulkRelocateUsers(
    brandId: string,
    createdFrom?: string,
    createdTo?: string,
    sourcePartnerUserIds?: string[],
    targetPartnerUserIds?: string[],
    isAllTime: boolean = false,
    remarks?: string,
  ): Promise<{
    success: boolean;
    message: string;
    allocatedCount: number;
    failedCount: number;
    details: Array<{
      userId: string;
      formattedUserId: string;
      status: "success" | "failed";
      partnerUserId?: string;
      error?: string;
    }>;
  }> {
    this.logger.log(
      `Starting bulk user reallocation for brand: ${brandId}, isAllTime: ${isAllTime}`,
    );

    try {
      // Build where clause for user filtering
      const whereClause: any = {
        brandId,
      };

      // Date filtering (unless all-time mode)
      if (!isAllTime && createdFrom && createdTo) {
        whereClause.createdAt = {
          gte: this.parseIndianDate(createdFrom, false), // Start of day
          lte: this.parseIndianDate(createdTo, true), // End of day
        };
      }

      // Source partner filtering
      if (sourcePartnerUserIds && sourcePartnerUserIds.length > 0) {
        if (sourcePartnerUserIds.includes("unallocated")) {
          // Only unallocated users
          whereClause.allocated_partner_user_id = null;
        } else {
          // Users currently assigned to specific partners
          whereClause.allocated_partner_user_id = { in: sourcePartnerUserIds };
        }
      }

      // Fetch users matching criteria
      const users = await this.prisma.user.findMany({
        where: whereClause,
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
          allocated_partner_user_id: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      if (users.length === 0) {
        return {
          success: true,
          message: "No users found matching the criteria",
          allocatedCount: 0,
          failedCount: 0,
          details: [],
        };
      }

      let allocatedCount = 0;
      let failedCount = 0;
      const details: Array<{
        userId: string;
        formattedUserId: string;
        status: "success" | "failed";
        partnerUserId?: string;
        error?: string;
      }> = [];

      // Auto allocation mode - get available partners
      if (!targetPartnerUserIds || targetPartnerUserIds.length === 0) {
        for (const user of users) {
          try {
            const nextPartnerUser = await this.getNextPartnerUserForAllocation(
              brandId,
              "ATTENDANCE",
            );

            if (!nextPartnerUser) {
              details.push({
                userId: user.id,
                formattedUserId: user.formattedUserId || user.id,
                status: "failed",
                error: "No available partner user",
              });
              failedCount++;
              continue;
            }

            await this.allotUserToPartner(user.id, nextPartnerUser.id);

            details.push({
              userId: user.id,
              formattedUserId: user.formattedUserId || user.id,
              status: "success",
              partnerUserId: nextPartnerUser.id,
            });
            allocatedCount++;

            this.logger.log(
              `✅ Auto-allocated user ${user.formattedUserId} to partner ${nextPartnerUser.id}`,
            );
          } catch (error) {
            this.logger.error(
              `❌ Failed to auto-allocate user ${user.id}: ${error.message}`,
            );
            details.push({
              userId: user.id,
              formattedUserId: user.formattedUserId || user.id,
              status: "failed",
              error: error.message,
            });
            failedCount++;
          }
        }
      } else {
        // Manual allocation with round-robin distribution
        const partnerUsers = await this.prisma.partnerUser.findMany({
          where: {
            id: { in: targetPartnerUserIds },
            isActive: true,
          },
          select: {
            id: true,
            name: true,
          },
        });

        if (partnerUsers.length === 0) {
          throw new BadRequestException("No valid target partner users found");
        }

        let partnerIndex = 0;
        for (const user of users) {
          try {
            const targetPartner = partnerUsers[partnerIndex];
            await this.allotUserToPartner(user.id, targetPartner.id);

            details.push({
              userId: user.id,
              formattedUserId: user.formattedUserId || user.id,
              status: "success",
              partnerUserId: targetPartner.id,
            });
            allocatedCount++;

            // Round-robin: move to next partner
            partnerIndex = (partnerIndex + 1) % partnerUsers.length;

            this.logger.log(
              `✅ Allocated user ${user.formattedUserId} to partner ${targetPartner.name}`,
            );
          } catch (error) {
            this.logger.error(
              `❌ Failed to allocate user ${user.id}: ${error.message}`,
            );
            details.push({
              userId: user.id,
              formattedUserId: user.formattedUserId || user.id,
              status: "failed",
              error: error.message,
            });
            failedCount++;
          }
        }
      }

      const message = `Bulk allocation completed. ${allocatedCount} users allocated successfully, ${failedCount} failed.`;

      this.logger.log(message);

      return {
        success: true,
        message,
        allocatedCount,
        failedCount,
        details,
      };
    } catch (error) {
      this.logger.error(
        `Error in bulk user reallocation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get users for allocation with filtering
   * @param brandId - Brand ID
   * @param createdFrom - Start date for filtering
   * @param createdTo - End date for filtering
   * @param sourcePartnerUserIds - Source partner user IDs
   * @param isAllTime - If true, ignore date range
   * @param limit - Maximum number of users to return
   * @returns Filtered users for allocation
   */
  async getUsersForAllocation(
    brandId: string,
    createdFrom?: string,
    createdTo?: string,
    sourcePartnerUserIds?: string[],
    isAllTime: boolean = false,
    limit: number = 200,
  ): Promise<{
    users: Array<{
      id: string;
      phoneNumber: string;
      formattedUserId?: string;
      allocatedPartnerUser?: {
        id: string;
        name: string;
      } | null;
      createdAt: Date;
    }>;
    totalCount: number;
  }> {
    this.logger.log(
      `Getting users for allocation: brand=${brandId}, isAllTime=${isAllTime}`,
    );

    try {
      // Build where clause for user filtering
      const whereClause: any = {
        brandId,
      };

      // Date filtering (unless all-time mode)
      if (!isAllTime && createdFrom && createdTo) {
        whereClause.createdAt = {
          gte: this.parseIndianDate(createdFrom, false), // Start of day
          lte: this.parseIndianDate(createdTo, true), // End of day
        };
      }

      // Source partner filtering
      if (sourcePartnerUserIds && sourcePartnerUserIds.length > 0) {
        if (sourcePartnerUserIds.includes("unallocated")) {
          // Only unallocated users
          whereClause.allocated_partner_user_id = null;
        } else {
          // Users currently assigned to specific partners
          whereClause.allocated_partner_user_id = { in: sourcePartnerUserIds };
        }
      }

      // Get total count for pagination info
      const totalCount = await this.prisma.user.count({
        where: whereClause,
      });

      // Fetch users with limit
      const users = await this.prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          phoneNumber: true,
          formattedUserId: true,
          allocated_partner_user_id: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
      });

      // Get partner user details for allocated users
      const partnerIds = users
        .map((u) => u.allocated_partner_user_id)
        .filter(Boolean);
      const partnerUsers =
        partnerIds.length > 0
          ? await this.prisma.partnerUser.findMany({
              where: { id: { in: partnerIds } },
              select: { id: true, name: true },
            })
          : [];

      const partnerMap = new Map(partnerUsers.map((p) => [p.id, p]));

      // Transform the data to match expected interface
      const transformedUsers = users.map((user) => ({
        id: user.id,
        phoneNumber: user.phoneNumber || "",
        formattedUserId: user.formattedUserId,
        allocatedPartnerUser: user.allocated_partner_user_id
          ? partnerMap.get(user.allocated_partner_user_id)
          : null,
        createdAt: user.createdAt,
      }));

      this.logger.log(
        `Found ${transformedUsers.length} users for allocation (total: ${totalCount})`,
      );

      return {
        users: transformedUsers,
        totalCount,
      };
    } catch (error) {
      this.logger.error(
        `Error getting users for allocation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Wrapper method to allocate specific customers to a partner user
   * Uses bulkRelocateUsers internally with customer ID validation
   * @param brandId - Brand ID
   * @param customerIds - Array of customer IDs to allocate (max 5)
   * @param partnerUserId - Partner user ID to allocate to
   * @returns Allocation result for specified customers
   */
  async allocateCustomersToPartnerUser(
    brandId: string,
    customerIds: string[],
    partnerUserId: string,
  ) {
    // Validation: Check if customer IDs array is not empty
    if (!customerIds || customerIds.length === 0) {
      throw new BadRequestException("No customers selected for allocation");
    }

    // Validation: Check if customer count doesn't exceed max limit
    if (customerIds.length > 5) {
      throw new BadRequestException(
        "Maximum 5 customers can be allocated at once",
      );
    }

    // Verify all customers exist and belong to the same brand
    const customersToAllocate = await this.prisma.user.findMany({
      where: {
        id: { in: customerIds },
        brandId,
        isActive: true,
      },
    });

    if (customersToAllocate.length !== customerIds.length) {
      throw new BadRequestException(
        "One or more customers not found in this brand",
      );
    }

    // Verify target partner user belongs to the same brand
    const targetPartnerUser = await this.prisma.partnerUser.findFirst({
      where: {
        id: partnerUserId,
        brandRoles: {
          some: {
            brandId: brandId,
          },
        },
      },
    });

    if (!targetPartnerUser) {
      throw new NotFoundException(
        "Partner user not found or does not belong to this brand",
      );
    }

    // Allocate each customer individually using allotUserToPartner
    const results = [];
    for (const customerId of customerIds) {
      try {
        await this.allotUserToPartner(customerId, partnerUserId);
        results.push({
          userId: customerId,
          status: "success",
          partnerUserId: partnerUserId,
        });
      } catch (error) {
        this.logger.error(
          `Failed to allocate customer ${customerId}: ${error.message}`,
        );
        results.push({
          userId: customerId,
          status: "failed",
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.status === "success").length;
    const failedCount = results.filter((r) => r.status === "failed").length;

    return {
      success: successCount > 0,
      message:
        successCount > 0
          ? `Successfully allocated ${successCount} customer(s)`
          : "Failed to allocate customers",
      allocatedCount: successCount,
      failedCount: failedCount,
      details: results,
    };
  }
}
