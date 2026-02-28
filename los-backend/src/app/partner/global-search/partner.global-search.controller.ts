import { Controller, Get, Query, Param } from "@nestjs/common";
import { AuthType } from "src/common/decorators/auth.decorator";
import { PartnerGlobalSearchService } from "./partner.global-search.service";
import { GlobalSearchDto } from "./dto/global-search.dto";
import { RequireRoleOrPermission } from "src/common/decorators/role-permission.decorator";
import { PermissionType } from "@prisma/client";

@AuthType("partner")
@Controller("partner/brand/:brandId/global-search")
export class PartnerGlobalSearchController {
  constructor(
    private readonly globalSearchService: PartnerGlobalSearchService
  ) {}

  @Get()
  @RequireRoleOrPermission({
    roles: ["ADMIN", "SUPER_ADMIN"],
    permissions: [
      { permission: "GLOBAL_SEARCH", type: PermissionType.READ },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  async globalSearch(
    @Param("brandId") brandId: string,
    @Query() query: GlobalSearchDto
  ) {
    return this.globalSearchService.globalSearch(brandId, query);
  }

  @Get("user/:userId")
  @RequireRoleOrPermission({
    roles: ["ADMIN", "SUPER_ADMIN"],
    permissions: [
      { permission: "GLOBAL_SEARCH", type: PermissionType.READ },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  async getUserById(
    @Param("brandId") brandId: string,
    @Param("userId") userId: string
  ) {
    return this.globalSearchService.getUserById(brandId, userId);
  }
}
