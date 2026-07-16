import { describe, expect, it } from 'vitest';
import { initialFinancieroMetricsState, FINANCIERO_METRICS_FEATURE_KEY, FinancieroMetricsState } from './state';
import {
  selectRecaudacionKpis, selectRecaudacionSerie, selectRecaudacionPorMetodo, selectRecaudacionPorSucursal,
  selectFacturacionKpis, selectFacturacionPorCobertura,
  selectLiquidacionesKpis, selectLiquidacionesPorObraSocial,
  selectCajaKpis, selectCajaPorSucursal,
  selectConciliacionKpis, selectConciliacionPorMetodo,
  selectTesoreriaKpis, selectTesoreriaPorOrigen,
  selectFinancieroMetricsLoading, selectFinancieroMetricsError,
} from './selectors';

const kpis = [{ key: 'k', label: 'K', value: 1, unit: '$' }];
const breakdown = { dimension: 'd', slices: [{ key: 's', label: 'S', value: 1 }] };
const series = { labels: ['a'], datasets: [{ key: 'ds', label: 'DS', values: [1] }] };

function rootState(metrics: FinancieroMetricsState): { [FINANCIERO_METRICS_FEATURE_KEY]: FinancieroMetricsState } {
  return { [FINANCIERO_METRICS_FEATURE_KEY]: metrics };
}

describe('financiero metrics selectors', () => {
  it('con estado inicial, los KPI arrays son [] y los breakdown/series undefined (no null)', () => {
    const s = rootState(initialFinancieroMetricsState);
    expect(selectRecaudacionKpis(s)).toEqual([]);
    expect(selectFacturacionKpis(s)).toEqual([]);
    expect(selectLiquidacionesKpis(s)).toEqual([]);
    expect(selectCajaKpis(s)).toEqual([]);
    expect(selectConciliacionKpis(s)).toEqual([]);
    expect(selectTesoreriaKpis(s)).toEqual([]);
    expect(selectRecaudacionSerie(s)).toBeUndefined();
    expect(selectRecaudacionPorMetodo(s)).toBeUndefined();
    expect(selectRecaudacionPorSucursal(s)).toBeUndefined();
    expect(selectFacturacionPorCobertura(s)).toBeUndefined();
    expect(selectLiquidacionesPorObraSocial(s)).toBeUndefined();
    expect(selectCajaPorSucursal(s)).toBeUndefined();
    expect(selectConciliacionPorMetodo(s)).toBeUndefined();
    expect(selectTesoreriaPorOrigen(s)).toBeUndefined();
  });

  it('expone los datos cargados de cada recurso', () => {
    const metrics: FinancieroMetricsState = {
      ...initialFinancieroMetricsState,
      recaudacionKpis: { data: kpis, loading: false, error: null },
      recaudacionSerie: { data: series, loading: false, error: null },
      recaudacionPorMetodo: { data: breakdown, loading: false, error: null },
    };
    const s = rootState(metrics);
    expect(selectRecaudacionKpis(s)).toEqual(kpis);
    expect(selectRecaudacionSerie(s)).toEqual(series);
    expect(selectRecaudacionPorMetodo(s)).toEqual(breakdown);
  });

  it('selectFinancieroMetricsLoading es true si CUALQUIERA de los 14 está en vuelo', () => {
    expect(selectFinancieroMetricsLoading(rootState(initialFinancieroMetricsState))).toBe(false);

    const s = rootState({
      ...initialFinancieroMetricsState,
      tesoreriaPorOrigen: { data: null, loading: true, error: null },
    });
    expect(selectFinancieroMetricsLoading(s)).toBe(true);
  });

  it('selectFinancieroMetricsError devuelve null si ninguno falló, o el primer error en orden de área', () => {
    expect(selectFinancieroMetricsError(rootState(initialFinancieroMetricsState))).toBeNull();

    const s = rootState({
      ...initialFinancieroMetricsState,
      cajaKpis: { data: null, loading: false, error: 'Error de caja' },
      tesoreriaKpis: { data: null, loading: false, error: 'Error de tesorería' },
    });
    expect(selectFinancieroMetricsError(s)).toBe('Error de caja');
  });
});
