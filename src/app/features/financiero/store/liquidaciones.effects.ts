import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { from, of } from 'rxjs';
import { catchError, concatMap, map, switchMap } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { isNotModified } from '@core/refresh';
import { NotificationService } from '@core/services/notification.service';
import { LiquidacionesApiService } from '../services/liquidaciones-api.service';
import { ObraSocialService } from '@features/obras-sociales/services/obra-social.service';
import {
  loadSettlements, loadSettlementsSuccess, loadSettlementsNotModified, loadSettlementsFailure,
  loadSettlement, loadSettlementSuccess, loadSettlementFailure,
  generateSettlement, generateSettlementSuccess, generateSettlementFailure,
  informSettlement, informSettlementSuccess, informSettlementFailure,
  cancelSettlement, cancelSettlementSuccess, cancelSettlementFailure,
  loadPendingServices, loadPendingServicesSuccess, loadPendingServicesNotModified, loadPendingServicesFailure,
  loadInsurersIndex, loadInsurersIndexSuccess, loadInsurersIndexFailure,
  loadInsurerPlans, loadInsurerPlansSuccess, loadInsurerPlansFailure,
  loadPreviewDetail, loadPreviewDetailSuccess, loadPreviewDetailFailure,
  exportSettlement, exportSettlementSuccess, exportSettlementFailure,
} from './financiero.actions';
import { HttpResponse } from '@angular/common/http';

function mapLoadError(): string {
  return 'No se pudieron cargar las liquidaciones. Probá de nuevo.';
}

function mapGenerateError(e: HttpErrorResponse): string {
  if (e.status === 422) return 'No hay prestaciones pendientes para esa obra social y período.';
  if (e.status === 409) return 'Ya existe una liquidación para esa obra social y ese período.';
  return 'No se pudo generar la liquidación. Probá de nuevo.';
}

function mapLifecycleError(e: HttpErrorResponse, accion: 'informar' | 'anular'): string {
  if (e.status === 404) return 'La liquidación no existe.';
  if (e.status === 409) return 'La liquidación fue modificada por otra operación. Recargá la página y volvé a intentar.';
  if (e.status === 422) {
    return accion === 'informar'
      ? 'No se puede informar la liquidación en su estado actual.'
      : 'No se puede anular la liquidación en su estado actual.';
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

  /** Tras informar o anular, recargamos el detalle para reflejar el nuevo estado. */
  reloadAfterLifecycle$ = createEffect(() =>
    this.actions$.pipe(
      ofType(informSettlementSuccess, cancelSettlementSuccess),
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
          map(res => loadInsurersIndexSuccess({ insurers: res.content })),
          catchError(() => of(loadInsurersIndexFailure({ error: 'No se pudieron cargar las obras sociales.' }))),
        ),
      ),
    ),
  );

  loadInsurerPlans$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadInsurerPlans),
      switchMap(({ insurerId }) =>
        this.os.getCompleteById(insurerId).pipe(
          map(complete => loadInsurerPlansSuccess({
            plans: complete.plans.map(p => ({ id: p.id, name: p.name, iva: p.iva })),
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
            this.triggerDownload(res, settlementNumber);
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

  /** Lee el nombre de archivo del Content-Disposition (o cae a un default) y descarga el blob. */
  private triggerDownload(res: HttpResponse<Blob>, settlementNumber: number): void {
    const body = res.body;
    if (!body) throw new Error('empty body');
    const disposition = res.headers.get('Content-Disposition') ?? '';
    const filename = this.filenameFromDisposition(disposition)
      ?? `liquidacion-${settlementNumber}.xlsx`;
    const url = URL.createObjectURL(body);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  private filenameFromDisposition(disposition: string): string | null {
    // Soporta filename*=UTF-8''... y filename="...".
    const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(disposition);
    if (star?.[1]) return decodeURIComponent(star[1].replace(/['"]/g, '').trim());
    const plain = /filename="?([^";]+)"?/i.exec(disposition);
    return plain?.[1]?.trim() ?? null;
  }

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
