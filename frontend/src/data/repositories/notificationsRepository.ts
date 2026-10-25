import { api } from "@/data/api";

/** In-app reminders, mirror app/modules/notifications/schemas.py */
export interface AppNotification {
  id: string;
  cardId: string;
  title: string;
  dueDate: string;
  /** "faltam 3 dias", "é hoje" */
  message: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationList {
  items: AppNotification[];
  unread: number;
}

export const notificationsRepository = {
  list: () => api.get<NotificationList>("/api/notifications"),
  markRead: (id: string) => api.post<void>(`/api/notifications/${id}/read`, undefined),
  markAllRead: () => api.post<void>("/api/notifications/read-all", undefined),
};
