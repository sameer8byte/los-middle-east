import { NotificationPriorityEnum } from "../../../constant/enum";
import api from "../axios";

export type NotificationPriority = 'LOW'  | 'HIGH' | 'MEDIUM';
export type PlatformType = 'WEB' | 'MOBILE' | 'EMAIL' | 'SMS';

export interface Notification {
  id: string;
  title: string;
  message: string;
  loanId?: string;
  userId: string;
  createdByPartnerId?: string;
  partnerRoleId?: number;
  priority: NotificationPriorityEnum;
  expiresAt?: string;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
  acknowledgedAt?: string;
  sentAt?: string;
  targets: NotificationTarget[];
  // Relations
  user?: {
    id: string;
    phoneNumber: string;
    email: string;
    formattedUserId: string;
  };
  createdByPartner?: {
    id: string;
    name: string;
    email: string;
  };
  partnerRole?: {
    id: number;
    name: string;
    description?: string;
  };
  loan?: {
    id: string;
    formattedLoanId: string;
    amount: number;
    status: string;
  };
}

export interface NotificationTarget {
  id: string;
  notificationId: string;
  partnerUserId: string;
  platform: PlatformType;
  isRead: boolean;
  readAt?: string;
  acknowledgedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationDto {
  title: string;
  message: string;
  loanId?: string;
  userId?: string;
  createdByPartnerId?: string;
  partnerRoleId?: number;
  priority?: NotificationPriority;
  expiresAt?: string;
  scheduledAt?: string;
  targets?: {
    partnerUserId: string;
    platform: PlatformType;
  }[];
}

export interface NotificationFilters {
  partnerUserId?: string;
  loanId?: string;
  userId?: string;
  partnerRoleId?: number;
  priority?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedNotificationResponse {
  notifications: Notification[];
  total: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
}

// GET: /notifications
export const getNotifications = async (filters?: NotificationFilters) => {
  try {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    
    const response = await api.get(`/notifications?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching notifications:", error);
    throw error;
  }
};

// GET: /notifications/partner/:partnerUserId
// Get notifications for a partner user
export const getNotificationsForPartnerUser = async (
  partnerUserId: string,
  params?: { 
    page?: number; 
    limit?: number;
    priority?: string;
    readStatus?: string;
    acknowledgedStatus?: string;
    dateRange?: string;
  }
): Promise<PaginatedNotificationResponse | Notification[]> => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.page) {
      queryParams.append('page', params.page.toString());
    }
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params?.priority && params.priority !== 'ALL') {
      queryParams.append('priority', params.priority);
    }
    if (params?.readStatus && params.readStatus !== 'ALL') {
      queryParams.append('readStatus', params.readStatus);
    }
    if (params?.acknowledgedStatus && params.acknowledgedStatus !== 'ALL') {
      queryParams.append('acknowledgedStatus', params.acknowledgedStatus);
    }
    if (params?.dateRange && params.dateRange !== 'ALL') {
      queryParams.append('dateRange', params.dateRange);
    }

    const response = await api.get(`/notifications/partner-user/${partnerUserId}?${queryParams}`);
    
    // If the response has pagination structure, return it as is
    if (response.data && typeof response.data === 'object' && 'notifications' in response.data) {
      return response.data;
    }
    
    // Otherwise return the data as notifications array (for backward compatibility)
    return response.data || [];
  } catch (error) {
    console.error('Error fetching notifications for partner user:', error);
    throw error;
  }
};

// GET: /notifications/partner/:partnerUserId/unread-count
export const getUnreadCount = async (partnerUserId: string): Promise< number > => {
  try {
    const response = await api.get(`/notifications/partner/${partnerUserId}/unread-count`);
    return response.data;
  } catch (error) {
    console.error("Error fetching unread count:", error);
    throw error;
  }
};

// GET: /notifications/:id
export const getNotification = async (id: string) => {
  try {
    const response = await api.get(`/notifications/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching notification:", error);
    throw error;
  }
};

// POST: /notifications
export const createNotification = async (data: CreateNotificationDto) => {
  try {
    const response = await api.post("/notifications", data);
    return response.data;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

// PATCH: /notifications/:id
export const updateNotification = async (id: string, data: Partial<CreateNotificationDto>) => {
  try {
    const response = await api.patch(`/notifications/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("Error updating notification:", error);
    throw error;
  }
};

// DELETE: /notifications/:id
export const deleteNotification = async (id: string) => {
  try {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting notification:", error);
    throw error;
  }
};

// PATCH: /notifications/targets/:targetId/mark-read
export const markAsRead = async (targetId: string) => {
  try {
    const response = await api.patch(`/notifications/targets/${targetId}/mark-read`);
    return response.data;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
};

// PATCH: /notifications/targets/:targetId/mark-unread
export const markAsUnread = async (targetId: string) => {
  try {
    const response = await api.patch(`/notifications/targets/${targetId}/mark-unread`);
    return response.data;
  } catch (error) {
    console.error("Error marking notification as unread:", error);
    throw error;
  }
};

// PATCH: /notifications/targets/:targetId/mark-acknowledged
export const markAsAcknowledged = async (targetId: string) => {
  try {
    const response = await api.patch(`/notifications/targets/${targetId}/mark-acknowledged`);
    return response.data;
  } catch (error) {
    console.error("Error marking notification as acknowledged:", error);
    throw error;
  }
};

// PATCH: /notifications/partner/:partnerUserId/mark-all-read
export const markAllAsReadForUser = async (partnerUserId: string) => {
  try {
    const response = await api.patch(`/notifications/partner/${partnerUserId}/mark-all-read`);
    return response.data;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }
};

// PATCH: /notifications/partner/:partnerUserId/mark-all-acknowledged
export const markAllAsAcknowledgedForUser = async (partnerUserId: string) => {
  try {
    const response = await api.patch(`/notifications/partner/${partnerUserId}/mark-all-acknowledged`);
    return response.data;
  } catch (error) {
    console.error("Error marking all notifications as acknowledged:", error);
    throw error;
  }
};

// PATCH: /notifications/targets/bulk-read (Sequential implementation - DEPRECATED, use markAllAsReadForUser instead)
export const markMultipleAsRead = async (targetIds: string[]) => {
  try {
    const results = await Promise.allSettled(
      targetIds.map(targetId => markAsRead(targetId))
    );
    
    const failures = results.filter(result => result.status === 'rejected');
    if (failures.length > 0) {
      console.warn(`${failures.length} out of ${targetIds.length} notifications failed to mark as read`);
    }
    
    return { success: true, failures: failures.length };
  } catch (error) {
    console.error("Error marking multiple notifications as read:", error);
    throw error;
  }
};

// PATCH: /notifications/targets/bulk-acknowledged (Sequential implementation - DEPRECATED, use markAllAsAcknowledgedForUser instead)
export const markMultipleAsAcknowledged = async (targetIds: string[]) => {
  try {
    const results = await Promise.allSettled(
      targetIds.map(targetId => markAsAcknowledged(targetId))
    );
    
    const failures = results.filter(result => result.status === 'rejected');
    if (failures.length > 0) {
      console.warn(`${failures.length} out of ${targetIds.length} notifications failed to acknowledge`);
    }
    
    return { success: true, failures: failures.length };
  } catch (error) {
    console.error("Error marking multiple notifications as acknowledged:", error);
    throw error;
  }
};

// GET: /notifications/targets/:targetId
export const getNotificationTarget = async (targetId: string) => {
  try {
    const response = await api.get(`/notifications/targets/${targetId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching notification target:", error);
    throw error;
  }
};

// PATCH: /notifications/targets/:targetId
export const updateNotificationTarget = async (targetId: string, updates: Partial<NotificationTarget>) => {
  try {
    const response = await api.patch(`/notifications/targets/${targetId}`, updates);
    return response.data;
  } catch (error) {
    console.error("Error updating notification target:", error);
    throw error;
  }
};

// GET: /notifications/partner/:partnerUserId/targets
export const getNotificationTargetsForUser = async (partnerUserId: string) => {
  try {
    const response = await api.get(`/notifications/targets/user/${partnerUserId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching notification targets for user:", error);
    throw error;
  }
};

// GET: /notifications/priority/:priority
export const getNotificationsByPriority = async (priority: string) => {
  try {
    const response = await api.get(`/notifications/priority/${priority}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching notifications by priority:", error);
    throw error;
  }
};
