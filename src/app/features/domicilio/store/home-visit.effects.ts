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
  prepareLabels,
  prepareLabelsSuccess,
  prepareLabelsFailure,
  markExtracted,
  markExtractedSuccess,
  markExtractedFailure,
  markOutcome,
  markOutcomeSuccess,
  markOutcomeFailure,
  rescheduleVisit,
  rescheduleVisitSuccess,
  rescheduleVisitFailure,
  markInTransit,
  markInTransitSuccess,
  markInTransitFailure,
  markBroken,
  markBrokenSuccess,
  markBrokenFailure,
  receiveVisit,
  receiveVisitSuccess,
  receiveVisitFailure,
  reExtractVisit,
  reExtractVisitSuccess,
  reExtractVisitFailure,
  loadCustody,
  loadCustodySuccess,
  loadCustodyNotModified,
  loadCustodyFailure,
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

function mapMarkExtractedError(e: HttpErrorResponse): string {
  if (e.status === 404) return 'La visita solicitada no existe o no tenés permiso para operarla.';
  if (e.status === 409) return 'La visita ya fue procesada y no admite esta acción.';
  if (e.status === 403) return 'No tenés permiso para realizar esta operación.';
  if (e.status === 422) {
    const msg: string = (e.error as { message?: string } | null)?.message ?? '';
    if (msg === 'La visita no tiene rótulos preparados.') return msg;
    if (msg === 'El rótulo escaneado no corresponde al paciente de esta visita.') return msg;
    return 'Los datos del escaneo son inválidos. Revisá el rótulo e intentá de nuevo.';
  }
  return 'Ocurrió un error al procesar la operación. Intentá de nuevo.';
}

function mapPrepareLabelsError(e: HttpErrorResponse): string {
  if (e.status === 404) return 'La visita solicitada no existe.';
  if (e.status === 409) return 'La visita ya fue procesada y no admite esta acción.';
  if (e.status === 403) return 'No tenés permiso para realizar esta operación.';
  if (e.status === 422) {
    // El back rechaza preparar rótulos si la visita no tiene análisis cargados
    // (mensaje raw en inglés: "Protocol must have at least one analysis order").
    // No lo mostramos verbatim (regla #4): mapeamos a un mensaje de dominio claro.
    const raw: string = (e.error as { message?: string } | null)?.message ?? '';
    if (/analysis|análisis|determinaci/i.test(raw)) {
      return 'La visita no tiene análisis cargados; no se pueden preparar los rótulos. Cargá al menos un análisis antes de continuar.';
    }
    return 'No se pueden preparar los rótulos: la visita está en un estado inválido.';
  }
  return 'Ocurrió un error al preparar los rótulos. Intentá de nuevo.';
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

  // ── Preparar rótulos ──────────────────────────────────────────────────────────
  prepareLabels$ = createEffect(() =>
    this.actions$.pipe(
      ofType(prepareLabels),
      concatMap(({ id }) =>
        this.homeVisitService.prepareLabels(id).pipe(
          map(({ visit, labels }) => {
            this.notif.success('Rótulos preparados');
            return prepareLabelsSuccess({ visit, labels });
          }),
          catchError((e: HttpErrorResponse) => {
            const error = mapPrepareLabelsError(e);
            this.notif.error(error);
            return of(prepareLabelsFailure({ error }));
          }),
        ),
      ),
    ),
  );

  prepareLabelsRefresh$ = createEffect(() =>
    this.actions$.pipe(
      ofType(prepareLabelsSuccess),
      concatMap(({ visit }) => [
        loadVisitDetail({ id: visit.id }),
      ]),
    ),
  );

  // ── Acciones del extractor ────────────────────────────────────────────────────
  markExtracted$ = createEffect(() =>
    this.actions$.pipe(
      ofType(markExtracted),
      concatMap(({ id, scannedBarcode }) =>
        this.homeVisitService.markExtracted(id, scannedBarcode).pipe(
          map(visit => {
            this.notif.success('Muestra extraída correctamente.');
            return markExtractedSuccess({ visit });
          }),
          catchError((e: HttpErrorResponse) => {
            const error = mapMarkExtractedError(e);
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

  // ── En tránsito ────────────────────────────────────────────────────────────────
  markInTransit$ = createEffect(() =>
    this.actions$.pipe(
      ofType(markInTransit),
      concatMap(({ id }) =>
        this.homeVisitService.markInTransit(id).pipe(
          map(visit => {
            this.notif.success('Muestra en tránsito hacia el laboratorio.');
            return markInTransitSuccess({ visit });
          }),
          catchError((e: HttpErrorResponse) => {
            const error = mapExtractorActionError(e);
            this.notif.error(error);
            return of(markInTransitFailure({ error }));
          }),
        ),
      ),
    ),
  );

  // ── Reportar rotura ─────────────────────────────────────────────────────────────
  markBroken$ = createEffect(() =>
    this.actions$.pipe(
      ofType(markBroken),
      concatMap(({ id, reason }) =>
        this.homeVisitService.markBroken(id, reason).pipe(
          map(visit => {
            this.notif.success('Rotura/pérdida registrada.');
            return markBrokenSuccess({ visit });
          }),
          catchError((e: HttpErrorResponse) => {
            const error = mapExtractorActionError(e);
            this.notif.error(error);
            return of(markBrokenFailure({ error }));
          }),
        ),
      ),
    ),
  );

  // ── Recepcionar ──────────────────────────────────────────────────────────────────
  receiveVisit$ = createEffect(() =>
    this.actions$.pipe(
      ofType(receiveVisit),
      concatMap(({ id }) =>
        this.homeVisitService.receiveVisit(id).pipe(
          map(visit => {
            this.notif.success('Muestra recibida e ingresada a preanalítica.');
            return receiveVisitSuccess({ visit });
          }),
          catchError((e: HttpErrorResponse) => {
            const error = mapExtractorActionError(e);
            this.notif.error(error);
            return of(receiveVisitFailure({ error }));
          }),
        ),
      ),
    ),
  );

  // ── Re-extraer ────────────────────────────────────────────────────────────────────
  reExtractVisit$ = createEffect(() =>
    this.actions$.pipe(
      ofType(reExtractVisit),
      concatMap(({ id }) =>
        this.homeVisitService.reExtract(id).pipe(
          map(visit => {
            this.notif.success('Re-extracción programada (sin recobro).');
            return reExtractVisitSuccess({ visit });
          }),
          catchError((e: HttpErrorResponse) => {
            const error = mapExtractorActionError(e);
            this.notif.error(error);
            return of(reExtractVisitFailure({ error }));
          }),
        ),
      ),
    ),
  );

  transitionRefresh$ = createEffect(() =>
    this.actions$.pipe(
      ofType(markInTransitSuccess, markBrokenSuccess, receiveVisitSuccess),
      concatMap(({ visit }) => [
        loadVisitDetail({ id: visit.id }),
        loadCustody({ id: visit.id }),
        loadMyRoute({}),
      ]),
    ),
  );

  // La re-extracción devuelve la NUEVA visita (sucesora): refrescamos su detalle + la ruta.
  reExtractRefresh$ = createEffect(() =>
    this.actions$.pipe(
      ofType(reExtractVisitSuccess),
      concatMap(({ visit }) => [
        loadVisitDetail({ id: visit.id }),
        loadMyRoute({}),
      ]),
    ),
  );

  // ── Cadena de custodia (polleada ETag/304) ──────────────────────────────────────
  loadCustody$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadCustody),
      switchMap(({ id }) =>
        this.homeVisitService.loadCustody(id).pipe(
          map(res =>
            isNotModified(res)
              ? loadCustodyNotModified()
              : loadCustodySuccess({ events: res }),
          ),
          catchError((e: HttpErrorResponse) => {
            const error = mapExtractorActionError(e);
            return of(loadCustodyFailure({ error }));
          }),
        ),
      ),
    ),
  );
}
