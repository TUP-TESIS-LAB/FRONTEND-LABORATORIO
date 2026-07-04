import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, exhaustMap, map, mergeMap, of, switchMap } from 'rxjs';
import { isNotModified } from '@core/refresh';
import { NotificationApiService } from '../services/notification-api.service';
import {
  loadInbox,
  loadInboxFailure,
  loadInboxNotModified,
  loadInboxSuccess,
  markAllRead,
  markRead,
  mutateSuccess,
} from './notifications.actions';

/** Store de la campana de notificaciones — polling ETag/304 + mutaciones optimistas. */
@Injectable()
export class NotificationsEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(NotificationApiService);

  loadInbox$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadInbox),
      switchMap(() =>
        this.api.getInbox().pipe(
          map((res) => (isNotModified(res) ? loadInboxNotModified() : loadInboxSuccess({ inbox: res }))),
          catchError((error: HttpErrorResponse) => of(loadInboxFailure({ error }))),
        ),
      ),
    ),
  );

  /**
   * Optimista: re-dispara loadInbox incluso si el POST falla, para no dejar la
   * campana desincronizada con lo que ya mostró el usuario.
   */
  markRead$ = createEffect(() =>
    this.actions$.pipe(
      ofType(markRead),
      mergeMap(({ id }) =>
        this.api.markRead(id).pipe(
          map(() => mutateSuccess()),
          catchError(() => of(mutateSuccess())),
        ),
      ),
    ),
  );

  markAllRead$ = createEffect(() =>
    this.actions$.pipe(
      ofType(markAllRead),
      exhaustMap(() =>
        this.api.markAllRead().pipe(
          map(() => mutateSuccess()),
          catchError(() => of(mutateSuccess())),
        ),
      ),
    ),
  );

  refreshAfterMutate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(mutateSuccess),
      map(() => loadInbox()),
    ),
  );
}
