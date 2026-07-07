import { flujoMetricsReducer } from './flujo-metrics.reducer';
import { initialFlujoMetricsState } from './flujo-metrics.state';
import { loadFlujoEnVivo, loadFlujoEnVivoSuccess, loadFlujoHistorico, loadFlujoHistoricoSuccess } from './flujo-metrics.actions';
import { FetchResult } from './flujo-metrics-fetch.util';
import { MetricBreakdown, MetricFilter, MetricKpi } from '@shared/metrics';
import { VolumenTurnosResponse } from '../../models/flujo-metrics.model';

const filter: MetricFilter = { dateFrom: '2026-07-01', dateTo: '2026-07-07', granularity: 'DAY' };

const kpi = (value: number): MetricKpi => ({ key: 'k', label: 'L', value, unit: '' });

const volumenTurnos: VolumenTurnosResponse = {
  total: kpi(10),
  series: { labels: ['L1'], datasets: [] },
  breakdown: null,
};

const success = <T>(data: T): FetchResult<T> => ({ kind: 'success', data });
const notModified = <T>(): FetchResult<T> => ({ kind: 'notModified' });
const error = <T>(message: string): FetchResult<T> => ({ kind: 'error', message });

const fullHistoricoResults = (overrides: Partial<Record<string, FetchResult<unknown>>> = {}) => ({
  volumenTurnos: success(volumenTurnos),
  volumenCola: success({ total: kpi(5), series: { labels: [], datasets: [] }, breakdown: null }),
  tasaCancelacion: success(kpi(2)),
  ocupacionAgenda: success({ ocupacion: kpi(80), series: { labels: [], datasets: [] } }),
  esperaLlamado: success({ avg: kpi(3), p50: kpi(2), p90: kpi(6) }),
  reLlamados: success({ promedio: kpi(1), breakdown: { dimension: 'reLlamados', slices: [] } as MetricBreakdown }),
  cargaExtractor: success({ dimension: 'extractor', slices: [] } as MetricBreakdown),
  ...overrides,
}) as never;

describe('flujoMetricsReducer — histórico', () => {
  it('loadFlujoHistorico marca loading=true solo en la carga inicial (sin datos)', () => {
    const state = flujoMetricsReducer(initialFlujoMetricsState, loadFlujoHistorico({ filter }));
    expect(state.historico.loading).toBe(true);
  });

  it('loadFlujoHistoricoSuccess vuelca los 7 resultados y apaga loading', () => {
    const state = flujoMetricsReducer(
      initialFlujoMetricsState,
      loadFlujoHistoricoSuccess({ results: fullHistoricoResults() }),
    );
    expect(state.historico.loading).toBe(false);
    expect(state.historico.volumenTurnos?.total.value).toBe(10);
    expect(state.historico.errors['volumenTurnos']).toBeNull();
  });

  it('notModified conserva el dato previo tal cual', () => {
    const loaded = flujoMetricsReducer(
      initialFlujoMetricsState,
      loadFlujoHistoricoSuccess({ results: fullHistoricoResults() }),
    );
    const polled = flujoMetricsReducer(
      loaded,
      loadFlujoHistoricoSuccess({ results: fullHistoricoResults({ volumenTurnos: notModified() }) }),
    );
    expect(polled.historico.volumenTurnos).toBe(loaded.historico.volumenTurnos);
  });

  it('un error en UNA métrica no pisa el dato bueno de las otras 6, y no descarta el dato previo de la que falló', () => {
    const loaded = flujoMetricsReducer(
      initialFlujoMetricsState,
      loadFlujoHistoricoSuccess({ results: fullHistoricoResults() }),
    );
    const polled = flujoMetricsReducer(
      loaded,
      loadFlujoHistoricoSuccess({
        results: fullHistoricoResults({ volumenTurnos: error('No tenés acceso a la sucursal seleccionada.') }),
      }),
    );
    // La métrica que falló conserva su último dato bueno + el mensaje de error.
    expect(polled.historico.volumenTurnos?.total.value).toBe(10);
    expect(polled.historico.errors['volumenTurnos']).toBe('No tenés acceso a la sucursal seleccionada.');
    // Las otras 6 métricas siguen intactas.
    expect(polled.historico.volumenCola?.total.value).toBe(5);
    expect(polled.historico.errors['volumenCola']).toBeNull();
  });
});

describe('flujoMetricsReducer — en vivo', () => {
  it('loadFlujoEnVivoSuccess vuelca los 3 resultados', () => {
    const state = flujoMetricsReducer(
      initialFlujoMetricsState,
      loadFlujoEnVivoSuccess({
        results: {
          colaExtraccionVivo: success(kpi(4)),
          ocupacionBoxesVivo: success(kpi(60)),
          urgentes: success({ dimension: 'urgentes', slices: [] } as MetricBreakdown),
        },
      }),
    );
    expect(state.enVivo.loading).toBe(false);
    expect(state.enVivo.colaExtraccionVivo?.value).toBe(4);
  });

  it('loadFlujoEnVivo marca loading=true solo en la carga inicial', () => {
    const state = flujoMetricsReducer(initialFlujoMetricsState, loadFlujoEnVivo({ branchId: undefined }));
    expect(state.enVivo.loading).toBe(true);
  });
});
