import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import { AuthType } from "../../../common/decorators/auth.decorator";
import { PartnerAuthService } from "../services/partner.auth.service";

@Controller("auth/partner")
export class PartnerAuthController {
  constructor(private readonly partnerAuthService: PartnerAuthService) {}

  // login with email and password
  @AuthType("public")
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async loginWithEmailAndPassword(
    @Body("email") email: string,
    @Body("password") password: string,
    @Body("deviceId") deviceId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.partnerAuthService.loginWithEmailAndPassword(
      email,
      password,
      deviceId,
    );
  }

  // logout
  @AuthType("partner")
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    return this.partnerAuthService.logout(req.partnerUser.id);
  }

  // Example endpoint that accepts both partner and web authentication
  @AuthType(["partner", "web"])
  @Post("validate-session")
  @HttpCode(HttpStatus.OK)
  async validateSession(@Req() req: any) {
    const user = req.partnerUser || req.user;
    return {
      success: true,
      userType: req.partnerUser ? "partner" : "web",
      userId: user.id,
      message: "Session is valid",
    };
  }

  // sendResetPasswordEmail
  @AuthType("public")
  @Post("send-reset-password-email")
  @HttpCode(HttpStatus.OK)
  async sendResetPasswordEmail(@Body("email") email: string) {
    return this.partnerAuthService.sendResetPasswordEmail(email);
  }

  // reset password
  @AuthType("public")
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body("token") token: string,
    @Body("newPassword") newPassword: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.partnerAuthService.resetPassword(token, newPassword);
  }

  // change password
  @AuthType("partner")
  @Post("change-password")
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Req() req: any,
    @Body("currentPassword") currentPassword: string,
    @Body("newPassword") newPassword: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.partnerAuthService.updatePassword(
      req.partnerUser.id,
      currentPassword,
      newPassword,
    );
  }
}
