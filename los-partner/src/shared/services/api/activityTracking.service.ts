import { ActivityLog } from "../../../context/activityTrackerContact";
import api from "../axios";

export interface ActivityReport {
  userId: string;
  sessionId: string;
  startTime: number;
  endTime: number;
  totalEvents: number;
  inactiveTimeMs: number;
  activityLogs: ActivityLog[];
  pageViews: string[];
  userAgent: string;
  screenResolution: string;
}

export interface InactiveUserAlert {
  userId: string;
  inactiveTimeSeconds: number;
  lastActivityTimestamp: number;
  currentPage: string;
}

class ActivityTrackingService {
  private readonly sessionId: string;

  constructor() {
    // Generate unique session ID
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Send activity report to backend using axios
   */
  async sendActivityReport(report: Partial<ActivityReport>): Promise<void> {
    try {
      // Transform activity logs to match backend DTO
      const transformedLogs = (report.activityLogs || []).map(log => ({
        timestamp: new Date(log.timestamp).toISOString(),
        eventType: log.eventType,
        userId: log.userId,
        pageUrl: log.pageUrl,
        scrollPosition: log.scrollPosition,
        mouseX: log.mousePosition?.x,
        mouseY: log.mousePosition?.y,
      }));

      const fullReport = {
        userId: report.userId,
        sessionId: this.sessionId,
        startTime: new Date(report.startTime || Date.now()).toISOString(),
        endTime: new Date(report.endTime || Date.now()).toISOString(),
        totalEvents: report.totalEvents || 0,
        inactiveTimeMs: report.inactiveTimeMs || 0,
        activityLogs: transformedLogs,
        pageViews: report.pageViews || [],
        userAgent: navigator.userAgent,
        screenResolution: `${globalThis.screen.width}x${globalThis.screen.height}`,
      };
       await api.post('/partner/activity-tracking/report', fullReport);
    } catch (error) {
      console.error('Error sending activity report:', error);
    }
  }

  /**
   * Send inactive user alert to backend using axios
   */
  async sendInactiveAlert(alert: InactiveUserAlert): Promise<void> {
    try {
      // Transform to match backend DTO
      const transformedAlert = {
        userId: alert.userId,
        inactiveTimeSeconds: alert.inactiveTimeSeconds,
        lastActivityTimestamp: new Date(alert.lastActivityTimestamp).toISOString(),
        currentPage: alert.currentPage,
      };

      console.log('Sending Inactive User Alert:', transformedAlert);
      
      const response = await api.post('/partner/activity-tracking/alert', transformedAlert);
      
      console.log('Inactive alert sent successfully:', response.data);
    } catch (error) {
      console.error('Error sending inactive alert:', error);
    }
  }

  /**
   * Get activity summary for analytics
   */
  getActivitySummary(logs: ActivityLog[]): {
    mouseEvents: number;
    scrollEvents: number;
    keyboardEvents: number;
    clickEvents: number;
    totalEvents: number;
    uniquePages: number;
    averageEventsPerMinute: number;
  } {
    if (logs.length === 0) {
      return {
        mouseEvents: 0,
        scrollEvents: 0,
        keyboardEvents: 0,
        clickEvents: 0,
        totalEvents: 0,
        uniquePages: 0,
        averageEventsPerMinute: 0,
      };
    }

    const mouseEvents = logs.filter(l => l.eventType === 'mouse').length;
    const scrollEvents = logs.filter(l => l.eventType === 'scroll').length;
    const keyboardEvents = logs.filter(l => l.eventType === 'keyboard').length;
    const clickEvents = logs.filter(l => l.eventType === 'click').length;
    const uniquePages = new Set(logs.map(l => l.pageUrl)).size;

    const timeSpan = logs[logs.length - 1].timestamp - logs[0].timestamp;
    const minutes = timeSpan / 60000;
    const averageEventsPerMinute = minutes > 0 ? logs.length / minutes : 0;

    return {
      mouseEvents,
      scrollEvents,
      keyboardEvents,
      clickEvents,
      totalEvents: logs.length,
      uniquePages,
      averageEventsPerMinute: Math.round(averageEventsPerMinute * 100) / 100,
    };
  }

  /**
   * Export activity logs to JSON file
   */
  exportLogsToFile(logs: ActivityLog[], filename?: string): void {
    const dataStr = JSON.stringify(logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `activity-logs-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  /**
   * Export activity logs to CSV file
   */
  exportLogsToCSV(logs: ActivityLog[], filename?: string): void {
    const headers = ['Timestamp', 'Event Type', 'User ID', 'Page URL', 'Mouse X', 'Mouse Y', 'Scroll Position'];
    const rows = logs.map(log => [
      new Date(log.timestamp).toISOString(),
      log.eventType,
      log.userId || '',
      log.pageUrl,
      log.mousePosition?.x || '',
      log.mousePosition?.y || '',
      log.scrollPosition || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `activity-logs-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
}

export const activityTrackingService = new ActivityTrackingService();

