import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { CreateOtpDto } from "./dto/create-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { UsersService } from "../user/user.service";

@Injectable()
export class OtpVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async createOtp(data: CreateOtpDto) {
    return this.prisma.userOtpVerification.create({
      data,
    });
  }

  async verifyOtp({ userId, otpCode, type }: VerifyOtpDto) {
    const otpRecord = await this.prisma.userOtpVerification.findFirst({
      where: {
        userId,
        otpCode,
        type,
        isUsed: false,
        expiresAt: {
          gte: new Date(),
        },
      },
    });
    // check if otp is used
    if (otpRecord?.isUsed) {
      throw new BadRequestException("OTP already used");
    }
    // check if otp is expired
    if (!otpRecord) {
      throw new NotFoundException("Invalid or expired OTP");
    }

    // mark email  or phone number as verified
    if (type === "email") {
      await this.usersService.update(userId, { isEmailVerified: true });
    } else if (type === "phone") {
      await this.usersService.update(userId, { isPhoneVerified: true });
    }
    await this.prisma.userOtpVerification.update({
      where: { id: otpRecord.id },
      data: { isUsed: true },
    });
    return { message: "OTP verified successfully" };
  }

  //check no of otp sent to user in last 10 minutes
  async checkOtpLimit(userId: string, type: string) {
    // Check if the user has sent more than 5 OTPs in the last 10 minutes
    const recentOtps = await this.prisma.userOtpVerification.findMany({
      where: {
        userId,
        type,
        createdAt: {
          gte: new Date(Date.now() - 10 * 60 * 1000), // last 10 minutes
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5, // we only care about the last 5
    });
    // check if otp is sent in last 30 seconds
    if (recentOtps.length > 0) {
      // If there are recent OTPs, check the latest one
      const latestOtp = recentOtps[0];

      // If the latest OTP is less than 30s old
      if (latestOtp.createdAt > new Date(Date.now() - 30 * 1000)) {
        throw new BadRequestException(
          "Please wait for 30 seconds before requesting a new OTP",
        );
      }
    }
    // check if otp limit is exceeded
    if (recentOtps.length >= 5) {
      // If the user has sent more than 5 OTPs in the last 10 minutes
      throw new BadRequestException(
        "OTP limit exceeded. Please try again later.",
      );
    }
  }
}
