import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { AcefoneService } from "../../external/acefone/acefone.service";
import { PrismaService } from "../../prisma/prisma.service";
import { logger } from "@trigger.dev/sdk/v3";

export interface AcefoneDialerPayload {
  // User Context (REQUIRED)
  userId: string;
  partnerUserId: string;
  brandId: string;
  alternatePhoneNumberId: string | null;
  // Optional call metadata
  loanId: string | null;
  callType?: "inbound" | "outbound" | "manual";
  callReason?: string;
}

export interface AcefoneDialerCallResponse {
  success: boolean;
  message: string;
  callId?: string;
  user?: {
    id: string;
    email: string;
  };
  partnerUser?: {
    id: string;
    email: string;
  };
  acefoneResponse?: any;
  error?: string;
}

@Injectable()
export class AcefoneDialerService {
  constructor(
    private readonly acefoneService: AcefoneService,
    private readonly prismaService: PrismaService,
  ) {}

  async initiateCall(
    payload: AcefoneDialerPayload,
  ): Promise<AcefoneDialerCallResponse> {
    try {
      // Validate required fields
      this.validatePayload(payload);

      // Fetch user and partner data in parallel
      const [user, partnerUser, brand, dialerConfig] = await Promise.all([
        this.prismaService.user.findUnique({
          where: { id: payload.userId },
          select: { id: true, email: true, phoneNumber: true },
        }),
        this.prismaService.partnerUser.findUnique({
          where: { id: payload.partnerUserId },
          select: { id: true, email: true },
        }),
        this.prismaService.brand.findUnique({
          where: { id: payload.brandId },
          select: { id: true },
        }),
        this.prismaService.partner_user_dialer_configs.findUnique({
          where: { partner_user_id: payload.partnerUserId },
        }),
      ]);
      // Validate all data exists
      if (!user || !partnerUser || !brand) {
        throw new BadRequestException("User, Partner User, or Brand not found");
      }

      // Get destination_number from user.phoneNumber and agent_number from config
      const destinationNumber = user.phoneNumber;

      if (!destinationNumber) {
        throw new BadRequestException("User phone number not found");
      }

      if (!dialerConfig) {
        throw new BadRequestException(
          "Dialer configuration not found for the partner user. Please set up the dialer agent number and try again. For assistance, contact Sameer.",
        );
      }

      const agentNumber = dialerConfig.agent_user_number;
      const leadId = dialerConfig.agent_user_id;
      const skill_id = dialerConfig.agent_skill_id;
      if (!agentNumber) {
        throw new BadRequestException(
          "Dialer agent number not configured. Please set up the dialer agent number and try again. For assistance, contact Sameer.",
        );
      }
      if (!leadId) {
        throw new BadRequestException(
          "Dialer agent ID not configured. Please set up the dialer agent ID and try again. For assistance, contact Sameer.",
        );
      }
      if (!skill_id) {
        throw new BadRequestException(
          "Dialer skill ID not configured. Please set up the dialer skill ID and try again. For assistance, contact Sameer.",
        );
      }

      // Validate phone numbers
      const cleanDestination = destinationNumber.replace(/\D/g, "");
      const cleanAgent = agentNumber.replace(/\D/g, "");

      if (cleanDestination.length < 10 || cleanAgent.length < 10) {
        throw new BadRequestException(
          "Phone numbers must be at least 10 digits",
        );
      }

      // Create UserCall record
      const userCall = await this.prismaService.userCall.create({
        data: {
          userId: payload.userId,
          partnerUserId: payload.partnerUserId,
          brandId: payload.brandId,
          loan_id: payload?.loanId || null,
          alternate_phone_number_id: payload?.alternatePhoneNumberId || null,
        },
      });
      // Initiate the call via Acefone service using createBroadcastLead
      const acefoneResponse = await this.acefoneService.createBroadcastLead(
        leadId,
        {
          field_0: destinationNumber,
          field_1: user.id,
          field_2: payload.loanId || 'null',
          field_3: payload.alternatePhoneNumberId || 'null',
          field_4: userCall.id,
          priority: "30",
          duplicate_option: "clone",
          skill_id: skill_id,
        },
      );
            return {
        success: true,
        message: "Call initiated successfully",
        callId: userCall.id,
        user: {
          id: user.id,
          email: user.email,
        },
        partnerUser: {
          id: partnerUser.id,
          email: partnerUser.email,
        },
        acefoneResponse,
      };
    } catch (error) {
      console.error("Acefone Dialer Error:", error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: error.message || "Failed to initiate call",
          error: error.response?.data?.message || error.message,
        },
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getUserCalls(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<{
    calls: any[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const limit = options?.limit || 10;
    const offset = options?.offset || 0;

    const whereClause: any = { userId };

    if (options?.startDate || options?.endDate) {
      whereClause.createdAt = {};
      if (options.startDate) {
        whereClause.createdAt.gte = options.startDate;
      }
      if (options.endDate) {
        whereClause.createdAt.lte = options.endDate;
      }
    }

    const [calls, total] = await Promise.all([
      this.prismaService.userCall.findMany({
        where: whereClause,
        include: {
          user: { select: { id: true, email: true } },
          partnerUser: { select: { id: true, email: true } },
          events: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        skip: offset,
        take: limit,
      }),
      this.prismaService.userCall.count({ where: whereClause }),
    ]);

    return { calls, total, limit, offset };
  }

  async getPartnerUserCalls(
    partnerUserId: string,
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<{
    calls: any[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const limit = options?.limit || 10;
    const offset = options?.offset || 0;

    const whereClause: {
      partnerUserId: string;
      createdAt?: { gte?: Date; lte?: Date };
    } = { partnerUserId };

    if (options?.startDate || options?.endDate) {
      whereClause.createdAt = {};
      if (options.startDate) {
        whereClause.createdAt.gte = options.startDate;
      }
      if (options.endDate) {
        whereClause.createdAt.lte = options.endDate;
      }
    }

    const [calls, total] = await Promise.all([
      this.prismaService.userCall.findMany({
        where: whereClause,
        include: {
          user: { select: { id: true, email: true } },
          partnerUser: { select: { id: true, email: true } },
          events: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        skip: offset,
        take: limit,
        orderBy: { id: "desc" },
      }),
      this.prismaService.userCall.count({ where: whereClause }),
    ]);

    return { calls, total, limit, offset };
  }

  async getCallDetails(callId: string): Promise<any> {
    const userCall = await this.prismaService.userCall.findUnique({
      where: { id: callId },
      include: {
        user: { select: { id: true, email: true } },
        partnerUser: { select: { id: true, email: true } },
        events: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!userCall) {
      throw new BadRequestException("Call not found");
    }

    return userCall;
  }

  async endCall(callId: string, duration?: number): Promise<any> {
    try {
      const userCall = await this.getCallDetails(callId);

      // Calculate duration if not provided
      let calculatedDuration = duration || 0;
      if (!duration && userCall.events && userCall.events.length > 0) {
        const initiatedEvent = userCall.events[0];
        const durationMs =
          new Date().getTime() - new Date(initiatedEvent.createdAt).getTime();
        calculatedDuration = Math.floor(durationMs / 1000);
      }

      // Log call ended event
      await this.prismaService.userCallEvent.create({
        data: {
          userCallId: callId,
          type: "call_ended",
          duration: calculatedDuration,
          callStatus: "ended",
        },
      });

      return {
        success: true,
        message: "Call ended successfully",
        callId,
        duration: calculatedDuration,
      };
    } catch (error) {
      console.error("Error ending call:", error);
      throw new HttpException(
        {
          success: false,
          message: "Failed to end call",
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getUserCallStats(
    userId: string,
    dateRange?: {
      startDate: Date;
      endDate: Date;
    },
  ): Promise<{
    totalCalls: number;
    averageDuration: number;
    totalDuration: number;
    dateRange: {
      startDate: Date;
      endDate: Date;
    };
  }> {
    const startDate =
      dateRange?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const endDate = dateRange?.endDate || new Date();

    const whereClause = {
      userId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    const calls = await this.prismaService.userCall.findMany({
      where: whereClause,
      include: {
        events: true,
      },
    });

    const totalCalls = calls.length;
    let totalDuration = 0;

    // Calculate total duration from events
    calls.forEach((call) => {
      const endedEvent = call.events.find((e) => e.type === "call_ended");
      if (endedEvent && endedEvent.duration) {
        totalDuration += endedEvent.duration;
      }
    });

    const averageDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;

    return {
      totalCalls,
      averageDuration: Math.round(averageDuration),
      totalDuration,
      dateRange: { startDate, endDate },
    };
  }

  async getPartnerUserCallStats(
    partnerUserId: string,
    dateRange?: {
      startDate: Date;
      endDate: Date;
    },
  ): Promise<{
    totalCalls: number;
    averageDuration: number;
    totalDuration: number;
    dateRange: {
      startDate: Date;
      endDate: Date;
    };
  }> {
    const startDate =
      dateRange?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const endDate = dateRange?.endDate || new Date();

    const whereClause = {
      partnerUserId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    const calls = await this.prismaService.userCall.findMany({
      where: whereClause,
      include: {
        events: true,
      },
    });

    const totalCalls = calls.length;
    let totalDuration = 0;

    // Calculate total duration from events
    calls.forEach((call) => {
      const endedEvent = call.events.find((e) => e.type === "call_ended");
      if (endedEvent && endedEvent.duration) {
        totalDuration += endedEvent.duration;
      }
    });

    const averageDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;

    return {
      totalCalls,
      averageDuration: Math.round(averageDuration),
      totalDuration,
      dateRange: { startDate, endDate },
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================
  private validatePayload(payload: AcefoneDialerPayload): void {
    if (!payload.userId || !payload.partnerUserId || !payload.brandId) {
      throw new BadRequestException(
        "userId, partnerUserId, and brandId are required",
      );
    }
  }
  public async handleOutboundCallWebhook(body: any) {
    try {
      logger.log("Received outbound call webhook:", body);

      if (!body) {
        throw new BadRequestException("Webhook body is required");
      }

      // Extract key information from webhook
      const {
        uuid: callId,
        call_id: acefoneCallId,
        call_to_number,
        caller_id_number,
        start_stamp,
        answer_stamp,
        end_stamp,
        hangup_cause,
        billsec,
        duration,
        call_status,
        call_flow,
        broadcast_lead_fields,
        direction,
        recording_url,
        campaign_name,
        campaign_id,
        answered_agent,
        answered_agent_name,
        answered_agent_number,
        missed_agent,
        outbound_sec,
        agent_ring_time,
        agent_transfer_ring_time,
        billing_circle,
        call_connected,
        aws_call_recording_identifier,
        customer_ring_time,
      } = body;

      // Extract customer ID from broadcast_lead_fields (Name field contains the user ID)
      const customerUserId = broadcast_lead_fields?.Name;
      const callRecordId = broadcast_lead_fields?.Address;

      if (!customerUserId || !callRecordId) {
        console.warn("Missing customer user ID or call record ID in webhook");
        return {
          success: false,
          message: "Missing required fields in webhook payload",
        };
      }

      // Find the user call by the custom data we stored
      const userCall = await this.prismaService.userCall.findUnique({
        where: { id: callRecordId },
      });

      if (!userCall) {
        console.warn(`User call not found with ID: ${callRecordId}`);
        return {
          success: false,
          message: "User call not found",
        };
      }

      // Calculate duration in seconds if not provided
      const callDuration = Number.parseInt(duration || "0");

      // Create a new webhook event record with comprehensive data
      await this.prismaService.userCallEvent.create({
        data: {
          userCallId: callRecordId,
          type: "call_completed",
          callStatus: call_status,
          callType: direction?.includes("outbound") ? "outbound" : "inbound",
          duration: callDuration,
          fromNumber: caller_id_number,
          toNumber: call_to_number,
          clientCustomData: JSON.stringify({
            // Call identifiers
            uuid: callId,
            acefoneCallId: acefoneCallId,

            // Call timing information
            start_stamp,
            answer_stamp,
            end_stamp,
            hangup_cause,
            billsec,
            outbound_sec,
            agent_ring_time,
            agent_transfer_ring_time,
            customer_ring_time,

            // Campaign information
            campaign_name,
            campaign_id,
            direction,

            // Call flow details
            call_flow: call_flow || [],
            call_connected,

            // Agent information
            answered_agent: answered_agent || [],
            answered_agent_name,
            answered_agent_number,
            missed_agent,

            // Recording and billing
            recording_url,
            aws_call_recording_identifier,
            billing_circle,

            // Customer and broadcast data
            customer_user_id: customerUserId,
            broadcast_lead_fields: {
              phone_number: broadcast_lead_fields?.Phone_Number,
              name: broadcast_lead_fields?.Name,
              email: broadcast_lead_fields?.Email_Id,
              address: broadcast_lead_fields?.Address,
              company_name: broadcast_lead_fields?.Company_Name,
              alternate_phone: broadcast_lead_fields?.Alternate_Phone_Number,
            },
          }),
        },
      });
      return {
        success: true,
        message: "Outbound call webhook processed successfully",
        callId,
        acefoneCallId,
        callStatus: call_status,
        duration: callDuration,
        answeredAgent: answered_agent_name,
        recordingUrl: recording_url,
      };
    } catch (error) {
      console.error("Error processing outbound call webhook:", error);
      return {
        success: false,
        message: "Error processing webhook",
        error: error.message,
      };
    }
  }
}
