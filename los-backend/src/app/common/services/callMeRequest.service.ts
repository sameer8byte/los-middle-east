import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateCallMeRequestDto } from "../dto/create-call-me-request.dto";

@Injectable()
export class CallMeRequestService {
  constructor(
    private readonly awsS3Service: AwsPublicS3Service, // Replace with actual type if available,
    private readonly prisma: PrismaService, // Replace with actual type if available
  ) {}

  //call_me_requests
  async getCallMeRequests(brandId: string, userId?: string) {
    return this.prisma.callMeRequest.findMany({
      where: {
        brandId: brandId,
        ...(userId && { userId: userId }), // Optional filter by userId
      },
      orderBy: { createdAt: "desc" },
    });
  }

  //post call me request
  async createCallMeRequest(body: CreateCallMeRequestDto) {
    const { userId, message, phoneNumber, isResolved } = body;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const callMeRequest = await this.prisma.callMeRequest.create({
      data: {
        userId: userId,
        brandId: user.brandId,
        message: message,
        phoneNumber: phoneNumber,
        isResolved: isResolved,
        updatedAt: new Date(), // Assuming you want to set the same date for createdAt and
      },
    });

    return callMeRequest;
    return callMeRequest;
  }

  async updateCallMeRequest(callMeRequestId: string, isResolved: boolean) {
    if (!callMeRequestId) {
      throw new InternalServerErrorException("Call me request ID is required");
    }

    const callMeRequest = await this.prisma.callMeRequest.update({
      where: { id: callMeRequestId },
      data: {
        isResolved: isResolved,
        updatedAt: new Date(),
        resolvedAt: isResolved ? new Date() : null, // Set resolvedAt if isResolved is true
      },
    });

    if (!callMeRequest) {
      throw new NotFoundException(
        `Call me request with ID ${callMeRequestId} not found`,
      );
    }

    return callMeRequest;
  }
}
