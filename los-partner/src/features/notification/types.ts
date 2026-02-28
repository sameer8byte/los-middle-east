import { NotificationPriorityEnum } from "../../constant/enum";

export type NotificationPriority = 'LOW'  | 'HIGH' | 'MEDIUM' 
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

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  lastFetch: number | null;
}

export interface NotificationFilters {
  partnerUserId?: string;
  loanId?: string;
  userId?: string;
  partnerRoleId?: number;
  priority?: NotificationPriority;
  page?: number;
  limit?: number;
}

export const NOTIFICATION_PRIORITIES: Record<NotificationPriority, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
  order: number;
}> = {
  LOW: {
    label: 'Low',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    dotColor: 'bg-green-500',
    order: 1
  },
 
  HIGH: {
    label: 'High',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    dotColor: 'bg-orange-500',
    order: 3
  },
  MEDIUM: {
    label: 'Urgent',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    dotColor: 'bg-red-500',
    order: 4
  }
};
