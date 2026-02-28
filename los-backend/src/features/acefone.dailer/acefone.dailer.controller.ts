import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  AcefoneDialerService,
  AcefoneDialerPayload,
  AcefoneDialerCallResponse,
} from "./acefone.dailer.service";
import { AuthType } from "src/common/decorators/auth.decorator";

// ============================================================================
// REQUEST DTOs
// ============================================================================

export interface InitiateCallDto {
  userId: string;
  partnerUserId: string;
  brandId: string;
  destination_number: string;
  agent_number: string;
  loanId?: string;
  alternatePhoneNumberId?: string;
  customerId?: string;
  callType?: "inbound" | "outbound" | "manual";
  callReason?: string;
}

export interface EndCallDto {
  duration?: number;
}

export interface GetCallStatsDto {
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export interface CallListResponse {
  success: boolean;
  data: {
    calls: any[];
    total: number;
    limit: number;
    offset: number;
  };
}

export interface CallStatsResponse {
  success: boolean;
  data: {
    totalCalls: number;
    averageDuration: number;
    totalDuration: number;
    dateRange: {
      startDate: string;
      endDate: string;
    };
  };
}

/**
 * Acefone Dialer Controller
 * Exposes dialer service endpoints with user context (userId, partnerUserId)
 */
@Controller("acefone/dialer")
@AuthType('partner')
export class AcefoneDialerController {
  constructor(private readonly acefoneDialerService: AcefoneDialerService) {}

  // ============================================================================
  // CALL INITIATION ENDPOINT
  // ============================================================================

  @Post("initiate")
  @HttpCode(HttpStatus.CREATED)
  async initiateCall(
    @Body() payload: InitiateCallDto
  ): Promise<AcefoneDialerCallResponse> {
    // Validate required fields
    if (!payload.userId || !payload.partnerUserId || !payload.brandId) {
      throw new BadRequestException(
        "userId, partnerUserId, and brandId are required"
      );
    }

    // destination_number and agent_number are optional here
    // They will be fetched from database by the service

    // Convert to service payload
    const servicePayload: AcefoneDialerPayload = {
      userId: payload.userId,
      partnerUserId: payload.partnerUserId,
      alternatePhoneNumberId: payload?.alternatePhoneNumberId || null,
      brandId: payload.brandId || null, 
      loanId: payload?.loanId || null,
      callType: payload.callType || "manual",
      callReason: payload.callReason,
    };

    return this.acefoneDialerService.initiateCall(servicePayload);
  }

  // ============================================================================
  // CALL HISTORY ENDPOINTS
  // ============================================================================

  @Get("user/:userId/calls")
  async getUserCalls(
    @Param("userId") userId: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ): Promise<CallListResponse> {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;

    if (isNaN(parsedLimit) || isNaN(parsedOffset)) {
      throw new BadRequestException("limit and offset must be valid numbers");
    }

    const data = await this.acefoneDialerService.getUserCalls(userId, {
      limit: parsedLimit,
      offset: parsedOffset,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return {
      success: true,
      data,
    };
  }

  @Get("partner/:partnerUserId/calls")
  async getPartnerUserCalls(
    @Param("partnerUserId") partnerUserId: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ): Promise<CallListResponse> {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;

    if (isNaN(parsedLimit) || isNaN(parsedOffset)) {
      throw new BadRequestException("limit and offset must be valid numbers");
    }

    const data = await this.acefoneDialerService.getPartnerUserCalls(
      partnerUserId,
      {
        limit: parsedLimit,
        offset: parsedOffset,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      }
    );

    return {
      success: true,
      data,
    };
  }

  // ============================================================================
  // CALL DETAIL ENDPOINT
  // ============================================================================
  @Get("call/:callId")
  async getCallDetails(@Param("callId") callId: string): Promise<any> {
    const callDetails = await this.acefoneDialerService.getCallDetails(callId);
    return {
      success: true,
      data: callDetails,
    };
  }

  // ============================================================================
  // CALL END ENDPOINT
  // ============================================================================
  @Patch("call/:callId/end")
  async endCall(
    @Param("callId") callId: string,
    @Body() payload: EndCallDto
  ): Promise<any> {
    return this.acefoneDialerService.endCall(callId, payload.duration);
  }

  // ============================================================================
  // CALL STATISTICS ENDPOINTS
  // ============================================================================
  @Get("user/:userId/stats")
  async getUserCallStats(
    @Param("userId") userId: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ): Promise<CallStatsResponse> {
    const statsData = await this.acefoneDialerService.getUserCallStats(userId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return {
      success: true,
      data: {
        totalCalls: statsData.totalCalls,
        averageDuration: statsData.averageDuration,
        totalDuration: statsData.totalDuration,
        dateRange: {
          startDate: statsData.dateRange.startDate.toISOString(),
          endDate: statsData.dateRange.endDate.toISOString(),
        },
      },
    };
  }

  @Get("partner/:partnerUserId/stats")
  async getPartnerUserCallStats(
    @Param("partnerUserId") partnerUserId: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ): Promise<CallStatsResponse> {
    const statsData = await this.acefoneDialerService.getPartnerUserCallStats(
      partnerUserId,
      {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      }
    );

    return {
      success: true,
      data: {
        totalCalls: statsData.totalCalls,
        averageDuration: statsData.averageDuration,
        totalDuration: statsData.totalDuration,
        dateRange: {
          startDate: statsData.dateRange.startDate.toISOString(),
          endDate: statsData.dateRange.endDate.toISOString(),
        },
      },
    };
  }
  @Post("outbound")
  @AuthType("public")
  async handleOutboundCallWebhook(@Body() body: any): Promise<any> {
    const response= await this.acefoneDialerService.handleOutboundCallWebhook(body);
    return response;
  } 
}
