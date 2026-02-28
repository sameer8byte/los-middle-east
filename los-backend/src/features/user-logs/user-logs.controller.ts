import {
  Controller,
  Get,
  Query,
  Param,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { AuthType } from "src/common/decorators/auth.decorator";
import { GetPartnerUser } from "src/common/decorators/get-user.decorator";
import { AuthenticatedPartnerUser } from "src/common/types/partner-user.types";
import { UserLogsService } from "./user-logs.service";
import { GetUserLogsDto } from "./dto/get-user-logs.dto";

@AuthType("partner")
@Controller("partner/brand/:brandId/user-logs")
export class UserLogsController {
  constructor(private readonly userLogsService: UserLogsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getUserLogs(
    @Param("brandId") brandId: string,
    @Query() query: GetUserLogsDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser
  ) {
    return this.userLogsService.findAllWithFilters(brandId, {
      page: query.page || 1,
      limit: query.limit || 20,
      userId: query.userId,
      partnerUserId: query.partnerUserId,
      type: query.type,
      search: query.search,
      fromDate: query.fromDate,
      toDate: query.toDate,
      sortBy: query.sortBy || "timestamp",
      sortOrder: query.sortOrder || "desc",
    });
  }

  @Get("types")
  @HttpCode(HttpStatus.OK)
  async getUserLogTypes() {
    return this.userLogsService.getLogTypes();
  }

  @Get("stats")
  @HttpCode(HttpStatus.OK)
  async getUserLogStats(
    @Param("brandId") brandId: string,
    @Query("userId") userId?: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string
  ) {
    return this.userLogsService.getStats(brandId, userId, fromDate, toDate);
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  async getUserLogById(@Param("id") id: string) {
    return this.userLogsService.findById(id);
  }
}
