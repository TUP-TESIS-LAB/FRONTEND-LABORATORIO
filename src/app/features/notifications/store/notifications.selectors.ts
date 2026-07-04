import { createFeatureSelector, createSelector } from '@ngrx/store';
import { NOTIFICATIONS_FEATURE_KEY, NotificationsState } from './notifications.state';

export const selectNotificationsState =
  createFeatureSelector<NotificationsState>(NOTIFICATIONS_FEATURE_KEY);

export const selectNotificationItems = createSelector(
  selectNotificationsState,
  (state) => state.items,
);

export const selectUnreadCount = createSelector(
  selectNotificationsState,
  (state) => state.unreadCount,
);
