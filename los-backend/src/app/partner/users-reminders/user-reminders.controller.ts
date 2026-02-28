import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { Type } from "class-transformer";
import { IsOptional, IsNumber, IsString } from "class-validator";
import { AuthType } from "src/common/decorators/auth.decorator";
import { UserRemindersService } from "./user-reminders.service";

class GetUserRemindersQuery {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  createdAtFrom?: string;

  @IsOptional()
  @IsString()
  createdAtTo?: string;

  @IsOptional()
  @IsString()
  scheduledFrom?: string;

  @IsOptional()
  @IsString()
  scheduledTo?: string;
}

@AuthType("partner")
@Controller("partner/brand/:brandId/user-reminders")
export class UserRemindersController {
  constructor(private readonly userRemindersService: UserRemindersService) {}

  @Get()
  async getAllUserReminders(
    @Param("brandId") brandId: string,
    @Query() query: GetUserRemindersQuery,
  ) {
    return this.userRemindersService.getAllUserReminders(brandId, {
      page: query.page,
      limit: query.limit,
      search: query.search,
      channel: query.channel,
      status: query.status,
      createdAtFrom: query.createdAtFrom,
      createdAtTo: query.createdAtTo,
      scheduledFrom: query.scheduledFrom,
      scheduledTo: query.scheduledTo,
    });
  }

  @Post()
  async createUserReminder(
    @Param("brandId") brandId: string,
    @Body() body: {
      userId: string;
      channel: string;
      templateCode: string;
      scheduledAt: string;
      providerMessageId?: string;
      payload?: any;
    },
  ) {
    return this.userRemindersService.createUserReminder(brandId, body);
  }

  @Get(":reminderId/audit-logs")
  async getReminderAuditLogs(
    @Param("reminderId") reminderId: string,
    @Query("event") event?: string,
  ) {
    return this.userRemindersService.getReminderAuditLogs(reminderId, event);
  }

  @Get("dashboard-metrics/view")
  async getDashboardMetrics(@Param("brandId") brandId: string) {
    return this.userRemindersService.getDashboardMetrics(brandId);
  }

  @Post("dashboard-metrics/refresh")
  async refreshDashboardMetrics(@Param("brandId") brandId: string) {
    return this.userRemindersService.refreshDashboardMetrics(brandId);
  }
}