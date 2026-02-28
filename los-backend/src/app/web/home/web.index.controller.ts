import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { AuthType } from "src/common/decorators/auth.decorator";
import { WebIndexService } from "./web.index.service";
import { CreateCallMeRequestDto } from "../../common/dto/create-call-me-request.dto";

@Controller("web/home")
export class WebIndexController {
  constructor(private readonly webService: WebIndexService) {}

  @AuthType("public")
  @Get("index")
  @HttpCode(HttpStatus.OK)
  async getProfile(@Req() req) {
    const domain = req.headers["domain"];
    if (!domain) {
      throw new BadRequestException("Domain is required");
    }
    return this.webService.getIndex(domain);
  }

  // user
  @AuthType("web")
  @Get("user")
  @HttpCode(HttpStatus.OK)
  async getUser(@Req() req) {
    const userId = req.user.id;
    return this.webService.getUser(userId);
  }

  // getAllAlternatePhoneNumbers
  @AuthType("web")
  @Get("alternate-phone-numbers/:userId")
  @HttpCode(HttpStatus.OK)
  async getAllAlternatePhoneNumbers(@Param("userId") userId: string) {
    return this.webService.getAllAlternatePhoneNumbers(userId);
  }

  // call me request
  @AuthType("web")
  @Post("call-me-request")
  @HttpCode(HttpStatus.OK)
  async createCallMeRequest(@Body() body: CreateCallMeRequestDto) {
    return this.webService.createCallMeRequest(body);
  }

  // update user profile (occupation type)
  @AuthType("web")
  @Patch(":userId/profile")
  @HttpCode(HttpStatus.OK)
  async updateUserProfile(
    @Param("userId") userId: string,
    @Body() body: any,
  ) {
    return this.webService.updateUserProfile(userId, body);
  }
}
