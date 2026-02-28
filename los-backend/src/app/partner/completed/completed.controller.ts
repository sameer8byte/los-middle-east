import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { AuthType } from "src/common/decorators/auth.decorator";
import { RequireRoleOrPermission } from "src/common/decorators/role-permission.decorator";
import { RolePermissionGuard } from "src/common/guards/role-permission.guard";
import { GetPartnerUser } from "src/common/decorators/get-user.decorator";
import { AuthenticatedPartnerUser } from "src/common/types/partner-user.types";
import { CompletedLoansService } from "./completed.service";
import { GetCompletedLoansDto } from "./dto/get-completed-loans.dto";

@AuthType("partner")
@Controller("partner/brand/:brandId/completed-loans")
export class CompletedLoansController {
  constructor(private readonly completedLoansService: CompletedLoansService) {}

  @Get()
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["COMPLETED_LOANS", "ADMIN", "SUPER_ADMIN"],
    operator: "OR",
    permissions: [
      { permission: "ALL", type: "ALL" },
      { permission: "COMPLETED_LOANS", type: "ALL" },
    ],
  })
  async getCompletedLoans(
    @Param("brandId") brandId: string,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
    @Query() query: GetCompletedLoansDto
  ) {
    return this.completedLoansService.getCompletedLoans(
      brandId,
      partnerUser.id,
      {
        page: query.page || 1,
        limit: query.limit || 10,
        status: query.status || "[]",
        search: query.search || "",
        dateFilter: query.dateFilter || "",
      }
    );
  }
}
