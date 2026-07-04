import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Store } from '@ngrx/store';
import { PollingHandle, PollingService } from '@core/refresh';
import { NotificationItem } from '../../models/notification.model';
import { loadInbox, markAllRead, markRead } from '../../store/notifications.actions';
import { NOTIFICATIONS_FEATURE_KEY, initialState } from '../../store/notifications.state';
import { NotificationBellComponent } from './notification-bell.component';

function item(over: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: 1,
    eventType: 'RESULT_READY',
    title: 'Resultado listo',
    message: 'El resultado de Juan Pérez está listo.',
    targetRoute: null,
    read: false,
    createdAt: new Date().toISOString(),
    ...over,
  };
}

describe('NotificationBellComponent', () => {
  let store: MockStore;
  let stopSpy: ReturnType<typeof vi.fn<() => void>>;

  function configure(partialState: Partial<typeof initialState> = {}): void {
    stopSpy = vi.fn<() => void>();
    const pollingMock: Partial<PollingService> = {
      startPolling: vi.fn().mockReturnValue({
        stop: () => stopSpy(),
        pokeNow: vi.fn(),
        setActive: vi.fn(),
      } satisfies PollingHandle),
    };

    TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        provideMockStore({
          initialState: { [NOTIFICATIONS_FEATURE_KEY]: { ...initialState, ...partialState } },
        }),
        { provide: PollingService, useValue: pollingMock },
      ],
    });
    store = TestBed.inject(Store) as MockStore;
  }

  it('dispatches loadInbox and starts polling on init; stops polling on destroy', () => {
    configure();
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(NotificationBellComponent);
    fixture.detectChanges();

    expect(dispatchSpy).toHaveBeenCalledWith(loadInbox());
    const polling = TestBed.inject(PollingService);
    expect(polling.startPolling).toHaveBeenCalled();

    fixture.destroy();
    expect(stopSpy).toHaveBeenCalled();
  });

  it('muestra el badge con unreadCount y lo oculta si es 0', () => {
    configure({ unreadCount: 2 });
    const fixture = TestBed.createComponent(NotificationBellComponent);
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector('.notif-badge');
    expect(badge?.textContent?.trim()).toBe('2');
  });

  it('oculta el badge cuando unreadCount es 0', () => {
    configure({ unreadCount: 0 });
    const fixture = TestBed.createComponent(NotificationBellComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.notif-badge')).toBeNull();
  });

  it('muestra el estado vacío cuando no hay notificaciones', () => {
    configure({ items: [] });
    const fixture = TestBed.createComponent(NotificationBellComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance['items']()).toEqual([]);
  });

  it('al abrir un item no leído con targetRoute: navega, despacha markRead y cierra el panel', () => {
    configure({ items: [item({ id: 5, read: false, targetRoute: '/analitica/atencion/5' })] });
    const fixture = TestBed.createComponent(NotificationBellComponent);
    fixture.detectChanges();
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigateByUrl');
    const hideSpy = vi.fn();

    const target = item({ id: 5, read: false, targetRoute: '/analitica/atencion/5' });
    fixture.componentInstance['onOpen'](target, { hide: hideSpy } as any);

    expect(dispatchSpy).toHaveBeenCalledWith(markRead({ id: 5 }));
    expect(navSpy).toHaveBeenCalledWith('/analitica/atencion/5');
    expect(hideSpy).toHaveBeenCalled();
  });

  it('al abrir un item ya leído no vuelve a despachar markRead', () => {
    configure();
    const fixture = TestBed.createComponent(NotificationBellComponent);
    fixture.detectChanges();
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    const hideSpy = vi.fn();

    const target = item({ id: 9, read: true, targetRoute: null });
    fixture.componentInstance['onOpen'](target, { hide: hideSpy } as any);

    expect(dispatchSpy).not.toHaveBeenCalledWith(markRead({ id: 9 }));
    expect(hideSpy).toHaveBeenCalled();
  });

  it('"Marcar todas como leídas" despacha markAllRead', () => {
    configure({ unreadCount: 3 });
    const fixture = TestBed.createComponent(NotificationBellComponent);
    fixture.detectChanges();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    fixture.componentInstance['onMarkAll']();

    expect(dispatchSpy).toHaveBeenCalledWith(markAllRead());
  });
});
