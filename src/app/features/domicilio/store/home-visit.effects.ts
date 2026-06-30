import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, concatMap, map, switchMap } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { isNotModified } from '@core/refresh';
import { HomeVisitService } from '../services/home-visit.service';
import { NotificationService } from '@core/services/notification.service';
import {
  loadHomeVisits,
  loadHomeVisitsSuccess,
  loadHomeVisitsFailure,
  createHomeVisit,
  createHomeVisitSuccess,
  createHomeVisitFailure,
  loadMyRoute,
  loadMyRouteSuccess,
  loadMyRouteNotModified,
  loadMyRouteFailure,
  loadVisitDetail,
  loadVisitDetailSuccess,
  loadVisitDetailFailure,
  markExtracted,
  markExtractedSuccess,
  markExtractedFailure,
  markOutcome,
  markOutcomeSuccess,
  markOutcomeFailure,
  rescheduleVisit,
  rescheduleVisitSuccess,
  rescheduleVisitFailure,
} from './home-visit.actions';

function mapDomicilioError(e: HttpErrorResponse): string {
  if (e.status === 404) return 'La visita solicitada no existe.';
  if (e.status === 409) return 'Ya existe una visita programada para ese turno.';
  if (e.status === 422) return 'Los datos de la visita son inválidos. Revisá los campos e intentá de nuevo.';
  return 'Ocurrió un error al procesar la operación. Intentá de nuevo.';
}

function mapExtractorActionError(e: HttpErrorResponse): string {
  if (e.status === 404) return 'La visita solicitada no existe o no tenés permiso para operarla.';
  if (e.status === 409) return 'La visita ya fue procesada y no admite esta acción.';
  if (e.status === 403) return 'No tenés permiso para realizar esta operación.';
  return 'Ocurrió un error al procesar la operación. Intentá de nuevo.';
}

@Injectable()
export class HomeVisitEffects {
  private readonly actions$ = inject(Actions);
  private readonly homeVisitService = inject(HomeVisitService);
  private readonly notif = inject(NotificationService);

  // ── Listar visitas ──────────────────────────────────────────────────────────
  loadHomeVisits$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadHomeVisits),
      switchMap(({ branchId }) =>
        this.homeVisitService.list(branchId).pipe(
          map(visits => loadHomeVisitsSuccess({ visits })),
          catchError((e: HttpErrorResponse) => {
            const error = mapDomicilioError(e);
            return of(loadHomeVisitsFailure({ error }));
          }),
        ),
      ),
    ),
  );

  // ── Crear visita ────────────────────────────────────────────────────────────
  createHomeVisit$ = createEffect(() =>
    this.actions$.pipe(
      ofType(createHomeVisit),
      concatMap(({ payload }) =>
        this.homeVisitService.create(payload).pipe(
          map(({ id }) => {
            this.notif.success('Visita domiciliaria programada correctamente.');
            return createHomeVisitSuccess({ id });
          }),
          catchError((e: HttpErrorResponse) => {
            const error = mapDomicilioError(e);
            this.notif.error(error);
            return of(createHomeVisitFailure({ error }));
          }),
        ),
      ),
    ),
  );

  // ── Ruta del día ─────────────────────────────────────────────────────────────
  loadMyRoute$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadMyRoute),
      switchMap(({ date }) =>
        this.homeVisitService.myRoute(date).pipe(
          map(res =>
            isNotModified(res)
              ? loadMyRouteNotModified()
              : loadMyRouteSuccess({ visits: res }),
          ),
          catchError((e: HttpErrorResponse) => {
            const mensaje = mapDomicilioError(e);
            this.notif.error(mensaje);
            return of(loadMyRouteFailure({ error: mensaje }));
          }),
        ),
      ),
    ),
  );

  // ── Detalle de visita ─────────────────────────────────────────────────────────
  loadVisitDetail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadVisitDetail),
      switchMap(({ id }) =>
        this.homeVisitService.detail(id).pipe(
          map(visit => loadVisitDetailSuccess({ visit })),
          catchError((e: HttpErrorResponse) => {
            const mensaje = mapDomicilioError(e);
            this.notif.error(mensaje);
            return of(loadVisitDetailFailure({ error: mensaje }));
          }),
        ),
      ),
    ),
  );

  // ── Acciones del extractor ────────────────────────────────────────────────────
  markExtracted$ = createEffect(() =>
    this.actions$.pipe(
      ofType(markExtracted),
      concatMap(({ id }) =>
        this.homeVisitService.markExtracted(id).pipe(
          map(visit => {
            this.notif.success('Muestra extraída correctamente.');
            return markExtractedSuccess({ visit });
          }),
          catchError((e: HttpErrorResponse) => {
            const error = mapExtractorActionError(e);
            this.notif.error(error);
            return of(markExtractedFailure({ error }));
          }),
        ),
      ),
    ),
  );

  markExtractedRefresh$ = createEffect(() =>
    this.actions$.pipe(
      ofType(markExtractedSuccess),
      concatMap(({ visit }) => [
        loadVisitDetail({ id: visit.id }),
        loadMyRoute({}),
      ]),
    ),
  );

  markOutcome$ = createEffect(() =>
    this.actions$.pipe(
      ofType(markOutcome),
      concatMap(({ id, reason }) =>
        this.homeVisitService.markOutcome(id, reason).pipe(
          map(visit => {
            this.notif.success('Estado de la visita registrado correctamente.');
            return markOutcomeSuccess({ visit });
          }),
          catchError((e: HttpErrorResponse) => {
            const error = mapExtractorActionError(e);
            this.notif.error(error);
            return of(markOutcomeFailure({ error }));
          }),
        ),
      ),
    ),
  );

  markOutcomeRefresh$ = createEffect(() =>
    this.actions$.pipe(
      ofType(markOutcomeSuccess),
      concatMap(({ visit }) => [
        loadVisitDetail({ id: visit.id }),
        loadMyRoute({}),
      ]),
    ),
  );

  rescheduleVisit$ = createEffect(() =>
    this.actions$.pipe(
      ofType(rescheduleVisit),
      concatMap(({ id }) =>
        this.homeVisitService.reschedule(id).pipe(
          map(visit => {
            this.notif.success('Visita reprogramada correctamente.');
            return rescheduleVisitSuccess({ visit });
          }),
          catchError((e: HttpErrorResponse) => {
            const error = mapExtractorActionError(e);
            this.notif.error(error);
            return of(rescheduleVisitFailure({ error }));
          }),
        ),
      ),
    ),
  );

  rescheduleVisitRefresh$ = createEffect(() =>
    this.actions$.pipe(
      ofType(rescheduleVisitSuccess),
      concatMap(({ visit }) => [
        loadVisitDetail({ id: visit.id }),
        loadMyRoute({}),
      ]),
    ),
  );
}
