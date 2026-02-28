import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../core/redis/redis.service";
import { HealthCheckResult } from "./interfaces/health.interface";

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getHealthStatus(): Promise<HealthCheckResult> {
    const [database, memory, disk, redis] = await Promise.allSettled([
      this.getDatabaseHealth(),
      this.getMemoryHealth(),
      this.getDiskHealth(),
      this.getRedisHealth(),
    ]);

    const info: Record<string, any> = {};
    const error: Record<string, any> = {};
    let status: "ok" | "error" | "shutting_down" = "ok";

    // Process database health
    if (database.status === "fulfilled" && database.value.status === "ok") {
      info.database = database.value.database;
    } else {
      status = "error";
      error.database =
        database.status === "fulfilled"
          ? database.value.database
          : { status: "down", message: "Health check failed" };
    }

    // Process memory health
    if (memory.status === "fulfilled" && memory.value.status === "ok") {
      info.memory = memory.value.memory;
    } else {
      status = "error";
      error.memory =
        memory.status === "fulfilled"
          ? memory.value.memory
          : { status: "down", message: "Health check failed" };
    }

    // Process disk health
    if (disk.status === "fulfilled" && disk.value.status === "ok") {
      info.disk = disk.value.disk;
    } else {
      status = "error";
      error.disk =
        disk.status === "fulfilled"
          ? disk.value.disk
          : { status: "down", message: "Health check failed" };
    }

    // Process Redis health (non-critical - doesn't affect overall status)
    if (redis.status === "fulfilled" && redis.value.status === "ok") {
      info.redis = redis.value.redis;
    } else {
      // Redis failure is non-critical - add to info but don't change overall status
      info.redis =
        redis.status === "fulfilled"
          ? redis.value.redis
          : { status: "down", message: "Redis unavailable (non-critical)", available: false };
    }

    return {
      status,
      info,
      error,
      details: { ...info, ...error },
    };
  }

  async getDetailedHealthStatus(): Promise<HealthCheckResult> {
    return this.getHealthStatus();
  }

  async getDatabaseHealth(): Promise<{ status: string; database: any }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: "ok",
        database: {
          status: "up",
          message: "Database connection is healthy",
        },
      };
    } catch (error) {
      return {
        status: "error",
        database: {
          status: "down",
          message: "Database connection failed",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  getMemoryHealth(): { status: string; memory: any } {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB =
      Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100;
    const heapTotalMB =
      Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100;
    const rssUsedMB = Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100;
    const externalMB =
      Math.round((memoryUsage.external / 1024 / 1024) * 100) / 100;

    const heapUsagePercentage = Math.round((heapUsedMB / heapTotalMB) * 100);

    // Use 95% threshold for more realistic development environment
    const isHighUsage = heapUsagePercentage > 95;

    return {
      status: isHighUsage ? "error" : "ok",
      memory: {
        status: isHighUsage ? "down" : "up",
        heap_used_mb: heapUsedMB,
        heap_total_mb: heapTotalMB,
        rss_used_mb: rssUsedMB,
        external_mb: externalMB,
        heap_usage_percentage: heapUsagePercentage,
        threshold_percentage: 95,
        message: isHighUsage
          ? "High memory usage detected"
          : "Memory usage is normal",
      },
    };
  }

  async getDiskHealth(): Promise<{ status: string; disk: any }> {
    try {
      const fs = await import("fs/promises");
      const stats = await fs.statfs(".");

      const totalSpace = stats.bavail * stats.bsize;
      const usedSpace = (stats.blocks - stats.bavail) * stats.bsize;
      const availableSpace = stats.bavail * stats.bsize;
      const usagePercentage = Math.round(
        (usedSpace / (totalSpace + usedSpace)) * 100,
      );

      const totalSpaceGB =
        Math.round((totalSpace / 1024 / 1024 / 1024) * 100) / 100;
      const usedSpaceGB =
        Math.round((usedSpace / 1024 / 1024 / 1024) * 100) / 100;
      const availableSpaceGB =
        Math.round((availableSpace / 1024 / 1024 / 1024) * 100) / 100;

      return {
        status: usagePercentage > 90 ? "error" : "ok",
        disk: {
          status: usagePercentage > 90 ? "down" : "up",
          total_space_gb: totalSpaceGB,
          used_space_gb: usedSpaceGB,
          available_space_gb: availableSpaceGB,
          usage_percentage: usagePercentage,
        },
      };
    } catch (error) {
      return {
        status: "error",
        disk: {
          status: "down",
          message: "Unable to check disk space",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  async getRedisHealth(): Promise<{ status: string; redis: any }> {
    try {
      const redisStatus = this.redis.getRedisStatus();
      
      if (!redisStatus.enabled) {
        return {
          status: "ok", // Non-critical 
          redis: {
            status: "disabled",
            available: false,
            enabled: false,
            message: "Redis is disabled via configuration",
            critical: false,
          },
        };
      }
      
      if (!redisStatus.available) {
        return {
          status: "ok", // Non-critical failure
          redis: {
            status: "down",
            available: false,
            enabled: true,
            message: "Redis is unavailable (application continues without caching)",
            critical: false,
          },
        };
      }

      const startTime = Date.now();
      const pong = await this.redis.ping();
      const responseTime = Date.now() - startTime;

      if (pong === "PONG") {
        return {
          status: "ok",
          redis: {
            status: "up",
            available: true,
            enabled: true,
            message: "Redis connection is healthy",
            response_time_ms: responseTime,
            critical: false,
          },
        };
      } else {
        return {
          status: "ok", // Non-critical failure
          redis: {
            status: "down",
            available: false,
            enabled: true,
            message: "Redis ping response unexpected (application continues without caching)",
            response: pong,
            critical: false,
          },
        };
      }
    } catch (error) {
      return {
        status: "ok", // Non-critical failure
        redis: {
          status: "down",
          available: false,
          enabled: true,
          message: "Redis connection failed (application continues without caching)",
          error: error instanceof Error ? error.message : "Unknown error",
          critical: false,
        },
      };
    }
  }
}
