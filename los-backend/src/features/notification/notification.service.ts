import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationTargetDto } from './dto/notification-target.dto';
import { getRoleId, RoleEnum } from '../../constant/roles';
import { notification_priority_enum, platform_type } from '@prisma/client';


@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createNotificationDto: CreateNotificationDto) {
    const { targets, expiresAt, scheduledAt, ...notificationData } = createNotificationDto;

    // Get default admin and super admin users
    const defaultTargets = await this.getDefaultAdminTargets(notificationData.brandId);
    
    // Combine provided targets with default admin targets, avoiding duplicates
    const allTargets = this.mergeTargets(targets || [], defaultTargets);

    const notification = await this.prisma.notifications.create({
      data: {
        ...notificationData,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        sentAt: scheduledAt ? null : new Date(), // Only set sentAt if not scheduled
        targets: allTargets.length > 0 ? {
          create: allTargets.map(target => ({
            partnerUserId: target.partnerUserId,
            platform: target.platform,
          }))
        } : undefined,
      },
      include: {
        targets: {
          include: {
            partnerUser: true,
          },
        },
      },
    });

    return notification;
  }

  async findAll(
    skip: number = 0,
    take: number = 10,
    filterBy?: { loanId?: string; userId?: string; partnerUserId?: string; partnerRoleId?: number; priority?: string }
  ) {
    const whereClause: any = {};
    
    if (filterBy?.loanId) {
      whereClause.loanId = filterBy.loanId;
    }
    
    if (filterBy?.userId) {
      whereClause.userId = filterBy.userId;
    }

    if (filterBy?.partnerRoleId) {
      whereClause.partnerRoleId = filterBy.partnerRoleId;
    }

    if (filterBy?.priority) {
      whereClause.priority = filterBy.priority;
    }
    
    if (filterBy?.partnerUserId) {
      whereClause.targets = {
        some: {
          partnerUserId: filterBy.partnerUserId
        }
      };
    }

    return await this.prisma.notifications.findMany({
      where: whereClause,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        targets: {
          include: {
            partnerUser: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const notification = await this.prisma.notifications.findUnique({
      where: { id },
      include: {
        targets: {
          include: {
            partnerUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        loan: {
          select: {
            id: true,
            formattedLoanId: true,
            amount: true,
            status: true,
          },
        },
        user: {
          select: {
            id: true,
            phoneNumber: true,
            email: true,
            formattedUserId: true,
          },
        },
      },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    return notification;
  }

  async update(id: string, updateNotificationDto: UpdateNotificationDto) {
    await this.findOne(id);

    const notification = await this.prisma.notifications.update({
      where: { id },
      data: updateNotificationDto,
      include: {
        targets: {
          include: {
            partnerUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        loan: {
          select: {
            id: true,
            formattedLoanId: true,
            amount: true,
            status: true,
          },
        },
        user: {
          select: {
            id: true,
            phoneNumber: true,
            email: true,
            formattedUserId: true,
          },
        },
      },
    });

    return notification;
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.notifications.delete({
      where: { id },
    });

    return { message: 'Notification deleted successfully' };
  }

  async markAsRead(targetId: string) {
    const target = await this.prisma.notification_targets.findUnique({
      where: { id: targetId },
    });

    if (!target) {
      throw new NotFoundException(`Notification target with ID ${targetId} not found`);
    }

    const updatedTarget = await this.prisma.notification_targets.update({
      where: { id: targetId },
      data: { 
        isRead: true,
        readAt: new Date(),
      },
      include: {
        partnerUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        notification: true,
      },
    });

    return updatedTarget;
  }

  async markAsUnread(targetId: string) {
    const target = await this.prisma.notification_targets.findUnique({
      where: { id: targetId },
    });

    if (!target) {
      throw new NotFoundException(`Notification target with ID ${targetId} not found`);
    }

    const updatedTarget = await this.prisma.notification_targets.update({
      where: { id: targetId },
      data: { isRead: false },
      include: {
        notification: true,
        partnerUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return updatedTarget;
  }

  async getNotificationsForPartnerUser(partnerUserId: string) {
    return await this.prisma.notifications.findMany({
      where: {
        targets: {
          some: {
            partnerUserId: partnerUserId,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        targets: {
          where: { partnerUserId },
          include: {
            partnerUser: true,
          },
        },
      },
    });
  }

  async getNotificationsForPartnerUserWithPagination(
    partnerUserId: string,
    skip = 0,
    limit = 10,
    filters: {
      priority?: string;
      readStatus?: string;
      acknowledgedStatus?: string;
      dateRange?: string;
    } = {},
  ) {

  
    // --- Build base where clause ---
    const whereClause: any = {
      targets: { some: { partnerUserId } },
    };
  
    // --- Priority filter ---
    if (filters.priority && filters.priority !== 'ALL') {
      whereClause.priority = filters.priority;
    }
  
    // --- Date range filter ---
    if (filters.dateRange && filters.dateRange !== 'ALL') {
      const now = new Date();
      let startDate: Date | undefined;
  
      switch (filters.dateRange) {
        case 'TODAY':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'WEEK':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'MONTH':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }
  
      if (startDate) {
        whereClause.createdAt = { gte: startDate };
      }
    }
  
  
    // --- Base Prisma query ---
    const baseQuery: any = {
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        targets: {
          where: { partnerUserId },
          include: {
            partnerUser: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        loan: {
          select: {
            id: true,
            formattedLoanId: true,
            amount: true,
            status: true,
          },
        },
        user: {
          select: {
            id: true,
            phoneNumber: true,
            email: true,
            formattedUserId: true,
          },
        },
        createdByPartner: {
          select: { id: true, name: true, email: true },
        },
        partnerRole: {
          select: { id: true, name: true, description: true },
        },
      },
      skip,
      take: limit,
    };
  
    // --- Execute DB queries ---
    const [notifications, total] = await Promise.all([
      this.prisma.notifications.findMany(baseQuery),
      this.prisma.notifications.count({ where: whereClause }),
    ]);
  
    // --- Apply in-memory filters ---
    let filteredNotifications = notifications;
  
    if (filters.readStatus && filters.readStatus !== 'ALL') {
      filteredNotifications = filteredNotifications.filter((notification: any) => {
        const target = notification.targets?.find(
          (t: any) => t.partnerUserId === partnerUserId,
        );
        const isRead = !!target?.isRead;
        return filters.readStatus === 'READ' ? isRead : !isRead;
      });
    }
  
    if (filters.acknowledgedStatus && filters.acknowledgedStatus !== 'ALL') {
      filteredNotifications = filteredNotifications.filter((notification: any) => {
        const target = notification.targets?.find(
          (t: any) => t.partnerUserId === partnerUserId,
        );
        const isAck = !!target?.acknowledgedAt;
        return filters.acknowledgedStatus === 'ACKNOWLEDGED' ? isAck : !isAck;
      });
    }
  
    // --- Pagination info ---
    const totalFiltered = filteredNotifications.length;
    const totalPages = Math.ceil(total / limit);
  
    return {
      notifications: filteredNotifications,
      total,
      totalFiltered,
      currentPage: Math.floor(skip / limit) + 1,
      totalPages,
      hasMore: skip + limit < total,
    };
  }
  
  

  async getUnreadCount(partnerUserId: string): Promise<number> {
    return await this.prisma.notification_targets.count({
      where: {
        partnerUserId,
        isRead: false,
      },
    });
  }

  async addTarget(notificationId: string, targetDto: NotificationTargetDto) {
    await this.findOne(notificationId);

    const target = await this.prisma.notification_targets.create({
      data: {
        notificationId,
        partnerUserId: targetDto.partnerUserId,
        platform: targetDto.platform,
        isRead: false,
      },
      include: {
        partnerUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        notification: true,
      },
    });

    return target;
  }

  async removeTarget(targetId: string) {
    const target = await this.prisma.notification_targets.findUnique({
      where: { id: targetId },
    });

    if (!target) {
      throw new NotFoundException(`Notification target with ID ${targetId} not found`);
    }

    await this.prisma.notification_targets.delete({
      where: { id: targetId },
    });

    return { message: 'Notification target removed successfully' };
  }

  async markTargetAsRead(targetId: string) {
    const target = await this.prisma.notification_targets.findUnique({
      where: { id: targetId },
    });

    if (!target) {
      throw new NotFoundException(`Notification target with ID ${targetId} not found`);
    }

    const updatedTarget = await this.prisma.notification_targets.update({
      where: { id: targetId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      include: {
        partnerUser: true,
        notification: true,
      },
    });

    return updatedTarget;
  }

  async markTargetAsAcknowledged(targetId: string) {
    const target = await this.prisma.notification_targets.findUnique({
      where: { id: targetId },
    });

    if (!target) {
      throw new NotFoundException(`Notification target with ID ${targetId} not found`);
    }

    const updatedTarget = await this.prisma.notification_targets.update({
      where: { id: targetId },
      data: {
        acknowledgedAt: new Date(),
      },
      include: {
        partnerUser: true,
        notification: true,
      },
    });

    return updatedTarget;
  }

  async markAsAcknowledged(id: string) {
    return await this.prisma.notifications.update({
      where: { id },
      data: {
        acknowledgedAt: new Date(),
      },
      include: {
        targets: {
          include: {
            partnerUser: true,
          },
        },
      },
    });
  }

  async getScheduledNotifications() {
    return await this.prisma.notifications.findMany({
      where: {
        scheduledAt: {
          lte: new Date(),
        },
        sentAt: null,
      },
      include: {
        targets: {
          include: {
            partnerUser: true,
          },
        },
      },
    });
  }

  async markAsSent(id: string) {
    return await this.prisma.notifications.update({
      where: { id },
      data: {
        sentAt: new Date(),
      },
    });
  }

  async getNotificationsByPriority(priority:notification_priority_enum ) {
    return await this.prisma.notifications.findMany({
      where: { priority },
      orderBy: { createdAt: 'desc' },
      include: {
        targets: {
          include: {
            partnerUser: true,
          },
        },
      },
    });
  }

  /**
   * Get default admin and super admin users as notification targets
   */
  private async getDefaultAdminTargets(brandId?: string): Promise<NotificationTargetDto[]> {
    // Get admin role IDs
    const adminRoleId = getRoleId(RoleEnum.ADMIN);
    const superAdminRoleId = getRoleId(RoleEnum.SUPER_ADMIN);

    // Build query conditions for admin users
    const adminConditions = [];
    
    // Global admins (super admins)
    if (superAdminRoleId) {
      adminConditions.push({
        globalRoles: {
          some: {
            roleId: superAdminRoleId,
          },
        },
      });
    }

    // Brand-specific admins (if brandId is provided)
    if (brandId && adminRoleId) {
      adminConditions.push({
        brandRoles: {
          some: {
            brandId: brandId,
            roleId: adminRoleId,
          },
        },
      });
    }

    // If no conditions, return empty array
    if (adminConditions.length === 0) {
      return [];
    }

    // Fetch admin users
    const adminUsers = await this.prisma.partnerUser.findMany({
      where: {
        AND: [
          { isActive: true },
          {
            OR: adminConditions,
          },
        ],
      },
      select: { id: true },
    });

    // Convert to notification targets
    return adminUsers.map(user => ({
      partnerUserId: user.id,
      platform: platform_type.PARTNER,
    }));
  }

  /**
   * Mark all unread notifications as read for a specific partner user
   */
  async markAllAsReadForUser(partnerUserId: string) {
    // Find all unread targets for this user
    const unreadTargets = await this.prisma.notification_targets.findMany({
      where: {
        partnerUserId,
        isRead: false,
      },
      select: {
        id: true,
      },
    });

    if (unreadTargets.length === 0) {
      return {
        message: 'No unread notifications found',
        updated: 0,
      };
    }

    // Bulk update all unread targets to read
    const result = await this.prisma.notification_targets.updateMany({
      where: {
        partnerUserId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      message: `Successfully marked ${result.count} notifications as read`,
      updated: result.count,
    };
  }

  /**
   * Mark all unacknowledged notifications as acknowledged for a specific partner user
   */
  async markAllAsAcknowledgedForUser(partnerUserId: string) {
    // Find all unacknowledged targets for this user
    const unacknowledgedTargets = await this.prisma.notification_targets.findMany({
      where: {
        partnerUserId,
        acknowledgedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (unacknowledgedTargets.length === 0) {
      return {
        message: 'No unacknowledged notifications found',
        updated: 0,
      };
    }

    // Bulk update all unacknowledged targets
    const result = await this.prisma.notification_targets.updateMany({
      where: {
        partnerUserId,
        acknowledgedAt: null,
      },
      data: {
        acknowledgedAt: new Date(),
      },
    });

    return {
      message: `Successfully marked ${result.count} notifications as acknowledged`,
      updated: result.count,
    };
  }

  /**
   * Merge provided targets with default targets, avoiding duplicates
   */
  private mergeTargets(
    providedTargets: NotificationTargetDto[],
    defaultTargets: NotificationTargetDto[]
  ): NotificationTargetDto[] {
    const targetMap = new Map<string, NotificationTargetDto>();

    // Add provided targets first (they take priority)
    providedTargets.forEach(target => {
      targetMap.set(target.partnerUserId, target);
    });

    // Add default targets if not already present
    defaultTargets.forEach(target => {
      if (!targetMap.has(target.partnerUserId)) {
        targetMap.set(target.partnerUserId, target);
      }
    });

    return Array.from(targetMap.values());
  }
}
