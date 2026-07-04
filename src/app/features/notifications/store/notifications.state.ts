import { HttpErrorResponse } from '@angular/common/http';
import { NotificationItem } from '../models/notification.model';

export interface NotificationsState {
  items: NotificationItem[];
  unreadCount: number;
  error: HttpErrorResponse | null;
}

export const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
  error: null,
};

export const NOTIFICATIONS_FEATURE_KEY = 'notifications';
