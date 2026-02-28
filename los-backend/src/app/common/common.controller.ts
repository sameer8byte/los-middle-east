import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from "@nestjs/common";
import { AuthType } from "src/common/decorators/auth.decorator";
import { CommonAppService } from "./common.services";
import { ResetUserDto } from "./dto/reset-user.dto";

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

  // create brand
  @Post("reset")
  async reset(@Body() resetUserDto: ResetUserDto) {
    const { brandId, email } = resetUserDto;
    return await this.commonAppService.resetUser(brandId, email);
  }
}
