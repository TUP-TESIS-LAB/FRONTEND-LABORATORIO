import { ChangeDetectionStrategy, Component, Input, computed, input } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import type { Plugin } from 'chart.js';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { MetricBreakdown, MetricSeries } from '../../models/metric-envelopes.model';
import {
  buildChartOptions, mapMetricBreakdownToChartData, mapMetricSeriesToChartData,
  selectBarLabels, selectDoughnutLabels, selectSeriesLabels,
} from './chart-data.mapper';

/** Tipo de gráfico soportado por el wrapper (subconjunto de los que expone `p-chart`). */
export type MetricChartType = 'line' | 'bar' | 'pie' | 'doughnut';

/** `horizontal` sólo aplica a `type="bar"` — `indexAxis:'y'` de Chart.js, para
 * dimensiones de cardinalidad no acotada (KAN-252: turnos por sucursal, carga por
 * extractor) donde el eje Y necesita ancho para las etiquetas de categoría. */
export type MetricChartOrientation = 'vertical' | 'horizontal';

/**
 * `categorical` (default): paleta nominal de 8 colores, un color por serie/slice.
 * `single`: un solo color (slot 1) para TODOS los datos — barra horizontal de dimensión
 * no acotada, donde el largo de la barra ya codifica la magnitud.
 * `ordinal`: rampa de 4 pasos de un solo hue (`--ordinal-1..4`) para dimensiones
 * ORDENADAS, no nominales (buckets de re-llamados, pipeline de estados).
 */
export type MetricChartColorMode = 'categorical' | 'single' | 'ordinal';

/**
 * Paleta categórica FIJA de 8 colores (`tokens.scss`), expuesta como CSS vars
 * `--chart-1..--chart-8`. Validada CVD, independiente de la marca del tenant (KAN-252) —
 * ver comentario de `tokens.scss`. Nunca se usan acá los colores de estado
 * (`--ds-success/warning/danger/info`) como identidad de serie — reservados para feedback.
 */
const PALETTE_VARS = Array.from({ length: 8 }, (_, i) => `--chart-${i + 1}`);

// Canvas (`CanvasRenderingContext2D.fillStyle`) no resuelve `var(--x)` — Chart.js necesita
// un color ya resuelto. Estos valores son la paleta fija default de `src/styles/tokens.scss`,
// usados solo si no hay `document` (SSR/tests) o las CSS vars no están definidas; en la app
// real siempre se resuelve desde el token vía `getComputedStyle`.
const FALLBACK_PALETTE = ['#2a78d6', '#008300', '#e87ba4', '#eda100', '#1baf7a', '#eb6834', '#4a3aa7', '#e34948'];

/** Lee la paleta de colores del tenant activo desde las CSS vars del `:root`. */
function resolvePalette(): string[] {
  if (typeof document === 'undefined') return FALLBACK_PALETTE;
  const styles = getComputedStyle(document.documentElement);
  const palette = PALETTE_VARS.map(v => styles.getPropertyValue(v).trim()).filter(Boolean);
  return palette.length ? palette : FALLBACK_PALETTE;
}

const ORDINAL_PALETTE_VARS = Array.from({ length: 4 }, (_, i) => `--ordinal-${i + 1}`);
const FALLBACK_ORDINAL_PALETTE = ['#5598e7', '#2a78d6', '#1c5cab', '#104281'];

/** Rampa ordinal de 4 pasos (`--ordinal-1..4`, `tokens.scss`) — ver `MetricChartColorMode`. */
function resolveOrdinalPalette(): string[] {
  if (typeof document === 'undefined') return FALLBACK_ORDINAL_PALETTE;
  const styles = getComputedStyle(document.documentElement);
  const palette = ORDINAL_PALETTE_VARS.map(v => styles.getPropertyValue(v).trim()).filter(Boolean);
  return palette.length ? palette : FALLBACK_ORDINAL_PALETTE;
}

/** Lee una única CSS var del `:root` (con fallback si no está definida o no hay `document`). */
function resolveVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/** Forma mínima de un elemento posicionado de Chart.js (`PointElement`/`BarElement`) que
 * necesita el plugin de etiquetas — evita acoplarse a los tipos internos de cada elemento. */
interface PositionedElement {
  x: number;
  y: number;
  tooltipPosition?(useFinalPosition?: boolean): { x: number; y: number };
}

/** Config del plugin de etiquetas directas — ver `buildDirectLabelsPlugin`. */
interface DirectLabelsConfig {
  type: MetricChartType;
  orientation: MetricChartOrientation;
  unit: string | undefined;
  textColor: string;
}

/**
 * Plugin INLINE de Chart.js (`afterDraw`) — etiquetas directas selectivas (KAN-252: "los
 * valores no se ven a simple vista"). NO es una dependencia nueva: Chart.js ya expone la
 * API de plugins nativamente, esto es un objeto plano registrado vía el input `[plugins]`
 * de `p-chart` — se evita a propósito sumar `chartjs-plugin-datalabels` (spec: "preferir
 * etiquetas nativas... salvo que sea la única vía razonable"; acá SÍ hace falta un plugin
 * porque Chart.js no dibuja etiquetas permanentes por sí solo, pero no hace falta una lib).
 *
 * Sólo DIBUJA — qué punto/barra/gajo etiquetar y con qué texto es responsabilidad de
 * `selectSeriesLabels`/`selectBarLabels`/`selectDoughnutLabels` (`chart-data.mapper.ts`,
 * funciones puras, testeadas sin canvas ni TestBed). El color de texto es el ink del
 * design system (`--ds-text`), NUNCA el color de la serie/slice — la etiqueta es
 * información, no parte de la identidad visual del dato.
 */
function buildDirectLabelsPlugin(config: DirectLabelsConfig): Plugin {
  return {
    id: 'ui-metric-chart-direct-labels',
    afterDraw(chart) {
      const dataset = chart.data.datasets[0];
      if (!dataset) return;

      const ctx = chart.ctx;
      ctx.save();
      ctx.fillStyle = config.textColor;
      ctx.font = '11px sans-serif';

      if (config.type === 'line') {
        chart.data.datasets.forEach((ds, datasetIndex) => {
          const values = (ds.data as number[]) ?? [];
          const meta = chart.getDatasetMeta(datasetIndex);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          for (const { index, text } of selectSeriesLabels(values, config.unit)) {
            const point = meta.data[index] as unknown as PositionedElement | undefined;
            if (point) ctx.fillText(text, point.x, point.y - 6);
          }
        });
      } else if (config.type === 'bar' && config.orientation === 'horizontal') {
        const values = (dataset.data as number[]) ?? [];
        const meta = chart.getDatasetMeta(0);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        for (const { index, text } of selectBarLabels(values, config.unit)) {
          const bar = meta.data[index] as unknown as PositionedElement | undefined;
          if (bar) ctx.fillText(text, bar.x + 6, bar.y);
        }
      } else if (config.type === 'doughnut' || config.type === 'pie') {
        const values = (dataset.data as number[]) ?? [];
        const meta = chart.getDatasetMeta(0);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const { index, text } of selectDoughnutLabels(values, config.unit)) {
          const arc = meta.data[index] as unknown as PositionedElement | undefined;
          const pos = arc?.tooltipPosition?.() ?? arc;
          if (pos) ctx.fillText(text, pos.x, pos.y);
        }
      }

      ctx.restore();
    },
  };
}

/**
 * Wrapper único de `p-chart` (Chart.js) del kit de métricas. Ningún otro archivo del
 * proyecto debe importar Chart.js directamente — todo pasa por este componente.
 *
 * Consume `MetricSeries` (line/bar) o `MetricBreakdown` (pie/doughnut) y resuelve la
 * paleta desde las CSS vars del tenant activo para respetar el theming multi-tenant.
 */
@Component({
  selector: 'ui-metric-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChartModule, EmptyStateComponent],
  template: `
    <!-- loading() && !chartData(): el skeleton solo tapa la carga INICIAL. Un poll de
         background (5s, dashboards financiero/analítica/turnos) prende loading() de nuevo
         aunque ya haya datos — sin el "&& !chartData()" eso destruye y recrea <p-chart> en
         cada tick, aunque el dato sea idéntico (se ve como un parpadeo/recarga constante). -->
    @if (loading() && !chartData()) {
      <div class="ui-metric-chart__skeleton" [style.height]="height()"></div>
    } @else if (chartData(); as data) {
      <p-chart [type]="type" [data]="data" [options]="chartOptions()" [plugins]="chartPlugins()" [height]="height()" />
    } @else {
      <div [style.height]="height()" class="ui-metric-chart__empty">
        <ui-empty-state icon="pi-chart-bar" heading="Sin datos para el período seleccionado" />
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .ui-metric-chart__skeleton {
      width: 100%;
      border-radius: 10px;
      background: linear-gradient(90deg, var(--ds-surface) 25%, var(--ds-border) 50%, var(--ds-surface) 75%);
      background-size: 200% 100%;
      animation: ui-metric-chart-shimmer 1.4s ease-in-out infinite;
    }
    .ui-metric-chart__empty { display: flex; align-items: center; justify-content: center; }
    @keyframes ui-metric-chart-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `],
})
export class MetricChartComponent {
  // NOTE: classic @Input({ required: true }) en vez de input.required<>() — workaround del
  // bug conocido de vitest NG0950 (input.required() + setInput() falla en specs compilados
  // en JIT). Mismo patrón que cobro-atencion.component.ts. El tipo de gráfico no cambia en
  // caliente dentro de la vida del componente, así que no hace falta que sea reactivo.
  @Input({ required: true }) type!: MetricChartType;

  readonly series = input<MetricSeries | undefined>();
  readonly breakdown = input<MetricBreakdown | undefined>();
  readonly loading = input(false);
  readonly height = input('320px');
  /** Posición de la leyenda (pie/doughnut). 'right' achica el alto total cuando el
   * gráfico convive con cards de poca altura (ej. sección "En vivo"). */
  readonly legendPosition = input<'top' | 'right' | 'bottom' | 'left'>('top');
  /**
   * Format-kind por defecto cuando el envelope no trae `unit` (ej. datos armados a mano
   * en un test). `input<string>('count')` con default, NO `input.required()` — bug
   * conocido NG0950 en vitest con `input.required()` + `setInput()`. El valor efectivo
   * sale del propio envelope primero: `series()?.unit ?? breakdown()?.unit ?? unit()`.
   */
  readonly unit = input<string>('count');
  /** Sólo aplica a `type="bar"` — ver `MetricChartOrientation`. */
  readonly orientation = input<MetricChartOrientation>('vertical');
  /** Ver `MetricChartColorMode`. */
  readonly colorMode = input<MetricChartColorMode>('categorical');

  /** `true` para pie/doughnut, que consumen `breakdown` en vez de `series`. */
  protected readonly isCategorical = computed(() => {
    return this.type === 'pie' || this.type === 'doughnut';
  });

  /** `true` cuando el chart consume `breakdown` en vez de `series`: pie/doughnut siempre,
   * y también `bar` horizontal — conversión doughnut→barra (KAN-252) para dimensiones de
   * cardinalidad no acotada (turnos por sucursal, carga por extractor, etc). A diferencia
   * de `isCategorical()` (que además decide si el chart tiene ejes), esto sólo decide la
   * FUENTE de datos y cómo se arma el tooltip/leyenda. */
  protected readonly breakdownDriven = computed(() =>
    this.isCategorical() || (this.type === 'bar' && this.orientation() === 'horizontal'),
  );

  protected readonly effectiveUnit = computed(() => this.series()?.unit ?? this.breakdown()?.unit ?? this.unit());

  /**
   * Datos ya mapeados al formato de Chart.js, o `null` cuando no hay datos (empty-state).
   * El mapeo en sí vive en `chart-data.mapper.ts` (función pura, testeada sin TestBed).
   */
  protected readonly chartData = computed(() => {
    const overflowColor = resolveVar('--ds-text-muted', '#6b7280');

    if (this.breakdownDriven()) {
      const breakdown = this.breakdown();
      if (!breakdown) return null;
      const mode = this.colorMode();
      const palette = mode === 'ordinal' ? resolveOrdinalPalette() : resolvePalette();
      return mapMetricBreakdownToChartData(breakdown, palette, mode, overflowColor);
    }

    const series = this.series();
    return series ? mapMetricSeriesToChartData(series, this.type, resolvePalette(), overflowColor) : null;
  });

  /**
   * Opciones de Chart.js: leyenda, ejes y colores de texto/grilla según el tema activo.
   * La construcción en sí vive en `buildChartOptions` (`chart-data.mapper.ts`, función
   * pura) — mismo motivo que `chartData`/`buildYAxisScale`: `setInput()` sobre inputs no
   * confiable en este entorno de vitest (ver nota en `metric-chart.component.spec.ts`).
   */
  protected readonly chartOptions = computed(() => buildChartOptions({
    type: this.type,
    orientation: this.orientation(),
    unit: this.effectiveUnit(),
    datasetCount: this.series()?.datasets.length ?? 0,
    legendPosition: this.legendPosition(),
    textColor: resolveVar('--ds-text', '#1a1a2e'),
    gridColor: resolveVar('--ds-border', '#e6e8ef'),
  }));

  /** Ver `buildDirectLabelsPlugin`. Un solo plugin en el array — `p-chart` acepta varios,
   * este kit sólo necesita el de etiquetas directas. */
  protected readonly chartPlugins = computed(() => [buildDirectLabelsPlugin({
    type: this.type,
    orientation: this.orientation(),
    unit: this.effectiveUnit(),
    textColor: resolveVar('--ds-text', '#1a1a2e'),
  })]);
}
