import { useState, useEffect, useCallback, useRef } from "react";
import {
  getNotificationsForPartnerUser,
  getUnreadCount,
  markAsRead,
  markAsUnread,
  markAsAcknowledged,
  markAllAsReadForUser,
  markAllAsAcknowledgedForUser,
  updateNotificationTarget,
  Notification,
  NotificationTarget,
} from "../../shared/services/api/notification.api";
import { useAppSelector } from "../../shared/redux/store";

export interface NotificationFilters {
  priority?: string;
  readStatus?: "ALL" | "READ" | "UNREAD";
  acknowledgedStatus?: "ALL" | "ACKNOWLEDGED" | "UNACKNOWLEDGED";
  dateRange?: "ALL" | "TODAY" | "WEEK" | "MONTH";
}

export interface UseNotificationsOptions {
  pollingInterval?: number;
  autoRefresh?: boolean;
  enablePagination?: boolean;
  pageSize?: number;
  filters?: NotificationFilters;
}

export const useNotifications = (options: UseNotificationsOptions = {}) => {
  const {
    pollingInterval = 300000,
    autoRefresh = true,
    enablePagination = false,
    pageSize = 10,
    filters = {},
  } = options;

  const { data: user } = useAppSelector((state) => state.auth);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<NotificationFilters>({
    readStatus: "ALL",
    acknowledgedStatus: "ALL",
    dateRange: "TODAY",
    ...filters,
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<number>(0);

  // Get all notification targets for current user
  const getCurrentUserTargets = useCallback(
    (notification: Notification): NotificationTarget[] => {
      return notification.targets.filter(
        (target) => target.partnerUserId === user?.id,
      );
    },
    [user?.id],
  );

  // Get primary target (first one) for backward compatibility
  const getCurrentUserTarget = useCallback(
    (notification: Notification): NotificationTarget | undefined => {
      const targets = getCurrentUserTargets(notification);
      return targets.length > 0 ? targets[0] : undefined;
    },
    [getCurrentUserTargets],
  );

  // Fetch notifications for current user
  const fetchNotifications = useCallback(
    async (showLoading = true, page = 1): Promise<void> => {
      if (!user?.id) return;

      try {
        if (showLoading) {
          setLoading(true);
        }
        setError(null);

        const params = {
          page: enablePagination ? page : 1,
          limit: enablePagination ? pageSize : undefined,
          ...appliedFilters,
        };

        const [notificationsResponse, unreadResponse] = await Promise.all([
          getNotificationsForPartnerUser(user.id, params),
          getUnreadCount(user.id),
        ]);

        // Handle different response structures
        let validNotifications: Notification[] = [];
        let paginationInfo = null;

        if (
          notificationsResponse &&
          typeof notificationsResponse === "object" &&
          "notifications" in notificationsResponse
        ) {
          // Paginated response
          validNotifications = Array.isArray(
            notificationsResponse.notifications,
          )
            ? notificationsResponse.notifications
            : [];
          paginationInfo = {
            currentPage: notificationsResponse.currentPage || 1,
            totalPages: notificationsResponse.totalPages || 1,
            hasMore: notificationsResponse.hasMore || false,
            total: notificationsResponse.total || 0,
          };
        } else {
          // Simple array response
          validNotifications = Array.isArray(notificationsResponse)
            ? notificationsResponse
            : [];
        }

        const validUnreadCount =
          typeof unreadResponse === "number" ? unreadResponse : 0;

        // Sort notifications by date (newest first)
        const sortedNotifications = [...validNotifications].sort((a, b) => {
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });

        setNotifications(sortedNotifications);
        setUnreadCount(validUnreadCount);

        // Set pagination state
        if (enablePagination && paginationInfo) {
          setCurrentPage(paginationInfo.currentPage);
          setTotalPages(paginationInfo.totalPages);
          setHasMore(paginationInfo.hasMore);
        } else if (enablePagination) {
          setCurrentPage(page);
          setHasMore(sortedNotifications.length === pageSize);
          setTotalPages(Math.ceil(sortedNotifications.length / pageSize));
        }

        lastFetchRef.current = Date.now();
      } catch (err) {
        console.error("Error fetching notifications:", err);
        setError("Failed to load notifications");
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [user?.id, enablePagination, pageSize, appliedFilters],
  );

  // Helper function to update notification targets
  const updateNotificationTargets = useCallback(
    (
      notification: Notification,
      targetId: string,
      updates: Partial<NotificationTarget>,
    ) => {
      const updateTarget = (t: NotificationTarget) =>
        t.id === targetId ? { ...t, ...updates } : t;

      const updateNotification = (n: Notification) => {
        if (n.id === notification.id) {
          return { ...n, targets: n.targets.map(updateTarget) };
        }
        return n;
      };

      setNotifications((prev) => prev.map(updateNotification));
    },
    [],
  );

  // Mark notification as read
  const markNotificationAsRead = useCallback(
    async (notification: Notification): Promise<void> => {
      const target = getCurrentUserTarget(notification);
      if (!target || target.isRead) return;

      try {
        await markAsRead(target.id);
        updateNotificationTargets(notification, target.id, {
          isRead: true,
          readAt: new Date().toISOString(),
        });
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error("Error marking as read:", err);
        throw err;
      }
    },
    [getCurrentUserTarget, updateNotificationTargets],
  );

  // Mark notification as unread
  const markNotificationAsUnread = useCallback(
    async (notification: Notification): Promise<void> => {
      const target = getCurrentUserTarget(notification);
      if (!target?.isRead) return;

      try {
        await markAsUnread(target.id);
        updateNotificationTargets(notification, target.id, {
          isRead: false,
          readAt: undefined,
        });
        setUnreadCount((prev) => prev + 1);
      } catch (err) {
        console.error("Error marking as unread:", err);
        throw err;
      }
    },
    [getCurrentUserTarget, updateNotificationTargets],
  );

  // Mark notification as acknowledged
  const markNotificationAsAcknowledged = useCallback(
    async (notification: Notification): Promise<void> => {
      const target = getCurrentUserTarget(notification);
      if (!target || target.acknowledgedAt) return;

      try {
        await markAsAcknowledged(target.id);
        updateNotificationTargets(notification, target.id, {
          acknowledgedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error("Error marking as acknowledged:", err);
        throw err;
      }
    },
    [getCurrentUserTarget, updateNotificationTargets],
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async (): Promise<void> => {
    if (!user?.id) return;

    try {
      // Use the new bulk endpoint to mark all as read
      const result = await markAllAsReadForUser(user.id);

      if (result.updated === 0) {
        return; // No notifications to update
      }

      // Update all unread notifications to read in the current state
      const updateReadStatus = (notification: Notification) => {
        const target = getCurrentUserTarget(notification);
        if (target && !target.isRead) {
          const updatedTargets = notification.targets.map((t) =>
            t.id === target.id
              ? { ...t, isRead: true, readAt: new Date().toISOString() }
              : t,
          );
          return { ...notification, targets: updatedTargets };
        }
        return notification;
      };

      setNotifications((prev) => prev.map(updateReadStatus));
      setUnreadCount(0);

      // Refresh to ensure UI is in sync with backend
      await fetchNotifications(false);
    } catch (err) {
      console.error("Error marking all as read:", err);
      throw err;
    }
  }, [user?.id, getCurrentUserTarget, fetchNotifications]);

  // Mark all notifications as acknowledged
  const markAllAsAcknowledged = useCallback(async (): Promise<void> => {
    if (!user?.id) return;

    try {
      // Use the new bulk endpoint to mark all as acknowledged
      const result = await markAllAsAcknowledgedForUser(user.id);

      if (result.updated === 0) {
        return; // No notifications to update
      }

      // Update all unacknowledged notifications in the current state
      const updateAcknowledgedStatus = (notification: Notification) => {
        const target = getCurrentUserTarget(notification);
        if (target && !target.acknowledgedAt) {
          const updatedTargets = notification.targets.map((t) =>
            t.id === target.id
              ? { ...t, acknowledgedAt: new Date().toISOString() }
              : t,
          );
          return { ...notification, targets: updatedTargets };
        }
        return notification;
      };

      setNotifications((prev) => prev.map(updateAcknowledgedStatus));

      // Refresh to ensure UI is in sync with backend
      await fetchNotifications(false);
    } catch (err) {
      console.error("Error marking all as acknowledged:", err);
      throw err;
    }
  }, [user?.id, getCurrentUserTarget, fetchNotifications]);

  // Update notification target
  const updateTarget = useCallback(
    async (
      notification: Notification,
      updates: Partial<NotificationTarget>,
    ): Promise<void> => {
      const target = getCurrentUserTarget(notification);
      if (!target) return;

      try {
        await updateNotificationTarget(target.id, updates);
        updateNotificationTargets(notification, target.id, updates);
      } catch (err) {
        console.error("Error updating notification target:", err);
        throw err;
      }
    },
    [getCurrentUserTarget, updateNotificationTargets],
  );

  // Load more notifications (pagination)
  const loadMore = useCallback(async (): Promise<void> => {
    if (!enablePagination || !hasMore || loading || !user?.id) return;

    try {
      setLoading(true);
      const nextPage = currentPage + 1;
      const response = await getNotificationsForPartnerUser(user.id, {
        page: nextPage,
        limit: pageSize,
      });

      // Handle different response structures
      let newNotifications: Notification[] = [];
      if (
        response &&
        typeof response === "object" &&
        "notifications" in response
      ) {
        // Paginated response
        newNotifications = Array.isArray(response.notifications)
          ? response.notifications
          : [];
        setCurrentPage(response.currentPage || nextPage);
        setHasMore(response.hasMore || false);
      } else if (Array.isArray(response)) {
        // Simple array response
        newNotifications = response;
        setCurrentPage(nextPage);
        setHasMore(newNotifications.length === pageSize);
      }

      if (newNotifications.length > 0) {
        setNotifications((prev) => [...prev, ...newNotifications]);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Error loading more notifications:", err);
      setError("Failed to load more notifications");
    } finally {
      setLoading(false);
    }
  }, [enablePagination, hasMore, loading, user?.id, currentPage, pageSize]);

  // Refresh notifications manually
  const refresh = useCallback(() => {
    return fetchNotifications(true);
  }, [fetchNotifications]);

  // Start polling
  const startPolling = useCallback(() => {
    if (intervalRef.current || !autoRefresh) return;

    intervalRef.current = setInterval(() => {
      fetchNotifications(false);
    }, pollingInterval);
  }, [autoRefresh, pollingInterval, fetchNotifications]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Check if we have unread notifications
  const hasUnread = unreadCount > 0;

  // Get notifications grouped by priority
  const notificationsByPriority = notifications.reduce(
    (acc, notification) => {
      const priority = notification.priority;
      if (!acc[priority]) {
        acc[priority] = [];
      }
      acc[priority].push(notification);
      return acc;
    },
    {} as Record<string, Notification[]>,
  );

  // Setup and cleanup
  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      if (autoRefresh) {
        startPolling();
      }
    }

    return () => {
      stopPolling();
    };
  }, [user?.id, fetchNotifications, autoRefresh, startPolling, stopPolling]);

  // Filter management functions
  const updateFilters = useCallback(
    (newFilters: Partial<NotificationFilters>) => {
      const updatedFilters = { ...appliedFilters, ...newFilters };
      setAppliedFilters(updatedFilters);
      setCurrentPage(1); // Reset to first page when filters change
      fetchNotifications(true, 1); // Fetch with new filters
    },
    [appliedFilters, fetchNotifications],
  );

  const clearFilters = useCallback(() => {
    setAppliedFilters({
      readStatus: "ALL",
      acknowledgedStatus: "ALL",
      dateRange: "ALL",
    });
    setCurrentPage(1);
    fetchNotifications(true, 1);
  }, [fetchNotifications]);

  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages && page !== currentPage) {
        setCurrentPage(page);
        fetchNotifications(true, page);
      }
    },
    [totalPages, currentPage, fetchNotifications],
  );

  return {
    notifications,
    unreadCount,
    loading,
    error,
    hasUnread,
    notificationsByPriority,
    lastFetch: lastFetchRef.current,
    currentPage,
    totalPages,
    hasMore,
    appliedFilters,
    getCurrentUserTarget,
    getCurrentUserTargets,
    markNotificationAsRead,
    markNotificationAsUnread,
    markNotificationAsAcknowledged,
    markAllAsRead,
    markAllAsAcknowledged,
    updateTarget,
    loadMore,
    refresh,
    startPolling,
    stopPolling,
    updateFilters,
    clearFilters,
    goToPage,
    isPolling: intervalRef.current !== null,
  };
};
