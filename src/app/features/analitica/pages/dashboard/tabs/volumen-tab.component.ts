import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { PollingHandle, PollingService } from '@core/refresh';
import {
  MetricChartComponent, MetricFilter, MetricFilterBarComponent, formatKpiValue,
} from '@shared/metrics';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { RefreshIndicatorComponent } from '@shared/ui/components/refresh-indicator/refresh-indicator.component';
import { StatCardComponent } from '@shared/ui/components/stat-card/stat-card.component';
import { TableColumn } from '@shared/ui/models/table-column.model';
import { selectBranches } from '../../../store/extraction/extraction.selectors';
import { loadBranches } from '../../../store/extraction/extraction.actions';
import { loadVolumenTab } from '../../../store/analitica-metrics/analitica-metrics.actions';
import { selectVolumenTabData, selectVolumenTabLoading } from '../../../store/analitica-metrics/analitica-metrics.selectors';
import { defaultMetricDateRange } from '../metrics-date-range.util';

/**
 * Tab "Volumen" del dashboard de métricas de Analítica (KAN-204). Endpoints elegidos a
 * propósito para requerir solo roles BIOQUIMICO/ADMINISTRADOR (mismo gate de la ruta) —
 * `atenciones` y `productividad` quedan fuera del MVP porque exigen roles que la ruta no
 * habilita (ver `analitica-metrics-api.service.ts`).
 */
@Component({
  selector: 'lab-analitica-volumen-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MetricFilterBarComponent, MetricChartComponent, StatCardComponent,
    DataTableComponent, RefreshIndicatorComponent,
  ],
  template: `
    <div class="metrics-tab">
      <div class="metrics-tab__filters">
        <ui-metric-filter-bar [branches]="branches()" [initial]="filter()" (filterChange)="onFilterChange($event)" />
        <ui-refresh-indicator [lastRefreshAt]="lastRefreshAt()" />
      </div>

      <section class="metrics-tab__stats">
        @if (volumenKpi(); as kpi) {
          <ui-stat-card label="Volumen total" [value]="formatKpiValue(kpi)" icon="pi-flask" />
        }
        @if (subEstadosTotal(); as total) {
          <ui-stat-card label="Sub-estados en curso" [value]="total" icon="pi-sitemap" accentColor="var(--ds-info)" />
        }
      </section>

      <section class="metrics-tab__charts">
        <div class="metrics-tab__chart-card">
          <h3>Volumen de determinaciones</h3>
          <ui-metric-chart type="bar" [series]="volumenSeries()" [loading]="loading()" />
        </div>
        <div class="metrics-tab__chart-card">
          <h3>Volumen por sección</h3>
          <ui-metric-chart type="doughnut" [breakdown]="volumenPorSeccion()" [loading]="loading()" />
        </div>
        <div class="metrics-tab__chart-card">
          <h3>Demografía por género</h3>
          <ui-metric-chart type="doughnut" [breakdown]="demografiaPorGenero()" [loading]="loading()" />
        </div>
      </section>

      <section class="metrics-tab__table">
        <h3>Sub-estados analíticos en vivo</h3>
        <ui-table
          [value]="subEstadosRows()"
          [columns]="columns"
          [loading]="loading()"
          dataKey="key"
          emptyIcon="pi-inbox"
          emptyHeading="Sin sub-estados en curso" />
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
export class VolumenTabComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly polling = inject(PollingService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly branches = this.store.selectSignal(selectBranches);
  protected readonly data = this.store.selectSignal(selectVolumenTabData);
  protected readonly loading = this.store.selectSignal(selectVolumenTabLoading);

  protected readonly filter = signal<MetricFilter>({ ...defaultMetricDateRange(), granularity: 'DAY' });
  protected readonly lastRefreshAt = signal<Date | null>(null);

  protected readonly volumenKpi = computed(() => this.data().volumen?.kpi ?? null);
  protected readonly volumenSeries = computed(() => this.data().volumen?.series);
  protected readonly volumenPorSeccion = computed(() => this.data().volumenPorSeccion ?? undefined);
  protected readonly demografiaPorGenero = computed(() => this.data().demografia?.porGenero ?? undefined);

  protected readonly subEstadosRows = computed(() => this.data().subEstados?.slices ?? []);
  /** Total en vivo = suma de todos los sub-estados (dato derivado, no pide otro endpoint). */
  protected readonly subEstadosTotal = computed(() => {
    const slices = this.data().subEstados?.slices;
    if (!slices || slices.length === 0) return null;
    return slices.reduce((sum, s) => sum + s.value, 0).toLocaleString('es-AR');
  });

  protected readonly formatKpiValue = formatKpiValue;

  protected readonly columns: TableColumn[] = [
    { field: 'label', header: 'Sub-estado' },
    { field: 'value', header: 'Cantidad', align: 'right' },
  ];

  private pollHandle: PollingHandle | null = null;

  ngOnInit(): void {
    this.store.dispatch(loadBranches());

    this.pollHandle = this.polling.startPolling({
      key: 'analitica-metrics-volumen',
      poll: () => {
        this.store.dispatch(loadVolumenTab({ filter: this.filter() }));
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
