import { MetricBreakdown, MetricSeries } from '../../models/metric-envelopes.model';
import { unitFormat } from '../../util/metric-format.util';
import { MetricChartColorMode, MetricChartOrientation, MetricChartType } from './metric-chart.component';

/** Forma mínima de dataset que espera Chart.js vía `p-chart`. */
export interface ChartJsData {
  labels: string[];
  datasets: Record<string, unknown>[];
}

/**
 * Fallback del color de overflow para el slot 9+ de un breakdown, usado sólo si no hay
 * `document` (SSR/tests) o no está definida la CSS var — en la app real el caller
 * (`metric-chart.component.ts`) resuelve `--ds-text-muted` vía `getComputedStyle` y lo pasa
 * como parámetro, mismo patrón que la paleta (`resolvePalette`/`FALLBACK_PALETTE`). La
 * paleta tiene 8 slots fijos y NUNCA se cicla — ciclar repetiría identidad de serie con
 * otro slice (KAN-252). El backend ya acota con `OTHERS_KEY`/top-N; esto es la red de
 * seguridad del front si de todos modos llega un breakdown más largo que la paleta.
 */
const FALLBACK_OVERFLOW_COLOR = '#6b7280';

/** Color de un slot por índice: `palette[i]` mientras alcance, gris de overflow después. */
function colorAt(palette: string[], i: number, overflowColor: string): string {
  return i < palette.length ? palette[i] : overflowColor;
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
  overflowColor: string = FALLBACK_OVERFLOW_COLOR,
): ChartJsData | null {
  if (series.datasets.length === 0) return null;
  return {
    labels: series.labels,
    datasets: series.datasets.map((ds, i) => {
      const color = colorAt(palette, i, overflowColor);
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
 * Mapea un `MetricBreakdown` (pie/doughnut, o barra con datos de breakdown) al formato de
 * Chart.js. `null` cuando no hay slices — el componente lo interpreta como empty-state.
 * `colorMode` (ver `MetricChartColorMode`, único tipo — declarado en
 * `metric-chart.component.ts`): `single` pinta TODOS los slices con `palette[0]` (slot 1);
 * `categorical`/`ordinal` usan `palette[i]` sin ciclar (`ordinal` ya llega con la rampa de
 * 4 pasos como `palette` — el índice mapea 1:1 a cada paso, no hace falta una rama propia).
 */
export function mapMetricBreakdownToChartData(
  breakdown: MetricBreakdown,
  palette: string[],
  colorMode: MetricChartColorMode = 'categorical',
  overflowColor: string = FALLBACK_OVERFLOW_COLOR,
): ChartJsData | null {
  if (breakdown.slices.length === 0) return null;
  const colorForIndex = (i: number) => (colorMode === 'single' ? palette[0] : colorAt(palette, i, overflowColor));
  return {
    labels: breakdown.slices.map(s => s.label),
    datasets: [{
      data: breakdown.slices.map(s => s.value),
      backgroundColor: breakdown.slices.map((_, i) => colorForIndex(i)),
      borderWidth: 0,
    }],
  };
}

/** Config de un eje de Chart.js. */
export interface AxisScale {
  ticks: Record<string, unknown>;
  grid: { color: string };
  beginAtZero?: boolean;
}
/** Alias histórico — el eje de valor no siempre es "Y" (ver `orientation: 'horizontal'`). */
export type YAxisScale = AxisScale;

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

/** Params de `buildChartOptions` — todo lo que `MetricChartComponent.chartOptions()` ya no
 * calcula él mismo (ver la nota de `buildYAxisScale` sobre por qué esta lógica vive acá,
 * como función pura, en vez de en el `computed()` del componente). */
export interface ChartOptionsParams {
  type: MetricChartType;
  orientation: MetricChartOrientation;
  unit: string | undefined;
  /** Cantidad de datasets de la serie (irrelevante si el chart es breakdown-driven). */
  datasetCount: number;
  legendPosition: 'top' | 'right' | 'bottom' | 'left';
  textColor: string;
  gridColor: string;
}

/**
 * Opciones completas de Chart.js: leyenda, tooltip formateado por `unit`, y ejes — con el
 * swap de eje que pide `orientation: 'horizontal'` (`indexAxis: 'y'`, el eje de VALOR pasa
 * de Y a X). `categorical` (pie/doughnut) no tiene `scales` en absoluto. `breakdownDriven`
 * (pie/doughnut o `bar` horizontal) arma el tooltip con `ctx.label` (nombre de categoría) en
 * vez de `ctx.dataset.label` (nombre de serie) — ver `MetricChartComponent.breakdownDriven`.
 */
export function buildChartOptions(params: ChartOptionsParams): Record<string, unknown> {
  const { type, orientation, unit, datasetCount, legendPosition, textColor, gridColor } = params;
  const categorical = type === 'pie' || type === 'doughnut';
  const breakdownDriven = categorical || (type === 'bar' && orientation === 'horizontal');
  const horizontal = orientation === 'horizontal';
  const fmt = unitFormat(unit);
  const valueAxis = buildYAxisScale(unit, textColor, gridColor);
  const categoryAxis: AxisScale = { ticks: { color: textColor }, grid: { color: gridColor } };

  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' : 'x',
    plugins: {
      legend: {
        display: categorical || datasetCount > 1,
        position: legendPosition,
        labels: { color: textColor },
      },
      tooltip: {
        callbacks: {
          label: (ctx: { label: string; parsed: number | { x: number; y: number }; dataset: { label?: string } }) => {
            if (categorical) {
              return `${ctx.label}: ${fmt.format(Number(ctx.parsed))}`;
            }
            const parsed = ctx.parsed as { x: number; y: number };
            const raw = horizontal ? parsed.x : parsed.y;
            const name = breakdownDriven ? ctx.label : ctx.dataset.label;
            return `${name}: ${fmt.format(Number(raw))}`;
          },
        },
      },
    },
    scales: categorical ? undefined : {
      x: horizontal ? valueAxis : categoryAxis,
      y: horizontal ? categoryAxis : valueAxis,
    },
  };
}

// ── Etiquetas directas selectivas ───────────────────────────────────────────────────────
// Un número sobre cada punto es ruido, no se lee (ver design.md "Etiquetas") — estas
// funciones deciden QUÉ índice etiquetar y CON QUÉ texto, puras y testeadas sin canvas ni
// TestBed. El plugin de Chart.js que las consume (`metric-chart.component.ts`, único
// archivo que importa `chart.js`) sólo dibuja lo que estas funciones devuelven.

/** Un punto a etiquetar: `index` dentro del array de labels/valores, `text` ya formateado. */
export interface DirectLabel {
  index: number;
  text: string;
}

/**
 * Serie temporal (line): etiqueta sólo el último punto + el máximo + el mínimo — nunca
 * todos los puntos. Sin duplicados si el último punto coincide con el máximo o el mínimo
 * (`Set` sobre los 3 índices candidatos).
 */
export function selectSeriesLabels(values: number[], unit: string | undefined): DirectLabel[] {
  if (values.length === 0) return [];
  const fmt = unitFormat(unit);
  const lastIndex = values.length - 1;
  let maxIndex = 0;
  let minIndex = 0;
  values.forEach((v, i) => {
    if (v > values[maxIndex]) maxIndex = i;
    if (v < values[minIndex]) minIndex = i;
  });
  const indices = Array.from(new Set([lastIndex, maxIndex, minIndex])).sort((a, b) => a - b);
  return indices.map(index => ({ index, text: fmt.format(values[index]) }));
}

/**
 * Barra horizontal: valor al final de CADA barra — a diferencia de una serie temporal, acá
 * no hay ruido de "un número por punto": cada fila es una categoría distinta, no un tramo
 * de la misma tendencia.
 */
export function selectBarLabels(values: number[], unit: string | undefined): DirectLabel[] {
  const fmt = unitFormat(unit);
  return values.map((v, index) => ({ index, text: fmt.format(v) }));
}

/**
 * Doughnut/pie: valor + % del total en cada gajo — SÓLO hasta 4 gajos. De 5 en adelante
 * el propio gajo es demasiado angosto para un texto legible; esos casos se quedan sólo con
 * la leyenda (ver design.md "Etiquetas": "Doughnut 5–6 gajos: sólo leyenda con valores").
 */
export function selectDoughnutLabels(values: number[], unit: string | undefined): DirectLabel[] {
  if (values.length === 0 || values.length > 4) return [];
  const fmt = unitFormat(unit);
  const total = values.reduce((sum, v) => sum + v, 0);
  return values.map((v, index) => {
    const pct = total > 0 ? Math.round((v / total) * 100) : 0;
    return { index, text: `${fmt.format(v)} (${pct}%)` };
  });
}
