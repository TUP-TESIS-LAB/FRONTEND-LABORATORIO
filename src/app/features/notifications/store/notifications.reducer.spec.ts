import { HttpErrorResponse } from '@angular/common/http';
import { NotificationInbox, NotificationItem } from '../models/notification.model';
import {
  loadInbox,
  loadInboxFailure,
  loadInboxNotModified,
  loadInboxSuccess,
} from './notifications.actions';
import { notificationsReducer } from './notifications.reducer';
import { initialState } from './notifications.state';

function item(over: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: 1,
    eventType: 'ATTENTION_READY',
    title: 'Título',
    message: 'Mensaje',
    targetRoute: null,
    read: false,
    createdAt: '2026-01-01T00:00:00Z',
    ...over,
  };
}

describe('notificationsReducer', () => {
  it('returns the initial state for an unknown action', () => {
    const out = notificationsReducer(undefined, loadInbox());
    expect(out).toEqual(initialState);
  });

  it('loadInboxSuccess setea items y unreadCount', () => {
    const inbox: NotificationInbox = { items: [item({ id: 1 })], unreadCount: 1 };
    const out = notificationsReducer(initialState, loadInboxSuccess({ inbox }));
    expect(out.items.length).toBe(1);
    expect(out.unreadCount).toBe(1);
    expect(out.error).toBeNull();
  });

  it('loadInboxSuccess clears a previous error', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const start = { ...initialState, error };
    const inbox: NotificationInbox = { items: [], unreadCount: 0 };
    const out = notificationsReducer(start, loadInboxSuccess({ inbox }));
    expect(out.error).toBeNull();
  });

  it('loadInboxNotModified no cambia el estado', () => {
    const prev = { ...initialState, unreadCount: 3 };
    expect(notificationsReducer(prev, loadInboxNotModified())).toEqual(prev);
  });

  it('loadInboxFailure guarda el error y no toca items/unreadCount', () => {
    const error = new HttpErrorResponse({ status: 500, statusText: 'Server Error' });
    const start = { ...initialState, items: [item({ id: 9 })], unreadCount: 2 };
    const out = notificationsReducer(start, loadInboxFailure({ error }));
    expect(out.error).toBe(error);
    expect(out.items).toBe(start.items);
    expect(out.unreadCount).toBe(2);
  });
});
