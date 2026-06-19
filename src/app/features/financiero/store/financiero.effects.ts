import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, concatMap, map, switchMap } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { isNotModified } from '@core/refresh';
import { FinancieroApiService } from '../services/financiero-api.service';
import { NotificationService } from '@core/services/notification.service';
import {
  loadOpenSession, loadOpenSessionSuccess, sessionNotFound, loadOpenSessionFailure,
  loadActivity, loadActivitySuccess, loadActivityNotModified, loadActivityFailure,
  openSession, openSessionSuccess, openSessionFailure,
  closeSession, closeSessionSuccess, closeSessionFailure,
  registerTransaction, registerTransactionSuccess, registerTransactionFailure,
} from './financiero.actions';

function mapCajaError(e: HttpErrorResponse): string {
  if (e.status === 409) return 'Ya hay una caja abierta para esta sucursal.';
  if (e.status === 422) return 'No se puede cobrar: no hay una caja abierta.';
  return 'Ocurrió un error al procesar la operación. Intentá de nuevo.';
}

@Injectable()
export class FinancieroEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(FinancieroApiService);
  private readonly notif = inject(NotificationService);

  // ── cargar sesión abierta ──────────────────────────────────────────────────
  loadOpenSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadOpenSession),
      switchMap(({ branchId }) =>
        this.api.getOpenSession(branchId).pipe(
          map(session => session === null ? sessionNotFound() : loadOpenSessionSuccess({ session })),
          catchError((e: HttpErrorResponse) => {
            const error = mapCajaError(e);
            return of(loadOpenSessionFailure({ error }));
          }),
        ),
      ),
    ),
  );

  // ── actividad de sesión (polleada) ─────────────────────────────────────────
  loadActivity$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadActivity),
      switchMap(({ sessionId }) =>
        this.api.getActivity(sessionId).pipe(
          map(res => isNotModified(res)
            ? loadActivityNotModified()
            : loadActivitySuccess({ activity: res })),
          catchError((e: HttpErrorResponse) => {
            const error = mapCajaError(e);
            return of(loadActivityFailure({ error }));
          }),
        ),
      ),
    ),
  );

  // ── abrir sesión ───────────────────────────────────────────────────────────
  openSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(openSession),
      concatMap(({ branchId, openingAmount }) =>
        this.api.openSession(branchId, openingAmount).pipe(
          map(session => {
            this.notif.success('Caja abierta correctamente.');
            return openSessionSuccess({ session });
          }),
          catchError((e: HttpErrorResponse) => {
            const error = mapCajaError(e);
            this.notif.error(error);
            return of(openSessionFailure({ error }));
          }),
        ),
      ),
    ),
  );

  // ── cerrar sesión ──────────────────────────────────────────────────────────
  closeSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(closeSession),
      concatMap(({ id, declaredAmount }) =>
        this.api.closeSession(id, declaredAmount).pipe(
          map(session => {
            this.notif.success('Caja cerrada. Arqueo registrado.');
            return closeSessionSuccess({ session });
          }),
          catchError((e: HttpErrorResponse) => {
            const error = mapCajaError(e);
            this.notif.error(error);
            return of(closeSessionFailure({ error }));
          }),
        ),
      ),
    ),
  );

  // ── registrar movimiento ───────────────────────────────────────────────────
  registerTransaction$ = createEffect(() =>
    this.actions$.pipe(
      ofType(registerTransaction),
      concatMap(({ id, body }) =>
        this.api.registerTransaction(id, body).pipe(
          map(() => {
            this.notif.success('Movimiento registrado.');
            return registerTransactionSuccess();
          }),
          catchError((e: HttpErrorResponse) => {
            const error = mapCajaError(e);
            this.notif.error(error);
            return of(registerTransactionFailure({ error }));
          }),
        ),
      ),
    ),
  );

}
