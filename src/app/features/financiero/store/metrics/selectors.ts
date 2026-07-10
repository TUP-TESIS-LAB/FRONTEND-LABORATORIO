import { createFeatureSelector, createSelector } from '@ngrx/store';
import { FINANCIERO_METRICS_FEATURE_KEY, FinancieroMetricsState } from './state';

export const selectFinancieroMetricsState =
  createFeatureSelector<FinancieroMetricsState>(FINANCIERO_METRICS_FEATURE_KEY);

// ── Recaudación ──
export const selectRecaudacionKpis = createSelector(selectFinancieroMetricsState, s => s.recaudacionKpis.data ?? []);
export const selectRecaudacionSerie = createSelector(selectFinancieroMetricsState, s => s.recaudacionSerie.data ?? undefined);
export const selectRecaudacionPorMetodo = createSelector(selectFinancieroMetricsState, s => s.recaudacionPorMetodo.data ?? undefined);
export const selectRecaudacionPorSucursal = createSelector(selectFinancieroMetricsState, s => s.recaudacionPorSucursal.data ?? undefined);

// ── Facturación ──
export const selectFacturacionKpis = createSelector(selectFinancieroMetricsState, s => s.facturacionKpis.data ?? []);
export const selectFacturacionPorCobertura = createSelector(selectFinancieroMetricsState, s => s.facturacionPorCobertura.data ?? undefined);

// ── Liquidaciones ──
export const selectLiquidacionesKpis = createSelector(selectFinancieroMetricsState, s => s.liquidacionesKpis.data ?? []);
export const selectLiquidacionesPorObraSocial = createSelector(selectFinancieroMetricsState, s => s.liquidacionesPorObraSocial.data ?? undefined);

// ── Caja ──
export const selectCajaKpis = createSelector(selectFinancieroMetricsState, s => s.cajaKpis.data ?? []);
export const selectCajaPorSucursal = createSelector(selectFinancieroMetricsState, s => s.cajaPorSucursal.data ?? undefined);

// ── Conciliación ──
export const selectConciliacionKpis = createSelector(selectFinancieroMetricsState, s => s.conciliacionKpis.data ?? []);
export const selectConciliacionPorMetodo = createSelector(selectFinancieroMetricsState, s => s.conciliacionPorMetodo.data ?? undefined);

// ── Tesorería ──
export const selectTesoreriaKpis = createSelector(selectFinancieroMetricsState, s => s.tesoreriaKpis.data ?? []);
export const selectTesoreriaPorOrigen = createSelector(selectFinancieroMetricsState, s => s.tesoreriaPorOrigen.data ?? undefined);

/** `true` mientras cualquiera de los 14 recursos está en vuelo — alimenta `ui-refresh-indicator`. */
export const selectFinancieroMetricsLoading = createSelector(selectFinancieroMetricsState, s => (
  s.recaudacionKpis.loading || s.recaudacionSerie.loading || s.recaudacionPorMetodo.loading || s.recaudacionPorSucursal.loading ||
  s.facturacionKpis.loading || s.facturacionPorCobertura.loading ||
  s.liquidacionesKpis.loading || s.liquidacionesPorObraSocial.loading ||
  s.cajaKpis.loading || s.cajaPorSucursal.loading ||
  s.conciliacionKpis.loading || s.conciliacionPorMetodo.loading ||
  s.tesoreriaKpis.loading || s.tesoreriaPorOrigen.loading
));

/** Primer error no-nulo entre los 14 recursos (orden de área: recaudación → tesorería). */
export const selectFinancieroMetricsError = createSelector(selectFinancieroMetricsState, s => (
  s.recaudacionKpis.error ?? s.recaudacionSerie.error ?? s.recaudacionPorMetodo.error ?? s.recaudacionPorSucursal.error ??
  s.facturacionKpis.error ?? s.facturacionPorCobertura.error ??
  s.liquidacionesKpis.error ?? s.liquidacionesPorObraSocial.error ??
  s.cajaKpis.error ?? s.cajaPorSucursal.error ??
  s.conciliacionKpis.error ?? s.conciliacionPorMetodo.error ??
  s.tesoreriaKpis.error ?? s.tesoreriaPorOrigen.error ??
  null
));
