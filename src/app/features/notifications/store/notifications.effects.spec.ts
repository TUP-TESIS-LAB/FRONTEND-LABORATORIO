import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { Observable, ReplaySubject, firstValueFrom, of, throwError } from 'rxjs';
import { take } from 'rxjs/operators';
import { NOT_MODIFIED } from '@core/refresh';
import { NotificationApiService } from '../services/notification-api.service';
import { NotificationInbox } from '../models/notification.model';
import {
  loadInbox,
  loadInboxFailure,
  loadInboxNotModified,
  loadInboxSuccess,
  markAllRead,
  markRead,
  mutateSuccess,
} from './notifications.actions';
import { NotificationsEffects } from './notifications.effects';

describe('NotificationsEffects', () => {
  let actions$: ReplaySubject<Action>;
  let api: Partial<Record<keyof NotificationApiService, ReturnType<typeof vi.fn>>>;
  let effects: NotificationsEffects;

  beforeEach(() => {
    actions$ = new ReplaySubject(1);
    api = {
      getInbox: vi.fn(),
      markRead: vi.fn(),
      markAllRead: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        NotificationsEffects,
        provideMockActions(() => actions$ as unknown as Observable<Action>),
        { provide: NotificationApiService, useValue: api },
      ],
    });
    effects = TestBed.inject(NotificationsEffects);
  });

  it('loadInbox$ -> loadInboxSuccess on data', async () => {
    const inbox: NotificationInbox = { items: [], unreadCount: 0 };
    (api.getInbox as ReturnType<typeof vi.fn>).mockReturnValue(of(inbox));
    const promise = firstValueFrom(effects.loadInbox$.pipe(take(1)));
    actions$.next(loadInbox());
    expect(await promise).toEqual(loadInboxSuccess({ inbox }));
  });

  it('loadInbox 304 -> loadInboxNotModified', async () => {
    (api.getInbox as ReturnType<typeof vi.fn>).mockReturnValue(of(NOT_MODIFIED));
    const promise = firstValueFrom(effects.loadInbox$.pipe(take(1)));
    actions$.next(loadInbox());
    expect(await promise).toEqual(loadInboxNotModified());
  });

  it('loadInbox$ -> loadInboxFailure on http error', async () => {
    const error = new HttpErrorResponse({ status: 500 });
    (api.getInbox as ReturnType<typeof vi.fn>).mockReturnValue(throwError(() => error));
    const promise = firstValueFrom(effects.loadInbox$.pipe(take(1)));
    actions$.next(loadInbox());
    expect(await promise).toEqual(loadInboxFailure({ error }));
  });

  it('markRead success -> mutateSuccess (que re-dispara loadInbox)', async () => {
    (api.markRead as ReturnType<typeof vi.fn>).mockReturnValue(of(void 0));
    const promise = firstValueFrom(effects.markRead$.pipe(take(1)));
    actions$.next(markRead({ id: 7 }));
    expect(await promise).toEqual(mutateSuccess());
    expect(api.markRead).toHaveBeenCalledWith(7);
  });

  it('markRead failure -> mutateSuccess igual (optimista)', async () => {
    const error = new HttpErrorResponse({ status: 500 });
    (api.markRead as ReturnType<typeof vi.fn>).mockReturnValue(throwError(() => error));
    const promise = firstValueFrom(effects.markRead$.pipe(take(1)));
    actions$.next(markRead({ id: 7 }));
    expect(await promise).toEqual(mutateSuccess());
  });

  it('markAllRead success -> mutateSuccess', async () => {
    (api.markAllRead as ReturnType<typeof vi.fn>).mockReturnValue(of(void 0));
    const promise = firstValueFrom(effects.markAllRead$.pipe(take(1)));
    actions$.next(markAllRead());
    expect(await promise).toEqual(mutateSuccess());
    expect(api.markAllRead).toHaveBeenCalled();
  });

  it('markAllRead failure -> mutateSuccess igual (optimista)', async () => {
    const error = new HttpErrorResponse({ status: 500 });
    (api.markAllRead as ReturnType<typeof vi.fn>).mockReturnValue(throwError(() => error));
    const promise = firstValueFrom(effects.markAllRead$.pipe(take(1)));
    actions$.next(markAllRead());
    expect(await promise).toEqual(mutateSuccess());
  });

  it('refreshAfterMutate$ re-dispara loadInbox tras mutateSuccess', async () => {
    const promise = firstValueFrom(effects.refreshAfterMutate$.pipe(take(1)));
    actions$.next(mutateSuccess());
    expect(await promise).toEqual(loadInbox());
  });
});
