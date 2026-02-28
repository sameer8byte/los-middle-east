import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { VALID_PROVIDER_MESSAGE_IDS } from "src/constant/reminder-provider-messages";

@Injectable()
export class UserRemindersService {
  constructor(private readonly prisma: PrismaService) {}

  private buildDateRange(from?: string, to?: string) {
    if (!from && !to) return undefined;

    const range: {
      gte?: Date;
      lte?: Date;
    } = {};

    if (from) {
      const start = new Date(from);

      if (Number.isNaN(start.getTime())) {
        throw new BadRequestException(`Invalid from date: ${from}`);
      }

      start.setHours(0, 0, 0, 0);
      range.gte = start;
    }

    if (to) {
      const end = new Date(to);

      if (Number.isNaN(end.getTime())) {
        throw new BadRequestException(`Invalid to date: ${to}`);
      }

      end.setHours(23, 59, 59, 999);
      range.lte = end;
    }

    return Object.keys(range).length ? range : undefined;
  }

  private parseFilterArray(filterValue?: string): string[] {
    if (!filterValue) return [];

    try {
      if (filterValue.startsWith("[")) {
        return JSON.parse(filterValue);
      }
      return [filterValue];
    } catch {
      return [];
    }
  }

  // Removed - using Prisma relations instead

  async getAllUserReminders(
    brandId: string,
    filters: {
      page?: number;
      limit?: number;
      search?: string;
      channel?: string;
      status?: string;
      createdAtFrom?: string;
      createdAtTo?: string;
      scheduledFrom?: string;
      scheduledTo?: string;
    },
  ) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const skip = (page - 1) * limit;

    const pChannel = this.parseFilterArray(filters.channel);
    const pStatus = this.parseFilterArray(filters.status);

    // Base user filter — always scope to brandId
    const userWhere: any = { brandId };

    if (filters.search?.trim()) {
      userWhere.OR = [
        { phoneNumber: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
        { formattedUserId: { contains: filters.search, mode: "insensitive" } },
        {
          userDetails: {
            OR: [
              { firstName: { contains: filters.search, mode: "insensitive" } },
              { middleName: { contains: filters.search, mode: "insensitive" } },
              { lastName: { contains: filters.search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    // Build reminder-level where using a nested relation filter
    const where: any = {
      users: { is: userWhere }, // let the DB do the join
    };

    const createdRange = this.buildDateRange(
      filters.createdAtFrom,
      filters.createdAtTo,
    );
    if (createdRange) where.created_at = createdRange;

    const scheduledRange = this.buildDateRange(
      filters.scheduledFrom,
      filters.scheduledTo,
    );
    if (scheduledRange) where.scheduled_at = scheduledRange;

    if (pChannel.length > 0) where.channel = { in: pChannel };
    if (pStatus.length > 0) where.status = { in: pStatus };

    const [reminders, total] = await Promise.all([
      this.prisma.user_reminders.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          users: {
            select: {
              id: true,
              formattedUserId: true,
              phoneNumber: true,
              email: true,
              userDetails: {
                select: { firstName: true, middleName: true, lastName: true },
              },
              onboardingStep: true,
            },
          },
        },
      }),
      this.prisma.user_reminders.count({ where }),
    ]);

    return {
      data: reminders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
  async getReminderAuditLogs(reminderId: string, event?: string) {
    const pEvent = (() => {
      try {
        if (!event) return [];
        if (event.startsWith("[")) {
          return JSON.parse(event);
        }
        return [event];
      } catch {
        return [];
      }
    })();
    const where: any = {
      user_reminder_id: reminderId,
    };

    if (pEvent.length > 0) {
      where.event = { in: pEvent };
    }
    const auditLogs = await this.prisma.user_reminder_audit_logs.findMany({
      where,
      select: {
        id: true,
        event: true,
        metadata: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
    });

    return auditLogs;
  }

  async getDashboardMetrics(brandId: string) {
    try {
      const metrics = await this.prisma.$queryRawUnsafe(
        `SELECT * FROM mv_reminder_dashboard_metrics`,
      );
      // Convert BigInt values to regular numbers for JSON serialization
      const serializedMetrics = (metrics as any[]).map((metric) => {
        const converted: any = {};
        for (const [key, value] of Object.entries(metric)) {
          converted[key] = typeof value === "bigint" ? Number(value) : value;
        }
        return converted;
      });

      return serializedMetrics || [];
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      return [];
    }
  }

  async refreshDashboardMetrics(brandId: string) {
    try {
      await this.prisma.$executeRawUnsafe(
        `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_reminder_dashboard_metrics`,
      );
      return {
        success: true,
        message: "Dashboard metrics refreshed successfully",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error refreshing dashboard metrics:", error);
      throw new BadRequestException(
        "Failed to refresh dashboard metrics. Please try again.",
      );
    }
  }
  async createUserReminder(
    brandId: string,
    data: {
      userId: string;
      channel: string;
      templateCode: string;
      scheduledAt: string;
      providerMessageId?: string;
      payload?: any;
    },
  ) {
    // Verify user belongs to brand
    const user = await this.prisma.user.findFirst({
      where: { id: data.userId, brandId },
    });

    if (!user) {
      throw new BadRequestException(
        "User not found or does not belong to this brand",
      );
    }

    // Validate provider message ID if provided
    if (
      data.providerMessageId &&
      !VALID_PROVIDER_MESSAGE_IDS.includes(data.providerMessageId)
    ) {
      throw new BadRequestException(
        `Invalid provider message ID. Valid options are: ${VALID_PROVIDER_MESSAGE_IDS.join(", ")}`,
      );
    }

    const reminder = await this.prisma.user_reminders.create({
      data: {
        user_id: data.userId,
        channel: data.channel,
        template_code: data.templateCode,
        scheduled_at: new Date(data.scheduledAt),
        provider_message_id: data.providerMessageId || null,
        payload: data.payload || null,
        status: "PENDING",
        retry_count: 0,
      },
    });

    return reminder;
  }
}
