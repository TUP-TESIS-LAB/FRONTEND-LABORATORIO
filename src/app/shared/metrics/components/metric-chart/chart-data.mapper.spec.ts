import { buildYAxisScale, mapMetricBreakdownToChartData, mapMetricSeriesToChartData } from './chart-data.mapper';
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

  it('ningún dataset de línea emite `tension` (segmentos rectos, sin interpolar)', () => {
    const series: MetricSeries = {
      labels: ['ene', 'feb'],
      datasets: [{ key: 'recaudacion', label: 'Recaudación', values: [10, 20] }],
    };
    const data = mapMetricSeriesToChartData(series, 'line', PALETTE);
    expect(data!.datasets[0]['tension']).toBeUndefined();
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

describe('buildYAxisScale', () => {
  it('unit "count": eje entero — precision 0, stepSize 1, beginAtZero true', () => {
    const scale = buildYAxisScale('count', '#111', '#ccc');
    expect(scale.ticks['precision']).toBe(0);
    expect(scale.ticks['stepSize']).toBe(1);
    expect(scale.beginAtZero).toBe(true);
  });

  it('unit "currency": NO fuerza precision, beginAtZero false', () => {
    const scale = buildYAxisScale('currency', '#111', '#ccc');
    expect(scale.ticks['precision']).toBeUndefined();
    expect(scale.ticks['stepSize']).toBeUndefined();
    expect(scale.beginAtZero).toBe(false);
  });

  it('unit "percent": NO fuerza precision', () => {
    expect(buildYAxisScale('percent', '#111', '#ccc').ticks['precision']).toBeUndefined();
  });

  it('unit undefined: cae a count (eje entero)', () => {
    expect(buildYAxisScale(undefined, '#111', '#ccc').beginAtZero).toBe(true);
  });

  it('callback del tick formatea con la unidad recibida', () => {
    const scale = buildYAxisScale('currency', '#111', '#ccc');
    const callback = scale.ticks['callback'] as (v: number) => string;
    expect(callback(1234.5)).toContain('$');
  });
});
