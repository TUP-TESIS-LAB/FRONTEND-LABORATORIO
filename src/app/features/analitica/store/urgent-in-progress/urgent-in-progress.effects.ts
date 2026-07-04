import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { isNotModified } from '@core/refresh';
import { NotificationService } from '@core/services/notification.service';
import { AtencionApiService } from '../../services/atencion-api.service';
import {
  loadUrgentInProgress,
  loadUrgentInProgressFailure,
  loadUrgentInProgressNotModified,
  loadUrgentInProgressSuccess,
} from './urgent-in-progress.actions';

/**
 * Política de operadores:
 * - loadUrgentInProgress: switchMap (GET polleado; cancela la petición stale si llega un nuevo poll).
 */
@Injectable()
export class UrgentInProgressEffects {
  private readonly actions$     = inject(Actions);
  private readonly api          = inject(AtencionApiService);
  private readonly notification = inject(NotificationService);

  /** Carga el tablero; el etagInterceptor maneja If-None-Match y convierte 304 en NotModified. */
  loadBoard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadUrgentInProgress),
      switchMap(() =>
        this.api.listUrgentInProgress().pipe(
          map(res =>
            isNotModified(res)
              ? loadUrgentInProgressNotModified()
              : loadUrgentInProgressSuccess({ board: res }),
          ),
          catchError((error: HttpErrorResponse) => {
            this.notification.error('No se pudo cargar el tablero de urgentes en curso. Revisá la conexión e intentá de nuevo.');
            return of(loadUrgentInProgressFailure({ error }));
          }),
        )
      ),
    )
  );
}
