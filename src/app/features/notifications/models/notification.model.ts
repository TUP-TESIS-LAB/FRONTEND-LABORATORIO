/** Notificación in-app individual — matchea `NotificationResponse` del backend. */
export interface NotificationItem {
  id: number;
  eventType: string;
  title: string;
  message: string;
  targetRoute: string | null;
  read: boolean;
  createdAt: string;
}

/** Bandeja de notificaciones — matchea `NotificationInboxResponse` del backend. */
export interface NotificationInbox {
  items: NotificationItem[];
  unreadCount: number;
}
