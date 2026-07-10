import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { PollingHandle, PollingService } from '@core/refresh';
import { MetricChartComponent, MetricFilter, MetricFilterBarComponent, formatKpiValue } from '@shared/metrics';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { RefreshIndicatorComponent } from '@shared/ui/components/refresh-indicator/refresh-indicator.component';
import { StatCardComponent } from '@shared/ui/components/stat-card/stat-card.component';
import { TableColumn } from '@shared/ui/models/table-column.model';
import { selectBranches } from '../../../store/extraction/extraction.selectors';
import { loadBranches } from '../../../store/extraction/extraction.actions';
import { loadPreanaliticaTab } from '../../../store/analitica-metrics/analitica-metrics.actions';
import { selectPreanaliticaTabData, selectPreanaliticaTabLoading } from '../../../store/analitica-metrics/analitica-metrics.selectors';
import { defaultMetricDateRange } from '../metrics-date-range.util';

/** Tab "Preanalítica" del dashboard de métricas de Analítica (KAN-204): rechazo, pérdidas y volumen de muestras. */
@Component({
  selector: 'lab-analitica-preanalitica-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MetricFilterBarComponent, MetricChartComponent, StatCardComponent, DataTableComponent, RefreshIndicatorComponent],
  template: `
    <div class="metrics-tab">
      <div class="metrics-tab__filters">
        <ui-metric-filter-bar [branches]="branches()" [initial]="filter()" (filterChange)="onFilterChange($event)" />
        <ui-refresh-indicator [lastRefreshAt]="lastRefreshAt()" />
      </div>

      <section class="metrics-tab__stats">
        @if (rechazoKpi(); as kpi) {
          <ui-stat-card label="Tasa de rechazo" [value]="formatKpiValue(kpi)" icon="pi-times-circle" accentColor="var(--ds-danger)" />
        }
        @if (perdidasKpi(); as kpi) {
          <ui-stat-card label="Pérdidas de muestras" [value]="formatKpiValue(kpi)" icon="pi-exclamation-triangle" accentColor="var(--ds-warning)" />
        }
      </section>

      <section class="metrics-tab__charts">
        <div class="metrics-tab__chart-card">
          <h3>Volumen de muestras</h3>
          <ui-metric-chart type="bar" [series]="volumenTendencia()" [loading]="loading()" />
        </div>
        <div class="metrics-tab__chart-card">
          <h3>Rechazo por sección</h3>
          <ui-metric-chart type="doughnut" [breakdown]="rechazoPorSeccion()" [loading]="loading()" />
        </div>
      </section>

      <section class="metrics-tab__table">
        <h3>Rechazo por sección — detalle</h3>
        <ui-table
          [value]="rechazoRows()"
          [columns]="columns"
          [loading]="loading()"
          dataKey="key"
          emptyIcon="pi-inbox"
          emptyHeading="Sin rechazos en el rango" />
      </section>
    </div>
  `,
  styles: [`
    .metrics-tab { display: flex; flex-direction: column; gap: var(--space-5, 20px); }
    .metrics-tab__filters {
      display: flex; align-items: flex-end; justify-content: space-between;
      gap: var(--space-4, 16px); flex-wrap: wrap;
    }
    .metrics-tab__stats {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--space-4, 16px);
    }
    .metrics-tab__charts {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: var(--space-4, 16px);
    }
    .metrics-tab__chart-card, .metrics-tab__table {
      background: white; border-radius: 10px; padding: var(--space-4, 16px);
      border: 1px solid #e8edf3;
    }
    .metrics-tab__chart-card h3, .metrics-tab__table h3 {
      margin: 0 0 var(--space-3, 12px); font-size: 13.5px; font-weight: 700; color: var(--ds-text);
    }
  `],
})
export class PreanaliticaTabComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly polling = inject(PollingService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly branches = this.store.selectSignal(selectBranches);
  protected readonly data = this.store.selectSignal(selectPreanaliticaTabData);
  protected readonly loading = this.store.selectSignal(selectPreanaliticaTabLoading);

  protected readonly filter = signal<MetricFilter>({ ...defaultMetricDateRange(), granularity: 'DAY' });
  protected readonly lastRefreshAt = signal<Date | null>(null);

  protected readonly rechazoKpi = computed(() => this.data().rechazoResumen ?? null);
  protected readonly perdidasKpi = computed(() => this.data().perdidasResumen ?? null);
  protected readonly volumenTendencia = computed(() => this.data().volumenTendencia ?? undefined);
  protected readonly rechazoPorSeccion = computed(() => this.data().rechazoPorSeccion ?? undefined);
  protected readonly rechazoRows = computed(() => this.data().rechazoPorSeccion?.slices ?? []);

  protected readonly formatKpiValue = formatKpiValue;

  protected readonly columns: TableColumn[] = [
    { field: 'label', header: 'Sección' },
    { field: 'value', header: 'Rechazos', align: 'right' },
  ];

  private pollHandle: PollingHandle | null = null;

  ngOnInit(): void {
    this.store.dispatch(loadBranches());

    this.pollHandle = this.polling.startPolling({
      key: 'analitica-metrics-preanalitica',
      poll: () => {
        this.store.dispatch(loadPreanaliticaTab({ filter: this.filter() }));
        this.lastRefreshAt.set(new Date());
        return of(null);
      },
    });
    this.destroyRef.onDestroy(() => this.pollHandle?.stop());
  }

  protected onFilterChange(filter: MetricFilter): void {
    this.filter.set(filter);
    this.pollHandle?.pokeNow();
  }
}
