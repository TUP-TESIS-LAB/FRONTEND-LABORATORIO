import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';

import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { RefreshIndicatorComponent } from '@shared/ui/components/refresh-indicator/refresh-indicator.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';
import { TableColumn } from '@shared/ui/models/table-column.model';

import { PollingService, PollingHandle } from '@core/refresh';

import {
  selectSucursalesRows,
  selectSucursalesTotals,
  selectSucursalesLoading,
  selectSucursalesError,
} from '../../store/financiero.selectors';
import { loadBranchesSummary } from '../../store/financiero.actions';

/** ISO instant del inicio (00:00:00.000) del día local `isoDate` (YYYY-MM-DD). */
function dayStart(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}
/** ISO instant del fin (23:59:59.999) del día local `isoDate` (YYYY-MM-DD). */
function dayEnd(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}
function todayIso(): string {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

@Component({
  selector: 'fin-sucursales-resumen-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    PageHeaderComponent,
    DataTableComponent,
    RefreshIndicatorComponent,
    UiCellDirective,
    EmptyStateComponent,
    CurrencyArPipe,
  ],
  template: `
    <div class="fin-suc">
      <ui-page-header
        heading="Sucursales"
        subtitle="Resumen operativo consolidado de todas las sucursales en el rango elegido.">
        <ui-refresh-indicator [lastRefreshAt]="lastRefreshAt()" />
      </ui-page-header>

      <!-- ── Rango de fechas ── -->
      <div class="fin-card fin-card--range">
        <div class="fin-range-field">
          <label for="fin-suc-from"><i class="pi pi-calendar"></i> Desde</label>
          <input id="fin-suc-from" type="date" class="fin-date" data-testid="range-from"
                 [ngModel]="fromDay()" (ngModelChange)="setFrom($event)" />
        </div>
        <div class="fin-range-field">
          <label for="fin-suc-to"><i class="pi pi-calendar"></i> Hasta</label>
          <input id="fin-suc-to" type="date" class="fin-date" data-testid="range-to"
                 [ngModel]="toDay()" (ngModelChange)="setTo($event)" />
        </div>
        @if (rangeInvalid()) {
          <span class="fin-range-warn" data-testid="range-warn">
            <i class="pi pi-exclamation-triangle"></i> "Desde" no puede ser posterior a "Hasta".
          </span>
        }
      </div>

      <!-- ── ERROR ── -->
      @if (error()) {
        <div class="fin-card">
          <ui-empty-state
            icon="pi-exclamation-triangle"
            heading="Error al cargar el resumen"
            [description]="error() ?? ''"
            ctaLabel="Reintentar"
            (ctaClick)="retry()" />
        </div>
      } @else {
        <!-- ── Totales (consolidado del rango) ── -->
        @if (totals(); as t) {
          <div class="fin-kpi-grid">
            <div class="fin-kpi-card fin-kpi-card--hero">
              <div class="fin-kpi-label"><i class="pi pi-chart-line"></i> Total ingresos</div>
              <div class="fin-kpi-value" data-testid="total-ingresos">{{ t.totalIngresos | currencyAr }}</div>
              <div class="fin-kpi-meta">efectivo + otros medios · todas las sucursales</div>
            </div>
            <div class="fin-kpi-card">
              <div class="fin-kpi-label"><i class="pi pi-money-bill"></i> Efectivo</div>
              <div class="fin-kpi-value fin-kpi-value--dark">{{ t.efectivo | currencyAr }}</div>
            </div>
            <div class="fin-kpi-card">
              <div class="fin-kpi-label"><i class="pi pi-credit-card"></i> Otros medios</div>
              <div class="fin-kpi-value fin-kpi-value--dark">{{ t.otrosMedios | currencyAr }}</div>
            </div>
            <div class="fin-kpi-card">
              <div class="fin-kpi-label"><i class="pi pi-receipt"></i> Cobros</div>
              <div class="fin-kpi-value fin-kpi-value--dark">{{ t.cobrosCount }}</div>
              <div class="fin-kpi-meta">{{ t.cobrosAmount | currencyAr }} cobrados</div>
            </div>
          </div>
        }

        <!-- ── Tabla por sucursal ── -->
        <div class="fin-card fin-card--table">
          <div class="fin-table-head">
            <h3>Detalle por sucursal</h3>
            @if (!loading()) {
              <span class="fin-muted">{{ rows().length }} sucursal{{ rows().length === 1 ? '' : 'es' }}</span>
            }
          </div>

          @if (loading() && rows().length === 0) {
            <div class="fin-skeleton fin-skeleton--tall" style="margin: 16px 18px"></div>
          } @else {
            <ui-table
              [value]="rows()"
              [columns]="columns"
              [loading]="loading()"
              emptyIcon="pi-building"
              emptyHeading="Sin sucursales activas"
              emptyDescription="No hay sucursales activas para mostrar en este rango.">
              <ng-template uiCell="sucursal" let-row>
                <div class="fin-suc-name">
                  <span>{{ row.branchName }}</span>
                  <small class="fin-muted">{{ row.branchCode }}</small>
                </div>
              </ng-template>
              <ng-template uiCell="cobrosCount" let-row>{{ row.cobrosCount }}</ng-template>
              <ng-template uiCell="cobrosAmount" let-row>{{ row.cobrosAmount | currencyAr }}</ng-template>
              <ng-template uiCell="efectivo" let-row>{{ row.efectivo | currencyAr }}</ng-template>
              <ng-template uiCell="otrosMedios" let-row>{{ row.otrosMedios | currencyAr }}</ng-template>
              <ng-template uiCell="totalIngresos" let-row>
                <b>{{ row.totalIngresos | currencyAr }}</b>
              </ng-template>
            </ui-table>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .fin-suc { display: flex; flex-direction: column; gap: 18px; }

    .fin-card {
      background: white; border-radius: 12px;
      box-shadow: 0 1px 2px rgba(28,30,55,.06), 0 1px 1px rgba(28,30,55,.04);
      border: 1px solid #e8e9f0;
    }
    .fin-card--range { padding: 14px 18px; display: flex; align-items: flex-end; gap: 20px; flex-wrap: wrap; }
    .fin-card--table { overflow: hidden; }

    .fin-range-field { display: flex; flex-direction: column; gap: 5px; }
    .fin-range-field label { font-size: 12px; font-weight: 600; color: #475569; display: inline-flex; align-items: center; gap: 5px; }
    .fin-date {
      border: 1px solid #d5d9e3; border-radius: 8px; padding: 7px 10px;
      font-size: 13px; color: #1a1a2e; background: #fff;
    }
    .fin-range-warn { color: #c2410c; font-size: 12px; display: inline-flex; align-items: center; gap: 6px; align-self: center; }

    .fin-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; }
    .fin-kpi-card {
      background: white; border: 1px solid #e8e9f0; border-radius: 12px; padding: 16px 18px;
      display: flex; flex-direction: column; gap: 6px;
    }
    .fin-kpi-card--hero { background: linear-gradient(135deg, #1e293b, #334155); color: #fff; border: none; }
    .fin-kpi-card--hero .fin-kpi-label { color: #cbd5e1; }
    .fin-kpi-card--hero .fin-kpi-meta { color: #94a3b8; }
    .fin-kpi-label { font-size: 12px; color: #64748b; display: inline-flex; align-items: center; gap: 6px; font-weight: 600; }
    .fin-kpi-value { font-size: 26px; font-weight: 800; color: #fff; letter-spacing: -.02em; }
    .fin-kpi-value--dark { color: #1a1a2e; }
    .fin-kpi-meta { font-size: 12px; color: #7c8092; }

    .fin-table-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 10px; }
    .fin-table-head h3 { margin: 0; font-size: 15px; font-weight: 700; color: #1a1a2e; }

    .fin-suc-name { display: flex; flex-direction: column; }
    .fin-suc-name > span { font-weight: 600; color: #1a1a2e; }

    .fin-skeleton { background: linear-gradient(90deg, #f5f6f9 25%, #eceef3 50%, #f5f6f9 75%); border-radius: 8px; height: 120px; }

    .fin-muted { font-size: 12px; color: #7c8092; }
  `],
})
export class SucursalesResumenPage implements OnInit {
  private readonly store   = inject(Store);
  private readonly polling = inject(PollingService);
  private readonly destroy = inject(DestroyRef);

  // Selectors
  readonly rows    = this.store.selectSignal(selectSucursalesRows);
  readonly totals  = this.store.selectSignal(selectSucursalesTotals);
  readonly loading = this.store.selectSignal(selectSucursalesLoading);
  readonly error   = this.store.selectSignal(selectSucursalesError);

  // UI state — rango, por defecto el día de hoy.
  readonly fromDay = signal<string>(todayIso());
  readonly toDay   = signal<string>(todayIso());
  readonly lastRefreshAt = signal<Date | null>(null);

  readonly rangeInvalid = () => this.fromDay() > this.toDay();

  readonly columns: TableColumn[] = [
    { field: 'sucursal',      header: 'Sucursal' },
    { field: 'cobrosCount',   header: 'Cobros', align: 'center' },
    { field: 'cobrosAmount',  header: 'Monto cobros', align: 'right' },
    { field: 'efectivo',      header: 'Efectivo', align: 'right' },
    { field: 'otrosMedios',   header: 'Otros medios', align: 'right' },
    { field: 'totalIngresos', header: 'Total', align: 'right' },
  ];

  private pollingHandle: PollingHandle | null = null;

  ngOnInit(): void {
    this.pollingHandle = this.polling.startPolling({
      key: 'financiero-sucursales',
      intervalMs: 5000,
      poll: () => {
        if (this.rangeInvalid()) return of(null);
        this.store.dispatch(loadBranchesSummary({
          from: dayStart(this.fromDay()),
          to: dayEnd(this.toDay()),
        }));
        this.lastRefreshAt.set(new Date());
        return of(null);
      },
    });

    this.destroy.onDestroy(() => this.pollingHandle?.stop());
  }

  protected setFrom(day: string): void {
    this.fromDay.set(day);
    this.pollingHandle?.pokeNow();
  }

  protected setTo(day: string): void {
    this.toDay.set(day);
    this.pollingHandle?.pokeNow();
  }

  protected retry(): void {
    this.pollingHandle?.pokeNow();
  }
}
