import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, effect, inject, input } from '@angular/core';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { PollingHandle, PollingService } from '@core/refresh';
import {
  MetricChartComponent, MetricFilter, createBreakdownTranslator, formatKpiValue,
} from '@shared/metrics';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { PanelCardComponent } from '@shared/ui/components/panel-card/panel-card.component';
import { StatCardComponent } from '@shared/ui/components/stat-card/stat-card.component';
import { TableColumn } from '@shared/ui/models/table-column.model';
import { loadVolumenTab } from '../../../store/analitica-metrics/analitica-metrics.actions';
import { selectVolumenTabData, selectVolumenTabLoading } from '../../../store/analitica-metrics/analitica-metrics.selectors';

/**
 * Tab "Volumen" del dashboard de métricas de Analítica (KAN-204). Endpoints elegidos a
 * propósito para requerir solo roles BIOQUIMICO/ADMINISTRADOR (mismo gate de la ruta) —
 * `atenciones` y `productividad` quedan fuera del MVP porque exigen roles que la ruta no
 * habilita (ver `analitica-metrics-api.service.ts`).
 *
 * El filtro es un `input()` — lo posee `AnaliticaDashboardPage` (único, compartido con
 * las otras 2 tabs, se muestra junto al título) — esta tab solo reacciona a sus cambios.
 */
@Component({
  selector: 'lab-analitica-volumen-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MetricChartComponent, StatCardComponent, DataTableComponent, PanelCardComponent],
  template: `
    <div class="metrics-tab">
      <section class="metrics-tab__stats">
        @if (volumenKpi(); as kpi) {
          <ui-stat-card label="Volumen total" [value]="formatKpiValue(kpi)" />
        }
        @if (subEstadosTotal(); as total) {
          <ui-stat-card label="Sub-estados en curso" [value]="total" accentColor="var(--ds-info)" />
        }
      </section>

      <ui-panel-card title="Volumen de determinaciones">
        <ui-metric-chart type="line" [series]="volumenSeries()" [loading]="loading()" />
      </ui-panel-card>

      <section class="metrics-tab__charts">
        <ui-panel-card title="Volumen por sección">
          <ui-metric-chart type="doughnut" legendPosition="right" [breakdown]="volumenPorSeccion()" [loading]="loading()" />
        </ui-panel-card>
        <ui-panel-card title="Demografía por género">
          <ui-metric-chart type="doughnut" legendPosition="right" [breakdown]="demografiaPorGenero()" [loading]="loading()" />
        </ui-panel-card>
      </section>

      <ui-panel-card title="Sub-estados analíticos en vivo">
        <ui-table
          [value]="subEstadosRows()"
          [columns]="columns"
          [loading]="loading()"
          dataKey="key"
          emptyIcon="pi-inbox"
          emptyHeading="Sin sub-estados en curso" />
      </ui-panel-card>
    </div>
  `,
  styles: [`
    .metrics-tab { display: flex; flex-direction: column; gap: var(--space-5, 20px); }

    /* KPIs en su propia fila horizontal (ancho completo) — se probó emparejarlas en
       columna junto a un chart y, sea cual sea el chart, siempre quedan compitiendo mal
       contra un vecino de otra forma/altura. Una card de KPI es angosta y bajita por
       naturaleza; forzarla a "llenar" la altura de un donut nunca termina limpio. */
    .metrics-tab__stats {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--space-4, 16px);
    }

    /* Los 2 donuts van lado a lado, cada uno con su leyenda a la derecha (en vez de
       arriba) — antes los 3 charts (línea + 2 donuts) convivían en una sola fila y las
       leyendas quedaban apretadas. El de línea queda en su propia fila arriba porque
       necesita ancho para el eje de fechas.  */
    .metrics-tab__charts {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: var(--space-4, 16px);
    }
  `],
})
export class VolumenTabComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly polling = inject(PollingService);
  private readonly destroyRef = inject(DestroyRef);

  readonly filter = input.required<MetricFilter>();

  protected readonly data = this.store.selectSignal(selectVolumenTabData);
  protected readonly loading = this.store.selectSignal(selectVolumenTabLoading);

  protected readonly volumenKpi = computed(() => this.data().volumen?.kpi ?? null);
  protected readonly volumenSeries = computed(() => this.data().volumen?.series);
  protected readonly volumenPorSeccion = computed(() => this.data().volumenPorSeccion ?? undefined);

  // `createBreakdownTranslator()` memoiza por referencia de entrada: si el poll trae los
  // mismos datos (304), el `computed()` sigue disparándose (el slice del store recrea el
  // objeto contenedor) pero esto devuelve la MISMA salida, así que el gráfico/tabla no
  // se re-renderiza de nuevo — evita el "se actualiza en cada polling" (KAN-220).
  private readonly translateDemografia = createBreakdownTranslator();
  private readonly translateSubEstados = createBreakdownTranslator();

  protected readonly demografiaPorGenero = computed(() => this.translateDemografia(this.data().demografia?.porGenero));
  protected readonly subEstados = computed(() => this.translateSubEstados(this.data().subEstados));
  protected readonly subEstadosRows = computed(() => this.subEstados()?.slices ?? []);
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

  constructor() {
    // Filtro cambiado desde el header compartido → disparar un poll inmediato.
    effect(() => {
      this.filter();
      this.pollHandle?.pokeNow();
    });
  }

  ngOnInit(): void {
    this.pollHandle = this.polling.startPolling({
      key: 'analitica-metrics-volumen',
      poll: () => {
        this.store.dispatch(loadVolumenTab({ filter: this.filter() }));
        return of(null);
      },
    });
    this.destroyRef.onDestroy(() => this.pollHandle?.stop());
  }
}
