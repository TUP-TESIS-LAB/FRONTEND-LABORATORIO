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
  suggestedMax?: number;
}
/** Alias histórico — el eje de valor no siempre es "Y" (ver `orientation: 'horizontal'`). */
export type YAxisScale = AxisScale;

/** Margen sobre el máximo del eje de valor — headroom para que el datalabel del punto/
 * barra máximo no se clippee contra el borde del canvas (KAN-252, QA: "el pico es justo
 * el que no se ve"). 12% es un término medio dentro del rango pedido (10-15%). */
const AXIS_HEADROOM_RATIO = 0.12;

/**
 * `suggestedMax` del eje de valor: `max(values) * (1 + AXIS_HEADROOM_RATIO)`. Sin headroom
 * (`undefined`, Chart.js autoescala) cuando no hay valores o el máximo es `<= 0` — no tiene
 * sentido "agrandar" un eje que ya está vacío o en cero.
 */
export function computeSuggestedMax(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const max = Math.max(...values);
  if (max <= 0) return undefined;
  return max * (1 + AXIS_HEADROOM_RATIO);
}

/**
 * Construye la config del eje de valor (ticks, `precision`/`stepSize`/`beginAtZero`,
 * `suggestedMax`) a partir del `unit` (format-kind) del envelope — sólo `count` fuerza eje
 * entero (KAN-252). Extraída como función pura, testeada sin pasar por `TestBed`/
 * `setInput()`: este entorno de vitest tiene un problema conocido donde
 * `componentRef.setInput()` sobre un signal input no required NO se aplica de forma
 * confiable (`series()` sigue leyendo el valor previo/default) — el mismo problema
 * documentado para `input.required()` en `metric-chart.component.spec.ts`, pero también
 * reproducido acá con inputs opcionales. Por eso el componente delega la lógica real acá y
 * el spec del componente sólo cubre el smoke test de `chartData()` sin inputs.
 */
export function buildYAxisScale(
  unit: string | undefined,
  textColor: string,
  gridColor: string,
  values: number[] = [],
): YAxisScale {
  const fmt = unitFormat(unit);
  const ticks: Record<string, unknown> = {
    color: textColor,
    callback: (value: number | string) => fmt.format(Number(value)),
  };
  if (fmt.integer) {
    ticks['precision'] = 0;
    ticks['stepSize'] = 1;
  }
  const suggestedMax = computeSuggestedMax(values);
  const scale: YAxisScale = { ticks, grid: { color: gridColor }, beginAtZero: fmt.integer };
  if (suggestedMax !== undefined) scale.suggestedMax = suggestedMax;
  return scale;
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
  /** Valores del eje de VALOR (no de categoría) — para el headroom (`suggestedMax`) que
   * evita que el datalabel del máximo se clippee. Todos los datasets de la serie
   * aplanados, o los valores del breakdown si es `bar` horizontal. Ignorado en pie/
   * doughnut (sin `scales`). */
  values?: number[];
}

/**
 * Opciones completas de Chart.js: leyenda, tooltip formateado por `unit`, y ejes — con el
 * swap de eje que pide `orientation: 'horizontal'` (`indexAxis: 'y'`, el eje de VALOR pasa
 * de Y a X). `categorical` (pie/doughnut) no tiene `scales` en absoluto. `breakdownDriven`
 * (pie/doughnut o `bar` horizontal) arma el tooltip con `ctx.label` (nombre de categoría) en
 * vez de `ctx.dataset.label` (nombre de serie) — ver `MetricChartComponent.breakdownDriven`.
 */
export function buildChartOptions(params: ChartOptionsParams): Record<string, unknown> {
  const { type, orientation, unit, datasetCount, legendPosition, textColor, gridColor, values } = params;
  const categorical = type === 'pie' || type === 'doughnut';
  const breakdownDriven = categorical || (type === 'bar' && orientation === 'horizontal');
  const horizontal = orientation === 'horizontal';
  const fmt = unitFormat(unit);
  const valueAxis = buildYAxisScale(unit, textColor, gridColor, values);
  const categoryAxis: AxisScale = { ticks: { color: textColor }, grid: { color: gridColor } };

  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' : 'x',
    plugins: {
      legend: {
        display: categorical || datasetCount > 1,
        position: legendPosition,
        labels: {
          color: textColor,
          // Sólo doughnut/pie: "Etiqueta: valor (pct%)" por cada gajo, sin cap de cantidad.
          // Reemplaza al viejo texto flotante dibujado sobre el gajo (`selectDoughnutLabels`,
          // sólo hasta 4 gajos, se pisaba con la leyenda y entre sí — KAN-252 QA). La leyenda
          // de Chart.js es una lista con layout real (no píxeles a mano): crece sin romperse
          // de 2 a 8+ categorías, que es exactamente el problema que el dibujo a mano tenía.
          ...(categorical ? { generateLabels: (chart: LegendSourceChart) => buildDoughnutLegendLabels(chart, unit, textColor) } : {}),
        },
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

// ── Etiquetas directas selectivas (line / bar horizontal) ──────────────────────────────
// Un número sobre cada punto es ruido, no se lee (ver design.md "Etiquetas") — estas
// funciones deciden QUÉ índice etiquetar y CON QUÉ texto, puras y testeadas sin canvas ni
// TestBed. El plugin de Chart.js que las consume (`metric-chart.component.ts`, único
// archivo que importa `chart.js`) sólo dibuja lo que estas funciones devuelven. Doughnut/pie
// NO pasa por acá — su "de un vistazo" sale de la leyenda enriquecida + el total central
// (`formatBreakdownEntry`/`formatDoughnutCenterTotal`, arriba), no de texto flotando sobre
// el gajo (KAN-252 QA: eso era justamente lo que se pisaba).

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

// ── Doughnut/pie: leyenda enriquecida + total central ──────────────────────────────────
// Reemplazan a la vieja `selectDoughnutLabels` (texto flotante dibujado sobre el gajo, sólo
// hasta 4 gajos — KAN-252 QA: se pisaba con la leyenda y consigo mismo, y de 5 gajos en
// adelante ("Por método de pago") no quedaba ningún valor visible sin hacer hover).

/**
 * Suma de MAGNITUDES (valores absolutos) — base del % de cada gajo. Un doughnut dibuja el
 * ángulo de cada arco proporcional a `|valor|`, NUNCA al valor con signo: sumar con signo
 * (bug real, KAN-252 QA) con valores tipo `[0, -120, 220]` da total=100 y porcentajes
 * imposibles como "-120%"/"220%". El % SIEMPRE tiene que coincidir con lo que el ojo ve
 * dibujado.
 */
export function sumAbsoluteValues(values: number[]): number {
  return values.reduce((sum, v) => sum + Math.abs(v), 0);
}

/**
 * Texto de una entrada de leyenda: `"Etiqueta: valor (pct%)"`. `pct` sobre `totalAbs`
 * (ver `sumAbsoluteValues`) — nunca negativo, nunca > 100. Gajos en 0 se listan sin `(0%)`:
 * no aporta información y ensucia la leyenda (siguen apareciendo por identidad de color,
 * ver comentario de `PALETTE_VARS` sobre nunca ciclar colores).
 */
export function formatBreakdownEntry(label: string, value: number, totalAbs: number, unit: string | undefined): string {
  const fmt = unitFormat(unit);
  if (value === 0) return `${label}: ${fmt.format(value)}`;
  const pct = totalAbs > 0 ? Math.round((Math.abs(value) / totalAbs) * 100) : 0;
  return `${label}: ${fmt.format(value)} (${pct}%)`;
}

/**
 * Texto del total en el centro del anillo — el headline "de un vistazo" que hoy el hueco
 * vacío desperdicia (KAN-252 QA: "no muestran info al menos que pases el mouse"). A
 * diferencia del %, que es sobre magnitud (así se dibuja el arco), el centro suma CON
 * signo: es el número real de negocio, y un neto de tesorería negativo tiene que leerse
 * como negativo ahí. Sólo se usa para `type="doughnut"` — un pie no tiene agujero central.
 */
export function formatDoughnutCenterTotal(values: number[], unit: string | undefined): string {
  const fmt = unitFormat(unit);
  const total = values.reduce((sum, v) => sum + v, 0);
  return fmt.format(total);
}

/** Forma mínima del `Chart` de Chart.js que necesita `generateLabels` — duck-typed a
 * propósito: este archivo no importa `chart.js` en runtime (única excepción del proyecto es
 * `metric-chart.component.ts`), sólo la forma que hace falta leer al armar las opciones. */
interface LegendSourceChart {
  data: { labels?: unknown[]; datasets: { data?: unknown[]; backgroundColor?: unknown[] }[] };
  getDataVisibility(index: number): boolean;
}

/** Entrada de leyenda de Chart.js — subconjunto de `LegendItem` que el plugin de leyenda
 * necesita para dibujar el swatch de color y soportar el click-to-hide nativo. `fontColor`
 * es OBLIGATORIO acá — sin él, Chart.js hace `ctx.fillStyle = legendItem.fontColor`
 * (`undefined`, asignación inválida de canvas: no-op) y el texto queda pintado con el
 * `fillStyle` del swatch que se dibujó antes en el mismo contexto — el texto terminaría con
 * el color de la serie, exactamente lo que el design system prohíbe (el ink es siempre
 * neutro, el color identifica sólo al swatch). `lineWidth: 0` replica el `generateLabels`
 * default de Chart.js para este dataset (`borderWidth: 0` en `mapMetricBreakdownToChartData`)
 * — sin esto, Chart.js cae a su propio default (`valueOrDefault(..., 1)`) y le agrega al
 * swatch un borde de 1px que hoy no tiene. */
interface LegendEntry {
  text: string;
  fillStyle: string;
  fontColor: string;
  lineWidth: number;
  hidden: boolean;
  index: number;
}

/** `generateLabels` de la leyenda de doughnut/pie: lee labels/valores/colores directo del
 * `chart` (siempre al día — un poll de background puede cambiar los datos sin recrear el
 * componente) y arma el texto vía `formatBreakdownEntry`. Preserva `hidden`/`index` del
 * comportamiento default de Chart.js para no romper el click-to-hide del gajo. */
function buildDoughnutLegendLabels(chart: LegendSourceChart, unit: string | undefined, fontColor: string): LegendEntry[] {
  const labels = (chart.data.labels as string[] | undefined) ?? [];
  const dataset = chart.data.datasets[0];
  const values = (dataset?.data as number[] | undefined) ?? [];
  const colors = (dataset?.backgroundColor as string[] | undefined) ?? [];
  const totalAbs = sumAbsoluteValues(values);
  return labels.map((label, index) => ({
    text: formatBreakdownEntry(label, values[index] ?? 0, totalAbs, unit),
    fillStyle: colors[index] ?? '#000',
    fontColor,
    lineWidth: 0,
    hidden: !chart.getDataVisibility(index),
    index,
  }));
}
