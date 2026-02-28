import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

export interface ServiceRequestLogData {
  userId?: string;
  partnerUserId?: string;
  brandId?: string;
  action: string;
  method: string;
  url: string;
  ipAddress?: string;
  userAgent?: string;
  requestHeaders?: any;
  requestBody?: any;
  responseStatus?: number;
  responseTime?: number;
  errorMessage?: string;
  success?: boolean;
  metadata?: any;
}

@Injectable()
export class ServiceRequestLogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: ServiceRequestLogData) {
    try {
      return await this.prisma.serviceRequestLog.create({
        data: {
          userId: data.userId,
          partnerUserId: data.partnerUserId,
          brandId: data.brandId,
          action: data.action,
          method: data.method,
          url: data.url,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          requestHeaders: data.requestHeaders,
          requestBody: data.requestBody,
          responseStatus: data.responseStatus,
          responseTime: data.responseTime,
          errorMessage: data.errorMessage,
          success: data.success ?? true,
          metadata: data.metadata,
        },
      });
    } catch (error) {
      console.error("Failed to create service request log:", error);
      // Don't throw error to avoid breaking the main request flow
      return null;
    }
  }

  async findMany(options?: {
    userId?: string;
    partnerUserId?: string;
    brandId?: string;
    action?: string;
    method?: string;
    success?: boolean;
    take?: number;
    skip?: number;
    orderBy?: any;
  }) {
    return this.prisma.serviceRequestLog.findMany({
      where: {
        userId: options?.userId,
        partnerUserId: options?.partnerUserId,
        brandId: options?.brandId,
        action: options?.action,
        method: options?.method,
        success: options?.success,
      },
      take: options?.take,
      skip: options?.skip,
      orderBy: options?.orderBy || { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phoneNumber: true,
          },
        },
        partnerUser: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    return this.prisma.serviceRequestLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phoneNumber: true,
          },
        },
        partnerUser: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async getStats(options?: {
    userId?: string;
    partnerUserId?: string;
    brandId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where = {
      userId: options?.userId,
      partnerUserId: options?.partnerUserId,
      brandId: options?.brandId,
      ...(options?.startDate && options?.endDate
        ? {
            createdAt: {
              gte: options.startDate,
              lte: options.endDate,
            },
          }
        : {}),
    };

    const [total, successful, failed] = await Promise.all([
      this.prisma.serviceRequestLog.count({ where }),
      this.prisma.serviceRequestLog.count({
        where: { ...where, success: true },
      }),
      this.prisma.serviceRequestLog.count({
        where: { ...where, success: false },
      }),
    ]);

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
    };
  }
}
