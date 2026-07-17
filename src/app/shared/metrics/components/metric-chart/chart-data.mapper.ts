import { MetricBreakdown, MetricSeries } from '../../models/metric-envelopes.model';
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
        tension: type === 'line' ? 0.35 : undefined,
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
