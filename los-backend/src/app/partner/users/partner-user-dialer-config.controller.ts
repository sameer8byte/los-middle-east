import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { PartnerUserDialerConfigService } from "./partner-user-dialer-config.service";
import { RolePermissionGuard } from "src/common/guards/role-permission.guard";
import { RequireRoleOrPermission } from "src/common/decorators/role-permission.decorator";
import { PermissionType } from "@prisma/client";
import { AuthType } from "src/common/decorators/auth.decorator";

@AuthType("partner")
@Controller("partner-users/:partnerUserId/dialer-configs")
export class PartnerUserDialerConfigController {
  constructor(
    private readonly dialerConfigService: PartnerUserDialerConfigService
  ) {}

  @Post()
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
  async createDialerConfig(
    @Param("partnerUserId") partnerUserId: string,
    @Body()
    body: {
      agentUserId: string;
      agentUserNumber: string;
      agentUserEmail?: string;
      agentAllowedCallerId?: string;
       agentSkillId?: string;
    }
  ) {
    return this.dialerConfigService.createDialerConfig(
      partnerUserId,
      body.agentUserId,
      body.agentUserNumber,
      body.agentUserEmail,
      body.agentAllowedCallerId,
      body.agentSkillId
    );
  }

  @Get()
  async getDialerConfig(@Param("partnerUserId") partnerUserId: string) {
    return this.dialerConfigService.getDialerConfig(partnerUserId);
  }

  @Get("all")
  async getAllDialerConfigs(
    @Query("skip") skip: string = "0",
    @Query("take") take: string = "10"
  ) {
    return this.dialerConfigService.getAllDialerConfigs(
      Number.parseInt(skip),
      Number.parseInt(take)
    );
  }

  @Put()
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
  async updateDialerConfig(
    @Param("partnerUserId") partnerUserId: string,
    @Body()
    body: {
      agent_user_id?: string;
      agent_user_number?: string;
      agent_allowed_caller_id?: string;
       agent_skill_id?: string;
      is_active?: boolean;
    }
  ) {
    return this.dialerConfigService.updateDialerConfig(partnerUserId, body);
  }

  @Delete()
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
  async deleteDialerConfig(@Param("partnerUserId") partnerUserId: string) {
    return this.dialerConfigService.deleteDialerConfig(partnerUserId);
  }

  @Post("enable")
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
  async enableDialer(@Param("partnerUserId") partnerUserId: string) {
    return this.dialerConfigService.enableDialer(partnerUserId);
  }

  @Post("disable")
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
  async disableDialer(@Param("partnerUserId") partnerUserId: string) {
    return this.dialerConfigService.disableDialer(partnerUserId);
  }
}
