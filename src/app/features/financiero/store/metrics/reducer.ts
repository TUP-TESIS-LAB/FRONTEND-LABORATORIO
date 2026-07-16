import { createReducer, on } from '@ngrx/store';
import { FinancieroMetricsState, initialFinancieroMetricsState } from './state';
import {
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

export const initialState = initialFinancieroMetricsState;

/** `key` de `FinancieroMetricsState` a actualizar → loading. */
function loading<K extends keyof FinancieroMetricsState>(
  state: FinancieroMetricsState, key: K,
): FinancieroMetricsState {
  return { ...state, [key]: { ...state[key], loading: true, error: null } };
}

/** `key` → data recibida + loading false. */
function success<K extends keyof FinancieroMetricsState>(
  state: FinancieroMetricsState, key: K, data: FinancieroMetricsState[K]['data'],
): FinancieroMetricsState {
  return { ...state, [key]: { ...state[key], data, loading: false, error: null } as unknown as FinancieroMetricsState[K] };
}

/** `key` → 304, solo apaga loading (data existente se mantiene). */
function notModified<K extends keyof FinancieroMetricsState>(
  state: FinancieroMetricsState, key: K,
): FinancieroMetricsState {
  return { ...state, [key]: { ...state[key], loading: false } };
}

/** `key` → error mapeado en español, loading false. */
function failure<K extends keyof FinancieroMetricsState>(
  state: FinancieroMetricsState, key: K, error: string,
): FinancieroMetricsState {
  return { ...state, [key]: { ...state[key], loading: false, error } };
}

export const financieroMetricsReducer = createReducer(
  initialState,

  // ── Recaudación ──
  on(loadRecaudacionKpis, (s) => loading(s, 'recaudacionKpis')),
  on(loadRecaudacionKpisSuccess, (s, { data }) => success(s, 'recaudacionKpis', data)),
  on(loadRecaudacionKpisNotModified, (s) => notModified(s, 'recaudacionKpis')),
  on(loadRecaudacionKpisFailure, (s, { error }) => failure(s, 'recaudacionKpis', error)),

  on(loadRecaudacionSerie, (s) => loading(s, 'recaudacionSerie')),
  on(loadRecaudacionSerieSuccess, (s, { data }) => success(s, 'recaudacionSerie', data)),
  on(loadRecaudacionSerieNotModified, (s) => notModified(s, 'recaudacionSerie')),
  on(loadRecaudacionSerieFailure, (s, { error }) => failure(s, 'recaudacionSerie', error)),

  on(loadRecaudacionPorMetodo, (s) => loading(s, 'recaudacionPorMetodo')),
  on(loadRecaudacionPorMetodoSuccess, (s, { data }) => success(s, 'recaudacionPorMetodo', data)),
  on(loadRecaudacionPorMetodoNotModified, (s) => notModified(s, 'recaudacionPorMetodo')),
  on(loadRecaudacionPorMetodoFailure, (s, { error }) => failure(s, 'recaudacionPorMetodo', error)),

  on(loadRecaudacionPorSucursal, (s) => loading(s, 'recaudacionPorSucursal')),
  on(loadRecaudacionPorSucursalSuccess, (s, { data }) => success(s, 'recaudacionPorSucursal', data)),
  on(loadRecaudacionPorSucursalNotModified, (s) => notModified(s, 'recaudacionPorSucursal')),
  on(loadRecaudacionPorSucursalFailure, (s, { error }) => failure(s, 'recaudacionPorSucursal', error)),

  // ── Facturación ──
  on(loadFacturacionKpis, (s) => loading(s, 'facturacionKpis')),
  on(loadFacturacionKpisSuccess, (s, { data }) => success(s, 'facturacionKpis', data)),
  on(loadFacturacionKpisNotModified, (s) => notModified(s, 'facturacionKpis')),
  on(loadFacturacionKpisFailure, (s, { error }) => failure(s, 'facturacionKpis', error)),

  on(loadFacturacionPorCobertura, (s) => loading(s, 'facturacionPorCobertura')),
  on(loadFacturacionPorCoberturaSuccess, (s, { data }) => success(s, 'facturacionPorCobertura', data)),
  on(loadFacturacionPorCoberturaNotModified, (s) => notModified(s, 'facturacionPorCobertura')),
  on(loadFacturacionPorCoberturaFailure, (s, { error }) => failure(s, 'facturacionPorCobertura', error)),

  // ── Liquidaciones ──
  on(loadLiquidacionesKpis, (s) => loading(s, 'liquidacionesKpis')),
  on(loadLiquidacionesKpisSuccess, (s, { data }) => success(s, 'liquidacionesKpis', data)),
  on(loadLiquidacionesKpisNotModified, (s) => notModified(s, 'liquidacionesKpis')),
  on(loadLiquidacionesKpisFailure, (s, { error }) => failure(s, 'liquidacionesKpis', error)),

  on(loadLiquidacionesPorObraSocial, (s) => loading(s, 'liquidacionesPorObraSocial')),
  on(loadLiquidacionesPorObraSocialSuccess, (s, { data }) => success(s, 'liquidacionesPorObraSocial', data)),
  on(loadLiquidacionesPorObraSocialNotModified, (s) => notModified(s, 'liquidacionesPorObraSocial')),
  on(loadLiquidacionesPorObraSocialFailure, (s, { error }) => failure(s, 'liquidacionesPorObraSocial', error)),

  // ── Caja ──
  on(loadCajaKpis, (s) => loading(s, 'cajaKpis')),
  on(loadCajaKpisSuccess, (s, { data }) => success(s, 'cajaKpis', data)),
  on(loadCajaKpisNotModified, (s) => notModified(s, 'cajaKpis')),
  on(loadCajaKpisFailure, (s, { error }) => failure(s, 'cajaKpis', error)),

  on(loadCajaPorSucursal, (s) => loading(s, 'cajaPorSucursal')),
  on(loadCajaPorSucursalSuccess, (s, { data }) => success(s, 'cajaPorSucursal', data)),
  on(loadCajaPorSucursalNotModified, (s) => notModified(s, 'cajaPorSucursal')),
  on(loadCajaPorSucursalFailure, (s, { error }) => failure(s, 'cajaPorSucursal', error)),

  // ── Conciliación ──
  on(loadConciliacionKpis, (s) => loading(s, 'conciliacionKpis')),
  on(loadConciliacionKpisSuccess, (s, { data }) => success(s, 'conciliacionKpis', data)),
  on(loadConciliacionKpisNotModified, (s) => notModified(s, 'conciliacionKpis')),
  on(loadConciliacionKpisFailure, (s, { error }) => failure(s, 'conciliacionKpis', error)),

  on(loadConciliacionPorMetodo, (s) => loading(s, 'conciliacionPorMetodo')),
  on(loadConciliacionPorMetodoSuccess, (s, { data }) => success(s, 'conciliacionPorMetodo', data)),
  on(loadConciliacionPorMetodoNotModified, (s) => notModified(s, 'conciliacionPorMetodo')),
  on(loadConciliacionPorMetodoFailure, (s, { error }) => failure(s, 'conciliacionPorMetodo', error)),

  // ── Tesorería ──
  on(loadTesoreriaKpis, (s) => loading(s, 'tesoreriaKpis')),
  on(loadTesoreriaKpisSuccess, (s, { data }) => success(s, 'tesoreriaKpis', data)),
  on(loadTesoreriaKpisNotModified, (s) => notModified(s, 'tesoreriaKpis')),
  on(loadTesoreriaKpisFailure, (s, { error }) => failure(s, 'tesoreriaKpis', error)),

  on(loadTesoreriaPorOrigen, (s) => loading(s, 'tesoreriaPorOrigen')),
  on(loadTesoreriaPorOrigenSuccess, (s, { data }) => success(s, 'tesoreriaPorOrigen', data)),
  on(loadTesoreriaPorOrigenNotModified, (s) => notModified(s, 'tesoreriaPorOrigen')),
  on(loadTesoreriaPorOrigenFailure, (s, { error }) => failure(s, 'tesoreriaPorOrigen', error)),
);
