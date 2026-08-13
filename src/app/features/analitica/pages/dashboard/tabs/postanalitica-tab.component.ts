import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, effect, inject, input } from '@angular/core';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { PollingHandle, PollingService } from '@core/refresh';
import { MetricChartCardComponent, MetricFilter, createBreakdownSorter, createBreakdownTranslator, formatKpiValue } from '@shared/metrics';
import { PanelCardComponent } from '@shared/ui/components/panel-card/panel-card.component';
import { StatCardComponent } from '@shared/ui/components/stat-card/stat-card.component';
import { loadPostanaliticaTab } from '../../../store/analitica-metrics/analitica-metrics.actions';
import { selectPostanaliticaTabData, selectPostanaliticaTabLoading } from '../../../store/analitica-metrics/analitica-metrics.selectors';

/** Pipeline de estados de un estudio postanalítico (`StudyStatus`, backend) — el orden acá
 * ES la rampa ordinal: `PENDING` (más claro) → `CLOSED` (más oscuro). El backend NO
 * garantiza este orden en el breakdown (agrupa iterando filas de la DB), así que el front
 * lo fuerza antes de pintarlo con `colorMode="ordinal"` — ver `createBreakdownSorter`. */
export const ESTUDIOS_PIPELINE_ORDER = ['PENDING', 'PARTIALLY_SIGNED', 'READY_FOR_SIGNATURE', 'CLOSED'];

/**
 * Tab "Postanalítica" del dashboard de métricas de Analítica (KAN-204): TAT de firma y
 * estudios por estado. El filtro es un `input()` — lo posee `AnaliticaDashboardPage`
 * (único, compartido con las otras 2 tabs, se muestra junto al título).
 */
@Component({
  selector: 'lab-analitica-postanalitica-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MetricChartCardComponent, StatCardComponent, PanelCardComponent],
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

      <!-- Serie temporal a ancho completo — el eje X es tiempo (KAN-252). -->
      <ui-metric-chart-card type="line" title="TAT promedio en el tiempo" [series]="tatSerie()" [loading]="loading()" />

      <!-- Estudios por estado: mantiene doughnut (4 gajos, pipeline ORDENADO, no nominal)
           con rampa ordinal claro→oscuro = PENDING→CLOSED. Table-view del propio card
           reemplaza al "detalle" manual que había acá. -->
      <div class="metrics-tab__bounded">
        <ui-metric-chart-card
          type="doughnut" colorMode="ordinal" title="Estudios por estado" legendPosition="right"
          [breakdown]="estudiosPorEstado()" [loading]="loading()" />
      </div>
    </div>
  `,
  styles: [`
    .metrics-tab { display: flex; flex-direction: column; gap: var(--space-5, 20px); }
    .metrics-tab__stats {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--space-4, 16px);
    }
    .metrics-tab__bounded { max-width: 480px; }
    @media (max-width: 900px) {
      .metrics-tab__bounded { max-width: none; }
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

  // Memoizados por referencia de entrada — ver comentario en `createBreakdownTranslator`
  // (evita que el gráfico/tabla se re-rendericen en cada poll aunque el dato no cambie).
  // El backend NO garantiza el orden PENDING→CLOSED (agrupa iterando filas de la DB) — el
  // sorter lo fuerza antes de pintar con `colorMode="ordinal"` (slice 0 = color más claro).
  private readonly translateEstudiosPorEstado = createBreakdownTranslator();
  private readonly sortEstudiosPorEstado = createBreakdownSorter(ESTUDIOS_PIPELINE_ORDER);
  protected readonly estudiosPorEstado = computed(() =>
    this.sortEstudiosPorEstado(this.translateEstudiosPorEstado(this.data().estudiosPorEstado)),
  );

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
      key: 'analitica-metrics-postanalitica',
      poll: () => {
        this.store.dispatch(loadPostanaliticaTab({ filter: this.filter() }));
        return of(null);
      },
    });
    this.destroyRef.onDestroy(() => this.pollHandle?.stop());
  }
}
