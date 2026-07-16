import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { DatePickerModule } from 'primeng/datepicker';
import { MultiSelectModule } from 'primeng/multiselect';

import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { RefreshIndicatorComponent } from '@shared/ui/components/refresh-indicator/refresh-indicator.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';
import { TableColumn } from '@shared/ui/models/table-column.model';

import { PollingService, PollingHandle } from '@core/refresh';

import { MetodoChipComponent } from '../../components/metodo-chip.component';
import { MovementsTotals, PaymentMethod, METHOD_META } from '../../models/financiero.model';
import {
  selectMovimientosRows,
  selectMovimientosBranches,
  selectMovimientosLoading,
  selectMovimientosError,
} from '../../store/financiero.selectors';
import { loadMovements } from '../../store/financiero.actions';

/** ISO instant del inicio (00:00:00.000) del día local de `d`. */
function dayStartIso(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).toISOString();
}
/** ISO instant del fin (23:59:59.999) del día local de `d`. */
function dayEndIso(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).toISOString();
}
/** Día local (medianoche) de `d`, para comparar rangos sin la hora. */
function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

@Component({
  selector: 'fin-sucursales-resumen-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    DatePickerModule,
    MultiSelectModule,
    PageHeaderComponent,
    DataTableComponent,
    RefreshIndicatorComponent,
    UiCellDirective,
    EmptyStateComponent,
    CurrencyArPipe,
    MetodoChipComponent,
  ],
  template: `
    <div class="fin-suc">
      <ui-page-header
        heading="Sucursales"
        subtitle="Movimientos de todas las sucursales (efectivo y otros medios) en el rango elegido.">
        <ui-refresh-indicator [lastRefreshAt]="lastRefreshAt()" />
      </ui-page-header>

      <!-- ── Filtros ── -->
      <div class="fin-card fin-filters">
        <div class="fin-field">
          <label for="fin-from">Desde</label>
          <p-datepicker inputId="fin-from" dateFormat="dd/mm/yy" appendTo="body" [showIcon]="false"
                        [maxDate]="to()" data-testid="range-from"
                        [ngModel]="from()" (ngModelChange)="setFrom($event)" />
        </div>
        <div class="fin-field">
          <label for="fin-to">Hasta</label>
          <p-datepicker inputId="fin-to" dateFormat="dd/mm/yy" appendTo="body" [showIcon]="false"
                        [minDate]="from()" data-testid="range-to"
                        [ngModel]="to()" (ngModelChange)="setTo($event)" />
        </div>
        <div class="fin-field">
          <label for="fin-branch">Sucursal</label>
          <p-multiSelect inputId="fin-branch" appendTo="body" styleClass="w-full"
                         [options]="branches()" optionLabel="name" optionValue="id"
                         placeholder="Todas" [showHeader]="false" [filter]="false"
                         selectedItemsLabel="{0} sucursales" [maxSelectedLabels]="1"
                         data-testid="branch-filter"
                         [ngModel]="selectedBranchIds()" (ngModelChange)="setBranches($event)" />
        </div>
        <div class="fin-field">
          <label for="fin-method">Medio de pago</label>
          <p-multiSelect inputId="fin-method" appendTo="body" styleClass="w-full"
                         [options]="methodOptions" optionLabel="label" optionValue="value"
                         placeholder="Todos" [showHeader]="false" [filter]="false"
                         selectedItemsLabel="{0} medios" [maxSelectedLabels]="1"
                         data-testid="method-filter"
                         [ngModel]="selectedMethods()" (ngModelChange)="setMethods($event)" />
        </div>
      </div>

      <!-- ── ERROR ── -->
      @if (error()) {
        <div class="fin-card">
          <ui-empty-state
            icon="pi-exclamation-triangle"
            heading="Error al cargar los movimientos"
            [description]="error() ?? ''"
            ctaLabel="Reintentar"
            (ctaClick)="retry()" />
        </div>
      } @else {
        <!-- ── Totales del rango filtrado ── -->
        @if (filteredTotals(); as t) {
          <div class="fin-kpi-grid">
            <div class="fin-kpi-card">
              <div class="fin-kpi-label">Ingresos</div>
              <div class="fin-kpi-value fin-kpi-value--pos" data-testid="tot-ingresos">{{ t.ingresos | currencyAr }}</div>
            </div>
            <div class="fin-kpi-card">
              <div class="fin-kpi-label">Egresos</div>
              <div class="fin-kpi-value fin-kpi-value--neg" data-testid="tot-egresos">{{ t.egresos | currencyAr }}</div>
            </div>
            <div class="fin-kpi-card fin-kpi-card--hero">
              <div class="fin-kpi-label">Neto</div>
              <div class="fin-kpi-value" data-testid="tot-neto">{{ t.neto | currencyAr }}</div>
              <div class="fin-kpi-meta">{{ t.count }} movimiento{{ t.count === 1 ? '' : 's' }}</div>
            </div>
          </div>
        }

        <!-- ── Tabla de movimientos ── -->
        <div class="fin-card fin-card--table">
          <div class="fin-table-head">
            <h3>Movimientos</h3>
            @if (!loading()) {
              <span class="fin-muted">{{ filteredRows().length }} movimiento{{ filteredRows().length === 1 ? '' : 's' }}</span>
            }
          </div>

          @if (loading() && filteredRows().length === 0) {
            <div class="fin-skeleton fin-skeleton--tall" style="margin: 16px 18px"></div>
          } @else {
            <ui-table
              [value]="filteredRows()"
              [columns]="columns"
              [loading]="loading()"
              dataKey="occurredAt"
              emptyIcon="pi-inbox"
              emptyHeading="Sin movimientos en el rango"
              emptyDescription="No hay movimientos de efectivo ni otros medios para los filtros elegidos.">
              <ng-template uiCell="fecha" let-row>
                <div class="fin-tx-when">
                  <span>{{ row.occurredAt | date:'dd/MM/yy' }}</span>
                  <small class="fin-muted">{{ row.occurredAt | date:'HH:mm' }}</small>
                </div>
              </ng-template>
              <ng-template uiCell="sucursal" let-row>
                <div class="fin-suc-name">
                  <span>{{ row.branchName }}</span>
                  <small class="fin-muted">{{ row.branchCode }}</small>
                </div>
              </ng-template>
              <ng-template uiCell="tipo" let-row>
                <span class="fin-tx-icon"
                      [class.fin-tx-icon--in]="row.type === 'INGRESS'"
                      [class.fin-tx-icon--out]="row.type === 'EGRESS'">
                  {{ row.type === 'INGRESS' ? 'Ingreso' : 'Egreso' }}
                </span>
              </ng-template>
              <ng-template uiCell="medio" let-row>
                <fin-metodo-chip [metodo]="row.method" />
              </ng-template>
              <ng-template uiCell="origen" let-row>
                <span class="fin-origin" [class.fin-origin--cobro]="row.origin === 'COBRO'">
                  {{ row.origin === 'COBRO' ? 'cobro' : 'manual' }}
                </span>
              </ng-template>
              <ng-template uiCell="detalle" let-row>{{ row.description || '—' }}</ng-template>
              <ng-template uiCell="monto" let-row>
                <span class="fin-tx-amt"
                      [class.fin-tx-amt--pos]="row.type === 'INGRESS'"
                      [class.fin-tx-amt--neg]="row.type === 'EGRESS'">
                  {{ row.type === 'INGRESS' ? '+' : '−' }} {{ row.amount | currencyAr }}
                </span>
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
    .fin-card--table { overflow: hidden; }

    .fin-filters { padding: 12px 18px; display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap; }
    .fin-field { display: flex; flex-direction: column; gap: 5px; min-width: 160px; flex: 1 1 160px; max-width: 240px; }
    .fin-field label { font-size: 12px; font-weight: 600; color: #475569; }
    .fin-field ::ng-deep .p-datepicker,
    .fin-field ::ng-deep .p-multiselect,
    .fin-field ::ng-deep .p-inputtext { width: 100%; }
    /* Igualar la altura del multiselect con los datepickers */
    .fin-field ::ng-deep .p-multiselect { min-height: 40px; align-items: center; }

    .fin-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; }
    .fin-kpi-card {
      background: white; border: 1px solid #e8e9f0; border-radius: 12px; padding: 16px 18px;
      display: flex; flex-direction: column; gap: 6px;
    }
    .fin-kpi-card--hero { background: linear-gradient(135deg, #1e293b, #334155); color: #fff; border: none; }
    .fin-kpi-card--hero .fin-kpi-label { color: #cbd5e1; }
    .fin-kpi-card--hero .fin-kpi-meta { color: #94a3b8; }
    .fin-kpi-card--hero .fin-kpi-value { color: #fff; }
    .fin-kpi-label { font-size: 12px; color: #64748b; display: inline-flex; align-items: center; gap: 6px; font-weight: 600; }
    .fin-kpi-value { font-size: 26px; font-weight: 800; color: #1a1a2e; letter-spacing: -.02em; }
    .fin-kpi-value--pos { color: #15803d; }
    .fin-kpi-value--neg { color: #b91c1c; }
    .fin-kpi-meta { font-size: 12px; color: #7c8092; }

    .fin-table-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 10px; }
    .fin-table-head h3 { margin: 0; font-size: 15px; font-weight: 700; color: #1a1a2e; }

    .fin-tx-when, .fin-suc-name { display: flex; flex-direction: column; }
    .fin-suc-name > span { font-weight: 600; color: #1a1a2e; }

    .fin-tx-icon { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; }
    .fin-tx-icon--in { color: #15803d; }
    .fin-tx-icon--out { color: #b91c1c; }

    .fin-origin {
      font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .03em;
      padding: 2px 8px; border-radius: 999px; background: #eef2f7; color: #64748b;
    }
    .fin-origin--cobro { background: #eef4ff; color: #3557d6; }

    .fin-tx-amt { font-weight: 700; }
    .fin-tx-amt--pos { color: #15803d; }
    .fin-tx-amt--neg { color: #b91c1c; }

    .fin-skeleton { background: linear-gradient(90deg, #f5f6f9 25%, #eceef3 50%, #f5f6f9 75%); border-radius: 8px; height: 120px; }

    .fin-muted { font-size: 12px; color: #7c8092; }
  `],
})
export class SucursalesResumenPage implements OnInit {
  private readonly store   = inject(Store);
  private readonly polling = inject(PollingService);
  private readonly destroy = inject(DestroyRef);

  // Selectors
  readonly rows     = this.store.selectSignal(selectMovimientosRows);
  readonly branches = this.store.selectSignal(selectMovimientosBranches);
  readonly loading  = this.store.selectSignal(selectMovimientosLoading);
  readonly error    = this.store.selectSignal(selectMovimientosError);

  // Filtros — por defecto el día de hoy, todas las sucursales.
  readonly from = signal<Date>(new Date());
  readonly to   = signal<Date>(new Date());
  /** Sucursales seleccionadas; lista vacía = todas. */
  readonly selectedBranchIds = signal<number[]>([]);
  /** Medios de pago seleccionados; lista vacía = todos. */
  readonly selectedMethods = signal<PaymentMethod[]>([]);
  readonly lastRefreshAt = signal<Date | null>(null);

  /** Opciones de medio de pago para los chips (orden fijo, labels del design system). */
  readonly methodOptions: { value: PaymentMethod; label: string }[] =
    (['CASH', 'TRANSFER', 'QR', 'POSNET', 'DEBIT_CARD', 'CREDIT_CARD'] as PaymentMethod[])
      .map(v => ({ value: v, label: METHOD_META[v].label }));

  /**
   * Filtrado por sucursal + medio de pago, 100% en cliente: el feed ya trae todos
   * los movimientos del rango, así que cambiar los filtros NO re-pega al backend
   * (además mantiene estable el ETag del polling).
   */
  readonly filteredRows = computed(() => {
    const branchIds = this.selectedBranchIds();
    const methods = this.selectedMethods();
    let out = this.rows();
    if (branchIds.length) out = out.filter(r => branchIds.includes(r.branchId));
    if (methods.length) out = out.filter(r => methods.includes(r.method));
    return out;
  });

  /** Totales recalculados sobre las filas filtradas (coinciden con el server cuando es "todas"). */
  readonly filteredTotals = computed<MovementsTotals>(() => {
    let ingresos = 0, egresos = 0;
    const rows = this.filteredRows();
    for (const r of rows) {
      if (r.type === 'INGRESS') ingresos += r.amount;
      else egresos += r.amount;
    }
    return { count: rows.length, ingresos, egresos, neto: ingresos - egresos };
  });

  readonly columns: TableColumn[] = [
    { field: 'fecha',    header: 'Fecha' },
    { field: 'sucursal', header: 'Sucursal' },
    { field: 'tipo',     header: 'Tipo' },
    { field: 'medio',    header: 'Medio' },
    { field: 'origen',   header: 'Origen' },
    { field: 'detalle',  header: 'Detalle' },
    { field: 'monto',    header: 'Monto', align: 'right' },
  ];

  private pollingHandle: PollingHandle | null = null;

  private get rangeInvalid(): boolean {
    return startOfDay(this.from()) > startOfDay(this.to());
  }

  ngOnInit(): void {
    this.pollingHandle = this.polling.startPolling({
      key: 'financiero-movimientos',
      intervalMs: 5000,
      poll: () => {
        if (this.rangeInvalid) return of(null);
        // Siempre traemos todas las sucursales; el filtro de sucursal es en cliente.
        this.store.dispatch(loadMovements({
          from: dayStartIso(this.from()),
          to: dayEndIso(this.to()),
          branchId: null,
        }));
        this.lastRefreshAt.set(new Date());
        return of(null);
      },
    });

    this.destroy.onDestroy(() => this.pollingHandle?.stop());
  }

  protected setFrom(d: Date): void {
    this.from.set(d);
    this.pollingHandle?.pokeNow();
  }

  protected setTo(d: Date): void {
    this.to.set(d);
    this.pollingHandle?.pokeNow();
  }

  /** "Todas" = lista vacía. Filtrado en cliente, sin re-pollear. */
  protected setBranches(ids: number[] | null): void {
    this.selectedBranchIds.set(ids ?? []);
  }

  /** "Todos" = lista vacía. Filtrado en cliente, sin re-pollear. */
  protected setMethods(methods: PaymentMethod[] | null): void {
    this.selectedMethods.set(methods ?? []);
  }

  protected retry(): void {
    this.pollingHandle?.pokeNow();
  }
}
