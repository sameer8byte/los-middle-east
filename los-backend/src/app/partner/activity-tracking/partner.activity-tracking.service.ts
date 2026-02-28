import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateActivityReportDto,
  ActivityReportResponseDto,
} from './dto/activity-report.dto';
import {
  CreateInactivityAlertDto,
  InactivityAlertResponseDto,
} from './dto/inactivity-alert.dto';
import {
  GetActivitySessionsDto,
  GetInactiveUsersDto,
  GetActivityStatsDto,
} from './dto/get-activity.dto';

@Injectable()
export class PartnerActivityTrackingService {
  private readonly logger = new Logger(PartnerActivityTrackingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Save activity report from frontend
   */
  async createActivityReport(
    dto: CreateActivityReportDto,
  ): Promise<ActivityReportResponseDto> {
    try {
      // Verify user exists
      const user = await this.prisma.partnerUser.findUnique({
        where: { id: dto.userId },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${dto.userId} not found`);
      }

      // Create or update session
      const session = await this.prisma.partnerUserActivitySession.upsert({
        where: { sessionId: dto.sessionId },
        create: {
          partnerUserId: dto.userId,
          sessionId: dto.sessionId,
          startTime: new Date(dto.startTime),
          endTime: new Date(dto.endTime),
          totalEvents: dto.totalEvents,
          inactiveTimeMs: dto.inactiveTimeMs,
          pageViews: dto.pageViews,
          userAgent: dto.userAgent,
          screenResolution: dto.screenResolution,
        },
        update: {
          endTime: new Date(dto.endTime),
          totalEvents: dto.totalEvents,
          inactiveTimeMs: dto.inactiveTimeMs,
          pageViews: dto.pageViews,
        },
      });

      // Batch insert activity logs
      if (dto.activityLogs && dto.activityLogs.length > 0) {
        // Delete existing logs for this session first
        await this.prisma.partnerUserActivityLog.deleteMany({
          where: { sessionId: dto.sessionId },
        });

        // Insert new logs
        await this.prisma.partnerUserActivityLog.createMany({
          data: dto.activityLogs.map((log) => ({
            sessionId: dto.sessionId,
            timestamp: new Date(log.timestamp),
            eventType: log.eventType,
            pageUrl: log.pageUrl,
            mouseX: log.mouseX,
            mouseY: log.mouseY,
            scrollPos: log.scrollPosition,
          })),
          skipDuplicates: true,
        });
      }

      this.logger.log(
        `Activity report saved for user ${dto.userId}, session ${dto.sessionId}`,
      );

      return {
        success: true,
        reportId: session.id,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        reportId: '',
        timestamp: Date.now(),
        error: error.message,
      };
    }
  }

  /**
   * Log inactivity alert
   */
  async createInactivityAlert(
    dto: CreateInactivityAlertDto,
  ): Promise<InactivityAlertResponseDto> {
    try {
      const alert = await this.prisma.partnerUserInactivityAlert.create({
        data: {
          partnerUserId: dto.userId,
          inactiveTimeSeconds: dto.inactiveTimeSeconds,
          lastActivityTime: new Date(dto.lastActivityTimestamp),
          currentPage: dto.currentPage,
        },
      });

      this.logger.warn(
        `Inactivity alert: User ${dto.userId} inactive for ${dto.inactiveTimeSeconds}s on ${dto.currentPage}`,
      );

      return {
        success: true,
        alertId: alert.id,
        timestamp: Date.now(),
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get activity sessions with filtering and pagination
   */
  async getActivitySessions(dto: GetActivitySessionsDto) {
    const { userId, sessionId, startDate, endDate, page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (userId) where.partnerUserId = userId;
    if (sessionId) where.sessionId = sessionId;
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) {
        // Start of the day (00:00:00)
        where.startTime.gte = new Date(startDate);
      }
      if (endDate) {
        // End of the day (23:59:59.999)
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        where.startTime.lte = endOfDay;
      }
    }
    const [sessions, total] = await Promise.all([
      this.prisma.partnerUserActivitySession.findMany({
        where,
        include: {
          partnerUser: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          activityLogs: {
            take: 10, // Include only last 10 logs per session
            orderBy: { timestamp: 'desc' },
          },
        },
        orderBy: { startTime: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.partnerUserActivitySession.count({ where }),
    ]);

    return {
      data: sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get inactive users report
   */
  async getInactiveUsers(dto: GetInactiveUsersDto) {
    const {
      userId,
      minInactiveSeconds = 300,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = dto;
    const skip = (page - 1) * limit;

    const where: any = {
      inactiveTimeSeconds: { gte: minInactiveSeconds },
    };

    if (userId) {
      where.partnerUserId = userId;
    }

    if (startDate || endDate) {
      where.alertSentAt = {};
      if (startDate) {
        // Start of the day (00:00:00)
        where.alertSentAt.gte = new Date(startDate);
      }
      if (endDate) {
        // End of the day (23:59:59.999)
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        where.alertSentAt.lte = endOfDay;
      }
    }

    const [alerts, total] = await Promise.all([
      this.prisma.partnerUserInactivityAlert.findMany({
        where,
        include: {
          partnerUser: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: { alertSentAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.partnerUserInactivityAlert.count({ where }),
    ]);

    return {
      data: alerts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get activity statistics
   */
  async getActivityStats(dto: GetActivityStatsDto) {
    const { userId, startDate, endDate } = dto;

    const where: any = {};
    if (userId) where.partnerUserId = userId;
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) {
        // Start of the day (00:00:00)
        where.startTime.gte = new Date(startDate);
      }
      if (endDate) {
        // End of the day (23:59:59.999)
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        where.startTime.lte = endOfDay;
      }
    }

    // Get session statistics
    const sessions = await this.prisma.partnerUserActivitySession.findMany({
      where,
      include: {
        activityLogs: true,
      },
    });

    // Calculate statistics
    const totalSessions = sessions.length;
    const totalEvents = sessions.reduce((sum, s) => sum + s.totalEvents, 0);
    const totalInactiveTime = sessions.reduce(
      (sum, s) => sum + s.inactiveTimeMs,
      0,
    );
    const totalActiveTime = sessions.reduce((sum, s) => {
      const duration =
        new Date(s.endTime || s.startTime).getTime() -
        new Date(s.startTime).getTime();
      return sum + (duration - s.inactiveTimeMs);
    }, 0);

    // Get event type breakdown
    const allLogs = sessions.flatMap((s) => s.activityLogs);
    const eventBreakdown = {
      mouse: allLogs.filter((l) => l.eventType === 'mouse').length,
      scroll: allLogs.filter((l) => l.eventType === 'scroll').length,
      keyboard: allLogs.filter((l) => l.eventType === 'keyboard').length,
      click: allLogs.filter((l) => l.eventType === 'click').length,
    };

    // Get unique pages
    const uniquePages = new Set<string>();
    sessions.forEach((s) => s.pageViews.forEach((p) => uniquePages.add(p)));

    // Average metrics
    const avgEventsPerSession =
      totalSessions > 0 ? totalEvents / totalSessions : 0;
    const avgSessionDuration =
      totalSessions > 0
        ? sessions.reduce((sum, s) => {
            const duration =
              new Date(s.endTime || s.startTime).getTime() -
              new Date(s.startTime).getTime();
            return sum + duration;
          }, 0) / totalSessions
        : 0;

    return {
      summary: {
        totalSessions,
        totalEvents,
        totalActiveTimeMs: totalActiveTime,
        totalInactiveTimeMs: totalInactiveTime,
        uniquePages: uniquePages.size,
        avgEventsPerSession: Math.round(avgEventsPerSession),
        avgSessionDurationMs: Math.round(avgSessionDuration),
      },
      eventBreakdown,
      topPages: Array.from(uniquePages).slice(0, 10),
    };
  }

  /**
   * Get detailed session by ID
   */
  async getSessionDetails(sessionId: string) {
    const session = await this.prisma.partnerUserActivitySession.findUnique({
      where: { sessionId },
      include: {
        partnerUser: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        activityLogs: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    return session;
  }

  /**
   * Delete old activity data (cleanup job)
   */
  async cleanupOldData(daysToKeep: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.partnerUserActivitySession.deleteMany({
      where: {
        startTime: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(
      `Cleaned up ${result.count} activity sessions older than ${daysToKeep} days`,
    );

    return {
      deleted: result.count,
      cutoffDate,
    };
  }
}


