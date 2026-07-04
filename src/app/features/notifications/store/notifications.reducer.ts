import { createReducer, on } from '@ngrx/store';
import { loadInboxFailure, loadInboxNotModified, loadInboxSuccess } from './notifications.actions';
import { NotificationsState, initialState } from './notifications.state';

export const notificationsReducer = createReducer(
  initialState,

  on(loadInboxSuccess, (state, { inbox }): NotificationsState => ({
    ...state,
    items: inbox.items,
    unreadCount: inbox.unreadCount,
    error: null,
  })),

  on(loadInboxNotModified, (state): NotificationsState => state),

  on(loadInboxFailure, (state, { error }): NotificationsState => ({
    ...state,
    error,
  })),
);
