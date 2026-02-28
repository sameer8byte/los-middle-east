/**
 * Acefone Click-to-Dial API Types
 * TypeScript interfaces and types for Acefone integration
 */

/**
 * Request payload for Click to Dial API
 */
export interface ClickToDialRequest {
  /**
   * Customer's phone number to be called
   * Format: 10-15 digits, can include country code
   * Examples: "9773785953", "919773785953", "+919773785953"
   */
  destination_number: string;

  /**
   * Agent's phone number to receive the initial call
   * Format: 10-15 digits, can include country code
   * Examples: "9818818529", "919818818529", "+919818818529"
   */
  agent_number: string;
}

/**
 * Response from Click to Dial API
 */
export interface ClickToDialResponse {
  /** Indicates if the request was successful */
  status: boolean;

  /** Human-readable message describing the result */
  message: string;

  /** Optional data returned by Acefone API */
  data?: Record<string, any>;
}

/**
 * Error response from Click to Dial API
 */
export interface ClickToDialErrorResponse {
  /** Indicates failure */
  status: false;

  /** Error message */
  message: string;

  /** Optional error details */
  error?: Record<string, any>;
}

/**
 * Call status types
 */
export type CallStatus = 'idle' | 'calling' | 'connected' | 'ended' | 'error';

/**
 * Component props for AcefoneClickToDial
 */
export interface AcefoneClickToDialProps {
  /**
   * Customer's phone number (required)
   * Will be called when agent answers
   */
  customerPhone: string;

  /**
   * Agent's phone number (optional)
   * Can be provided here or entered in the dialog
   * Agent receives the initial call
   */
  agentPhone?: string;

  /**
   * Customer/User ID for reference (optional)
   * Used for logging and tracking purposes
   */
  customerId?: string;

  /**
   * Loan ID for reference (optional)
   * Used for logging and tracking purposes
   */
  loanId?: string;

  /**
   * Whether to disable the button (optional)
   * Default: false
   */
  disabled?: boolean;
}

/**
 * Acefone configuration options
 */
export interface AcefoneConfig {
  /** Acefone API token (from admin portal) */
  apiToken: string;

  /** Base URL for Acefone API */
  apiBaseUrl: string;

  /** Enable/disable click to dial feature */
  enabled: boolean;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Call event payload
 */
export interface CallEvent {
  /** Unique call identifier */
  callId: string;

  /** Customer phone number */
  customerPhone: string;

  /** Agent phone number */
  agentPhone: string;

  /** Call status */
  status: CallStatus;

  /** Timestamp of the event */
  timestamp: Date;

  /** Call duration in seconds (if connected) */
  duration?: number;

  /** Optional error message */
  error?: string;

  /** Additional metadata */
  metadata?: {
    customerId?: string;
    loanId?: string;
    [key: string]: any;
  };
}

/**
 * Acefone API error response from actual Acefone server
 */
export interface AcefoneApiError {
  /** Error code from Acefone */
  code?: string | number;

  /** Error message from Acefone */
  message: string;

  /** Additional error details */
  details?: Record<string, any>;
}

/**
 * Phone number validation result
 */
export interface PhoneValidationResult {
  /** Is the phone number valid */
  isValid: boolean;

  /** Formatted phone number */
  formatted: string;

  /** Country code (if detected) */
  countryCode?: string;

  /** National number part */
  nationalNumber: string;

  /** Error message (if invalid) */
  error?: string;
}

/**
 * Acefone integration state (for Redux/Context)
 */
export interface AcefoneState {
  /** Is the feature enabled */
  enabled: boolean;

  /** Is API token configured */
  tokenConfigured: boolean;

  /** Current call status */
  callStatus: CallStatus;

  /** Call duration in seconds */
  callDuration: number;

  /** Is a call in progress */
  isCallInProgress: boolean;

  /** Last error (if any) */
  lastError?: string;

  /** Last successful call info */
  lastCall?: {
    customerPhone: string;
    agentPhone: string;
    timestamp: Date;
  };
}

/**
 * Service configuration interface
 */
export interface AcefoneServiceConfig {
  httpClient: any; // HttpService from NestJS
  configService: any; // ConfigService from NestJS
}

/**
 * API request interceptor options
 */
export interface RequestInterceptorOptions {
  /** Add authentication headers */
  includeAuth?: boolean;

  /** Add timestamp */
  includeTimestamp?: boolean;

  /** Custom headers */
  customHeaders?: Record<string, string>;
}

/**
 * API response transformer
 */
export type ResponseTransformer = (response: any) => ClickToDialResponse;

/**
 * Acefone webhook payload (for future integration)
 */
export interface AcefoneWebhookPayload {
  /** Event type */
  event: 'call_started' | 'call_answered' | 'call_ended' | 'call_failed';

  /** Call ID */
  callId: string;

  /** Timestamp */
  timestamp: string;

  /** Call details */
  details: {
    caller: string;
    callee: string;
    duration?: number;
    status: string;
    errorCode?: string;
  };
}

/**
 * Call history entry
 */
export interface CallHistoryEntry {
  /** Unique call ID */
  id: string;

  /** Customer phone */
  customerPhone: string;

  /** Agent phone */
  agentPhone: string;

  /** Call start time */
  startTime: Date;

  /** Call end time */
  endTime?: Date;

  /** Call duration in seconds */
  duration?: number;

  /** Call status */
  status: 'initiated' | 'connected' | 'failed' | 'completed';

  /** Customer ID */
  customerId?: string;

  /** Loan ID */
  loanId?: string;

  /** Call recording URL (if available) */
  recordingUrl?: string;

  /** Additional notes */
  notes?: string;
}

/**
 * Acefone metrics/analytics
 */
export interface AcefoneMetrics {
  /** Total calls initiated */
  totalCalls: number;

  /** Successful calls */
  successfulCalls: number;

  /** Failed calls */
  failedCalls: number;

  /** Average call duration */
  averageCallDuration: number;

  /** Success rate percentage */
  successRate: number;

  /** Calls by hour */
  callsByHour: Record<number, number>;

  /** Calls by agent */
  callsByAgent: Record<string, number>;
}

/**
 * Feature flags for Acefone
 */
export interface AcefoneFeatureFlags {
  /** Enable click to dial */
  clickToDial: boolean;

  /** Enable call recording */
  callRecording: boolean;

  /** Enable call history */
  callHistory: boolean;

  /** Enable analytics */
  analytics: boolean;

  /** Enable IVR menu */
  ivrMenu: boolean;

  /** Enable SMS fallback */
  smsFallback: boolean;

  /** Enable webhook integration */
  webhooks: boolean;
}

// ============================================================================
// USER MANAGEMENT TYPES
// ============================================================================

/**
 * Request payload for Create User API
 */
export interface CreateUserRequest {
  name: string;
  number: string;
  email: string;
  login_id: string;
  user_role: number;
  password: string;
  status: boolean;
  create_agent: boolean;
  create_web_login: boolean;
  caller_id: number[];
  block_web_login?: boolean;
  user_for_cdr?: object;
  login_based_calling?: boolean;
  agent_group?: string[];
  department?: string[];
  time_group?: string;
  create_extension?: boolean;
  enable_calling?: boolean;
}

/**
 * User data returned from Acefone
 */
export interface AcefoneUser {
  id: number;
  name: string;
  number: string;
  email: string;
  login_id: string;
  status: boolean;
  role: string;
  create_agent: boolean;
  create_web_login: boolean;
  caller_id: number[];
  [key: string]: any;
}

/**
 * Generic response from user management APIs
 */
export interface UserManagementResponse {
  success: boolean;
  message: string;
  data?: AcefoneUser | AcefoneUser[] | any;
  error?: Record<string, any>;
}

/**
 * Paginated response for fetch multiple users
 */
export interface PaginatedUserResponse {
  success: boolean;
  message: string;
  data?: {
    users: AcefoneUser[];
    total: number;
    limit: number;
    offset: number;
  };
  error?: Record<string, any>;
}

/**
 * User creation request from frontend
 */
export interface CreateUserPayload {
  name: string;
  number: string;
  email: string;
  login_id: string;
  user_role: number;
  password: string;
  create_agent: boolean;
  create_web_login: boolean;
  caller_id: number[];
  block_web_login?: boolean;
  agent_group?: string[];
  department?: string[];
  time_group?: string;
}

/**
 * User update request
 */
export interface UpdateUserPayload {
  name?: string;
  number?: string;
  email?: string;
  login_id?: string;
  password?: string;
  status?: boolean;
  caller_id?: number[];
  block_web_login?: boolean;
  agent_group?: string[];
  department?: string[];
  time_group?: string;
}
