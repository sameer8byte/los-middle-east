import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { UsersService } from "./user.service";
import { UpdateUserDto, RelocateUserDto } from "./dto";
import { AuthType } from "src/common/decorators/auth.decorator";
import { RequireRoleOrPermission } from "src/common/decorators/role-permission.decorator";
import { RolePermissionGuard } from "src/common/guards/role-permission.guard";
import { AuthenticatedPartnerUser } from "src/common/types/partner-user.types";
import { GetPartnerUser } from "src/common/decorators/get-user.decorator";
import { AutoAllocationUserService } from "src/features/autoAllocation/services/user.autoAllocation.service";
import { PermissionType } from "@prisma/client";

@AuthType("web")
@Controller("user")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly autoAllocationUserService: AutoAllocationUserService
  ) {}

  @Get(":userId/profile")
  async getProfile(@Param("userId") userId: string) {
    return this.usersService.findOne(userId);
  }

  @Patch(":userId/profile")
  async updateProfile(
    @Param("userId") userId: string,
    @Body() updateUserDto: UpdateUserDto
  ) {
    return this.usersService.update(userId, updateUserDto);
  }

  @Patch(":userId/onboarding")
  async updateOnboardingStep(
    @Param("userId") userId: string,
    @Body()
    dto: {
      latitude: number;
      longitude: number;
      ipJson: string;
    }
  ) {
    return this.usersService.updateOnboardingStep(userId, dto);
  }

  @AuthType("partner")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SANCTION_HEAD", "SANCTION_MANAGER", "SUPER_ADMIN", "ADMIN"],
    permissions: [
      { permission: "RELOCATE_USER", type: "WRITE" },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  @Post("relocate-user")
  @HttpCode(HttpStatus.OK)
  async relocateUser(
    @GetPartnerUser() currentUser: AuthenticatedPartnerUser,
    @Body() body: RelocateUserDto
  ) {
    return this.autoAllocationUserService.relocateUser(
      currentUser,
      body.userId,
      body.newPartnerUserId
    );
  }

  @AuthType("partner")
  @Post("auto-allocate-users")
  @HttpCode(HttpStatus.OK)
  async autoAllocateAllUsers(@Body() body: { brandId: string }) {
    return this.autoAllocationUserService.autoAllocateAllUsers(body.brandId);
  }

  @AuthType("partner")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SANCTION_HEAD", "SANCTION_MANAGER", "SUPER_ADMIN", "ADMIN"],
    permissions: [
      { permission: "RELOCATE_USER", type: "WRITE" },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  @Post("bulk-relocate-users")
  @HttpCode(HttpStatus.OK)
  async bulkRelocateUsers(
    @Body()
    body: {
      brandId: string;
      createdFrom?: string;
      createdTo?: string;
      sourcePartnerUserIds?: string[];
      targetPartnerUserIds?: string[];
      isAllTime?: boolean;
      remarks?: string;
    }
  ) {
    return this.autoAllocationUserService.bulkRelocateUsers(
      body.brandId,
      body.createdFrom,
      body.createdTo,
      body.sourcePartnerUserIds,
      body.targetPartnerUserIds,
      body.isAllTime,
      body.remarks
    );
  }

  @AuthType("partner")
  @UseGuards(RolePermissionGuard)
  @RequireRoleOrPermission({
    roles: ["SANCTION_HEAD", "SANCTION_MANAGER", "SUPER_ADMIN", "ADMIN"],
    permissions: [
      { permission: "RELOCATE_USER", type: "READ" },
      { permission: "ALL", type: PermissionType.ALL },
    ],
    operator: "OR",
  })
  @Post("users-for-allocation")
  @HttpCode(HttpStatus.OK)
  async getUsersForAllocation(
    @Body()
    body: {
      brandId: string;
      createdFrom?: string;
      createdTo?: string;
      sourcePartnerUserIds?: string[];
      isAllTime?: boolean;
      limit?: number;
    }
  ) {
    return this.autoAllocationUserService.getUsersForAllocation(
      body.brandId,
      body.createdFrom,
      body.createdTo,
      body.sourcePartnerUserIds,
      body.isAllTime,
      body.limit
    );
  }
}
