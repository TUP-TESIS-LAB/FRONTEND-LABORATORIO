import {
  buildChartOptions, buildYAxisScale, mapMetricBreakdownToChartData, mapMetricSeriesToChartData,
  selectBarLabels, selectDoughnutLabels, selectSeriesLabels,
} from './chart-data.mapper';
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

  it('colorMode "single": TODOS los slices usan el slot 1, sin importar cardinalidad — barra horizontal', () => {
    const breakdown: MetricBreakdown = {
      dimension: 'sucursal',
      slices: Array.from({ length: 5 }, (_, i) => ({ key: `s${i}`, label: `Sucursal ${i}`, value: i + 1 })),
    };

    const data = mapMetricBreakdownToChartData(breakdown, PALETTE, 'single');
    const colors = data!.datasets[0]['backgroundColor'] as string[];

    expect(colors).toEqual(colors.map(() => PALETTE[0]));
  });

  it('colorMode "categorical" (default) sigue asignando un color por slice', () => {
    const breakdown: MetricBreakdown = {
      dimension: 'metodo',
      slices: [{ key: 'a', label: 'A', value: 1 }, { key: 'b', label: 'B', value: 2 }],
    };
    const data = mapMetricBreakdownToChartData(breakdown, PALETTE, 'categorical');
    const colors = data!.datasets[0]['backgroundColor'] as string[];
    expect(colors).toEqual([PALETTE[0], PALETTE[1]]);
  });

  it('acepta un overflowColor explícito (el componente resuelve --ds-text-muted y lo pasa acá)', () => {
    const breakdown: MetricBreakdown = {
      dimension: 'sucursal',
      slices: Array.from({ length: 9 }, (_, i) => ({ key: `s${i}`, label: `S${i}`, value: i })),
    };
    const data = mapMetricBreakdownToChartData(breakdown, PALETTE, 'categorical', '#123456');
    const colors = data!.datasets[0]['backgroundColor'] as string[];
    expect(colors[8]).toBe('#123456');
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

describe('buildChartOptions', () => {
  const base = { unit: 'count', datasetCount: 1, legendPosition: 'top' as const, textColor: '#111', gridColor: '#ccc' };

  it('doughnut/pie: sin scales, tooltip usa ctx.label', () => {
    const options = buildChartOptions({ ...base, type: 'doughnut', orientation: 'vertical' });
    expect(options['scales']).toBeUndefined();
  });

  it('bar vertical: indexAxis "x", el eje de valor es Y', () => {
    const options = buildChartOptions({ ...base, type: 'bar', orientation: 'vertical' }) as any;
    expect(options.indexAxis).toBe('x');
    expect(options.scales.y.ticks['precision']).toBe(0); // unit count → eje entero
    expect(options.scales.x.ticks['precision']).toBeUndefined();
  });

  it('bar horizontal: indexAxis "y", el eje de valor pasa a X (KAN-252)', () => {
    const options = buildChartOptions({ ...base, type: 'bar', orientation: 'horizontal' }) as any;
    expect(options.indexAxis).toBe('y');
    expect(options.scales.x.ticks['precision']).toBe(0);
    expect(options.scales.y.ticks['precision']).toBeUndefined();
  });

  it('bar horizontal: sin leyenda (breakdown de 1 dataset, el eje ya nombra las categorías)', () => {
    const options = buildChartOptions({ ...base, type: 'bar', orientation: 'horizontal', datasetCount: 0 }) as any;
    expect(options.plugins.legend.display).toBe(false);
  });

  it('tooltip de bar vertical (serie): usa ctx.parsed.y y ctx.dataset.label', () => {
    const options = buildChartOptions({ ...base, type: 'bar', orientation: 'vertical' }) as any;
    const label = options.plugins.tooltip.callbacks.label({ label: 'ignored', parsed: { x: 1, y: 42 }, dataset: { label: 'Serie A' } });
    expect(label).toBe('Serie A: 42');
  });

  it('tooltip de bar horizontal (breakdown): usa ctx.parsed.x y ctx.label (no ctx.dataset.label)', () => {
    const options = buildChartOptions({ ...base, type: 'bar', orientation: 'horizontal' }) as any;
    const label = options.plugins.tooltip.callbacks.label({ label: 'Sede Centro', parsed: { x: 30, y: 0 }, dataset: {} });
    expect(label).toBe('Sede Centro: 30');
  });
});

describe('selectSeriesLabels', () => {
  it('etiqueta último punto + máximo + mínimo, ordenados por índice', () => {
    const labels = selectSeriesLabels([10, 30, 5, 20], 'count');
    expect(labels.map(l => l.index)).toEqual([1, 2, 3]); // max=1, min=2, last=3
    expect(labels.find(l => l.index === 1)!.text).toBe('30');
    expect(labels.find(l => l.index === 2)!.text).toBe('5');
    expect(labels.find(l => l.index === 3)!.text).toBe('20');
  });

  it('sin duplicados cuando el último punto ES el máximo', () => {
    const labels = selectSeriesLabels([5, 10, 30], 'count');
    expect(labels.map(l => l.index)).toEqual([0, 2]); // min=0, max=last=2 (no duplicado)
  });

  it('un solo valor: un solo label (los 3 candidatos coinciden)', () => {
    const labels = selectSeriesLabels([42], 'count');
    expect(labels).toEqual([{ index: 0, text: '42' }]);
  });

  it('todos los valores iguales: max/min quedan en el índice 0 (primer empate), más el último punto', () => {
    const labels = selectSeriesLabels([7, 7, 7], 'count');
    expect(labels.map(l => l.index)).toEqual([0, 2]); // max=min=0 (primer empate), last=2
  });

  it('array vacío: sin labels', () => {
    expect(selectSeriesLabels([], 'count')).toEqual([]);
  });

  it('formatea con la unidad recibida (currency)', () => {
    const labels = selectSeriesLabels([1000], 'currency');
    expect(labels[0].text).toContain('$');
  });
});

describe('selectBarLabels', () => {
  it('etiqueta CADA valor, en orden, formateado', () => {
    const labels = selectBarLabels([10, 20, 30], 'count');
    expect(labels).toEqual([
      { index: 0, text: '10' },
      { index: 1, text: '20' },
      { index: 2, text: '30' },
    ]);
  });

  it('array vacío: sin labels', () => {
    expect(selectBarLabels([], 'count')).toEqual([]);
  });
});

describe('selectDoughnutLabels', () => {
  it('hasta 4 gajos: valor + % del total en cada uno', () => {
    const labels = selectDoughnutLabels([60, 40], 'count');
    expect(labels).toEqual([
      { index: 0, text: '60 (60%)' },
      { index: 1, text: '40 (40%)' },
    ]);
  });

  it('exactamente 4 gajos: sigue etiquetando', () => {
    const labels = selectDoughnutLabels([1, 1, 1, 1], 'count');
    expect(labels).toHaveLength(4);
  });

  it('5 gajos o más: sin etiquetas (sólo leyenda)', () => {
    expect(selectDoughnutLabels([1, 1, 1, 1, 1], 'count')).toEqual([]);
  });

  it('sin gajos: sin etiquetas', () => {
    expect(selectDoughnutLabels([], 'count')).toEqual([]);
  });

  it('total 0: % es 0 en vez de NaN/Infinity', () => {
    const labels = selectDoughnutLabels([0, 0], 'count');
    expect(labels[0].text).toBe('0 (0%)');
  });
});
