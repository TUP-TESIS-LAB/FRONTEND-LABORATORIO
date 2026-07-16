import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { catchError, of } from 'rxjs';

import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { RefreshIndicatorComponent } from '@shared/ui/components/refresh-indicator/refresh-indicator.component';
import { StatCardComponent } from '@shared/ui/components/stat-card/stat-card.component';
import {
  MetricBranchOption,
  MetricChartComponent,
  MetricFilter,
  MetricFilterBarComponent,
  MetricKpi,
  formatKpiValue,
} from '@shared/metrics';
import { PollingHandle, PollingService } from '@core/refresh';

import { SucursalesService } from '@features/sucursales/services/sucursales.service';

import { loadFlujoEnVivo, loadFlujoHistorico } from '../../store/flujo-metrics/flujo-metrics.actions';
import {
  selectCargaExtractor,
  selectColaExtraccionVivo,
  selectEnVivoLoading,
  selectEsperaLlamado,
  selectHistoricoErrors,
  selectHistoricoLoading,
  selectOcupacionAgenda,
  selectOcupacionBoxesVivo,
  selectReLlamados,
  selectTasaCancelacion,
  selectUrgentes,
  selectVolumenCola,
  selectVolumenTurnos,
} from '../../store/flujo-metrics/flujo-metrics.selectors';

/** ISO date (yyyy-MM-dd) de `d`, en horario local. */
function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** `n` días antes de `d` (nueva instancia, no muta `d`). */
function daysBefore(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() - n);
  return out;
}

/** Formatea un `MetricKpi` posiblemente ausente (aún sin cargar) como "—". */
function kpiValue(kpi: MetricKpi | null | undefined): string {
  return kpi ? formatKpiValue(kpi) : '—';
}

/**
 * Dashboard de métricas de flujo operativo (FOP-01..10, KAN-205). Compone el
 * kit compartido de métricas (`@shared/metrics`) con los datos de
 * `turnos/metricas` (histórico) y `atencion/metricas` (histórico + en vivo).
 *
 * Dos polling independientes (5s c/u, vía `PollingService`): uno para la
 * sección histórica (respeta el `MetricFilter` de la barra de filtros) y otro
 * para la sección "en vivo" (gauges snapshot — solo depende de `branchId`).
 */
@Component({
  selector: 'app-flujo-dashboard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeaderComponent,
    RefreshIndicatorComponent,
    StatCardComponent,
    MetricFilterBarComponent,
    MetricChartComponent,
  ],
  template: `
    <div class="flu-dash">
      <ui-page-header
        heading="Flujo operativo"
        subtitle="Volumen de turnos y cola, cancelación, ocupación de agenda y llamados en el rango elegido.">
        <ui-refresh-indicator [lastRefreshAt]="historicoRefreshAt()" />
      </ui-page-header>

      <!-- ── Filtros ── -->
      <div class="flu-card flu-filters">
        <ui-metric-filter-bar
          [branches]="branchOptions()"
          [initial]="initialFilter"
          (filterChange)="onFilterChange($event)" />
      </div>

      @if (historicoErrorCount() > 0) {
        <div class="flu-warning">
          <i class="pi pi-exclamation-triangle"></i>
          {{ historicoErrorCount() }} métrica{{ historicoErrorCount() === 1 ? '' : 's' }}
          no se pudo{{ historicoErrorCount() === 1 ? '' : 'ieron' }} actualizar. Mostrando el último dato disponible.
        </div>
      }

      <!-- ── KPIs histórico ── -->
      <div class="flu-kpi-grid">
        <ui-stat-card label="Turnos" [value]="kpiValue(volumenTurnos()?.total)" />
        <ui-stat-card label="Cola" [value]="kpiValue(volumenCola()?.total)" />
        <ui-stat-card label="Cancelación" [value]="kpiValue(tasaCancelacion())" />
        <ui-stat-card label="Ocupación de agenda" [value]="kpiValue(ocupacionAgenda()?.ocupacion)" />
        <ui-stat-card label="Espera de llamado (prom.)" [value]="kpiValue(esperaLlamado()?.avg)" />
        <ui-stat-card label="Re-llamados (prom.)" [value]="kpiValue(reLlamados()?.promedio)" />
      </div>

      <!-- ── Charts histórico ── -->
      <div class="flu-chart-grid">
        <div class="flu-card">
          <h3>Volumen de turnos</h3>
          <ui-metric-chart type="bar" [series]="volumenTurnosSeries()" [loading]="historicoLoading()" />
        </div>
        <div class="flu-card">
          <h3>Volumen de cola</h3>
          <ui-metric-chart type="bar" [series]="volumenColaSeries()" [loading]="historicoLoading()" />
        </div>
        <div class="flu-card">
          <h3>Ocupación de agenda</h3>
          <ui-metric-chart type="bar" [series]="ocupacionAgendaSeries()" [loading]="historicoLoading()" />
        </div>
        @if (volumenTurnosBreakdown(); as bd) {
          <div class="flu-card">
            <h3>Turnos por sucursal</h3>
            <ui-metric-chart type="doughnut" [breakdown]="bd" [loading]="historicoLoading()" />
          </div>
        }
        <div class="flu-card">
          <h3>Re-llamados por turno</h3>
          <ui-metric-chart type="doughnut" [breakdown]="reLlamadosBreakdown()" [loading]="historicoLoading()" />
        </div>
        <div class="flu-card">
          <h3>Carga por extractor</h3>
          <ui-metric-chart type="doughnut" [breakdown]="cargaExtractorBreakdown()" [loading]="historicoLoading()" />
        </div>
      </div>

      <!-- ── En vivo ── -->
      <div class="flu-card">
        <div class="flu-section-head">
          <h3>En vivo</h3>
          <ui-refresh-indicator [lastRefreshAt]="enVivoRefreshAt()" />
        </div>
        <div class="flu-live-grid">
          <div class="flu-live-kpis">
            <ui-stat-card label="Cola de extracción" [value]="kpiValue(colaExtraccionVivo())" />
            <ui-stat-card label="Ocupación de boxes" [value]="kpiValue(ocupacionBoxesVivo())" />
          </div>
          <div class="flu-card flu-card--inset">
            <h4>Urgentes por estado</h4>
            <ui-metric-chart
              type="doughnut"
              height="140px"
              legendPosition="right"
              [breakdown]="urgentesBreakdown()"
              [loading]="enVivoLoading()" />
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .flu-dash { display: flex; flex-direction: column; gap: 18px; }

    .flu-card {
      background: white; border-radius: 12px;
      box-shadow: 0 1px 2px rgba(28,30,55,.06), 0 1px 1px rgba(28,30,55,.04);
      border: 1px solid #e8e9f0;
      padding: 16px 18px;
    }
    .flu-card--inset { box-shadow: none; border-style: dashed; }
    .flu-card h3 { margin: 0 0 12px; font-size: 15px; font-weight: 700; color: #1a1a2e; }
    .flu-card h4 { margin: 0 0 10px; font-size: 13px; font-weight: 700; color: #1a1a2e; }

    .flu-filters { padding: 12px 18px; }

    .flu-warning {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 14px; border-radius: 10px;
      background: rgba(245,158,11,.1); color: #92400e;
      border: 1px solid rgba(245,158,11,.25);
      font-size: 13px; font-weight: 500;
    }

    /* Grid de KPIs: 2 columnas en mobile, 3 en desktop (convención del DS) —
       evita amontonar las 6 cards en una sola fila estirada. */
    .flu-kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
    @media (min-width: 768px) {
      .flu-kpi-grid { grid-template-columns: repeat(3, 1fr); }
    }

    .flu-chart-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 14px; }

    .flu-section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
    .flu-section-head h3 { margin: 0; }

    /* Sección "En vivo": las 2 KPI cards de un lado, el gráfico del otro —
       en vez de apiladas con el gráfico ocupando el ancho completo. */
    .flu-live-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
    .flu-live-kpis { display: flex; flex-direction: column; gap: 14px; }
    /* Las 2 KPI cards se reparten el alto disponible para no dejar espacio muerto
       cuando la columna se estira a la altura del gráfico de al lado. */
    .flu-live-kpis > ui-stat-card { flex: 1; }
    @media (min-width: 768px) {
      .flu-live-grid { grid-template-columns: minmax(220px, 320px) 1fr; align-items: stretch; }
    }
  `],
})
export class FlujoDashboardPage implements OnInit {
  private readonly store = inject(Store);
  private readonly polling = inject(PollingService);
  private readonly destroy = inject(DestroyRef);
  private readonly sucursalesService = inject(SucursalesService);

  // ── Selectors: histórico ────────────────────────────────────────────────
  readonly volumenTurnos = this.store.selectSignal(selectVolumenTurnos);
  readonly volumenCola = this.store.selectSignal(selectVolumenCola);
  readonly tasaCancelacion = this.store.selectSignal(selectTasaCancelacion);
  readonly ocupacionAgenda = this.store.selectSignal(selectOcupacionAgenda);
  readonly esperaLlamado = this.store.selectSignal(selectEsperaLlamado);
  readonly reLlamados = this.store.selectSignal(selectReLlamados);
  readonly cargaExtractor = this.store.selectSignal(selectCargaExtractor);
  readonly historicoLoading = this.store.selectSignal(selectHistoricoLoading);
  readonly historicoErrors = this.store.selectSignal(selectHistoricoErrors);
  readonly historicoErrorCount = computed(
    () => Object.values(this.historicoErrors()).filter((e) => e != null).length,
  );

  // ── Selectors: en vivo ───────────────────────────────────────────────────
  readonly colaExtraccionVivo = this.store.selectSignal(selectColaExtraccionVivo);
  readonly ocupacionBoxesVivo = this.store.selectSignal(selectOcupacionBoxesVivo);
  readonly urgentes = this.store.selectSignal(selectUrgentes);
  readonly enVivoLoading = this.store.selectSignal(selectEnVivoLoading);

  // ── Sucursales accesibles (alimenta el selector del filtro) ────────────
  // Mismo origen que financiero/analitica: /api/v1/sucursales/branches (el store
  // legacy pega a /api/sucursales y devuelve 403).
  readonly branchOptions = toSignal(
    this.sucursalesService.listBranchesForSelector().pipe(
      catchError(() => of([] as MetricBranchOption[])),
    ),
    { initialValue: [] as MetricBranchOption[] },
  );

  // ── Series/breakdowns derivados (null → undefined para el kit) ─────────
  readonly volumenTurnosSeries = computed(() => this.volumenTurnos()?.series);
  readonly volumenColaSeries = computed(() => this.volumenCola()?.series);
  readonly ocupacionAgendaSeries = computed(() => this.ocupacionAgenda()?.series);
  readonly volumenTurnosBreakdown = computed(() => this.volumenTurnos()?.breakdown ?? undefined);
  readonly reLlamadosBreakdown = computed(() => this.reLlamados()?.breakdown);
  readonly cargaExtractorBreakdown = computed(() => this.cargaExtractor() ?? undefined);
  readonly urgentesBreakdown = computed(() => this.urgentes() ?? undefined);

  protected readonly kpiValue = kpiValue;

  // ── Filtro (por defecto: últimos 7 días, todas las sucursales, por día) ──
  private readonly today = new Date();
  readonly initialFilter: Partial<MetricFilter> = {
    dateFrom: toIsoDate(daysBefore(this.today, 6)),
    dateTo: toIsoDate(this.today),
    granularity: 'DAY',
  };
  private readonly filter = signal<MetricFilter>({
    dateFrom: this.initialFilter.dateFrom!,
    dateTo: this.initialFilter.dateTo!,
    granularity: 'DAY',
  });

  readonly historicoRefreshAt = signal<Date | null>(null);
  readonly enVivoRefreshAt = signal<Date | null>(null);

  private historicoHandle: PollingHandle | null = null;
  private enVivoHandle: PollingHandle | null = null;

  ngOnInit(): void {
    this.historicoHandle = this.polling.startPolling({
      key: 'turnos-flujo-historico',
      intervalMs: 5000,
      poll: () => {
        this.store.dispatch(loadFlujoHistorico({ filter: this.filter() }));
        this.historicoRefreshAt.set(new Date());
        return of(null);
      },
    });

    this.enVivoHandle = this.polling.startPolling({
      key: 'turnos-flujo-en-vivo',
      intervalMs: 5000,
      poll: () => {
        this.store.dispatch(loadFlujoEnVivo({ branchId: this.filter().branchId }));
        this.enVivoRefreshAt.set(new Date());
        return of(null);
      },
    });

    this.destroy.onDestroy(() => {
      this.historicoHandle?.stop();
      this.enVivoHandle?.stop();
    });
  }

  protected onFilterChange(filter: MetricFilter): void {
    const branchChanged = filter.branchId !== this.filter().branchId;
    this.filter.set(filter);
    this.historicoHandle?.pokeNow();
    // El polling "en vivo" ignora dateFrom/dateTo — solo re-pollear si cambió branchId.
    if (branchChanged) this.enVivoHandle?.pokeNow();
  }
}
