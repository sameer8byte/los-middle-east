import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { AuthType } from "src/common/decorators/auth.decorator";
import { CallMeRequestService } from "../services/callMeRequest.service";
import {
  CreateCallMeRequestDto,
  UpdateCallMeRequestDto,
} from "../dto/create-call-me-request.dto";

@AuthType("public")
@Controller("common/:brandId/call-me-requests")
export class CallMeRequestController {
  constructor(private readonly callMeRequest: CallMeRequestService) {}

  @Get()
  async getCallMeRequests(
    @Query("userId") userId?: string,
    @Param("brandId") brandId?: string,
  ) {
    return this.callMeRequest.getCallMeRequests(brandId, userId);
  }

  @Post()
  async createCallMeRequest(@Body() body: CreateCallMeRequestDto) {
    const { userId, message, phoneNumber, isResolved } = body;
    if (!userId || !message || !phoneNumber) {
      throw new BadRequestException(
        'Fields "userId", "message", and "phoneNumber" are required',
      );
    }
    return this.callMeRequest.createCallMeRequest({
      userId,
      message,
      phoneNumber,
      isResolved: isResolved || false,
    });
  }

  // update call me request
  @Patch(":callMeRequestId")
  async updateCallMeRequest(@Body() body: UpdateCallMeRequestDto) {
    return this.callMeRequest.updateCallMeRequest(
      body.callMeRequestId,
      body.isResolved || false,
    );
  }
}
