import * as A from './analitica-metrics.actions';
import { analiticaMetricsReducer } from './analitica-metrics.reducer';
import {
  initialAnaliticaMetricsState, initialPostanaliticaTabData, initialPreanaliticaTabData, initialVolumenTabData,
} from './analitica-metrics.state';

describe('analiticaMetricsReducer', () => {

  // ── Volumen tab ────────────────────────────────────────────────────────────
  it('loadVolumenTab sets loading=true and clears error', () => {
    const start = { ...initialAnaliticaMetricsState, volumenError: 'error previo' };
    const next = analiticaMetricsReducer(start, A.loadVolumenTab({
      filter: { dateFrom: '2026-06-01', dateTo: '2026-06-30', granularity: 'DAY' },
    }));
    expect(next.volumenLoading).toBe(true);
    expect(next.volumenError).toBeNull();
  });

  it('loadVolumenTabSuccess reemplaza volumen y limpia loading', () => {
    const kpi = { key: 'volumen-total', label: 'Volumen total', value: 120, unit: 'determinaciones' };
    const data = { ...initialVolumenTabData, volumen: { kpi, series: { labels: [], datasets: [] } } };
    const s = analiticaMetricsReducer(
      { ...initialAnaliticaMetricsState, volumenLoading: true },
      A.loadVolumenTabSuccess({ data }),
    );
    expect(s.volumen).toBe(data);
    expect(s.volumenLoading).toBe(false);
  });

  it('loadVolumenTabFailure guarda el error y limpia loading', () => {
    const s = analiticaMetricsReducer(
      { ...initialAnaliticaMetricsState, volumenLoading: true },
      A.loadVolumenTabFailure({ error: 'No se pudieron cargar las métricas. Intentá de nuevo.' }),
    );
    expect(s.volumenError).toBe('No se pudieron cargar las métricas. Intentá de nuevo.');
    expect(s.volumenLoading).toBe(false);
  });

  it('loadVolumenTab NO vuelve a prender loading en un poll/filtro posterior a la primera carga (evita el flash de todos los gráficos)', () => {
    const kpi = { key: 'volumen-total', label: 'Volumen total', value: 120, unit: 'determinaciones' };
    const data = { ...initialVolumenTabData, volumen: { kpi, series: { labels: [], datasets: [] } } };
    const afterFirstLoad = analiticaMetricsReducer(
      initialAnaliticaMetricsState,
      A.loadVolumenTabSuccess({ data }),
    );
    const next = analiticaMetricsReducer(afterFirstLoad, A.loadVolumenTab({
      filter: { dateFrom: '2026-06-01', dateTo: '2026-06-30', granularity: 'DAY' },
    }));
    expect(next.volumenLoading).toBe(false);
  });

  // ── Preanalítica tab ─────────────────────────────────────────────────────
  it('loadPreanaliticaTab sets loading=true and clears error', () => {
    const start = { ...initialAnaliticaMetricsState, preanaliticaError: 'error previo' };
    const next = analiticaMetricsReducer(start, A.loadPreanaliticaTab({
      filter: { dateFrom: '2026-06-01', dateTo: '2026-06-30', granularity: 'DAY' },
    }));
    expect(next.preanaliticaLoading).toBe(true);
    expect(next.preanaliticaError).toBeNull();
  });

  it('loadPreanaliticaTabSuccess reemplaza preanalitica y limpia loading', () => {
    const data = { ...initialPreanaliticaTabData, rechazoResumen: { key: 'rechazo', label: 'Tasa de rechazo', value: 3.2, unit: '%' } };
    const s = analiticaMetricsReducer(
      { ...initialAnaliticaMetricsState, preanaliticaLoading: true },
      A.loadPreanaliticaTabSuccess({ data }),
    );
    expect(s.preanalitica).toBe(data);
    expect(s.preanaliticaLoading).toBe(false);
  });

  it('loadPreanaliticaTabFailure guarda el error y limpia loading', () => {
    const s = analiticaMetricsReducer(
      { ...initialAnaliticaMetricsState, preanaliticaLoading: true },
      A.loadPreanaliticaTabFailure({ error: 'No tenés acceso a la sucursal seleccionada.' }),
    );
    expect(s.preanaliticaError).toBe('No tenés acceso a la sucursal seleccionada.');
    expect(s.preanaliticaLoading).toBe(false);
  });

  it('loadPreanaliticaTab NO vuelve a prender loading en un poll/filtro posterior a la primera carga', () => {
    const data = { ...initialPreanaliticaTabData, rechazoResumen: { key: 'rechazo', label: 'Tasa de rechazo', value: 3.2, unit: '%' } };
    const afterFirstLoad = analiticaMetricsReducer(
      initialAnaliticaMetricsState,
      A.loadPreanaliticaTabSuccess({ data }),
    );
    const next = analiticaMetricsReducer(afterFirstLoad, A.loadPreanaliticaTab({
      filter: { dateFrom: '2026-06-01', dateTo: '2026-06-30', granularity: 'DAY' },
    }));
    expect(next.preanaliticaLoading).toBe(false);
  });

  // ── Postanalítica tab ────────────────────────────────────────────────────
  it('loadPostanaliticaTab sets loading=true and clears error', () => {
    const start = { ...initialAnaliticaMetricsState, postanaliticaError: 'error previo' };
    const next = analiticaMetricsReducer(start, A.loadPostanaliticaTab({
      filter: { dateFrom: '2026-06-01', dateTo: '2026-06-30', granularity: 'DAY' },
    }));
    expect(next.postanaliticaLoading).toBe(true);
    expect(next.postanaliticaError).toBeNull();
  });

  it('loadPostanaliticaTabSuccess reemplaza postanalitica y limpia loading', () => {
    const data = { ...initialPostanaliticaTabData, estudiosTotal: { key: 'total', label: 'Estudios', value: 40, unit: 'estudios' } };
    const s = analiticaMetricsReducer(
      { ...initialAnaliticaMetricsState, postanaliticaLoading: true },
      A.loadPostanaliticaTabSuccess({ data }),
    );
    expect(s.postanalitica).toBe(data);
    expect(s.postanaliticaLoading).toBe(false);
  });

  it('loadPostanaliticaTabFailure guarda el error y limpia loading', () => {
    const s = analiticaMetricsReducer(
      { ...initialAnaliticaMetricsState, postanaliticaLoading: true },
      A.loadPostanaliticaTabFailure({ error: 'No se pudieron cargar las métricas. Intentá de nuevo.' }),
    );
    expect(s.postanaliticaError).toBe('No se pudieron cargar las métricas. Intentá de nuevo.');
    expect(s.postanaliticaLoading).toBe(false);
  });

  it('loadPostanaliticaTab NO vuelve a prender loading en un poll/filtro posterior a la primera carga', () => {
    const data = { ...initialPostanaliticaTabData, estudiosTotal: { key: 'total', label: 'Estudios', value: 40, unit: 'estudios' } };
    const afterFirstLoad = analiticaMetricsReducer(
      initialAnaliticaMetricsState,
      A.loadPostanaliticaTabSuccess({ data }),
    );
    const next = analiticaMetricsReducer(afterFirstLoad, A.loadPostanaliticaTab({
      filter: { dateFrom: '2026-06-01', dateTo: '2026-06-30', granularity: 'DAY' },
    }));
    expect(next.postanaliticaLoading).toBe(false);
  });
});
