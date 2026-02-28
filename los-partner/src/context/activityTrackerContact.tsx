import { useEffect, useRef, useState, createContext, useContext, useMemo, ReactNode } from "react";
import { useAppSelector } from "../shared/redux/store";
import { activityTrackingService } from "../shared/services/api/activityTracking.service";

// Activity tracking types
export interface ActivityLog {
  timestamp: number;
  eventType: 'mouse' | 'scroll' | 'keyboard' | 'click';
  userId?: string;
  pageUrl: string;
  scrollPosition?: number;
  mousePosition?: { x: number; y: number };
}

export interface UserActivityState {
  isActive: boolean;
  lastActivityTime: number;
  inactiveTime: number; // milliseconds
  activityLogs: ActivityLog[];
  sessionStartTime: number;
}

interface ActivityContextType {
  activityState: UserActivityState;
  resetActivity: () => void;
  getInactiveTimeSeconds: () => number;
  isUserIdle: (thresholdSeconds?: number) => boolean;
  exportActivityLogs: () => ActivityLog[];
}

// Create context
const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

// Custom hook to use activity context
export const useUserActivity = () => {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error("useUserActivity must be used within ActivityTrackerContact");
  }
  return context;
};

// Configuration
const INACTIVITY_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds
const ACTIVITY_CHECK_INTERVAL = 1000; // Check every second
const LOG_RETENTION_TIME = 60 * 60 * 1000; // Keep logs for 1 hour
const THROTTLE_DELAY = 2000; // Throttle logging to every 2 seconds
const BACKEND_SYNC_INTERVAL = 5 * 60 * 1000; // Sync to backend every 5 minutes

// Check if activity tracking is enabled via environment variable
const isActivityTrackingEnabled = () => {
  return import.meta.env.VITE_ENABLE_ACTIVITY_TRACKING === 'true';
};

export function ActivityTrackerContact(
  { children }: { readonly children: ReactNode }
) {
  const auth = useAppSelector((state) => state.auth.data);
  const isEnabled = isActivityTrackingEnabled();
    
  const [activityState, setActivityState] = useState<UserActivityState>({
    isActive: true,
    lastActivityTime: Date.now(),
    inactiveTime: 0,
    activityLogs: [],
    sessionStartTime: Date.now(),
  });

  const lastLogTimeRef = useRef<number>(0);
  const inactivityTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const checkIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const backendSyncIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Log activity event
  const logActivity = (
    eventType: ActivityLog['eventType'],
    additionalData?: Partial<ActivityLog>
  ) => {
    const now = Date.now();
    
    // Throttle logging
    if (now - lastLogTimeRef.current < THROTTLE_DELAY) {
      return;
    }
    
    lastLogTimeRef.current = now;

    const log: ActivityLog = {
      timestamp: now,
      eventType,
      userId: auth?.id?.toString(),
      pageUrl: globalThis.location.pathname,
      ...additionalData,
    };

    setActivityState((prev) => {
      // Clean old logs
      const recentLogs = prev.activityLogs.filter(
        (l) => now - l.timestamp < LOG_RETENTION_TIME
      );

      return {
        ...prev,
        isActive: true,
        lastActivityTime: now,
        inactiveTime: 0,
        activityLogs: [...recentLogs, log].slice(-100), // Keep last 100 logs
      };
    });
  };

  // Reset activity
  const resetActivity = () => {
    setActivityState((prev) => ({
      ...prev,
      isActive: true,
      lastActivityTime: Date.now(),
      inactiveTime: 0,
    }));
  };

  // Get inactive time in seconds
  const getInactiveTimeSeconds = (state: UserActivityState) => {
    return Math.floor(state.inactiveTime / 1000);
  };

  // Check if user is idle
  const isUserIdle = (state: UserActivityState, thresholdSeconds: number = 300) => {
    return state.inactiveTime > thresholdSeconds * 1000;
  };

  // Export activity logs
  const exportActivityLogs = () => {
    return activityState.activityLogs;
  };

  // Event handlers
  const handleMouseMove = (e: MouseEvent) => {
    logActivity('mouse', {
      mousePosition: { x: e.clientX, y: e.clientY },
    });
  };

  const handleScroll = () => {
    logActivity('scroll', {
      scrollPosition: globalThis.scrollY,
    });
  };

  const handleKeyPress = () => {
    logActivity('keyboard');
  };

  const handleClick = (e: MouseEvent) => {
    logActivity('click', {
      mousePosition: { x: e.clientX, y: e.clientY },
    });
  };

  // Check for inactivity
  useEffect(() => {
    checkIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - activityState.lastActivityTime;

      setActivityState((prev) => ({
        ...prev,
        inactiveTime: timeSinceLastActivity,
        isActive: timeSinceLastActivity < INACTIVITY_THRESHOLD,
      }));

      // Log inactivity warning
      if (timeSinceLastActivity > INACTIVITY_THRESHOLD && activityState.isActive) {
        console.warn(`User has been inactive for ${Math.floor(timeSinceLastActivity / 1000)} seconds`);
      }
    }, ACTIVITY_CHECK_INTERVAL);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [activityState.lastActivityTime, activityState.isActive]);

  // Setup event listeners
  useEffect(() => {
    if (!isEnabled) return;

    // Add event listeners
    globalThis.addEventListener('mousemove', handleMouseMove);
    globalThis.addEventListener('scroll', handleScroll);
    globalThis.addEventListener('keypress', handleKeyPress);
    globalThis.addEventListener('click', handleClick);

    // Cleanup
    return () => {
      globalThis.removeEventListener('mousemove', handleMouseMove);
      globalThis.removeEventListener('scroll', handleScroll);
      globalThis.removeEventListener('keypress', handleKeyPress);
      globalThis.removeEventListener('click', handleClick);
      
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [auth, isEnabled]);

  // Automatically sync to backend periodically
  useEffect(() => {
    if (!isEnabled || !auth?.id) return;

    // Send initial report
    const sendReport = () => {
      if (activityState.activityLogs.length === 0) return;

      const uniquePages = Array.from(
        new Set(activityState.activityLogs.map(log => log.pageUrl))
      );

      activityTrackingService.sendActivityReport({
        userId: auth.id,
        startTime: activityState.sessionStartTime,
        endTime: Date.now(),
        totalEvents: activityState.activityLogs.length,
        inactiveTimeMs: activityState.inactiveTime,
        activityLogs: activityState.activityLogs,
        pageViews: uniquePages,
      });
    };

    // Sync every 5 minutes
    backendSyncIntervalRef.current = setInterval(sendReport, BACKEND_SYNC_INTERVAL);

    // Send report when user becomes inactive
    if (!activityState.isActive && activityState.activityLogs.length > 0) {
      sendReport();
      
      // Also send inactivity alert if threshold exceeded
      if (activityState.inactiveTime > INACTIVITY_THRESHOLD) {
        activityTrackingService.sendInactiveAlert({
          userId: auth.id,
          inactiveTimeSeconds: Math.floor(activityState.inactiveTime / 1000),
          lastActivityTimestamp: activityState.lastActivityTime,
          currentPage: globalThis.location.pathname,
        });
      }
    }

    return () => {
      if (backendSyncIntervalRef.current) {
        clearInterval(backendSyncIntervalRef.current);
      }
      // Send final report on unmount
      sendReport();
    };
  }, [isEnabled, auth?.id, activityState.isActive, activityState.activityLogs.length]);

  const contextValue: ActivityContextType = useMemo(() => ({
    activityState,
    resetActivity,
    getInactiveTimeSeconds: () => getInactiveTimeSeconds(activityState),
    isUserIdle: (thresholdSeconds?: number) => isUserIdle(activityState, thresholdSeconds),
    exportActivityLogs,
  }), [activityState]);

  return (
    <ActivityContext.Provider value={contextValue}>
      {children}
    </ActivityContext.Provider>
  );
}