import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { StringeeService } from "src/external/stringee/stringee.service";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class CallRequestService {
  constructor(
    private prisma: PrismaService,
    private readonly stringeeService: StringeeService,
  ) {}

  async createCall(brandId: string, partnerUserId: string, userId: string) {
    if (!brandId || !partnerUserId || !userId) {
      throw new BadRequestException("All parameters are required");
    }
    const callRequest = await this.prisma.userCall.create({
      data: {
        brandId,
        partnerUserId,
        userId,
      },
    });
    if (!callRequest) {
      throw new BadRequestException("Failed to create call request");
    }
    return callRequest;
  }

  // generate a JWT access token to authenticate with Stringee API
  async generateAccessToken(
    userId: string,
    partnerUserId: string,
    loanId: string | null,
  ): Promise<{
    userPhoneNumber: string;
    fromPhoneNumber: string;
    accessToken: string;
    callId: string;
    message: string;
  }> {
    try {
      if (!userId) {
        throw new BadRequestException("User ID is required");
      }
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      const call = await this.createCall(user.brandId, partnerUserId, userId);
      // if (loanId) {
      await this.prisma.repaymentTimeline.create({
        data: {
          loanId: loanId || null,
          userId,
          userCallId: call.id,
          brandId: user.brandId,
          partnerUserId,
          message: "Call initiated",
        },
      });
      // }
      const token = await this.stringeeService.generateAccessToken(call.id);
      if (!token) {
        throw new BadRequestException("Failed to generate access token");
      }

      return {
        userPhoneNumber: user.phoneNumber,
        callId: call.id,
        fromPhoneNumber: this.stringeeService.getPhoneNumber(),
        accessToken: token,
        message: "Access token generated successfully",
      };
    } catch (error) {
      throw new Error(`Failed to generate access token: ${error.message}`);
    }
  }

  async getRecording(userCallRecordingsId: string) {
    if (!userCallRecordingsId) {
      throw new BadRequestException("User call recordings ID is required");
    }
    const recording = await this.prisma.userCallRecording.findUnique({
      where: { id: userCallRecordingsId },
    });
    if (!recording) {
      throw new BadRequestException("Recording not found");
    }
    if (recording.filePrivateUrl) {
      return recording;
    }
    const fileBuffer = await this.stringeeService.getRecordings(
      recording.recordingUrl,
    );

    const response = await this.prisma.userCallRecording.update({
      where: { id: userCallRecordingsId },
      data: { filePrivateUrl: fileBuffer.key },
    });

    return response;
  }
}
