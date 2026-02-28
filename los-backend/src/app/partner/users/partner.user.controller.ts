import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthType } from "src/common/decorators/auth.decorator";
import { ParterUserService } from "./partner.user.service";
import { PartnerUserSecureCodeService } from "./partner-user-secure-code.service";
import { PartnerUserDialerConfigService } from "./partner-user-dialer-config.service";
import { CreateUserDto } from "./dto/create-update-partner.dto";
import { GetUsersDto } from "./dto/get-users.dto";
import { RequireRoleOrPermission } from "src/common/decorators/role-permission.decorator";
import { RolePermissionGuard } from "src/common/guards/role-permission.guard";
import { GetPartnerUser } from "src/common/decorators/get-user.decorator";
import { AuthenticatedPartnerUser } from "src/common/types/partner-user.types";
import { PermissionType } from "@prisma/client";

@Controller("partner/brand/:brandId/partner-users")
export class PartnerUserController {
  constructor(
    private readonly parterUserService: ParterUserService,
    private readonly secureCodeService: PartnerUserSecureCodeService,
    private readonly dialerConfigService: PartnerUserDialerConfigService
  ) {}

  @AuthType("partner")
  @Get()
  @HttpCode(HttpStatus.OK)
  async getUsers(
    @Param("brandId") brandId: string,
    @Query() query: GetUsersDto
  ) {
    return this.parterUserService.getUsers(
      brandId,
      {
        page: query.page || 1,
        limit: query.limit || 10,
        dateFilter: query.dateFilter || "[]",
      },
      {
        search: query.search || "",
        roleId: query.roleId?.toString(),
        permissionId: query.permissionId?.toString(),
      }
    );
  }

  @AuthType("partner")
  @Get("roles")
  @HttpCode(HttpStatus.OK)
  async getRoles() {
    return this.parterUserService.getRoles();
  }

  @AuthType("partner")
  @Get("permissions")
  @HttpCode(HttpStatus.OK)
  async getPermissions() {
    return this.parterUserService.getPermissions();
  }

  @AuthType("partner")
  @Patch("permissions/:permissionId")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["ADMIN", "SUPER_ADMIN"],
    permissions: [
      { permission: "PARTNER_USER_MANAGEMENT", type: PermissionType.ALL },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  @HttpCode(HttpStatus.OK)
  async updatePermission(
    @Param("permissionId") permissionId: string,
    @Body() dto: { description?: string; permission_group_id?: string },
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ) {
    return this.parterUserService.updatePermission(
      Number(permissionId),
      dto,
      partnerUser
    );
  }

  @AuthType("partner")
  @Post("permissions/:permissionId/delete")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["ADMIN", "SUPER_ADMIN"],
    permissions: [
      { permission: "PARTNER_USER_MANAGEMENT", type: PermissionType.ALL },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  @HttpCode(HttpStatus.OK)
  async deletePermission(
    @Param("permissionId") permissionId: string,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ) {
    return this.parterUserService.deletePermission(
      Number(permissionId),
      partnerUser
    );
  }

  @AuthType("partner")
  @Get(":userId/roles-permissions")
  @HttpCode(HttpStatus.OK)
  async getUserById(@Param("userId") userId: string) {
    return this.parterUserService.getUserById(userId);
  }

  //getRolesAndPermissions
  @AuthType("partner")
  @Get("roles-permissions")
  @HttpCode(HttpStatus.OK)
  async getRolesAndPermissions() {
    return this.parterUserService.getRolesAndPermissions();
  }

  @Post("create-or-update")
  @AuthType("partner")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["ADMIN", "SUPER_ADMIN", "PARTNER_USER_MANAGEMENT"],
    permissions: [
      { permission: "PARTNER_USER_MANAGEMENT", type: PermissionType.ALL },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  @HttpCode(HttpStatus.OK)
  async createOrUpdatePartnerUser(
    @Param("brandId") brandId: string,
    @Query("partnerUserId") partnerUserId: string,
    @Body() dto: CreateUserDto,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ) {
    return this.parterUserService.upsertPartnerUser(
      brandId,
      partnerUserId,
      dto,
      partnerUser
    );
  }

  @Post(":userId/delete")
  @AuthType("partner")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["ADMIN", "SUPER_ADMIN", "PARTNER_USER_MANAGEMENT"],
    permissions: [
      { permission: "PARTNER_USER_MANAGEMENT", type: PermissionType.ALL },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  @HttpCode(HttpStatus.OK)
  async deletePartnerUser(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ) {
    return this.parterUserService.deletePartnerUser(userId, partnerUser);
  }

  @AuthType("partner")
  @Post("partner-user-login-logs")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["ADMIN", "SUPER_ADMIN", "PARTNER_USER_MANAGEMENT"],
    permissions: [
      { permission: "PARTNER_USER_MANAGEMENT", type: PermissionType.ALL },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  @HttpCode(HttpStatus.OK)
  async partnerUserLogin(
    @Param("brandId") brandId: string,
    @Body()
    dto: {
      partnerUserId: string;
    }
  ) {
    return this.parterUserService.partnerUserLogin(dto.partnerUserId);
  }

  @AuthType("partner")
  @Get(":userId/partner-user-login-logs")
  @HttpCode(HttpStatus.OK)
  async getPartnerUserLoginLogs(
    @Param("brandId") brandId: string,
    @Param("userId") userId: string
  ) {
    return this.parterUserService.getPartnerUserLoginLogs(userId);
  }

  @AuthType("partner")
  @Get(":userId/login-logs")
  @HttpCode(HttpStatus.OK)
  async getUserLoginLogs(
    @Param("brandId") brandId: string,
    @Param("userId") userId: string,
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "10",
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    return this.parterUserService.getUserLoginLogs(
      userId,
      {
        page: Number.parseInt(page, 10) || 1,
        limit: Number.parseInt(limit, 10) || 10,
        startDate,
        endDate,
      }
    );
  }

  @AuthType("partner")
  @Get("credit-executive-users")
  @HttpCode(HttpStatus.OK)
  async getCreditExecutiveUsers(@Param("brandId") brandId: string) {
    return this.parterUserService.getCreditExecutiveUsers(brandId);
  }

  @AuthType("partner")
  @Get("supervisor-users")
  @HttpCode(HttpStatus.OK)
  async getSupervisorUsers(@Param("brandId") brandId: string) {
    return this.parterUserService.getSupervisorUsers(brandId);
  }

  @AuthType("partner")
  @Get("collection-executive-users")
  @HttpCode(HttpStatus.OK)
  async getCollectionExecutiveUsers(@Param("brandId") brandId: string) {
    return this.parterUserService.getCollectionExecutiveUsers(brandId);
  }

  @AuthType("partner")
  @Get("collection-supervisor-users")
  @HttpCode(HttpStatus.OK)
  async getCollectionSupervisorUsers(@Param("brandId") brandId: string) {
    return this.parterUserService.getCollectionSupervisorUsers(brandId);
  }

  @AuthType("partner")
  @Get("audit-logs")
  @HttpCode(HttpStatus.OK)
  async getPartnerUserAuditLogs(
    @Param("brandId") brandId: string,
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "20",
    @Query("action") action: string = "all"
  ) {
    return this.parterUserService.getPartnerUserAuditLogs(
      brandId,
      {
        page: Number.parseInt(page, 10) || 1,
        limit: Number.parseInt(limit, 10) || 20,
      },
      { action }
    );
  }
  
  @AuthType("partner")
  @Get(":userId/audit-logs")
  @HttpCode(HttpStatus.OK)
  async getUserAuditLogs(
    @Param("brandId") brandId: string,
    @Param("userId") userId: string,
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "10",
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    return this.parterUserService.getUserAuditLogs(
      userId,
      {
        page: Number.parseInt(page, 10) || 1,
        limit: Number.parseInt(limit, 10) || 10,
        startDate,
        endDate,
      }
    );
  }

  @AuthType("partner")
  @Get(":userId/code-audit-logs")
  @HttpCode(HttpStatus.OK)
  async getUserCodeAuditLogs(
    @Param("brandId") brandId: string,
    @Param("userId") userId: string,
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "10",
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    return this.parterUserService.getUserCodeAuditLogs(
      userId,
      {
        page: Number.parseInt(page, 10) || 1,
        limit: Number.parseInt(limit, 10) || 10,
        startDate,
        endDate,
      }
    );
  }

  @AuthType("partner")
  @Post(":userId/generate-secure-code")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SUPER_ADMIN"],
  })
  @HttpCode(HttpStatus.OK)
  async generateSecureCode(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
    @GetPartnerUser() partnerUser?: AuthenticatedPartnerUser
  ) {
    // Get user details to fetch email
    const user = await this.parterUserService.getUserById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    // Generate secure code and send email
    const secureCode = await this.secureCodeService.generateSecurePartnerCode(
      userId,
      partnerUser?.id,
      user.email,
      user.name
    );

    return {
      success: true,
      message: "Secure code generated and sent to user email",
      code: secureCode, // In production, you might not want to return this in response
      email: user.email,
      timestamp: new Date().toISOString(),
    };
  }

  @AuthType("partner")
  @Get("dialer-configs/all")
  @HttpCode(HttpStatus.OK)
  async getAllDialerConfigs(
    @Param("brandId") brandId: string,
    @Query("skip") skip: string = "0",
    @Query("take") take: string = "10"
  ) {
    return this.dialerConfigService.getAllDialerConfigs(
      Number.parseInt(skip),
      Number.parseInt(take)
    );
  }
}
