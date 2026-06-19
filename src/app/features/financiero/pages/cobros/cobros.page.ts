import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';

import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';

import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';

import {
  selectCobrosList,
  selectCobrosLoading,
  selectCobrosError,
} from '../../store/financiero.selectors';
import { loadPayments } from '../../store/financiero.actions';

import { MetodoChipComponent } from '../../components/metodo-chip.component';
import { EstadoPagoPillComponent } from '../../components/estado-pago-pill.component';
import { PaymentListItem } from '../../models/financiero.model';
import { TableColumn } from '@shared/ui/models/table-column.model';

@Component({
  selector: 'fin-cobros-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    PageHeaderComponent,
    DataTableComponent,
    UiCellDirective,
    EmptyStateComponent,
    CurrencyArPipe,
    MetodoChipComponent,
    EstadoPagoPillComponent,
  ],
  template: `
    <div class="fin-cobros">
      <ui-page-header
        heading="Cobros"
        subtitle="Pagos registrados en esta sucursal. Entrá a un pago para ver su ticket o cancelarlo.">
        <button class="fin-btn fin-btn--primary" type="button" (click)="irACobrar()">
          <i class="pi pi-plus"></i> Nuevo cobro
        </button>
      </ui-page-header>

      <!-- ── CARGANDO ── -->
      @if (loading()) {
        <div class="fin-card fin-pad">
          <div class="fin-skeleton-list">
            @for (_ of skeletonRows; track $index) {
              <div class="fin-skel-row"></div>
            }
          </div>
        </div>
      }

      <!-- ── ERROR ── -->
      @else if (error()) {
        <ui-empty-state
          icon="pi-exclamation-circle"
          heading="No se pudieron cargar los cobros"
          [description]="error()"
          ctaLabel="Reintentar"
          (ctaClick)="cargarCobros()" />
      }

      <!-- ── LISTA ── -->
      @else {
        <ui-table
          [value]="list()"
          [columns]="columns"
          [loading]="loading()"
          emptyHeading="Todavía no registraste cobros"
          emptyIcon="pi-receipt"
          emptyDescription="Los pagos que registres en esta sucursal van a aparecer acá, con su comprobante y estado."
          emptyCtaLabel="Cobrar una atención"
          (emptyCtaClick)="irACobrar()"
          (view)="verDetalle($any($event))">
          <!-- ── Columna: ID + hora + tipo comprobante ── -->
          <ng-template uiCell="id" let-row>
            <div class="cobros-id-cell">
              <span class="cobros-id">#{{ row.id }}</span>
              <span class="cobros-hora">
                {{ row.createdAt | date:'HH:mm' }} hs
              </span>
            </div>
          </ng-template>

          <!-- ── Columna: Paciente (attentionId — ver nota en report) ── -->
          <ng-template uiCell="attentionId" let-row>
            <span class="cobros-paciente">Atención #{{ row.attentionId }}</span>
          </ng-template>

          <!-- ── Columna: Métodos ── -->
          <ng-template uiCell="collections" let-row>
            <div class="cobros-metodos">
              @for (col of row.collections; track col.id) {
                <fin-metodo-chip [metodo]="col.method" />
              }
            </div>
          </ng-template>

          <!-- ── Columna: Monto (tachado si CANCELLED) ── -->
          <ng-template uiCell="copaymentAmount" let-row>
            <span
              class="cobros-monto"
              [class.cobros-monto--cancelled]="row.status === 'CANCELLED'">
              {{ row.copaymentAmount | currencyAr }}
            </span>
          </ng-template>

          <!-- ── Columna: Estado ── -->
          <ng-template uiCell="status" let-row>
            <fin-estado-pago-pill [status]="row.status" />
          </ng-template>
        </ui-table>
      }
    </div>
  `,
  styles: [`
    .fin-cobros { display: flex; flex-direction: column; gap: 0; }

    .fin-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 14px; border-radius: 7px; font-size: 13.5px;
      font-weight: 500; cursor: pointer; border: none;
    }
    .fin-btn--primary { background: var(--p-primary-color, #4f46e5); color: #fff; }
    .fin-btn--primary:hover { filter: brightness(0.92); }

    .fin-card { border: 1px solid #e8edf3; border-radius: 10px; background: #fff; }
    .fin-pad  { padding: 20px; }

    .fin-skeleton-list { display: flex; flex-direction: column; gap: 12px; }
    .fin-skel-row {
      height: 40px; border-radius: 6px;
      background: linear-gradient(90deg, #f0f2f5 25%, #e8ebf0 50%, #f0f2f5 75%);
      animation: skel-shimmer 1.3s infinite linear;
      background-size: 200% 100%;
    }
    @keyframes skel-shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* Table cell styles */
    .cobros-id-cell { display: flex; flex-direction: column; gap: 2px; }
    .cobros-id      { font-weight: 600; font-size: 13px; color: var(--ds-text, #1a1a2e); }
    .cobros-hora    { font-size: 11.5px; color: var(--ds-text-muted, #6b7280); }

    .cobros-paciente { font-size: 13px; color: var(--ds-text, #1a1a2e); }

    .cobros-metodos { display: flex; flex-wrap: wrap; gap: 4px; }

    .cobros-monto {
      font-size: 13px; font-weight: 500;
      color: var(--ds-text, #1a1a2e);
    }
    .cobros-monto--cancelled {
      text-decoration: line-through;
      color: var(--ds-text-muted, #94a3b8);
    }
  `],
})
export class CobrosPage implements OnInit {
  private readonly store  = inject(Store);
  private readonly router = inject(Router);
  private readonly branchCtx = inject(OperatorBranchContextService);

  protected readonly list    = this.store.selectSignal(selectCobrosList);
  protected readonly loading = this.store.selectSignal(selectCobrosLoading);
  protected readonly error   = this.store.selectSignal(selectCobrosError);

  protected readonly skeletonRows = Array.from({ length: 5 });

  protected readonly columns: readonly TableColumn[] = [
    { field: 'id',               header: 'Pago'     },
    { field: 'attentionId',      header: 'Paciente'  },
    { field: 'collections',      header: 'Medios'    },
    { field: 'copaymentAmount',  header: 'Cobrado', align: 'right' },
    { field: 'status',           header: 'Estado',  align: 'right' },
  ];

  ngOnInit(): void {
    this.cargarCobros();
  }

  protected cargarCobros(): void {
    const branchId = this.branchCtx.branchId();
    if (branchId != null) {
      this.store.dispatch(loadPayments({ branchId }));
    } else {
      this.store.dispatch(loadPayments({}));
    }
  }

  protected verDetalle(item: PaymentListItem): void {
    this.router.navigate(['/financiero/cobros', item.id]);
  }

  protected irACobrar(): void {
    this.router.navigate(['/financiero/cobrar']);
  }
}
