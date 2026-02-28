import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  Version,
} from "@nestjs/common";
import { Response } from "express";
import { AuthService } from "../services/web.auth.service";
import { AuthType } from "../../../common/decorators/auth.decorator";
import { VerifyOtpDto } from "../dto/verify.dto";
import { GoogleLoginDto } from "../dto/google-login.dto";
import { SendEmailDto } from "../dto/send-email.dto";
import { LoginDto, SendSmsDto } from "../dto/send-sms.dto";
import { SendSignupOtpV2Dto } from "../dto/send-signup-otp-v2.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ==================== V1 Endpoints ====================
  @Version("1")
  @AuthType("public")
  @Post("verify")
  @HttpCode(HttpStatus.OK)
  async verifyOtpV1(
    @Body() verifyOtpDto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.verifyOtp(res, verifyOtpDto);
  }

  @Version("1")
  @AuthType("public")
  @Post("google-login")
  @HttpCode(HttpStatus.OK)
  async googleLoginV1(@Body() googleLoginDto: GoogleLoginDto) {
    return this.authService.validateGoogleToken(googleLoginDto);
  }

  @Version("1")
  @AuthType("web")
  @Post("send-email")
  @HttpCode(HttpStatus.OK)
  async sendEmailV1(@Body() emailDto: SendEmailDto) {
    return this.authService.sendEmail(
      emailDto.email,
      emailDto.brandId,
      emailDto.userId,
    );
  }
  @Version("1")
  @AuthType("public")
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async sendSmsV2(@Req() req, @Body() loginDto: LoginDto) {
    const doamin = req.headers["domain"];
    return this.authService.sendPhoneOrEmail(
      loginDto.phone,
      loginDto.email,
      loginDto.brandId,
      doamin,
    );
  }

  @Version("1")
  @AuthType("public")
  @Post("send-sms")
  @HttpCode(HttpStatus.OK)
  async sendSmsV1(@Req() req, @Body() smsDto: SendSmsDto) {
    const doamin = req.headers["domain"];
    return this.authService.sendPhone(smsDto.phone, smsDto.brandId, doamin);
  }

  @Version("1")
  @AuthType("public")
  @Post("refresh-token")
  @HttpCode(HttpStatus.OK)
  async refreshTokenV1(@Req() req, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies["refresh-token"];
    const doamin = req.headers["domain"];
    const tokens = await this.authService.refreshAccessToken(
      refreshToken,
      doamin,
    );
    res.cookie("refresh-token", tokens.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });
    return { accessToken: tokens.accessToken };
  }

  @Version("1")
  @AuthType("web")
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logoutV1(@Req() req) {
    await this.authService.userLogout(req.user.brandId, req.user.id);
    return {
      accessToken: null,
    };
  }

  // ==================== V2 Endpoints ====================
  @Version("2")
  @AuthType("public")
  @Post("verify")
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body() verifyOtpDto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const version = "2";
    return this.authService.verifyOtp(res, verifyOtpDto, version);
  }

  @Version("2")
  @AuthType("public")
  @Post("google-login")
  @HttpCode(HttpStatus.OK)
  async googleLogin(@Body() googleLoginDto: GoogleLoginDto) {
    const version = "2";

    return this.authService.validateGoogleToken(googleLoginDto, version);
  }

  @Version("2")
  @AuthType("web")
  @Post("send-email")
  @HttpCode(HttpStatus.OK)
  async sendEmail(@Body() emailDto: SendEmailDto) {
    return this.authService.sendEmail(
      emailDto.email,
      emailDto.brandId,
      emailDto.userId,
    );
  }

  @Version("2")
  @AuthType("public")
  @Post("send-sms")
  @HttpCode(HttpStatus.OK)
  async sendSms(@Req() req, @Body() smsDto: SendSmsDto) {
    const doamin = req.headers["domain"];
    const version = "2";
    return this.authService.sendPhone(
      smsDto.phone,
      smsDto.brandId,
      doamin,
      version,
    );
  }

  @Version("2")
  @AuthType("public")
  @Post("send-signup")
  @HttpCode(HttpStatus.OK)
  async sendSignupOtp(@Req() req, @Body() dto: SendSignupOtpV2Dto) {
    const domain = req.headers["domain"];
    return this.authService.sendSignupOtpV2(
      {
        phoneNumber: dto.phoneNumber,
        occupationTypeId: dto.occupationTypeId,
        monthlySalary: dto.monthlySalary,
        panCard: dto.panCard,
      },
      dto.brandId,
      domain,
    );
  }

  @Version("2")
  @AuthType("public")
  @Post("refresh-token")
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Req() req, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies["refresh-token"];
    const doamin = req.headers["domain"];
    const tokens = await this.authService.refreshAccessToken(
      refreshToken,
      doamin,
    );
    res.cookie("refresh-token", tokens.refreshToken, {
      httpOnly: true, 
      secure: false,
      sameSite: "lax", 
      maxAge: 24 * 60 * 60 * 1000, 
    });
    return { accessToken: tokens.accessToken };
  }

  @Version("2")
  @AuthType("web")
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req) {
    await this.authService.userLogout(req.user.brandId, req.user.id);
    return {
      accessToken: null,
    };
  }
}
