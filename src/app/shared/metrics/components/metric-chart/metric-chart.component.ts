import { ChangeDetectionStrategy, Component, Input, computed, input } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { MetricBreakdown, MetricSeries } from '../../models/metric-envelopes.model';
import { mapMetricBreakdownToChartData, mapMetricSeriesToChartData } from './chart-data.mapper';

/** Tipo de gráfico soportado por el wrapper (subconjunto de los que expone `p-chart`). */
export type MetricChartType = 'line' | 'bar' | 'pie' | 'doughnut';

/** Paleta multi-tenant: tokens de marca primero, luego los fijos del design system. */
const PALETTE_VARS = [
  '--brand-primary',
  '--brand-secondary',
  '--brand-accent',
  '--ds-info',
  '--ds-success',
  '--ds-warning',
  '--ds-danger',
] as const;

const FALLBACK_PALETTE = ['#2563eb', '#0ea5a4', '#f97316', '#3b82f6', '#22c55e', '#f59e0b', '#e23a47'];

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
    @if (loading()) {
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

  /** `true` para pie/doughnut, que consumen `breakdown` en vez de `series`. */
  protected readonly isCategorical = computed(() => {
    return this.type === 'pie' || this.type === 'doughnut';
  });

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

  /** Opciones de Chart.js: leyenda, ejes y colores de texto/grilla según el tema activo. */
  protected readonly chartOptions = computed(() => {
    const textColor = resolveVar('--ds-text', '#1a1a2e');
    const gridColor = resolveVar('--ds-border', '#e6e8ef');
    const categorical = this.isCategorical();
    const datasetCount = this.series()?.datasets.length ?? 0;

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: categorical || datasetCount > 1,
          labels: { color: textColor },
        },
      },
      scales: categorical ? undefined : {
        x: { ticks: { color: textColor }, grid: { color: gridColor } },
        y: { ticks: { color: textColor }, grid: { color: gridColor } },
      },
    };
  });
}
