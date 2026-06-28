import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, concatMap, map, of } from 'rxjs';
import { isNotModified } from '@core/refresh';
import { NotificationService } from '@core/services/notification.service';
import { AtencionApiService } from '../../services/atencion-api.service';
import {
  loadUrgentPending,
  loadUrgentPendingFailure,
  loadUrgentPendingNotModified,
  loadUrgentPendingSuccess,
  resolveAuth,
  resolveAuthFailure,
  resolveAuthSuccess,
  resolveCobro,
  resolveCobroFailure,
  resolveCobroSuccess,
  resolveDatos,
  resolveDatosFailure,
  resolveDatosSuccess,
} from './urgent-pending.actions';

/**
 * Política de operadores:
 * - loadUrgentPending: concatMap (polleable; evitar que polls solapados se cancelen).
 * - Mutaciones: concatMap (pesimista; preserva orden ante doble-click).
 */
@Injectable()
export class UrgentPendingEffects {
  private readonly actions$    = inject(Actions);
  private readonly api         = inject(AtencionApiService);
  private readonly notification = inject(NotificationService);

  /** Carga la bandeja; el etagInterceptor maneja If-None-Match y convierte 304 en NotModified. */
  loadList$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadUrgentPending),
      concatMap(() =>
        this.api.listUrgentPending().pipe(
          map(res =>
            isNotModified(res)
              ? loadUrgentPendingNotModified()
              : loadUrgentPendingSuccess({ items: res }),
          ),
          catchError((error: HttpErrorResponse) => {
            this.notification.error('No se pudo cargar la bandeja de urgentes. Revisá la conexión e intentá de nuevo.');
            return of(loadUrgentPendingFailure({ error }));
          }),
        )
      ),
    )
  );

  /** Resolución: número de autorización. */
  resolveAuth$ = createEffect(() =>
    this.actions$.pipe(
      ofType(resolveAuth),
      concatMap(({ id, authorizationNumber }) =>
        this.api.setAuthorizationNumber(id, { authorizationNumber }).pipe(
          map(item => resolveAuthSuccess({ item })),
          catchError((error: HttpErrorResponse) => {
            this.notification.error('No se pudo guardar el número de autorización. Revisá la conexión y volvé a intentarlo.');
            return of(resolveAuthFailure({ error }));
          }),
        )
      ),
    )
  );

  /** Resolución: datos administrativos (médico / plan). */
  resolveDatos$ = createEffect(() =>
    this.actions$.pipe(
      ofType(resolveDatos),
      concatMap(({ id, doctorId, insurancePlanId }) =>
        this.api.completeAdminData(id, { doctorId, insurancePlanId }).pipe(
          map(item => resolveDatosSuccess({ item })),
          catchError((error: HttpErrorResponse) => {
            this.notification.error('No se pudieron guardar los datos administrativos. Revisá la conexión y volvé a intentarlo.');
            return of(resolveDatosFailure({ error }));
          }),
        )
      ),
    )
  );

  /** Resolución: cobro regularizado. */
  resolveCobro$ = createEffect(() =>
    this.actions$.pipe(
      ofType(resolveCobro),
      concatMap(({ id }) =>
        this.api.cobroRegularizado(id).pipe(
          map(item => resolveCobroSuccess({ item })),
          catchError((error: HttpErrorResponse) => {
            this.notification.error('No se pudo registrar el cobro regularizado. Revisá la conexión y volvé a intentarlo.');
            return of(resolveCobroFailure({ error }));
          }),
        )
      ),
    )
  );
}
