import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, effect, inject, input } from '@angular/core';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { PollingHandle, PollingService } from '@core/refresh';
import { MetricChartComponent, MetricFilter, createBreakdownTranslator, formatKpiValue } from '@shared/metrics';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { PanelCardComponent } from '@shared/ui/components/panel-card/panel-card.component';
import { StatCardComponent } from '@shared/ui/components/stat-card/stat-card.component';
import { TableColumn } from '@shared/ui/models/table-column.model';
import { loadPostanaliticaTab } from '../../../store/analitica-metrics/analitica-metrics.actions';
import { selectPostanaliticaTabData, selectPostanaliticaTabLoading } from '../../../store/analitica-metrics/analitica-metrics.selectors';

/**
 * Tab "Postanalítica" del dashboard de métricas de Analítica (KAN-204): TAT de firma y
 * estudios por estado. El filtro es un `input()` — lo posee `AnaliticaDashboardPage`
 * (único, compartido con las otras 2 tabs, se muestra junto al título).
 */
@Component({
  selector: 'lab-analitica-postanalitica-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MetricChartComponent, StatCardComponent, DataTableComponent, PanelCardComponent],
  template: `
    <div class="metrics-tab">
      <section class="metrics-tab__stats">
        @if (tatPromedioKpi(); as kpi) {
          <ui-stat-card label="TAT promedio (recepción → firma)" [value]="formatKpiValue(kpi)" icon="pi-clock" />
        }
        @if (estudiosTotalKpi(); as kpi) {
          <ui-stat-card label="Estudios creados" [value]="formatKpiValue(kpi)" icon="pi-file" accentColor="var(--ds-info)" />
        }
      </section>

      <section class="metrics-tab__charts">
        <ui-panel-card title="TAT promedio en el tiempo">
          <ui-metric-chart type="line" [series]="tatSerie()" [loading]="loading()" />
        </ui-panel-card>
        <ui-panel-card title="Estudios por estado">
          <ui-metric-chart type="doughnut" [breakdown]="estudiosPorEstado()" [loading]="loading()" />
        </ui-panel-card>
      </section>

      <ui-panel-card title="Estudios por estado — detalle">
        <ui-table
          [value]="estudiosPorEstadoRows()"
          [columns]="columns"
          [loading]="loading()"
          dataKey="key"
          emptyIcon="pi-inbox"
          emptyHeading="Sin estudios en el rango" />
      </ui-panel-card>
    </div>
  `,
  styles: [`
    .metrics-tab { display: flex; flex-direction: column; gap: var(--space-5, 20px); }
    .metrics-tab__stats {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--space-4, 16px);
    }
    .metrics-tab__charts {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: var(--space-4, 16px);
    }
  `],
})
export class PostanaliticaTabComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly polling = inject(PollingService);
  private readonly destroyRef = inject(DestroyRef);

  readonly filter = input.required<MetricFilter>();

  protected readonly data = this.store.selectSignal(selectPostanaliticaTabData);
  protected readonly loading = this.store.selectSignal(selectPostanaliticaTabLoading);

  protected readonly tatPromedioKpi = computed(() => this.data().tatPromedio ?? null);
  protected readonly estudiosTotalKpi = computed(() => this.data().estudiosTotal ?? null);
  protected readonly tatSerie = computed(() => this.data().tatSerie ?? undefined);

  // Memoizado por referencia de entrada — ver comentario en `createBreakdownTranslator`
  // (evita que el gráfico/tabla se re-rendericen en cada poll aunque el dato no cambie).
  private readonly translateEstudiosPorEstado = createBreakdownTranslator();
  protected readonly estudiosPorEstado = computed(() => this.translateEstudiosPorEstado(this.data().estudiosPorEstado));
  protected readonly estudiosPorEstadoRows = computed(() => this.estudiosPorEstado()?.slices ?? []);

  protected readonly formatKpiValue = formatKpiValue;

  protected readonly columns: TableColumn[] = [
    { field: 'label', header: 'Estado' },
    { field: 'value', header: 'Cantidad', align: 'right' },
  ];

  private pollHandle: PollingHandle | null = null;

  constructor() {
    effect(() => {
      this.filter();
      this.pollHandle?.pokeNow();
    });
  }

  ngOnInit(): void {
    this.pollHandle = this.polling.startPolling({
      key: 'analitica-metrics-postanalitica',
      poll: () => {
        this.store.dispatch(loadPostanaliticaTab({ filter: this.filter() }));
        return of(null);
      },
    });
    this.destroyRef.onDestroy(() => this.pollHandle?.stop());
  }
}
