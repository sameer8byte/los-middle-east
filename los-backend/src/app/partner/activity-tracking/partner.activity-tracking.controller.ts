import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { PartnerActivityTrackingService } from "./partner.activity-tracking.service";
import {
  CreateActivityReportDto,
  ActivityReportResponseDto,
} from "./dto/activity-report.dto";
import {
  CreateInactivityAlertDto,
  InactivityAlertResponseDto,
} from "./dto/inactivity-alert.dto";
import {
  GetActivitySessionsDto,
  GetInactiveUsersDto,
  GetActivityStatsDto,
} from "./dto/get-activity.dto";
import { AuthType } from "src/common/decorators/auth.decorator";
import { RolesGuard } from "src/common/guards/roles.guard";

@Controller("partner/activity-tracking")
@AuthType("partner")
@UseGuards(RolesGuard)
export class PartnerActivityTrackingController {
  constructor(
    private readonly activityTrackingService: PartnerActivityTrackingService
  ) {}

  @Post("report")
  @HttpCode(HttpStatus.OK)
  async createActivityReport(
    @Body() dto: CreateActivityReportDto
  ): Promise<ActivityReportResponseDto> {
    return this.activityTrackingService.createActivityReport(dto);
  }

  @Post("alert")
  @HttpCode(HttpStatus.CREATED)
  async createInactivityAlert(
    @Body() dto: CreateInactivityAlertDto
  ): Promise<InactivityAlertResponseDto> {
    return this.activityTrackingService.createInactivityAlert(dto);
  }

  @Get("sessions")
  async getActivitySessions(@Query() dto: GetActivitySessionsDto) {
    return this.activityTrackingService.getActivitySessions(dto);
  }

  @Get("sessions/:sessionId")
  async getSessionDetails(@Param("sessionId") sessionId: string) {
    return this.activityTrackingService.getSessionDetails(sessionId);
  }

  @Get("inactive-users")
  async getInactiveUsers(@Query() dto: GetInactiveUsersDto) {
    return this.activityTrackingService.getInactiveUsers(dto);
  }

  @Get("stats")
  async getActivityStats(@Query() dto: GetActivityStatsDto) {
    return this.activityTrackingService.getActivityStats(dto);
  }

  @Post("cleanup")
  @HttpCode(HttpStatus.OK)
  async cleanupOldData(@Query("days") days?: number) {
    return this.activityTrackingService.cleanupOldData(days || 30);
  }
}

