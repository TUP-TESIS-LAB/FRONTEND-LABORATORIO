import {
  buildChartOptions, buildYAxisScale, computeSuggestedMax, formatBreakdownEntry, formatDoughnutCenterTotal,
  mapMetricBreakdownToChartData, mapMetricSeriesToChartData, selectBarLabels, selectSeriesLabels, sumAbsoluteValues,
} from './chart-data.mapper';
import { MetricSeries, MetricBreakdown } from '../../models/metric-envelopes.model';
import { unitFormat } from '../../util/metric-format.util';

// `Intl.NumberFormat('es-AR', {style:'currency'})` separa el símbolo con un NBSP (U+00A0),
// no un espacio común — formatear acá con el mismo `unitFormat` (en vez de hardcodear el
// string) evita que el test dependa a ciegas de ese carácter invisible.
const currency = unitFormat('currency').format;

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

  it('con values, agrega headroom (suggestedMax) para que el datalabel del máximo no se clippee', () => {
    const scale = buildYAxisScale('count', '#111', '#ccc', [10, 30, 20]);
    expect(scale.suggestedMax).toBeCloseTo(30 * 1.12, 5);
  });

  it('sin values (default []), no agrega suggestedMax', () => {
    expect(buildYAxisScale('count', '#111', '#ccc').suggestedMax).toBeUndefined();
  });
});

describe('computeSuggestedMax', () => {
  it('agrega ~12% de margen sobre el máximo (dentro del rango 10-15% pedido)', () => {
    const suggested = computeSuggestedMax([10, 30, 20])!;
    expect(suggested).toBeGreaterThan(30 * 1.10);
    expect(suggested).toBeLessThan(30 * 1.15);
  });

  it('array vacío: undefined (Chart.js autoescala)', () => {
    expect(computeSuggestedMax([])).toBeUndefined();
  });

  it('máximo 0: undefined (no tiene sentido agrandar un eje vacío)', () => {
    expect(computeSuggestedMax([0, 0])).toBeUndefined();
  });

  it('un solo valor: headroom igual sobre ese valor', () => {
    expect(computeSuggestedMax([1001])).toBeCloseTo(1001 * 1.12, 5);
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

  it('bar vertical: el headroom (suggestedMax) va en el eje Y — ahí vive el valor', () => {
    const options = buildChartOptions({ ...base, type: 'bar', orientation: 'vertical', values: [10, 30, 20] }) as any;
    expect(options.scales.y.suggestedMax).toBeCloseTo(30 * 1.12, 5);
    expect(options.scales.x.suggestedMax).toBeUndefined();
  });

  it('bar horizontal: el headroom (suggestedMax) va en el eje X — ahí vive el valor con indexAxis:y (KAN-252)', () => {
    const options = buildChartOptions({ ...base, type: 'bar', orientation: 'horizontal', values: [1001, 300] }) as any;
    expect(options.scales.x.suggestedMax).toBeCloseTo(1001 * 1.12, 5);
    expect(options.scales.y.suggestedMax).toBeUndefined();
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

  it('doughnut/pie: la leyenda tiene generateLabels — "Etiqueta: valor (pct%)" por gajo, sin cap de '
    + 'cantidad (reemplaza al viejo texto flotante que se pisaba, KAN-252 QA)', () => {
    const options = buildChartOptions({ ...base, type: 'doughnut', orientation: 'vertical', unit: 'count' }) as any;
    const generateLabels = options.plugins.legend.labels.generateLabels as (chart: unknown) => { text: string }[];
    const fakeChart = {
      data: {
        labels: ['Efectivo', 'Tarjeta', 'Transferencia'],
        datasets: [{ data: [60, 40, 0], backgroundColor: ['#111', '#222', '#333'] }],
      },
      getDataVisibility: () => true,
    };
    const entries = generateLabels(fakeChart);
    expect(entries.map(e => e.text)).toEqual(['Efectivo: 60 (60%)', 'Tarjeta: 40 (40%)', 'Transferencia: 0']);
  });

  it('bar/line: la leyenda NO trae generateLabels propio (Chart.js usa el default de la serie)', () => {
    const options = buildChartOptions({ ...base, type: 'bar', orientation: 'vertical', datasetCount: 2 }) as any;
    expect(options.plugins.legend.labels.generateLabels).toBeUndefined();
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

describe('sumAbsoluteValues', () => {
  it('suma magnitudes, no valores con signo', () => {
    expect(sumAbsoluteValues([0, -120, 220])).toBe(340);
  });

  it('array vacío: 0', () => {
    expect(sumAbsoluteValues([])).toBe(0);
  });
});

describe('formatBreakdownEntry', () => {
  it('gajo positivo: "Etiqueta: valor (pct%)"', () => {
    expect(formatBreakdownEntry('Efectivo', 60, 100, 'count')).toBe('Efectivo: 60 (60%)');
  });

  it('valores negativos (neto de tesorería): % SIEMPRE sobre magnitud, nunca negativo ni > 100 '
    + '(bug real KAN-252 QA: sumar con signo daba "-120%"/"220%")', () => {
    const totalAbs = sumAbsoluteValues([0, -120, 220]); // 340
    expect(formatBreakdownEntry('Egresos', -120, totalAbs, 'currency')).toBe(`Egresos: ${currency(-120)} (35%)`);
    expect(formatBreakdownEntry('Ingresos', 220, totalAbs, 'currency')).toBe(`Ingresos: ${currency(220)} (65%)`);
  });

  it('gajo en 0: sin sufijo "(0%)" — no aporta info y ensucia la leyenda', () => {
    expect(formatBreakdownEntry('Transferencia', 0, 340, 'currency')).toBe(`Transferencia: ${currency(0)}`);
  });

  it('total 0: % es 0 en vez de NaN/Infinity', () => {
    expect(formatBreakdownEntry('A', 0, 0, 'count')).toBe('A: 0');
  });
});

describe('formatDoughnutCenterTotal', () => {
  it('suma CON signo (el número real de negocio, no la magnitud del %)', () => {
    expect(formatDoughnutCenterTotal([60, 40], 'count')).toBe('100');
  });

  it('neto negativo de tesorería: el total central lo muestra negativo', () => {
    expect(formatDoughnutCenterTotal([0, -120, 220], 'currency')).toBe(currency(100));
  });

  it('array vacío: formatea 0', () => {
    expect(formatDoughnutCenterTotal([], 'count')).toBe('0');
  });
});
