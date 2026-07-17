import { ChangeDetectionStrategy, Component, Input, computed, input, signal } from '@angular/core';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { TableColumn } from '@shared/ui/models/table-column.model';
import { MetricBreakdown, MetricSeries } from '../../models/metric-envelopes.model';
import { unitFormat } from '../../util/metric-format.util';
import { MetricChartComponent, MetricChartType } from '../metric-chart/metric-chart.component';

/** Fila de la tabla gemela: mismo dato del gráfico, en números. */
export interface ChartCardRow {
  label: string;
  value: number;
}

/**
 * Deriva las filas de la tabla gemela a partir del mismo envelope que consume el gráfico.
 * Función pura — testeada sin `TestBed` (ver nota en `metric-chart.component.spec.ts` sobre
 * `setInput()` no confiable en este entorno de vitest).
 *
 * Para `MetricSeries` sólo usa el PRIMER dataset: el toggle tabla/gráfico de este card es
 * para series únicas (recaudación, TAT, volumen) — los pocos gráficos multi-dataset del
 * proyecto (ocupación de agenda) no pasan por acá.
 */
export function toChartCardRows(
  type: MetricChartType,
  series: MetricSeries | undefined,
  breakdown: MetricBreakdown | undefined,
): ChartCardRow[] {
  if (type === 'pie' || type === 'doughnut') {
    return breakdown?.slices.map(s => ({ label: s.label, value: s.value })) ?? [];
  }
  if (!series || series.datasets.length === 0) return [];
  const values = series.datasets[0].values;
  return series.labels.map((label, i) => ({ label, value: values[i] ?? 0 }));
}

/** `unit` efectivo para formatear la columna de valor: sale del envelope, `count` si no trae. */
export function resolveCardUnit(series: MetricSeries | undefined, breakdown: MetricBreakdown | undefined): string {
  return series?.unit ?? breakdown?.unit ?? 'count';
}

const SERIES_COLUMNS: TableColumn[] = [
  { field: 'label', header: 'Período' },
  { field: 'value', header: 'Valor', align: 'right' },
];

const BREAKDOWN_COLUMNS: TableColumn[] = [
  { field: 'label', header: 'Concepto' },
  { field: 'value', header: 'Valor', align: 'right' },
];

/**
 * Envuelve `ui-metric-chart` con un toggle "Ver tabla" que muestra los mismos datos en
 * `ui-table`, formateados con el mismo `unit` del envelope. Es el relief del WARN de
 * contraste de la paleta (KAN-252) y evita que el tooltip sea la única vía a un valor.
 */
@Component({
  selector: 'ui-metric-chart-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MetricChartComponent, DataTableComponent, UiCellDirective],
  template: `
    <div class="mcc">
      <div class="mcc__header">
        @if (title()) {
          <h3 class="mcc__title">{{ title() }}</h3>
        }
        <button type="button" class="mcc__toggle" (click)="toggleTable()">
          <i class="pi" [class.pi-table]="!showTable()" [class.pi-chart-bar]="showTable()"></i>
          {{ showTable() ? 'Ver gráfico' : 'Ver tabla' }}
        </button>
      </div>
      @if (showTable()) {
        <ui-table
          [value]="rows()"
          [columns]="columns()"
          [loading]="loading()"
          dataKey="label"
          emptyIcon="pi-inbox"
          emptyHeading="Sin datos para el período seleccionado">
          <ng-template uiCell="value" let-row>{{ formatValue(row.value) }}</ng-template>
        </ui-table>
      } @else {
        <ui-metric-chart
          [type]="type"
          [series]="series()"
          [breakdown]="breakdown()"
          [loading]="loading()"
          [legendPosition]="legendPosition()"
          [height]="height()" />
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .mcc__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 10px;
    }
    .mcc__title { margin: 0; font-size: 13px; font-weight: 700; color: #475569; }
    .mcc__toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid var(--ds-border, #e6e8ef);
      background: white;
      border-radius: 7px;
      padding: 5px 10px;
      font-size: 12px;
      font-weight: 600;
      color: var(--ds-text-muted, #6b7280);
      cursor: pointer;
      white-space: nowrap;
      transition: background 100ms ease, color 100ms ease;
    }
    .mcc__toggle:hover { background: #f4f7fb; color: var(--ds-text, #1a1a2e); }
  `],
})
export class MetricChartCardComponent {
  // Classic @Input({required:true}) por la misma razón que `ui-metric-chart`: `type` no
  // cambia en caliente y este patrón evita el workaround de setInput()/NG0950 en tests.
  @Input({ required: true }) type!: MetricChartType;

  readonly series = input<MetricSeries | undefined>();
  readonly breakdown = input<MetricBreakdown | undefined>();
  readonly loading = input(false);
  readonly title = input<string | null>(null);
  readonly legendPosition = input<'top' | 'right' | 'bottom' | 'left'>('top');
  readonly height = input('320px');

  protected readonly showTable = signal(false);

  protected readonly rows = computed(() => toChartCardRows(this.type, this.series(), this.breakdown()));
  protected readonly columns = computed<TableColumn[]>(() =>
    this.type === 'pie' || this.type === 'doughnut' ? BREAKDOWN_COLUMNS : SERIES_COLUMNS,
  );
  private readonly fmt = computed(() => unitFormat(resolveCardUnit(this.series(), this.breakdown())));

  protected toggleTable(): void {
    this.showTable.update(v => !v);
  }

  protected formatValue(value: number): string {
    return this.fmt().format(value);
  }
}
