import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { StatCardComponent } from '@shared/ui/components/stat-card/stat-card.component';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { RefreshIndicatorComponent } from '@shared/ui/components/refresh-indicator/refresh-indicator.component';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';
import { TableColumn } from '@shared/ui/models/table-column.model';

import { PollingService, PollingHandle } from '@core/refresh';
import { SucursalesService } from '@features/sucursales/services/sucursales.service';

import {
  MetricBreakdown, MetricChartComponent, MetricFilter, MetricFilterBarComponent, MetricKpi,
  formatKpiValue, kpiDeltaMeta,
} from '@shared/metrics';

import { loadFinancieroMetricsDashboard } from '../../store/metrics/actions';
import {
  selectRecaudacionKpis, selectRecaudacionSerie, selectRecaudacionPorMetodo, selectRecaudacionPorSucursal,
  selectFacturacionKpis, selectFacturacionPorCobertura,
  selectLiquidacionesKpis, selectLiquidacionesPorObraSocial,
  selectCajaKpis, selectCajaPorSucursal,
  selectConciliacionKpis, selectConciliacionPorMetodo,
  selectTesoreriaKpis, selectTesoreriaPorOrigen,
  selectFinancieroMetricsLoading, selectFinancieroMetricsError,
} from '../../store/metrics/selectors';

// Funciones puras, exportadas para testear sin TestBed (bug conocido NG0950 con
// input.required() + setInput() en specs compilados en JIT — ver financiero-dashboard.page.spec.ts).

/** ISO date (yyyy-MM-dd) de `d`, en horario local — evita corrimientos de timezone. */
export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Filtro por defecto: últimos 30 días, granularidad diaria — suficiente para una tendencia legible. */
export function defaultFilter(): MetricFilter {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { dateFrom: toIsoDate(from), dateTo: toIsoDate(to), granularity: 'DAY' };
}

/** Props listas para `ui-stat-card` a partir de un `MetricKpi` — value/sub/icon/color vía el kit. */
export interface KpiCard { label: string; value: string; sub: string | null; icon: string | null; accentColor: string; }

export function toKpiCard(kpi: MetricKpi): KpiCard {
  const delta = kpiDeltaMeta(kpi.delta);
  const pct = kpi.delta?.changePct;
  return {
    label: kpi.label,
    value: formatKpiValue(kpi),
    sub: pct != null ? `${Math.abs(pct).toFixed(1)}% vs. período anterior` : null,
    icon: delta?.icon ?? null,
    accentColor: delta?.cssVar ?? 'var(--brand-secondary)',
  };
}

/** Filas de tabla a partir de un `MetricBreakdown` (label + monto). */
export function toBreakdownRows(breakdown: MetricBreakdown | undefined): { label: string; value: number }[] {
  return breakdown?.slices.map(s => ({ label: s.label, value: s.value })) ?? [];
}

const BREAKDOWN_TABLE_COLUMNS: TableColumn[] = [
  { field: 'label', header: 'Concepto' },
  { field: 'value', header: 'Monto', align: 'right' },
];

@Component({
  selector: 'fin-dashboard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeaderComponent, StatCardComponent, DataTableComponent, UiCellDirective,
    RefreshIndicatorComponent, EmptyStateComponent, CurrencyArPipe,
    MetricChartComponent, MetricFilterBarComponent,
  ],
  template: `
    <div class="fin-dash">
      <ui-page-header
        heading="Dashboard financiero"
        subtitle="Recaudación, facturación, liquidaciones, caja, conciliación y tesorería del período elegido.">
        <ui-refresh-indicator [lastRefreshAt]="lastRefreshAt()" />
      </ui-page-header>

      <div class="fin-card fin-filters">
        <ui-metric-filter-bar [branches]="branchOptions()" [initial]="filter()" (filterChange)="onFilterChange($event)" />
      </div>

      @if (error(); as err) {
        <div class="fin-card">
          <ui-empty-state
            icon="pi-exclamation-triangle"
            heading="Error al cargar las métricas"
            [description]="err"
            ctaLabel="Reintentar"
            (ctaClick)="retry()" />
        </div>
      }

      <!-- ── Recaudación (MFI-01) ── -->
      <section class="fin-section">
        <h2 class="fin-section__title">Recaudación</h2>
        <div class="fin-kpi-grid">
          @for (kpi of recaudacionKpiCards(); track kpi.label) {
            <ui-stat-card [label]="kpi.label" [value]="kpi.value" [sub]="kpi.sub" [icon]="kpi.icon" [accentColor]="kpi.accentColor" />
          }
        </div>
        <div class="fin-viz-grid">
          <div class="fin-card fin-viz-card fin-viz-card--wide">
            <h3 class="fin-viz-card__title">Evolución de la recaudación</h3>
            <ui-metric-chart type="line" [series]="recaudacionSerie()" [loading]="loading()" />
          </div>
          <div class="fin-card fin-viz-card">
            <h3 class="fin-viz-card__title">Por método de pago</h3>
            <ui-metric-chart type="doughnut" [breakdown]="recaudacionPorMetodo()" [loading]="loading()" />
          </div>
        </div>
        <div class="fin-card fin-card--table">
          <h3 class="fin-viz-card__title">Por sucursal</h3>
          <ui-table
            [value]="recaudacionPorSucursalRows()"
            [columns]="breakdownColumns"
            [loading]="loading()"
            dataKey="label"
            emptyIcon="pi-inbox"
            emptyHeading="Sin recaudación en el rango"
            emptyDescription="No hay recaudación registrada para los filtros elegidos.">
            <ng-template uiCell="value" let-row>{{ row.value | currencyAr }}</ng-template>
          </ui-table>
        </div>
      </section>

      <!-- ── Facturación (MFI-02) ── -->
      <section class="fin-section">
        <h2 class="fin-section__title">Facturación</h2>
        <div class="fin-kpi-grid">
          @for (kpi of facturacionKpiCards(); track kpi.label) {
            <ui-stat-card [label]="kpi.label" [value]="kpi.value" [sub]="kpi.sub" [icon]="kpi.icon" [accentColor]="kpi.accentColor" />
          }
        </div>
        <div class="fin-viz-grid fin-viz-grid--single">
          <div class="fin-card fin-viz-card">
            <h3 class="fin-viz-card__title">Particular vs. cobertura</h3>
            <ui-metric-chart type="doughnut" [breakdown]="facturacionPorCobertura()" [loading]="loading()" />
          </div>
        </div>
      </section>

      <!-- ── Liquidaciones (MFI-03) ── -->
      <section class="fin-section">
        <h2 class="fin-section__title">Liquidaciones</h2>
        <div class="fin-kpi-grid">
          @for (kpi of liquidacionesKpiCards(); track kpi.label) {
            <ui-stat-card [label]="kpi.label" [value]="kpi.value" [sub]="kpi.sub" [icon]="kpi.icon" [accentColor]="kpi.accentColor" />
          }
        </div>
        <div class="fin-card fin-card--table">
          <h3 class="fin-viz-card__title">Por obra social</h3>
          <ui-table
            [value]="liquidacionesPorObraSocialRows()"
            [columns]="breakdownColumns"
            [loading]="loading()"
            dataKey="label"
            emptyIcon="pi-inbox"
            emptyHeading="Sin liquidaciones en el rango"
            emptyDescription="No hay liquidaciones registradas para los filtros elegidos.">
            <ng-template uiCell="value" let-row>{{ row.value | currencyAr }}</ng-template>
          </ui-table>
        </div>
      </section>

      <!-- ── Caja (MFI-04) ── -->
      <section class="fin-section">
        <h2 class="fin-section__title">Caja</h2>
        <div class="fin-kpi-grid">
          @for (kpi of cajaKpiCards(); track kpi.label) {
            <ui-stat-card [label]="kpi.label" [value]="kpi.value" [sub]="kpi.sub" [icon]="kpi.icon" [accentColor]="kpi.accentColor" />
          }
        </div>
        <div class="fin-card fin-card--table">
          <h3 class="fin-viz-card__title">Diferencia de arqueo por sucursal</h3>
          <ui-table
            [value]="cajaPorSucursalRows()"
            [columns]="breakdownColumns"
            [loading]="loading()"
            dataKey="label"
            emptyIcon="pi-inbox"
            emptyHeading="Sin arqueos en el rango"
            emptyDescription="No hay sesiones de caja cerradas para los filtros elegidos.">
            <ng-template uiCell="value" let-row>{{ row.value | currencyAr }}</ng-template>
          </ui-table>
        </div>
      </section>

      <!-- ── Conciliación (MFI-05) ── -->
      <section class="fin-section">
        <h2 class="fin-section__title">Conciliación digital</h2>
        <div class="fin-kpi-grid">
          @for (kpi of conciliacionKpiCards(); track kpi.label) {
            <ui-stat-card [label]="kpi.label" [value]="kpi.value" [sub]="kpi.sub" [icon]="kpi.icon" [accentColor]="kpi.accentColor" />
          }
        </div>
        <div class="fin-viz-grid fin-viz-grid--single">
          <div class="fin-card fin-viz-card">
            <h3 class="fin-viz-card__title">Por método</h3>
            <ui-metric-chart type="doughnut" [breakdown]="conciliacionPorMetodo()" [loading]="loading()" />
          </div>
        </div>
      </section>

      <!-- ── Tesorería (MFI-06) ── -->
      <section class="fin-section">
        <h2 class="fin-section__title">Tesorería</h2>
        <div class="fin-kpi-grid">
          @for (kpi of tesoreriaKpiCards(); track kpi.label) {
            <ui-stat-card [label]="kpi.label" [value]="kpi.value" [sub]="kpi.sub" [icon]="kpi.icon" [accentColor]="kpi.accentColor" />
          }
        </div>
        <div class="fin-viz-grid fin-viz-grid--single">
          <div class="fin-card fin-viz-card">
            <h3 class="fin-viz-card__title">Por origen</h3>
            <ui-metric-chart type="doughnut" [breakdown]="tesoreriaPorOrigen()" [loading]="loading()" />
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .fin-dash { display: flex; flex-direction: column; gap: 22px; }

    .fin-card {
      background: white; border-radius: 12px;
      box-shadow: 0 1px 2px rgba(28,30,55,.06), 0 1px 1px rgba(28,30,55,.04);
      border: 1px solid #e8e9f0;
    }
    .fin-card--table { padding: 16px 18px; overflow: hidden; }

    .fin-filters { padding: 12px 18px; }

    .fin-section { display: flex; flex-direction: column; gap: 12px; }
    .fin-section__title { margin: 0; font-size: 16px; font-weight: 700; color: #1a1a2e; }

    .fin-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; }

    .fin-viz-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; }
    .fin-viz-grid--single { grid-template-columns: 1fr; }
    @media (max-width: 900px) { .fin-viz-grid { grid-template-columns: 1fr; } }

    .fin-viz-card { padding: 16px 18px; }
    .fin-viz-card--wide { min-width: 0; }
    .fin-viz-card__title { margin: 0 0 10px; font-size: 13px; font-weight: 700; color: #475569; }
  `],
})
export class FinancieroDashboardPage implements OnInit {
  private readonly store = inject(Store);
  private readonly polling = inject(PollingService);
  private readonly destroy = inject(DestroyRef);
  private readonly sucursalesService = inject(SucursalesService);

  // ── Filtro (fecha/sucursal/granularidad) ────────────────────────────────
  readonly filter = signal<MetricFilter>(defaultFilter());
  readonly lastRefreshAt = signal<Date | null>(null);

  /** Sucursales accesibles del usuario, mismo patrón que el selector de agendas. */
  readonly branchOptions = toSignal(
    this.sucursalesService.listBranchesForSelector().pipe(
      catchError(() => of([] as { id: number; name: string }[])),
    ),
    { initialValue: [] as { id: number; name: string }[] },
  );

  // ── Selectors: recaudación ──
  private readonly recaudacionKpis = this.store.selectSignal(selectRecaudacionKpis);
  readonly recaudacionSerie = this.store.selectSignal(selectRecaudacionSerie);
  readonly recaudacionPorMetodo = this.store.selectSignal(selectRecaudacionPorMetodo);
  private readonly recaudacionPorSucursal = this.store.selectSignal(selectRecaudacionPorSucursal);

  // ── Selectors: facturación ──
  private readonly facturacionKpis = this.store.selectSignal(selectFacturacionKpis);
  readonly facturacionPorCobertura = this.store.selectSignal(selectFacturacionPorCobertura);

  // ── Selectors: liquidaciones ──
  private readonly liquidacionesKpis = this.store.selectSignal(selectLiquidacionesKpis);
  private readonly liquidacionesPorObraSocial = this.store.selectSignal(selectLiquidacionesPorObraSocial);

  // ── Selectors: caja ──
  private readonly cajaKpis = this.store.selectSignal(selectCajaKpis);
  private readonly cajaPorSucursal = this.store.selectSignal(selectCajaPorSucursal);

  // ── Selectors: conciliación ──
  private readonly conciliacionKpis = this.store.selectSignal(selectConciliacionKpis);
  readonly conciliacionPorMetodo = this.store.selectSignal(selectConciliacionPorMetodo);

  // ── Selectors: tesorería ──
  private readonly tesoreriaKpis = this.store.selectSignal(selectTesoreriaKpis);
  readonly tesoreriaPorOrigen = this.store.selectSignal(selectTesoreriaPorOrigen);

  readonly loading = this.store.selectSignal(selectFinancieroMetricsLoading);
  readonly error = this.store.selectSignal(selectFinancieroMetricsError);

  // ── KPI cards (formatKpiValue/kpiDeltaMeta del kit → props de ui-stat-card) ──
  readonly recaudacionKpiCards = computed(() => this.recaudacionKpis().map(toKpiCard));
  readonly facturacionKpiCards = computed(() => this.facturacionKpis().map(toKpiCard));
  readonly liquidacionesKpiCards = computed(() => this.liquidacionesKpis().map(toKpiCard));
  readonly cajaKpiCards = computed(() => this.cajaKpis().map(toKpiCard));
  readonly conciliacionKpiCards = computed(() => this.conciliacionKpis().map(toKpiCard));
  readonly tesoreriaKpiCards = computed(() => this.tesoreriaKpis().map(toKpiCard));

  // ── Breakdowns renderizados como tabla (sucursal / obra social) ──
  readonly recaudacionPorSucursalRows = computed(() => toBreakdownRows(this.recaudacionPorSucursal()));
  readonly liquidacionesPorObraSocialRows = computed(() => toBreakdownRows(this.liquidacionesPorObraSocial()));
  readonly cajaPorSucursalRows = computed(() => toBreakdownRows(this.cajaPorSucursal()));

  readonly breakdownColumns = BREAKDOWN_TABLE_COLUMNS;

  private pollingHandle: PollingHandle | null = null;

  ngOnInit(): void {
    this.pollingHandle = this.polling.startPolling({
      key: 'financiero-metrics-dashboard',
      intervalMs: 5000,
      poll: () => {
        this.store.dispatch(loadFinancieroMetricsDashboard({ filter: this.filter() }));
        this.lastRefreshAt.set(new Date());
        return of(null);
      },
    });

    this.destroy.onDestroy(() => this.pollingHandle?.stop());
  }

  protected onFilterChange(filter: MetricFilter): void {
    this.filter.set(filter);
    this.pollingHandle?.pokeNow();
  }

  protected retry(): void {
    this.pollingHandle?.pokeNow();
  }
}
