import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { from, of } from 'rxjs';
import { catchError, concatMap, map, switchMap } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { isNotModified } from '@core/refresh';
import { NotificationService } from '@core/services/notification.service';
import { triggerDownload } from '@shared/utils/blob-download';
import { LiquidacionesApiService } from '../services/liquidaciones-api.service';
import { ObraSocialService } from '@features/obras-sociales/services/obra-social.service';
import {
  loadSettlements, loadSettlementsSuccess, loadSettlementsNotModified, loadSettlementsFailure,
  loadSettlement, loadSettlementSuccess, loadSettlementFailure,
  generateSettlement, generateSettlementSuccess, generateSettlementFailure,
  informSettlement, informSettlementSuccess, informSettlementFailure,
  cancelSettlement, cancelSettlementSuccess, cancelSettlementFailure,
  registerSettlementCollection, registerSettlementCollectionSuccess, registerSettlementCollectionFailure,
  loadPendingServices, loadPendingServicesSuccess, loadPendingServicesNotModified, loadPendingServicesFailure,
  loadInsurersIndex, loadInsurersIndexSuccess, loadInsurersIndexFailure,
  loadInsurerPlans, loadInsurerPlansSuccess, loadInsurerPlansFailure,
  loadPreviewDetail, loadPreviewDetailSuccess, loadPreviewDetailFailure,
  exportSettlement, exportSettlementSuccess, exportSettlementFailure,
} from './financiero.actions';

function mapLoadError(): string {
  return 'No se pudieron cargar las liquidaciones. Probá de nuevo.';
}

function mapGenerateError(e: HttpErrorResponse): string {
  if (e.status === 422) return 'No hay prestaciones pendientes para esa obra social y período.';
  if (e.status === 409) return 'Ya existe una liquidación para esa obra social y ese período.';
  return 'No se pudo generar la liquidación. Probá de nuevo.';
}

function mapLifecycleError(e: HttpErrorResponse, accion: 'informar' | 'anular' | 'registrar el cobro de'): string {
  if (e.status === 404) return 'La liquidación no existe.';
  if (e.status === 409) return 'La liquidación fue modificada por otra operación. Recargá la página y volvé a intentar.';
  if (e.status === 422) {
    if (accion === 'informar') return 'No se puede informar la liquidación en su estado actual.';
    if (accion === 'anular') return 'No se puede anular la liquidación en su estado actual.';
    return 'No se puede registrar el cobro de la liquidación en su estado actual.';
  }
  return 'No se pudo completar la acción sobre la liquidación. Probá de nuevo.';
}

@Injectable()
export class LiquidacionesEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(LiquidacionesApiService);
  private readonly os = inject(ObraSocialService);
  private readonly notif = inject(NotificationService);

  loadSettlements$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadSettlements),
      switchMap(({ filters }) =>
        this.api.listSettlements(filters).pipe(
          map(res => isNotModified(res)
            ? loadSettlementsNotModified()
            : loadSettlementsSuccess({ items: res })),
          catchError(() => of(loadSettlementsFailure({ error: mapLoadError() }))),
        ),
      ),
    ),
  );

  loadSettlement$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadSettlement),
      switchMap(({ id }) =>
        this.api.getSettlement(id).pipe(
          map(settlement => loadSettlementSuccess({ settlement })),
          catchError((e: HttpErrorResponse) => of(loadSettlementFailure({
            error: e.status === 404 ? 'La liquidación no existe.' : 'No se pudo cargar la liquidación.',
          }))),
        ),
      ),
    ),
  );

  generateSettlement$ = createEffect(() =>
    this.actions$.pipe(
      ofType(generateSettlement),
      concatMap(({ body }) =>
        this.api.generateSettlement(body).pipe(
          map(settlement => {
            this.notif.success('Liquidación generada.');
            return generateSettlementSuccess({ settlement });
          }),
          catchError((e: HttpErrorResponse) => {
            const error = mapGenerateError(e);
            this.notif.error(error);
            return of(generateSettlementFailure({ error }));
          }),
        ),
      ),
    ),
  );

  informSettlement$ = createEffect(() =>
    this.actions$.pipe(
      ofType(informSettlement),
      concatMap(({ id, body }) =>
        this.api.informSettlement(id, body).pipe(
          map(settlement => {
            this.notif.success('Liquidación informada.');
            return informSettlementSuccess({ settlement });
          }),
          catchError((e: HttpErrorResponse) => {
            const error = mapLifecycleError(e, 'informar');
            this.notif.error(error);
            // 409 = conflicto de versión: recargamos el detalle para traer la versión fresca.
            const out: Action[] = [informSettlementFailure({ error })];
            if (e.status === 409) out.push(loadSettlement({ id }));
            return from(out);
          }),
        ),
      ),
    ),
  );

  cancelSettlement$ = createEffect(() =>
    this.actions$.pipe(
      ofType(cancelSettlement),
      concatMap(({ id, body }) =>
        this.api.cancelSettlement(id, body).pipe(
          map(() => {
            this.notif.success('Liquidación anulada.');
            return cancelSettlementSuccess({ id });
          }),
          catchError((e: HttpErrorResponse) => {
            const error = mapLifecycleError(e, 'anular');
            this.notif.error(error);
            // 409 = conflicto de versión: recargamos el detalle para traer la versión fresca.
            const out: Action[] = [cancelSettlementFailure({ error })];
            if (e.status === 409) out.push(loadSettlement({ id }));
            return from(out);
          }),
        ),
      ),
    ),
  );

  registerSettlementCollection$ = createEffect(() =>
    this.actions$.pipe(
      ofType(registerSettlementCollection),
      concatMap(({ id, body }) =>
        this.api.registerSettlementCollection(id, body).pipe(
          map(settlement => {
            this.notif.success('Cobro de liquidación registrado.');
            return registerSettlementCollectionSuccess({ settlement });
          }),
          catchError((e: HttpErrorResponse) => {
            const error = mapLifecycleError(e, 'registrar el cobro de');
            this.notif.error(error);
            const out: Action[] = [registerSettlementCollectionFailure({ error })];
            if (e.status === 409) out.push(loadSettlement({ id }));
            return from(out);
          }),
        ),
      ),
    ),
  );

  /** Tras informar, anular o cobrar, recargamos el detalle para reflejar el nuevo estado. */
  reloadAfterLifecycle$ = createEffect(() =>
    this.actions$.pipe(
      ofType(informSettlementSuccess, cancelSettlementSuccess, registerSettlementCollectionSuccess),
      map(action => 'settlement' in action
        ? loadSettlement({ id: action.settlement.id })
        : loadSettlement({ id: action.id })),
    ),
  );

  loadPendingServices$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadPendingServices),
      switchMap(() =>
        this.api.listPendingServices().pipe(
          map(res => isNotModified(res)
            ? loadPendingServicesNotModified()
            : loadPendingServicesSuccess({ items: res })),
          catchError(() => of(loadPendingServicesFailure({ error: 'No se pudieron cargar las prestaciones pendientes.' }))),
        ),
      ),
    ),
  );

  loadInsurersIndex$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadInsurersIndex),
      switchMap(() =>
        this.os.search({ state: 'active', page: 0, size: 500 }).pipe(
          // Ya no existen aseguradoras 'Particular' (SELF_PAY eliminado, KAN-177): el índice trae todas las OS.
          map(res => loadInsurersIndexSuccess({
            insurers: res.content,
          })),
          catchError(() => of(loadInsurersIndexFailure({ error: 'No se pudieron cargar las obras sociales.' }))),
        ),
      ),
    ),
  );

  // Planes de la OS con arancel + convenio vigente (endpoint dedicado de settlements).
  // Puebla el multiselect Y la lista de convenios del paso Datos.
  loadInsurerPlans$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadInsurerPlans),
      switchMap(({ insurerId }) =>
        this.api.listSettlementPlans(insurerId).pipe(
          map(plans => loadInsurerPlansSuccess({
            plans: plans.map(p => ({
              id: p.planId, name: p.planName, iva: p.iva ?? 0,
              arancel: p.arancel, hasActiveAgreement: p.hasActiveAgreement,
            })),
          })),
          catchError(() => of(loadInsurerPlansFailure({ error: 'No se pudieron cargar los planes de la obra social.' }))),
        ),
      ),
    ),
  );

  /** Exportar a Excel: consume el blob y dispara la descarga en el browser. */
  exportSettlement$ = createEffect(() =>
    this.actions$.pipe(
      ofType(exportSettlement),
      concatMap(({ id, settlementNumber }) =>
        this.api.exportSettlement(id).pipe(
          map(res => {
            triggerDownload(res, `liquidacion-${settlementNumber}.xlsx`);
            return exportSettlementSuccess();
          }),
          catchError(() => {
            const error = 'No se pudo exportar la liquidación a Excel. Probá de nuevo.';
            this.notif.error(error);
            return of(exportSettlementFailure({ error }));
          }),
        ),
      ),
    ),
  );

  /** Preview detallado: switchMap → cada toggle cancela el preview anterior en vuelo. */
  loadPreviewDetail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadPreviewDetail),
      switchMap(({ body }) =>
        this.api.previewDetail(body).pipe(
          map(preview => loadPreviewDetailSuccess({ preview })),
          catchError(() => of(loadPreviewDetailFailure({ error: 'No se pudieron calcular las prestaciones de la liquidación.' }))),
        ),
      ),
    ),
  );
}
