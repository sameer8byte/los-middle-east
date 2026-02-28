import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  Param,
} from "@nestjs/common";
import { AuthType } from "src/common/decorators/auth.decorator";
import { ServiceRequestLogService } from "./service-request-log.service";
import {
  GetServiceRequestLogsQueryDto,
  GetServiceRequestLogStatsQueryDto,
} from "./dto/service-request-log-query.dto";

@Controller("service-request-logs")
export class ServiceRequestLogController {
  constructor(
    private readonly serviceRequestLogService: ServiceRequestLogService,
  ) {}

  @AuthType(["partner", "web"])
  @Get()
  @HttpCode(HttpStatus.OK)
  async getLogs(@Query() query: GetServiceRequestLogsQueryDto) {
    const logs = await this.serviceRequestLogService.findMany(query);

    return {
      success: true,
      data: logs,
      message: "Service request logs retrieved successfully",
    };
  }

  @AuthType(["partner", "web"])
  @Get("stats")
  @HttpCode(HttpStatus.OK)
  async getStats(@Query() query: GetServiceRequestLogStatsQueryDto) {
    const stats = await this.serviceRequestLogService.getStats({
      userId: query.userId,
      partnerUserId: query.partnerUserId,
      brandId: query.brandId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });

    return {
      success: true,
      data: stats,
      message: "Service request log statistics retrieved successfully",
    };
  }

  @AuthType(["partner", "web"])
  @Get(":id")
  @HttpCode(HttpStatus.OK)
  async getLogById(@Param("id") id: string) {
    const log = await this.serviceRequestLogService.findById(id);

    if (!log) {
      return {
        success: false,
        message: "Service request log not found",
      };
    }

    return {
      success: true,
      data: log,
      message: "Service request log retrieved successfully",
    };
  }
}
