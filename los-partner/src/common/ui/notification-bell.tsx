import { memo, useState, useEffect, useRef, useCallback } from "react";
import {
  HiBell,
  HiX,
  HiClock,
  HiUser,
  HiEye,
  HiEyeOff,
  HiCheckCircle,
  HiExclamationCircle,
  HiInformationCircle,
  HiCalendar,
  HiTag,
} from "react-icons/hi";
import { cn } from "../../lib/utils";
import { useNotifications } from "../../features/notification/useNotifications";
import {
  NOTIFICATION_PRIORITIES,
  type Notification,
} from "../../features/notification/types";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { NotificationPriorityEnum } from "../../constant/enum";

dayjs.extend(relativeTime);

interface NotificationBellProps {
  className?: string;
}

export const NotificationBell = memo(({ className }: NotificationBellProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    loading,
    error,
    hasUnread,

    currentPage,
    totalPages,
    appliedFilters,
    getCurrentUserTarget,
    markNotificationAsRead,
    markNotificationAsUnread,
    markNotificationAsAcknowledged,
    markAllAsRead,
    markAllAsAcknowledged,

    refresh,
    updateFilters,
    clearFilters,
    goToPage,
  } = useNotifications({
    pollingInterval: 300000,
    autoRefresh: true,
    enablePagination: true,
    pageSize: 10,
  });

  // Toggle dropdown
  const toggleDropdown = () => {
    setIsOpen((prev) => {
      if (prev) {
        // Clear errors when closing
        setBulkError(null);
      }
      return !prev;
    });
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    try {
      await markNotificationAsRead(notification);
    } catch (err) {
      console.error("Failed to mark as read:", err);
      setBulkError("Failed to mark notification as read. Please try again.");
    }
  };

  // Handle acknowledge click
  const handleAcknowledgeClick = async (
    notification: Notification,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    try {
      await markNotificationAsAcknowledged(notification);
    } catch (err) {
      console.error("Failed to acknowledge:", err);
      setBulkError("Failed to acknowledge notification. Please try again.");
    }
  };

  // Handle mark as unread click
  const handleMarkAsUnreadClick = async (
    notification: Notification,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    try {
      await markNotificationAsUnread(notification);
    } catch (err) {
      console.error("Failed to mark as unread:", err);
      setBulkError("Failed to mark notification as unread. Please try again.");
    }
  };

  // Get notification statistics
  const getNotificationStats = useCallback(() => {
    const acknowledged = notifications.filter((n) => {
      const target = getCurrentUserTarget(n);
      return Boolean(target?.acknowledgedAt);
    }).length;

    const unacknowledged = notifications.filter((n) => {
      const target = getCurrentUserTarget(n);
      return !target?.acknowledgedAt;
    }).length;

    const expired = notifications.filter(
      (n) => n.expiresAt && dayjs(n.expiresAt).isBefore(dayjs())
    ).length;

    const byPriority = notifications.reduce((acc, n) => {
      acc[n.priority] = (acc[n.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { acknowledged, unacknowledged, expired, byPriority };
  }, [notifications, getCurrentUserTarget]);

  // Get priority icon
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return <HiExclamationCircle className="w-4 h-4" />;
      case "NORMAL":
        return <HiInformationCircle className="w-4 h-4" />;
      case "LOW":
        return <HiCheckCircle className="w-4 h-4" />;
      default:
        return <HiInformationCircle className="w-4 h-4" />;
    }
  };

  // Format date with timezone
  const formatDate = (date: string) => {
    return dayjs(date).format("MMM DD, YYYY • HH:mm");
  };

  // Get platform icon
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "WEB":
        return "🌐";
      case "MOBILE":
        return "📱";
      case "EMAIL":
        return "✉️";
      case "SMS":
        return "💬";
      default:
        return "📋";
    }
  };

  // Get loan status styling
  const getLoanStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "closed":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-red-100 text-red-700";
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      refresh();
    }
  }, [isOpen, refresh]);

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={toggleDropdown}
        className={cn(
          "relative p-2 rounded-lg transition-all duration-200",
          "hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          isOpen && "bg-gray-100"
        )}
        aria-label={
          hasUnread ? `Notifications (${unreadCount} unread)` : "Notifications"
        }
      >
        <HiBell className="w-6 h-6 text-gray-600" />

        {/* Unread Badge */}
        <AnimatePresence>
          {hasUnread && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-medium rounded-full min-w-[1.25rem] h-5 flex items-center justify-center px-1"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-[28rem] bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[36rem] overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Notifications
                </h3>
                <button
                  onClick={toggleDropdown}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  aria-label="Close notifications"
                >
                  <HiX className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {notifications.length > 0 && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center space-x-4">
                      <span>{notifications.length} total</span>
                      {unreadCount > 0 && (
                        <span className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>{unreadCount} unread</span>
                        </span>
                      )}
                      {(() => {
                        const stats = getNotificationStats();
                        return (
                          <>
                            {stats.acknowledged > 0 && (
                              <span className="flex items-center space-x-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span>{stats.acknowledged} acknowledged</span>
                              </span>
                            )}
                            {stats.expired > 0 && (
                              <span className="flex items-center space-x-1">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                <span>{stats.expired} expired</span>
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    <button
                      onClick={refresh}
                      className="text-blue-600 hover:text-blue-800 font-medium text-xs"
                      disabled={loading}
                    >
                      {loading ? "Refreshing..." : "Refresh"}
                    </button>
                  </div>

                  {/* Bulk Actions */}
                  <div className="flex items-center space-x-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={async () => {
                          if (unreadCount === 0) return;
                          try {
                            setBulkLoading(true);
                            setBulkError(null);
                            await markAllAsRead();
                         
                          } catch (err) {
                            console.error("Failed to mark all as read:", err);
                            setBulkError(
                              "Failed to mark all as read. Please try again."
                            );
                          } finally {
                            setBulkLoading(false);
                          }
                        }}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={bulkLoading || loading}
                      >
                        {bulkLoading
                          ? "Marking..."
                          : `Mark All Read (${unreadCount})`}
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        if (notifications.length === 0) return;
                        try {
                          setBulkLoading(true);
                          setBulkError(null);
                          await markAllAsAcknowledged();
                
                        } catch (err) {
                          console.error("Failed to acknowledge all:", err);
                          setBulkError(
                            "Failed to acknowledge all notifications. Please try again."
                          );
                        } finally {
                          setBulkLoading(false);
                        }
                      }}
                      className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={
                        bulkLoading ||
                        loading ||
                        getNotificationStats().unacknowledged === 0
                      }
                    >
                      {(() => {
                        if (bulkLoading) return "Processing...";
                        const stats = getNotificationStats();
                        return stats.unacknowledged > 0
                          ? `Acknowledge All (${stats.unacknowledged})`
                          : "Acknowledge All";
                      })()}
                    </button>
                  </div>

                  {/* Bulk Error Display */}
                  {bulkError && (
                    <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-md">
                      {bulkError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Filters
                </span>
                {(appliedFilters.priority ||
                  appliedFilters.readStatus !== "ALL" ||
                  appliedFilters.acknowledgedStatus !== "ALL" ||
                  appliedFilters.dateRange !== "ALL") && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Priority Filter */}
                <select
                  value={appliedFilters.priority || "ALL"}
                  onChange={(e) =>
                    updateFilters({
                      priority:
                        e.target.value === "ALL" ? undefined : e.target.value,
                    })
                  }
                  className="text-xs px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">All Priorities</option>
                  <option value={NotificationPriorityEnum.HIGH}>High</option>
                  <option value={NotificationPriorityEnum.MEDIUM}>
                    Medium
                  </option>
                  <option value={NotificationPriorityEnum.LOW}>Low</option>
                </select>

                {/* Read Status Filter */}
                <select
                  value={appliedFilters.readStatus || "ALL"}
                  onChange={(e) =>
                    updateFilters({ readStatus: e.target.value as any })
                  }
                  className="text-xs px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">All Status</option>
                  <option value="READ">Read</option>
                  <option value="UNREAD">Unread</option>
                </select>

                {/* Acknowledged Status Filter */}
                <select
                  value={appliedFilters.acknowledgedStatus || "ALL"}
                  onChange={(e) =>
                    updateFilters({ acknowledgedStatus: e.target.value as any })
                  }
                  className="text-xs px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">All Acknowledgments</option>
                  <option value="ACKNOWLEDGED">Acknowledged</option>
                  <option value="UNACKNOWLEDGED">Unacknowledged</option>
                </select>

                {/* Date Range Filter */}
                <select
                  value={appliedFilters.dateRange || "ALL"}
                  onChange={(e) =>
                    updateFilters({ dateRange: e.target.value as any })
                  }
                  className="text-xs px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">All Time</option>
                  <option value="TODAY">Today</option>
                  <option value="WEEK">This Week</option>
                  <option value="MONTH">This Month</option>
                </select>
              </div>
            </div>

            {/* Content */}
            <div className="max-h-80 overflow-y-auto">
              {(() => {
                if (loading && notifications.length === 0) {
                  return (
                    <div className="p-8 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="mt-2 text-gray-500">
                        Loading notifications...
                      </p>
                    </div>
                  );
                }

                if (error) {
                  return (
                    <div className="p-8 text-center">
                      <p className="text-red-600">{error}</p>
                      <button
                        onClick={refresh}
                        className="mt-2 text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Try again
                      </button>
                    </div>
                  );
                }

                if (notifications.length === 0) {
                  return (
                    <div className="p-8 text-center">
                      <HiBell className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">No notifications yet</p>
                    </div>
                  );
                }

                return (
                  <div className="divide-y divide-gray-100">
                    {notifications.map((notification) => {
                      const target = getCurrentUserTarget(notification);
                      const isUnread = target && !target.isRead;
                      const priorityConfig =
                        NOTIFICATION_PRIORITIES[notification.priority];
                      const hasExpired =
                        notification.expiresAt &&
                        dayjs(notification.expiresAt).isBefore(dayjs());

                      return (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={cn(
                            "p-4 hover:bg-gray-50 transition-colors cursor-pointer border-l-4",
                            isUnread && "bg-blue-50/50",
                            hasExpired && "opacity-75",
                            priorityConfig.borderColor.replace(
                              "border-",
                              "border-l-"
                            )
                          )}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="space-y-3">
                            {/* Header with Priority Icon and Status */}
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-2">
                                <div
                                  className={cn(
                                    "flex items-center justify-center w-6 h-6 rounded-full",
                                    priorityConfig.bgColor,
                                    priorityConfig.color
                                  )}
                                >
                                  {getPriorityIcon(notification.priority)}
                                </div>
                                <h4
                                  className={cn(
                                    "text-sm font-medium text-gray-900",
                                    isUnread && "font-semibold"
                                  )}
                                >
                                  {notification.title}
                                </h4>
                                {hasExpired && (
                                  <span className="text-xs text-red-500 font-medium">
                                    EXPIRED
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                {isUnread && (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleNotificationClick(notification);
                                      }}
                                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 font-medium"
                                    >
                                      Mark Read
                                    </button>
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  </>
                                )}
                                <span className="text-xs text-gray-500">
                                  {dayjs(notification.createdAt).fromNow()}
                                </span>
                              </div>
                            </div>

                            {/* Message */}
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {notification.message}
                            </p>

                            {/* Metadata Row 1 */}
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <div className="flex items-center space-x-4">
                                <span
                                  className={cn(
                                    "inline-flex items-center px-2 py-1 rounded-md font-medium",
                                    priorityConfig.color,
                                    priorityConfig.bgColor
                                  )}
                                >
                                  {priorityConfig.label} Priority
                                </span>
                                {(notification.loan || notification.loanId) && (
                                  <span className="flex items-center space-x-1">
                                    <HiTag className="w-3 h-3" />
                                    <span>
                                      Loan:{" "}
                                      {notification.loan?.formattedLoanId ||
                                        notification.loanId}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Metadata Row 2 - Dates and Target Info */}
                            <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                              <div className="space-y-1">
                                <div className="flex items-center space-x-1">
                                  <HiCalendar className="w-3 h-3" />
                                  <span>
                                    Created:{" "}
                                    {formatDate(notification.createdAt)}
                                  </span>
                                </div>
                                {notification.scheduledAt && (
                                  <div className="flex items-center space-x-1">
                                    <HiClock className="w-3 h-3" />
                                    <span>
                                      Scheduled:{" "}
                                      {formatDate(notification.scheduledAt)}
                                    </span>
                                  </div>
                                )}
                                {notification.expiresAt && (
                                  <div
                                    className={cn(
                                      "flex items-center space-x-1",
                                      hasExpired && "text-red-500"
                                    )}
                                  >
                                    <HiClock className="w-3 h-3" />
                                    <span>
                                      Expires:{" "}
                                      {formatDate(notification.expiresAt)}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-1">
                                {target && (
                                  <>
                                    <div className="flex items-center space-x-1">
                                      <span>
                                        {getPlatformIcon(target.platform)}
                                      </span>
                                      <span>Platform: {target.platform}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      {target.isRead ? (
                                        <HiEye className="w-3 h-3 text-green-500" />
                                      ) : (
                                        <HiEyeOff className="w-3 h-3 text-gray-400" />
                                      )}
                                      <span
                                        className={
                                          target.isRead
                                            ? "text-green-600"
                                            : "text-gray-500"
                                        }
                                      >
                                        {(() => {
                                          if (!target.isRead) return "Unread";
                                          const readTime = target.readAt
                                            ? formatDate(target.readAt)
                                            : formatDate(
                                                new Date().toISOString()
                                              );
                                          return `Read: ${readTime}`;
                                        })()}
                                      </span>
                                    </div>

                                    {/* Acknowledgment Status */}
                                    {target.acknowledgedAt ? (
                                      <div className="flex items-center space-x-1">
                                        <HiCheckCircle className="w-3 h-3 text-green-500" />
                                        <span className="text-green-600">
                                          Acknowledged:{" "}
                                          {formatDate(target.acknowledgedAt)}
                                        </span>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={(e) =>
                                          handleAcknowledgeClick(
                                            notification,
                                            e
                                          )
                                        }
                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                                      >
                                        Mark as Acknowledged
                                      </button>
                                    )}

                                    {/* Additional Actions */}
                                    <div className="flex items-center space-x-2 mt-1">
                                      {target.isRead &&
                                        !target.acknowledgedAt && (
                                          <button
                                            onClick={(e) =>
                                              handleMarkAsUnreadClick(
                                                notification,
                                                e
                                              )
                                            }
                                            className="text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-1 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                                          >
                                            Mark Unread
                                          </button>
                                        )}
                                      {!target.isRead && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleNotificationClick(
                                              notification
                                            );
                                          }}
                                          className="text-xs text-green-600 hover:text-green-800 font-medium px-2 py-1 bg-green-50 rounded-md hover:bg-green-100 transition-colors"
                                        >
                                          Mark Read
                                        </button>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Additional Context - Enhanced Details */}
                            {(notification.user ||
                              notification.createdByPartner ||
                              notification.partnerRole ||
                              notification.loan) && (
                              <div className="pt-2 border-t border-gray-100">
                                <div className="space-y-2">
                                  {/* User Information */}
                                  {notification.user && (
                                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                                      <span className="flex items-center space-x-1">
                                        <HiUser className="w-3 h-3" />
                                        <span className="font-medium">
                                          User:
                                        </span>
                                      </span>
                                      <div className="flex items-center space-x-2">
                                        <span>
                                          {notification.user.formattedUserId}
                                        </span>
                                        {notification.user.email && (
                                          <span className="text-blue-600">
                                            • {notification.user.email}
                                          </span>
                                        )}
                                        {notification.user.phoneNumber && (
                                          <span className="text-green-600">
                                            • {notification.user.phoneNumber}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Created By Partner Information */}
                                  {notification.createdByPartner && (
                                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                                      <span className="flex items-center space-x-1">
                                        <HiUser className="w-3 h-3" />
                                        <span className="font-medium">
                                          Created By:
                                        </span>
                                      </span>
                                      <div className="flex items-center space-x-2">
                                        <span className="font-medium text-gray-700">
                                          {notification.createdByPartner.name}
                                        </span>
                                        <span className="text-blue-600">
                                          •{" "}
                                          {notification.createdByPartner.email}
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Partner Role Information */}
                                  {notification.partnerRole && (
                                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                                      <span className="flex items-center space-x-1">
                                        <HiTag className="w-3 h-3" />
                                        <span className="font-medium">
                                          Role:
                                        </span>
                                      </span>
                                      <div className="flex items-center space-x-2">
                                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                                          {notification.partnerRole.name}
                                        </span>
                                        {notification.partnerRole
                                          .description && (
                                          <span className="text-gray-600">
                                            •{" "}
                                            {
                                              notification.partnerRole
                                                .description
                                            }
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Enhanced Loan Information */}
                                  {notification.loan && (
                                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                                      <span className="flex items-center space-x-1">
                                        <HiTag className="w-3 h-3" />
                                        <span className="font-medium">
                                          Loan:
                                        </span>
                                      </span>
                                      <div className="flex items-center space-x-2">
                                        <span className="font-medium text-gray-700">
                                          {notification.loan.formattedLoanId}
                                        </span>
                                        <span className="text-green-600">
                                          • ₹
                                          {notification.loan.amount.toLocaleString()}
                                        </span>
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${getLoanStatusStyle(
                                            notification.loan.status
                                          )}`}
                                        >
                                          {notification.loan.status}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* All Targets Summary */}
                            {notification.targets.length > 1 && (
                              <div className="pt-2 border-t border-gray-100">
                                <div className="text-xs text-gray-500">
                                  <span className="font-medium">
                                    Sent to {notification.targets.length} target
                                    {notification.targets.length > 1 ? "s" : ""}
                                    :
                                  </span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {notification.targets.map((tgt) => (
                                      <span
                                        key={tgt.id}
                                        className={cn(
                                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs",
                                          tgt.isRead
                                            ? "bg-green-100 text-green-700"
                                            : "bg-gray-100 text-gray-600"
                                        )}
                                      >
                                        {getPlatformIcon(tgt.platform)}{" "}
                                        {tgt.platform}
                                        {tgt.isRead && (
                                          <HiCheckCircle className="w-3 h-3 ml-1" />
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="p-3 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Page {currentPage} of {totalPages}
                    </span>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1 || loading}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
                      >
                        Prev
                      </button>

                      {/* Page numbers */}
                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => goToPage(pageNum)}
                              disabled={loading}
                              className={cn(
                                "px-2 py-1 text-xs rounded disabled:cursor-not-allowed",
                                pageNum === currentPage
                                  ? "bg-blue-500 text-white"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              )}
                            >
                              {pageNum}
                            </button>
                          );
                        }
                      )}

                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages || loading}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    // Navigate to notifications page in the future
                  }}
                  className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium py-1"
                >
                  View All Notifications
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

NotificationBell.displayName = "NotificationBell";
