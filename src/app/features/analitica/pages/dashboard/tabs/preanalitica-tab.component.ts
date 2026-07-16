import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, effect, inject, input } from '@angular/core';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { PollingHandle, PollingService } from '@core/refresh';
import { MetricChartComponent, MetricFilter, formatKpiValue } from '@shared/metrics';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { PanelCardComponent } from '@shared/ui/components/panel-card/panel-card.component';
import { StatCardComponent } from '@shared/ui/components/stat-card/stat-card.component';
import { TableColumn } from '@shared/ui/models/table-column.model';
import { loadPreanaliticaTab } from '../../../store/analitica-metrics/analitica-metrics.actions';
import { selectPreanaliticaTabData, selectPreanaliticaTabLoading } from '../../../store/analitica-metrics/analitica-metrics.selectors';

/**
 * Tab "Preanalítica" del dashboard de métricas de Analítica (KAN-204): rechazo, pérdidas y
 * volumen de muestras. El filtro es un `input()` — lo posee `AnaliticaDashboardPage`
 * (único, compartido con las otras 2 tabs, se muestra junto al título).
 */
@Component({
  selector: 'lab-analitica-preanalitica-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MetricChartComponent, StatCardComponent, DataTableComponent, PanelCardComponent],
  template: `
    <div class="metrics-tab">
      <section class="metrics-tab__stats">
        @if (rechazoKpi(); as kpi) {
          <ui-stat-card label="Tasa de rechazo" [value]="formatKpiValue(kpi)" icon="pi-times-circle" accentColor="var(--ds-danger)" />
        }
        @if (perdidasKpi(); as kpi) {
          <ui-stat-card label="Pérdidas de muestras" [value]="formatKpiValue(kpi)" icon="pi-exclamation-triangle" accentColor="var(--ds-warning)" />
        }
      </section>

      <section class="metrics-tab__charts">
        <ui-panel-card title="Volumen de muestras">
          <ui-metric-chart type="line" [series]="volumenTendencia()" [loading]="loading()" />
        </ui-panel-card>
        <ui-panel-card title="Rechazo por sección">
          <ui-metric-chart type="doughnut" [breakdown]="rechazoPorSeccion()" [loading]="loading()" />
        </ui-panel-card>
      </section>

      <ui-panel-card title="Rechazo por sección — detalle">
        <ui-table
          [value]="rechazoRows()"
          [columns]="columns"
          [loading]="loading()"
          dataKey="key"
          emptyIcon="pi-inbox"
          emptyHeading="Sin rechazos en el rango" />
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
export class PreanaliticaTabComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly polling = inject(PollingService);
  private readonly destroyRef = inject(DestroyRef);

  readonly filter = input.required<MetricFilter>();

  protected readonly data = this.store.selectSignal(selectPreanaliticaTabData);
  protected readonly loading = this.store.selectSignal(selectPreanaliticaTabLoading);

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

  constructor() {
    effect(() => {
      this.filter();
      this.pollHandle?.pokeNow();
    });
  }

  ngOnInit(): void {
    this.pollHandle = this.polling.startPolling({
      key: 'analitica-metrics-preanalitica',
      poll: () => {
        this.store.dispatch(loadPreanaliticaTab({ filter: this.filter() }));
        return of(null);
      },
    });
    this.destroyRef.onDestroy(() => this.pollHandle?.stop());
  }
}
