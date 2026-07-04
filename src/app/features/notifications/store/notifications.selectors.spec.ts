import { NotificationItem } from '../models/notification.model';
import { selectNotificationItems, selectUnreadCount } from './notifications.selectors';
import { NOTIFICATIONS_FEATURE_KEY, NotificationsState, initialState } from './notifications.state';

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

function stateWith(patch: Partial<NotificationsState>): { [NOTIFICATIONS_FEATURE_KEY]: NotificationsState } {
  return { [NOTIFICATIONS_FEATURE_KEY]: { ...initialState, ...patch } };
}

describe('notifications selectors', () => {
  it('selectNotificationItems returns the items slice', () => {
    const items = [item({ id: 1 }), item({ id: 2 })];
    const root = stateWith({ items });
    expect(selectNotificationItems(root)).toBe(items);
  });

  it('selectNotificationItems is empty in initial state', () => {
    expect(selectNotificationItems(stateWith({}))).toEqual([]);
  });

  it('selectUnreadCount returns the unreadCount slice', () => {
    const root = stateWith({ unreadCount: 5 });
    expect(selectUnreadCount(root)).toBe(5);
  });
});
