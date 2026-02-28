import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthType } from "src/common/decorators/auth.decorator";
import { Roles } from "src/common/decorators/roles.decorator";
import { RolePermissionGuard } from "src/common/guards/role-permission.guard";
import { CommonAppService } from "../services/common.services";
import { ResetUserDto } from "../dto/reset-user.dto";

@AuthType("public")
@Controller("common")
export class CommonAppController {
  constructor(private readonly commonAppService: CommonAppService) {}

  @Get("signed-url")
  async getAwsSignedUrl(@Query("key") key: string): Promise<{ url: string }> {
    if (!key) {
      throw new BadRequestException('Query parameter "key" is required');
    }

    const url = await this.commonAppService.awsSignedUrl(key);
    return url;
  }

  // Reset user - requires SUPER_ADMIN role and partner authentication
  @AuthType("partner")
  @UseGuards(RolePermissionGuard)
  @Roles("SUPER_ADMIN")
  @Post("reset")
  async reset(@Body() resetUserDto: ResetUserDto) {
    const { brandId, email } = resetUserDto;
    return await this.commonAppService.resetUser(brandId, email);
  }
}
