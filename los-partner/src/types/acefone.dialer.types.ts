/**
 * Acefone Dialer Types
 */

/**
 * Acefone Dialer Payload Interface
 * Matches backend AcefoneDialerPayload
 */
export interface AcefoneDialerPayload {
  // User Context (REQUIRED)
  userId: string;
  partnerUserId: string;
  brandId: string;

  // Optional call metadata
  loanId?: string;
  callType?: "inbound" | "outbound" | "manual";
  callReason?: string;
}

/**
 * Acefone Dialer Call Response Interface
 */
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

/**
 * Call details interface
 */
export interface CallDetails {
  id: string;
  brandId: string;
  partnerUserId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
  };
  partnerUser: {
    id: string;
    email: string;
  };
  events: CallEvent[];
}

/**
 * Call event interface
 */
export interface CallEvent {
  id: string;
  userCallId: string;
  type: "call_initiated" | "call_ended";
  callType?: string;
  callReason?: string;
  duration?: number;
  callStatus?: string;
  callId?: string;
  projectId?: number;
  fromNumber?: string;
  toNumber?: string;
  clientCustomData?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Call statistics interface
 */
export interface CallStatistics {
  totalCalls: number;
  averageDuration: number;
  totalDuration: number;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

/**
 * Paginated calls response interface
 */
export interface PaginatedCallsResponse {
  calls: CallDetails[];
  total: number;
  limit: number;
  offset: number;
}
