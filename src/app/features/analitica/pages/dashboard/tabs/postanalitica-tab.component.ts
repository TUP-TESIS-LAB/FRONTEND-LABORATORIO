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
import { loadPostanaliticaTab } from '../../../store/analitica-metrics/analitica-metrics.actions';
import { selectPostanaliticaTabData, selectPostanaliticaTabLoading } from '../../../store/analitica-metrics/analitica-metrics.selectors';
import { defaultMetricDateRange } from '../metrics-date-range.util';

/** Tab "Postanalítica" del dashboard de métricas de Analítica (KAN-204): TAT de firma y estudios por estado. */
@Component({
  selector: 'lab-analitica-postanalitica-tab',
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
        @if (tatPromedioKpi(); as kpi) {
          <ui-stat-card label="TAT promedio (recepción → firma)" [value]="formatKpiValue(kpi)" icon="pi-clock" />
        }
        @if (estudiosTotalKpi(); as kpi) {
          <ui-stat-card label="Estudios creados" [value]="formatKpiValue(kpi)" icon="pi-file" accentColor="var(--ds-info)" />
        }
      </section>

      <section class="metrics-tab__charts">
        <div class="metrics-tab__chart-card">
          <h3>TAT promedio en el tiempo</h3>
          <ui-metric-chart type="line" [series]="tatSerie()" [loading]="loading()" />
        </div>
        <div class="metrics-tab__chart-card">
          <h3>Estudios por estado</h3>
          <ui-metric-chart type="doughnut" [breakdown]="estudiosPorEstado()" [loading]="loading()" />
        </div>
      </section>

      <section class="metrics-tab__table">
        <h3>Estudios por estado — detalle</h3>
        <ui-table
          [value]="estudiosPorEstadoRows()"
          [columns]="columns"
          [loading]="loading()"
          dataKey="key"
          emptyIcon="pi-inbox"
          emptyHeading="Sin estudios en el rango" />
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
export class PostanaliticaTabComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly polling = inject(PollingService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly branches = this.store.selectSignal(selectBranches);
  protected readonly data = this.store.selectSignal(selectPostanaliticaTabData);
  protected readonly loading = this.store.selectSignal(selectPostanaliticaTabLoading);

  protected readonly filter = signal<MetricFilter>({ ...defaultMetricDateRange(), granularity: 'DAY' });
  protected readonly lastRefreshAt = signal<Date | null>(null);

  protected readonly tatPromedioKpi = computed(() => this.data().tatPromedio ?? null);
  protected readonly estudiosTotalKpi = computed(() => this.data().estudiosTotal ?? null);
  protected readonly tatSerie = computed(() => this.data().tatSerie ?? undefined);
  protected readonly estudiosPorEstado = computed(() => this.data().estudiosPorEstado ?? undefined);
  protected readonly estudiosPorEstadoRows = computed(() => this.data().estudiosPorEstado?.slices ?? []);

  protected readonly formatKpiValue = formatKpiValue;

  protected readonly columns: TableColumn[] = [
    { field: 'label', header: 'Estado' },
    { field: 'value', header: 'Cantidad', align: 'right' },
  ];

  private pollHandle: PollingHandle | null = null;

  ngOnInit(): void {
    this.store.dispatch(loadBranches());

    this.pollHandle = this.polling.startPolling({
      key: 'analitica-metrics-postanalitica',
      poll: () => {
        this.store.dispatch(loadPostanaliticaTab({ filter: this.filter() }));
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
