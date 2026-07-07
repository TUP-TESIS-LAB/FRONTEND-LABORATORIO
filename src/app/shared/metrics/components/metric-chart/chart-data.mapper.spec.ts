import { mapMetricBreakdownToChartData, mapMetricSeriesToChartData } from './chart-data.mapper';
import { MetricSeries, MetricBreakdown } from '../../models/metric-envelopes.model';

const PALETTE = ['#2563eb', '#0ea5a4', '#f97316'];

describe('mapMetricSeriesToChartData', () => {
  it('mapea labels y datasets (label/data) de un MetricSeries', () => {
    const series: MetricSeries = {
      labels: ['ene', 'feb'],
      datasets: [{ key: 'recaudacion', label: 'Recaudación', values: [10, 20] }],
    };

    const data = mapMetricSeriesToChartData(series, 'line', PALETTE);

    expect(data).not.toBeNull();
    expect(data!.labels).toEqual(['ene', 'feb']);
    expect(data!.datasets).toHaveLength(1);
    expect(data!.datasets[0]['label']).toBe('Recaudación');
    expect(data!.datasets[0]['data']).toEqual([10, 20]);
    expect(data!.datasets[0]['borderColor']).toBeTruthy();
  });

  it('devuelve null cuando no hay datasets (empty-state)', () => {
    const series: MetricSeries = { labels: [], datasets: [] };
    expect(mapMetricSeriesToChartData(series, 'bar', PALETTE)).toBeNull();
  });
});

describe('mapMetricBreakdownToChartData', () => {
  it('mapea labels=slice.label y data=slice.value de un MetricBreakdown', () => {
    const breakdown: MetricBreakdown = {
      dimension: 'metodo',
      slices: [
        { key: 'cash', label: 'Efectivo', value: 60 },
        { key: 'card', label: 'Tarjeta', value: 40 },
      ],
    };

    const data = mapMetricBreakdownToChartData(breakdown, PALETTE);

    expect(data).not.toBeNull();
    expect(data!.labels).toEqual(['Efectivo', 'Tarjeta']);
    expect(data!.datasets[0]['data']).toEqual([60, 40]);
  });

  it('devuelve null cuando el breakdown no tiene slices (empty-state)', () => {
    expect(mapMetricBreakdownToChartData({ dimension: 'metodo', slices: [] }, PALETTE)).toBeNull();
  });
});
