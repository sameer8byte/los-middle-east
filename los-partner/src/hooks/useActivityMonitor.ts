import { useEffect, useState } from 'react';
import { useUserActivity } from '../context/activityTrackerContact';

/**
 * Hook to monitor user activity and get real-time status
 * @param inactiveThresholdSeconds - Seconds before considering user idle (default: 300 = 5 minutes)
 */
export const useActivityMonitor = (inactiveThresholdSeconds: number = 300) => {
  const { activityState, getInactiveTimeSeconds, isUserIdle, resetActivity, exportActivityLogs } = useUserActivity();
  const [inactiveSeconds, setInactiveSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setInactiveSeconds(getInactiveTimeSeconds());
    }, 1000);

    return () => clearInterval(interval);
  }, [getInactiveTimeSeconds]);

  return {
    isActive: activityState.isActive,
    isIdle: isUserIdle(inactiveThresholdSeconds),
    inactiveSeconds,
    inactiveMinutes: Math.floor(inactiveSeconds / 60),
    lastActivityTime: new Date(activityState.lastActivityTime),
    activityLogs: activityState.activityLogs,
    totalEvents: activityState.activityLogs.length,
    sessionDuration: Date.now() - activityState.sessionStartTime,
    resetActivity,
    exportActivityLogs,
  };
};

/**
 * Hook to track if user is viewing the page (tab is active)
 */
export const usePageVisibility = () => {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
};

/**
 * Hook to detect if user is actively interacting in the last N seconds
 * @param thresholdSeconds - Seconds to consider as "active interaction" (default: 30)
 */
export const useRecentActivity = (thresholdSeconds: number = 30) => {
  const { activityState } = useUserActivity();
  const [hasRecentActivity, setHasRecentActivity] = useState(true);

  useEffect(() => {
    const checkActivity = () => {
      const timeSinceLastActivity = Date.now() - activityState.lastActivityTime;
      setHasRecentActivity(timeSinceLastActivity < thresholdSeconds * 1000);
    };

    const interval = setInterval(checkActivity, 1000);
    checkActivity();

    return () => clearInterval(interval);
  }, [activityState.lastActivityTime, thresholdSeconds]);

  return hasRecentActivity;
};

