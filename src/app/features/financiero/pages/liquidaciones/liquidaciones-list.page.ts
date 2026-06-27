import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';

import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import {
  FilterBarComponent, FilterBarConfig, FilterBarValue,
} from '@shared/ui/components/filter-bar/filter-bar.component';
import { TableColumn } from '@shared/ui/models/table-column.model';
import { PollingService, PollingHandle } from '@core/refresh';
import { TokenService } from '@core/auth/token.service';

import {
  selectLiqList, selectLiqListLoading, selectLiqListError, selectLiqInsurersIndex,
} from '../../store/financiero.selectors';
import { loadSettlements, loadInsurersIndex } from '../../store/financiero.actions';
import { SettlementSummary, SettlementStatus } from '../../models/liquidaciones.model';
import { EstadoLiquidacionPillComponent } from '../../components/estado-liquidacion-pill.component';

@Component({
  selector: 'fin-liquidaciones-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, PageHeaderComponent, DataTableComponent, UiCellDirective,
    EmptyStateComponent, FilterBarComponent, EstadoLiquidacionPillComponent,
  ],
  template: `
    <div class="fin-liq-list">
      <ui-page-header
        heading="Liquidaciones"
        subtitle="Liquidaciones de prestaciones a obras sociales.">
        @if (isAdmin()) {
          <button class="fin-btn fin-btn--primary" type="button" data-testid="btn-generar" (click)="irAGenerar()">
            <i class="pi pi-plus"></i> Generar liquidación
          </button>
        }
      </ui-page-header>

      <ui-filter-bar [config]="filterConfig()" (valueChange)="onFilter($event)" />

      @if (error()) {
        <ui-empty-state
          icon="pi-exclamation-circle"
          heading="No se pudieron cargar las liquidaciones"
          [description]="error()!"
          ctaLabel="Reintentar"
          (ctaClick)="recargar()" />
      } @else {
        <ui-table
          [value]="filtered()"
          [columns]="columns"
          [loading]="loading()"
          [showView]="true"
          emptyHeading="Todavía no hay liquidaciones"
          emptyIcon="pi-chart-line"
          emptyDescription="Cuando generes una liquidación para una obra social, va a aparecer acá con su estado."
          (view)="verDetalle($any($event))">

          <ng-template uiCell="settlementNumber" let-row>
            <span class="liq-num">N° {{ row.settlementNumber }}</span>
          </ng-template>

          <ng-template uiCell="insurerId" let-row>
            {{ insurers().get(row.insurerId) ?? 'Obra social' }}
          </ng-template>

          <ng-template uiCell="type" let-row>
            <span class="liq-type">{{ row.type === 'SIMPLE' ? 'Simple' : 'Especial' }}</span>
          </ng-template>

          <ng-template uiCell="periodFrom" let-row>
            {{ row.periodFrom | date:'dd/MM/yy' }} – {{ row.periodTo | date:'dd/MM/yy' }}
          </ng-template>

          <ng-template uiCell="status" let-row>
            <fin-estado-liquidacion-pill [status]="row.status" />
          </ng-template>

          <ng-template uiCell="createdAt" let-row>
            {{ row.createdAt | date:'dd/MM/yy HH:mm' }}
          </ng-template>
        </ui-table>
      }
    </div>
  `,
  styles: [`
    .fin-liq-list { display: flex; flex-direction: column; gap: 14px; }
    .fin-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 7px; font-size: 13.5px; font-weight: 500; cursor: pointer; border: none; }
    .fin-btn--primary { background: var(--p-primary-color, #4f46e5); color: #fff; }
    .fin-btn--primary:hover { filter: brightness(0.92); }
    .liq-num { font-weight: 600; }
    .liq-type { font-size: 12.5px; color: #64748b; }
  `],
})
export class LiquidacionesListPage implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly polling = inject(PollingService);
  private readonly destroy = inject(DestroyRef);
  private readonly tokens = inject(TokenService);

  readonly isAdmin = signal(this.tokens.getRoles().includes('ADMINISTRADOR'));

  protected readonly list = this.store.selectSignal(selectLiqList);
  protected readonly loading = this.store.selectSignal(selectLiqListLoading);
  protected readonly error = this.store.selectSignal(selectLiqListError);
  protected readonly insurers = this.store.selectSignal(selectLiqInsurersIndex);

  protected readonly filterValue = signal<FilterBarValue>({ search: '' });

  protected readonly columns: readonly TableColumn[] = [
    { field: 'settlementNumber', header: 'N°' },
    { field: 'insurerId', header: 'Obra Social' },
    { field: 'type', header: 'Tipo' },
    { field: 'periodFrom', header: 'Período' },
    { field: 'status', header: 'Estado' },
    { field: 'createdAt', header: 'Creada', align: 'right' },
  ];

  protected readonly filterConfig = computed<FilterBarConfig>(() => ({
    searchPlaceholder: 'Buscar por N° u obra social…',
    selects: [
      {
        key: 'status', label: 'Estado',
        options: [
          { value: 'PENDING', label: 'Pendiente', color: '#b5740c' },
          { value: 'INFORMED', label: 'Informada', color: '#1d4ed8' },
          { value: 'BILLED', label: 'Facturada', color: '#0f8a55' },
          { value: 'CANCELLED', label: 'Anulada', color: '#64748b' },
        ],
      },
    ],
  }));

  /** Filtrado client-side sobre la lista ya cargada (search + estados). */
  protected readonly filtered = computed<SettlementSummary[]>(() => {
    const fv = this.filterValue();
    const idx = this.insurers();
    let items = this.list();
    const q = (fv.search ?? '').trim().toLowerCase();
    if (q) {
      items = items.filter(s =>
        String(s.settlementNumber).includes(q) ||
        (idx.get(s.insurerId) ?? '').toLowerCase().includes(q));
    }
    const statuses = (fv['status'] as SettlementStatus[] | undefined) ?? [];
    if (statuses.length) items = items.filter(s => statuses.includes(s.status));
    return items;
  });

  private handle: PollingHandle | null = null;

  ngOnInit(): void {
    this.store.dispatch(loadInsurersIndex());
    this.handle = this.polling.startPolling({
      key: 'financiero-liquidaciones',
      intervalMs: 5000,
      poll: () => {
        this.store.dispatch(loadSettlements({ filters: {} }));
        return of(null);
      },
    });
    this.destroy.onDestroy(() => this.handle?.stop());
  }

  protected recargar(): void {
    this.store.dispatch(loadSettlements({ filters: {} }));
  }

  protected onFilter(value: FilterBarValue): void {
    this.filterValue.set(value);
  }

  protected verDetalle(row: SettlementSummary): void {
    this.router.navigate(['/financiero/liquidaciones', row.id]);
  }

  protected irAGenerar(): void {
    this.router.navigate(['/financiero/liquidaciones/nueva']);
  }
}
