import { Controller, Get, Param, Query } from "@nestjs/common";
import { AuthType } from "src/common/decorators/auth.decorator";
import { PartnerDashboardService } from "./partner.dashboard.service";
import { DashboardStatsDto } from "./dto/dashboard-stats.dto";

@AuthType("partner")
@Controller("partner/brand/:brandId/dashboard")
export class PartnerDashboardController {
  constructor(
    private readonly partnerDashboardService: PartnerDashboardService,
  ) {}

  @Get("stats")
  async getDashboardStats(
    @Param("brandId") brandId: string,
    @Query() query: DashboardStatsDto,
  ) {
    return this.partnerDashboardService.getDashboardStats(brandId, query);
  }

  @Get("summary")
  async getDashboardSummary(
    @Param("brandId") brandId: string,
    @Query() query: DashboardStatsDto,
  ) {
    return this.partnerDashboardService.getDashboardSummary(brandId, query);
  }

  @Get("users-by-subdomain")
  async getUsersBySubdomain(
    @Param("brandId") brandId: string,
    @Query() query: DashboardStatsDto,
  ) {
    return this.partnerDashboardService.getUsersBySubdomain(brandId, query);
  }

  @Get("users-by-location")
  async getUsersByLocation(
    @Param("brandId") brandId: string,
    @Query() query: DashboardStatsDto,
  ) {
    return this.partnerDashboardService.getUsersByLocation(brandId, query);
  }

  @Get("users-by-company")
  async getUsersByCompany(
    @Param("brandId") brandId: string,
    @Query() query: DashboardStatsDto,
  ) {
    return this.partnerDashboardService.getUsersByCompany(brandId, query);
  }

  @Get("users-by-onboarding-step")
  async getUsersByOnboardingStep(
    @Param("brandId") brandId: string,
    @Query() query: DashboardStatsDto,
  ) {
    return this.partnerDashboardService.getUsersByOnboardingStep(brandId, query);
  }

  @Get("loans-by-type")
  async getLoansByType(
    @Param("brandId") brandId: string,
    @Query() query: DashboardStatsDto,
  ) {
    return this.partnerDashboardService.getLoansByType(brandId, query);
  }

  @Get("loan-allocation-details")
  async getLoanAllocationDetails(
    @Param("brandId") brandId: string,
    @Query() query: DashboardStatsDto,
  ) {
    return this.partnerDashboardService.getLoanAllocationDetails(brandId, query);
  }

  @Get("collection-analysis")
  async getCollectionAnalysis(
    @Param("brandId") brandId: string,
    @Query() query: DashboardStatsDto,
  ) {
    return this.partnerDashboardService.getCollectionAnalysis(brandId, query);
  }

  @Get("disbursement-analysis")
  async getDisbursementAnalysis(
    @Param("brandId") brandId: string,
    @Query() query: DashboardStatsDto,
  ) {
    return this.partnerDashboardService.getDisbursementAnalysis(brandId, query);
  }
  @Get("partner-user-leads-stats")
  async getPartnerUserLeadsStats(
    @Param("brandId") brandId: string,
    @Query() query: DashboardStatsDto,
  ) {
    return this.partnerDashboardService.getPartnerUserLeadsStats(brandId, query);
  }

  @Get('performance-by-company')
  async getPerformanceByCompany(
    @Param('brandId') brandId: string,
    @Query() query: DashboardStatsDto,
  ) {
    return this.partnerDashboardService.getPerformanceByCompany(brandId, query);
  }
}
