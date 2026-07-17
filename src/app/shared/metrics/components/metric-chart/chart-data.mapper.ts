import { MetricBreakdown, MetricSeries } from '../../models/metric-envelopes.model';
import { unitFormat } from '../../util/metric-format.util';
import { MetricChartType } from './metric-chart.component';

/** Forma mínima de dataset que espera Chart.js vía `p-chart`. */
export interface ChartJsData {
  labels: string[];
  datasets: Record<string, unknown>[];
}

/**
 * Color de overflow (`--ds-text-muted`) para el slot 9+ de un breakdown. La paleta tiene
 * 8 slots fijos y NUNCA se cicla — ciclar repetiría identidad de serie con otro slice
 * (KAN-252). El backend ya acota con `OTHERS_KEY`/top-N; esto es la red de seguridad del
 * front si de todos modos llega un breakdown más largo que la paleta.
 */
const OVERFLOW_COLOR = '#6b7280';

/** Color de un slot por índice: `palette[i]` mientras alcance, gris de overflow después. */
function colorAt(palette: string[], i: number): string {
  return i < palette.length ? palette[i] : OVERFLOW_COLOR;
}

/**
 * Mapea un `MetricSeries` (line/bar) al formato de Chart.js.
 * `null` cuando no hay datasets — el componente lo interpreta como empty-state.
 * Extraído como función pura (en vez de vivir solo dentro del `computed` del componente)
 * para poder testearla sin pasar por el binding de inputs de Angular/TestBed.
 */
export function mapMetricSeriesToChartData(
  series: MetricSeries,
  type: MetricChartType,
  palette: string[],
): ChartJsData | null {
  if (series.datasets.length === 0) return null;
  return {
    labels: series.labels,
    datasets: series.datasets.map((ds, i) => {
      const color = colorAt(palette, i);
      return {
        label: ds.label,
        data: ds.values,
        borderColor: color,
        backgroundColor: color,
        // Sin `tension`: una spline interpola valores intermedios que no existen y
        // puede curvar por debajo de cero sobre conteos — segmentos rectos, siempre.
        fill: false,
      };
    }),
  };
}

/**
 * Mapea un `MetricBreakdown` (pie/doughnut) al formato de Chart.js.
 * `null` cuando no hay slices — el componente lo interpreta como empty-state.
 */
export function mapMetricBreakdownToChartData(
  breakdown: MetricBreakdown,
  palette: string[],
): ChartJsData | null {
  if (breakdown.slices.length === 0) return null;
  return {
    labels: breakdown.slices.map(s => s.label),
    datasets: [{
      data: breakdown.slices.map(s => s.value),
      backgroundColor: breakdown.slices.map((_, i) => colorAt(palette, i)),
      borderWidth: 0,
    }],
  };
}

/** Config del eje Y de Chart.js. */
export interface YAxisScale {
  ticks: Record<string, unknown>;
  grid: { color: string };
  beginAtZero: boolean;
}

/**
 * Construye la config del eje Y (ticks, `precision`/`stepSize`/`beginAtZero`) a partir del
 * `unit` (format-kind) del envelope — sólo `count` fuerza eje entero (KAN-252). Extraída
 * como función pura, testeada sin pasar por `TestBed`/`setInput()`: este entorno de vitest
 * tiene un problema conocido donde `componentRef.setInput()` sobre un signal input no
 * required NO se aplica de forma confiable (`series()` sigue leyendo el valor previo/
 * default) — el mismo problema documentado para `input.required()` en
 * `metric-chart.component.spec.ts`, pero también reproducido acá con inputs opcionales.
 * Por eso el componente delega la lógica real acá y el spec del componente sólo cubre el
 * smoke test de `chartData()` sin inputs.
 */
export function buildYAxisScale(unit: string | undefined, textColor: string, gridColor: string): YAxisScale {
  const fmt = unitFormat(unit);
  const ticks: Record<string, unknown> = {
    color: textColor,
    callback: (value: number | string) => fmt.format(Number(value)),
  };
  if (fmt.integer) {
    ticks['precision'] = 0;
    ticks['stepSize'] = 1;
  }
  return { ticks, grid: { color: gridColor }, beginAtZero: fmt.integer };
}
