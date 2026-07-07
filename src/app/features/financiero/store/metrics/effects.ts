import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { from, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { isNotModified } from '@core/refresh';
import { FinancieroMetricsApiService } from '../../services/financiero-metrics-api.service';
import {
  loadFinancieroMetricsDashboard,
  loadRecaudacionKpis, loadRecaudacionKpisSuccess, loadRecaudacionKpisNotModified, loadRecaudacionKpisFailure,
  loadRecaudacionSerie, loadRecaudacionSerieSuccess, loadRecaudacionSerieNotModified, loadRecaudacionSerieFailure,
  loadRecaudacionPorMetodo, loadRecaudacionPorMetodoSuccess, loadRecaudacionPorMetodoNotModified, loadRecaudacionPorMetodoFailure,
  loadRecaudacionPorSucursal, loadRecaudacionPorSucursalSuccess, loadRecaudacionPorSucursalNotModified, loadRecaudacionPorSucursalFailure,
  loadFacturacionKpis, loadFacturacionKpisSuccess, loadFacturacionKpisNotModified, loadFacturacionKpisFailure,
  loadFacturacionPorCobertura, loadFacturacionPorCoberturaSuccess, loadFacturacionPorCoberturaNotModified, loadFacturacionPorCoberturaFailure,
  loadLiquidacionesKpis, loadLiquidacionesKpisSuccess, loadLiquidacionesKpisNotModified, loadLiquidacionesKpisFailure,
  loadLiquidacionesPorObraSocial, loadLiquidacionesPorObraSocialSuccess, loadLiquidacionesPorObraSocialNotModified, loadLiquidacionesPorObraSocialFailure,
  loadCajaKpis, loadCajaKpisSuccess, loadCajaKpisNotModified, loadCajaKpisFailure,
  loadCajaPorSucursal, loadCajaPorSucursalSuccess, loadCajaPorSucursalNotModified, loadCajaPorSucursalFailure,
  loadConciliacionKpis, loadConciliacionKpisSuccess, loadConciliacionKpisNotModified, loadConciliacionKpisFailure,
  loadConciliacionPorMetodo, loadConciliacionPorMetodoSuccess, loadConciliacionPorMetodoNotModified, loadConciliacionPorMetodoFailure,
  loadTesoreriaKpis, loadTesoreriaKpisSuccess, loadTesoreriaKpisNotModified, loadTesoreriaKpisFailure,
  loadTesoreriaPorOrigen, loadTesoreriaPorOrigenSuccess, loadTesoreriaPorOrigenNotModified, loadTesoreriaPorOrigenFailure,
} from './actions';

/** Regla #4: sin leak de internals. Cubre los 3 códigos que puede devolver el controller. */
function mapFinancieroMetricsError(e: HttpErrorResponse): string {
  if (e.status === 403) return 'No tenés acceso a la sucursal seleccionada.';
  if (e.status === 400) return 'El rango de fechas o los filtros elegidos no son válidos.';
  return 'Ocurrió un error al cargar las métricas. Intentá de nuevo.';
}

@Injectable()
export class FinancieroMetricsEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(FinancieroMetricsApiService);

  // ── Fan-out: un filtro → las 14 cargas del dashboard ────────────────────────
  loadDashboard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadFinancieroMetricsDashboard),
      switchMap(({ filter }) => from([
        loadRecaudacionKpis({ filter }),
        loadRecaudacionSerie({ filter }),
        loadRecaudacionPorMetodo({ filter }),
        loadRecaudacionPorSucursal({ filter }),
        loadFacturacionKpis({ filter }),
        loadFacturacionPorCobertura({ filter }),
        loadLiquidacionesKpis({ filter }),
        loadLiquidacionesPorObraSocial({ filter }),
        loadCajaKpis({ filter }),
        loadCajaPorSucursal({ filter }),
        loadConciliacionKpis({ filter }),
        loadConciliacionPorMetodo({ filter }),
        loadTesoreriaKpis({ filter }),
        loadTesoreriaPorOrigen({ filter }),
      ])),
    ),
  );

  // ── Recaudación ──────────────────────────────────────────────────────────
  loadRecaudacionKpis$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadRecaudacionKpis),
      switchMap(({ filter }) => this.api.getRevenueKpis(filter).pipe(
        map(res => isNotModified(res) ? loadRecaudacionKpisNotModified() : loadRecaudacionKpisSuccess({ data: res })),
        catchError((e: HttpErrorResponse) => of(loadRecaudacionKpisFailure({ error: mapFinancieroMetricsError(e) }))),
      )),
    ),
  );

  loadRecaudacionSerie$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadRecaudacionSerie),
      switchMap(({ filter }) => this.api.getRevenueSeries(filter).pipe(
        map(res => isNotModified(res) ? loadRecaudacionSerieNotModified() : loadRecaudacionSerieSuccess({ data: res })),
        catchError((e: HttpErrorResponse) => of(loadRecaudacionSerieFailure({ error: mapFinancieroMetricsError(e) }))),
      )),
    ),
  );

  loadRecaudacionPorMetodo$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadRecaudacionPorMetodo),
      switchMap(({ filter }) => this.api.getRevenueByMethod(filter).pipe(
        map(res => isNotModified(res) ? loadRecaudacionPorMetodoNotModified() : loadRecaudacionPorMetodoSuccess({ data: res })),
        catchError((e: HttpErrorResponse) => of(loadRecaudacionPorMetodoFailure({ error: mapFinancieroMetricsError(e) }))),
      )),
    ),
  );

  loadRecaudacionPorSucursal$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadRecaudacionPorSucursal),
      switchMap(({ filter }) => this.api.getRevenueByBranch(filter).pipe(
        map(res => isNotModified(res) ? loadRecaudacionPorSucursalNotModified() : loadRecaudacionPorSucursalSuccess({ data: res })),
        catchError((e: HttpErrorResponse) => of(loadRecaudacionPorSucursalFailure({ error: mapFinancieroMetricsError(e) }))),
      )),
    ),
  );

  // ── Facturación ──────────────────────────────────────────────────────────
  loadFacturacionKpis$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadFacturacionKpis),
      switchMap(({ filter }) => this.api.getBillingKpis(filter).pipe(
        map(res => isNotModified(res) ? loadFacturacionKpisNotModified() : loadFacturacionKpisSuccess({ data: res })),
        catchError((e: HttpErrorResponse) => of(loadFacturacionKpisFailure({ error: mapFinancieroMetricsError(e) }))),
      )),
    ),
  );

  loadFacturacionPorCobertura$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadFacturacionPorCobertura),
      switchMap(({ filter }) => this.api.getBillingByCoverage(filter).pipe(
        map(res => isNotModified(res) ? loadFacturacionPorCoberturaNotModified() : loadFacturacionPorCoberturaSuccess({ data: res })),
        catchError((e: HttpErrorResponse) => of(loadFacturacionPorCoberturaFailure({ error: mapFinancieroMetricsError(e) }))),
      )),
    ),
  );

  // ── Liquidaciones ────────────────────────────────────────────────────────
  loadLiquidacionesKpis$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadLiquidacionesKpis),
      switchMap(({ filter }) => this.api.getSettlementKpis(filter).pipe(
        map(res => isNotModified(res) ? loadLiquidacionesKpisNotModified() : loadLiquidacionesKpisSuccess({ data: res })),
        catchError((e: HttpErrorResponse) => of(loadLiquidacionesKpisFailure({ error: mapFinancieroMetricsError(e) }))),
      )),
    ),
  );

  loadLiquidacionesPorObraSocial$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadLiquidacionesPorObraSocial),
      switchMap(({ filter }) => this.api.getSettlementByInsurer(filter).pipe(
        map(res => isNotModified(res) ? loadLiquidacionesPorObraSocialNotModified() : loadLiquidacionesPorObraSocialSuccess({ data: res })),
        catchError((e: HttpErrorResponse) => of(loadLiquidacionesPorObraSocialFailure({ error: mapFinancieroMetricsError(e) }))),
      )),
    ),
  );

  // ── Caja ─────────────────────────────────────────────────────────────────
  loadCajaKpis$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadCajaKpis),
      switchMap(({ filter }) => this.api.getCashSessionKpis(filter).pipe(
        map(res => isNotModified(res) ? loadCajaKpisNotModified() : loadCajaKpisSuccess({ data: res })),
        catchError((e: HttpErrorResponse) => of(loadCajaKpisFailure({ error: mapFinancieroMetricsError(e) }))),
      )),
    ),
  );

  loadCajaPorSucursal$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadCajaPorSucursal),
      switchMap(({ filter }) => this.api.getCashSessionByBranch(filter).pipe(
        map(res => isNotModified(res) ? loadCajaPorSucursalNotModified() : loadCajaPorSucursalSuccess({ data: res })),
        catchError((e: HttpErrorResponse) => of(loadCajaPorSucursalFailure({ error: mapFinancieroMetricsError(e) }))),
      )),
    ),
  );

  // ── Conciliación ─────────────────────────────────────────────────────────
  loadConciliacionKpis$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadConciliacionKpis),
      switchMap(({ filter }) => this.api.getDigitalBatchKpis(filter).pipe(
        map(res => isNotModified(res) ? loadConciliacionKpisNotModified() : loadConciliacionKpisSuccess({ data: res })),
        catchError((e: HttpErrorResponse) => of(loadConciliacionKpisFailure({ error: mapFinancieroMetricsError(e) }))),
      )),
    ),
  );

  loadConciliacionPorMetodo$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadConciliacionPorMetodo),
      switchMap(({ filter }) => this.api.getDigitalBatchByMethod(filter).pipe(
        map(res => isNotModified(res) ? loadConciliacionPorMetodoNotModified() : loadConciliacionPorMetodoSuccess({ data: res })),
        catchError((e: HttpErrorResponse) => of(loadConciliacionPorMetodoFailure({ error: mapFinancieroMetricsError(e) }))),
      )),
    ),
  );

  // ── Tesorería ────────────────────────────────────────────────────────────
  loadTesoreriaKpis$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadTesoreriaKpis),
      switchMap(({ filter }) => this.api.getTreasuryKpis(filter).pipe(
        map(res => isNotModified(res) ? loadTesoreriaKpisNotModified() : loadTesoreriaKpisSuccess({ data: res })),
        catchError((e: HttpErrorResponse) => of(loadTesoreriaKpisFailure({ error: mapFinancieroMetricsError(e) }))),
      )),
    ),
  );

  loadTesoreriaPorOrigen$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadTesoreriaPorOrigen),
      switchMap(({ filter }) => this.api.getTreasuryByOrigin(filter).pipe(
        map(res => isNotModified(res) ? loadTesoreriaPorOrigenNotModified() : loadTesoreriaPorOrigenSuccess({ data: res })),
        catchError((e: HttpErrorResponse) => of(loadTesoreriaPorOrigenFailure({ error: mapFinancieroMetricsError(e) }))),
      )),
    ),
  );
}
