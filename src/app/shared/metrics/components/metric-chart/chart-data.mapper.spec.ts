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

  it('con más slices que slots en la paleta, NUNCA cicla — el slot 9 usa el gris de overflow, no palette[0]', () => {
    const EIGHT = ['#2a78d6', '#008300', '#e87ba4', '#eda100', '#1baf7a', '#eb6834', '#4a3aa7', '#e34948'];
    const breakdown: MetricBreakdown = {
      dimension: 'sucursal',
      slices: Array.from({ length: 9 }, (_, i) => ({ key: `s${i}`, label: `Sucursal ${i}`, value: i + 1 })),
    };

    const data = mapMetricBreakdownToChartData(breakdown, EIGHT);
    const colors = data!.datasets[0]['backgroundColor'] as string[];

    expect(colors.slice(0, 8)).toEqual(EIGHT);
    expect(colors[8]).not.toBe(EIGHT[0]);
    expect(colors[8]).toBe('#6b7280');
    expect(new Set(colors.slice(0, 8)).size).toBe(8);
  });
});
