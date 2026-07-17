import { TestBed } from '@angular/core/testing';
import { MetricChartCardComponent, isBreakdownDriven, resolveCardUnit, toChartCardRows } from './metric-chart-card.component';
import { MetricBreakdown, MetricSeries } from '../../models/metric-envelopes.model';

describe('toChartCardRows', () => {
  it('serie (line/bar vertical): usa el primer dataset, zipeado con labels', () => {
    const series: MetricSeries = {
      unit: 'currency',
      labels: ['ene', 'feb', 'mar'],
      datasets: [{ key: 'recaudacion', label: 'Recaudación', values: [10, 20, 30] }],
    };

    expect(toChartCardRows('line', 'vertical', series, undefined)).toEqual([
      { label: 'ene', value: 10 },
      { label: 'feb', value: 20 },
      { label: 'mar', value: 30 },
    ]);
  });

  it('serie sin datasets: filas vacías', () => {
    expect(toChartCardRows('line', 'vertical', { labels: [], datasets: [] }, undefined)).toEqual([]);
  });

  it('sin serie: filas vacías', () => {
    expect(toChartCardRows('bar', 'vertical', undefined, undefined)).toEqual([]);
  });

  it('breakdown (doughnut/pie): usa los slices', () => {
    const breakdown: MetricBreakdown = {
      unit: 'count',
      dimension: 'metodo',
      slices: [
        { key: 'cash', label: 'Efectivo', value: 60 },
        { key: 'card', label: 'Tarjeta', value: 40 },
      ],
    };

    expect(toChartCardRows('doughnut', 'vertical', undefined, breakdown)).toEqual([
      { label: 'Efectivo', value: 60 },
      { label: 'Tarjeta', value: 40 },
    ]);
  });

  it('sin breakdown en tipo categórico: filas vacías', () => {
    expect(toChartCardRows('pie', 'vertical', undefined, undefined)).toEqual([]);
  });

  it('bar horizontal: usa los slices del breakdown, no la serie (KAN-252)', () => {
    const breakdown: MetricBreakdown = {
      unit: 'count',
      dimension: 'sucursal',
      slices: [{ key: '1', label: 'Sede Centro', value: 30 }, { key: '2', label: 'Sede Norte', value: 20 }],
    };

    expect(toChartCardRows('bar', 'horizontal', undefined, breakdown)).toEqual([
      { label: 'Sede Centro', value: 30 },
      { label: 'Sede Norte', value: 20 },
    ]);
  });

  it('bar vertical: sigue usando la serie (no cambia el comportamiento default)', () => {
    const series: MetricSeries = { labels: ['a'], datasets: [{ key: 'k', label: 'K', values: [5] }] };
    expect(toChartCardRows('bar', 'vertical', series, undefined)).toEqual([{ label: 'a', value: 5 }]);
  });
});

describe('isBreakdownDriven', () => {
  it('doughnut/pie: siempre breakdown-driven', () => {
    expect(isBreakdownDriven('doughnut', 'vertical')).toBe(true);
    expect(isBreakdownDriven('pie', 'vertical')).toBe(true);
  });

  it('bar horizontal: breakdown-driven', () => {
    expect(isBreakdownDriven('bar', 'horizontal')).toBe(true);
  });

  it('bar vertical / line: NO breakdown-driven', () => {
    expect(isBreakdownDriven('bar', 'vertical')).toBe(false);
    expect(isBreakdownDriven('line', 'horizontal')).toBe(false);
  });
});

describe('resolveCardUnit', () => {
  it('toma unit de la serie si está presente', () => {
    expect(resolveCardUnit({ unit: 'hours', labels: [], datasets: [] }, undefined)).toBe('hours');
  });

  it('toma unit del breakdown si no hay serie', () => {
    expect(resolveCardUnit(undefined, { unit: 'percent', dimension: 'd', slices: [] })).toBe('percent');
  });

  it('sin unit en ninguno, cae a count', () => {
    expect(resolveCardUnit(undefined, undefined)).toBe('count');
  });
});

/**
 * Smoke test del toggle chart/tabla, sin `detectChanges()` ni `setInput()` — ver la nota
 * de `metric-chart.component.spec.ts` sobre por qué `setInput()` no es confiable acá para
 * los inputs opcionales. La lógica de derivación de filas/unit vive en funciones puras
 * (arriba), testeadas sin TestBed.
 */
describe('MetricChartCardComponent', () => {
  it('arranca en modo gráfico (showTable false)', () => {
    const fixture = TestBed.createComponent(MetricChartCardComponent);
    fixture.componentInstance.type = 'bar';

    expect(fixture.componentInstance['showTable']()).toBe(false);
  });

  it('toggleTable() invierte el modo', () => {
    const fixture = TestBed.createComponent(MetricChartCardComponent);
    fixture.componentInstance.type = 'bar';

    fixture.componentInstance['toggleTable']();
    expect(fixture.componentInstance['showTable']()).toBe(true);

    fixture.componentInstance['toggleTable']();
    expect(fixture.componentInstance['showTable']()).toBe(false);
  });
});
