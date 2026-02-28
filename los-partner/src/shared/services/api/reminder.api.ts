import api from "../axios";

export const getUserReminders = async (
  brandId: string,
  params: {
    page: number;
    limit: number;
    search?: string;
    channel?: string;
    status?: string;
    createdAtFrom?: string;
    createdAtTo?: string;
    scheduledFrom?: string;
    scheduledTo?: string;
  }
) => {
  const { data } = await api.get(`/partner/brand/${brandId}/user-reminders`, {
    params: {
      page: params.page,
      limit: params.limit,
      search: params.search,
      channel: params.channel ? JSON.stringify([params.channel]) : undefined,
      status: params.status,
      createdAtFrom: params.createdAtFrom,
      createdAtTo: params.createdAtTo,
      scheduledFrom: params.scheduledFrom,
      scheduledTo: params.scheduledTo,
    },
  });
  return {data};
};

export const getReminderAuditLogs = async (
  brandId: string,
  reminderId: string
) => {
  const { data } = await api.get(
    `/partner/brand/${brandId}/user-reminders/${reminderId}/audit-logs`
  );
  return data;
};

export const createUserReminder = async (
  brandId: string,
  payload: {
    userId: string;
    channel: string;
    templateCode: string;
    scheduledAt: string;
    providerMessageId?: string;
    payload?: Record<string, any>;
  }
) => {
  const { data } = await api.post(
    `/partner/brand/${brandId}/user-reminders`,
    payload
  );
  return data;
};



export const getReminderDashboardMetrics = async (brandId: string) => {
  const { data } = await api.get(
    `/partner/brand/${brandId}/user-reminders/dashboard-metrics/view`
  );
  return data;
};

export const refreshReminderDashboardMetrics = async (brandId: string) => {
  const { data } = await api.post(
    `/partner/brand/${brandId}/user-reminders/dashboard-metrics/refresh`
  );
  return data;
};
