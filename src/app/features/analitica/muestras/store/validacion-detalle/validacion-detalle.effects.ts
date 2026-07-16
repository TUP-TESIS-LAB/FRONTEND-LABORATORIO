import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { concat, of } from 'rxjs';
import { catchError, concatMap, filter, last, map, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { NotificationService } from '@core/services/notification.service';
import { humanizeBackendError } from '@shared/utils/error-messages';
import { PostanaliticaApiService } from '../../services/postanalitica-api.service';
import { selectDetalle } from './validacion-detalle.selectors';
import {
  loadDetalle, loadDetalleSuccess, loadDetalleFailure,
  validarTodo, mutarOk, mutarFail,
  firmarResultado, firmarEstudio,
  verPdf, verPdfSuccess, verPdfFailure,
} from './validacion-detalle.actions';

@Injectable()
export class ValidacionDetalleEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(PostanaliticaApiService);
  private readonly notifications = inject(NotificationService);

  load$ = createEffect(() => this.actions$.pipe(
    ofType(loadDetalle),
    switchMap(({ protocolId, patientName, patientSex, patientBirthDate }) =>
      this.api.getDetalle(protocolId).pipe(
        map(res => loadDetalleSuccess({ detalle: { ...res, patientName, patientSex, patientBirthDate } })),
        catchError((error: HttpErrorResponse) => of(loadDetalleFailure({ error }))))),
  ));

  validarTodo$ = createEffect(() => this.actions$.pipe(
    ofType(validarTodo),
    concatMap(({ resultId, outcome }) =>
      this.api.validateAll(resultId, outcome).pipe(
        map(() => mutarOk()), catchError((error: HttpErrorResponse) => of(mutarFail({ error }))))),
  ));

  firmarResultado$ = createEffect(() => this.actions$.pipe(
    ofType(firmarResultado),
    concatMap(({ resultId }) =>
      this.api.signResult(resultId).pipe(
        map(() => mutarOk()), catchError((error: HttpErrorResponse) => of(mutarFail({ error }))))),
  ));

  /**
   * GAP-9: el modal de "Firmar estudio" orquesta la firma real. El estado de firma
   * del backend es derivado (no hay endpoint de "firma parcial"): se firma cada
   * resultado VALIDATED uno a uno (results/{id}/sign) y, si con eso quedan TODOS los
   * resultados firmados, se cierra el estudio (studies/{protocolId}/sign → CLOSED).
   * Si faltaba alguno por validar, el estudio queda PARTIALLY_SIGNED.
   */
  firmarEstudio$ = createEffect(() => this.actions$.pipe(
    ofType(firmarEstudio),
    withLatestFrom(this.store.select(selectDetalle)),
    concatMap(([{ protocolId }, detalle]) => {
      const results = detalle?.results ?? [];
      const toSign = results.filter(r => r.status === 'VALIDATED').map(r => r.resultId);
      const yaFirmados = results.filter(r => r.status === 'SIGNED').length;
      const total = detalle?.study.expectedResultsCount ?? results.length;
      const quedanTodosFirmados = yaFirmados + toSign.length >= total && total > 0;

      const signResults$ = toSign.map(id => this.api.signResult(id));
      const ops = quedanTodosFirmados
        ? [...signResults$, this.api.signStudy(protocolId)]
        : signResults$;

      if (ops.length === 0) return of(mutarOk());
      return concat(...ops).pipe(
        last(),
        map(() => mutarOk()),
        catchError((error: HttpErrorResponse) => of(mutarFail({ error }))));
    }),
  ));

  reload$ = createEffect(() => this.actions$.pipe(
    ofType(mutarOk),
    withLatestFrom(this.store.select(selectDetalle)),
    filter(([, d]) => d != null),
    map(([, d]) => loadDetalle({ protocolId: d!.study.protocolId, patientName: d!.patientName, patientSex: d!.patientSex, patientBirthDate: d!.patientBirthDate })),
  ));

  /**
   * Ver PDF bajo demanda: lista los informes del estudio, toma el de mayor versión,
   * lo descarga y lo abre en una pestaña nueva. El back genera-si-falta el informe,
   * así que un estudio firmado siempre devuelve un documento (no hay polling/reintento).
   */
  verPdf$ = createEffect(() => this.actions$.pipe(
    ofType(verPdf),
    concatMap(({ protocolId }) =>
      this.api.getStudyReports(protocolId).pipe(
        concatMap((reports) => {
          if (!reports || reports.length === 0) {
            throw new HttpErrorResponse({ status: 404 });
          }
          const latest = reports.reduce((a, b) => (b.versionNumber > a.versionNumber ? b : a));
          return this.api.downloadReport(protocolId, latest.id).pipe(
            map((blob: Blob) => {
              const url = URL.createObjectURL(blob);
              window.open(url, '_blank');
              return verPdfSuccess();
            }),
          );
        }),
        catchError((error: HttpErrorResponse) => of(verPdfFailure({ error }))))),
  ));

  /** Toast de error en español cuando "Ver PDF" falla (sin leak de internals). */
  verPdfFailureToast$ = createEffect(() => this.actions$.pipe(
    ofType(verPdfFailure),
    tap(({ error }) => this.notifications.error(
      'No se pudo abrir el informe',
      humanizeBackendError(error, {
        fallback: 'No pudimos abrir el informe del paciente. Probá de nuevo.',
        byStatus: {
          403: 'No tenés permiso para ver el informe de este estudio.',
          404: 'Todavía no hay un informe disponible para este estudio.',
        },
      }))),
  ), { dispatch: false });

  /** Toast de error genérico de la página (carga/validación/firma), antes en el componente. */
  globalFailureToast$ = createEffect(() => this.actions$.pipe(
    ofType(loadDetalleFailure, mutarFail),
    tap(({ error }) => this.notifications.error(
      'Operación fallida',
      humanizeBackendError(error, { fallback: 'No pudimos completar la operación. Probá de nuevo.' }))),
  ), { dispatch: false });
}
