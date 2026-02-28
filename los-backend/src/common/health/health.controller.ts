import { Controller, Get } from "@nestjs/common";
import { HealthCheckResult } from "./interfaces/health.interface";
import { HealthService } from "./health.service";
import { AuthType } from "../decorators/auth.decorator";

@Controller("health")
@AuthType("public")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth(): Promise<HealthCheckResult> {
    return await this.healthService.getHealthStatus();
  }

  @Get("detailed")
  async getDetailedHealth(): Promise<HealthCheckResult> {
    return await this.healthService.getDetailedHealthStatus();
  }

  @Get("database")
  async getDatabaseHealth(): Promise<{ status: string; database: any }> {
    return await this.healthService.getDatabaseHealth();
  }

  @Get("memory")
  getMemoryHealth(): { status: string; memory: any } {
    return this.healthService.getMemoryHealth();
  }

  @Get("disk")
  async getDiskHealth(): Promise<{ status: string; disk: any }> {
    return await this.healthService.getDiskHealth();
  }

  @Get("redis")
  async getRedisHealth(): Promise<{ status: string; redis: any }> {
    return await this.healthService.getRedisHealth();
  }
}
