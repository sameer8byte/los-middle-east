/**
 * Type definitions for the Activity Tracking System
 * 
 * This file contains all TypeScript types and interfaces used across
 * the activity tracking feature for better type safety and IDE support.
 */

/**
 * Represents a single activity event logged by the system
 */
export interface ActivityLog {
  /** Unix timestamp in milliseconds when the event occurred */
  timestamp: number;
  
  /** Type of user interaction that triggered the event */
  eventType: 'mouse' | 'scroll' | 'keyboard' | 'click';
  
  /** User ID from authentication system (if available) */
  userId?: string;
  
  /** Current page URL path where the event occurred */
  pageUrl: string;
  
  /** Vertical scroll position (pixels from top) - only for scroll events */
  scrollPosition?: number;
  
  /** Mouse cursor position - only for mouse and click events */
  mousePosition?: {
    /** Horizontal position in pixels */
    x: number;
    /** Vertical position in pixels */
    y: number;
  };
}

/**
 * Current activity state of a user session
 */
export interface UserActivityState {
  /** Whether user is currently active (interacting) */
  isActive: boolean;
  
  /** Unix timestamp of the most recent user interaction */
  lastActivityTime: number;
  
  /** Time elapsed since last activity in milliseconds */
  inactiveTime: number;
  
  /** Array of recent activity logs (limited to last 100) */
  activityLogs: ActivityLog[];
  
  /** Unix timestamp when the current session started */
  sessionStartTime: number;
}

/**
 * Comprehensive activity report for analytics/backend
 */
export interface ActivityReport {
  /** User identifier */
  userId: string;
  
  /** Unique session identifier */
  sessionId: string;
  
  /** Session start timestamp */
  startTime: number;
  
  /** Session end/report timestamp */
  endTime: number;
  
  /** Total number of activity events in this session */
  totalEvents: number;
  
  /** Total inactive time during session in milliseconds */
  inactiveTimeMs: number;
  
  /** All activity logs for this session */
  activityLogs: ActivityLog[];
  
  /** List of unique pages visited during session */
  pageViews: string[];
  
  /** Browser user agent string */
  userAgent: string;
  
  /** Screen resolution (e.g., "1920x1080") */
  screenResolution: string;
}

/**
 * Alert payload for inactive user notifications
 */
export interface InactiveUserAlert {
  /** User identifier */
  userId: string;
  
  /** How long user has been inactive (in seconds) */
  inactiveTimeSeconds: number;
  
  /** Timestamp of last recorded activity */
  lastActivityTimestamp: number;
  
  /** Current page where user became inactive */
  currentPage: string;
}

/**
 * Statistical summary of user activity
 */
export interface ActivitySummary {
  /** Count of mouse movement events */
  mouseEvents: number;
  
  /** Count of scroll events */
  scrollEvents: number;
  
  /** Count of keyboard events */
  keyboardEvents: number;
  
  /** Count of click events */
  clickEvents: number;
  
  /** Total count of all events */
  totalEvents: number;
  
  /** Number of unique pages visited */
  uniquePages: number;
  
  /** Average number of events per minute */
  averageEventsPerMinute: number;
}

/**
 * User activity status classification
 */
export type ActivityStatus = 'active' | 'warning' | 'idle' | 'away';

/**
 * Configuration options for activity tracking
 */
export interface ActivityTrackingConfig {
  /** Time threshold in milliseconds before marking user as inactive */
  inactivityThreshold?: number;
  
  /** Interval in milliseconds for checking activity status */
  checkInterval?: number;
  
  /** How long to retain activity logs in milliseconds */
  logRetentionTime?: number;
  
  /** Minimum time between logging events in milliseconds (throttling) */
  throttleDelay?: number;
  
  /** Maximum number of logs to keep in memory */
  maxLogsToRetain?: number;
}

/**
 * Return type of the useActivityMonitor hook
 */
export interface UseActivityMonitorReturn {
  /** Whether user is currently active */
  isActive: boolean;
  
  /** Whether user has exceeded idle threshold */
  isIdle: boolean;
  
  /** Seconds since last activity */
  inactiveSeconds: number;
  
  /** Minutes since last activity */
  inactiveMinutes: number;
  
  /** Date object of last activity */
  lastActivityTime: Date;
  
  /** All activity logs */
  activityLogs: ActivityLog[];
  
  /** Total number of events logged */
  totalEvents: number;
  
  /** Duration of current session in milliseconds */
  sessionDuration: number;
  
  /** Function to reset activity timer */
  resetActivity: () => void;
  
  /** Function to export current activity logs */
  exportActivityLogs: () => ActivityLog[];
}

/**
 * Context value provided by ActivityTrackerContact
 */
export interface ActivityContextType {
  /** Current activity state */
  activityState: UserActivityState;
  
  /** Reset the activity timer */
  resetActivity: () => void;
  
  /** Get inactive time in seconds */
  getInactiveTimeSeconds: () => number;
  
  /** Check if user is idle based on threshold */
  isUserIdle: (thresholdSeconds?: number) => boolean;
  
  /** Export all activity logs */
  exportActivityLogs: () => ActivityLog[];
}

/**
 * Props for ActivityStatusIndicator component
 */
export interface ActivityStatusIndicatorProps {
  /** Whether to show detailed statistics */
  showDetails?: boolean;
  
  /** Inactivity threshold in seconds */
  inactiveThreshold?: number;
}

/**
 * Data structure for inactive user monitoring
 */
export interface InactiveUserData {
  /** User identifier */
  userId: string;
  
  /** User's display name (optional) */
  userName?: string;
  
  /** Minutes since last activity */
  inactiveMinutes: number;
  
  /** Date of last activity */
  lastActivity: Date;
  
  /** Current page user is on */
  currentPage: string;
  
  /** User's current activity status */
  status: ActivityStatus;
}

/**
 * Options for exporting activity data
 */
export interface ExportOptions {
  /** Filename for the export (optional) */
  filename?: string;
  
  /** Export format */
  format: 'json' | 'csv';
  
  /** Whether to include summary statistics */
  includeSummary?: boolean;
  
  /** Date range filter (optional) */
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Backend API response for activity report submission
 */
export interface ActivityReportResponse {
  /** Whether the report was successfully received */
  success: boolean;
  
  /** Server-generated report ID */
  reportId?: string;
  
  /** Error message if submission failed */
  error?: string;
  
  /** Server timestamp */
  timestamp: number;
}

/**
 * Event handler types for activity tracking
 */
export type ActivityEventHandler = (event: MouseEvent | KeyboardEvent) => void;
export type ScrollEventHandler = () => void;

/**
 * Filter criteria for activity logs
 */
export interface ActivityLogFilter {
  eventType?: ActivityLog['eventType'];
  userId?: string;
  pageUrl?: string;
  timeRange?: {
    start: number;
    end: number;
  };
}

/**
 * Pagination options for activity logs
 */
export interface PaginationOptions {
  /** Current page number (1-indexed) */
  page: number;
  
  /** Number of items per page */
  pageSize: number;
  
  /** Total number of items */
  total: number;
}

