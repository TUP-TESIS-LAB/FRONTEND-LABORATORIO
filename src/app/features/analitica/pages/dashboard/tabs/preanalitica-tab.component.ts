import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, effect, inject, input } from '@angular/core';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { PollingHandle, PollingService } from '@core/refresh';
import { MetricChartCardComponent, MetricFilter, formatKpiValue } from '@shared/metrics';
import { PanelCardComponent } from '@shared/ui/components/panel-card/panel-card.component';
import { StatCardComponent } from '@shared/ui/components/stat-card/stat-card.component';
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
  imports: [MetricChartCardComponent, StatCardComponent, PanelCardComponent],
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

      <!-- Serie temporal a ancho completo — el eje X es tiempo (KAN-252). -->
      <ui-metric-chart-card type="line" title="Volumen de muestras" [series]="volumenTendencia()" [loading]="loading()" />

      <!-- Rechazo por sección: cardinalidad no acotada → barra horizontal, ancho completo.
           Table-view del propio card reemplaza al "detalle" manual que había acá. -->
      <ui-metric-chart-card
        type="bar" orientation="horizontal" colorMode="single" title="Rechazo por sección"
        [breakdown]="rechazoPorSeccion()" [loading]="loading()" />
    </div>
  `,
  styles: [`
    .metrics-tab { display: flex; flex-direction: column; gap: var(--space-5, 20px); }
    .metrics-tab__stats {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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

  protected readonly formatKpiValue = formatKpiValue;

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
