import { describe, expect, it } from 'vitest';
import { financieroMetricsReducer, initialState } from './reducer';
import { FinancieroMetricsState } from './state';
import * as A from './actions';

const kpis = [{ key: 'k', label: 'K', value: 1, unit: '$' }];
const breakdown = { dimension: 'd', slices: [{ key: 's', label: 'S', value: 1 }] };
// `unit: 'currency'` acá a propósito (no sólo labels/datasets): el test parametrizado de
// abajo hace `toEqual(c.data)` sobre el estado post-success/post-notModified — si el
// reducer alguna vez reconstruyera el objeto en vez de guardarlo tal cual, este campo se
// perdería y el `toEqual` lo detectaría (KAN-252, wiring de `unit` end-to-end).
const series = { unit: 'currency', labels: ['a'], datasets: [{ key: 'ds', label: 'DS', values: [1] }] };

/** Las 14 tuplas (key del state, load/success/notModified/failure) que cubre el reducer. */
const cases: {
  key: keyof FinancieroMetricsState;
  data: unknown;
  load: () => ReturnType<typeof A.loadRecaudacionKpis>;
  success: (data: unknown) => { type: string };
  notModified: () => { type: string };
  failure: (error: string) => { type: string };
}[] = [
  { key: 'recaudacionKpis', data: kpis, load: () => A.loadRecaudacionKpis({ filter: f }), success: (d) => A.loadRecaudacionKpisSuccess({ data: d as typeof kpis }), notModified: A.loadRecaudacionKpisNotModified, failure: (e) => A.loadRecaudacionKpisFailure({ error: e }) },
  { key: 'recaudacionSerie', data: series, load: () => A.loadRecaudacionSerie({ filter: f }), success: (d) => A.loadRecaudacionSerieSuccess({ data: d as typeof series }), notModified: A.loadRecaudacionSerieNotModified, failure: (e) => A.loadRecaudacionSerieFailure({ error: e }) },
  { key: 'recaudacionPorMetodo', data: breakdown, load: () => A.loadRecaudacionPorMetodo({ filter: f }), success: (d) => A.loadRecaudacionPorMetodoSuccess({ data: d as typeof breakdown }), notModified: A.loadRecaudacionPorMetodoNotModified, failure: (e) => A.loadRecaudacionPorMetodoFailure({ error: e }) },
  { key: 'recaudacionPorSucursal', data: breakdown, load: () => A.loadRecaudacionPorSucursal({ filter: f }), success: (d) => A.loadRecaudacionPorSucursalSuccess({ data: d as typeof breakdown }), notModified: A.loadRecaudacionPorSucursalNotModified, failure: (e) => A.loadRecaudacionPorSucursalFailure({ error: e }) },
  { key: 'facturacionKpis', data: kpis, load: () => A.loadFacturacionKpis({ filter: f }), success: (d) => A.loadFacturacionKpisSuccess({ data: d as typeof kpis }), notModified: A.loadFacturacionKpisNotModified, failure: (e) => A.loadFacturacionKpisFailure({ error: e }) },
  { key: 'facturacionPorCobertura', data: breakdown, load: () => A.loadFacturacionPorCobertura({ filter: f }), success: (d) => A.loadFacturacionPorCoberturaSuccess({ data: d as typeof breakdown }), notModified: A.loadFacturacionPorCoberturaNotModified, failure: (e) => A.loadFacturacionPorCoberturaFailure({ error: e }) },
  { key: 'liquidacionesKpis', data: kpis, load: () => A.loadLiquidacionesKpis({ filter: f }), success: (d) => A.loadLiquidacionesKpisSuccess({ data: d as typeof kpis }), notModified: A.loadLiquidacionesKpisNotModified, failure: (e) => A.loadLiquidacionesKpisFailure({ error: e }) },
  { key: 'liquidacionesPorObraSocial', data: breakdown, load: () => A.loadLiquidacionesPorObraSocial({ filter: f }), success: (d) => A.loadLiquidacionesPorObraSocialSuccess({ data: d as typeof breakdown }), notModified: A.loadLiquidacionesPorObraSocialNotModified, failure: (e) => A.loadLiquidacionesPorObraSocialFailure({ error: e }) },
  { key: 'cajaKpis', data: kpis, load: () => A.loadCajaKpis({ filter: f }), success: (d) => A.loadCajaKpisSuccess({ data: d as typeof kpis }), notModified: A.loadCajaKpisNotModified, failure: (e) => A.loadCajaKpisFailure({ error: e }) },
  { key: 'cajaPorSucursal', data: breakdown, load: () => A.loadCajaPorSucursal({ filter: f }), success: (d) => A.loadCajaPorSucursalSuccess({ data: d as typeof breakdown }), notModified: A.loadCajaPorSucursalNotModified, failure: (e) => A.loadCajaPorSucursalFailure({ error: e }) },
  { key: 'conciliacionKpis', data: kpis, load: () => A.loadConciliacionKpis({ filter: f }), success: (d) => A.loadConciliacionKpisSuccess({ data: d as typeof kpis }), notModified: A.loadConciliacionKpisNotModified, failure: (e) => A.loadConciliacionKpisFailure({ error: e }) },
  { key: 'conciliacionPorMetodo', data: breakdown, load: () => A.loadConciliacionPorMetodo({ filter: f }), success: (d) => A.loadConciliacionPorMetodoSuccess({ data: d as typeof breakdown }), notModified: A.loadConciliacionPorMetodoNotModified, failure: (e) => A.loadConciliacionPorMetodoFailure({ error: e }) },
  { key: 'tesoreriaKpis', data: kpis, load: () => A.loadTesoreriaKpis({ filter: f }), success: (d) => A.loadTesoreriaKpisSuccess({ data: d as typeof kpis }), notModified: A.loadTesoreriaKpisNotModified, failure: (e) => A.loadTesoreriaKpisFailure({ error: e }) },
  { key: 'tesoreriaPorOrigen', data: breakdown, load: () => A.loadTesoreriaPorOrigen({ filter: f }), success: (d) => A.loadTesoreriaPorOrigenSuccess({ data: d as typeof breakdown }), notModified: A.loadTesoreriaPorOrigenNotModified, failure: (e) => A.loadTesoreriaPorOrigenFailure({ error: e }) },
];

const f = { dateFrom: '2026-06-01', dateTo: '2026-06-30', granularity: 'DAY' as const };

describe('financieroMetricsReducer', () => {
  it('estado inicial: los 14 recursos arrancan vacíos, sin loading ni error', () => {
    for (const c of cases) {
      expect(initialState[c.key]).toEqual({ data: null, loading: false, error: null });
    }
  });

  it.each(cases)('$key: load → loading true, success → data + loading false, notModified solo apaga loading, failure guarda error', (c) => {
    const loading = financieroMetricsReducer(initialState, c.load());
    expect((loading[c.key] as { loading: boolean }).loading).toBe(true);
    expect((loading[c.key] as { error: string | null }).error).toBeNull();

    const ok = financieroMetricsReducer(loading, c.success(c.data) as never);
    expect((ok[c.key] as { data: unknown }).data).toEqual(c.data);
    expect((ok[c.key] as { loading: boolean }).loading).toBe(false);

    // 304: la data existente se mantiene, solo se apaga loading.
    const reloading = financieroMetricsReducer(ok, c.load());
    const notModified = financieroMetricsReducer(reloading, c.notModified() as never);
    expect((notModified[c.key] as { data: unknown }).data).toEqual(c.data);
    expect((notModified[c.key] as { loading: boolean }).loading).toBe(false);

    const failed = financieroMetricsReducer(loading, c.failure('Error de prueba') as never);
    expect((failed[c.key] as { loading: boolean }).loading).toBe(false);
    expect((failed[c.key] as { error: string | null }).error).toBe('Error de prueba');
  });

  it('cada recurso es independiente — cargar recaudación no toca tesorería', () => {
    const s = financieroMetricsReducer(initialState, A.loadRecaudacionKpis({ filter: f }));
    expect(s.recaudacionKpis.loading).toBe(true);
    expect(s.tesoreriaKpis.loading).toBe(false);
  });
});
