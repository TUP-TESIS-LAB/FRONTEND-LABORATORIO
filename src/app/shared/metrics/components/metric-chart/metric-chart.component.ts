import { ChangeDetectionStrategy, Component, Input, computed, input } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { MetricBreakdown, MetricSeries } from '../../models/metric-envelopes.model';
import { unitFormat } from '../../util/metric-format.util';
import { buildYAxisScale, mapMetricBreakdownToChartData, mapMetricSeriesToChartData } from './chart-data.mapper';

/** Tipo de gráfico soportado por el wrapper (subconjunto de los que expone `p-chart`). */
export type MetricChartType = 'line' | 'bar' | 'pie' | 'doughnut';

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

/** Lee una única CSS var del `:root` (con fallback si no está definida o no hay `document`). */
function resolveVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
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
      <p-chart [type]="type" [data]="data" [options]="chartOptions()" [height]="height()" />
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

  /** `true` para pie/doughnut, que consumen `breakdown` en vez de `series`. */
  protected readonly isCategorical = computed(() => {
    return this.type === 'pie' || this.type === 'doughnut';
  });

  protected readonly effectiveUnit = computed(() => this.series()?.unit ?? this.breakdown()?.unit ?? this.unit());

  /**
   * Datos ya mapeados al formato de Chart.js, o `null` cuando no hay datos (empty-state).
   * El mapeo en sí vive en `chart-data.mapper.ts` (función pura, testeada sin TestBed).
   */
  protected readonly chartData = computed(() => {
    const palette = resolvePalette();

    if (this.isCategorical()) {
      const breakdown = this.breakdown();
      return breakdown ? mapMetricBreakdownToChartData(breakdown, palette) : null;
    }

    const series = this.series();
    return series ? mapMetricSeriesToChartData(series, this.type, palette) : null;
  });

  /**
   * Opciones de Chart.js: leyenda, ejes y colores de texto/grilla según el tema activo.
   * `unit` deriva TODO el formato numérico — un solo input, cuatro comportamientos
   * consistentes: precisión/`beginAtZero` del eje Y, tick del eje Y, y tooltip.
   * Sólo `unit: 'count'` fuerza eje entero (KAN-252) — el resto tolera decimales.
   */
  protected readonly chartOptions = computed(() => {
    const textColor = resolveVar('--ds-text', '#1a1a2e');
    const gridColor = resolveVar('--ds-border', '#e6e8ef');
    const categorical = this.isCategorical();
    const datasetCount = this.series()?.datasets.length ?? 0;
    const fmt = unitFormat(this.effectiveUnit());
    const yAxis = buildYAxisScale(this.effectiveUnit(), textColor, gridColor);

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: categorical || datasetCount > 1,
          position: this.legendPosition(),
          labels: { color: textColor },
        },
        tooltip: {
          callbacks: {
            label: (ctx: { label: string; parsed: number | { y: number }; dataset: { label?: string } }) => {
              const raw = categorical ? ctx.parsed : (ctx.parsed as { y: number }).y;
              const seriesLabel = categorical ? ctx.label : ctx.dataset.label;
              return `${seriesLabel}: ${fmt.format(Number(raw))}`;
            },
          },
        },
      },
      scales: categorical ? undefined : {
        x: { ticks: { color: textColor }, grid: { color: gridColor } },
        y: yAxis,
      },
    };
  });
}
