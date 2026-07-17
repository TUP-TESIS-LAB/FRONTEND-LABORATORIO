import { TestBed } from '@angular/core/testing';
import { MetricChartCardComponent, resolveCardUnit, toChartCardRows } from './metric-chart-card.component';
import { MetricBreakdown, MetricSeries } from '../../models/metric-envelopes.model';

describe('toChartCardRows', () => {
  it('serie (line/bar): usa el primer dataset, zipeado con labels', () => {
    const series: MetricSeries = {
      unit: 'currency',
      labels: ['ene', 'feb', 'mar'],
      datasets: [{ key: 'recaudacion', label: 'Recaudación', values: [10, 20, 30] }],
    };

    expect(toChartCardRows('line', series, undefined)).toEqual([
      { label: 'ene', value: 10 },
      { label: 'feb', value: 20 },
      { label: 'mar', value: 30 },
    ]);
  });

  it('serie sin datasets: filas vacías', () => {
    expect(toChartCardRows('line', { labels: [], datasets: [] }, undefined)).toEqual([]);
  });

  it('sin serie: filas vacías', () => {
    expect(toChartCardRows('bar', undefined, undefined)).toEqual([]);
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

    expect(toChartCardRows('doughnut', undefined, breakdown)).toEqual([
      { label: 'Efectivo', value: 60 },
      { label: 'Tarjeta', value: 40 },
    ]);
  });

  it('sin breakdown en tipo categórico: filas vacías', () => {
    expect(toChartCardRows('pie', undefined, undefined)).toEqual([]);
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
