import { createAction, props } from '@ngrx/store';
// NOTA: import directo del modelo, no del barrel `@shared/metrics` — ver state.ts.
import { MetricBreakdown, MetricKpi, MetricSeries } from '@shared/metrics/models/metric-envelopes.model';
import { MetricFilter } from '@shared/metrics/models/metric-filter.model';

// ── Recaudación (MFI-01) ─────────────────────────────────────────────────────
export const loadRecaudacionKpis = createAction(
  '[Financiero Metrics Recaudación] Load Kpis', props<{ filter: MetricFilter }>());
export const loadRecaudacionKpisSuccess = createAction(
  '[Financiero Metrics Recaudación API] Load Kpis Success', props<{ data: MetricKpi[] }>());
export const loadRecaudacionKpisNotModified = createAction(
  '[Financiero Metrics Recaudación API] Load Kpis Not Modified');
export const loadRecaudacionKpisFailure = createAction(
  '[Financiero Metrics Recaudación API] Load Kpis Failure', props<{ error: string }>());

export const loadRecaudacionSerie = createAction(
  '[Financiero Metrics Recaudación] Load Serie', props<{ filter: MetricFilter }>());
export const loadRecaudacionSerieSuccess = createAction(
  '[Financiero Metrics Recaudación API] Load Serie Success', props<{ data: MetricSeries }>());
export const loadRecaudacionSerieNotModified = createAction(
  '[Financiero Metrics Recaudación API] Load Serie Not Modified');
export const loadRecaudacionSerieFailure = createAction(
  '[Financiero Metrics Recaudación API] Load Serie Failure', props<{ error: string }>());

export const loadRecaudacionPorMetodo = createAction(
  '[Financiero Metrics Recaudación] Load Por Metodo', props<{ filter: MetricFilter }>());
export const loadRecaudacionPorMetodoSuccess = createAction(
  '[Financiero Metrics Recaudación API] Load Por Metodo Success', props<{ data: MetricBreakdown }>());
export const loadRecaudacionPorMetodoNotModified = createAction(
  '[Financiero Metrics Recaudación API] Load Por Metodo Not Modified');
export const loadRecaudacionPorMetodoFailure = createAction(
  '[Financiero Metrics Recaudación API] Load Por Metodo Failure', props<{ error: string }>());

export const loadRecaudacionPorSucursal = createAction(
  '[Financiero Metrics Recaudación] Load Por Sucursal', props<{ filter: MetricFilter }>());
export const loadRecaudacionPorSucursalSuccess = createAction(
  '[Financiero Metrics Recaudación API] Load Por Sucursal Success', props<{ data: MetricBreakdown }>());
export const loadRecaudacionPorSucursalNotModified = createAction(
  '[Financiero Metrics Recaudación API] Load Por Sucursal Not Modified');
export const loadRecaudacionPorSucursalFailure = createAction(
  '[Financiero Metrics Recaudación API] Load Por Sucursal Failure', props<{ error: string }>());

// ── Facturación (MFI-02) ─────────────────────────────────────────────────────
export const loadFacturacionKpis = createAction(
  '[Financiero Metrics Facturación] Load Kpis', props<{ filter: MetricFilter }>());
export const loadFacturacionKpisSuccess = createAction(
  '[Financiero Metrics Facturación API] Load Kpis Success', props<{ data: MetricKpi[] }>());
export const loadFacturacionKpisNotModified = createAction(
  '[Financiero Metrics Facturación API] Load Kpis Not Modified');
export const loadFacturacionKpisFailure = createAction(
  '[Financiero Metrics Facturación API] Load Kpis Failure', props<{ error: string }>());

export const loadFacturacionPorCobertura = createAction(
  '[Financiero Metrics Facturación] Load Por Cobertura', props<{ filter: MetricFilter }>());
export const loadFacturacionPorCoberturaSuccess = createAction(
  '[Financiero Metrics Facturación API] Load Por Cobertura Success', props<{ data: MetricBreakdown }>());
export const loadFacturacionPorCoberturaNotModified = createAction(
  '[Financiero Metrics Facturación API] Load Por Cobertura Not Modified');
export const loadFacturacionPorCoberturaFailure = createAction(
  '[Financiero Metrics Facturación API] Load Por Cobertura Failure', props<{ error: string }>());

// ── Liquidaciones (MFI-03) ───────────────────────────────────────────────────
export const loadLiquidacionesKpis = createAction(
  '[Financiero Metrics Liquidaciones] Load Kpis', props<{ filter: MetricFilter }>());
export const loadLiquidacionesKpisSuccess = createAction(
  '[Financiero Metrics Liquidaciones API] Load Kpis Success', props<{ data: MetricKpi[] }>());
export const loadLiquidacionesKpisNotModified = createAction(
  '[Financiero Metrics Liquidaciones API] Load Kpis Not Modified');
export const loadLiquidacionesKpisFailure = createAction(
  '[Financiero Metrics Liquidaciones API] Load Kpis Failure', props<{ error: string }>());

export const loadLiquidacionesPorObraSocial = createAction(
  '[Financiero Metrics Liquidaciones] Load Por Obra Social', props<{ filter: MetricFilter }>());
export const loadLiquidacionesPorObraSocialSuccess = createAction(
  '[Financiero Metrics Liquidaciones API] Load Por Obra Social Success', props<{ data: MetricBreakdown }>());
export const loadLiquidacionesPorObraSocialNotModified = createAction(
  '[Financiero Metrics Liquidaciones API] Load Por Obra Social Not Modified');
export const loadLiquidacionesPorObraSocialFailure = createAction(
  '[Financiero Metrics Liquidaciones API] Load Por Obra Social Failure', props<{ error: string }>());

// ── Caja (MFI-04) ────────────────────────────────────────────────────────────
export const loadCajaKpis = createAction(
  '[Financiero Metrics Caja] Load Kpis', props<{ filter: MetricFilter }>());
export const loadCajaKpisSuccess = createAction(
  '[Financiero Metrics Caja API] Load Kpis Success', props<{ data: MetricKpi[] }>());
export const loadCajaKpisNotModified = createAction(
  '[Financiero Metrics Caja API] Load Kpis Not Modified');
export const loadCajaKpisFailure = createAction(
  '[Financiero Metrics Caja API] Load Kpis Failure', props<{ error: string }>());

export const loadCajaPorSucursal = createAction(
  '[Financiero Metrics Caja] Load Por Sucursal', props<{ filter: MetricFilter }>());
export const loadCajaPorSucursalSuccess = createAction(
  '[Financiero Metrics Caja API] Load Por Sucursal Success', props<{ data: MetricBreakdown }>());
export const loadCajaPorSucursalNotModified = createAction(
  '[Financiero Metrics Caja API] Load Por Sucursal Not Modified');
export const loadCajaPorSucursalFailure = createAction(
  '[Financiero Metrics Caja API] Load Por Sucursal Failure', props<{ error: string }>());

// ── Conciliación (MFI-05) ────────────────────────────────────────────────────
export const loadConciliacionKpis = createAction(
  '[Financiero Metrics Conciliación] Load Kpis', props<{ filter: MetricFilter }>());
export const loadConciliacionKpisSuccess = createAction(
  '[Financiero Metrics Conciliación API] Load Kpis Success', props<{ data: MetricKpi[] }>());
export const loadConciliacionKpisNotModified = createAction(
  '[Financiero Metrics Conciliación API] Load Kpis Not Modified');
export const loadConciliacionKpisFailure = createAction(
  '[Financiero Metrics Conciliación API] Load Kpis Failure', props<{ error: string }>());

export const loadConciliacionPorMetodo = createAction(
  '[Financiero Metrics Conciliación] Load Por Metodo', props<{ filter: MetricFilter }>());
export const loadConciliacionPorMetodoSuccess = createAction(
  '[Financiero Metrics Conciliación API] Load Por Metodo Success', props<{ data: MetricBreakdown }>());
export const loadConciliacionPorMetodoNotModified = createAction(
  '[Financiero Metrics Conciliación API] Load Por Metodo Not Modified');
export const loadConciliacionPorMetodoFailure = createAction(
  '[Financiero Metrics Conciliación API] Load Por Metodo Failure', props<{ error: string }>());

// ── Tesorería (MFI-06) ───────────────────────────────────────────────────────
export const loadTesoreriaKpis = createAction(
  '[Financiero Metrics Tesorería] Load Kpis', props<{ filter: MetricFilter }>());
export const loadTesoreriaKpisSuccess = createAction(
  '[Financiero Metrics Tesorería API] Load Kpis Success', props<{ data: MetricKpi[] }>());
export const loadTesoreriaKpisNotModified = createAction(
  '[Financiero Metrics Tesorería API] Load Kpis Not Modified');
export const loadTesoreriaKpisFailure = createAction(
  '[Financiero Metrics Tesorería API] Load Kpis Failure', props<{ error: string }>());

export const loadTesoreriaPorOrigen = createAction(
  '[Financiero Metrics Tesorería] Load Por Origen', props<{ filter: MetricFilter }>());
export const loadTesoreriaPorOrigenSuccess = createAction(
  '[Financiero Metrics Tesorería API] Load Por Origen Success', props<{ data: MetricBreakdown }>());
export const loadTesoreriaPorOrigenNotModified = createAction(
  '[Financiero Metrics Tesorería API] Load Por Origen Not Modified');
export const loadTesoreriaPorOrigenFailure = createAction(
  '[Financiero Metrics Tesorería API] Load Por Origen Failure', props<{ error: string }>());

/** Dispara las 14 cargas del dashboard con un único `MetricFilter` (filtro + poll). */
export const loadFinancieroMetricsDashboard = createAction(
  '[Financiero Metrics Dashboard] Load All', props<{ filter: MetricFilter }>());
