import { Injectable } from "@nestjs/common";
import * as dayjs from "dayjs";

// Access the default function from the namespace import
const _dayjs = dayjs.default;
import { PrismaService } from "src/prisma/prisma.service";

interface CallParty {
  number: string;
  alias: string;
  is_online: boolean;
  type: "internal" | "external" | string;
}

interface CallEvent {
  endCallCause: string;
  actorType: string;
  original: boolean;
  isVideoCall: boolean;
  peerToPeer: boolean;
  timestamp_ms: number;
  endedBy: string;
  type: string;
  callType: string;
  call_id: string;
  actor: string;
  duration: number; // duration in seconds
  callCreatedReason: string;
  call_status: string;
  event_id: string;
  project_id: number;
  serial: number;
  answerDuration: number; // duration in seconds
  request_from_user_id: string;
  account_sid: string;
  from: CallParty;
  clientCustomData: string;
  to: CallParty;
}

@Injectable()
export class WebhookService {
  constructor(private prisma: PrismaService) {}

  async StringeeAnswer(body: {
    from: string;
    to: string;
    userId: string;
    projectId: string;
    custom?: string;
    callId: string;
    fromInternal: boolean;
    videocall: boolean;
  }) {
    return [
      {
        action: "record",
        eventUrl: `${process.env.WEBHOOK_URL}/api/v1/webhook/stringee-recording/${body.userId}`,
        format: "mp3",
      },
      {
        action: "connect",
        from: {
          type: "internal",
          number: body.from,
          alias: body.from,
        },
        to: {
          type: "external",
          number: body.to,
          alias: body.to,
        },
      },
    ];
  }
  async StringeeEvent(body: CallEvent) {
    const call = await this.prisma.userCall.findUnique({
      where: {
        id: body.request_from_user_id, // Assuming this is the callId
      },
    });
    if (call) {
      // request_from_user_id-> callId
      await this.prisma.userCallEvent.create({
        data: {
          userCallId: body.request_from_user_id,
          endCallCause: body.endCallCause ?? null,
          actorType: body.actorType ?? null,
          original: body.original ?? null,
          isVideoCall: body.isVideoCall ?? null,
          peerToPeer: body.peerToPeer ?? null,
          timestampMs: body.timestamp_ms ? BigInt(body.timestamp_ms) : null,
          endedBy: body.endedBy ?? null,
          type: body.type ?? null,
          callType: body.callType ?? null,
          callId: body.call_id ?? null,
          actor: body.actor ?? null,
          duration: body.duration ?? null,
          callCreatedReason: body.callCreatedReason ?? null,
          callStatus: body.call_status ?? null,
          eventId: body.event_id ?? null,
          projectId: body.project_id ?? null,
          serial: body.serial ?? null,
          answerDuration: body.answerDuration ?? null,
          requestFromUserId: body.request_from_user_id ?? null,
          accountSid: body.account_sid ?? null,
          clientCustomData: body.clientCustomData ?? "",

          fromNumber: body.from?.number ?? null,
          fromAlias: body.from?.alias ?? null,
          fromIsOnline: body.from?.is_online ?? null,
          fromType: ["internal", "external"].includes(body.from?.type)
            ? body.from.type
            : null,

          toNumber: body.to?.number ?? null,
          toAlias: body.to?.alias ?? null,
          toIsOnline: body.to?.is_online ?? null,
          toType: ["internal", "external"].includes(body.to?.type)
            ? body.to.type
            : null,
        },
      });
    }
    return { message: "Event processed successfully" };
  }

  async StringeeRecording(
    body: {
      start_time: string; // Unix timestamp in milliseconds as string
      end_time: string; // Unix timestamp in milliseconds as string
      recording_url: string;
      call_id: string;
      project_id: number;
      type: "recording";
      recordMessage: boolean;
    },
    userCallId: string,
  ) {
    await this.prisma.userCallRecording.create({
      data: {
        userCallId: userCallId,
        recordingUrl: body.recording_url ?? null,
        callId: body.call_id ?? null,
        projectId: body.project_id ?? null,
        type: body.type ?? null,
        recordMessage: body.recordMessage ?? false,
        startTime: body.start_time
          ? _dayjs(Number(body.start_time)).toDate()
          : null,
        endTime: body.end_time ? _dayjs(Number(body.end_time)).toDate() : null,
        updatedAt: new Date(),
      },
    });

    return {
      message: "Recording processed successfully",
      startTime: body.start_time,
      endTime: body.end_time,
      recordingUrl: body.recording_url,
      callId: body.call_id,
      projectId: body.project_id,
      type: body.type,
      recordMessage: body.recordMessage,
    };
  }
}
